import { ModuleDefinition } from './module.types';

export const REGISTERED_MODULES: ModuleDefinition[] = [
  {
    id: 'dashboard',
    name: 'Tổng quan',
    description: 'Thống kê tổng quan dữ liệu sản phẩm và hoạt động hệ thống',
    version: '1.0.0',
    isCore: true,
    defaultEnabled: true,
    icon: 'layout-dashboard',
    navGroup: 'overview',
    order: 1,
    path: '/dashboard',
    requiredPermissions: [],
  },
  {
    id: 'products',
    name: 'Sản phẩm',
    description: 'Quản lý thông tin sản phẩm, SKU, giá, trạng thái và thuộc tính mở rộng',
    version: '1.0.0',
    isCore: true,
    defaultEnabled: true,
    icon: 'package',
    navGroup: 'catalog',
    order: 1,
    path: '/products',
    requiredPermissions: ['products.read'],
  },
  {
    id: 'categories',
    name: 'Danh mục',
    description: 'Tổ chức phân cấp danh mục sản phẩm đa tầng (cây phân cấp)',
    version: '1.0.0',
    isCore: true,
    defaultEnabled: true,
    icon: 'folder-tree',
    navGroup: 'catalog',
    order: 2,
    path: '/categories',
    requiredPermissions: ['categories.read'],
  },
  {
    id: 'product-types',
    name: 'Loại & Thuộc tính',
    description: 'Định nghĩa Product Types và schema trường dữ liệu động (custom fields)',
    version: '1.0.0',
    isCore: true,
    defaultEnabled: true,
    icon: 'sliders-horizontal',
    navGroup: 'catalog',
    order: 3,
    path: '/product-types',
    requiredPermissions: ['product_types.read'],
  },
  {
    id: 'media',
    name: 'Thư viện Media',
    description: 'Tải lên, quản lý hình ảnh, tài liệu và metadata đính kèm sản phẩm',
    version: '1.0.0',
    isCore: true,
    defaultEnabled: true,
    icon: 'images',
    navGroup: 'media',
    order: 1,
    path: '/media',
    requiredPermissions: ['media.read'],
  },
  {
    id: 'inventory',
    name: 'Quản lý kho',
    description: 'Theo dõi tồn kho đơn giản theo kho hàng và địa điểm (Module tùy chọn)',
    version: '1.0.0',
    isCore: false,
    defaultEnabled: false,
    icon: 'boxes',
    navGroup: 'catalog',
    order: 4,
    path: '/inventory',
    requiredPermissions: ['inventory.read'],
    dependencies: ['products'],
  },
  {
    id: 'variants',
    name: 'Biến thể sản phẩm',
    description: 'Quản lý các biến thể sản phẩm theo kích thước, màu sắc (Module tùy chọn)',
    version: '1.0.0',
    isCore: false,
    defaultEnabled: false,
    icon: 'layers',
    navGroup: 'catalog',
    order: 5,
    path: '/variants',
    requiredPermissions: ['products.read'],
    dependencies: ['products'],
  },
  {
    id: 'projects',
    name: 'Dự án & Sites vệ tinh',
    description: 'Quản lý nhiều website, kênh phân phối vệ tinh và tùy biến dữ liệu theo từng site',
    version: '1.0.0',
    isCore: false,
    defaultEnabled: true,
    icon: 'globe',
    navGroup: 'data',
    order: 1,
    path: '/projects',
    requiredPermissions: ['products.read'],
    dependencies: ['products'],
  },
  {
    id: 'import-export',
    name: 'Nhập & Xuất',
    description: 'Nhập xuất dữ liệu sản phẩm định dạng Excel/CSV hàng loạt',
    version: '1.0.0',
    isCore: false,
    defaultEnabled: true,
    icon: 'file-spreadsheet',
    navGroup: 'data',
    order: 2,
    path: '/import-export',
    requiredPermissions: ['import_export.read'],
    dependencies: ['products'],
  },
  {
    id: 'api-keys',
    name: 'Kết nối API & Sites',
    description: 'Quản lý API Keys bảo mật (SHA-256) và phân quyền cho các website vệ tinh',
    version: '1.0.0',
    isCore: true,
    defaultEnabled: true,
    icon: 'key-round',
    navGroup: 'data',
    order: 3,
    path: '/api-keys',
    requiredPermissions: ['api_keys.read'],
  },
  {
    id: 'modules',
    name: 'Quản lý Module',
    description: 'Quản lý kiến trúc Module lõi và bật/tắt các tính năng mở rộng an toàn',
    version: '1.0.0',
    isCore: true,
    defaultEnabled: true,
    icon: 'package-search',
    navGroup: 'system',
    order: 1,
    path: '/modules',
    requiredPermissions: ['settings.read'],
  },
  {
    id: 'users',
    name: 'Tài khoản & Phân quyền',
    description: 'Quản lý người dùng nội bộ, vai trò và phân quyền chi tiết',
    version: '1.0.0',
    isCore: true,
    defaultEnabled: true,
    icon: 'users',
    navGroup: 'system',
    order: 2,
    path: '/users',
    requiredPermissions: ['users.read'],
  },
  {
    id: 'audit-logs',
    name: 'Nhật ký hoạt động',
    description: 'Ghi lại mọi thao tác tạo, sửa, xóa quan trọng trong hệ thống',
    version: '1.0.0',
    isCore: true,
    defaultEnabled: true,
    icon: 'scroll-text',
    navGroup: 'system',
    order: 3,
    path: '/audit-logs',
    requiredPermissions: ['audit_logs.read'],
  },
  {
    id: 'settings',
    name: 'Cài đặt hệ thống',
    description: 'Cấu hình thương hiệu, đơn vị tiền tệ, SEO và tùy chọn hệ thống',
    version: '1.0.0',
    isCore: true,
    defaultEnabled: true,
    icon: 'settings',
    navGroup: 'system',
    order: 4,
    path: '/settings',
    requiredPermissions: ['settings.read'],
  },
];

export class ModuleRegistry {
  private static modules: Map<string, ModuleDefinition> = new Map(
    REGISTERED_MODULES.map((m) => [m.id, m])
  );

  static getAll(): ModuleDefinition[] {
    return Array.from(this.modules.values()).sort((a, b) => a.order - b.order);
  }

  static getById(id: string): ModuleDefinition | undefined {
    return this.modules.get(id);
  }

  static getByPath(path: string): ModuleDefinition | undefined {
    return Array.from(this.modules.values()).find(
      (m) => m.path === path || (m.path !== '/' && path.startsWith(m.path))
    );
  }

  static getNavGroup(group: string): ModuleDefinition[] {
    return this.getAll().filter((m) => m.navGroup === group);
  }
}
