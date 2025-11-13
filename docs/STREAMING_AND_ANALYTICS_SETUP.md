# Streaming & Analytics Setup Guide

Quick start guide for SSE streaming and ClickHouse analytics in the TEEI CSR Platform.

## Prerequisites

- Docker and Docker Compose
- Node.js 18+ and pnpm
- Running TEEI Platform (Postgres, NATS, Redis)

## Quick Start

### 1. Start Infrastructure

```bash
# Start all services including ClickHouse
docker-compose up -d

# Verify ClickHouse is running
docker ps | grep clickhouse
curl http://localhost:8123/ping
```

### 2. Configure Environment

```bash
# Copy environment template
cp services/analytics/.env.example services/analytics/.env

# Edit configuration
nano services/analytics/.env
```

**Required Variables:**
```bash
STREAMING_ENABLED=true
CLICKHOUSE_ENABLED=true
NATS_URL=nats://localhost:4222
REDIS_URL=redis://localhost:6379
```

### 3. Run Database Migrations

```bash
# Run Postgres migrations (cohorts and materialized views)
cd packages/shared-schema
pnpm run migrate

# ClickHouse schema is auto-initialized via docker-compose
# Located in: scripts/init-clickhouse.sql
```

### 4. Start Analytics Service

```bash
cd services/analytics

# Install dependencies
pnpm install

# Start in development mode
pnpm dev

# Or start in production mode
pnpm build
pnpm start
```

**Expected Output:**
```
[analytics] Redis client initialized
[analytics] SSE streaming initialized
[analytics] ClickHouse event sink initialized
[analytics] Analytics Service running on port 3007
```

## Verification

### 1. Health Checks

```bash
# Check analytics service health
curl http://localhost:3007/health

# Expected response:
{
  "status": "ok",
  "service": "analytics",
  "dependencies": {
    "redis": "ok",
    "clickhouse": "ok"
  },
  "features": {
    "streaming": true,
    "clickhouse": true
  }
}
```

### 2. Test SSE Streaming

```bash
# Open SSE connection (keep terminal open)
curl -N -H "Accept: text/event-stream" \
  "http://localhost:3007/stream/updates?companyId=test-company"

# In another terminal, publish a test event
# (requires NATS CLI: brew install nats-io/nats-tools/nats)
nats pub metrics.calculated '{
  "companyId": "test-company",
  "metricName": "integration_score",
  "value": 0.85,
  "periodStart": "2025-11-01"
}'

# You should see the event in the SSE stream:
# event: metric_updated
# data: {"companyId":"test-company","metricName":"integration_score","value":0.85}
# id: metrics.calculated-12345-1699999999999
```

### 3. Test ClickHouse Queries

```bash
# Check if events are being stored
clickhouse-client --query "SELECT count() FROM teei_analytics.events"

# Check metrics
clickhouse-client --query "SELECT * FROM teei_analytics.metrics_timeseries LIMIT 5"

# Check cohort metrics (after data is populated)
clickhouse-client --query "SELECT * FROM teei_analytics.cohort_metrics_mv LIMIT 5"
```

### 4. Test Cohort API

```bash
# Get cohort metrics (after creating cohorts and data)
curl "http://localhost:3007/cohort/cohort-id/metrics?metric=integration_score"

# Get cohort trends
curl "http://localhost:3007/cohort/cohort-id/trends?metric=integration_score&periods=6"

# Compare cohorts
curl -X POST http://localhost:3007/cohort/compare \
  -H "Content-Type: application/json" \
  -d '{
    "cohortIds": ["cohort-a", "cohort-b"],
    "metric": "integration_score"
  }'
```

## Creating Cohorts

### Via Postgres

```sql
-- Create a cohort
INSERT INTO cohorts (company_id, name, description, filters)
VALUES (
  'your-company-id',
  'Ukrainian Mentorship Program',
  'Participants in Ukrainian mentorship program',
  '{"language": "uk", "program": "mentorship"}'::jsonb
)
RETURNING id;

-- Add users to cohort
INSERT INTO user_cohorts (user_id, cohort_id, company_id)
SELECT
  u.id,
  'cohort-id-from-above',
  'your-company-id'
FROM users u
WHERE u.company_id = 'your-company-id'
  AND u.language = 'uk';
```

### Sync to ClickHouse

Cohort data should be synced to ClickHouse:

```sql
-- Insert cohort to ClickHouse
INSERT INTO teei_analytics.cohorts VALUES (
  'cohort-id',
  'company-id',
  'Ukrainian Mentorship Program',
  'Participants in Ukrainian mentorship program',
  '{"language": "uk", "program": "mentorship"}',
  now(),
  now()
);

-- Insert user cohort memberships
INSERT INTO teei_analytics.user_cohorts
SELECT user_id, cohort_id, company_id, joined_at
FROM user_cohorts_postgres;  -- From Postgres
```

## Monitoring

### SSE Streaming Stats

```bash
# Get streaming statistics
curl http://localhost:3007/stream/stats

# Response:
{
  "connections": {
    "totalConnections": 10,
    "activeCompanies": 3,
    "connectionsByCompany": {
      "company-a": 5,
      "company-b": 3,
      "company-c": 2
    }
  },
  "replayCache": {
    "companies": 3,
    "totalEvents": 250,
    "eventsByCompany": {...}
  }
}
```

### ClickHouse Monitoring

