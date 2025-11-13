export interface User {
  id: string;
  email: string;
  name: string;
  company_id: string;
  role: 'admin' | 'viewer';
}

export interface AuthSession {
  user: User | null;
  isAuthenticated: boolean;
}

export const ROLES = {
  ADMIN: 'admin',
  VIEWER: 'viewer',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

export const PERMISSIONS = {
  VIEW_DASHBOARD: ['admin', 'viewer'],
  VIEW_REPORTS: ['admin', 'viewer'],
  EXPORT_DATA: ['admin'],
  MANAGE_SETTINGS: ['admin'],
  MANAGE_USERS: ['admin'],
} as const;

export function hasPermission(role: Role, permission: keyof typeof PERMISSIONS): boolean {
  return PERMISSIONS[permission].includes(role);
}

export function requirePermission(role: Role, permission: keyof typeof PERMISSIONS): void {
  if (!hasPermission(role, permission)) {
    throw new Error(`Permission denied: ${permission} requires one of ${PERMISSIONS[permission].join(', ')}`);
  }
}
