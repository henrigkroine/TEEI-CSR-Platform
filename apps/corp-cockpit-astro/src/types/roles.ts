/**
 * Role Types and Hierarchy
 *
 * Defines the role system with clear hierarchy and inheritance
 */

export const ROLES = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  MANAGER: 'MANAGER',
  VIEWER: 'VIEWER',
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Role Hierarchy (from highest to lowest privilege)
 *
 * SUPER_ADMIN > ADMIN > MANAGER > VIEWER
 *
 * Higher roles inherit all permissions from lower roles
 */
export const ROLE_HIERARCHY: Record<Role, number> = {
  SUPER_ADMIN: 4,
  ADMIN: 3,
  MANAGER: 2,
  VIEWER: 1,
};

/**
 * Checks if a role has at least the specified level of access
 *
 * @example
 * hasRoleLevel('ADMIN', 'MANAGER') // true (ADMIN >= MANAGER)
 * hasRoleLevel('VIEWER', 'ADMIN') // false (VIEWER < ADMIN)
 */
export function hasRoleLevel(userRole: Role, requiredRole: Role): boolean {
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[requiredRole];
}

/**
 * Permission definitions by resource type
 */
export const PERMISSIONS = {
  // Dashboard permissions
  VIEW_DASHBOARD: [ROLES.VIEWER, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  EDIT_DASHBOARD_LAYOUT: [ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Widget permissions
  VIEW_WIDGETS: [ROLES.VIEWER, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  CONFIGURE_WIDGETS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Data export permissions
  EXPORT_DATA: [ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  EXPORT_RAW_DATA: [ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Report permissions
  VIEW_REPORTS: [ROLES.VIEWER, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  GENERATE_REPORTS: [ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  EDIT_REPORTS: [ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  SCHEDULE_REPORTS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Evidence Explorer permissions
  VIEW_EVIDENCE: [ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  VIEW_EVIDENCE_DETAILS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Sharing permissions
  CREATE_SHARE_LINKS: [ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  REVOKE_SHARE_LINKS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Saved Views permissions
  CREATE_VIEWS: [ROLES.VIEWER, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  SHARE_VIEWS: [ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  DELETE_OTHERS_VIEWS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Admin Console permissions
  ADMIN_CONSOLE: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  MANAGE_API_KEYS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  MANAGE_INTEGRATIONS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  MANAGE_THEME: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  OVERRIDE_WEIGHTS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // User management permissions
  MANAGE_USERS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  ASSIGN_ROLES: [ROLES.SUPER_ADMIN],

  // Cross-tenant permissions (SUPER_ADMIN only)
  ACCESS_ALL_TENANTS: [ROLES.SUPER_ADMIN],
  MANAGE_ALL_COMPANIES: [ROLES.SUPER_ADMIN],

  // Impact-In permissions
  VIEW_IMPACTIN_MONITOR: [ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  REPLAY_IMPACTIN_DELIVERY: [ROLES.ADMIN, ROLES.SUPER_ADMIN],

  // Campaign permissions (SWARM 6)
  VIEW_CAMPAIGNS: [ROLES.VIEWER, ROLES.MANAGER, ROLES.ADMIN, ROLES.SUPER_ADMIN],
  MANAGE_CAMPAIGNS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  CREATE_CAMPAIGNS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  EDIT_CAMPAIGNS: [ROLES.ADMIN, ROLES.SUPER_ADMIN],
  DELETE_CAMPAIGNS: [ROLES.SUPER_ADMIN],
} as const;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Checks if a role has a specific permission
 */
export function hasPermission(role: Role, permission: Permission): boolean {
  return PERMISSIONS[permission].includes(role);
}

/**
 * Throws an error if role lacks permission
 */
export function requirePermission(role: Role, permission: Permission): void {
  if (!hasPermission(role, permission)) {
    throw new Error(
      `Permission denied: ${permission} requires one of [${PERMISSIONS[permission].join(', ')}], but user has ${role}`
    );
  }
}

/**
 * Returns a list of all permissions a role has
 */
export function getRolePermissions(role: Role): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((permission) =>
    hasPermission(role, permission)
  );
}

/**
 * Role descriptions for UI display
 */
export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: 'Full system access across all companies',
  ADMIN: 'Company administrator with full access to all features',
  MANAGER: 'Can view, export, and generate reports',
  VIEWER: 'Read-only access to dashboard and reports',
};

/**
 * Role labels for UI display
 */
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  VIEWER: 'Viewer',
};
