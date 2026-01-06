# Streaming & Analytics Quick Reference

Quick reference for SSE streaming and ClickHouse analytics APIs.

## Environment Variables

```bash
# Enable features
STREAMING_ENABLED=true
CLICKHOUSE_ENABLED=true

# Connection URLs
NATS_URL=nats://localhost:4222
REDIS_URL=redis://localhost:6379

# ClickHouse
CLICKHOUSE_HOST=localhost
CLICKHOUSE_PORT=8123
CLICKHOUSE_USER=teei
CLICKHOUSE_PASSWORD=teei_dev_password
CLICKHOUSE_DATABASE=teei_analytics

# Tuning
CLICKHOUSE_BATCH_SIZE=1000
CLICKHOUSE_BATCH_TIMEOUT_MS=10000
```

## SSE Streaming API

### Connect to Stream

```bash
# Browser
const es = new EventSource('http://localhost:3007/stream/updates?companyId=COMPANY_ID');

# cURL
curl -N -H "Accept: text/event-stream" \
  "http://localhost:3007/stream/updates?companyId=COMPANY_ID"

# With replay
curl -N -H "Accept: text/event-stream" \
  "http://localhost:3007/stream/updates?companyId=COMPANY_ID&lastEventId=EVENT_ID"
```

### Event Types

- `metric_updated` - Metric calculations
- `sroi_updated` - SROI updates
- `vis_updated` - Q2Q analysis
- `journey_flag_updated` - Journey changes

### Streaming Stats

```bash
curl http://localhost:3007/stream/stats
curl http://localhost:3007/stream/health
```

## Cohort Analytics API

### Get Cohort Metrics

```bash
GET /cohort/:id/metrics?metric=METRIC_NAME&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD

curl "http://localhost:3007/cohort/cohort-123/metrics?metric=integration_score&startDate=2025-01-01"
```

### Get Cohort Trends

```bash
GET /cohort/:id/trends?metric=METRIC_NAME&periods=NUMBER

curl "http://localhost:3007/cohort/cohort-123/trends?metric=integration_score&periods=12"
```

### Get Cohort Overview

```bash
GET /cohort/:id/overview?periodStart=YYYY-MM-DD

curl "http://localhost:3007/cohort/cohort-123/overview?periodStart=2025-11-01"
```

### Compare Cohorts

```bash
POST /cohort/compare
Content-Type: application/json

curl -X POST http://localhost:3007/cohort/compare \
  -H "Content-Type: application/json" \
  -d '{
    "cohortIds": ["cohort-a", "cohort-b"],
    "metric": "integration_score",
    "periodStart": "2025-11-01"
  }'
```

### Top Cohorts

```bash
GET /cohort/top?metric=METRIC_NAME&limit=NUMBER&periodStart=YYYY-MM-DD

curl "http://localhost:3007/cohort/top?metric=integration_score&limit=10"
```

## ClickHouse Queries

### Check Connection

```bash
curl http://localhost:8123/ping
clickhouse-client --query "SELECT 1"
```

### Query Events

```sql
-- Count total events
SELECT count() FROM teei_analytics.events;

-- Events by type (last 7 days)
SELECT
    event_type,
    count() as event_count
FROM teei_analytics.events
WHERE timestamp > now() - INTERVAL 7 DAY
GROUP BY event_type
ORDER BY event_count DESC;

-- Events by company
SELECT
    company_id,
    count() as event_count
FROM teei_analytics.events
WHERE timestamp > now() - INTERVAL 1 DAY
GROUP BY company_id;
```

### Query Metrics

```sql
-- Latest metrics for company
SELECT
    metric_name,
    metric_value,
    period_start
FROM teei_analytics.metrics_timeseries
WHERE company_id = 'COMPANY_ID'
    AND period_start = (SELECT MAX(period_start) FROM teei_analytics.metrics_timeseries)
ORDER BY metric_name;

-- Metric trends
SELECT
    period_start,
    avg(metric_value) as avg_value
FROM teei_analytics.metrics_timeseries
WHERE company_id = 'COMPANY_ID'
    AND metric_name = 'integration_score'
GROUP BY period_start
ORDER BY period_start DESC
LIMIT 12;
```

### Query Cohorts

```sql
-- Cohort metrics (from MV)
SELECT *
FROM teei_analytics.cohort_metrics_mv
WHERE cohort_id = 'COHORT_ID'
    AND metric_name = 'integration_score'
ORDER BY period_start DESC
LIMIT 6;

-- Compare cohorts
SELECT
    cohort_id,
    avg_value,
    sample_size
FROM teei_analytics.cohort_metrics_mv
WHERE cohort_id IN ('cohort-a', 'cohort-b')
    AND metric_name = 'integration_score'
    AND period_start = (SELECT MAX(period_start) FROM teei_analytics.cohort_metrics_mv)
ORDER BY avg_value DESC;
```

### System Queries

```sql
-- Table sizes
SELECT
    table,
    formatReadableSize(sum(bytes)) as size
FROM system.parts
WHERE active AND database = 'teei_analytics'
GROUP BY table;

-- Partition count
SELECT
    table,
    count() as partitions
FROM system.parts
WHERE active AND database = 'teei_analytics'
GROUP BY table;

-- Recent queries
SELECT
    query,
    query_duration_ms,
    read_rows
FROM system.query_log
WHERE type = 'QueryFinish'
ORDER BY event_time DESC
LIMIT 10;
```

