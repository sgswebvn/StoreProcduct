'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import styles from './settings.module.css';

interface SettingItem {
  _id: string;
  key: string;
  value: any;
  dataType: string;
  group: string;
  label: string;
  description: string;
  defaultValue: any;
  isSecret: boolean;
  version: number;
}

interface EnvItem {
  name: string;
  description: string;
  isConfigured: boolean;
  maskedValue: string;
  target: string;
}

const GROUPS_META = [
  { id: 'general', name: '1. Cài đặt chung', desc: 'Tên hệ thống, múi giờ, ngôn ngữ và phân trang mặc định' },
  { id: 'branding', name: '2. Giao diện & Thương hiệu', desc: 'Màu nhấn chủ đạo, logo và favicon' },
  { id: 'database', name: '3. Cơ sở dữ liệu', desc: 'Cấu hình thời gian chờ và trạng thái kết nối MongoDB Atlas' },
  { id: 'storage', name: '4. Google Drive & Lưu trữ ảnh', desc: 'Giới hạn dung lượng và định dạng tệp tải lên' },
  { id: 'scripts', name: '5. Script & Tích hợp website', desc: 'Bật/tắt nạp mã nhúng và chuyển đến trình quản lý script' },
  { id: 'security', name: '6. Bảo mật & Phiên đăng nhập', desc: 'Thời hạn token JWT và kiểm soát phiên người dùng' },
  { id: 'notifications', name: '7. Email & Thông báo', desc: 'Thiết lập địa chỉ tiếp nhận cảnh báo sự cố' },
  { id: 'logs', name: '8. Nhật ký & Giám sát', desc: 'Thời hạn lưu trữ Audit Log và mức độ ghi nhận lỗi' },
  { id: 'advanced', name: '9. Cấu hình nâng cao', desc: 'Giới hạn tần suất gọi API REST và các tùy chọn hệ thống' },
];

