import { NextRequest, NextResponse } from 'next/server';
import { connectDB } from '@/core/db/connect';
import Media from '@/modules/media/infra/media.model';
import { GoogleDriveService } from '@/modules/integrations/services/google-drive.service';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    await connectDB();
    const mediaDoc = await Media.findById(id).lean();

    if (!mediaDoc || !mediaDoc.driveFileId) {
      return new NextResponse('Media not found', { status: 404 });
    }

    const accessToken = await GoogleDriveService.getValidAccessToken();

    // Stream trực tiếp từ Google Drive API qua alt=media
    const driveRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${mediaDoc.driveFileId}?alt=media`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    if (!driveRes.ok) {
      return new NextResponse('Cannot load image from Drive', { status: driveRes.status });
    }

    const contentType = driveRes.headers.get('Content-Type') || mediaDoc.mimeType || 'image/jpeg';
    const imageBuffer = await driveRes.arrayBuffer();

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=604800',
      },
    });
  } catch (err) {
    console.error('[Media View Stream Error]', err);
    return new NextResponse('Internal error loading image', { status: 500 });
  }
}
