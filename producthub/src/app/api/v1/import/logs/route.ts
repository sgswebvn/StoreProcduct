import { NextRequest } from 'next/server';
import { auth } from '@/core/auth/auth';
import { ImportExportService } from '@/modules/import-export/services/import-export.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để xem lịch sử nhập dữ liệu.', 401);
  }

  try {
    const logs = await ImportExportService.listImportLogs();
    return apiSuccess({ items: logs, total: logs.length });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500);
  }
}
