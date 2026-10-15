import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { ApiKeyService } from '@/modules/integrations/services/api-key.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để xem danh sách API Keys.', 401);
  }

  const role = session.user.role;
  if (role !== 'owner' && role !== 'administrator') {
    return apiError('FORBIDDEN', 'Bạn không có quyền quản lý API Keys.', 403);
  }

  try {
    const keys = await ApiKeyService.listApiKeys();
    return apiSuccess({ items: keys, total: keys.length });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để tạo API Key.', 401);
  }

  const role = session.user.role;
  if (role !== 'owner' && role !== 'administrator') {
    return apiError('FORBIDDEN', 'Bạn không có quyền tạo API Key.', 403);
  }

  try {
    const body = await req.json();
    if (!body.name || !body.name.trim()) {
      return apiError('VALIDATION_ERROR', 'Tên khóa API là bắt buộc.', 400);
    }

    const result = await ApiKeyService.createApiKey({
      name: body.name.trim(),
      projectId: body.projectId || undefined,
      scopes: body.scopes,
      rateLimit: body.rateLimit ? Number(body.rateLimit) : 60,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : undefined,
      userId: session.user.id,
    });

    return apiSuccess(result, 201);
  } catch (err: any) {
    return apiError('BAD_REQUEST', err.message, 400);
  }
}
