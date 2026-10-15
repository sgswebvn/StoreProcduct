import crypto from 'crypto';
import mongoose from 'mongoose';
import { connectDB } from '@/core/db/connect';
import { ApiKey, IApiKey, ApiKeyScope } from '../infra/api-key.model';

export class ApiKeyService {
  /**
   * Băm chuỗi API key bằng SHA-256
   */
  static hashKey(rawKey: string): string {
    return crypto.createHash('sha256').update(rawKey).digest('hex');
  }

  /**
   * Tạo API Key mới bảo mật
   * Lưu ý: rawKey chỉ được trả về MỘT LẦN DUY NHẤT tại hàm này
   */
  static async createApiKey(params: {
    name: string;
    projectId?: string;
    scopes?: ApiKeyScope[];
    rateLimit?: number;
    expiresAt?: Date;
    userId?: string;
  }): Promise<{ rawKey: string; key: IApiKey }> {
    await connectDB();

    // Sinh chuỗi bí mật ngẫu nhiên: sp_live_ + 48 hex chars
    const randomHex = crypto.randomBytes(24).toString('hex');
    const rawKey = `sp_live_${randomHex}`;
    const keyPrefix = rawKey.slice(0, 12); // "sp_live_xxxx"
    const keyHash = this.hashKey(rawKey);

    const projectObjId = params.projectId && mongoose.Types.ObjectId.isValid(params.projectId)
      ? new mongoose.Types.ObjectId(params.projectId)
      : undefined;

    const userObjId = params.userId && mongoose.Types.ObjectId.isValid(params.userId)
      ? new mongoose.Types.ObjectId(params.userId)
      : undefined;

    const key = new ApiKey({
      name: params.name.trim(),
      keyPrefix,
      keyHash,
      projectId: projectObjId,
      scopes: params.scopes && params.scopes.length > 0 ? params.scopes : ['products.read', 'categories.read'],
      status: 'active',
      rateLimit: params.rateLimit ?? 60,
      expiresAt: params.expiresAt,
      createdBy: userObjId,
    });

    await key.save();

    return {
      rawKey,
      key,
    };
  }

  /**
   * Xác thực API Key từ chuỗi raw key và kiểm tra Scope
   */
  static async validateApiKey(
    rawKey: string,
    requiredScope?: ApiKeyScope
  ): Promise<{ valid: boolean; apiKey?: IApiKey; reason?: string }> {
    if (!rawKey || !rawKey.startsWith('sp_live_')) {
      return { valid: false, reason: 'Định dạng API key không hợp lệ.' };
    }

    await connectDB();
    const keyHash = this.hashKey(rawKey);
    const keyDoc = await ApiKey.findOne({ keyHash }).populate('projectId');

    if (!keyDoc) {
      return { valid: false, reason: 'API key không tồn tại.' };
    }

    if (keyDoc.status !== 'active') {
      return { valid: false, reason: 'API key đã bị thu hồi hoặc vô hiệu hóa.' };
    }

    if (keyDoc.expiresAt && new Date() > new Date(keyDoc.expiresAt)) {
      return { valid: false, reason: 'API key đã hết hạn sử dụng.' };
    }

    if (requiredScope && !keyDoc.scopes.includes(requiredScope)) {
      return {
        valid: false,
        reason: `API key không có quyền truy cập phạm vi "${requiredScope}".`,
      };
    }

    // Cập nhật lastUsedAt không đồng bộ để không làm chậm request
    ApiKey.findByIdAndUpdate(keyDoc._id, { lastUsedAt: new Date() }).exec();

    return { valid: true, apiKey: keyDoc };
  }

  /**
   * Lấy danh sách API keys
   */
  static async listApiKeys() {
    await connectDB();
    return ApiKey.find({})
      .populate('projectId', '_id name code domain')
      .populate('createdBy', '_id name email')
      .sort({ createdAt: -1 })
      .lean();
  }

  /**
   * Thu hồi (Revoke) API Key
   */
  static async revokeApiKey(id: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('ID không hợp lệ.');

    const key = await ApiKey.findByIdAndUpdate(
      id,
      { status: 'revoked' },
      { new: true }
    );
    if (!key) throw new Error('Không tìm thấy API key.');
    return key;
  }

  /**
   * Xóa vĩnh viễn API Key
   */
  static async deleteApiKey(id: string) {
    await connectDB();
    if (!mongoose.Types.ObjectId.isValid(id)) throw new Error('ID không hợp lệ.');
    await ApiKey.findByIdAndDelete(id);
    return true;
  }
}
