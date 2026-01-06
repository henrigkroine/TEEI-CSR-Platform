import { pgTable, uuid, varchar, timestamp, jsonb, pgEnum, integer, text, index, decimal, boolean, date, type AnyPgColumn } from 'drizzle-orm/pg-core';
import { companies, users } from './users.js';

/**
 * Organizations (top-level entities that own hierarchies)
 * An organization represents a group/parent company that contains multiple units
 */
export const orgs = pgTable('orgs', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  currency: varchar('currency', { length: 3 }).notNull().default('USD'), // ISO 4217 currency code
  ownerUserId: uuid('owner_user_id').notNull().references(() => users.id),
  logoUrl: varchar('logo_url', { length: 500 }),
  theme: jsonb('theme').default({}), // Whitelabel theme settings
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  ownerIdx: index('idx_orgs_owner').on(table.ownerUserId),
  activeIdx: index('idx_orgs_active').on(table.active),
}));

/**
 * Organizational units (tree structure)
 * Represents subsidiaries, business units, departments, etc.
 */
export const orgUnits = pgTable('org_units', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  parentId: uuid('parent_id').references((): AnyPgColumn => orgUnits.id, { onDelete: 'restrict' }), // Self-referencing foreign key
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(), // e.g., "ACME-UK", "ACME-FR-NORTH"
  description: text('description'),
  currency: varchar('currency', { length: 3 }), // Optional override, inherits from org if null
  active: boolean('active').notNull().default(true),
  metadata: jsonb('metadata').default({}), // Additional custom fields
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('idx_org_units_org').on(table.orgId),
  parentIdx: index('idx_org_units_parent').on(table.parentId),
  codeIdx: index('idx_org_units_code').on(table.code),
  activeIdx: index('idx_org_units_active').on(table.active),
  orgParentIdx: index('idx_org_units_org_parent').on(table.orgId, table.parentId),
}));

/**
 * Organizational unit members (mapping to tenants/companies)
 * Links TEEI tenants (companies) to org units with ownership percentages
 */
export const orgUnitMembers = pgTable('org_unit_members', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgUnitId: uuid('org_unit_id').notNull().references(() => orgUnits.id, { onDelete: 'cascade' }),
  tenantId: uuid('tenant_id').notNull().references(() => companies.id), // Reference to existing companies
  percentShare: decimal('percent_share', { precision: 5, scale: 2 }).notNull(), // 0.00 to 100.00
  startDate: date('start_date').notNull(),
  endDate: date('end_date'), // Optional, for time-bound memberships
  metadata: jsonb('metadata').default({}),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  unitIdx: index('idx_org_unit_members_unit').on(table.orgUnitId),
  tenantIdx: index('idx_org_unit_members_tenant').on(table.tenantId),
  unitTenantIdx: index('idx_org_unit_members_unit_tenant').on(table.orgUnitId, table.tenantId),
}));

/**
 * Elimination rule types
 */
export const eliminationRuleTypeEnum = pgEnum('elimination_rule_type', [
  'EVENT_SOURCE',      // Eliminate events from specific source
  'TENANT_PAIR',       // Eliminate inter-company transactions between specific tenant pairs
  'MANUAL',            // Manual elimination pattern
  'TAG_BASED',         // Eliminate based on event tags
]);

/**
 * Elimination rules (prevent double-counting in consolidation)
 */
export const eliminationRules = pgTable('elimination_rules', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  name: varchar('name', { length: 255 }).notNull(),
  ruleType: eliminationRuleTypeEnum('rule_type').notNull(),
  patternJson: jsonb('pattern_json').notNull(), // Rule-specific pattern data
  description: text('description'),
  active: boolean('active').notNull().default(true),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgIdx: index('idx_elimination_rules_org').on(table.orgId),
  typeIdx: index('idx_elimination_rules_type').on(table.ruleType),
  activeIdx: index('idx_elimination_rules_active').on(table.active),
}));

/**
 * Consolidation adjustments (manual corrections)
 */
export const consolAdjustments = pgTable('consol_adjustments', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  period: date('period').notNull(), // Period start date (e.g., 2024-Q1 = 2024-01-01)
  metric: varchar('metric', { length: 100 }).notNull(), // e.g., 'sroi', 'vis', 'volunteer_hours'
  amountLocal: decimal('amount_local', { precision: 18, scale: 4 }).notNull(), // In local currency
  amountBase: decimal('amount_base', { precision: 18, scale: 4 }).notNull(), // In org base currency
  currency: varchar('currency', { length: 3 }).notNull(),
  note: text('note').notNull(), // Mandatory explanation
  orgUnitId: uuid('org_unit_id').references(() => orgUnits.id), // Optional: adjustment specific to unit
  version: integer('version').notNull().default(1), // Immutable versioning
  published: boolean('published').notNull().default(false), // Once published, immutable
  publishedAt: timestamp('published_at', { withTimezone: true }),
  publishedBy: uuid('published_by').references(() => users.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata').default({}),
}, (table) => ({
  orgPeriodIdx: index('idx_consol_adjustments_org_period').on(table.orgId, table.period),
  metricIdx: index('idx_consol_adjustments_metric').on(table.metric),
  publishedIdx: index('idx_consol_adjustments_published').on(table.published),
  createdByIdx: index('idx_consol_adjustments_created_by').on(table.createdBy),
}));

/**
 * Adjustment audit trail
 */
