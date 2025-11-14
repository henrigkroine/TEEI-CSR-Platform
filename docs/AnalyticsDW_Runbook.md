# Analytics Data Warehouse Runbook

**Service**: Analytics (ClickHouse DW)
**Owner**: Worker 4 / Analytics Team
**Last Updated**: 2025-11-14
**Status**: Production Ready

## Overview

The Analytics service provides real-time analytics, trend analysis, cohort analysis, and funnel analysis using ClickHouse as the data warehouse. It includes PostgreSQL→ClickHouse backfill, incremental sync, query budgets, and observability.

### Service Architecture

- **Language**: TypeScript/Node.js
- **Framework**: Fastify
- **Port**: 3008
- **Data Warehouse**: ClickHouse
- **Primary DB**: PostgreSQL (source of truth)
- **Cache**: Redis (query results)
- **Sync**: Real-time + scheduled backfill

### Key Features

1. **Trends Analysis** - Time-series metrics
2. **Cohort Analysis** - User segmentation
3. **Funnel Analysis** - Conversion tracking
4. **SROI Calculations** - Social Return on Investment
5. **Benchmarking** - Cross-company comparisons

---

## Service Endpoints

### Analytics APIs
- `GET /v1/analytics/trends` - Time-series trends
- `GET /v1/analytics/cohorts` - Cohort analysis
- `GET /v1/analytics/funnels` - Funnel analysis
- `GET /v1/analytics/benchmarks` - Cross-tenant benchmarks
- `GET /v1/analytics/sroi` - SROI calculations
- `POST /v1/analytics/query` - Custom ClickHouse query (admin)

### Data Sync APIs
- `POST /v1/analytics/sync/backfill` - Trigger backfill
- `POST /v1/analytics/sync/incremental` - Trigger incremental sync
- `GET /v1/analytics/sync/status` - Sync status
- `GET /v1/analytics/sync/stats` - Sync statistics

### Health & Monitoring
- `GET /health` - Service health
- `GET /health/clickhouse` - ClickHouse connectivity
- `GET /health/postgres` - PostgreSQL connectivity

---

## Environment Configuration

### Required Environment Variables

```bash
# PostgreSQL (Source)
DATABASE_URL=postgresql://user:pass@host:5432/teei

# ClickHouse (Data Warehouse)
CLICKHOUSE_URL=http://clickhouse:8123
CLICKHOUSE_USER=teei_analytics
CLICKHOUSE_PASSWORD=xxx
CLICKHOUSE_DB=teei_analytics

# Redis (Query Cache)
REDIS_URL=redis://localhost:6379

# Sync Configuration
BACKFILL_BATCH_SIZE=10000
BACKFILL_START_DATE=2024-01-01
INCREMENTAL_SYNC_INTERVAL_SEC=60
ENABLE_AUTO_SYNC=true

# Query Budgets (prevent expensive queries)
QUERY_BUDGET_MAX_ROWS=1000000
QUERY_BUDGET_MAX_BYTES=10737418240  # 10GB
QUERY_BUDGET_TIMEOUT_SEC=30

# Service Configuration
PORT_ANALYTICS=3008
NODE_ENV=production
LOG_LEVEL=info
```

---

## Operations

### Starting the Service

```bash
# Development
pnpm --filter @teei/analytics dev

# Production (with sync worker)
pm2 start dist/index.js --name analytics-api
pm2 start dist/workers/sync-worker.js --name analytics-sync

# Docker
docker-compose up analytics clickhouse
```

### ClickHouse Administration

```bash
# Connect to ClickHouse
clickhouse-client --host localhost --port 9000 --user teei_analytics --password xxx

# Check database
USE teei_analytics;
SHOW TABLES;

# Check table sizes
SELECT
  table,
  formatReadableSize(sum(bytes)) as size,
  sum(rows) as rows
FROM system.parts
WHERE database = 'teei_analytics' AND active
GROUP BY table
ORDER BY sum(bytes) DESC;

# Check running queries
SELECT
  query_id,
  user,
  query,
  elapsed,
  read_rows,
  formatReadableSize(read_bytes) as read_size
FROM system.processes;

# Kill long-running query
KILL QUERY WHERE query_id = 'xxx';
```

---

## Data Sync Operations

### Initial Backfill

Backfill loads historical data from PostgreSQL to ClickHouse.

