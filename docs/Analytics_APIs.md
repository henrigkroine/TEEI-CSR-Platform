# Analytics APIs Documentation

## Overview

The Analytics Service provides high-performance time-series analytics and business intelligence for the TEEI CSR Platform. Built on ClickHouse for columnar analytics, Redis for caching, and Postgres for metadata, it offers real-time insights into program outcomes, cohort comparisons, conversion funnels, and industry benchmarks.

**Base URL**: `http://localhost:3023`
**API Version**: `v1`

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Postgres   │────▶│  Ingestion   │────▶│ ClickHouse  │
│  (source)   │     │   Pipeline   │     │  (analytics)│
└─────────────┘     └──────────────┘     └─────────────┘
                           │                      │
                           │                      ▼
                           │              ┌─────────────┐
                           │              │   Redis     │
                           │              │   (cache)   │
                           │              └─────────────┘
                           │                      │
                           ▼                      ▼
                    ┌──────────────────────────────┐
                    │    Analytics API Service      │
                    │  - Trends                     │
                    │  - Cohorts                    │
                    │  - Funnels                    │
                    │  - Benchmarks                 │
                    └──────────────────────────────┘
```

## Features

- **Time-Series Trends**: Track outcome scores over time with daily/weekly/monthly granularity
- **Cohort Comparisons**: Compare multiple companies or groups across dimensions
- **Conversion Funnels**: Analyze user journey drop-offs and conversion rates
- **Industry Benchmarks**: Compare against industry, region, or company size peers
- **Query Budgets**: Per-tenant rate limiting (10,000 queries/day default)
- **Redis Caching**: 70%+ cache hit rate, smart invalidation
- **Materialized Views**: Pre-aggregated data for sub-second queries

## Authentication

All endpoints require JWT authentication via the API Gateway. Include the token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

## Common Response Format

All analytics endpoints return responses in this format:

```json
{
  "data": { /* endpoint-specific data */ },
  "pagination": {  /* only for paginated endpoints */
    "page": 1,
    "pageSize": 20,
    "total": 150
  },
  "metadata": {
    "cached": false,
    "queryTimeMs": 45,
    "budgetRemaining": 9955
  }
}
```

## Rate Limiting

Each company has a daily query budget (default: 10,000 queries/day). When the budget is exceeded, the API returns:

```json
{
  "error": "Query budget exceeded",
  "message": "Query budget exceeded. Limit: 10000, Used: 10000. Resets at 2025-11-15T00:00:00Z",
  "budgetRemaining": 0
}
```

**HTTP Status**: `429 Too Many Requests`

---

## API Endpoints

### 1. Trends API

**Endpoint**: `GET /v1/analytics/trends`

Get time-series trends for outcome scores over time.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `companyId` | UUID | Yes | - | Company UUID |
| `dimension` | Enum | Yes | - | One of: `confidence`, `belonging`, `lang_level_proxy`, `job_readiness`, `well_being` |
| `startDate` | ISO Date | No | - | Start date (YYYY-MM-DD) |
| `endDate` | ISO Date | No | - | End date (YYYY-MM-DD) |
| `granularity` | Enum | No | `day` | One of: `day`, `week`, `month` |
| `page` | Integer | No | `1` | Page number |
| `pageSize` | Integer | No | `20` | Results per page (max 100) |

#### Example Request

```bash
curl -X GET "http://localhost:3023/v1/analytics/trends?companyId=123e4567-e89b-12d3-a456-426614174000&dimension=confidence&granularity=week&startDate=2025-01-01&endDate=2025-11-14&page=1&pageSize=10" \
  -H "Authorization: Bearer <token>"
