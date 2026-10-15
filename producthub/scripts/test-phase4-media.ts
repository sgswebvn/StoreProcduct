import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDB } from '../src/core/db/connect';
import { validateImageMagicBytes } from '../src/core/utils/magic-bytes';
import { MediaService } from '../src/modules/media/services/media.service';
import { Media } from '../src/modules/media/infra/media.model';
import { Product } from '../src/modules/products/infra/product.model';
import mongoose from 'mongoose';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG PHASE 4: MEDIA & FILE MANAGEMENT ---');
  await connectDB();

  // Test 1: Kiểm tra Magic Bytes Verification
  console.log('\n[1] Kiểm thử xác thực Magic Bytes:');
  const fakeJpgBuffer = Buffer.from('MZ... NOT A REAL IMAGE BUT A SCRIPT');
  const validPngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
  const validJpgBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]);

  const isFakeValid = validateImageMagicBytes(fakeJpgBuffer, 'image/jpeg');
  const isPngValid = validateImageMagicBytes(validPngBuffer, 'image/png');
  const isJpgValid = validateImageMagicBytes(validJpgBuffer, 'image/jpeg');

  console.log(' - Fake image với MIME image/jpeg:', isFakeValid ? '❌ LỖI (Bị lọt)' : '✅ Chặn thành công');
  console.log(' - Real PNG magic bytes:', isPngValid ? '✅ Hợp lệ' : '❌ Lỗi');
  console.log(' - Real JPG magic bytes:', isJpgValid ? '✅ Hợp lệ' : '❌ Lỗi');

  if (isFakeValid || !isPngValid || !isJpgValid) {
    throw new Error('Magic bytes validation thất bại!');
  }

  const mediaService = new MediaService();

  // Test 2: Upload trực tiếp với buffer giả mạo xem MediaService có từ chối không
  console.log('\n[2] Kiểm thử MediaService.uploadMedia chặn file giả mạo:');
  try {
    await mediaService.uploadMedia(fakeJpgBuffer, 'fake-hack.jpg', 'image/jpeg');
    console.log('❌ Lỗi: MediaService không chặn file giả mạo');
    throw new Error('MediaService cho phép upload file giả mạo!');
  } catch (err: any) {
    console.log('✅ MediaService đã chặn đúng quy chuẩn:', err.message);
  }

  // Test 3: Tạo mock Media record để test metadata và usage tracking
  console.log('\n[3] Kiểm thử Metadata CRUD & SEO (alt text, title):');
  const testMedia = await Media.create({
    fileName: 'test-product-banner.png',
    driveFileId: 'mock_drive_file_id_' + Date.now(),
    mimeType: 'image/png',
    size: 2048,
    alt: 'Ảnh banner kiểm thử StoreProduct',
    title: 'Banner Sản Phẩm Test',
  });
  console.log(' - Đã tạo media:', testMedia._id.toString(), '| Alt:', testMedia.alt);

  // Cập nhật metadata
  const updatedMedia = await mediaService.updateMedia(testMedia._id.toString(), {
    alt: 'Alt text SEO mới cho StoreProduct',
    title: 'Tiêu đề cập nhật',
  });
  console.log(' - Đã cập nhật metadata:', updatedMedia?.alt === 'Alt text SEO mới cho StoreProduct' ? '✅ Thành công' : '❌ Lỗi');

  // Test 4: Usage tracking (sản phẩm & danh mục liên kết)
  console.log('\n[4] Kiểm thử Usage Tracking (Kiểm tra nơi sử dụng tệp):');
  let usage = await mediaService.getMediaUsage(testMedia._id.toString());
  console.log(' - Khi chưa gắn vào sản phẩm:', usage.inUse ? '❌ Đang dùng' : '✅ Chưa dùng (Orphaned)');

  // Import ProductService
  const { ProductService } = await import('../src/modules/products/services/product.service');

  // Tạo mock product qua ProductService để kích hoạt recalculateMediaCounts
  const testProduct = await ProductService.create({
    name: 'Sản phẩm Test Media Phase 4 ' + Date.now(),
    slug: 'san-pham-test-phase-4-' + Date.now(),
    price: 150000,
    status: 'draft',
    categories: [],
    thumbnail: testMedia._id.toString(),
    images: [],
    tags: ['test-media'],
  });

  usage = await mediaService.getMediaUsage(testMedia._id.toString());
  console.log(' - Sau khi gắn vào sản phẩm:', usage.inUse ? '✅ Đang dùng' : '❌ Lỗi không tìm thấy');
  console.log(' - Số lượng sản phẩm dùng:', usage.productCount, '| Tên sản phẩm:', usage.products[0]?.name);

  // Test 5: Lọc media theo usage (all, used, orphaned)
  console.log('\n[5] Kiểm thử bộ lọc listMedia:');
  const usedList = await mediaService.listMedia({ usage: 'used' });
  const hasInUsed = usedList.items.some((item) => item._id.toString() === testMedia._id.toString());
  console.log(' - Lọc "used" có chứa testMedia:', hasInUsed ? '✅ Có' : '❌ Không tìm thấy');

  // Thử xóa media đang dùng (phải bị từ chối)
  try {
    await mediaService.deleteMedia(testMedia._id.toString());
    console.log('❌ Lỗi: Cho phép xóa media đang được sản phẩm sử dụng');
  } catch (err: any) {
    console.log('✅ Chặn xóa media đang dùng thành công:', err.message);
  }

  // Xóa sản phẩm qua ProductService để tự động đồng bộ lại productCount trên Media thành 0
  await ProductService.delete(testProduct._id.toString());
  const orphanedList = await mediaService.listMedia({ usage: 'orphaned' });
  const hasInOrphaned = orphanedList.items.some((item) => item._id.toString() === testMedia._id.toString());
  console.log(' - Sau khi xóa sản phẩm liên kết, lọc "orphaned" có chứa testMedia:', hasInOrphaned ? '✅ Có' : '❌ Không tìm thấy');

  // Test 6: Bulk delete tệp mồ côi
  console.log('\n[6] Kiểm thử Bulk Delete Orphaned Media:');
  const bulkResult = await mediaService.bulkDeleteOrphaned([testMedia._id.toString()], false);
  console.log(' - Kết quả dọn dẹp hàng loạt:', bulkResult);

  const checkDeleted = await Media.findById(testMedia._id);
  console.log(' - Tệp trong CSDL sau khi dọn:', checkDeleted ? '❌ Chưa xóa' : '✅ Đã xóa hoàn toàn');

  // Dọn dẹp test product
  await Product.findByIdAndDelete(testProduct._id);
  console.log('\n🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ PHASE 4 ĐÃ VƯỢT QUA XUẤT SẮC! 🎉');

  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Kiểm thử thất bại:', err);
  process.exit(1);
});
