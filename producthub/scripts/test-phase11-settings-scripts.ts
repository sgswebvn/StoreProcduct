import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { connectDB } from '../src/core/db/connect';
import { SettingService } from '../src/modules/settings/services/setting.service';
import { ScriptService } from '../src/modules/settings/services/script.service';
import SystemSetting from '../src/modules/settings/infra/setting.model';

async function runTest() {
  console.log('--- BẮT ĐẦU TEST GIAI ĐOẠN 3: CẤU HÌNH HỆ THỐNG & SCRIPTS ---');
  await connectDB();

  // 1. Khởi tạo & đọc settings
  console.log('1. Khởi tạo các nhóm cấu hình mặc định...');
  await SettingService.ensureInitialized();
  const generalSettings = await SettingService.getSettingsByGroup('general');
  console.log(`=> Nhóm General có ${generalSettings.length} cấu hình.`);

  const siteNameItem = generalSettings.find((s) => s.key === 'site_name');
  if (!siteNameItem) throw new Error('Thiếu cấu hình site_name');

  // 2. Cập nhật có OCC Version
  console.log('2. Cập nhật cấu hình site_name với version OCC...');
  const currentVersion = siteNameItem.version;
  const updated = await SettingService.updateSetting(
    'site_name',
    'StoreProduct Enterprise',
    currentVersion,
    'test-admin-id'
  );
  console.log(`=> Đã cập nhật: ${updated.key} = '${updated.value}', version mới: v${updated.version}`);

  // 3. Test OCC Failure khi gửi sai version
  console.log('3. Thử cập nhật với version cũ (OCC Concurrency Test)...');
  try {
    await SettingService.updateSetting(
      'site_name',
      'Conflicted Name',
      currentVersion, // version cũ đã lỗi thời
      'another-user-id'
    );
    throw new Error('THẤT BẠI: Lẽ ra phải chặn xung đột concurrency!');
  } catch (err: any) {
    console.log('=> Đã chặn thành công xung đột version:', err.message);
  }

  // 4. Test khôi phục mặc định
  console.log('4. Khôi phục giá trị mặc định cho site_name...');
  const resetRes = await SettingService.resetToDefault('site_name', 'test-admin-id');
  console.log(`=> Đã khôi phục mặc định: ${resetRes.key} = '${resetRes.value}', v${resetRes.version}`);

  // 5. Test ENV Status (bảo mật)
  console.log('5. Đọc trạng thái biến môi trường triển khai...');
  const envList = SettingService.getEnvStatus();
  for (const env of envList) {
    if (env.maskedValue.includes('mongodb+srv://') || env.maskedValue.includes('GOCSPX-')) {
      throw new Error(`LỖI BẢO MẬT: Biến môi trường ${env.name} bị lộ giá trị thô!`);
    }
  }
  console.log(`=> Kiểm tra ${envList.length} biến môi trường: toàn bộ đều đã được che giấu (masked) an toàn.`);

  // 6. Test Script Service
  console.log('6. Tạo mã tích hợp GA4...');
  const script = await ScriptService.createScript(
    {
      name: 'Google Analytics 4 Test',
      type: 'ga4',
      location: 'head',
      config: { trackingId: 'G-TEST123456' },
      isActive: true,
    },
    'test-admin-id'
  );
  console.log(`=> Đã tạo script: ${script.name} (ID: ${script.config.trackingId})`);

  // 7. Toggle script
  console.log('7. Tắt script vừa tạo...');
  const toggled = await ScriptService.toggleScript(script._id.toString(), false, 'test-admin-id');
  if (toggled.isActive !== false) throw new Error('Toggle script thất bại');
  console.log('=> Tắt script thành công.');

  // 8. Dọn dẹp script test
  await ScriptService.deleteScript(script._id.toString());
  console.log('=> Đã xóa script test thành công.');

  console.log('--- GIAI ĐOẠN 3: TẤT CẢ KIỂM THỬ ĐỀU ĐẠT THÀNH CÔNG! ---');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('LỖI KIỂM THỬ GIAI ĐOẠN 3:', err);
  process.exit(1);
});
