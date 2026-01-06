import { pgTable, uuid, varchar, timestamp, integer, text, pgEnum } from 'drizzle-orm/pg-core';
// Webhook delivery status enum
export const webhookStatusEnum = pgEnum('webhook_status', ['pending', 'processed', 'failed']);
// Backfill job status enum
export const backfillStatusEnum = pgEnum('backfill_status', ['pending', 'running', 'completed', 'failed', 'paused']);
/**
 * Tracks webhook deliveries for idempotency and audit trail
 */
export const webhookDeliveries = pgTable('webhook_deliveries', {
    id: uuid('id').defaultRandom().primaryKey(),
    deliveryId: varchar('delivery_id', { length: 255 }).notNull().unique(), // X-Delivery-Id header
    eventType: varchar('event_type', { length: 100 }).notNull(), // e.g., 'session-completed', 'rating-created'
    payloadHash: varchar('payload_hash', { length: 64 }).notNull(), // SHA-256 of request body
    payload: text('payload').notNull(), // Full JSON payload for replay
    status: webhookStatusEnum('status').notNull().default('pending'),
    processedAt: timestamp('processed_at', { withTimezone: true }),
    retryCount: integer('retry_count').notNull().default(0),
    lastError: text('last_error'),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
/**
 * Tracks CSV backfill jobs for progress monitoring and resumption
 */
export const backfillJobs = pgTable('backfill_jobs', {
    id: uuid('id').defaultRandom().primaryKey(),
    fileName: varchar('file_name', { length: 255 }).notNull(),
    totalRows: integer('total_rows').notNull(),
    processedRows: integer('processed_rows').notNull().default(0),
    successfulRows: integer('successful_rows').notNull().default(0),
    failedRows: integer('failed_rows').notNull().default(0),
    lastProcessedRow: integer('last_processed_row').notNull().default(0), // Checkpoint for resume
    status: backfillStatusEnum('status').notNull().default('pending'),
    errorFilePath: varchar('error_file_path', { length: 500 }), // Path to error CSV file
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
//# sourceMappingURL=webhooks.js.map