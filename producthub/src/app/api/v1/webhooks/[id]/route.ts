import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { WebhookService } from '@/modules/integrations/services/webhook.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập.', 401);
  }

  const role = session.user.role;
  if (role !== 'owner' && role !== 'administrator') {
    return apiError('FORBIDDEN', 'Bạn không có quyền xóa Webhook.', 403);
  }

  const { id } = await params;

  try {
    await WebhookService.deleteWebhook(id);
    return apiSuccess({ success: true, message: 'Đã xóa Webhook thành công.' });
  } catch (err: any) {
    return apiError('BAD_REQUEST', err.message, 400);
  }
}
