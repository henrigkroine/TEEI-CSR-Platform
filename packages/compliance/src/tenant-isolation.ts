/**
 * Tenant Isolation Middleware
 *
 * Enforces multi-tenant data isolation at the application layer.
 * Ensures users can only access data within their company/tenant scope.
 *
 * Features:
 * - Automatic company_id filtering on all queries
 * - Request context propagation
 * - RBAC enforcement
 * - Cross-tenant access prevention
 *
 * Usage in Fastify:
 * ```typescript
 * fastify.addHook('onRequest', tenantIsolationHook);
 * ```
 */

import type { FastifyRequest, FastifyReply } from 'fastify';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';
import { eq } from 'drizzle-orm';
import { companyUsers } from '@teei/shared-schema';

/**
 * User context with tenant information
 */
export interface TenantContext {
  userId: string;
  email: string;
  role: string;
  companyId: string | null; // null for super admins
  permissions: string[];
}

/**
 * Roles and permissions
 */
export enum Role {
  SUPER_ADMIN = 'super_admin', // Platform admin (no tenant restrictions)
  COMPANY_ADMIN = 'company_admin', // Company administrator
  COMPANY_USER = 'company_user', // Regular company user
  PARTICIPANT = 'participant', // Program participant
  VOLUNTEER = 'volunteer', // Volunteer/mentor
}

/**
 * Permissions
 */
export enum Permission {
  // Company data
  READ_COMPANY_DATA = 'read:company_data',
  WRITE_COMPANY_DATA = 'write:company_data',
  DELETE_COMPANY_DATA = 'delete:company_data',

  // User management
  READ_USERS = 'read:users',
  WRITE_USERS = 'write:users',
  DELETE_USERS = 'delete:users',

  // Programs
  READ_PROGRAMS = 'read:programs',
  WRITE_PROGRAMS = 'write:programs',
  MANAGE_PROGRAMS = 'manage:programs',

  // Privacy
  EXPORT_DATA = 'export:data',
  DELETE_DATA = 'delete:data',

  // Admin
  MANAGE_SETTINGS = 'manage:settings',
  VIEW_AUDIT_LOGS = 'view:audit_logs',
}

/**
 * Role-based permission mappings
 */
export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  [Role.SUPER_ADMIN]: Object.values(Permission), // All permissions
  [Role.COMPANY_ADMIN]: [
    Permission.READ_COMPANY_DATA,
    Permission.WRITE_COMPANY_DATA,
    Permission.READ_USERS,
    Permission.WRITE_USERS,
    Permission.READ_PROGRAMS,
    Permission.WRITE_PROGRAMS,
    Permission.MANAGE_PROGRAMS,
    Permission.EXPORT_DATA,
    Permission.MANAGE_SETTINGS,
    Permission.VIEW_AUDIT_LOGS,
  ],
  [Role.COMPANY_USER]: [
    Permission.READ_COMPANY_DATA,
    Permission.READ_PROGRAMS,
    Permission.EXPORT_DATA,
  ],
  [Role.PARTICIPANT]: [Permission.READ_PROGRAMS, Permission.EXPORT_DATA],
  [Role.VOLUNTEER]: [Permission.READ_PROGRAMS, Permission.WRITE_PROGRAMS],
};

/**
 * Get permissions for a role
 */
export function getPermissionsForRole(role: string): Permission[] {
  return ROLE_PERMISSIONS[role as Role] || [];
}

/**
 * Check if user has permission
 */
export function hasPermission(context: TenantContext, permission: Permission): boolean {
  return context.permissions.includes(permission);
}

/**
 * Tenant Isolation Service
 */
export class TenantIsolationService {
  constructor(private db: PostgresJsDatabase) {}

  /**
   * Get tenant context for user
   */
  async getTenantContext(userId: string): Promise<TenantContext | null> {
    try {
      // Get user
      const user = await this.db.query.users.findFirst({
        where: eq((schema: any) => schema.users.id, userId),
      });

      if (!user) {
        return null;
      }

      // Get user's company
      let companyId: string | null = null;
      if (user.role !== Role.SUPER_ADMIN) {
        const companyUser = await this.db.query.companyUsers.findFirst({
          where: eq(companyUsers.userId, userId),
        });
        companyId = companyUser?.companyId || null;
      }

      // Get permissions based on role
      const permissions = getPermissionsForRole(user.role);

      return {
        userId: user.id,
        email: user.email,
        role: user.role,
        companyId,
        permissions,
      };
    } catch (error) {
      console.error('Failed to get tenant context:', error);
      return null;
    }
  }

  /**
   * Verify user has access to company resource
   */
  async verifyCompanyAccess(userId: string, resourceCompanyId: string): Promise<boolean> {
    const context = await this.getTenantContext(userId);

    if (!context) {
      return false;
    }

    // Super admins can access all companies
    if (context.role === Role.SUPER_ADMIN) {
      return true;
    }

    // Regular users can only access their own company
    return context.companyId === resourceCompanyId;
  }

