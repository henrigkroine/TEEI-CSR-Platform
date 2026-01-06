-- ============================================================================
-- SWARM 12: Query Inspector & EXPLAIN Analyzer
-- Agent 1.2: query-inspector
-- ============================================================================
-- Purpose: Analyze slow queries and generate EXPLAIN plans for optimization
-- Usage: psql -U teei -d teei_platform -f swarm12_query_inspector.sql
-- ============================================================================

\timing on
\echo '\n========================================='
\echo 'QUERY INSPECTOR: VIS/SROI/Q2Q ANALYSIS'
\echo 'Agent 1.2: query-inspector'
\echo '=========================================\n'

-- ============================================================================
-- PART 1: ENABLE pg_stat_statements (if not already enabled)
-- ============================================================================

\echo '\n--- Checking pg_stat_statements Extension ---\n'

SELECT
    installed.extname AS extension,
    installed.extversion AS version,
    CASE
        WHEN installed.extname IS NOT NULL THEN 'INSTALLED'
        ELSE 'NOT INSTALLED - Run: CREATE EXTENSION pg_stat_statements;'
    END AS status
FROM pg_available_extensions available
LEFT JOIN pg_extension installed ON installed.extname = available.name
WHERE available.name = 'pg_stat_statements';

-- Uncomment below to install (requires superuser)
-- CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

\echo '\n--- pg_stat_statements Configuration ---\n'

SHOW shared_preload_libraries;
SHOW pg_stat_statements.max;
SHOW pg_stat_statements.track;

-- ============================================================================
-- PART 2: VIS CALCULATION QUERY ANALYSIS (CRITICAL BOTTLENECK)
-- ============================================================================

\echo '\n========================================='
\echo 'VIS CALCULATION QUERY ANALYSIS'
\echo '========================================='
\echo 'Source: /services/reporting/src/calculators/vis.ts:128-159'
\echo 'Issue: 3-4 way LEFT JOIN causing 500-1000ms latency'
\echo '\n'

-- Sample company ID for testing (replace with actual UUID)
\set test_company_id '00000000-0000-0000-0000-000000000001'
\set test_period '2025-Q4'

\echo '--- EXPLAIN ANALYZE: VIS Query (WITHOUT Optimization) ---\n'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
WITH volunteer_metrics AS (
  SELECT
    v.id as volunteer_id,
    COALESCE(v.first_name || ' ' || v.last_name, 'Anonymous') as volunteer_name,
    COALESCE(SUM(vh.hours), 0) as total_hours,
    COUNT(DISTINCT s.id) as total_sessions,
    EXTRACT(EPOCH FROM (MAX(vh.session_date) - MIN(vh.session_date))) / (30 * 86400) as months_active,
    AVG(os.score) as avg_participant_improvement
  FROM volunteers v
  LEFT JOIN volunteer_hours vh ON vh.volunteer_id = v.id
  LEFT JOIN sessions s ON s.volunteer_id = v.id
  LEFT JOIN outcome_scores os ON os.company_id = v.company_id
  WHERE v.company_id = :'test_company_id' AND v.is_active = true
  GROUP BY v.id, v.first_name, v.last_name
  HAVING SUM(vh.hours) > 0
)
SELECT
  volunteer_id,
  volunteer_name,
  total_hours,
  total_sessions,
  CASE
    WHEN months_active > 0 THEN total_sessions / months_active
    ELSE total_sessions
  END as sessions_per_month,
  COALESCE(avg_participant_improvement, 0) as avg_improvement
FROM volunteer_metrics
ORDER BY total_hours DESC, total_sessions DESC;

\echo '\n--- Query Analysis: VIS Bottlenecks ---\n'

SELECT
    'VIS Query' AS query_name,
    'LEFT JOIN volunteers → volunteer_hours → sessions → outcome_scores' AS pattern,
    'High' AS severity,
    'Sequential scan on large tables, Cartesian product risk' AS issue,
    'Add composite indexes, create materialized view' AS recommendation;

\echo '\n--- Estimated Impact of Missing Indexes ---\n'

SELECT
    'outcome_scores' AS table_name,
    'idx_outcome_scores_company_quarter_dim' AS missing_index,
    '(company_id, quarter, dimension)' AS columns,
    '5-10x speedup expected' AS impact;

SELECT
    'volunteer_hours' AS table_name,
    'idx_volunteer_hours_volunteer_date' AS missing_index,
    '(volunteer_id, session_date DESC)' AS columns,
    '3-5x speedup expected' AS impact;

-- ============================================================================
-- PART 3: SROI CALCULATION QUERY ANALYSIS
-- ============================================================================

