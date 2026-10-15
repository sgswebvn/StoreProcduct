import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { apiSuccess, apiErrors, apiError } from '@/core/response/api-response';
import { ProductService } from '@/modules/products/services/product.service';
import { updateProductSchema } from '@/modules/products/validation/product.schema';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const product = await ProductService.getById(id);
    if (!product) {
      return apiErrors.notFound('Sản phẩm');
    }
    return apiSuccess(product);
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
    const parseResult = updateProductSchema.safeParse(body);
    if (!parseResult.success) {
      return apiErrors.validation(parseResult.error.format());
    }

    const updated = await ProductService.update(id, parseResult.data, session.user.id);
    return apiSuccess(updated);
  } catch (error: any) {
    if (error.message?.includes('Xung đột dữ liệu') || error.message?.includes('phiên bản')) {
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

    const { id } = await context.params;
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get('permanent') === 'true';

    if (permanent) {
      await ProductService.delete(id);
    } else {
      await ProductService.archive(id, session.user.id);
    }

    return apiSuccess({ success: true, archived: !permanent, deleted: permanent });
  } catch (error: any) {
    return apiError('CONFLICT', error.message, 400);
  }
}
