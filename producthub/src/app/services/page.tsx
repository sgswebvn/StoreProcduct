import type { Metadata } from 'next';
import Link from 'next/link';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { APP_CONFIG } from '@/core/config/app.config';

export const metadata: Metadata = {
  title: 'Giới thiệu Dịch vụ (Services)',
  description: `Nền tảng Quản trị Thông tin Sản phẩm tập trung ${APP_CONFIG.name}.`,
};

export default function ServicesPage() {
  return (
    <PublicLayout>
      <div style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
        <header style={{ textAlign: 'center', marginBottom: '48px' }}>
          <span
            style={{
              display: 'inline-block',
              padding: '4px 12px',
              backgroundColor: 'var(--primary-subtle, hsl(231, 100%, 96%))',
              color: 'var(--primary, hsl(231, 73%, 57%))',
              borderRadius: '9999px',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: '12px',
            }}
          >
            Nền tảng PIM Thế hệ Mới
          </span>
          <h1 style={{ fontSize: '2.25rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '12px', letterSpacing: '-0.02em' }}>
            Quản trị Tập trung Dữ liệu Sản phẩm cùng {APP_CONFIG.name}
          </h1>
          <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', maxWidth: '680px', margin: '0 auto' }}>
            {APP_CONFIG.description}
          </p>
        </header>

        {/* Feature Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '24px', marginBottom: '48px' }}>
          <FeatureCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            }
            title="Quản lý Sản phẩm Tập trung"
            description="Tổ chức toàn diện thông tin sản phẩm, SKU nội bộ, giá bán, biến thể và thuộc tính kỹ thuật trên một giao diện thống nhất."
          />
          <FeatureCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
              </svg>
            }
            title="Cây Danh mục Đa tầng"
            description="Xây dựng cấu trúc phân loại sản phẩm linh hoạt không giới hạn độ sâu, tối ưu cho điều hướng và tìm kiếm."
          />
          <FeatureCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            }
            title="Lưu trữ Google Drive API"
            description="Tải ảnh trực tiếp lên Google Drive cá nhân của quản trị viên qua OAuth 2.0 an toàn. MongoDB chỉ lưu metadata nhẹ nhàng."
          />
          <FeatureCard
            icon={
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            }
            title="Phân phối API Đa Website"
            description="Cung cấp REST API bảo mật với khóa SHA-256 để đồng bộ dữ liệu theo thời gian thực tới nhiều website bán hàng vệ tinh."
          />
        </div>

        {/* CTA Section */}
        <section
          style={{
            backgroundColor: 'var(--bg-subtle)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-lg)',
            padding: '36px',
            textAlign: 'center',
          }}
        >
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Hệ thống Quản trị Dành riêng cho Doanh nghiệp
          </h2>
          <p style={{ maxWidth: '540px', margin: '0 auto 20px auto', fontSize: '0.9375rem' }}>
            Đăng nhập vào cổng quản trị để bắt đầu quản lý danh mục và phân phối dữ liệu sản phẩm tới toàn bộ mạng lưới website.
          </p>
          <Link href="/auth/login" className="btn btn-primary btn-lg">
            Truy cập Cổng Đăng nhập
          </Link>
        </section>
      </div>
    </PublicLayout>
  );
}

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div
      style={{
        backgroundColor: '#ffffff',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
      }}
    >
      <div
        style={{
          width: '44px',
          height: '44px',
          borderRadius: '8px',
          backgroundColor: 'var(--bg-surface-hover)',
          color: 'var(--primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {icon}
      </div>
      <h3 style={{ fontSize: '1.0625rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
        {title}
      </h3>
      <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.5 }}>
        {description}
      </p>
    </div>
  );
}
