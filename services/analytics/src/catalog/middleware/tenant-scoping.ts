/**
 * Tenant scoping middleware
 *
 * Ensures all catalog queries are scoped to the authenticated user's tenant.
 * Prevents cross-tenant data access.
 */

import { FastifyRequest, FastifyReply } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('catalog:tenant-scoping');

/**
 * Extended request with tenant context
 */
export interface TenantScopedRequest extends FastifyRequest {
  tenantId?: string;
  userId?: string;
  userRoles?: string[];
}

/**
 * Tenant scoping middleware
 *
 * Extracts tenant ID from JWT claims and attaches to request.
 * Blocks requests without valid tenant context.
 *
 * @param request - Fastify request
 * @param reply - Fastify reply
 */
export async function tenantScopingMiddleware(
  request: TenantScopedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract tenant from JWT (assumes JWT is already validated by upstream auth middleware)
    const user = (request as any).user;

    if (!user) {
      logger.warn({ path: request.url }, 'No user context in request');
      reply.code(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
      return;
    }

    // Attach tenant context to request
    request.tenantId = user.tenantId || user.tenant_id;
    request.userId = user.sub || user.userId || user.user_id;
    request.userRoles = user.roles || [];

    // Check for platform admin role (can access all tenants)
    const isPlatformAdmin = request.userRoles?.includes('platform_admin');

    if (!request.tenantId && !isPlatformAdmin) {
      logger.warn({ userId: request.userId, path: request.url }, 'No tenant context for non-admin user');
      reply.code(403).send({
        error: 'Forbidden',
        message: 'Tenant context required',
      });
      return;
    }

    logger.debug({
      tenantId: request.tenantId,
      userId: request.userId,
      path: request.url,
      isPlatformAdmin,
    }, 'Tenant context attached to request');

  } catch (error) {
    logger.error({ error, path: request.url }, 'Error in tenant scoping middleware');
    reply.code(500).send({
      error: 'Internal Server Error',
      message: 'Failed to process tenant context',
    });
  }
}

/**
 * Check if user has permission to access dataset
 *
 * @param request - Tenant-scoped request
 * @param datasetTenantId - Tenant ID of the dataset (null = tenant-agnostic)
 * @returns True if user can access dataset
 */
export function canAccessDataset(
  request: TenantScopedRequest,
  datasetTenantId: string | null
): boolean {
  const isPlatformAdmin = request.userRoles?.includes('platform_admin');

  // Platform admins can access everything
  if (isPlatformAdmin) {
    return true;
  }

  // Tenant-agnostic datasets (null tenantId) are accessible to all
  if (datasetTenantId === null) {
    return true;
  }

  // User must belong to the same tenant as the dataset
  return request.tenantId === datasetTenantId;
}

/**
 * Get tenant filter for database queries
 *
 * @param request - Tenant-scoped request
 * @returns Tenant filter (null = no filter, platform admin)
 */
export function getTenantFilter(request: TenantScopedRequest): string | null {
  const isPlatformAdmin = request.userRoles?.includes('platform_admin');

  // Platform admins see all data
  if (isPlatformAdmin) {
    return null;
  }

  // Regular users see only their tenant's data + tenant-agnostic data
  return request.tenantId || null;
}

/**
 * Log audit event for catalog access
 *
 * @param request - Tenant-scoped request
 * @param action - Action performed (view, export, update, delete)
 * @param entityType - Type of entity (dataset, metric, lineage, quality)
 * @param entityId - ID of entity accessed
 * @param metadata - Additional metadata
 */
export async function logCatalogAudit(
  request: TenantScopedRequest,
  action: 'view' | 'export' | 'update' | 'delete',
  entityType: 'dataset' | 'metric' | 'lineage' | 'quality',
  entityId: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    logger.info({
      action,
      entityType,
      entityId,
      userId: request.userId,
      tenantId: request.tenantId,
      ipAddress: request.ip,
      userAgent: request.headers['user-agent'],
      metadata,
    }, 'Catalog audit log');

    // TODO: Write to audit_logs table or audit service
    // For now, just log to stdout

  } catch (error) {
    logger.error({ error }, 'Failed to log catalog audit event');
    // Don't throw - audit failures shouldn't block requests
  }
}
