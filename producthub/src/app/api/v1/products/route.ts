import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { apiSuccess, apiCreated, apiErrors, apiError } from '@/core/response/api-response';
import { ProductService } from '@/modules/products/services/product.service';
import { createProductSchema, queryProductSchema } from '@/modules/products/validation/product.schema';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsedQuery = queryProductSchema.safeParse({
      page: searchParams.get('page') || 1,
      limit: searchParams.get('limit') || 20,
      search: searchParams.get('search') || undefined,
      category: searchParams.get('category') || undefined,
      status: searchParams.get('status') || 'all',
      sortBy: searchParams.get('sortBy') || 'createdAt',
      sortOrder: searchParams.get('sortOrder') || 'desc',
    });

    if (!parsedQuery.success) {
      return apiErrors.validation(parsedQuery.error.format());
    }

    const result = await ProductService.list(parsedQuery.data);
    return apiSuccess(result.items, 200, {
      page: result.page,
      limit: result.limit,
      total: result.total,
      totalPages: result.totalPages,
    });
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
    const parseResult = createProductSchema.safeParse(body);
    if (!parseResult.success) {
      return apiErrors.validation(parseResult.error.format());
    }

    const product = await ProductService.create(parseResult.data, session.user.id);
    return apiCreated(product);
  } catch (error: any) {
    return apiError('CONFLICT', error.message, 400);
  }
}
