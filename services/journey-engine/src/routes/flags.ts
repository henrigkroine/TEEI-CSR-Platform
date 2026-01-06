import type { FastifyInstance } from 'fastify';
import { db } from '@teei/shared-schema';
import { journeyFlags } from '@teei/shared-schema';
import { eq, and, desc } from 'drizzle-orm';
import { fetchParticipantContext, clearContextCache } from '../utils/profile.js';
import { loadActiveRules } from '../subscribers/rules-loader.js';
import { evaluateAllRules } from '../rules/engine.js';
import { z } from 'zod';

const GetFlagsParamsSchema = z.object({
  userId: z.string().uuid(),
});

const EvaluateFlagsParamsSchema = z.object({
  userId: z.string().uuid(),
});

/**
 * Journey Flags API routes
 */
export async function flagsRoutes(fastify: FastifyInstance) {
  /**
   * GET /journey/flags/:userId
   * Get all journey flags for a user
   */
  fastify.get<{ Params: { userId: string } }>('/flags/:userId', async (request, reply) => {
    const { userId } = GetFlagsParamsSchema.parse(request.params);

    try {
      const flags = await db
        .select()
        .from(journeyFlags)
        .where(eq(journeyFlags.userId, userId))
        .orderBy(desc(journeyFlags.setAt));

      return {
        userId,
        flags: flags.map((f) => ({
          flag: f.flag,
          value: f.value,
          setByRule: f.setByRule,
          setAt: f.setAt,
          expiresAt: f.expiresAt,
        })),
        count: flags.length,
      };
    } catch (error) {
      request.log.error({ error, userId }, 'Error fetching flags');
      reply.status(500).send({ error: 'Failed to fetch flags' });
    }
  });

  /**
   * POST /journey/flags/:userId/evaluate
   * Manually trigger rule evaluation for a user
   */
  fastify.post<{ Params: { userId: string } }>('/flags/:userId/evaluate', async (request, reply) => {
    const { userId } = EvaluateFlagsParamsSchema.parse(request.params);

    try {
      // Clear cache to get fresh data
      clearContextCache(userId);

      // Fetch context
      const context = await fetchParticipantContext(userId);

      // Load active rules
      const rules = await loadActiveRules();

      // Evaluate all rules
      const result = await evaluateAllRules(rules, context);

      return {
        userId,
        evaluatedRules: result.evaluatedRules,
        triggeredRules: result.triggeredRules,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      request.log.error({ error, userId }, 'Error evaluating flags');
      reply.status(500).send({ error: 'Failed to evaluate flags' });
    }
  });

  /**
   * GET /journey/flags/:userId/history
   * Get flag change history for a user
   * (In a production system, this would query an audit log table)
   */
  fastify.get<{ Params: { userId: string } }>('/flags/:userId/history', async (request, reply) => {
    const { userId } = GetFlagsParamsSchema.parse(request.params);

    try {
      // For now, return current flags with their set timestamps
      // In production, this would query a separate audit/history table
      const flags = await db
        .select()
        .from(journeyFlags)
        .where(eq(journeyFlags.userId, userId))
        .orderBy(desc(journeyFlags.setAt));

      return {
        userId,
        history: flags.map((f) => ({
          flag: f.flag,
          value: f.value,
          setByRule: f.setByRule,
          changedAt: f.setAt,
        })),
        count: flags.length,
      };
    } catch (error) {
      request.log.error({ error, userId }, 'Error fetching flag history');
      reply.status(500).send({ error: 'Failed to fetch flag history' });
    }
  });
}
