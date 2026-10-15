import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { MediaService } from '@/modules/media/services/media.service';
import { apiError, apiSuccess, apiErrors } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const service = new MediaService();
    const [media, usage] = await Promise.all([
      service.getById(id),
      service.getMediaUsage(id),
    ]);

    if (!media) {
      return apiErrors.notFound('Hình ảnh');
    }

    return apiSuccess({
      ...media,
      usage,
    });
  } catch (err: any) {
    return apiErrors.internal(err.message);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để chỉnh sửa thông tin ảnh.', 401);
  }

  try {
    const { id } = await params;
    const body = await req.json();
    const service = new MediaService();

    const updated = await service.updateMedia(id, {
      alt: body.alt,
      title: body.title,
      fileName: body.fileName,
    });

    return apiSuccess(updated);
  } catch (err: any) {
    return apiError('VALIDATION_ERROR', err.message, 400);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để xóa ảnh.', 401);
  }

  const { id } = await params;
  const deleteFromDrive = req.nextUrl.searchParams.get('deleteFromDrive') === 'true';

  try {
    const service = new MediaService();
    const result = await service.deleteMedia(id, deleteFromDrive);
    return apiSuccess(result);
  } catch (err) {
    return apiError('VALIDATION_ERROR', (err as Error).message, 400);
  }
}
