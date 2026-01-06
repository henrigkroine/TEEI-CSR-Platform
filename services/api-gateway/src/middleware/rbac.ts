import { FastifyRequest, FastifyReply } from 'fastify';
import { AuthenticatedRequest } from './auth.js';
import { TenantRequest, getTenantContext } from './tenantScope.js';

/**
 * System-wide roles in the TEEI CSR Platform
 */
export enum SystemRole {
  SYSTEM_ADMIN = 'system_admin',     // Full platform access
  COMPANY_ADMIN = 'company_admin',   // Admin within company tenant
  COMPANY_USER = 'company_user',     // Standard user within company
  PARTICIPANT = 'participant',        // Program participant (read-only)
  VOLUNTEER = 'volunteer',            // Volunteer (limited access)
  API_CLIENT = 'api_client'           // External API integration
}

/**
 * Permissions for fine-grained access control
 */
export enum Permission {
  // Company Management
  COMPANY_READ = 'company:read',
  COMPANY_WRITE = 'company:write',
  COMPANY_DELETE = 'company:delete',
  COMPANY_SETTINGS = 'company:settings',

  // User Management
  USER_READ = 'user:read',
  USER_WRITE = 'user:write',
  USER_DELETE = 'user:delete',
  USER_INVITE = 'user:invite',

  // Data Access
  DATA_READ = 'data:read',
  DATA_WRITE = 'data:write',
  DATA_DELETE = 'data:delete',
  DATA_EXPORT = 'data:export',

  // Reports & Analytics
  REPORT_VIEW = 'report:view',
  REPORT_CREATE = 'report:create',
  REPORT_EXPORT = 'report:export',
  ANALYTICS_VIEW = 'analytics:view',

  // API Keys
  API_KEY_READ = 'api_key:read',
  API_KEY_CREATE = 'api_key:create',
  API_KEY_REVOKE = 'api_key:revoke',
  API_KEY_REGENERATE = 'api_key:regenerate',

  // Audit Logs
  AUDIT_LOG_VIEW = 'audit_log:view',

  // System Administration
  SYSTEM_ADMIN_ACCESS = 'system:admin'
}

/**
 * Role-to-Permission mapping
 * Defines which permissions each role has by default
 */
export const ROLE_PERMISSIONS: Record<SystemRole, Permission[]> = {
  [SystemRole.SYSTEM_ADMIN]: [
    // System admins have all permissions
    ...Object.values(Permission)
  ],

  [SystemRole.COMPANY_ADMIN]: [
    // Company management
    Permission.COMPANY_READ,
    Permission.COMPANY_WRITE,
    Permission.COMPANY_SETTINGS,

    // User management within company
    Permission.USER_READ,
    Permission.USER_WRITE,
    Permission.USER_DELETE,
    Permission.USER_INVITE,

    // Data access
    Permission.DATA_READ,
    Permission.DATA_WRITE,
    Permission.DATA_DELETE,
    Permission.DATA_EXPORT,

    // Reports
    Permission.REPORT_VIEW,
    Permission.REPORT_CREATE,
    Permission.REPORT_EXPORT,
    Permission.ANALYTICS_VIEW,

    // API keys
    Permission.API_KEY_READ,
    Permission.API_KEY_CREATE,
    Permission.API_KEY_REVOKE,
    Permission.API_KEY_REGENERATE,

    // Audit logs
    Permission.AUDIT_LOG_VIEW
  ],

  [SystemRole.COMPANY_USER]: [
    // Read-only company info
    Permission.COMPANY_READ,

    // Limited user access
    Permission.USER_READ,

    // Data access
    Permission.DATA_READ,
    Permission.DATA_WRITE,
    Permission.DATA_EXPORT,

    // Reports
    Permission.REPORT_VIEW,
    Permission.REPORT_EXPORT,
    Permission.ANALYTICS_VIEW
  ],

  [SystemRole.PARTICIPANT]: [
    // Very limited access
    Permission.COMPANY_READ,
    Permission.DATA_READ,
    Permission.REPORT_VIEW
  ],

  [SystemRole.VOLUNTEER]: [
    // Similar to participant
    Permission.COMPANY_READ,
    Permission.DATA_READ,
    Permission.REPORT_VIEW
  ],

  [SystemRole.API_CLIENT]: [
    // Programmatic access
    Permission.COMPANY_READ,
    Permission.DATA_READ,
    Permission.DATA_WRITE,
    Permission.REPORT_VIEW
  ]
};

/**
 * Check if a role has a specific permission
 */
export function roleHasPermission(role: SystemRole, permission: Permission): boolean {
  const rolePermissions = ROLE_PERMISSIONS[role] || [];
  return rolePermissions.includes(permission);
}

/**
 * Check if user has required permission
 */
