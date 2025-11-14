import type { FastifyInstance } from 'fastify';
import { createServiceLogger } from '@teei/shared-utils';
import { validateWebhookSignature } from '../middleware/signature.js';
import {
  checkIdempotency,
  markProcessed,
  markFailed,
} from '../utils/idempotency.js';
import {
  BuddyMatchCreatedSchema,
  BuddyMatchEndedSchema,
  BuddyEventLoggedSchema,
  BuddyEventAttendedSchema,
  BuddySkillShareCompletedSchema,
  BuddyCheckinCompletedSchema,
  BuddyFeedbackSubmittedSchema,
  BuddyMilestoneReachedSchema,
  type BuddyMatchCreated,
  type BuddyMatchEnded,
  type BuddyEventLogged,
  type BuddyEventAttended,
  type BuddySkillShareCompleted,
  type BuddyCheckinCompleted,
  type BuddyFeedbackSubmitted,
  type BuddyMilestoneReached,
} from '@teei/event-contracts';
import {
  processMatchCreated,
  processMatchEnded,
  processEventLogged,
  processEventAttended,
  processSkillShareCompleted,
  processCheckinCompleted,
  processFeedbackSubmitted,
  processMilestoneReached,
} from '../processors/index.js';

const logger = createServiceLogger('buddy-connector:webhooks');

/**
 * Generic webhook handler with validation, idempotency, and error handling
 */
async function handleWebhook<T>(
  request: any,
  reply: any,
  eventType: string,
  schema: any,
  processor: (event: T, deliveryId: string) => Promise<void>
): Promise<any> {
  const deliveryId = request.headers['x-delivery-id'] as string;
  const rawPayload = request.body;

  try {
    // Validate event schema
    const validationResult = schema.safeParse(rawPayload);
    if (!validationResult.success) {
      logger.warn(
        { deliveryId, eventType, errors: validationResult.error.errors },
        'Event validation failed'
      );
      return reply.status(400).send({
        status: 'error',
        message: 'Invalid event payload',
        errors: validationResult.error.errors,
        deliveryId,
      });
    }

    const event = validationResult.data as T;

    // Check idempotency
    const idempotency = await checkIdempotency(deliveryId, eventType, rawPayload);

    if (idempotency.alreadyProcessed) {
      logger.info({ deliveryId, eventType }, 'Webhook already processed (idempotent response)');
      return reply.status(202).send({
        status: 'accepted',
        message: 'Webhook already processed',
        deliveryId,
      });
    }

    if (!idempotency.shouldProcess) {
      logger.warn({ deliveryId, eventType }, 'Webhook exceeded max retries');
      return reply.status(202).send({
        status: 'accepted',
        message: 'Webhook exceeded max retries, manual review required',
        deliveryId,
      });
    }

    // Process webhook
    await processor(event, deliveryId);

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
   * POST /webhooks/buddy-events
   * Unified webhook endpoint for all Buddy System events
   * Routes events to appropriate processors based on event.type
   */
  app.post(
    '/buddy-events',
    {
      preHandler: validateWebhookSignature,
    },
    async (request, reply) => {
      const deliveryId = request.headers['x-delivery-id'] as string;
      const payload = request.body as any;

      // Determine event type and route to appropriate handler
      const eventType = payload.type;

      logger.info({ deliveryId, eventType }, 'Received Buddy System event');

      switch (eventType) {
        case 'buddy.match.created':
          return handleWebhook<BuddyMatchCreated>(
            request,
            reply,
            eventType,
            BuddyMatchCreatedSchema,
            processMatchCreated
          );

        case 'buddy.match.ended':
          return handleWebhook<BuddyMatchEnded>(
            request,
            reply,
            eventType,
            BuddyMatchEndedSchema,
            processMatchEnded
          );

        case 'buddy.event.logged':
          return handleWebhook<BuddyEventLogged>(
            request,
            reply,
            eventType,
            BuddyEventLoggedSchema,
            processEventLogged
          );

        case 'buddy.event.attended':
          return handleWebhook<BuddyEventAttended>(
            request,
            reply,
            eventType,
            BuddyEventAttendedSchema,
            processEventAttended
          );

        case 'buddy.skill_share.completed':
          return handleWebhook<BuddySkillShareCompleted>(
            request,
            reply,
            eventType,
            BuddySkillShareCompletedSchema,
            processSkillShareCompleted
          );

        case 'buddy.checkin.completed':
          return handleWebhook<BuddyCheckinCompleted>(
            request,
            reply,
            eventType,
            BuddyCheckinCompletedSchema,
            processCheckinCompleted
          );

        case 'buddy.feedback.submitted':
          return handleWebhook<BuddyFeedbackSubmitted>(
            request,
            reply,
            eventType,
            BuddyFeedbackSubmittedSchema,
            processFeedbackSubmitted
          );

        case 'buddy.milestone.reached':
          return handleWebhook<BuddyMilestoneReached>(
            request,
            reply,
            eventType,
            BuddyMilestoneReachedSchema,
            processMilestoneReached
          );

        default:
          logger.warn({ deliveryId, eventType }, 'Unknown event type');
          return reply.status(400).send({
            status: 'error',
            message: `Unknown event type: ${eventType}`,
            deliveryId,
          });
      }
    }
  );

  /**
   * GET /webhooks/stats
   * Get statistics about webhook processing
   */
  app.get('/stats', async () => {
    // This could be expanded to query the database for actual stats
    return {
      service: 'buddy-connector',
      supportedEventTypes: [
        'buddy.match.created',
        'buddy.match.ended',
        'buddy.event.logged',
        'buddy.event.attended',
        'buddy.skill_share.completed',
        'buddy.checkin.completed',
        'buddy.feedback.submitted',
        'buddy.milestone.reached',
      ],
      timestamp: new Date().toISOString(),
    };
  });
}
