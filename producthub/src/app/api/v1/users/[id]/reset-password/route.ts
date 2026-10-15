import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { hasPermission } from '@/core/auth/permissions';
import { apiSuccess, apiErrors } from '@/core/response/api-response';
import { UserService } from '@/modules/users/services/user.service';

export async function POST(
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
        'users.update'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền đặt lại mật khẩu cho người dùng');
    }

    const { id } = await params;
    const { newPassword } = await req.json();

    const result = await UserService.resetPassword(id, newPassword, {
      id: session.user.id,
      role: session.user.role,
    });

    return apiSuccess(result);
  } catch (error: any) {
    return apiErrors.badRequest(error.message);
  }
}
