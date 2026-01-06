-- ClickHouse TTL Policies Configuration
-- TEEI CSR Platform - GDPR & Cost Optimization
-- Region-specific retention: EU=2 years (GDPR), US=7 years (compliance)

-- ============================================================================
-- TTL POLICY OVERVIEW
-- ============================================================================
-- Raw Events:        90 days (all regions) - high-volume transient data
-- User Activity:     90 days (all regions) - GDPR compliance
-- Aggregated Metrics: EU=2 years, US=7 years - regulatory compliance
-- SROI/VIS Data:     EU=2 years, US=7 years - long-term impact tracking
-- Query Logs:        30 days (all regions) - operational monitoring
-- ============================================================================


-- ============================================================================
-- 1. RAW EVENTS TTL (90 days - GDPR compliance)
-- ============================================================================
-- Already defined in table creation, but can be modified:

ALTER TABLE events_local ON CLUSTER teei_global_cluster
MODIFY TTL timestamp + INTERVAL 90 DAY DELETE;

-- Optional: Archive to cold storage before deletion (S3/GCS)
-- ALTER TABLE events_local ON CLUSTER teei_global_cluster
-- MODIFY TTL
--     timestamp + INTERVAL 60 DAY TO DISK 'cold',
--     timestamp + INTERVAL 90 DAY DELETE;


-- ============================================================================
-- 2. USER ACTIVITY TTL (90 days - GDPR compliance)
-- ============================================================================

ALTER TABLE user_activity_local ON CLUSTER teei_global_cluster
MODIFY TTL timestamp + INTERVAL 90 DAY DELETE;

-- Optional: Anonymize PII before deletion (GDPR Article 17)
-- ALTER TABLE user_activity_local ON CLUSTER teei_global_cluster
-- MODIFY TTL
--     timestamp + INTERVAL 60 DAY TO COLUMN ip_address = '0.0.0.0',
--     timestamp + INTERVAL 90 DAY DELETE;


-- ============================================================================
-- 3. METRICS AGGREGATES TTL (Region-specific)
-- ============================================================================
-- EU: 2 years (730 days) per GDPR Article 5(1)(e)
-- US: 7 years (2555 days) per SOX/compliance requirements

ALTER TABLE metrics_company_period_local ON CLUSTER teei_global_cluster
MODIFY TTL created_at + INTERVAL
    CASE
        WHEN region = 'eu-central-1' THEN 730
        WHEN region = 'eu-west-1' THEN 730
        ELSE 2555
    END DAY DELETE;

-- Multi-tier storage (hot → warm → cold → delete)
-- ALTER TABLE metrics_company_period_local ON CLUSTER teei_global_cluster
-- MODIFY TTL
--     created_at + INTERVAL 90 DAY TO DISK 'warm',
--     created_at + INTERVAL 365 DAY TO DISK 'cold',
--     created_at + INTERVAL
--         CASE WHEN region LIKE 'eu-%' THEN 730 ELSE 2555 END DAY DELETE;


-- ============================================================================
-- 4. SROI CALCULATIONS TTL (Region-specific)
-- ============================================================================

ALTER TABLE sroi_calculations_local ON CLUSTER teei_global_cluster
MODIFY TTL created_at + INTERVAL
    CASE
        WHEN region = 'eu-central-1' THEN 730
        WHEN region = 'eu-west-1' THEN 730
        ELSE 2555
    END DAY DELETE;


-- ============================================================================
-- 5. VIS SCORES TTL (Region-specific)
-- ============================================================================

ALTER TABLE vis_scores_local ON CLUSTER teei_global_cluster
MODIFY TTL created_at + INTERVAL
    CASE
        WHEN region = 'eu-central-1' THEN 730
        WHEN region = 'eu-west-1' THEN 730
        ELSE 2555
    END DAY DELETE;


-- ============================================================================
-- 6. MATERIALIZED VIEW TTLs
-- ============================================================================

-- Hourly event counts (90 days)
ALTER TABLE mv_hourly_event_counts_local ON CLUSTER teei_global_cluster
MODIFY TTL hour + INTERVAL 90 DAY DELETE;

-- Daily company metrics (2 years - minimum retention)
ALTER TABLE mv_daily_company_metrics_local ON CLUSTER teei_global_cluster
MODIFY TTL date + INTERVAL 730 DAY DELETE;


-- ============================================================================
-- 7. QUERY LOGS TTL (30 days - operational monitoring)
-- ============================================================================

ALTER TABLE query_log_local ON CLUSTER teei_global_cluster
MODIFY TTL query_start_time + INTERVAL 30 DAY DELETE;


-- ============================================================================
-- 8. GDPR RIGHT TO ERASURE (Article 17)
-- ============================================================================
-- Immediate deletion for GDPR DSAR requests

-- Function to delete all data for a specific company (GDPR compliance)
-- Usage: Call this when processing a "Right to be Forgotten" request

-- Delete from events table
-- ALTER TABLE events_local ON CLUSTER teei_global_cluster
-- DELETE WHERE company_id = '{uuid}';

-- Delete from user activity
-- ALTER TABLE user_activity_local ON CLUSTER teei_global_cluster
-- DELETE WHERE company_id = '{uuid}';

-- Delete from metrics
-- ALTER TABLE metrics_company_period_local ON CLUSTER teei_global_cluster
-- DELETE WHERE company_id = '{uuid}';

