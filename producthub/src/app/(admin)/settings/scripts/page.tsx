'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from '../settings.module.css';

interface ScriptItem {
  _id: string;
  name: string;
  type: 'ga4' | 'gtm' | 'meta_pixel' | 'custom';
  location: 'head' | 'body_start' | 'footer';
  config: {
    trackingId?: string;
    code?: string;
  };
  isActive: boolean;
  scope: 'all' | 'storefront' | 'admin';
  version: number;
  updatedAt: string;
}

export default function ScriptIntegrationsPage() {
  const [scripts, setScripts] = useState<ScriptItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedScript, setSelectedScript] = useState<ScriptItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState<'ga4' | 'gtm' | 'meta_pixel' | 'custom'>('ga4');
  const [formLocation, setFormLocation] = useState<'head' | 'body_start' | 'footer'>('head');
  const [formTrackingId, setFormTrackingId] = useState('');
  const [formCode, setFormCode] = useState('');
  const [formScope, setFormScope] = useState<'all' | 'storefront' | 'admin'>('all');
  const [formIsActive, setFormIsActive] = useState(true);

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchScripts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/settings/scripts');
      const json = await res.json();
      if (json.success) {
        setScripts(json.data || []);
      } else {
        showToast('error', json.error?.message || 'Không thể tải danh sách script');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi mạng');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScripts();
  }, [fetchScripts]);

  const handleOpenCreate = () => {
    setSelectedScript(null);
    setFormName('');
    setFormType('ga4');
    setFormLocation('head');
    setFormTrackingId('');
    setFormCode('');
    setFormScope('all');
    setFormIsActive(true);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (script: ScriptItem) => {
    setSelectedScript(script);
    setFormName(script.name);
    setFormType(script.type);
    setFormLocation(script.location);
    setFormTrackingId(script.config.trackingId || '');
    setFormCode(script.config.code || '');
    setFormScope(script.scope);
    setFormIsActive(script.isActive);
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        name: formName,
        type: formType,
        location: formLocation,
        config: {
          trackingId: formTrackingId,
          code: formCode,
        },
        scope: formScope,
        isActive: formIsActive,
      };

      const url = selectedScript
        ? `/api/v1/settings/scripts/${selectedScript._id}`
        : '/api/v1/settings/scripts';
      const method = selectedScript ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        showToast('success', selectedScript ? 'Cập nhật script thành công' : 'Thêm mã tích hợp mới thành công');
        setIsModalOpen(false);
        fetchScripts();
      } else {
        showToast('error', json.error?.message || 'Lỗi khi lưu script');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi mạng');
    }
  };

  const handleToggleActive = async (script: ScriptItem) => {
    try {
      const res = await fetch(`/api/v1/settings/scripts/${script._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !script.isActive }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', `Đã ${!script.isActive ? 'kích hoạt' : 'tắt'} script '${script.name}'`);
        fetchScripts();
      } else {
        showToast('error', json.error?.message || 'Lỗi');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi mạng');
    }
  };

  const handleDelete = async (script: ScriptItem) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa mã tích hợp '${script.name}'?`)) return;
    try {
      const res = await fetch(`/api/v1/settings/scripts/${script._id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Đã xóa script thành công');
        fetchScripts();
      } else {
        showToast('error', json.error?.message || 'Lỗi xóa script');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi mạng');
    }
  };

  return (
    <div className={styles.container}>
      {feedback && (
        <div
          style={{
            position: 'fixed',
            top: '1.5rem',
            right: '1.5rem',
            zIndex: 9999,
            padding: '0.75rem 1.25rem',
            borderRadius: '6px',
            backgroundColor: feedback.type === 'success' ? '#166534' : '#991b1b',
            color: '#ffffff',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {feedback.text}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <div style={{ marginBottom: '0.25rem' }}>
            <Link href="/settings" style={{ color: '#2563eb', fontSize: '0.8125rem', textDecoration: 'none' }}>
              &larr; Quay lại Cài đặt hệ thống
            </Link>
          </div>
          <h1 className={styles.title}>Quản lý Script & Mã tích hợp</h1>
          <p className={styles.subtitle}>
            Tích hợp Google Analytics 4, Tag Manager, Meta Pixel hoặc mã nhúng JavaScript an toàn
          </p>
        </div>
        <button className={styles.btnPrimary} onClick={handleOpenCreate}>
          + Thêm mã tích hợp
        </button>
      </div>

      <div
        style={{
          background: '#ffffff',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải...</div>
        ) : scripts.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Chưa có đoạn mã tích hợp nào. Nhấn "+ Thêm mã tích hợp" để bắt đầu.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.875rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569' }}>
                <th style={{ padding: '0.75rem 1rem' }}>Tên tích hợp</th>
                <th style={{ padding: '0.75rem 1rem' }}>Loại</th>
                <th style={{ padding: '0.75rem 1rem' }}>Vị trí nhúng</th>
                <th style={{ padding: '0.75rem 1rem' }}>Tracking ID / Code</th>
                <th style={{ padding: '0.75rem 1rem' }}>Trạng thái</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {scripts.map((s) => (
                <tr key={s._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '0.875rem 1rem', fontWeight: 600, color: '#0f172a' }}>
                    {s.name}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <span
                      style={{
                        padding: '0.2rem 0.5rem',
                        borderRadius: '4px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: '#f1f5f9',
                        color: '#334155',
                      }}
                    >
                      {s.type.toUpperCase()}
                    </span>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', color: '#64748b', fontSize: '0.8125rem' }}>
                    {s.location === 'head' ? 'Thẻ <head>' : s.location === 'body_start' ? 'Đầu <body>' : 'Cuối <footer>'}
                  </td>
                  <td style={{ padding: '0.875rem 1rem', fontFamily: 'monospace', fontSize: '0.75rem', color: '#475569' }}>
                    {s.config.trackingId || (s.config.code ? `${s.config.code.slice(0, 35)}...` : '—')}
                  </td>
                  <td style={{ padding: '0.875rem 1rem' }}>
                    <button
                      onClick={() => handleToggleActive(s)}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '9999px',
                        border: 'none',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        backgroundColor: s.isActive ? '#dcfce7' : '#fee2e2',
                        color: s.isActive ? '#166534' : '#991b1b',
                      }}
                    >
                      {s.isActive ? 'Đang bật' : 'Đã tắt'}
                    </button>
                  </td>
                  <td style={{ padding: '0.875rem 1rem', textAlign: 'right' }}>
                    <button
                      className={styles.btnSecondary}
                      onClick={() => handleOpenEdit(s)}
                      style={{ marginRight: '0.5rem' }}
                    >
                      Sửa
                    </button>
                    <button
                      style={{
                        background: '#ffffff',
                        color: '#dc2626',
                        border: '1px solid #fecaca',
                        padding: '0.375rem 0.625rem',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        cursor: 'pointer',
                      }}
                      onClick={() => handleDelete(s)}
                    >
                      Xóa
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Thêm / Sửa Script */}
      {isModalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
            backdropFilter: 'blur(2px)',
          }}
          onClick={() => setIsModalOpen(false)}
        >
          <div
            style={{
              background: '#ffffff',
              borderRadius: '8px',
              width: '100%',
              maxWidth: '550px',
              padding: '1.5rem',
              boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 1rem 0', color: '#0f172a' }}>
              {selectedScript ? 'Chỉnh sửa mã tích hợp' : 'Thêm mã tích hợp mới'}
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                  Tên gợi nhớ *
                </label>
                <input
                  type="text"
                  required
                  className={styles.inputControl}
                  style={{ maxWidth: '100%' }}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Google Analytics Chính thức"
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Loại tích hợp *
                  </label>
                  <select
                    className={styles.inputControl}
                    style={{ maxWidth: '100%' }}
                    value={formType}
                    onChange={(e) => setFormType(e.target.value as any)}
                  >
                    <option value="ga4">Google Analytics 4 (GA4)</option>
                    <option value="gtm">Google Tag Manager (GTM)</option>
                    <option value="meta_pixel">Meta Pixel</option>
                    <option value="custom">Mã JavaScript / HTML tùy biến</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Vị trí đặt thẻ *
                  </label>
                  <select
                    className={styles.inputControl}
                    style={{ maxWidth: '100%' }}
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value as any)}
                  >
                    <option value="head">Thẻ &lt;head&gt; (Khuyên dùng)</option>
                    <option value="body_start">Đầu &lt;body&gt;</option>
                    <option value="footer">Cuối trang (&lt;footer&gt;)</option>
                  </select>
                </div>
              </div>

              {formType !== 'custom' ? (
                <div style={{ marginBottom: '1rem' }}>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    {formType === 'ga4'
                      ? 'Measurement ID * (ví dụ: G-XXXXXXXXXX)'
                      : formType === 'gtm'
                      ? 'Container ID * (ví dụ: GTM-XXXXXXX)'
                      : 'Pixel ID * (ví dụ: 1234567890)'}
                  </label>
                  <input
                    type="text"
                    required
                    className={styles.inputControl}
                    style={{ maxWidth: '100%', fontFamily: 'monospace' }}
                    value={formTrackingId}
                    onChange={(e) => setFormTrackingId(e.target.value)}
                    placeholder={formType === 'ga4' ? 'G-...' : formType === 'gtm' ? 'GTM-...' : 'Pixel ID'}
                  />
                </div>
              ) : (
                <div style={{ marginBottom: '1rem' }}>
                  <div
                    style={{
                      background: '#fffbeb',
                      border: '1px solid #fef3c7',
                      borderRadius: '4px',
                      padding: '0.5rem 0.75rem',
                      fontSize: '0.75rem',
                      color: '#92400e',
                      marginBottom: '0.5rem',
                    }}
                  >
                    Cảnh báo: Đoạn mã tùy ý sẽ chạy với quyền của website. Hãy đảm bảo nguồn đáng tin cậy.
                  </div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Nội dung mã HTML / JavaScript *
                  </label>
                  <textarea
                    required
                    rows={5}
                    className={styles.inputControl}
                    style={{ maxWidth: '100%', fontFamily: 'monospace', fontSize: '0.8125rem' }}
                    value={formCode}
                    onChange={(e) => setFormCode(e.target.value)}
                    placeholder="<script>...</script>"
                  />
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <input
                  type="checkbox"
                  id="chkActive"
                  checked={formIsActive}
                  onChange={(e) => setFormIsActive(e.target.checked)}
                />
                <label htmlFor="chkActive" style={{ fontSize: '0.875rem', color: '#334155', cursor: 'pointer' }}>
                  Kích hoạt mã này ngay lập tức
                </label>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  {selectedScript ? 'Lưu thay đổi' : 'Thêm tích hợp'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
