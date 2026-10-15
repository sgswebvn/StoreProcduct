import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { apiSuccess, apiErrors, apiError } from '@/core/response/api-response';
import { ProductVariantService } from '@/modules/products/services/product-variant.service';
import { updateProductVariantSchema } from '@/modules/products/validation/product-variant.schema';

interface RouteContext {
  params: Promise<{ id: string; variantId: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { variantId } = await context.params;
    const variant = await ProductVariantService.getById(variantId);
    if (!variant) return apiErrors.notFound('Biến thể');
    return apiSuccess(variant);
  } catch (error: any) {
    return apiErrors.internal(error.message);
  }
}

export async function PUT(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    const { variantId } = await context.params;
    const body = await req.json();
    const parseResult = updateProductVariantSchema.safeParse(body);
    if (!parseResult.success) {
      return apiErrors.validation(parseResult.error.format());
    }

    const updated = await ProductVariantService.update(variantId, parseResult.data, session.user.id);
    return apiSuccess(updated);
  } catch (error: any) {
    if (error.message?.includes('chỉnh sửa bởi phiên làm việc khác')) {
      return apiError('OPTIMISTIC_LOCK_CONFLICT', error.message, 409);
    }
    return apiError('CONFLICT', error.message, 400);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    const { variantId } = await context.params;
    await ProductVariantService.delete(variantId);
    return apiSuccess({ deleted: true });
  } catch (error: any) {
    return apiError('CONFLICT', error.message, 400);
  }
}
