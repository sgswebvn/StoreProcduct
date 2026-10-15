import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { ImportExportService } from '@/modules/import-export/services/import-export.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để thao tác.', 401);
  }

  const role = session.user.role;
  if (role !== 'owner' && role !== 'administrator' && role !== 'editor') {
    return apiError('FORBIDDEN', 'Bạn không có quyền nhập dữ liệu sản phẩm.', 403);
  }

  try {
    const body = await req.json();
    if (!Array.isArray(body.rows) || body.rows.length === 0) {
      return apiError('VALIDATION_ERROR', 'Danh sách dòng cần nhập không được rỗng.', 400);
    }

    const fileName = body.fileName || `import_${Date.now()}.csv`;
    const result = await ImportExportService.executeImport(
      body.rows,
      fileName,
      session.user.id
    );

    return apiSuccess(result);
  } catch (err: any) {
    return apiError('BAD_REQUEST', err.message || 'Lỗi thực thi nhập dữ liệu.', 400);
  }
}
