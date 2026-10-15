# ProductHub — Development Roadmap

> **Version:** 0.1.0  
> **Date:** 2026-10-15  
> **Status:** Active

---

## Phase 0 — Discovery & Architecture ✅ IN PROGRESS

**Mục tiêu:** Xác định kiến trúc, stack, mô hình dữ liệu và cấu trúc thư mục.

| Đầu ra | Trạng thái |
|---|---|
| `docs/architecture.md` | ✅ Done |
| `docs/data-model.md` | ✅ Done |
| `docs/roadmap.md` | ✅ Done |
| Khởi tạo Next.js project | ✅ Done |
| Xác định môi trường deploy | ✅ Vercel |
| Xác định database | ✅ MongoDB Atlas |

**Điều kiện hoàn thành:** Kiến trúc đã rõ, không có giả định nguy hiểm về database. ✅

---

## Phase 1 — Application Foundation

**Mục tiêu:** Nền tảng kỹ thuật hoạt động với auth, permissions và admin layout.

### Công việc

- [ ] Cài đặt và cấu hình dependencies (Mongoose, NextAuth v5, Zod, bcrypt)
- [ ] MongoDB connection singleton với connection caching (Vercel-safe)
- [ ] Environment variables setup (`.env.example`, `.env.local`)
- [ ] NextAuth.js v5 config với credentials provider
- [ ] User model + seed script (Owner account)
- [ ] Session middleware + route protection
- [ ] Permission system (role + per-user permissions)
- [ ] Admin layout: Shell, Sidebar, TopBar
- [ ] CSS design system (tokens, typography, colors)
- [ ] Global error boundary và error page
- [ ] Logging helper
- [ ] API response helpers (success/error envelope)
- [ ] Module registry khởi tạo

### Deliverables

- Đăng nhập hoạt động với tài khoản Owner
- Admin shell hiển thị đúng
- Permission check hoạt động ở server level
- Build thành công

### Test criteria

- [ ] Login với credentials đúng → vào dashboard
- [ ] Login với credentials sai → thông báo lỗi rõ ràng
- [ ] Route `/admin/*` redirect về login nếu chưa xác thực
- [ ] Route `/admin/*` trả 403 nếu không đủ quyền

---

## Phase 2 — Product & Category Core ✅ COMPLETED

**Mục tiêu:** CRUD đầy đủ sản phẩm và danh mục với validation, tìm kiếm và phân trang kết nối trực tiếp Media Google Drive.

### Công việc

- [x] Mongoose model: Category, Product
- [x] Zod validation schemas cho Category, Product
- [x] CategoryService: CRUD + tree queries + vòng lặp detection
- [x] ProductService: CRUD + optimistic locking + status transitions
- [x] API routes: `/api/v1/products`, `/api/v1/categories` (CRUD + list)
- [x] Admin UI: Products list + filters + pagination
- [x] Admin UI: Product create/edit form
- [x] Admin UI: Categories tree view + CRUD
- [x] Slug auto-generation + uniqueness check
- [x] Draft/Active/Archived workflow
- [x] Duplicate product
- [x] Archive + restore product
- [x] Kết nối trực tiếp Media Library (Google Drive) qua MediaSelectModal
- [x] Server-side pagination (page + limit)
- [x] Search (text + regex index MongoDB)
- [x] Filter by status, category

### Deliverables

- Tạo, sửa, lưu nháp, lưu trữ và khôi phục sản phẩm
- Danh mục cây cha/con hoạt động không giới hạn cấp độ
- Tích hợp chọn ảnh thumbnail và gallery trực tiếp từ Google Drive
- Tìm kiếm và lọc hoạt động
- Phân trang server-side hoạt động

### Test criteria

