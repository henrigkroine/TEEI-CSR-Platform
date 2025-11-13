-- TEEI CSR Platform - ClickHouse Analytics Schema
-- This script initializes the ClickHouse analytics data warehouse
-- Designed for time-series event storage and cohort analysis

-- ================================================
-- EVENTS TABLE - Universal event storage
-- ================================================
CREATE TABLE IF NOT EXISTS teei_analytics.events (
    event_id UUID,
    event_type String,
    company_id UUID,
    user_id Nullable(UUID),
    timestamp DateTime,
    payload String, -- JSON

    -- Indexes for fast filtering
    INDEX idx_company_id company_id TYPE minmax GRANULARITY 3,
    INDEX idx_timestamp timestamp TYPE minmax GRANULARITY 3,
    INDEX idx_event_type event_type TYPE bloom_filter(0.01) GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (company_id, timestamp)
SETTINGS index_granularity = 8192;

-- ================================================
-- METRICS TIME-SERIES TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS teei_analytics.metrics_timeseries (
    company_id UUID,
    metric_name String,
    metric_value Float64,
    period_start Date,
    timestamp DateTime,
    dimensions String, -- JSON with additional dimensions (cohort_id, program_type, etc.)

    INDEX idx_company company_id TYPE minmax GRANULARITY 3,
    INDEX idx_metric metric_name TYPE set(100) GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(period_start)
ORDER BY (company_id, metric_name, timestamp)
SETTINGS index_granularity = 8192;

-- ================================================
-- COHORT DEFINITIONS (replicated from Postgres)
-- ================================================
CREATE TABLE IF NOT EXISTS teei_analytics.cohorts (
    cohort_id UUID,
    company_id UUID,
    name String,
    description String,
    filters String, -- JSON filter criteria
    created_at DateTime,
    updated_at DateTime
) ENGINE = ReplacingMergeTree(updated_at)
ORDER BY (company_id, cohort_id)
SETTINGS index_granularity = 8192;

-- ================================================
-- USER COHORT MEMBERSHIP (many-to-many)
-- ================================================
CREATE TABLE IF NOT EXISTS teei_analytics.user_cohorts (
    user_id UUID,
    cohort_id UUID,
    company_id UUID,
    joined_at DateTime,

    INDEX idx_cohort cohort_id TYPE minmax GRANULARITY 3
) ENGINE = ReplacingMergeTree(joined_at)
ORDER BY (company_id, user_id, cohort_id)
SETTINGS index_granularity = 8192;

-- ================================================
-- MATERIALIZED VIEW: Cohort Metrics Aggregations
-- ================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS teei_analytics.cohort_metrics_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(period_start)
ORDER BY (cohort_id, metric_name, period_start)
POPULATE AS
SELECT
    uc.cohort_id as cohort_id,
    mt.metric_name as metric_name,
    mt.period_start as period_start,
    avg(mt.metric_value) as avg_value,
    count() as sample_size,
    quantile(0.5)(mt.metric_value) as p50,
    quantile(0.75)(mt.metric_value) as p75,
    quantile(0.95)(mt.metric_value) as p95,
    min(mt.metric_value) as min_value,
    max(mt.metric_value) as max_value,
    stddevPop(mt.metric_value) as std_dev
FROM teei_analytics.metrics_timeseries mt
INNER JOIN teei_analytics.user_cohorts uc
    ON mt.company_id = uc.company_id
    AND JSONExtractString(mt.dimensions, 'user_id') = toString(uc.user_id)
GROUP BY cohort_id, metric_name, period_start;

-- ================================================
-- MATERIALIZED VIEW: Daily Event Counts
-- ================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS teei_analytics.daily_event_counts_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(event_date)
ORDER BY (company_id, event_type, event_date)
AS SELECT
    company_id,
    event_type,
    toDate(timestamp) as event_date,
    count() as event_count,
    uniq(user_id) as unique_users
FROM teei_analytics.events
GROUP BY company_id, event_type, event_date;

-- ================================================
-- MATERIALIZED VIEW: Hourly Metrics Rollup
-- ================================================
CREATE MATERIALIZED VIEW IF NOT EXISTS teei_analytics.hourly_metrics_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour_start)
ORDER BY (company_id, metric_name, hour_start)
AS SELECT
    company_id,
    metric_name,
    toStartOfHour(timestamp) as hour_start,
    avg(metric_value) as avg_value,
    max(metric_value) as max_value,
    min(metric_value) as min_value,
    count() as sample_count
FROM teei_analytics.metrics_timeseries
GROUP BY company_id, metric_name, hour_start;

-- ================================================
-- TABLE: Event Processing Checkpoints
-- ================================================
CREATE TABLE IF NOT EXISTS teei_analytics.processing_checkpoints (
    consumer_name String,
    last_event_id String,
    last_processed_at DateTime,
    events_processed UInt64
) ENGINE = ReplacingMergeTree(last_processed_at)
ORDER BY consumer_name
SETTINGS index_granularity = 8192;

-- ================================================
-- TABLE: Stream Replay Cache (for SSE reconnections)
-- ================================================
CREATE TABLE IF NOT EXISTS teei_analytics.stream_replay_cache (
    event_id String,
    company_id UUID,
    event_type String,
    event_data String, -- JSON
    created_at DateTime,

    INDEX idx_company company_id TYPE minmax GRANULARITY 1
) ENGINE = MergeTree()
PARTITION BY toDate(created_at)
ORDER BY (company_id, created_at)
TTL created_at + INTERVAL 24 HOUR -- Auto-delete after 24 hours
SETTINGS index_granularity = 8192;

-- ================================================
-- Grant permissions (if using user/password)
-- ================================================
-- GRANT SELECT, INSERT ON teei_analytics.* TO teei;
