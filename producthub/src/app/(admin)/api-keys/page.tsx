'use client';

import React, { useState, useEffect } from 'react';
import styles from './api-keys.module.css';
import { useToast } from '@/components/ui/Toast';

interface ApiKeyItem {
  _id: string;
  name: string;
  keyPrefix: string;
  projectId?: { _id: string; name: string; code: string };
  scopes: string[];
  status: 'active' | 'revoked';
  rateLimit: number;
  lastUsedAt?: string;
  createdAt: string;
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKeyItem[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [scopes, setScopes] = useState<string[]>(['products.read', 'categories.read']);
  const [submitting, setSubmitting] = useState(false);

  const toast = useToast();

  const fetchData = async () => {
    try {
      setLoading(true);
      const [keyRes, projRes] = await Promise.all([
        fetch('/api/v1/api-keys'),
        fetch('/api/v1/projects'),
      ]);

      const keyData = await keyRes.json();
      const projData = await projRes.json();

      if (keyData.success) setKeys(keyData.data.items || []);
      if (projData.success) setProjects(projData.data.items || []);
    } catch {
      toast.error('Lỗi khi tải danh sách khóa API.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Vui lòng nhập tên khóa API.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          projectId: projectId || undefined,
          scopes,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setCreatedRawKey(data.data.rawKey);
        setIsCreateModalOpen(false);
        setName('');
        setProjectId('');
        fetchData();
        toast.success('Đã tạo API Key mới thành công!');
      } else {
        toast.error(data.error?.message || 'Có lỗi khi tạo API key.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleRevoke = async (id: string, keyName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn thu hồi khóa "${keyName}"? Các ứng dụng sử dụng khóa này sẽ bị từ chối ngay lập tức.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/api-keys/${id}/revoke`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã thu hồi khóa API thành công.');
        setKeys((prev) =>
          prev.map((k) => (k._id === id ? { ...k, status: 'revoked' } : k))
        );
      } else {
        toast.error(data.error?.message || 'Không thể thu hồi khóa.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Đã sao chép khóa API vào bộ nhớ tạm!');
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 2l-2 2m-2-2l2 2m-2 2l2-2" />
              <circle cx="7.5" cy="15.5" r="5.5" />
              <path d="M15.5 7.5L14 9l3 3 1.5-1.5" />
              <path d="M11.5 11.5l5-5" />
            </svg>
            Quản lý Khóa API (REST API Keys)
          </h1>
          <p className={styles.subtitle}>
            Tạo và phân quyền khóa truy cập bảo mật SHA-256 cho các ứng dụng di động, website vệ tinh hoặc hệ thống bên thứ ba.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsCreateModalOpen(true)}
        >
          + Tạo Khóa API Mới
        </button>
      </div>

      {/* Thông báo hiển thị Key mới tạo duy nhất 1 lần */}
      {createdRawKey && (
        <div className="alert alert-warning" style={{ marginBottom: '24px' }}>
          <div>
            <strong>LƯU Ý QUAN TRỌNG:</strong> Đây là lần duy nhất khóa API đầy đủ này được hiển thị. Hãy sao chép và lưu trữ ở nơi bảo mật trước khi đóng thông báo!
          </div>
          <div className={styles.keyDisplayBox}>
            <code>{createdRawKey}</code>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => copyToClipboard(createdRawKey)}
            >
              Sao chép
            </button>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setCreatedRawKey(null)}
          >
            Tôi đã lưu khóa an toàn (Đóng thông báo)
          </button>
        </div>
      )}

      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Tên khóa API</th>
                <th>Mã định danh (Prefix)</th>
                <th>Phạm vi dự án (Project Scope)</th>
                <th>Quyền hạn (Scopes)</th>
                <th>Lần gọi cuối</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                    Đang tải danh sách khóa API...
                  </td>
                </tr>
              ) : keys.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Chưa có khóa API nào được tạo.
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsCreateModalOpen(true)}
                    >
                      Tạo khóa đầu tiên
                    </button>
                  </td>
                </tr>
              ) : (
                keys.map((k) => (
                  <tr key={k._id}>
                    <td>
                      <strong>{k.name}</strong>
                    </td>
                    <td>
                      <code className={styles.keyPrefix}>{k.keyPrefix}...</code>
                    </td>
                    <td>
                      {k.projectId ? (
                        <span style={{ color: 'var(--color-primary)', fontWeight: 500 }}>
                          {k.projectId.name} ({k.projectId.code})
                        </span>
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>
                          Toàn quyền (Toàn bộ Catalog)
                        </span>
                      )}
                    </td>
                    <td>
                      {k.scopes.map((s) => (
                        <span key={s} className={styles.scopePill}>
                          {s}
                        </span>
                      ))}
                    </td>
                    <td>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                        {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleString('vi-VN') : 'Chưa sử dụng'}
                      </span>
                    </td>
                    <td>
                      <span className={k.status === 'active' ? styles.badgeActive : styles.badgeRevoked}>
                        {k.status === 'active' ? 'Đang hoạt động' : 'Đã thu hồi'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      {k.status === 'active' && (
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() => handleRevoke(k._id, k.name)}
                          title="Vô hiệu hóa khóa ngay lập tức"
                        >
                          Thu hồi
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tạo Khóa API */}
      {isCreateModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Tạo Khóa API Mới</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsCreateModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreate}>
              <div className={styles.modalBody}>
                <div className="form-group">
                  <label className="form-label" htmlFor="k-name">
                    Tên ứng dụng / mục đích sử dụng <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    id="k-name"
                    type="text"
                    className="form-input"
                    placeholder="Ví dụ: App Bán Hàng iOS, Website Chi Nhánh..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="k-project">
                    Giới hạn phạm vi theo Dự án / Site (Project Scoping)
                  </label>
                  <select
                    id="k-project"
                    className="form-select"
                    value={projectId}
                    onChange={(e) => setProjectId(e.target.value)}
                  >
                    <option value="">Toàn quyền (Không giới hạn theo dự án)</option>
                    {projects.map((p) => (
                      <option key={p._id} value={p._id}>
                        {p.name} ({p.code})
                      </option>
                    ))}
                  </select>
                  <div className="form-hint">
                    Nếu chọn dự án, API key này sẽ chỉ có quyền xem các sản phẩm được phân bổ riêng cho dự án đó.
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Quyền hạn truy cập (Scopes)</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                    {[
                      { key: 'products.read', label: 'products.read — Xem danh sách & chi tiết sản phẩm' },
                      { key: 'categories.read', label: 'categories.read — Xem cây phân cấp danh mục' },
                      { key: 'product_types.read', label: 'product_types.read — Xem loại sản phẩm và thuộc tính động' },
                    ].map((item) => (
                      <label key={item.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem' }}>
                        <input
                          type="checkbox"
                          checked={scopes.includes(item.key)}
                          onChange={(e) => {
                            if (e.target.checked) setScopes([...scopes, item.key]);
                            else setScopes(scopes.filter((s) => s !== item.key));
                          }}
                        />
                        <span>{item.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsCreateModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Đang tạo...' : 'Tạo Khóa API'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