## Postgres Materialized Views

### Query MVs

```sql
-- Company dashboard
SELECT * FROM company_dashboard_mv WHERE company_id = 'COMPANY_ID';

-- Program performance
SELECT * FROM program_performance_mv
WHERE company_id = 'COMPANY_ID'
ORDER BY avg_match_quality DESC;

-- Language groups
SELECT * FROM language_group_performance_mv
WHERE company_id = 'COMPANY_ID'
ORDER BY avg_integration_score DESC;

-- Journey stages
SELECT * FROM journey_stage_distribution_mv
WHERE company_id = 'COMPANY_ID'
ORDER BY user_count DESC;
```

### Refresh MVs

```sql
-- Refresh all MVs
SELECT refresh_analytics_materialized_views();

-- Refresh individual MV
REFRESH MATERIALIZED VIEW CONCURRENTLY company_dashboard_mv;

-- Check last refresh
SELECT
    matviewname,
    last_refresh
FROM pg_matviews
WHERE schemaname = 'public'
    AND matviewname LIKE '%_mv';
```

## Testing

### Unit Tests

```bash
cd services/analytics
pnpm test                           # All tests
pnpm test sse.test.ts              # SSE tests
pnpm test clickhouse.test.ts       # ClickHouse tests
```

### Load Test

```bash
cd tests/k6
k6 run streaming-load.js

# With custom settings
BASE_URL=http://localhost:3007 COMPANY_ID=test k6 run streaming-load.js
```

### Manual SSE Test

```bash
# Terminal 1: Connect to SSE
curl -N -H "Accept: text/event-stream" \
  "http://localhost:3007/stream/updates?companyId=test-company"

# Terminal 2: Publish event
nats pub metrics.calculated '{
  "companyId": "test-company",
  "metricName": "integration_score",
  "value": 0.85
}'
```

## Monitoring

### Service Health

```bash
# Analytics service
curl http://localhost:3007/health

# Streaming
curl http://localhost:3007/stream/health
curl http://localhost:3007/stream/stats

# ClickHouse
curl http://localhost:8123/ping
```

### Docker Logs

```bash
docker logs -f teei-analytics
docker logs -f teei-clickhouse
docker logs -f teei-nats
docker logs -f teei-redis
```

### Service Status

```bash
docker ps | grep teei
docker-compose ps
```

## Common Operations

### Start Services

```bash
docker-compose up -d
docker-compose up -d clickhouse  # Just ClickHouse
```

### Stop Services

```bash
docker-compose down
docker-compose stop clickhouse   # Just ClickHouse
```

### View Service Logs

```bash
docker-compose logs -f analytics
docker-compose logs -f clickhouse
```

### Restart Service

```bash
docker-compose restart analytics
```

### Run Migrations

```bash
cd packages/shared-schema
pnpm run migrate
```

### Start Analytics in Dev Mode

```bash
cd services/analytics
pnpm dev
```

## Troubleshooting

### SSE Not Working

```bash
# Check streaming enabled
curl http://localhost:3007/stream/health | jq '.streaming.enabled'

# Check NATS running
docker ps | grep nats
nats sub "metrics.*"

# Check analytics logs
docker logs teei-analytics | grep -i "streaming"
```

### ClickHouse Not Storing Events

```bash
# Check ClickHouse enabled
curl http://localhost:3007/health | jq '.dependencies.clickhouse'

# Check ClickHouse running
curl http://localhost:8123/ping

# Check event count
clickhouse-client --query "SELECT count() FROM teei_analytics.events"

# Check analytics logs
docker logs teei-analytics | grep -i "clickhouse"
```

### Slow Queries

```bash
# Check ClickHouse query log
clickhouse-client --query "
  SELECT query, query_duration_ms
  FROM system.query_log
  WHERE type = 'QueryFinish' AND query_duration_ms > 1000
  ORDER BY event_time DESC
  LIMIT 10
"

# Check table sizes
clickhouse-client --query "
  SELECT table, formatReadableSize(sum(bytes)) as size
  FROM system.parts
  WHERE active AND database = 'teei_analytics'
  GROUP BY table
"
```

## Performance Targets

- **SSE Latency**: < 500ms (p95)
- **SSE Success Rate**: > 95%
- **ClickHouse Write**: 1000 events/s
- **ClickHouse Query**: < 1s
- **Concurrent SSE**: 100+ per company

## File Locations

```
services/analytics/src/stream/      # SSE streaming
services/analytics/src/sinks/       # ClickHouse integration
services/analytics/src/queries/     # Cohort queries
services/analytics/src/routes/      # API routes
scripts/init-clickhouse.sql         # ClickHouse schema
packages/shared-schema/migrations/  # Postgres schema
tests/k6/                          # Load tests
docs/                              # Documentation
```

## Documentation

- [Streaming Updates](./Streaming_Updates.md) - Full SSE docs
- [Analytics DW](./Analytics_DW.md) - Full ClickHouse docs
- [Setup Guide](./STREAMING_AND_ANALYTICS_SETUP.md) - Installation & config
- [Implementation Summary](../IMPLEMENTATION_SUMMARY_STREAMING_ANALYTICS.md) - Overview

## Support

For issues or questions:
1. Check logs: `docker logs teei-analytics`
2. Review health endpoints
3. Consult documentation
4. Check GitHub issues
