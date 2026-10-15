import dotenv from 'dotenv';
import path from 'path';
import { MediaService } from '../src/modules/media/services/media.service';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function uploadTest() {
  console.log('🧪 Bắt đầu kiểm tra tải ảnh lên Google Drive...');
  const mediaService = new MediaService();

  // Tạo một buffer ảnh PNG đơn giản (hoặc SVG)
  const sampleSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
    <rect width="600" height="400" fill="#4f46e5" rx="16"/>
    <circle cx="300" cy="160" r="60" fill="#ffffff" opacity="0.2"/>
    <path d="M260 260 L300 200 L340 260 Z" fill="#ffffff"/>
    <text x="300" y="320" fill="#ffffff" font-size="28" font-family="sans-serif" font-weight="bold" text-anchor="middle">StoreProduct Demo Image</text>
    <text x="300" y="355" fill="#c7d2fe" font-size="16" font-family="sans-serif" text-anchor="middle">Google Drive Integration Test</text>
  </svg>`;

  const buffer = Buffer.from(sampleSvg, 'utf-8');
  const fileName = `storeproduct_test_${Date.now()}.svg`;

  console.log(`📁 Tên tệp: ${fileName} (${buffer.length} bytes)`);
  console.log('🚀 Đang gửi dữ liệu lên Google Drive...');

  const result = await mediaService.uploadMedia(
    buffer,
    fileName,
    'image/svg+xml'
  );

  console.log('✅ Tải ảnh lên Google Drive và MongoDB thành công!');
  console.log('   ID trong MongoDB:', result._id);
  console.log('   Google Drive File ID:', result.driveFileId);
  console.log('   Google Drive Link:', result.driveWebViewLink);
  console.log('   URL Stream Xem Ảnh:', `http://localhost:3000/api/v1/media/${result._id}/view`);
  process.exit(0);
}

uploadTest().catch((err) => {
  console.error('❌ Lỗi tải ảnh:', err.message);
  process.exit(1);
});
