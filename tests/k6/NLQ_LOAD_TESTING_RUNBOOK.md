# NLQ Load Testing Runbook

## Overview

This runbook provides step-by-step instructions for running k6 performance tests on the Natural Language Query (NLQ) service.

**Performance Targets:**
- **p95 latency:** ≤ 2.5 seconds
- **Cache hit rate:** ≥ 80%
- **Error rate:** < 1%
- **Availability:** 99.9%

## Prerequisites

### 1. Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg \
  --keyserver hkp://keyserver.ubuntu.com:80 \
  --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | \
  sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### 2. Ensure Services Are Running

Before running tests, ensure these services are running:

```bash
# Start PostgreSQL
docker-compose up -d postgres

# Start Redis
docker-compose up -d redis

# Start NLQ service
pnpm --filter @teei/insights-nlq dev

# Verify services
curl http://localhost:3008/health
```

Expected response:
```json
{
  "status": "healthy",
  "services": {
    "database": "up",
    "redis": "up"
  }
}
```

### 3. Seed Test Data (Optional)

For more realistic tests, seed the database with test data:

```bash
pnpm --filter @teei/insights-nlq seed:test-data
```

## Test Suite

### 1. Performance Test (nlq-performance.js)

**Purpose:** Validate performance under realistic load

**Duration:** ~5 minutes

**Scenarios:**
- Canonical questions (high cache hit rate)
- Autocomplete queries
- History pagination
- Query status polling

**Run:**
```bash
cd tests/k6
k6 run nlq-performance.js
```

**With custom settings:**
```bash
BASE_URL=http://localhost:3008/v1/nlq k6 run nlq-performance.js
```

**Expected results:**
```
✅ p95 latency ≤ 2.5s
✅ Cache hit rate ≥ 80%
✅ Error rate < 1%
```

**Outputs:**
- `summary.json` - Raw metrics
- `nlq-performance-report.txt` - Human-readable report

### 2. Stress Test (nlq-stress.js)

**Purpose:** Find breaking point and identify bottlenecks

**Duration:** ~15 minutes

**Load profile:**
- Ramps from 50 → 500 VUs
- Tests rate limiter
- Tests cache stampede protection
- Tests connection pool limits

**Run:**
```bash
k6 run nlq-stress.js
```

**With custom max VUs:**
```bash
MAX_VUS=1000 k6 run nlq-stress.js
```

**What to look for:**
- When does error rate exceed 5%?
- What's the primary bottleneck?
- Does rate limiting work effectively?
- Does cache stampede protection work?

**Expected bottlenecks:**
1. Database connection pool (~200 VUs)
2. Redis connection pool (~300 VUs)
3. Rate limiter (~500 VUs)
4. LLM API rate limits (~100 req/s)

**Outputs:**
- `summary.json` - Raw metrics
- `nlq-stress-report.txt` - Bottleneck analysis

### 3. Soak Test (nlq-soak.js)

**Purpose:** Test stability over extended period

**Duration:** 30 minutes (default)

**Load:** 50 VUs (sustained)

**Run:**
```bash
k6 run nlq-soak.js
```

**With custom duration:**
```bash
SOAK_DURATION=60m TARGET_VUS=50 k6 run nlq-soak.js
```

**What to monitor:**
- Memory usage (should remain stable)
- Performance degradation (first 10min vs last 10min)
- Connection pool health
- Cache stability

**Success criteria:**
- Performance stable throughout test
- No memory leaks
- Error rate < 1%
- Cache hit rate ≥ 80%

**Outputs:**
- `summary.json` - Raw metrics
- `nlq-soak-report.txt` - Stability analysis

## Monitoring During Tests

### Real-time Metrics

While tests run, monitor these dashboards:

1. **k6 Cloud (if configured):**
```bash
k6 run --out cloud nlq-performance.js
```

2. **Application Logs:**
```bash
# Follow NLQ service logs
docker-compose logs -f insights-nlq
```

