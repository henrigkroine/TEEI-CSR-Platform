-- ClickHouse Schema for FinOps Cost Explorer
-- Cost tracking, aggregations, and forecasting

USE teei_analytics;

-- Main cost_facts table
-- Daily cost records per tenant, category, and subcategory
CREATE TABLE IF NOT EXISTS cost_facts (
  id UUID DEFAULT generateUUIDv4(),
  tenant_id String,
  day Date,
  category LowCardinality(String), -- AI, COMPUTE, STORAGE, EXPORT, EGRESS
  subcategory String, -- model name, service type, etc.
  region LowCardinality(Nullable(String)), -- us-east-1, eu-west-1, etc.
  service LowCardinality(Nullable(String)), -- reporting, analytics, q2q-ai, etc.
  amount Decimal(18, 6),
  currency LowCardinality(String) DEFAULT 'USD',
  metadata String DEFAULT '{}', -- JSON metadata (tokens, bytes, etc.)
  created_at DateTime DEFAULT now(),
  updated_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(updated_at)
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day, category, subcategory)
SETTINGS index_granularity = 8192;

-- Index for faster tenant queries
CREATE INDEX IF NOT EXISTS idx_cost_facts_tenant ON cost_facts (tenant_id) TYPE bloom_filter GRANULARITY 4;

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_cost_facts_category ON cost_facts (category) TYPE set(0) GRANULARITY 4;

-- Index for service filtering
CREATE INDEX IF NOT EXISTS idx_cost_facts_service ON cost_facts (service) TYPE bloom_filter GRANULARITY 4;

-- Materialized view for daily cost aggregations by tenant and category
CREATE MATERIALIZED VIEW IF NOT EXISTS cost_daily_by_category_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day, category)
AS SELECT
  tenant_id,
  day,
  category,
  sum(amount) AS total_amount,
  count() AS record_count,
  currency
FROM cost_facts
GROUP BY tenant_id, day, category, currency;

-- Materialized view for daily cost aggregations by tenant and subcategory (model, service type)
CREATE MATERIALIZED VIEW IF NOT EXISTS cost_daily_by_subcategory_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day, category, subcategory)
AS SELECT
  tenant_id,
  day,
  category,
  subcategory,
  sum(amount) AS total_amount,
  count() AS record_count,
  currency
FROM cost_facts
GROUP BY tenant_id, day, category, subcategory, currency;

-- Materialized view for daily cost aggregations by tenant and region
CREATE MATERIALIZED VIEW IF NOT EXISTS cost_daily_by_region_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day, region)
AS SELECT
  tenant_id,
  day,
  region,
  sum(amount) AS total_amount,
  count() AS record_count,
  currency
FROM cost_facts
WHERE region IS NOT NULL
GROUP BY tenant_id, day, region, currency;

-- Materialized view for daily cost aggregations by tenant and service
CREATE MATERIALIZED VIEW IF NOT EXISTS cost_daily_by_service_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day, service)
AS SELECT
  tenant_id,
  day,
  service,
  sum(amount) AS total_amount,
  count() AS record_count,
  currency
FROM cost_facts
WHERE service IS NOT NULL
GROUP BY tenant_id, day, service, currency;

-- Materialized view for weekly cost aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS cost_weekly_mv
ENGINE = SummingMergeTree()
PARTITION BY toYear(week_start)
ORDER BY (tenant_id, week_start, category)
AS SELECT
  tenant_id,
  toMonday(day) AS week_start,
  category,
  sum(amount) AS total_amount,
  count() AS record_count,
  currency
FROM cost_facts
GROUP BY tenant_id, week_start, category, currency;

-- Materialized view for monthly cost aggregations
CREATE MATERIALIZED VIEW IF NOT EXISTS cost_monthly_mv
ENGINE = SummingMergeTree()
PARTITION BY toYear(month_start)
ORDER BY (tenant_id, month_start, category)
AS SELECT
  tenant_id,
  toStartOfMonth(day) AS month_start,
  category,
  sum(amount) AS total_amount,
  count() AS record_count,
  currency
