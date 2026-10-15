import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { ProjectService } from '@/modules/projects/services/project.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để xem sản phẩm của dự án.', 401);
  }

  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '50', 10);

  try {
    const result = await ProjectService.getAssignedProducts(id, { page, limit });
    return apiSuccess(result);
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để thao tác.', 401);
  }

  const role = session.user.role;
  if (role !== 'owner' && role !== 'administrator') {
    return apiError('FORBIDDEN', 'Bạn không có quyền thao tác phân bổ sản phẩm.', 403);
  }

  const { id } = await params;

  try {
    const body = await req.json();
    const action = body.action as 'assign' | 'unassign' | 'override';

    if (action === 'assign') {
      if (!Array.isArray(body.productIds) || body.productIds.length === 0) {
        return apiError('BAD_REQUEST', 'Danh sách "productIds" không được để trống.', 400);
      }
      const res = await ProjectService.assignProducts(id, body.productIds);
      return apiSuccess(res);
    }

    if (action === 'unassign') {
      if (!Array.isArray(body.productIds) || body.productIds.length === 0) {
        return apiError('BAD_REQUEST', 'Danh sách "productIds" không được để trống.', 400);
      }
      const res = await ProjectService.unassignProducts(id, body.productIds);
      return apiSuccess(res);
    }

    if (action === 'override') {
      if (!body.productId) {
        return apiError('BAD_REQUEST', 'Tham số "productId" là bắt buộc.', 400);
      }
      const res = await ProjectService.setProductOverride(id, body.productId, {
        customName: body.customName,
        customPrice: body.customPrice !== undefined ? Number(body.customPrice) : undefined,
        customOriginalPrice: body.customOriginalPrice !== undefined ? Number(body.customOriginalPrice) : undefined,
        siteStatus: body.siteStatus,
        customAttributes: body.customAttributes,
      });
      return apiSuccess(res);
    }

    return apiError('BAD_REQUEST', 'Action không hợp lệ. Chỉ chấp nhận: assign, unassign, override.', 400);
  } catch (err: any) {
    return apiError('BAD_REQUEST', err.message, 400);
  }
}
