import { NextRequest } from 'next/server';
import { authenticateApiKey } from '@/core/security/api-key-auth';
import { ProjectService } from '@/modules/projects/services/project.service';
import { ProductService } from '@/modules/products/services/product.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // 1. Xác thực API Key với quyền "products.read"
  const authResult = await authenticateApiKey(req, 'products.read');
  if (!authResult.authenticated || !authResult.apiKey) {
    return apiError(
      authResult.errorStatus === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
      authResult.errorMessage || 'Xác thực API Key thất bại.',
      authResult.errorStatus || 401
    );
  }

  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const search = searchParams.get('search') || undefined;

  const apiKey = authResult.apiKey;

  try {
    // 2. Nếu API Key gắn với Project -> Project-Scoped Access
    if (apiKey.projectId) {
      const projId = (apiKey.projectId as any)._id
        ? (apiKey.projectId as any)._id.toString()
        : apiKey.projectId.toString();
      const result = await ProjectService.getAssignedProducts(projId, { page, limit, search });
      return apiSuccess({
        scope: 'project',
        project: result.project,
        items: result.items.filter((item) => item.siteStatus === 'published'), // Chỉ trả về sản phẩm published trên site này
        total: result.total,
        page: result.page,
        limit: result.limit,
        totalPages: result.totalPages,
      });
    }

    // 3. Nếu API Key toàn quyền (Global) -> Trả về catalog chung
    const result = await ProductService.list({
      page,
      limit,
      search,
      status: 'active',
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    return apiSuccess({
      scope: 'global',
      items: result.items,
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500);
  }
}
