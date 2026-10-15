import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { apiSuccess, apiCreated, apiErrors, apiError } from '@/core/response/api-response';
import { CategoryService } from '@/modules/categories/services/category.service';
import { createCategorySchema, queryCategorySchema } from '@/modules/categories/validation/category.schema';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const tree = searchParams.get('tree') === 'true';
    const statusParam = searchParams.get('status') as 'active' | 'inactive' | undefined;
    const status = statusParam === 'active' || statusParam === 'inactive' ? statusParam : undefined;

    if (tree) {
      const data = await CategoryService.getTree(status);
      return apiSuccess(data);
    } else {
      const data = await CategoryService.listFlat(status);
      return apiSuccess(data);
    }
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
    const parseResult = createCategorySchema.safeParse(body);
    if (!parseResult.success) {
      return apiErrors.validation(parseResult.error.format());
    }

    const category = await CategoryService.create(parseResult.data, session.user.id);
    return apiCreated(category);
  } catch (error: any) {
    return apiError('CONFLICT', error.message, 400);
  }
}
