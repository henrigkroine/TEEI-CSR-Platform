# Status API Documentation

## Overview

The Status API provides real-time system status information for the TEEI CSR Platform, including service health, performance metrics, and uptime statistics. This API powers the public Trust Center status page.

**Agent**: Status API Engineer (Agent 1.6)
**Reference**: AGENTS.md § Trust Boardroom Implementation

---

## Endpoints

### GET /status.json

Returns current system status with aggregated health information.

**Authentication**: None (public endpoint)

**Caching**:
- Cache-Control: `public, max-age=60`
- Redis cache: 60 seconds TTL
- Background refresh: 30 seconds

**Rate Limiting**: Standard rate limits apply (100 req/min per IP)

#### Response Schema

```typescript
interface StatusResponse {
  status: 'operational' | 'degraded' | 'outage';
  timestamp: string; // ISO 8601
  services: ServiceStatus[];
  metrics: PerformanceMetrics;
  performance: WebVitals;
  uptime: UptimeStats;
}

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'outage';
  latency?: number; // milliseconds
}

interface PerformanceMetrics {
  p95Latency: number; // milliseconds
  p99Latency: number; // milliseconds
  errorRate: number; // percentage
  requestsPerMinute: number;
}

interface WebVitals {
  lcp: number | null; // Largest Contentful Paint (ms)
  fid: number | null; // First Input Delay (ms)
  cls: number | null; // Cumulative Layout Shift
}

interface UptimeStats {
  percentage: number; // 30-day uptime %
  lastIncident: string | null; // ISO 8601 or null
}
```

#### Example Response

```json
{
  "status": "operational",
  "timestamp": "2025-11-17T10:30:45.123Z",
  "services": [
    {
      "name": "API Gateway",
      "status": "operational",
      "latency": 12
    },
    {
      "name": "Reporting Service",
      "status": "operational",
      "latency": 45
    },
    {
      "name": "Analytics Service",
      "status": "operational",
      "latency": 38
    },
    {
      "name": "Impact-In Service",
      "status": "operational",
      "latency": 56
    },
    {
      "name": "Q2Q AI Service",
      "status": "operational",
      "latency": 124
    }
  ],
  "metrics": {
    "p95Latency": 45.5,
    "p99Latency": 89.2,
    "errorRate": 0.15,
    "requestsPerMinute": 1250
  },
  "performance": {
    "lcp": 1200,
    "fid": 80,
    "cls": 0.05
  },
  "uptime": {
    "percentage": 99.985,
    "lastIncident": null
  }
}
```

#### Status Determination Logic

**Overall Status**:
- `operational`: All services healthy
- `degraded`: Some services degraded, but none completely down
- `outage`: One or more services completely unavailable

**Service Health Checks**:
- Each service health endpoint is checked with 5-second timeout
- Services are queried in parallel
- Health check failures count as "outage" status

#### Error Handling

If status generation fails, the API will attempt to serve stale cached data with:
```
Cache-Control: public, max-age=60, stale-while-revalidate=300
```

If no cached data is available, returns minimal status with 503 status code:
```json
{
  "status": "outage",
  "timestamp": "2025-11-17T10:30:45.123Z",
  "services": [],
  "metrics": {
    "p95Latency": 0,
    "p99Latency": 0,
    "errorRate": 0,
    "requestsPerMinute": 0
  },
  "performance": {
    "lcp": null,
    "fid": null,
    "cls": null
  },
  "uptime": {
    "percentage": 0,
    "lastIncident": null
  }
}
```

---

### GET /status/history

Returns historical uptime data for graphing.

**Authentication**: None (public endpoint)

**Caching**:
- Cache-Control: `public, max-age=300`
- Redis cache: 300 seconds (5 minutes) TTL

**Query Parameters**:
- `days` (optional): Number of days of history (1-90, default: 7)

#### Response Schema

```typescript
interface HistoricalDataPoint {
  timestamp: number; // Unix timestamp in milliseconds
  uptime: number; // Uptime percentage
}

type HistoryResponse = HistoricalDataPoint[];
```

#### Example Response

