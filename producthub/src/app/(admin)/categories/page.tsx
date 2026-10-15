'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './categories.module.css';
import { useToast } from '@/components/ui/Toast';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { MediaSelectModal, SelectedMediaItem } from '@/components/media/MediaSelectModal';
import { slugify } from '@/core/utils/slug';

interface CategoryNode {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string | null;
  order: number;
  status: 'active' | 'inactive';
  image?: {
    _id: string;
    fileName: string;
    thumbnailUrl?: string;
  };
  productCount: number;
  children: CategoryNode[];
}

interface FlatCategory {
  _id: string;
  name: string;
  displayName: string;
  level: number;
}

export default function CategoriesPage() {
  const toast = useToast();

  const [treeData, setTreeData] = useState<CategoryNode[]>([]);
  const [flatCategories, setFlatCategories] = useState<FlatCategory[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded nodes
  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({});

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form fields
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [order, setOrder] = useState<number>(0);
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [selectedImage, setSelectedImage] = useState<SelectedMediaItem | null>(null);

  // Media selector modal
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<CategoryNode | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Fetch Tree & Flat categories
  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const [treeRes, flatRes] = await Promise.all([
        fetch('/api/v1/categories?tree=true'),
        fetch('/api/v1/categories'),
      ]);
      const treeJson = await treeRes.json();
      const flatJson = await flatRes.json();

      if (treeJson.success) {
        setTreeData(treeJson.data || []);
        // Mặc định mở rộng tất cả các root
        const expMap: Record<string, boolean> = {};
        treeJson.data.forEach((r: CategoryNode) => {
          expMap[r._id] = true;
        });
        setExpandedIds((prev) => ({ ...expMap, ...prev }));
      }
      if (flatJson.success) {
        setFlatCategories(flatJson.data || []);
      }
    } catch {
      toast.error('Không thể tải danh sách danh mục.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Toggle node expansion
  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Open Create
  const handleOpenCreate = (targetParentId?: string) => {
    setModalMode('create');
    setEditingId(null);
    setName('');
    setSlug('');
    setParentId(targetParentId || '');
    setDescription('');
    setOrder(0);
    setStatus('active');
    setSelectedImage(null);
    setIsModalOpen(true);
  };

  // Open Edit
  const handleOpenEdit = (node: CategoryNode) => {
    setModalMode('edit');
    setEditingId(node._id);
    setName(node.name);
    setSlug(node.slug);
    setParentId(node.parentId || '');
    setDescription(node.description || '');
    setOrder(node.order || 0);
    setStatus(node.status);
    setSelectedImage(
      node.image
        ? {
            _id: node.image._id,
            fileName: node.image.fileName,
            thumbnailUrl: node.image.thumbnailUrl,
          }
        : null
    );
    setIsModalOpen(true);
  };

  // Submit Form
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Vui lòng nhập tên danh mục.');
      return;
    }

    try {
      setSubmitting(true);
      const payload = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        parentId: parentId || null,
        description: description.trim() || null,
        order: Number(order) || 0,
        status,
        image: selectedImage ? selectedImage._id : null,
      };

      const url =
        modalMode === 'create'
          ? '/api/v1/categories'
          : `/api/v1/categories/${editingId}`;
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
            ? 'Đã thêm danh mục mới thành công!'
            : 'Đã cập nhật danh mục thành công!'
        );
        setIsModalOpen(false);
        fetchData();
      } else {
        toast.error(data.error?.message || 'Có lỗi xảy ra.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  // Confirm Delete
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/v1/categories/${deleteTarget._id}`, {
        method: 'DELETE',
      });
      const data = await res.json();

      if (data.success) {
        toast.success(`Đã xóa danh mục "${deleteTarget.name}".`);
        setDeleteTarget(null);
        fetchData();
      } else {
        toast.error(data.error?.message || 'Không thể xóa danh mục.');
      }
    } catch {
      toast.error('Lỗi khi xóa danh mục.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Render Category Node Recursive
  const renderNode = (node: CategoryNode, depth = 0) => {
    const hasChildren = node.children && node.children.length > 0;
    const isExpanded = expandedIds[node._id];

    return (
      <React.Fragment key={node._id}>
        <li className={styles.nodeItem}>
          <div className={styles.nodeRow} style={{ paddingLeft: `${24 + depth * 28}px` }}>
            <div className={styles.nodeLeft}>
              {hasChildren ? (
                <button
                  type="button"
                  className={styles.expandBtn}
                  onClick={() => toggleExpand(node._id)}
                  aria-label={isExpanded ? 'Thu gọn' : 'Mở rộng'}
                >
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    style={{
                      transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                      transition: 'transform 0.15s ease',
                    }}
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ) : (
                <span style={{ width: '24px' }} />
              )}

              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={node.image ? `/api/v1/media/${node.image._id}/view` : '/default-category.svg'}
                alt={node.name}
                className={styles.categoryImg}
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    node.image?.thumbnailUrl ||
                    'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="38" height="38" fill="%23f1f5f9"><rect width="38" height="38" rx="6" fill="%23e2e8f0"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-size="16" fill="%2394a3b8">📁</text></svg>';
                }}
              />

              <div>
                <div className={styles.categoryName}>
                  {node.name}
                  {node.status === 'active' ? (
                    <Badge variant="success" withDot={false}>Hoạt động</Badge>
                  ) : (
                    <Badge variant="neutral" withDot={false}>Ẩn</Badge>
                  )}
                </div>
                <div className={styles.categorySlug}>/{node.slug}</div>
              </div>
            </div>

            <div className={styles.nodeRight}>
              <Badge variant="info" withDot={false}>
                {node.productCount} sản phẩm
              </Badge>

              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => handleOpenCreate(node._id)}
                title="Thêm danh mục con"
                aria-label="Thêm danh mục con"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </button>

              <button
                type="button"
                className={styles.actionBtn}
                onClick={() => handleOpenEdit(node)}
                title="Chỉnh sửa danh mục"
                aria-label="Chỉnh sửa"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>

              <button
                type="button"
                className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                onClick={() => setDeleteTarget(node)}
                title="Xóa danh mục"
                aria-label="Xóa"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </div>
          </div>
        </li>

        {hasChildren && isExpanded && node.children.map((child) => renderNode(child, depth + 1))}
      </React.Fragment>
    );
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Cây danh mục sản phẩm</h1>
          <p className="page-description">
            Tổ chức phân cấp sản phẩm theo danh mục cha - con không giới hạn cấp độ.
          </p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className="btn btn-primary" onClick={() => handleOpenCreate()}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Thêm danh mục gốc
          </button>
        </div>
      </div>

      {/* Tree Card */}
      <div className={styles.treeContainer}>
        <div className={styles.treeHeader}>
          <span>Tên danh mục & Cấu trúc phân cấp</span>
          <span>Thao tác & Thống kê</span>
        </div>

        {loading ? (
          <div style={{ padding: '24px' }}>
            <Skeleton height="48px" width="100%" />
            <div style={{ marginTop: '12px' }}>
              <Skeleton height="48px" width="100%" />
            </div>
            <div style={{ marginTop: '12px' }}>
              <Skeleton height="48px" width="100%" />
            </div>
          </div>
        ) : treeData.length === 0 ? (
          <EmptyState
            type="no_data"
            title="Chưa có danh mục nào"
            description="Bắt đầu tạo danh mục đầu tiên để phân loại sản phẩm trong kho của bạn."
            actionLabel="Tạo danh mục ngay"
            onAction={() => handleOpenCreate()}
          />
        ) : (
          <ul className={styles.treeList}>
            {treeData.map((rootNode) => renderNode(rootNode, 0))}
          </ul>
        )}
      </div>

      {/* Modal Thêm / Sửa Danh mục */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Thêm mới danh mục' : 'Chỉnh sửa danh mục'}
        maxWidth="580px"
      >
        <form onSubmit={handleSubmit} className={styles.formGrid}>
          <div className="form-group">
            <label className="form-label required" htmlFor="cat-name">
              Tên danh mục
            </label>
            <input
              id="cat-name"
              type="text"
              className="form-input"
              placeholder="VD: Điện thoại & Thiết bị di động"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (modalMode === 'create') {
                  setSlug(slugify(e.target.value));
                }
              }}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cat-slug">
              Đường dẫn tĩnh (Slug)
            </label>
            <input
              id="cat-slug"
              type="text"
              className="form-input"
              placeholder="dien-thoai-di-dong"
              value={slug}
              onChange={(e) => setSlug(slugify(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cat-parent">
              Danh mục cha
            </label>
            <select
              id="cat-parent"
              className="form-select"
              value={parentId}
              onChange={(e) => setParentId(e.target.value)}
            >
              <option value="">(Không có — Danh mục gốc cao nhất)</option>
              {flatCategories
                .filter((c) => c._id !== editingId)
                .map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.displayName}
                  </option>
                ))}
            </select>
          </div>

          {/* Chọn ảnh từ Media Library */}
          <div className="form-group">
            <label className="form-label">Ảnh đại diện danh mục</label>
            <div className={styles.imagePicker}>
              {selectedImage ? (
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/v1/media/${selectedImage._id}/view`}
                    alt={selectedImage.fileName}
                    className={styles.pickerImg}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {selectedImage.fileName}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setIsMediaModalOpen(true)}
                      >
                        Đổi ảnh
                      </button>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setSelectedImage(null)}
                      >
                        Gỡ ảnh
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                  <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                    Chưa chọn ảnh đại diện cho danh mục.
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setIsMediaModalOpen(true)}
                  >
                    Chọn từ Thư viện Media
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="cat-desc">
              Mô tả danh mục
            </label>
            <textarea
              id="cat-desc"
              className="form-textarea"
              rows={2}
              placeholder="Mô tả tóm tắt về loại sản phẩm này..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="cat-order">
                Thứ tự sắp xếp
              </label>
              <input
                id="cat-order"
                type="number"
                className="form-input"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="cat-status">
                Trạng thái hiển thị
              </label>
              <select
                id="cat-status"
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as 'active' | 'inactive')}
              >
                <option value="active">Hiển thị (Hoạt động)</option>
                <option value="inactive">Ẩn (Không hoạt động)</option>
              </select>
            </div>
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
              {!submitting && (modalMode === 'create' ? 'Tạo danh mục' : 'Lưu thay đổi')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Media Select Modal */}
      <MediaSelectModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        mode="single"
        initialSelectedIds={selectedImage ? [selectedImage._id] : []}
        title="Chọn ảnh đại diện danh mục từ Google Drive"
        onSelect={(selected) => {
          if (selected[0]) {
            setSelectedImage(selected[0]);
          }
        }}
      />

      {/* Confirm Delete Dialog */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          title="Xác nhận xóa danh mục"
          message={`Bạn có chắc chắn muốn xóa danh mục "${deleteTarget.name}"? Hệ thống sẽ kiểm tra xem danh mục có nhánh con hoặc sản phẩm nào không trước khi xóa.`}
          confirmLabel="Xóa ngay"
          cancelLabel="Hủy bỏ"
          isDangerous={true}
          isLoading={isDeleting}
        />
      )}
    </div>
  );
}