FROM cost_facts
GROUP BY tenant_id, month_start, category, currency;

-- Table for storing cost anomalies
CREATE TABLE IF NOT EXISTS cost_anomalies (
  id UUID DEFAULT generateUUIDv4(),
  tenant_id String,
  day Date,
  category LowCardinality(String),
  subcategory String,
  expected_amount Decimal(18, 6),
  actual_amount Decimal(18, 6),
  deviation_percentage Decimal(10, 2), -- Percentage deviation
  severity LowCardinality(String), -- low, medium, high
  currency LowCardinality(String) DEFAULT 'USD',
  detected_at DateTime DEFAULT now(),
  acknowledged Boolean DEFAULT false,
  acknowledged_at Nullable(DateTime),
  acknowledged_by Nullable(String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day, severity, category)
SETTINGS index_granularity = 8192;

-- Index for anomaly queries
CREATE INDEX IF NOT EXISTS idx_anomalies_tenant ON cost_anomalies (tenant_id) TYPE bloom_filter GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_anomalies_severity ON cost_anomalies (severity) TYPE set(0) GRANULARITY 4;

-- Table for AI token usage (detailed telemetry)
-- This feeds into cost_facts via aggregation
CREATE TABLE IF NOT EXISTS ai_token_telemetry (
  id UUID DEFAULT generateUUIDv4(),
  tenant_id String,
  request_id String,
  model LowCardinality(String),
  region LowCardinality(String),
  service LowCardinality(String), -- reporting, analytics, q2q-ai
  input_tokens UInt32,
  output_tokens UInt32,
  total_tokens UInt32,
  cost_usd Decimal(10, 6),
  latency_ms UInt32,
  user_id Nullable(String),
  metadata String DEFAULT '{}', -- JSON metadata
  timestamp DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, timestamp, model)
SETTINGS index_granularity = 8192;

-- Index for token telemetry queries
CREATE INDEX IF NOT EXISTS idx_token_telemetry_tenant ON ai_token_telemetry (tenant_id) TYPE bloom_filter GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_token_telemetry_model ON ai_token_telemetry (model) TYPE set(0) GRANULARITY 4;
CREATE INDEX IF NOT EXISTS idx_token_telemetry_service ON ai_token_telemetry (service) TYPE set(0) GRANULARITY 4;

-- Materialized view for daily AI token aggregation (feeds cost_facts)
CREATE MATERIALIZED VIEW IF NOT EXISTS ai_token_daily_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day, model, service)
AS SELECT
  tenant_id,
  toDate(timestamp) AS day,
  'AI' AS category,
  model AS subcategory,
  region,
  service,
  sum(cost_usd) AS total_cost_usd,
  sum(input_tokens) AS total_input_tokens,
  sum(output_tokens) AS total_output_tokens,
  count() AS request_count,
  avg(latency_ms) AS avg_latency_ms
FROM ai_token_telemetry
GROUP BY tenant_id, day, model, region, service;

-- Table for compute usage telemetry
CREATE TABLE IF NOT EXISTS compute_telemetry (
  id UUID DEFAULT generateUUIDv4(),
  tenant_id String,
  job_id String,
  service LowCardinality(String),
  region LowCardinality(String),
  instance_type LowCardinality(String),
  runtime_seconds UInt32,
  cost_usd Decimal(10, 6),
  timestamp DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, timestamp, service)
SETTINGS index_granularity = 8192;

-- Materialized view for daily compute aggregation (feeds cost_facts)
CREATE MATERIALIZED VIEW IF NOT EXISTS compute_daily_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day, service)
AS SELECT
  tenant_id,
  toDate(timestamp) AS day,
  'COMPUTE' AS category,
  instance_type AS subcategory,
  region,
  service,
  sum(cost_usd) AS total_cost_usd,
  sum(runtime_seconds) AS total_runtime_seconds,
  count() AS job_count
