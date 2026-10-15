import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';

/**
 * Lấy 32-byte key từ biến môi trường GOOGLE_TOKEN_ENCRYPTION_KEY.
 * Hỗ trợ định dạng Hex (64 ký tự), Base64 (44 ký tự), hoặc chuỗi thô được hash SHA-256.
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.GOOGLE_TOKEN_ENCRYPTION_KEY;
  if (!envKey) {
    // Trong môi trường dev nếu chưa cấu hình thì dùng key nội bộ tạm thời cảnh báo
    if (process.env.NODE_ENV !== 'production') {
      return crypto.createHash('sha256').update('storeproduct-local-dev-encryption-key-fallback').digest();
    }
    throw new Error('GOOGLE_TOKEN_ENCRYPTION_KEY is required in production.');
  }

  // Nếu là 64-char hex string
  if (/^[0-9a-fA-F]{64}$/.test(envKey)) {
    return Buffer.from(envKey, 'hex');
  }

  // Nếu là base64
  if (envKey.length === 44 && envKey.endsWith('=')) {
    return Buffer.from(envKey, 'base64');
  }

  // Hash chuỗi bất kỳ để luôn có đúng 32 bytes an toàn
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Mã hóa dữ liệu bảo mật (như Google OAuth refresh token) bằng AES-256-GCM.
 * Chuỗi trả về chứa: iv:authTag:encryptedData (tất cả dạng hex).
 */
export function encryptToken(plainText: string): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12); // 96-bit IV tiêu chuẩn cho GCM
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

/**
 * Giải mã chuỗi đã mã hóa bằng AES-256-GCM.
 */
export function decryptToken(encryptedString: string): string {
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Invalid encrypted token format');
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  const key = getEncryptionKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
