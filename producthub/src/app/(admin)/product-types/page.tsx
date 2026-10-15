'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './product-types.module.css';
import { useToast } from '@/components/ui/Toast';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { slugify } from '@/core/utils/slug';

interface FieldItem {
  key: string;
  label: string;
  type: string;
  required: boolean;
  options: string; // Chuỗi phân cách dấu phẩy cho form
  isVariantAttr: boolean;
}

interface ProductTypeItem {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  fields: Array<{
    key: string;
    label: string;
    type: string;
    required: boolean;
    options?: string[];
  }>;
  variantAttributes: string[];
  productCount: number;
  status: 'active' | 'archived';
}

const FIELD_TYPES = [
  { value: 'text', label: 'Văn bản ngắn (Text)' },
  { value: 'textarea', label: 'Đoạn văn dài (Textarea)' },
  { value: 'number', label: 'Số (Number)' },
  { value: 'boolean', label: 'Đúng / Sai (Boolean)' },
  { value: 'date', label: 'Ngày tháng (Date)' },
  { value: 'single_select', label: 'Chọn 1 (Dropdown Select)' },
  { value: 'multi_select', label: 'Chọn nhiều (Multi-Select)' },
  { value: 'url', label: 'Đường dẫn liên kết (URL)' },
  { value: 'image_ref', label: 'Hình ảnh Google Drive (Image)' },
];

