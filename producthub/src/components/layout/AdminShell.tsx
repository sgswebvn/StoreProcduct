'use client';

import { useState } from 'react';
import Sidebar from './Sidebar';
import TopBar from './TopBar';
import styles from './AdminShell.module.css';
import type { SessionUser } from '@/core/auth/auth.config';

interface AdminShellProps {
  user: SessionUser;
  children: React.ReactNode;
}

export default function AdminShell({ user, children }: AdminShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className={styles.shell}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className={styles.overlay}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        userRole={user.role}
      />

      <div className={styles.main}>
        <TopBar
          user={user}
          onMenuToggle={() => setSidebarOpen((v) => !v)}
        />
        <main className={styles.content} id="main-content">
          <div className={styles.contentInner}>{children}</div>
        </main>
      </div>
    </div>
  );
}
