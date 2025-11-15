-- ClickHouse Sharding Strategy Configuration
-- TEEI CSR Platform - Multi-Region Data Distribution
-- US: 3 shards (60% traffic), EU: 2 shards (40% traffic)

-- ============================================================================
-- SHARDING STRATEGY OVERVIEW
-- ============================================================================
-- Goal: Even data distribution across shards with regional affinity
--
-- Sharding Key: cityHash64(company_id)
--   - Ensures all data for a company goes to the same shard
--   - Enables efficient joins and aggregations
--   - Provides balanced distribution (hash-based)
--
-- Regional Affinity:
--   - EU companies → EU cluster (GDPR data residency)
--   - US/Global companies → US cluster
--   - Use `region` field in routing logic
--
-- Distributed Tables:
--   - events_distributed: Routes to all shards (global queries)
--   - Regional routing: Application-level or materialized views
-- ============================================================================


-- ============================================================================
-- 1. SHARDING FUNCTION EXAMPLES
-- ============================================================================

-- Hash-based sharding (default for all distributed tables)
-- SELECT company_id, cityHash64(company_id) % 5 AS shard_number
-- FROM events_local
-- LIMIT 10;

-- Verify shard distribution balance
SELECT
    hostName() AS host,
    cityHash64(company_id) % 5 AS shard_number,
    count() AS row_count,
    formatReadableSize(sum(bytes)) AS total_size
FROM system.parts
WHERE table = 'events_local' AND active
GROUP BY hostName(), shard_number
ORDER BY shard_number, host;


-- ============================================================================
-- 2. REGIONAL ROUTING TABLES
-- ============================================================================
-- Application should route writes to region-specific clusters

-- EU-specific distributed table (routes only to EU cluster)
CREATE TABLE IF NOT EXISTS events_eu_distributed ON CLUSTER teei_eu_cluster AS events_local
ENGINE = Distributed(teei_eu_cluster, default, events_local, cityHash64(company_id));

-- US-specific distributed table (routes only to US cluster)
CREATE TABLE IF NOT EXISTS events_us_distributed ON CLUSTER teei_us_cluster AS events_local
ENGINE = Distributed(teei_us_cluster, default, events_local, cityHash64(company_id));

-- Similar for other tables
CREATE TABLE IF NOT EXISTS metrics_company_period_eu_distributed ON CLUSTER teei_eu_cluster AS metrics_company_period_local
ENGINE = Distributed(teei_eu_cluster, default, metrics_company_period_local, cityHash64(company_id));

CREATE TABLE IF NOT EXISTS metrics_company_period_us_distributed ON CLUSTER teei_us_cluster AS metrics_company_period_local
ENGINE = Distributed(teei_us_cluster, default, metrics_company_period_local, cityHash64(company_id));


-- ============================================================================
-- 3. COMPANY REGION MAPPING (for routing logic)
-- ============================================================================
-- Lookup table to determine which region a company's data should reside in

CREATE TABLE IF NOT EXISTS company_region_mapping_local ON CLUSTER teei_global_cluster
(
    company_id UUID,
    primary_region LowCardinality(String),  -- 'us-east-1', 'eu-central-1'
    data_residency_required Bool DEFAULT false,  -- True for GDPR-strict EU companies
    created_at DateTime DEFAULT now(),
    updated_at DateTime DEFAULT now()
)
ENGINE = ReplicatedReplacingMergeTree('/clickhouse/tables/{region}/{shard}/company_region_mapping', '{replica}', updated_at)
PARTITION BY tuple()  -- Single partition (small lookup table)
ORDER BY company_id
SETTINGS index_granularity = 8192;

-- Distributed version for global access
CREATE TABLE IF NOT EXISTS company_region_mapping_distributed ON CLUSTER teei_global_cluster AS company_region_mapping_local
ENGINE = Distributed(teei_global_cluster, default, company_region_mapping_local, cityHash64(company_id));

