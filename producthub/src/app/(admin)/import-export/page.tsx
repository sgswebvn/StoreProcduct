'use client';

import React, { useState, useEffect } from 'react';
import styles from './import-export.module.css';
import { useToast } from '@/components/ui/Toast';

export default function ImportExportPage() {
  const [activeTab, setActiveTab] = useState<'import' | 'export' | 'logs'>('import');
  const [file, setFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [importResult, setImportResult] = useState<any>(null);

  // Export filters
  const [exportStatus, setExportStatus] = useState<string>('');
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const toast = useToast();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;
    setFile(selected);
    setPreviewData(null);
    setImportResult(null);

    // Tự động phân tích file
    const formData = new FormData();
    formData.append('file', selected);

    try {
      setAnalyzing(true);
      const res = await fetch('/api/v1/import/preview', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setPreviewData(data.data);
        toast.success(`Đã phân tích ${data.data.totalRows} dòng từ file!`);
      } else {
        toast.error(data.error?.message || 'Không thể đọc file CSV.');
      }
    } catch {
      toast.error('Lỗi khi tải file lên máy chủ.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleExecuteImport = async () => {
    if (!previewData || !previewData.rows) return;

    try {
      setExecuting(true);
      const res = await fetch('/api/v1/import/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: file?.name || 'import.csv',
          rows: previewData.rows,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setImportResult(data.data);
        toast.success(`Nhập dữ liệu hoàn tất! Thành công: ${data.data.successCount}, Lỗi: ${data.data.errorCount}`);
        setPreviewData(null);
      } else {
        toast.error(data.error?.message || 'Có lỗi xảy ra khi nhập dữ liệu.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setExecuting(false);
    }
  };

  const handleDownloadSample = () => {
    const sampleHeaders = 'name,sku,price,originalPrice,shortDescription,status,tags\n';
    const sampleRow1 = '"Áo Thun Cotton Basic 100%","AT-COTTON-01",189000,250000,"Áo phông nam nữ thoáng mát","active","thoitrang,aothun"\n';
    const sampleRow2 = '"Quần Jean Slimfit Nam","QJ-SLIM-01",450000,550000,"Chất liệu co giãn cao cấp","draft","thoitrang,quanjean"\n';
    const blob = new Blob(['\uFEFF' + sampleHeaders + sampleRow1 + sampleRow2], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'mau_nhap_san_pham_storeproduct.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const fetchLogs = async () => {
    try {
      setLogsLoading(true);
      const res = await fetch('/api/v1/import/logs');
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.items || []);
      }
    } catch {
      toast.error('Lỗi khi tải lịch sử import.');
    } finally {
      setLogsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'logs') {
      fetchLogs();
    }
  }, [activeTab]);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Nhập & Xuất Dữ Liệu Sản Phẩm (Batch CSV/Excel)
        </h1>
        <p className={styles.subtitle}>
          Nhập hàng loạt sản phẩm từ file CSV (tự động phân biệt tạo mới hoặc cập nhật theo SKU) và xuất dữ liệu chuẩn UTF-8 tương thích Excel.
        </p>
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'import' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('import')}
        >
          Nhập dữ liệu (Import CSV)
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'export' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('export')}
        >
          Xuất dữ liệu (Export CSV)
        </button>
        <button
          type="button"
          className={`${styles.tabBtn} ${activeTab === 'logs' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('logs')}
        >
          Lịch sử nhập dữ liệu
        </button>
      </div>

      {/* Tab 1: Import */}
      {activeTab === 'import' && (
        <div>
          <div className={styles.card}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div className={styles.cardTitle}>Tải lên file CSV sản phẩm</div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleDownloadSample}
              >
                Tải file CSV mẫu chuẩn
              </button>
            </div>

            <label className={styles.uploadZone}>
              <input
                type="file"
                accept=".csv"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--color-primary)', margin: '0 auto 12px' }}>
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="12" y1="18" x2="12" y2="12" />
                <line x1="9" y1="15" x2="15" y2="15" />
              </svg>
              <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
                {file ? file.name : 'Bấm để chọn file CSV hoặc kéo thả vào đây'}
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                Hỗ trợ định dạng .csv UTF-8, tối đa 5.000 dòng mỗi lần nhập
              </div>
            </label>

            {analyzing && (
              <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--color-primary)' }}>
                Đang phân tích cấu trúc và kiểm tra dữ liệu file CSV...
              </div>
            )}
          </div>

          {/* Bảng xem trước dữ liệu (Preview) */}
          {previewData && (
            <div className={styles.card}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div className={styles.cardTitle}>Xem trước & Đánh giá dữ liệu</div>
                <button
                  type="button"
                  className="btn btn-primary"
                  disabled={executing || previewData.validCount === 0}
                  onClick={handleExecuteImport}
                >
                  {executing ? 'Đang nhập...' : `Tiến hành nhập ${previewData.validCount} sản phẩm`}
                </button>
              </div>

              <div className={styles.previewStats}>
                <div className={`${styles.statBadge} ${styles.statInfo}`}>
                  Tổng số dòng: {previewData.totalRows}
                </div>
                <div className={`${styles.statBadge} ${styles.statSuccess}`}>
                  Hợp lệ: {previewData.validCount} dòng
                </div>
                {previewData.invalidCount > 0 && (
                  <div className={`${styles.statBadge} ${styles.statDanger}`}>
                    Có lỗi: {previewData.invalidCount} dòng
                  </div>
                )}
              </div>

              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Dòng</th>
                      <th>Thao tác</th>
                      <th>Tên sản phẩm</th>
                      <th>Mã SKU</th>
                      <th>Giá bán</th>
                      <th>Trạng thái</th>
                      <th>Ghi chú / Lỗi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.rows.slice(0, 100).map((r: any) => (
                      <tr key={r.rowNumber} style={{ background: !r.isValid ? '#fef2f2' : undefined }}>
                        <td>#{r.rowNumber}</td>
                        <td>
                          <span className={r.action === 'create' ? styles.badgeCreate : styles.badgeUpdate}>
                            {r.action === 'create' ? '+ Tạo mới' : '↻ Cập nhật'}
                          </span>
                        </td>
                        <td>
                          <strong>{r.name || '---'}</strong>
                        </td>
                        <td>
                          <code>{r.sku || 'N/A'}</code>
                        </td>
                        <td>{r.price?.toLocaleString('vi-VN')} đ</td>
                        <td>{r.status}</td>
                        <td>
                          {r.errors.length > 0 ? (
                            <span className={styles.errorText}>{r.errors.join(', ')}</span>
                          ) : (
                            <span style={{ color: '#059669', fontSize: '0.75rem' }}>✓ Hợp lệ</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {previewData.rows.length > 100 && (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                  * Đang hiển thị trước 100 dòng đầu tiên của file.
                </div>
              )}
            </div>
          )}

          {/* Báo cáo kết quả sau khi thực thi */}
          {importResult && (
            <div className="alert alert-success" style={{ marginBottom: '24px' }}>
              <div>
                <strong>KẾT QUẢ NHẬP DỮ LIỆU:</strong>
                <ul>
                  <li>Tổng số dòng xử lý: {importResult.totalRows}</li>
                  <li>Tạo mới thành công: {importResult.createdCount} sản phẩm</li>
                  <li>Cập nhật theo SKU: {importResult.updatedCount} sản phẩm</li>
                  {importResult.errorCount > 0 && (
                    <li style={{ color: '#dc2626' }}>Số dòng lỗi bỏ qua: {importResult.errorCount}</li>
                  )}
                </ul>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Export */}
      {activeTab === 'export' && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Xuất dữ liệu Catalog sản phẩm</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginBottom: '20px' }}>
            File xuất ra ở định dạng CSV tiêu chuẩn quốc tế UTF-8 BOM, hỗ trợ hiển thị tiếng Việt hoàn hảo trên mọi phiên bản Microsoft Excel, Google Sheets và Apple Numbers.
          </p>

          <div style={{ maxWidth: '400px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Lọc theo trạng thái</label>
              <select
                className="form-select"
                value={exportStatus}
                onChange={(e) => setExportStatus(e.target.value)}
              >
                <option value="">Tất cả trạng thái (Hoạt động, Nháp, Lưu trữ)</option>
                <option value="active">Chỉ sản phẩm đang bán (Active)</option>
                <option value="draft">Chỉ bản nháp (Draft)</option>
                <option value="archived">Chỉ sản phẩm lưu trữ (Archived)</option>
              </select>
            </div>

            <a
              href={`/api/v1/export/products${exportStatus ? `?status=${exportStatus}` : ''}`}
              className="btn btn-primary"
              style={{ textAlign: 'center', textDecoration: 'none' }}
              download
            >
              📥 Tải xuống file CSV sản phẩm
            </a>
          </div>
        </div>
      )}

      {/* Tab 3: Logs */}
      {activeTab === 'logs' && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Lịch sử các đợt nhập dữ liệu</div>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Tên file</th>
                  <th>Thời gian</th>
                  <th>Tổng số dòng</th>
                  <th>Tạo mới</th>
                  <th>Cập nhật</th>
                  <th>Lỗi</th>
                </tr>
              </thead>
              <tbody>
                {logsLoading ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px 0' }}>Đang tải lịch sử...</td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '30px 0' }}>Chưa có lịch sử nhập dữ liệu nào.</td>
                  </tr>
                ) : (
                  logs.map((log) => (
                    <tr key={log._id}>
                      <td><strong>{log.fileName}</strong></td>
                      <td>{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                      <td>{log.totalRows}</td>
                      <td style={{ color: '#059669', fontWeight: 600 }}>+{log.createdCount}</td>
                      <td style={{ color: '#2563eb', fontWeight: 600 }}>↻ {log.updatedCount}</td>
                      <td>
                        {log.errorCount > 0 ? (
                          <span style={{ color: '#dc2626', fontWeight: 600 }}>{log.errorCount} lỗi</span>
                        ) : (
                          <span style={{ color: '#059669' }}>0 lỗi</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
