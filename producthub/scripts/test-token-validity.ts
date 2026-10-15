import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function testToken(token: string, label: string) {
  const clientId = process.env.GOOGLE_CLIENT_ID!;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET!;

  console.log(`Testing ${label}...`);
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: token,
      grant_type: 'refresh_token',
    }),
  });

  const data = await res.json();
  console.log(`Result for ${label}:`, res.status, data);
  return data.access_token ? data.access_token : null;
}

async function run() {
  await testToken('tZM5kXh2c3AwCSZxSMSwsMTAkSsmIKmVvOs78eamS9907WUILDARzEACb8e7GuxM', 'token...');
  await testToken('Irb6c6gFTJZRPekEk029sEVpcQRYwdoWCk8kLYIh7uIxiqtMbSDldKCzcQZGZssp', 'secret...');
}

run();
