'use client';

import React, { useState, useEffect } from 'react';
import styles from './modules.module.css';
import { useToast } from '@/components/ui/Toast';

interface ModuleItem {
  id: string;
  name: string;
  description: string;
  version: string;
  isCore: boolean;
  enabled: boolean;
  icon: string;
  navGroup: string;
  dependencies?: string[];
  dependentModules?: string[];
}

export default function ModulesPage() {
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const toast = useToast();

  const fetchModules = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/v1/modules');
      const data = await res.json();
      if (data.success) {
        setModules(data.data.items || []);
      } else {
        toast.error(data.error?.message || 'Không thể tải danh sách module.');
      }
    } catch {
      toast.error('Lỗi kết nối khi tải danh sách module.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModules();
  }, []);

  const handleToggle = async (mod: ModuleItem) => {
    if (mod.isCore) {
      toast.warning('Module cốt lõi của hệ thống không thể tắt.');
      return;
    }

    const nextState = !mod.enabled;
    try {
      setTogglingId(mod.id);
      const res = await fetch(`/api/v1/modules/${mod.id}/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: nextState }),
      });
      const data = await res.json();

      if (data.success) {
        toast.success(
          nextState
            ? `Đã kích hoạt module "${mod.name}" thành công!`
            : `Đã tắt module "${mod.name}".`
        );
        setModules((prev) =>
          prev.map((m) => (m.id === mod.id ? { ...m, enabled: nextState } : m))
        );
      } else {
        toast.error(data.error?.message || 'Không thể thay đổi trạng thái module.');
      }
    } catch {
      toast.error('Lỗi kết nối khi cập nhật module.');
    } finally {
      setTogglingId(null);
    }
  };

  const totalCount = modules.length;
  const activeCount = modules.filter((m) => m.enabled).length;
  const coreCount = modules.filter((m) => m.isCore).length;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l9 4.9V17L12 22l-9-4.9V7z" />
            <path d="M12 22V12M12 12L3 7M12 12l9-5" />
          </svg>
          Kiến trúc & Quản lý Module
        </h1>
        <p className={styles.subtitle}>
          Quản lý toàn bộ module tính năng độc lập, kiến trúc mở rộng và kiểm soát phụ thuộc an toàn theo chuẩn WordPress Core & Plugin System.
        </p>
      </div>

      {/* Thống kê nhanh */}
      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Tổng số Module</div>
          <div className={styles.statValue}>{loading ? '...' : totalCount}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Đang kích hoạt</div>
          <div className={styles.statValue} style={{ color: '#059669' }}>
            {loading ? '...' : activeCount}
          </div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Module cốt lõi (Core)</div>
          <div className={styles.statValue} style={{ color: '#0284c7' }}>
            {loading ? '...' : coreCount}
          </div>
        </div>
      </div>

      {/* Lưới các Module */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--text-secondary)' }}>
          Đang tải dữ liệu module...
        </div>
      ) : (
        <div className={styles.modulesGrid}>
          {modules.map((mod) => (
            <div
              key={mod.id}
              className={`${styles.moduleCard} ${!mod.enabled ? styles.moduleCardDisabled : ''}`}
            >
              <div>
                <div className={styles.cardHeader}>
                  <div className={styles.cardTitleGroup}>
                    <div className={styles.iconWrapper}>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" rx="1" />
                        <rect x="14" y="3" width="7" height="7" rx="1" />
                        <rect x="3" y="14" width="7" height="7" rx="1" />
                        <rect x="14" y="14" width="7" height="7" rx="1" />
                      </svg>
                    </div>
                    <div>
                      <div className={styles.moduleName}>{mod.name}</div>
                      <div className={styles.moduleVersion}>v{mod.version} • {mod.id}</div>
                    </div>
                  </div>
                </div>

                <div className={styles.cardBody}>
                  <p className={styles.moduleDesc}>{mod.description}</p>
                  <div className={styles.metaRow}>
                    {mod.isCore ? (
                      <span className={styles.badgeCore}>Hệ thống cốt lõi</span>
                    ) : (
                      <span className={styles.badgeOptional}>Mở rộng tùy chọn</span>
                    )}

                    {mod.dependencies && mod.dependencies.length > 0 && (
                      <span className={styles.dependencyTag}>
                        Phụ thuộc: {mod.dependencies.join(', ')}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className={styles.cardFooter}>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                  {mod.isCore
                    ? 'Bắt buộc luôn hoạt động'
                    : mod.enabled
                    ? 'Sẵn sàng phục vụ'
                    : 'Đã tạm ngưng'}
                </div>

                <label className={styles.switchLabel}>
                  <input
                    type="checkbox"
                    className={styles.switchInput}
                    checked={mod.enabled}
                    disabled={mod.isCore || togglingId === mod.id}
                    onChange={() => handleToggle(mod)}
                  />
                  <span
                    className={styles.switchStatusText}
                    style={{ color: mod.enabled ? '#059669' : '#64748b' }}
                  >
                    {mod.enabled ? 'Bật' : 'Tắt'}
                  </span>
                </label>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
