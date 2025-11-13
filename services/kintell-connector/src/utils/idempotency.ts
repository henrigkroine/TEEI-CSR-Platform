import { createHash } from 'crypto';
import { db, webhookDeliveries } from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('kintell-connector:idempotency');

export type WebhookStatus = 'pending' | 'processed' | 'failed';

export interface IdempotencyResult {
  /**
   * Whether this webhook has already been processed
   */
  alreadyProcessed: boolean;

  /**
   * The delivery record from the database
   */
  delivery: {
    id: string;
    deliveryId: string;
    status: WebhookStatus;
    retryCount: number;
    lastError: string | null;
  } | null;

  /**
   * Whether to proceed with processing (true if new or failed with retries remaining)
   */
  shouldProcess: boolean;
}

/**
 * Compute SHA-256 hash of webhook payload for deduplication
 */
export function computePayloadHash(payload: Record<string, any>): string {
  const rawBody = JSON.stringify(payload);
  return createHash('sha256').update(rawBody).digest('hex');
}

/**
 * Check if a webhook delivery has already been processed (idempotency check)
 *
 * Behavior:
 * - If delivery doesn't exist: Create pending record, return shouldProcess=true
 * - If delivery exists and is processed: Return alreadyProcessed=true, shouldProcess=false
 * - If delivery exists and failed with retries < 3: Return shouldProcess=true
 * - If delivery exists and failed with retries >= 3: Return shouldProcess=false (will go to DLQ)
 *
 * @param deliveryId - Unique delivery ID from X-Delivery-Id header
 * @param eventType - Type of webhook event (e.g., 'session-completed')
 * @param payload - Full webhook payload
 */
export async function checkIdempotency(
  deliveryId: string,
  eventType: string,
  payload: Record<string, any>
): Promise<IdempotencyResult> {
  const payloadHash = computePayloadHash(payload);
  const rawBody = JSON.stringify(payload);

  try {
    // Check if delivery already exists
    const [existing] = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.deliveryId, deliveryId))
      .limit(1);

    if (!existing) {
      // New delivery - create pending record
      logger.info({ deliveryId, eventType }, 'New webhook delivery, creating record');

      const [created] = await db
        .insert(webhookDeliveries)
        .values({
          deliveryId,
          eventType,
          payloadHash,
          payload: rawBody,
          status: 'pending',
          retryCount: 0,
        })
        .returning();

      return {
        alreadyProcessed: false,
        delivery: {
          id: created.id,
          deliveryId: created.deliveryId,
          status: created.status as WebhookStatus,
          retryCount: created.retryCount,
          lastError: created.lastError,
        },
        shouldProcess: true,
      };
    }

    // Delivery already exists - check status
    if (existing.status === 'processed') {
      logger.info(
        { deliveryId, eventType, processedAt: existing.processedAt },
        'Webhook already processed (idempotent)'
      );

      return {
        alreadyProcessed: true,
        delivery: {
          id: existing.id,
          deliveryId: existing.deliveryId,
          status: existing.status as WebhookStatus,
          retryCount: existing.retryCount,
          lastError: existing.lastError,
        },
        shouldProcess: false,
      };
    }

    // Failed delivery - check retry count
    if (existing.status === 'failed') {
      const maxRetries = 3;

      if (existing.retryCount >= maxRetries) {
        logger.warn(
          { deliveryId, eventType, retryCount: existing.retryCount },
          'Webhook failed with max retries, will be sent to DLQ'
        );

        return {
          alreadyProcessed: false,
          delivery: {
            id: existing.id,
            deliveryId: existing.deliveryId,
            status: existing.status as WebhookStatus,
            retryCount: existing.retryCount,
            lastError: existing.lastError,
          },
          shouldProcess: false, // Don't process, send to DLQ
        };
      }

      logger.info(
        { deliveryId, eventType, retryCount: existing.retryCount },
        'Retrying failed webhook delivery'
      );

      return {
        alreadyProcessed: false,
        delivery: {
          id: existing.id,
          deliveryId: existing.deliveryId,
          status: existing.status as WebhookStatus,
          retryCount: existing.retryCount,
          lastError: existing.lastError,
        },
        shouldProcess: true, // Retry processing
      };
    }

    // Pending delivery (might be duplicate request while processing)
    logger.info(
      { deliveryId, eventType },
      'Webhook is currently pending, allowing reprocessing'
    );

    return {
      alreadyProcessed: false,
      delivery: {
        id: existing.id,
        deliveryId: existing.deliveryId,
        status: existing.status as WebhookStatus,
        retryCount: existing.retryCount,
        lastError: existing.lastError,
      },
      shouldProcess: true,
    };
  } catch (error: any) {
    logger.error({ error, deliveryId, eventType }, 'Error checking idempotency');
    throw error;
  }
}

/**
 * Mark a webhook delivery as successfully processed
 */
export async function markProcessed(deliveryId: string): Promise<void> {
  try {
    await db
      .update(webhookDeliveries)
      .set({
        status: 'processed',
        processedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(webhookDeliveries.deliveryId, deliveryId));

    logger.info({ deliveryId }, 'Webhook marked as processed');
  } catch (error: any) {
    logger.error({ error, deliveryId }, 'Error marking webhook as processed');
    throw error;
  }
}

/**
 * Mark a webhook delivery as failed and increment retry count
 */
export async function markFailed(
  deliveryId: string,
  errorMessage: string
): Promise<void> {
  try {
    // Get current retry count
    const [existing] = await db
      .select()
      .from(webhookDeliveries)
      .where(eq(webhookDeliveries.deliveryId, deliveryId))
      .limit(1);

    if (!existing) {
      logger.error({ deliveryId }, 'Cannot mark non-existent delivery as failed');
      return;
    }

    await db
      .update(webhookDeliveries)
      .set({
        status: 'failed',
        retryCount: existing.retryCount + 1,
        lastError: errorMessage,
        updatedAt: new Date(),
      })
      .where(eq(webhookDeliveries.deliveryId, deliveryId));

    logger.warn(
      { deliveryId, retryCount: existing.retryCount + 1, error: errorMessage },
      'Webhook marked as failed'
    );
  } catch (error: any) {
    logger.error({ error, deliveryId }, 'Error marking webhook as failed');
    throw error;
  }
}
