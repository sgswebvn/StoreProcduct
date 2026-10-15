import React from 'react';
import styles from './Badge.module.css';

export type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface BadgeProps {
  children: React.ReactNode;
  variant?: BadgeVariant;
  withDot?: boolean;
  className?: string;
}

export function Badge({
  children,
  variant = 'neutral',
  withDot = true,
  className = '',
}: BadgeProps) {
  const variantClass = styles[variant] || styles.neutral;

  return (
    <span className={`${styles.badge} ${variantClass} ${className}`}>
      {withDot && <span className={styles.dot} aria-hidden="true" />}
      {children}
    </span>
  );
}
