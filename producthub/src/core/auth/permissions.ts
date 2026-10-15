/**
 * Permission system — Role-based với per-user overrides.
 *
 * Mọi permission check PHẢI được thực hiện ở server (API route hoặc
 * Server Component/Action). Frontend chỉ dùng để ẩn/hiện UI,
 * KHÔNG phải để bảo mật.
 */

export type Permission =
  // Products
  | 'products.read'
  | 'products.create'
  | 'products.update'
  | 'products.archive'
  | 'products.delete'
  // Categories
  | 'categories.read'
  | 'categories.manage'
  // Attributes & Product Types
  | 'attributes.read'
  | 'attributes.manage'
  | 'product_types.read'
  | 'product_types.manage'
  // Media
  | 'media.read'
  | 'media.upload'
  | 'media.delete'
  // Projects
  | 'projects.read'
  | 'projects.manage'
  // Modules
  | 'modules.read'
  | 'modules.manage'
  // Inventory (optional module)
  | 'inventory.read'
  | 'inventory.adjust'
  // Users
  | 'users.read'
  | 'users.manage'
  // Settings
  | 'settings.read'
  | 'settings.manage'
  // API & Integrations
  | 'api_keys.read'
  | 'api_keys.manage'
  | 'webhooks.read'
  | 'webhooks.manage'
  // Audit
  | 'audit_logs.read'
  // Import/Export
  | 'import_export.read'
  | 'import_export.execute';

export type Role =
  | 'owner'
  | 'administrator'
  | 'product_manager'
  | 'editor'
  | 'viewer';

/**
 * Quyền mặc định theo role. Áp dụng nguyên tắc quyền tối thiểu.
 * Quyền cụ thể của user (additionalPermissions) sẽ được merge thêm.
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'products.read', 'products.create', 'products.update', 'products.archive', 'products.delete',
    'categories.read', 'categories.manage',
    'attributes.read', 'attributes.manage',
    'product_types.read', 'product_types.manage',
    'media.read', 'media.upload', 'media.delete',
    'projects.read', 'projects.manage',
    'modules.read', 'modules.manage',
    'inventory.read', 'inventory.adjust',
    'users.read', 'users.manage',
    'settings.read', 'settings.manage',
    'api_keys.read', 'api_keys.manage',
    'webhooks.read', 'webhooks.manage',
    'audit_logs.read',
    'import_export.read', 'import_export.execute',
  ],
  administrator: [
    'products.read', 'products.create', 'products.update', 'products.archive', 'products.delete',
    'categories.read', 'categories.manage',
    'attributes.read', 'attributes.manage',
    'product_types.read', 'product_types.manage',
    'media.read', 'media.upload', 'media.delete',
    'projects.read', 'projects.manage',
    'modules.read', 'modules.manage',
    'inventory.read', 'inventory.adjust',
    'users.read',
    'settings.read',
    'api_keys.read', 'api_keys.manage',
    'webhooks.read', 'webhooks.manage',
    'audit_logs.read',
    'import_export.read', 'import_export.execute',
  ],
  product_manager: [
    'products.read', 'products.create', 'products.update', 'products.archive',
    'categories.read', 'categories.manage',
    'attributes.read', 'attributes.manage',
    'product_types.read', 'product_types.manage',
    'media.read', 'media.upload',
    'projects.read',
    'inventory.read', 'inventory.adjust',
    'import_export.read', 'import_export.execute',
  ],
  editor: [
    'products.read', 'products.create', 'products.update',
    'categories.read',
    'attributes.read',
    'product_types.read',
    'media.read', 'media.upload',
    'inventory.read',
  ],
  viewer: [
    'products.read',
    'categories.read',
    'attributes.read',
    'product_types.read',
    'media.read',
    'inventory.read',
  ],
};

/**
 * Kiểm tra xem user có permission nhất định không.
 * Merge role permissions + per-user additional permissions.
 */
export function hasPermission(
  userRole: Role,
  userAdditionalPermissions: Permission[],
  required: Permission
): boolean {
  const rolePerms = ROLE_PERMISSIONS[userRole] ?? [];
  const allPerms = new Set([...rolePerms, ...userAdditionalPermissions]);
  return allPerms.has(required);
}

/**
 * Kiểm tra nhiều permissions cùng lúc (AND — phải có tất cả).
 */
export function hasAllPermissions(
  userRole: Role,
  userAdditionalPermissions: Permission[],
  required: Permission[]
): boolean {
  return required.every((p) =>
    hasPermission(userRole, userAdditionalPermissions, p)
  );
}

/**
 * Kiểm tra ít nhất một permission (OR).
 */
export function hasAnyPermission(
  userRole: Role,
  userAdditionalPermissions: Permission[],
  required: Permission[]
): boolean {
  return required.some((p) =>
    hasPermission(userRole, userAdditionalPermissions, p)
  );
}
