import dotenv from 'dotenv';
import path from 'path';
import { GoogleDriveService } from '../src/modules/integrations/services/google-drive.service';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  const code = process.argv[2];
  if (!code) {
    console.log('Usage: npx tsx scripts/exchange-code.ts <authorization_code_or_full_callback_url>');
    process.exit(1);
  }

  let finalCode = code;
  if (code.includes('code=')) {
    const url = new URL(code.startsWith('http') ? code : `http://localhost:3000${code}`);
    finalCode = url.searchParams.get('code') || code;
  }

  console.log('🔄 Đang đổi mã ủy quyền lấy token và lưu vào MongoDB...');
  const result = await GoogleDriveService.handleCallback(decodeURIComponent(finalCode));
  console.log('✅ Kết nối Google Drive thành công!');
  console.log(`   Email: ${result.email}`);
  console.log(`   Tên: ${result.name}`);
  process.exit(0);
}

main().catch((e) => {
  console.error('❌ Lỗi:', e.message);
  process.exit(1);
});