export default function SystemSettingsPage() {
  const [activeGroup, setActiveGroup] = useState<string>('general');
  const [settingsMap, setSettingsMap] = useState<Record<string, SettingItem[]>>({});
  const [envList, setEnvList] = useState<EnvItem[]>([]);
  const [localValues, setLocalValues] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/v1/settings');
      const json = await res.json();
      if (json.success) {
        setSettingsMap(json.data.settings || {});
        setEnvList(json.data.env || []);

        // Khởi tạo local state cho form
        const initialVals: Record<string, any> = {};
        for (const grp in json.data.settings) {
          for (const item of json.data.settings[grp]) {
            initialVals[item.key] = item.value;
          }
        }
        setLocalValues(initialVals);
      } else {
        showToast('error', json.error?.message || 'Không thể tải cấu hình');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi mạng khi tải cấu hình');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const handleSaveSetting = async (item: SettingItem) => {
    setSavingKey(item.key);
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          key: item.key,
          value: localValues[item.key],
          version: item.version,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', `Đã lưu cấu hình '${item.label}' (v${json.data.version})`);
        // Cập nhật lại version cục bộ
        setSettingsMap((prev) => {
          const next = { ...prev };
          const list = next[item.group] || [];
          const idx = list.findIndex((x) => x.key === item.key);
          if (idx !== -1) {
            list[idx].version = json.data.version;
            list[idx].value = json.data.value;
          }
          return next;
        });
      } else {
        showToast('error', json.error?.message || 'Lỗi khi lưu cấu hình');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi mạng');
    } finally {
      setSavingKey(null);
    }
  };

  const handleResetDefault = async (item: SettingItem) => {
    if (!confirm(`Khôi phục '${item.label}' về giá trị mặc định?`)) return;
    try {
      const res = await fetch('/api/v1/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: item.key, action: 'reset' }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', `Đã khôi phục mặc định cho '${item.label}'`);
        fetchSettings();
      } else {
        showToast('error', json.error?.message || 'Không thể khôi phục');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi mạng');
    }
  };

  const currentMeta = GROUPS_META.find((g) => g.id === activeGroup);
  const currentSettings = settingsMap[activeGroup] || [];

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

      <div className={styles.header}>
        <h1 className={styles.title}>Cài đặt hệ thống</h1>
        <p className={styles.subtitle}>
          Quản lý toàn bộ cấu hình động trong cơ sở dữ liệu MongoDB và theo dõi biến môi trường triển khai
        </p>
      </div>

      <div className={styles.layout}>
        {/* Navigation Sidebar */}
        <div className={styles.sidebar}>
          {GROUPS_META.map((grp) => (
            <button
              key={grp.id}
              className={`${styles.tabItem} ${activeGroup === grp.id ? styles.tabItemActive : ''}`}
              onClick={() => setActiveGroup(grp.id)}
            >
              <span>{grp.name}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className={styles.contentCard}>
          <div className={styles.groupHeader}>
            <h2 className={styles.groupTitle}>{currentMeta?.name}</h2>
            <p className={styles.groupDesc}>{currentMeta?.desc}</p>
          </div>

          {activeGroup === 'scripts' && (
            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '6px',
                padding: '1rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ fontWeight: 600, color: '#1e40af', marginBottom: '0.25rem' }}>
                Quản lý mã tích hợp GA4 / GTM / Scripts
              </div>
              <p style={{ fontSize: '0.8125rem', color: '#1e3a8a', margin: '0 0 0.75rem 0' }}>
                Để thêm hoặc chỉnh sửa chi tiết các đoạn mã JavaScript, Google Tag Manager hoặc Meta Pixel, hãy truy cập trình quản lý riêng biệt.
              </p>
              <Link
                href="/settings/scripts"
                style={{
                  display: 'inline-block',
                  background: '#2563eb',
                  color: '#ffffff',
                  padding: '0.375rem 0.875rem',
                  borderRadius: '4px',
                  fontSize: '0.8125rem',
                  textDecoration: 'none',
                  fontWeight: 500,
                }}
              >
                Mở Trình Quản Lý Script &rarr;
              </Link>
            </div>
          )}

          {loading ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              Đang tải danh sách cài đặt...
            </div>
          ) : currentSettings.length === 0 ? (
            <div style={{ padding: '2rem', textAlign: 'center', color: '#64748b' }}>
              Chưa có cấu hình nào trong nhóm này
            </div>
          ) : (
            currentSettings.map((item) => (
              <div key={item.key} className={styles.settingItem}>
                <div className={styles.labelRow}>
                  <label className={styles.settingLabel}>{item.label}</label>
                  <span className={styles.versionTag}>v{item.version}</span>
                </div>
                <div className={styles.settingDesc}>{item.description}</div>

                {item.dataType === 'boolean' ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={!!localValues[item.key]}
                      onChange={(e) =>
                        setLocalValues((prev) => ({ ...prev, [item.key]: e.target.checked }))
                      }
                    />
                    <span style={{ fontSize: '0.875rem', color: '#334155' }}>
                      {localValues[item.key] ? 'Đang bật' : 'Đang tắt'}
                    </span>
                  </div>
                ) : (
                  <input
                    type={item.dataType === 'number' ? 'number' : 'text'}
                    className={styles.inputControl}
                    value={localValues[item.key] ?? ''}
                    disabled={item.isSecret}
                    onChange={(e) =>
                      setLocalValues((prev) => ({ ...prev, [item.key]: e.target.value }))
                    }
                  />
                )}

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                  <button
                    className={styles.btnPrimary}
                    disabled={savingKey === item.key || item.isSecret}
                    onClick={() => handleSaveSetting(item)}
                  >
                    {savingKey === item.key ? 'Đang lưu...' : 'Lưu cấu hình'}
                  </button>
                  <button
                    className={styles.btnSecondary}
                    onClick={() => handleResetDefault(item)}
                  >
                    Mặc định
                  </button>
                </div>
              </div>
            ))
          )}

          {/* Bảng Biến Môi Trường Triển Khai (ENV) */}
          <div className={styles.envBox}>
            <div className={styles.envTitle}>Biến môi trường triển khai (Vercel / Hosting)</div>
            <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '0 0 0.75rem 0' }}>
              Các biến hạ tầng này được bảo mật hoàn toàn: không thể ghi đè qua web admin và không lộ secret ra trình duyệt. Cập nhật tại Dashboard Vercel khi cần.
            </p>
            <table className={styles.envTable}>
              <thead>
                <tr>
                  <th>Tên biến</th>
                  <th>Mô tả</th>
                  <th>Trạng thái</th>
                  <th>Giá trị che giấu</th>
                </tr>
              </thead>
              <tbody>
                {envList.map((e) => (
                  <tr key={e.name}>
                    <td>
                      <code style={{ fontWeight: 600, color: '#0f172a' }}>{e.name}</code>
                    </td>
                    <td>{e.description}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-block',
                          padding: '0.125rem 0.375rem',
                          borderRadius: '4px',
                          fontSize: '0.6875rem',
                          fontWeight: 600,
                          backgroundColor: e.isConfigured ? '#dcfce7' : '#fee2e2',
                          color: e.isConfigured ? '#166534' : '#991b1b',
                        }}
                      >
                        {e.isConfigured ? 'Đã cấu hình' : 'Thiếu'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace', color: '#64748b' }}>{e.maskedValue}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