- [x] CRUD product: tạo → sửa → archive → restore
- [x] Không thể tạo slug trùng (tự sinh slug-1, slug-2)
- [x] Không thể tạo category làm cha của chính nó hoặc con cháu của nó (chặn vòng lặp)
- [x] Cập nhật một phần không xóa field không được gửi lên
- [x] Optimistic lock từ chối update khi version cũ (409 CONFLICT)
- [x] Pagination trả đúng số lượng, đúng trang

---

## Phase 3 — Product Types & Variants ✅ COMPLETED

**Mục tiêu:** Hỗ trợ loại sản phẩm có cấu trúc custom fields động và quản lý biến thể với tổ hợp thuộc tính riêng biệt.

### Công việc

- [x] Mongoose model: ProductType, ProductVariant
- [x] ProductType CRUD + field management
- [x] Field key immutability enforcement
- [x] Field type change warning system
- [x] Dynamic form rendering theo ProductType (DynamicFieldsRenderer)
- [x] AttributeValue validation theo FieldDefinition (min/max, required, select options)
- [x] Variant management: tạo, sửa, xóa, vô hiệu hóa
- [x] Variant combination uniqueness check (chống trùng tổ hợp thuộc tính)
- [x] Admin UI: ProductType management (/product-types)
- [x] Admin UI: Dynamic custom fields trong product form
- [x] Admin UI: Variant editor (VariantManager)

### Test criteria

- [x] Tạo 2 product types khác nhau (Điện thoại, Thời trang) với fields riêng
- [x] Custom field validation hoạt động (required, min/max, select options)
- [x] Không thể tạo variant trùng tổ hợp attributes
- [x] Optimistic concurrency control trên biến thể (dataVersion)
- [x] Chặn xóa ProductType khi đang có sản phẩm sử dụng
- [x] Nhân bản sản phẩm kèm nhân bản toàn bộ biến thể tương ứng

---

## Phase 4 — Media Library

**Mục tiêu:** Upload, quản lý ảnh và gắn với sản phẩm.

### Công việc

- [ ] Vercel Blob storage adapter (với interface để swap provider)
- [ ] MediaFile Mongoose model
- [ ] Upload API: validation MIME + magic bytes + size limit
- [ ] Media Library UI: grid view, upload, delete
- [ ] Gắn ảnh vào sản phẩm: thumbnail + image gallery
- [ ] Thứ tự ảnh (drag & drop)
- [ ] Alt text editing
- [ ] Xử lý orphaned files (media không dùng)

### Test criteria

- [ ] Upload ảnh → URL bền vững được lưu
- [ ] Không thể upload file vượt 10MB
- [ ] Không thể upload file không phải ảnh vào ô ảnh
- [ ] Xóa sản phẩm không xóa media file tự động
- [ ] Quan hệ media-product không mất khi sửa sản phẩm

---

## Phase 5 — Projects & Module System

**Mục tiêu:** Quản lý nhiều project/site và bật/tắt module an toàn.

### Công việc

- [x] ModuleState model + Module registry
- [x] Module manifest definitions cho tất cả modules
- [x] Enable/disable module với dependency check
- [x] Project model + CRUD
- [x] Product-Project gắn/bỏ gắn
- [x] ProductProjectOverride model + UI
- [x] Field visibility config theo project
- [x] Hook system cơ bản: emit + subscribe
- [x] Admin UI: Module management
- [x] Admin UI: Project configuration

### Test criteria

- [x] Tắt module Inventory → UI ẩn, API trả 404, dữ liệu còn nguyên
- [x] Bật lại Inventory → dữ liệu cũ vẫn dùng được
- [x] Không thể tắt core module (identity, products)
- [x] Không thể tắt module khi còn module khác đang depend
- [x] 2 projects có cấu hình fields khác nhau nhưng cùng nguồn product

---

## Phase 6 — API & Integrations

**Mục tiêu:** REST API public đầy đủ cho website bên ngoài.

### Công việc

