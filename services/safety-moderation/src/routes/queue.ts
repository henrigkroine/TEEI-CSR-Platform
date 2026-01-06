import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError, createServiceLogger } from '@teei/shared-utils';
import { db, safetyFlags, safetyReviewQueue } from '@teei/shared-schema';
import { eq, desc } from 'drizzle-orm';

const logger = createServiceLogger('safety-queue');

const ReviewActionSchema = z.object({
  notes: z.string().optional(),
  assignedTo: z.string().uuid().optional(),
});

export async function queueRoutes(app: FastifyInstance) {
  // GET /queue - List pending reviews (paginated)
  app.get('/queue', async (request, _reply) => {
    const { limit = 50, offset = 0, status = 'pending' } = request.query as {
      limit?: number;
      offset?: number;
      status?: string;
    };

    const items = await db
      .select({
        queueItem: safetyReviewQueue,
        flag: safetyFlags,
      })
      .from(safetyReviewQueue)
      .leftJoin(safetyFlags, eq(safetyReviewQueue.flagId, safetyFlags.id))
      .where(eq(safetyReviewQueue.status, status as any))
      .orderBy(desc(safetyReviewQueue.createdAt))
      .limit(Number(limit))
      .offset(Number(offset));

    return {
      items,
      count: items.length,
      pagination: {
        limit: Number(limit),
        offset: Number(offset),
      },
    };
  });

  // GET /queue/:id - Get specific review item
  app.get<{ Params: { id: string } }>('/queue/:id', async (request, reply) => {
    const { id } = request.params;

    const [item] = await db
      .select({
        queueItem: safetyReviewQueue,
        flag: safetyFlags,
      })
      .from(safetyReviewQueue)
      .leftJoin(safetyFlags, eq(safetyReviewQueue.flagId, safetyFlags.id))
      .where(eq(safetyReviewQueue.id, id));

    if (!item) {
      return reply.status(404).send({
        error: 'Review item not found',
      });
    }

    return {
      success: true,
      item,
    };
  });

  // POST /queue/:id/review - Mark as reviewed (with notes)
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/queue/:id/review',
    async (request, reply) => {
      const { id } = request.params;
      const parsed = ReviewActionSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new ValidationError('Invalid request body', { errors: parsed.error.errors });
      }

      const [item] = await db
        .select()
        .from(safetyReviewQueue)
        .where(eq(safetyReviewQueue.id, id));

      if (!item) {
        return reply.status(404).send({
          error: 'Review item not found',
        });
      }

      // Update queue item
      const [updated] = await db
        .update(safetyReviewQueue)
        .set({
          status: 'reviewed',
          reviewedAt: new Date(),
          reviewerNotes: parsed.data.notes || null,
          assignedTo: parsed.data.assignedTo || null,
        })
        .where(eq(safetyReviewQueue.id, id))
        .returning();

      // Update associated flag
      await db
        .update(safetyFlags)
        .set({
          reviewStatus: 'approved',
          reviewNotes: parsed.data.notes || null,
          reviewedAt: new Date(),
          reviewedBy: parsed.data.assignedTo || null,
        })
        .where(eq(safetyFlags.id, item.flagId));

      logger.info(`Review ${id} marked as reviewed`);

      return {
        success: true,
        item: updated,
      };
    }
  );

  // POST /queue/:id/escalate - Escalate to admin
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/queue/:id/escalate',
    async (request, reply) => {
      const { id } = request.params;
      const parsed = ReviewActionSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new ValidationError('Invalid request body', { errors: parsed.error.errors });
      }

      const [item] = await db
        .select()
        .from(safetyReviewQueue)
        .where(eq(safetyReviewQueue.id, id));

      if (!item) {
        return reply.status(404).send({
          error: 'Review item not found',
        });
      }

      // Update queue item
      const [updated] = await db
        .update(safetyReviewQueue)
        .set({
          status: 'escalated',
          reviewerNotes: parsed.data.notes || null,
          assignedTo: parsed.data.assignedTo || null,
        })
        .where(eq(safetyReviewQueue.id, id))
        .returning();

      // Update associated flag
      await db
        .update(safetyFlags)
        .set({
          reviewStatus: 'escalated',
          reviewNotes: parsed.data.notes || null,
        })
        .where(eq(safetyFlags.id, item.flagId));

      logger.info(`Review ${id} escalated`);

      return {
        success: true,
        item: updated,
      };
    }
  );

  // POST /queue/:id/dismiss - Dismiss flag
  app.post<{ Params: { id: string }; Body: unknown }>(
    '/queue/:id/dismiss',
    async (request, reply) => {
      const { id } = request.params;
      const parsed = ReviewActionSchema.safeParse(request.body);

      if (!parsed.success) {
        throw new ValidationError('Invalid request body', { errors: parsed.error.errors });
      }

      const [item] = await db
        .select()
        .from(safetyReviewQueue)
        .where(eq(safetyReviewQueue.id, id));

      if (!item) {
        return reply.status(404).send({
          error: 'Review item not found',
        });
      }

      // Update queue item
      const [updated] = await db
        .update(safetyReviewQueue)
        .set({
          status: 'dismissed',
          reviewedAt: new Date(),
          reviewerNotes: parsed.data.notes || null,
          assignedTo: parsed.data.assignedTo || null,
        })
        .where(eq(safetyReviewQueue.id, id))
        .returning();

      // Update associated flag
      await db
        .update(safetyFlags)
        .set({
          reviewStatus: 'rejected',
          reviewNotes: parsed.data.notes || null,
          reviewedAt: new Date(),
          reviewedBy: parsed.data.assignedTo || null,
        })
        .where(eq(safetyFlags.id, item.flagId));

      logger.info(`Review ${id} dismissed`);

      return {
        success: true,
        item: updated,
      };
    }
  );
}
