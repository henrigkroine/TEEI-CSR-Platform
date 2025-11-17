/**
 * Publications Schema - Worker 19
 *
 * Database schema for public impact pages and embeds.
 * Allows companies to publish selected tiles/sections to microsites
 * and provide secure embed scripts for corporate sites.
 *
 * Tables:
 * - publications: Publication metadata and configuration
 * - publication_blocks: Individual content blocks (tiles, charts, text, evidence)
 * - publication_tokens: Access tokens for private/tokenized publications
 * - publication_views: Analytics tracking for views
 *
 * @module publications
 */

import { pgTable, uuid, varchar, text, timestamp, jsonb, integer, boolean, index, pgEnum } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';

// Publication status enum
export const publicationStatusEnum = pgEnum('publication_status', ['DRAFT', 'LIVE', 'ARCHIVED']);

// Publication visibility enum
export const publicationVisibilityEnum = pgEnum('publication_visibility', ['PUBLIC', 'TOKEN']);

// Block kind enum
export const publicationBlockKindEnum = pgEnum('publication_block_kind', ['TILE', 'TEXT', 'CHART', 'EVIDENCE', 'METRIC', 'HEADING']);

/**
 * Publications table
 *
 * Stores publication metadata, configuration, and SEO settings.
 */
export const publications = pgTable('publications', {
  id: uuid('id').primaryKey().defaultRandom(),
  tenant_id: varchar('tenant_id', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  title: varchar('title', { length: 500 }).notNull(),
  description: text('description'),

  // Publication state
  status: publicationStatusEnum('status').notNull().default('DRAFT'),
  visibility: publicationVisibilityEnum('visibility').notNull().default('PUBLIC'),

  // Ownership
  created_by: varchar('created_by', { length: 255 }).notNull(),
  updated_by: varchar('updated_by', { length: 255 }).notNull(),

  // SEO metadata
  meta_title: varchar('meta_title', { length: 500 }),
  meta_description: varchar('meta_description', { length: 1000 }),
  og_image_url: text('og_image_url'),
  og_title: varchar('og_title', { length: 500 }),
  og_description: varchar('og_description', { length: 1000 }),

  // Configuration
  theme_config: jsonb('theme_config').$type<{
    primaryColor?: string;
    logoUrl?: string;
    customCss?: string;
  }>(),

  // Analytics
  view_count: integer('view_count').notNull().default(0),
  unique_visitors: integer('unique_visitors').notNull().default(0),
  last_viewed_at: timestamp('last_viewed_at'),

  // Timestamps
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
  published_at: timestamp('published_at'),
  archived_at: timestamp('archived_at'),
}, (table) => ({
  // Indexes for performance
  tenantIdx: index('publications_tenant_id_idx').on(table.tenant_id),
  slugIdx: index('publications_slug_idx').on(table.slug),
  tenantSlugIdx: index('publications_tenant_slug_idx').on(table.tenant_id, table.slug),
  statusIdx: index('publications_status_idx').on(table.status),
  visibilityIdx: index('publications_visibility_idx').on(table.visibility),
}));

/**
 * Publication Blocks table
 *
 * Stores individual content blocks that make up a publication.
 * Blocks can be tiles, charts, text, evidence snippets, etc.
 */
export const publicationBlocks = pgTable('publication_blocks', {
  id: uuid('id').primaryKey().defaultRandom(),
  publication_id: uuid('publication_id').notNull().references(() => publications.id, { onDelete: 'cascade' }),

  // Block metadata
  kind: publicationBlockKindEnum('kind').notNull(),
  order: integer('order').notNull(),

  // Block content (polymorphic JSON payload)
  payload_json: jsonb('payload_json').notNull().$type<
    | { type: 'TILE'; metric: string; value: number; label: string; trend?: number; }
    | { type: 'TEXT'; content: string; format: 'markdown' | 'html'; }
    | { type: 'CHART'; chartType: string; data: any; title: string; }
    | { type: 'EVIDENCE'; snippets: Array<{ id: string; text: string; source: string; }>; }
    | { type: 'METRIC'; label: string; value: number; unit?: string; change?: number; }
    | { type: 'HEADING'; text: string; level: 1 | 2 | 3; }
  >(),

  // Configuration
  width: varchar('width', { length: 50 }).default('full'), // 'full', 'half', 'third', 'quarter'
  styling: jsonb('styling').$type<{
    backgroundColor?: string;
    textColor?: string;
    borderColor?: string;
    padding?: string;
  }>(),

  // Timestamps
  created_at: timestamp('created_at').notNull().defaultNow(),
  updated_at: timestamp('updated_at').notNull().defaultNow(),
}, (table) => ({
  publicationIdx: index('publication_blocks_publication_id_idx').on(table.publication_id),
  orderIdx: index('publication_blocks_order_idx').on(table.publication_id, table.order),
}));

/**
 * Publication Tokens table
 *
 * Manages access tokens for TOKEN-visibility publications.
 * Tokens can be rotated, expired, and tracked for usage.
 */
export const publicationTokens = pgTable('publication_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  publication_id: uuid('publication_id').notNull().references(() => publications.id, { onDelete: 'cascade' }),

  // Token data
  token_hash: varchar('token_hash', { length: 255 }).notNull().unique(),
  token_prefix: varchar('token_prefix', { length: 10 }).notNull(), // First 8 chars for display

  // Metadata
  label: varchar('label', { length: 255 }), // User-friendly label
  created_by: varchar('created_by', { length: 255 }).notNull(),

  // Expiration
  expires_at: timestamp('expires_at'),
  revoked_at: timestamp('revoked_at'),

  // Usage tracking
  last_used_at: timestamp('last_used_at'),
  use_count: integer('use_count').notNull().default(0),

  // Timestamps
  created_at: timestamp('created_at').notNull().defaultNow(),
}, (table) => ({
  publicationIdx: index('publication_tokens_publication_id_idx').on(table.publication_id),
  tokenHashIdx: index('publication_tokens_token_hash_idx').on(table.token_hash),
}));

