import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { auth } from '@/core/auth/auth';
import { GoogleDriveService } from '@/modules/integrations/services/google-drive.service';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');

  const cookieStore = await cookies();
  const savedState = cookieStore.get('google_oauth_state')?.value;
  cookieStore.delete('google_oauth_state');

  const mediaUrl = new URL('/media', req.url);

  if (error) {
    mediaUrl.searchParams.set('drive_error', `Google từ chối ủy quyền: ${error}`);
    return NextResponse.redirect(mediaUrl);
  }

  if (!code || !state) {
    mediaUrl.searchParams.set('drive_error', 'Yêu cầu không hợp lệ hoặc thiếu mã ủy quyền.');
    return NextResponse.redirect(mediaUrl);
  }

  if (savedState && savedState !== state) {
    mediaUrl.searchParams.set('drive_error', 'Xác thực state thất bại (CSRF). Vui lòng thử kết nối lại.');
    return NextResponse.redirect(mediaUrl);
  }

  try {
    const result = await GoogleDriveService.handleCallback(code, session?.user?.id);
    mediaUrl.searchParams.set('drive_connected', '1');
    mediaUrl.searchParams.set('drive_email', encodeURIComponent(result.email));
    return NextResponse.redirect(mediaUrl);
  } catch (err) {
    console.error('[Google OAuth Callback Error]', err);
    mediaUrl.searchParams.set('drive_error', (err as Error).message || 'Không thể hoàn tất kết nối Google Drive.');
    return NextResponse.redirect(mediaUrl);
  }
}
