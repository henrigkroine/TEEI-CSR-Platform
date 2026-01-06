-- Migration: 0014_add_nlq_indexes
-- Description: Add performance indexes for NLQ query execution and caching
-- Created: 2025-11-16
-- Dependencies: NLQ schema tables (nlq_queries, nlq_templates, nlq_safety_checks, nlq_cache_entries)

-- ============================================================
-- NLQ Queries Table Indexes
-- ============================================================

-- Index for company-based query lookups (most common access pattern)
CREATE INDEX IF NOT EXISTS idx_nlq_queries_company_created
ON nlq_queries(company_id, created_at DESC);

-- Index for cache key lookups (fast cache retrieval)
CREATE INDEX IF NOT EXISTS idx_nlq_queries_cache_key
ON nlq_queries(cache_key)
WHERE cache_key IS NOT NULL;

-- Index for execution status queries (monitoring/debugging)
CREATE INDEX IF NOT EXISTS idx_nlq_queries_execution_status
ON nlq_queries(execution_status, created_at DESC);

-- Index for template-based analytics
CREATE INDEX IF NOT EXISTS idx_nlq_queries_template_id
ON nlq_queries(template_id, created_at DESC)
WHERE template_id IS NOT NULL;

-- Index for safety validation tracking
CREATE INDEX IF NOT EXISTS idx_nlq_queries_safety_passed
ON nlq_queries(safety_passed, created_at DESC);

-- Index for user session tracking
CREATE INDEX IF NOT EXISTS idx_nlq_queries_session_id
ON nlq_queries(session_id, created_at DESC)
WHERE session_id IS NOT NULL;

-- ============================================================
-- NLQ Templates Table Indexes
-- ============================================================

-- Index for template name lookups (unique, but explicit index for performance)
CREATE INDEX IF NOT EXISTS idx_nlq_templates_name
ON nlq_templates(template_name);

-- Index for active template queries
CREATE INDEX IF NOT EXISTS idx_nlq_templates_active_category
ON nlq_templates(active, category)
WHERE active = true;

-- Index for template version tracking
CREATE INDEX IF NOT EXISTS idx_nlq_templates_version
ON nlq_templates(template_name, version DESC);

-- ============================================================
-- NLQ Safety Checks Table Indexes
-- ============================================================

-- Index for query ID foreign key lookups
CREATE INDEX IF NOT EXISTS idx_nlq_safety_checks_query_id
ON nlq_safety_checks(query_id);

-- Index for safety violation analysis
CREATE INDEX IF NOT EXISTS idx_nlq_safety_checks_passed
ON nlq_safety_checks(overall_passed, checked_at DESC);

-- Index for alert tracking
CREATE INDEX IF NOT EXISTS idx_nlq_safety_checks_alert_triggered
ON nlq_safety_checks(alert_triggered, checked_at DESC)
WHERE alert_triggered = true;

-- Index for violation severity queries
CREATE INDEX IF NOT EXISTS idx_nlq_safety_checks_severity
ON nlq_safety_checks(violation_severity, checked_at DESC)
WHERE violation_severity IN ('high', 'critical');

-- ============================================================
-- NLQ Cache Entries Table Indexes
-- ============================================================

-- Index for cache key lookups (primary access pattern)
-- Note: cache_key already has unique constraint, but explicit index helps

-- Index for cache expiration cleanup
CREATE INDEX IF NOT EXISTS idx_nlq_cache_entries_expires_at
ON nlq_cache_entries(expires_at)
WHERE invalidated = false;

-- Index for cache hit tracking
CREATE INDEX IF NOT EXISTS idx_nlq_cache_entries_last_hit
ON nlq_cache_entries(last_hit_at DESC)
WHERE invalidated = false;

-- Index for cache cleanup (invalidated entries)
CREATE INDEX IF NOT EXISTS idx_nlq_cache_entries_invalidated
ON nlq_cache_entries(invalidated, created_at DESC)
WHERE invalidated = true;

-- ============================================================
-- NLQ Rate Limits Table Indexes
-- ============================================================

-- Index for company rate limit lookups
-- Note: company_id already has unique constraint

-- Index for rate limit reset tracking
CREATE INDEX IF NOT EXISTS idx_nlq_rate_limits_daily_reset
ON nlq_rate_limits(daily_reset_at);

CREATE INDEX IF NOT EXISTS idx_nlq_rate_limits_hourly_reset
ON nlq_rate_limits(hourly_reset_at);

-- Index for violation monitoring
CREATE INDEX IF NOT EXISTS idx_nlq_rate_limits_exceeded
ON nlq_rate_limits(limit_exceeded_count DESC, last_limit_exceeded_at DESC)
WHERE limit_exceeded_count > 0;

-- ============================================================
-- Comments for Query Optimization
-- ============================================================

COMMENT ON INDEX idx_nlq_queries_company_created IS
'Optimizes most common query pattern: fetching company queries by recency';

COMMENT ON INDEX idx_nlq_queries_cache_key IS
'Enables sub-millisecond cache key lookups (p95 target: <2.5s includes cache check)';

COMMENT ON INDEX idx_nlq_templates_active_category IS
'Supports fast template discovery for active templates by category';

COMMENT ON INDEX idx_nlq_safety_checks_severity IS
'Enables fast security monitoring for high/critical violations';

COMMENT ON INDEX idx_nlq_cache_entries_expires_at IS
'Supports efficient background cache cleanup jobs';

-- ============================================================
-- Maintenance Notes
-- ============================================================

-- These indexes support the following query patterns:
-- 1. Cache lookups: idx_nlq_queries_cache_key + idx_nlq_cache_entries_expires_at
-- 2. Company dashboards: idx_nlq_queries_company_created
-- 3. Safety monitoring: idx_nlq_safety_checks_severity + idx_nlq_safety_checks_alert_triggered
-- 4. Template management: idx_nlq_templates_active_category
-- 5. Rate limiting: idx_nlq_rate_limits_exceeded
--
-- Performance targets:
-- - Cache key lookup: <5ms
-- - Company query list (50 rows): <50ms
-- - Safety violation scan: <100ms
-- - Template discovery: <10ms
