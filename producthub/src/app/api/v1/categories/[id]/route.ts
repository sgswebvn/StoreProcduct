import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { apiSuccess, apiErrors, apiError } from '@/core/response/api-response';
import { CategoryService } from '@/modules/categories/services/category.service';
import { updateCategorySchema } from '@/modules/categories/validation/category.schema';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const category = await CategoryService.getById(id);
    if (!category) {
      return apiErrors.notFound('Danh mục');
    }
    return apiSuccess(category);
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
    const parseResult = updateCategorySchema.safeParse(body);
    if (!parseResult.success) {
      return apiErrors.validation(parseResult.error.format());
    }

    const updated = await CategoryService.update(id, parseResult.data, session.user.id);
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
    await CategoryService.delete(id);
    return apiSuccess({ deleted: true });
  } catch (error: any) {
    return apiError('CONFLICT', error.message, 400);
  }
}
