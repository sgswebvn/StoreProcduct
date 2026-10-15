import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { hasPermission } from '@/core/auth/permissions';
import { apiSuccess, apiCreated, apiErrors } from '@/core/response/api-response';
import { ScriptService } from '@/modules/settings/services/script.service';

export async function GET(_req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    if (
      !hasPermission(
        session.user.role,
        session.user.additionalPermissions || [],
        'scripts.read'
      ) &&
      !hasPermission(
        session.user.role,
        session.user.additionalPermissions || [],
        'settings.read'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền xem danh sách mã tích hợp');
    }

    const scripts = await ScriptService.listScripts();
    return apiSuccess(scripts);
  } catch (error: any) {
    return apiErrors.internal(error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    if (
      !hasPermission(
        session.user.role,
        session.user.additionalPermissions || [],
        'scripts.manage'
      )
    ) {
      return apiErrors.forbidden(
        'Chỉ Super Admin mới có quyền thêm mã tích hợp hoặc script thực thi'
      );
    }

    const body = await req.json();
    const newScript = await ScriptService.createScript(body, session.user.id);
    return apiCreated(newScript);
  } catch (error: any) {
    return apiErrors.badRequest(error.message);
  }
}
