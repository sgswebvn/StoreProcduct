import type { Metadata } from 'next';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { APP_CONFIG } from '@/core/config/app.config';

export const metadata: Metadata = {
  title: 'Chính sách Bảo mật (Privacy Policy)',
  description: `Chính sách bảo mật và quyền riêng tư của nền tảng quản trị ${APP_CONFIG.name}.`,
};

export default function PrivacyPolicyPage() {
  const updateDate = '15/10/2026';

  return (
    <PublicLayout>
      <article style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
        <header style={{ marginBottom: '36px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Chính sách Bảo mật (Privacy Policy)
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
            Cập nhật lần cuối: {updateDate} · Áp dụng cho nền tảng <strong>{APP_CONFIG.name}</strong>
          </p>
        </header>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            1. Giới thiệu và Mục đích
          </h2>
          <p>
            Chào mừng bạn đến với <strong>{APP_CONFIG.name}</strong>. {APP_CONFIG.name} là một nền tảng Quản trị Thông tin Sản phẩm (PIM) dành cho doanh nghiệp, cho phép người quản trị tổ chức dữ liệu sản phẩm, phân loại danh mục, và phân phối thông tin an toàn qua API cho các website vệ tinh.
          </p>
          <p>
            Chính sách này mô tả cách chúng tôi thu thập, sử dụng, lưu trữ và bảo vệ thông tin khi bạn sử dụng dịch vụ của {APP_CONFIG.name}, đặc biệt là việc tích hợp với Google Drive API để lưu trữ hình ảnh sản phẩm.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            2. Thông tin chúng tôi thu thập
          </h2>
          <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <strong>Thông tin tài khoản quản trị:</strong> Họ tên, địa chỉ email, mật khẩu được mã hóa bằng thuật toán bcrypt. Chúng tôi không bao giờ lưu mật khẩu ở dạng văn bản thuần (plaintext).
            </li>
            <li>
              <strong>Dữ liệu danh mục và sản phẩm:</strong> Tên sản phẩm, mã SKU nội bộ, mô tả, giá tham chiếu, thuộc tính kỹ thuật và danh mục liên kết.
            </li>
            <li>
              <strong>Metadata hình ảnh:</strong> Tên file, dung lượng, định dạng MIME và mã định danh file (Drive File ID) do Google Drive cấp sau khi tải lên.
            </li>
            <li>
              <strong>Nhật ký hoạt động (Audit Logs):</strong> Địa chỉ IP, thời gian và loại thao tác tạo/sửa/xóa để phục vụ mục đích kiểm toán an toàn hệ thống.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            3. Sử dụng Google Drive API và Quyền dữ liệu người dùng
          </h2>
          <p>
            {APP_CONFIG.name} cung cấp tính năng tải ảnh sản phẩm trực tiếp lên Google Drive cá nhân hoặc doanh nghiệp của quản trị viên đã được ủy quyền. Chúng tôi tuân thủ nghiêm ngặt Chính sách Dữ liệu Người dùng của Dịch vụ Google API (Google API Services User Data Policy):
          </p>
          <div style={{ backgroundColor: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', margin: '16px 0' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>
              Phạm vi quyền truy cập (OAuth Scope)
            </h3>
            <p style={{ margin: 0 }}>
              Ứng dụng chỉ yêu cầu phạm vi tối thiểu: <code>https://www.googleapis.com/auth/drive.file</code>. Phạm vi này chỉ cho phép {APP_CONFIG.name} xem, tạo và quản lý các file hoặc thư mục do chính ứng dụng tải lên hoặc người dùng chủ động chọn. {APP_CONFIG.name} <strong>hoàn toàn không có quyền</strong> xem, chỉnh sửa hoặc xóa bất kỳ file cá nhân nào khác có sẵn trong Google Drive của bạn.
            </p>
          </div>
          <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <strong>Không bán hoặc chia sẻ:</strong> Dữ liệu từ Google Drive của bạn không bao giờ được bán, cho thuê hoặc chuyển nhượng cho bất kỳ bên thứ ba hay mạng quảng cáo nào.
            </li>
            <li>
              <strong>Không dùng để huấn luyện AI:</strong> Dữ liệu Google Drive không được sử dụng để đào tạo các mô hình trí tuệ nhân tạo (AI/ML) tổng quát.
            </li>
            <li>
              <strong>Mã hóa Token an toàn:</strong> Refresh token được cấp bởi Google được mã hóa bằng thuật toán tiêu chuẩn quân sự AES-256-GCM trước khi lưu vào MongoDB Atlas. Khóa giải mã được lưu độc lập tại biến môi trường máy chủ và không bao giờ nằm trong database.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            4. Lưu trữ Cơ sở dữ liệu (MongoDB Atlas)
          </h2>
          <p>
            Toàn bộ cơ sở dữ liệu được lưu trữ trên cụm đám mây bảo mật MongoDB Atlas. Kết nối được mã hóa TLS/SSL toàn thời gian. MongoDB chỉ lưu các trường dữ liệu văn bản, metadata sản phẩm và mã tham chiếu file, hoàn toàn không lưu trữ file nhị phân ảnh trực tiếp trong database.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            5. Quyền kiểm soát và Hủy ủy quyền của Người dùng
          </h2>
          <p>Người quản trị có toàn quyền kiểm soát dữ liệu của mình bất kỳ lúc nào:</p>
          <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              <strong>Ngắt kết nối Google Drive:</strong> Bạn có thể nhấn nút "Ngắt kết nối" trong trang Quản lý Media của {APP_CONFIG.name} để xóa token xác thực ngay lập tức.
            </li>
            <li>
              <strong>Thu hồi quyền từ Google:</strong> Bạn có thể thu hồi quyền truy cập của {APP_CONFIG.name} bất kỳ lúc nào tại trang quản lý tài khoản Google của bạn (<a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary)' }}>Tài khoản Google &gt; Quyền của ứng dụng bên thứ ba</a>).
            </li>
            <li>
              <strong>Xóa dữ liệu:</strong> Khi xóa ảnh trong giao diện quản trị, bạn có thể lựa chọn chỉ gỡ liên kết khỏi sản phẩm hoặc xóa vĩnh viễn file trên Google Drive.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            6. Thông tin Liên hệ
          </h2>
          <p>
            Nếu bạn có bất kỳ câu hỏi hoặc khiếu nại nào liên quan đến Chính sách Bảo mật này hoặc cách chúng tôi xử lý dữ liệu, vui lòng liên hệ với đội ngũ quản trị qua email: <strong>{APP_CONFIG.support.email}</strong>.
          </p>
        </section>
      </article>
    </PublicLayout>
  );
}
