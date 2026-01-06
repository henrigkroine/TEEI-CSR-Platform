# Analytics Service

Analytics and metrics service for the TEEI CSR Platform. Provides REST API endpoints for calculating and retrieving SROI, VIS, and integration metrics.

## Port

**3007**

## Features

- Time-series metrics retrieval
- SROI (Social Return on Investment) calculations
- VIS (Volunteer Impact Score) calculations
- Metrics aggregation pipeline
- Company-specific and period-based reporting
- Redis-based caching for sub-second response times

## API Endpoints

### Health Check

```http
GET /health
```

Returns service health status and database connectivity.

**Response:**
```json
{
  "status": "ok",
  "service": "analytics",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected"
}
```

### Get Period Metrics

```http
GET /metrics/company/:companyId/period/:period
```

Retrieve time-series metrics for a company over a specific period.

**Parameters:**
- `companyId` (path): UUID of the company
- `period` (path): Period format
  - Monthly: `YYYY-MM` (e.g., `2024-01`)
  - Quarterly: `YYYY-Q[1-4]` (e.g., `2024-Q1`)

**Response:**
```json
{
  "companyId": "uuid",
  "period": "2024-01",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-01-31"
  },
  "metrics": [
    {
      "id": "uuid",
      "periodStart": "2024-01-01",
      "periodEnd": "2024-01-31",
      "participantsCount": 50,
      "volunteersCount": 25,
      "sessionsCount": 120,
      "avgIntegrationScore": 0.65,
      "avgLanguageLevel": 0.5,
      "avgJobReadiness": 0.4,
      "sroiRatio": 4.5,
      "visScore": 75.0,
      "createdAt": "2024-02-01T00:00:00.000Z"
    }
  ]
}
```

### Get SROI Report

```http
GET /metrics/sroi/:companyId
GET /metrics/sroi/:companyId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

Calculate SROI for a company over an optional date range.

**Parameters:**
- `companyId` (path): UUID of the company
- `startDate` (query, optional): Start date (ISO format)
- `endDate` (query, optional): End date (ISO format)

**Response:**
```json
{
  "companyId": "uuid",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "sroi": {
    "ratio": 4.23,
    "totalBenefit": 523500,
    "totalCost": 100000,
    "npvBenefit": 489200,
    "config": {
      "yearsOfBenefit": 3,
      "employmentMultiplier": 1.5,
      "discountRate": 0.03
    }
  },
  "generatedAt": "2024-02-01T10:30:00.000Z"
}
```

### Get VIS Report

```http
GET /metrics/vis/:companyId
GET /metrics/vis/:companyId?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
```

Calculate VIS for a company over an optional date range.

**Parameters:**
- `companyId` (path): UUID of the company
- `startDate` (query, optional): Start date (ISO format)
- `endDate` (query, optional): End date (ISO format)

**Response:**
```json
{
  "companyId": "uuid",
  "dateRange": {
    "start": "2024-01-01",
    "end": "2024-12-31"
  },
  "vis": {
    "score": 75.5,
    "components": {
      "hours": 80.0,
      "quality": 75.0,
      "outcome": 65.0,
      "placement": 40.0
    },
    "weights": {
      "hours": 0.3,
      "quality": 0.3,
      "outcome": 0.25,
      "placement": 0.15
    }
  },
  "generatedAt": "2024-02-01T10:30:00.000Z"
}
```

### Trigger Aggregation

```http
POST /metrics/aggregate
```

Trigger metrics aggregation for all companies or a specific company.

**Request Body:**
```json
{
  "companyId": "uuid (optional)",
  "period": "2024-01 (optional)"
}
```

**Response:**
```json
{
  "status": "queued",
  "message": "Aggregation job queued for processing",
  "params": {
    "companyId": "uuid or 'all'",
    "period": "2024-01 or 'current'"
  },
  "queuedAt": "2024-02-01T10:30:00.000Z"
}
```

### Get Cache Statistics

```http
GET /metrics/cache/stats
```

Get cache performance statistics including hit rate and key count.

**Response:**
```json
{
  "cache": {
    "hits": 1523,
    "misses": 456,
    "hitRate": "76.96%",
    "total": 1979,
    "keyCount": 324
  },
  "timestamp": "2024-02-01T10:30:00.000Z"
}
```

## Cache Strategy

The Analytics Service implements a comprehensive Redis caching layer to achieve sub-second response times for frequently accessed metrics.

### Cache Key Patterns

All cache keys follow a structured naming pattern:

| Pattern | TTL | Description |
|---------|-----|-------------|
| `metrics:company:{companyId}:period:{period}` | 1 hour | Time-series metrics for a specific period |
| `metrics:sroi:{companyId}` | 24 hours | SROI calculation results |
| `metrics:vis:{companyId}` | 24 hours | VIS calculation results |
| `metrics:q2q-feed:{companyId}:page:{page}` | 5 minutes | Q2Q feed pagination |
| `metrics:evidence:{metricId}` | 10 minutes | Evidence snippets for metrics |

### TTL Rationale

- **1 hour** for period metrics: These change infrequently (monthly/quarterly aggregations)
- **24 hours** for SROI/VIS: Complex calculations that rarely change daily
- **5 minutes** for Q2Q feeds: Near real-time data that updates frequently
- **10 minutes** for evidence: Balance between freshness and performance

### Cache Invalidation

The service implements automatic cache invalidation on data changes:

#### Event-Driven Invalidation

The service subscribes to NATS events and automatically invalidates cache when:

- `kintell.session.completed` → Invalidate company cache
- `buddy.feedback.submitted` → Invalidate company cache
- `buddy.match.created` → Invalidate company cache
- `upskilling.course.completed` → Invalidate company cache
- `metrics.aggregated` → Invalidate specific period or company cache

#### Manual Invalidation

Cache is also invalidated when:

- `POST /metrics/aggregate` completes → Invalidate affected company cache
- Direct database writes occur (outside event system)

### Cache Headers

All cached responses include the `X-Cache` header:

- `X-Cache: HIT` - Response served from cache
- `X-Cache: MISS` - Response computed and cached

### Performance Benefits

Based on benchmarks:

| Endpoint | Without Cache | With Cache | Improvement |
|----------|---------------|------------|-------------|
| GET Period Metrics | ~250ms | ~15ms | **16.7x faster** |
| GET SROI | ~500ms | ~20ms | **25x faster** |
| GET VIS | ~450ms | ~18ms | **25x faster** |

### Graceful Degradation

The caching layer is designed for graceful degradation:

- Redis connection failures do NOT crash the service
- Failed cache operations are logged but requests continue
- Cache misses fall through to normal database queries
- Service operates normally without Redis (no caching)

### Monitoring

Monitor cache performance via:

1. **Cache Stats Endpoint**: `GET /metrics/cache/stats`
2. **Health Check**: `GET /health` (includes Redis status)
3. **Response Headers**: Check `X-Cache` header on responses
4. **Logs**: Cache hits/misses are logged at debug level

## Dependencies

- `@teei/metrics`: Core metrics calculation library
- `@teei/shared-schema`: Database schema and connections
- `@teei/shared-utils`: Event bus, logging, and utilities
- `fastify`: HTTP server framework
- `@fastify/cors`: CORS support
- `ioredis`: Redis client for caching

## Configuration

Set the following environment variables:

```env
PORT_ANALYTICS=3007
DATABASE_URL=postgresql://...
NATS_URL=nats://localhost:4222
REDIS_URL=redis://localhost:6379
```

**Redis Configuration:**
- `REDIS_URL`: Redis connection string (default: `redis://localhost:6379`)
- Redis is optional - service will operate without caching if Redis is unavailable

