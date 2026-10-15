import React from 'react';
import Link from 'next/link';
import { StoreProductLogo } from '@/components/ui/StoreProductLogo';
import { APP_CONFIG } from '@/core/config/app.config';
import styles from './PublicLayout.module.css';

export function PublicLayout({ children }: { children: React.ReactNode }) {
  const currentYear = new Date().getFullYear();

  return (
    <div className={styles.publicContainer}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <Link href="/" style={{ textDecoration: 'none' }}>
            <StoreProductLogo size="md" showText={true} />
          </Link>
          <nav className={styles.navLinks}>
            <Link href="/services" className={styles.navLink}>
              Dịch vụ
            </Link>
            <Link href="/privacy-policy" className={styles.navLink}>
              Bảo mật
            </Link>
            <Link href="/terms-of-service" className={styles.navLink}>
              Điều khoản
            </Link>
            <Link href="/auth/login" className="btn btn-primary btn-sm">
              Đăng nhập
            </Link>
          </nav>
        </div>
      </header>

      <main className={styles.mainContent}>{children}</main>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div>
              <StoreProductLogo size="sm" showText={true} />
              <p className={styles.footerBrandDesc}>{APP_CONFIG.description}</p>
            </div>
            <div className={styles.footerLinks}>
              <Link href="/services" className={styles.navLink}>
                Giới thiệu Dịch vụ
              </Link>
              <Link href="/privacy-policy" className={styles.navLink}>
                Chính sách Bảo mật
              </Link>
              <Link href="/terms-of-service" className={styles.navLink}>
                Điều khoản Dịch vụ
              </Link>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>
              &copy; {currentYear} {APP_CONFIG.name}. Bản quyền đã được bảo lưu.
            </span>
            <span>Nền tảng Quản trị Thông tin Sản phẩm (PIM)</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
