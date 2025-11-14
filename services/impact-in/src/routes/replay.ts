/**
 * Replay Endpoint for Failed Deliveries
 * Allows manual retry of failed deliveries from Worker-3 UI
 * Ref: MULTI_AGENT_PLAN.md § Worker 2/Integrations Lead/Replay Endpoint
 */

import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { db } from '@teei/shared-schema';
import { impactDeliveries } from '@teei/shared-schema';
import { eq, and, inArray } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';
import { createBenevityConnector } from '../connectors/benevity.js';
import { createGooderaConnector } from '../connectors/goodera.js';
import { createWorkdayConnector } from '../connectors/workday.js';

const logger = createServiceLogger('impact-in:replay');

// Validation schemas
const replayDeliverySchema = z.object({
  id: z.string().uuid(),
});

const bulkReplaySchema = z.object({
  ids: z.array(z.string().uuid()).min(1).max(100),
});

/**
 * Replay a single delivery
 */
async function replayDelivery(deliveryId: string): Promise<{
  success: boolean;
  error?: string;
  newStatus?: string;
}> {
  try {
    // Fetch delivery record
    const delivery = await db
      .select()
      .from(impactDeliveries)
      .where(eq(impactDeliveries.id, deliveryId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!delivery) {
      return { success: false, error: 'Delivery not found' };
    }

    // Only retry failed deliveries
    if (delivery.status !== 'failed') {
      return { success: false, error: `Cannot replay delivery with status: ${delivery.status}` };
    }

    logger.info('Replaying delivery', {
      deliveryId,
      provider: delivery.provider,
      originalAttempts: delivery.attemptCount,
    });

    // Update status to retrying
    await db
      .update(impactDeliveries)
      .set({
        status: 'retrying',
        updatedAt: new Date(),
      })
      .where(eq(impactDeliveries.id, deliveryId));

    // Reconstruct event from payload
    const event = {
      eventId: delivery.payload.eventId || delivery.deliveryId,
      companyId: delivery.companyId,
      userId: delivery.payload.userId,
      eventType: delivery.payload.eventType,
      timestamp: delivery.payload.timestamp || new Date().toISOString(),
      value: delivery.payload.value,
      unit: delivery.payload.unit,
      outcomeScores: delivery.payload.outcomeScores,
      metadata: delivery.payload.metadata,
    };

    // Retry delivery based on provider
    let result;
    switch (delivery.provider) {
      case 'benevity': {
        const connector = createBenevityConnector();
        result = await connector.deliver(event, delivery.deliveryId);
        break;
      }
      case 'goodera': {
        const connector = createGooderaConnector(delivery.companyId);
        result = await connector.deliver(event, delivery.deliveryId);
        break;
      }
      case 'workday': {
        const connector = createWorkdayConnector(delivery.companyId);
        result = await connector.deliver(event, delivery.deliveryId);
        break;
      }
      default:
        return { success: false, error: `Unknown provider: ${delivery.provider}` };
    }

    // Update delivery record
    const newStatus = result.success ? 'success' : 'failed';
    await db
      .update(impactDeliveries)
      .set({
        status: newStatus,
        attemptCount: delivery.attemptCount + result.attemptCount,
        lastError: result.error || null,
        providerResponse: result.providerResponse || null,
        deliveredAt: result.success ? new Date() : null,
        updatedAt: new Date(),
      })
      .where(eq(impactDeliveries.id, deliveryId));

    logger.info('Replay completed', {
      deliveryId,
      success: result.success,
      newStatus,
      totalAttempts: delivery.attemptCount + result.attemptCount,
    });

    return { success: result.success, newStatus, error: result.error };
  } catch (error: any) {
    logger.error('Replay failed', { deliveryId, error: error.message });

    // Update status back to failed
    await db
      .update(impactDeliveries)
      .set({
        status: 'failed',
        lastError: error.message,
        updatedAt: new Date(),
      })
      .where(eq(impactDeliveries.id, deliveryId));

    return { success: false, error: error.message };
  }
}

/**
 * Register replay routes
 */
export async function replayRoutes(app: FastifyInstance) {
  /**
   * POST /v1/impact-in/deliveries/:id/replay
   * Retry a failed delivery
   */
  app.post('/deliveries/:id/replay', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const params = replayDeliverySchema.parse(request.params);
      const { id } = params;

      logger.info('Replay requested', { deliveryId: id });

      const result = await replayDelivery(id);

      if (!result.success) {
        return reply.status(400).send({
          error: 'Replay failed',
          message: result.error,
        });
      }

      return reply.status(200).send({
        success: true,
        message: 'Delivery replayed successfully',
        newStatus: result.newStatus,
      });
    } catch (error: any) {
      logger.error('Replay request failed', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to replay delivery',
        message: error.message,
      });
    }
  });

  /**
   * POST /v1/impact-in/deliveries/bulk-replay
   * Retry multiple failed deliveries
   */
  app.post('/deliveries/bulk-replay', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = bulkReplaySchema.parse(request.body);
      const { ids } = body;

      logger.info('Bulk replay requested', { count: ids.length });

      // Process replays in parallel (with limit to avoid overload)
      const BATCH_SIZE = 10;
      const results = [];

      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (id) => {
            const result = await replayDelivery(id);
            return { id, ...result };
          })
        );
        results.push(...batchResults);
      }

      const summary = {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      };

      logger.info('Bulk replay completed', summary);

      return reply.status(200).send({
        summary,
        results,
      });
    } catch (error: any) {
      logger.error('Bulk replay failed', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to replay deliveries',
        message: error.message,
      });
    }
  });

  /**
   * POST /v1/impact-in/deliveries/retry-all-failed
   * Retry all failed deliveries for a company
   */
  app.post('/deliveries/retry-all-failed', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      const body = z
        .object({
          companyId: z.string().uuid(),
          provider: z.enum(['benevity', 'goodera', 'workday']).optional(),
        })
        .parse(request.body);

      const { companyId, provider } = body;

      logger.info('Retrying all failed deliveries', { companyId, provider });

      // Fetch all failed deliveries
      const conditions = [
        eq(impactDeliveries.companyId, companyId),
        eq(impactDeliveries.status, 'failed'),
      ];

      if (provider) {
        conditions.push(eq(impactDeliveries.provider, provider));
      }

      const failedDeliveries = await db
        .select()
        .from(impactDeliveries)
        .where(and(...conditions))
        .limit(100); // Limit to prevent overload

      if (failedDeliveries.length === 0) {
        return reply.status(200).send({
          message: 'No failed deliveries found',
          summary: { total: 0, successful: 0, failed: 0 },
          results: [],
        });
      }

      const ids = failedDeliveries.map((d) => d.id);

      // Process replays
      const BATCH_SIZE = 10;
      const results = [];

      for (let i = 0; i < ids.length; i += BATCH_SIZE) {
        const batch = ids.slice(i, i + BATCH_SIZE);
        const batchResults = await Promise.all(
          batch.map(async (id) => {
            const result = await replayDelivery(id);
            return { id, ...result };
          })
        );
        results.push(...batchResults);
      }

      const summary = {
        total: results.length,
        successful: results.filter((r) => r.success).length,
        failed: results.filter((r) => !r.success).length,
      };

      logger.info('Retry all completed', summary);

      return reply.status(200).send({
        summary,
        results,
      });
    } catch (error: any) {
      logger.error('Retry all failed', { error: error.message });

      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          error: 'Validation error',
          details: error.errors,
        });
      }

      return reply.status(500).send({
        error: 'Failed to retry deliveries',
        message: error.message,
      });
    }
  });
}
