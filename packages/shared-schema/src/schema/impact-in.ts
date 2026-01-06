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

/**
 * OAuth tokens for external platforms (Workday, Goodera if OAuth enabled)
 * Stores access tokens with expiry for secure, persistent authentication
 */
export const impactProviderTokens = pgTable('impact_provider_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  provider: platformEnum('provider').notNull(),
  accessToken: text('access_token').notNull(), // Encrypted at rest via DB config
  tokenType: varchar('token_type', { length: 50 }).default('Bearer'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  companyProviderIdx: index('impact_provider_tokens_company_provider_idx').on(table.companyId, table.provider),
  expiresAtIdx: index('impact_provider_tokens_expires_at_idx').on(table.expiresAt),
}));
