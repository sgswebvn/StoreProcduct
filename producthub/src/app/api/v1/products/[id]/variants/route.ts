import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { apiSuccess, apiCreated, apiErrors, apiError } from '@/core/response/api-response';
import { ProductVariantService } from '@/modules/products/services/product-variant.service';
import { createProductVariantSchema } from '@/modules/products/validation/product-variant.schema';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const variants = await ProductVariantService.listByProduct(id);
    return apiSuccess(variants);
  } catch (error: any) {
    return apiErrors.internal(error.message);
  }
}

export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    const { id } = await context.params;
    const body = await req.json();
    const parseResult = createProductVariantSchema.safeParse(body);
    if (!parseResult.success) {
      return apiErrors.validation(parseResult.error.format());
    }

    const variant = await ProductVariantService.create(id, parseResult.data, session.user.id);
    return apiCreated(variant);
  } catch (error: any) {
    return apiError('CONFLICT', error.message, 400);
  }
}
