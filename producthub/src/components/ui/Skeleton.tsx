import React from 'react';
import styles from './Skeleton.module.css';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export function Skeleton({
  width = '100%',
  height = '1rem',
  borderRadius,
  className = '',
  style,
  ...props
}: SkeletonProps) {
  return (
    <div
      className={`${styles.skeleton} ${className}`}
      style={{
        width,
        height,
        borderRadius: borderRadius ?? undefined,
        ...style,
      }}
      aria-hidden="true"
      {...props}
    />
  );
}

export function TableSkeleton({
  rows = 5,
  columns = 5,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className={styles.tableWrapper} role="status" aria-label="Đang tải dữ liệu bảng...">
      <div className={styles.tableHeader}>
        {Array.from({ length: columns }).map((_, i) => (
          <Skeleton
            key={`th-${i}`}
            height="14px"
            width={i === 0 ? '40px' : i === 1 ? '160px' : '100px'}
          />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={`tr-${r}`} className={styles.tableRow}>
          {Array.from({ length: columns }).map((_, c) => (
            <Skeleton
              key={`td-${r}-${c}`}
              height="16px"
              width={c === 0 ? '40px' : c === 1 ? '200px' : '90px'}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className={styles.cardSkeleton} role="status" aria-label="Đang tải thẻ...">
      <Skeleton height="14px" width="40%" />
      <Skeleton height="28px" width="60%" />
      <Skeleton height="12px" width="80%" />
    </div>
  );
}

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className={styles.formGrid} role="status" aria-label="Đang tải biểu mẫu...">
      {Array.from({ length: fields }).map((_, i) => (
        <div key={`fld-${i}`} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <Skeleton height="14px" width="120px" />
          <Skeleton height="38px" width="100%" />
        </div>
      ))}
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        <Skeleton height="38px" width="120px" />
        <Skeleton height="38px" width="100px" />
      </div>
    </div>
  );
}
