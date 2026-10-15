import bcrypt from 'bcryptjs';
import { connectDB } from '@/core/db/connect';
import User, { IUser } from '../infra/user.model';
import { Role, Permission, ROLE_PERMISSIONS } from '@/core/auth/permissions';

export interface UserQueryOptions {
  search?: string;
  role?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export interface CreateUserInput {
  email: string;
  name: string;
  password: string;
  role: Role;
  additionalPermissions?: Permission[];
}

export interface UpdateUserInput {
  name?: string;
  role?: Role;
  status?: 'active' | 'inactive' | 'suspended';
  additionalPermissions?: Permission[];
}

export class UserService {
  /**
   * Lấy danh sách người dùng với tìm kiếm, lọc và phân trang
   */
  static async listUsers(options: UserQueryOptions = {}) {
    await connectDB();
    const { search, role, status, page = 1, limit = 20 } = options;

    const filter: Record<string, unknown> = {};

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      filter.$or = [{ name: regex }, { email: regex }];
    }

    if (role && role !== 'all') {
      filter.role = role;
    }

    if (status && status !== 'all') {
      filter.status = status;
    }

    const skip = Math.max(0, (page - 1) * limit);
    const [users, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter),
    ]);

    return {
      users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
    };
  }

  /**
   * Lấy chi tiết một người dùng theo ID
   */
  static async getUserById(id: string) {
    await connectDB();
    const user = await User.findById(id).select('-passwordHash').lean();
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }
    return user;
  }

  /**
   * Tạo người dùng mới
   */
  static async createUser(data: CreateUserInput) {
    await connectDB();
    const email = data.email.toLowerCase().trim();

    if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
      throw new Error('Địa chỉ email không hợp lệ');
    }

    if (!data.password || data.password.length < 8) {
      throw new Error('Mật khẩu phải có ít nhất 8 ký tự');
    }

    if (!data.name || !data.name.trim()) {
      throw new Error('Họ và tên là bắt buộc');
    }

    const existing = await User.findOne({ email });
    if (existing) {
      throw new Error('Email này đã được sử dụng');
    }

    const passwordHash = await bcrypt.hash(data.password, 10);

    const newUser = await User.create({
      email,
      name: data.name.trim(),
      passwordHash,
      role: data.role || 'viewer',
      additionalPermissions: data.additionalPermissions || [],
      status: 'active',
    });

    const userObj = newUser.toObject();
    delete (userObj as any).passwordHash;
    return userObj;
  }

  /**
   * Cập nhật thông tin người dùng với cơ chế bảo vệ Super Admin
   */
  static async updateUser(
    id: string,
    data: UpdateUserInput,
    actor: { id: string; role: Role }
  ) {
    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }

    // Bảo vệ Super Admin: Nếu user đang là owner
    if (user.role === 'owner') {
      const isDemotingRole = data.role && data.role !== 'owner';
      const isDisabling = data.status && data.status !== 'active';

      if (isDemotingRole || isDisabling) {
        // Đếm số lượng owner active còn lại
        const activeOwnersCount = await User.countDocuments({
          role: 'owner',
          status: 'active',
        });

        if (activeOwnersCount <= 1) {
          throw new Error(
            'Không thể hạ quyền hoặc vô hiệu hóa Super Admin duy nhất của hệ thống'
          );
        }
      }
    }

    // Không cho phép tài khoản không phải owner tự nâng quyền người khác lên owner
    if (data.role === 'owner' && actor.role !== 'owner') {
      throw new Error('Chỉ Super Admin mới có quyền gán vai trò Super Admin');
    }

    if (data.name !== undefined) user.name = data.name.trim();
    if (data.role !== undefined) user.role = data.role;
    if (data.status !== undefined) user.status = data.status;
    if (data.additionalPermissions !== undefined) {
      user.additionalPermissions = data.additionalPermissions;
    }

    await user.save();

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;
    return userObj;
  }

  /**
   * Vô hiệu hóa người dùng
   */
  static async disableUser(id: string, actor: { id: string; role: Role }) {
    await connectDB();
    const user = await User.findById(id);
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }

    if (user.role === 'owner') {
      const activeOwnersCount = await User.countDocuments({
        role: 'owner',
        status: 'active',
      });
      if (activeOwnersCount <= 1) {
        throw new Error(
          'Không thể vô hiệu hóa Super Admin duy nhất của hệ thống'
        );
      }
    }

    user.status = 'inactive';
    await user.save();

    const userObj = user.toObject();
    delete (userObj as any).passwordHash;
    return userObj;
  }

  /**
   * Đặt lại mật khẩu an toàn
   */
  static async resetPassword(
    id: string,
    newPassword: string,
    actor: { id: string; role: Role }
  ) {
    await connectDB();

    if (!newPassword || newPassword.length < 8) {
      throw new Error('Mật khẩu mới phải có ít nhất 8 ký tự');
    }

    const user = await User.findById(id);
    if (!user) {
      throw new Error('Người dùng không tồn tại');
    }

    // Admin không được phép đổi pass của Super Admin trừ khi chính là Super Admin
    if (user.role === 'owner' && actor.role !== 'owner' && actor.id !== id) {
      throw new Error('Không có quyền đổi mật khẩu của Super Admin');
    }

    user.passwordHash = await bcrypt.hash(newPassword, 10);
    await user.save();

    return { success: true, message: 'Đổi mật khẩu thành công' };
  }

  /**
   * Danh sách vai trò và mô tả
   */
  static listRoles() {
    return [
      {
        id: 'owner',
        name: 'Super Admin',
        description: 'Toàn quyền quản trị cao nhất hệ thống, cấu hình bảo mật, mã script và quản lý quyền người dùng.',
        permissions: ROLE_PERMISSIONS.owner,
      },
      {
        id: 'administrator',
        name: 'Admin',
        description: 'Quản trị viên vận hành các module, danh mục, sản phẩm, media, api keys. Không có quyền sửa secret hoặc Super Admin.',
        permissions: ROLE_PERMISSIONS.administrator,
      },
      {
        id: 'product_manager',
        name: 'Quản lý sản phẩm',
        description: 'Chuyên trách quản lý sản phẩm, danh mục, biến thể, tồn kho và xuất nhập dữ liệu.',
        permissions: ROLE_PERMISSIONS.product_manager,
      },
      {
        id: 'editor',
        name: 'Biên tập viên',
        description: 'Tạo, sửa sản phẩm và tải lên ảnh trong phạm vi cho phép.',
        permissions: ROLE_PERMISSIONS.editor,
      },
      {
        id: 'viewer',
        name: 'Người xem',
        description: 'Chỉ có quyền xem thông tin sản phẩm và media, không được sửa đổi.',
        permissions: ROLE_PERMISSIONS.viewer,
      },
    ];
  }
}
