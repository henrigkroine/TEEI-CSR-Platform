-- ClickHouse Schema for TEEI Analytics Platform
-- High-performance time-series analytics with materialized views

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS teei_analytics;
USE teei_analytics;

-- Main outcome_scores table (replicated from Postgres)
-- Optimized for time-series analytics queries
CREATE TABLE IF NOT EXISTS outcome_scores_ch (
  id UUID,
  user_id UUID,
  company_id UUID,
  text_id UUID,
  text_type String,
  dimension LowCardinality(String),  -- confidence, belonging, lang_level_proxy, job_readiness, well_being
  score Float32,                      -- 0.0 to 1.0
  confidence Float32,
  model_version LowCardinality(String),
  created_at DateTime
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(created_at)
ORDER BY (company_id, created_at, dimension)
SETTINGS index_granularity = 8192;

-- Materialized view for daily trends
-- Pre-aggregated data for fast trend queries
CREATE MATERIALIZED VIEW IF NOT EXISTS outcome_scores_daily_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (company_id, date, dimension)
AS SELECT
  company_id,
  toDate(created_at) AS date,
  dimension,
  avg(score) AS avg_score,
  sum(score) AS sum_score,
  count() AS score_count,
  min(score) AS min_score,
  max(score) AS max_score,
  stddevPop(score) AS stddev_score
FROM outcome_scores_ch
GROUP BY company_id, date, dimension;

-- Materialized view for weekly aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS outcome_scores_weekly_mv
ENGINE = SummingMergeTree()
PARTITION BY toYear(week_start)
ORDER BY (company_id, week_start, dimension)
AS SELECT
  company_id,
  toStartOfWeek(created_at) AS week_start,
  dimension,
  avg(score) AS avg_score,
  sum(score) AS sum_score,
  count() AS score_count,
  min(score) AS min_score,
  max(score) AS max_score
FROM outcome_scores_ch
GROUP BY company_id, week_start, dimension;

-- Materialized view for monthly aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS outcome_scores_monthly_mv
ENGINE = SummingMergeTree()
PARTITION BY toYear(month_start)
ORDER BY (company_id, month_start, dimension)
AS SELECT
  company_id,
  toStartOfMonth(created_at) AS month_start,
  dimension,
  avg(score) AS avg_score,
  sum(score) AS sum_score,
  count() AS score_count,
  min(score) AS min_score,
  max(score) AS max_score
FROM outcome_scores_ch
GROUP BY company_id, month_start, dimension;

-- User engagement events table for funnel analysis
CREATE TABLE IF NOT EXISTS user_events_ch (
  id UUID,
  user_id UUID,
  company_id UUID,
  event_type LowCardinality(String), -- enrolled, matched, session_completed, program_completed
  program_type LowCardinality(String), -- buddy, language, mentorship, upskilling
  event_timestamp DateTime,
  metadata String -- JSON metadata
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(event_timestamp)
ORDER BY (company_id, user_id, event_timestamp)
SETTINGS index_granularity = 8192;

-- Materialized view for user journey aggregations (for funnels)
CREATE MATERIALIZED VIEW IF NOT EXISTS user_journey_mv
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (company_id, date, program_type)
AS SELECT
  company_id,
  toDate(event_timestamp) AS date,
  program_type,
  uniqState(user_id) AS unique_users,
  countState() AS event_count,
  uniqStateIf(user_id, event_type = 'enrolled') AS enrolled_count,
  uniqStateIf(user_id, event_type = 'matched') AS matched_count,
  uniqStateIf(user_id, event_type = 'session_completed') AS session_count,
  uniqStateIf(user_id, event_type = 'program_completed') AS completed_count
FROM user_events_ch
GROUP BY company_id, date, program_type;

-- Company metadata for benchmarking (lightweight reference data)
CREATE TABLE IF NOT EXISTS companies_ch (
  id UUID,
  name String,
  industry LowCardinality(String),
  country LowCardinality(String),
  employee_size LowCardinality(String), -- small, medium, large, enterprise
  created_at DateTime
) ENGINE = ReplacingMergeTree()
ORDER BY id;

-- Materialized view for industry benchmarks
CREATE MATERIALIZED VIEW IF NOT EXISTS industry_benchmarks_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (industry, date, dimension)
AS SELECT
  c.industry,
  toDate(os.created_at) AS date,
  os.dimension,
  avg(os.score) AS avg_score,
  count() AS score_count,
  quantile(0.5)(os.score) AS median_score,
  quantile(0.25)(os.score) AS p25_score,
  quantile(0.75)(os.score) AS p75_score
FROM outcome_scores_ch AS os
LEFT JOIN companies_ch AS c ON os.company_id = c.id
WHERE c.industry != ''
GROUP BY c.industry, date, os.dimension;

-- Materialized view for region benchmarks
CREATE MATERIALIZED VIEW IF NOT EXISTS region_benchmarks_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (country, date, dimension)
AS SELECT
  c.country,
  toDate(os.created_at) AS date,
  os.dimension,
  avg(os.score) AS avg_score,
  count() AS score_count,
  quantile(0.5)(os.score) AS median_score
FROM outcome_scores_ch AS os
LEFT JOIN companies_ch AS c ON os.company_id = c.id
WHERE c.country != ''
GROUP BY c.country, date, os.dimension;

-- Materialized view for size cohort benchmarks
CREATE MATERIALIZED VIEW IF NOT EXISTS size_benchmarks_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (employee_size, date, dimension)
AS SELECT
  c.employee_size,
  toDate(os.created_at) AS date,
  os.dimension,
  avg(os.score) AS avg_score,
  count() AS score_count,
  quantile(0.5)(os.score) AS median_score
FROM outcome_scores_ch AS os
LEFT JOIN companies_ch AS c ON os.company_id = c.id
WHERE c.employee_size != ''
GROUP BY c.employee_size, date, os.dimension;

-- Sync status table to track ingestion progress
CREATE TABLE IF NOT EXISTS sync_status (
  table_name LowCardinality(String),
  last_synced_at DateTime,
  last_synced_id UUID,
  records_synced UInt64,
  sync_timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(sync_timestamp)
ORDER BY (table_name);
