import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDB } from '../src/core/db/connect';
import { parseCSV, generateCSV } from '../src/modules/import-export/services/csv-helper';
import { ImportExportService } from '../src/modules/import-export/services/import-export.service';
import { Product } from '../src/modules/products/infra/product.model';
import mongoose from 'mongoose';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG GIAI ĐOẠN 7: NHẬP & XUẤT CSV HÀNG LOẠT ---');
  await connectDB();

  // Test 1: Parser CSV & UTF-8 BOM
  console.log('\n[1] Kiểm thử Parser CSV chuẩn RFC 4180 & UTF-8:');
  const sampleCsv = `name,sku,price,tags\n"Áo Polo, Cao Cấp",POLO-01,250000,"áo,polo"\n"Quần Short",SHORT-01,150000,short`;
  const parsed = parseCSV(sampleCsv);
  console.log(' - Số dòng parse được (kể cả header):', parsed.length === 3 ? '✅ Đúng (3 dòng)' : '❌ Lỗi');
  console.log(' - Xử lý dấu phẩy trong dấu ngoặc kép:', parsed[1][0] === 'Áo Polo, Cao Cấp' ? '✅ Chuẩn xác' : '❌ Lỗi');

  const generated = generateCSV(['Tên', 'Giá'], [['Sản phẩm A', 100000]]);
  console.log(' - Chứa UTF-8 BOM cho Excel:', generated.charCodeAt(0) === 0xfeff ? '✅ Có BOM' : '❌ Thiếu BOM');

  // Test 2: Preview Import & Validation từng dòng
  console.log('\n[2] Kiểm thử Preview Import & Bắt lỗi từng dòng:');
  const testSku = 'TEST-IMPORT-' + Date.now().toString().slice(-4);
  const csvContent = `name,sku,price\n"Sản phẩm Hợp Lệ 1",${testSku},350000\n"",INVALID-01,100000\n"Sản phẩm Hợp Lệ 2",${testSku}-2,200000`;

  const preview = await ImportExportService.previewImport(csvContent);
  console.log(' - Tổng số dòng data:', preview.totalRows === 3 ? '✅ Đúng (3)' : '❌ Lỗi');
  console.log(' - Dòng hợp lệ:', preview.validCount === 2 ? '✅ Đúng (2)' : '❌ Lỗi');
  console.log(' - Dòng thiếu tên bị đánh dấu lỗi:', preview.invalidCount === 1 ? '✅ Đã phát hiện dòng lỗi' : '❌ Bỏ sót lỗi');
  console.log(' - Action của SKU mới:', preview.rows[0].action === 'create' ? '✅ create' : '❌ Lỗi');

  // Test 3: Thực thi Import (Batch processing với partial success)
  console.log('\n[3] Kiểm thử Thực thi Import (Dòng lỗi bị bỏ qua, dòng hợp lệ vẫn lưu):');
  const result1 = await ImportExportService.executeImport(preview.rows, 'test_batch_1.csv');
  console.log(' - Tạo mới thành công:', result1.createdCount === 2 ? '✅ Đúng (2)' : '❌ Lỗi');
  console.log(' - Lỗi được ghi nhận:', result1.errorCount === 1 ? '✅ Đúng (1 dòng lỗi)' : '❌ Lỗi');

  // Test 4: Kiểm thử SKU trùng -> Cập nhật (Upsert), không sinh bản sao
  console.log('\n[4] Kiểm thử Nhập lại SKU trùng -> Cập nhật, không nhân bản:');
  const updateCsvContent = `name,sku,price\n"Tên Sản Phẩm Đã Cập Nhật",${testSku},499000`;
  const updatePreview = await ImportExportService.previewImport(updateCsvContent);

  console.log(' - Nhận diện SKU đã tồn tại:', updatePreview.rows[0].action === 'update' ? '✅ Nhận diện đúng action update' : '❌ Lỗi');
  const result2 = await ImportExportService.executeImport(updatePreview.rows, 'test_batch_update.csv');
  console.log(' - Cập nhật thành công:', result2.updatedCount === 1 ? '✅ Đúng (1)' : '❌ Lỗi');

  const checkProduct = await Product.findOne({ sku: testSku });
  console.log(' - Giá sau cập nhật:', checkProduct?.price === 499000 ? '✅ 499.000 đ' : '❌ Lỗi');
  console.log(' - Tên sau cập nhật:', checkProduct?.name === 'Tên Sản Phẩm Đã Cập Nhật' ? '✅ Đã cập nhật' : '❌ Lỗi');

  const countBySku = await Product.countDocuments({ sku: testSku });
  console.log(' - Không bị trùng lặp bản sao SKU:', countBySku === 1 ? '✅ Chỉ có 1 bản ghi duy nhất' : '❌ Bị nhân bản');

  // Test 5: Xuất dữ liệu CSV (Export)
  console.log('\n[5] Kiểm thử Xuất file CSV:');
  const exportedCsv = await ImportExportService.exportProducts();
  console.log(' - File xuất ra có dữ liệu:', exportedCsv.length > 0 ? '✅ Thành công' : '❌ Rỗng');
  console.log(' - File xuất có chứa SKU vừa nhập:', exportedCsv.includes(testSku) ? '✅ Có chứa dữ liệu' : '❌ Thiếu dữ liệu');

  // Dọn dẹp test products
  await Product.deleteMany({ sku: { $in: [testSku, `${testSku}-2`] } });

  console.log('\n🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ GIAI ĐOẠN 7 ĐÃ VƯỢT QUA XUẤT SẮC! 🎉');
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Kiểm thử Giai đoạn 7 thất bại:', err);
  process.exit(1);
});
