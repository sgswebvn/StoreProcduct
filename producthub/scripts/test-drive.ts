import dotenv from 'dotenv';
import path from 'path';
import mongoose from 'mongoose';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function main() {
  console.log('1. Checking Environment Variables:');
  console.log('   MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'MISSING');
  console.log('   GOOGLE_CLIENT_ID:', process.env.GOOGLE_CLIENT_ID ? 'SET' : 'MISSING');
  console.log('   GOOGLE_CLIENT_SECRET:', process.env.GOOGLE_CLIENT_SECRET ? 'SET' : 'MISSING');
  console.log('   GOOGLE_REDIRECT_URI:', process.env.GOOGLE_REDIRECT_URI);
  console.log('   GOOGLE_DRIVE_FOLDER_ID:', process.env.GOOGLE_DRIVE_FOLDER_ID);
  console.log('   GOOGLE_TOKEN_ENCRYPTION_KEY:', process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ? 'SET' : 'MISSING');

  console.log('\n2. Testing MongoDB Connection...');
  await mongoose.connect(process.env.MONGODB_URI!);
  console.log('   Connected successfully!');

  const tokenColl = mongoose.connection.collection('googledrivetokens');
  const existing = await tokenColl.findOne({ provider: 'google_drive' });

  if (existing) {
    console.log('\n3. Found existing Google Drive connection in MongoDB:');
    console.log('   Status:', existing.status);
    console.log('   Account Email:', existing.accountEmail);
    console.log('   Account Name:', existing.accountName);
  } else {
    console.log('\n3. No Google Drive OAuth token found in MongoDB yet.');
    console.log('   To connect Google Drive:');
    console.log('   A. Log in to http://localhost:3000 as admin (admin@storeproduct.local / Admin12345678@Store)');
    console.log('   B. Navigate to http://localhost:3000/media');
    console.log('   C. Click "Kết nối Google Drive" button to authorize your Google Account with Google Drive folder:');
    console.log(`      https://drive.google.com/drive/folders/${process.env.GOOGLE_DRIVE_FOLDER_ID}`);
  }

  await mongoose.disconnect();
}

main().catch((e) => {
  console.error('Error:', e);
  process.exit(1);
});
