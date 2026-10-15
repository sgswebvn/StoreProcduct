'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './VariantManager.module.css';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { useToast } from '@/components/ui/Toast';
import { MediaSelectModal, SelectedMediaItem } from '@/components/media/MediaSelectModal';

export interface VariantItem {
  _id: string;
  productId: string;
  name: string;
  sku?: string;
  price?: number;
  originalPrice?: number;
  thumbnail?: {
    _id: string;
    fileName: string;
    thumbnailUrl?: string;
  };
  attributes: Array<{ key: string; value: string | number }>;
  status: 'active' | 'inactive';
  dataVersion: number;
}

export interface FieldDef {
  key: string;
  label: string;
  type: string;
  options?: string[];
}

interface VariantManagerProps {
  productId?: string;
  variantAttributeKeys: string[];
  fields: FieldDef[];
}

export function VariantManager({
  productId,
  variantAttributeKeys,
  fields,
}: VariantManagerProps) {
  const toast = useToast();

  const [variants, setVariants] = useState<VariantItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [vName, setVName] = useState('');
  const [vSku, setVSku] = useState('');
  const [vPrice, setVPrice] = useState<number>(0);
  const [vOriginalPrice, setVOriginalPrice] = useState<number>(0);
  const [vStatus, setVStatus] = useState<'active' | 'inactive'>('active');
  const [vThumbnail, setVThumbnail] = useState<SelectedMediaItem | null>(null);
  const [vAttributes, setVAttributes] = useState<Record<string, string>>({});
  const [vDataVersion, setVDataVersion] = useState<number>(1);

  // Media Modal
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<VariantItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Variants
  const fetchVariants = useCallback(async () => {
    if (!productId) return;
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/products/${productId}/variants`);
      const data = await res.json();
      if (data.success) {
        setVariants(data.data || []);
      }
    } catch {
      toast.error('Không thể tải danh sách biến thể.');
    } finally {
      setLoading(false);
    }
  }, [productId, toast]);

  useEffect(() => {
    fetchVariants();
  }, [fetchVariants]);

  if (!productId) {
    return (
      <div style={{ padding: '16px', background: 'var(--color-gray-50)', borderRadius: '8px', border: '1px dashed var(--border-color)', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
        ℹ️ Vui lòng lưu sản phẩm trước khi quản lý các biến thể sản phẩm.
      </div>
    );
  }

  // Get field definition by key
  const getField = (k: string) => fields.find((f) => f.key.toLowerCase() === k.toLowerCase());

  // Auto suggest variant name
  const handleAttrChange = (key: string, val: string) => {
    const updated = { ...vAttributes, [key]: val };
    setVAttributes(updated);
    if (modalMode === 'create') {
      const parts = variantAttributeKeys.map((k) => updated[k]).filter(Boolean);
      if (parts.length > 0) {
        setVName(parts.join(' - '));
      }
    }
  };

  // Open Create
  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingId(null);
    setVName('');
    setVSku('');
    setVPrice(0);
    setVOriginalPrice(0);
    setVStatus('active');
    setVThumbnail(null);
    setVAttributes({});
    setVDataVersion(1);
    setIsModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (v: VariantItem) => {
    setModalMode('edit');
    setEditingId(v._id);
    setVName(v.name);
    setVSku(v.sku || '');
    setVPrice(v.price || 0);
    setVOriginalPrice(v.originalPrice || 0);
    setVStatus(v.status);
    setVThumbnail(v.thumbnail ? { _id: v.thumbnail._id, fileName: v.thumbnail.fileName, thumbnailUrl: v.thumbnail.thumbnailUrl } : null);
    const attrMap: Record<string, string> = {};
    (v.attributes || []).forEach((a) => {
      attrMap[a.key] = String(a.value);
    });
    setVAttributes(attrMap);
    setVDataVersion(v.dataVersion || 1);
    setIsModalOpen(true);
  };

  // Submit Variant Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vName.trim()) {
      toast.warning('Vui lòng nhập tên biến thể.');
      return;
    }

    // Kiểm tra đã chọn đủ các thuộc tính cấu thành biến thể chưa
    for (const k of variantAttributeKeys) {
      if (!vAttributes[k]) {
        const field = getField(k);
        toast.warning(`Vui lòng chọn giá trị cho thuộc tính "${field ? field.label : k}".`);
        return;
      }
    }

    try {
      setSubmitting(true);
      const attrArray = Object.entries(vAttributes).map(([key, value]) => ({ key, value }));

      const payload: any = {
        name: vName.trim(),
        sku: vSku.trim() || null,
        price: Number(vPrice) || 0,
        originalPrice: Number(vOriginalPrice) || 0,
        status: vStatus,
        thumbnail: vThumbnail ? vThumbnail._id : null,
        attributes: attrArray,
      };

      if (modalMode === 'edit') {
        payload.dataVersion = vDataVersion;
      }

      const url =
        modalMode === 'create'
          ? `/api/v1/products/${productId}/variants`
          : `/api/v1/products/${productId}/variants/${editingId}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          modalMode === 'create' ? 'Đã thêm biến thể mới!' : 'Đã cập nhật biến thể!'
        );
        setIsModalOpen(false);
        fetchVariants();
      } else {
        toast.error(data.error?.message || 'Có lỗi xảy ra.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Variant
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/v1/products/${productId}/variants/${deleteTarget._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa biến thể "${deleteTarget.name}"!`);
        setDeleteTarget(null);
        fetchVariants();
      } else {
        toast.error(data.error?.message || 'Không thể xóa biến thể.');
      }
    } catch {
      toast.error('Lỗi khi xóa biến thể.');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatPrice = (val?: number) => {
    if (!val || val === 0) return '—';
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div className={styles.title}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
          Danh sách Biến thể sản phẩm ({variants.length})
        </div>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={handleOpenCreate}
        >
          + Thêm biến thể mới
        </button>
      </div>

      {loading ? (
        <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
          Đang tải danh sách biến thể...
        </div>
      ) : variants.length === 0 ? (
        <div style={{ padding: '24px', textAlign: 'center', background: 'var(--color-gray-50)', borderRadius: '8px', border: '1px dashed var(--border-color)' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            Sản phẩm chưa có biến thể nào. Các biến thể cho phép bạn cấu hình các tổ hợp như Màu sắc, Dung lượng, Kích thước với SKU và giá riêng biệt.
          </p>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            style={{ marginTop: '12px' }}
            onClick={handleOpenCreate}
          >
            Tạo biến thể đầu tiên
          </button>
        </div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th style={{ width: '48px' }}>Ảnh</th>
                <th>Tên biến thể</th>
                <th>Mã SKU</th>
                <th>Tổ hợp thuộc tính</th>
                <th>Giá bán</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {variants.map((v) => (
                <tr key={v._id}>
                  <td>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={v.thumbnail ? `/api/v1/media/${v.thumbnail._id}/view` : '/default-product.svg'}
                      alt={v.name}
                      className={styles.variantThumb}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          v.thumbnail?.thumbnailUrl ||
                          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" fill="%23f1f5f9"><rect width="36" height="36" rx="4" fill="%23e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="12" fill="%2394a3b8">📦</text></svg>';
                      }}
                    />
                  </td>
                  <td style={{ fontWeight: 500 }}>{v.name}</td>
                  <td>
                    {v.sku ? (
                      <code style={{ fontSize: '0.8rem', background: 'var(--color-gray-100)', padding: '2px 6px', borderRadius: '4px' }}>
                        {v.sku}
                      </code>
                    ) : (
                      '—'
                    )}
                  </td>
                  <td>
                    <div className={styles.attrBadges}>
                      {v.attributes.map((a) => {
                        const f = getField(a.key);
                        return (
                          <span key={a.key} className={styles.attrBadge}>
                            <strong>{f ? f.label : a.key}:</strong> {String(a.value)}
                          </span>
                        );
                      })}
                    </div>
                  </td>
                  <td style={{ fontWeight: 600 }}>{formatPrice(v.price)}</td>
                  <td>
                    {v.status === 'active' ? (
                      <Badge variant="success" withDot={false}>Hoạt động</Badge>
                    ) : (
                      <Badge variant="neutral" withDot={false}>Ẩn</Badge>
                    )}
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      type="button"
                      className={styles.actionBtn}
                      onClick={() => handleOpenEdit(v)}
                      title="Chỉnh sửa biến thể"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                      onClick={() => setDeleteTarget(v)}
                      title="Xóa biến thể"
                    >
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Thêm / Sửa Biến thể */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Thêm mới biến thể sản phẩm' : 'Chỉnh sửa biến thể'}
        maxWidth="600px"
      >
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          {/* Thuộc tính cấu thành biến thể */}
          <div style={{ background: 'var(--color-gray-50)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '8px' }}>
              Tổ hợp giá trị thuộc tính (Bắt buộc)
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px' }}>
              {variantAttributeKeys.map((k) => {
                const field = getField(k);
                const currentVal = vAttributes[k] || '';
                const options = field?.options || [];

                return (
                  <div key={k} className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label required" htmlFor={`va-${k}`}>
                      {field ? field.label : k}
                    </label>
                    {options.length > 0 ? (
                      <select
                        id={`va-${k}`}
                        className="form-select"
                        value={currentVal}
                        onChange={(e) => handleAttrChange(k, e.target.value)}
                        required
                      >
                        <option value="">-- Chọn {field?.label || k} --</option>
                        {options.map((opt) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        id={`va-${k}`}
                        type="text"
                        className="form-input"
                        placeholder={`Nhập ${field?.label || k}...`}
                        value={currentVal}
                        onChange={(e) => handleAttrChange(k, e.target.value)}
                        required
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label required" htmlFor="v-name">
              Tên biến thể
            </label>
            <input
              id="v-name"
              type="text"
              className="form-input"
              placeholder="VD: Titan Xanh - 256GB"
              value={vName}
              onChange={(e) => setVName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="v-sku">
                Mã SKU riêng biến thể
              </label>
              <input
                id="v-sku"
                type="text"
                className="form-input"
                placeholder="IP15PM-BLUE-256"
                value={vSku}
                onChange={(e) => setVSku(e.target.value.toUpperCase())}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="v-status">
                Trạng thái
              </label>
              <select
                id="v-status"
                className="form-select"
                value={vStatus}
                onChange={(e) => setVStatus(e.target.value as any)}
              >
                <option value="active">Hoạt động</option>
                <option value="inactive">Ẩn</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="v-price">
                Giá bán biến thể (VND)
              </label>
              <input
                id="v-price"
                type="number"
                className="form-input"
                min="0"
                step="1000"
                value={vPrice}
                onChange={(e) => setVPrice(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="v-orig-price">
                Giá niêm yết (VND)
              </label>
              <input
                id="v-orig-price"
                type="number"
                className="form-input"
                min="0"
                step="1000"
                value={vOriginalPrice}
                onChange={(e) => setVOriginalPrice(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Ảnh riêng của biến thể */}
          <div className="form-group">
            <label className="form-label">Ảnh riêng của biến thể (Google Drive)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px', border: '1px dashed var(--border-color)', borderRadius: '6px' }}>
              {vThumbnail ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/v1/media/${vThumbnail._id}/view`}
                    alt={vThumbnail.fileName}
                    style={{ width: '48px', height: '48px', borderRadius: '4px', objectFit: 'cover' }}
                  />
                  <div style={{ flex: 1, minWidth: 0, fontSize: '0.875rem' }}>
                    <div style={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>{vThumbnail.fileName}</div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: '4px' }}
                      onClick={() => setVThumbnail(null)}
                    >
                      Gỡ ảnh
                    </button>
                  </div>
                </>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsMediaModalOpen(true)}
                >
                  Chọn ảnh từ Thư viện Media
                </button>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '12px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={submitting}
            >
              Hủy
            </button>
            <button
              type="submit"
              className={`btn btn-primary ${submitting ? 'btn-loading' : ''}`}
              disabled={submitting}
            >
              {!submitting && (modalMode === 'create' ? 'Tạo biến thể' : 'Lưu biến thể')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Media Select Modal cho biến thể */}
      <MediaSelectModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        mode="single"
        title="Chọn ảnh biến thể từ Google Drive"
        onSelect={(selected) => {
          if (selected[0]) {
            setVThumbnail(selected[0]);
          }
        }}
      />

      {/* Confirm Delete Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          title="Xác nhận xóa biến thể"
          message={`Bạn có chắc chắn muốn xóa biến thể "${deleteTarget.name}"? Thao tác này không thể hoàn tác.`}
          confirmLabel="Xóa ngay"
          cancelLabel="Hủy bỏ"
          isDangerous={true}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}