export default function ProductTypesPage() {
  const toast = useToast();

  const [types, setTypes] = useState<ProductTypeItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'archived'>('active');
  const [fields, setFields] = useState<FieldItem[]>([]);

  // Delete
  const [deleteTarget, setDeleteTarget] = useState<ProductTypeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Types
  const fetchTypes = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/product-types');
      const data = await res.json();
      if (data.success) {
        setTypes(data.data || []);
      }
    } catch {
      toast.error('Không thể tải danh sách loại sản phẩm.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTypes();
  }, [fetchTypes]);

  // Open Create
  const handleOpenCreate = () => {
    setModalMode('create');
    setEditingId(null);
    setName('');
    setSlug('');
    setDescription('');
    setStatus('active');
    setFields([
      { key: 'material', label: 'Chất liệu', type: 'text', required: false, options: '', isVariantAttr: false },
    ]);
    setIsModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (t: ProductTypeItem) => {
    setModalMode('edit');
    setEditingId(t._id);
    setName(t.name);
    setSlug(t.slug);
    setDescription(t.description || '');
    setStatus(t.status);
    const convertedFields: FieldItem[] = (t.fields || []).map((f) => ({
      key: f.key,
      label: f.label,
      type: f.type,
      required: f.required,
      options: (f.options || []).join(', '),
      isVariantAttr: (t.variantAttributes || []).includes(f.key),
    }));
    setFields(convertedFields);
    setIsModalOpen(true);
  };

  // Add field to builder
  const handleAddField = () => {
    const newIndex = fields.length + 1;
    setFields([
      ...fields,
      {
        key: `field_${newIndex}`,
        label: `Trường mới ${newIndex}`,
        type: 'text',
        required: false,
        options: '',
        isVariantAttr: false,
      },
    ]);
  };

  // Remove field
  const handleRemoveField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  // Update field property
  const handleUpdateField = (index: number, prop: keyof FieldItem, val: any) => {
    const updated = [...fields];
    updated[index] = { ...updated[index], [prop]: val };
    // Auto slugify key if changing label in create mode
    if (prop === 'label' && modalMode === 'create' && updated[index].key.startsWith('field_')) {
      const generatedKey = slugify(val).replace(/-/g, '_');
      if (generatedKey) {
        updated[index].key = generatedKey;
      }
    }
    setFields(updated);
  };

  // Submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Vui lòng nhập tên loại sản phẩm.');
      return;
    }

    // Format fields & variantAttributes
    const variantAttributes: string[] = [];
    const formattedFields = fields.map((f, idx) => {
      const cleanKey = f.key.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_');
      if (f.isVariantAttr) {
        variantAttributes.push(cleanKey);
      }
      const optionsArr = f.options
        ? f.options.split(',').map((o) => o.trim()).filter(Boolean)
        : [];

      return {
        key: cleanKey,
        label: f.label.trim(),
        type: f.type,
        required: f.required,
        options: optionsArr,
        order: idx,
      };
    });

    try {
      setSubmitting(true);
      const payload: any = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        description: description.trim() || null,
        status,
        fields: formattedFields,
        variantAttributes,
      };

      const url =
        modalMode === 'create'
          ? '/api/v1/product-types'
          : `/api/v1/product-types/${editingId}`;
      const method = modalMode === 'create' ? 'POST' : 'PUT';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(
          modalMode === 'create'
            ? 'Đã tạo loại sản phẩm mới thành công!'
            : 'Đã cập nhật cấu hình loại sản phẩm!'
        );
        setIsModalOpen(false);
        fetchTypes();
      } else {
        toast.error(data.error?.message || 'Có lỗi xảy ra.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/v1/product-types/${deleteTarget._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã xóa loại sản phẩm "${deleteTarget.name}".`);
        setDeleteTarget(null);
        fetchTypes();
      } else {
        toast.error(data.error?.message || 'Không thể xóa loại sản phẩm.');
      }
    } catch {
      toast.error('Lỗi khi xóa loại sản phẩm.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Loại sản phẩm & Thuộc tính động</h1>
          <p className="page-description">
            Định nghĩa cấu trúc schema và các trường thông tin đặc thù (VD: Điện thoại, Quần áo, Đồng hồ).
          </p>
        </div>
        <div>
          <button type="button" className="btn btn-primary" onClick={handleOpenCreate}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Tạo loại sản phẩm mới
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
          </div>
        ) : types.length === 0 ? (
          <EmptyState
            type="no_data"
            title="Chưa có loại sản phẩm nào"
            description="Tạo loại sản phẩm để định nghĩa các trường dữ liệu động và thuộc tính biến thể riêng biệt."
            actionLabel="Tạo loại sản phẩm ngay"
            onAction={handleOpenCreate}
          />
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tên loại sản phẩm</th>
                <th>Số trường dữ liệu</th>
                <th>Thuộc tính tạo biến thể</th>
                <th>Số sản phẩm áp dụng</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {types.map((item) => (
                <tr key={item._id}>
                  <td>
                    <div className={styles.typeName}>{item.name}</div>
                    <div className={styles.typeSlug}>/{item.slug}</div>
                  </td>
                  <td>
                    <Badge variant="info" withDot={false}>
                      {item.fields?.length || 0} trường
                    </Badge>
                  </td>
                  <td>
                    <div className={styles.badgeList}>
                      {item.variantAttributes && item.variantAttributes.length > 0 ? (
                        item.variantAttributes.map((va) => (
                          <span
                            key={va}
                            style={{
                              fontSize: '0.75rem',
                              background: 'var(--color-primary-light)',
                              color: 'var(--color-primary-dark)',
                              padding: '2px 8px',
                              borderRadius: '4px',
                              fontWeight: 500,
                            }}
                          >
                            {va}
                          </span>
                        ))
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>Không có</span>
                      )}
                    </div>
                  </td>
                  <td>{item.productCount || 0} sản phẩm</td>
                  <td>
                    {item.status === 'active' ? (
                      <Badge variant="success" withDot={false}>Hoạt động</Badge>
                    ) : (
                      <Badge variant="neutral" withDot={false}>Lưu trữ</Badge>
                    )}
                  </td>
                  <td>
                    <div className={styles.actionCell}>
                      <button
                        type="button"
                        className={styles.actionBtn}
                        onClick={() => handleOpenEdit(item)}
                        title="Chỉnh sửa cấu trúc trường"
                      >
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                      </button>

                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                        onClick={() => setDeleteTarget(item)}
                        title="Xóa loại sản phẩm"
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
        )}
      </div>

      {/* Modal Thêm / Sửa Loại sản phẩm */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Tạo loại sản phẩm mới' : 'Chỉnh sửa loại sản phẩm'}
        maxWidth="780px"
      >
        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label required" htmlFor="pt-name">
                Tên loại sản phẩm
              </label>
              <input
                id="pt-name"
                type="text"
                className="form-input"
                placeholder="VD: Điện thoại di động, Thời trang nam..."
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (modalMode === 'create') setSlug(slugify(e.target.value));
                }}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="pt-slug">
                Slug nhận diện
              </label>
              <input
                id="pt-slug"
                type="text"
                className="form-input"
                placeholder="dien-thoai-di-dong"
                value={slug}
                onChange={(e) => setSlug(slugify(e.target.value))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pt-desc">
              Mô tả loại sản phẩm
            </label>
            <textarea
              id="pt-desc"
              className="form-textarea"
              rows={2}
              placeholder="Ghi chú về mục đích sử dụng của loại sản phẩm này..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          {/* Field Builder */}
          <div className={styles.fieldBuilder}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <div>
                <strong style={{ fontSize: '0.875rem' }}>Các trường dữ liệu tùy chỉnh ({fields.length})</strong>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Định nghĩa các trường bổ sung xuất hiện trong biểu mẫu nhập sản phẩm.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleAddField}
              >
                + Thêm trường mới
              </button>
            </div>

            {fields.map((field, idx) => (
              <div key={idx} className={styles.fieldItem}>
                <div className={styles.fieldItemHeader}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>#{idx + 1} — {field.label || 'Chưa đặt tên'}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveField(idx)}
                    style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '0.8rem' }}
                  >
                    Gỡ bỏ
                  </button>
                </div>

                <div className={styles.fieldGrid}>
                  <div>
                    <label className="form-label required" style={{ fontSize: '0.75rem' }}>
                      Tên trường hiển thị
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: Dung lượng RAM"
                      value={field.label}
                      onChange={(e) => handleUpdateField(idx, 'label', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label required" style={{ fontSize: '0.75rem' }}>
                      Mã trường (Key - Slug-safe)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="ram_size"
                      value={field.key}
                      onChange={(e) => handleUpdateField(idx, 'key', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>
                      Kiểu dữ liệu
                    </label>
                    <select
                      className="form-select"
                      value={field.type}
                      onChange={(e) => handleUpdateField(idx, 'type', e.target.value)}
                    >
                      {FIELD_TYPES.map((ft) => (
                        <option key={ft.value} value={ft.value}>
                          {ft.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Nếu kiểu là select -> nhập options */}
                {(field.type === 'single_select' || field.type === 'multi_select') && (
                  <div style={{ marginTop: '8px' }}>
                    <label className="form-label required" style={{ fontSize: '0.75rem' }}>
                      Các tùy chọn (Phân cách bằng dấu phẩy)
                    </label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="VD: 128GB, 256GB, 512GB, 1TB"
                      value={field.options}
                      onChange={(e) => handleUpdateField(idx, 'options', e.target.value)}
                      required
                    />
                  </div>
                )}

                <div style={{ display: 'flex', gap: '20px', marginTop: '10px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={field.required}
                      onChange={(e) => handleUpdateField(idx, 'required', e.target.checked)}
                    />
                    Bắt buộc nhập
                  </label>

                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer', color: 'var(--color-primary-dark)' }}>
                    <input
                      type="checkbox"
                      checked={field.isVariantAttr}
                      onChange={(e) => handleUpdateField(idx, 'isVariantAttr', e.target.checked)}
                    />
                    Thuộc tính tạo biến thể (Variant)
                  </label>
                </div>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
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
              {!submitting && (modalMode === 'create' ? 'Tạo loại sản phẩm' : 'Lưu thay đổi')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirm Delete */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          title="Xác nhận xóa loại sản phẩm"
          message={`Bạn có chắc chắn muốn xóa loại sản phẩm "${deleteTarget.name}"? Hệ thống sẽ ngăn chặn việc xóa nếu đang có sản phẩm thuộc loại này.`}
          confirmLabel="Xóa ngay"
          cancelLabel="Hủy bỏ"
          isDangerous={true}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}
