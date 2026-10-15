import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { InventoryService } from '@/modules/inventory/services/inventory.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để xem tồn kho.', 401);
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const result = await InventoryService.listInventory({ page, limit });
    return apiSuccess(result);
  } catch (err: any) {
    if (err.message?.includes('hiện đang bị tắt')) {
      return apiError('MODULE_DISABLED', err.message, 403);
    }
    return apiError('INTERNAL_ERROR', err.message, 500);
  }
}