```

#### Example Response

```json
{
  "data": [
    {
      "period": "2025-11-11",
      "dimension": "confidence",
      "avgScore": 0.782,
      "minScore": 0.543,
      "maxScore": 0.965,
      "scoreCount": 142,
      "stddevScore": 0.089
    },
    {
      "period": "2025-11-04",
      "dimension": "confidence",
      "avgScore": 0.756,
      "minScore": 0.521,
      "maxScore": 0.943,
      "scoreCount": 138,
      "stddevScore": 0.092
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "total": 45
  },
  "metadata": {
    "cached": false,
    "queryTimeMs": 87,
    "budgetRemaining": 9999
  }
}
```

#### Performance

- **Cache TTL**: 1 hour
- **p95 Latency**: < 200ms (target)
- **Materialized Views**: Uses daily/weekly/monthly pre-aggregated views

---

### 2. Cohorts API

**Endpoint**: `GET /v1/analytics/cohorts`

Compare multiple companies or cohorts across a specific dimension.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `companyIds` | UUID[] | Yes | - | Comma-separated UUIDs (max 10) |
| `dimension` | Enum | Yes | - | One of: `confidence`, `belonging`, `lang_level_proxy`, `job_readiness`, `well_being` |
| `startDate` | ISO Date | No | - | Start date (YYYY-MM-DD) |
| `endDate` | ISO Date | No | - | End date (YYYY-MM-DD) |
| `groupBy` | Enum | No | - | One of: `program`, `location`, `demographic` |

#### Example Request

```bash
curl -X GET "http://localhost:3023/v1/analytics/cohorts?companyIds=123e4567-e89b-12d3-a456-426614174000,223e4567-e89b-12d3-a456-426614174001&dimension=job_readiness&startDate=2025-01-01&endDate=2025-11-14" \
  -H "Authorization: Bearer <token>"
```

#### Example Response

```json
{
  "data": [
    {
      "companyId": "123e4567-e89b-12d3-a456-426614174000",
      "avgScore": 0.823,
      "scoreCount": 1245,
      "minScore": 0.432,
      "maxScore": 0.987,
      "medianScore": 0.831,
      "p25Score": 0.712,
      "p75Score": 0.912
    },
    {
      "companyId": "223e4567-e89b-12d3-a456-426614174001",
      "avgScore": 0.745,
      "scoreCount": 987,
      "minScore": 0.389,
      "maxScore": 0.965,
      "medianScore": 0.753,
      "p25Score": 0.643,
      "p75Score": 0.854
    }
  ],
  "metadata": {
    "cached": true,
    "queryTimeMs": 12,
    "budgetRemaining": 9998,
    "cohortsCompared": 2
  }
}
```

#### Performance

- **Cache TTL**: 6 hours
- **p95 Latency**: < 500ms (target)

---

### 3. Funnels API

**Endpoint**: `GET /v1/analytics/funnels`

Analyze conversion funnels to identify drop-off points in user journeys.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `companyId` | UUID | Yes | - | Company UUID |
| `stages` | String[] | Yes | - | Comma-separated stage names (e.g., "enrolled,matched,completed") |
| `startDate` | ISO Date | No | - | Start date (YYYY-MM-DD) |
| `endDate` | ISO Date | No | - | End date (YYYY-MM-DD) |

#### Example Request

```bash
curl -X GET "http://localhost:3023/v1/analytics/funnels?companyId=123e4567-e89b-12d3-a456-426614174000&stages=enrolled,matched,session_completed,program_completed&startDate=2025-01-01&endDate=2025-11-14" \
  -H "Authorization: Bearer <token>"
```

#### Example Response

```json
{
  "data": {
    "stages": [
      {
        "stage": "enrolled",
        "users": 1000,
        "dropoff": 0,
        "conversionRate": 100
      },
      {
        "stage": "matched",
        "users": 850,
        "dropoff": 150,
        "conversionRate": 85
      },
      {
        "stage": "session_completed",
        "users": 680,
        "dropoff": 170,
        "conversionRate": 80
      },
      {
        "stage": "program_completed",
        "users": 544,
        "dropoff": 136,
        "conversionRate": 80
      }
    ],
    "totalUsers": 1000,
    "overallConversionRate": 54.4
  },
  "metadata": {
    "cached": false,
    "queryTimeMs": 134,
    "budgetRemaining": 9997,
    "stagesAnalyzed": 4
  }
}
```

#### Performance

- **Cache TTL**: 1 hour
- **p95 Latency**: < 300ms (target)

---

### 4. Benchmarks API

**Endpoint**: `GET /v1/analytics/benchmarks`

Compare company performance against industry, region, or company size benchmarks.

#### Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `companyId` | UUID | Yes | - | Company UUID |
| `compareWith` | Enum | Yes | - | One of: `industry`, `region`, `size_cohort` |
| `dimension` | Enum | Yes | - | One of: `confidence`, `belonging`, `lang_level_proxy`, `job_readiness`, `well_being` |
| `startDate` | ISO Date | No | - | Start date (YYYY-MM-DD) |
| `endDate` | ISO Date | No | - | End date (YYYY-MM-DD) |

#### Example Request

```bash
curl -X GET "http://localhost:3023/v1/analytics/benchmarks?companyId=123e4567-e89b-12d3-a456-426614174000&compareWith=industry&dimension=well_being&startDate=2025-01-01&endDate=2025-11-14" \
  -H "Authorization: Bearer <token>"
```

#### Example Response

```json
{
  "data": {
    "companyScore": 0.823,
    "benchmarks": [
      {
        "cohort": "Technology",
        "benchmarkAvgScore": 0.789,
        "medianScore": 0.795,
        "difference": 0.034,
        "percentageDifference": 4.31
      },
      {
        "cohort": "Manufacturing",
        "benchmarkAvgScore": 0.712,
        "medianScore": 0.718,
        "difference": 0.111,
        "percentageDifference": 15.59
      },
      {
        "cohort": "Healthcare",
        "benchmarkAvgScore": 0.845,
        "medianScore": 0.851,
        "difference": -0.022,
        "percentageDifference": -2.60
      }
    ],
    "compareWith": "industry"
  },
  "metadata": {
    "cached": true,
    "queryTimeMs": 9,
    "budgetRemaining": 9996,
    "benchmarksCompared": 3
  }
}
```

#### Performance

- **Cache TTL**: 6 hours
- **Materialized Views**: Industry, region, and size cohort aggregations

---

## Health Endpoints

### Health Check

**Endpoint**: `GET /health`

Basic health check.

```bash
curl -X GET "http://localhost:3023/health"
```

**Response**:
```json
{
  "status": "ok",
  "alive": true,
  "ready": true,
  "timestamp": "2025-11-14T10:30:00Z"
}
```

### Liveness Probe

**Endpoint**: `GET /health/live`

Kubernetes liveness probe.

### Readiness Probe

**Endpoint**: `GET /health/ready`

Kubernetes readiness probe with dependency checks.

**Response**:
```json
{
  "status": "ready",
  "ready": true,
  "dependencies": {
    "clickhouse": true,
    "redis": true
  }
}
```

### Dependencies Health

**Endpoint**: `GET /health/dependencies`

Detailed dependency health status.

### Cache Statistics

**Endpoint**: `GET /health/cache`

Redis cache performance metrics.

**Response**:
```json
{
  "status": "ok",
  "stats": {
    "hits": 7234,
    "misses": 1876,
    "keys": 542,
    "memory": "12.4MB",
    "hitRate": 79.41
  },
  "timestamp": "2025-11-14T10:30:00Z"
}
```

---

## Error Responses

### 400 Bad Request

Invalid query parameters.

```json
{
  "error": "Invalid query parameters",
  "details": [
    {
      "path": ["dimension"],
      "message": "Invalid enum value. Expected 'confidence' | 'belonging' | 'lang_level_proxy' | 'job_readiness' | 'well_being'"
    }
  ]
}
```

### 429 Too Many Requests

Query budget exceeded.

```json
{
  "error": "Query budget exceeded",
  "message": "Query budget exceeded. Limit: 10000, Used: 10000. Resets at 2025-11-15T00:00:00Z",
  "budgetRemaining": 0
}
```

### 500 Internal Server Error

Server-side error.

```json
{
  "error": "Internal server error",
  "message": "ClickHouse query timeout"
}
```

---

## Data Ingestion

The Analytics Service automatically syncs data from Postgres to ClickHouse every **15 minutes**. The ingestion pipeline:

1. **Fetches** new outcome_scores, companies, and user_events from Postgres
2. **Transforms** data for ClickHouse columnar format
3. **Inserts** batch records (1000 rows at a time)
4. **Updates** sync status tracking
5. **Invalidates** analytics cache
6. **Publishes** `analytics.synced` event to NATS

### Sync Status

Check sync status via ClickHouse:

```sql
SELECT * FROM sync_status ORDER BY sync_timestamp DESC;
```

---

## Performance Tuning

### Query Optimization

- Use appropriate `granularity` (day/week/month) based on date range
- Limit cohort comparisons to max 10 companies
- Use date filters to reduce data scanned
- Cache hit rate target: > 70%

### Materialized Views

Pre-aggregated views for fast queries:
- `outcome_scores_daily_mv` - Daily aggregations
- `outcome_scores_weekly_mv` - Weekly aggregations
- `outcome_scores_monthly_mv` - Monthly aggregations
- `industry_benchmarks_mv` - Industry cohort benchmarks
- `region_benchmarks_mv` - Region cohort benchmarks
- `size_benchmarks_mv` - Company size cohort benchmarks

### Cache Strategy

| Endpoint | TTL | Invalidation |
|----------|-----|--------------|
| Trends | 1 hour | On new data sync |
| Cohorts | 6 hours | On new data sync |
| Funnels | 1 hour | On new data sync |
| Benchmarks | 6 hours | On new data sync |

---

## Environment Configuration

```bash
# Analytics Service
PORT_ANALYTICS=3008

# ClickHouse
CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_USER=teei
CLICKHOUSE_PASSWORD=teei_dev_password
CLICKHOUSE_DB=teei_analytics

# Redis
REDIS_URL=redis://localhost:6379

# Postgres (for ingestion)
DATABASE_URL=postgres://teei:teei_dev_password@localhost:5432/teei_platform

# NATS (for events)
NATS_URL=nats://localhost:4222
```

---

## Best Practices

1. **Use caching wisely**: Repeated queries are served from cache for 1-6 hours
2. **Monitor budgets**: Track `budgetRemaining` in responses
3. **Optimize date ranges**: Smaller ranges = faster queries
4. **Batch requests**: Cohorts API can compare up to 10 companies in one request
5. **Check cache stats**: Use `/health/cache` to monitor hit rates
6. **Leverage materialized views**: Weekly/monthly granularity is faster than daily

---

## Integration Example

```typescript
import axios from 'axios';

const analyticsClient = axios.create({
  baseURL: 'http://localhost:3023',
  headers: {
    Authorization: `Bearer ${jwtToken}`,
  },
});

// Get weekly trends
const trendsResponse = await analyticsClient.get('/v1/analytics/trends', {
  params: {
    companyId: '123e4567-e89b-12d3-a456-426614174000',
    dimension: 'confidence',
    granularity: 'week',
    startDate: '2025-01-01',
    endDate: '2025-11-14',
    page: 1,
    pageSize: 20,
  },
});

console.log('Trends:', trendsResponse.data.data);
console.log('Budget remaining:', trendsResponse.data.metadata.budgetRemaining);
console.log('Cached:', trendsResponse.data.metadata.cached);
```

---

## Support

For issues or questions:
- GitHub Issues: [TEEI-CSR-Platform](https://github.com/teei/csr-platform)
- Documentation: `/docs`
- Health Status: `GET /health/dependencies`
