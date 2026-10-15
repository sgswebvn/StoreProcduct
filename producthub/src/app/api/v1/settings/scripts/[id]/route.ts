import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { hasPermission } from '@/core/auth/permissions';
import { apiSuccess, apiErrors } from '@/core/response/api-response';
import { ScriptService } from '@/modules/settings/services/script.service';

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
        'scripts.manage'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền chỉnh sửa mã tích hợp');
    }

    const { id } = await params;
    const body = await req.json();

    const updated = await ScriptService.updateScript(id, body, session.user.id);
    return apiSuccess(updated);
  } catch (error: any) {
    return apiErrors.badRequest(error.message);
  }
}

export async function DELETE(
  _req: NextRequest,
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
        'scripts.manage'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền xóa mã tích hợp');
    }

    const { id } = await params;
    const result = await ScriptService.deleteScript(id);
    return apiSuccess(result);
  } catch (error: any) {
    return apiErrors.badRequest(error.message);
  }
}
