'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import styles from './MediaSelectModal.module.css';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';

export interface SelectedMediaItem {
  _id: string;
  fileName: string;
  driveFileId?: string;
  thumbnailUrl?: string;
  driveWebViewLink?: string;
}

interface MediaSelectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (selected: SelectedMediaItem[]) => void;
  mode?: 'single' | 'multiple';
  initialSelectedIds?: string[];
  title?: string;
}

export function MediaSelectModal({
  isOpen,
  onClose,
  onSelect,
  mode = 'single',
  initialSelectedIds = [],
  title = 'Chọn hình ảnh từ Thư viện Media',
}: MediaSelectModalProps) {
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [mediaList, setMediaList] = useState<SelectedMediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>(initialSelectedIds);
  const [isUploading, setIsUploading] = useState(false);

  // Sync initial
  useEffect(() => {
    if (isOpen) {
      setSelectedIds(initialSelectedIds);
    }
  }, [isOpen, initialSelectedIds]);

  // Load media list
  const fetchMedia = useCallback(async (q: string = '') => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ limit: '40' });
      if (q) params.set('search', q);

      const res = await fetch(`/api/v1/media?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMediaList(data.data.items || []);
      }
    } catch {
      toast.error('Không thể tải thư viện ảnh.');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (isOpen) {
      fetchMedia(search);
    }
  }, [isOpen, search, fetchMedia]);

  if (!isOpen) return null;

  const handleToggleSelect = (item: SelectedMediaItem) => {
    if (mode === 'single') {
      setSelectedIds([item._id]);
    } else {
      if (selectedIds.includes(item._id)) {
        setSelectedIds(selectedIds.filter((id) => id !== item._id));
      } else {
        setSelectedIds([...selectedIds, item._id]);
      }
    }
  };

  const handleConfirm = () => {
    const selectedObjects = mediaList.filter((m) => selectedIds.includes(m._id));
    onSelect(selectedObjects);
    onClose();
  };

  // Upload nhanh ảnh mới trực tiếp lên Google Drive từ Modal
  const handleQuickUpload = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Chỉ được chọn tệp định dạng hình ảnh.');
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã tải "${file.name}" lên Google Drive!`);
        await fetchMedia(search);
        // Tự động chọn ảnh vừa tải lên
        if (mode === 'single') {
          setSelectedIds([data.data._id]);
        } else {
          setSelectedIds((prev) => [...prev, data.data._id]);
        }
      } else {
        toast.error(data.error?.message || 'Tải ảnh thất bại.');
      }
    } catch {
      toast.error('Lỗi khi tải ảnh lên.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className={styles.modalHeader}>
          <div className={styles.modalTitle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
            {title}
          </div>
          <button className={styles.closeBtn} onClick={onClose} aria-label="Đóng">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Toolbar */}
        <div className={styles.modalToolbar}>
          <div className={styles.searchBox}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" color="var(--text-tertiary)">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Tìm theo tên file ảnh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleQuickUpload(e.target.files[0]);
                }
              }}
            />
            <button
              type="button"
              className={`btn btn-secondary btn-sm ${isUploading ? 'btn-loading' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              {!isUploading && '+ Tải ảnh mới lên Drive'}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className={styles.modalBody}>
          {loading ? (
            <div className={styles.grid}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Skeleton key={i} height="130px" width="100%" borderRadius="8px" />
              ))}
            </div>
          ) : mediaList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
              <p>Chưa có hình ảnh nào trong Thư viện Media.</p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                style={{ marginTop: '12px' }}
                onClick={() => fileInputRef.current?.click()}
              >
                Tải ảnh đầu tiên lên ngay
              </button>
            </div>
          ) : (
            <div className={styles.grid}>
              {mediaList.map((item) => {
                const isSelected = selectedIds.includes(item._id);
                return (
                  <div
                    key={item._id}
                    className={`${styles.mediaItem} ${isSelected ? styles.mediaItemSelected : ''}`}
                    onClick={() => handleToggleSelect(item)}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/v1/media/${item._id}/view`}
                      alt={item.fileName}
                      className={styles.mediaImg}
                      loading="lazy"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          item.thumbnailUrl ||
                          'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" fill="%23eee"><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23aaa">Preview</text></svg>';
                      }}
                    />
                    {isSelected && (
                      <div className={styles.selectedBadge} aria-label="Đã chọn">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                      </div>
                    )}
                    <div className={styles.mediaItemName} title={item.fileName}>
                      {item.fileName}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className={styles.modalFooter}>
          <div className={styles.selectedCount}>
            Đã chọn: <strong>{selectedIds.length}</strong> hình ảnh {mode === 'single' ? '(tối đa 1)' : ''}
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Hủy
            </button>
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleConfirm}
              disabled={selectedIds.length === 0}
            >
              Xác nhận chọn ({selectedIds.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
