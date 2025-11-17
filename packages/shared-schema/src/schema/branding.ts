import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum, text, index, boolean } from 'drizzle-orm/pg-core';
import { companies } from './users.js';

// Enums
export const assetKindEnum = pgEnum('branding_asset_kind', ['logo', 'favicon', 'watermark', 'hero_image']);

/**
 * Branding Themes table
 * Stores per-tenant branding configurations with theme tokens
 */
export const brandingThemes = pgTable('branding_themes', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(), // e.g., "Default", "Dark Mode", "Executive"
  isActive: boolean('is_active').notNull().default(true), // Only one active theme per tenant
  tokensJson: jsonb('tokens_json').notNull(), // ThemeTokens: { colors, typography, spacing, radii, charts }
  createdBy: uuid('created_by'), // User who created the theme
  updatedBy: uuid('updated_by'), // User who last updated the theme
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('branding_themes_tenant_id_idx').on(table.tenantId),
  tenantIdActiveIdx: index('branding_themes_tenant_id_active_idx').on(table.tenantId, table.isActive),
  nameIdx: index('branding_themes_name_idx').on(table.name),
}));

/**
 * Branding Assets table
 * Stores logos, favicons, watermarks, and other brand assets
 */
export const brandingAssets = pgTable('branding_assets', {
  id: uuid('id').defaultRandom().primaryKey(),
  themeId: uuid('theme_id').notNull().references(() => brandingThemes.id, { onDelete: 'cascade' }),
  kind: assetKindEnum('kind').notNull(),
  url: text('url').notNull(), // CDN URL or S3 path
  hash: varchar('hash', { length: 64 }).notNull(), // SHA-256 hash for integrity verification
  mimeType: varchar('mime_type', { length: 100 }).notNull(), // e.g., "image/png", "image/svg+xml"
  size: varchar('size', { length: 50 }), // Human-readable size, e.g., "150KB"
  width: varchar('width', { length: 50 }), // Image width in px
  height: varchar('height', { length: 50 }), // Image height in px
  metadata: jsonb('metadata').default({}), // Additional asset metadata
  uploadedBy: uuid('uploaded_by'), // User who uploaded the asset
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  themeIdIdx: index('branding_assets_theme_id_idx').on(table.themeId),
  kindIdx: index('branding_assets_kind_idx').on(table.kind),
  themeIdKindIdx: index('branding_assets_theme_id_kind_idx').on(table.themeId, table.kind),
}));

/**
 * Branding Domains table (optional)
 * Maps custom subdomains to tenants for white-label routing
 */
export const brandingDomains = pgTable('branding_domains', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  domain: varchar('domain', { length: 255 }).notNull().unique(), // e.g., "acme.teei-csr.com"
  isVerified: boolean('is_verified').notNull().default(false),
  verificationToken: varchar('verification_token', { length: 255 }), // Token for domain verification
  verifiedAt: timestamp('verified_at', { withTimezone: true }),
  createdBy: uuid('created_by'), // User who added the domain
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('branding_domains_tenant_id_idx').on(table.tenantId),
  domainIdx: index('branding_domains_domain_idx').on(table.domain),
  verifiedIdx: index('branding_domains_verified_idx').on(table.isVerified),
}));

/**
 * Branding Audit Log table
 * Tracks all changes to themes, assets, and domains
 */
export const brandingAuditLog = pgTable('branding_audit_log', {
  id: uuid('id').defaultRandom().primaryKey(),
  tenantId: uuid('tenant_id').notNull().references(() => companies.id, { onDelete: 'cascade' }),
  resourceType: varchar('resource_type', { length: 50 }).notNull(), // 'theme', 'asset', 'domain'
  resourceId: uuid('resource_id').notNull(), // ID of the affected resource
  action: varchar('action', { length: 50 }).notNull(), // 'created', 'updated', 'deleted', 'activated', 'deactivated'
  changes: jsonb('changes'), // Diff of changes (before/after)
  performedBy: uuid('performed_by'), // User who performed the action
  ipAddress: varchar('ip_address', { length: 45 }), // IPv4 or IPv6
  userAgent: text('user_agent'),
  performedAt: timestamp('performed_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  tenantIdIdx: index('branding_audit_log_tenant_id_idx').on(table.tenantId),
  resourceIdx: index('branding_audit_log_resource_idx').on(table.resourceType, table.resourceId),
  performedAtIdx: index('branding_audit_log_performed_at_idx').on(table.performedAt),
  performedByIdx: index('branding_audit_log_performed_by_idx').on(table.performedBy),
}));

// Type exports for Drizzle inference
export type BrandingTheme = typeof brandingThemes.$inferSelect;
export type InsertBrandingTheme = typeof brandingThemes.$inferInsert;

export type BrandingAsset = typeof brandingAssets.$inferSelect;
export type InsertBrandingAsset = typeof brandingAssets.$inferInsert;

export type BrandingDomain = typeof brandingDomains.$inferSelect;
export type InsertBrandingDomain = typeof brandingDomains.$inferInsert;

export type BrandingAuditLogEntry = typeof brandingAuditLog.$inferSelect;
export type InsertBrandingAuditLogEntry = typeof brandingAuditLog.$inferInsert;
