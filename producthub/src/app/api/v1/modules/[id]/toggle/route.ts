import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { ModuleService } from '@/core/modules/services/module.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để thao tác.', 401);
  }

  // Chỉ owner và administrator mới có quyền bật/tắt module
  const role = session.user.role;
  if (role !== 'owner' && role !== 'administrator') {
    return apiError('FORBIDDEN', 'Bạn không có quyền quản trị để thay đổi trạng thái module.', 403);
  }

  const { id } = await params;

  try {
    const body = await req.json();
    if (typeof body.enabled !== 'boolean') {
      return apiError('BAD_REQUEST', 'Tham số "enabled" phải là kiểu boolean.', 400);
    }

    const updatedModule = await ModuleService.toggleModule(
      id,
      body.enabled,
      session.user.id
    );

    return apiSuccess(updatedModule);
  } catch (err: any) {
    return apiError('BAD_REQUEST', err.message || 'Không thể thay đổi trạng thái module.', 400);
  }
}
