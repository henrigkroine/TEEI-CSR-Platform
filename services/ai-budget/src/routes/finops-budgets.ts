/**
 * FinOps Budget Management Routes
 * CRUD and status endpoints for budgets and policies
 */

import type { FastifyInstance } from 'fastify';
import { finopsBudgetDb } from '../db/finops-budgets.js';
import type { CreateBudgetRequest, UpdateBudgetRequest } from '@teei/shared-types';

export async function finopsBudgetRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/ai-budget/finops/budgets
   * Create a new budget
   */
  fastify.post<{
    Body: CreateBudgetRequest;
  }>('/budgets', async (request, reply) => {
    try {
      // TODO: Extract user from auth token
      const createdBy = 'system';

      const budget = await finopsBudgetDb.createBudget(request.body, createdBy);

      return {
        success: true,
        message: 'Budget created successfully',
        budget,
      };
    } catch (error: any) {
      fastify.log.error(error, 'Failed to create budget');

      // Check for unique constraint violation
      if (error.code === '23505') {
        return reply.code(409).send({
          error: 'Budget already exists',
          message: `A budget with name "${request.body.name}" already exists for this tenant`,
        });
      }

      return reply.code(500).send({
        error: 'Failed to create budget',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/ai-budget/finops/budgets/:id
   * Get budget by ID
   */
  fastify.get<{
    Params: { id: string };
  }>('/budgets/:id', async (request, reply) => {
    try {
      const budget = await finopsBudgetDb.getBudget(request.params.id);

      if (!budget) {
        return reply.code(404).send({
          error: 'Budget not found',
        });
      }

      return budget;
    } catch (error: any) {
      fastify.log.error(error, 'Failed to get budget');
      return reply.code(500).send({
        error: 'Failed to get budget',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/ai-budget/finops/budgets/tenant/:tenantId
   * Get all budgets for a tenant
   */
  fastify.get<{
    Params: { tenantId: string };
    Querystring: { enabledOnly?: string };
  }>('/budgets/tenant/:tenantId', async (request, reply) => {
    try {
      const enabledOnly = request.query.enabledOnly === 'true';
      const budgets = await finopsBudgetDb.getBudgets(request.params.tenantId, enabledOnly);

      return {
        tenantId: request.params.tenantId,
        budgets,
        count: budgets.length,
      };
    } catch (error: any) {
      fastify.log.error(error, 'Failed to get budgets');
      return reply.code(500).send({
        error: 'Failed to get budgets',
        message: error.message,
      });
    }
  });

  /**
   * PATCH /api/ai-budget/finops/budgets/:id
   * Update budget
   */
  fastify.patch<{
    Params: { id: string };
    Body: UpdateBudgetRequest;
  }>('/budgets/:id', async (request, reply) => {
    try {
      const budget = await finopsBudgetDb.updateBudget(request.params.id, request.body);

      if (!budget) {
        return reply.code(404).send({
          error: 'Budget not found',
        });
      }

      return {
        success: true,
        message: 'Budget updated successfully',
        budget,
      };
    } catch (error: any) {
      fastify.log.error(error, 'Failed to update budget');
      return reply.code(500).send({
        error: 'Failed to update budget',
        message: error.message,
      });
    }
  });

  /**
   * DELETE /api/ai-budget/finops/budgets/:id
   * Delete budget
   */
  fastify.delete<{
    Params: { id: string };
  }>('/budgets/:id', async (request, reply) => {
    try {
      const deleted = await finopsBudgetDb.deleteBudget(request.params.id);

      if (!deleted) {
        return reply.code(404).send({
          error: 'Budget not found',
        });
      }

      return {
        success: true,
        message: 'Budget deleted successfully',
      };
    } catch (error: any) {
      fastify.log.error(error, 'Failed to delete budget');
      return reply.code(500).send({
        error: 'Failed to delete budget',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/ai-budget/finops/budgets/:id/status
   * Get budget status with current spend and alerts
   */
  fastify.get<{
    Params: { id: string };
  }>('/budgets/:id/status', async (request, reply) => {
    try {
      const status = await finopsBudgetDb.getBudgetStatus(request.params.id);

      if (!status) {
        return reply.code(404).send({
          error: 'Budget not found',
        });
      }

      return status;
    } catch (error: any) {
      fastify.log.error(error, 'Failed to get budget status');
      return reply.code(500).send({
        error: 'Failed to get budget status',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/ai-budget/finops/budgets/tenant/:tenantId/status
   * Get all budget statuses for a tenant
   */
  fastify.get<{
    Params: { tenantId: string };
  }>('/budgets/tenant/:tenantId/status', async (request, reply) => {
    try {
      const statuses = await finopsBudgetDb.getTenantBudgetStatuses(request.params.tenantId);

      // Calculate totals
      const totalBudget = statuses.reduce((sum, s) => sum + s.budget.amount, 0);
      const totalSpend = statuses.reduce((sum, s) => sum + s.currentSpend, 0);
      const currency = statuses.length > 0 ? statuses[0].budget.currency : 'USD';

      return {
        tenantId: request.params.tenantId,
        budgets: statuses,
        totalBudget,
        totalSpend,
        currency,
      };
    } catch (error: any) {
      fastify.log.error(error, 'Failed to get budget statuses');
      return reply.code(500).send({
        error: 'Failed to get budget statuses',
        message: error.message,
      });
    }
  });

  /**
   * GET /api/ai-budget/finops/budgets/:id/events
   * Get recent budget events (threshold breaches, enforcement actions)
   */
  fastify.get<{
    Params: { id: string };
    Querystring: { limit?: string };
  }>('/budgets/:id/events', async (request, reply) => {
    try {
      const limit = request.query.limit ? parseInt(request.query.limit) : 50;
      const events = await finopsBudgetDb.getBudgetEvents(request.params.id, limit);

      return {
        budgetId: request.params.id,
        events,
        count: events.length,
      };
    } catch (error: any) {
      fastify.log.error(error, 'Failed to get budget events');
      return reply.code(500).send({
        error: 'Failed to get budget events',
        message: error.message,
      });
    }
  });

  /**
   * POST /api/ai-budget/finops/budgets/:id/check-enforcement
   * Check if budget policy should be enforced (called before operations)
   *
   * Returns:
   * - allowed: boolean
   * - actions: array of triggered actions
   * - reason: string (if not allowed)
   */
  fastify.post<{
    Params: { id: string };
    Body: {
      operationType: 'ai_generation' | 'export' | 'compute';
    };
  }>('/budgets/:id/check-enforcement', async (request, reply) => {
    try {
      const status = await finopsBudgetDb.getBudgetStatus(request.params.id);

      if (!status) {
        return reply.code(404).send({
          error: 'Budget not found',
        });
      }

      const { budget, currentSpend, percentageUsed, triggeredActions } = status;

      // Check if enforcement threshold reached
      if (percentageUsed >= budget.policy.enforceThreshold) {
        const { operationType } = request.body;

        // Check if operation should be blocked based on triggered actions
        const shouldBlock =
          (operationType === 'ai_generation' && triggeredActions.includes('block_ai')) ||
          (operationType === 'export' && triggeredActions.includes('block_export'));

        if (shouldBlock) {
          return {
            allowed: false,
            reason: `Budget ${budget.name} has exceeded ${budget.policy.enforceThreshold}% threshold. Operation blocked by policy.`,
            currentSpend,
            budgetAmount: budget.amount,
            percentageUsed,
            actions: triggeredActions,
          };
        }

        // Check for rate limiting
        if (triggeredActions.includes('rate_limit') && budget.policy.rateLimitFactor) {
          return {
            allowed: true,
            rateLimited: true,
            rateLimitFactor: budget.policy.rateLimitFactor,
            reason: `Budget ${budget.name} is in rate limit mode (${budget.policy.rateLimitFactor}x factor).`,
            currentSpend,
            budgetAmount: budget.amount,
            percentageUsed,
            actions: triggeredActions,
          };
        }
      }

      return {
        allowed: true,
        currentSpend,
        budgetAmount: budget.amount,
        percentageUsed,
        actions: triggeredActions,
      };
    } catch (error: any) {
      fastify.log.error(error, 'Failed to check budget enforcement');
      return reply.code(500).send({
        error: 'Failed to check budget enforcement',
        message: error.message,
      });
    }
  });
}