-- Insert sample mappings
-- INSERT INTO company_region_mapping_distributed VALUES
-- ('550e8400-e29b-41d4-a716-446655440000', 'eu-central-1', true, now(), now()),
-- ('660e8400-e29b-41d4-a716-446655440001', 'us-east-1', false, now(), now());


-- ============================================================================
-- 4. SMART ROUTING VIEWS (Application-level logic)
-- ============================================================================
-- Use these patterns in your application to route writes correctly

-- Example: Insert into correct region based on company mapping
/*
Application pseudo-code:

function insertEvent(event) {
    // Lookup company region
    const region = await getCompanyRegion(event.company_id);

    // Route to region-specific cluster
    if (region.startsWith('eu-')) {
        await clickhouse.insert('events_eu_distributed', event);
    } else {
        await clickhouse.insert('events_us_distributed', event);
    }
}
*/


-- ============================================================================
-- 5. SHARD KEY SELECTION GUIDE
-- ============================================================================

/*
Recommended shard keys by table:

1. events_local, user_activity_local:
   - Key: cityHash64(company_id)
   - Reason: All events for a company on same shard → efficient aggregations

2. metrics_company_period_local:
   - Key: cityHash64(company_id)
   - Reason: Pre-aggregated by company, keep together

3. sroi_calculations_local, vis_scores_local:
   - Key: cityHash64(company_id)
   - Reason: Company-specific metrics, no cross-company joins

4. query_log_local:
   - Key: rand()
   - Reason: Operational log, even distribution more important than locality

Alternative strategies (not recommended for this use case):
- Round-robin: cityHash64(event_id) % num_shards
- Time-based: toYYYYMM(timestamp) % num_shards (causes hotspots)
- Composite: cityHash64(company_id, toDate(timestamp))
*/


-- ============================================================================
-- 6. RESHARDING STRATEGY (Future-proofing)
-- ============================================================================
-- If you need to add more shards in the future

/*
Steps to add a new shard:
1. Add new StatefulSet pods (e.g., clickhouse-us-6, clickhouse-us-7)
2. Update clusters.xml with new shard definition
3. Create tables on new shard:
   - ON CLUSTER will auto-create on new nodes
4. Rebalance data (optional, not required with hash sharding):
   - Hash function will naturally distribute new writes
   - Old data stays on original shards (acceptable)
   - OR manually move partitions (complex, rarely needed)

Example: Adding US shard 4
<shard>
  <internal_replication>true</internal_replication>
  <replica>
    <host>clickhouse-us-6.clickhouse-us.teei-platform.svc.cluster.local</host>
    <port>9000</port>
  </replica>
  <replica>
    <host>clickhouse-us-7.clickhouse-us.teei-platform.svc.cluster.local</host>
    <port>9000</port>
  </replica>
</shard>
*/


-- ============================================================================
-- 7. CROSS-SHARD QUERIES (Performance tips)
-- ============================================================================

-- GOOD: Query single shard (includes shard key in WHERE)
SELECT count()
FROM events_distributed
WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
  AND timestamp > now() - INTERVAL 7 DAY;
-- Execution: Touches only 1 shard (where company data resides)

-- ACCEPTABLE: Aggregation across all shards
SELECT
    event_type,
    count() AS event_count
FROM events_distributed
WHERE timestamp > now() - INTERVAL 1 DAY
GROUP BY event_type;
-- Execution: Parallel query on all 5 shards, merge results

-- AVOID: Large result set without shard key
SELECT *
FROM events_distributed
WHERE timestamp > now() - INTERVAL 7 DAY
LIMIT 1000000;
-- Execution: Queries all shards, transfers large dataset


-- ============================================================================
-- 8. MONITORING SHARD BALANCE
-- ============================================================================

-- Check data distribution across shards
CREATE VIEW IF NOT EXISTS v_shard_balance AS
SELECT
    hostName() AS host,
    table,
    count() AS num_parts,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS total_size,
    formatReadableSize(avg(bytes_on_disk)) AS avg_part_size