/**
 * Publication Views table
 *
 * Analytics tracking for publication views.
 * Captures anonymized visitor data and referrer information.
 */
export const publicationViews = pgTable('publication_views', {
  id: uuid('id').primaryKey().defaultRandom(),
  publication_id: uuid('publication_id').notNull().references(() => publications.id, { onDelete: 'cascade' }),

  // Visitor tracking (anonymized)
  visitor_hash: varchar('visitor_hash', { length: 64 }).notNull(), // SHA-256 of IP + User-Agent
  session_id: varchar('session_id', { length: 64 }), // Optional session tracking

  // Context
  referer: text('referer'),
  user_agent: text('user_agent'),
  country_code: varchar('country_code', { length: 2 }),

  // Embed context (if viewed via embed)
  is_embed: boolean('is_embed').notNull().default(false),
  embed_domain: varchar('embed_domain', { length: 500 }),

  // View metadata
  view_duration_seconds: integer('view_duration_seconds'), // Tracked via beacon on exit

  // Timestamp
  viewed_at: timestamp('viewed_at').notNull().defaultNow(),
}, (table) => ({
  publicationIdx: index('publication_views_publication_id_idx').on(table.publication_id),
  viewedAtIdx: index('publication_views_viewed_at_idx').on(table.viewed_at),
  visitorIdx: index('publication_views_visitor_hash_idx').on(table.visitor_hash),
}));

// Type exports for ORM usage
export type Publication = typeof publications.$inferSelect;
export type NewPublication = typeof publications.$inferInsert;

export type PublicationBlock = typeof publicationBlocks.$inferSelect;
export type NewPublicationBlock = typeof publicationBlocks.$inferInsert;

export type PublicationToken = typeof publicationTokens.$inferSelect;
export type NewPublicationToken = typeof publicationTokens.$inferInsert;

export type PublicationView = typeof publicationViews.$inferSelect;
export type NewPublicationView = typeof publicationViews.$inferInsert;
