import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/core/auth/auth';
import { ImportExportService } from '@/modules/import-export/services/import-export.service';
import { apiError } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để xuất dữ liệu.', 401);
  }

  const { searchParams } = new URL(req.url);
  const status = (searchParams.get('status') as any) || undefined;
  const category = searchParams.get('category') || undefined;

  try {
    const csvContent = await ImportExportService.exportProducts({ status, category });

    const fileName = `storeproduct_export_${new Date().toISOString().slice(0, 10)}.csv`;

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: any) {
    return apiError('INTERNAL_ERROR', err.message, 500);
  }
}
