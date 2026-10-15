import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { hasPermission } from '@/core/auth/permissions';
import { apiSuccess, apiErrors } from '@/core/response/api-response';
import { UserService } from '@/modules/users/services/user.service';

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
        'users.read'
      ) &&
      !hasPermission(
        session.user.role,
        session.user.additionalPermissions || [],
        'roles.read'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền xem vai trò');
    }

    const roles = UserService.listRoles();
    return apiSuccess(roles);
  } catch (error: any) {
    return apiErrors.internal(error.message);
  }
}
