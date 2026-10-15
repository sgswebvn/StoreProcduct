import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { apiSuccess, apiCreated, apiErrors, apiError } from '@/core/response/api-response';
import { ProductTypeService } from '@/modules/products/services/product-type.service';
import { createProductTypeSchema } from '@/modules/products/validation/product-type.schema';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status') as 'active' | 'archived' | 'all' | null;
    const status = statusParam || 'all';

    const items = await ProductTypeService.list(status);
    return apiSuccess(items);
  } catch (error: any) {
    return apiErrors.internal(error.message);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) {
      return apiErrors.unauthorized();
    }

    const body = await req.json();
    const parseResult = createProductTypeSchema.safeParse(body);
    if (!parseResult.success) {
      return apiErrors.validation(parseResult.error.format());
    }

    const productType = await ProductTypeService.create(parseResult.data, session.user.id);
    return apiCreated(productType);
  } catch (error: any) {
    return apiError('CONFLICT', error.message, 400);
  }
}
