'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './dashboard.module.css';

interface DashboardStats {
  counts: {
    products: {
      total: number;
      active: number;
      draft: number;
      archived: number;
      recent7Days: number;
    };
    media: {
      total: number;
    };
    users: {
      total: number;
    };
  };
  health: {
    database: 'healthy' | 'disconnected';
    storage: 'configured' | 'not_configured';
    systemStatus: 'healthy' | 'warning' | 'incident';
  };
  errors: {
    unresolved: number;
    critical: number;
  };
  recentActivities: Array<{
    _id: string;
    action: string;
    summary: string;
    actorNameSnapshot?: string;
    actorEmailSnapshot?: string;
    timestamp: string;
    result: string;
  }>;
  recentErrors: Array<{
    _id: string;
    errorId: string;
    title: string;
    severity: string;
    status: string;
    occurrenceCount: number;
    lastSeenAt: string;
  }>;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchStats = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/v1/dashboard/stats');
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      } else {
        setErrorMsg(json.error?.message || 'Không thể tải dữ liệu bảng điều khiển');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Lỗi kết nối máy chủ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className={styles.container}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ height: '28px', width: '240px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '8px' }} />
          <div style={{ height: '16px', width: '380px', background: '#f1f5f9', borderRadius: '4px' }} />
        </div>
        <div className={styles.statsGrid}>
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
          <div className={styles.skeletonCard} />
        </div>
      </div>
    );
  }

  if (errorMsg || !data) {
    return (
      <div className={styles.container} style={{ textAlign: 'center', padding: '4rem 1rem' }}>
        <h2 style={{ color: '#dc2626', marginBottom: '0.5rem' }}>Không thể tải bảng điều khiển</h2>
        <p style={{ color: '#64748b', marginBottom: '1.5rem' }}>{errorMsg}</p>
        <button
          onClick={fetchStats}
          style={{
            background: '#2563eb',
            color: '#ffffff',
            padding: '0.5rem 1.25rem',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
          }}
        >
          Thử lại
        </button>
      </div>
    );
  }

  const { counts, health, errors, recentActivities, recentErrors } = data;

  const totalProducts = counts.products.total || 0;
  const activePercent = totalProducts ? Math.round((counts.products.active / totalProducts) * 100) : 0;
  const draftPercent = totalProducts ? Math.round((counts.products.draft / totalProducts) * 100) : 0;
  const archivedPercent = totalProducts ? 100 - activePercent - draftPercent : 0;

  return (
    <div className={styles.container}>
      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Bảng điều khiển Tổng quan</h1>
          <p>Dữ liệu hệ thống thời gian thực từ MongoDB Atlas & Dịch vụ liên kết</p>
        </div>
        <button
          onClick={fetchStats}
          style={{
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            padding: '0.4rem 0.875rem',
            borderRadius: '6px',
            fontSize: '0.8125rem',
            cursor: 'pointer',
            fontWeight: 500,
            color: '#334155',
          }}
        >
          Làm mới số liệu
        </button>
      </div>

      {/* System Health Banner */}
      <div
        className={`${styles.healthBanner} ${
          health.systemStatus === 'healthy'
            ? styles.healthBanner_healthy
            : health.systemStatus === 'warning'
            ? styles.healthBanner_warning
            : styles.healthBanner_incident
        }`}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span
            className={`${styles.healthDot} ${
              health.systemStatus === 'healthy'
                ? styles.dot_green
                : health.systemStatus === 'warning'
                ? styles.dot_yellow
                : styles.dot_red
            }`}
          />
          <strong>
            {health.systemStatus === 'healthy'
              ? 'Hệ thống hoạt động bình thường'
              : health.systemStatus === 'warning'
              ? 'Hệ thống có cảnh báo cần lưu ý'
              : 'Hệ thống đang gặp sự cố'}
          </strong>
        </div>
        <div className={styles.healthServices}>
          <div>
            MongoDB Atlas:{' '}
            <span style={{ fontWeight: 600 }}>
              {health.database === 'healthy' ? 'Đã kết nối' : 'Mất kết nối'}
            </span>
          </div>
          <div>
            Google Drive:{' '}
            <span style={{ fontWeight: 600 }}>
              {health.storage === 'configured' ? 'Đã xác thực' : 'Chưa cấu hình'}
            </span>
          </div>
          <div>
            Sự cố mở:{' '}
            <span style={{ fontWeight: 600 }}>{errors.unresolved} sự cố</span>
          </div>
        </div>
      </div>

      {/* 4 Cards Chỉ số Tổng quan */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Tổng số sản phẩm</div>
          <div className={styles.statValue}>{counts.products.total}</div>
          <div className={styles.statSub}>
            <span style={{ color: '#166534', fontWeight: 600 }}>{counts.products.active} đang hoạt động</span> · {counts.products.recent7Days} tạo tuần này
          </div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Thư viện Media & Tệp</div>
          <div className={styles.statValue}>{counts.media.total}</div>
          <div className={styles.statSub}>Đồng bộ Google Drive an toàn</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Tài khoản người dùng</div>
          <div className={styles.statValue}>{counts.users.total}</div>
          <div className={styles.statSub}>Phân quyền RBAC đa cấp độ</div>
        </div>

        <div className={styles.statCard}>
          <div className={styles.statLabel}>Sự cố chưa xử lý</div>
          <div
            className={styles.statValue}
            style={{ color: errors.unresolved > 0 ? '#dc2626' : '#166534' }}
          >
            {errors.unresolved}
          </div>
          <div className={styles.statSub}>
            {errors.critical > 0 ? (
              <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                {errors.critical} lỗi nghiêm trọng!
              </span>
            ) : (
              'Không có lỗi nghiêm trọng'
            )}
          </div>
        </div>
      </div>

      {/* Grid 2 Cột */}
      <div className={styles.mainGrid}>
        {/* Cột Trái: Trạng thái sản phẩm & Hoạt động quản trị */}
        <div>
          {/* Card Phân bổ Trạng thái Sản phẩm */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <span>Phân bổ trạng thái sản phẩm ({totalProducts} tổng cộng)</span>
              <Link href="/products" style={{ fontSize: '0.8125rem', color: '#2563eb', textDecoration: 'none' }}>
                Quản lý sản phẩm &rarr;
              </Link>
            </div>
            {totalProducts > 0 ? (
              <>
                <div className={styles.distBar}>
                  <div style={{ width: `${activePercent}%`, background: '#22c55e' }} title={`Hoạt động: ${counts.products.active}`} />
                  <div style={{ width: `${draftPercent}%`, background: '#eab308' }} title={`Bản nháp: ${counts.products.draft}`} />
                  <div style={{ width: `${archivedPercent}%`, background: '#94a3b8' }} title={`Lưu trữ: ${counts.products.archived}`} />
                </div>
                <div className={styles.distLegend}>
                  <div className={styles.legendItem}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#22c55e' }} />
                    <span>Hoạt động: {counts.products.active} ({activePercent}%)</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#eab308' }} />
                    <span>Bản nháp: {counts.products.draft} ({draftPercent}%)</span>
                  </div>
                  <div className={styles.legendItem}>
                    <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#94a3b8' }} />
                    <span>Lưu trữ: {counts.products.archived} ({archivedPercent}%)</span>
                  </div>
                </div>
              </>
            ) : (
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
                Chưa có sản phẩm nào trong cơ sở dữ liệu.{' '}
                <Link href="/products" style={{ color: '#2563eb' }}>
                  Thêm sản phẩm ngay
                </Link>
              </p>
            )}
          </div>

          {/* Card Nhật ký hoạt động gần nhất */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <span>Hoạt động quản trị gần nhất</span>
              <Link href="/audit-logs" style={{ fontSize: '0.8125rem', color: '#2563eb', textDecoration: 'none' }}>
                Toàn bộ nhật ký &rarr;
              </Link>
            </div>
            {recentActivities.length === 0 ? (
              <p style={{ color: '#64748b', fontSize: '0.875rem', margin: 0 }}>
                Chưa có ghi nhận hoạt động nào.
              </p>
            ) : (
              <div className={styles.activityList}>
                {recentActivities.map((act) => (
                  <div key={act._id} className={styles.activityItem}>
                    <div>
                      <div className={styles.activityTitle}>{act.summary}</div>
                      <div className={styles.activityMeta}>
                        Bởi {act.actorNameSnapshot || act.actorEmailSnapshot || 'Hệ thống'} · Hành động:{' '}
                        <code style={{ fontSize: '0.75rem', color: '#475569' }}>{act.action}</code>
                      </div>
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap' }}>
                      {new Date(act.timestamp).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Cột Phải: Sự cố hệ thống cần chú ý & Lối tắt */}
        <div>
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <span>Sự cố cần giải quyết</span>
              <Link href="/system/errors" style={{ fontSize: '0.8125rem', color: '#2563eb', textDecoration: 'none' }}>
                Chi tiết &rarr;
              </Link>
            </div>
            {recentErrors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '1.5rem 0', color: '#166534', fontSize: '0.875rem' }}>
                Hệ thống ổn định, không có sự cố chưa xử lý!
              </div>
            ) : (
              <div className={styles.activityList}>
                {recentErrors.map((err) => (
                  <div key={err._id} className={styles.activityItem}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#991b1b' }}>
                        {err.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
                        Mã: {err.errorId} · Lặp lại {err.occurrenceCount}x
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Lối tắt quản trị nhanh */}
          <div className={styles.card}>
            <div className={styles.cardTitle}>
              <span>Lối tắt quản trị</span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <Link
                href="/settings"
                style={{
                  display: 'block',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#1e293b',
                  fontSize: '0.8125rem',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Cài đặt hệ thống (9 nhóm) &rarr;
              </Link>
              <Link
                href="/settings/scripts"
                style={{
                  display: 'block',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#1e293b',
                  fontSize: '0.8125rem',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Quản lý GA4 & Scripts &rarr;
              </Link>
              <Link
                href="/users"
                style={{
                  display: 'block',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#1e293b',
                  fontSize: '0.8125rem',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Người dùng & Phân quyền RBAC &rarr;
              </Link>
              <Link
                href="/system/errors"
                style={{
                  display: 'block',
                  padding: '0.625rem 0.75rem',
                  borderRadius: '6px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  color: '#1e293b',
                  fontSize: '0.8125rem',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Giám sát lỗi & Fingerprint &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
