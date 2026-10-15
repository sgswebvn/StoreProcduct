'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './Sidebar.module.css';
import type { Role } from '@/core/auth/permissions';
import { StoreProductLogo } from '@/components/ui/StoreProductLogo';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  requiredRole?: Role[];
  isOptional?: boolean; // module-dependent, hidden when disabled
}

const NAV_ITEMS: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Tổng quan',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    href: '/products',
    label: 'Sản phẩm',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    ),
  },
  {
    href: '/categories',
    label: 'Danh mục',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
  {
    href: '/product-types',
    label: 'Loại & Thuộc tính',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      </svg>
    ),
  },
  {
    href: '/media',
    label: 'Thư viện Media',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" />
        <path d="M21 15l-5-5L5 21" />
      </svg>
    ),
  },
  {
    href: '/inventory',
    label: 'Tồn kho',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
        <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        <line x1="12" y1="22.08" x2="12" y2="12" />
      </svg>
    ),
    requiredRole: ['owner', 'administrator', 'editor'],
  },
  {
    href: '/projects',
    label: 'Dự án & Sites',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
      </svg>
    ),
    requiredRole: ['owner', 'administrator'],
  },
];

const SECONDARY_NAV: NavItem[] = [
  {
    href: '/modules',
    label: 'Quản lý Module',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" />
        <path d="M12 22V12M12 12L3 7M12 12l9-5" />
      </svg>
    ),
    requiredRole: ['owner', 'administrator'],
  },
  {
    href: '/import-export',
    label: 'Nhập & Xuất',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" />
      </svg>
    ),
  },
  {
    href: '/api-keys',
    label: 'Tích hợp & API Keys',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 2l-2 2m-2-2l2 2m-2 2l2-2" />
        <circle cx="7.5" cy="15.5" r="5.5" />
        <path d="M15.5 7.5L14 9l3 3 1.5-1.5" />
        <path d="M11.5 11.5l5-5" />
      </svg>
    ),
    requiredRole: ['owner', 'administrator'],
  },
  {
    href: '/users',
    label: 'Người dùng & Quyền',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
    requiredRole: ['owner', 'administrator'],
  },
  {
    href: '/audit-logs',
    label: 'Nhật ký hoạt động',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" /><line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" /><polyline points="10 9 9 9 8 9" />
      </svg>
    ),
    requiredRole: ['owner', 'administrator'],
  },
  {
    href: '/system/errors',
    label: 'Giám sát lỗi',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
        <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
      </svg>
    ),
    requiredRole: ['owner', 'administrator'],
  },
  {
    href: '/settings',
    label: 'Cài đặt hệ thống',
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="3" />
        <path d="M19.07 4.93a10 10 0 0 1 1.41 13.66l-1.41-1.41a8 8 0 0 0-1.18-10.83zM4.93 4.93A10 10 0 0 0 3.52 18.6l1.41-1.41A8 8 0 0 1 6.1 6.34z" />
      </svg>
    ),
    requiredRole: ['owner', 'administrator'],
  },
];

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  userRole: Role;
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.href === '/dashboard'
      ? pathname === '/dashboard'
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      className={`${styles.navLink} ${isActive ? styles.navLinkActive : ''}`}
      aria-current={isActive ? 'page' : undefined}
    >
      <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
      <span className={styles.navLabel}>{item.label}</span>
      {isActive && <span className={styles.activeIndicator} aria-hidden="true" />}
    </Link>
  );
}

export default function Sidebar({ isOpen, onClose, userRole }: SidebarProps) {
  const pathname = usePathname();

  const filterByRole = (items: NavItem[]) =>
    items.filter(
      (item) => !item.requiredRole || item.requiredRole.includes(userRole)
    );

  return (
    <aside
      className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}
      aria-label="Main navigation"
    >
      {/* Logo */}
      <div className={styles.logoArea}>
        <Link href="/dashboard" className={styles.logo} onClick={onClose}>
          <StoreProductLogo size="sm" showText={true} />
        </Link>
        <button
          className={styles.closeBtn}
          onClick={onClose}
          aria-label="Đóng menu"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Main nav */}
      <nav className={styles.nav}>
        <div className={styles.navSection}>
          <span className={styles.navSectionLabel}>Quản lý dữ liệu</span>
          {filterByRole(NAV_ITEMS).map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>

        <div className={styles.navDivider} />

        <div className={styles.navSection}>
          <span className={styles.navSectionLabel}>Hệ thống & Tích hợp</span>
          {filterByRole(SECONDARY_NAV).map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} />
          ))}
        </div>
      </nav>

      {/* Footer */}
      <div className={styles.sidebarFooter}>
        <div className={styles.versionBadge}>StoreProduct v1.0</div>
      </div>
    </aside>
  );
}
