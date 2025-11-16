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

/**
 * NLQ Adjudication Reviews - Human-in-the-Loop (HIL) review and approval workflow
 * Tracks manual review of NLQ outputs for quality assurance and model improvement
 */
export const adjudicationReviews = pgTable('adjudication_reviews', {
  id: uuid('id').defaultRandom().primaryKey(),
  queryId: uuid('query_id').notNull().references(() => nlqQueries.id),
  companyId: uuid('company_id').notNull().references(() => companies.id),

  // Review decision
  decision: varchar('decision', { length: 20 }).notNull(), // approved, revised, rejected
  reviewedBy: uuid('reviewed_by').notNull(), // User ID who reviewed
  reviewedAt: timestamp('reviewed_at', { withTimezone: true }).defaultNow().notNull(),

  // Revision details (if decision = 'revised')
  originalAnswer: text('original_answer'), // Original AI-generated answer
  revisedAnswer: text('revised_answer'), // Human-revised answer
  revisionReason: text('revision_reason'), // Why revision was needed
  revisionType: varchar('revision_type', { length: 50 }), // factual_error, tone, clarity, completeness

  // Feedback for model improvement
  confidenceRating: integer('confidence_rating'), // 1-5 scale
  accuracyRating: integer('accuracy_rating'), // 1-5 scale
  clarityRating: integer('clarity_rating'), // 1-5 scale
  feedbackComments: text('feedback_comments'),

  // Routing to insights (if approved/revised)
  routedToInsights: boolean('routed_to_insights').default(false),
  insightId: uuid('insight_id'), // Reference to copilot_insights.id

  // Prompt versioning
  promptVersionBefore: varchar('prompt_version_before', { length: 50 }), // Prompt version that generated original
  promptVersionAfter: varchar('prompt_version_after', { length: 50 }), // New prompt version if revised

  // Metadata
  reviewTimeMs: integer('review_time_ms'), // Time spent reviewing
  metadata: jsonb('metadata'), // Additional context

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Fairness Metrics - Track demographic parity and equality metrics for NLQ outputs
 * Monitors for bias and disparate impact across protected attributes
 */
export const fairnessMetrics = pgTable('fairness_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),
  companyId: uuid('company_id').notNull().references(() => companies.id),

  // Metric period
  metricDate: timestamp('metric_date', { withTimezone: true }).notNull(),
  periodType: varchar('period_type', { length: 20 }).notNull(), // daily, weekly, monthly

  // Metric type
  metricType: varchar('metric_type', { length: 50 }).notNull(), // demographic_parity, equal_opportunity, equalized_odds
  protectedAttribute: varchar('protected_attribute', { length: 50 }).notNull(), // gender, ethnicity, age_group, etc.

  // Demographic groups
  groupA: varchar('group_a', { length: 100 }).notNull(), // e.g., 'female'
  groupB: varchar('group_b', { length: 100 }).notNull(), // e.g., 'male'

  // Metric values
  groupAValue: decimal('group_a_value', { precision: 6, scale: 4 }).notNull(), // Metric value for group A
  groupBValue: decimal('group_b_value', { precision: 6, scale: 4 }).notNull(), // Metric value for group B
  disparityRatio: decimal('disparity_ratio', { precision: 6, scale: 4 }).notNull(), // groupA / groupB
  absoluteDifference: decimal('absolute_difference', { precision: 6, scale: 4 }).notNull(), // |groupA - groupB|

  // Statistical significance
  sampleSizeA: integer('sample_size_a').notNull(),
  sampleSizeB: integer('sample_size_b').notNull(),
  pValue: decimal('p_value', { precision: 6, scale: 4 }), // Statistical significance
  confidenceInterval: jsonb('confidence_interval'), // {lower, upper}

  // Alert thresholds
  thresholdExceeded: boolean('threshold_exceeded').default(false), // >10% disparity
  alertSeverity: varchar('alert_severity', { length: 20 }), // low, medium, high, critical
  alertTriggered: boolean('alert_triggered').default(false),
  alertedAt: timestamp('alerted_at', { withTimezone: true }),

  // Context
  queryCategory: varchar('query_category', { length: 100 }), // Type of queries analyzed
  sampleQueries: jsonb('sample_queries'), // Array of query IDs in sample

  // Mitigation
  mitigationRequired: boolean('mitigation_required').default(false),
  mitigationStatus: varchar('mitigation_status', { length: 50 }), // pending, in_progress, resolved
  mitigationNotes: text('mitigation_notes'),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * NLQ Prompt Versions - Version control for NLQ prompts with canary rollout support
 * Enables A/B testing and gradual rollout of prompt improvements
 */
export const nlqPromptVersions = pgTable('nlq_prompt_versions', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Version identification
  versionId: varchar('version_id', { length: 50 }).notNull().unique(), // e.g., 'nlq-intent-v1.2.0'
  versionName: varchar('version_name', { length: 100 }).notNull(), // Human-readable name
  description: text('description').notNull(),

  // Prompt content
  promptType: varchar('prompt_type', { length: 50 }).notNull(), // intent_classification, query_generation, answer_synthesis
  promptTemplate: text('prompt_template').notNull(), // Full prompt template
  promptHash: varchar('prompt_hash', { length: 64 }).notNull(), // SHA-256 for integrity

  // Model configuration
  modelProvider: varchar('model_provider', { length: 50 }).notNull(), // anthropic, openai
  modelName: varchar('model_name', { length: 100 }).notNull(), // claude-3-5-sonnet-20241022
  temperature: decimal('temperature', { precision: 3, scale: 2 }).default('0.0'),
  maxTokens: integer('max_tokens').default(1000),

  // Rollout configuration
  rolloutStatus: varchar('rollout_status', { length: 50 }).notNull(), // draft, canary, active, deprecated
  canaryPercentage: integer('canary_percentage').default(0), // 0-100, percentage of traffic

  // Performance metrics
  avgF1Score: decimal('avg_f1_score', { precision: 4, scale: 3 }), // Model F1 score
  avgLatencyMs: integer('avg_latency_ms'), // p95 latency
  avgCostUsd: decimal('avg_cost_usd', { precision: 8, scale: 6 }), // Cost per query
  acceptanceRate: decimal('acceptance_rate', { precision: 4, scale: 3 }), // HIL acceptance rate

  // Evaluation results
  evalRunId: uuid('eval_run_id'), // Reference to evalRuns table if applicable
  evalResults: jsonb('eval_results'), // {f1, precision, recall, examples}

  // Canary success criteria
  promotionCriteria: jsonb('promotion_criteria'), // {minF1, maxLatency, minAcceptance}
  rollbackCriteria: jsonb('rollback_criteria'), // {maxF1Drop, maxLatencyIncrease}

  // Lifecycle
  activatedAt: timestamp('activated_at', { withTimezone: true }),
  deprecatedAt: timestamp('deprecated_at', { withTimezone: true }),
  createdBy: uuid('created_by').notNull(),

  // Metadata
  tags: jsonb('tags'), // ['performance', 'accuracy', 'cost-optimization']
  changeLog: text('change_log'), // What changed from previous version

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
});

/**
 * Query Performance Metrics - Track cost and latency by query signature
 * Enables performance monitoring and optimization at query pattern level
 */
export const queryPerformanceMetrics = pgTable('query_performance_metrics', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Query signature (normalized pattern)
  querySignature: varchar('query_signature', { length: 255 }).notNull(), // Hash of query pattern
  templateId: uuid('template_id').references(() => nlqTemplates.id),
  intentType: varchar('intent_type', { length: 100 }).notNull(),

  // Time window
  metricDate: timestamp('metric_date', { withTimezone: true }).notNull(),
  windowType: varchar('window_type', { length: 20 }).notNull(), // hourly, daily, weekly

  // Volume metrics
  queryCount: integer('query_count').notNull().default(0),
  uniqueCompanies: integer('unique_companies').notNull().default(0),
  uniqueUsers: integer('unique_users').notNull().default(0),

  // Latency metrics (milliseconds)
  latencyP50: integer('latency_p50'),
  latencyP95: integer('latency_p95'),
  latencyP99: integer('latency_p99'),
  latencyMin: integer('latency_min'),
  latencyMax: integer('latency_max'),
  latencyAvg: integer('latency_avg'),

  // Cost metrics
  totalCostUsd: decimal('total_cost_usd', { precision: 10, scale: 6 }).notNull().default('0'),
  avgCostUsd: decimal('avg_cost_usd', { precision: 8, scale: 6 }),
  totalTokens: integer('total_tokens').notNull().default(0),
  avgTokens: integer('avg_tokens'),

  // Cache metrics
  cacheHits: integer('cache_hits').default(0),
  cacheMisses: integer('cache_misses').default(0),
  cacheHitRate: decimal('cache_hit_rate', { precision: 4, scale: 3 }),

  // Quality metrics
  avgConfidence: decimal('avg_confidence', { precision: 4, scale: 3 }),
  safetyViolations: integer('safety_violations').default(0),
  errorCount: integer('error_count').default(0),
  errorRate: decimal('error_rate', { precision: 4, scale: 3 }),

  // Success metrics
  successCount: integer('success_count').default(0),
  successRate: decimal('success_rate', { precision: 4, scale: 3 }),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});
