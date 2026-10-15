# ProductHub — Data Model

> **Version:** 0.1.0  
> **Date:** 2026-10-15  
> **Status:** Active — Phase 0

---

## Nguyên tắc thiết kế

1. Mỗi collection có `_id` (ObjectId) và `slug` ổn định — không thay đổi slug tùy tiện vì ảnh hưởng API.
2. Soft delete qua trường `status` thay vì xóa vật lý (trừ khi có confirm rõ ràng).
3. Audit fields bắt buộc: `createdAt`, `updatedAt`, `createdBy`, `updatedBy`.
4. Quan hệ được lưu dưới dạng ObjectId reference (`ref`), không nhúng toàn bộ document.
5. Custom fields có schema xác định, KHÔNG lưu key-value tùy ý không có validation.

---

## 1. User (users collection)

```typescript
interface User {
  _id: ObjectId;
  email: string;           // unique, lowercase
  passwordHash: string;    // bcrypt, KHÔNG bao giờ expose
  name: string;
  avatar?: string;         // URL
  role: 'owner' | 'administrator' | 'product_manager' | 'editor' | 'viewer';
  permissions: string[];   // thêm/bớt permission cụ thể ngoài role
  status: 'active' | 'inactive' | 'suspended';
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `email` (unique)

---

## 2. ProductType (product_types collection)

Định nghĩa loại sản phẩm và cấu trúc custom fields.

```typescript
interface FieldDefinition {
  key: string;             // internal key, slug-safe, immutable
  label: string;           // display label
  type: FieldType;         // see below
  required: boolean;
  defaultValue?: unknown;
  options?: string[];      // for select/multi-select
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;      // regex string
    message?: string;
  };
  searchable: boolean;
  filterable: boolean;
  showInList: boolean;
  order: number;
}

type FieldType =
  | 'text' | 'textarea' | 'richtext'
  | 'number' | 'boolean' | 'date'
  | 'single_select' | 'multi_select'
  | 'url' | 'image_ref' | 'file_ref';

interface ProductType {
  _id: ObjectId;
  name: string;
  slug: string;            // unique
  description?: string;
  fields: FieldDefinition[];
  variantAttributes: string[];  // field keys used for variants
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;     // ref: User
}
```

**Indexes:** `slug` (unique)

**Lưu ý:** Khi thay đổi `type` của một field đã có dữ liệu, hệ thống phải cảnh báo và yêu cầu migration plan. Key của field là immutable sau khi tạo.

---

## 3. Category (categories collection)

Cây danh mục, hỗ trợ cha/con.

```typescript
interface Category {
  _id: ObjectId;
  name: string;
  slug: string;            // unique
  description?: string;
  parentId?: ObjectId;     // ref: Category; null = root
  ancestors: ObjectId[];   // materialized path for efficient tree queries
  status: 'active' | 'inactive';
  order: number;           // sort order within siblings
  metadata?: Record<string, string>;  // simple key-value, validated
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}
```

**Indexes:** `slug` (unique), `parentId`, `ancestors`

**Ràng buộc:**
- `parentId` không được trỏ về chính nó (`_id`).
- Không tạo vòng lặp (A → B → A).
- Trước khi xóa category: cảnh báo nếu có sản phẩm đang tham chiếu.
- Khi di chuyển category (đổi `parentId`): cập nhật lại `ancestors` của toàn bộ subtree.

---

## 4. Product (products collection)

```typescript
interface ProductAttribute {
  key: string;             // trỏ về FieldDefinition.key
  value: unknown;          // validated theo FieldDefinition.type
}

