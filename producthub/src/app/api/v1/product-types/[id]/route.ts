import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { apiSuccess, apiErrors, apiError } from '@/core/response/api-response';
import { ProductTypeService } from '@/modules/products/services/product-type.service';
import { updateProductTypeSchema } from '@/modules/products/validation/product-type.schema';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const item = await ProductTypeService.getById(id);
    if (!item) {
      return apiErrors.notFound('Loại sản phẩm');
    }
    return apiSuccess(item);
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

    const { id } = await context.params;
    const body = await req.json();
    const parseResult = updateProductTypeSchema.safeParse(body);
    if (!parseResult.success) {
      return apiErrors.validation(parseResult.error.format());
    }

    const updated = await ProductTypeService.update(id, parseResult.data, session.user.id);
    return apiSuccess(updated);
  } catch (error: any) {
    return apiError('CONFLICT', error.message, 400);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    const { id } = await context.params;
    await ProductTypeService.delete(id);
    return apiSuccess({ deleted: true });
  } catch (error: any) {
    return apiError('CONFLICT', error.message, 400);
  }
}
