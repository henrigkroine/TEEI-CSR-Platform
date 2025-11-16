import type { FastifyInstance } from 'fastify';
import { budgetDb } from '../db/index.js';
import {
  TrackUsageSchema,
  SetBudgetSchema,
  type BudgetStatusResponse,
  type AIModel,
} from '../types/index.js';

export async function budgetRoutes(fastify: FastifyInstance) {
  /**
   * GET /api/ai-budget/tenant/:id
   * Get budget status for a tenant
   */
  fastify.get<{
    Params: { id: string };
    Reply: BudgetStatusResponse;
  }>('/tenant/:id', async (request, reply) => {
    const { id: tenantId } = request.params;

    try {
      const budgets = await budgetDb.getBudgetStatus(tenantId);

      const totalUsage = budgets.reduce((sum, b) => sum + b.current_usage_usd, 0);
      const totalLimit = budgets.reduce((sum, b) => sum + b.monthly_limit_usd, 0);

      return {
        tenant_id: tenantId,
        budgets,
        total_usage_usd: parseFloat(totalUsage.toFixed(2)),
        total_limit_usd: parseFloat(totalLimit.toFixed(2)),
      };
    } catch (error) {
      fastify.log.error(error, 'Failed to get budget status');
      return reply.code(500).send({ error: 'Failed to get budget status' });
    }
  });

  /**
   * POST /api/ai-budget/check
   * Check if a tenant can make an AI request (pre-flight check)
   */
  fastify.post<{
    Body: {
      tenant_id: string;
      model: AIModel;
      estimated_input_tokens: number;
      estimated_output_tokens: number;
    };
  }>('/check', async (request, reply) => {
    const { tenant_id, model, estimated_input_tokens, estimated_output_tokens } = request.body;

    try {
      const result = await budgetDb.checkBudget(tenant_id, model, {
        input: estimated_input_tokens,
        output: estimated_output_tokens,
      });

      if (!result.allowed) {
        return reply.code(429).send({
          error: 'Budget exceeded',
          message: result.reason,
          current_usage_usd: result.current_usage_usd,
          monthly_limit_usd: result.monthly_limit_usd,
          percentage_used: result.percentage_used,
        });
      }

      return {
        allowed: true,
        current_usage_usd: result.current_usage_usd,
        monthly_limit_usd: result.monthly_limit_usd,
        percentage_used: result.percentage_used,
      };
    } catch (error) {
      fastify.log.error(error, 'Failed to check budget');
      return reply.code(500).send({ error: 'Failed to check budget' });
    }
  });

  /**
   * POST /api/ai-budget/track
   * Record actual token usage after API call completes
   */
  fastify.post<{
    Body: typeof TrackUsageSchema._type;
  }>('/track', {
    schema: {
      body: {
        type: 'object',
        required: ['request_id', 'tenant_id', 'model', 'prompt_tokens', 'completion_tokens'],
        properties: {
          request_id: { type: 'string', format: 'uuid' },
          tenant_id: { type: 'string' },
          model: { type: 'string', enum: Object.keys(['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']) },
          prompt_tokens: { type: 'number', minimum: 1 },
          completion_tokens: { type: 'number', minimum: 1 },
          report_type: { type: 'string' },
          user_id: { type: 'string' },
        },
      },
    },
  }, async (request, reply) => {
    const validated = TrackUsageSchema.parse(request.body);

    try {
      await budgetDb.trackUsage(validated);

      return { success: true, message: 'Usage tracked successfully' };
    } catch (error) {
      fastify.log.error(error, 'Failed to track usage');
      return reply.code(500).send({ error: 'Failed to track usage' });
    }
  });

  /**
   * POST /api/ai-budget/set
   * Set budget limit for a tenant (admin only)
   */
  fastify.post<{
    Body: typeof SetBudgetSchema._type;
  }>('/set', {
    schema: {
      body: {
        type: 'object',
        required: ['tenant_id', 'model', 'monthly_limit_usd'],
        properties: {
          tenant_id: { type: 'string' },
          model: { type: 'string', enum: Object.keys(['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-haiku-20240307']) },
          monthly_limit_usd: { type: 'number', minimum: 0 },
        },
      },
    },
  }, async (request, reply) => {
    // TODO: Add admin authentication middleware
    const validated = SetBudgetSchema.parse(request.body);

    try {
      await budgetDb.setBudget(
        validated.tenant_id,
        validated.model,
        validated.monthly_limit_usd
      );

      return {
        success: true,
        message: `Budget set to $${validated.monthly_limit_usd}/month for ${validated.model}`,
      };
    } catch (error) {
      fastify.log.error(error, 'Failed to set budget');
      return reply.code(500).send({ error: 'Failed to set budget' });
    }
  });

  /**
   * GET /api/ai-budget/top-consumers
   * Get top AI token consumers (analytics endpoint)
   */
  fastify.get('/top-consumers', async (request, reply) => {
    try {
      const topConsumers = await budgetDb.getTopConsumers(10);

      return {
        consumers: topConsumers.map((c) => ({
          tenant_id: c.tenant_id,
          total_usage_usd: parseFloat(c.total_usage_usd),
          total_input_tokens: parseInt(c.total_input_tokens),
          total_output_tokens: parseInt(c.total_output_tokens),
        })),
      };
    } catch (error) {
      fastify.log.error(error, 'Failed to get top consumers');
      return reply.code(500).send({ error: 'Failed to get top consumers' });
    }
  });

  /**
   * GET /health
   * Health check endpoint
   */
  fastify.get('/health', async () => {
    return { status: 'healthy', service: 'ai-budget' };
  });
}
