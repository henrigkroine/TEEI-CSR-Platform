# k6 Load Tests

This directory contains k6 load tests for the TEEI CSR Platform.

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