- [x] API key generation + hashing (SHA-256)
- [x] API key authentication middleware
- [x] Scope-based permission check
- [x] Rate limiting middleware
- [x] External API endpoints: products, categories, product types
- [x] Project-scoped data filtering
- [x] Webhook model: register, events, delivery
- [x] Webhook delivery: sign payload, timeout, retry (max 3)
- [x] Webhook delivery log
- [x] SSRF protection cho webhook URLs
- [x] API usage logging
- [x] Admin UI: API key management
- [x] Admin UI: Webhook management

### Test criteria

- [x] API key đọc được product theo project scope
- [x] API key không thể truy cập project khác
- [x] Full API key chỉ hiện 1 lần khi tạo
- [x] Thu hồi API key → từ chối ngay lập tức
- [x] Webhook delivery có chữ ký xác thực
- [x] Webhook thất bại không ảnh hưởng giao dịch chính

---

## Phase 7 — Import/Export

**Mục tiêu:** Nhập và xuất dữ liệu CSV an toàn.

### Công việc

- [x] CSV parser với validation từng dòng
- [x] Import preview UI
- [x] Import report (success/fail per row)
- [x] Phân biệt tạo mới vs cập nhật (theo SKU/slug)
- [x] Batch processing cho file lớn
- [x] File size limit + row limit
- [x] Import log lưu trữ
- [x] Export với filter + quyền truy cập
- [x] Admin UI: Import/Export page

### Test criteria

- [x] File CSV lỗi → không ghi bất kỳ dòng nào
- [x] Dòng hợp lệ trong file có lỗi → vẫn import được
- [x] SKU trùng → cập nhật, không tạo bản sao
- [x] Export không trả dữ liệu người dùng không có quyền xem

---

## Phase 8 — Optional Inventory Module

**Mục tiêu:** Quản lý tồn kho có kiểm soát đồng thời.

### Công việc

- [x] InventoryLocation, InventoryItem, InventoryLog models
- [x] Inventory adjustment với optimistic locking
- [x] Inventory history log bắt buộc
- [x] Báo cáo tồn kho cơ bản
- [x] Module toggle: enable/disable an toàn
- [x] Admin UI: Inventory management

### Test criteria

- [x] Cập nhật số lượng luôn tạo InventoryLog entry
- [x] Cập nhật đồng thời: một trong hai phải thất bại gracefully
- [x] Tắt module: dữ liệu kho không bị xóa
- [x] Bật lại: lịch sử còn nguyên

---

## Phase 9 — Hardening & Release

**Mục tiêu:** Test toàn diện, security review, production-ready.

### Công việc

- [x] Unit tests: services, validation, domain logic
- [x] Integration tests: API routes
- [x] E2E tests: luồng quan trọng
- [x] Security audit: auth, permissions, input validation
- [x] Performance review: slow queries, N+1, pagination
- [x] Migration test: từ seed data đến production schema
- [x] Backup/restore verification với MongoDB Atlas
- [x] Responsive UI review (desktop, tablet, mobile)
- [x] Production build + Vercel deploy config
- [x] `DEPLOYMENT.md` guide

---

## Dependency Map

```
Phase 0 (Architecture)
  └──▶ Phase 1 (Foundation)
        └──▶ Phase 2 (Products & Categories)
              ├──▶ Phase 3 (Product Types & Variants)
              │     └──▶ Phase 4 (Media Library)
              │           └──▶ Phase 5 (Projects & Modules)
              │                 ├──▶ Phase 6 (API)
              │                 │     └──▶ Phase 7 (Import/Export)
              │                 └──▶ Phase 8 (Inventory) [optional]
              └──▶ Phase 9 (Hardening) [after all above]
```

---

## Environment Variables Required

```bash
# Database
MONGODB_URI=

# Auth (NextAuth)
NEXTAUTH_SECRET=
NEXTAUTH_URL=

# File Storage (Vercel Blob)
BLOB_READ_WRITE_TOKEN=

# App Config
NEXT_PUBLIC_APP_NAME=ProductHub
NEXT_PUBLIC_APP_URL=

# (Optional) Email
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
```
