/**
 * RBAC Utilities (Legacy - being migrated to types/roles.ts)
 *
 * This file is kept for backward compatibility.
 * New code should import from types/roles.ts instead.
 */

import {
  ROLES as NEW_ROLES,
  PERMISSIONS as NEW_PERMISSIONS,
  hasPermission as newHasPermission,
  requirePermission as newRequirePermission,
  type Role as NewRole,
  type Permission as NewPermission,
} from '../types/roles';

export interface User {
  id: string;
  email: string;
  name: string;
  company_id: string;
  role: NewRole;
}

export interface AuthSession {
  user: User | null;
  isAuthenticated: boolean;
}

// Re-export new types for backward compatibility
export const ROLES = NEW_ROLES;
export type Role = NewRole;
export const PERMISSIONS = NEW_PERMISSIONS;
export type Permission = NewPermission;

// Re-export functions
export const hasPermission = newHasPermission;
export const requirePermission = newRequirePermission;
