/**
 * Organization (Orgs) API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateJWT, AuthenticatedRequest } from '../../middleware/auth.js';
import { db } from '@teei/shared-schema';
import { orgs, orgUnits, hierarchyAudit } from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';
import type {
  CreateOrgRequest,
  UpdateOrgRequest,
  Org,
} from '@teei/shared-types';

/**
 * Register org CRUD routes
 */
export async function registerOrgRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * GET /api/hierarchies/orgs
   * List all orgs owned by or accessible to the authenticated user
   */
  fastify.get('/api/hierarchies/orgs', {
    onRequest: [authenticateJWT]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const authRequest = request as AuthenticatedRequest;

    try {
      // TODO: Add RBAC check - for now, only return orgs owned by user
      const userOrgs = await db.select()
        .from(orgs)
        .where(eq(orgs.ownerUserId, authRequest.user.userId))
        .orderBy(orgs.name);

      return reply.send({
        success: true,
        data: userOrgs,
        meta: {
          total: userOrgs.length,
          userId: authRequest.user.userId,
        },
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to list orgs');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve organizations',
      });
    }
  });

  /**
   * GET /api/hierarchies/orgs/:orgId
   * Get org details
   */
  fastify.get('/api/hierarchies/orgs/:orgId', {
    onRequest: [authenticateJWT]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { orgId } = request.params as { orgId: string };
    const authRequest = request as AuthenticatedRequest;

    try {
      const [org] = await db.select()
        .from(orgs)
        .where(eq(orgs.id, orgId))
        .limit(1);

      if (!org) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Organization not found',
        });
      }

      // TODO: Check access permissions
      if (org.ownerUserId !== authRequest.user.userId) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'You do not have access to this organization',
        });
      }

      return reply.send({
        success: true,
        data: org,
      });
    } catch (error) {
      request.log.error({ error, orgId }, 'Failed to get org');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve organization',
      });
    }
  });

  /**
   * POST /api/hierarchies/orgs
   * Create new org
   */
  fastify.post('/api/hierarchies/orgs', {
    onRequest: [authenticateJWT]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as CreateOrgRequest;
    const authRequest = request as AuthenticatedRequest;

    try {
      // Validate request
      if (!body.name || body.name.trim().length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Organization name is required',
        });
      }

      if (!body.currency || body.currency.length !== 3) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Valid 3-letter currency code is required (e.g., USD, EUR, GBP)',
        });
      }

      // Create org
      const [newOrg] = await db.insert(orgs).values({
        name: body.name,
        currency: body.currency.toUpperCase(),
        ownerUserId: authRequest.user.userId,
        logoUrl: body.logoUrl,
        theme: body.theme || {},
        active: true,
      }).returning();

      // Audit log
      await db.insert(hierarchyAudit).values({
        orgId: newOrg.id,
        entityType: 'org',
        entityId: newOrg.id,
        action: 'created',
        changes: { name: newOrg.name, currency: newOrg.currency },
        performedBy: authRequest.user.userId,
      });

      return reply.status(201).send({
        success: true,
        data: newOrg,
        message: 'Organization created successfully',
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to create org');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to create organization',
      });
    }
  });

  /**
   * PATCH /api/hierarchies/orgs/:orgId
   * Update org
   */
  fastify.patch('/api/hierarchies/orgs/:orgId', {
    onRequest: [authenticateJWT]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { orgId } = request.params as { orgId: string };
    const body = request.body as UpdateOrgRequest;
    const authRequest = request as AuthenticatedRequest;

    try {
      // Get existing org
      const [org] = await db.select()
        .from(orgs)
        .where(eq(orgs.id, orgId))
        .limit(1);

      if (!org) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Organization not found',
        });
      }

      // Check permissions
      if (org.ownerUserId !== authRequest.user.userId) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to update this organization',
        });
      }

      // Build update object
      const updates: any = {
        updatedAt: new Date().toISOString(),
      };

      if (body.name !== undefined) updates.name = body.name;
      if (body.currency !== undefined) updates.currency = body.currency.toUpperCase();
      if (body.logoUrl !== undefined) updates.logoUrl = body.logoUrl;
      if (body.theme !== undefined) updates.theme = body.theme;
      if (body.active !== undefined) updates.active = body.active;

      // Update org
      const [updatedOrg] = await db.update(orgs)
        .set(updates)
        .where(eq(orgs.id, orgId))
        .returning();

      // Audit log
      await db.insert(hierarchyAudit).values({
        orgId,
        entityType: 'org',
        entityId: orgId,
        action: 'updated',
        changes: updates,
        performedBy: authRequest.user.userId,
      });

      return reply.send({
        success: true,
        data: updatedOrg,
        message: 'Organization updated successfully',
      });
    } catch (error) {
      request.log.error({ error, orgId }, 'Failed to update org');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to update organization',
      });
    }
  });

  /**
   * DELETE /api/hierarchies/orgs/:orgId
   * Delete org (soft delete - set active=false)
   */
  fastify.delete('/api/hierarchies/orgs/:orgId', {
    onRequest: [authenticateJWT]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { orgId } = request.params as { orgId: string };
    const authRequest = request as AuthenticatedRequest;

    try {
      // Get existing org
      const [org] = await db.select()
        .from(orgs)
        .where(eq(orgs.id, orgId))
        .limit(1);

      if (!org) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Organization not found',
        });
      }

      // Check permissions
      if (org.ownerUserId !== authRequest.user.userId) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'You do not have permission to delete this organization',
        });
      }

      // Check if org has active units
      const activeUnits = await db.select()
        .from(orgUnits)
        .where(
          and(
            eq(orgUnits.orgId, orgId),
            eq(orgUnits.active, true)
          )
        )
        .limit(1);

      if (activeUnits.length > 0) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'Cannot delete organization with active units. Deactivate all units first.',
        });
      }

      // Soft delete (set active=false)
      await db.update(orgs)
        .set({
          active: false,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(orgs.id, orgId));

      // Audit log
      await db.insert(hierarchyAudit).values({
        orgId,
        entityType: 'org',
        entityId: orgId,
        action: 'deleted',
        performedBy: authRequest.user.userId,
      });

      return reply.send({
        success: true,
        message: 'Organization deactivated successfully',
      });
    } catch (error) {
      request.log.error({ error, orgId }, 'Failed to delete org');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to delete organization',
      });
    }
  });

  fastify.log.info('Org routes registered');
}
