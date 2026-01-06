/**
 * Scenario Planner API Routes
 *
 * Endpoints for creating, running, and managing what-if scenarios
 */

import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { db } from '@teei/shared-schema/db';
import { scenarios, scenarioExecutions } from '@teei/shared-schema';
import { eq, and, desc } from 'drizzle-orm';
import { runScenarioEngine, validateScenarioParameters } from '../lib/scenario-engine.js';
import type {
  ScenarioParameters,
  BaselineMetrics,
  CreateScenarioRequest,
  RunScenarioRequest,
} from '@teei/shared-types';

// Validation schemas
const ScenarioParametersSchema = z.object({
  volunteerHoursDelta: z.number().optional(),
  grantAmountDelta: z.number().optional(),
  cohortSizeMultiplier: z.number().positive().max(10).optional(),
  cohortDurationMonths: z.number().int().min(1).max(60).optional(),
  programMix: z
    .object({
      buddySystem: z.number().min(0).max(100).optional(),
      skillShare: z.number().min(0).max(100).optional(),
      mentorship: z.number().min(0).max(100).optional(),
      communityEvents: z.number().min(0).max(100).optional(),
    })
    .optional(),
  activityRates: z
    .object({
      matchesPerMonth: z.number().min(0).optional(),
      eventsPerMonth: z.number().min(0).optional(),
      skillSharesPerMonth: z.number().min(0).optional(),
      feedbackPerMonth: z.number().min(0).optional(),
      milestonesPerMonth: z.number().min(0).optional(),
      checkinsPerMonth: z.number().min(0).optional(),
    })
    .optional(),
  investmentMultiplier: z.number().positive().max(10).optional(),
});

const CreateScenarioSchema = z.object({
  tenantId: z.string(),
  companyId: z.string().uuid(),
  name: z.string().min(1).max(255),
  description: z.string().optional(),
  parameters: ScenarioParametersSchema,
  tags: z.array(z.string()).optional(),
});

const RunScenarioSchema = z.object({
  scenarioId: z.string().uuid(),
  baselinePeriod: z
    .object({
      start: z.string(),
      end: z.string(),
    })
    .optional(),
});

/**
 * Fetch baseline metrics from analytics service
 * In production, this would call the analytics API
 */
async function fetchBaselineMetrics(
  companyId: string,
  period?: { start: string; end: string },
  fastify: any
): Promise<BaselineMetrics> {
  // TODO: Replace with actual analytics service call
  // const response = await fetch(
  //   `http://analytics:3008/v1/analytics/companies/${companyId}/baseline?start=${period.start}&end=${period.end}`
  // );
  // return response.json();

  // Stub implementation - generate realistic baseline
  fastify.log.warn('Using stub baseline data - integrate with analytics service');

  const startDate = period?.start || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();
  const endDate = period?.end || new Date().toISOString();

  return {
    sroi: 3.5,
    vis: 75.0,
    socialValue: 5250.0,
    investment: 1500.0,
    sdgCoverage: [
      { goalId: 4, coverage: 65.0 },  // Quality Education
      { goalId: 8, coverage: 55.0 },  // Decent Work
      { goalId: 10, coverage: 45.0 }, // Reduced Inequalities
      { goalId: 17, coverage: 40.0 }, // Partnerships
    ],
    activityCounts: {
      matches: 15,
      events: 24,
      skillShares: 9,
      feedback: 30,
      milestones: 6,
      checkins: 36,
    },
    programAllocations: {
      buddySystem: 40,
      skillShare: 30,
      mentorship: 20,
      communityEvents: 10,
    },
    period: {
      start: startDate.split('T')[0],
      end: endDate.split('T')[0],
    },
  };
}

/**
 * Scenario Planner Routes
 */
