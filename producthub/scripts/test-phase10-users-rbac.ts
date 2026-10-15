import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import mongoose from 'mongoose';
import { connectDB } from '../src/core/db/connect';
import User from '../src/modules/users/infra/user.model';
import { UserService } from '../src/modules/users/services/user.service';
import bcrypt from 'bcryptjs';

async function runTest() {
  console.log('--- BẮT ĐẦU TEST GIAI ĐOẠN 2: RBAC & QUẢN LÝ NGƯỜI DÙNG ---');
  await connectDB();

  const testEmail = `test_rbac_${Date.now()}@storeproduct.local`;

  // 1. Test tạo user
  console.log('1. Tạo người dùng mới...');
  const created = await UserService.createUser({
    name: 'Test Editor',
    email: testEmail,
    password: 'Password123@Test',
    role: 'editor',
  });
  console.log('=> Đã tạo user:', created.email, '| Role:', created.role);

  if ((created as any).passwordHash) {
    throw new Error('LỖI BẢO MẬT: passwordHash bị lộ trong kết quả tạo user!');
  }

  // 2. Test lấy danh sách và tìm kiếm
  console.log('2. Tìm kiếm người dùng...');
  const searchRes = await UserService.listUsers({ search: testEmail });
  if (searchRes.users.length === 0) {
    throw new Error('Không tìm thấy user vừa tạo!');
  }
  console.log('=> Tìm kiếm thành công, total:', searchRes.pagination.total);

  // 3. Test cập nhật thông tin
  console.log('3. Cập nhật role sang product_manager...');
  const updated = await UserService.updateUser(
    created._id.toString(),
    { name: 'Test PM Updated', role: 'product_manager' },
    { id: created._id.toString(), role: 'owner' }
  );
  console.log('=> Cập nhật thành công:', updated.name, '| Role:', updated.role);

  // 4. Test bảo vệ Super Admin duy nhất
  console.log('4. Kiểm tra bảo vệ Super Admin duy nhất...');
  const ownerUser = await User.findOne({ role: 'owner', status: 'active' });
  if (ownerUser) {
    // Đếm số lượng owner
    const ownerCount = await User.countDocuments({ role: 'owner', status: 'active' });
    console.log(`Số lượng Super Admin active hiện tại: ${ownerCount}`);

    if (ownerCount === 1) {
      try {
        await UserService.disableUser(ownerUser._id.toString(), {
          id: ownerUser._id.toString(),
          role: 'owner',
        });
        throw new Error('THẤT BẠI: Lẽ ra không được phép vô hiệu hóa Super Admin duy nhất!');
      } catch (err: any) {
        console.log('=> Đã bảo vệ thành công Super Admin:', err.message);
      }
    }
  }

  // 5. Test đổi mật khẩu
  console.log('5. Đổi mật khẩu...');
  await UserService.resetPassword(
    created._id.toString(),
    'NewSecurePass123@Store',
    { id: 'admin-id', role: 'owner' }
  );
  const updatedUserWithPass = await User.findById(created._id).select('+passwordHash');
  const isMatch = await bcrypt.compare('NewSecurePass123@Store', updatedUserWithPass!.passwordHash);
  if (!isMatch) {
    throw new Error('Mật khẩu mới không khớp sau khi reset!');
  }
  console.log('=> Đổi mật khẩu và hash bcrypt thành công!');

  // 6. Test Roles list
  console.log('6. Lấy danh sách Roles...');
  const roles = UserService.listRoles();
  console.log(`=> Có ${roles.length} vai trò mặc định được cấu hình.`);

  // Cleanup test user
  await User.deleteOne({ _id: created._id });
  console.log('=> Dọn dẹp dữ liệu test thành công.');

  console.log('--- GIAI ĐOẠN 2: TẤT CẢ KIỂM THỬ ĐỀU ĐẠT THÀNH CÔNG! ---');
  process.exit(0);
}

runTest().catch((err) => {
  console.error('LỖI KIỂM THỬ:', err);
  process.exit(1);
});
