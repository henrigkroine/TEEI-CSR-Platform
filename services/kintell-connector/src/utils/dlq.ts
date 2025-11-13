import { getEventBus, createServiceLogger } from '@teei/shared-utils';
import { db, webhookDeliveries } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';

const logger = createServiceLogger('kintell-connector:dlq');

/**
 * Dead Letter Queue (DLQ) metadata structure
 */
export interface DLQMessage {
  deliveryId: string;
  eventType: string;
  payload: Record<string, any>;
  retryCount: number;
  lastError: string;
  originalTimestamp: string;
  dlqTimestamp: string;
}

/**
 * DLQ statistics for monitoring
 */
export interface DLQStats {
  totalMessages: number;
  oldestMessage: Date | null;
  newestMessage: Date | null;
  byEventType: Record<string, number>;
}

const DLQ_SUBJECT = 'webhooks.dlq';
const MAX_RETRIES = 3;

/**
 * Publish a failed webhook to the Dead Letter Queue
 *
 * Called when a webhook has failed processing after max retries (3 attempts)
 * Stores the message in NATS JetStream for manual review and replay
 *
 * @param deliveryId - Unique delivery ID
 * @param eventType - Type of webhook event
 * @param payload - Original webhook payload
 * @param retryCount - Number of times processing was attempted
 * @param errorMessage - Last error message
 */
export async function publishToDLQ(
  deliveryId: string,
  eventType: string,
  payload: Record<string, any>,
  retryCount: number,
  errorMessage: string
): Promise<void> {
  try {
    const eventBus = getEventBus();

    const dlqMessage: DLQMessage = {
      deliveryId,
      eventType,
      payload,
      retryCount,
      lastError: errorMessage,
      originalTimestamp: new Date().toISOString(),
      dlqTimestamp: new Date().toISOString(),
    };

    // Publish to DLQ subject in NATS JetStream
    // JetStream will persist this message for manual review/replay
    await eventBus.publish({
      type: 'webhook.dlq',
      data: dlqMessage,
      aggregateId: deliveryId,
      timestamp: new Date().toISOString(),
      version: 1,
    });

    logger.warn(
      {
        deliveryId,
        eventType,
        retryCount,
        error: errorMessage,
      },
      'Webhook published to DLQ after max retries'
    );
  } catch (error: any) {
    logger.error(
      {
        error,
        deliveryId,
        eventType,
      },
      'Failed to publish to DLQ - critical error'
    );
    throw error;
  }
}

/**
 * Check if a webhook should be sent to DLQ based on retry count
 */
export function shouldSendToDLQ(retryCount: number): boolean {
  return retryCount >= MAX_RETRIES;
}

/**
 * Get all failed webhooks that are in DLQ (for monitoring/operations dashboard)
 *
 * Returns failed webhooks with retry count >= MAX_RETRIES
 */
export async function getDLQMessages(limit: number = 100): Promise<DLQMessage[]> {
  try {
    const failed = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.status, 'failed'))
      .orderBy(webhookDeliveries.createdAt)
      .limit(limit);

    return failed
      .filter(d => d.retryCount >= MAX_RETRIES)
      .map(d => ({
        deliveryId: d.deliveryId,
        eventType: d.eventType,
        payload: JSON.parse(d.payload),
        retryCount: d.retryCount,
        lastError: d.lastError || 'Unknown error',
        originalTimestamp: d.createdAt.toISOString(),
        dlqTimestamp: d.updatedAt.toISOString(),
      }));
  } catch (error: any) {
    logger.error({ error }, 'Error fetching DLQ messages');
    throw error;
  }
}

/**
 * Get DLQ statistics for monitoring dashboard
 */
export async function getDLQStats(): Promise<DLQStats> {
  try {
    const failed = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.status, 'failed'));

    const dlqMessages = failed.filter(d => d.retryCount >= MAX_RETRIES);

    if (dlqMessages.length === 0) {
      return {
        totalMessages: 0,
        oldestMessage: null,
        newestMessage: null,
        byEventType: {},
      };
    }

    // Calculate statistics
    const byEventType: Record<string, number> = {};
    let oldest = dlqMessages[0].createdAt;
    let newest = dlqMessages[0].createdAt;

    for (const msg of dlqMessages) {
      byEventType[msg.eventType] = (byEventType[msg.eventType] || 0) + 1;

      if (msg.createdAt < oldest) {
        oldest = msg.createdAt;
      }
      if (msg.createdAt > newest) {
        newest = msg.createdAt;
      }
    }

    return {
      totalMessages: dlqMessages.length,
      oldestMessage: oldest,
      newestMessage: newest,
      byEventType,
    };
  } catch (error: any) {
    logger.error({ error }, 'Error calculating DLQ stats');
    throw error;
  }
}

/**
 * Replay a webhook from DLQ (manual recovery)
 *
 * Resets the delivery record to pending and returns the payload for reprocessing
 * Typically called by operations team via admin API
 *
 * @param deliveryId - Unique delivery ID to replay
 * @returns The webhook payload to reprocess
 */
export async function replayFromDLQ(deliveryId: string): Promise<Record<string, any>> {
  try {
    // Get the failed delivery
    const [delivery] = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.deliveryId, deliveryId))
      .limit(1);

    if (!delivery) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }

    if (delivery.status !== 'failed') {
      throw new Error(`Delivery ${deliveryId} is not in failed state (status: ${delivery.status})`);
    }

    // Reset to pending for replay
    await db
      .update(webhookDeliveries)
      .set({
        status: 'pending',
        retryCount: 0,
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(webhookDeliveries.deliveryId, deliveryId));

    logger.info({ deliveryId }, 'Webhook replayed from DLQ, reset to pending');

    return JSON.parse(delivery.payload);
  } catch (error: any) {
    logger.error({ error, deliveryId }, 'Error replaying webhook from DLQ');
    throw error;
  }
}

/**
 * Delete a webhook from DLQ (permanent removal)
 *
 * Use with caution - this permanently deletes the delivery record
 * Typically used after manual verification that issue is resolved
 *
 * @param deliveryId - Unique delivery ID to delete
 */
export async function deleteFromDLQ(deliveryId: string): Promise<void> {
  try {
    const [delivery] = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.deliveryId, deliveryId))
      .limit(1);

    if (!delivery) {
      throw new Error(`Delivery ${deliveryId} not found`);
    }

    if (delivery.status !== 'failed') {
      throw new Error(`Cannot delete non-failed delivery (status: ${delivery.status})`);
    }

    await db
      .delete(webhookDeliveries)
      .where(eq(webhookDeliveries.deliveryId, deliveryId));

    logger.info({ deliveryId }, 'Webhook permanently deleted from DLQ');
  } catch (error: any) {
    logger.error({ error, deliveryId }, 'Error deleting webhook from DLQ');
    throw error;
  }
}