FROM compute_telemetry
GROUP BY tenant_id, day, instance_type, region, service;

-- Table for storage usage telemetry
CREATE TABLE IF NOT EXISTS storage_telemetry (
  id UUID DEFAULT generateUUIDv4(),
  tenant_id String,
  storage_type LowCardinality(String), -- s3, ebs, rds
  region LowCardinality(String),
  bytes_stored UInt64,
  cost_usd Decimal(10, 6),
  snapshot_date Date,
  created_at DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(created_at)
PARTITION BY toYYYYMM(snapshot_date)
ORDER BY (tenant_id, snapshot_date, storage_type)
SETTINGS index_granularity = 8192;

-- Materialized view for daily storage aggregation (feeds cost_facts)
CREATE MATERIALIZED VIEW IF NOT EXISTS storage_daily_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(snapshot_date)
ORDER BY (tenant_id, snapshot_date, storage_type)
AS SELECT
  tenant_id,
  snapshot_date AS day,
  'STORAGE' AS category,
  storage_type AS subcategory,
  region,
  sum(cost_usd) AS total_cost_usd,
  sum(bytes_stored) AS total_bytes_stored
FROM storage_telemetry
GROUP BY tenant_id, snapshot_date, storage_type, region;

-- Table for export usage telemetry
CREATE TABLE IF NOT EXISTS export_telemetry (
  id UUID DEFAULT generateUUIDv4(),
  tenant_id String,
  export_type LowCardinality(String), -- pdf, csv, pptx
  report_type LowCardinality(String), -- quarterly, annual, etc.
  file_size_bytes UInt32,
  cost_usd Decimal(10, 6),
  timestamp DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, timestamp, export_type)
SETTINGS index_granularity = 8192;

-- Materialized view for daily export aggregation (feeds cost_facts)
CREATE MATERIALIZED VIEW IF NOT EXISTS export_daily_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day, export_type)
AS SELECT
  tenant_id,
  toDate(timestamp) AS day,
  'EXPORT' AS category,
  export_type AS subcategory,
  sum(cost_usd) AS total_cost_usd,
  count() AS export_count,
  sum(file_size_bytes) AS total_bytes
FROM export_telemetry
GROUP BY tenant_id, day, export_type;

-- Table for egress/network telemetry
CREATE TABLE IF NOT EXISTS egress_telemetry (
  id UUID DEFAULT generateUUIDv4(),
  tenant_id String,
  source_region LowCardinality(String),
  destination_region LowCardinality(String),
  bytes_transferred UInt64,
  cost_usd Decimal(10, 6),
  timestamp DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(timestamp)
ORDER BY (tenant_id, timestamp, source_region)
SETTINGS index_granularity = 8192;

-- Materialized view for daily egress aggregation (feeds cost_facts)
CREATE MATERIALIZED VIEW IF NOT EXISTS egress_daily_mv
ENGINE = SummingMergeTree()
PARTITION BY toYYYYMM(day)
ORDER BY (tenant_id, day, source_region, destination_region)
AS SELECT
  tenant_id,
  toDate(timestamp) AS day,
  'EGRESS' AS category,
  concat(source_region, '->', destination_region) AS subcategory,
  source_region AS region,
  sum(cost_usd) AS total_cost_usd,
  sum(bytes_transferred) AS total_bytes_transferred
FROM egress_telemetry
GROUP BY tenant_id, day, source_region, destination_region;

-- Sync status for FinOps ingestion
CREATE TABLE IF NOT EXISTS finops_sync_status (
  table_name LowCardinality(String),
  last_synced_at DateTime,
  last_synced_day Date,
  records_synced UInt64,
  sync_timestamp DateTime DEFAULT now()
) ENGINE = ReplacingMergeTree(sync_timestamp)
ORDER BY (table_name);
