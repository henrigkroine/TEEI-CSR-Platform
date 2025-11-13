import { pgTable, uuid, varchar, integer, text, timestamp, jsonb, index, pgEnum, boolean } from 'drizzle-orm/pg-core';
import { companies } from './users.js';

// Enum for platform types
export const platformEnum = pgEnum('platform', ['benevity', 'goodera', 'workday']);

// Enum for delivery status
export const deliveryStatusEnum = pgEnum('delivery_status', ['pending', 'delivered', 'failed', 'retrying']);

// Enum for scheduled delivery status
export const scheduleStatusEnum = pgEnum('schedule_status', ['pending', 'success', 'failed']);

export const impactDeliveries = pgTable('impact_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  platform: platformEnum('platform').notNull(),
  payloadHash: varchar('payload_hash', { length: 64 }).notNull(), // SHA-256 hash
  payloadSample: jsonb('payload_sample'), // Sample of delivered data
  status: deliveryStatusEnum('status').notNull().default('pending'),
  retries: integer('retries').notNull().default(0),
  errorMsg: text('error_msg'),
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  scheduleId: uuid('schedule_id'), // Link to scheduled delivery if this was scheduled
}, (table) => ({
  companyIdIdx: index('impact_deliveries_company_id_idx').on(table.companyId),
  platformIdx: index('impact_deliveries_platform_idx').on(table.platform),
  statusIdx: index('impact_deliveries_status_idx').on(table.status),
  deliveredAtIdx: index('impact_deliveries_delivered_at_idx').on(table.deliveredAt),
  companyPlatformIdx: index('impact_deliveries_company_platform_idx').on(table.companyId, table.platform),
}));

export const scheduledDeliveries = pgTable('scheduled_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  platform: platformEnum('platform').notNull(),
  schedule: varchar('schedule', { length: 50 }).notNull(), // Cron expression
  nextRun: timestamp('next_run', { withTimezone: true }).notNull(),
  lastRun: timestamp('last_run', { withTimezone: true }),
  lastStatus: scheduleStatusEnum('last_status').default('pending'),
  lastError: text('last_error'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyIdIdx: index('scheduled_deliveries_company_id_idx').on(table.companyId),
  platformIdx: index('scheduled_deliveries_platform_idx').on(table.platform),
  nextRunIdx: index('scheduled_deliveries_next_run_idx').on(table.nextRun),
  activeIdx: index('scheduled_deliveries_active_idx').on(table.active),
}));
