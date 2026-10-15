'use client';

import React from 'react';
import Link from 'next/link';
import { ProductForm } from '@/components/products/ProductForm';

export default function NewProductPage() {
  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.875rem' }}>
            <Link href="/products" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              ← Quay lại danh sách sản phẩm
            </Link>
          </div>
          <h1 className="page-title">Thêm sản phẩm mới</h1>
          <p className="page-description">
            Tạo bản ghi dữ liệu sản phẩm mới và liên kết hình ảnh trực tiếp từ Google Drive.
          </p>
        </div>
      </div>

      <ProductForm isEditing={false} />
    </div>
  );
}
