'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './errors.module.css';

interface ErrorItem {
  _id: string;
  errorId: string;
  title: string;
  message: string;
  category: string;
  severity: 'info' | 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'investigating' | 'resolved' | 'ignored';
  occurrenceCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  route?: string;
  requestId?: string;
  stackTrace?: string;
  resolutionNote?: string;
}

export default function SystemErrorsPage() {
  const [errors, setErrors] = useState<ErrorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [selectedError, setSelectedError] = useState<ErrorItem | null>(null);

  // Stats
  const [unresolvedCount, setUnresolvedCount] = useState(0);
  const [criticalCount, setCriticalCount] = useState(0);

  // Form states for modal
  const [newStatus, setNewStatus] = useState<string>('new');
  const [newNote, setNewNote] = useState<string>('');

  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchErrors = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (severityFilter !== 'all') params.append('severity', severityFilter);
      if (categoryFilter !== 'all') params.append('category', categoryFilter);
      if (search.trim()) params.append('search', search.trim());

      const res = await fetch(`/api/v1/system/errors?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setErrors(json.data || []);
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, [statusFilter, severityFilter, categoryFilter, search]);

  const fetchHealthStats = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/system/health');
      const json = await res.json();
      if (json.success && json.data?.errors) {
        setUnresolvedCount(json.data.errors.unresolved || 0);
        setCriticalCount(json.data.errors.critical || 0);
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchErrors();
    fetchHealthStats();
  }, [fetchErrors, fetchHealthStats]);

  const handleUpdateStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedError) return;
    try {
      const res = await fetch(`/api/v1/system/errors/${selectedError._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          note: newNote,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Đã cập nhật tiến độ xử lý sự cố');
        setSelectedError(null);
        fetchErrors();
        fetchHealthStats();
      } else {
        showToast('error', json.error?.message || 'Lỗi cập nhật');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi mạng');
    }
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev) {
      case 'critical':
        return <span className={`${styles.badge} ${styles.sevCritical}`}>Nghiêm trọng</span>;
      case 'high':
        return <span className={`${styles.badge} ${styles.sevHigh}`}>Cao</span>;
      case 'medium':
        return <span className={`${styles.badge} ${styles.sevMedium}`}>Trung bình</span>;
      default:
        return <span className={`${styles.badge} ${styles.sevLow}`}>Thấp</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'new':
        return (
          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#fee2e2', color: '#991b1b' }}>
            Mới
          </span>
        );
      case 'investigating':
        return (
          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#fef3c7', color: '#92400e' }}>
            Đang xử lý
          </span>
        );
      case 'resolved':
        return (
          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#dcfce7', color: '#166534' }}>
            Đã giải quyết
          </span>
        );
      default:
        return (
          <span style={{ padding: '0.2rem 0.5rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, backgroundColor: '#f1f5f9', color: '#475569' }}>
            Bỏ qua
          </span>
        );
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
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
            fontSize: '0.875rem',
            fontWeight: 500,
          }}
        >
          {feedback.text}
        </div>
      )}

      <div className={styles.header}>
        <h1 className={styles.title}>Giám sát & Lưu trữ lỗi hệ thống</h1>
        <p className={styles.subtitle}>
          Tự động ghi nhận, gom nhóm theo fingerprint và theo dõi tiến trình khắc phục sự cố hệ thống
        </p>
      </div>

      {/* Stats Cards */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Sự cố chưa xử lý</div>
          <div className={styles.statValue} style={{ color: unresolvedCount > 0 ? '#dc2626' : '#166534' }}>
            {unresolvedCount}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Sự cố nghiêm trọng / cao</div>
          <div className={styles.statValue} style={{ color: criticalCount > 0 ? '#b91c1c' : '#0f172a' }}>
            {criticalCount}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Tổng nhóm lỗi đã ghi nhận</div>
          <div className={styles.statValue}>{errors.length}</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="Tìm theo tiêu đề, route, ID lỗi..."
          className={styles.searchInput}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className={styles.selectInput}
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tất cả trạng thái</option>
          <option value="new">Mới</option>
          <option value="investigating">Đang xử lý</option>
          <option value="resolved">Đã giải quyết</option>
          <option value="ignored">Đã bỏ qua</option>
        </select>
        <select
          className={styles.selectInput}
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
        >
          <option value="all">Tất cả mức độ</option>
          <option value="critical">Nghiêm trọng</option>
          <option value="high">Cao</option>
          <option value="medium">Trung bình</option>
          <option value="low">Thấp</option>
        </select>
        <select
          className={styles.selectInput}
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
        >
          <option value="all">Tất cả phân loại</option>
          <option value="server">Server API</option>
          <option value="client">Client JS</option>
          <option value="database">Cơ sở dữ liệu</option>
          <option value="storage">Lưu trữ ảnh</option>
          <option value="auth">Xác thực</option>
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Đang tải...</div>
        ) : errors.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#166534', fontWeight: 500 }}>
            Hệ thống không ghi nhận sự cố nào phù hợp!
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Mã sự cố</th>
                <th>Thông điệp</th>
                <th>Phân loại</th>
                <th>Mức độ</th>
                <th>Lặp lại</th>
                <th>Lần cuối</th>
                <th>Trạng thái</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {errors.map((err) => (
                <tr key={err._id}>
                  <td>
                    <code style={{ fontWeight: 600, fontSize: '0.75rem', color: '#2563eb' }}>
                      {err.errorId}
                    </code>
                  </td>
                  <td style={{ maxWidth: '340px' }}>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>{err.title}</div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {err.route ? `Route: ${err.route}` : ''}
                    </div>
                  </td>
                  <td style={{ textTransform: 'capitalize', fontSize: '0.8125rem', color: '#475569' }}>
                    {err.category}
                  </td>
                  <td>{getSeverityBadge(err.severity)}</td>
                  <td>
                    <span
                      style={{
                        padding: '0.15rem 0.4rem',
                        borderRadius: '9999px',
                        background: '#f1f5f9',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                      }}
                    >
                      {err.occurrenceCount}x
                    </span>
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {new Date(err.lastSeenAt).toLocaleString('vi-VN')}
                  </td>
                  <td>{getStatusBadge(err.status)}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button
                      className={styles.btnSecondary}
                      onClick={() => {
                        setSelectedError(err);
                        setNewStatus(err.status);
                        setNewNote(err.resolutionNote || '');
                      }}
                    >
                      Chi tiết
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Chi tiết & Xử lý */}
      {selectedError && (
        <div className={styles.modalOverlay} onClick={() => setSelectedError(null)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
              Sự cố: {selectedError.errorId}
            </h2>
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1rem', alignItems: 'center' }}>
              {getSeverityBadge(selectedError.severity)}
              {getStatusBadge(selectedError.status)}
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                Xuất hiện {selectedError.occurrenceCount} lần (từ {new Date(selectedError.firstSeenAt).toLocaleString('vi-VN')})
              </span>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#334155', marginBottom: '0.25rem' }}>
                Thông điệp đầy đủ:
              </div>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '0.75rem', fontSize: '0.8125rem', color: '#0f172a' }}>
                {selectedError.message}
              </div>
            </div>

            {selectedError.stackTrace && (
              <div style={{ marginBottom: '1rem' }}>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#334155', marginBottom: '0.25rem' }}>
                  Stack Trace (Đã lọc dữ liệu nhạy cảm):
                </div>
                <pre
                  style={{
                    background: '#0f172a',
                    color: '#f8fafc',
                    padding: '0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    maxHeight: '200px',
                    overflowX: 'auto',
                  }}
                >
                  {selectedError.stackTrace}
                </pre>
              </div>
            )}

            <form onSubmit={handleUpdateStatus} style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1rem' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Trạng thái xử lý:
                  </label>
                  <select
                    className={styles.selectInput}
                    style={{ width: '100%' }}
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                  >
                    <option value="new">Mới</option>
                    <option value="investigating">Đang xử lý</option>
                    <option value="resolved">Đã giải quyết</option>
                    <option value="ignored">Bỏ qua có lý do</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.25rem' }}>
                    Ghi chú tiến trình / Cách khắc phục:
                  </label>
                  <input
                    type="text"
                    className={styles.searchInput}
                    style={{ width: '100%' }}
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Ví dụ: Đã cập nhật token Google Drive mới..."
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setSelectedError(null)}
                >
                  Đóng
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Lưu trạng thái
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
