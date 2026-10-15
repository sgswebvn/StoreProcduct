import crypto from 'crypto';
import { connectDB } from '@/core/db/connect';
import SystemError, {
  ISystemError,
  ErrorCategory,
  ErrorSeverity,
  ErrorStatus,
} from '../infra/system-error.model';

export interface CaptureErrorInput {
  title?: string;
  message: string;
  category?: ErrorCategory;
  severity?: ErrorSeverity;
  route?: string;
  requestId?: string;
  stackTrace?: string;
}

export class ErrorMonitoringService {
  /**
   * Tạo fingerprint ổn định để gom nhóm các lỗi giống nhau
   */
  private static generateFingerprint(
    category: string,
    route: string,
    message: string
  ): string {
    // Chuẩn hóa message: loại bỏ số cụ thể, IDs, timestamps
    const normalizedMsg = message
      .replace(/[0-9a-f]{24}/gi, '<ObjectId>')
      .replace(/\d+/g, '<N>')
      .trim();

    const normalizedRoute = (route || 'unknown').split('?')[0];
    const raw = `${category}:${normalizedRoute}:${normalizedMsg}`;
    return crypto.createHash('sha256').update(raw).digest('hex').slice(0, 32);
  }

  /**
   * Lọc stack trace để không chứa token/secret
   */
  private static sanitizeStackTrace(stack?: string): string | undefined {
    if (!stack) return undefined;
    return stack
      .replace(/Bearer\s+[A-Za-z0-9\-_.]+/gi, 'Bearer [REDACTED]')
      .replace(/mongodb\+srv:\/\/[^\s]+/gi, 'mongodb+srv://[REDACTED]')
      .slice(0, 3000); // Giới hạn độ dài để không làm phình DB
  }

  /**
   * Ghi nhận hoặc tăng số lần lỗi trùng fingerprint
   */
  static async captureError(input: CaptureErrorInput): Promise<ISystemError | null> {
    try {
      await connectDB();

      const category = input.category || 'server';
      const route = input.route || '/';
      const fingerprint = this.generateFingerprint(category, route, input.message);

      const existing = await SystemError.findOne({ fingerprint });

      if (existing) {
        existing.occurrenceCount += 1;
        existing.lastSeenAt = new Date();
        if (existing.status === 'resolved') {
          existing.status = 'new'; // Mở lại sự cố nếu tái diễn
        }
        if (input.requestId) existing.requestId = input.requestId;
        await existing.save();
        return existing;
      }

      const errorId = `ERR-${Date.now().toString(36).toUpperCase()}-${Math.random()
        .toString(36)
        .substring(2, 6)
        .toUpperCase()}`;

      return await SystemError.create({
        errorId,
        fingerprint,
        title: input.title || input.message.slice(0, 80),
        message: input.message,
        category,
        severity: input.severity || 'medium',
        status: 'new',
        route,
        requestId: input.requestId,
        stackTrace: this.sanitizeStackTrace(input.stackTrace),
        occurrenceCount: 1,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
      });
    } catch (err) {
      console.error('[ErrorMonitoringService] Không thể ghi nhận lỗi:', err);
      return null;
    }
  }

  /**
   * Lấy danh sách sự cố có phân trang và bộ lọc
   */
  static async listErrors(options: {
    status?: string;
    severity?: string;
    category?: string;
    search?: string;
    page?: number;
    limit?: number;
  } = {}) {
    await connectDB();
    const { status, severity, category, search, page = 1, limit = 20 } = options;

    const filter: Record<string, unknown> = {};

    if (status && status !== 'all') filter.status = status;
    if (severity && severity !== 'all') filter.severity = severity;
    if (category && category !== 'all') filter.category = category;

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ title: regex }, { message: regex }, { errorId: regex }, { route: regex }];
    }

    const skip = Math.max(0, (page - 1) * limit);

    const [errors, total] = await Promise.all([
      SystemError.find(filter)
        .sort({ lastSeenAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      SystemError.countDocuments(filter),
    ]);

    return {
      errors,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Cập nhật trạng thái sự cố
   */
  static async updateStatus(
    id: string,
    status: ErrorStatus,
    note?: string,
    userId?: string
  ) {
    await connectDB();
    const item = await SystemError.findById(id);
    if (!item) throw new Error('Không tìm thấy sự cố');

    item.status = status;
    if (note !== undefined) item.resolutionNote = note;
    if (status === 'resolved') {
      item.resolvedAt = new Date();
      item.resolvedBy = userId;
    }
    await item.save();
    return item.toObject();
  }

  /**
   * Thống kê lỗi cho Dashboard
   */
  static async getErrorStats() {
    await connectDB();
    const [unresolved, critical, newErrorsCount] = await Promise.all([
      SystemError.countDocuments({ status: { $in: ['new', 'investigating'] } }),
      SystemError.countDocuments({
        status: { $in: ['new', 'investigating'] },
        severity: { $in: ['high', 'critical'] },
      }),
      SystemError.countDocuments({ status: 'new' }),
    ]);

    return {
      unresolved,
      critical,
      newErrorsCount,
    };
  }
}