interface Product {
  _id: ObjectId;
  name: string;
  slug: string;            // unique
  sku?: string;            // internal code, unique nếu có
  shortDescription?: string;
  description?: string;    // sanitized rich text
  productTypeId: ObjectId; // ref: ProductType
  status: 'draft' | 'active' | 'archived';
  categories: ObjectId[];  // ref: Category[]
  brandId?: ObjectId;      // ref: Brand (Phase sau)
  thumbnail?: ObjectId;    // ref: MediaFile
  images: ObjectId[];      // ref: MediaFile[]
  referencePrice?: number; // giá tham khảo, không bắt buộc
  attributes: ProductAttribute[];  // custom fields theo productType
  tags?: string[];
  dataVersion: number;     // optimistic locking — increment on each save
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
  updatedBy: ObjectId;
}
```

**Indexes:** `slug` (unique), `sku` (unique sparse), `productTypeId`, `categories`, `status`, `createdAt`

**Cập nhật một phần (PATCH):** Chỉ cập nhật các field được gửi lên. Field không có trong request body KHÔNG bị ghi đè thành null/empty.

**Optimistic locking:** Khi cập nhật, client gửi `dataVersion` hiện tại. Server từ chối nếu version không khớp (đã có người khác cập nhật trước).

---

## 5. ProductVariant (product_variants collection)

```typescript
interface VariantAttribute {
  key: string;
  value: string | number;
}

interface ProductVariant {
  _id: ObjectId;
  productId: ObjectId;     // ref: Product
  name: string;            // tên biến thể, ví dụ: "Đen - L"
  sku?: string;            // unique nếu có
  attributes: VariantAttribute[];  // ví dụ: [{key: 'color', value: 'black'}, {key: 'size', value: 'L'}]
  status: 'active' | 'inactive';
  dataVersion: number;
  createdAt: Date;
  updatedAt: Date;
}
```

**Indexes:** `productId`, `sku` (unique sparse)

**Ràng buộc:** Không có 2 variants cùng tổ hợp attributes trong cùng product.

---

## 6. MediaFile (media_files collection)

```typescript
interface MediaFile {
  _id: ObjectId;
  filename: string;        // tên file gốc
  storedName: string;      // tên file sau khi lưu (UUID-based)
  mimeType: string;        // validated: image/jpeg, image/png, ...
  size: number;            // bytes
  url: string;             // URL bền vững từ storage provider
  altText?: string;
  width?: number;          // pixels, nếu là ảnh
  height?: number;
  storageProvider: 'vercel_blob' | 'local';  // để sau có thể swap
  usedIn: Array<{
    entityType: 'product' | 'category' | 'user';
    entityId: ObjectId;
  }>;
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
}
```

**Indexes:** `url` (unique), `createdBy`, `mimeType`

**Lưu ý:** URL phải là URL bền vững từ storage provider, KHÔNG lưu blob URL tạm thời. Binary data KHÔNG lưu trong MongoDB.

---

## 7. Project (projects collection)

Cấu hình riêng cho mỗi website/dự án sử dụng ProductHub.

```typescript
interface FieldVisibilityConfig {
  fieldKey: string;
  visible: boolean;
  overrideLabel?: string;
  order?: number;
}

