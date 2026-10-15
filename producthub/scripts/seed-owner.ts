/**
 * Seed script — Tạo Owner account lần đầu.
 *
 * Chạy: npx tsx scripts/seed-owner.ts
 *
 * An toàn:
 * - Chỉ tạo nếu chưa có bất kỳ user nào trong database.
 * - KHÔNG ghi đè dữ liệu hiện có.
 * - Yêu cầu MONGODB_URI, SEED_OWNER_EMAIL và SEED_OWNER_PASSWORD trong env.
 */

import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import path from 'path';

// Load .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI;
const EMAIL = process.env.SEED_OWNER_EMAIL;
const PASSWORD = process.env.SEED_OWNER_PASSWORD;

if (!MONGODB_URI || !EMAIL || !PASSWORD) {
  console.error(
    '❌ Missing required env vars: MONGODB_URI, SEED_OWNER_EMAIL, SEED_OWNER_PASSWORD'
  );
  console.error('Set these in .env.local before running the seed script.');
  process.exit(1);
}

if (PASSWORD.length < 12) {
  console.error('❌ SEED_OWNER_PASSWORD must be at least 12 characters.');
  process.exit(1);
}

// Minimal UserSchema để không import tất cả app modules
const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true },
  passwordHash: { type: String, required: true },
  name: { type: String, required: true },
  role: { type: String, default: 'owner' },
  additionalPermissions: { type: [String], default: [] },
  status: { type: String, default: 'active' },
}, { timestamps: true });

async function seedOwner() {
  console.log('🔗 Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI!);

  const User = mongoose.models.User ?? mongoose.model('User', UserSchema);

  const existingCount = await User.countDocuments();
  if (existingCount > 0) {
    console.log(
      `⚠️  Database already has ${existingCount} user(s). Skipping seed to avoid overwriting data.`
    );
    console.log('   To reset, manually delete users from the database first.');
    await mongoose.disconnect();
    process.exit(0);
  }

  const passwordHash = await bcrypt.hash(PASSWORD!, 12);

  await User.create({
    email: EMAIL!.toLowerCase().trim(),
    passwordHash,
    name: 'Owner',
    role: 'owner',
    status: 'active',
  });

  console.log(`✅ Owner account created: ${EMAIL}`);
  console.log('   Please change your password after first login.');
  console.log('   NEVER commit SEED_OWNER_PASSWORD to version control.');

  await mongoose.disconnect();
  process.exit(0);
}

seedOwner().catch((err) => {
  console.error('❌ Seed failed:', err);
  process.exit(1);
});