export const consolAdjustmentAudit = pgTable('consol_adjustment_audit', {
  id: uuid('id').defaultRandom().primaryKey(),
  adjustmentId: uuid('adjustment_id').notNull().references(() => consolAdjustments.id, { onDelete: 'cascade' }),
  action: varchar('action', { length: 50 }).notNull(), // 'created', 'updated', 'published', 'deleted'
  changes: jsonb('changes'), // What changed
  performedBy: uuid('performed_by').notNull().references(() => users.id),
  performedAt: timestamp('performed_at', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata').default({}),
}, (table) => ({
  adjustmentIdx: index('idx_consol_adjustment_audit_adjustment').on(table.adjustmentId),
  performedAtIdx: index('idx_consol_adjustment_audit_performed_at').on(table.performedAt),
}));

/**
 * FX rates (foreign exchange rates for consolidation)
 */
export const fxRates = pgTable('fx_rates', {
  id: uuid('id').defaultRandom().primaryKey(),
  day: date('day').notNull(), // Rate date
  base: varchar('base', { length: 3 }).notNull(), // Base currency (ISO 4217)
  quote: varchar('quote', { length: 3 }).notNull(), // Quote currency (ISO 4217)
  rate: decimal('rate', { precision: 18, scale: 8 }).notNull(), // Exchange rate
  source: varchar('source', { length: 100 }).default('manual'), // 'manual', 'ecb', 'fed', etc.
  createdBy: uuid('created_by').references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  dayBaseQuoteIdx: index('idx_fx_rates_day_base_quote').on(table.day, table.base, table.quote),
  dayIdx: index('idx_fx_rates_day').on(table.day),
  baseQuoteIdx: index('idx_fx_rates_base_quote').on(table.base, table.quote),
}));

/**
 * Consolidation facts (rolled-up metrics)
 * Stores the final consolidated metrics per period, org unit, and metric
 */
export const consolFacts = pgTable('consol_facts', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  orgUnitId: uuid('org_unit_id').notNull().references(() => orgUnits.id, { onDelete: 'cascade' }),
  period: date('period').notNull(), // Period start (e.g., 2024-01-01 for Q1)
  metric: varchar('metric', { length: 100 }).notNull(), // 'sroi', 'vis', 'volunteer_hours', 'donations', etc.
  valueLocal: decimal('value_local', { precision: 18, scale: 4 }).notNull(), // Value in local currency
  valueBase: decimal('value_base', { precision: 18, scale: 4 }).notNull(), // Value in org base currency
  currency: varchar('currency', { length: 3 }).notNull(), // Local currency
  fxRate: decimal('fx_rate', { precision: 18, scale: 8 }), // FX rate used for conversion
  eliminated: decimal('eliminated', { precision: 18, scale: 4 }).default('0.0000'), // Amount eliminated
  adjusted: decimal('adjusted', { precision: 18, scale: 4 }).default('0.0000'), // Manual adjustment
  runId: uuid('run_id'), // Link to consolidation run
  calculatedAt: timestamp('calculated_at', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata').default({}), // Additional context
}, (table) => ({
  orgPeriodIdx: index('idx_consol_facts_org_period').on(table.orgId, table.period),
  unitPeriodMetricIdx: index('idx_consol_facts_unit_period_metric').on(table.orgUnitId, table.period, table.metric),
  metricIdx: index('idx_consol_facts_metric').on(table.metric),
  runIdx: index('idx_consol_facts_run').on(table.runId),
}));

/**
 * Consolidation run status
 */
export const consolRunStatusEnum = pgEnum('consol_run_status', [
  'pending',
  'running',
  'completed',
  'failed',
]);

/**
 * Consolidation runs (audit trail of consolidation executions)
 */
export const consolRuns = pgTable('consol_runs', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  period: date('period').notNull(),
  scope: jsonb('scope'), // Which org units to include
  status: consolRunStatusEnum('status').notNull().default('pending'),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  errorMessage: text('error_message'),
  stats: jsonb('stats').default({}), // { unitsProcessed, metricsCalculated, eliminationsApplied, adjustmentsApplied }
  triggeredBy: uuid('triggered_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orgPeriodIdx: index('idx_consol_runs_org_period').on(table.orgId, table.period),
  statusIdx: index('idx_consol_runs_status').on(table.status),
  triggeredByIdx: index('idx_consol_runs_triggered_by').on(table.triggeredBy),
}));

/**
 * Hierarchy change audit log
 */
export const hierarchyAudit = pgTable('hierarchy_audit', {
  id: uuid('id').defaultRandom().primaryKey(),
  orgId: uuid('org_id').notNull().references(() => orgs.id, { onDelete: 'cascade' }),
  entityType: varchar('entity_type', { length: 50 }).notNull(), // 'org', 'org_unit', 'org_unit_member', 'elimination_rule'
  entityId: uuid('entity_id').notNull(),
  action: varchar('action', { length: 50 }).notNull(), // 'created', 'updated', 'deleted', 'activated', 'deactivated'
  changes: jsonb('changes'), // What changed (before/after)
  performedBy: uuid('performed_by').notNull().references(() => users.id),
  performedAt: timestamp('performed_at', { withTimezone: true }).defaultNow().notNull(),
  metadata: jsonb('metadata').default({}),
}, (table) => ({
  orgIdx: index('idx_hierarchy_audit_org').on(table.orgId),
  entityIdx: index('idx_hierarchy_audit_entity').on(table.entityType, table.entityId),
  performedAtIdx: index('idx_hierarchy_audit_performed_at').on(table.performedAt),
}));
