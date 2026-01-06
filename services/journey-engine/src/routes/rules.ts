import type { FastifyInstance } from 'fastify';
import { db } from '@teei/shared-schema';
import { journeyRules } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { RuleSchema, validateRule } from '../rules/schema.js';
import { clearRulesCache } from '../subscribers/rules-loader.js';

const GetRuleParamsSchema = z.object({
  id: z.string(),
});

const CreateRuleBodySchema = RuleSchema;

const UpdateRuleParamsSchema = z.object({
  id: z.string(),
});

const UpdateRuleBodySchema = RuleSchema.partial();

/**
 * Rules Management API routes (admin endpoints)
 */
export async function rulesRoutes(fastify: FastifyInstance) {
  /**
   * GET /journey/rules
   * List all rules
   */
  fastify.get('/rules', async (request, reply) => {
    try {
      const rules = await db.select().from(journeyRules);

      return {
        rules: rules.map((r) => ({
          id: r.id,
          ruleId: r.ruleId,
          name: r.name,
          description: r.description,
          active: r.active,
          priority: r.priority,
          createdAt: r.createdAt,
          updatedAt: r.updatedAt,
          config: r.ruleConfig,
        })),
        count: rules.length,
      };
    } catch (error) {
      request.log.error({ error }, 'Error fetching rules');
      reply.status(500).send({ error: 'Failed to fetch rules' });
    }
  });

  /**
   * GET /journey/rules/:id
   * Get a specific rule
   */
  fastify.get<{ Params: { id: string } }>('/rules/:id', async (request, reply) => {
    const { id } = GetRuleParamsSchema.parse(request.params);

    try {
      const [rule] = await db
        .select()
        .from(journeyRules)
        .where(eq(journeyRules.ruleId, id))
        .limit(1);

      if (!rule) {
        return reply.status(404).send({ error: 'Rule not found' });
      }

      return {
        id: rule.id,
        ruleId: rule.ruleId,
        name: rule.name,
        description: rule.description,
        active: rule.active,
        priority: rule.priority,
        createdAt: rule.createdAt,
        updatedAt: rule.updatedAt,
        config: rule.ruleConfig,
      };
    } catch (error) {
      request.log.error({ error, id }, 'Error fetching rule');
      reply.status(500).send({ error: 'Failed to fetch rule' });
    }
  });

  /**
   * POST /journey/rules
   * Create a new rule
   */
  fastify.post<{ Body: any }>('/rules', async (request, reply) => {
    try {
      const rule = CreateRuleBodySchema.parse(request.body);

      // Validate rule
      const validation = validateRule(rule);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid rule', details: validation.errors });
      }

      // Check if rule ID already exists
      const existing = await db
        .select()
        .from(journeyRules)
        .where(eq(journeyRules.ruleId, rule.id))
        .limit(1);

      if (existing.length > 0) {
        return reply.status(409).send({ error: 'Rule with this ID already exists' });
      }

      // Insert new rule
      const [newRule] = await db
        .insert(journeyRules)
        .values({
          ruleId: rule.id,
          name: rule.name,
          description: rule.description,
          ruleConfig: rule as any,
          active: rule.active,
          priority: rule.priority,
        })
        .returning();

      // Clear cache
      clearRulesCache();

      return {
        success: true,
        rule: {
          id: newRule.id,
          ruleId: newRule.ruleId,
          name: newRule.name,
          description: newRule.description,
          active: newRule.active,
          priority: newRule.priority,
          createdAt: newRule.createdAt,
        },
      };
    } catch (error) {
      request.log.error({ error }, 'Error creating rule');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid rule', details: error.errors });
      }
      reply.status(500).send({ error: 'Failed to create rule' });
    }
  });

  /**
   * PUT /journey/rules/:id
   * Update an existing rule
   */
  fastify.put<{ Params: { id: string }; Body: any }>('/rules/:id', async (request, reply) => {
    const { id } = UpdateRuleParamsSchema.parse(request.params);

    try {
      // Find existing rule
      const [existing] = await db
        .select()
        .from(journeyRules)
        .where(eq(journeyRules.ruleId, id))
        .limit(1);

      if (!existing) {
        return reply.status(404).send({ error: 'Rule not found' });
      }

      // Merge with existing config
      const updatedConfig = {
        ...(existing.ruleConfig as any),
        ...request.body,
      };

      // Validate merged config
      const validation = validateRule(updatedConfig);
      if (!validation.success) {
        return reply.status(400).send({ error: 'Invalid rule', details: validation.errors });
      }

      // Update rule
      const [updated] = await db
        .update(journeyRules)
        .set({
          name: updatedConfig.name,
          description: updatedConfig.description,
          ruleConfig: updatedConfig as any,
          active: updatedConfig.active,
          priority: updatedConfig.priority,
          updatedAt: new Date(),
        })
        .where(eq(journeyRules.ruleId, id))
        .returning();

      // Clear cache
      clearRulesCache();

      return {
        success: true,
        rule: {
          id: updated.id,
          ruleId: updated.ruleId,
          name: updated.name,
          description: updated.description,
          active: updated.active,
          priority: updated.priority,
          updatedAt: updated.updatedAt,
        },
      };
    } catch (error) {
      request.log.error({ error, id }, 'Error updating rule');
      if (error instanceof z.ZodError) {
        return reply.status(400).send({ error: 'Invalid rule', details: error.errors });
      }
      reply.status(500).send({ error: 'Failed to update rule' });
    }
  });

  /**
   * DELETE /journey/rules/:id
   * Delete a rule
   */
  fastify.delete<{ Params: { id: string } }>('/rules/:id', async (request, reply) => {
    const { id } = GetRuleParamsSchema.parse(request.params);

    try {
      const deleted = await db
        .delete(journeyRules)
        .where(eq(journeyRules.ruleId, id))
        .returning();

      if (deleted.length === 0) {
        return reply.status(404).send({ error: 'Rule not found' });
      }

      // Clear cache
      clearRulesCache();

      return {
        success: true,
        message: `Rule ${id} deleted`,
      };
    } catch (error) {
      request.log.error({ error, id }, 'Error deleting rule');
      reply.status(500).send({ error: 'Failed to delete rule' });
    }
  });

  /**
   * POST /journey/rules/:id/activate
   * Activate a rule
   */
  fastify.post<{ Params: { id: string } }>('/rules/:id/activate', async (request, reply) => {
    const { id } = GetRuleParamsSchema.parse(request.params);

    try {
      const [updated] = await db
        .update(journeyRules)
        .set({ active: true, updatedAt: new Date() })
        .where(eq(journeyRules.ruleId, id))
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: 'Rule not found' });
      }

      // Clear cache
      clearRulesCache();

      return {
        success: true,
        ruleId: updated.ruleId,
        active: updated.active,
      };
    } catch (error) {
      request.log.error({ error, id }, 'Error activating rule');
      reply.status(500).send({ error: 'Failed to activate rule' });
    }
  });

  /**
   * POST /journey/rules/:id/deactivate
   * Deactivate a rule
   */
  fastify.post<{ Params: { id: string } }>('/rules/:id/deactivate', async (request, reply) => {
    const { id } = GetRuleParamsSchema.parse(request.params);

    try {
      const [updated] = await db
        .update(journeyRules)
        .set({ active: false, updatedAt: new Date() })
        .where(eq(journeyRules.ruleId, id))
        .returning();

      if (!updated) {
        return reply.status(404).send({ error: 'Rule not found' });
      }

      // Clear cache
      clearRulesCache();

      return {
        success: true,
        ruleId: updated.ruleId,
        active: updated.active,
      };
    } catch (error) {
      request.log.error({ error, id }, 'Error deactivating rule');
      reply.status(500).send({ error: 'Failed to deactivate rule' });
    }
  });
}