export function hasPermission(request: FastifyRequest, permission: Permission): boolean {
  const authRequest = request as AuthenticatedRequest;
  const userRole = authRequest.user?.role as SystemRole;

  if (!userRole) {
    return false;
  }

  // Check tenant-specific role if available
  try {
    const tenantContext = getTenantContext(request);
    const tenantRole = tenantContext.role as SystemRole;

    // Use tenant role if more permissive than user role
    if (roleHasPermission(tenantRole, permission)) {
      return true;
    }
  } catch {
    // No tenant context, use user role
  }

  return roleHasPermission(userRole, permission);
}

/**
 * Require specific role(s) middleware
 * Ensures user has one of the allowed roles
 */
export function requireRole(...allowedRoles: SystemRole[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authRequest = request as AuthenticatedRequest;

    if (!authRequest.user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    const userRole = authRequest.user.role as SystemRole;

    // Check tenant role if available
    let effectiveRole = userRole;
    try {
      const tenantContext = getTenantContext(request);
      effectiveRole = tenantContext.role as SystemRole;
    } catch {
      // No tenant context, use user role
    }

    if (!allowedRoles.includes(effectiveRole as SystemRole)) {
      request.log.warn({
        userId: authRequest.user.userId,
        userRole: effectiveRole,
        requiredRoles: allowedRoles,
        url: request.url
      }, 'Role-based access denied');

      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: `Access denied. Required roles: ${allowedRoles.join(', ')}`,
        requiredRoles: allowedRoles,
        userRole: effectiveRole
      });
    }
  };
}

/**
 * Require specific permission(s) middleware
 * More fine-grained than role-based access
 */
export function requirePermission(...requiredPermissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const authRequest = request as AuthenticatedRequest;

    if (!authRequest.user) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required'
      });
    }

    // Check if user has all required permissions
    const missingPermissions = requiredPermissions.filter(
      permission => !hasPermission(request, permission)
    );

    if (missingPermissions.length > 0) {
      request.log.warn({
        userId: authRequest.user.userId,
        missingPermissions,
        url: request.url
      }, 'Permission-based access denied');

      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'You do not have the required permissions to access this resource',
        requiredPermissions,
        missingPermissions
      });
    }
  };
}

/**
 * Pre-defined role middleware helpers
 */
export const requireSystemAdmin = requireRole(SystemRole.SYSTEM_ADMIN);

export const requireCompanyAdmin = requireRole(
  SystemRole.SYSTEM_ADMIN,
  SystemRole.COMPANY_ADMIN
);

export const requireCompanyUser = requireRole(
  SystemRole.SYSTEM_ADMIN,
  SystemRole.COMPANY_ADMIN,
  SystemRole.COMPANY_USER
);

export const requireParticipant = requireRole(
  SystemRole.SYSTEM_ADMIN,
  SystemRole.COMPANY_ADMIN,
  SystemRole.COMPANY_USER,
  SystemRole.PARTICIPANT
);

/**
 * Tenant admin check middleware
 * Ensures user is admin of the current tenant (not global admin)
 */
export async function requireTenantAdmin(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const authRequest = request as AuthenticatedRequest;

  if (!authRequest.user) {
    return reply.status(401).send({
      success: false,
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  try {
    const tenantContext = getTenantContext(request);

    if (tenantContext.role !== SystemRole.COMPANY_ADMIN &&
        tenantContext.role !== SystemRole.SYSTEM_ADMIN) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'Company admin access required'
      });
    }
  } catch (error) {
    return reply.status(403).send({
      success: false,
      error: 'Forbidden',
      message: 'Tenant context required for admin operations'
    });
  }
}

/**
 * Route-level RBAC configuration
 * Example usage:
 *
 * const routeConfig = {
 *   onRequest: [
 *     authenticateJWT,
 *     tenantScope,
 *     requirePermission(Permission.DATA_WRITE)
 *   ]
 * };
 */
export interface RBACConfig {
  roles?: SystemRole[];
  permissions?: Permission[];
  requireTenant?: boolean;
  requireTenantAdmin?: boolean;
}

/**
 * Create RBAC middleware from configuration
 */
export function createRBACMiddleware(config: RBACConfig) {
  const middleware: Array<(req: FastifyRequest, reply: FastifyReply) => Promise<void>> = [];

  if (config.roles && config.roles.length > 0) {
    middleware.push(requireRole(...config.roles));
  }

  if (config.permissions && config.permissions.length > 0) {
    middleware.push(requirePermission(...config.permissions));
  }

  if (config.requireTenantAdmin) {
    middleware.push(requireTenantAdmin);
  }

  return middleware;
}

/**
 * Get user's effective permissions
 * Useful for frontend to show/hide UI elements
 */
export function getUserPermissions(request: FastifyRequest): Permission[] {
  const authRequest = request as AuthenticatedRequest;

  if (!authRequest.user) {
    return [];
  }

  const userRole = authRequest.user.role as SystemRole;
  let effectiveRole = userRole;

  // Check tenant role if available
  try {
    const tenantContext = getTenantContext(request);
    effectiveRole = tenantContext.role as SystemRole;
  } catch {
    // No tenant context, use user role
  }

  return ROLE_PERMISSIONS[effectiveRole] || [];
}
