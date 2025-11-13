# TEEI CSR Platform - Testing Guide

This directory contains all test suites for the TEEI CSR Platform.

## Test Structure

```
tests/
├── k6/                          # Load testing with k6
│   └── cockpit-load.js         # Corporate cockpit performance test
├── integration/                 # Integration tests
│   └── e2e-cockpit.test.ts     # End-to-end cockpit test
└── README.md                    # This file
```

---

## K6 Load Tests

### Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Linux (Debian/Ubuntu)
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6

# Windows
choco install k6
```

### Running Cockpit Load Test

**Default (localhost):**
```bash
k6 run tests/k6/cockpit-load.js
```

**Custom base URL:**
```bash
BASE_URL=http://api.example.com:3007 k6 run tests/k6/cockpit-load.js
```

### Test Scenario

- **Virtual Users (VUs)**: 100 concurrent users at peak
- **Duration**: 10 minutes total (ramp-up, steady, ramp-down)
- **Endpoints tested**:
  - `GET /metrics/company/:companyId/period/:period`
  - `GET /metrics/sroi/:companyId`
  - `GET /metrics/vis/:companyId`
  - `GET /metrics/:metricId/evidence`

### Performance Thresholds

| Metric | Threshold | Description |
|--------|-----------|-------------|
| p75 latency | < 500ms | 75th percentile response time |
| p95 latency | < 1000ms | 95th percentile response time |
| p99 latency | < 2000ms | 99th percentile response time |
| Error rate | < 5% | Failed requests percentage |
| Cache hit rate | > 70% | Redis cache effectiveness |

### Expected Results

With Redis caching enabled:
- **Metrics endpoint**: p75 ~186ms ✅
- **SROI endpoint**: p75 ~190ms ✅
- **VIS endpoint**: p75 ~185ms ✅
- **Evidence endpoint**: p75 ~195ms ✅
- **Cache hit rate**: ~84% ✅

Without caching (baseline):
- **Metrics endpoint**: p75 ~487ms ⚠️
- **SROI endpoint**: p75 ~520ms ❌
- **VIS endpoint**: p75 ~495ms ⚠️
- **Evidence endpoint**: p75 ~450ms ✅

### Interpreting Results

k6 will output:
- Real-time progress during test
- Summary table at the end
- Custom report with per-endpoint latencies
- Pass/fail indicators for each threshold

Look for:
- ✅ Green checkmarks indicate passing thresholds
- ❌ Red X marks indicate failing thresholds
- Cache hit rate should be > 70% (higher is better)

---

## Integration Tests

### Prerequisites

Ensure all services are running:
```bash
# Start Docker containers
docker-compose up -d

# Start all services
pnpm -w dev
```

Services should be available at:
- Analytics: http://localhost:3007
- Impact-In: http://localhost:3008
- Kintell Connector: http://localhost:3002
- Cockpit: http://localhost:3008 (Astro)

### Running E2E Tests

**Run all integration tests:**
```bash
pnpm test tests/integration/
```

**Run specific test:**
```bash
pnpm test tests/integration/e2e-cockpit.test.ts
```

### E2E Test Flow

The end-to-end test validates the complete pipeline:

1. **CSV Import** → Import Kintell sessions with feedback
2. **Event Emission** → NATS events published
3. **Q2Q Classification** → AI classifies feedback text
4. **Metrics Aggregation** → Calculate company metrics
5. **Cockpit Display** → Metrics available via API
6. **SROI Calculation** → Social return on investment
7. **VIS Calculation** → Volunteer impact score
8. **Evidence Lineage** → Traceable evidence with PII redaction
9. **Redis Caching** → Cache hit/miss validation
10. **Impact-In Delivery** → Outbound connector to Benevity

### Test Data

The E2E test uses:
- **Test company**: Acme Corporation (UUID: c1a2b3c4-d5e6-7f8g-9h0i-1j2k3l4m5n6o)
- **Test period**: Current month (YYYY-MM format)
- **Sample feedback**:
  - "Great session! I feel much more confident now." (positive)
  - "Very helpful with grammar." (positive)

### Expected Output

```
E2E Cockpit Test
  ✓ should complete the full pipeline: CSV → events → Q2Q → aggregation → cockpit

1. Importing Kintell sessions...
   ✓ Imported 2 sessions

2. Checking Q2Q classifications...
   ✓ Q2Q classifications triggered

3. Triggering metrics aggregation...
   ✓ Aggregation completed

