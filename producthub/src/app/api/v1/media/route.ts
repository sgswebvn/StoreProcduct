import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { MediaService } from '@/modules/media/services/media.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để xem thư viện media.', 401);
  }

  const searchParams = req.nextUrl.searchParams;
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const search = searchParams.get('search') || undefined;
  const usageParam = searchParams.get('usage') as 'all' | 'used' | 'orphaned' | null;
  const usage = usageParam || 'all';

  try {
    const service = new MediaService();
    const result = await service.listMedia({ page, limit, search, usage });
    return apiSuccess(result);
  } catch (err) {
    return apiError('INTERNAL_ERROR', (err as Error).message, 500);
  }
}
