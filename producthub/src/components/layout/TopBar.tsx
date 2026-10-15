'use client';

import { signOut } from 'next-auth/react';
import { useState, useRef, useEffect } from 'react';
import styles from './TopBar.module.css';
import type { SessionUser } from '@/core/auth/auth.config';

interface TopBarProps {
  user: SessionUser;
  onMenuToggle: () => void;
}

function UserAvatar({ user }: { user: SessionUser }) {
  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();

  return (
    <div className={styles.avatar} aria-hidden="true">
      {user.avatar ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={user.avatar} alt="" className={styles.avatarImg} />
      ) : (
        <span className={styles.avatarInitials}>{initials}</span>
      )}
    </div>
  );
}

const ROLE_LABELS: Record<string, string> = {
  owner: 'Chủ sở hữu',
  administrator: 'Quản trị viên',
  product_manager: 'Quản lý sản phẩm',
  editor: 'Biên tập viên',
  viewer: 'Người xem',
};

export default function TopBar({ user, onMenuToggle }: TopBarProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = () => {
    signOut({ callbackUrl: '/auth/login' });
  };

  return (
    <header className={styles.topbar} role="banner">
      {/* Mobile hamburger */}
      <button
        className={styles.menuBtn}
        onClick={onMenuToggle}
        aria-label="Mở/đóng thanh điều hướng"
        id="btn-menu-toggle"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6" />
          <line x1="3" y1="12" x2="21" y2="12" />
          <line x1="3" y1="18" x2="21" y2="18" />
        </svg>
      </button>

      {/* Breadcrumb / Page title placeholder */}
      <div className={styles.breadcrumb} id="topbar-breadcrumb" />

      {/* Right: User menu */}
      <div className={styles.right}>
        <div className={styles.userMenuWrapper} ref={dropdownRef}>
          <button
            className={styles.userBtn}
            onClick={() => setDropdownOpen((v) => !v)}
            aria-expanded={dropdownOpen}
            aria-haspopup="true"
            id="btn-user-menu"
          >
            <UserAvatar user={user} />
            <div className={styles.userInfo}>
              <span className={styles.userName}>{user.name}</span>
              <span className={styles.userRole}>{ROLE_LABELS[user.role] ?? user.role}</span>
            </div>
            <svg
              className={`${styles.chevron} ${dropdownOpen ? styles.chevronOpen : ''}`}
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>

          {dropdownOpen && (
            <div className={styles.dropdown} role="menu">
              <div className={styles.dropdownHeader}>
                <span className={styles.dropdownEmail}>{user.email}</span>
              </div>
              <div className={styles.dropdownDivider} />
              <a
                href="/settings"
                className={styles.dropdownItem}
                role="menuitem"
                onClick={() => setDropdownOpen(false)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.07 4.93a10 10 0 0 1 1.41 13.66l-1.41-1.41a8 8 0 0 0-1.18-10.83z" />
                </svg>
                Cài đặt tài khoản
              </a>
              <div className={styles.dropdownDivider} />
              <button
                className={`${styles.dropdownItem} ${styles.dropdownItemDanger}`}
                role="menuitem"
                onClick={handleSignOut}
                id="btn-signout"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                  <polyline points="16 17 21 12 16 7" />
                  <line x1="21" y1="12" x2="9" y2="12" />
                </svg>
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
