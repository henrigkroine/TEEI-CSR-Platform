import { createServiceLogger } from '@teei/shared-utils';
import { db, webhookDeliveries } from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';
import type { CategorizedError } from './error-handling.js';

const logger = createServiceLogger('buddy-connector:dlq');

/**
 * Dead letter queue entry
 */
export interface DLQEntry {
  deliveryId: string;
  eventType: string;
  payload: Record<string, any>;
  error: CategorizedError;
  retryCount: number;
  enqueuedAt: Date;
  lastAttemptAt: Date;
}

/**
 * Send a failed webhook to the dead letter queue
 *
 * The DLQ is implemented using the webhook_deliveries table with status='failed'
 * and retryCount >= maxRetries. These entries require manual intervention.
 */
export async function sendToDeadLetterQueue(
  deliveryId: string,
  eventType: string,
  payload: Record<string, any>,
  error: CategorizedError,
  retryCount: number
): Promise<void> {
  try {
    logger.error(
      {
        deliveryId,
        eventType,
        errorCategory: error.category,
        errorSeverity: error.severity,
        retryCount,
      },
      `Sending webhook to dead letter queue: ${error.userMessage}`
    );

    // Update webhook delivery record to mark as permanently failed
    await db
      .update(webhookDeliveries)
      .set({
        status: 'failed',
        lastError: JSON.stringify({
          message: error.error.message,
          category: error.category,
          severity: error.severity,
          userMessage: error.userMessage,
          context: error.context,
          stack: error.error.stack,
        }),
        updatedAt: new Date(),
      })
      .where(eq(webhookDeliveries.deliveryId, deliveryId));

    // TODO: Send alert to monitoring system (e.g., Sentry, PagerDuty)
    // await alertService.sendAlert({
    //   severity: error.severity,
    //   title: `Webhook sent to DLQ: ${eventType}`,
    //   description: error.userMessage,
    //   context: { deliveryId, eventType, retryCount },
    // });

    logger.info(
      { deliveryId, eventType, retryCount },
      'Webhook successfully sent to dead letter queue'
    );
  } catch (dlqError: any) {
    // If we can't even send to DLQ, log critically
    logger.error(
      {
        error: dlqError,
        deliveryId,
        eventType,
        originalError: error,
      },
      'CRITICAL: Failed to send webhook to dead letter queue'
    );

    // TODO: Send critical alert
    // This is a critical failure - we couldn't process AND couldn't DLQ
  }
}

/**
 * Retrieve failed webhooks from the dead letter queue
 */
export async function getDeadLetterQueueEntries(
  limit: number = 100,
  offset: number = 0
): Promise<DLQEntry[]> {
  try {
    // Query for failed webhooks with max retries
    const failedDeliveries = await db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.status, 'failed'),
          // Only include entries that have reached max retries (3)
          // This filters out transient failures still being retried
        )
      )
      .orderBy(webhookDeliveries.createdAt)
      .limit(limit)
      .offset(offset);

    return failedDeliveries
      .filter((d) => d.retryCount >= 3) // Max retries threshold
      .map((delivery) => {
        let errorData: any = {};
        try {
          errorData = JSON.parse(delivery.lastError || '{}');
        } catch {
          errorData = { message: delivery.lastError };
        }

        return {
          deliveryId: delivery.deliveryId,
          eventType: delivery.eventType,
          payload: JSON.parse(delivery.payload),
          error: errorData,
          retryCount: delivery.retryCount,
          enqueuedAt: delivery.createdAt,
          lastAttemptAt: delivery.updatedAt,
        };
      });
  } catch (error: any) {
    logger.error({ error }, 'Error retrieving dead letter queue entries');
    throw error;
  }
}

/**
 * Retry a webhook from the dead letter queue
 */
