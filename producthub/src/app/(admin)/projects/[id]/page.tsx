'use client';

import React, { useState, useEffect, use } from 'react';
import Link from 'next/link';
import styles from './project-detail.module.css';
import { useToast } from '@/components/ui/Toast';

interface AssignedProduct {
  _id: string;
  overrideId: string;
  name: string;
  originalName: string;
  slug: string;
  sku?: string;
  price: number;
  originalPrice?: number;
  basePrice: number;
  shortDescription?: string;
  siteStatus: 'published' | 'hidden';
  originalStatus: string;
  thumbnail?: any;
  hasOverride: boolean;
}

interface ProjectDetail {
  _id: string;
  name: string;
  code: string;
  domain?: string;
  description?: string;
  status: 'active' | 'inactive';
  fieldVisibility: {
    sku?: boolean;
    originalPrice?: boolean;
    shortDescription?: boolean;
    attributes?: boolean;
    tags?: boolean;
  };
}

export default function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [products, setProducts] = useState<AssignedProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'products' | 'visibility' | 'general'>('products');

  // Modal gán sản phẩm
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [catalogProducts, setCatalogProducts] = useState<any[]>([]);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Form states cho Tab General
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  // Form states cho Tab Field Visibility
  const [visibility, setVisibility] = useState({
    sku: true,
    originalPrice: true,
    shortDescription: true,
    attributes: true,
    tags: true,
  });

  const toast = useToast();

  const fetchProjectData = async () => {
    try {
      setLoading(true);
      const [projRes, prodRes] = await Promise.all([
        fetch(`/api/v1/projects/${id}`),
        fetch(`/api/v1/projects/${id}/products`),
      ]);

      const projData = await projRes.json();
      const prodData = await prodRes.json();

      if (projData.success) {
        const p = projData.data;
        setProject(p);
        setName(p.name || '');
        setCode(p.code || '');
        setDomain(p.domain || '');
        setDescription(p.description || '');
        setStatus(p.status || 'active');
        if (p.fieldVisibility) {
          setVisibility({
            sku: p.fieldVisibility.sku !== false,
            originalPrice: p.fieldVisibility.originalPrice !== false,
            shortDescription: p.fieldVisibility.shortDescription !== false,
            attributes: p.fieldVisibility.attributes !== false,
            tags: p.fieldVisibility.tags !== false,
          });
        }
      } else {
        toast.error(projData.error?.message || 'Không tìm thấy thông tin dự án.');
      }

      if (prodData.success) {
        setProducts(prodData.data.items || []);
      }
    } catch {
      toast.error('Lỗi khi tải dữ liệu dự án.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjectData();
  }, [id]);

  // Lưu cấu hình chung
  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/v1/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, code, domain, description, status }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã cập nhật thông tin dự án!');
        setProject(data.data);
      } else {
        toast.error(data.error?.message || 'Không thể lưu dự án.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    }
  };

  // Lưu Field Visibility
  const handleSaveVisibility = async () => {
    try {
      const res = await fetch(`/api/v1/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fieldVisibility: visibility }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã lưu cấu hình hiển thị trường dữ liệu cho site này!');
        fetchProjectData();
      } else {
        toast.error(data.error?.message || 'Không thể lưu cấu hình.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    }
  };

  // Mở modal chọn sản phẩm từ catalog
  const openAssignModal = async () => {
    setIsAssignModalOpen(true);
    try {
      setCatalogLoading(true);
      const res = await fetch('/api/v1/products?limit=100');
      const data = await res.json();
      if (data.success) {
        setCatalogProducts(data.data.items || []);
      }
    } catch {
      toast.error('Không thể tải catalog sản phẩm.');
    } finally {
      setCatalogLoading(false);
    }
  };

  // Thực hiện gán sản phẩm vào site
  const handleAssignSubmit = async () => {
    if (selectedProductIds.length === 0) {
      toast.warning('Vui lòng chọn ít nhất 1 sản phẩm.');
      return;
    }

    try {
      const res = await fetch(`/api/v1/projects/${id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'assign', productIds: selectedProductIds }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã gán ${data.data.assignedCount} sản phẩm vào dự án.`);
        setIsAssignModalOpen(false);
        setSelectedProductIds([]);
        fetchProjectData();
      } else {
        toast.error(data.error?.message || 'Không thể gán sản phẩm.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    }
  };

  // Bỏ gán sản phẩm khỏi site
  const handleUnassignProduct = async (prodId: string, prodName: string) => {
    if (!confirm(`Bạn có chắc muốn gỡ sản phẩm "${prodName}" khỏi dự án này?`)) return;

    try {
      const res = await fetch(`/api/v1/projects/${id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'unassign', productIds: [prodId] }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã gỡ sản phẩm khỏi dự án.');
        setProducts((prev) => prev.filter((p) => p._id !== prodId));
      } else {
        toast.error(data.error?.message || 'Không thể gỡ sản phẩm.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    }
  };

  // Cập nhật Override cho sản phẩm
  const handleSaveOverride = async (
    prodId: string,
    customName: string,
    customPrice: string,
    siteStatus: 'published' | 'hidden'
  ) => {
    try {
      const parsedPrice = customPrice.trim() !== '' ? Number(customPrice) : undefined;
      const res = await fetch(`/api/v1/projects/${id}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'override',
          productId: prodId,
          customName: customName.trim() || undefined,
          customPrice: parsedPrice,
          siteStatus,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã lưu cấu hình riêng cho sản phẩm!');
        fetchProjectData();
      } else {
        toast.error(data.error?.message || 'Không thể lưu override.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    }
  };

  if (loading && !project) {
    return (
      <div className={styles.container}>
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          Đang tải thông tin dự án...
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className={styles.container}>
        <div className="alert alert-error">Không tìm thấy dự án yêu cầu.</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.topBar}>
        <Link href="/projects" className={styles.backLink}>
          ← Quay lại danh sách Dự án & Sites
        </Link>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>
              {project.name}
              <span className={styles.metaCode}>{project.code}</span>
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
              {project.domain ? `Website liên kết: https://${project.domain}` : 'Chưa thiết lập domain'}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs điều hướng */}
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'products' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('products')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          Sản phẩm & Giá riêng ({products.length})
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'visibility' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('visibility')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          Cấu hình hiển thị trường (Field Visibility)
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'general' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('general')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          Thông tin chung
        </button>
      </div>

      {/* Tab 1: Phân bổ sản phẩm & Ghi đè (Product Assignment & Overrides) */}
      {activeTab === 'products' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Sản phẩm phân bổ cho Site này</div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Tùy biến tên hiển thị, giá bán riêng biệt và trạng thái phát hành mà không ảnh hưởng tới dữ liệu sản phẩm gốc.
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={openAssignModal}>
              + Gán thêm sản phẩm
            </button>
          </div>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Sản phẩm gốc</th>
                  <th>Tên riêng cho site</th>
                  <th>Giá gốc</th>
                  <th>Giá riêng cho site (VND)</th>
                  <th>Trạng thái site</th>
                  <th style={{ textAlign: 'right' }}>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '40px 0' }}>
                      <div style={{ color: 'var(--text-secondary)', marginBottom: '8px' }}>
                        Chưa có sản phẩm nào được gán cho site này.
                      </div>
                      <button type="button" className="btn btn-secondary btn-sm" onClick={openAssignModal}>
                        Gán sản phẩm từ Catalog
                      </button>
                    </td>
                  </tr>
                ) : (
                  products.map((prod) => (
                    <ProductOverrideRow
                      key={prod._id}
                      product={prod}
                      onSave={handleSaveOverride}
                      onUnassign={handleUnassignProduct}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Field Visibility */}
      {activeTab === 'visibility' && (
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div>
              <div className={styles.cardTitle}>Cấu hình ẩn / hiện trường dữ liệu</div>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                Quyết định trường dữ liệu nào được phép trả về cho website/site vệ tinh này khi gọi API.
              </p>
            </div>
            <button type="button" className="btn btn-primary btn-sm" onClick={handleSaveVisibility}>
              Lưu cấu hình trường
            </button>
          </div>

          <div className={styles.visibilityGrid}>
            <label className={styles.visibilityItem}>
              <input
                type="checkbox"
                checked={visibility.sku}
                onChange={(e) => setVisibility({ ...visibility, sku: e.target.checked })}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>Mã SKU sản phẩm</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Cho phép site vệ tinh xem mã kho SKU
                </span>
              </div>
            </label>

            <label className={styles.visibilityItem}>
              <input
                type="checkbox"
                checked={visibility.originalPrice}
                onChange={(e) => setVisibility({ ...visibility, originalPrice: e.target.checked })}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>Giá niêm yết (Gốc)</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Hiển thị giá gạch/giá so sánh
                </span>
              </div>
            </label>

            <label className={styles.visibilityItem}>
              <input
                type="checkbox"
                checked={visibility.shortDescription}
                onChange={(e) => setVisibility({ ...visibility, shortDescription: e.target.checked })}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>Mô tả ngắn xem nhanh</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Tóm tắt tính năng sản phẩm
                </span>
              </div>
            </label>

            <label className={styles.visibilityItem}>
              <input
                type="checkbox"
                checked={visibility.attributes}
                onChange={(e) => setVisibility({ ...visibility, attributes: e.target.checked })}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>Thuộc tính động (Specs)</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Thông số kỹ thuật theo ProductType
                </span>
              </div>
            </label>

            <label className={styles.visibilityItem}>
              <input
                type="checkbox"
                checked={visibility.tags}
                onChange={(e) => setVisibility({ ...visibility, tags: e.target.checked })}
              />
              <div>
                <strong style={{ display: 'block', fontSize: '0.875rem' }}>Thẻ từ khóa (Tags)</strong>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  Gắn nhãn tìm kiếm sản phẩm
                </span>
              </div>
            </label>
          </div>
        </div>
      )}

      {/* Tab 3: Thông tin chung */}
      {activeTab === 'general' && (
        <div className={styles.card}>
          <form onSubmit={handleSaveGeneral}>
            <div className={styles.formGrid}>
              <div className="form-group">
                <label className="form-label" htmlFor="f-name">Tên dự án / website</label>
                <input
                  id="f-name"
                  type="text"
                  className="form-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="f-code">Mã định danh (Slug)</label>
                <input
                  id="f-code"
                  type="text"
                  className="form-input"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="f-domain">Tên miền liên kết (Domain)</label>
                <input
                  id="f-domain"
                  type="text"
                  className="form-input"
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="f-status">Trạng thái</label>
                <select
                  id="f-status"
                  className="form-select"
                  value={status}
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Tạm dừng</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="f-desc">Mô tả dự án</label>
              <textarea
                id="f-desc"
                className="form-textarea"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button type="submit" className="btn btn-primary">
                Lưu thông tin dự án
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Modal Chọn Gán Sản Phẩm từ Catalog */}
      {isAssignModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Gán sản phẩm từ Catalog vào Site</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsAssignModalOpen(false)}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              {catalogLoading ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>Đang tải danh sách catalog...</div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {catalogProducts.map((p) => {
                    const isAlreadyAssigned = products.some((ap) => ap._id === p._id);
                    const isSelected = selectedProductIds.includes(p._id);

                    return (
                      <label
                        key={p._id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '10px 12px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          background: isAlreadyAssigned ? '#f8fafc' : isSelected ? '#eff6ff' : '#ffffff',
                          cursor: isAlreadyAssigned ? 'not-allowed' : 'pointer',
                        }}
                      >
                        <input
                          type="checkbox"
                          disabled={isAlreadyAssigned}
                          checked={isSelected || isAlreadyAssigned}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedProductIds([...selectedProductIds, p._id]);
                            } else {
                              setSelectedProductIds(selectedProductIds.filter((pid) => pid !== p._id));
                            }
                          }}
                        />
                        <div style={{ flex: 1 }}>
                          <strong style={{ fontSize: '0.875rem' }}>{p.name}</strong>
                          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            SKU: {p.sku || 'N/A'} • Giá: {p.price?.toLocaleString('vi-VN')} đ
                            {isAlreadyAssigned && ' (Đã gán cho site này)'}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsAssignModalOpen(false)}>
                Hủy
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={selectedProductIds.length === 0}
                onClick={handleAssignSubmit}
              >
                Gán {selectedProductIds.length} sản phẩm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Subcomponent: Dòng sản phẩm và form Override
function ProductOverrideRow({
  product,
  onSave,
  onUnassign,
}: {
  product: AssignedProduct;
  onSave: (id: string, name: string, price: string, status: 'published' | 'hidden') => void;
  onUnassign: (id: string, name: string) => void;
}) {
  const [customName, setCustomName] = useState(
    product.name !== product.originalName ? product.name : ''
  );
  const [customPrice, setCustomPrice] = useState(
    product.price !== product.basePrice ? String(product.price) : ''
  );
  const [siteStatus, setSiteStatus] = useState(product.siteStatus);
  const [isChanged, setIsChanged] = useState(false);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomName(e.target.value);
    setIsChanged(true);
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomPrice(e.target.value);
    setIsChanged(true);
  };

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSiteStatus(e.target.value as any);
    setIsChanged(true);
  };

  const handleSave = () => {
    onSave(product._id, customName, customPrice, siteStatus);
    setIsChanged(false);
  };

  return (
    <tr>
      <td>
        <div className={styles.productRow}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={product.thumbnail ? `/api/v1/media/${product.thumbnail._id}/view` : ''}
            alt=""
            className={styles.thumbImg}
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = 'none';
            }}
          />
          <div>
            <div style={{ fontWeight: 600 }}>{product.originalName}</div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              SKU: {product.sku || 'N/A'}
            </div>
          </div>
        </div>
      </td>

      <td>
        <input
          type="text"
          className={styles.overrideInput}
          placeholder="Giữ nguyên tên gốc..."
          value={customName}
          onChange={handleNameChange}
        />
      </td>

      <td>
        <span style={{ color: 'var(--text-secondary)' }}>
          {product.basePrice?.toLocaleString('vi-VN')} đ
        </span>
      </td>

      <td>
        <input
          type="number"
          className={styles.overrideInput}
          placeholder="Giá gốc..."
          value={customPrice}
          onChange={handlePriceChange}
        />
      </td>

      <td>
        <select
          className={styles.overrideInput}
          value={siteStatus}
          onChange={handleStatusChange}
          style={{ width: 'auto' }}
        >
          <option value="published">Hiển thị (Published)</option>
          <option value="hidden">Ẩn trên site này (Hidden)</option>
        </select>
      </td>

      <td style={{ textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: '6px', justifyContent: 'flex-end' }}>
          {isChanged && (
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={handleSave}
            >
              Lưu
            </button>
          )}
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ color: 'var(--color-danger)' }}
            onClick={() => onUnassign(product._id, product.name)}
            title="Gỡ khỏi dự án"
          >
            Gỡ
          </button>
        </div>
      </td>
    </tr>
  );
}