export const scenarioRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /scenarios
   * Create a new scenario
   */
  fastify.post<{
    Body: CreateScenarioRequest;
  }>('/scenarios', async (request, reply) => {
    try {
      const body = CreateScenarioSchema.parse(request.body);

      // Validate scenario parameters
      const validation = validateScenarioParameters(body.parameters);
      if (!validation.valid) {
        return reply.code(400).send({
          error: 'Invalid scenario parameters',
          details: validation.errors,
        });
      }

      // Create scenario in database
      const [scenario] = await db
        .insert(scenarios)
        .values({
          tenantId: body.tenantId,
          companyId: body.companyId,
          name: body.name,
          description: body.description,
          parameters: body.parameters as any,
          tags: body.tags,
          latestResult: null,
          createdBy: request.headers['x-user-id']?.toString() || 'system',
          updatedBy: request.headers['x-user-id']?.toString() || 'system',
          isFavorite: false,
        })
        .returning();

      fastify.log.info({ scenarioId: scenario.id, name: scenario.name }, 'Scenario created');

      return reply.code(201).send({
        id: scenario.id,
        tenantId: scenario.tenantId,
        companyId: scenario.companyId,
        name: scenario.name,
        description: scenario.description,
        parameters: scenario.parameters,
        tags: scenario.tags,
        latestResult: null,
        createdAt: scenario.createdAt.toISOString(),
        createdBy: scenario.createdBy,
        updatedAt: scenario.updatedAt.toISOString(),
        updatedBy: scenario.updatedBy,
        isFavorite: scenario.isFavorite,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Error creating scenario');

      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return reply.code(500).send({
        error: 'Failed to create scenario',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /scenarios
   * List scenarios for a company
   */
  fastify.get<{
    Querystring: {
      companyId: string;
      limit?: number;
      offset?: number;
      favoritesOnly?: boolean;
    };
  }>('/scenarios', async (request, reply) => {
    try {
      const { companyId, limit = 50, offset = 0, favoritesOnly = false } = request.query;

      const conditions = [eq(scenarios.companyId, companyId)];
      if (favoritesOnly) {
        conditions.push(eq(scenarios.isFavorite, true));
      }

      const results = await db
        .select()
        .from(scenarios)
        .where(and(...conditions))
        .orderBy(desc(scenarios.updatedAt))
        .limit(limit)
        .offset(offset);

      return reply.send({
        scenarios: results.map((s) => ({
          id: s.id,
          tenantId: s.tenantId,
          companyId: s.companyId,
          name: s.name,
          description: s.description,
          parameters: s.parameters,
          tags: s.tags,
          latestResult: s.latestResult,
          createdAt: s.createdAt.toISOString(),
          createdBy: s.createdBy,
          updatedAt: s.updatedAt.toISOString(),
          updatedBy: s.updatedBy,
          isFavorite: s.isFavorite,
        })),
        pagination: {
          limit,
          offset,
          total: results.length,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Error listing scenarios');
      return reply.code(500).send({
        error: 'Failed to list scenarios',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /scenarios/:id
   * Get a specific scenario
   */
  fastify.get<{
    Params: {
      id: string;
    };
  }>('/scenarios/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, id));

      if (!scenario) {
        return reply.code(404).send({
          error: 'Scenario not found',
        });
      }

      return reply.send({
        id: scenario.id,
        tenantId: scenario.tenantId,
        companyId: scenario.companyId,
        name: scenario.name,
        description: scenario.description,
        parameters: scenario.parameters,
        tags: scenario.tags,
        latestResult: scenario.latestResult,
        createdAt: scenario.createdAt.toISOString(),
        createdBy: scenario.createdBy,
        updatedAt: scenario.updatedAt.toISOString(),
        updatedBy: scenario.updatedBy,
        isFavorite: scenario.isFavorite,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching scenario');
      return reply.code(500).send({
        error: 'Failed to fetch scenario',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * POST /scenarios/:id/run
   * Execute a scenario and compute projections
   */
  fastify.post<{
    Params: {
      id: string;
    };
    Body: Partial<RunScenarioRequest>;
  }>('/scenarios/:id/run', async (request, reply) => {
    const startTime = Date.now();

    try {
      const { id } = request.params;

      // Fetch scenario
      const [scenario] = await db.select().from(scenarios).where(eq(scenarios.id, id));

      if (!scenario) {
        return reply.code(404).send({
          error: 'Scenario not found',
        });
      }

      // Fetch baseline metrics
      const baseline = await fetchBaselineMetrics(
        scenario.companyId,
        request.body.baselinePeriod,
        fastify
      );

      // Run scenario engine
      const result = runScenarioEngine(
        scenario.id,
        baseline,
        scenario.parameters as ScenarioParameters
      );

      // Save execution to history
      await db.insert(scenarioExecutions).values({
        scenarioId: scenario.id,
        result: result as any,
        executedBy: request.headers['x-user-id']?.toString() || 'system',
      });

      // Update scenario with latest result
      await db
        .update(scenarios)
        .set({
          latestResult: result as any,
          updatedAt: new Date(),
          updatedBy: request.headers['x-user-id']?.toString() || 'system',
        })
        .where(eq(scenarios.id, scenario.id));

      const latencyMs = Date.now() - startTime;

      fastify.log.info(
        {
          scenarioId: scenario.id,
          latencyMs,
          sroiDelta: result.projected.sroiDelta,
          visDelta: result.projected.visDelta,
        },
        'Scenario executed'
      );

      return reply.send({
        ...result,
        metadata: {
          latencyMs,
        },
      });
    } catch (error) {
      fastify.log.error({ error }, 'Error running scenario');
      return reply.code(500).send({
        error: 'Failed to run scenario',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * GET /scenarios/:id/results
   * Get scenario execution history
   */
  fastify.get<{
    Params: {
      id: string;
    };
    Querystring: {
      limit?: number;
    };
  }>('/scenarios/:id/results', async (request, reply) => {
    try {
      const { id } = request.params;
      const { limit = 10 } = request.query;

      const executions = await db
        .select()
        .from(scenarioExecutions)
        .where(eq(scenarioExecutions.scenarioId, id))
        .orderBy(desc(scenarioExecutions.executedAt))
        .limit(limit);

      return reply.send({
        scenarioId: id,
        executions: executions.map((e) => ({
          id: e.id,
          result: e.result,
          executedBy: e.executedBy,
          executedAt: e.executedAt.toISOString(),
        })),
      });
    } catch (error) {
      fastify.log.error({ error }, 'Error fetching scenario results');
      return reply.code(500).send({
        error: 'Failed to fetch results',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * PATCH /scenarios/:id
   * Update scenario (name, description, parameters)
   */
  fastify.patch<{
    Params: {
      id: string;
    };
    Body: {
      name?: string;
      description?: string;
      parameters?: ScenarioParameters;
      tags?: string[];
      isFavorite?: boolean;
    };
  }>('/scenarios/:id', async (request, reply) => {
    try {
      const { id } = request.params;
      const updates: any = {
        updatedAt: new Date(),
        updatedBy: request.headers['x-user-id']?.toString() || 'system',
      };

      if (request.body.name !== undefined) {
        updates.name = request.body.name;
      }
      if (request.body.description !== undefined) {
        updates.description = request.body.description;
      }
      if (request.body.parameters !== undefined) {
        // Validate parameters
        const validation = validateScenarioParameters(request.body.parameters);
        if (!validation.valid) {
          return reply.code(400).send({
            error: 'Invalid scenario parameters',
            details: validation.errors,
          });
        }
        updates.parameters = request.body.parameters;
      }
      if (request.body.tags !== undefined) {
        updates.tags = request.body.tags;
      }
      if (request.body.isFavorite !== undefined) {
        updates.isFavorite = request.body.isFavorite;
      }

      const [updated] = await db
        .update(scenarios)
        .set(updates)
        .where(eq(scenarios.id, id))
        .returning();

      if (!updated) {
        return reply.code(404).send({
          error: 'Scenario not found',
        });
      }

      return reply.send({
        id: updated.id,
        tenantId: updated.tenantId,
        companyId: updated.companyId,
        name: updated.name,
        description: updated.description,
        parameters: updated.parameters,
        tags: updated.tags,
        latestResult: updated.latestResult,
        createdAt: updated.createdAt.toISOString(),
        createdBy: updated.createdBy,
        updatedAt: updated.updatedAt.toISOString(),
        updatedBy: updated.updatedBy,
        isFavorite: updated.isFavorite,
      });
    } catch (error) {
      fastify.log.error({ error }, 'Error updating scenario');
      return reply.code(500).send({
        error: 'Failed to update scenario',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });

  /**
   * DELETE /scenarios/:id
   * Delete a scenario
   */
  fastify.delete<{
    Params: {
      id: string;
    };
  }>('/scenarios/:id', async (request, reply) => {
    try {
      const { id } = request.params;

      await db.delete(scenarios).where(eq(scenarios.id, id));

      fastify.log.info({ scenarioId: id }, 'Scenario deleted');

      return reply.code(204).send();
    } catch (error) {
      fastify.log.error({ error }, 'Error deleting scenario');
      return reply.code(500).send({
        error: 'Failed to delete scenario',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
};