export async function retryFromDeadLetterQueue(
  deliveryId: string
): Promise<void> {
  try {
    logger.info({ deliveryId }, 'Retrying webhook from dead letter queue');

    // Reset the webhook delivery status to pending
    await db
      .update(webhookDeliveries)
      .set({
        status: 'pending',
        retryCount: 0, // Reset retry count for manual retry
        lastError: null,
        updatedAt: new Date(),
      })
      .where(eq(webhookDeliveries.deliveryId, deliveryId));

    logger.info(
      { deliveryId },
      'Webhook reset to pending status for retry'
    );

    // TODO: Trigger webhook reprocessing
    // This could be done via:
    // 1. Message queue (e.g., RabbitMQ, AWS SQS)
    // 2. Background job (e.g., Bull, BullMQ)
    // 3. Direct HTTP call to webhook endpoint
  } catch (error: any) {
    logger.error({ error, deliveryId }, 'Error retrying webhook from DLQ');
    throw error;
  }
}

/**
 * Delete a webhook from the dead letter queue
 * (Use with caution - only for permanently discarding failed webhooks)
 */
export async function deleteFromDeadLetterQueue(
  deliveryId: string,
  reason: string
): Promise<void> {
  try {
    logger.warn(
      { deliveryId, reason },
      'Deleting webhook from dead letter queue'
    );

    await db
      .delete(webhookDeliveries)
      .where(eq(webhookDeliveries.deliveryId, deliveryId));

    logger.info(
      { deliveryId, reason },
      'Webhook deleted from dead letter queue'
    );

    // TODO: Audit log the deletion
    // await auditLog.log({
    //   action: 'DLQ_ENTRY_DELETED',
    //   deliveryId,
    //   reason,
    //   timestamp: new Date(),
    // });
  } catch (error: any) {
    logger.error({ error, deliveryId }, 'Error deleting webhook from DLQ');
    throw error;
  }
}

/**
 * Get dead letter queue statistics
 */
export async function getDeadLetterQueueStats(): Promise<{
  totalEntries: number;
  entriesByEventType: Record<string, number>;
  oldestEntry: Date | null;
  newestEntry: Date | null;
}> {
  try {
    const failedDeliveries = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.status, 'failed'));

    const dlqEntries = failedDeliveries.filter((d) => d.retryCount >= 3);

    const entriesByEventType: Record<string, number> = {};
    let oldestEntry: Date | null = null;
    let newestEntry: Date | null = null;

    dlqEntries.forEach((entry) => {
      entriesByEventType[entry.eventType] =
        (entriesByEventType[entry.eventType] || 0) + 1;

      if (!oldestEntry || entry.createdAt < oldestEntry) {
        oldestEntry = entry.createdAt;
      }

      if (!newestEntry || entry.createdAt > newestEntry) {
        newestEntry = entry.createdAt;
      }
    });

    return {
      totalEntries: dlqEntries.length,
      entriesByEventType,
      oldestEntry,
      newestEntry,
    };
  } catch (error: any) {
    logger.error({ error }, 'Error getting dead letter queue stats');
    throw error;
  }
}

/**
 * Purge old entries from dead letter queue
 * (Entries older than retention period)
 */
export async function purgeOldDeadLetterQueueEntries(
  retentionDays: number = 30
): Promise<number> {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    logger.info(
      { cutoffDate, retentionDays },
      'Purging old dead letter queue entries'
    );

    // Note: Drizzle doesn't have a direct deleteMany with count,
    // so we'll need to select first then delete
    const oldEntries = await db
      .select()
      .from(webhookDeliveries)
      .where(
        and(
          eq(webhookDeliveries.status, 'failed'),
          // Add date filter when Drizzle supports it
          // lt(webhookDeliveries.createdAt, cutoffDate)
        )
      );

    const entriesToPurge = oldEntries.filter(
      (e) => e.retryCount >= 3 && e.createdAt < cutoffDate
    );

    let purgedCount = 0;

    for (const entry of entriesToPurge) {
      await db
        .delete(webhookDeliveries)
        .where(eq(webhookDeliveries.deliveryId, entry.deliveryId));

      purgedCount++;
    }

    logger.info(
      { purgedCount, retentionDays },
      `Purged ${purgedCount} old DLQ entries`
    );

    return purgedCount;
  } catch (error: any) {
    logger.error({ error }, 'Error purging old DLQ entries');
    throw error;
  }
}
