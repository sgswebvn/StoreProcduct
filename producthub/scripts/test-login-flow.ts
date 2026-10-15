import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testLogin() {
  console.log('1. Lấy CSRF token...');
  const csrfRes = await fetch('http://localhost:3000/api/auth/csrf');
  const csrfData = await csrfRes.json();
  const csrfToken = csrfData.csrfToken;
  const cookieHeader = csrfRes.headers.get('set-cookie') || '';
  console.log('   CSRF Token:', csrfToken);

  console.log('\n2. Gửi yêu cầu đăng nhập credentials...');
  const loginRes = await fetch('http://localhost:3000/api/auth/callback/credentials', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: cookieHeader,
    },
    body: new URLSearchParams({
      csrfToken,
      email: 'admin@storeproduct.local',
      password: 'Admin12345678@Store',
      redirect: 'false',
      json: 'true',
    }),
    redirect: 'manual',
  });

  const loginStatus = loginRes.status;
  const loginText = await loginRes.text();
  const setCookies = loginRes.headers.get('set-cookie');

  const location = loginRes.headers.get('location');
  console.log('   HTTP Status:', loginStatus);
  console.log('   Location:', location);
  const rawSetCookies = loginRes.headers.getSetCookie ? loginRes.headers.getSetCookie() : [setCookies].filter(Boolean) as string[];
  console.log('   Raw Set-Cookies:', rawSetCookies);

  if ((loginStatus === 200 || loginStatus === 302) && !location?.includes('error')) {
    console.log('\n✅ ĐĂNG NHẬP THÀNH CÔNG VÀ KHÔNG CÒN LỖI DataCloneError!');
    
    console.log('\n3. Kiểm tra truy cập /dashboard với cookie phiên...');
    // Trích xuất cookie name=value
    const cookiePairs: string[] = [];
    for (const sc of rawSetCookies) {
      const parts = sc.split(';');
      if (parts[0]) cookiePairs.push(parts[0].trim());
    }
    const cookieHeaderStr = cookiePairs.join('; ');
    console.log('   Formatted Cookie Header:', cookieHeaderStr);

    const dashRes = await fetch('http://localhost:3000/dashboard', {
      headers: { Cookie: cookieHeaderStr },
      redirect: 'manual'
    });
    console.log('   Dashboard HTTP Status:', dashRes.status);
    if (dashRes.status === 200) {
      console.log('✅ TRUY CẬP /dashboard THÀNH CÔNG (HTTP 200 OK)!');
    } else {
      console.log('   Dashboard Header Location:', dashRes.headers.get('location'));
    }

    console.log('\n4. Kiểm tra truy cập trang chủ (/) khi ĐÃ ĐĂNG NHẬP...');
    const rootRes = await fetch('http://localhost:3000/', {
      headers: { Cookie: cookieHeaderStr },
      redirect: 'manual'
    });
    console.log('   Root (/) HTTP Status:', rootRes.status);
    console.log('   Root (/) Redirect Location:', rootRes.headers.get('location'));
    if (rootRes.status === 307 && rootRes.headers.get('location') === '/dashboard') {
      console.log('✅ TRANG CHỦ (/) ĐÃ ĐƯỢC CHUYỂN HƯỚNG MƯỢT MÀ VỀ /dashboard, HOÀN TOÀN HẾT BỊ LOOP/LOADING LIÊN TỤC!');
    }
  } else {
    console.log('\n❌ Đăng nhập thất bại.');
  }
}

testLogin().catch(console.error);
