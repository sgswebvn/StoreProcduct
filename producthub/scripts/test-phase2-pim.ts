import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { CategoryService } from '../src/modules/categories/services/category.service';
import { ProductService } from '../src/modules/products/services/product.service';
import { connectDB } from '../src/core/db/connect';

async function testPhase2PIM() {
  console.log('🚀 BẮT ĐẦU KIỂM TRA TOÀN DIỆN PHASE 2: CORE PIM (PRODUCT & CATEGORIES)...\n');
  await connectDB();

  // ── 1. Kiểm tra Cây Danh mục (Category Hierarchy) ──
  console.log('--- 1. Kiểm tra tạo phân cấp Cây Danh mục ---');

  const rootCat = await CategoryService.create({
    name: `Công nghệ & Điện tử ${Date.now()}`,
    description: 'Danh mục thiết bị điện tử công nghệ cao',
    order: 1,
    status: 'active',
  });
  console.log(`✅ Đã tạo Danh mục gốc: "${rootCat.name}" (ID: ${rootCat._id})`);

  const childCat = await CategoryService.create({
    name: `Điện thoại di động ${Date.now()}`,
    parentId: rootCat._id.toString(),
    description: 'Các dòng smartphone',
    order: 1,
    status: 'active',
  });
  console.log(`✅ Đã tạo Danh mục con: "${childCat.name}" (Parent: ${childCat.parentId})`);

  // Kiểm tra materialized path (ancestors)
  if (childCat.ancestors.length === 1 && childCat.ancestors[0].toString() === rootCat._id.toString()) {
    console.log('✅ Ancestors được tính toán chính xác theo Materialized Path!');
  } else {
    throw new Error('Ancestors của danh mục con không chính xác.');
  }

  // Thử nghiệm chống vòng lặp (Loop Detection)
  console.log('\n--- 2. Kiểm tra tính năng chống vòng lặp (Circular Loop Prevention) ---');
  try {
    // Cố tình chuyển danh mục gốc làm con của danh mục con của chính nó
    await CategoryService.update(rootCat._id.toString(), {
      parentId: childCat._id.toString(),
    });
    throw new Error('THẤT BẠI: Hệ thống không chặn được vòng lặp danh mục!');
  } catch (err: any) {
    if (err.message.includes('vòng lặp') || err.message.includes('hậu duệ')) {
      console.log(`✅ BẢO VỆ THÀNH CÔNG: Chặn vòng lặp thành công! (${err.message})`);
    } else {
      throw err;
    }
  }

  // ── 2. Kiểm tra Cây Danh mục dạng Tree và Flat ──
  console.log('\n--- 3. Kiểm tra truy vấn Cây Danh mục (getTree & listFlat) ---');
  const tree = await CategoryService.getTree();
  console.log(`✅ getTree() trả về ${tree.length} danh mục gốc`);
  const flat = await CategoryService.listFlat();
  console.log(`✅ listFlat() trả về ${flat.length} danh mục có hiển thị phân cấp (-- level)`);

  // ── 3. Kiểm tra Quản lý Sản phẩm (Core PIM Product) ──
  console.log('\n--- 4. Kiểm tra CRUD Sản phẩm & liên kết Danh mục ---');
  const sampleProduct = await ProductService.create({
    name: `Apple iPhone 15 Pro Max 256GB Titanium ${Date.now()}`,
    sku: `IP15PM-${Date.now().toString().slice(-6)}`,
    price: 34990000,
    originalPrice: 36990000,
    shortDescription: 'Siêu phẩm flagship titan từ Apple với chip A17 Pro.',
    description: 'Thông số kỹ thuật: Màn hình OLED 6.7 inch 120Hz, camera tiềm vọng 5x, cổng USB-C 3.0.',
    status: 'active',
    categories: [childCat._id.toString()],
    tags: ['apple', 'iphone', 'titanium', 'flagship'],
  });
  console.log(`✅ Đã tạo sản phẩm thành công: "${sampleProduct.name}" (SKU: ${sampleProduct.sku}, Slug: /${sampleProduct.slug})`);
  console.log(`   Phiên bản dữ liệu ban đầu: v${sampleProduct.dataVersion}`);

  // Kiểm tra cập nhật thống kê productCount trên Category
  const updatedChildCat = await CategoryService.getById(childCat._id.toString());
  console.log(`✅ Thống kê số lượng sản phẩm trên danh mục con: ${updatedChildCat?.productCount} sản phẩm`);

  // ── 4. Kiểm tra Optimistic Concurrency Control (dataVersion) ──
  console.log('\n--- 5. Kiểm tra kiểm soát xung đột ghi đè (Optimistic Concurrency Control) ---');
  // Cập nhật hợp lệ với dataVersion đúng
  const updatedProd = await ProductService.update(sampleProduct._id.toString(), {
    price: 33990000,
    dataVersion: sampleProduct.dataVersion, // v1
  });
  console.log(`✅ Cập nhật hợp lệ thành công: Giá mới ${updatedProd.price}đ, Phiên bản tăng lên: v${updatedProd.dataVersion}`);

  // Cố tình cập nhật với version cũ (stale version)
  try {
    await ProductService.update(sampleProduct._id.toString(), {
      price: 31000000,
      dataVersion: 1, // Phiên bản cũ v1 (trong khi DB đã là v2)
    });
    throw new Error('THẤT BẠI: Hệ thống không chặn được xung đột ghi đè!');
  } catch (err: any) {
    if (err.message.includes('Xung đột dữ liệu') || err.message.includes('phiên bản')) {
      console.log(`✅ BẢO VỆ THÀNH CÔNG: Optimistic Locking từ chối ghi đè dữ liệu cũ! (${err.message})`);
    } else {
      throw err;
    }
  }

  // ── 5. Kiểm tra Nhân bản sản phẩm (Duplicate) ──
  console.log('\n--- 6. Kiểm tra chức năng Nhân bản (Duplicate) sản phẩm ---');
  const duplicated = await ProductService.duplicate(sampleProduct._id.toString());
  console.log(`✅ Đã nhân bản sản phẩm: "${duplicated.name}" (SKU: ${duplicated.sku}, Slug: /${duplicated.slug}, Status: ${duplicated.status})`);

  // ── 6. Kiểm tra Tìm kiếm & Bộ lọc Sản phẩm (Search & Filtering) ──
  console.log('\n--- 7. Kiểm tra Tìm kiếm & Bộ lọc phân trang Server-side ---');
  const searchResults = await ProductService.list({
    page: 1,
    limit: 10,
    search: 'titanium',
    category: rootCat._id.toString(), // Lọc theo danh mục gốc (tìm được cả sản phẩm ở nhánh con!)
    status: 'all',
    sortBy: 'createdAt',
    sortOrder: 'desc',
  });
  console.log(`✅ Tìm kiếm từ khóa "titanium" theo danh mục gốc: Tìm thấy ${searchResults.total} sản phẩm (Trang ${searchResults.page}/${searchResults.totalPages})`);

  // ── 7. Kiểm tra Lưu trữ (Archive) & Khôi phục (Restore) ──
  console.log('\n--- 8. Kiểm tra Quy trình Lưu trữ (Archive) & Khôi phục (Restore) ---');
  await ProductService.archive(sampleProduct._id.toString());
  const archived = await ProductService.getById(sampleProduct._id.toString());
  console.log(`✅ Trạng thái sau khi Archive: "${archived?.status}"`);

  await ProductService.restore(sampleProduct._id.toString());
  const restored = await ProductService.getById(sampleProduct._id.toString());
  console.log(`✅ Trạng thái sau khi Restore: "${restored?.status}"`);

  console.log('\n🎉 TẤT CẢ CÁC BÀI TEST PHASE 2: CORE PIM ĐÃ HOÀN TẤT THÀNH CÔNG 100%!');
  process.exit(0);
}

testPhase2PIM().catch((e) => {
  console.error('❌ Lỗi kiểm tra:', e);
  process.exit(1);
});
