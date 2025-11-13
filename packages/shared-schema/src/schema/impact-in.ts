import { pgTable, uuid, varchar, integer, text, timestamp, jsonb, index, pgEnum } from 'drizzle-orm/pg-core';
import { companies } from './users.js';

// Enum for platform types
export const platformEnum = pgEnum('platform', ['benevity', 'goodera', 'workday']);

// Enum for delivery status
export const deliveryStatusEnum = pgEnum('delivery_status', ['pending', 'delivered', 'failed', 'retrying']);

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
}, (table) => ({
  companyIdIdx: index('impact_deliveries_company_id_idx').on(table.companyId),
  platformIdx: index('impact_deliveries_platform_idx').on(table.platform),
  statusIdx: index('impact_deliveries_status_idx').on(table.status),
  deliveredAtIdx: index('impact_deliveries_delivered_at_idx').on(table.deliveredAt),
  companyPlatformIdx: index('impact_deliveries_company_platform_idx').on(table.companyId, table.platform),
}));
