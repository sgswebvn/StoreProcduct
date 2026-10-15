'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './products.module.css';
import { useToast } from '@/components/ui/Toast';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmDialog } from '@/components/ui/Modal';

interface ProductItem {
  _id: string;
  name: string;
  slug: string;
  sku?: string;
  status: 'draft' | 'active' | 'archived';
  price?: number;
  dataVersion: number;
  thumbnail?: {
    _id: string;
    fileName: string;
    thumbnailUrl?: string;
  };
  categories: Array<{
    _id: string;
    name: string;
    slug: string;
  }>;
  createdAt: string;
}

interface FlatCategory {
  _id: string;
  displayName: string;
}

export default function ProductsPage() {
  const toast = useToast();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [categories, setCategories] = useState<FlatCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Actions
  const [deleteTarget, setDeleteTarget] = useState<ProductItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

  // Fetch Categories for dropdown
  useEffect(() => {
    fetch('/api/v1/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCategories(data.data || []);
        }
      })
      .catch(() => {});
  }, []);

  // Fetch Products
  const fetchProducts = useCallback(async (p: number, q: string, cat: string, st: string) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: p.toString(),
        limit: '15',
        status: st,
      });
      if (q) params.set('search', q);
      if (cat) params.set('category', cat);

      const res = await fetch(`/api/v1/products?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setProducts(data.data || []);
        if (data.meta) {
          setPage(data.meta.page);
          setTotalPages(data.meta.totalPages);
          setTotalCount(data.meta.total);
        }
      }
    } catch {
      toast.error('Không thể tải danh sách sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  // Debounced search & filter
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProducts(1, search, selectedCategory, statusFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, selectedCategory, statusFilter, fetchProducts]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      fetchProducts(newPage, search, selectedCategory, statusFilter);
    }
  };

  // Duplicate Product
  const handleDuplicate = async (item: ProductItem) => {
    try {
      setIsDuplicating(item._id);
      const res = await fetch(`/api/v1/products/${item._id}/duplicate`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã nhân bản sản phẩm "${item.name}"!`);
        fetchProducts(page, search, selectedCategory, statusFilter);
      } else {
        toast.error(data.error?.message || 'Không thể nhân bản.');
      }
    } catch {
      toast.error('Lỗi khi nhân bản sản phẩm.');
    } finally {
      setIsDuplicating(null);
    }
  };

  // Archive / Restore Product
  const handleToggleArchive = async (item: ProductItem) => {
    try {
      const isArchived = item.status === 'archived';
      const url = isArchived
        ? `/api/v1/products/${item._id}/restore`
        : `/api/v1/products/${item._id}`;
      const method = isArchived ? 'POST' : 'DELETE';

      const res = await fetch(url, { method });
      const data = await res.json();
      if (data.success) {
        toast.success(
          isArchived
            ? `Đã khôi phục sản phẩm "${item.name}" về bản nháp!`
            : `Đã lưu trữ sản phẩm "${item.name}"!`
        );
        fetchProducts(page, search, selectedCategory, statusFilter);
      } else {
        toast.error(data.error?.message || 'Thao tác thất bại.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    }
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/v1/products/${deleteTarget._id}?permanent=true`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa vĩnh viễn sản phẩm "${deleteTarget.name}"!`);
        setDeleteTarget(null);
        fetchProducts(page, search, selectedCategory, statusFilter);
      } else {
        toast.error(data.error?.message || 'Không thể xóa sản phẩm.');
      }
    } catch {
      toast.error('Lỗi khi xóa sản phẩm.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatPrice = (val?: number) => {
    if (!val || val === 0) return 'Chưa định giá';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Quản lý Sản phẩm (Core PIM)</h1>
          <p className="page-description">
            Trung tâm quản lý dữ liệu sản phẩm, giá bán tham khảo và phân loại danh mục.
          </p>
        </div>
        <div>
          <Link href="/products/new" className="btn btn-primary">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm sản phẩm mới
          </Link>
        </div>
      </div>

      {/* Toolbar & Filters */}
      <div className={styles.toolbar}>
        <div className={styles.searchAndFilter}>
          <div className={styles.searchBox}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="var(--text-tertiary)">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm theo tên, SKU hoặc thẻ tag..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '180px' }}
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">Tất cả danh mục</option>
            {categories.map((c) => (
              <option key={c._id} value={c._id}>
                {c.displayName}
              </option>
            ))}
          </select>
        </div>

        {/* Status Tabs */}
        <div className={styles.statusTabs}>
          <button
            type="button"
            className={`${styles.statusTab} ${statusFilter === 'all' ? styles.statusTabActive : ''}`}
            onClick={() => setStatusFilter('all')}
          >
            Tất cả
          </button>
          <button
            type="button"
            className={`${styles.statusTab} ${statusFilter === 'active' ? styles.statusTabActive : ''}`}
            onClick={() => setStatusFilter('active')}
          >
            Đang hoạt động
          </button>
          <button
            type="button"
            className={`${styles.statusTab} ${statusFilter === 'draft' ? styles.statusTabActive : ''}`}
            onClick={() => setStatusFilter('draft')}
          >
            Bản nháp
          </button>
          <button
            type="button"
            className={`${styles.statusTab} ${statusFilter === 'archived' ? styles.statusTabActive : ''}`}
            onClick={() => setStatusFilter('archived')}
          >
            Lưu trữ
          </button>
        </div>
      </div>

      {/* Table Card */}
      <div className={styles.tableCard}>
        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height="56px" width="100%" />
            <div style={{ marginTop: '12px' }}>
              <Skeleton height="56px" width="100%" />
            </div>
            <div style={{ marginTop: '12px' }}>
              <Skeleton height="56px" width="100%" />
            </div>
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            type={search || selectedCategory || statusFilter !== 'all' ? 'no_results' : 'no_data'}
            title={search || selectedCategory ? 'Không tìm thấy sản phẩm' : 'Chưa có sản phẩm nào'}
            description={
              search || selectedCategory
                ? 'Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm.'
                : 'Thêm sản phẩm đầu tiên để bắt đầu lưu trữ thông tin sản phẩm trên StoreProduct.'
            }
            actionLabel={!search && !selectedCategory ? 'Thêm sản phẩm ngay' : undefined}
            onAction={() => (window.location.href = '/products/new')}
          />
        ) : (
          <>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th style={{ width: '64px' }}>Ảnh</th>
                  <th>Tên sản phẩm</th>
                  <th>Mã SKU</th>
                  <th>Danh mục</th>
                  <th>Giá tham khảo</th>
                  <th>Trạng thái</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.map((item) => (
                  <tr key={item._id}>
                    <td>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.thumbnail ? `/api/v1/media/${item.thumbnail._id}/view` : '/default-product.svg'}
                        alt={item.name}
                        className={styles.productThumb}
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            item.thumbnail?.thumbnailUrl ||
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="%23f1f5f9"><rect width="48" height="48" rx="6" fill="%23e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="%2394a3b8">📦</text></svg>';
                        }}
                      />
                    </td>
                    <td>
                      <Link href={`/products/${item._id}/edit`} className={styles.productName}>
                        {item.name}
                      </Link>
                      <div className={styles.productSku}>/{item.slug}</div>
                    </td>
                    <td>
                      {item.sku ? (
                        <code style={{ fontSize: '0.8rem', background: 'var(--color-gray-100)', padding: '2px 6px', borderRadius: '4px' }}>
                          {item.sku}
                        </code>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>—</span>
                      )}
                    </td>
                    <td>
                      <div className={styles.categoryBadges}>
                        {item.categories && item.categories.length > 0 ? (
                          item.categories.map((c) => (
                            <Badge key={c._id} variant="info" withDot={false}>
                              {c.name}
                            </Badge>
                          ))
                        ) : (
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Chưa phân loại</span>
                        )}
                      </div>
                    </td>
                    <td className={styles.priceCol}>{formatPrice(item.price)}</td>
                    <td>
                      {item.status === 'active' && <Badge variant="success">Hoạt động</Badge>}
                      {item.status === 'draft' && <Badge variant="warning">Bản nháp</Badge>}
                      {item.status === 'archived' && <Badge variant="neutral">Đã lưu trữ</Badge>}
                    </td>
                    <td>
                      <div className={styles.actionCell}>
                        <Link
                          href={`/products/${item._id}/edit`}
                          className={styles.actionBtn}
                          title="Chỉnh sửa sản phẩm"
                          aria-label="Chỉnh sửa"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                          </svg>
                        </Link>

                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleDuplicate(item)}
                          disabled={isDuplicating === item._id}
                          title="Nhân bản sản phẩm"
                          aria-label="Nhân bản"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                        </button>

                        <button
                          type="button"
                          className={styles.actionBtn}
                          onClick={() => handleToggleArchive(item)}
                          title={item.status === 'archived' ? 'Khôi phục về bản nháp' : 'Lưu trữ sản phẩm'}
                          aria-label={item.status === 'archived' ? 'Khôi phục' : 'Lưu trữ'}
                        >
                          {item.status === 'archived' ? (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="1 4 1 10 7 10" />
                              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
                            </svg>
                          ) : (
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <polyline points="21 8 21 21 3 21 3 8" />
                              <rect x="1" y="3" width="22" height="5" />
                              <line x1="10" y1="12" x2="14" y2="12" />
                            </svg>
                          )}
                        </button>

                        <button
                          type="button"
                          className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                          onClick={() => setDeleteTarget(item)}
                          title="Xóa vĩnh viễn"
                          aria-label="Xóa"
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6" />
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination Controls */}
            <div className={styles.pagination}>
              <div>
                Hiển thị <strong>{products.length}</strong> trên tổng số <strong>{totalCount}</strong> sản phẩm
              </div>
              <div className={styles.paginationButtons}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePageChange(page - 1)}
                  disabled={page <= 1}
                >
                  Trang trước
                </button>
                <span style={{ display: 'flex', alignItems: 'center', padding: '0 8px', fontSize: '0.875rem' }}>
                  Trang {page} / {totalPages}
                </span>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => handlePageChange(page + 1)}
                  disabled={page >= totalPages}
                >
                  Trang tiếp
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Confirm Permanent Delete Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          title="Xác nhận xóa vĩnh viễn sản phẩm"
          message={`Bạn có chắc chắn muốn xóa vĩnh viễn sản phẩm "${deleteTarget.name}"? Dữ liệu sản phẩm sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.`}
          confirmLabel="Xóa vĩnh viễn"
          cancelLabel="Hủy bỏ"
          isDangerous={true}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}
