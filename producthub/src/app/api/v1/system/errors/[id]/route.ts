import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { hasPermission } from '@/core/auth/permissions';
import { apiSuccess, apiErrors } from '@/core/response/api-response';
import { ErrorMonitoringService } from '@/modules/errors/services/error-monitoring.service';

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    if (
      !hasPermission(
        session.user.role,
        session.user.additionalPermissions || [],
        'errors.resolve'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền cập nhật trạng thái sự cố');
    }

    const { id } = await params;
    const { status, note } = await req.json();

    const updated = await ErrorMonitoringService.updateStatus(
      id,
      status,
      note,
      session.user.id
    );

    return apiSuccess(updated);
  } catch (error: any) {
    return apiErrors.badRequest(error.message);
  }
}
