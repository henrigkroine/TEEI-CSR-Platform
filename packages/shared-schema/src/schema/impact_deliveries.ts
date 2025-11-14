import { pgTable, uuid, varchar, timestamp, text, integer, jsonb } from 'drizzle-orm/pg-core';
import { companies } from './users.js';

/**
 * Impact Deliveries Table
 * Tracks delivery of impact data to external CSR platforms (Benevity, Goodera, Workday)
 */
export const impactDeliveries = pgTable('impact_deliveries', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),

  // Provider identification
  provider: varchar('provider', { length: 50 }).notNull(), // 'benevity' | 'goodera' | 'workday'

  // Idempotency key to prevent duplicate sends
  deliveryId: uuid('delivery_id').notNull().unique(),

  // Payload sent to external provider
  payload: jsonb('payload').notNull(),

  // Delivery status tracking
  status: varchar('status', { length: 20 }).notNull().default('pending'), // 'pending' | 'success' | 'failed' | 'retrying'

  // Retry tracking
  attemptCount: integer('attempt_count').notNull().default(0),

  // Error tracking
  lastError: text('last_error'),

  // Response from external provider
  providerResponse: jsonb('provider_response'),

  // Timestamps
  deliveredAt: timestamp('delivered_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * OAuth Token Storage for Impact-In Providers
 * Stores access tokens and refresh tokens for OAuth-based providers (e.g., Goodera)
 */
export const impactProviderTokens = pgTable('impact_provider_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),
  provider: varchar('provider', { length: 50 }).notNull(), // 'goodera', 'workday', etc.

  // OAuth tokens
  accessToken: text('access_token').notNull(),
  refreshToken: text('refresh_token'),
  tokenType: varchar('token_type', { length: 50 }).notNull().default('Bearer'),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
