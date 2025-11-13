import type { FastifyInstance } from 'fastify';
import { createServiceLogger, getEventBus } from '@teei/shared-utils';
import { db, kintellSessions, users } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import type {
  KintellSessionCompleted,
  KintellRatingCreated,
  KintellSessionScheduled,
} from '@teei/event-contracts';
import { validateWebhookSignature } from '../middleware/signature.js';
import {
  checkIdempotency,
  markProcessed,
  markFailed,
} from '../utils/idempotency.js';
import {
  publishToDLQ,
  shouldSendToDLQ,
  getDLQMessages,
  getDLQStats,
  replayFromDLQ,
  deleteFromDLQ,
} from '../utils/dlq.js';

const logger = createServiceLogger('kintell-connector:webhooks');

/**
 * Webhook payload schemas (from Kintell)
 */
interface SessionCompletedPayload {
  session_id: string;
  session_type: 'language' | 'mentorship';
  participant_email: string;
  volunteer_email: string;
  scheduled_at: string;
  completed_at: string;
  duration_minutes: number;
  topics?: string[];
  language_level?: string;
}

interface RatingCreatedPayload {
  rating_id: string;
  session_id: string;
  from_role: 'participant' | 'volunteer';
  rating: number;
  feedback_text?: string;
  created_at: string;
}

interface BookingConfirmedPayload {
  booking_id: string;
  session_type: 'language' | 'mentorship';
  participant_email: string;
  volunteer_email: string;
  scheduled_at: string;
}

/**
 * Process session completed webhook
 */
async function processSessionCompleted(
  payload: SessionCompletedPayload,
  deliveryId: string
): Promise<void> {
  // Find participant and volunteer by email
  const [participant] = await db
    .select()
    .from(users)
    .where(eq(users.email, payload.participant_email))
    .limit(1);

  const [volunteer] = await db
    .select()
    .from(users)
    .where(eq(users.email, payload.volunteer_email))
    .limit(1);

  if (!participant) {
    throw new Error(`Participant not found: ${payload.participant_email}`);
  }

  if (!volunteer) {
    throw new Error(`Volunteer not found: ${payload.volunteer_email}`);
  }

  // Insert session
  const [session] = await db
    .insert(kintellSessions)
    .values({
      externalSessionId: payload.session_id,
      sessionType: payload.session_type,
      participantId: participant.id,
      volunteerId: volunteer.id,
      scheduledAt: new Date(payload.scheduled_at),
      completedAt: new Date(payload.completed_at),
      durationMinutes: payload.duration_minutes,
      languageLevel: payload.language_level,
      topics: payload.topics,
    })
    .returning();

  // Emit event
  const eventBus = getEventBus();
  const event = eventBus.createEvent<KintellSessionCompleted>(
    'kintell.session.completed',
    {
      sessionId: session.id,
      externalSessionId: session.externalSessionId || undefined,
      sessionType: session.sessionType as 'language' | 'mentorship',
      participantId: session.participantId,
      volunteerId: session.volunteerId,
      scheduledAt: session.scheduledAt!.toISOString(),
      completedAt: session.completedAt!.toISOString(),
      durationMinutes: session.durationMinutes!,
      topics: session.topics as string[] | undefined,
      languageLevel: session.languageLevel || undefined,
    }
  );

  await eventBus.publish(event);

  logger.info(
    { deliveryId, sessionId: session.id, externalSessionId: payload.session_id },
    'Session completed webhook processed successfully'
  );
}

/**
 * Process rating created webhook
 */
