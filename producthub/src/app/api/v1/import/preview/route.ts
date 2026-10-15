import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { ImportExportService } from '@/modules/import-export/services/import-export.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để nhập dữ liệu.', 401);
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    let csvText = '';

    if (contentType.includes('multipart/form-data')) {
      const formData = await req.formData();
      const file = formData.get('file') as File;
      if (!file) {
        return apiError('VALIDATION_ERROR', 'Vui lòng chọn file CSV để tải lên.', 400);
      }
      csvText = await file.text();
    } else {
      const body = await req.json();
      csvText = body.csvText || '';
    }

    if (!csvText.trim()) {
      return apiError('VALIDATION_ERROR', 'Nội dung file CSV trống.', 400);
    }

    const previewResult = await ImportExportService.previewImport(csvText);
    return apiSuccess(previewResult);
  } catch (err: any) {
    return apiError('BAD_REQUEST', err.message || 'Lỗi xử lý file CSV.', 400);
  }
}