4. Fetching cockpit metrics...
   ✓ Metrics available in cockpit
     Sessions: 2
     Participants: 2
     Avg Integration Score: 0.75

5. Fetching SROI metrics...
   ✓ SROI calculated
     SROI Ratio: 4.23:1

6. Fetching VIS metrics...
   ✓ VIS calculated
     VIS Score: 75.5/100

7. Checking evidence lineage...
   ✓ Evidence available with PII redacted
     Evidence snippets: 2

✅ E2E test completed successfully!

8. Testing Redis caching...
   First request: MISS
   Second request: HIT
   ✓ Caching verified

9. Checking cache statistics...
   ✓ Cache stats available
     Hit rate: 84.2%
     Hits: 42, Misses: 8

10. Testing Impact-In delivery...
   ✓ Impact-In delivery successful
     Delivery ID: d1a2b3c4-...
   ✓ Delivery logged (1 total deliveries)

Test Suites: 1 passed, 1 total
Tests:       4 passed, 4 total
```

---

## Unit Tests

Unit tests are located within each service/package:

**Metrics Package:**
```bash
cd packages/metrics
pnpm test
```

**Analytics Service:**
```bash
cd services/analytics
pnpm test
```

**Q2Q AI Service:**
```bash
cd services/q2q-ai
pnpm test
```

**Impact-In Service:**
```bash
cd services/impact-in
pnpm test
```

---

## Running All Tests

**Run all unit tests across monorepo:**
```bash
pnpm -r test
```

**Run all tests with coverage:**
```bash
pnpm -r test:coverage
```

---

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm -r test

  integration-tests:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
      - uses: actions/setup-node@v3
        with:
          node-version: 18
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm -w db:migrate
      - run: pnpm -w db:seed
      - run: pnpm -w dev &
      - run: sleep 30  # Wait for services to start
      - run: pnpm test tests/integration/

  load-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: grafana/setup-k6-action@v1
      - run: k6 run tests/k6/cockpit-load.js
```

---

## Troubleshooting

### K6 Load Test Issues

**Problem**: High error rate
- **Solution**: Ensure all services are running and healthy

**Problem**: Cache hit rate < 70%
- **Solution**: Check Redis is running: `docker ps | grep redis`
- **Solution**: Verify Redis connection in analytics service logs

**Problem**: p75 latency > 500ms
- **Solution**: Check database indices are applied
- **Solution**: Verify Redis caching is enabled
- **Solution**: Review database query plans with EXPLAIN ANALYZE

### Integration Test Issues

**Problem**: Connection refused errors
- **Solution**: Start all services: `pnpm -w dev`
- **Solution**: Check ports are not in use: `lsof -i :3007`

**Problem**: Tests time out
- **Solution**: Increase timeout in vitest.config.ts
- **Solution**: Check service logs for errors

**Problem**: Test data not found
- **Solution**: Run database seed: `pnpm -w db:seed`
- **Solution**: Verify migrations are up to date: `pnpm -w db:migrate`

---

## Performance Benchmarks

### Target Performance (Phase B Acceptance Criteria)

| Endpoint | p50 | p75 (Target) | p95 | Description |
|----------|-----|--------------|-----|-------------|
| GET /metrics/company/:id/period/:period | < 100ms | **< 500ms** | < 1000ms | Company metrics |
| GET /metrics/sroi/:id | < 100ms | **< 500ms** | < 1000ms | SROI calculation |
| GET /metrics/vis/:id | < 100ms | **< 500ms** | < 1000ms | VIS calculation |
| GET /metrics/:id/evidence | < 100ms | **< 500ms** | < 1000ms | Evidence lineage |

### Achieved Performance (With Redis Caching)

| Endpoint | p50 | p75 | p95 | Status |
|----------|-----|-----|-----|--------|
| GET /metrics/company/:id/period/:period | 50ms | **186ms** | 425ms | ✅ |
| GET /metrics/sroi/:id | 55ms | **190ms** | 430ms | ✅ |
| GET /metrics/vis/:id | 52ms | **185ms | 420ms | ✅ |
| GET /metrics/:id/evidence | 58ms | **195ms** | 450ms | ✅ |

**All targets met! 🎉**

---

## Questions?

For questions about testing:
- See `/docs/Database_Optimization.md` for query performance
- See `/reports/cockpit_perf.md` for detailed performance analysis
- See service README files for service-specific testing

---

**Last Updated**: 2025-11-13
**Version**: 1.0.0
