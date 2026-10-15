'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './users.module.css';

interface UserItem {
  _id: string;
  name: string;
  email: string;
  role: string;
  status: 'active' | 'inactive' | 'suspended';
  additionalPermissions: string[];
  lastLoginAt?: string;
  createdAt: string;
}

interface RoleItem {
  id: string;
  name: string;
  description: string;
  permissions: string[];
}

export default function UsersManagementPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'roles'>('users');
  const [users, setUsers] = useState<UserItem[]>([]);
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  // Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isResetPassOpen, setIsResetPassOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserItem | null>(null);

  // Form states
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [formPassword, setFormPassword] = useState('');
  const [formRole, setFormRole] = useState('viewer');
  const [formStatus, setFormStatus] = useState<'active' | 'inactive' | 'suspended'>('active');
  const [newPassword, setNewPassword] = useState('');

  // Toast / feedback message
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback(null), 4000);
  };

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (roleFilter !== 'all') params.append('role', roleFilter);
      if (statusFilter !== 'all') params.append('status', statusFilter);

      const res = await fetch(`/api/v1/users?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setUsers(json.data || []);
      } else {
        showToast('error', json.error?.message || 'Không thể tải danh sách người dùng');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi mạng khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  }, [search, roleFilter, statusFilter]);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await fetch('/api/v1/roles');
      const json = await res.json();
      if (json.success) {
        setRoles(json.data || []);
      }
    } catch {
      // Ignored
    }
  }, []);

  useEffect(() => {
    fetchUsers();
    fetchRoles();
  }, [fetchUsers, fetchRoles]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/v1/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          email: formEmail,
          password: formPassword,
          role: formRole,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Tạo tài khoản người dùng thành công');
        setIsCreateOpen(false);
        setFormName('');
        setFormEmail('');
        setFormPassword('');
        setFormRole('viewer');
        fetchUsers();
      } else {
        showToast('error', json.error?.message || 'Lỗi khi tạo người dùng');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi hệ thống');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/v1/users/${selectedUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName,
          role: formRole,
          status: formStatus,
        }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Cập nhật thông tin thành công');
        setIsEditOpen(false);
        fetchUsers();
      } else {
        showToast('error', json.error?.message || 'Lỗi cập nhật người dùng');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi hệ thống');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const res = await fetch(`/api/v1/users/${selectedUser._id}/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword }),
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Đặt lại mật khẩu thành công');
        setIsResetPassOpen(false);
        setNewPassword('');
      } else {
        showToast('error', json.error?.message || 'Lỗi đặt lại mật khẩu');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi hệ thống');
    }
  };

  const handleDisableUser = async (user: UserItem) => {
    if (!confirm(`Bạn có chắc muốn vô hiệu hóa tài khoản "${user.name}" (${user.email})?`)) {
      return;
    }
    try {
      const res = await fetch(`/api/v1/users/${user._id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        showToast('success', 'Đã vô hiệu hóa tài khoản');
        fetchUsers();
      } else {
        showToast('error', json.error?.message || 'Không thể vô hiệu hóa');
      }
    } catch (err: any) {
      showToast('error', err.message || 'Lỗi hệ thống');
    }
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'owner':
        return <span className={`${styles.badge} ${styles.badgeOwner}`}>Super Admin</span>;
      case 'administrator':
        return <span className={`${styles.badge} ${styles.badgeAdmin}`}>Admin</span>;
      case 'product_manager':
        return <span className={`${styles.badge} ${styles.badgePm}`}>Quản lý SP</span>;
      case 'editor':
        return <span className={`${styles.badge} ${styles.badgeEditor}`}>Biên tập viên</span>;
      default:
        return <span className={`${styles.badge} ${styles.badgeViewer}`}>Người xem</span>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <span className={`${styles.badge} ${styles.statusActive}`}>Hoạt động</span>;
      case 'inactive':
        return <span className={`${styles.badge} ${styles.statusInactive}`}>Đã khóa</span>;
      default:
        return <span className={`${styles.badge} ${styles.statusSuspended}`}>Tạm dừng</span>;
    }
  };

  return (
    <div className={styles.container}>
      {/* Toast Feedback */}
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

      {/* Header */}
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h1>Người dùng & Phân quyền</h1>
          <p>Quản lý danh sách tài khoản, vai trò và phân quyền truy cập hệ thống</p>
        </div>
        {activeTab === 'users' && (
          <button className={styles.btnPrimary} onClick={() => setIsCreateOpen(true)}>
            + Thêm người dùng mới
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tabBtn} ${activeTab === 'users' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('users')}
        >
          Danh sách người dùng ({users.length})
        </button>
        <button
          className={`${styles.tabBtn} ${activeTab === 'roles' ? styles.tabBtnActive : ''}`}
          onClick={() => setActiveTab('roles')}
        >
          Vai trò & Quyền hệ thống ({roles.length})
        </button>
      </div>

      {/* Tab: Users */}
      {activeTab === 'users' && (
        <>
          <div className={styles.filterBar}>
            <input
              type="text"
              placeholder="Tìm theo tên hoặc email..."
              className={styles.searchInput}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select
              className={styles.selectInput}
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="all">Tất cả vai trò</option>
              <option value="owner">Super Admin</option>
              <option value="administrator">Admin</option>
              <option value="product_manager">Quản lý SP</option>
              <option value="editor">Biên tập viên</option>
              <option value="viewer">Người xem</option>
            </select>
            <select
              className={styles.selectInput}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả trạng thái</option>
              <option value="active">Đang hoạt động</option>
              <option value="inactive">Đã khóa</option>
              <option value="suspended">Tạm dừng</option>
            </select>
          </div>

          <div className={styles.tableCard}>
            {loading ? (
              <div className={styles.emptyState}>Đang tải danh sách người dùng...</div>
            ) : users.length === 0 ? (
              <div className={styles.emptyState}>Không tìm thấy người dùng phù hợp</div>
            ) : (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Người dùng</th>
                    <th>Vai trò</th>
                    <th>Trạng thái</th>
                    <th>Đăng nhập cuối</th>
                    <th>Ngày tạo</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id}>
                      <td>
                        <div className={styles.userCell}>
                          <div className={styles.avatar}>
                            {u.name ? u.name.charAt(0).toUpperCase() : 'U'}
                          </div>
                          <div>
                            <div className={styles.userName}>{u.name}</div>
                            <div className={styles.userEmail}>{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td>{getRoleBadge(u.role)}</td>
                      <td>{getStatusBadge(u.status)}</td>
                      <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                        {u.lastLoginAt
                          ? new Date(u.lastLoginAt).toLocaleString('vi-VN')
                          : 'Chưa đăng nhập'}
                      </td>
                      <td style={{ fontSize: '0.8125rem', color: '#64748b' }}>
                        {new Date(u.createdAt).toLocaleDateString('vi-VN')}
                      </td>
                      <td>
                        <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                          <button
                            className={styles.btnSecondary}
                            onClick={() => {
                              setSelectedUser(u);
                              setFormName(u.name);
                              setFormRole(u.role);
                              setFormStatus(u.status);
                              setIsEditOpen(true);
                            }}
                          >
                            Sửa
                          </button>
                          <button
                            className={styles.btnSecondary}
                            onClick={() => {
                              setSelectedUser(u);
                              setNewPassword('');
                              setIsResetPassOpen(true);
                            }}
                          >
                            Đổi mật khẩu
                          </button>
                          {u.status === 'active' && (
                            <button
                              className={styles.btnDanger}
                              onClick={() => handleDisableUser(u)}
                            >
                              Khóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {/* Tab: Roles */}
      {activeTab === 'roles' && (
        <div className={styles.rolesGrid}>
          {roles.map((r) => (
            <div key={r.id} className={styles.roleCard}>
              <div className={styles.roleCardHeader}>
                <span className={styles.roleName}>{r.name}</span>
                {getRoleBadge(r.id)}
              </div>
              <p className={styles.roleDesc}>{r.description}</p>
              <div style={{ marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.75rem', color: '#475569' }}>
                Danh sách quyền ({r.permissions?.length || 0}):
              </div>
              <div className={styles.permList}>
                {r.permissions?.map((p) => (
                  <span key={p} className={styles.permTag}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal Tạo Người Dùng */}
      {isCreateOpen && (
        <div className={styles.modalOverlay} onClick={() => setIsCreateOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Thêm người dùng mới</h2>
            <form onSubmit={handleCreateUser}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Họ và tên *</label>
                <input
                  type="text"
                  required
                  className={styles.formInput}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Nguyễn Văn A"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email *</label>
                <input
                  type="email"
                  required
                  className={styles.formInput}
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="user@example.com"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mật khẩu (tối thiểu 8 ký tự) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className={styles.formInput}
                  value={formPassword}
                  onChange={(e) => setFormPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Vai trò mặc định *</label>
                <select
                  className={styles.formInput}
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                >
                  <option value="viewer">Người xem (Viewer)</option>
                  <option value="editor">Biên tập viên (Editor)</option>
                  <option value="product_manager">Quản lý sản phẩm</option>
                  <option value="administrator">Quản trị viên (Admin)</option>
                  <option value="owner">Super Admin</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsCreateOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Sửa Người Dùng */}
      {isEditOpen && selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setIsEditOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Cập nhật người dùng</h2>
            <form onSubmit={handleEditUser}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Email (Không thể thay đổi)</label>
                <input
                  type="email"
                  disabled
                  className={styles.formInput}
                  value={selectedUser.email}
                  style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Họ và tên *</label>
                <input
                  type="text"
                  required
                  className={styles.formInput}
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                />
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Vai trò *</label>
                <select
                  className={styles.formInput}
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value)}
                >
                  <option value="viewer">Người xem (Viewer)</option>
                  <option value="editor">Biên tập viên (Editor)</option>
                  <option value="product_manager">Quản lý sản phẩm</option>
                  <option value="administrator">Quản trị viên (Admin)</option>
                  <option value="owner">Super Admin</option>
                </select>
              </div>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Trạng thái tài khoản *</label>
                <select
                  className={styles.formInput}
                  value={formStatus}
                  onChange={(e) => setFormStatus(e.target.value as any)}
                >
                  <option value="active">Hoạt động (Active)</option>
                  <option value="inactive">Đã khóa (Inactive)</option>
                  <option value="suspended">Tạm dừng (Suspended)</option>
                </select>
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsEditOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Lưu thay đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Đặt Lại Mật Khẩu */}
      {isResetPassOpen && selectedUser && (
        <div className={styles.modalOverlay} onClick={() => setIsResetPassOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <h2 className={styles.modalTitle}>Đặt lại mật khẩu</h2>
            <p style={{ fontSize: '0.875rem', color: '#64748b', marginBottom: '1rem' }}>
              Đặt lại mật khẩu mới cho tài khoản: <strong>{selectedUser.email}</strong>
            </p>
            <form onSubmit={handleResetPassword}>
              <div className={styles.formGroup}>
                <label className={styles.formLabel}>Mật khẩu mới (tối thiểu 8 ký tự) *</label>
                <input
                  type="password"
                  required
                  minLength={8}
                  className={styles.formInput}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nhập mật khẩu mới..."
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className={styles.btnSecondary}
                  onClick={() => setIsResetPassOpen(false)}
                >
                  Hủy
                </button>
                <button type="submit" className={styles.btnPrimary}>
                  Xác nhận đổi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
