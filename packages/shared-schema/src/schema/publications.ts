import { pgTable, uuid, text, timestamp, integer, jsonb, index, varchar, pgEnum } from 'drizzle-orm/pg-core';
import { companies } from './users.js';

/**
 * Publication status enum
 */
export const publicationStatusEnum = pgEnum('publication_status', ['DRAFT', 'LIVE', 'ARCHIVED']);

/**
 * Publication visibility enum
 */
export const publicationVisibilityEnum = pgEnum('publication_visibility', ['PUBLIC', 'TOKEN']);

/**
 * Publication block kind enum
 */
export const publicationBlockKindEnum = pgEnum('publication_block_kind', ['TILE', 'TEXT', 'CHART', 'EVIDENCE']);

/**
 * Publications table - main publication records
 */
export const publications = pgTable('publications', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 255 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),
  status: publicationStatusEnum('status').notNull().default('DRAFT'),
  visibility: publicationVisibilityEnum('visibility').notNull().default('PUBLIC'),

  // SEO fields
  metaTitle: varchar('meta_title', { length: 255 }),
  metaDescription: text('meta_description'),
  ogImage: text('og_image'),

  // Access control
  accessToken: varchar('access_token', { length: 255 }), // For TOKEN visibility
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),

  // ETag for caching
  etag: varchar('etag', { length: 64 }),

  // Timestamps
  publishedAt: timestamp('published_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  slugIdx: index('publications_slug_idx').on(table.slug),
  tenantSlugIdx: index('publications_tenant_slug_idx').on(table.tenantId, table.slug),
  statusIdx: index('publications_status_idx').on(table.status),
  tenantStatusIdx: index('publications_tenant_status_idx').on(table.tenantId, table.status),
}));

/**
 * Publication blocks table - sections/tiles within a publication
 */
export const publicationBlocks = pgTable('publication_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicationId: uuid('publication_id').notNull().references(() => publications.id, { onDelete: 'cascade' }),
  kind: publicationBlockKindEnum('kind').notNull(),

  // Block content (JSON payload)
  payloadJson: jsonb('payload_json').notNull(),

  // Display order
  order: integer('order').notNull().default(0),

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  publicationIdx: index('publication_blocks_publication_idx').on(table.publicationId),
  publicationOrderIdx: index('publication_blocks_publication_order_idx').on(table.publicationId, table.order),
}));

/**
 * Publication analytics table - view tracking
 */
export const publicationAnalytics = pgTable('publication_analytics', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicationId: uuid('publication_id').notNull().references(() => publications.id, { onDelete: 'cascade' }),

  // Anonymized visitor tracking
  visitorHash: varchar('visitor_hash', { length: 64 }).notNull(), // SHA-256 hash of IP + User-Agent

  // Referrer information
  referrer: text('referrer'),
  referrerDomain: varchar('referrer_domain', { length: 255 }),

  // View metadata
  userAgent: text('user_agent'),
  country: varchar('country', { length: 2 }), // ISO country code

  // Timestamp
  viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  publicationIdx: index('publication_analytics_publication_idx').on(table.publicationId),
  publicationDateIdx: index('publication_analytics_publication_date_idx').on(table.publicationId, table.viewedAt),
  visitorIdx: index('publication_analytics_visitor_idx').on(table.visitorHash),
}));
