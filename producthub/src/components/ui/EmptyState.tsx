import React from 'react';
import styles from './EmptyState.module.css';

export type EmptyStateType = 'no_data' | 'no_results' | 'forbidden' | 'module_disabled' | 'error';

interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  actionElement?: React.ReactNode;
}

const DEFAULT_CONFIG: Record<EmptyStateType, { title: string; description: string }> = {
  no_data: {
    title: 'Chưa có dữ liệu',
    description: 'Bắt đầu tạo bản ghi đầu tiên để quản lý trong hệ thống.',
  },
  no_results: {
    title: 'Không tìm thấy kết quả phù hợp',
    description: 'Thử kiểm tra lại từ khóa tìm kiếm hoặc điều chỉnh lại các bộ lọc đang áp dụng.',
  },
  forbidden: {
    title: 'Không có quyền truy cập',
    description: 'Tài khoản của bạn chưa được cấp quyền để xem hoặc thao tác trên dữ liệu này.',
  },
  module_disabled: {
    title: 'Module hiện đang tắt',
    description: 'Tính năng này thuộc module tùy chọn đang không được kích hoạt trong cài đặt hệ thống.',
  },
  error: {
    title: 'Không thể tải dữ liệu',
    description: 'Hệ thống phản hồi quá lâu hoặc đã xảy ra lỗi mạng. Vui lòng thử lại.',
  },
};

export function EmptyState({
  type = 'no_data',
  title,
  description,
  actionLabel,
  onAction,
  actionElement,
}: EmptyStateProps) {
  const displayTitle = title ?? DEFAULT_CONFIG[type].title;
  const displayDesc = description ?? DEFAULT_CONFIG[type].description;

  return (
    <div className={styles.emptyState} role="status">
      <div className={styles.iconWrapper} aria-hidden="true">
        {type === 'no_results' ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
            <line x1="11" y1="8" x2="11" y2="14" />
          </svg>
        ) : type === 'forbidden' ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        ) : type === 'error' ? (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        ) : (
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        )}
      </div>

      <h3 className={styles.title}>{displayTitle}</h3>
      <p className={styles.description}>{displayDesc}</p>

      {actionElement ? (
        <div className={styles.actions}>{actionElement}</div>
      ) : actionLabel && onAction ? (
        <div className={styles.actions}>
          <button type="button" className="btn btn-primary" onClick={onAction}>
            {actionLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
