/**
 * Consolidation API Routes
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { authenticateJWT, AuthenticatedRequest } from '../../middleware/auth.js';
import { ConsolidationEngine } from '../../../analytics/src/consolidation/index.js';
import type {
  RunConsolidationRequest,
  ConsolFactsQuery,
} from '@teei/shared-types';

const consolidationEngine = new ConsolidationEngine();

export async function registerConsolidationRoutes(fastify: FastifyInstance): Promise<void> {
  /**
   * POST /api/consolidation/runs
   * Trigger a consolidation run
   */
  fastify.post('/api/consolidation/runs', {
    onRequest: [authenticateJWT]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const body = request.body as RunConsolidationRequest;
    const authRequest = request as AuthenticatedRequest;

    try {
      if (!body.orgId || !body.period) {
        return reply.status(400).send({
          success: false,
          error: 'Bad Request',
          message: 'orgId and period are required',
        });
      }

      // Run consolidation
      const result = await consolidationEngine.run(
        {
          orgId: body.orgId,
          period: body.period,
          baseCurrency: 'USD', // TODO: Get from org
          scope: body.scope,
        },
        authRequest.user.userId
      );

      return reply.status(201).send({
        success: true,
        data: result,
        message: 'Consolidation run completed successfully',
      });
    } catch (error) {
      request.log.error({ error }, 'Failed to run consolidation');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: error instanceof Error ? error.message : 'Failed to run consolidation',
      });
    }
  });

  /**
   * GET /api/consolidation/runs/:runId
   * Get consolidation run details
   */
  fastify.get('/api/consolidation/runs/:runId', {
    onRequest: [authenticateJWT]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const { runId } = request.params as { runId: string };

    try {
      const run = await consolidationEngine.getRun(runId);

      if (!run) {
        return reply.status(404).send({
          success: false,
          error: 'Not Found',
          message: 'Consolidation run not found',
        });
      }

      return reply.send({
        success: true,
        data: run,
      });
    } catch (error) {
      request.log.error({ error, runId }, 'Failed to get consolidation run');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve consolidation run',
      });
    }
  });

  /**
   * GET /api/consolidation/facts
   * Query consolidation facts
   */
  fastify.get('/api/consolidation/facts', {
    onRequest: [authenticateJWT]
  }, async (request: FastifyRequest, reply: FastifyReply) => {
    const query = request.query as ConsolFactsQuery;

    try {
      const facts = await consolidationEngine.getFacts(query);

      return reply.send({
        success: true,
        data: facts,
        meta: {
          total: facts.length,
        },
      });
    } catch (error) {
      request.log.error({ error, query }, 'Failed to query consolidation facts');
      return reply.status(500).send({
        success: false,
        error: 'Internal Server Error',
        message: 'Failed to retrieve consolidation facts',
      });
    }
  });

  fastify.log.info('Consolidation routes registered');
}