async function processRatingCreated(
  payload: RatingCreatedPayload,
  deliveryId: string
): Promise<void> {
  // Find session by external ID
  const [session] = await db
    .select()
    .from(kintellSessions)
    .where(eq(kintellSessions.externalSessionId, payload.session_id))
    .limit(1);

  if (!session) {
    throw new Error(`Session not found: ${payload.session_id}`);
  }

  // Update session with rating (simplified - could be more sophisticated)
  await db
    .update(kintellSessions)
    .set({
      rating: payload.rating.toString(),
      feedbackText: payload.feedback_text,
    })
    .where(eq(kintellSessions.id, session.id));

  // Emit event
  const eventBus = getEventBus();
  const event = eventBus.createEvent<KintellRatingCreated>(
    'kintell.rating.created',
    {
      ratingId: payload.rating_id,
      sessionId: session.id,
      fromRole: payload.from_role,
      rating: payload.rating,
      feedbackText: payload.feedback_text,
      createdAt: payload.created_at,
    }
  );

  await eventBus.publish(event);

  logger.info(
    { deliveryId, sessionId: session.id, rating: payload.rating },
    'Rating created webhook processed successfully'
  );
}

/**
 * Process booking confirmed webhook
 */
async function processBookingConfirmed(
  payload: BookingConfirmedPayload,
  deliveryId: string
): Promise<void> {
  // Find participant and volunteer by email
  const [participant] = await db
    .select()
    .from(users)
    .where(eq(users.email, payload.participant_email))
    .limit(1);

  const [volunteer] = await db
    .select()
    .from(users)
    .where(eq(users.email, payload.volunteer_email))
    .limit(1);

  if (!participant) {
    throw new Error(`Participant not found: ${payload.participant_email}`);
  }

  if (!volunteer) {
    throw new Error(`Volunteer not found: ${payload.volunteer_email}`);
  }

  // Insert session (not yet completed)
  const [session] = await db
    .insert(kintellSessions)
    .values({
      externalSessionId: payload.booking_id,
      sessionType: payload.session_type,
      participantId: participant.id,
      volunteerId: volunteer.id,
      scheduledAt: new Date(payload.scheduled_at),
    })
    .returning();

  // Emit event
  const eventBus = getEventBus();
  const event = eventBus.createEvent<KintellSessionScheduled>(
    'kintell.session.scheduled',
    {
      sessionId: session.id,
      externalSessionId: session.externalSessionId || undefined,
      sessionType: session.sessionType as 'language' | 'mentorship',
      participantId: session.participantId,
      volunteerId: session.volunteerId,
      scheduledAt: session.scheduledAt!.toISOString(),
    }
  );

  await eventBus.publish(event);

  logger.info(
    { deliveryId, sessionId: session.id, externalSessionId: payload.booking_id },
    'Booking confirmed webhook processed successfully'
  );
}

/**
 * Generic webhook handler with signature validation, idempotency, and DLQ
 */
async function handleWebhook<T>(
  request: any,
  reply: any,
  eventType: string,
  processor: (payload: T, deliveryId: string) => Promise<void>
): Promise<any> {
  const deliveryId = request.headers['x-delivery-id'] as string;
  const payload = request.body as T;

  try {
    // Check idempotency
    const idempotency = await checkIdempotency(deliveryId, eventType, payload as any);

    if (idempotency.alreadyProcessed) {
      logger.info({ deliveryId, eventType }, 'Webhook already processed (idempotent response)');
      return reply.status(202).send({
        status: 'accepted',
        message: 'Webhook already processed',
        deliveryId,
      });
    }

    if (!idempotency.shouldProcess) {
      // Max retries reached, send to DLQ
      if (idempotency.delivery && shouldSendToDLQ(idempotency.delivery.retryCount)) {
        await publishToDLQ(
          deliveryId,
          eventType,
          payload as any,
          idempotency.delivery.retryCount,
          idempotency.delivery.lastError || 'Max retries exceeded'
        );

        logger.warn({ deliveryId, eventType }, 'Webhook sent to DLQ after max retries');

        return reply.status(202).send({
          status: 'accepted',
          message: 'Webhook sent to DLQ for manual review',
          deliveryId,
        });
      }
    }

    // Process webhook
    await processor(payload, deliveryId);

    // Mark as processed
    await markProcessed(deliveryId);

    return reply.status(200).send({
      status: 'success',
      message: 'Webhook processed successfully',
      deliveryId,
    });
  } catch (error: any) {
    logger.error({ error, deliveryId, eventType }, 'Error processing webhook');

    // Mark as failed
    await markFailed(deliveryId, error.message);

    // Check if should go to DLQ
    const idempotency = await checkIdempotency(deliveryId, eventType, payload as any);
    if (idempotency.delivery && shouldSendToDLQ(idempotency.delivery.retryCount)) {
      await publishToDLQ(
        deliveryId,
        eventType,
        payload as any,
        idempotency.delivery.retryCount,
        error.message
      );
    }

    return reply.status(500).send({
      status: 'error',
      message: 'Webhook processing failed',
      error: error.message,
      deliveryId,
    });
  }
}

