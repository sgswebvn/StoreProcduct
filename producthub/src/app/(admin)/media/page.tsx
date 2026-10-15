'use client';

import React, { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { Modal, ConfirmDialog } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import styles from './media.module.css';

interface DriveStatus {
  connected: boolean;
  email?: string;
  name?: string;
  status: 'active' | 'expired' | 'revoked' | 'not_connected';
  errorMessage?: string;
}

interface MediaItem {
  _id: string;
  fileName: string;
  mimeType: string;
  size: number;
  driveFileId: string;
  driveWebViewLink?: string;
  thumbnailUrl?: string;
  productCount: number;
  alt?: string;
  title?: string;
  createdAt: string;
}

interface MediaDetail extends MediaItem {
  usage?: {
    products: Array<{ _id: string; name: string; slug: string; sku?: string }>;
    categories: Array<{ _id: string; name: string; slug: string }>;
  };
}

function MediaLibraryContent() {
  const searchParams = useSearchParams();
  const toast = useToast();

  const [driveStatus, setDriveStatus] = useState<DriveStatus | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [connectingDrive, setConnectingDrive] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(true);
  const [search, setSearch] = useState('');
  const [usageFilter, setUsageFilter] = useState<'all' | 'used' | 'orphaned'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Single Media Detail Modal state
  const [selectedDetail, setSelectedDetail] = useState<MediaDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editAlt, setEditAlt] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editFileName, setEditFileName] = useState('');
  const [savingDetail, setSavingDetail] = useState(false);

  // Xóa ảnh
  const [deleteTarget, setDeleteTarget] = useState<MediaItem | null>(null);
  const [deleteFromDrive, setDeleteFromDrive] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  // 1. Kiểm tra query param sau OAuth callback
  useEffect(() => {
    const connected = searchParams.get('drive_connected');
    const driveError = searchParams.get('drive_error');

    if (connected === '1') {
      toast.success('Kết nối tài khoản Google Drive thành công!');
    }
    if (driveError) {
      toast.error(decodeURIComponent(driveError), { title: 'Lỗi ủy quyền Google' });
    }
  }, [searchParams, toast]);

  // 2. Tải trạng thái kết nối Google Drive
  const fetchDriveStatus = useCallback(async () => {
    try {
      setLoadingStatus(true);
      const res = await fetch('/api/v1/integrations/google-drive/status');
      const data = await res.json();
      if (data.success) {
        setDriveStatus(data.data);
      }
    } catch {
      setDriveStatus({ connected: false, status: 'not_connected' });
    } finally {
      setLoadingStatus(false);
    }
  }, []);

  // 3. Tải danh sách media
  const fetchMedia = useCallback(async (p: number = 1, q: string = '', us: string = 'all') => {
    try {
      setLoadingMedia(true);
      const params = new URLSearchParams({ page: p.toString(), limit: '18', usage: us });
      if (q) params.set('search', q);

      const res = await fetch(`/api/v1/media?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMediaList(data.data.items);
        setTotalPages(data.data.totalPages || 1);
        setTotalCount(data.data.total || 0);
        setPage(data.data.page || 1);
      }
    } catch {
      toast.error('Không thể tải danh sách hình ảnh.');
    } finally {
      setLoadingMedia(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDriveStatus();
  }, [fetchDriveStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMedia(1, search, usageFilter);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, usageFilter, fetchMedia]);

  // Bắt đầu kết nối Google Drive
  const handleConnectDrive = async () => {
    try {
      setConnectingDrive(true);
      const res = await fetch('/api/v1/integrations/google-drive/auth-url');
      const data = await res.json();
      if (data.success && data.data.authUrl) {
        window.location.href = data.data.authUrl;
      } else {
        toast.error(data.error?.message || 'Không thể tạo URL ủy quyền Google.');
        setConnectingDrive(false);
      }
    } catch {
      toast.error('Đã xảy ra lỗi khi kết nối Google Drive.');
      setConnectingDrive(false);
    }
  };

  // Ngắt kết nối Google Drive
  const handleDisconnectDrive = async () => {
    try {
      setDisconnecting(true);
      const res = await fetch('/api/v1/integrations/google-drive/disconnect', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã ngắt kết nối tài khoản Google Drive.');
        setDisconnectDialogOpen(false);
        fetchDriveStatus();
      } else {
        toast.error(data.error?.message || 'Không thể ngắt kết nối.');
      }
    } catch {
      toast.error('Lỗi khi ngắt kết nối Google Drive.');
    } finally {
      setDisconnecting(false);
    }
  };

  // Upload nhiều file hàng loạt
  const handleUploadFiles = async (files: FileList | File[]) => {
    if (!driveStatus?.connected) {
      toast.warning('Bạn cần kết nối Google Drive trước khi tải ảnh lên.');
      return;
    }

    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    try {
      setIsUploading(true);
      let successCount = 0;

      for (let i = 0; i < fileList.length; i++) {
        const file = fileList[i];
        setUploadProgress(`Đang tải (${i + 1}/${fileList.length}): "${file.name}"...`);

        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch('/api/v1/media/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();
        if (data.success) {
          successCount++;
        } else {
          toast.error(`Lỗi "${file.name}": ${data.error?.message || 'Thất bại'}`);
        }
      }

      if (successCount > 0) {
        toast.success(`Đã lưu thành công ${successCount}/${fileList.length} ảnh lên Google Drive!`);
        fetchMedia(1, search, usageFilter);
      }
    } catch {
      toast.error('Đã xảy ra lỗi kết nối khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Xem chi tiết ảnh & danh sách sử dụng
  const handleOpenDetail = async (item: MediaItem) => {
    try {
      setLoadingDetail(true);
      setSelectedDetail(item);
      setEditAlt(item.alt || '');
      setEditTitle(item.title || '');
      setEditFileName(item.fileName || '');

      const res = await fetch(`/api/v1/media/${item._id}`);
      const data = await res.json();
      if (data.success) {
        setSelectedDetail(data.data);
        setEditAlt(data.data.alt || '');
        setEditTitle(data.data.title || '');
        setEditFileName(data.data.fileName || '');
      }
    } catch {
      toast.error('Không thể tải chi tiết ảnh.');
    } finally {
      setLoadingDetail(false);
    }
  };

  // Lưu chỉnh sửa Metadata (Alt, Title, FileName)
  const handleSaveDetail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDetail) return;

    try {
      setSavingDetail(true);
      const res = await fetch(`/api/v1/media/${selectedDetail._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          alt: editAlt,
          title: editTitle,
          fileName: editFileName,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Đã cập nhật thông tin ảnh thành công!');
        setSelectedDetail(null);
        fetchMedia(page, search, usageFilter);
      } else {
        toast.error(data.error?.message || 'Cập nhật thất bại.');
      }
    } catch {
      toast.error('Lỗi khi lưu thông tin ảnh.');
    } finally {
      setSavingDetail(false);
    }
  };

  // Xóa ảnh
  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;

    try {
      setIsDeleting(true);
      const res = await fetch(
        `/api/v1/media/${deleteTarget._id}?deleteFromDrive=${deleteFromDrive}`,
        { method: 'DELETE' }
      );
      const data = await res.json();

      if (data.success) {
        toast.success(
          deleteFromDrive
            ? 'Đã xóa ảnh khỏi StoreProduct và Google Drive.'
            : 'Đã gỡ ảnh khỏi hệ thống StoreProduct.'
        );
        setDeleteTarget(null);
        if (selectedDetail?._id === deleteTarget._id) {
          setSelectedDetail(null);
        }
        fetchMedia(page, search, usageFilter);
      } else {
        toast.error(data.error?.message || 'Không thể xóa ảnh.');
      }
    } catch {
      toast.error('Đã xảy ra lỗi khi xóa ảnh.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Dọn dẹp tệp mồ côi (chưa sử dụng)
  const handleCleanupOrphaned = async () => {
    const orphanedItems = mediaList.filter((m) => m.productCount === 0);
    if (orphanedItems.length === 0) {
      toast.info('Không có tệp chưa sử dụng nào trên trang này.');
      return;
    }

    if (!confirm(`Bạn có chắc muốn dọn dẹp ${orphanedItems.length} ảnh chưa sử dụng?`)) {
      return;
    }

    try {
      const ids = orphanedItems.map((m) => m._id);
      const res = await fetch('/api/v1/media/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, deleteFromDrive: true }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`Đã dọn dẹp thành công ${data.data?.deletedCount || 0} ảnh chưa sử dụng!`);
        fetchMedia(1, search, usageFilter);
      } else {
        toast.error('Không thể dọn dẹp tệp mồ côi.');
      }
    } catch {
      toast.error('Lỗi khi thực hiện dọn dẹp.');
    }
  };

  const handleCopyLink = (item: MediaItem) => {
    const fullUrl = `${window.location.origin}/api/v1/media/${item._id}/view`;
    navigator.clipboard.writeText(fullUrl);
    toast.info('Đã sao chép liên kết hình ảnh vào clipboard.');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">Thư viện Media & Quản lý Tệp tập trung</h1>
          <p className="page-description">
            Lưu trữ, kiểm tra chữ ký tệp nhị phân và đồng bộ ảnh sản phẩm an toàn trực tiếp trên Google Drive cá nhân.
          </p>
        </div>
      </div>

      {/* Trạng thái tích hợp Google Drive */}
      <div className={styles.integrationCard}>
        <div className={styles.integrationInfo}>
          <div className={styles.driveIcon} aria-hidden="true">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path d="M8 20L2 9.5L5 4.5L11 15L8 20Z" fill="#0F9D58" />
              <path d="M16 20H8L11 15H19L16 20Z" fill="#4285F4" />
              <path d="M19 15L16 20L22 9.5H16L19 15Z" fill="#FBBC05" />
            </svg>
          </div>
          <div>
            <div className={styles.integrationTitle}>
              Lưu trữ Google Drive
              {loadingStatus ? (
                <Skeleton width="80px" height="20px" />
              ) : driveStatus?.connected ? (
                <Badge variant="success" withDot={false}>Đang hoạt động</Badge>
              ) : (
                <Badge variant="warning" withDot={false}>Chưa kết nối</Badge>
              )}
            </div>
            <div className={styles.integrationDesc}>
              {loadingStatus ? (
                'Đang kiểm tra kết nối...'
              ) : driveStatus?.connected ? (
                <>Tài khoản liên kết: <strong>{driveStatus.email}</strong> ({driveStatus.name})</>
              ) : (
                'Cần kết nối Google Drive để bắt đầu tải và lưu trữ ảnh sản phẩm.'
              )}
            </div>
          </div>
        </div>

        <div>
          {driveStatus?.connected ? (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setDisconnectDialogOpen(true)}
            >
              Ngắt kết nối Drive
            </button>
          ) : (
            <button
              type="button"
              className={`btn btn-primary ${connectingDrive ? 'btn-loading' : ''}`}
              onClick={handleConnectDrive}
              disabled={connectingDrive || loadingStatus}
            >
              {!connectingDrive && 'Kết nối Google Drive'}
            </button>
          )}
        </div>
      </div>

      {/* Vùng tải ảnh (Upload Zone - Hỗ trợ kéo thả nhiều file) */}
      <div
        className={`${styles.uploadZone} ${isDragging ? styles.uploadZoneHover : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          style={{ display: 'none' }}
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) {
              handleUploadFiles(e.target.files);
            }
          }}
          disabled={isUploading}
        />
        <div className={styles.uploadIcon} aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <div className={styles.uploadTitle}>
          {isUploading ? uploadProgress : 'Kéo thả nhiều ảnh vào đây hoặc nhấp để chọn tệp'}
        </div>
        <div className={styles.uploadSub}>
          Hỗ trợ tải lên hàng loạt (JPG, PNG, WEBP, GIF, SVG tối đa 15MB) · Xác thực Magic bytes · Lưu trữ Google Drive
        </div>
      </div>

      {/* Toolbar & Filter Tabs */}
      <div className={styles.toolbar}>
        <div className={styles.usageTabs}>
          <button
            type="button"
            className={`${styles.usageTab} ${usageFilter === 'all' ? styles.usageTabActive : ''}`}
            onClick={() => setUsageFilter('all')}
          >
            Tất cả hình ảnh
          </button>
          <button
            type="button"
            className={`${styles.usageTab} ${usageFilter === 'used' ? styles.usageTabActive : ''}`}
            onClick={() => setUsageFilter('used')}
          >
            Đang sử dụng
          </button>
          <button
            type="button"
            className={`${styles.usageTab} ${usageFilter === 'orphaned' ? styles.usageTabActive : ''}`}
            onClick={() => setUsageFilter('orphaned')}
          >
            Chưa sử dụng (Tệp mồ côi)
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <div className={styles.searchBox}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="var(--text-tertiary)">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm theo tên file, alt hoặc tiêu đề..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {usageFilter === 'orphaned' && mediaList.length > 0 && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={handleCleanupOrphaned}
            >
              🧹 Dọn dẹp tệp chưa dùng
            </button>
          )}

          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Tổng số: <strong>{totalCount}</strong> ảnh
          </div>
        </div>
      </div>

      {/* Lưới hình ảnh */}
      {loadingMedia ? (
        <div className={styles.grid}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className={styles.card}>
              <Skeleton height="160px" width="100%" />
              <div style={{ padding: '12px' }}>
                <Skeleton height="16px" width="80%" />
                <div style={{ marginTop: '8px' }}>
                  <Skeleton height="12px" width="40%" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : mediaList.length === 0 ? (
        <EmptyState
          type={search ? 'no_results' : 'no_data'}
          title={search ? 'Không tìm thấy ảnh' : 'Chưa có hình ảnh nào'}
          description={
            search
              ? 'Thử kiểm tra lại từ khóa tìm kiếm tên file hoặc alt text.'
              : 'Hãy kéo thả hoặc tải lên bức ảnh sản phẩm đầu tiên của bạn.'
          }
          actionLabel={!search ? 'Tải ảnh lên ngay' : undefined}
          onAction={() => fileInputRef.current?.click()}
        />
      ) : (
        <div className={styles.grid}>
          {mediaList.map((item) => (
            <div key={item._id} className={styles.card}>
              <div
                className={styles.previewWrapper}
                onClick={() => handleOpenDetail(item)}
                style={{ cursor: 'pointer' }}
                title="Nhấp để xem chi tiết & chỉnh sửa metadata SEO"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/v1/media/${item._id}/view`}
                  alt={item.alt || item.fileName}
                  className={styles.previewImg}
                  loading="lazy"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      item.thumbnailUrl ||
                      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23ccc"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle">No preview</text></svg>';
                  }}
                />
              </div>

              <div className={styles.cardBody}>
                <div className={styles.fileName} title={item.fileName}>
                  {item.fileName}
                </div>
                <div className={styles.fileMeta}>
                  <span>{formatFileSize(item.size)}</span>
                  <span>
                    {item.productCount > 0 ? (
                      <Badge variant="info" withDot={false}>{item.productCount} sản phẩm</Badge>
                    ) : (
                      <Badge variant="neutral" withDot={false}>Chưa gắn</Badge>
                    )}
                  </span>
                </div>
              </div>

              <div className={styles.cardActions}>
                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => handleOpenDetail(item)}
                  title="Xem chi tiết & sửa Alt Text"
                  aria-label="Xem chi tiết"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                </button>

                <button
                  type="button"
                  className={styles.actionBtn}
                  onClick={() => handleCopyLink(item)}
                  title="Sao chép liên kết ảnh"
                  aria-label="Sao chép liên kết"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>

                {item.driveWebViewLink && (
                  <a
                    href={item.driveWebViewLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.actionBtn}
                    title="Mở trên Google Drive"
                    aria-label="Mở trên Google Drive"
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </a>
                )}

                <button
                  type="button"
                  className={`${styles.actionBtn} ${styles.actionBtnDanger}`}
                  onClick={() => setDeleteTarget(item)}
                  title="Xóa ảnh"
                  aria-label="Xóa ảnh"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polyline points="3 6 5 6 21 6" />
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Chi tiết Media & Chỉnh sửa Metadata SEO */}
      {selectedDetail && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedDetail(null)}
          title="Thông tin chi tiết hình ảnh & SEO"
          maxWidth="750px"
        >
          <div className={styles.detailGrid}>
            <div>
              <div className={styles.detailPreview}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/v1/media/${selectedDetail._id}/view`}
                  alt={selectedDetail.alt || selectedDetail.fileName}
                  className={styles.detailImg}
                />
              </div>

              <div className={styles.detailMetaList}>
                <div><strong>Dung lượng:</strong> {formatFileSize(selectedDetail.size)}</div>
                <div><strong>Định dạng:</strong> {selectedDetail.mimeType}</div>
                <div><strong>Ngày tải lên:</strong> {new Date(selectedDetail.createdAt).toLocaleString('vi-VN')}</div>
                <div>
                  <strong>Link Google Drive:</strong>{' '}
                  <a href={selectedDetail.driveWebViewLink} target="_blank" rel="noreferrer" style={{ color: 'var(--color-primary)' }}>
                    Xem trên Drive ↗
                  </a>
                </div>
              </div>

              {/* Danh sách sản phẩm & danh mục đang sử dụng */}
              <div style={{ marginTop: '16px' }}>
                <strong style={{ fontSize: '0.875rem' }}>
                  Đang được sử dụng trong ({selectedDetail.usage?.products?.length || 0} sản phẩm):
                </strong>
                {selectedDetail.usage?.products && selectedDetail.usage.products.length > 0 ? (
                  <div className={styles.usageList}>
                    {selectedDetail.usage.products.map((p) => (
                      <div key={p._id} className={styles.usageItem}>
                        <Link href={`/products/${p._id}/edit`} style={{ color: 'var(--color-primary)', textDecoration: 'none' }}>
                          📦 {p.name}
                        </Link>
                        {p.sku && <code>{p.sku}</code>}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Chưa có sản phẩm nào sử dụng hình ảnh này (Tệp mồ côi).
                  </div>
                )}
              </div>
            </div>

            {/* Form chỉnh sửa metadata */}
            <form onSubmit={handleSaveDetail} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div className="form-group">
                <label className="form-label" htmlFor="m-filename">
                  Tên tệp (File Name)
                </label>
                <input
                  id="m-filename"
                  type="text"
                  className="form-input"
                  value={editFileName}
                  onChange={(e) => setEditFileName(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="m-alt">
                  Văn bản thay thế (Alt Text - Tối ưu SEO)
                </label>
                <input
                  id="m-alt"
                  type="text"
                  className="form-input"
                  placeholder="Mô tả bức ảnh cho công cụ tìm kiếm và trình đọc màn hình..."
                  value={editAlt}
                  onChange={(e) => setEditAlt(e.target.value)}
                />
                <div className="form-hint">Mô tả ngắn gọn nội dung hình ảnh để cải thiện SEO Google.</div>
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="m-title">
                  Tiêu đề ảnh (Title)
                </label>
                <input
                  id="m-title"
                  type="text"
                  className="form-input"
                  placeholder="Tiêu đề hiển thị khi rê chuột vào ảnh..."
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                />
              </div>

              <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setSelectedDetail(null)}
                >
                  Đóng
                </button>
                <button
                  type="submit"
                  className={`btn btn-primary ${savingDetail ? 'btn-loading' : ''}`}
                  disabled={savingDetail}
                >
                  {!savingDetail && 'Lưu thay đổi SEO'}
                </button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Modal xác nhận xóa */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDeleteTarget(null)}
          onConfirm={handleDeleteConfirm}
          title="Xác nhận xóa hình ảnh"
          message={`Bạn có chắc chắn muốn xóa "${deleteTarget.fileName}" khỏi hệ thống?`}
          confirmLabel="Xóa ngay"
          cancelLabel="Hủy bỏ"
          isDangerous={true}
          isLoading={isDeleting}
        />
      )}

      {/* Modal ngắt kết nối Drive */}
      {disconnectDialogOpen && (
        <ConfirmDialog
          isOpen={true}
          onClose={() => setDisconnectDialogOpen(false)}
          onConfirm={handleDisconnectDrive}
          title="Ngắt kết nối Google Drive"
          message="Sau khi ngắt kết nối, bạn sẽ không thể tải thêm ảnh mới cho đến khi kết nối lại. Các ảnh đã tải lên trước đó vẫn được lưu an toàn trên Google Drive của bạn."
          confirmLabel="Ngắt kết nối"
          cancelLabel="Giữ lại"
          isDangerous={true}
          isLoading={disconnecting}
        />
      )}
    </div>
  );
}

export default function MediaLibraryPage() {
  return (
    <Suspense
      fallback={
        <div style={{ padding: '24px' }}>
          <Skeleton height="40px" width="280px" />
          <div style={{ marginTop: '24px' }}>
            <Skeleton height="80px" width="100%" />
          </div>
          <div style={{ marginTop: '24px' }}>
            <Skeleton height="160px" width="100%" />
          </div>
        </div>
      }
    >
      <MediaLibraryContent />
    </Suspense>
  );
}