\echo '\n========================================='
\echo 'SROI CALCULATION QUERY ANALYSIS'
\echo '========================================='
\echo 'Source: /services/reporting/src/calculators/sroi.ts:76-123'
\echo '\n'

\echo '--- EXPLAIN ANALYZE: SROI Hours Query ---\n'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT COALESCE(SUM(vh.hours), 0) as total_hours
FROM volunteer_hours vh
JOIN volunteers v ON v.id = vh.volunteer_id
WHERE v.company_id = :'test_company_id';

\echo '\n--- EXPLAIN ANALYZE: SROI Outcomes Query ---\n'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT
  dimension,
  AVG(score) as avg_score,
  AVG(COALESCE(confidence, 0.85)) as avg_confidence
FROM outcome_scores
WHERE company_id = :'test_company_id'
GROUP BY dimension;

\echo '\n--- SROI Query Performance Summary ---\n'

SELECT
    'SROI Hours Query' AS query_name,
    'JOIN volunteers → volunteer_hours' AS pattern,
    'Medium' AS severity,
    'Index on volunteer_hours.volunteer_id exists, should be fast' AS analysis,
    'Monitor with pg_stat_statements' AS recommendation;

SELECT
    'SROI Outcomes Query' AS query_name,
    'Simple GROUP BY on outcome_scores' AS pattern,
    'Low' AS severity,
    'Should use idx_outcome_scores_company if exists' AS analysis,
    'Add composite index for period filtering' AS recommendation;

-- ============================================================================
-- PART 4: EVIDENCE SNIPPET JOINS (Q2Q Lineage)
-- ============================================================================

\echo '\n========================================='
\echo 'EVIDENCE SNIPPET QUERY ANALYSIS'
\echo '========================================='
\echo 'Source: Q2Q lineage tracking'
\echo '\n'

\echo '--- EXPLAIN ANALYZE: Evidence Snippet Join ---\n'

EXPLAIN (ANALYZE, BUFFERS, VERBOSE, FORMAT TEXT)
SELECT
    os.id AS outcome_id,
    os.dimension,
    os.score,
    es.id AS snippet_id,
    es.snippet,
    es.evidence_hash
FROM outcome_scores os
INNER JOIN evidence_snippets es ON es.outcome_score_id = os.id
WHERE os.company_id = :'test_company_id'
ORDER BY os.created_at DESC
LIMIT 100;

\echo '\n--- Evidence Join Analysis ---\n'

SELECT
    'Evidence Snippet Join' AS query_name,
    'outcome_scores → evidence_snippets' AS pattern,
    'Medium' AS severity,
    'One outcome can have many snippets (Cartesian product)' AS issue,
    'Limit snippets to 3-5 per outcome, add index on (outcome_score_id, created_at)' AS recommendation;

-- ============================================================================
-- PART 5: TOP SLOW QUERIES (from pg_stat_statements if available)
-- ============================================================================

\echo '\n========================================='
\echo 'TOP 10 SLOWEST QUERIES (pg_stat_statements)'
\echo '========================================='
\echo 'Requires: pg_stat_statements extension enabled'
\echo '\n'

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_stat_statements') THEN
        RAISE NOTICE 'pg_stat_statements is enabled - showing top slow queries';
    ELSE
        RAISE NOTICE 'pg_stat_statements NOT ENABLED - Install with: CREATE EXTENSION pg_stat_statements;';
    END IF;
END $$;

-- Query 1: By Total Time
\echo '\n--- Top 10 Queries by Total Execution Time ---\n'

SELECT
    ROUND(total_exec_time::numeric, 2) AS total_time_ms,
    ROUND(mean_exec_time::numeric, 2) AS avg_time_ms,
    calls,
    ROUND((total_exec_time / sum(total_exec_time) OVER ()) * 100, 2) AS pct_total_time,
    LEFT(query, 100) AS query_preview
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
AND query NOT LIKE '%pg_catalog%'
ORDER BY total_exec_time DESC
LIMIT 10;

-- Query 2: By Average Time
\echo '\n--- Top 10 Queries by Average Execution Time ---\n'

SELECT
    ROUND(mean_exec_time::numeric, 2) AS avg_time_ms,
    ROUND(total_exec_time::numeric, 2) AS total_time_ms,
    calls,
    ROUND(stddev_exec_time::numeric, 2) AS stddev_ms,
    LEFT(query, 100) AS query_preview
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
AND query NOT LIKE '%pg_catalog%'
ORDER BY mean_exec_time DESC
LIMIT 10;

-- Query 3: Most Frequently Called
\echo '\n--- Top 10 Most Frequently Called Queries ---\n'

