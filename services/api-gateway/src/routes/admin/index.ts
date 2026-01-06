/**
 * Admin Studio v2 Routes Aggregator
 * Consolidates all admin endpoints with RBAC middleware
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { AdminRole, hasAdminPermission } from '@teei/entitlements';
import { createServiceLogger } from '@teei/shared-utils';
import { adminTenantRoutes } from './tenants.js';

const logger = createServiceLogger('admin-routes');

/**
 * RBAC middleware for admin routes
 * Extracts admin role from JWT and enforces permissions
 */
async function adminRbacMiddleware(
  request: FastifyRequest,
  reply: FastifyReply,
  permission: keyof ReturnType<typeof hasAdminPermission extends (role: AdminRole, perm: infer P) => boolean ? P : never>
) {
  try {
    // TODO: Extract from JWT claims
    const adminRole = (request.headers['x-admin-role'] as string) || AdminRole.VIEWER;

    if (!Object.values(AdminRole).includes(adminRole as AdminRole)) {
      return reply.code(403).send({ error: 'Invalid admin role' });
    }

    const hasPermission = hasAdminPermission(adminRole as AdminRole, permission as any);
    if (!hasPermission) {
      logger.warn('Admin permission denied', { role: adminRole, permission, path: request.url });
      return reply.code(403).send({
        error: 'Insufficient permissions',
        required: permission,
        role: adminRole,
      });
    }

    // Attach role to request for logging
    (request as any).adminRole = adminRole;
  } catch (error: any) {
    logger.error('RBAC middleware error', { error });
    return reply.code(500).send({ error: 'Internal server error' });
  }
}

/**
 * Register all admin routes with RBAC guards
 */
export async function adminRoutes(app: FastifyInstance) {
  // Health check (no auth required)
  app.get('/admin/v2/health', async (request: FastifyRequest, reply: FastifyReply) => {
    return reply.code(200).send({
      status: 'healthy',
      version: '2.0.0',
      timestamp: new Date().toISOString(),
      services: {
        scim: 'available',
        sso: 'available',
        tenants: 'available',
        entitlements: 'available',
        residency: 'available',
      },
    });
  });

  // Register tenant routes (with RBAC checks inline)
  await app.register(adminTenantRoutes);

  // Audit logs endpoint
  app.get('/admin/v2/audit/logs', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      await adminRbacMiddleware(request, reply, 'canViewAuditLogs' as any);

      const query = request.query as any;
      // Mock audit logs
      const logs = [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          actor: { id: 'admin-1', email: 'admin@example.com', ip: '192.168.1.1' },
          action: 'tenant.created',
          resource: 'tenant',
          resourceId: 'tenant-123',
          tenantId: 'tenant-123',
          metadata: { plan: 'professional' },
          outcome: 'success',
        },
      ];

      return reply.code(200).send({
        events: logs,
        pagination: { page: 1, limit: 100, total: logs.length, totalPages: 1 },
      });
    } catch (error: any) {
      logger.error('Audit logs error', { error });
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  logger.info('Admin Studio v2 routes registered');
}
