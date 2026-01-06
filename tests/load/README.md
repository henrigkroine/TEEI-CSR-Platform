# Load Tests

k6-based load tests for TEEI CSR Platform performance validation.

## Overview

Load tests simulate realistic user traffic to:

- **Validate performance** - Ensure system meets SLAs under load
- **Find bottlenecks** - Identify performance issues before production
- **Capacity planning** - Determine how many users the system can handle
- **Regression testing** - Detect performance regressions

## Test Suites

### 1. Dashboard Load Test

**File**: `dashboard-load.js`

**Simulates**: Users browsing the Corporate Cockpit

**User journey**:
1. Login
2. View dashboard (metrics, charts)
3. Browse reports
4. View settings
5. Logout

**Load profile**:
- Ramp up to 100 concurrent users over 4 minutes
- Sustain 100 users for 5 minutes
- Ramp down over 1 minute

**Run**:
```bash
k6 run tests/load/dashboard-load.js
```

### 2. Reporting Load Test

**File**: `reporting-load.js`

**Simulates**: Heavy reporting calculations

**Operations**:
- 40% SROI calculations
- 30% VIS calculations
- 20% Report listing
- 10% Full report generation

**Load profile**:
- Ramp to 100 concurrent users over 6.5 minutes
- Sustain 100 users for 3 minutes

**Run**:
```bash
k6 run tests/load/reporting-load.js
```

### 3. Ingestion Load Test

**File**: `ingestion-load.js`

**Simulates**: High-volume event ingestion

**Event types**:
- Journey events (40%)
- Impact events (30%)
- Analytics events (30%)

**Load profile**:
- 70% single events
- 30% batch ingestion (10-30 events/batch)
- 100 concurrent producers
- 1000+ events/second

**Run**:
```bash
k6 run tests/load/ingestion-load.js
```

### 4. Evidence Gates Load Test

**File**: `k6-evidence-gates.js`

**Simulates**: Evidence-based report generation with citation validation

**Test scenarios**:
- Valid reports with proper citations (40%)
- Invalid reports with missing citations (30%)
- PII redaction enforcement (15%)
- Citation density validation (15%)

**Load profile**:
- Ramp to 50 concurrent users over 1.5 minutes
- Sustain 50 users for 2 minutes
- Spike to 100 users for 1 minute
- Total duration: ~6 minutes

**Thresholds**:
- P95 response time < 500ms
- P99 response time < 1000ms
- Evidence gate error rate < 1%
- Citation validation P95 < 100ms
- PII redaction P95 < 50ms

**Run**:
```bash
pnpm k6:evidence
# Or directly:
k6 run tests/load/k6-evidence-gates.js
```

**Environment variables**:
```bash
export BASE_URL=http://localhost:3000
export TEST_TOKEN=your-bearer-token
export TEST_COMPANY_ID=company-load-test-001
```

### 5. Trust API Load Test

**File**: `k6-trust-api.js`

**Simulates**: Trust API endpoint usage (evidence, ledger, policies, boardroom)

**Endpoints tested**:
- GET `/trust/v1/evidence/:reportId` (30%)
- GET `/trust/v1/ledger/:reportId` (20%)
- GET `/trust/v1/policies` (20%)
- GET `/trust/v1/boardroom/:reportId/status` (15%)
- Full trust flow (all endpoints) (15%)

**Load profile**:
- Constant 20 users for 2 minutes
- Spike to 100 users over 30 seconds
- Sustain 100 users for 1 minute
- Total duration: ~4 minutes

**Thresholds**:
- P95 response time < 300ms
- P99 response time < 800ms
- Trust API latency P95 < 200ms
- Ledger verification P95 < 150ms
- Evidence retrieval P95 < 200ms
- Policy lookup P95 < 100ms

**Run**:
```bash
pnpm k6:trust
# Or directly:
k6 run tests/load/k6-trust-api.js
```

**Environment variables**:
```bash
export BASE_URL=http://localhost:3000
export TEST_TOKEN=your-bearer-token
export TEST_REPORT_ID=report-trust-test-001
export TEST_COMPANY_ID=company-trust-test-001
```

### Run All Trust Tests

```bash
# Run both evidence gates and trust API tests
pnpm k6:all
```

## Installation

### Install k6

**macOS**:
```bash
brew install k6
```

**Linux**:
```bash
wget https://github.com/grafana/k6/releases/download/v0.47.0/k6-v0.47.0-linux-amd64.tar.gz
tar -xzf k6-v0.47.0-linux-amd64.tar.gz
sudo mv k6-v0.47.0-linux-amd64/k6 /usr/local/bin/
```

