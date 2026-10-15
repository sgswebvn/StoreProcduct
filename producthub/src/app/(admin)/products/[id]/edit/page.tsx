'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ProductForm, InitialProductData } from '@/components/products/ProductForm';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

export default function EditProductPage() {
  const params = useParams();
  const id = params?.id as string;
  const toast = useToast();

  const [loading, setLoading] = useState(true);
  const [productData, setProductData] = useState<InitialProductData | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    fetch(`/api/v1/products/${id}`)
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data) {
          const p = data.data;
          setProductData({
            _id: p._id,
            name: p.name,
            slug: p.slug,
            sku: p.sku || '',
            shortDescription: p.shortDescription || '',
            description: p.description || '',
            status: p.status,
            categories: (p.categories || []).map((c: any) => c._id || c),
            thumbnail: p.thumbnail,
            images: p.images || [],
            price: p.price ?? 0,
            originalPrice: p.originalPrice ?? 0,
            tags: p.tags || [],
            dataVersion: p.dataVersion || 1,
          });
        } else {
          toast.error(data.error?.message || 'Không tìm thấy sản phẩm.');
        }
      })
      .catch(() => {
        toast.error('Lỗi khi tải thông tin sản phẩm.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id, toast]);

  if (loading) {
    return (
      <div style={{ padding: 'var(--space-6)', maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
        <Skeleton height="32px" width="240px" />
        <div style={{ marginTop: '24px' }}>
          <Skeleton height="300px" width="100%" />
        </div>
      </div>
    );
  }

  if (!productData) {
    return (
      <div style={{ padding: 'var(--space-6)', textAlign: 'center' }}>
        <h2>Không tìm thấy sản phẩm</h2>
        <Link href="/products" className="btn btn-primary" style={{ marginTop: '16px' }}>
          Quay lại danh sách sản phẩm
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: 'var(--space-6)', maxWidth: 'var(--content-max-width)', margin: '0 auto' }}>
      <div className="page-header">
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '0.875rem' }}>
            <Link href="/products" style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}>
              ← Quay lại danh sách sản phẩm
            </Link>
          </div>
          <h1 className="page-title">Chỉnh sửa sản phẩm</h1>
          <p className="page-description">
            Cập nhật chi tiết thông tin, giá bán và hình ảnh Google Drive của sản phẩm.
          </p>
        </div>
      </div>

      <ProductForm initialData={productData} isEditing={true} />
    </div>
  );
}
