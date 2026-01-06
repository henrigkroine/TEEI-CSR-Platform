/**
 * HIL (Human-in-the-Loop) Routes
 * Adjudication, Drift RCA, Canary Compare
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { AdjudicationService, AdjudicationDecisionSchema } from '../hil/adjudication.js';
import { DriftRcaService } from '../hil/drift-rca.js';
import { CanaryService } from '../hil/canary.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('hil-routes');

export async function hilRoutes(fastify: FastifyInstance) {
  const adjudicationService = new AdjudicationService();
  const driftRcaService = new DriftRcaService();
  const canaryService = new CanaryService();

  /**
   * GET /hil/queue
   * Get adjudication queue
   */
  fastify.get(
    '/hil/queue',
    {
      schema: {
        querystring: z.object({
          status: z.enum(['pending', 'in_review', 'adjudicated']).optional(),
          priority: z.enum(['high', 'medium', 'low']).optional(),
          limit: z.coerce.number().default(50),
          offset: z.coerce.number().default(0),
        }),
      },
    },
    async (request, reply) => {
      const { status, priority, limit, offset } = request.query as any;

      try {
        const queue = await adjudicationService.getQueue({ status, priority, limit, offset });

        return reply.send({
          success: true,
          queue,
          count: queue.length,
        });
      } catch (error) {
        logger.error({ error }, 'Failed to get adjudication queue');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    }
  );

  /**
   * POST /hil/adjudicate
   * Submit adjudication decision
   */
  fastify.post(
    '/hil/adjudicate',
    {
      schema: {
        body: AdjudicationDecisionSchema.omit({ id: true, adjudicatedAt: true }),
      },
    },
    async (request, reply) => {
      try {
        const decision = await adjudicationService.submitDecision(request.body);

        logger.info({ decisionId: decision.id, decision: decision.decision }, 'Adjudication submitted');

        return reply.send({
          success: true,
          decision,
        });
      } catch (error) {
        logger.error({ error }, 'Failed to submit adjudication');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    }
  );

  /**
   * GET /hil/stats
   * Get adjudication statistics
   */
  fastify.get(
    '/hil/stats',
    {
      schema: {
        querystring: z.object({
          modelVersion: z.string().optional(),
          adjudicatedBy: z.string().optional(),
          startDate: z.string().optional(),
          endDate: z.string().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { modelVersion, adjudicatedBy, startDate, endDate } = request.query as any;

      try {
        const stats = await adjudicationService.getStats({
          modelVersion,
          adjudicatedBy,
          startDate,
          endDate,
        });

        return reply.send({
          success: true,
          stats,
        });
      } catch (error) {
        logger.error({ error }, 'Failed to get adjudication stats');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    }
  );

  /**
   * POST /hil/drift/detect
   * Detect drift in model performance
   */
  fastify.post(
    '/hil/drift/detect',
    {
      schema: {
        body: z.object({
          modelVersion: z.string(),
          timeWindowDays: z.number().optional(),
          baselineWindowDays: z.number().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { modelVersion, timeWindowDays, baselineWindowDays } = request.body;

      try {
        const drift = await driftRcaService.detectDrift({
          modelVersion,
          timeWindowDays,
          baselineWindowDays,
        });

        if (!drift) {
          return reply.send({
            success: true,
            driftDetected: false,
            message: 'No significant drift detected',
          });
        }

        return reply.send({
          success: true,
          driftDetected: true,
          drift,
        });
      } catch (error) {
        logger.error({ error, modelVersion }, 'Failed to detect drift');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    }
  );

  /**
   * POST /hil/drift/analyze
   * Perform root cause analysis for drift
   */
  fastify.post(
    '/hil/drift/analyze',
    {
      schema: {
        body: z.object({
          driftId: z.string(),
        }),
      },
    },
    async (request, reply) => {
      const { driftId } = request.body;

      try {
        const rca = await driftRcaService.analyzeRootCauses(driftId);

        return reply.send({
          success: true,
          rca,
        });
      } catch (error) {
        logger.error({ error, driftId }, 'Failed to analyze drift root causes');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    }
  );

  /**
   * POST /hil/canary/compare
   * Compare baseline and canary model versions
   */
  fastify.post(
    '/hil/canary/compare',
    {
      schema: {
        body: z.object({
          baselineVersion: z.string(),
          canaryVersion: z.string(),
          timeWindowHours: z.number().optional(),
          minSampleSize: z.number().optional(),
        }),
      },
    },
    async (request, reply) => {
      const { baselineVersion, canaryVersion, timeWindowHours, minSampleSize } = request.body;

      try {
        const comparison = await canaryService.compareVersions({
          baselineVersion,
          canaryVersion,
          timeWindowHours,
          minSampleSize,
        });

        return reply.send({
          success: true,
          comparison,
        });
      } catch (error) {
        logger.error({ error, baselineVersion, canaryVersion }, 'Failed to compare canary versions');
        return reply.code(500).send({
          success: false,
          error: error instanceof Error ? error.message : 'Internal server error',
        });
      }
    }
  );
}
