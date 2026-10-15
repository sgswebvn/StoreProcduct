# ProductHub — Architecture Document

> **Version:** 0.1.0  
> **Date:** 2026-10-15  
> **Status:** Active — Phase 0

---

## 1. Tổng quan hệ thống

**ProductHub** là nền tảng quản lý dữ liệu sản phẩm trung tâm (Product Information Management — PIM), được thiết kế để:

- Quản lý một nguồn dữ liệu sản phẩm chuẩn dùng chung.
- Cung cấp cấu hình riêng cho nhiều website/project.
- Cung cấp API được bảo vệ để các website bên ngoài đọc dữ liệu.
- Hỗ trợ mở rộng qua hệ thống module có thể bật/tắt.

**Không phải:** cửa hàng trực tuyến, hệ thống POS, hay nền tảng thương mại điện tử.

---

## 2. Kiến trúc tổng thể

### Mô hình: Modular Monolith

```
┌─────────────────────────────────────────────────────────────────┐
│                        Next.js Application                       │
│  ┌─────────────────────┐    ┌──────────────────────────────────┐ │
│  │   Admin UI Layer    │    │        API Routes Layer          │ │
│  │  (React / RSC)      │    │       /api/v1/* (REST)           │ │
│  └────────┬────────────┘    └──────────────┬───────────────────┘ │
│           │                                │                      │
│  ┌────────▼────────────────────────────────▼───────────────────┐ │
│  │                   Application Layer                          │ │
│  │         Use Cases / Service Classes per Module               │ │
│  └────────┬────────────────────────────────────────────────────┘ │
│           │                                                       │
│  ┌────────▼────────────────────────────────────────────────────┐ │
│  │                    Domain Layer                              │ │
│  │   Entities, Value Objects, Domain Rules, Interfaces          │ │
│  └────────┬────────────────────────────────────────────────────┘ │
│           │                                                       │
│  ┌────────▼────────────────────────────────────────────────────┐ │
│  │                 Infrastructure Layer                         │ │
│  │       MongoDB (Mongoose) · File Storage · Email              │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### Các lớp phụ

- **Presentation Layer:** Admin Dashboard (React Server Components + Client Components).
- **Application Layer:** Service classes trong từng module (`src/modules/*/services/`).
- **Domain Layer:** Entities, interfaces, business rules (`src/modules/*/domain/`).
- **Infrastructure Layer:** Mongoose models, storage adapters (`src/modules/*/infra/`).
- **Integration Layer:** REST API routes, webhook handlers (`src/app/api/v1/`).

---

## 3. Công nghệ đã chọn

| Thành phần | Công nghệ | Lý do |
|---|---|---|
| Framework | **Next.js 15** (App Router) | SSR + API Routes trong cùng project; phù hợp Vercel |
| Language | **TypeScript** | Type safety, tài liệu hóa schema ngầm |
| Database | **MongoDB Atlas** | Flexible schema cho custom fields, document model phù hợp PIM |
| ODM | **Mongoose** | Schema validation, middleware hooks, type support |
| UI | **React** (RSC + Client) | Hệ sinh thái, tái sử dụng component |
| Styling | **Vanilla CSS + CSS Modules** | Không thêm runtime, không dependency nặng |
| Authentication | **NextAuth.js v5** | Tích hợp sẵn với Next.js, hỗ trợ credentials + JWT |
| Validation | **Zod** | Schema validation dùng chung server/client |
| File Storage | **Vercel Blob** (có thể swap) | Phù hợp Vercel deploy; interface trừu tượng để đổi provider |
| API Auth | API Key (hashed) + Bearer token | Đơn giản, an toàn, không cần OAuth ngay |
| Deployment | **Vercel** | Hỗ trợ Next.js tốt nhất |

### Nhược điểm đã biết và cách giảm thiểu

| Nhược điểm | Giải pháp |
|---|---|
| Serverless cold start | Mongoose connection caching, Vercel fluid compute |
| MongoDB không có strict schema | Mongoose schema + Zod validation ở application layer |
| Vercel function timeout (60s default) | Long-running job (import/export) dùng streaming hoặc background |
| Không có message queue | Database-backed job queue nếu cần, tránh thêm Redis trước khi có nhu cầu |

---

## 4. Module System

### Module Registry

Mỗi module được định nghĩa bằng một `ModuleManifest`:

```typescript
interface ModuleManifest {
  id: string;                    // unique, slug-safe
  name: string;
  version: string;
  description: string;
  dependencies: string[];        // IDs of required modules
  isCore: boolean;               // core modules cannot be disabled
  provides: string[];            // hooks/services this module exposes
  requiredPermissions: string[]; // permissions this module needs
}
```

### Module States

```
ENABLED ──disable()──▶ DISABLED ──enable()──▶ ENABLED
```

- Khi `DISABLED`: routes vẫn trả `403/404`, dữ liệu KHÔNG bị xóa.
- Khi re-enable: dữ liệu cũ vẫn intact và có thể dùng lại.
- Core modules (identity, products, categories) không thể disable.

### Hook System (Phase 5+)

Event-driven, synchronous trong giai đoạn đầu:

```typescript
type HookEvent =
  | 'product.created' | 'product.updated' | 'product.archived'
  | 'category.created' | 'category.updated'
  | 'media.uploaded'
  | 'module.enabled' | 'module.disabled';
```

---

## 5. API Design

- Base path: `/api/v1/`
- Authentication: `Authorization: Bearer <jwt>` (admin) hoặc `X-API-Key: <key>` (external)
- Response envelope:
  ```json
  { "success": true, "data": {...}, "meta": {...} }
  { "success": false, "error": { "code": "VALIDATION_ERROR", "message": "..." } }
  ```
- Pagination: offset-based với query params `page` (1-indexed), `limit` (max 100)
- Sorting: `?sort=createdAt&order=desc`
- Filtering: field-specific query params tùy endpoint
- Versioning: path-based (`/api/v1/`) — đơn giản, cache-friendly

---

## 6. Security Model

| Layer | Cơ chế |
|---|---|
| Mật khẩu | bcrypt (cost 12) |
| Admin session | NextAuth JWT, 15min access + 30d refresh, httpOnly cookie |
| External API | SHA-256 hashed API keys; hiển thị full key 1 lần |
| CSRF | SameSite=Strict cookie + Origin header check |
| Input validation | Zod — mọi request body và query params |
| Rich text | DOMPurify sanitize trước khi lưu |
| File upload | MIME + magic bytes check, max 10MB/file |
| DB queries | Mongoose BSON — parameterized by design |
| Rate limiting | Middleware trên `/api/v1/`, nâng cấp sau khi có số liệu thực tế |

---

## 7. Cấu trúc thư mục (trong `producthub/`)

```
producthub/
├── src/
│   ├── app/                        # Next.js App Router
│   │   ├── (admin)/                # Admin UI routes (protected by middleware)
│   │   │   ├── dashboard/
│   │   │   ├── products/
│   │   │   ├── categories/
│   │   │   ├── product-types/
│   │   │   ├── attributes/
│   │   │   ├── media/
│   │   │   ├── projects/
│   │   │   ├── modules/
│   │   │   ├── users/
│   │   │   ├── import-export/
│   │   │   ├── api-integrations/
│   │   │   ├── audit-logs/
│   │   │   └── settings/
│   │   ├── api/
│   │   │   └── v1/                 # Public/External REST API
│   │   │       ├── products/
│   │   │       ├── categories/
│   │   │       ├── product-types/
│   │   │       ├── attributes/
│   │   │       ├── media/
│   │   │       ├── projects/
│   │   │       └── auth/
│   │   └── auth/                   # NextAuth login pages
│   ├── core/                       # Shared infrastructure
│   │   ├── auth/                   # NextAuth config, session helpers, permissions
│   │   ├── db/                     # MongoDB connection singleton
│   │   ├── hooks/                  # Event hook registry
│   │   ├── modules/                # Module manifest registry & state manager
│   │   ├── response/               # Standardized API response helpers
│   │   └── validation/             # Shared Zod base schemas
│   ├── modules/                    # Feature modules (bounded contexts)
│   │   ├── products/
│   │   │   ├── domain/             # Types, interfaces, business rules
│   │   │   ├── infra/              # Mongoose model
│   │   │   ├── services/           # ProductService use cases
│   │   │   └── validation/         # Zod schemas
│   │   ├── categories/
│   │   ├── attributes/
│   │   ├── media/
│   │   ├── inventory/              # Optional module (disabled by default)
│   │   ├── integrations/           # API keys, webhooks
│   │   ├── audit/
│   │   └── users/
│   └── components/                 # Shared UI components
│       ├── ui/                     # Primitives: Button, Input, Badge, Modal
│       ├── layout/                 # AdminShell, Sidebar, TopBar
│       ├── forms/                  # FormField, RichTextEditor, ImageUpload
│       └── data/                   # DataTable, Pagination, FilterBar
├── docs/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── .env.example
```

---

## 8. Quyết định kiến trúc cần xem xét lại trong tương lai

| # | Quyết định hiện tại | Khi nào cần xem xét lại |
|---|---|---|
| 1 | Monolith thay vì microservices | Khi > 3 team độc lập phát triển song song |
| 2 | Vercel Blob cho file storage | Khi cần image processing nâng cao hoặc CDN riêng |
| 3 | Synchronous hooks | Khi webhook/event handlers > 500ms |
| 4 | JWT trong httpOnly cookie | Khi cần native mobile app |
| 5 | MongoDB Atlas M0 (free) | Khi dataset > 512MB hoặc cần connection pool lớn |
| 6 | Offset pagination | Khi dataset > 1M records (cân nhắc cursor-based) |
