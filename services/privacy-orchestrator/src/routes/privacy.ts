/**
 * Privacy API Routes
 *
 * REST endpoints for DSAR operations:
 * - POST /privacy/export - Export user data
 * - POST /privacy/delete - Delete user data
 * - GET /privacy/status/:jobId - Get job status
 * - POST /privacy/consent - Update consent
 * - GET /privacy/consent/:userId - Get consent status
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { DsrRequestType } from '@teei/compliance';
import { DataRegion, JobPriority } from '../types/index.js';
import type { DsarQueueManager } from '../jobs/queue-manager.js';
import type { SlaTracker } from '../lib/sla-tracker.js';

/**
 * Request schemas
 */
const ExportRequestSchema = z.object({
  userId: z.string().uuid(),
  requestedBy: z.string().uuid(),
  region: z.nativeEnum(DataRegion).optional(),
  email: z.string().email().optional(),
  priority: z.nativeEnum(JobPriority).optional(),
  metadata: z.record(z.any()).optional(),
});

const DeleteRequestSchema = z.object({
  userId: z.string().uuid(),
  requestedBy: z.string().uuid(),
  reason: z.string().optional(),
  region: z.nativeEnum(DataRegion).optional(),
  immediate: z.boolean().optional(),
  priority: z.nativeEnum(JobPriority).optional(),
  metadata: z.record(z.any()).optional(),
});

const ConsentRequestSchema = z.object({
  userId: z.string().uuid(),
  consentType: z.string(),
  status: z.enum(['granted', 'withdrawn']),
  legalBasis: z.string(),
  metadata: z.record(z.any()).optional(),
});

/**
 * Register privacy routes
 */
export async function registerPrivacyRoutes(
  app: FastifyInstance,
  queueManager: DsarQueueManager,
  slaTracker: SlaTracker
): Promise<void> {
  /**
   * Export user data
   */
  app.post('/privacy/export', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = ExportRequestSchema.parse(request.body);

    try {
      const jobId = await queueManager.addJob({
        ...body,
        requestType: DsrRequestType.ACCESS,
      });

      reply.code(202).send({
        success: true,
        jobId,
        message: 'Export request accepted. Check status at /privacy/status/:jobId',
        estimatedCompletion: '24 hours',
      });
    } catch (error) {
      app.log.error({ error, body }, 'Export request failed');
      reply.code(500).send({
        success: false,
        error: 'Failed to process export request',
      });
    }
  });

  /**
   * Delete user data
   */
  app.post('/privacy/delete', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = DeleteRequestSchema.parse(request.body);

    try {
      const jobId = await queueManager.addJob({
        userId: body.userId,
        requestedBy: body.requestedBy,
        requestType: DsrRequestType.ERASURE,
        region: body.region,
        priority: body.priority,
        metadata: {
          reason: body.reason,
          immediate: body.immediate,
          ...body.metadata,
        },
      });

      const gracePeriod = body.immediate ? 'immediately' : '30 days';

      reply.code(202).send({
        success: true,
        jobId,
        message: `Deletion request accepted. Data will be deleted ${gracePeriod}. You can cancel within the grace period.`,
        gracePeriodEnds: body.immediate ? null : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelUrl: `/privacy/delete/${jobId}/cancel`,
      });
    } catch (error) {
      app.log.error({ error, body }, 'Delete request failed');
      reply.code(500).send({
        success: false,
        error: 'Failed to process deletion request',
      });
    }
  });

  /**
   * Get job status
   */
  app.get('/privacy/status/:jobId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { jobId } = request.params as { jobId: string };

    try {
      const status = await queueManager.getJobStatus(jobId);

      reply.send({
        success: true,
        ...status,
      });
    } catch (error) {
      app.log.error({ error, jobId }, 'Status check failed');
      reply.code(404).send({
        success: false,
        error: 'Job not found',
      });
    }
  });

  /**
   * Cancel deletion request
   */
  app.post('/privacy/delete/:jobId/cancel', async (request: FastifyRequest, reply: FastifyReply) => {
    const { jobId } = request.params as { jobId: string };

    try {
      await queueManager.cancelJob(jobId);

      reply.send({
        success: true,
        message: 'Deletion request cancelled successfully',
      });
    } catch (error) {
      app.log.error({ error, jobId }, 'Cancellation failed');
      reply.code(500).send({
        success: false,
        error: 'Failed to cancel deletion request',
      });
    }
  });

  /**
   * Update consent
   */
  app.post('/privacy/consent', async (request: FastifyRequest, reply: FastifyReply) => {
    const body = ConsentRequestSchema.parse(request.body);

    try {
      // In production, this would update consent in database
      // For now, just log and return success
      app.log.info({ body }, 'Consent updated');

      reply.send({
        success: true,
        message: `Consent ${body.status} for ${body.consentType}`,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      app.log.error({ error, body }, 'Consent update failed');
      reply.code(500).send({
        success: false,
        error: 'Failed to update consent',
      });
    }
  });

  /**
   * Get consent status
   */
  app.get('/privacy/consent/:userId', async (request: FastifyRequest, reply: FastifyReply) => {
    const { userId } = request.params as { userId: string };

    try {
      // In production, fetch from database
      // For now, return mock data
      reply.send({
        success: true,
        userId,
        consents: [
          {
            consentType: 'marketing',
            status: 'granted',
            grantedAt: new Date('2024-01-01').toISOString(),
            legalBasis: 'consent',
          },
          {
            consentType: 'analytics',
            status: 'granted',
            grantedAt: new Date('2024-01-01').toISOString(),
            legalBasis: 'legitimate_interest',
          },
        ],
      });
    } catch (error) {
      app.log.error({ error, userId }, 'Consent fetch failed');
      reply.code(500).send({
        success: false,
        error: 'Failed to fetch consent status',
      });
    }
  });

  /**
   * Get SLA metrics
   */
  app.get('/privacy/metrics/sla', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const metrics = slaTracker.getAllMetrics();

      reply.send({
        success: true,
        metrics,
      });
    } catch (error) {
      app.log.error({ error }, 'SLA metrics fetch failed');
      reply.code(500).send({
        success: false,
        error: 'Failed to fetch SLA metrics',
      });
    }
  });

  /**
   * Get queue metrics
   */
  app.get('/privacy/metrics/queue', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const metrics = await queueManager.getMetrics();

      reply.send({
        success: true,
        ...metrics,
      });
    } catch (error) {
      app.log.error({ error }, 'Queue metrics fetch failed');
      reply.code(500).send({
        success: false,
        error: 'Failed to fetch queue metrics',
      });
    }
  });

  /**
   * Health check
   */
  app.get('/privacy/health', async (request: FastifyRequest, reply: FastifyReply) => {
    reply.send({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0',
    });
  });
}