  /**
   * Verify user has permission
   */
  async verifyPermission(userId: string, permission: Permission): Promise<boolean> {
    const context = await this.getTenantContext(userId);

    if (!context) {
      return false;
    }

    return hasPermission(context, permission);
  }

  /**
   * Get company ID filter for queries
   * Returns null for super admins (no filtering needed)
   */
  async getCompanyFilter(userId: string): Promise<string | null> {
    const context = await this.getTenantContext(userId);

    if (!context) {
      throw new Error('User not found');
    }

    // Super admins see all data
    if (context.role === Role.SUPER_ADMIN) {
      return null;
    }

    // Regular users only see their company data
    if (!context.companyId) {
      throw new Error('User has no company association');
    }

    return context.companyId;
  }
}

/**
 * Fastify request extension for tenant context
 */
declare module 'fastify' {
  interface FastifyRequest {
    tenantContext?: TenantContext;
  }
}

/**
 * Create tenant isolation hook for Fastify
 */
export function createTenantIsolationHook(db: PostgresJsDatabase) {
  const service = new TenantIsolationService(db);

  return async function tenantIsolationHook(request: FastifyRequest, reply: FastifyReply) {
    // Skip for public routes
    const publicRoutes = ['/health', '/auth/login', '/auth/register'];
    if (publicRoutes.some((route) => request.url.startsWith(route))) {
      return;
    }

    // Get user from JWT (assumes JWT middleware ran first)
    const user = (request as any).user;
    if (!user || !user.userId) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Get tenant context
    const context = await service.getTenantContext(user.userId);
    if (!context) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'User not found or no company association',
      });
    }

    // Attach to request
    request.tenantContext = context;

    // Log tenant context for debugging
    request.log.debug({
      userId: context.userId,
      companyId: context.companyId,
      role: context.role,
    }, 'Tenant context attached');
  };
}

/**
 * Middleware to enforce permission
 */
export function requirePermission(permission: Permission) {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const context = request.tenantContext;

    if (!context) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Tenant context not found',
      });
    }

    if (!hasPermission(context, permission)) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: `Missing required permission: ${permission}`,
      });
    }
  };
}

/**
 * Middleware to enforce company access
 */
export function requireCompanyAccess() {
  return async function (request: FastifyRequest, reply: FastifyReply) {
    const context = request.tenantContext;

    if (!context) {
      return reply.status(401).send({
        success: false,
        error: 'Unauthorized',
        message: 'Tenant context not found',
      });
    }

    // Extract company_id from request (query param or body)
    const companyId =
      (request.query as any).company_id ||
      (request.params as any).companyId ||
      (request.body as any)?.companyId;

    if (!companyId) {
      return reply.status(400).send({
        success: false,
        error: 'BadRequest',
        message: 'company_id is required',
      });
    }

    // Super admins can access any company
    if (context.role === Role.SUPER_ADMIN) {
      return;
    }

    // Verify user has access to this company
    if (context.companyId !== companyId) {
      return reply.status(403).send({
        success: false,
        error: 'Forbidden',
        message: 'Access denied to this company resource',
      });
    }
  };
}

/**
 * Query helper: Add company_id filter
 */
export function addCompanyFilter(baseQuery: any, context: TenantContext): any {
  // Super admins see all data (no filter)
  if (context.role === Role.SUPER_ADMIN) {
    return baseQuery;
  }

  // Add company_id filter for regular users
  if (!context.companyId) {
    throw new Error('User has no company association');
  }

  return {
    ...baseQuery,
    companyId: context.companyId,
  };
}

/**
 * Create tenant isolation service
 */
export function createTenantIsolationService(db: PostgresJsDatabase): TenantIsolationService {
  return new TenantIsolationService(db);
}

/**
 * Example usage:
 *
 * ```typescript
 * // In API Gateway setup
 * const tenantHook = createTenantIsolationHook(db);
 * fastify.addHook('onRequest', tenantHook);
 *
 * // In route handler - permission check
 * fastify.get('/api/users', {
 *   preHandler: requirePermission(Permission.READ_USERS)
 * }, async (request, reply) => {
 *   const context = request.tenantContext!;
 *
 *   // Query with automatic company filtering
 *   const users = await db.query.users.findMany({
 *     where: addCompanyFilter({}, context)
 *   });
 *
 *   return { users };
 * });
 *
 * // In route handler - company access check
 * fastify.get('/api/companies/:companyId', {
 *   preHandler: requireCompanyAccess()
 * }, async (request, reply) => {
 *   const { companyId } = request.params;
 *   // User access already verified by middleware
 *   const company = await db.query.companies.findFirst({
 *     where: eq(companies.id, companyId)
 *   });
 *   return { company };
 * });
 * ```
 */