FROM system.parts
WHERE active AND database = 'default'
GROUP BY hostName(), table
ORDER BY table, host;

-- Sample query: Check if shards are balanced
-- SELECT * FROM v_shard_balance WHERE table = 'events_local';

-- Expected output (balanced):
-- host                   | table        | total_rows | total_size
-- clickhouse-us-0        | events_local | 1000000    | 500 MiB
-- clickhouse-us-1        | events_local | 1000000    | 500 MiB
-- clickhouse-us-2        | events_local | 980000     | 490 MiB
-- clickhouse-us-3        | events_local | 1020000    | 510 MiB
-- (±5% variance is normal with hash-based sharding)


-- ============================================================================
-- 9. HOTSPOT DETECTION
-- ============================================================================

-- Identify companies causing shard hotspots (top 10 by data volume)
SELECT
    company_id,
    count() AS event_count,
    formatReadableSize(sum(length(payload))) AS total_payload_size,
    cityHash64(company_id) % 5 AS assigned_shard
FROM events_local
WHERE timestamp > now() - INTERVAL 7 DAY
GROUP BY company_id
ORDER BY event_count DESC
LIMIT 10;

-- If one company dominates a shard, consider:
-- 1. Sub-sharding by timestamp for that company
-- 2. Separate table for high-volume companies
-- 3. Rate limiting at application layer


-- ============================================================================
-- 10. REGIONAL FAILOVER STRATEGY
-- ============================================================================

-- In case of regional failure, route EU traffic to US cluster
-- (requires relaxing GDPR data residency for disaster recovery)

-- Create failover distributed table (EU → US)
-- CREATE TABLE IF NOT EXISTS events_failover_distributed AS events_local
-- ENGINE = Distributed(teei_us_cluster, default, events_local, cityHash64(company_id));

-- Application code should handle failover:
/*
try {
    await clickhouse_eu.insert('events_distributed', event);
} catch (error) {
    console.warn('EU cluster unavailable, failing over to US');
    await clickhouse_us.insert('events_failover_distributed', event);
    // Set flag to replicate back to EU when it recovers
}
*/


-- ============================================================================
-- 11. TESTING SHARD ROUTING
-- ============================================================================

-- Insert test data with known company_id
INSERT INTO events_distributed VALUES
(generateUUIDv4(), '550e8400-e29b-41d4-a716-446655440000', generateUUIDv4(), 'test_event', 'test', now(), 'eu-central-1', '{"test": true}', map(), now());

-- Verify which shard received the data
SELECT
    hostName() AS host,
    count() AS event_count
FROM events_local
WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
GROUP BY hostName();

-- Should return exactly 2 rows (both replicas of the same shard)
-- Example:
-- host            | event_count
-- clickhouse-us-0 | 1
-- clickhouse-us-1 | 1


-- ============================================================================
-- 12. BEST PRACTICES SUMMARY
-- ============================================================================

/*
DO:
✓ Always include company_id in WHERE clause for single-company queries
✓ Use region-specific distributed tables (events_eu_distributed) when possible
✓ Monitor shard balance weekly (v_shard_balance view)
✓ Test sharding with production-like data volumes
✓ Use async_insert for high-throughput writes (batching)

DON'T:
✗ Use timestamp as shard key (creates hotspots on latest shard)
✗ Run SELECT * FROM distributed tables without LIMIT
✗ Manually specify shard in queries (let ClickHouse route)
✗ Create cross-shard JOINs (slow, avoid if possible)
✗ Ignore regional data residency requirements (GDPR violation)

Performance Tips:
- Batch inserts: INSERT into distributed table with 10k+ rows per batch
- Parallel queries: ClickHouse automatically parallelizes across shards
- Local tables: For debugging, query events_local on specific node
- Distributed tables: For production queries, use events_distributed
*/