-- Delete from SROI calculations
-- ALTER TABLE sroi_calculations_local ON CLUSTER teei_global_cluster
-- DELETE WHERE company_id = '{uuid}';

-- Delete from VIS scores
-- ALTER TABLE vis_scores_local ON CLUSTER teei_global_cluster
-- DELETE WHERE company_id = '{uuid}';

-- Example mutation script:
/*
#!/bin/bash
COMPANY_ID="$1"

if [ -z "$COMPANY_ID" ]; then
    echo "Usage: $0 <company_uuid>"
    exit 1
fi

TABLES=(
    "events_local"
    "user_activity_local"
    "metrics_company_period_local"
    "sroi_calculations_local"
    "vis_scores_local"
)

for table in "${TABLES[@]}"; do
    echo "Deleting data from $table for company $COMPANY_ID..."
    clickhouse-client --query "ALTER TABLE $table DELETE WHERE company_id = '$COMPANY_ID';"
done

echo "GDPR erasure complete for company $COMPANY_ID"
echo "Note: Mutations are asynchronous. Monitor with: SELECT * FROM system.mutations WHERE is_done = 0;"
*/


-- ============================================================================
-- 9. TTL MERGE SETTINGS (Performance tuning)
-- ============================================================================

-- Configure TTL merge frequency (seconds)
-- Faster merges = quicker deletion but more I/O
ALTER TABLE events_local ON CLUSTER teei_global_cluster
MODIFY SETTING merge_with_ttl_timeout = 3600;  -- 1 hour

ALTER TABLE metrics_company_period_local ON CLUSTER teei_global_cluster
MODIFY SETTING merge_with_ttl_timeout = 86400;  -- 24 hours (less urgent)

ALTER TABLE user_activity_local ON CLUSTER teei_global_cluster
MODIFY SETTING merge_with_ttl_timeout = 3600;  -- 1 hour (GDPR sensitive)


-- ============================================================================
-- 10. MONITORING TTL CLEANUP
-- ============================================================================

-- Query to monitor TTL cleanup status
-- SELECT
--     database,
--     table,
--     partition,
--     name,
--     rows,
--     formatReadableSize(bytes_on_disk) AS size,
--     min_date,
--     max_date,
--     CASE
--         WHEN max_date < now() - INTERVAL 90 DAY THEN 'EXPIRED'
--         WHEN max_date < now() - INTERVAL 80 DAY THEN 'EXPIRING_SOON'
--         ELSE 'ACTIVE'
--     END AS ttl_status
-- FROM system.parts
-- WHERE active AND database = 'default'
-- ORDER BY max_date DESC;

-- Check pending TTL merges
-- SELECT
--     database,
--     table,
--     count() AS parts_to_merge,
--     sum(rows) AS rows_affected,
--     formatReadableSize(sum(bytes_on_disk)) AS size_affected
-- FROM system.parts
-- WHERE active
--   AND database = 'default'
--   AND max_date < now() - INTERVAL 90 DAY
-- GROUP BY database, table;


-- ============================================================================
-- 11. PARTITION MANAGEMENT (Manual cleanup if needed)
-- ============================================================================

-- Drop old partitions manually (alternative to TTL)
-- USE WITH CAUTION - this is immediate and irreversible

-- Drop partitions older than 3 months (example for events)
-- ALTER TABLE events_local ON CLUSTER teei_global_cluster
-- DROP PARTITION '202401';  -- January 2024


-- ============================================================================
-- 12. COST OPTIMIZATION - COMPRESSION & CODECS
-- ============================================================================

-- Use aggressive compression for older data
-- ALTER TABLE metrics_company_period_local ON CLUSTER teei_global_cluster
-- MODIFY TTL
--     created_at + INTERVAL 30 DAY RECOMPRESS CODEC(ZSTD(9)),
--     created_at + INTERVAL 365 DAY TO DISK 'cold',
--     created_at + INTERVAL
--         CASE WHEN region LIKE 'eu-%' THEN 730 ELSE 2555 END DAY DELETE;


-- ============================================================================
-- COMPLIANCE NOTES
-- ============================================================================
/*
GDPR Compliance (EU):
- Article 5(1)(e): Data minimization - keep data no longer than necessary
- Article 17: Right to erasure - support DELETE mutations
- Recommendation: 2 years retention for aggregated metrics

SOX Compliance (US):
- Sarbanes-Oxley: 7 years retention for financial records
- SROI/VIS data may qualify as financial impact metrics

Implementation:
1. Raw events: 90 days (sufficient for troubleshooting, not PII)
2. Aggregated metrics: Region-specific (2 years EU, 7 years US)
3. User activity logs: 90 days (PII, minimize retention)
4. Query logs: 30 days (operational, no business data)

Audit Trail:
- All TTL modifications logged in system.query_log
- TTL merges tracked in system.part_log
- Use monitoring queries to prove compliance
*/


-- ============================================================================
-- VERIFICATION & TESTING
-- ============================================================================

-- Test TTL calculation for sample row
-- SELECT
--     company_id,
--     region,
--     created_at,
--     created_at + INTERVAL
--         CASE WHEN region = 'eu-central-1' THEN 730 ELSE 2555 END DAY AS ttl_expiry,
--     dateDiff('day', now(), ttl_expiry) AS days_until_deletion
-- FROM metrics_company_period_local
-- LIMIT 10;

-- Force TTL merge (testing purposes only)
-- OPTIMIZE TABLE events_local FINAL;
