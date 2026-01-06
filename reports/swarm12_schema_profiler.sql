-- ============================================================================
-- SWARM 12: Schema Profiler SQL Script
-- Agent 1.1: schema-profiler
-- ============================================================================
-- Purpose: Comprehensive database schema profiling for performance optimization
-- Usage: psql -U teei -d teei_platform -f swarm12_schema_profiler.sql > schema_profile_results.txt
-- ============================================================================

\timing on
\echo '\n========================================='
\echo 'TEEI CSR PLATFORM - SCHEMA PROFILER'
\echo 'SWARM 12: Analytics Hardening'
\echo 'Agent 1.1: schema-profiler'
\echo '=========================================\n'

-- ============================================================================
-- 1. DATABASE SIZE & OVERVIEW
-- ============================================================================
\echo '\n--- 1. DATABASE SIZE & OVERVIEW ---\n'

SELECT
    pg_database.datname AS database_name,
    pg_size_pretty(pg_database_size(pg_database.datname)) AS database_size,
    pg_size_pretty(pg_database_size(pg_database.datname)::bigint -
        COALESCE((SELECT SUM(pg_total_relation_size(c.oid))
                  FROM pg_class c
                  JOIN pg_namespace n ON n.oid = c.relnamespace
                  WHERE n.nspname NOT IN ('pg_catalog', 'information_schema', 'pg_toast')), 0)
    ) AS system_overhead
FROM pg_database
WHERE datname = current_database();

\echo '\n--- PostgreSQL Version & Settings ---\n'
SELECT version() AS postgres_version;

SHOW shared_buffers;
SHOW work_mem;
SHOW maintenance_work_mem;
SHOW effective_cache_size;
SHOW max_connections;

-- ============================================================================
-- 2. TABLE SIZES & ROW COUNTS (Hotspot Identification)
-- ============================================================================
\echo '\n--- 2. TABLE SIZES & ROW COUNTS (Top 30 Tables) ---\n'

SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) -
                   pg_relation_size(schemaname||'.'||tablename)) AS indexes_size,
    n_live_tup AS estimated_row_count,
    n_dead_tup AS dead_tuples,
    ROUND((n_dead_tup::float / NULLIF(n_live_tup, 0)) * 100, 2) AS dead_tuple_pct,
    last_vacuum,
    last_autovacuum,
    last_analyze,
    last_autoanalyze
FROM pg_stat_user_tables
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 30;

-- ============================================================================
-- 3. INDEX USAGE STATISTICS
-- ============================================================================
\echo '\n--- 3. INDEX USAGE STATISTICS (Top 30 Most Used Indexes) ---\n'

SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    indexrelname AS index_name,
    idx_scan AS index_scans,
    idx_tup_read AS tuples_read,
    idx_tup_fetch AS tuples_fetched,
    pg_size_pretty(pg_relation_size(indexrelid)) AS index_size,
    CASE
        WHEN idx_scan = 0 THEN 'UNUSED'
        WHEN idx_scan < 100 THEN 'LOW USAGE'
        WHEN idx_scan < 1000 THEN 'MODERATE'
        ELSE 'HIGH USAGE'
    END AS usage_category
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 30;

\echo '\n--- 3b. UNUSED INDEXES (Potential Removal Candidates) ---\n'

SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    indexrelname AS index_name,
    pg_size_pretty(pg_relation_size(indexrelid)) AS wasted_space,
    idx_scan AS scans
FROM pg_stat_user_indexes
WHERE idx_scan = 0
AND indexrelname NOT LIKE '%_pkey'  -- Exclude primary keys
ORDER BY pg_relation_size(indexrelid) DESC
LIMIT 20;

-- ============================================================================
-- 4. MISSING INDEX OPPORTUNITIES (Sequential Scans on Large Tables)
-- ============================================================================
\echo '\n--- 4. SEQUENTIAL SCAN ANALYSIS (Potential Missing Indexes) ---\n'

SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    seq_scan AS sequential_scans,
    seq_tup_read AS rows_read_sequentially,
    idx_scan AS index_scans,
    n_live_tup AS estimated_rows,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) AS table_size,
    ROUND((seq_tup_read::float / NULLIF(seq_scan, 0)), 0) AS avg_rows_per_seq_scan,
    CASE
        WHEN seq_scan > idx_scan AND n_live_tup > 10000 THEN 'HIGH PRIORITY'
        WHEN seq_scan > idx_scan AND n_live_tup > 1000 THEN 'MEDIUM PRIORITY'
        ELSE 'LOW PRIORITY'
    END AS index_opportunity
FROM pg_stat_user_tables
WHERE seq_scan > 0
ORDER BY seq_tup_read DESC
LIMIT 20;

-- ============================================================================
-- 5. TABLE BLOAT ANALYSIS
-- ============================================================================
\echo '\n--- 5. TABLE BLOAT ANALYSIS ---\n'

SELECT
    schemaname AS schema_name,
    tablename AS table_name,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS total_size,
    n_live_tup AS live_tuples,
    n_dead_tup AS dead_tuples,
    ROUND((n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0)) * 100, 2) AS bloat_pct,
    CASE
        WHEN (n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0)) > 0.20 THEN 'VACUUM URGENTLY'
        WHEN (n_dead_tup::float / NULLIF(n_live_tup + n_dead_tup, 0)) > 0.10 THEN 'VACUUM SOON'
        ELSE 'HEALTHY'
    END AS health_status,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
WHERE n_dead_tup > 0
ORDER BY bloat_pct DESC NULLS LAST
LIMIT 20;

-- ============================================================================
-- 6. CRITICAL TABLES FOR VIS/SROI/Q2Q PERFORMANCE
-- ============================================================================
\echo '\n--- 6. ANALYTICS CRITICAL TABLES (VIS/SROI/Q2Q) ---\n'

SELECT
    t.tablename AS table_name,
    pg_size_pretty(pg_total_relation_size('public.'||t.tablename)) AS total_size,
    s.n_live_tup AS estimated_rows,
    s.seq_scan AS sequential_scans,
    s.idx_scan AS index_scans,
    s.n_tup_ins AS inserts,
    s.n_tup_upd AS updates,
    s.n_tup_del AS deletes,
    ROUND((s.n_dead_tup::float / NULLIF(s.n_live_tup, 0)) * 100, 2) AS dead_tuple_pct
FROM information_schema.tables t
LEFT JOIN pg_stat_user_tables s ON s.tablename = t.table_name
WHERE t.table_schema = 'public'
AND t.table_name IN (
    'volunteers',
    'volunteer_hours',
    'sessions',
    'outcome_scores',
    'evidence_snippets',
    'q2q_insights',
    'buddy_system_events',
    'kintell_sessions',
    'audit_logs',
    'ai_token_usage',
    'metrics_company_period'
)
ORDER BY pg_total_relation_size('public.'||t.tablename) DESC;

-- ============================================================================
-- 7. FOREIGN KEY RELATIONSHIPS & CONSTRAINT CHECKS
-- ============================================================================
\echo '\n--- 7. FOREIGN KEY RELATIONSHIPS ---\n'

SELECT
    tc.constraint_name,
    tc.table_name AS child_table,
    kcu.column_name AS child_column,
    ccu.table_name AS parent_table,
    ccu.column_name AS parent_column,
    rc.delete_rule,
    rc.update_rule
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
ORDER BY tc.table_name, tc.constraint_name
LIMIT 50;

-- ============================================================================
-- 8. INDEX DEFINITIONS & TYPES
-- ============================================================================
\echo '\n--- 8. INDEX TYPES & DEFINITIONS (Sample) ---\n'

SELECT
    schemaname,
    tablename,
    indexname,
    indexdef,
    pg_size_pretty(pg_relation_size(schemaname||'.'||indexname)) AS index_size
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY pg_relation_size(schemaname||'.'||indexname) DESC
LIMIT 30;

-- ============================================================================
-- 9. COMPOSITE INDEX CANDIDATES
-- ============================================================================
\echo '\n--- 9. MULTI-COLUMN QUERY PATTERNS (Composite Index Opportunities) ---\n'

-- This is a heuristic check - in production, analyze pg_stat_statements
SELECT
    t.tablename,
    COUNT(i.indexname) AS existing_indexes,
    array_agg(i.indexname ORDER BY i.indexname) AS index_names