**Windows**:
```powershell
choco install k6
```

**Verify**:
```bash
k6 version
```

## Running Load Tests

### Basic Run

```bash
# Run single test
k6 run tests/load/dashboard-load.js

# Run with custom duration
k6 run tests/load/dashboard-load.js --duration 10m

# Run with custom VUs
k6 run tests/load/dashboard-load.js --vus 50
```

### Environment Variables

```bash
# Set target environment
export BASE_URL=https://staging.teei-csr.com
export API_TOKEN=your-api-token-here

# Run test
k6 run tests/load/reporting-load.js
```

### Output Options

```bash
# Output to JSON
k6 run tests/load/dashboard-load.js --out json=results/dashboard.json

# Output summary
k6 run tests/load/dashboard-load.js --summary-export=results/summary.json

# Output to InfluxDB
k6 run tests/load/dashboard-load.js --out influxdb=http://localhost:8086/k6

# Output to Grafana Cloud
k6 run tests/load/dashboard-load.js --out cloud
```

### Custom Stages

```bash
# Override stages via environment variables
export TEST_DURATION=10m
export MAX_VUS=200

k6 run tests/load/dashboard-load.js
```

## CI/CD Integration

Load tests run automatically via GitHub Actions:

**Workflow**: `.github/workflows/loadtests.yml`

**Schedule**: Weekly (Sundays at 2 AM UTC)

**Manual trigger**:
```bash
gh workflow run loadtests.yml \
  --ref main \
  -f target_env=staging \
  -f test_suite=all \
  -f duration=5m \
  -f vus=100
```

## Thresholds

Each test defines performance thresholds:

### Dashboard Test

- ✅ P95 response time < 2000ms
- ✅ Error rate < 5%
- ✅ Dashboard load time P95 < 3000ms

### Reporting Test

- ✅ P95 response time < 3000ms
- ✅ SROI calculation P95 < 1000ms
- ✅ VIS calculation P95 < 1000ms
- ✅ Report generation P95 < 5000ms
- ✅ Error rate < 5%

### Ingestion Test

- ✅ P95 response time < 1000ms
- ✅ Single event ingestion P95 < 500ms
- ✅ Batch ingestion P95 < 2000ms
- ✅ Error rate < 1% (ingestion must be reliable)

### Evidence Gates Test

- ✅ P95 response time < 500ms
- ✅ P99 response time < 1000ms
- ✅ Evidence gate error rate < 1%
- ✅ Citation validation P95 < 100ms
- ✅ PII redaction P95 < 50ms
- ✅ Valid report generation P95 < 800ms
- ✅ Invalid report rejection P95 < 200ms

### Trust API Test

- ✅ P95 response time < 300ms
- ✅ P99 response time < 800ms
- ✅ Trust API latency P95 < 200ms
- ✅ Ledger verification P95 < 150ms
- ✅ Evidence retrieval P95 < 200ms
- ✅ Policy lookup P95 < 100ms
- ✅ Boardroom status P95 < 150ms
- ✅ Error rate < 1%

## Interpreting Results

### k6 Output

```
     ✓ login successful
     ✓ dashboard loaded
     ✓ SROI calculation successful

     checks.........................: 98.50% ✓ 2955      ✗ 45
     data_received..................: 12 MB  20 kB/s
     data_sent......................: 3.2 MB 5.3 kB/s
     http_req_duration..............: avg=456ms  p(95)=1.2s
     http_req_failed................: 2.00%  ✓ 60       ✗ 2940
     http_reqs......................: 3000   5/s
     iterations.....................: 500    0.83/s
     vus............................: 100    min=0      max=100
```

**Key metrics**:

- `checks`: % of checks that passed (should be >95%)
- `http_req_duration`: Request latency (P95 should meet thresholds)
- `http_req_failed`: Request error rate (should be <5%)
- `http_reqs`: Total requests and requests/second
- `vus`: Virtual users (concurrent users)

### Threshold Failures

If thresholds fail:

```
✗ http_req_duration............: p(95)=2547ms (threshold p(95)<2000)
```

This means the P95 latency exceeded the threshold. **Actions**:

1. Check which endpoints are slow
2. Review database query performance
3. Check for resource constraints (CPU/memory)
4. Consider scaling horizontally

## Performance Tuning

### If latency is high:

1. **Enable caching**:
   ```bash
   kubectl edit configmap api-gateway-config -n teei-csr
   # Set REDIS_ENABLED=true
   ```