export async function webhookRoutes(app: FastifyInstance) {
  /**
   * POST /webhooks/session-completed
   * Language & mentorship session completion webhook
   */
  app.post(
    '/session-completed',
    {
      preHandler: validateWebhookSignature,
    },
    async (request, reply) => {
      return handleWebhook<SessionCompletedPayload>(
        request,
        reply,
        'session-completed',
        processSessionCompleted
      );
    }
  );

  /**
   * POST /webhooks/rating-created
   * Feedback rating webhook
   */
  app.post(
    '/rating-created',
    {
      preHandler: validateWebhookSignature,
    },
    async (request, reply) => {
      return handleWebhook<RatingCreatedPayload>(
        request,
        reply,
        'rating-created',
        processRatingCreated
      );
    }
  );

  /**
   * POST /webhooks/booking-confirmed
   * Future booking confirmation webhook
   */
  app.post(
    '/booking-confirmed',
    {
      preHandler: validateWebhookSignature,
    },
    async (request, reply) => {
      return handleWebhook<BookingConfirmedPayload>(
        request,
        reply,
        'booking-confirmed',
        processBookingConfirmed
      );
    }
  );

  /**
   * GET /webhooks/dlq
   * Get all messages in the Dead Letter Queue (for ops monitoring)
   */
  app.get('/dlq', async (request, reply) => {
    try {
      const limit = parseInt((request.query as any).limit || '100');
      const messages = await getDLQMessages(limit);
      const stats = await getDLQStats();

      return {
        stats,
        messages,
      };
    } catch (error: any) {
      logger.error({ error }, 'Error fetching DLQ messages');
      return reply.status(500).send({
        error: 'Failed to fetch DLQ messages',
        message: error.message,
      });
    }
  });

  /**
   * POST /webhooks/dlq/:deliveryId/replay
   * Replay a webhook from the DLQ (manual recovery)
   */
  app.post('/dlq/:deliveryId/replay', async (request, reply) => {
    try {
      const { deliveryId } = request.params as { deliveryId: string };

      logger.info({ deliveryId }, 'Replaying webhook from DLQ');

      const payload = await replayFromDLQ(deliveryId);

      return {
        status: 'success',
        message: 'Webhook reset to pending for replay',
        deliveryId,
        payload,
      };
    } catch (error: any) {
      logger.error({ error }, 'Error replaying webhook from DLQ');
      return reply.status(500).send({
        error: 'Failed to replay webhook',
        message: error.message,
      });
    }
  });

  /**
   * DELETE /webhooks/dlq/:deliveryId
   * Permanently delete a webhook from the DLQ
   */
  app.delete('/dlq/:deliveryId', async (request, reply) => {
    try {
      const { deliveryId } = request.params as { deliveryId: string };

      logger.warn({ deliveryId }, 'Permanently deleting webhook from DLQ');

      await deleteFromDLQ(deliveryId);

      return {
        status: 'success',
        message: 'Webhook permanently deleted from DLQ',
        deliveryId,
      };
    } catch (error: any) {
      logger.error({ error }, 'Error deleting webhook from DLQ');
      return reply.status(500).send({
        error: 'Failed to delete webhook',
        message: error.message,
      });
    }
  });
}
