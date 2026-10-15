import type { Metadata } from 'next';
import { auth } from '@/core/auth/auth';
import styles from './dashboard.module.css';

export const metadata: Metadata = { title: 'Tổng quan' };

const ROLE_LABELS: Record<string, string> = {
  owner: 'Chủ sở hữu',
  administrator: 'Quản trị viên',
  product_manager: 'Quản lý sản phẩm',
  editor: 'Biên tập viên',
  viewer: 'Người xem',
};

export default async function DashboardPage() {
  const session = await auth();
  const user = session!.user;

  return (
    <div className="animate-fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Bảng điều khiển Tổng quan</h1>
          <p className="page-description">
            Xin chào, <strong>{user.name}</strong> · Vai trò: {ROLE_LABELS[user.role] ?? user.role}
          </p>
        </div>
      </div>

      {/* Quick Stats — hiển thị gạch nối cho đến khi có dữ liệu thật từ Phase 2 */}
      <div className={styles.statsGrid}>
        <StatCard
          label="Tổng số sản phẩm"
          value="—"
          description="Sẵn sàng sau Phase 2"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          }
          color="primary"
        />
        <StatCard
          label="Danh mục sản phẩm"
          value="—"
          description="Sẵn sàng sau Phase 2"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
            </svg>
          }
          color="success"
        />
        <StatCard
          label="Loại sản phẩm (Types)"
          value="—"
          description="Sẵn sàng sau Phase 3"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          }
          color="warning"
        />
        <StatCard
          label="Tệp Media & Ảnh"
          value="—"
          description="Sẵn sàng sau Phase 4"
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" /><circle cx="9" cy="9" r="2" />
              <path d="M21 15l-5-5L5 21" />
            </svg>
          }
          color="info"
        />
      </div>

      {/* Tiến độ thiết lập nền tảng */}
      <div className={styles.setupCard}>
        <div className="card">
          <div className="card-header">
            <h2 className="card-title">Tiến độ phát triển nền tảng ProductHub</h2>
            <span className="badge badge-primary">Phase 1 đang hoàn thiện</span>
          </div>
          <div className="card-body">
            <div className={styles.phaseList}>
              <PhaseItem phase={0} title="Khảo sát kiến trúc & Thiết kế Schema" status="done" />
              <PhaseItem phase={1} title="Nền tảng ứng dụng & UI Design System" status="active" />
              <PhaseItem phase={2} title="Quản lý Sản phẩm & Cây danh mục (Core PIM)" status="pending" />
              <PhaseItem phase={3} title="Product Types & Trường dữ liệu động" status="pending" />
              <PhaseItem phase={4} title="Thư viện Media & Quản lý tệp tập trung" status="pending" />
              <PhaseItem phase={5} title="Dự án, Sites vệ tinh & Quản lý Module" status="pending" />
              <PhaseItem phase={6} title="Tích hợp API REST & Phân quyền khóa API" status="pending" />
              <PhaseItem phase={7} title="Nhập & Xuất dữ liệu Excel/CSV hàng loạt" status="pending" />
              <PhaseItem phase={8} title="Quản lý tồn kho cơ bản (Module tùy chọn)" status="pending" />
              <PhaseItem phase={9} title="Kiểm thử an toàn, Tối ưu hóa & Triển khai" status="pending" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  description,
  icon,
  color,
}: {
  label: string;
  value: string | number;
  description: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'info';
}) {
  return (
    <div className={`card ${styles.statCard}`}>
      <div className={`${styles.statIcon} ${styles[`statIcon_${color}`]}`} aria-hidden="true">
        {icon}
      </div>
      <div className={styles.statContent}>
        <div className={styles.statValue}>{value}</div>
        <div className={styles.statLabel}>{label}</div>
        <div className={styles.statDescription}>{description}</div>
      </div>
    </div>
  );
}

function PhaseItem({
  phase,
  title,
  status,
}: {
  phase: number;
  title: string;
  status: 'done' | 'active' | 'pending';
}) {
  return (
    <div className={`${styles.phaseItem} ${styles[`phaseItem_${status}`]}`}>
      <div className={styles.phaseNumber}>{phase}</div>
      <div className={styles.phaseTitle}>Giai đoạn {phase} — {title}</div>
      <span className={`badge ${status === 'done' ? 'badge-active' : status === 'active' ? 'badge-primary' : 'badge-draft'}`}>
        {status === 'done' ? 'Đã hoàn tất' : status === 'active' ? 'Đang thực hiện' : 'Chờ triển khai'}
      </span>
    </div>
  );
}

