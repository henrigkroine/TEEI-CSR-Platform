/**
 * SLA Status API Routes
 *
 * Provides real-time SLA metrics and monitoring data for Impact-In deliveries.
 *
 * Endpoints:
 * - GET /v1/impact-in/sla-status - Get current SLA status
 * - GET /v1/impact-in/sla-report - Generate weekly SLA report
 *
 * Reference: MULTI_AGENT_PLAN.md § Worker 4/Phase F/SLA Monitor
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { createServiceLogger } from '@teei/shared-utils';
import {
  getSLAStatus,
  generateWeeklySLAReport,
  getDeliveryTimeline,
} from '../sla-monitor/index.js';

const logger = createServiceLogger('impact-in:sla-routes');

// Validation schemas
const slaStatusQuerySchema = z.object({
  companyId: z.string().uuid(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
});

const slaReportQuerySchema = z.object({
  companyId: z.string().uuid(),
});

const deliveryTimelineQuerySchema = z.object({
  companyId: z.string().uuid(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

/**
 * Register SLA routes
 */
export async function slaRoutes(app: FastifyInstance) {
  /**
   * GET /v1/impact-in/sla-status
   * Get real-time SLA status for a company
   */
  app.get('/sla-status', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = slaStatusQuerySchema.parse(request.query);
      const { companyId, startDate, endDate } = query;

      logger.info('Fetching SLA status', { companyId });

      const start = startDate ? new Date(startDate) : undefined;
      const end = endDate ? new Date(endDate) : undefined;

      const slaStatus = await getSLAStatus(companyId, start, end);

      return reply.status(200).send(slaStatus);
    } catch (error: any) {
      logger.error('Failed to fetch SLA status', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to fetch SLA status',
        message: error.message,
      });
    }
  });

  /**
   * GET /v1/impact-in/sla-report
   * Generate weekly SLA report for a company
   */
  app.get('/sla-report', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = slaReportQuerySchema.parse(request.query);
      const { companyId } = query;

      logger.info('Generating SLA report', { companyId });

      const report = await generateWeeklySLAReport(companyId);

      return reply.status(200).send(report);
    } catch (error: any) {
      logger.error('Failed to generate SLA report', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to generate SLA report',
        message: error.message,
      });
    }
  });

  /**
   * GET /v1/impact-in/delivery-timeline
   * Get delivery timeline for UI visualization
   */
  app.get('/delivery-timeline', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const query = deliveryTimelineQuerySchema.parse(request.query);
      const { companyId, limit } = query;

      logger.info('Fetching delivery timeline', { companyId, limit });

      const timeline = await getDeliveryTimeline(companyId, limit);

      return reply.status(200).send({
        data: timeline,
      });
    } catch (error: any) {
      logger.error('Failed to fetch delivery timeline', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to fetch delivery timeline',
        message: error.message,
      });
    }
  });
}
