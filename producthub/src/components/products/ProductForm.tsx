'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './ProductForm.module.css';
import { useToast } from '@/components/ui/Toast';
import { MediaSelectModal, SelectedMediaItem } from '@/components/media/MediaSelectModal';
import { DynamicFieldsRenderer } from './DynamicFieldsRenderer';
import { VariantManager } from './VariantManager';
import { slugify } from '@/core/utils/slug';

interface FlatCategory {
  _id: string;
  name: string;
  displayName: string;
  level: number;
}

export interface InitialProductData {
  _id?: string;
  name: string;
  slug: string;
  sku?: string;
  shortDescription?: string;
  description?: string;
  productTypeId?: string | null;
  attributes?: Array<{ key: string; value: any }>;
  status: 'draft' | 'active' | 'archived';
  categories: string[];
  thumbnail?: SelectedMediaItem | null;
  images: SelectedMediaItem[];
  price?: number;
  originalPrice?: number;
  tags: string[];
  dataVersion?: number;
}

interface ProductFormProps {
  initialData?: InitialProductData;
  isEditing?: boolean;
}

export function ProductForm({ initialData, isEditing = false }: ProductFormProps) {
  const router = useRouter();
  const toast = useToast();

  const [categoriesList, setCategoriesList] = useState<FlatCategory[]>([]);
  const [productTypesList, setProductTypesList] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState(initialData?.name || '');
  const [slug, setSlug] = useState(initialData?.slug || '');
  const [sku, setSku] = useState(initialData?.sku || '');
  const [shortDescription, setShortDescription] = useState(initialData?.shortDescription || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [status, setStatus] = useState<'draft' | 'active' | 'archived'>(initialData?.status || 'draft');
  const [selectedCategories, setSelectedCategories] = useState<string[]>(initialData?.categories || []);
  const [price, setPrice] = useState<number>(initialData?.price ?? 0);
  const [originalPrice, setOriginalPrice] = useState<number>(initialData?.originalPrice ?? 0);
  const [tags, setTags] = useState<string[]>(initialData?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [dataVersion, setDataVersion] = useState<number>(initialData?.dataVersion || 1);

  // Product Type & Dynamic Attributes
  const [productTypeId, setProductTypeId] = useState<string>(initialData?.productTypeId || '');
  const [selectedProductType, setSelectedProductType] = useState<any | null>(null);
  const [customAttributes, setCustomAttributes] = useState<Record<string, any>>(() => {
    const map: Record<string, any> = {};
    (initialData?.attributes || []).forEach((a) => {
      map[a.key] = a.value;
    });
    return map;
  });

  // Media states
  const [thumbnail, setThumbnail] = useState<SelectedMediaItem | null>(initialData?.thumbnail || null);
  const [galleryImages, setGalleryImages] = useState<SelectedMediaItem[]>(initialData?.images || []);

  // Modal selector states
  const [isThumbModalOpen, setIsThumbModalOpen] = useState(false);
  const [isGalleryModalOpen, setIsGalleryModalOpen] = useState(false);

  // Optimistic conflict state
  const [hasConflict, setHasConflict] = useState(false);

  // Fetch Categories & Product Types
  useEffect(() => {
    fetch('/api/v1/categories')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setCategoriesList(data.data || []);
        }
      })
      .catch(() => {});

    fetch('/api/v1/product-types')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setProductTypesList(data.data || []);
          if (initialData?.productTypeId) {
            const found = (data.data || []).find((pt: any) => pt._id === initialData.productTypeId);
            if (found) setSelectedProductType(found);
          }
        }
      })
      .catch(() => {});
  }, [initialData?.productTypeId]);

  // Handle Product Type Change
  const handleProductTypeChange = (newTypeId: string) => {
    setProductTypeId(newTypeId);
    if (!newTypeId) {
      setSelectedProductType(null);
      setCustomAttributes({});
    } else {
      const found = productTypesList.find((pt) => pt._id === newTypeId);
      setSelectedProductType(found || null);
    }
  };

  const handleCustomAttrChange = (key: string, val: any) => {
    setCustomAttributes((prev) => ({ ...prev, [key]: val }));
  };

  // Auto-generate slug on typing name if creating new
  const handleNameChange = (val: string) => {
    setName(val);
    if (!isEditing) {
      setSlug(slugify(val));
    }
  };

  // Toggle Category
  const handleToggleCategory = (catId: string) => {
    if (selectedCategories.includes(catId)) {
      setSelectedCategories(selectedCategories.filter((id) => id !== catId));
    } else {
      setSelectedCategories([...selectedCategories, catId]);
    }
  };

  // Tags handling
  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const trimmed = tagInput.trim().replace(/^,|,$/g, '');
      if (trimmed && !tags.includes(trimmed)) {
        setTags([...tags, trimmed]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Remove Gallery Image
  const handleRemoveGalleryImage = (mediaId: string) => {
    setGalleryImages(galleryImages.filter((img) => img._id !== mediaId));
  };

  // Reorder Gallery Images (Move left / Move right)
  const handleMoveGalleryImage = (index: number, direction: 'left' | 'right') => {
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= galleryImages.length) return;
    const nextImages = [...galleryImages];
    const temp = nextImages[index];
    nextImages[index] = nextImages[targetIndex];
    nextImages[targetIndex] = temp;
    setGalleryImages(nextImages);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Vui lòng nhập tên sản phẩm.');
      return;
    }

    try {
      setSubmitting(true);
      setHasConflict(false);

      const payload: any = {
        name: name.trim(),
        slug: slug.trim() || slugify(name),
        sku: sku.trim() || null,
        shortDescription: shortDescription.trim() || null,
        description: description.trim() || null,
        productTypeId: productTypeId || null,
        attributes: Object.entries(customAttributes).map(([key, value]) => ({ key, value })),
        status,
        categories: selectedCategories,
        thumbnail: thumbnail ? thumbnail._id : null,
        images: galleryImages.map((img) => img._id),
        price: Number(price) || 0,
        originalPrice: Number(originalPrice) || 0,
        tags,
      };

      if (isEditing) {
        payload.dataVersion = dataVersion;
      }

      const url = isEditing
        ? `/api/v1/products/${initialData?._id}`
        : '/api/v1/products';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.status === 409 || data.error?.code === 'OPTIMISTIC_LOCK_CONFLICT') {
        setHasConflict(true);
        toast.error(data.error?.message || 'Xung đột phiên bản dữ liệu!', {
          title: 'Cảnh báo đồng bộ',
        });
        return;
      }

      if (data.success) {
        toast.success(
          isEditing
            ? 'Cập nhật sản phẩm thành công!'
            : 'Đã tạo sản phẩm mới thành công!'
        );
        router.push('/products');
        router.refresh();
      } else {
        toast.error(data.error?.message || 'Có lỗi xảy ra khi lưu sản phẩm.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      {/* Cảnh báo xung đột Optimistic Concurrency Control */}
      {hasConflict && (
        <div className="alert alert-error" style={{ marginBottom: '24px' }}>
          <div>
            <strong>Xung đột dữ liệu (Optimistic Lock Conflict):</strong> Sản phẩm này vừa được chỉnh sửa bởi một phiên làm việc khác. Để tránh ghi đè làm mất dữ liệu của đồng nghiệp, vui lòng tải lại trang.
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => window.location.reload()}
            style={{ marginTop: '8px' }}
          >
            Tải lại dữ liệu mới nhất
          </button>
        </div>
      )}

      {/* Action Bar */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginBottom: '16px' }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.push('/products')}
          disabled={submitting}
        >
          Hủy bỏ
        </button>
        <button
          type="submit"
          className={`btn btn-primary ${submitting ? 'btn-loading' : ''}`}
          disabled={submitting}
        >
          {!submitting && (isEditing ? 'Lưu thay đổi' : 'Đăng sản phẩm')}
        </button>
      </div>

      <div className={styles.formGrid}>
        {/* Main Column */}
        <div className={styles.mainColumn}>
          {/* Card: Thông tin cơ bản */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <line x1="9" y1="9" x2="15" y2="9" />
                <line x1="9" y1="13" x2="15" y2="13" />
                <line x1="9" y1="17" x2="11" y2="17" />
              </svg>
              Thông tin chung sản phẩm
            </div>

            <div className="form-group">
              <label className="form-label required" htmlFor="p-name">
                Tên sản phẩm
              </label>
              <input
                id="p-name"
                type="text"
                className="form-input"
                placeholder="VD: Điện thoại Apple iPhone 15 Pro Max 256GB"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="p-slug">
                  Đường dẫn tĩnh (Slug)
                </label>
                <input
                  id="p-slug"
                  type="text"
                  className="form-input"
                  placeholder="iphone-15-pro-max-256gb"
                  value={slug}
                  onChange={(e) => setSlug(slugify(e.target.value))}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="p-sku">
                  Mã SKU sản phẩm
                </label>
                <input
                  id="p-sku"
                  type="text"
                  className="form-input"
                  placeholder="IP15PM-256-VN"
                  value={sku}
                  onChange={(e) => setSku(e.target.value.toUpperCase())}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="p-short-desc">
                Mô tả ngắn (Hiển thị xem nhanh)
              </label>
              <textarea
                id="p-short-desc"
                className="form-textarea"
                rows={2}
                maxLength={500}
                placeholder="Tóm tắt đặc điểm nổi bật nhất của sản phẩm..."
                value={shortDescription}
                onChange={(e) => setShortDescription(e.target.value)}
              />
              <div className="form-hint" style={{ textAlign: 'right' }}>
                {shortDescription.length}/500 ký tự
              </div>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="p-desc">
                Mô tả chi tiết sản phẩm
              </label>
              <textarea
                id="p-desc"
                className="form-textarea"
                rows={7}
                placeholder="Nội dung chi tiết thông số kỹ thuật, bài viết giới thiệu..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          {/* Card: Thuộc tính động theo ProductType */}
          {selectedProductType && (
            <div className={styles.card}>
              <div className={styles.cardTitle}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
                Thuộc tính đặc thù ({selectedProductType.name})
              </div>
              <DynamicFieldsRenderer
                fields={selectedProductType.fields || []}
                values={customAttributes}
                onChange={handleCustomAttrChange}
              />
            </div>
          )}

          {/* Card: Quản lý Biến thể (Variants) nếu loại sản phẩm có cấu hình variantAttributes */}
          {selectedProductType && selectedProductType.variantAttributes && selectedProductType.variantAttributes.length > 0 && (
            <div className={styles.card}>
              <VariantManager
                productId={initialData?._id}
                variantAttributeKeys={selectedProductType.variantAttributes}
                fields={selectedProductType.fields || []}
              />
            </div>
          )}

          {/* Card: Thư viện ảnh sản phẩm */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
              Bộ sưu tập hình ảnh (Lưu trực tiếp Google Drive)
            </div>

            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '16px' }}>
              Ảnh bổ sung mô tả nhiều góc chụp của sản phẩm. Được đồng bộ hóa và lưu trữ bảo mật trên Google Drive cá nhân của bạn.
            </p>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setIsGalleryModalOpen(true)}
            >
              + Chọn ảnh từ Thư viện Media
            </button>

            {galleryImages.length > 0 && (
              <div className={styles.galleryGrid}>
                {galleryImages.map((img, idx) => (
                  <div key={img._id} className={styles.galleryItem}>
                    {/* Badge thứ tự hiển thị */}
                    <span className={styles.imageIndexBadge}>#{idx + 1}</span>

                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/v1/media/${img._id}/view`}
                      alt={img.fileName}
                      className={styles.galleryImg}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = img.thumbnailUrl || '';
                      }}
                    />

                    {/* Nút xóa ảnh khỏi bộ sưu tập */}
                    <button
                      type="button"
                      className={styles.removeImgBtn}
                      onClick={() => handleRemoveGalleryImage(img._id)}
                      title="Gỡ ảnh khỏi bộ sưu tập"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>

                    {/* Thanh điều hướng thứ tự (Reorder bar) */}
                    <div className={styles.reorderBar}>
                      <button
                        type="button"
                        className={styles.reorderBtn}
                        onClick={() => handleMoveGalleryImage(idx, 'left')}
                        disabled={idx === 0}
                        title="Di chuyển sang trái"
                        aria-label="Di chuyển sang trái"
                      >
                        ◀
                      </button>
                      <button
                        type="button"
                        className={styles.reorderBtn}
                        onClick={() => handleMoveGalleryImage(idx, 'right')}
                        disabled={idx === galleryImages.length - 1}
                        title="Di chuyển sang phải"
                        aria-label="Di chuyển sang phải"
                      >
                        ▶
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Side Column */}
        <div className={styles.sideColumn}>
          {/* Card: Chọn loại sản phẩm */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Loại sản phẩm (Product Type)</div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <select
                id="p-type"
                className="form-select"
                value={productTypeId}
                onChange={(e) => handleProductTypeChange(e.target.value)}
              >
                <option value="">-- Tiêu chuẩn (Không có thuộc tính tùy chỉnh) --</option>
                {productTypesList.map((pt) => (
                  <option key={pt._id} value={pt._id}>
                    {pt.name}
                  </option>
                ))}
              </select>
              <div className="form-hint" style={{ marginTop: '6px' }}>
                Chọn loại để mở các trường thông số đặc thù và hỗ trợ cấu hình biến thể.
              </div>
            </div>
          </div>

          {/* Card: Xuất bản & Giá */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Trạng thái & Giá bán</div>

            <div className="form-group">
              <label className="form-label" htmlFor="p-status">
                Trạng thái lưu trữ
              </label>
              <select
                id="p-status"
                className="form-select"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="draft">Bản nháp (Draft)</option>
                <option value="active">Đang hoạt động (Active)</option>
                <option value="archived">Đã lưu trữ (Archived)</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="p-price">
                Giá tham khảo (VND)
              </label>
              <input
                id="p-price"
                type="number"
                className="form-input"
                min="0"
                step="1000"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="p-original-price">
                Giá niêm yết / Giá gốc (VND)
              </label>
              <input
                id="p-original-price"
                type="number"
                className="form-input"
                min="0"
                step="1000"
                value={originalPrice}
                onChange={(e) => setOriginalPrice(Number(e.target.value))}
              />
            </div>

            {isEditing && (
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                Phiên bản đồng bộ: v{dataVersion}
              </div>
            )}
          </div>

          {/* Card: Ảnh đại diện Thumbnail */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Ảnh đại diện chính</div>
            {thumbnail ? (
              <div>
                <div className={styles.thumbPreviewWrapper}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/v1/media/${thumbnail._id}/view`}
                    alt={thumbnail.fileName}
                    className={styles.thumbPreviewImg}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = thumbnail.thumbnailUrl || '';
                    }}
                  />
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1 }}
                    onClick={() => setIsThumbModalOpen(true)}
                  >
                    Đổi ảnh
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => setThumbnail(null)}
                  >
                    Gỡ bỏ
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.thumbPicker}>
                <div style={{ color: 'var(--text-muted)', marginBottom: '12px' }}>
                  Chưa chọn ảnh đại diện.
                </div>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setIsThumbModalOpen(true)}
                >
                  Chọn từ Thư viện Media
                </button>
              </div>
            )}
          </div>

          {/* Card: Cây danh mục */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Danh mục phân loại</div>
            <div className={styles.categoryList}>
              {categoriesList.length === 0 ? (
                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', padding: '8px' }}>
                  Chưa có danh mục nào. Hãy tạo danh mục trước.
                </div>
              ) : (
                categoriesList.map((cat) => (
                  <label key={cat._id} className={styles.categoryCheckbox}>
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(cat._id)}
                      onChange={() => handleToggleCategory(cat._id)}
                    />
                    <span>{cat.displayName}</span>
                  </label>
                ))
              )}
            </div>
          </div>

          {/* Card: Thẻ Tags */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>Thẻ từ khóa (Tags)</div>
            <input
              type="text"
              className="form-input"
              placeholder="Nhập thẻ rồi ấn Enter..."
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
            />
            {tags.length > 0 && (
              <div className={styles.tagContainer}>
                {tags.map((t) => (
                  <span key={t} className={styles.tagPill}>
                    #{t}
                    <button
                      type="button"
                      className={styles.removeTagBtn}
                      onClick={() => handleRemoveTag(t)}
                      aria-label="Xóa thẻ"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal chọn Thumbnail */}
      <MediaSelectModal
        isOpen={isThumbModalOpen}
        onClose={() => setIsThumbModalOpen(false)}
        mode="single"
        title="Chọn ảnh đại diện chính từ Google Drive"
        initialSelectedIds={thumbnail ? [thumbnail._id] : []}
        onSelect={(selected) => {
          if (selected[0]) {
            setThumbnail(selected[0]);
          }
        }}
      />

      {/* Modal chọn Gallery */}
      <MediaSelectModal
        isOpen={isGalleryModalOpen}
        onClose={() => setIsGalleryModalOpen(false)}
        mode="multiple"
        title="Chọn ảnh bộ sưu tập từ Google Drive"
        initialSelectedIds={galleryImages.map((img) => img._id)}
        onSelect={(selected) => {
          setGalleryImages(selected);
        }}
      />
    </form>
  );
}
