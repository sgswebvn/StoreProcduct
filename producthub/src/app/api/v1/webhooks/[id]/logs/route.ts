import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { WebhookService } from '@/modules/integrations/services/webhook.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để xem logs.', 401);
  }

  const { id } = await params;

  try {
    const logs = await WebhookService.getDeliveryLogs(id);
    return apiSuccess({ items: logs, total: logs.length });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500);
  }
}