2. **Scale horizontally**:
   ```bash
   kubectl scale deployment/api-gateway -n teei-csr --replicas=10
   ```

3. **Optimize database queries**:
   ```sql
   EXPLAIN ANALYZE SELECT ...
   CREATE INDEX ...
   ```

4. **Increase resource limits**:
   ```yaml
   resources:
     limits:
       cpu: 2000m
       memory: 2Gi
   ```

### If error rate is high:

1. **Check pod logs**:
   ```bash
   kubectl logs -n teei-csr -l app=api-gateway --tail=100
   ```

2. **Check for pod crashes**:
   ```bash
   kubectl get pods -n teei-csr
   ```

3. **Review database connections**:
   ```sql
   SELECT count(*), state FROM pg_stat_activity GROUP BY state;
   ```

4. **Increase timeouts**:
   ```yaml
   nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
   ```

## Load Test Scenarios

### Stress Test

Find breaking point:

```bash
k6 run tests/load/dashboard-load.js \
  --stages '1m:100,2m:200,2m:300,2m:400,1m:0'
```

### Soak Test

Sustained load over long period:

```bash
k6 run tests/load/dashboard-load.js \
  --stages '5m:100,4h:100,5m:0'
```

### Spike Test

Sudden traffic spike:

```bash
k6 run tests/load/dashboard-load.js \
  --stages '1m:10,30s:500,1m:10,1m:0'
```

### Smoke Test

Quick validation (not the same as our smoke tests):

```bash
k6 run tests/load/dashboard-load.js \
  --vus 1 --duration 1m
```

## Best Practices

1. **Test on staging first** - Never load test production without approval
2. **Ramp up gradually** - Don't go 0→100 users instantly
3. **Monitor during tests** - Watch Grafana dashboards
4. **Run during off-hours** - Minimize impact on real users
5. **Document results** - Track performance trends over time
6. **Fix issues promptly** - Don't ignore threshold failures

## Monitoring During Load Tests

### Grafana Dashboards

Watch these dashboards during load tests:

- **API Gateway Performance** - Request rate, latency, errors
- **Database Performance** - Query time, connection pool, locks
- **Kubernetes Resources** - CPU, memory, network
- **Application Metrics** - Custom business metrics

### Real-time Monitoring

```bash
# Watch pod resource usage
watch kubectl top pods -n teei-csr

# Watch request rate
watch 'kubectl logs -n teei-csr -l app=api-gateway --tail=10 | grep "HTTP 200"'

# Monitor Prometheus alerts
kubectl port-forward -n monitoring svc/prometheus 9090:9090
# Open http://localhost:9090/alerts
```

## Troubleshooting

### k6 fails to connect

```bash
# Test connectivity
curl $BASE_URL/health

# Check DNS
nslookup api.teei-csr.com

# Test API endpoint
curl -X POST $BASE_URL/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

### Thresholds always fail

```bash
# Run with fewer VUs to baseline
k6 run tests/load/dashboard-load.js --vus 10

# Check if service is healthy
kubectl get pods -n teei-csr
kubectl logs -n teei-csr <pod-name>
```

### Out of memory errors

```bash
# k6 uses a lot of memory with high VUs
# Reduce VUs or increase RAM

k6 run tests/load/dashboard-load.js --vus 50  # Instead of 100
```

## Metrics Collection

### Grafana Cloud

```bash
# Set up Grafana Cloud k6
export K6_CLOUD_TOKEN=your-token

k6 run tests/load/dashboard-load.js --out cloud
```

### Prometheus + Grafana

```bash
# Run k6 with Prometheus output
k6 run tests/load/dashboard-load.js \
  --out experimental-prometheus-rw \
  --prometheus-rw-url=http://prometheus:9090/api/v1/write
```

### InfluxDB

```bash
# Output to InfluxDB
k6 run tests/load/dashboard-load.js \
  --out influxdb=http://localhost:8086/k6
```

## Load Test Schedule

- **Weekly**: Sunday 2 AM UTC (automated via GitHub Actions)
- **Pre-release**: Before each major release
- **After changes**: After performance-critical changes
- **On-demand**: When investigating performance issues

## Related Documentation

- [Smoke Tests](../smoke/README.md)
- [E2E Tests](../E2E_QUICK_REFERENCE.md)
- [Performance Runbook](../../docs/pilot/runbooks/api_degradation.md)
- [Database Performance](../../docs/Database_Optimization.md)
