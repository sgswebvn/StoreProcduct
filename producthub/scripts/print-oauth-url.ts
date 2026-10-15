import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const clientId = process.env.GOOGLE_CLIENT_ID;
const redirectUri = process.env.GOOGLE_REDIRECT_URI;
const params = new URLSearchParams({
  client_id: clientId!,
  redirect_uri: redirectUri!,
  response_type: 'code',
  scope: 'https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
  access_type: 'offline',
  prompt: 'consent',
  state: 'manual_auth_state'
});

const url = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
console.log('--------------------------------------------------');
console.log('LINK ỦY QUYỀN GOOGLE OAUTH 2.0 CHO TÀI KHOẢN CỦA BẠN:');
console.log(url);
console.log('--------------------------------------------------');
