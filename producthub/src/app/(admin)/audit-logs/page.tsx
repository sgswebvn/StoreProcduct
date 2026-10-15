'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './audit-logs.module.css';

interface AuditLogItem {
  _id: string;
  actorEmailSnapshot?: string;
  actorNameSnapshot?: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  timestamp: string;
  result: 'success' | 'failure';
  summary: string;
  ipAddress?: string;
  changes?: Record<string, any>;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Filters
  const [resourceType, setResourceType] = useState('all');
  const [resultFilter, setResultFilter] = useState('all');
  const [actorSearch, setActorSearch] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLogItem | null>(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '20');
      if (resourceType !== 'all') params.append('resourceType', resourceType);
      if (resultFilter !== 'all') params.append('result', resultFilter);
      if (actorSearch.trim()) params.append('actor', actorSearch.trim());

      const res = await fetch(`/api/v1/audit-logs?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLogs(json.data || []);
        if (json.meta) {
          setTotalPages(json.meta.totalPages || 1);
          setTotalCount(json.meta.total || 0);
        }
      }
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  }, [page, resourceType, resultFilter, actorSearch]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>Nhật ký hoạt động hệ thống</h1>
          <p className={styles.subtitle}>
            Theo dõi ai đã làm gì, với đối tượng nào, vào thời điểm nào và kết quả ra sao (Tổng cộng: {totalCount} sự kiện)
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className={styles.filterBar}>
        <input
          type="text"
          placeholder="Tìm theo người thực hiện (email, tên)..."
          className={styles.searchInput}
          value={actorSearch}
          onChange={(e) => {
            setActorSearch(e.target.value);
            setPage(1);
          }}
        />
        <select
          className={styles.selectInput}
          value={resourceType}
          onChange={(e) => {
            setResourceType(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Tất cả tài nguyên</option>
          <option value="user">Người dùng (User)</option>
          <option value="product">Sản phẩm (Product)</option>
          <option value="setting">Cài đặt (Setting)</option>
          <option value="script">Mã Script</option>
          <option value="media">Media / Drive</option>
          <option value="inventory">Tồn kho</option>
          <option value="auth">Xác thực</option>
        </select>
        <select
          className={styles.selectInput}
          value={resultFilter}
          onChange={(e) => {
            setResultFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="all">Tất cả kết quả</option>
          <option value="success">Thành công</option>
          <option value="failure">Thất bại</option>
        </select>
      </div>

      {/* Table */}
      <div className={styles.tableCard}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Đang tải nhật ký...
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>
            Không tìm thấy bản ghi nhật ký phù hợp
          </div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Thời gian</th>
                <th>Người thực hiện</th>
                <th>Hành động</th>
                <th>Tài nguyên</th>
                <th>Mô tả sự kiện</th>
                <th>Kết quả</th>
                <th style={{ textAlign: 'right' }}>Chi tiết</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log._id}>
                  <td style={{ fontSize: '0.8125rem', color: '#64748b', whiteSpace: 'nowrap' }}>
                    {new Date(log.timestamp).toLocaleString('vi-VN')}
                  </td>
                  <td>
                    <div style={{ fontWeight: 600, color: '#0f172a' }}>
                      {log.actorNameSnapshot || 'Hệ thống'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                      {log.actorEmailSnapshot || log.ipAddress || '—'}
                    </div>
                  </td>
                  <td>
                    <code
                      style={{
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px',
                        background: '#f1f5f9',
                        fontSize: '0.75rem',
                        color: '#334155',
                      }}
                    >
                      {log.action}
                    </code>
                  </td>
                  <td style={{ textTransform: 'capitalize', color: '#475569' }}>
                    {log.resourceType}
                  </td>
                  <td style={{ maxWidth: '320px', color: '#1e293b' }}>
                    {log.summary}
                  </td>
                  <td>
                    <span
                      style={{
                        display: 'inline-block',
                        padding: '0.2rem 0.5rem',
                        borderRadius: '9999px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        backgroundColor: log.result === 'success' ? '#dcfce7' : '#fee2e2',
                        color: log.result === 'success' ? '#166534' : '#991b1b',
                      }}
                    >
                      {log.result === 'success' ? 'Thành công' : 'Thất bại'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    {log.changes && Object.keys(log.changes).length > 0 ? (
                      <button
                        className={styles.btnSecondary}
                        onClick={() => setSelectedLog(log)}
                      >
                        Xem thay đổi
                      </button>
                    ) : (
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8' }}>—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className={styles.pagination}>
            <button
              className={styles.pageBtn}
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              &larr; Trang trước
            </button>
            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>
              Trang {page} / {totalPages}
            </span>
            <button
              className={styles.pageBtn}
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Trang sau &rarr;
            </button>
          </div>
        )}
      </div>

      {/* Modal Chi tiết thay đổi */}
      {selectedLog && (
        <div
          className={styles.modalOverlay}
          onClick={() => setSelectedLog(null)}
        >
          <div
            className={styles.modalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 0.5rem 0', color: '#0f172a' }}>
              Chi tiết sự kiện: {selectedLog.action}
            </h2>
            <p style={{ fontSize: '0.8125rem', color: '#64748b', margin: '0 0 1rem 0' }}>
              Thời gian: {new Date(selectedLog.timestamp).toLocaleString('vi-VN')} | Người thực hiện: {selectedLog.actorEmailSnapshot || 'Hệ thống'}
            </p>
            <div style={{ marginBottom: '1rem', fontWeight: 600, fontSize: '0.875rem' }}>
              Dữ liệu thay đổi (Đã lọc dữ liệu nhạy cảm):
            </div>
            <pre
              style={{
                background: '#0f172a',
                color: '#f8fafc',
                padding: '1rem',
                borderRadius: '6px',
                fontSize: '0.8125rem',
                overflowX: 'auto',
                maxHeight: '360px',
              }}
            >
              {JSON.stringify(selectedLog.changes, null, 2)}
            </pre>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1.25rem' }}>
              <button
                className={styles.btnSecondary}
                onClick={() => setSelectedLog(null)}
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