FROM pg_stat_user_tables t
LEFT JOIN pg_indexes i ON i.tablename = t.tablename AND i.schemaname = t.schemaname
WHERE t.tablename IN ('outcome_scores', 'volunteers', 'volunteer_hours', 'sessions', 'evidence_snippets')
GROUP BY t.tablename
ORDER BY t.tablename;

-- ============================================================================
-- 10. GROWTH RATE ESTIMATION (Unbounded Tables)
-- ============================================================================
\echo '\n--- 10. UNBOUNDED GROWTH TABLES (Partitioning Candidates) ---\n'

SELECT
    schemaname,
    tablename,
    n_tup_ins AS total_inserts,
    n_tup_del AS total_deletes,
    n_live_tup AS current_rows,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS current_size,
    CASE
        WHEN tablename IN ('audit_logs', 'ai_token_usage', 'session_feedback', 'evidence_snippets')
            THEN 'PARTITION RECOMMENDED'
        ELSE 'MONITOR'
    END AS recommendation
FROM pg_stat_user_tables
WHERE n_tup_ins > 10000  -- High insert volume
ORDER BY n_tup_ins DESC
LIMIT 15;

-- ============================================================================
-- 11. CONNECTION & ACTIVITY STATS
-- ============================================================================
\echo '\n--- 11. CURRENT DATABASE CONNECTIONS ---\n'

SELECT
    datname AS database,
    count(*) AS connections,
    max_conn.max_connections,
    ROUND((count(*)::float / max_conn.max_connections) * 100, 2) AS usage_pct
FROM pg_stat_activity
CROSS JOIN (SELECT setting::int AS max_connections FROM pg_settings WHERE name = 'max_connections') max_conn
WHERE datname IS NOT NULL
GROUP BY datname, max_conn.max_connections
ORDER BY connections DESC;

\echo '\n--- 11b. ACTIVE QUERIES (Long-Running) ---\n'

SELECT
    pid,
    now() - pg_stat_activity.query_start AS duration,
    state,
    wait_event_type,
    wait_event,
    LEFT(query, 100) AS query_preview
FROM pg_stat_activity
WHERE state != 'idle'
AND query NOT ILIKE '%pg_stat_activity%'
ORDER BY duration DESC
LIMIT 10;

-- ============================================================================
-- 12. CACHE HIT RATIO
-- ============================================================================
\echo '\n--- 12. CACHE HIT RATIO (Target: >99%) ---\n'

SELECT
    'Index Hit Rate' AS metric,
    ROUND((sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0)) * 100, 2) AS hit_rate_pct,
    CASE
        WHEN ROUND((sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0)) * 100, 2) > 99 THEN 'EXCELLENT'
        WHEN ROUND((sum(idx_blks_hit) / NULLIF(sum(idx_blks_hit + idx_blks_read), 0)) * 100, 2) > 95 THEN 'GOOD'
        ELSE 'NEEDS TUNING'
    END AS status
FROM pg_statio_user_indexes
UNION ALL
SELECT
    'Table Hit Rate' AS metric,
    ROUND((sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0)) * 100, 2) AS hit_rate_pct,
    CASE
        WHEN ROUND((sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0)) * 100, 2) > 99 THEN 'EXCELLENT'
        WHEN ROUND((sum(heap_blks_hit) / NULLIF(sum(heap_blks_hit + heap_blks_read), 0)) * 100, 2) > 95 THEN 'GOOD'
        ELSE 'NEEDS TUNING'
    END AS status
FROM pg_statio_user_tables;

-- ============================================================================
-- 13. SUMMARY & RECOMMENDATIONS
-- ============================================================================
\echo '\n========================================='
\echo 'PROFILING COMPLETE'
\echo '========================================='
\echo 'Next Steps:'
\echo '1. Review unused indexes for potential removal'
\echo '2. Add indexes to tables with high sequential scans'
\echo '3. Run VACUUM on tables with >10% bloat'
\echo '4. Consider partitioning for audit_logs and ai_token_usage'
\echo '5. Analyze VIS/SROI/Q2Q query patterns with pg_stat_statements'
\echo '=========================================\n'

\timing off
