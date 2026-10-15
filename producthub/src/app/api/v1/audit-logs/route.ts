import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { hasPermission } from '@/core/auth/permissions';
import { apiSuccess, apiErrors } from '@/core/response/api-response';
import { AuditService } from '@/modules/audit/services/audit.service';

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
        'audit.read'
      ) &&
      !hasPermission(
        session.user.role,
        session.user.additionalPermissions || [],
        'audit_logs.read'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền xem nhật ký hoạt động');
    }

    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action') || undefined;
    const resourceType = searchParams.get('resourceType') || undefined;
    const actor = searchParams.get('actor') || undefined;
    const result = searchParams.get('result') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);

    const data = await AuditService.listLogs({
      action,
      resourceType,
      actor,
      result,
      page,
      limit,
    });

    return apiSuccess(data.logs, 200, data.pagination);
  } catch (error: any) {
    return apiErrors.internal(error.message);
  }
}
