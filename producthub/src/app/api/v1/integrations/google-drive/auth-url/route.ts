import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { cookies } from 'next/headers';
import { auth } from '@/core/auth/auth';
import { GoogleDriveService } from '@/modules/integrations/services/google-drive.service';
import { apiError, apiSuccess } from '@/core/response/api-response';

export const dynamic = 'force-dynamic';

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return apiError('UNAUTHORIZED', 'Bạn cần đăng nhập để thực hiện thao tác này.', 401);
  }

  // Chỉ owner hoặc administrator được kết nối tài khoản lưu trữ
  if (session.user.role !== 'owner' && session.user.role !== 'administrator') {
    return apiError('FORBIDDEN', 'Tài khoản của bạn chưa được cấp quyền cấu hình kết nối Google Drive.', 403);
  }

  try {
    const state = crypto.randomBytes(24).toString('hex');
    const authUrl = GoogleDriveService.getAuthUrl(state);

    const cookieStore = await cookies();
    cookieStore.set('google_oauth_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10 phút
      path: '/',
    });

    return apiSuccess({ authUrl });
  } catch (err) {
    return apiError('INTERNAL_ERROR', (err as Error).message, 500);
  }
}