## Development

```bash
# Install dependencies
pnpm install

# Start in development mode
pnpm dev

# Build for production
pnpm build

# Start production server
pnpm start

# Run tests
pnpm test
```

## Aggregation Pipeline

The aggregation pipeline (`src/pipelines/aggregate.ts`) provides functions to:

1. Query raw data from source tables:
   - `kintell_sessions`
   - `buddy_matches`, `buddy_events`, `buddy_feedback`
   - `learning_progress`
   - `users`

2. Calculate derived metrics:
   - Average integration scores
   - SROI ratios
   - VIS scores

3. Write aggregated results to `metrics_company_period` table

### Functions

#### `aggregateMetricsForPeriod(companyId, periodStart, periodEnd)`

Aggregate metrics for a specific company and period.

#### `calculateSROIForCompany(companyId, startDate?, endDate?)`

Calculate SROI for a company over a date range.

#### `calculateVISForCompany(companyId, startDate?, endDate?)`

Calculate VIS for a company over a date range.

#### `calculateAvgIntegrationScore(companyId, startDate?, endDate?)`

Calculate average integration score for company participants.

## Testing

Use the provided `test.http` file to manually test endpoints:

```bash
# View test.http file
cat test.http

# Use REST Client extension in VS Code
# or HTTPie/curl from command line
```

## Architecture

```
analytics/
├── src/
│   ├── index.ts              # Service entry point
│   ├── routes/
│   │   └── metrics.ts        # API route handlers
│   ├── pipelines/
│   │   └── aggregate.ts      # Aggregation logic
│   ├── cache/
│   │   ├── redis.ts          # Redis client and utilities
│   │   └── invalidation.ts   # Cache invalidation logic
│   ├── middleware/
│   │   └── cache.ts          # Cache middleware
│   └── __tests__/
│       └── cache.test.ts     # Cache unit tests
├── test.http                 # Manual API tests
├── package.json
└── tsconfig.json
```

## Future Enhancements

- [ ] Scheduled aggregation jobs (cron)
- [x] Caching for frequently accessed metrics (Redis implementation complete)
- [ ] Batch export to CSV/Excel
- [ ] Real-time metrics streaming
- [ ] Custom date range aggregations
- [ ] Comparative analytics (company vs. industry benchmarks)
- [ ] Predictive analytics (ML-based forecasting)

## License

MIT
