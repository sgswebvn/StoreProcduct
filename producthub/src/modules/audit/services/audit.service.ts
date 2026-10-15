import { connectDB } from '@/core/db/connect';
import AuditLog, { IAuditLog } from '../infra/audit-log.model';

export interface CreateAuditLogInput {
  actorUserId?: string;
  actorEmailSnapshot?: string;
  actorNameSnapshot?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  result?: 'success' | 'failure';
  requestId?: string;
  ipAddress?: string;
  userAgent?: string;
  summary: string;
  changes?: Record<string, any>;
}

export interface AuditQueryOptions {
  action?: string;
  resourceType?: string;
  actor?: string;
  result?: string;
  page?: number;
  limit?: number;
}

const SENSITIVE_KEYS = [
  'password',
  'passwordhash',
  'token',
  'secret',
  'authorization',
  'refreshtoken',
  'accesstoken',
  'clientsecret',
  'apikey',
];

export class AuditService {
  /**
   * Lọc bỏ dữ liệu nhạy cảm trước khi lưu
   */
  private static sanitizeChanges(data?: Record<string, any>): Record<string, any> | undefined {
    if (!data || typeof data !== 'object') return data;

    const sanitized: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      const lower = k.toLowerCase();
      if (SENSITIVE_KEYS.some((sk) => lower.includes(sk))) {
        sanitized[k] = '••••••••';
      } else if (v && typeof v === 'object' && !Array.isArray(v)) {
        sanitized[k] = this.sanitizeChanges(v);
      } else {
        sanitized[k] = v;
      }
    }
    return sanitized;
  }

  /**
   * Ghi một bản ghi nhật ký hoạt động
   */
  static async log(input: CreateAuditLogInput): Promise<IAuditLog | null> {
    try {
      await connectDB();
      const sanitizedChanges = this.sanitizeChanges(input.changes);

      return await AuditLog.create({
        ...input,
        result: input.result || 'success',
        timestamp: new Date(),
        changes: sanitizedChanges,
      });
    } catch (err) {
      console.error('[AuditService] Lỗi ghi nhật ký audit log:', err);
      return null;
    }
  }

  /**
   * Lấy danh sách nhật ký có bộ lọc và phân trang
   */
  static async listLogs(options: AuditQueryOptions = {}) {
    await connectDB();
    const { action, resourceType, actor, result, page = 1, limit = 20 } = options;

    const filter: Record<string, unknown> = {};

    if (action && action !== 'all') {
      filter.action = action;
    }

    if (resourceType && resourceType !== 'all') {
      filter.resourceType = resourceType;
    }

    if (result && result !== 'all') {
      filter.result = result;
    }

    if (actor && actor.trim()) {
      const regex = new RegExp(actor.trim(), 'i');
      filter.$or = [
        { actorEmailSnapshot: regex },
        { actorNameSnapshot: regex },
        { actorUserId: actor.trim() },
      ];
    }

    const skip = Math.max(0, (page - 1) * limit);

    const [logs, total] = await Promise.all([
      AuditLog.find(filter)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(filter),
    ]);

    return {
      logs,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Lấy các hoạt động quản trị gần nhất cho Dashboard
   */
  static async getRecentActivities(limit: number = 6) {
    await connectDB();
    return AuditLog.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();
  }
}
