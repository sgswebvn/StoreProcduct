import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { apiCreated, apiErrors, apiError } from '@/core/response/api-response';
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
    const duplicated = await ProductService.duplicate(id, session.user.id);
    return apiCreated(duplicated);
  } catch (error: any) {
    return apiError('CONFLICT', error.message, 400);
  }
}
