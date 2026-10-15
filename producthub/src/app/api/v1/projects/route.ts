import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { ProjectService } from '@/modules/projects/services/project.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để xem danh sách dự án.', 401);
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const search = searchParams.get('search') || undefined;
  const status = (searchParams.get('status') as 'active' | 'inactive') || undefined;

  try {
    const result = await ProjectService.list({ page, limit, search, status });
    return apiSuccess(result);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message || 'Lỗi lấy danh sách dự án.', 500);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để tạo dự án.', 401);
  }

  const role = session.user.role;
  if (role !== 'owner' && role !== 'administrator') {
    return apiError('FORBIDDEN', 'Bạn không có quyền tạo dự án mới.', 403);
  }

  try {
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return apiError('VALIDATION_ERROR', 'Tên dự án/site là bắt buộc.', 400);
    }

    const project = await ProjectService.create(body, session.user.id);
    return apiSuccess(project, 201);
  } catch (err: any) {
    return apiError('BAD_REQUEST', err.message || 'Lỗi tạo dự án.', 400);
  }
}
