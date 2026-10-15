import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { MediaService } from '@/modules/media/services/media.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để tải ảnh lên.', 401);
  }

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return apiError('VALIDATION_ERROR', 'Không tìm thấy tệp tải lên trong yêu cầu.', 400);
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const service = new MediaService();
    const mediaDoc = await service.uploadMedia(
      buffer,
      file.name,
      file.type,
      session.user.id
    );

    return apiSuccess(mediaDoc);
  } catch (err) {
    return apiError('INTERNAL_ERROR', (err as Error).message, 500);
  }
}
