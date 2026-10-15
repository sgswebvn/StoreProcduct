import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { hasPermission } from '@/core/auth/permissions';
import { apiSuccess, apiCreated, apiErrors } from '@/core/response/api-response';
import { ErrorMonitoringService } from '@/modules/errors/services/error-monitoring.service';

// In-memory rate limiting cho endpoint ghi nhận lỗi
const ipHitCount = new Map<string, { count: number; resetAt: number }>();

export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    if (
      !hasPermission(
        session.user.role,
        session.user.additionalPermissions || [],
        'errors.read'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền xem theo dõi sự cố hệ thống');
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const severity = searchParams.get('severity') || undefined;
    const category = searchParams.get('category') || undefined;
    const search = searchParams.get('search') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await ErrorMonitoringService.listErrors({
      status,
      severity,
      category,
      search,
      page,
      limit,
    });

    return apiSuccess(result.errors, 200, result.pagination);
  } catch (error: any) {
    return apiErrors.internal(error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Chống spam: tối đa 30 lỗi/phút trên mỗi IP
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const now = Date.now();
    const hit = ipHitCount.get(ip);

    if (hit && now < hit.resetAt) {
      if (hit.count >= 30) {
        return apiErrors.tooManyRequests('Tần suất gửi lỗi vượt quá giới hạn');
      }
      hit.count += 1;
    } else {
      ipHitCount.set(ip, { count: 1, resetAt: now + 60000 });
    }

    const body = await req.json();
    if (!body?.message) {
      return apiErrors.badRequest('Thông điệp lỗi là bắt buộc');
    }

    const errorItem = await ErrorMonitoringService.captureError({
      title: body.title,
      message: body.message,
      category: body.category || 'client',
      severity: body.severity || 'low',
      route: body.route,
      requestId: body.requestId,
      stackTrace: body.stackTrace,
    });

    return apiCreated({ errorId: errorItem?.errorId });
  } catch (error: any) {
    return apiErrors.internal(error.message);
  }
}
