import { auth } from '@/core/auth/auth';
import { GoogleDriveService } from '@/modules/integrations/services/google-drive.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function POST() {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để thực hiện thao tác này.', 401);
  }

  if (session.user.role !== 'owner' && session.user.role !== 'administrator') {
    return apiError('FORBIDDEN', 'Bạn không có quyền ngắt kết nối tài khoản Google Drive.', 403);
  }

  try {
    await GoogleDriveService.disconnect();
    return apiSuccess({ message: 'Đã ngắt kết nối Google Drive thành công.' });
  } catch (err) {
    return apiError('INTERNAL_ERROR', (err as Error).message, 500);
  }
}
