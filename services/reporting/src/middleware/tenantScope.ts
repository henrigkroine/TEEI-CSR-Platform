import type { FastifyRequest, FastifyReply } from 'fastify';

interface TenantScopedRequest extends FastifyRequest {
  tenantId?: string;
  user?: {
    id: string;
    email: string;
    role: string;
    companyId?: string;
  };
}

/**
 * Middleware to extract and validate tenant scope from JWT token
 * Ensures all API requests are scoped to a specific company (tenant)
 *
 * CRITICAL: This middleware MUST be applied to all tenant-scoped routes
 * to prevent cross-tenant data leaks
 */
export async function tenantScopeMiddleware(
  request: TenantScopedRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Extract tenant ID from route params (e.g., /api/cockpit/:companyId/metrics)
    const companyIdFromRoute = request.params?.companyId as string | undefined;

    // Extract user from JWT (populated by auth middleware)
    const user = request.user;

    if (!user) {
      return reply.status(401).send({
        error: 'Unauthorized',
        message: 'Authentication required',
      });
    }

    // Verify user has access to the requested tenant
    if (companyIdFromRoute) {
      // For company_user role, verify they belong to the company
      if (user.role === 'company_user' && user.companyId !== companyIdFromRoute) {
        return reply.status(403).send({
          error: 'Forbidden',
          message: 'Access denied to this company',
        });
      }

      // Admin users can access any company (for support/debugging)
      // But log these accesses for audit
      if (user.role === 'admin') {
        request.log.info({
          userId: user.id,
          companyId: companyIdFromRoute,
          action: 'admin_cross_tenant_access',
        });
      }

      // Attach tenant ID to request for downstream use
      request.tenantId = companyIdFromRoute;
    } else if (user.companyId) {
      // If no company ID in route, use user's company
      request.tenantId = user.companyId;
    } else {
      return reply.status(400).send({
        error: 'Bad Request',
        message: 'Company ID required',
      });
    }

    // Tenant scope verified, continue to route handler
  } catch (error) {
    request.log.error({ error }, 'Tenant scope middleware error');
    return reply.status(500).send({
      error: 'Internal Server Error',
      message: 'Failed to verify tenant scope',
    });
  }
}

/**
 * Helper function to apply tenant filter to database queries
 * Use this in all service functions to ensure tenant isolation
 *
 * Example:
 * ```ts
 * const metrics = await db.select()
 *   .from(metricsTable)
 *   .where(tenantFilter('company_id', request.tenantId));
 * ```
 */
export function tenantFilter(columnName: string, tenantId: string | undefined) {
  if (!tenantId) {
    throw new Error('Tenant ID required for tenant-scoped query');
  }

  return { [columnName]: tenantId };
}

/**
 * Decorator to mark routes as tenant-scoped
 * Automatically applies tenant scope middleware
 *
 * Usage:
 * ```ts
 * fastify.get('/api/metrics', {
 *   preHandler: tenantScopeMiddleware
 * }, async (request, reply) => {
 *   // request.tenantId is available here
 * });
 * ```
 */
export const tenantScoped = {
  preHandler: tenantScopeMiddleware,
};
