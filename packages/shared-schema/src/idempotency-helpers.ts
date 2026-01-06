/**
 * Idempotency Helpers
 *
 * Utilities for checking and recording idempotent operations.
 */

import { db } from './db.js';
import {
  eventDeduplication,
  webhookDeduplication,
  apiRequestDeduplication,
  type NewEventDeduplication,
  type NewWebhookDeduplication,
  type NewApiRequestDeduplication,
} from './schema/idempotency.js';
import { eq, and, lt } from 'drizzle-orm';

/**
 * Check if an event has already been processed by a consumer
 *
 * @param eventId - Unique event identifier
 * @param consumerId - Service/subscriber identifier
 * @returns True if event was already processed
 */
export async function isEventProcessed(
  eventId: string,
  consumerId: string
): Promise<boolean> {
  const [existing] = await db
    .select()
    .from(eventDeduplication)
    .where(
      and(
        eq(eventDeduplication.eventId, eventId),
        eq(eventDeduplication.consumerId, consumerId)
      )
    )
    .limit(1);

  return !!existing;
}

/**
 * Record that an event has been processed
 *
 * @param data - Event deduplication record
 * @returns Created record
 */
export async function recordEventProcessed(
  data: NewEventDeduplication
): Promise<void> {
  try {
    await db.insert(eventDeduplication).values(data);
  } catch (error) {
    // Ignore unique constraint violations (race condition: already processed)
    if ((error as any).code === '23505') {
      return;
    }
    throw error;
  }
}

/**
 * Check if a webhook delivery has already been received
 *
 * @param deliveryId - Webhook delivery identifier
 * @param webhookSource - Source system (e.g., 'kintell', 'upskilling')
 * @returns Existing record if already processed
 */
export async function getWebhookDelivery(
  deliveryId: string,
  webhookSource: string
) {
  const [existing] = await db
    .select()
    .from(webhookDeduplication)
    .where(
      and(
        eq(webhookDeduplication.deliveryId, deliveryId),
        eq(webhookDeduplication.webhookSource, webhookSource)
      )
    )
    .limit(1);

  return existing;
}

/**
 * Record a webhook delivery
 *
 * @param data - Webhook deduplication record
 * @returns Created record or existing record if duplicate
 */
export async function recordWebhookDelivery(
  data: NewWebhookDeduplication
) {
  try {
    const [record] = await db
      .insert(webhookDeduplication)
      .values(data)
      .returning();
    return record;
  } catch (error) {
    // On unique constraint violation, return existing record
    if ((error as any).code === '23505') {
      return await getWebhookDelivery(data.deliveryId, data.webhookSource);
    }
    throw error;
  }
}

/**
 * Update webhook delivery status after processing
 *
 * @param id - Record ID
 * @param success - Whether processing succeeded
 * @param statusCode - HTTP status code
 * @param errorMessage - Optional error message
 */
export async function updateWebhookDeliveryStatus(
  id: string,
  success: boolean,
  statusCode: string,
  errorMessage?: string
): Promise<void> {
  await db
    .update(webhookDeduplication)
    .set({
      processedAt: new Date(),
      success,
      statusCode,
      errorMessage,
    })
    .where(eq(webhookDeduplication.id, id));
}

/**
 * Check if an API request with idempotency key has been processed
 *
 * @param idempotencyKey - Client-provided idempotency key
 * @param userId - Optional user ID for user-scoped keys
 * @returns Existing request record if found
 */
export async function getIdempotentRequest(
  idempotencyKey: string,
  userId?: string | null
) {
  const conditions = userId
    ? and(
        eq(apiRequestDeduplication.idempotencyKey, idempotencyKey),
        eq(apiRequestDeduplication.userId, userId)
      )
    : eq(apiRequestDeduplication.idempotencyKey, idempotencyKey);

  const [existing] = await db
    .select()
    .from(apiRequestDeduplication)
    .where(conditions)
    .limit(1);

  // Check if expired
  if (existing && existing.expiresAt < new Date()) {
    // Clean up expired record
    await db
      .delete(apiRequestDeduplication)
      .where(eq(apiRequestDeduplication.id, existing.id));
    return null;
  }

  return existing;
}

/**
 * Record an idempotent API request
 *
 * @param data - API request deduplication record
 * @returns Created record
 */
export async function recordIdempotentRequest(
  data: NewApiRequestDeduplication
) {
  try {
    const [record] = await db
      .insert(apiRequestDeduplication)
      .values(data)
      .returning();
    return record;
  } catch (error) {
    // On unique constraint violation, return existing record
    if ((error as any).code === '23505') {
      return await getIdempotentRequest(data.idempotencyKey, data.userId);
    }
    throw error;
  }
}

/**
 * Update idempotent request with response
 *
 * @param id - Record ID
 * @param statusCode - HTTP status code
 * @param responseBody - Response body to cache
 * @param errorMessage - Optional error message
 */
export async function updateIdempotentRequest(
  id: string,
  statusCode: string,
  responseBody?: string,
  errorMessage?: string
): Promise<void> {
  await db
    .update(apiRequestDeduplication)
    .set({
      completedAt: new Date(),
      statusCode,
      responseBody,
      errorMessage,
    })
    .where(eq(apiRequestDeduplication.id, id));
}

/**
 * Clean up old deduplication records
 *
 * Removes processed events and webhooks older than retention period.
 *
 * @param retentionDays - Number of days to retain records (default: 30)
 */
export async function cleanupOldDeduplicationRecords(
  retentionDays: number = 30
): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  // Clean up old event deduplication records
  await db
    .delete(eventDeduplication)
    .where(
      and(
        eq(eventDeduplication.success, true),
        lt(eventDeduplication.processedAt, cutoffDate)
      )
    );

  // Clean up old webhook deduplication records
  await db
    .delete(webhookDeduplication)
    .where(
      and(
        eq(webhookDeduplication.success, true),
        lt(webhookDeduplication.receivedAt, cutoffDate)
      )
    );

  // Clean up expired API request deduplication records
  await db
    .delete(apiRequestDeduplication)
    .where(lt(apiRequestDeduplication.expiresAt, new Date()));
}

/**
 * Get deduplication statistics
 *
 * @returns Statistics about deduplication records
 */
export async function getDeduplicationStats() {
  const [eventStats] = await db
    .select({
      total: eventDeduplication.id,
    })
    .from(eventDeduplication);

  const [webhookStats] = await db
    .select({
      total: webhookDeduplication.id,
    })
    .from(webhookDeduplication);

  const [apiStats] = await db
    .select({
      total: apiRequestDeduplication.id,
    })
    .from(apiRequestDeduplication);

  return {
    events: eventStats,
    webhooks: webhookStats,
    apiRequests: apiStats,
  };
}
