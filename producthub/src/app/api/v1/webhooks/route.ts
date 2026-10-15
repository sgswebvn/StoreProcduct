import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { WebhookService } from '@/modules/integrations/services/webhook.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để xem danh sách Webhooks.', 401);
  }

  try {
    const items = await WebhookService.listWebhooks();
    return apiSuccess({ items, total: items.length });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để tạo Webhook.', 401);
  }

  const role = session.user.role;
  if (role !== 'owner' && role !== 'administrator') {
    return apiError('FORBIDDEN', 'Bạn không có quyền quản lý Webhooks.', 403);
  }

  try {
    const body = await req.json();
    if (!body.name || !body.url) {
      return apiError('VALIDATION_ERROR', 'Tên và URL Webhook là bắt buộc.', 400);
    }

    const webhook = await WebhookService.createWebhook({
      name: body.name.trim(),
      url: body.url.trim(),
      events: body.events,
      secret: body.secret,
      userId: session.user.id,
    });

    return apiSuccess(webhook, 201);
  } catch (err: any) {
    return apiError('BAD_REQUEST', err.message, 400);
  }
}