interface Project {
  _id: ObjectId;
  name: string;
  slug: string;            // unique
  description?: string;
  domain?: string;         // domain của website sử dụng
  status: 'active' | 'inactive';
  allowedProductTypes: ObjectId[];  // ref: ProductType[]
  fieldVisibility: FieldVisibilityConfig[];
  enabledModules: string[];  // module IDs được phép dùng trong project này
  apiConfig: {
    rateLimit?: number;    // requests/minute
    allowedOrigins?: string[];
  };
  pinnedProducts: ObjectId[];  // sản phẩm được gắn vào project này
  createdAt: Date;
  updatedAt: Date;
  createdBy: ObjectId;
}
```

**Indexes:** `slug` (unique), `domain`

---

## 8. ProductProjectOverride (product_project_overrides collection)

Override dữ liệu hiển thị của sản phẩm theo project mà KHÔNG thay đổi dữ liệu gốc.

```typescript
interface ProductProjectOverride {
  _id: ObjectId;
  productId: ObjectId;     // ref: Product
  projectId: ObjectId;     // ref: Project
  overrides: {
    name?: string;
    shortDescription?: string;
    order?: number;        // thứ tự hiển thị trong project
    isHidden?: boolean;    // ẩn khỏi project này
  };
  createdAt: Date;
  updatedAt: Date;
  updatedBy: ObjectId;
}
```

**Indexes:** `{productId, projectId}` (unique compound)

---

## 9. ApiKey (api_keys collection)

```typescript
interface ApiKey {
  _id: ObjectId;
  name: string;            // mô tả, ví dụ: "Website A - Read Only"
  keyHash: string;         // SHA-256 hash của key thực — KHÔNG lưu key gốc
  keyPrefix: string;       // 8 ký tự đầu để nhận diện, ví dụ: "ph_1a2b3c4d"
  projectId: ObjectId;     // ref: Project
  scopes: string[];        // permissions: ['products.read', 'categories.read']
  status: 'active' | 'revoked';
  lastUsedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  createdBy: ObjectId;
}
```

**Indexes:** `keyHash` (unique), `projectId`, `status`

---

## 10. AuditLog (audit_logs collection)

```typescript
interface AuditLog {
  _id: ObjectId;
  userId: ObjectId;        // ref: User
  action: string;          // ví dụ: 'product.created', 'module.disabled'
  entityType: string;      // 'product', 'category', 'user', ...
  entityId: ObjectId;
  changes?: {
    before: Record<string, unknown>;
    after: Record<string, unknown>;
  };
  metadata?: Record<string, unknown>;  // IP, user agent, ...
  createdAt: Date;
}
```

**Indexes:** `userId`, `entityType + entityId`, `action`, `createdAt`

**Lưu ý:** AuditLog là append-only, không có update hay delete.

---

## 11. ModuleState (module_states collection)

```typescript
interface ModuleState {
  _id: ObjectId;
  moduleId: string;        // ref: ModuleManifest.id
  enabled: boolean;
  enabledAt?: Date;
  disabledAt?: Date;
  updatedBy: ObjectId;
}
```

**Indexes:** `moduleId` (unique)

---

## 12. InventoryLocation (inventory_locations collection) — Optional Module

```typescript
interface InventoryLocation {
  _id: ObjectId;
  name: string;
  address?: string;
  status: 'active' | 'inactive';
  createdAt: Date;
}
```

---

## 13. InventoryItem (inventory_items collection) — Optional Module

```typescript
interface InventoryItem {
  _id: ObjectId;
  productId: ObjectId;       // ref: Product
  variantId?: ObjectId;      // ref: ProductVariant
  locationId: ObjectId;      // ref: InventoryLocation
  quantity: number;          // >= 0
  minimumQuantity?: number;  // cảnh báo khi dưới ngưỡng
  updatedAt: Date;
}
```

**Indexes:** `{productId, variantId, locationId}` (unique compound)

---

## 14. InventoryLog (inventory_logs collection) — Optional Module

```typescript
interface InventoryLog {
  _id: ObjectId;
  inventoryItemId: ObjectId;
  type: 'initial' | 'adjustment' | 'correction';
  quantityBefore: number;
  quantityAfter: number;
  delta: number;             // quantityAfter - quantityBefore
  reason: string;            // bắt buộc
  performedBy: ObjectId;
  performedAt: Date;
  notes?: string;
}
```

**Indexes:** `inventoryItemId`, `performedAt`

---

## Quan hệ tổng thể

```
User ─────────────────── creates/updates everything
ProductType ───────────── defines FieldDefinitions
Product ──────────────── belongs to ProductType
Product ──────────────── has many Categories
Product ──────────────── has many ProductVariants
Product ──────────────── has many MediaFiles
Project ──────────────── pins Products (many-to-many)
Project ──────────────── has ProductProjectOverrides
Project ──────────────── has ApiKeys
AuditLog ─────────────── records all significant actions
ModuleState ──────────── tracks enabled/disabled modules
InventoryItem ────────── links Product/Variant + Location
InventoryLog ─────────── audit trail for inventory changes
```