3. **Database Metrics:**
```bash
# PostgreSQL connections
docker exec -it postgres psql -U teei -c "SELECT count(*) FROM pg_stat_activity;"

# Long-running queries
docker exec -it postgres psql -U teei -c "SELECT pid, now() - pg_stat_activity.query_start AS duration, query FROM pg_stat_activity WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds';"
```

4. **Redis Metrics:**
```bash
# Redis info
docker exec -it redis redis-cli INFO stats

# Cache hit rate
docker exec -it redis redis-cli INFO stats | grep keyspace_hits
```

## Interpreting Results

### Performance Test Results

**✅ PASS Example:**
```
NLQ PERFORMANCE TEST RESULTS
========================================
  Ask endpoint p95:       1847.23ms ✅
  Cache hit rate:         83.4% ✅
  Error rate:             0.23% ✅
  Avg answer confidence:  87.3%
  Rate limit rejections:  0

Overall: ✅ PASS
```

**❌ FAIL Example:**
```
NLQ PERFORMANCE TEST RESULTS
========================================
  Ask endpoint p95:       3241.56ms ❌  (Target: ≤2500ms)
  Cache hit rate:         67.2% ❌     (Target: ≥80%)
  Error rate:             2.45% ❌     (Target: <1%)
  Avg answer confidence:  72.1%
  Rate limit rejections:  23

Overall: ❌ FAIL
```

### Stress Test Results

**Expected output:**
```
STRESS TEST RESULTS
========================================
Breaking Point Analysis:
  Max sustainable VUs:  250
  Primary bottleneck:   Database Connection Pool
  Max throughput:       87.3 req/s

Error Breakdown:
  Total requests:       15234
  Failed requests:      432 (2.8%)
  Connection errors:    12
  DB pool exhaustion:   89
  Rate limit hits:      156

Recommendations:
  - Increase PostgreSQL max_connections
  - Add read replicas for query distribution
  - Enable connection pooling (PgBouncer)
```

### Soak Test Results

**✅ PASS Example:**
```
SOAK TEST RESULTS
========================================
Performance Stability:
  First 10min p95:  1823.45ms
  Middle 10min p95: 1891.23ms
  Last 10min p95:   1856.78ms
  Degradation:      1.8% ✅

Summary:
  Error rate:       0.34% PASS
  Cache hit rate:   82.1% PASS
  p95 latency:      1879.12ms PASS

Recommendations:
  - Performance remained stable ✅
```

**❌ FAIL Example:**
```
SOAK TEST RESULTS
========================================
Performance Stability:
  First 10min p95:  1823.45ms
  Middle 10min p95: 2345.67ms
  Last 10min p95:   3012.34ms
  Degradation:      65.2% FAIL

Summary:
  Error rate:       3.45% FAIL
  Cache hit rate:   71.2% FAIL
  p95 latency:      2789.23ms FAIL

Recommendations:
  - Significant performance degradation detected (>20%)
    → Investigate memory leaks
    → Check database connection pool
    → Review Redis memory usage
```

## Troubleshooting

### High Latency (p95 > 2.5s)

**Possible causes:**
1. Slow database queries
2. LLM API latency
3. Redis latency
4. Cache miss rate too high

**Investigation steps:**
```bash
# Check slow queries
docker exec -it postgres psql -U teei -c "SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"

# Check Redis latency
docker exec -it redis redis-cli --latency

# Check cache hit rate
docker exec -it redis redis-cli INFO stats | grep keyspace
```

**Solutions:**
- Add database indexes
- Increase cache TTL
- Optimize SQL queries
- Add Redis replicas

### Low Cache Hit Rate (< 80%)

**Possible causes:**
1. Cache TTL too short
2. Question normalization not working
3. High variation in questions
4. Cache eviction too aggressive

**Investigation steps:**
```bash
# Check cache keys
docker exec -it redis redis-cli KEYS "nlq:*" | head -20

# Check cache TTL
docker exec -it redis redis-cli TTL "nlq:cache:some-key"
```

