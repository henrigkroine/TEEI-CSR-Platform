/**
 * Audit Log API Routes
 *
 * RESTful endpoints for querying audit events.
 * Requires RBAC: AuditViewer or AuditAdmin role.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { Pool } from 'pg';
import { z } from 'zod';
import { AuditQueryBuilder } from './query-builder.js';
import { redactAuditEvent, redactAuditEvents, validateNoSecretsLeaked } from './redaction.js';
import { createComplianceExport } from './export.js';
import type { AuditEventFilters, ComplianceExportRequest } from '@teei/shared-types';

/**
 * Query parameters schema
 */
const AuditQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  tenantId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  actorEmail: z.string().email().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().uuid().optional(),
  action: z.string().optional(),
  actionCategory: z.string().optional(),
  search: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).optional(),
  offset: z.coerce.number().min(0).optional(),
});

/**
 * Register audit routes
 */
export async function auditRoutes(fastify: FastifyInstance, dbPool: Pool) {
  const queryBuilder = new AuditQueryBuilder(dbPool);

  /**
   * GET /v1/audit/events
   *
   * Query audit events with filters
   */
  fastify.get('/events', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Get authenticated user
      const user = (request as any).user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Check RBAC: AuditViewer or AuditAdmin
      if (!user.role || !['AuditViewer', 'AuditAdmin', 'admin'].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions. Required role: AuditViewer or AuditAdmin',
        });
      }

      // Parse and validate query parameters
      const params = AuditQuerySchema.parse(request.query);

      // Build filters
      const filters: AuditEventFilters = {
        from: params.from ? new Date(params.from) : undefined,
        to: params.to ? new Date(params.to) : undefined,
        tenantId: params.tenantId || user.tenantId, // Enforce tenant isolation
        actorId: params.actorId,
        actorEmail: params.actorEmail,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        action: params.action,
        actionCategory: params.actionCategory as any,
        search: params.search,
        limit: params.limit || 100,
        offset: params.offset || 0,
      };

      // Enforce tenant isolation for non-admin users
      if (user.role !== 'admin' && filters.tenantId !== user.tenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Cannot query audit logs for other tenants',
        });
      }

      // Query events
      const startTime = Date.now();
      const result = await queryBuilder.queryEvents(filters);
      const queryTime = Date.now() - startTime;

      // Redact secrets from results
      const redactedEvents = redactAuditEvents(result.events, false);

      // Validate no secrets leaked
      const leaked = redactedEvents.some((event) => !validateNoSecretsLeaked(event));
      if (leaked) {
        request.log.error('Secret leakage detected in audit response');
        return reply.status(500).send({
          success: false,
          error: 'InternalServerError',
          message: 'Security validation failed',
        });
      }

      // Log slow queries (p95 target: ≤250ms)
      if (queryTime > 250) {
        request.log.warn(
          {
            queryTime,
            filters,
            resultCount: result.events.length,
          },
          'Slow audit query detected'
        );
      }

      return reply.status(200).send({
        success: true,
        data: {
          events: redactedEvents,
          total: result.total,
          hasMore: result.hasMore,
          nextOffset: result.nextOffset,
        },
        meta: {
          queryTime,
          filters,
        },
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'ValidationError',
          message: 'Invalid query parameters',
          details: error.errors,
        });
      }

      request.log.error({ error }, 'Audit query failed');
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Failed to query audit events',
      });
    }
  });

  /**
   * GET /v1/audit/events/:id
   *
   * Get a single audit event by ID with full details
   */
  fastify.get('/events/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Check RBAC
      if (!user.role || !['AuditViewer', 'AuditAdmin', 'admin'].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      }

      const { id } = request.params as { id: string };

      // Enforce tenant isolation for non-admin users
      const tenantId = user.role === 'admin' ? undefined : user.tenantId;
      const event = await queryBuilder.getEventById(id, tenantId);

      if (!event) {
        return reply.status(404).send({
          success: false,
          error: 'NotFound',
          message: 'Audit event not found',
        });
      }

      // Redact secrets
      const redactedEvent = redactAuditEvent(event, false);

      return reply.status(200).send({
        success: true,
        data: redactedEvent,
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to get audit event');
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Failed to retrieve audit event',
      });
    }
  });

  /**
   * GET /v1/audit/timeline
   *
   * Get timeline aggregation for heatmap visualization
   */
  fastify.get('/timeline', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Check RBAC
      if (!user.role || !['AuditViewer', 'AuditAdmin', 'admin'].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      }

      const params = AuditQuerySchema.parse(request.query);

      const filters: AuditEventFilters = {
        from: params.from ? new Date(params.from) : undefined,
        to: params.to ? new Date(params.to) : undefined,
        tenantId: params.tenantId || user.tenantId,
        actorId: params.actorId,
        resourceType: params.resourceType,
        action: params.action,
        actionCategory: params.actionCategory as any,
      };

      // Enforce tenant isolation
      if (user.role !== 'admin' && filters.tenantId !== user.tenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Cannot query audit logs for other tenants',
        });
      }

      const timeline = await queryBuilder.getTimeline(filters, 'day');

      return reply.status(200).send({
        success: true,
        data: timeline,
      });
    } catch (error) {
      request.log.error({ error }, 'Timeline query failed');
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Failed to generate timeline',
      });
    }
  });

  /**
   * GET /v1/audit/stats
   *
   * Get audit statistics for a given filter
   */
  fastify.get('/stats', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Check RBAC
      if (!user.role || !['AuditViewer', 'AuditAdmin', 'admin'].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions',
        });
      }

      const params = AuditQuerySchema.parse(request.query);

      const filters: AuditEventFilters = {
        from: params.from ? new Date(params.from) : undefined,
        to: params.to ? new Date(params.to) : undefined,
        tenantId: params.tenantId || user.tenantId,
      };

      // Enforce tenant isolation
      if (user.role !== 'admin' && filters.tenantId !== user.tenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Cannot query audit logs for other tenants',
        });
      }

      const stats = await queryBuilder.getStats(filters);

      return reply.status(200).send({
        success: true,
        data: stats,
      });
    } catch (error) {
      request.log.error({ error }, 'Stats query failed');
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Failed to generate statistics',
      });
    }
  });

  /**
   * POST /v1/audit/export
   *
   * Create compliance export bundle (ZIP with JSONL, manifest, PDF)
   */
  fastify.post('/export', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const user = (request as any).user;
      if (!user) {
        return reply.status(401).send({
          success: false,
          error: 'Unauthorized',
          message: 'Authentication required',
        });
      }

      // Check RBAC: AuditAdmin only
      if (!user.role || !['AuditAdmin', 'admin'].includes(user.role)) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Insufficient permissions. Required role: AuditAdmin',
        });
      }

      // Parse request body
      const ExportRequestSchema = z.object({
        tenantId: z.string().uuid(),
        from: z.string().datetime(),
        to: z.string().datetime(),
        maskPII: z.boolean().optional(),
        filters: z
          .object({
            actorId: z.string().uuid().optional(),
            resourceType: z.string().optional(),
            action: z.string().optional(),
            actionCategory: z.string().optional(),
          })
          .optional(),
      });

      const body = ExportRequestSchema.parse(request.body);

      // Enforce tenant isolation for non-admin users
      if (user.role !== 'admin' && body.tenantId !== user.tenantId) {
        return reply.status(403).send({
          success: false,
          error: 'Forbidden',
          message: 'Cannot export audit logs for other tenants',
        });
      }

      const exportRequest: ComplianceExportRequest = {
        tenantId: body.tenantId,
        from: new Date(body.from),
        to: new Date(body.to),
        maskPII: body.maskPII || false,
        filters: body.filters,
      };

      request.log.info(
        {
          tenantId: exportRequest.tenantId,
          from: exportRequest.from,
          to: exportRequest.to,
          actorId: user.id,
        },
        'Compliance export requested'
      );

      // Create export bundle
      const { stream, filename, metadata } = await createComplianceExport(
        dbPool,
        exportRequest,
        user
      );

      // Set headers for download
      reply.header('Content-Type', 'application/zip');
      reply.header('Content-Disposition', `attachment; filename="${filename}"`);
      reply.header('X-Export-ID', metadata.exportId);
      reply.header('X-Export-Event-Count', metadata.eventCount.toString());
      reply.header('X-Export-SHA256', metadata.sha256);

      // Stream the ZIP file
      return reply.send(stream);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'ValidationError',
          message: 'Invalid export request',
          details: error.errors,
        });
      }

      request.log.error({ error }, 'Compliance export failed');
      return reply.status(500).send({
        success: false,
        error: 'InternalServerError',
        message: 'Failed to create compliance export',
      });
    }
  });

  fastify.log.info('Audit routes registered');
}
