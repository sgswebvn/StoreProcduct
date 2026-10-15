/**
 * Cấu hình thương hiệu và nhận diện hệ thống StoreProduct.
 * Quản lý tập trung thông tin để dễ dàng thay đổi mà không phải sửa nhiều file.
 */

export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? 'StoreProduct',
  tagline: 'Hệ thống Quản lý Dữ liệu Sản phẩm Tập trung',
  description: 'Nền tảng quản trị trung tâm dữ liệu sản phẩm, hỗ trợ phân phối API cho nhiều website vệ tinh và lưu trữ ảnh an toàn trên Google Drive.',
  version: '1.0.0',
  url: process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
  databaseName: process.env.MONGODB_DB ?? 'StoreProduct',
  legal: {
    privacyPolicyPath: '/privacy-policy',
    termsOfServicePath: '/terms-of-service',
    servicesPath: '/services',
  },
  support: {
    email: 'support@storeproduct.local',
  },
} as const;
