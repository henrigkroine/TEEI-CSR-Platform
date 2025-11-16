/**
 * Phase H: Insights & Self-Serve Database Schema
 *
 * Tables for NLQ v2, Builder v2, and Insights Copilot
 */

import { pgTable, uuid, text, timestamp, jsonb, real, integer, boolean, index } from 'drizzle-orm/pg-core';

/**
 * NLQ Query History
 */
export const nlqQueries = pgTable('nlq_queries', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull(),
  userId: uuid('user_id').notNull(),

  // Query details
  userQuery: text('user_query').notNull(),
  language: text('language').notNull(), // en, uk, no, ar, he
  generatedSQL: text('generated_sql').notNull(),

  // Security & validation
  guardrailsPassed: boolean('guardrails_passed').notNull(),
  violations: jsonb('violations').$type<any[]>(),
  tablesAccessed: jsonb('tables_accessed').$type<string[]>(),

  // Execution
  executedAt: timestamp('executed_at', { withTimezone: true }),
  resultCount: integer('result_count'),
  executionTimeMs: integer('execution_time_ms'),

  // Cost tracking
  provider: text('provider').notNull(), // claude, openai
  model: text('model').notNull(),
  tokensInput: integer('tokens_input').notNull(),
  tokensOutput: integer('tokens_output').notNull(),
  costUSD: real('cost_usd').notNull(),

  // Metadata
  citations: jsonb('citations').$type<any[]>(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  companyIdIdx: index('nlq_queries_company_id_idx').on(table.companyId),
  createdAtIdx: index('nlq_queries_created_at_idx').on(table.createdAt)
}));

/**
 * Canvas Definitions
 */
export const canvases = pgTable('canvases', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull(),

  // Canvas metadata
  name: text('name').notNull(),
  description: text('description'),
  tags: jsonb('tags').$type<string[]>().default([]),

  // Current version
  currentVersionId: uuid('current_version_id'),
  latestVersionNumber: integer('latest_version_number').notNull().default(1),

  // Grid configuration
  gridConfig: jsonb('grid_config').$type<{
    columns: number;
    rowHeight: number;
    gap: number;
  }>().notNull(),

  // Metadata
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  companyIdIdx: index('canvases_company_id_idx').on(table.companyId),
  createdByIdx: index('canvases_created_by_idx').on(table.createdBy)
}));

/**
 * Canvas Versions (immutable snapshots)
 */
export const canvasVersions = pgTable('canvas_versions', {
  id: uuid('id').primaryKey().defaultRandom(),
  canvasId: uuid('canvas_id').notNull(),

  // Version info
  versionNumber: integer('version_number').notNull(),
  parentVersionId: uuid('parent_version_id'),

  // Snapshot
  snapshot: jsonb('snapshot').notNull(), // Full canvas blocks + config
  snapshotHash: text('snapshot_hash').notNull(), // SHA-256 for integrity

  // Change tracking
  blocksAdded: integer('blocks_added').notNull().default(0),
  blocksModified: integer('blocks_modified').notNull().default(0),
  blocksDeleted: integer('blocks_deleted').notNull().default(0),

  // Metadata
  commitMessage: text('commit_message'),
  tags: jsonb('tags').$type<string[]>().default([]),
  createdBy: uuid('created_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  canvasIdIdx: index('canvas_versions_canvas_id_idx').on(table.canvasId),
  versionNumberIdx: index('canvas_versions_version_number_idx').on(table.versionNumber),
  createdAtIdx: index('canvas_versions_created_at_idx').on(table.createdAt)
}));

/**
 * Copilot Insights
 */
export const copilotInsights = pgTable('copilot_insights', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull(),

  // Insight details
  metric: text('metric').notNull(),
  insightType: text('insight_type').notNull(), // anomaly, trend, benchmark, forecast
  severity: text('severity').notNull(), // low, medium, high, critical

  // Anomaly data
  anomalyData: jsonb('anomaly_data').$type<{
    type: string;
    timestamp: string;
    actualValue: number;
    expectedValue: number;
    deviation: number;
    deviationPercent: number;
    description: string;
    confidence: number;
  }>(),

  // Narrative
  narrative: text('narrative'),
  citations: jsonb('citations').$type<any[]>(),

  // Cost tracking
  tokensUsed: integer('tokens_used'),
  costUSD: real('cost_usd'),

  // Metadata
  dismissed: boolean('dismissed').notNull().default(false),
  dismissedBy: uuid('dismissed_by'),
  dismissedAt: timestamp('dismissed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  companyIdIdx: index('copilot_insights_company_id_idx').on(table.companyId),
  severityIdx: index('copilot_insights_severity_idx').on(table.severity),
  createdAtIdx: index('copilot_insights_created_at_idx').on(table.createdAt)
}));

/**
 * Cost Budget Ledger
 */
export const costLedger = pgTable('cost_ledger', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull(),
  userId: uuid('user_id').notNull(),

  // Service details
  service: text('service').notNull(), // nlq, copilot, classification
  operation: text('operation').notNull(),
  provider: text('provider').notNull(), // claude, openai, gemini
  model: text('model').notNull(),

  // Token usage
  tokensInput: integer('tokens_input').notNull(),
  tokensOutput: integer('tokens_output').notNull(),
  tokensTotal: integer('tokens_total').notNull(),

  // Cost
  costUSD: real('cost_usd').notNull(),

  // Metadata
  requestId: text('request_id'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  companyIdIdx: index('cost_ledger_company_id_idx').on(table.companyId),
  serviceIdx: index('cost_ledger_service_idx').on(table.service),
  createdAtIdx: index('cost_ledger_created_at_idx').on(table.createdAt)
}));

/**
 * Tenant AI Budgets
 */
export const tenantBudgets = pgTable('tenant_budgets', {
  id: uuid('id').primaryKey().defaultRandom(),
  companyId: uuid('company_id').notNull().unique(),

  // Budget limits
  monthlyBudgetUSD: real('monthly_budget_usd').notNull().default(1000),
  dailyBudgetUSD: real('daily_budget_usd').notNull().default(50),

  // Alert thresholds
  alertThreshold50Enabled: boolean('alert_threshold_50_enabled').notNull().default(true),
  alertThreshold75Enabled: boolean('alert_threshold_75_enabled').notNull().default(true),
  alertThreshold90Enabled: boolean('alert_threshold_90_enabled').notNull().default(true),

  // Metadata
  updatedBy: uuid('updated_by'),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()
}, (table) => ({
  companyIdIdx: index('tenant_budgets_company_id_idx').on(table.companyId)
}));
