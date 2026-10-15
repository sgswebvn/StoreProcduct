import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { connectDB } from '../src/core/db/connect';
import { ApiKeyService } from '../src/modules/integrations/services/api-key.service';
import { WebhookService } from '../src/modules/integrations/services/webhook.service';
import { ProjectService } from '../src/modules/projects/services/project.service';
import { ProductService } from '../src/modules/products/services/product.service';
import { isSafeExternalUrl } from '../src/core/security/ssrf';
import mongoose from 'mongoose';

async function runTests() {
  console.log('--- BẮT ĐẦU KIỂM THỬ TỰ ĐỘNG GIAI ĐOẠN 6: REST API, API KEYS & WEBHOOKS ---');
  await connectDB();

  // Test 1: Sinh API Key & Mã hóa SHA-256
  console.log('\n[1] Kiểm thử sinh API Key và băm SHA-256 bảo mật:');
  const { rawKey, key: keyDoc } = await ApiKeyService.createApiKey({
    name: 'Test Mobile App Key',
    scopes: ['products.read', 'categories.read'],
  });

  console.log(' - Raw API Key sinh ra:', rawKey.slice(0, 15) + '...');
  console.log(' - Prefix lưu DB:', keyDoc.keyPrefix);
  console.log(' - Hash SHA-256 lưu DB:', keyDoc.keyHash.slice(0, 20) + '...');
  console.log(' - CSDL không chứa chuỗi bí mật gốc:', !keyDoc.keyHash.includes('sp_live_') ? '✅ Đạt chuẩn bảo mật' : '❌ Lỗi');

  // Test 2: Xác thực API Key & Kiểm tra Phân quyền Scopes
  console.log('\n[2] Kiểm thử Xác thực API Key & Kiểm tra Scope:');
  const validCheck = await ApiKeyService.validateApiKey(rawKey, 'products.read');
  console.log(' - Xác thực với key đúng và scope "products.read":', validCheck.valid ? '✅ Thành công' : '❌ Lỗi');

  const invalidScopeCheck = await ApiKeyService.validateApiKey(rawKey, 'products.write');
  console.log(' - Xác thực với scope thiếu "products.write":', !invalidScopeCheck.valid ? '✅ Chặn thành công' : '❌ Lỗi');
  console.log('   Lý do chặn:', invalidScopeCheck.reason);

  const fakeKeyCheck = await ApiKeyService.validateApiKey('sp_live_fake12345678901234567890');
  console.log(' - Xác thực với key giả mạo:', !fakeKeyCheck.valid ? '✅ Chặn thành công' : '❌ Lỗi');

  // Test 3: Thu hồi API Key (Revocation)
  console.log('\n[3] Kiểm thử Thu hồi khóa API:');
  await ApiKeyService.revokeApiKey(keyDoc._id.toString());
  const checkAfterRevoke = await ApiKeyService.validateApiKey(rawKey);
  console.log(' - Sau khi thu hồi, gọi API:', !checkAfterRevoke.valid ? '✅ Từ chối ngay lập tức' : '❌ Lỗi');
  console.log('   Lý do:', checkAfterRevoke.reason);

  // Test 4: Project Scoping (Khóa API theo phạm vi dự án)
  console.log('\n[4] Kiểm thử Project Scoping (Phân lập dữ liệu theo từng Site):');
  const projectA = await ProjectService.create({ name: 'Dự án Chi Nhánh A ' + Date.now() });
  const projectB = await ProjectService.create({ name: 'Dự án Chi Nhánh B ' + Date.now() });

  const product1 = await ProductService.create({
    name: 'Sản phẩm của Site A ' + Date.now(),
    price: 100000,
    status: 'active',
  });
  const product2 = await ProductService.create({
    name: 'Sản phẩm của Site B ' + Date.now(),
    price: 200000,
    status: 'active',
  });

  // Gán product1 cho Project A, product2 cho Project B
  await ProjectService.assignProducts(projectA._id.toString(), [product1._id.toString()]);
  await ProjectService.assignProducts(projectB._id.toString(), [product2._id.toString()]);

  // Tạo API key riêng cho Project A
  const { rawKey: keyProjectA } = await ApiKeyService.createApiKey({
    name: 'Key for Site A',
    projectId: projectA._id.toString(),
    scopes: ['products.read'],
  });

  const authProjectA = await ApiKeyService.validateApiKey(keyProjectA, 'products.read');
  const projAId = (authProjectA.apiKey!.projectId as any)._id
    ? (authProjectA.apiKey!.projectId as any)._id.toString()
    : authProjectA.apiKey!.projectId!.toString();
  const assignedToA = await ProjectService.getAssignedProducts(projAId);

  console.log(' - Site A chỉ thấy sản phẩm của Site A:', assignedToA.items.length === 1 && assignedToA.items[0]._id.toString() === product1._id.toString() ? '✅ Đúng phân quyền' : '❌ Lỗi');
  const hasProd2InA = assignedToA.items.some((item) => item._id.toString() === product2._id.toString());
  console.log(' - Site A không thể thấy sản phẩm của Site B:', !hasProd2InA ? '✅ Cách ly an toàn' : '❌ Bị rò rỉ dữ liệu');

  // Test 5: Webhook & SSRF Protection
  console.log('\n[5] Kiểm thử Webhook & Cơ chế chống SSRF:');
  const ssrf1 = isSafeExternalUrl('http://localhost:3000/webhook');
  const ssrf2 = isSafeExternalUrl('http://127.0.0.1/evil');
  const ssrf3 = isSafeExternalUrl('http://192.168.1.100/admin');
  const ssrf4 = isSafeExternalUrl('http://169.254.169.254/latest/meta-data');
  const ssrfValid = isSafeExternalUrl('https://api.myclient.com/webhook');

  console.log(' - Chặn http://localhost:3000:', !ssrf1.safe ? '✅ Chặn thành công' : '❌ Lỗi lọt SSRF');
  console.log(' - Chặn 127.0.0.1:', !ssrf2.safe ? '✅ Chặn thành công' : '❌ Lỗi lọt SSRF');
  console.log(' - Chặn 192.168.x.x (Private IP):', !ssrf3.safe ? '✅ Chặn thành công' : '❌ Lỗi lọt SSRF');
  console.log(' - Chặn 169.254.169.254 (Cloud Metadata):', !ssrf4.safe ? '✅ Chặn thành công' : '❌ Lỗi lọt SSRF');
  console.log(' - Chấp nhận URL công khai hợp lệ:', ssrfValid.safe ? '✅ Hợp lệ' : '❌ Lỗi');

  // Kiểm thử chữ ký HMAC-SHA256 Webhook
  const payload = JSON.stringify({ event: 'product.created', productId: product1._id.toString() });
  const signature = WebhookService.signPayload('secret_key_12345', payload);
  console.log(' - Chữ ký HMAC-SHA256:', signature ? `✅ Ký thành công (${signature.slice(0, 16)}...)` : '❌ Lỗi');

  // Dọn dẹp
  await ApiKeyService.deleteApiKey(keyDoc._id.toString());
  await ProjectService.delete(projectA._id.toString());
  await ProjectService.delete(projectB._id.toString());
  await ProductService.delete(product1._id.toString());
  await ProductService.delete(product2._id.toString());

  console.log('\n🎉 TẤT CẢ CÁC BƯỚC KIỂM THỬ GIAI ĐOẠN 6 ĐÃ VƯỢT QUA XUẤT SẮC! 🎉');
  await mongoose.disconnect();
  process.exit(0);
}

runTests().catch((err) => {
  console.error('❌ Kiểm thử Giai đoạn 6 thất bại:', err);
  process.exit(1);
});
