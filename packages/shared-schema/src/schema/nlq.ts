import { pgTable, uuid, varchar, timestamp, integer, jsonb, text, boolean, decimal } from 'drizzle-orm/pg-core';
import { companies } from './users.js';

/**
 * NLQ Query Log - Complete audit trail for natural language queries
 * Tracks intent classification, query generation, safety checks, and lineage
 */
export const nlqQueries = pgTable('nlq_queries', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),

  // User input
  rawQuestion: text('raw_question').notNull(), // Original NL question
  normalizedQuestion: text('normalized_question'), // Cleaned/normalized version
  language: varchar('language', { length: 10 }).default('en'), // en, uk, no, etc.

  // Intent classification
  detectedIntent: varchar('detected_intent', { length: 100 }).notNull(), // get_metric, compare_cohorts, trend_analysis
  extractedSlots: jsonb('extracted_slots').notNull(), // {metric, timeRange, groupBy, filters}
  intentConfidence: decimal('intent_confidence', { precision: 4, scale: 3 }), // 0.000-1.000

  // Template matching
  templateId: uuid('template_id').references(() => nlqTemplates.id),
  templateName: varchar('template_name', { length: 100 }), // e.g., sroi_quarterly, vis_monthly

  // Generated query
  generatedSql: text('generated_sql'), // SQL for PostgreSQL
  generatedChql: text('generated_chql'), // ClickHouse Query Language
  queryPreview: text('query_preview'), // Human-readable query explanation

  // Safety validation
  safetyCheckId: uuid('safety_check_id').references(() => nlqSafetyChecks.id),
  safetyPassed: boolean('safety_passed').notNull().default(false),
  safetyViolations: jsonb('safety_violations'), // Array of violation codes

  // Execution metadata
  executionStatus: varchar('execution_status', { length: 50 }).notNull(), // pending, success, failed, rejected
  resultRowCount: integer('result_row_count'),
  executionTimeMs: integer('execution_time_ms'),

  // Answer metadata
  answerConfidence: decimal('answer_confidence', { precision: 4, scale: 3 }), // 0.000-1.000
  answerSummary: text('answer_summary'), // AI-generated summary of results
  lineagePointers: jsonb('lineage_pointers'), // Array of source data references

  // Model information
  modelName: varchar('model_name', { length: 100 }), // claude-3-5-sonnet, gpt-4-turbo
  providerName: varchar('provider_name', { length: 50 }), // anthropic, openai
  tokensUsed: integer('tokens_used'),
  estimatedCostUsd: varchar('estimated_cost_usd', { length: 20 }),

  // Rate limiting & caching
  cached: boolean('cached').default(false),
  cacheKey: varchar('cache_key', { length: 64 }), // SHA-256 hash of normalized query

  // Request tracking
  requestId: varchar('request_id', { length: 100 }),
  userId: uuid('user_id'),
  sessionId: varchar('session_id', { length: 100 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * NLQ Metric Templates - Allow-listed metric templates for safe query generation
 * Only metrics in this catalog can be queried via NLQ
 */
export const nlqTemplates = pgTable('nlq_templates', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Template identification
  templateName: varchar('template_name', { length: 100 }).notNull().unique(),
  displayName: varchar('display_name', { length: 200 }).notNull(), // User-facing name
  description: text('description').notNull(),
  category: varchar('category', { length: 50 }).notNull(), // impact, financial, engagement, outcomes

  // SQL templates
  sqlTemplate: text('sql_template').notNull(), // Parameterized SQL with {{placeholders}}
  chqlTemplate: text('chql_template'), // ClickHouse version if different

  // Allowed parameters
  allowedTimeRanges: jsonb('allowed_time_ranges').notNull(), // ['last_30d', 'last_quarter', 'ytd', 'custom']
  allowedGroupBy: jsonb('allowed_group_by'), // ['program', 'location', 'demographic']
  allowedFilters: jsonb('allowed_filters'), // Schema for valid filter combinations
  maxTimeWindowDays: integer('max_time_window_days').default(365), // Hard cap on time range

  // Security constraints
  requiresTenantFilter: boolean('requires_tenant_filter').default(true), // Enforce companyId filter
  allowedJoins: jsonb('allowed_joins'), // List of safe table joins
  deniedColumns: jsonb('denied_columns'), // PII columns to exclude

  // Performance hints
  estimatedComplexity: varchar('estimated_complexity', { length: 20 }), // low, medium, high
  maxResultRows: integer('max_result_rows').default(1000),
  cacheTtlSeconds: integer('cache_ttl_seconds').default(3600), // 1 hour default

  // Metadata
  exampleQuestions: jsonb('example_questions'), // Array of sample NL questions
  relatedTemplates: jsonb('related_templates'), // IDs of related templates
  tags: jsonb('tags'), // ['sroi', 'outcomes', 'volunteers']

  // Governance
  active: boolean('active').default(true),
  version: integer('version').default(1),
  createdBy: uuid('created_by'),
  approvedBy: uuid('approved_by'),
  approvedAt: timestamp('approved_at', { withTimezone: true }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * NLQ Safety Checks - 12-point validation audit trail
 * Records all safety checks performed on queries before execution
 */
export const nlqSafetyChecks = pgTable('nlq_safety_checks', {
  id: uuid('id').defaultRandom().primaryKey(),
  queryId: uuid('query_id').references(() => nlqQueries.id),

  // 12-point safety validation
  checkResults: jsonb('check_results').notNull(), // Array of {check, passed, details}
  /**
   * Standard checks:
   * 1. sql_injection - No malicious SQL patterns
   * 2. table_whitelist - Only allowed tables accessed
   * 3. column_whitelist - No PII columns accessed
   * 4. time_window_limit - Respects max time range
   * 5. tenant_isolation - Enforces companyId filter
   * 6. join_safety - Only allowed joins
   * 7. function_whitelist - Only safe SQL functions
   * 8. row_limit - Respects max result rows
   * 9. nested_query_depth - Max 3 levels of nesting
   * 10. union_injection - No UNION-based injection
   * 11. comment_stripping - No SQL comments
   * 12. exfiltration_pattern - No data exfiltration attempts
   */

  overallPassed: boolean('overall_passed').notNull(),
  violationCodes: jsonb('violation_codes'), // Array of failed check codes
  violationSeverity: varchar('violation_severity', { length: 20 }), // low, medium, high, critical

  // Detection metadata
  detectionMethod: varchar('detection_method', { length: 50 }), // regex, ast_parse, llm_validate
  falsePositiveScore: decimal('false_positive_score', { precision: 4, scale: 3 }), // Confidence in violation

  // Audit trail
  checkedAt: timestamp('checked_at', { withTimezone: true }).defaultNow().notNull(),
  checkedBy: varchar('checked_by', { length: 100 }), // system, admin
  alertTriggered: boolean('alert_triggered').default(false),
});

/**
 * NLQ Cache Entries - Redis-backed cache for performance
 * Tracks cache hits, TTLs, and invalidation for p95 ≤2.5s performance
 */
export const nlqCacheEntries = pgTable('nlq_cache_entries', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Cache key (SHA-256 of normalized query + params)
  cacheKey: varchar('cache_key', { length: 64 }).notNull().unique(),
  normalizedQuery: text('normalized_query').notNull(),
  queryParams: jsonb('query_params'), // {companyId, timeRange, filters}

  // Cache metadata
  resultData: jsonb('result_data'), // Cached query results
  resultHash: varchar('result_hash', { length: 64 }), // Integrity check
  hitCount: integer('hit_count').default(0),
  lastHitAt: timestamp('last_hit_at', { withTimezone: true }),

  // TTL management
  ttlSeconds: integer('ttl_seconds').default(3600),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  invalidated: boolean('invalidated').default(false),
  invalidatedReason: varchar('invalidated_reason', { length: 200 }),

  // Performance tracking
  avgExecutionTimeMs: integer('avg_execution_time_ms'),
  cacheGenerationTimeMs: integer('cache_generation_time_ms'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * NLQ Rate Limits - Per-tenant query rate limiting
 * Prevents abuse and ensures fair resource allocation
 */
export const nlqRateLimits = pgTable('nlq_rate_limits', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id).unique(),

  // Quota configuration
  dailyQueryLimit: integer('daily_query_limit').default(500), // 500 queries/day default
  hourlyQueryLimit: integer('hourly_query_limit').default(50), // 50 queries/hour burst
  concurrentQueryLimit: integer('concurrent_query_limit').default(5), // Max 5 concurrent

  // Current usage
  queriesUsedToday: integer('queries_used_today').default(0),
  queriesUsedThisHour: integer('queries_used_this_hour').default(0),
  currentConcurrent: integer('current_concurrent').default(0),

  // Reset tracking
  dailyResetAt: timestamp('daily_reset_at', { withTimezone: true }).notNull(),
  hourlyResetAt: timestamp('hourly_reset_at', { withTimezone: true }).notNull(),

  // Violation tracking
  limitExceededCount: integer('limit_exceeded_count').default(0),
  lastLimitExceededAt: timestamp('last_limit_exceeded_at', { withTimezone: true }),

  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});
