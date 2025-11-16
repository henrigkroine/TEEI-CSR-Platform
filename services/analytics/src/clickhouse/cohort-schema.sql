-- ClickHouse Cohort Schema for Privacy-Preserving Benchmarking
-- Implements k-anonymity and differential privacy for TEEI Analytics Platform

USE teei_analytics;

-- ============================================================================
-- Cohort Definition Tables
-- ============================================================================

-- Cohort definitions: Named groups with dimension-based filters
-- Used to create custom benchmark comparison groups
CREATE TABLE IF NOT EXISTS cohort_definitions (
  id UUID,
  name String,
  description String,
  dimensions_json String, -- JSON: {"industry": "technology", "region": "uk", "employeeRange": "50-200"}
  created_by UUID,
  created_at DateTime,
  updated_at DateTime,
  is_public Boolean DEFAULT false,
  version UInt32 DEFAULT 1
) ENGINE = ReplacingMergeTree(version)
PARTITION BY toYYYYMM(created_at)
ORDER BY (id, version)
SETTINGS index_granularity = 8192;

-- Cohort memberships: Companies that belong to each cohort
-- Used for k-anonymity enforcement (must have ≥k members)
CREATE TABLE IF NOT EXISTS cohort_memberships (
  cohort_id UUID,
  company_id UUID,
  joined_at DateTime,
  auto_assigned Boolean DEFAULT true, -- True if auto-assigned by dimensions, false if manually added
  version UInt32 DEFAULT 1
) ENGINE = ReplacingMergeTree(version)
PARTITION BY toYYYYMM(joined_at)
ORDER BY (cohort_id, company_id, version)
SETTINGS index_granularity = 8192;

-- Index for fast cohort size lookups (k-anonymity checks)
-- Allows efficient COUNT(*) queries by cohort_id
CREATE INDEX idx_cohort_memberships_cohort ON cohort_memberships(cohort_id) TYPE minmax GRANULARITY 4;

-- Index for company membership lookups
CREATE INDEX idx_cohort_memberships_company ON cohort_memberships(company_id) TYPE minmax GRANULARITY 4;

