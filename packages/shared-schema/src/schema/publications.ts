import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum, text, index, integer } from 'drizzle-orm/pg-core';
import { companies } from './users.js';

// Enums
export const publicationStatusEnum = pgEnum('publication_status', ['DRAFT', 'LIVE']);
export const publicationVisibilityEnum = pgEnum('publication_visibility', ['PUBLIC', 'TOKEN']);
export const publicationBlockKindEnum = pgEnum('publication_block_kind', ['TILE', 'TEXT', 'CHART', 'EVIDENCE']);

/**
 * Publications: Public impact pages and embeds
 * Tenant-scoped, slug-based public microsites for corporate sites
 */
export const publications = pgTable('publications', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  slug: varchar('slug', { length: 255 }).notNull(), // URL-safe slug (unique per tenant)
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'), // SEO meta description (160 chars recommended)
  metaTitle: varchar('meta_title', { length: 60 }), // SEO title override
  ogImage: text('og_image'), // Open Graph image URL
  status: publicationStatusEnum('status').notNull().default('DRAFT'),
  visibility: publicationVisibilityEnum('visibility').notNull().default('PUBLIC'),
  accessToken: varchar('access_token', { length: 64 }), // For TOKEN visibility (SHA-256 hash)
  tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }), // Token TTL (default 30d)
  publishedAt: timestamp('published_at', { withTimezone: true }), // When status changed to LIVE
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantSlugIdx: index('publications_tenant_slug_idx').on(table.tenantId, table.slug), // Unique slug per tenant
  statusIdx: index('publications_status_idx').on(table.status),
  visibilityIdx: index('publications_visibility_idx').on(table.visibility),
  publishedAtIdx: index('publications_published_at_idx').on(table.publishedAt),
}));

/**
 * Publication Blocks: Individual content blocks within a publication
 * Ordered blocks of tiles, text, charts, and evidence snippets
 */
export const publicationBlocks = pgTable('publication_blocks', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicationId: uuid('publication_id').notNull().references(() => publications.id, { onDelete: 'cascade' }),
  kind: publicationBlockKindEnum('kind').notNull(),
  order: integer('order').notNull(), // Display order (0-indexed)
  payloadJson: jsonb('payload_json').notNull(), // Block-specific data (varies by kind)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  publicationOrderIdx: index('publication_blocks_publication_order_idx').on(table.publicationId, table.order),
}));

/**
 * Publication Views: Analytics tracking (anonymized)
 * Track views, unique visitors, and referrers for published pages
 */
export const publicationViews = pgTable('publication_views', {
  id: uuid('id').defaultRandom().primaryKey(),
  publicationId: uuid('publication_id').notNull().references(() => publications.id, { onDelete: 'cascade' }),
  viewedAt: timestamp('viewed_at', { withTimezone: true }).defaultNow().notNull(),
  referrer: text('referrer'), // HTTP referrer (truncated to 500 chars)
  anonymizedIp: varchar('anonymized_ip', { length: 64 }), // Hashed IP (HMAC-SHA256 with salt)
  userAgent: text('user_agent'), // User agent string (for device analytics)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  publicationViewedAtIdx: index('publication_views_publication_viewed_at_idx').on(table.publicationId, table.viewedAt),
}));
