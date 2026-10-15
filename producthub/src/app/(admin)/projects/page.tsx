'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import styles from './projects.module.css';
import { useToast } from '@/components/ui/Toast';

interface ProjectItem {
  _id: string;
  name: string;
  code: string;
  domain?: string;
  description?: string;
  status: 'active' | 'inactive';
  productCount: number;
  createdAt: string;
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [domain, setDomain] = useState('');
  const [description, setDescription] = useState('');

  const toast = useToast();

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const url = search ? `/api/v1/projects?search=${encodeURIComponent(search)}` : '/api/v1/projects';
      const res = await fetch(url);
      const data = await res.json();
      if (data.success) {
        setProjects(data.data.items || []);
      } else {
        toast.error(data.error?.message || 'Không thể tải danh sách dự án.');
      }
    } catch {
      toast.error('Lỗi kết nối khi tải danh sách dự án.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [search]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.warning('Vui lòng nhập tên dự án/site.');
      return;
    }

    try {
      setSubmitting(true);
      const res = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          code: code.trim() || undefined,
          domain: domain.trim() || undefined,
          description: description.trim() || undefined,
          status: 'active',
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Đã tạo dự án "${name}" thành công!`);
        setIsModalOpen(false);
        setName('');
        setCode('');
        setDomain('');
        setDescription('');
        fetchProjects();
      } else {
        toast.error(data.error?.message || 'Có lỗi xảy ra khi tạo dự án.');
      }
    } catch {
      toast.error('Lỗi máy chủ khi tạo dự án.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteProject = async (id: string, projectName: string) => {
    if (!confirm(`Bạn có chắc chắn muốn xóa dự án "${projectName}"? Tất cả cấu hình riêng của dự án này sẽ bị xóa.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/projects/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        toast.success('Đã xóa dự án thành công.');
        setProjects((prev) => prev.filter((p) => p._id !== id));
      } else {
        toast.error(data.error?.message || 'Không thể xóa dự án.');
      }
    } catch {
      toast.error('Lỗi máy chủ khi xóa dự án.');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.title}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z" />
            </svg>
            Dự án & Sites Vệ Tinh (Multi-Site Syndication)
          </h1>
          <p className={styles.subtitle}>
            Quản lý các website vệ tinh, sàn thương mại và kênh phân phối lấy dữ liệu tập trung từ StoreProduct.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary"
          onClick={() => setIsModalOpen(true)}
        >
          + Thêm Dự án / Site mới
        </button>
      </div>

      <div className={styles.card}>
        <div className={styles.toolbar}>
          <div className={styles.searchBox}>
            <input
              type="text"
              className="form-input"
              placeholder="Tìm kiếm dự án, mã định danh, domain..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
            Tổng số: <strong>{projects.length}</strong> dự án
          </div>
        </div>

        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Dự án / Site vệ tinh</th>
                <th>Tên miền kết nối</th>
                <th>Trạng thái</th>
                <th>Sản phẩm phân bổ</th>
                <th style={{ textAlign: 'right' }}>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-secondary)' }}>
                    Đang tải danh sách dự án...
                  </td>
                </tr>
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '60px 0' }}>
                    <div style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                      Chưa có dự án hoặc site vệ tinh nào.
                    </div>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsModalOpen(true)}
                    >
                      Tạo dự án đầu tiên
                    </button>
                  </td>
                </tr>
              ) : (
                projects.map((p) => (
                  <tr key={p._id}>
                    <td>
                      <div className={styles.projectInfo}>
                        <Link href={`/projects/${p._id}`} className={styles.projectName}>
                          {p.name}
                        </Link>
                        <span className={styles.projectCode}>{p.code}</span>
                      </div>
                    </td>
                    <td>
                      {p.domain ? (
                        <a
                          href={p.domain.startsWith('http') ? p.domain : `https://${p.domain}`}
                          target="_blank"
                          rel="noreferrer"
                          className={styles.domainLink}
                        >
                          {p.domain}
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                            <polyline points="15 3 21 3 21 9" />
                            <line x1="10" y1="14" x2="21" y2="3" />
                          </svg>
                        </a>
                      ) : (
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                          Chưa gắn domain
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={p.status === 'active' ? styles.badgeActive : styles.badgeInactive}>
                        {p.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}
                      </span>
                    </td>
                    <td>
                      <span className={styles.productCountBadge}>
                        {p.productCount || 0} sản phẩm
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div className={styles.actions} style={{ justifyContent: 'flex-end' }}>
                        <Link href={`/projects/${p._id}`} className="btn btn-secondary btn-sm">
                          Cấu hình & Sản phẩm
                        </Link>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          style={{ color: 'var(--color-danger)' }}
                          onClick={() => handleDeleteProject(p._id, p.name)}
                          title="Xóa dự án"
                        >
                          Xóa
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

      {/* Modal Thêm Dự Án Mới */}
      {isModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent}>
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Tạo Dự Án / Site Vệ Tinh Mới</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProject}>
              <div className={styles.modalBody}>
                <div className="form-group">
                  <label className="form-label" htmlFor="proj-name">
                    Tên Dự án / Website <span style={{ color: 'red' }}>*</span>
                  </label>
                  <input
                    id="proj-name"
                    type="text"
                    className="form-input"
                    required
                    placeholder="Ví dụ: Shop Sneaker Chính Hãng"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="proj-code">
                    Mã định danh (Slug / Code)
                  </label>
                  <input
                    id="proj-code"
                    type="text"
                    className="form-input"
                    placeholder="Tự động tạo từ tên nếu để trống (ví dụ: sneaker-store)"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="proj-domain">
                    Tên miền website vệ tinh (Domain)
                  </label>
                  <input
                    id="proj-domain"
                    type="text"
                    className="form-input"
                    placeholder="ví dụ: sneakershop.vn hoặc subdomain.domain.com"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="proj-desc">
                    Mô tả dự án
                  </label>
                  <textarea
                    id="proj-desc"
                    className="form-textarea"
                    rows={3}
                    placeholder="Mô tả mục đích, kênh phân phối hoặc đặc thù của site..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.modalFooter}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={submitting}
                >
                  {submitting ? 'Đang tạo...' : 'Tạo Dự Án'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
