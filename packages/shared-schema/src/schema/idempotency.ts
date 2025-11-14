/**
 * Idempotency Schema
 *
 * Tracks processed events and webhook deliveries to prevent duplicate processing.
 * Ensures exactly-once semantics for event-driven systems and webhook handlers.
 */

import { pgTable, uuid, varchar, timestamp, boolean, text, index, uniqueIndex } from 'drizzle-orm/pg-core';

/**
 * Event Deduplication Table
 *
 * Tracks processed NATS events by eventId to prevent duplicate processing.
 * Used by event subscribers to ensure idempotent event handling.
 */
export const eventDeduplication = pgTable(
  'event_deduplication',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    eventId: varchar('event_id', { length: 255 }).notNull(),
    eventType: varchar('event_type', { length: 255 }).notNull(),
    consumerId: varchar('consumer_id', { length: 255 }).notNull(), // Service/subscriber ID
    processedAt: timestamp('processed_at').notNull().defaultNow(),
    success: boolean('success').notNull().default(true),
    errorMessage: text('error_message'),
    metadata: text('metadata'), // JSON string for additional context
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Composite unique index ensures each consumer processes each event exactly once
    eventConsumerUnique: uniqueIndex('event_consumer_unique_idx').on(
      table.eventId,
      table.consumerId
    ),
    // Index for querying by event type and consumer
    eventTypeConsumerIdx: index('event_type_consumer_idx').on(
      table.eventType,
      table.consumerId
    ),
    // Index for querying failed events
    failedEventsIdx: index('failed_events_idx').on(table.success, table.processedAt),
    // Index for cleanup queries (old processed events)
    processedAtIdx: index('processed_at_idx').on(table.processedAt),
  })
);

/**
 * Webhook Delivery Deduplication Table
 *
 * Tracks webhook deliveries by deliveryId to handle retries and prevent duplicate processing.
 * External systems may retry webhook deliveries on timeout or failure.
 */
export const webhookDeduplication = pgTable(
  'webhook_deduplication',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    deliveryId: varchar('delivery_id', { length: 255 }).notNull(),
    webhookSource: varchar('webhook_source', { length: 100 }).notNull(), // 'kintell', 'upskilling', etc.
    webhookType: varchar('webhook_type', { length: 255 }).notNull(),
    receivedAt: timestamp('received_at').notNull().defaultNow(),
    processedAt: timestamp('processed_at'),
    success: boolean('success').notNull().default(true),
    statusCode: varchar('status_code', { length: 10 }).notNull().default('200'),
    errorMessage: text('error_message'),
    retryCount: varchar('retry_count', { length: 10 }).notNull().default('0'),
    payload: text('payload'), // JSON string of webhook payload for debugging
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique index ensures each delivery is processed exactly once
    deliverySourceUnique: uniqueIndex('delivery_source_unique_idx').on(
      table.deliveryId,
      table.webhookSource
    ),
    // Index for querying by webhook source and type
    sourceTypeIdx: index('webhook_source_type_idx').on(
      table.webhookSource,
      table.webhookType
    ),
    // Index for monitoring retry patterns
    retryCountIdx: index('retry_count_idx').on(table.retryCount, table.receivedAt),
    // Index for cleanup queries
    receivedAtIdx: index('webhook_received_at_idx').on(table.receivedAt),
  })
);

/**
 * API Request Deduplication Table
 *
 * Tracks idempotency keys for API requests to prevent duplicate operations.
 * Clients can provide an Idempotency-Key header to ensure safe retries.
 */
export const apiRequestDeduplication = pgTable(
  'api_request_deduplication',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    idempotencyKey: varchar('idempotency_key', { length: 255 }).notNull(),
    userId: uuid('user_id'), // Optional: for user-scoped idempotency
    endpoint: varchar('endpoint', { length: 500 }).notNull(),
    method: varchar('method', { length: 10 }).notNull(), // GET, POST, PUT, DELETE
    requestedAt: timestamp('requested_at').notNull().defaultNow(),
    completedAt: timestamp('completed_at'),
    statusCode: varchar('status_code', { length: 10 }).notNull(),
    responseBody: text('response_body'), // Cached response for replays
    errorMessage: text('error_message'),
    expiresAt: timestamp('expires_at').notNull(), // TTL for cleanup
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => ({
    // Unique index on idempotency key (optionally scoped to user)
    idempotencyKeyUnique: uniqueIndex('idempotency_key_unique_idx').on(
      table.idempotencyKey
    ),
    // Index for user-scoped queries
    userIdempotencyIdx: index('user_idempotency_idx').on(
      table.userId,
      table.idempotencyKey
    ),
    // Index for cleanup of expired keys
    expiresAtIdx: index('expires_at_idx').on(table.expiresAt),
    // Index for monitoring by endpoint
    endpointIdx: index('endpoint_idx').on(table.endpoint, table.requestedAt),
  })
);

/**
 * Type exports for TypeScript
 */
export type EventDeduplication = typeof eventDeduplication.$inferSelect;
export type NewEventDeduplication = typeof eventDeduplication.$inferInsert;

export type WebhookDeduplication = typeof webhookDeduplication.$inferSelect;
export type NewWebhookDeduplication = typeof webhookDeduplication.$inferInsert;

export type ApiRequestDeduplication = typeof apiRequestDeduplication.$inferSelect;
export type NewApiRequestDeduplication = typeof apiRequestDeduplication.$inferInsert;