**Trigger Backfill:**
```bash
curl -X POST http://localhost:3008/v1/analytics/sync/backfill \
  -H "Content-Type: application/json" \
  -d '{
    "startDate": "2024-01-01",
    "endDate": "2025-11-14",
    "tables": ["users", "sessions", "feedback", "outcomes", "metrics"]
  }'
```

**Monitor Progress:**
```bash
# Check sync status
curl http://localhost:3008/v1/analytics/sync/status

# Expected response
{
  "status": "running",
  "progress": {
    "users": "100%",
    "sessions": "60%",
    "feedback": "pending"
  },
  "rowsProcessed": 1250000,
  "rowsTotal": 2000000,
  "estimatedTimeRemaining": "15 minutes"
}
```

**Backfill Performance:**
- **Batch Size**: 10,000 rows (configurable)
- **Throughput**: ~50,000 rows/sec
- **Full Backfill Time**: ~1 hour for 10M rows

---

### Incremental Sync

Incremental sync runs every 60 seconds to replicate new/updated data.

**How It Works:**
1. Query PostgreSQL for rows with `updated_at > last_sync_timestamp`
2. Transform data to ClickHouse schema
3. Insert into ClickHouse (upsert via ReplacingMergeTree)
4. Update `last_sync_timestamp`

**Monitor Incremental Sync:**
```bash
# Check sync stats
curl http://localhost:3008/v1/analytics/sync/stats

# Expected response
{
  "lastSyncAt": "2025-11-14T10:15:00Z",
  "nextSyncAt": "2025-11-14T10:16:00Z",
  "intervalSec": 60,
  "replicationLag": "2 seconds",
  "rowsSynced": 450,
  "errors": 0
}
```

**Manual Trigger:**
```bash
curl -X POST http://localhost:3008/v1/analytics/sync/incremental
```

---

## Monitoring & Alerts

### Key Metrics

- **Replication Lag**: Time delay between PostgreSQL and ClickHouse
- **Query Latency**: p50, p95, p99 query response times
- **Query Budget Violations**: Queries exceeding limits
- **Sync Errors**: Failed sync attempts
- **Table Sizes**: ClickHouse table growth
- **Cache Hit Rate**: Redis cache effectiveness

### Recommended Alerts

```yaml
groups:
  - name: analytics-dw
    rules:
      - alert: HighReplicationLag
        expr: analytics_replication_lag_seconds > 300
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "ClickHouse replication lag > 5 minutes"

      - alert: QueryBudgetViolations
        expr: rate(analytics_query_budget_exceeded_total[10m]) > 0.1
        labels:
          severity: warning
        annotations:
          summary: "Frequent query budget violations"

      - alert: SyncFailures
        expr: rate(analytics_sync_errors_total[5m]) > 0.05
        for: 15m
        labels:
          severity: critical

      - alert: ClickHouseDown
        expr: clickhouse_up == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "ClickHouse is unreachable"

      - alert: SlowQueries
        expr: histogram_quantile(0.95, rate(analytics_query_duration_seconds_bucket[5m])) > 10
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "p95 query latency > 10 seconds"
```

---

## Troubleshooting

### Issue: High Replication Lag

**Symptoms**: Data in ClickHouse is stale, replication lag > 5 minutes

**Diagnosis:**
```bash
# Check sync status
curl http://localhost:3008/v1/analytics/sync/stats | jq '.replicationLag'

# Check ClickHouse load
clickhouse-client -q "SELECT * FROM system.metrics WHERE metric LIKE '%Insert%';"

# Check PostgreSQL load
psql -d teei -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='analytics-sync';"
```

**Resolution:**
1. **Slow PostgreSQL Queries**: Add indexes
   ```sql
   CREATE INDEX CONCURRENTLY idx_users_updated_at ON users(updated_at);
   CREATE INDEX CONCURRENTLY idx_sessions_updated_at ON sessions(updated_at);
   ```
2. **Slow ClickHouse Inserts**: Increase batch size
   ```bash
   export BACKFILL_BATCH_SIZE=50000
   pm2 restart analytics-sync
   ```
3. **Network Bottleneck**: Check network latency
   ```bash
   ping clickhouse-host
   curl -w "@curl-format.txt" -o /dev/null -s http://clickhouse:8123/ping
   ```

---

### Issue: Query Timeout / Budget Exceeded

**Symptoms**: API returns 503, logs show "Query budget exceeded"

