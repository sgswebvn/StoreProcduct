import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { ApiKeyService } from '@/modules/integrations/services/api-key.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để thu hồi API Key.', 401);
  }

  const role = session.user.role;
  if (role !== 'owner' && role !== 'administrator') {
    return apiError('FORBIDDEN', 'Bạn không có quyền thu hồi API Key.', 403);
  }

  const { id } = await params;

  try {
    const updated = await ApiKeyService.revokeApiKey(id);
    return apiSuccess(updated);
  } catch (err: any) {
    return apiError('BAD_REQUEST', err.message, 400);
  }
}