**Solutions:**
- Increase cache TTL (default 1 hour)
- Improve question normalization
- Pre-warm cache with common queries
- Increase Redis max memory

### High Error Rate (> 1%)

**Possible causes:**
1. Database connection pool exhausted
2. LLM API failures
3. Safety check failures
4. Rate limiting too aggressive

**Investigation steps:**
```bash
# Check application logs
docker-compose logs insights-nlq | grep ERROR

# Check database connections
docker exec -it postgres psql -U teei -c "SELECT count(*), state FROM pg_stat_activity GROUP BY state;"
```

**Solutions:**
- Increase connection pool size
- Add retry logic for LLM API
- Review safety guardrails
- Adjust rate limits

### Rate Limit Issues

**Expected behavior:**
- Rate limits should protect system
- 429 responses should include retry-after
- Rate limits should reset properly

**Check rate limit configuration:**
```sql
SELECT company_id, daily_query_limit, queries_used_today
FROM nlq_rate_limits;
```

**Adjust rate limits:**
```sql
UPDATE nlq_rate_limits
SET daily_query_limit = 1000, hourly_query_limit = 100
WHERE company_id = 'test-company';
```

## Pre-Production Checklist

Before deploying to production, run this checklist:

- [ ] Performance test passes (p95 ≤ 2.5s)
- [ ] Cache hit rate ≥ 80%
- [ ] Stress test identifies max capacity
- [ ] Soak test shows no memory leaks
- [ ] Soak test shows no performance degradation
- [ ] Rate limiting works correctly
- [ ] Cache stampede protection works
- [ ] Error handling is graceful
- [ ] Monitoring is in place
- [ ] Alerts are configured

## Production Testing

### Canary Testing

1. Deploy to 10% of traffic
2. Run performance test against canary
3. Compare metrics with baseline
4. Gradually increase to 100%

### Load Test Schedule

**Weekly:**
- Performance test (5 min)

**Monthly:**
- Stress test (15 min)
- Soak test (30 min)

**Before major releases:**
- Full test suite (50 min)

## Continuous Monitoring

### Key Metrics to Monitor

1. **Latency:**
   - p50, p95, p99 query latency
   - Target: p95 ≤ 2.5s

2. **Cache Performance:**
   - Hit rate (target: ≥ 80%)
   - Miss rate
   - Eviction rate

3. **Error Rate:**
   - HTTP 5xx errors (target: < 0.1%)
   - Safety check failures
   - LLM API failures

4. **Rate Limiting:**
   - 429 response rate
   - Queries per company
   - Hourly/daily quotas

5. **Resource Utilization:**
   - Database connections
   - Redis memory usage
   - CPU usage
   - Memory usage

### Alerting Thresholds

```yaml
alerts:
  - name: nlq_high_latency
    condition: p95_latency > 2500ms for 5 minutes
    severity: warning

  - name: nlq_very_high_latency
    condition: p95_latency > 5000ms for 2 minutes
    severity: critical

  - name: nlq_low_cache_hit_rate
    condition: cache_hit_rate < 0.70 for 10 minutes
    severity: warning

  - name: nlq_high_error_rate
    condition: error_rate > 0.01 for 5 minutes
    severity: critical
```

## Appendix

### Test Data

The tests use these canonical questions:
- "What's our social return on investment this quarter?"
- "Show me SROI for Q3 2024"
- "What's our volunteer impact score?"
- "How many employees participated in CSR activities?"
- And 20+ more...

### Environment Variables

```bash
# Service URL
BASE_URL=http://localhost:3008/v1/nlq

# Stress test configuration
MAX_VUS=500

# Soak test configuration
SOAK_DURATION=30m
TARGET_VUS=50

# k6 Cloud (optional)
K6_CLOUD_TOKEN=your-token-here
```

### References

- [k6 Documentation](https://k6.io/docs/)
- [NLQ API Documentation](../../services/insights-nlq/README.md)
- [Cache Strategy](../../services/insights-nlq/docs/CACHING.md)
- [Safety Guardrails](../../services/insights-nlq/docs/SAFETY.md)
