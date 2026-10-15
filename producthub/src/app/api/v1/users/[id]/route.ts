import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { hasPermission } from '@/core/auth/permissions';
import { apiSuccess, apiErrors } from '@/core/response/api-response';
import { UserService } from '@/modules/users/services/user.service';

export async function GET(
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
        'users.read'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền xem thông tin người dùng');
    }

    const { id } = await params;
    const user = await UserService.getUserById(id);
    return apiSuccess(user);
  } catch (error: any) {
    return apiErrors.badRequest(error.message);
  }
}

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
        'users.update'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền cập nhật người dùng');
    }

    const { id } = await params;
    const body = await req.json();

    const updated = await UserService.updateUser(id, body, {
      id: session.user.id,
      role: session.user.role,
    });

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
        'users.disable'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền vô hiệu hóa người dùng');
    }

    const { id } = await params;
    const result = await UserService.disableUser(id, {
      id: session.user.id,
      role: session.user.role,
    });

    return apiSuccess(result);
  } catch (error: any) {
    return apiErrors.badRequest(error.message);
  }
}