**Diagnosis:**
```bash
# Check query budgets
psql -d teei -c "SELECT * FROM query_budgets ORDER BY created_at DESC LIMIT 10;"

# Check ClickHouse system queries
clickhouse-client -q "
  SELECT
    query,
    elapsed,
    read_rows,
    formatReadableSize(read_bytes) as read_size,
    memory_usage
  FROM system.query_log
  WHERE event_time > now() - INTERVAL 1 HOUR
  ORDER BY elapsed DESC
  LIMIT 10;
"
```

**Resolution:**
1. **Large Date Range**: User querying too much data
   - Solution: Limit date range in UI (e.g., max 365 days)
2. **Missing WHERE Clause**: Query scanning entire table
   - Solution: Enforce filters in query builder
3. **Unoptimized Query**: Inefficient aggregations
   - Solution: Use materialized views for common aggregations
4. **Increase Budget** (if legitimate use case):
   ```bash
   export QUERY_BUDGET_MAX_ROWS=5000000
   export QUERY_BUDGET_TIMEOUT_SEC=60
   pm2 restart analytics-api
   ```

---

### Issue: ClickHouse Out of Memory

**Symptoms**: ClickHouse crashes, logs show "Memory limit exceeded"

**Diagnosis:**
```bash
# Check ClickHouse memory usage
clickhouse-client -q "SELECT formatReadableSize(value) FROM system.asynchronous_metrics WHERE metric='MemoryTracking';"

# Check system memory
free -h
docker stats clickhouse  # If using Docker
```

**Resolution:**
1. **Increase Memory Limit** (if resources available):
   ```xml
   <!-- /etc/clickhouse-server/config.xml -->
   <max_memory_usage>64000000000</max_memory_usage> <!-- 64GB -->
   ```
2. **Reduce Query Concurrency**:
   ```xml
   <max_concurrent_queries>50</max_concurrent_queries>
   ```
3. **Enable Query Result Spooling** (disk overflow):
   ```xml
   <max_bytes_before_external_group_by>10000000000</max_bytes_before_external_group_by>
   ```
4. **Partition Tables** (reduce memory footprint per query):
   ```sql
   ALTER TABLE metrics_facts
   PARTITION BY toYYYYMM(date);
   ```

---

### Issue: Sync Worker Crashed

**Symptoms**: Incremental sync not running, replication lag increasing

**Diagnosis:**
```bash
# Check worker status
pm2 status analytics-sync

# Check worker logs
pm2 logs analytics-sync --lines 100

# Check for error patterns
pm2 logs analytics-sync --err --lines 50
```

**Resolution:**
1. **Worker Crashed**: Restart worker
   ```bash
   pm2 restart analytics-sync
   pm2 save
   ```
2. **Database Connection Lost**: Check connection pool
   ```bash
   psql -d teei -c "SELECT count(*) FROM pg_stat_activity WHERE application_name='analytics-sync';"
   ```
3. **Memory Leak**: Restart with increased memory
   ```bash
   pm2 delete analytics-sync
   pm2 start dist/workers/sync-worker.js \
     --name analytics-sync \
     --max-memory-restart 2G
   ```

---

### Issue: Duplicate Rows in ClickHouse

**Symptoms**: Trend analysis shows inflated numbers

**Diagnosis:**
```sql
-- Check for duplicates
SELECT
  id,
  count(*) as duplicate_count
FROM metrics_facts
GROUP BY id
HAVING count(*) > 1
ORDER BY duplicate_count DESC
LIMIT 10;
```

**Resolution:**
1. **ReplacingMergeTree Not Merging**: Force merge
   ```sql
   OPTIMIZE TABLE metrics_facts FINAL;
   ```
2. **Sync Idempotency Issue**: Review sync logic
   - Ensure primary key is correct
   - Verify version column is monotonically increasing
3. **Manual Deduplication** (if needed):
   ```sql
   CREATE TABLE metrics_facts_dedup ENGINE = ReplacingMergeTree(version)
   ORDER BY (company_id, metric_type, date)
   AS SELECT * FROM metrics_facts;

   DROP TABLE metrics_facts;
   RENAME TABLE metrics_facts_dedup TO metrics_facts;
   ```

---

## Maintenance

### ClickHouse Table Optimization

```sql
-- Optimize tables (merge parts)
OPTIMIZE TABLE users_dim FINAL;
OPTIMIZE TABLE sessions_fact FINAL;
OPTIMIZE TABLE metrics_facts FINAL;

-- Drop old partitions (retain 2 years)
ALTER TABLE metrics_facts DROP PARTITION '202301';
ALTER TABLE metrics_facts DROP PARTITION '202302';

-- Analyze table statistics
ANALYZE TABLE metrics_facts;
```

