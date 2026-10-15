'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './inventory.module.css';
import { useToast } from '@/components/ui/Toast';

interface InventoryItemType {
  _id: string;
  productId: {
    _id: string;
    name: string;
    sku?: string;
    price: number;
    thumbnail?: any;
  };
  locationId: {
    _id: string;
    name: string;
    code: string;
    isDefault: boolean;
  };
  quantity: number;
  reservedQuantity: number;
  dataVersion: number;
  updatedAt: string;
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItemType[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModuleDisabled, setIsModuleDisabled] = useState(false);

  // Modal điều chỉnh
  const [selectedItem, setSelectedItem] = useState<InventoryItemType | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  // Modal logs
  const [logsItem, setLogsItem] = useState<InventoryItemType | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  const toast = useToast();

  const fetchInventory = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/inventory');
      const data = await res.json();

      if (data.success) {
        setItems(data.data.items || []);
        setIsModuleDisabled(false);
      } else if (data.error?.code === 'MODULE_DISABLED') {
        setIsModuleDisabled(true);
      } else {
        toast.error(data.error?.message || 'Không thể tải dữ liệu tồn kho.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, []);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedItem) return;

    const amount = Number(adjustAmount);
    if (isNaN(amount) || amount === 0) {
      toast.warning('Vui lòng nhập số lượng thay đổi khác 0 (+ để nhập, - để xuất).');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/v1/inventory/adjust', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: selectedItem.productId._id,
          locationId: selectedItem.locationId._id,
          changeAmount: amount,
          reason: adjustReason.trim() || undefined,
          expectedVersion: selectedItem.dataVersion,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã cập nhật tồn kho thành công! (${amount > 0 ? `+${amount}` : amount})`);
        setSelectedItem(null);
        setAdjustAmount('');
        setAdjustReason('');
        fetchInventory();
      } else if (res.status === 409 || data.error?.code === 'OPTIMISTIC_LOCK_CONFLICT') {
        toast.error(data.error?.message || 'Xung đột phiên bản dữ liệu tồn kho!', {
          title: 'Cảnh báo đồng bộ',
        });
        fetchInventory();
      } else {
        toast.error(data.error?.message || 'Có lỗi xảy ra khi điều chỉnh tồn kho.');
      }
    } catch {
      toast.error('Lỗi kết nối máy chủ.');
    } finally {
      setSubmitting(false);
    }
  };

  const openLogsModal = async (item: InventoryItemType) => {
    setLogsItem(item);
    try {
      setLogsLoading(true);
      const res = await fetch(`/api/v1/inventory/${item.productId._id}`);
      const data = await res.json();
      if (data.success) {
        setLogs(data.data.logs || []);
      }
    } catch {
      toast.error('Không thể tải lịch sử biến động.');
    } finally {
      setLogsLoading(false);
    }
  };

  if (isModuleDisabled) {
    return (
      <div className={styles.container}>
        <div className="alert alert-warning">
          <div>
            <strong>MODULE TỒN KHO ĐANG TẮT:</strong> Tính năng Quản lý Kho (Inventory) hiện đang được tạm dừng trong phần quản lý Module.
          </div>
          <div style={{ marginTop: '12px' }}>
            <Link href="/modules" className="btn btn-primary btn-sm">
              Đi tới Quản lý Module để kích hoạt
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
              <line x1="12" y1="22.08" x2="12" y2="12" />
            </svg>
            Quản lý Tồn Kho (Inventory Management)
          </h1>
          <p className={styles.subtitle}>
            Kiểm soát số lượng hàng tồn, điều chỉnh xuất nhập an toàn với Optimistic Concurrency Control và nhật ký biến động kho bắt buộc.
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Sản phẩm</th>
                <th>Mã SKU</th>
                <th>Kho lưu trữ</th>
                <th>Tồn thực tế</th>
                <th>Phiên bản</th>
                <th>Cập nhật gần nhất</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '40px 0' }}>Đang tải dữ liệu kho...</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ color: 'var(--text-secondary)' }}>Chưa có bản ghi tồn kho nào.</div>
                  </td>
                </tr>
              ) : (
                items.map((it) => (
                  <tr key={it._id}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={it.productId?.thumbnail ? `/api/v1/media/${it.productId.thumbnail._id}/view` : ''}
                          alt=""
                          className={styles.thumbImg}
                          onError={(e) => { (e.target as HTMLElement).style.display = 'none'; }}
                        />
                        <strong>{it.productId?.name || 'Sản phẩm'}</strong>
                      </div>
                    </td>
                    <td><code>{it.productId?.sku || 'N/A'}</code></td>
                    <td>
                      <span>{it.locationId?.name}</span>
                      {it.locationId?.isDefault && (
                        <span style={{ fontSize: '0.6875rem', color: '#0284c7', marginLeft: '6px' }}>(Mặc định)</span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.qtyBadge} ${it.quantity === 0 ? styles.qtyLow : ''}`}>
                        {it.quantity.toLocaleString('vi-VN')}
                      </span>
                    </td>
                    <td>
                      <code style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>v{it.dataVersion}</code>
                    </td>
                    <td style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                      {new Date(it.updatedAt).toLocaleString('vi-VN')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          className="btn btn-primary btn-sm"
                          onClick={() => {
                            setSelectedItem(it);
                            setAdjustAmount('');
                            setAdjustReason('');
                          }}
                        >
                          ± Điều chỉnh
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => openLogsModal(it)}
                        >
                          Lịch sử biến động
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Điều chỉnh Tồn kho */}
      {selectedItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                Điều chỉnh tồn kho: {selectedItem.productId.name}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedItem(null)}>
                ✕
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit}>
              <div className={styles.modalBody}>
                <div style={{ background: '#f8fafc', padding: '12px 16px', borderRadius: '6px', marginBottom: '16px' }}>
                  <div>Kho: <strong>{selectedItem.locationId.name}</strong></div>
                  <div>Số lượng hiện tại: <strong style={{ fontSize: '1.125rem', color: 'var(--color-primary)' }}>{selectedItem.quantity}</strong></div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Phiên bản đồng bộ: v{selectedItem.dataVersion}</div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="adj-amount">
                    Số lượng thay đổi (+ để nhập thêm, - để xuất bớt) <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    id="adj-amount"
                    type="number"
                    step="1"
                    className="form-input"
                    placeholder="Ví dụ: +15 hoặc -5"
                    value={adjustAmount}
                    onChange={(e) => setAdjustAmount(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="adj-reason">
                    Lý do điều chỉnh (Bắt buộc lưu vết kiểm toán)
                  </label>
                  <input
                    id="adj-reason"
                    type="text"
                    className="form-input"
                    placeholder="Ví dụ: Nhập hàng nhà cung cấp, Kiểm kê cuối tháng, Hàng lỗi..."
                    value={adjustReason}
                    onChange={(e) => setAdjustReason(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button type="button" className="btn btn-secondary" onClick={() => setSelectedItem(null)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? 'Đang lưu...' : 'Lưu điều chỉnh'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Lịch sử biến động kho (Audit Logs) */}
      {logsItem && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '680px' }}>
            <div className={styles.modalHeader}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>
                Nhật ký biến động tồn kho: {logsItem.productId.name}
              </h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setLogsItem(null)}>
                ✕
              </button>
            </div>

            <div className={styles.modalBody} style={{ maxHeight: '60vh', overflowY: 'auto' }}>
              {logsLoading ? (
                <div style={{ textAlign: 'center', padding: '30px 0' }}>Đang tải lịch sử...</div>
              ) : logs.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 0', color: 'var(--text-secondary)' }}>
                  Chưa có lượt biến động kho nào được ghi nhận.
                </div>
              ) : (
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Thời gian</th>
                      <th>Thao tác</th>
                      <th>Số lượng</th>
                      <th>Tồn sau đó</th>
                      <th>Lý do</th>
                    </tr>
                  </thead>
                  <tbody>
                    {logs.map((l) => (
                      <tr key={l._id}>
                        <td style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                          {new Date(l.createdAt).toLocaleString('vi-VN')}
                        </td>
                        <td><code>{l.action}</code></td>
                        <td>
                          <span style={{ fontWeight: 700, color: l.quantityChange > 0 ? '#059669' : '#dc2626' }}>
                            {l.quantityChange > 0 ? `+${l.quantityChange}` : l.quantityChange}
                          </span>
                        </td>
                        <td><strong>{l.newQuantity}</strong></td>
                        <td style={{ fontSize: '0.8125rem' }}>{l.reason || '---'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className={styles.modalFooter}>
              <button type="button" className="btn btn-secondary" onClick={() => setLogsItem(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
