import type { Metadata } from 'next';
import { PublicLayout } from '@/components/layout/PublicLayout';
import { APP_CONFIG } from '@/core/config/app.config';

export const metadata: Metadata = {
  title: 'Điều khoản Dịch vụ (Terms of Service)',
  description: `Điều khoản và điều kiện sử dụng nền tảng ${APP_CONFIG.name}.`,
};

export default function TermsOfServicePage() {
  const updateDate = '15/10/2026';

  return (
    <PublicLayout>
      <article style={{ lineHeight: 1.7, color: 'var(--text-secondary)' }}>
        <header style={{ marginBottom: '36px', borderBottom: '1px solid var(--border)', paddingBottom: '20px' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
            Điều khoản Dịch vụ (Terms of Service)
          </h1>
          <p style={{ fontSize: '0.875rem', color: 'var(--text-tertiary)' }}>
            Cập nhật lần cuối: {updateDate} · Áp dụng cho nền tảng <strong>{APP_CONFIG.name}</strong>
          </p>
        </header>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            1. Chấp thuận Điều khoản
          </h2>
          <p>
            Bằng việc đăng nhập và sử dụng hệ thống <strong>{APP_CONFIG.name}</strong>, bạn đồng ý tuân thủ toàn bộ các điều khoản và điều kiện được nêu tại văn bản này. Nếu bạn không đồng ý với bất kỳ phần nào của điều khoản, vui lòng không sử dụng dịch vụ.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            2. Quyền và Trách nhiệm về Tài khoản
          </h2>
          <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              Tài khoản trên {APP_CONFIG.name} được cấp riêng cho nhân sự quản trị được ủy quyền. Không hỗ trợ đăng ký công khai.
            </li>
            <li>
              Người dùng có trách nhiệm bảo mật thông tin đăng nhập và mật khẩu cá nhân. Mọi thao tác thực hiện từ tài khoản của bạn sẽ thuộc trách nhiệm của bạn.
            </li>
            <li>
              Khi phát hiện dấu hiệu truy cập trái phép, bạn cần thông báo ngay lập tức cho Quản trị viên hệ thống để tiến hành khóa tài khoản hoặc đổi khóa API.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            3. Quyền sở hữu Dữ liệu Sản phẩm
          </h2>
          <p>
            Doanh nghiệp và người quản trị sở hữu toàn bộ bản quyền, nội dung mô tả, giá và hình ảnh sản phẩm được tải lên hoặc quản lý trên {APP_CONFIG.name}. Chúng tôi không tuyên bố quyền sở hữu đối với bất kỳ tài sản trí tuệ nào do bạn tải lên.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            4. Quy định về Tích hợp Google Drive
          </h2>
          <ul style={{ paddingLeft: '24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>
              Tính năng lưu trữ ảnh qua Google Drive yêu cầu ủy quyền hợp lệ từ tài khoản Google của bạn.
            </li>
            <li>
              Chỉ được tải lên hình ảnh sản phẩm hợp pháp (định dạng JPG, PNG, WEBP, GIF, SVG). Nghiêm cấm tải lên các tệp tin chứa mã độc, virus hoặc nội dung vi phạm pháp luật.
            </li>
            <li>
              Dung lượng lưu trữ phụ thuộc vào hạn mức tài khoản Google cá nhân/doanh nghiệp của bạn. {APP_CONFIG.name} không chịu trách nhiệm khi Google Drive của bạn bị đầy dung lượng hoặc vượt quá giới hạn API do Google quy định.
            </li>
          </ul>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            5. Giới hạn Trách nhiệm
          </h2>
          <p>
            {APP_CONFIG.name} được cung cấp trên cơ sở nguyên trạng ("as is"). Chúng tôi luôn nỗ lực duy trì tính sẵn sàng và tính vẹn toàn của dữ liệu, tuy nhiên không chịu trách nhiệm đối với các sự cố gián đoạn do nhà cung cấp hạ tầng thứ ba (như MongoDB Atlas, Vercel, hoặc sự thay đổi chính sách từ Google API).
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            6. Thay đổi Điều khoản
          </h2>
          <p>
            Chúng tôi có quyền cập nhật các điều khoản này theo thời gian để phù hợp với quy định pháp luật và các tính năng mới. Các thay đổi sẽ có hiệu lực ngay khi được đăng tải trên trang này.
          </p>
        </section>

        <section style={{ marginBottom: '32px' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '12px' }}>
            7. Liên hệ
          </h2>
          <p>
            Mọi thắc mắc về Điều khoản Dịch vụ, xin vui lòng gửi về: <strong>{APP_CONFIG.support.email}</strong>.
          </p>
        </section>
      </article>
    </PublicLayout>
  );
}