```json
[
  {
    "timestamp": 1700136000000,
    "uptime": 99.98
  },
  {
    "timestamp": 1700179200000,
    "uptime": 99.99
  },
  {
    "timestamp": 1700222400000,
    "uptime": 99.97
  }
]
```

#### Data Resolution

- **1-7 days**: 30-minute intervals
- **8-90 days**: 1-hour intervals

#### Error Responses

**Invalid Days Parameter** (400):
```json
{
  "success": false,
  "error": "Invalid days parameter (must be 1-90)"
}
```

**Query Failure** (500):
```json
{
  "success": false,
  "error": "Failed to retrieve historical data"
}
```

---

## Prometheus Integration

The Status API queries Prometheus for performance metrics using the following queries:

### Latency Metrics

**p95 Latency**:
```promql
histogram_quantile(0.95, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

**p99 Latency**:
```promql
histogram_quantile(0.99, sum(rate(http_request_duration_seconds_bucket[5m])) by (le))
```

### Error Rate

```promql
sum(rate(http_requests_total{status_code=~"5.."}[5m])) / sum(rate(http_requests_total[5m])) * 100
```

### Request Throughput

```promql
sum(rate(http_requests_total[1m])) * 60
```

### Uptime Calculation

**30-Day Totals**:
```promql
sum(increase(http_requests_total[30d]))
sum(increase(http_requests_total{status_code=~"5.."}[30d]))
```

**Formula**:
```
uptime = ((total_requests - error_requests) / total_requests) * 100
```

### Web Vitals (Optional)

**LCP (Largest Contentful Paint)**:
```promql
histogram_quantile(0.75, sum(rate(web_vitals_lcp_bucket[5m])) by (le))
```

**FID (First Input Delay)**:
```promql
histogram_quantile(0.75, sum(rate(web_vitals_fid_bucket[5m])) by (le))
```

**CLS (Cumulative Layout Shift)**:
```promql
histogram_quantile(0.75, sum(rate(web_vitals_cls_bucket[5m])) by (le))
```

---

## Caching Strategy

### Redis Cache Keys

- **Current Status**: `status:current` (60s TTL)
- **Historical Data**: `status:history:{days}` (300s TTL)

### Background Refresh

A background job runs every 30 seconds to:
1. Generate fresh status data
2. Update Redis cache
3. Ensure cache is always warm

This ensures:
- Fast response times (serving from cache)
- Fresh data (30s maximum staleness)
- Resilience (stale-while-revalidate on errors)

### Stale-While-Revalidate

If status generation fails:
1. Try to serve cached data (even if expired)
2. Add `stale-while-revalidate=300` header
3. Return 503 only if no cached data exists

---

## Status Page UI

### Trust Center Integration

The status API powers the public Trust Center status page at:
```
https://trust.teei.io/status
```

### Components

**StatusDashboard.tsx**:
- Location: `apps/trust-center/src/components/trust/StatusDashboard.tsx`
- Framework: React with Recharts for graphing
- Features:
  - Real-time status updates (60s polling)
  - Service health badges
  - Performance metrics cards
  - Historical uptime graph (7/30/90 days)
  - Web Vitals display (if available)

### Status Indicator Colors

```typescript
const STATUS_COLORS = {
  operational: 'bg-green-500',  // Green dot
  degraded: 'bg-yellow-500',     // Yellow dot
  outage: 'bg-red-500',          // Red dot
};
```

### Mockup

```
┌─────────────────────────────────────────────────────────────┐
│ System Status                                               │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ● All Systems Operational                                 │
│  Last updated: 17/11/2025, 10:30:45 UTC                   │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Performance Metrics                                         │
├────────────┬────────────┬────────────┬────────────────────┤
│ p95 Latency│ p99 Latency│ Error Rate │ Requests/min      │
│   45.50ms  │   89.20ms  │   0.15%    │     1,250         │
└────────────┴────────────┴────────────┴────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Service Status                                              │
├─────────────────────────────────────────────────────────────┤
│ API Gateway                        [Operational]      12ms  │
│ Reporting Service                  [Operational]      45ms  │
│ Analytics Service                  [Operational]      38ms  │
│ Impact-In Service                  [Operational]      56ms  │
│ Q2Q AI Service                     [Operational]     124ms  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Uptime Statistics                                           │
├────────────────────┬────────────────────┬──────────────────┤
│ Current (30 days)  │ Target SLO         │ Last Incident    │
│      99.985%       │      99.9%         │      None        │
└────────────────────┴────────────────────┴──────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Historical Uptime                      [Last 7 days ▼]      │
│                                                             │
│  100.00% ┤                                                 │
│          │      ╭─────╮                                    │
│   99.99% │ ╭────╯     ╰────╮                              │
│          │ │                ╰────╮                         │
│   99.98% │ │                     ╰───                      │
│          └──┬──────┬──────┬──────┬──────┬──────┬─────────  │
│           15/11  16/11  17/11  18/11  19/11  20/11        │
└─────────────────────────────────────────────────────────────┘
```

---

## Testing

### Unit Tests

**Location**: `services/api-gateway/src/routes/__tests__/status.test.ts`

**Coverage Target**: ≥90%

**Test Cases**:
- ✅ Status response structure
- ✅ Service health aggregation
- ✅ Status determination logic (operational/degraded/outage)
- ✅ Metrics calculation
- ✅ Uptime percentage calculation
- ✅ Historical data retrieval
- ✅ Query parameter validation
- ✅ Caching behavior
- ✅ Error handling
- ✅ Stale-while-revalidate
- ✅ Concurrent requests
- ✅ Timeout handling

**Metrics Tests**: `services/api-gateway/src/lib/__tests__/metrics.test.ts`

**Test Cases**:
- ✅ Prometheus query construction
- ✅ Response parsing
- ✅ Unit conversions (seconds → milliseconds)
- ✅ Error handling
- ✅ Health check endpoint
- ✅ Query timeouts
- ✅ Empty results

### Integration Tests

Test the full flow:
```bash
curl http://localhost:3000/status.json
curl http://localhost:3000/status/history?days=7
```

---

## Performance

### Benchmarks

- **Response Time**: < 500ms (cached), < 2s (uncached)
- **Cache Hit Rate**: > 95% expected
- **Background Refresh**: 30s interval
- **Service Health Checks**: 5s timeout per service
- **Concurrent Requests**: Supports 100+ req/s

### Optimization

1. **Parallel Service Checks**: All services checked concurrently
2. **Redis Caching**: Reduces database load
3. **Background Refresh**: Ensures cache warmth
4. **Stale-While-Revalidate**: Serves stale data on errors
5. **Query Timeouts**: Prevents hanging requests

---

## Security

### Public Endpoint

No authentication required - this is intentional for public transparency.

### Rate Limiting

Standard gateway rate limits apply:
- 100 requests/minute per IP
- Shared with other gateway endpoints

### No Sensitive Data

Status API returns only:
- Service names
- Health status
- Performance metrics
- No PII, credentials, or internal infrastructure details

---

## Monitoring

### Metrics to Track

1. **API Performance**:
   - `/status.json` response time
   - `/status/history` response time
   - Cache hit rate

2. **Status Accuracy**:
   - Service health check success rate
   - Prometheus query success rate
   - Background refresh success rate

3. **Availability**:
   - Uptime of status API itself
   - Cache availability (Redis)

### Alerts

- **Status API Down**: Alert if `/status.json` returns 503
- **Cache Miss Rate High**: Alert if cache hit rate < 80%
- **Background Refresh Failing**: Alert if refresh job fails > 3 times

---

## Future Enhancements

1. **Incident Timeline**: Add incident tracking and display
2. **Component Status**: Break down services into components
3. **SLA Tracking**: Track and display SLA compliance
4. **Subscription Notifications**: Email/webhook notifications on status changes
5. **Maintenance Windows**: Scheduled maintenance display
6. **Regional Status**: Multi-region status tracking
7. **Custom Metrics**: Allow teams to add custom health metrics

---

## References

- **AGENTS.md**: Trust Boardroom Implementation § Agent 1.6
- **Prometheus Docs**: https://prometheus.io/docs/
- **Web Vitals**: https://web.dev/vitals/
- **Status Page Best Practices**: https://www.atlassian.com/incident-management/kpis/status-page
