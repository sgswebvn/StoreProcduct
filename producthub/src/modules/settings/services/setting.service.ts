import { connectDB } from '@/core/db/connect';
import SystemSetting, {
  ISystemSetting,
  SettingGroup,
  SettingDataType,
} from '../infra/setting.model';

export interface DefaultSettingItem {
  key: string;
  label: string;
  group: SettingGroup;
  dataType: SettingDataType;
  defaultValue: any;
  description: string;
  isSecret?: boolean;
}

export const ALLOWLIST_SETTINGS: DefaultSettingItem[] = [
  // 1. General
  {
    key: 'site_name',
    label: 'Tên hệ thống',
    group: 'general',
    dataType: 'string',
    defaultValue: 'StoreProduct',
    description: 'Tên hiển thị chính thức của hệ thống trên toàn bộ nền tảng.',
  },
  {
    key: 'site_description',
    label: 'Mô tả website',
    group: 'general',
    dataType: 'string',
    defaultValue: 'Hệ thống Quản lý Dữ liệu Sản phẩm Chuyên nghiệp (ProductHub PIM)',
    description: 'Mô tả ngắn hiển thị cho tìm kiếm và trang quản trị.',
  },
  {
    key: 'contact_email',
    label: 'Email liên hệ',
    group: 'general',
    dataType: 'string',
    defaultValue: 'support@storeproduct.local',
    description: 'Email tiếp nhận thông tin và hỗ trợ người dùng.',
  },
  {
    key: 'timezone',
    label: 'Múi giờ hệ thống',
    group: 'general',
    dataType: 'string',
    defaultValue: 'Asia/Ho_Chi_Minh',
    description: 'Múi giờ chuẩn dùng để ghi nhận và hiển thị các mốc thời gian.',
  },
  {
    key: 'language',
    label: 'Ngôn ngữ giao diện',
    group: 'general',
    dataType: 'string',
    defaultValue: 'vi',
    description: 'Ngôn ngữ mặc định của giao diện quản trị.',
  },
  {
    key: 'default_page_size',
    label: 'Phân trang mặc định',
    group: 'general',
    dataType: 'number',
    defaultValue: 20,
    description: 'Số lượng bản ghi hiển thị trên mỗi trang trong các danh sách.',
  },
  {
    key: 'maintenance_mode',
    label: 'Chế độ bảo trì',
    group: 'general',
    dataType: 'boolean',
    defaultValue: false,
    description: 'Bật chế độ bảo trì để tạm ngưng các thao tác cập nhật từ người dùng thông thường.',
  },

  // 2. Branding
  {
    key: 'primary_color',
    label: 'Màu nhấn thương hiệu',
    group: 'branding',
    dataType: 'string',
    defaultValue: '#2563eb',
    description: 'Màu sắc chủ đạo của các nút bấm và trạng thái hoạt động.',
  },
  {
    key: 'logo_url',
    label: 'Đường dẫn Logo',
    group: 'branding',
    dataType: 'string',
    defaultValue: '',
    description: 'URL ảnh logo hiển thị trên sidebar và trang đăng nhập.',
  },
  {
    key: 'favicon_url',
    label: 'Đường dẫn Favicon',
    group: 'branding',
    dataType: 'string',
    defaultValue: '/favicon.ico',
    description: 'URL biểu tượng favicon của trình duyệt.',
  },

  // 3. Database
  {
    key: 'db_query_timeout_ms',
    label: 'Thời gian chờ truy vấn (ms)',
    group: 'database',
    dataType: 'number',
    defaultValue: 10000,
    description: 'Giới hạn thời gian tối đa cho mỗi thao tác truy vấn cơ sở dữ liệu.',
  },

  // 4. Storage & Google Drive
  {
    key: 'max_upload_size_mb',
    label: 'Kích thước upload tối đa (MB)',
    group: 'storage',
    dataType: 'number',
    defaultValue: 10,
    description: 'Dung lượng tệp tối đa được phép tải lên hệ thống media.',
  },
  {
    key: 'allowed_file_types',
    label: 'Định dạng tệp cho phép',
    group: 'storage',
    dataType: 'string',
    defaultValue: 'image/jpeg,image/png,image/webp,image/svg+xml',
    description: 'Danh sách MIME types được chấp nhận khi tải ảnh lên.',
  },

  // 5. Scripts & Integrations
  {
    key: 'enable_custom_scripts',
    label: 'Cho phép nạp Script bên ngoài',
    group: 'scripts',
    dataType: 'boolean',
    defaultValue: true,
    description: 'Bật/tắt khả năng phân phối mã GA4, GTM hoặc script tùy biến ra layout.',
  },

  // 6. Security
  {
    key: 'session_timeout_days',
    label: 'Thời hạn phiên đăng nhập (ngày)',
    group: 'security',
    dataType: 'number',
    defaultValue: 30,
    description: 'Thời gian hiệu lực của token đăng nhập JWT trước khi cần đăng nhập lại.',
  },
  {
    key: 'max_failed_logins',
    label: 'Số lần đăng nhập sai tối đa',
    group: 'security',
    dataType: 'number',
    defaultValue: 5,
    description: 'Ngưỡng cảnh báo khi người dùng nhập sai mật khẩu liên tiếp.',
  },

  // 7. Notifications
  {
    key: 'email_notifications_enabled',
    label: 'Thông báo qua Email',
    group: 'notifications',
    dataType: 'boolean',
    defaultValue: false,
    description: 'Gửi email cảnh báo khi xảy ra sự cố nghiêm trọng hoặc bảo mật.',
  },
  {
    key: 'alert_email',
    label: 'Email nhận cảnh báo',
    group: 'notifications',
    dataType: 'string',
    defaultValue: 'admin@storeproduct.local',
    description: 'Hộp thư tiếp nhận thông báo lỗi hệ thống.',
  },

  // 8. Logs & Monitoring
  {
    key: 'log_retention_days',
    label: 'Thời gian lưu trữ nhật ký (ngày)',
    group: 'logs',
    dataType: 'number',
    defaultValue: 90,
    description: 'Thời hạn lưu trữ bản ghi Audit Log và Error Log trước khi dọn dẹp.',
  },
  {
    key: 'error_reporting_level',
    label: 'Mức độ ghi nhận lỗi',
    group: 'logs',
    dataType: 'string',
    defaultValue: 'warn',
    description: 'Mức độ sự cố tối thiểu được lưu vào bảng theo dõi (info, warn, error, fatal).',
  },

  // 9. Advanced
  {
    key: 'api_rate_limit_per_min',
    label: 'Giới hạn tần suất gọi API (req/phút)',
    group: 'advanced',
    dataType: 'number',
    defaultValue: 120,
    description: 'Số lượng yêu cầu API tối đa trên mỗi phút cho một API Key.',
  },
];

