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
import {
  categorizeError,
  createErrorResponse,
  logError,
  ErrorCategory,
} from '../utils/error-handling.js';
import { sendToDeadLetterQueue, getDeadLetterQueueStats } from '../utils/dead-letter-queue.js';
import { bulkheads, rateLimiters, withTimeout, getResilienceStats } from '../utils/resilience.js';
import { circuitBreakers } from '../utils/retry.js';

const logger = createServiceLogger('buddy-connector:webhooks');

/**
 * Generic webhook handler with comprehensive error handling and resilience patterns
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

  // Rate limiting check
  if (!rateLimiters.webhookDelivery.tryAcquire()) {
    logger.warn({ deliveryId, eventType }, 'Rate limit exceeded for webhook delivery');
    return reply.status(429).send({
      status: 'error',
      message: 'Rate limit exceeded. Please try again later.',
      deliveryId,
      retryAfter: 60, // seconds
    });
  }

  try {
    // Validate event schema
    const validationResult = schema.safeParse(rawPayload);
    if (!validationResult.success) {
      const validationError = new Error('Invalid event payload');
      (validationError as any).errors = validationResult.error.errors;
      (validationError as any).name = 'ValidationError';

      const categorized = categorizeError(validationError, {
        deliveryId,
        eventType,
        errors: validationResult.error.errors,
      });

      logError(categorized, deliveryId, eventType);

      return reply.status(400).send({
        ...createErrorResponse(categorized, deliveryId),
        errors: validationResult.error.errors,
      });
    }

    const event = validationResult.data as T;

    // Check idempotency
    const idempotency = await bulkheads.database.execute(() =>
      checkIdempotency(deliveryId, eventType, rawPayload)
    );

    if (idempotency.alreadyProcessed) {
      logger.info({ deliveryId, eventType }, 'Webhook already processed (idempotent response)');
      return reply.status(202).send({
        status: 'accepted',
        message: 'Webhook already processed',
        deliveryId,
      });
    }

    if (!idempotency.shouldProcess) {
      logger.warn({ deliveryId, eventType }, 'Webhook exceeded max retries, sending to DLQ');

      // Send to dead letter queue
      const dlqError = new Error('Exceeded max retry attempts');
      const categorized = categorizeError(dlqError, {
        deliveryId,
        eventType,
        retryCount: idempotency.delivery?.retryCount || 0,
      });

      await sendToDeadLetterQueue(
        deliveryId,
        eventType,
        rawPayload,
        categorized,
        idempotency.delivery?.retryCount || 0
      );

      return reply.status(202).send({
        status: 'accepted',
        message: 'Webhook exceeded max retries, sent to dead letter queue for manual review',
        deliveryId,
      });
    }

    // Process webhook with bulkhead isolation, timeout, and circuit breaker
    await bulkheads.webhookProcessing.execute(async () => {
      await circuitBreakers.buddySystem.execute(async () => {
        await withTimeout(
          () => processor(event, deliveryId),
          30000, // 30 second timeout
          `Processing ${eventType}`
        );
      });
    });

    // Mark as processed
    await bulkheads.database.execute(() => markProcessed(deliveryId));

    return reply.status(200).send({
      status: 'success',
      message: 'Webhook processed successfully',
      deliveryId,
    });
  } catch (error: any) {
    // Categorize error
    const categorized = categorizeError(error, {
      deliveryId,
      eventType,
    });

    // Log error with appropriate severity
    logError(categorized, deliveryId, eventType);

    // Mark as failed and increment retry count
    try {
      await bulkheads.database.execute(() =>
        markFailed(deliveryId, categorized.error.message)
      );
    } catch (markFailedError) {
      logger.error(
        { error: markFailedError, deliveryId },
        'Failed to mark webhook as failed'
      );
    }

    // Check if we should send to DLQ
    const idempotency = await bulkheads.database.execute(() =>
      checkIdempotency(deliveryId, eventType, rawPayload)
    );

    if (idempotency.delivery && idempotency.delivery.retryCount >= 3) {
      logger.warn(
        { deliveryId, eventType, retryCount: idempotency.delivery.retryCount },
        'Max retries reached, sending to dead letter queue'
      );

      await sendToDeadLetterQueue(
        deliveryId,
        eventType,
        rawPayload,
        categorized,
        idempotency.delivery.retryCount
      );
    }

    // Return error response
    const errorResponse = createErrorResponse(categorized, deliveryId);

    return reply.status(categorized.statusCode || 500).send({
      ...errorResponse,
      error: categorized.error.message,
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
   * Get comprehensive statistics about webhook processing
   */
  app.get('/stats', async () => {
    const dlqStats = await getDeadLetterQueueStats();
    const resilienceStats = getResilienceStats();

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
      deadLetterQueue: dlqStats,
      resilience: resilienceStats,
      circuitBreakers: {
        buddySystem: circuitBreakers.buddySystem.getState(),
        database: circuitBreakers.database.getState(),
      },
      timestamp: new Date().toISOString(),
    };
  });

  /**
   * GET /webhooks/health
   * Health check endpoint with circuit breaker status
   */
  app.get('/health', async (request, reply) => {
    const buddySystemCircuit = circuitBreakers.buddySystem.getState();
    const databaseCircuit = circuitBreakers.database.getState();

    const isHealthy =
      buddySystemCircuit.state !== 'open' &&
      databaseCircuit.state !== 'open';

    const status = isHealthy ? 'healthy' : 'degraded';
    const statusCode = isHealthy ? 200 : 503;

    return reply.status(statusCode).send({
      status,
      service: 'buddy-connector',
      timestamp: new Date().toISOString(),
      circuitBreakers: {
        buddySystem: buddySystemCircuit,
        database: databaseCircuit,
      },
      resilience: getResilienceStats(),
    });
  });

  /**
   * GET /webhooks/dlq
   * Get dead letter queue entries (admin only)
   */
  app.get('/dlq', async (request, reply) => {
    try {
      const { limit = 100, offset = 0 } = request.query as any;

      const entries = await getDeadLetterQueueStats();

      return {
        status: 'success',
        data: entries,
        pagination: {
          limit: Number(limit),
          offset: Number(offset),
        },
      };
    } catch (error: any) {
      logger.error({ error }, 'Error fetching DLQ entries');

      return reply.status(500).send({
        status: 'error',
        message: 'Failed to fetch dead letter queue entries',
        error: error.message,
      });
    }
  });

  /**
   * POST /webhooks/circuit-breaker/reset
   * Reset circuit breaker (admin only)
   */
  app.post('/circuit-breaker/reset', async (request, reply) => {
    try {
      const { name } = request.body as any;

      if (name === 'buddySystem') {
        circuitBreakers.buddySystem.reset();
      } else if (name === 'database') {
        circuitBreakers.database.reset();
      } else if (name === 'all') {
        circuitBreakers.buddySystem.reset();
        circuitBreakers.database.reset();
      } else {
        return reply.status(400).send({
          status: 'error',
          message: 'Invalid circuit breaker name. Use: buddySystem, database, or all',
        });
      }

      logger.info({ circuitBreaker: name }, 'Circuit breaker reset');

      return {
        status: 'success',
        message: `Circuit breaker ${name} reset successfully`,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error({ error }, 'Error resetting circuit breaker');

      return reply.status(500).send({
        status: 'error',
        message: 'Failed to reset circuit breaker',
        error: error.message,
      });
    }
  });

  /**
   * POST /webhooks/rate-limiter/reset
   * Reset rate limiter (admin only)
   */
  app.post('/rate-limiter/reset', async (request, reply) => {
    try {
      const { name } = request.body as any;

      if (name === 'webhookDelivery') {
        rateLimiters.webhookDelivery.reset();
      } else if (name === 'all') {
        rateLimiters.webhookDelivery.reset();
        rateLimiters.externalApi.reset();
        rateLimiters.databaseWrites.reset();
      } else {
        return reply.status(400).send({
          status: 'error',
          message: 'Invalid rate limiter name. Use: webhookDelivery or all',
        });
      }

      logger.info({ rateLimiter: name }, 'Rate limiter reset');

      return {
        status: 'success',
        message: `Rate limiter ${name} reset successfully`,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      logger.error({ error }, 'Error resetting rate limiter');

      return reply.status(500).send({
        status: 'error',
        message: 'Failed to reset rate limiter',
        error: error.message,
      });
    }
  });
}
