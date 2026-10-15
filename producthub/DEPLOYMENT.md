# HƯỚNG DẪN TRIỂN KHAI HỆ THỐNG STOREPRODUCT LÊN PRODUCTION (VERCEL + MONGODB ATLAS + GOOGLE DRIVE)

StoreProduct là nền tảng quản lý dữ liệu sản phẩm tập trung (Centralized Product Information Management - PIM), được xây dựng trên kiến trúc module mở rộng linh hoạt theo mô hình WordPress Core & Plugin Architecture.

---

## 1. YÊU CẦU HỆ THỐNG & TÀI NGUYÊN

1. **Node.js**: Phiên bản 20.x trở lên (khuyến nghị 22.x LTS hoặc 24.x).
2. **Cơ sở dữ liệu**: MongoDB Atlas (Replica Set hỗ trợ Transactions).
3. **Lưu trữ Media**: Google Drive qua tài khoản Google Cloud Project (OAuth 2.0).
4. **Nền tảng Hosting**: Vercel (Next.js Serverless runtime).

---

## 2. CẤU HÌNH BIẾN MÔI TRƯỜNG (ENVIRONMENT VARIABLES)

Tạo file `.env.local` khi chạy cục bộ hoặc cấu hình trên **Vercel Project Settings > Environment Variables**:

```ini
# --- TÊN THƯƠNG HIỆU & HỆ THỐNG ---
NEXT_PUBLIC_APP_NAME="StoreProduct"
NEXT_PUBLIC_APP_URL="https://your-domain.vercel.app"

# --- MONGODB ATLAS ---
MONGODB_URI="mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/StoreProduct?retryWrites=true&w=majority&appName=Cluster0"

# --- NEXTAUTH V5 (AUTHENTICATION) ---
AUTH_SECRET="<generate_64_character_random_secret>"
NEXTAUTH_URL="https://your-domain.vercel.app"

# --- GOOGLE DRIVE INTEGRATION (OAUTH 2.0) ---
GOOGLE_CLIENT_ID="<your_google_client_id>.apps.googleusercontent.com"
GOOGLE_CLIENT_SECRET="<your_google_client_secret>"
GOOGLE_DRIVE_FOLDER_ID="<your_google_drive_folder_id>"
GOOGLE_DRIVE_TOKEN_ENCRYPTION_KEY="<generate_64_hex_chars_for_aes_256_gcm>"

# --- TÙY CHỌN (GỬI EMAIL THÔNG BÁO) ---
# SMTP_HOST="smtp.gmail.com"
# SMTP_PORT=587
# SMTP_USER="your-email@gmail.com"
# SMTP_PASS="your-app-password"
```

---

## 3. THIẾT LẬP GOOGLE CLOUD CONSOLE (OAUTH 2.0 CHO DRIVE)

1. Truy cập [Google Cloud Console](https://console.cloud.google.com/).
2. Bật API: **Google Drive API**.
3. Cấu hình **OAuth Consent Screen**:
   - Tên ứng dụng: `StoreProduct Central PIM`.
   - Email hỗ trợ và thông tin liên hệ của bạn.
   - Scopes yêu cầu: `https://www.googleapis.com/auth/drive.file`.
4. Tạo **Credentials > OAuth 2.0 Client IDs**:
   - Application type: **Web application**.
   - Authorized JavaScript origins:
     - `http://localhost:3000` (Local)
     - `https://your-domain.vercel.app` (Production)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google/callback`
     - `https://your-domain.vercel.app/api/auth/google/callback`
5. Lấy **Folder ID** trên Google Drive:
   - Tạo thư mục riêng trên Drive (ví dụ: `StoreProduct_Assets`).
   - Mở thư mục, lấy chuỗi ID ở cuối URL trên trình duyệt: `https://drive.google.com/drive/folders/<FOLDER_ID>`.

---

## 4. QUY TRÌNH TRIỂN KHAI LÊN VERCEL

### Cách 1: Triển khai qua GitHub (Khuyến nghị)
1. Đẩy mã nguồn dự án lên GitHub repository.
2. Đăng nhập vào [Vercel](https://vercel.com/) và bấm **Add New > Project**.
3. Chọn repository chứa dự án StoreProduct.
4. Chọn **Framework Preset**: `Next.js`.
5. Đặt **Root Directory**: `producthub` (hoặc thư mục chứa `package.json`).
6. Dán toàn bộ các biến môi trường ở Mục 2 vào mục **Environment Variables**.
7. Bấm **Deploy**.

### Cách 2: Triển khai qua Vercel CLI
```bash
npm install -g vercel
vercel login
cd producthub
vercel --prod
```

---

## 5. BỘ LỆNH KIỂM THỬ TỰ ĐỘNG CÁC GIAI ĐOẠN

Dự án cung cấp bộ kịch bản kiểm thử toàn diện cho từng giai đoạn độc lập:

```bash
# Kiểm tra đăng nhập NextAuth & Phân quyền (Phase 1)
npx tsx scripts/test-login-flow.ts

# Kiểm thử Sản phẩm, Danh mục & Optimistic Locking (Phase 2)
npx tsx scripts/test-phase2-products.ts

# Kiểm thử Dynamic Attributes & Variants (Phase 3)
npx tsx scripts/test-phase3-types.ts

# Kiểm thử Thư viện Media, Magic Bytes & Google Drive (Phase 4)
npx tsx scripts/test-phase4-media.ts

# Kiểm thử Quản lý Module & Sites Vệ Tinh (Phase 5)
npx tsx scripts/test-phase5-modules-projects.ts

# Kiểm thử REST API, API Keys SHA-256 & Webhooks (Phase 6)
npx tsx scripts/test-phase6-api-integrations.ts

# Kiểm thử Nhập/Xuất CSV hàng loạt & SKU Upsert (Phase 7)
npx tsx scripts/test-phase7-import-export.ts

# Kiểm thử Tồn kho cơ bản & Lịch sử biến động (Phase 8)
npx tsx scripts/test-phase8-inventory.ts
```

---

## 6. KIỂM TRA ĐỘ SẴN SÀNG PRODUCTION (BUILD VERIFICATION)

Trước khi phát hành, chạy lệnh:
```bash
npm run build
```
Đảm bảo mã kết thúc trả về `0` và toàn bộ các trang Admin, API routes được tối ưu hóa thành công.
