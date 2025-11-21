/**
 * Tenant Lifecycle Admin Routes
 * Create, suspend, terminate, and manage tenants
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { TenantService } from '../../lib/tenant-service.js';
import { TenantCreate, TenantUpdate, TenantSuspend, TenantTerminate, SecretRotation, SnapshotCreate } from '../../types/tenant.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('admin-tenant-routes');
const tenantService = new TenantService();

function getActorId(request: FastifyRequest): string {
  return (request.headers['x-actor-id'] as string) || 'admin';
}

export async function adminTenantRoutes(app: FastifyInstance) {
  // List tenants
  app.get('/admin/v2/tenants', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = request.query as any;
      const status = query.status;
      const page = parseInt(query.page) || 1;
      const limit = Math.min(parseInt(query.limit) || 50, 200);

      const result = await tenantService.listTenants(status, page, limit);
      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error('List tenants error', { error });
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Get tenant details
  app.get('/admin/v2/tenants/:tenantId', async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.params;

      const tenant = await tenantService.getTenant(tenantId);
      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      return reply.code(200).send(tenant);
    } catch (error: any) {
      logger.error('Get tenant error', { error });
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  // Create tenant
  app.post('/admin/v2/tenants', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const actorId = getActorId(request);
      const data = request.body as TenantCreate;

      // Validation
      if (!data.name || data.name.length < 3) {
        return reply.code(400).send({ error: 'name must be at least 3 characters' });
      }

      if (!data.slug || !/^[a-z0-9-]+$/.test(data.slug)) {
        return reply.code(400).send({ error: 'Invalid slug format' });
      }

      if (!data.plan) {
        return reply.code(400).send({ error: 'plan required' });
      }

      if (!data.residencyRegion || !['us-east-1', 'eu-central-1', 'uk-south-1'].includes(data.residencyRegion)) {
        return reply.code(400).send({ error: 'Invalid residencyRegion' });
      }

      const tenant = await tenantService.createTenant(data, actorId);
      return reply.code(201).send(tenant);
    } catch (error: any) {
      logger.error('Create tenant error', { error });
      if (error.message.includes('already exists')) {
        return reply.code(409).send({ error: error.message });
      }
      return reply.code(400).send({ error: error.message });
    }
  });

  // Update tenant
  app.patch('/admin/v2/tenants/:tenantId', async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.params;
      const data = request.body as TenantUpdate;

      const tenant = await tenantService.updateTenant(tenantId, data);
      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      return reply.code(200).send(tenant);
    } catch (error: any) {
      logger.error('Update tenant error', { error });
      return reply.code(400).send({ error: error.message });
    }
  });

  // Suspend tenant
  app.post('/admin/v2/tenants/:tenantId/suspend', async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.params;
      const actorId = getActorId(request);
      const data = request.body as TenantSuspend;

      if (!data.reason || data.reason.length < 10) {
        return reply.code(400).send({ error: 'reason must be at least 10 characters' });
      }

      const tenant = await tenantService.suspendTenant(tenantId, data, actorId);
      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      return reply.code(200).send(tenant);
    } catch (error: any) {
      logger.error('Suspend tenant error', { error });
      return reply.code(400).send({ error: error.message });
    }
  });

  // Reactivate tenant
  app.post('/admin/v2/tenants/:tenantId/reactivate', async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.params;
      const actorId = getActorId(request);

      const tenant = await tenantService.reactivateTenant(tenantId, actorId);
      if (!tenant) {
        return reply.code(404).send({ error: 'Tenant not found' });
      }

      return reply.code(200).send(tenant);
    } catch (error: any) {
      logger.error('Reactivate tenant error', { error });
      return reply.code(400).send({ error: error.message });
    }
  });

  // Terminate tenant (DANGER)
  app.post('/admin/v2/tenants/:tenantId/terminate', async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.params;
      const actorId = getActorId(request);
      const data = request.body as TenantTerminate;

      if (!data.reason || data.reason.length < 10) {
        return reply.code(400).send({ error: 'reason required (min 10 characters)' });
      }

      if (!data.confirmationToken) {
        return reply.code(400).send({ error: 'confirmationToken required' });
      }

      if (!data.snapshotId) {
        return reply.code(400).send({ error: 'snapshotId required (create snapshot first)' });
      }

      const result = await tenantService.terminateTenant(tenantId, data, actorId);
      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error('Terminate tenant error', { error });
      return reply.code(400).send({ error: error.message });
    }
  });

  // Rotate tenant secrets
  app.post('/admin/v2/tenants/:tenantId/secrets/rotate', async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.params;
      const data = (request.body as SecretRotation) || {};

      const result = await tenantService.rotateTenantSecrets(tenantId, data);
      return reply.code(200).send(result);
    } catch (error: any) {
      logger.error('Rotate secrets error', { error });
      return reply.code(400).send({ error: error.message });
    }
  });

  // Create tenant snapshot
  app.post('/admin/v2/tenants/:tenantId/snapshot', async (request: FastifyRequest<{ Params: { tenantId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId } = request.params;
      const data = (request.body as SnapshotCreate) || {};

      // Explicit approval required for PII export
      if (data.includePii) {
        logger.warn('PII export requested', { tenantId });
        // TODO: Check admin permission level
      }

      const result = await tenantService.createSnapshot(tenantId, data);
      return reply.code(202).send(result);
    } catch (error: any) {
      logger.error('Create snapshot error', { error });
      return reply.code(400).send({ error: error.message });
    }
  });

  // Get snapshot status
  app.get('/admin/v2/tenants/:tenantId/snapshot/:snapshotId', async (request: FastifyRequest<{ Params: { tenantId: string; snapshotId: string } }>, reply: FastifyReply) => {
    try {
      const { tenantId, snapshotId } = request.params;

      const snapshot = await tenantService.getSnapshot(tenantId, snapshotId);
      if (!snapshot) {
        return reply.code(404).send({ error: 'Snapshot not found' });
      }

      return reply.code(200).send(snapshot);
    } catch (error: any) {
      logger.error('Get snapshot error', { error });
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });

  logger.info('Admin tenant routes registered');
}
