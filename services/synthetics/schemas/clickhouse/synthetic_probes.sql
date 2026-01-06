-- Synthetic Monitoring Results Storage
-- Stores probe results from all synthetic journeys
-- Optimized for time-series queries and aggregations

-- Main table for synthetic probe results
CREATE TABLE IF NOT EXISTS synthetic_probes
(
    -- Timestamp and identification
    timestamp DateTime64(3) DEFAULT now64(3),
    probe_id UUID DEFAULT generateUUIDv4(),
    monitor_type LowCardinality(String), -- tenant-login, dashboard-load, pdf-export, etc.
    region LowCardinality(String), -- us-east-1, eu-central-1, etc.
    tenant_id String,

    -- Probe execution metrics
    success UInt8, -- 0 = failed, 1 = succeeded
    response_time_ms UInt32,
    error_message Nullable(String),

    -- HTTP metrics
    status_code Nullable(UInt16),
    dns_lookup_ms Nullable(UInt16),
    tcp_connection_ms Nullable(UInt16),
    tls_handshake_ms Nullable(UInt16),
    first_byte_ms Nullable(UInt16),
    content_transfer_ms Nullable(UInt16),

    -- Performance gates
    within_performance_gate UInt8, -- 0 = exceeded, 1 = within gate
    performance_gate_ms UInt32, -- Target threshold

    -- Additional metadata
    file_size_bytes Nullable(UInt32), -- For export monitors
    content_hash Nullable(String), -- For integrity validation
    components_count Nullable(UInt8), -- For boardroom/connectors
    components_failed Nullable(UInt8),

    -- Tags for filtering
    tags Map(String, String),

    -- Partitioning key
    date Date DEFAULT toDate(timestamp),

    -- Indexes
    INDEX idx_monitor_type monitor_type TYPE minmax GRANULARITY 8,
    INDEX idx_tenant tenant_id TYPE bloom_filter(0.01) GRANULARITY 4,
    INDEX idx_region region TYPE minmax GRANULARITY 8,
    INDEX idx_success success TYPE minmax GRANULARITY 8
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (monitor_type, region, timestamp)
TTL date + INTERVAL 90 DAY DELETE
SETTINGS index_granularity = 8192;

-- Materialized view for hourly aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS synthetic_probes_hourly
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(hour)
ORDER BY (monitor_type, region, tenant_id, hour)
TTL hour + INTERVAL 180 DAY DELETE
AS SELECT
    toStartOfHour(timestamp) AS hour,
    monitor_type,
    region,
    tenant_id,

    -- Aggregated metrics
    countIf(success = 1) AS success_count,
    countIf(success = 0) AS failure_count,
    count() AS total_probes,

    -- Response time percentiles
    quantile(0.50)(response_time_ms) AS p50_response_time,
    quantile(0.90)(response_time_ms) AS p90_response_time,
    quantile(0.95)(response_time_ms) AS p95_response_time,
    quantile(0.99)(response_time_ms) AS p99_response_time,

    -- Averages
    avg(response_time_ms) AS avg_response_time,
    avgIf(response_time_ms, success = 1) AS avg_response_time_success,

    -- Performance gate compliance
    countIf(within_performance_gate = 1) AS within_gate_count,

    -- Error tracking
    groupArray(error_message) AS error_messages
FROM synthetic_probes
GROUP BY hour, monitor_type, region, tenant_id;

-- Materialized view for daily SLO tracking
CREATE MATERIALIZED VIEW IF NOT EXISTS synthetic_probes_daily_slo
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (monitor_type, region, day)
TTL day + INTERVAL 365 DAY DELETE
AS SELECT
    toDate(timestamp) AS day,
    monitor_type,
    region,

    -- SLO metrics
    countIf(success = 1) AS success_count,
    countIf(success = 0) AS failure_count,
    count() AS total_probes,

    -- Uptime percentage
    (countIf(success = 1) * 100.0) / count() AS uptime_percentage,

    -- Performance compliance
    countIf(within_performance_gate = 1) AS within_gate_count,
    (countIf(within_performance_gate = 1) * 100.0) / count() AS gate_compliance_percentage,

    -- Response time stats
    quantile(0.95)(response_time_ms) AS p95_response_time,
    quantile(0.99)(response_time_ms) AS p99_response_time,
    max(response_time_ms) AS max_response_time,

    -- Error tracking
    countDistinct(error_message) AS distinct_errors,
    groupUniqArray(5)(error_message) AS top_errors
FROM synthetic_probes
GROUP BY day, monitor_type, region;

-- Table for synthetic probe incidents
CREATE TABLE IF NOT EXISTS synthetic_incidents
(
    incident_id UUID DEFAULT generateUUIDv4(),
    started_at DateTime64(3) DEFAULT now64(3),
    resolved_at Nullable(DateTime64(3)),

    monitor_type LowCardinality(String),
    region LowCardinality(String),
    tenant_id String,

    severity LowCardinality(String), -- critical, warning
    consecutive_failures UInt16,
    error_message String,

    -- Resolution tracking
    resolved UInt8 DEFAULT 0,
    resolution_notes Nullable(String),

    -- Metadata
    date Date DEFAULT toDate(started_at),

    INDEX idx_resolved resolved TYPE minmax GRANULARITY 4
)
ENGINE = ReplacingMergeTree(resolved_at)
PARTITION BY toYYYYMM(date)
ORDER BY (monitor_type, region, tenant_id, started_at)
TTL date + INTERVAL 90 DAY DELETE
SETTINGS index_granularity = 8192;

-- Table for connector health tracking
CREATE TABLE IF NOT EXISTS connector_health
(
    timestamp DateTime64(3) DEFAULT now64(3),
    connector_name LowCardinality(String),
    region LowCardinality(String),

    healthy UInt8,
    response_time_ms UInt32,
    status_code Nullable(UInt16),

    -- Dependency health
    database_healthy UInt8,
    redis_healthy UInt8,
    queue_healthy UInt8,
    external_api_healthy UInt8,

    -- Metadata
    version Nullable(String),
    uptime_seconds Nullable(UInt32),
    last_sync Nullable(DateTime),

    error_message Nullable(String),

    date Date DEFAULT toDate(timestamp),

    INDEX idx_connector connector_name TYPE minmax GRANULARITY 4,
    INDEX idx_healthy healthy TYPE minmax GRANULARITY 4
)
ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (connector_name, region, timestamp)
TTL date + INTERVAL 30 DAY DELETE
SETTINGS index_granularity = 8192;

-- Materialized view for connector uptime SLO
CREATE MATERIALIZED VIEW IF NOT EXISTS connector_health_daily
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (connector_name, region, day)
TTL day + INTERVAL 90 DAY DELETE
AS SELECT
    toDate(timestamp) AS day,
    connector_name,
    region,

    countIf(healthy = 1) AS healthy_count,
    countIf(healthy = 0) AS unhealthy_count,
    count() AS total_checks,

    (countIf(healthy = 1) * 100.0) / count() AS uptime_percentage,

    -- Dependency uptime
    (countIf(database_healthy = 1) * 100.0) / count() AS database_uptime,
    (countIf(redis_healthy = 1) * 100.0) / count() AS redis_uptime,
    (countIf(queue_healthy = 1) * 100.0) / count() AS queue_uptime,
    (countIf(external_api_healthy = 1) * 100.0) / count() AS external_api_uptime,

    avg(response_time_ms) AS avg_response_time,
    quantile(0.95)(response_time_ms) AS p95_response_time
FROM connector_health
GROUP BY day, connector_name, region;

-- Grant permissions (adjust user as needed)
-- GRANT SELECT, INSERT ON synthetic_probes TO synthetics_user;
-- GRANT SELECT, INSERT ON synthetic_incidents TO synthetics_user;
-- GRANT SELECT, INSERT ON connector_health TO synthetics_user;
-- GRANT SELECT ON synthetic_probes_hourly TO synthetics_user;
-- GRANT SELECT ON synthetic_probes_daily_slo TO synthetics_user;
-- GRANT SELECT ON connector_health_daily TO synthetics_user;
