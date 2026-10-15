import type { Permission } from '@/core/auth/permissions';

export type NavGroup = 'overview' | 'catalog' | 'media' | 'data' | 'system';

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  version: string;
  isCore: boolean;
  defaultEnabled: boolean;
  icon: string;
  navGroup: NavGroup;
  order: number;
  path: string;
  requiredPermissions: Permission[];
  dependencies?: string[];
}

export interface ModuleState {
  id: string;
  enabled: boolean;
  settings?: Record<string, unknown>;
  updatedAt?: Date;
}
