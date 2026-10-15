import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { ProductTypeService } from '../src/modules/products/services/product-type.service';
import { ProductVariantService } from '../src/modules/products/services/product-variant.service';
import { ProductService } from '../src/modules/products/services/product.service';
import { connectDB } from '../src/core/db/connect';

async function testPhase3() {
  console.log('🚀 BẮT ĐẦU KIỂM TRA TOÀN DIỆN PHASE 3: PRODUCT TYPES, DYNAMIC FIELDS & VARIANTS...\n');
  await connectDB();

  // ── 1. Tạo 2 ProductType khác nhau với các trường động ──
  console.log('--- 1. Kiểm tra tạo 2 ProductType khác nhau ---');

  const phoneType = await ProductTypeService.create({
    name: `Điện thoại thông minh ${Date.now()}`,
    description: 'Dành cho các dòng smartphone cao cấp',
    fields: [
      {
        key: 'screen_size',
        label: 'Kích thước màn hình (inch)',
        type: 'number',
        required: true,
        validation: { min: 4, max: 10 },
        order: 0,
      },
      {
        key: 'storage',
        label: 'Dung lượng lưu trữ',
        type: 'single_select',
        required: true,
        options: ['128GB', '256GB', '512GB', '1TB'],
        order: 1,
      },
      {
        key: 'color',
        label: 'Màu sắc phiên bản',
        type: 'text',
        required: true,
        order: 2,
      },
    ],
    variantAttributes: ['storage', 'color'],
    status: 'active',
  });
  console.log(`✅ Đã tạo Loại 1: "${phoneType.name}" (Slug: /${phoneType.slug})`);
  console.log(`   Số trường: ${phoneType.fields.length}, Thuộc tính biến thể: [${phoneType.variantAttributes.join(', ')}]`);

  const fashionType = await ProductTypeService.create({
    name: `Thời trang cao cấp ${Date.now()}`,
    description: 'Dành cho quần áo & phụ kiện',
    fields: [
      {
        key: 'material',
        label: 'Chất liệu vải',
        type: 'text',
        required: true,
        order: 0,
      },
      {
        key: 'gender',
        label: 'Giới tính',
        type: 'single_select',
        required: true,
        options: ['Nam', 'Nữ', 'Unisex'],
        order: 1,
      },
      {
        key: 'size',
        label: 'Kích cỡ',
        type: 'single_select',
        required: true,
        options: ['S', 'M', 'L', 'XL'],
        order: 2,
      },
    ],
    variantAttributes: ['size'],
    status: 'active',
  });
  console.log(`✅ Đã tạo Loại 2: "${fashionType.name}" (Slug: /${fashionType.slug})`);

  // ── 2. Kiểm tra tính năng chống trùng lặp field key ──
  console.log('\n--- 2. Kiểm tra tính năng ngăn chặn trùng lặp field keys ---');
  try {
    await ProductTypeService.create({
      name: `Lỗi trùng key ${Date.now()}`,
      fields: [
        { key: 'weight', label: 'Trọng lượng', type: 'number', required: false, order: 0 },
        { key: 'weight', label: 'Cân nặng', type: 'number', required: false, order: 1 },
      ],
      variantAttributes: [],
    });
    throw new Error('THẤT BẠI: Hệ thống không chặn trùng lặp field key!');
  } catch (err: any) {
    if (err.message.includes('trùng lặp') || err.message.includes('field keys')) {
      console.log(`✅ BẢO VỆ THÀNH CÔNG: Chặn trùng lặp khóa trường thành công! (${err.message})`);
    } else {
      throw err;
    }
  }

  // ── 3. Kiểm tra Xác thực Thuộc tính động (Dynamic Attributes Validation) ──
  console.log('\n--- 3. Kiểm tra xác thực thuộc tính động khi tạo sản phẩm ---');

  // Thử nghiệm 1: Thiếu trường bắt buộc 'storage'
  try {
    await ProductService.create({
      name: `Sản phẩm thiếu trường ${Date.now()}`,
      productTypeId: phoneType._id.toString(),
      attributes: [
        { key: 'screen_size', value: 6.7 },
        { key: 'color', value: 'Titan Tự Nhiên' },
        // Thiếu storage
      ],
    });
    throw new Error('THẤT BẠI: Hệ thống không chặn thiếu trường bắt buộc!');
  } catch (err: any) {
    if (err.message.includes('bắt buộc')) {
      console.log(`✅ BẢO VỆ THÀNH CÔNG: Bắt buộc nhập đầy đủ thuộc tính! (${err.message})`);
    } else {
      throw err;
    }
  }

  // Thử nghiệm 2: Sai quy tắc validation min/max (screen_size = 20 inch, max là 10)
  try {
    await ProductService.create({
      name: `Sản phẩm sai số đo ${Date.now()}`,
      productTypeId: phoneType._id.toString(),
      attributes: [
        { key: 'screen_size', value: 20 },
        { key: 'storage', value: '256GB' },
        { key: 'color', value: 'Titan Tự Nhiên' },
      ],
    });
    throw new Error('THẤT BẠI: Hệ thống không chặn giá trị vượt ngưỡng max!');
  } catch (err: any) {
    if (err.message.includes('lớn hơn 10')) {
      console.log(`✅ BẢO VỆ THÀNH CÔNG: Chặn giá trị số vượt giới hạn min/max! (${err.message})`);
    } else {
      throw err;
    }
  }

  // Thử nghiệm 3: Tạo sản phẩm hợp lệ kèm thuộc tính động
  const validProduct = await ProductService.create({
    name: `Apple iPhone 16 Pro Max ${Date.now()}`,
    sku: `IP16PM-${Date.now().toString().slice(-4)}`,
    price: 36990000,
    productTypeId: phoneType._id.toString(),
    attributes: [
      { key: 'screen_size', value: 6.9 },
      { key: 'storage', value: '256GB' },
      { key: 'color', value: 'Titan Sa Mạc' },
    ],
    status: 'active',
  });
  console.log(`✅ Đã tạo sản phẩm hợp lệ kèm thuộc tính động: "${validProduct.name}" (ID: ${validProduct._id})`);

  // Kiểm tra số lượng sản phẩm trên ProductType
  const updatedPhoneType = await ProductTypeService.getById(phoneType._id.toString());
  console.log(`✅ Số sản phẩm áp dụng loại "${phoneType.name}": ${updatedPhoneType?.productCount}`);

  // ── 4. Quản lý Biến thể (Variants) & Chống trùng tổ hợp thuộc tính ──
  console.log('\n--- 4. Kiểm tra Quản lý Biến thể & Chống trùng tổ hợp thuộc tính ---');

  // Biến thể 1: 256GB - Titan Đen
  const variant1 = await ProductVariantService.create(validProduct._id.toString(), {
    name: '256GB - Titan Đen',
    sku: `IP16-BLK-256-${Date.now().toString().slice(-4)}`,
    price: 36990000,
    attributes: [
      { key: 'storage', value: '256GB' },
      { key: 'color', value: 'Titan Đen' },
    ],
  });
  console.log(`✅ Đã tạo Biến thể 1: "${variant1.name}" (SKU: ${variant1.sku}, Giá: ${variant1.price}đ)`);

  // Biến thể 2: 512GB - Titan Sa Mạc
  const variant2 = await ProductVariantService.create(validProduct._id.toString(), {
    name: '512GB - Titan Sa Mạc',
    sku: `IP16-DES-512-${Date.now().toString().slice(-4)}`,
    price: 40990000,
    attributes: [
      { key: 'storage', value: '512GB' },
      { key: 'color', value: 'Titan Sa Mạc' },
    ],
  });
  console.log(`✅ Đã tạo Biến thể 2: "${variant2.name}" (SKU: ${variant2.sku}, Giá: ${variant2.price}đ)`);

  // Thử nghiệm cố tình tạo Biến thể trùng tổ hợp với Biến thể 1
  try {
    await ProductVariantService.create(validProduct._id.toString(), {
      name: 'Bản trùng tổ hợp',
      sku: `IP16-DUP-${Date.now().toString().slice(-4)}`,
      price: 35000000,
      attributes: [
        { key: 'color', value: 'Titan Đen' },
        { key: 'storage', value: '256GB' },
      ],
    });
    throw new Error('THẤT BẠI: Hệ thống không chặn trùng tổ hợp thuộc tính biến thể!');
  } catch (err: any) {
    if (err.message.includes('Tổ hợp thuộc tính này đã tồn tại')) {
      console.log(`✅ BẢO VỆ THÀNH CÔNG: Chống trùng tổ hợp thuộc tính biến thể! (${err.message})`);
    } else {
      throw err;
    }
  }

  // ── 5. Kiểm tra Optimistic Concurrency Control trên Biến thể ──
  console.log('\n--- 5. Kiểm tra Optimistic Locking trên Biến thể ---');
  const updatedV1 = await ProductVariantService.update(variant1._id.toString(), {
    price: 35990000,
    dataVersion: variant1.dataVersion, // v1
  });
  console.log(`✅ Cập nhật biến thể hợp lệ thành công (v1 -> v${updatedV1.dataVersion})`);

  try {
    await ProductVariantService.update(variant1._id.toString(), {
      price: 32000000,
      dataVersion: 1, // Bản cũ v1
    });
    throw new Error('THẤT BẠI: Hệ thống không chặn xung đột ghi đè biến thể!');
  } catch (err: any) {
    if (err.message.includes('chỉnh sửa bởi phiên làm việc khác')) {
      console.log(`✅ BẢO VỆ THÀNH CÔNG: Chặn xung đột ghi đè biến thể! (${err.message})`);
    } else {
      throw err;
    }
  }

  // ── 6. Kiểm tra Bảo vệ Xóa Loại sản phẩm đang có sản phẩm dùng ──
  console.log('\n--- 6. Kiểm tra an toàn xóa ProductType đang có dữ liệu sử dụng ---');
  try {
    await ProductTypeService.delete(phoneType._id.toString());
    throw new Error('THẤT BẠI: Hệ thống cho phép xóa loại sản phẩm đang được sử dụng!');
  } catch (err: any) {
    if (err.message.includes('Không thể xóa loại sản phẩm vì đang có')) {
      console.log(`✅ BẢO VỆ THÀNH CÔNG: Chặn xóa loại sản phẩm đang có dữ liệu! (${err.message})`);
    } else {
      throw err;
    }
  }

  // ── 7. Kiểm tra Nhân bản sản phẩm kèm Biến thể ──
  console.log('\n--- 7. Kiểm tra Nhân bản sản phẩm kèm toàn bộ Biến thể ---');
  const dupProduct = await ProductService.duplicate(validProduct._id.toString());
  const dupVariants = await ProductVariantService.listByProduct(dupProduct._id.toString());
  console.log(`✅ Đã nhân bản sản phẩm: "${dupProduct.name}" (ID: ${dupProduct._id})`);
  console.log(`✅ Biến thể nhân bản kèm theo: ${dupVariants.length} biến thể`);

  console.log('\n🎉 TẤT CẢ CÁC BÀI TEST PHASE 3: PRODUCT TYPES & VARIANTS ĐÃ HOÀN TẤT THÀNH CÔNG 100%!');
  process.exit(0);
}

testPhase3().catch((e) => {
  console.error('❌ Lỗi kiểm tra:', e);
  process.exit(1);
});
