import { auth } from '@/core/auth/auth';
import { GoogleDriveService } from '@/modules/integrations/services/google-drive.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để xem trạng thái.', 401);
  }

  const status = await GoogleDriveService.getStatus();
  return apiSuccess(status);
}
