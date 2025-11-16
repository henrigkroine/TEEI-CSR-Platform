import { pgTable, uuid, varchar, timestamp, index } from 'drizzle-orm/pg-core';

/**
 * Company regions table - maps companies to their data residency region
 */
export const companyRegions = pgTable(
  'company_regions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyId: uuid('company_id').notNull().unique(),
    region: varchar('region', { length: 20 }).notNull(), // 'eu-central-1' | 'us-east-1'
    residencyType: varchar('residency_type', { length: 10 }).notNull(), // 'strict' | 'flexible'
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    companyIdIdx: index('company_regions_company_id_idx').on(table.companyId),
    regionIdx: index('company_regions_region_idx').on(table.region),
    residencyTypeIdx: index('company_regions_residency_type_idx').on(table.residencyType),
  })
);

/**
 * Residency audit logs - track all residency validation checks
 * No PII stored - company_id is hashed
 */
export const residencyAuditLogs = pgTable(
  'residency_audit_logs',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    companyIdHash: varchar('company_id_hash', { length: 64 }).notNull(), // SHA-256 hash
    requestedRegion: varchar('requested_region', { length: 20 }).notNull(),
    assignedRegion: varchar('assigned_region', { length: 20 }).notNull(),
    residencyType: varchar('residency_type', { length: 10 }).notNull(),
    allowed: varchar('allowed', { length: 5 }).notNull(), // 'true' | 'false' (stored as string for query efficiency)
    operation: varchar('operation', { length: 100 }),
    requestId: varchar('request_id', { length: 100 }),
    timestamp: timestamp('timestamp', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => ({
    timestampIdx: index('residency_audit_logs_timestamp_idx').on(table.timestamp),
    allowedIdx: index('residency_audit_logs_allowed_idx').on(table.allowed),
    companyHashIdx: index('residency_audit_logs_company_hash_idx').on(table.companyIdHash),
  })
);

export type CompanyRegion = typeof companyRegions.$inferSelect;
export type NewCompanyRegion = typeof companyRegions.$inferInsert;
export type ResidencyAuditLog = typeof residencyAuditLogs.$inferSelect;
export type NewResidencyAuditLog = typeof residencyAuditLogs.$inferInsert;
