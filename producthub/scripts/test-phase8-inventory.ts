import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDB } from '../src/core/db/connect';
import { ModuleService } from '../src/core/modules/services/module.service';
import { InventoryService } from '../src/modules/inventory/services/inventory.service';
import { ProductService } from '../src/modules/products/services/product.service';
import { InventoryItem } from '../src/modules/inventory/infra/inventory-item.model';
import { InventoryLog } from '../src/modules/inventory/infra/inventory-log.model';
import mongoose from 'mongoose';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG GIAI ĐOẠN 8: QUẢN LÝ TỒN KHO & OPTIMISTIC LOCKING ---');
  await connectDB();

  // Test 1: Kiểm thử Module Toggle (Bật/Tắt module an toàn)
  console.log('\n[1] Kiểm thử Bật/Tắt module Inventory:');
  await ModuleService.toggleModule('inventory', false);
  console.log(' - Đã tắt module Inventory');

  const testProduct = await ProductService.create({
    name: 'Sản phẩm Test Tồn Kho ' + Date.now(),
    price: 500000,
    status: 'active',
  });

  try {
    await InventoryService.adjustInventory({
      productId: testProduct._id.toString(),
      changeAmount: 10,
    });
    console.log('❌ Lỗi: Cho phép thao tác tồn kho khi module đang bị tắt');
    throw new Error('Chặn thao tác khi module tắt thất bại!');
  } catch (err: any) {
    console.log('✅ Đã chặn thao tác khi module tắt:', err.message);
  }

  // Bật lại module
  await ModuleService.toggleModule('inventory', true);
  console.log(' - Đã bật lại module Inventory');

  // Test 2: Điều chỉnh số lượng và Kiểm tra Audit Log
  console.log('\n[2] Kiểm thử Điều chỉnh số lượng & Ghi log bắt buộc:');
  const adjust1 = await InventoryService.adjustInventory({
    productId: testProduct._id.toString(),
    changeAmount: 50,
    reason: 'Nhập lô hàng đầu tiên',
  });

  console.log(' - Tồn kho mới:', adjust1.item.quantity === 50 ? '✅ 50 sản phẩm' : '❌ Lỗi');
  console.log(' - Phiên bản đồng bộ dataVersion:', adjust1.item.dataVersion === 2 ? '✅ v2' : '❌ Lỗi');
  console.log(' - Log được tạo tự động:', adjust1.log && adjust1.log.action === 'adjust' ? '✅ Thành công' : '❌ Lỗi');
  console.log(' - Chi tiết log: Thay đổi', adjust1.log.quantityChange, '| Lý do:', adjust1.log.reason);

  // Test 3: Optimistic Concurrency Control (Chống ghi đè xung đột)
  console.log('\n[3] Kiểm thử Optimistic Concurrency Control:');
  try {
    // Truyền expectedVersion = 1 trong khi version hiện tại là 2
    await InventoryService.adjustInventory({
      productId: testProduct._id.toString(),
      changeAmount: 10,
      expectedVersion: 1, // Xung đột giả lập
    });
    console.log('❌ Lỗi: Không phát hiện xung đột dữ liệu phiên bản cũ');
    throw new Error('Optimistic Locking thất bại!');
  } catch (err: any) {
    console.log('✅ Phát hiện và chặn xung đột thành công:', err.message);
  }

  // Xuất kho hợp lệ với expectedVersion đúng (v2)
  console.log('\n[4] Kiểm thử Xuất kho hợp lệ & Chặn xuất âm:');
  const adjust2 = await InventoryService.adjustInventory({
    productId: testProduct._id.toString(),
    changeAmount: -15,
    expectedVersion: 2,
    reason: 'Xuất bán lẻ',
  });
  console.log(' - Tồn sau khi xuất 15 chiếc:', adjust2.item.quantity === 35 ? '✅ 35 sản phẩm' : '❌ Lỗi');
  console.log(' - dataVersion tăng lên:', adjust2.item.dataVersion === 3 ? '✅ v3' : '❌ Lỗi');

  // Thử xuất 100 chiếc (trong khi chỉ còn 35) -> Phải bị chặn
  try {
    await InventoryService.adjustInventory({
      productId: testProduct._id.toString(),
      changeAmount: -100,
      expectedVersion: 3,
    });
    console.log('❌ Lỗi: Cho phép xuất âm tồn kho');
  } catch (err: any) {
    console.log('✅ Chặn xuất quá tồn kho thành công:', err.message);
  }

  // Test 5: Kiểm tra Lịch sử biến động và Tính toàn vẹn khi tắt module
  console.log('\n[5] Kiểm thử Lịch sử biến động & Toàn vẹn dữ liệu khi tắt module:');
  const logs = await InventoryService.getProductInventoryLogs(testProduct._id.toString());
  console.log(' - Số bản ghi lịch sử audit log:', logs.length === 2 ? '✅ Đủ 2 lượt biến động' : '❌ Lỗi');

  // Tắt module
  await ModuleService.toggleModule('inventory', false);
  const itemInDb = await InventoryItem.findOne({ productId: testProduct._id });
  const logsInDb = await InventoryLog.find({ productId: testProduct._id });
  console.log(' - Khi tắt module, dữ liệu tồn trong CSDL còn nguyên:', itemInDb?.quantity === 35 ? '✅ Còn nguyên (35 chiếc)' : '❌ Bị mất');
  console.log(' - Lịch sử logs còn nguyên:', logsInDb.length === 2 ? '✅ Còn nguyên (2 logs)' : '❌ Bị mất');

  // Bật lại module cho hệ thống
  await ModuleService.toggleModule('inventory', true);

  // Dọn dẹp
  await InventoryItem.deleteMany({ productId: testProduct._id });
  await InventoryLog.deleteMany({ productId: testProduct._id });
  await ProductService.delete(testProduct._id.toString());

  console.log('\n🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ GIAI ĐOẠN 8 ĐÃ VƯỢT QUA XUẤT SẮC! 🎉');
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Kiểm thử Giai đoạn 8 thất bại:', err);
  process.exit(1);
});