```bash
# Check ingestion rate
clickhouse-client --query "
  SELECT
    toStartOfMinute(timestamp) as minute,
    count() as events_per_minute
  FROM teei_analytics.events
  WHERE timestamp > now() - INTERVAL 1 HOUR
  GROUP BY minute
  ORDER BY minute DESC
  LIMIT 10
"

# Check storage usage
clickhouse-client --query "
  SELECT
    table,
    formatReadableSize(sum(bytes)) as size,
    count() as partitions
  FROM system.parts
  WHERE active AND database = 'teei_analytics'
  GROUP BY table
"

# Check query performance
clickhouse-client --query "
  SELECT
    query,
    query_duration_ms,
    read_rows,
    read_bytes
  FROM system.query_log
  WHERE type = 'QueryFinish'
    AND query_duration_ms > 1000
  ORDER BY event_time DESC
  LIMIT 10
"
```

### Materialized View Refresh

```bash
# Check Postgres MV freshness
psql -U teei -d teei_platform -c "
  SELECT
    schemaname,
    matviewname,
    last_refresh
  FROM pg_matviews
  WHERE schemaname = 'public'
    AND matviewname LIKE '%_mv'
"

# Manually refresh MVs
psql -U teei -d teei_platform -c "SELECT refresh_analytics_materialized_views();"
```

## Load Testing

### SSE Streaming Load Test

```bash
# Install k6
brew install k6  # macOS
# or: https://k6.io/docs/get-started/installation/

# Run load test
cd tests/k6
k6 run streaming-load.js

# Expected results:
# - 95%+ connection success rate
# - < 500ms event latency (p95)
# - < 10 connection errors
```

## Troubleshooting

### SSE Not Working

**Problem:** Clients not receiving events

**Solutions:**
1. Check `STREAMING_ENABLED=true` in environment
2. Verify NATS is running: `docker ps | grep nats`
3. Check analytics logs: `docker logs teei-analytics`
4. Test NATS connectivity: `nats sub "metrics.*"`

### ClickHouse Not Storing Events

**Problem:** Events not appearing in ClickHouse

**Solutions:**
1. Check `CLICKHOUSE_ENABLED=true` in environment
2. Verify ClickHouse is running: `curl http://localhost:8123/ping`
3. Check event sink logs for errors
4. Verify NATS events are being published
5. Check dead letter queue: See analytics service logs

### Slow Queries

**Problem:** Cohort queries taking too long

**Solutions:**
1. Check if querying correct table (use MVs when possible)
2. Add time-range filters to queries
3. Verify indexes are present: `SHOW CREATE TABLE cohort_metrics_mv`
4. Check partition count: `SELECT count() FROM system.parts WHERE table = 'events'`
5. Consider increasing ClickHouse resources

### Materialized Views Not Updating

**Problem:** Postgres MVs showing stale data

**Solutions:**
1. Manually refresh: `SELECT refresh_analytics_materialized_views();`
2. Set up automatic refresh (pg_cron):
   ```sql
   SELECT cron.schedule('refresh-analytics-mvs', '*/5 * * * *',
     'SELECT refresh_analytics_materialized_views();');
   ```
3. Check for errors in Postgres logs
4. Verify source tables have data

## Production Deployment

### Environment Variables

For production, set these environment variables:

```bash
# Analytics Service
STREAMING_ENABLED=true
CLICKHOUSE_ENABLED=true

# Security
JWT_SECRET=your-secret-key
ALLOWED_ORIGINS=https://your-domain.com

# ClickHouse
CLICKHOUSE_HOST=clickhouse.your-domain.com
CLICKHOUSE_USER=prod_user
CLICKHOUSE_PASSWORD=strong-password

# Redis (with authentication)
REDIS_URL=redis://:password@redis.your-domain.com:6379

# NATS (with authentication)
NATS_URL=nats://user:password@nats.your-domain.com:4222
```

### Scaling Considerations

**ClickHouse:**
- Use replicated tables for high availability
- Add more shards for horizontal scaling
- Configure retention policies to manage storage

**SSE Streaming:**
- Use load balancer with sticky sessions
- Consider Redis Pub/Sub for multi-instance coordination
- Monitor connection count per instance

**Materialized Views:**
- Schedule refreshes during off-peak hours
- Consider incremental MV updates for large datasets
- Monitor refresh duration

### Backup and Recovery

**ClickHouse:**
```bash
# Backup
clickhouse-client --query "BACKUP TABLE teei_analytics.events TO Disk('backups', 'events_backup.zip')"

# Restore
clickhouse-client --query "RESTORE TABLE teei_analytics.events FROM Disk('backups', 'events_backup.zip')"
```

**Postgres MVs:**
- Included in regular Postgres backups
- Can be rebuilt from source tables if corrupted

## Next Steps

1. Set up monitoring dashboards (Grafana)
2. Configure alerting for:
   - High SSE connection failures
   - ClickHouse ingestion lag
   - MV refresh failures
3. Implement JWT authentication for SSE
4. Set up automated partition management for ClickHouse
5. Configure per-company streaming feature flags

## Resources

- [Streaming Updates Documentation](./Streaming_Updates.md)
- [Analytics DW Documentation](./Analytics_DW.md)
- [k6 Load Tests](../tests/k6/README.md)
- [ClickHouse Official Docs](https://clickhouse.com/docs)
- [Server-Sent Events Spec](https://html.spec.whatwg.org/multipage/server-sent-events.html)
