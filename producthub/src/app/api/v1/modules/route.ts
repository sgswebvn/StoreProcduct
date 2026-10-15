import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { ModuleService } from '@/core/modules/services/module.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để xem danh sách module.', 401);
  }

  try {
    const modules = await ModuleService.getAllWithState();
    return apiSuccess({ items: modules, total: modules.length });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message || 'Lỗi lấy danh sách module.', 500);
  }
}
