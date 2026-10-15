import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { MediaService } from '@/modules/media/services/media.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để thực hiện thao tác này.', 401);
  }

  try {
    const body = await req.json();
    const ids: string[] = body.ids || [];
    const deleteFromDrive: boolean = body.deleteFromDrive === true;

    if (!Array.isArray(ids) || ids.length === 0) {
      return apiError('VALIDATION_ERROR', 'Danh sách ID không hợp lệ.', 400);
    }

    const service = new MediaService();
    const result = await service.bulkDeleteOrphaned(ids, deleteFromDrive);
    return apiSuccess(result);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500);
  }
}
