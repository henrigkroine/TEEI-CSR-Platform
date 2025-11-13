import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '@teei/shared-utils';
import { getEventBus, createServiceLogger } from '@teei/shared-utils';
import { db, safetyFlags, safetyReviewQueue } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import { runAllPolicyChecks } from '../policy.js';
import { screenText } from '../screening/rules.js';

const logger = createServiceLogger('safety-screen');

const ScreenTextSchema = z.object({
  contentId: z.string().uuid(),
  contentType: z.enum(['feedback_text', 'checkin_note', 'message', 'other']),
  text: z.string().min(1),
});

export async function screenRoutes(app: FastifyInstance) {
  // POST /screen/text - Screen text content for safety violations
  app.post<{ Body: unknown }>('/screen/text', async (request, reply) => {
    const parsed = ScreenTextSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', { errors: parsed.error.errors });
    }

    const { contentId, contentType, text } = parsed.data;

    // Run enhanced screening rules
    const screeningResult = screenText(text);

    // Also run legacy policy checks for backward compatibility
    const violation = runAllPolicyChecks(text);

    const isViolated = !screeningResult.safe || violation.violated;

    if (isViolated) {
      const flagReasons = screeningResult.flags.map(f => f.type).join(', ') || violation.reason;
      const confidence = screeningResult.overallConfidence || violation.confidence || 0.5;
      const requiresHumanReview = screeningResult.requiresReview || confidence < 0.9;

      // Create safety flag in database
      const [flag] = await db
        .insert(safetyFlags)
        .values({
          contentId,
          contentType,
          flagReason: flagReasons || 'unknown',
          confidence: confidence.toString(),
          requiresHumanReview,
          reviewStatus: 'pending',
        })
        .returning();

      // Add to review queue if human review is required
      if (requiresHumanReview) {
        await db
          .insert(safetyReviewQueue)
          .values({
            flagId: flag.id,
            status: 'pending',
          });

        logger.info(`Added flag ${flag.id} to review queue`);
      }

      // Emit safety.flag.raised event
      const eventBus = getEventBus();
      await eventBus.emit({
        type: 'safety.flag.raised',
        data: {
          flagId: flag.id,
          contentId,
          contentType,
          flagReason: flagReasons,
          confidence,
          requiresHumanReview,
          raisedAt: new Date().toISOString(),
          flags: screeningResult.flags,
        },
        timestamp: new Date().toISOString(),
        source: 'safety-moderation',
      });

      return {
        safe: false,
        flagId: flag.id,
        reason: flagReasons,
        confidence,
        requiresHumanReview,
        flags: screeningResult.flags,
      };
    }

    return {
      safe: true,
      flags: [],
    };
  });

  // GET /review-queue - Get pending review items
  app.get('/review-queue', async (request, reply) => {
    const pendingReviews = await db
      .select({
        queueItem: safetyReviewQueue,
        flag: safetyFlags,
      })
      .from(safetyReviewQueue)
      .leftJoin(safetyFlags, eq(safetyReviewQueue.flagId, safetyFlags.id))
      .where(eq(safetyReviewQueue.status, 'pending'));

    return {
      items: pendingReviews,
      count: pendingReviews.length,
    };
  });

  // PUT /review/:id - Mark a review as complete
  app.put<{ Params: { id: string }; Body: unknown }>(
    '/review/:id',
    async (request, reply) => {
      const { id } = request.params;

      const [reviewItem] = await db
        .select()
        .from(safetyReviewQueue)
        .where(eq(safetyReviewQueue.id, id));

      if (!reviewItem) {
        return reply.status(404).send({
          error: 'Review item not found',
        });
      }

      if (reviewItem.status === 'reviewed') {
        return reply.status(400).send({
          error: 'Review item already marked as reviewed',
        });
      }

      const [updated] = await db
        .update(safetyReviewQueue)
        .set({
          status: 'reviewed',
          reviewedAt: new Date(),
        })
        .where(eq(safetyReviewQueue.id, id))
        .returning();

      return {
        id: updated.id,
        status: updated.status,
        reviewedAt: updated.reviewedAt,
      };
    }
  );
}