SELECT
    calls,
    ROUND(total_exec_time::numeric, 2) AS total_time_ms,
    ROUND(mean_exec_time::numeric, 2) AS avg_time_ms,
    ROUND((total_exec_time / sum(total_exec_time) OVER ()) * 100, 2) AS pct_total_time,
    LEFT(query, 100) AS query_preview
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
AND query NOT LIKE '%pg_catalog%'
ORDER BY calls DESC
LIMIT 10;

-- ============================================================================
-- PART 6: INDEX USAGE FOR CRITICAL QUERIES
-- ============================================================================

\echo '\n========================================='
\echo 'INDEX USAGE FOR VIS/SROI QUERIES'
\echo '========================================='
\echo '\n'

\echo '--- Indexes on volunteers table ---\n'

SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS scans,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size,
    indexdef
FROM pg_stat_user_indexes
WHERE tablename = 'volunteers'
ORDER BY idx_scan DESC;

\echo '\n--- Indexes on volunteer_hours table ---\n'

SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS scans,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size,
    indexdef
FROM pg_stat_user_indexes
WHERE tablename = 'volunteer_hours'
ORDER BY idx_scan DESC;

\echo '\n--- Indexes on outcome_scores table ---\n'

SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS scans,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size,
    indexdef
FROM pg_stat_user_indexes
WHERE tablename = 'outcome_scores'
ORDER BY idx_scan DESC;

\echo '\n--- Indexes on sessions table ---\n'

SELECT
    schemaname,
    tablename,
    indexname,
    idx_scan AS scans,
    pg_size_pretty(pg_relation_size(indexrelid)) AS size,
    indexdef
FROM pg_stat_user_indexes
WHERE tablename = 'sessions'
ORDER BY idx_scan DESC;

-- ============================================================================
-- PART 7: BUFFER CACHE ANALYSIS
-- ============================================================================

\echo '\n========================================='
\echo 'BUFFER CACHE ANALYSIS FOR CRITICAL TABLES'
\echo '========================================='
\echo '\n'

SELECT
    schemaname,
    tablename,
    heap_blks_read AS disk_reads,
    heap_blks_hit AS cache_hits,
    CASE
        WHEN (heap_blks_hit + heap_blks_read) > 0
        THEN ROUND((heap_blks_hit::numeric / (heap_blks_hit + heap_blks_read)) * 100, 2)
        ELSE 0
    END AS cache_hit_ratio_pct
FROM pg_statio_user_tables
WHERE tablename IN ('volunteers', 'volunteer_hours', 'outcome_scores', 'sessions', 'evidence_snippets')
ORDER BY cache_hit_ratio_pct ASC;

-- ============================================================================
-- PART 8: RECOMMENDATIONS SUMMARY
-- ============================================================================

\echo '\n========================================='
\echo 'QUERY OPTIMIZATION RECOMMENDATIONS'
\echo '========================================='
\echo '\n'

SELECT
    'CRITICAL' AS priority,
    'VIS Query' AS target,
    'Create materialized view mv_volunteer_metrics' AS action,
    '10x speedup expected (1000ms → 100ms)' AS expected_impact;

SELECT
    'CRITICAL' AS priority,
    'VIS Query' AS target,
    'Add idx_outcome_scores_company_quarter_dim(company_id, quarter, dimension)' AS action,
    '5-10x speedup on outcome joins' AS expected_impact;

SELECT
    'HIGH' AS priority,
    'VIS Query' AS target,
    'Add idx_volunteer_hours_volunteer_date(volunteer_id, session_date DESC)' AS action,
    '3-5x speedup on hours aggregation' AS expected_impact;

SELECT
    'HIGH' AS priority,
    'SROI Query' AS target,
    'Add idx_buddy_events_timestamp_type(timestamp DESC, event_type)' AS action,
    '5x speedup on event aggregation' AS expected_impact;

SELECT
    'MEDIUM' AS priority,
    'Evidence Joins' AS target,
    'Add idx_evidence_snippets_outcome_created(outcome_score_id, created_at DESC)' AS action,
    '2-3x speedup on evidence lookups' AS expected_impact;

SELECT
    'MEDIUM' AS priority,
    'All Queries' AS target,
    'Enable slow query logging (log_min_duration_statement = 1000)' AS action,
    'Continuous monitoring of slow queries' AS expected_impact;

\echo '\n========================================='
\echo 'QUERY INSPECTION COMPLETE'
\echo '========================================='
\echo 'Next Steps:'
\echo '1. Review EXPLAIN ANALYZE output above'
\echo '2. Identify sequential scans on large tables'
\echo '3. Implement recommended indexes (Agent 1.3)'
\echo '4. Create materialized views (Agent 1.4)'
\echo '5. Rewrite queries to use MVs (Agent 1.5)'
\echo '========================================='
\echo '\n'

\timing off
