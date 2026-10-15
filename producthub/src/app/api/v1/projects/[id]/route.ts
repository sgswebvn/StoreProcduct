import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { ProjectService } from '@/modules/projects/services/project.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để xem thông tin dự án.', 401);
  }

  const { id } = await params;

  try {
    const project = await ProjectService.getById(id);
    if (!project) {
      return apiError('NOT_FOUND', 'Không tìm thấy dự án.', 404);
    }
    return apiSuccess(project);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để thao tác.', 401);
  }

  const role = session.user.role;
  if (role !== 'owner' && role !== 'administrator') {
    return apiError('FORBIDDEN', 'Bạn không có quyền chỉnh sửa dự án.', 403);
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const updated = await ProjectService.update(id, body, session.user.id);
    return apiSuccess(updated);
  } catch (err: any) {
    return apiError('BAD_REQUEST', err.message, 400);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để thao tác.', 401);
  }

  const role = session.user.role;
  if (role !== 'owner' && role !== 'administrator') {
    return apiError('FORBIDDEN', 'Chỉ Quản trị viên mới có quyền xóa dự án.', 403);
  }

  const { id } = await params;

  try {
    await ProjectService.delete(id, session.user.id);
    return apiSuccess({ success: true, message: 'Đã xóa dự án thành công.' });
  } catch (err: any) {
    return apiError('BAD_REQUEST', err.message, 400);
  }
}
