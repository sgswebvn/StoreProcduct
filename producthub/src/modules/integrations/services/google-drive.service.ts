import crypto from 'crypto';
import { connectDB } from '@/core/db/connect';
import GoogleDriveToken, { IGoogleDriveToken } from '../infra/google-drive-token.model';
import { encryptToken, decryptToken } from '@/core/security/crypto';
import type { StorageProvider, UploadResult } from '@/core/storage/storage-provider.interface';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const GOOGLE_USERINFO_URL = 'https://www.googleapis.com/oauth2/v2/userinfo';
const GOOGLE_DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const GOOGLE_DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';

export class GoogleDriveService implements StorageProvider {
  name = 'google_drive';

  /**
   * Tạo URL ủy quyền Google OAuth 2.0.
   */
  static getAuthUrl(stateSecret: string): string {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !redirectUri) {
      throw new Error('GOOGLE_CLIENT_ID và GOOGLE_REDIRECT_URI chưa được cấu hình.');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
      access_type: 'offline', // Bắt buộc để Google cấp refresh_token
      prompt: 'consent', // Bắt buộc để luôn nhận refresh_token khi kết nối lại
      state: stateSecret,
    });

    return `${GOOGLE_AUTH_URL}?${params.toString()}`;
  }

  /**
   * Xử lý callback sau khi người dùng đồng ý ủy quyền trên Google.
   */
  static async handleCallback(
    code: string,
    userId?: string
  ): Promise<{ email: string; name: string }> {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = process.env.GOOGLE_REDIRECT_URI;

    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Thiếu cấu hình GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET hoặc GOOGLE_REDIRECT_URI.');
    }

    // 1. Đổi code lấy Access Token và Refresh Token
    const tokenRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const errorData = await tokenRes.json().catch(() => ({}));
      throw new Error(
        `Không thể đổi mã ủy quyền Google: ${errorData.error_description || tokenRes.statusText}`
      );
    }

    const tokenData = await tokenRes.json();
    const { access_token, refresh_token, expires_in, scope } = tokenData;

    // 2. Lấy thông tin tài khoản Google đã ủy quyền
    const userInfoRes = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userInfo = userInfoRes.ok ? await userInfoRes.json() : {};

    await connectDB();

    // Tìm token hiện có nếu có
    let tokenDoc = await GoogleDriveToken.findOne({ provider: 'google_drive' });

    // Cần refresh_token để duy trì kết nối lâu dài
    let finalRefreshToken = refresh_token;
    if (!finalRefreshToken && tokenDoc?.encryptedRefreshToken) {
      // Giữ lại refresh token cũ nếu lần này Google chỉ trả access token
      finalRefreshToken = decryptToken(tokenDoc.encryptedRefreshToken);
    }

    if (!finalRefreshToken) {
      throw new Error(
        'Google không cấp Refresh Token. Vui lòng ngắt kết nối và ủy quyền lại với tùy chọn cấp quyền đầy đủ.'
      );
    }

    const encrypted = encryptToken(finalRefreshToken);
    const expiresAt = new Date(Date.now() + (expires_in ?? 3600) * 1000);

    if (tokenDoc) {
      tokenDoc.encryptedRefreshToken = encrypted;
      tokenDoc.accessToken = access_token;
      tokenDoc.accessTokenExpiresAt = expiresAt;
      tokenDoc.accountEmail = userInfo.email ?? tokenDoc.accountEmail;
      tokenDoc.accountName = userInfo.name ?? tokenDoc.accountName;
      tokenDoc.scope = scope;
      tokenDoc.status = 'active';
      tokenDoc.errorMessage = undefined;
      tokenDoc.lastSyncAt = new Date();
      if (userId) tokenDoc.connectedBy = userId;
      await tokenDoc.save();
    } else {
      tokenDoc = await GoogleDriveToken.create({
        provider: 'google_drive',
        encryptedRefreshToken: encrypted,
        accessToken: access_token,
        accessTokenExpiresAt: expiresAt,
        accountEmail: userInfo.email,
        accountName: userInfo.name,
        scope,
        status: 'active',
        lastSyncAt: new Date(),
        connectedBy: userId,
      });
    }

    return {
      email: userInfo.email ?? 'Google Account',
      name: userInfo.name ?? 'StoreProduct Admin',
    };
  }

  /**
   * Lấy access token hợp lệ, tự động refresh nếu token cũ đã hết hạn.
   */
  static async getValidAccessToken(): Promise<string> {
    await connectDB();
    const tokenDoc = await GoogleDriveToken.findOne({ provider: 'google_drive' });

    if (!tokenDoc || tokenDoc.status === 'revoked') {
      throw new Error('Google Drive chưa được kết nối. Vui lòng vào Cài đặt để kết nối.');
    }

    // Nếu access token còn hạn trên 60 giây, tái sử dụng luôn
    if (
      tokenDoc.accessToken &&
      tokenDoc.accessTokenExpiresAt &&
      new Date(tokenDoc.accessTokenExpiresAt).getTime() > Date.now() + 60000
    ) {
      return tokenDoc.accessToken;
    }

    // Nếu đã hết hạn -> tiến hành refresh token
    const refreshToken = decryptToken(tokenDoc.encryptedRefreshToken);
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
      throw new Error('Cấu hình Google OAuth Client chưa đầy đủ.');
    }

    const refreshRes = await fetch(GOOGLE_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!refreshRes.ok) {
      const err = await refreshRes.json().catch(() => ({}));
      // Xử lý lỗi invalid_grant (token đã bị người dùng thu hồi trên Google)
      if (err.error === 'invalid_grant') {
        tokenDoc.status = 'expired';
        tokenDoc.errorMessage = 'Quyền truy cập Google Drive đã bị thu hồi hoặc hết hạn. Vui lòng kết nối lại.';
        await tokenDoc.save();
      }
      throw new Error(`Lỗi làm mới token Google Drive: ${err.error_description || 'Xác thực thất bại'}`);
    }

    const data = await refreshRes.json();
    tokenDoc.accessToken = data.access_token;
    tokenDoc.accessTokenExpiresAt = new Date(Date.now() + (data.expires_in ?? 3600) * 1000);
    tokenDoc.status = 'active';
    tokenDoc.errorMessage = undefined;
    await tokenDoc.save();

    return data.access_token;
  }

  /**
   * Kiểm tra trạng thái kết nối Google Drive hiện tại.
   */
  static async getStatus(): Promise<{
    connected: boolean;
    email?: string;
    name?: string;
    status: 'active' | 'expired' | 'revoked' | 'not_connected';
    errorMessage?: string;
  }> {
    try {
      await connectDB();
      const tokenDoc = await GoogleDriveToken.findOne({ provider: 'google_drive' });
      if (!tokenDoc) {
        return { connected: false, status: 'not_connected' };
      }

      return {
        connected: tokenDoc.status === 'active',
        email: tokenDoc.accountEmail,
        name: tokenDoc.accountName,
        status: tokenDoc.status,
        errorMessage: tokenDoc.errorMessage,
      };
    } catch {
      return { connected: false, status: 'not_connected' };
    }
  }

  /**
   * Ngắt kết nối Google Drive và thu hồi quyền.
   */
  static async disconnect(): Promise<void> {
    await connectDB();
    const tokenDoc = await GoogleDriveToken.findOne({ provider: 'google_drive' });
    if (!tokenDoc) return;

    try {
      const refreshToken = decryptToken(tokenDoc.encryptedRefreshToken);
      // Gọi revoke API tới Google
      await fetch(`${GOOGLE_REVOKE_URL}?token=${refreshToken}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      });
    } catch (e) {
      console.warn('[Google Drive] Revoke token error (safe to ignore on disconnect):', e);
    }

    await GoogleDriveToken.deleteOne({ provider: 'google_drive' });
  }

  /**
   * Triển khai StorageProvider: Kiểm tra kết nối
   */
  async isConnected(): Promise<boolean> {
    const s = await GoogleDriveService.getStatus();
    return s.connected;
  }

  /**
   * Triển khai StorageProvider: Upload file ảnh lên Google Drive (Multipart upload)
   */
  async upload(
    buffer: Buffer,
    fileName: string,
    mimeType: string
  ): Promise<UploadResult> {
    const accessToken = await GoogleDriveService.getValidAccessToken();
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;

    // Metadata JSON
    const metadata: Record<string, unknown> = {
      name: fileName,
      mimeType,
    };

    if (folderId && folderId.trim()) {
      metadata.parents = [folderId.trim()];
    }

    // Multipart boundary
    const boundary = '-------StoreProductBoundary' + crypto.randomBytes(8).toString('hex');
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadataPart =
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata);

    const mediaHeader = `Content-Type: ${mimeType}\r\n\r\n`;

    const multipartBody = Buffer.concat([
      Buffer.from(delimiter + metadataPart + delimiter + mediaHeader),
      buffer,
      Buffer.from(closeDelimiter),
    ]);

    const uploadRes = await fetch(GOOGLE_DRIVE_UPLOAD_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
        'Content-Length': multipartBody.length.toString(),
      },
      body: multipartBody,
    });

    if (!uploadRes.ok) {
      const err = await uploadRes.json().catch(() => ({}));
      throw new Error(
        `Lỗi tải ảnh lên Google Drive: ${err.error?.message || uploadRes.statusText}`
      );
    }

    const driveFile = await uploadRes.json();
    const fileId = driveFile.id;

    // Lấy link xem trước (webViewLink)
    let webViewLink = driveFile.webViewLink;
    if (!webViewLink) {
      webViewLink = `https://drive.google.com/file/d/${fileId}/view`;
    }

    return {
      fileId,
      fileName,
      mimeType,
      size: buffer.length,
      webViewLink,
      thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w600`,
    };
  }

  /**
   * Triển khai StorageProvider: Xóa file trên Google Drive
   */
  async delete(fileId: string): Promise<boolean> {
    const accessToken = await GoogleDriveService.getValidAccessToken();
    const res = await fetch(`${GOOGLE_DRIVE_FILES_URL}/${fileId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (res.status === 204 || res.status === 200 || res.status === 404) {
      return true;
    }

    const err = await res.json().catch(() => ({}));
    throw new Error(`Không thể xóa file trên Drive: ${err.error?.message || res.statusText}`);
  }

  /**
   * Triển khai StorageProvider: Lấy URL xem
   */
  async getFileUrl(fileId: string): Promise<string> {
    return `https://drive.google.com/thumbnail?id=${fileId}&sz=w800`;
  }
}
