import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { hasPermission } from '@/core/auth/permissions';
import { apiSuccess, apiCreated, apiErrors } from '@/core/response/api-response';
import { UserService } from '@/modules/users/services/user.service';

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
        'users.read'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền xem danh sách người dùng');
    }

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const result = await UserService.listUsers({
      search,
      role,
      status,
      page,
      limit,
    });

    return apiSuccess(result.users, 200, result.pagination);
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
        'users.create'
      )
    ) {
      return apiErrors.forbidden('Bạn không có quyền tạo người dùng');
    }

    const body = await req.json();
    const newUser = await UserService.createUser(body);
    return apiCreated(newUser);
  } catch (error: any) {
    return apiErrors.badRequest(error.message);
  }
}