### Database Vacuum

```bash
# PostgreSQL vacuum (for source DB)
psql -d teei -c "VACUUM ANALYZE users, sessions, feedback, outcomes, metrics;"

# ClickHouse cleanup (detached parts)
clickhouse-client -q "SYSTEM DROP MARK CACHE;"
clickhouse-client -q "SYSTEM DROP UNCOMPRESSED CACHE;"
```

### Backup & Restore

**Backup ClickHouse:**
```bash
# Backup to S3
clickhouse-backup create
clickhouse-backup upload latest

# Or manual export
clickhouse-client --query "SELECT * FROM metrics_facts FORMAT CSV" > metrics_facts.csv
aws s3 cp metrics_facts.csv s3://teei-backups/clickhouse/
```

**Restore ClickHouse:**
```bash
# Restore from backup
clickhouse-backup download latest
clickhouse-backup restore

# Or manual import
aws s3 cp s3://teei-backups/clickhouse/metrics_facts.csv .
clickhouse-client --query "INSERT INTO metrics_facts FORMAT CSV" < metrics_facts.csv
```

---

## Performance Tuning

### Query Optimization

**Best Practices:**
1. **Always filter by date**: ClickHouse is optimized for time-series
   ```sql
   -- Good
   SELECT * FROM metrics_facts
   WHERE date BETWEEN '2025-01-01' AND '2025-11-14'
     AND company_id = 'xxx';

   -- Bad (scans entire table)
   SELECT * FROM metrics_facts WHERE company_id = 'xxx';
   ```
2. **Use PREWHERE for filtering**: Pushes filter before reading columns
   ```sql
   SELECT metric_value, metric_name
   FROM metrics_facts
   PREWHERE date >= '2025-01-01' AND company_id = 'xxx'
   WHERE metric_name = 'volunteer_hours';
   ```
3. **Limit result size**: Always use LIMIT
   ```sql
   SELECT * FROM metrics_facts
   WHERE date >= '2025-01-01'
   ORDER BY date DESC
   LIMIT 10000;
   ```

### Materialized Views

Create materialized views for common aggregations:

```sql
-- Daily aggregation (pre-computed)
CREATE MATERIALIZED VIEW metrics_daily_agg
ENGINE = AggregatingMergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (company_id, metric_type, date)
AS SELECT
  company_id,
  metric_type,
  toDate(date) as date,
  sumState(metric_value) as total_value,
  countState() as count,
  avgState(metric_value) as avg_value
FROM metrics_facts
GROUP BY company_id, metric_type, date;

-- Query materialized view (fast)
SELECT
  company_id,
  metric_type,
  date,
  sumMerge(total_value) as total
FROM metrics_daily_agg
WHERE date >= '2025-01-01'
GROUP BY company_id, metric_type, date;
```

---

## Incident Response

### P0: ClickHouse Cluster Down

**Actions:**
1. Check ClickHouse status: `systemctl status clickhouse-server`
2. Check logs: `tail -f /var/log/clickhouse-server/clickhouse-server.err.log`
3. Restart: `systemctl restart clickhouse-server`
4. If disk full, clear temporary files:
   ```bash
   rm -rf /var/lib/clickhouse/tmp/*
   ```
5. If corruption, restore from backup

### P1: Analytics API Slow / Unresponsive

**Actions:**
1. Check query load: `clickhouse-client -q "SELECT count(*) FROM system.processes;"`
2. Kill slow queries: `clickhouse-client -q "KILL QUERY WHERE elapsed > 60;"`
3. Restart API: `pm2 restart analytics-api`
4. Enable circuit breaker to prevent cascading failures

---

## Contacts

- **Primary On-Call**: analytics-team@teei.com
- **Secondary**: backend-lead@teei.com
- **Slack Channel**: #alerts-analytics
- **PagerDuty**: https://teei.pagerduty.com/services/analytics

---

## References

- **Service Documentation**: `/docs/Analytics_DW.md`
- **API Spec**: `/packages/openapi/v1-final/analytics.yaml`
- **ClickHouse Docs**: https://clickhouse.com/docs
- **Grafana Dashboard**: `/observability/grafana/analytics-dashboard.json`
- **Change Log**: `/CHANGELOG.md`