-- Cohort opt-in tracking (replicated from PostgreSQL)
-- Companies must explicitly consent to share their data in benchmarks
CREATE TABLE IF NOT EXISTS cohort_opt_ins (
  company_id UUID,
  data_sharing_consent Boolean,
  consent_date DateTime,
  consent_scope String, -- 'all', 'industry_only', 'region_only', 'custom'
  updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY company_id
SETTINGS index_granularity = 8192;

-- ============================================================================
-- Materialized Views for Cohort Metrics
-- ============================================================================

-- Daily cohort metrics aggregation with differential privacy support
-- Pre-computes statistics for fast benchmark queries
CREATE MATERIALIZED VIEW IF NOT EXISTS cohort_metrics_daily_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (cohort_id, date, metric_name)
AS SELECT
  cm.cohort_id,
  toDate(os.created_at) AS date,
  os.dimension AS metric_name,
  avg(os.score) AS avg_value,
  quantile(0.10)(os.score) AS p10_value,
  quantile(0.50)(os.score) AS p50_value,
  quantile(0.90)(os.score) AS p90_value,
  count() AS record_count,
  uniq(os.company_id) AS company_count, -- For k-anonymity validation
  stddevPop(os.score) AS stddev_value,
  min(os.score) AS min_value,
  max(os.score) AS max_value
FROM outcome_scores_ch AS os
INNER JOIN cohort_memberships AS cm ON os.company_id = cm.company_id
INNER JOIN cohort_opt_ins AS co ON os.company_id = co.company_id
WHERE co.data_sharing_consent = true
GROUP BY cm.cohort_id, date, os.dimension;

-- Weekly cohort metrics for longer-term trends
CREATE MATERIALIZED VIEW IF NOT EXISTS cohort_metrics_weekly_mv
ENGINE = SummingMergeTree()
PARTITION BY toYear(week_start)
ORDER BY (cohort_id, week_start, metric_name)
AS SELECT
  cm.cohort_id,
  toStartOfWeek(os.created_at) AS week_start,
  os.dimension AS metric_name,
  avg(os.score) AS avg_value,
  quantile(0.10)(os.score) AS p10_value,
  quantile(0.50)(os.score) AS p50_value,
  quantile(0.90)(os.score) AS p90_value,
  count() AS record_count,
  uniq(os.company_id) AS company_count
FROM outcome_scores_ch AS os
INNER JOIN cohort_memberships AS cm ON os.company_id = cm.company_id
INNER JOIN cohort_opt_ins AS co ON os.company_id = co.company_id
WHERE co.data_sharing_consent = true
GROUP BY cm.cohort_id, week_start, os.dimension;

-- Monthly cohort metrics for executive reporting
CREATE MATERIALIZED VIEW IF NOT EXISTS cohort_metrics_monthly_mv
ENGINE = SummingMergeTree()
PARTITION BY toYear(month_start)
ORDER BY (cohort_id, month_start, metric_name)
AS SELECT
  cm.cohort_id,
  toStartOfMonth(os.created_at) AS month_start,
  os.dimension AS metric_name,
  avg(os.score) AS avg_value,
  quantile(0.10)(os.score) AS p10_value,
  quantile(0.50)(os.score) AS p50_value,
  quantile(0.90)(os.score) AS p90_value,
  count() AS record_count,
  uniq(os.company_id) AS company_count
FROM outcome_scores_ch AS os
INNER JOIN cohort_memberships AS cm ON os.company_id = cm.company_id
INNER JOIN cohort_opt_ins AS co ON os.company_id = co.company_id
WHERE co.data_sharing_consent = true
GROUP BY cm.cohort_id, month_start, os.dimension;

-- ============================================================================
-- Pre-computed Cohort Dimension Views
-- ============================================================================

-- Industry cohorts (auto-generated from company metadata)
CREATE MATERIALIZED VIEW IF NOT EXISTS industry_cohorts_mv
ENGINE = ReplacingMergeTree()
ORDER BY (industry, company_id)
AS SELECT
  c.industry,
  c.id AS company_id,
  now() AS joined_at
FROM companies_ch AS c
WHERE c.industry != ''
  AND c.id IN (SELECT company_id FROM cohort_opt_ins WHERE data_sharing_consent = true);

-- Region cohorts (auto-generated from company metadata)
CREATE MATERIALIZED VIEW IF NOT EXISTS region_cohorts_mv
ENGINE = ReplacingMergeTree()
ORDER BY (country, company_id)
AS SELECT
  c.country,
  c.id AS company_id,
  now() AS joined_at
FROM companies_ch AS c
WHERE c.country != ''
  AND c.id IN (SELECT company_id FROM cohort_opt_ins WHERE data_sharing_consent = true);

-- Size cohorts (auto-generated from company metadata)
CREATE MATERIALIZED VIEW IF NOT EXISTS size_cohorts_mv
ENGINE = ReplacingMergeTree()
ORDER BY (employee_size, company_id)
AS SELECT
  c.employee_size,
  c.id AS company_id,
  now() AS joined_at
FROM companies_ch AS c
WHERE c.employee_size != ''
  AND c.id IN (SELECT company_id FROM cohort_opt_ins WHERE data_sharing_consent = true);

-- ============================================================================
-- Privacy Audit Log
-- ============================================================================

-- Track when cohort data is accessed (for audit trail)
CREATE TABLE IF NOT EXISTS cohort_access_log (
  cohort_id UUID,
  requesting_company_id UUID,
  accessed_at DateTime,
  query_hash String, -- Hash of query parameters for deduplication
  k_anonymity_passed Boolean,
  dp_noise_applied Boolean,
  suppressed Boolean, -- True if data was suppressed due to k-anonymity
  record_count UInt32,
  company_count UInt32
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(accessed_at)
ORDER BY (cohort_id, accessed_at)
TTL accessed_at + INTERVAL 90 DAY -- Retain for 90 days for compliance
SETTINGS index_granularity = 8192;

-- ============================================================================
-- Helper Queries (Reference for API implementation)
-- ============================================================================

-- Example: Get cohort size for k-anonymity check
-- SELECT count(*) AS size FROM cohort_memberships WHERE cohort_id = ?

-- Example: Get cohort metrics with k-anonymity filter
-- SELECT * FROM cohort_metrics_daily_mv
-- WHERE cohort_id = ? AND company_count >= 5

-- Example: Get industry benchmark with DP noise (apply in application layer)
-- SELECT
--   avg_value, p10_value, p50_value, p90_value, company_count
-- FROM cohort_metrics_daily_mv
-- WHERE cohort_id = ? AND date >= ? AND date <= ?
-- HAVING company_count >= 5