export class SettingService {
  /**
   * Khởi tạo cài đặt mặc định nếu chưa tồn tại
   */
  static async ensureInitialized() {
    await connectDB();
    for (const item of ALLOWLIST_SETTINGS) {
      const exists = await SystemSetting.findOne({ key: item.key });
      if (!exists) {
        await SystemSetting.create({
          key: item.key,
          value: item.defaultValue,
          dataType: item.dataType,
          group: item.group,
          label: item.label,
          description: item.description,
          defaultValue: item.defaultValue,
          isSecret: item.isSecret || false,
          version: 1,
        });
      }
    }
  }

  /**
   * Lấy danh sách cấu hình theo nhóm (ẩn secret)
   */
  static async getSettingsByGroup(group: SettingGroup) {
    await this.ensureInitialized();
    const settings = await SystemSetting.find({ group }).lean();
    return settings.map((s) => ({
      ...s,
      value: s.isSecret ? '••••••••' : s.value,
      defaultValue: s.isSecret ? '••••••••' : s.defaultValue,
    }));
  }

  /**
   * Lấy toàn bộ cấu hình hệ thống đã nhóm
   */
  static async getAllGrouped() {
    await this.ensureInitialized();
    const settings = await SystemSetting.find().lean();
    const grouped: Record<string, any[]> = {};

    for (const s of settings) {
      if (!grouped[s.group]) grouped[s.group] = [];
      grouped[s.group].push({
        ...s,
        value: s.isSecret ? '••••••••' : s.value,
        defaultValue: s.isSecret ? '••••••••' : s.defaultValue,
      });
    }

    return grouped;
  }

  /**
   * Lấy giá trị của một setting (dùng nội bộ backend)
   */
  static async getValue<T = any>(key: string): Promise<T | null> {
    await connectDB();
    const s = await SystemSetting.findOne({ key }).lean();
    if (!s) {
      const def = ALLOWLIST_SETTINGS.find((item) => item.key === key);
      return def ? def.defaultValue : null;
    }
    return s.value as T;
  }

