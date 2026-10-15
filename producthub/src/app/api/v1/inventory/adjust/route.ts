import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { InventoryService } from '@/modules/inventory/services/inventory.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập.', 401);
  }

  const role = session.user.role;
  if (role !== 'owner' && role !== 'administrator' && role !== 'editor') {
    return apiError('FORBIDDEN', 'Bạn không có quyền điều chỉnh tồn kho.', 403);
  }

  try {
    const body = await req.json();
    if (!body.productId || body.changeAmount === undefined) {
      return apiError('VALIDATION_ERROR', 'Mã sản phẩm và số lượng thay đổi là bắt buộc.', 400);
    }

    const result = await InventoryService.adjustInventory({
      productId: body.productId,
      locationId: body.locationId,
      changeAmount: Number(body.changeAmount),
      reason: body.reason,
      expectedVersion: body.expectedVersion !== undefined ? Number(body.expectedVersion) : undefined,
      userId: session.user.id,
    });

    return apiSuccess(result);
  } catch (err: any) {
    if (err.message?.includes('hiện đang bị tắt')) {
      return apiError('MODULE_DISABLED', err.message, 403);
    }
    if (err.message?.includes('Optimistic Lock Conflict')) {
      return apiError('OPTIMISTIC_LOCK_CONFLICT', err.message, 409);
    }
    return apiError('BAD_REQUEST', err.message, 400);
  }
}
