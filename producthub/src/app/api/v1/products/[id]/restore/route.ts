import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { apiSuccess, apiErrors, apiError } from '@/core/response/api-response';
import { ProductService } from '@/modules/products/services/product.service';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    const { id } = await context.params;
    const restored = await ProductService.restore(id, session.user.id);
    return apiSuccess(restored);
  } catch (error: any) {
    return apiError('CONFLICT', error.message, 400);
  }
}