  /**
   * Cập nhật một setting an toàn với Optimistic Concurrency Control (OCC)
   */
  static async updateSetting(
    key: string,
    newValue: any,
    expectedVersion: number,
    userId: string
  ) {
    await connectDB();

    // Kiểm tra trong Allowlist
    const allowItem = ALLOWLIST_SETTINGS.find((item) => item.key === key);
    if (!allowItem) {
      throw new Error(`Cấu hình '${key}' không nằm trong danh sách được hỗ trợ`);
    }

    // Validate kiểu dữ liệu
    if (allowItem.dataType === 'number') {
      newValue = Number(newValue);
      if (isNaN(newValue)) {
        throw new Error(`Giá trị của '${key}' phải là số hợp lệ`);
      }
    } else if (allowItem.dataType === 'boolean') {
      newValue = Boolean(newValue);
    }

    const current = await SystemSetting.findOne({ key });
    if (!current) {
      throw new Error(`Không tìm thấy cấu hình: ${key}`);
    }

    // Kiểm tra OCC Version
    if (current.version !== expectedVersion) {
      throw new Error(
        `Cấu hình '${allowItem.label}' đã bị thay đổi bởi người dùng khác (phiên bản hiện tại: v${current.version}). Vui lòng tải lại trang.`
      );
    }

    current.value = newValue;
    current.version += 1;
    current.updatedBy = userId;
    await current.save();

    return {
      key: current.key,
      value: current.isSecret ? '••••••••' : current.value,
      version: current.version,
      updatedAt: current.updatedAt,
    };
  }

  /**
   * Khôi phục giá trị mặc định cho một setting
   */
  static async resetToDefault(key: string, userId: string) {
    await connectDB();
    const current = await SystemSetting.findOne({ key });
    if (!current) {
      throw new Error(`Không tìm thấy cấu hình: ${key}`);
    }

    current.value = current.defaultValue;
    current.version += 1;
    current.updatedBy = userId;
    await current.save();

    return {
      key: current.key,
      value: current.isSecret ? '••••••••' : current.value,
      version: current.version,
    };
  }

  /**
   * Đọc trạng thái biến môi trường triển khai (Không lộ secret!)
   */
  static getEnvStatus() {
    const mask = (val?: string) => {
      if (!val) return 'Chưa cấu hình';
      if (val.length <= 8) return '••••••••';
      return `${val.slice(0, 4)}••••${val.slice(-4)}`;
    };

    return [
      {
        name: 'MONGODB_URI',
        description: 'Chuỗi kết nối cơ sở dữ liệu MongoDB Atlas',
        isConfigured: !!process.env.MONGODB_URI,
        maskedValue: mask(process.env.MONGODB_URI),
        target: 'Vercel Environment Variables',
      },
      {
        name: 'GOOGLE_CLIENT_ID',
        description: 'Client ID xác thực Google Drive API',
        isConfigured: !!process.env.GOOGLE_CLIENT_ID,
        maskedValue: mask(process.env.GOOGLE_CLIENT_ID),
        target: 'Vercel Environment Variables',
      },
      {
        name: 'GOOGLE_CLIENT_SECRET',
        description: 'Client Secret Google OAuth2',
        isConfigured: !!process.env.GOOGLE_CLIENT_SECRET,
        maskedValue: process.env.GOOGLE_CLIENT_SECRET ? '••••••••' : 'Chưa cấu hình',
        target: 'Vercel Environment Variables',
      },
      {
        name: 'GOOGLE_TOKEN_ENCRYPTION_KEY',
        description: 'Khóa mã hóa token Google Drive lưu trong DB',
        isConfigured: !!process.env.GOOGLE_TOKEN_ENCRYPTION_KEY,
        maskedValue: process.env.GOOGLE_TOKEN_ENCRYPTION_KEY ? '••••••••' : 'Chưa cấu hình',
        target: 'Vercel Environment Variables',
      },
      {
        name: 'AUTH_SECRET',
        description: 'Khóa bảo mật phiên đăng nhập NextAuth JWT',
        isConfigured: !!process.env.AUTH_SECRET,
        maskedValue: process.env.AUTH_SECRET ? '••••••••' : 'Chưa cấu hình (dùng fallback)',
        target: 'Vercel Environment Variables',
      },
    ];
  }
}
