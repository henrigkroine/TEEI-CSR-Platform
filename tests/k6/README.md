# k6 Load Tests

This directory contains k6 load tests for the TEEI CSR Platform.

## Test Suites

### 1. NLQ Service Tests (Natural Language Query)
- **nlq-performance.js** - Performance validation (p95 ≤ 2.5s, cache hit rate ≥ 80%)
- **nlq-stress.js** - Find breaking point and identify bottlenecks
- **nlq-soak.js** - 30-minute endurance test for stability
- **nlq-helpers.js** - Shared utilities for NLQ tests

See [NLQ Load Testing Runbook](./NLQ_LOAD_TESTING_RUNBOOK.md) for detailed instructions.

### 2. Corporate Cockpit Tests
- **cockpit-load.js** - Analytics service endpoint performance

### 3. Streaming Tests
- **streaming-load.js** - SSE connection and event delivery

### 4. Other Services
- **ingestion-load.js** - Data ingestion performance
- **reporting-load.js** - Report generation performance
- **soak-test.js** - General endurance testing

## Prerequisites

Install k6:
```bash
# macOS
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

## Running Tests

### NLQ Service Tests

**Performance Test (5 minutes):**
```bash
cd tests/k6
k6 run nlq-performance.js
```

**Stress Test (15 minutes):**
```bash
k6 run nlq-stress.js
```

**Soak Test (30 minutes):**
```bash
k6 run nlq-soak.js
```

**With custom settings:**
```bash
BASE_URL=http://localhost:3008/v1/nlq k6 run nlq-performance.js
MAX_VUS=500 k6 run nlq-stress.js
SOAK_DURATION=60m TARGET_VUS=50 k6 run nlq-soak.js
```

**Performance Targets:**
- p95 latency ≤ 2.5s
- Cache hit rate ≥ 80%
- Error rate < 1%

### SSE Streaming Load Test

Test concurrent SSE connections and event delivery:

```bash
# Run with default settings (localhost)
k6 run streaming-load.js

# Run with custom settings
BASE_URL=http://localhost:3007 COMPANY_ID=test-company k6 run streaming-load.js

# Run with cloud output
k6 run --out cloud streaming-load.js
```

### Test Configuration

The streaming load test includes:
- **Ramp-up**: Gradually increases concurrent connections
- **Sustained load**: Maintains 100 concurrent connections for 2 minutes
- **Ramp-down**: Gracefully closes connections

### Performance Targets

- **Latency**: 95% of events should arrive in < 500ms
- **Success Rate**: 95% of connections should establish successfully
- **Error Rate**: < 10 connection errors during entire test

## Results

k6 will output:
- Connection success rate
- Event delivery latency (p95, p99)
- Total events received
- Connection errors

Example output:
```
     sse_connections_established: 100
     sse_events_received........: 5000
     sse_event_latency..........: avg=150ms p(95)=300ms p(99)=450ms
     sse_connection_success.....: 98.00%
```

## Notes

- k6 doesn't natively support Server-Sent Events (EventSource API)
- The test uses HTTP streaming as a proxy for SSE connections
- For comprehensive SSE testing, use integration tests with Node.js
- Ensure the analytics service is running with `STREAMING_ENABLED=true`
- Ensure NATS is running for event publishing
