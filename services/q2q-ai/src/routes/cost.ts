import { FastifyPluginAsync } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { getCostMetrics, checkBudget } from '../cost-tracking.js';

const logger = createServiceLogger('q2q-cost-routes');

export const costRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /cost/metrics - Get cost metrics
  fastify.get('/cost/metrics', async (request, reply) => {
    try {
      const { companyId } = request.query as { companyId?: string };

      const metrics = getCostMetrics(companyId);

      return reply.send({
        success: true,
        metrics,
      });
    } catch (error: any) {
      logger.error('Error getting cost metrics:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // GET /cost/budget/:companyId - Check budget status
  fastify.get('/cost/budget/:companyId', async (request, reply) => {
    try {
      const { companyId } = request.params as { companyId: string };

      const budget = await checkBudget(companyId);

      return reply.send({
        success: true,
        budget,
      });
    } catch (error: any) {
      logger.error('Error checking budget:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });

  // Prometheus metrics endpoint
  fastify.get('/metrics', async (request, reply) => {
    try {
      const metrics = getCostMetrics();

      // Format as Prometheus metrics
      const lines: string[] = [];

      // Q2Q requests total
      lines.push('# HELP q2q_requests_total Total number of Q2Q requests');
      lines.push('# TYPE q2q_requests_total counter');
      lines.push(`q2q_requests_total ${metrics.totalRequests}`);

      // Q2Q cost dollars
      lines.push('# HELP q2q_cost_dollars Total cost in dollars');
      lines.push('# TYPE q2q_cost_dollars gauge');
      lines.push(`q2q_cost_dollars ${metrics.totalCost}`);

      // Q2Q tokens total
      lines.push('# HELP q2q_tokens_total Total tokens processed');
      lines.push('# TYPE q2q_tokens_total counter');
      lines.push(`q2q_tokens_total ${metrics.totalTokens}`);

      // By provider
      for (const [provider, data] of Object.entries(metrics.byProvider)) {
        lines.push(`q2q_requests_total{provider="${provider}"} ${data.count}`);
        lines.push(`q2q_cost_dollars{provider="${provider}"} ${data.cost}`);
        lines.push(`q2q_tokens_total{provider="${provider}"} ${data.tokens}`);
      }

      // By model
      for (const [model, data] of Object.entries(metrics.byModel)) {
        lines.push(`q2q_requests_total{model="${model}"} ${data.count}`);
        lines.push(`q2q_cost_dollars{model="${model}"} ${data.cost}`);
        lines.push(`q2q_tokens_total{model="${model}"} ${data.tokens}`);
      }

      return reply
        .header('Content-Type', 'text/plain; version=0.0.4')
        .send(lines.join('\n'));
    } catch (error: any) {
      logger.error('Error generating metrics:', error);
      return reply.status(500).send({
        error: 'Internal server error',
        message: error.message,
      });
    }
  });
};
