import React from 'react';
import { APP_CONFIG } from '@/core/config/app.config';

interface StoreProductLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

export function StoreProductLogo({
  size = 'md',
  showText = true,
  className = '',
}: StoreProductLogoProps) {
  const iconDimensions = size === 'sm' ? 24 : size === 'lg' ? 40 : 32;
  const fontSize = size === 'sm' ? '0.95rem' : size === 'lg' ? '1.4rem' : '1.15rem';

  return (
    <div
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '10px',
        textDecoration: 'none',
        userSelect: 'none',
      }}
    >
      <div
        style={{
          width: iconDimensions,
          height: iconDimensions,
          borderRadius: size === 'sm' ? '6px' : '8px',
          background: 'linear-gradient(135deg, hsl(231, 73%, 57%), hsl(245, 65%, 48%))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(79, 70, 229, 0.25)',
        }}
        aria-hidden="true"
      >
        <svg
          width={iconDimensions * 0.65}
          height={iconDimensions * 0.65}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          {/* Biểu tượng khối lập phương sản phẩm kết hợp kho dữ liệu */}
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      </div>

      {showText && (
        <span
          style={{
            fontSize,
            fontWeight: 700,
            color: 'var(--text-primary, #0f172a)',
            letterSpacing: '-0.02em',
            lineHeight: 1.2,
          }}
        >
          Store<span style={{ color: 'var(--primary, hsl(231, 73%, 57%))' }}>Product</span>
        </span>
      )}
    </div>
  );
}
