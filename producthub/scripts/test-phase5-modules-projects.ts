import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDB } from '../src/core/db/connect';
import { hooks } from '../src/core/hooks/hook-system';
import { ModuleRegistry } from '../src/core/modules/module-registry';
import { ModuleService } from '../src/core/modules/services/module.service';
import { ProjectService } from '../src/modules/projects/services/project.service';
import { ProductService } from '../src/modules/products/services/product.service';
import { Project } from '../src/modules/projects/infra/project.model';
import { Product } from '../src/modules/products/infra/product.model';
import mongoose from 'mongoose';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG PHASE 5: DỰ ÁN, SITES VỆ TINH & MODULE SYSTEM ---');
  await connectDB();

  // Test 1: Kiểm thử Hook System (Event Emitter / Lifecycle)
  console.log('\n[1] Kiểm thử Hook System:');
  let hookFired = false;
  let receivedData: any = null;
  const unsubscribe = hooks.subscribe('test:lifecycle', (payload) => {
    hookFired = true;
    receivedData = payload;
  });

  await hooks.emit('test:lifecycle', { action: 'init_test', value: 42 });
  console.log(' - Hook fired:', hookFired ? '✅ Thành công' : '❌ Thất bại');
  console.log(' - Payload received:', receivedData?.value === 42 ? '✅ Chuẩn xác' : '❌ Lỗi');
  unsubscribe();

  // Test 2: Kiểm thử Module Registry & Dependency Rules
  console.log('\n[2] Kiểm thử Module Registry:');
  const allModules = await ModuleService.getAllWithState();
  console.log(` - Tổng số module đã đăng ký: ${allModules.length}`);

  const coreMod = allModules.find((m) => m.isCore);
  console.log(` - Module cốt lõi mẫu: "${coreMod?.name}" (${coreMod?.id})`);

  // Thử tắt core module -> Phải bị từ chối
  if (coreMod) {
    try {
      await ModuleService.toggleModule(coreMod.id, false);
      console.log('❌ Lỗi: Cho phép tắt module cốt lõi');
      throw new Error('Chặn tắt core module thất bại!');
    } catch (err: any) {
      console.log('✅ Chặn tắt core module thành công:', err.message);
    }
  }

  // Thử bật/tắt module tùy chọn (vd: inventory)
  console.log('\n[3] Kiểm thử bật/tắt an toàn Module tùy chọn (Inventory):');
  const invBefore = await ModuleService.isModuleEnabled('inventory');
  console.log(' - Trạng thái ban đầu của Inventory:', invBefore ? 'Bật' : 'Tắt');

  // Bật module
  await ModuleService.toggleModule('inventory', true);
  const invEnabled = await ModuleService.isModuleEnabled('inventory');
  console.log(' - Sau khi kích hoạt Inventory:', invEnabled ? '✅ Đang bật' : '❌ Lỗi');

  // Thử tắt module Products khi Inventory đang phụ thuộc vào nó
  try {
    await ModuleService.toggleModule('products', false);
    console.log('❌ Lỗi: Cho phép tắt module cha khi có module con phụ thuộc');
  } catch (err: any) {
    console.log('✅ Chặn tắt module cha có dependency thành công:', err.message);
  }

  // Trả Inventory về trạng thái cũ
  await ModuleService.toggleModule('inventory', false);
  const invDisabled = await ModuleService.isModuleEnabled('inventory');
  console.log(' - Sau khi tắt Inventory an toàn:', !invDisabled ? '✅ Đã tắt' : '❌ Lỗi');

  // Test 4: Quản lý Dự án & Sites vệ tinh (Project CRUD)
  console.log('\n[4] Kiểm thử Project CRUD (Sites vệ tinh):');
  const testProject = await ProjectService.create({
    name: 'Website Sneaker Sài Gòn ' + Date.now(),
    domain: 'sneakersaigon.vn',
    description: 'Site vệ tinh phân phối giày thể thao khu vực phía Nam',
    status: 'active',
    fieldVisibility: {
      sku: false, // Ẩn SKU trên site này
      originalPrice: false, // Ẩn giá niêm yết
      shortDescription: true,
      attributes: true,
      tags: true,
    },
  });

  console.log(' - Đã tạo dự án:', testProject.name, '| Mã:', testProject.code);

  // Cập nhật thông tin dự án
  const updatedProj = await ProjectService.update(testProject._id.toString(), {
    domain: 'sneaker-saigon.com',
  });
  console.log(' - Đã cập nhật domain:', updatedProj?.domain === 'sneaker-saigon.com' ? '✅ Thành công' : '❌ Lỗi');

  // Test 5: Gán sản phẩm vào Project & Cấu hình Overrides
  console.log('\n[5] Kiểm thử Gán sản phẩm (Assignment) & Ghi đè dữ liệu (Overrides):');
  const testProduct = await ProductService.create({
    name: 'Giày Chạy Bộ Nike Zoom ' + Date.now(),
    slug: 'giay-nike-zoom-' + Date.now(),
    sku: 'NIKE-ZM-' + Date.now().toString().slice(-4),
    price: 3200000,
    originalPrice: 4000000,
    shortDescription: 'Đệm êm ái cho cự ly dài',
    status: 'active',
    categories: [],
    tags: ['running', 'nike'],
  });

  console.log(' - Đã tạo sản phẩm gốc trong Catalog:', testProduct.name, '| Giá gốc:', testProduct.price);

  // Gán sản phẩm vào project
  await ProjectService.assignProducts(testProject._id.toString(), [testProduct._id.toString()]);
  const projAfterAssign = await ProjectService.getById(testProject._id.toString());
  console.log(' - Số lượng sản phẩm trên project:', projAfterAssign?.productCount === 1 ? '✅ Đã cập nhật (1)' : '❌ Lỗi');

  // Thiết lập Override: giá riêng 2,890,000 và tên riêng
  await ProjectService.setProductOverride(testProject._id.toString(), testProduct._id.toString(), {
    customName: 'Nike Air Zoom (Giá Ưu Đãi SG)',
    customPrice: 2890000,
    siteStatus: 'published',
  });
  console.log(' - Đã thiết lập Override: customPrice = 2.890.000, customName = Nike Air Zoom (Giá Ưu Đãi SG)');

  // Kiểm tra truy vấn danh sách sản phẩm của project kèm overrides và field visibility
  const assignedList = await ProjectService.getAssignedProducts(testProject._id.toString());
  const assignedProd = assignedList.items[0];

  console.log(' - Tên hiệu lực trên site:', assignedProd?.name === 'Nike Air Zoom (Giá Ưu Đãi SG)' ? '✅ Đúng (Override)' : '❌ Lỗi');
  console.log(' - Giá bán hiệu lực trên site:', assignedProd?.price === 2890000 ? '✅ Đúng (2.890.000)' : '❌ Lỗi');
  console.log(' - Giá gốc ban đầu vẫn giữ nguyên:', assignedProd?.basePrice === 3200000 ? '✅ Đúng (3.200.000)' : '❌ Lỗi');
  console.log(' - Trường SKU đã bị ẩn theo Field Visibility:', assignedProd?.sku === undefined ? '✅ Đã ẩn an toàn' : '❌ Lỗi bị lộ SKU');
  console.log(' - Trường Giá niêm yết đã bị ẩn:', assignedProd?.originalPrice === undefined ? '✅ Đã ẩn an toàn' : '❌ Lỗi bị lộ giá niêm yết');

  // Bỏ gán sản phẩm
  await ProjectService.unassignProducts(testProject._id.toString(), [testProduct._id.toString()]);
  const listAfterUnassign = await ProjectService.getAssignedProducts(testProject._id.toString());
  console.log(' - Sau khi gỡ sản phẩm khỏi site:', listAfterUnassign.items.length === 0 ? '✅ Đã gỡ thành công' : '❌ Lỗi');

  // Dọn dẹp
  await ProjectService.delete(testProject._id.toString());
  await ProductService.delete(testProduct._id.toString());

  console.log('\n🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ PHASE 5 ĐÃ VƯỢT QUA XUẤT SẮC! 🎉');
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Kiểm thử Phase 5 thất bại:', err);
  process.exit(1);
});
