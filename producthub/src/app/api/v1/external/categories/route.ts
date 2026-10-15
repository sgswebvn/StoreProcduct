import { NextRequest } from 'next/server';
import { authenticateApiKey } from '@/core/security/api-key-auth';
import { CategoryService } from '@/modules/categories/services/category.service';
import { ProjectService } from '@/modules/projects/services/project.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  // Xác thực API Key với quyền "categories.read"
  const authResult = await authenticateApiKey(req, 'categories.read');
  if (!authResult.authenticated || !authResult.apiKey) {
    return apiError(
      authResult.errorStatus === 403 ? 'FORBIDDEN' : 'UNAUTHORIZED',
      authResult.errorMessage || 'Xác thực API Key thất bại.',
      authResult.errorStatus || 401
    );
  }

  const apiKey = authResult.apiKey;

  try {
    const allCategories = await CategoryService.getTree('active');

    // Nếu API Key thuộc Project và Project có giới hạn assignedCategories
    if (apiKey.projectId) {
      const project = await ProjectService.getById(apiKey.projectId.toString());
      if (project && project.assignedCategories && project.assignedCategories.length > 0) {
        const allowedIds = new Set(project.assignedCategories.map((c: any) => c._id.toString()));
        const filtered = allCategories.filter((c: any) => allowedIds.has(c._id.toString()));
        return apiSuccess({ items: filtered, total: filtered.length });
      }
    }

    return apiSuccess({ items: allCategories, total: allCategories.length });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500);
  }
}
