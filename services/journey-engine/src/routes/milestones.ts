import type { FastifyInstance } from 'fastify';
import { db } from '@teei/shared-schema';
import { journeyMilestones } from '@teei/shared-schema';
import { eq, desc } from 'drizzle-orm';
import { z } from 'zod';
import { getEventBus } from '@teei/shared-utils';

const GetMilestonesParamsSchema = z.object({
  userId: z.string().uuid(),
});

const TriggerMilestoneParamsSchema = z.object({
  userId: z.string().uuid(),
  milestone: z.string(),
});

const TriggerMilestoneBodySchema = z.object({
  metadata: z.record(z.any()).optional(),
});

/**
 * Journey Milestones API routes
 */
export async function milestonesRoutes(fastify: FastifyInstance) {
  /**
   * GET /journey/milestones/:userId
   * Get all reached milestones for a user
   */
  fastify.get<{ Params: { userId: string } }>('/milestones/:userId', async (request, reply) => {
    const { userId } = GetMilestonesParamsSchema.parse(request.params);

    try {
      const milestones = await db
        .select()
        .from(journeyMilestones)
        .where(eq(journeyMilestones.userId, userId))
        .orderBy(desc(journeyMilestones.reachedAt));

      return {
        userId,
        milestones: milestones.map((m) => ({
          milestone: m.milestone,
          reachedAt: m.reachedAt,
          triggeredByRule: m.triggeredByRule,
          metadata: m.metadata,
        })),
        count: milestones.length,
      };
    } catch (error) {
      request.log.error({ error, userId }, 'Error fetching milestones');
      reply.status(500).send({ error: 'Failed to fetch milestones' });
    }
  });

  /**
   * POST /journey/milestones/:userId/:milestone
   * Manually trigger a milestone for a user
   */
  fastify.post<{
    Params: { userId: string; milestone: string };
    Body: { metadata?: Record<string, any> };
  }>('/milestones/:userId/:milestone', async (request, reply) => {
    const { userId, milestone } = TriggerMilestoneParamsSchema.parse(request.params);
    const { metadata } = TriggerMilestoneBodySchema.parse(request.body || {});

    try {
      // Insert milestone record
      const [newMilestone] = await db
        .insert(journeyMilestones)
        .values({
          userId,
          milestone,
          reachedAt: new Date(),
          triggeredByRule: 'manual',
          metadata: metadata || {},
        })
        .returning();

      // Emit milestone event
      const eventBus = getEventBus();
      await eventBus.publish({
        id: crypto.randomUUID(),
        type: 'orchestration.milestone.reached' as any,
        version: 'v1',
        timestamp: new Date().toISOString(),
        data: {
          userId,
          milestone,
          triggeredBy: 'manual',
          metadata,
        },
      });

      return {
        success: true,
        milestone: {
          milestone: newMilestone.milestone,
          reachedAt: newMilestone.reachedAt,
          triggeredByRule: newMilestone.triggeredByRule,
          metadata: newMilestone.metadata,
        },
      };
    } catch (error) {
      request.log.error({ error, userId, milestone }, 'Error triggering milestone');
      reply.status(500).send({ error: 'Failed to trigger milestone' });
    }
  });
}
