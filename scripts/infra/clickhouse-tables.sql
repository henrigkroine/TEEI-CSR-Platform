-- ClickHouse Replicated Tables Configuration
-- TEEI CSR Platform - Multi-Region Analytics
-- Regions: US (3 shards, 2 replicas), EU (2 shards, 2 replicas)

-- ============================================================================
-- 1. RAW EVENTS TABLE (ReplicatedMergeTree)
-- ============================================================================
-- Stores all platform events with 90-day TTL for GDPR compliance
-- Sharded by company_id for even distribution

CREATE TABLE IF NOT EXISTS events_local ON CLUSTER teei_global_cluster
(
    event_id UUID,
    company_id UUID,
    user_id UUID,
    event_type LowCardinality(String),
    event_category LowCardinality(String),
    timestamp DateTime64(3, 'UTC'),
    region LowCardinality(String),
    payload String,
    metadata Map(String, String),
    created_at DateTime DEFAULT now()
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{region}/{shard}/events', '{replica}')
PARTITION BY toYYYYMM(timestamp)
ORDER BY (company_id, event_type, timestamp)
TTL timestamp + INTERVAL 90 DAY DELETE
SETTINGS
    index_granularity = 8192,
    merge_with_ttl_timeout = 3600;

-- Distributed table for global queries
CREATE TABLE IF NOT EXISTS events_distributed ON CLUSTER teei_global_cluster AS events_local
ENGINE = Distributed(teei_global_cluster, default, events_local, cityHash64(company_id));

COMMENT ON TABLE events_distributed 'Global distributed events table - auto-routes to correct shard/region';


-- ============================================================================
-- 2. USER ACTIVITY LOGS (ReplicatedMergeTree)
-- ============================================================================
-- Tracks user interactions with 90-day TTL

CREATE TABLE IF NOT EXISTS user_activity_local ON CLUSTER teei_global_cluster
(
    activity_id UUID,
    user_id UUID,
    company_id UUID,
    session_id String,
    action_type LowCardinality(String),
    page_url String,
    timestamp DateTime64(3, 'UTC'),
    region LowCardinality(String),
    ip_address IPv4,
    user_agent String,
    metadata Map(String, String)
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{region}/{shard}/user_activity', '{replica}')
PARTITION BY toYYYYMM(timestamp)
ORDER BY (company_id, user_id, timestamp)
TTL timestamp + INTERVAL 90 DAY DELETE
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS user_activity_distributed ON CLUSTER teei_global_cluster AS user_activity_local
ENGINE = Distributed(teei_global_cluster, default, user_activity_local, cityHash64(company_id));


-- ============================================================================
-- 3. METRICS AGGREGATES (Region-specific TTL)
-- ============================================================================
-- Pre-aggregated metrics with different retention: US=7 years, EU=2 years

CREATE TABLE IF NOT EXISTS metrics_company_period_local ON CLUSTER teei_global_cluster
(
    company_id UUID,
    period_start DateTime,
    period_end DateTime,
    region LowCardinality(String),
    metric_name LowCardinality(String),
    metric_value Float64,
    metric_count UInt64,
    metadata Map(String, String),
    created_at DateTime DEFAULT now()
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{region}/{shard}/metrics_company_period', '{replica}')
PARTITION BY toYear(period_start)
ORDER BY (company_id, metric_name, period_start)
-- Expression-based TTL: EU=2 years (730 days), US=7 years (2555 days)
TTL created_at + INTERVAL
    CASE
        WHEN region = 'eu-central-1' THEN 730
        ELSE 2555
    END DAY DELETE
SETTINGS
    index_granularity = 8192,
    merge_with_ttl_timeout = 86400;

CREATE TABLE IF NOT EXISTS metrics_company_period_distributed ON CLUSTER teei_global_cluster AS metrics_company_period_local
ENGINE = Distributed(teei_global_cluster, default, metrics_company_period_local, cityHash64(company_id));


-- ============================================================================
-- 4. SROI CALCULATIONS (Long-term retention)
-- ============================================================================
-- Social Return on Investment calculations with region-specific TTL

CREATE TABLE IF NOT EXISTS sroi_calculations_local ON CLUSTER teei_global_cluster
(
    calculation_id UUID,
    company_id UUID,
    program_id UUID,
    calculation_date DateTime,
    region LowCardinality(String),
    sroi_ratio Float64,
    total_investment Decimal64(2),
    total_impact Decimal64(2),
    methodology LowCardinality(String),
    confidence_level Float32,
    metadata Map(String, String),
    created_at DateTime DEFAULT now()
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{region}/{shard}/sroi_calculations', '{replica}')
PARTITION BY toYear(calculation_date)
ORDER BY (company_id, calculation_date, program_id)
TTL created_at + INTERVAL
    CASE
        WHEN region = 'eu-central-1' THEN 730
        ELSE 2555
    END DAY DELETE
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS sroi_calculations_distributed ON CLUSTER teei_global_cluster AS sroi_calculations_local
ENGINE = Distributed(teei_global_cluster, default, sroi_calculations_local, cityHash64(company_id));


-- ============================================================================
-- 5. VOLUNTEER IMPACT SCORES (Long-term retention)
-- ============================================================================
-- VIS scores with region-specific retention

CREATE TABLE IF NOT EXISTS vis_scores_local ON CLUSTER teei_global_cluster
(
    score_id UUID,
    company_id UUID,
    volunteer_id UUID,
    program_id UUID,
    score_date DateTime,
    region LowCardinality(String),
    vis_score Float64,
    hours_contributed UInt32,
    impact_category LowCardinality(String),
    skill_level LowCardinality(String),
    metadata Map(String, String),
    created_at DateTime DEFAULT now()
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{region}/{shard}/vis_scores', '{replica}')
PARTITION BY toYear(score_date)
ORDER BY (company_id, volunteer_id, score_date)
TTL created_at + INTERVAL
    CASE
        WHEN region = 'eu-central-1' THEN 730
        ELSE 2555
    END DAY DELETE
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS vis_scores_distributed ON CLUSTER teei_global_cluster AS vis_scores_local
ENGINE = Distributed(teei_global_cluster, default, vis_scores_local, cityHash64(company_id));


-- ============================================================================
-- 6. MATERIALIZED VIEWS FOR REAL-TIME AGGREGATION
-- ============================================================================

-- Hourly event counts by type
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_hourly_event_counts_local ON CLUSTER teei_global_cluster
ENGINE = ReplicatedSummingMergeTree('/clickhouse/tables/{region}/{shard}/mv_hourly_event_counts', '{replica}')
PARTITION BY toYYYYMM(hour)
ORDER BY (company_id, event_type, hour)
TTL hour + INTERVAL 90 DAY DELETE
POPULATE
AS SELECT
    company_id,
    event_type,
    region,
    toStartOfHour(timestamp) AS hour,
    count() AS event_count
FROM events_local
GROUP BY company_id, event_type, region, hour;

-- Distributed MV view
CREATE TABLE IF NOT EXISTS mv_hourly_event_counts_distributed ON CLUSTER teei_global_cluster AS mv_hourly_event_counts_local
ENGINE = Distributed(teei_global_cluster, default, mv_hourly_event_counts_local, cityHash64(company_id));


-- Daily company metrics rollup
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_daily_company_metrics_local ON CLUSTER teei_global_cluster
ENGINE = ReplicatedSummingMergeTree('/clickhouse/tables/{region}/{shard}/mv_daily_company_metrics', '{replica}')
PARTITION BY toYYYYMM(date)
ORDER BY (company_id, metric_name, date)
TTL date + INTERVAL 730 DAY DELETE
POPULATE
AS SELECT
    company_id,
    metric_name,
    region,
    toDate(period_start) AS date,
    sum(metric_value) AS total_value,
    sum(metric_count) AS total_count,
    avg(metric_value) AS avg_value
FROM metrics_company_period_local
GROUP BY company_id, metric_name, region, date;

CREATE TABLE IF NOT EXISTS mv_daily_company_metrics_distributed ON CLUSTER teei_global_cluster AS mv_daily_company_metrics_local
ENGINE = Distributed(teei_global_cluster, default, mv_daily_company_metrics_local, cityHash64(company_id));


-- ============================================================================
-- 7. QUERY PERFORMANCE TABLE (System metrics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS query_log_local ON CLUSTER teei_global_cluster
(
    query_id String,
    user String,
    query_start_time DateTime,
    query_duration_ms UInt64,
    read_rows UInt64,
    read_bytes UInt64,
    result_rows UInt64,
    result_bytes UInt64,
    memory_usage UInt64,
    region LowCardinality(String),
    exception String
)
ENGINE = ReplicatedMergeTree('/clickhouse/tables/{region}/{shard}/query_log', '{replica}')
PARTITION BY toYYYYMM(query_start_time)
ORDER BY (query_start_time, user)
TTL query_start_time + INTERVAL 30 DAY DELETE
SETTINGS index_granularity = 8192;

CREATE TABLE IF NOT EXISTS query_log_distributed ON CLUSTER teei_global_cluster AS query_log_local
ENGINE = Distributed(teei_global_cluster, default, query_log_local, rand());


-- ============================================================================
-- INDEXES FOR QUERY OPTIMIZATION
-- ============================================================================

-- Bloom filter indexes for fast existence checks
ALTER TABLE events_local ON CLUSTER teei_global_cluster
ADD INDEX IF NOT EXISTS bloom_filter_event_type event_type TYPE bloom_filter GRANULARITY 4;

ALTER TABLE events_local ON CLUSTER teei_global_cluster
ADD INDEX IF NOT EXISTS bloom_filter_company_id company_id TYPE bloom_filter GRANULARITY 4;

ALTER TABLE user_activity_local ON CLUSTER teei_global_cluster
ADD INDEX IF NOT EXISTS bloom_filter_user_id user_id TYPE bloom_filter GRANULARITY 4;


-- ============================================================================
-- GRANTS AND PERMISSIONS
-- ============================================================================

-- Create read-only user for analytics queries
-- CREATE USER IF NOT EXISTS analytics_readonly ON CLUSTER teei_global_cluster
-- IDENTIFIED WITH sha256_password BY 'readonly_password';

-- GRANT SELECT ON default.events_distributed TO analytics_readonly ON CLUSTER teei_global_cluster;
-- GRANT SELECT ON default.metrics_company_period_distributed TO analytics_readonly ON CLUSTER teei_global_cluster;
-- GRANT SELECT ON default.sroi_calculations_distributed TO analytics_readonly ON CLUSTER teei_global_cluster;
-- GRANT SELECT ON default.vis_scores_distributed TO analytics_readonly ON CLUSTER teei_global_cluster;


-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Check table distribution across shards
-- SELECT
--     hostName(),
--     table,
--     formatReadableSize(sum(bytes)) AS size,
--     sum(rows) AS rows,
--     count() AS parts
-- FROM system.parts
-- WHERE active AND database = 'default'
-- GROUP BY hostName(), table
-- ORDER BY hostName(), table;

-- Check replication status
-- SELECT
--     database,
--     table,
--     is_leader,
--     is_readonly,
--     absolute_delay,
--     queue_size,
--     inserts_in_queue,
--     merges_in_queue
-- FROM system.replicas
-- WHERE database = 'default';
