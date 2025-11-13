import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ValidationError } from '@teei/shared-utils';
import { getEventBus } from '@teei/shared-utils';
import { runAllPolicyChecks } from '../policy.js';
import { randomUUID } from 'crypto';

const ScreenTextSchema = z.object({
  contentId: z.string().uuid(),
  contentType: z.enum(['feedback_text', 'checkin_note', 'message', 'other']),
  text: z.string().min(1),
});

// In-memory store for review queue (in production, use a database)
interface ReviewItem {
  id: string;
  contentId: string;
  contentType: string;
  text: string;
  flagReason: string;
  confidence: number;
  status: 'pending' | 'reviewed';
  raisedAt: string;
  reviewedAt?: string;
}

const reviewQueue: Map<string, ReviewItem> = new Map();

export async function screenRoutes(app: FastifyInstance) {
  // POST /screen/text - Screen text content for safety violations
  app.post<{ Body: unknown }>('/screen/text', async (request, reply) => {
    const parsed = ScreenTextSchema.safeParse(request.body);

    if (!parsed.success) {
      throw new ValidationError('Invalid request body', { errors: parsed.error.errors });
    }

    const { contentId, contentType, text } = parsed.data;

    // Run policy checks
    const violation = runAllPolicyChecks(text);

    if (violation.violated && violation.reason) {
      const flagId = randomUUID();
      const requiresHumanReview = (violation.confidence || 0.5) < 0.9;

      // Add to review queue if human review is required
      if (requiresHumanReview) {
        reviewQueue.set(flagId, {
          id: flagId,
          contentId,
          contentType,
          text,
          flagReason: violation.reason,
          confidence: violation.confidence || 0.5,
          status: 'pending',
          raisedAt: new Date().toISOString(),
        });
      }

      // Emit safety.flag.raised event
      const eventBus = getEventBus();
      await eventBus.emit({
        type: 'safety.flag.raised',
        data: {
          flagId,
          contentId,
          contentType,
          flagReason: violation.reason,
          confidence: violation.confidence || 0.5,
          requiresHumanReview,
          raisedAt: new Date().toISOString(),
        },
        timestamp: new Date().toISOString(),
        source: 'safety-moderation',
      });

      return {
        safe: false,
        flagId,
        reason: violation.reason,
        confidence: violation.confidence || 0.5,
        requiresHumanReview,
      };
    }

    return {
      safe: true,
    };
  });

  // GET /review-queue - Get pending review items
  app.get('/review-queue', async (request, reply) => {
    const pendingReviews = Array.from(reviewQueue.values()).filter(
      (item) => item.status === 'pending'
    );

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

      const reviewItem = reviewQueue.get(id);
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

      reviewItem.status = 'reviewed';
      reviewItem.reviewedAt = new Date().toISOString();

      return {
        id: reviewItem.id,
        status: reviewItem.status,
        reviewedAt: reviewItem.reviewedAt,
      };
    }
  );
}
