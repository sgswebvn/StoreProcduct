import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { InventoryService } from '@/modules/inventory/services/inventory.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập.', 401);
  }

  const { productId } = await params;

  try {
    const [items, logs] = await Promise.all([
      InventoryService.getInventoryByProduct(productId),
      InventoryService.getProductInventoryLogs(productId),
    ]);

    return apiSuccess({ items, logs });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500);
  }
}
