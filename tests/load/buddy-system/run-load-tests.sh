#!/bin/bash

# Buddy System Load Testing Suite
# Runs comprehensive load tests simulating 1000+ concurrent users

set -e

echo "=========================================="
echo "Buddy System Load Testing Suite"
echo "=========================================="
echo ""

# Check if k6 is installed
if ! command -v k6 &> /dev/null; then
    echo "k6 is not installed. Please install k6:"
    echo "  macOS: brew install k6"
    echo "  Ubuntu: sudo apt-key adv --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69"
    echo "         echo \"deb https://dl.k6.io/deb stable main\" | sudo tee /etc/apt/sources.list.d/k6.list"
    echo "         sudo apt-get update && sudo apt-get install k6"
    exit 1
fi

# Set environment variables
export BUDDY_CONNECTOR_URL=${BUDDY_CONNECTOR_URL:-http://localhost:3010}
export API_GATEWAY_URL=${API_GATEWAY_URL:-http://localhost:3000}
export BUDDY_WEBHOOK_SECRET=${BUDDY_WEBHOOK_SECRET:-test-webhook-secret}

echo "Load Test Configuration:"
echo "  Target: $BUDDY_CONNECTOR_URL"
echo "  API Gateway: $API_GATEWAY_URL"
echo ""

# Create results directory
mkdir -p load-test-results

# Test 1: Baseline Load (100 concurrent users, 5 minutes)
echo "=========================================="
echo "Test 1: Baseline Load"
echo "100 concurrent users, 5 minutes"
echo "=========================================="
echo ""

k6 run \
    --vus 100 \
    --duration 5m \
    --summary-export=load-test-results/baseline-summary.json \
    tests/load/buddy-system/load-test.js | tee load-test-results/baseline.log

echo ""

# Test 2: Sustained Load (500 concurrent users, 30 minutes)
echo "=========================================="
echo "Test 2: Sustained Load"
echo "500 concurrent users, 30 minutes"
echo "=========================================="
echo ""

k6 run \
    --stage 2m:100 \
    --stage 5m:250 \
    --stage 23m:500 \
    --stage 2m:0 \
    --summary-export=load-test-results/sustained-summary.json \
    tests/load/buddy-system/load-test.js | tee load-test-results/sustained.log

echo ""

# Test 3: Peak Load (1000 concurrent users, 10 minutes)
echo "=========================================="
echo "Test 3: Peak Load"
echo "1000 concurrent users, 10 minutes"
echo "=========================================="
echo ""

k6 run \
    --stage 2m:250 \
    --stage 2m:500 \
    --stage 2m:750 \
    --stage 4m:1000 \
    --stage 2m:0 \
    --summary-export=load-test-results/peak-summary.json \
    tests/load/buddy-system/load-test.js | tee load-test-results/peak.log

echo ""

# Test 4: Burst Test (rapid event bursts)
echo "=========================================="
echo "Test 4: Burst Test"
echo "Rapid event bursts (1000 events/sec)"
echo "=========================================="
echo ""

k6 run \
    --vus 100 \
    --duration 2m \
    --summary-export=load-test-results/burst-summary.json \
    --env SCENARIO=burst \
    tests/load/buddy-system/load-test.js | tee load-test-results/burst.log

echo ""

# Test 5: Stress Test (find breaking point)
echo "=========================================="
echo "Test 5: Stress Test (Breaking Point)"
echo "Gradually increase load until failure"
echo "=========================================="
echo ""

k6 run \
    --stage 2m:500 \
    --stage 5m:1000 \
    --stage 5m:1500 \
    --stage 5m:2000 \
    --stage 2m:0 \
    --summary-export=load-test-results/stress-summary.json \
    tests/load/buddy-system/load-test.js | tee load-test-results/stress.log

echo ""

# Test 6: Endurance Test (24 hours - optional, commented out by default)
# echo "=========================================="
# echo "Test 6: Endurance Test"
# echo "100 concurrent users, 24 hours"
# echo "=========================================="
# echo ""
#
# k6 run \
#     --vus 100 \
#     --duration 24h \
#     --summary-export=load-test-results/endurance-summary.json \
#     tests/load/buddy-system/load-test.js | tee load-test-results/endurance.log

# Generate consolidated report
echo "=========================================="
echo "Generating Consolidated Report"
echo "=========================================="
echo ""

cat > load-test-results/LOAD_TEST_REPORT.md <<EOF
# Buddy System Load Test Report

**Date**: $(date)
**Environment**: ${BUDDY_CONNECTOR_URL}

## Test Summary

### Test 1: Baseline Load
- **VUs**: 100
- **Duration**: 5 minutes
- **Purpose**: Establish baseline performance metrics

### Test 2: Sustained Load
- **VUs**: 500 (sustained)
- **Duration**: 30 minutes
- **Purpose**: Test system stability under continuous load

### Test 3: Peak Load
- **VUs**: 1000
- **Duration**: 10 minutes
- **Purpose**: Test system at peak expected traffic

### Test 4: Burst Test
- **VUs**: 100 (rapid bursts)
- **Duration**: 2 minutes
- **Purpose**: Test handling of event bursts (1000 events/sec)

### Test 5: Stress Test
- **VUs**: Up to 2000
- **Duration**: 19 minutes
- **Purpose**: Determine breaking point and capacity limits

## Key Metrics

### Response Time
- **p95**: < 500ms (target)
- **p99**: < 1000ms (target)

### Success Rate
- **Target**: > 99%

### Throughput
- **Target**: 1000 events/sec

### Error Rate
- **Target**: < 1%

## Results

See individual test logs:
- baseline.log
- sustained.log
- peak.log
- burst.log
- stress.log

See JSON summaries:
- baseline-summary.json
- sustained-summary.json
- peak-summary.json
- burst-summary.json
- stress-summary.json

## Recommendations

Based on test results, the following actions are recommended:

1. **Performance Optimization**: [To be filled based on results]
2. **Scaling Strategy**: [To be filled based on results]
3. **Resource Allocation**: [To be filled based on results]
4. **Circuit Breaker Tuning**: [To be filled based on results]

## MTTR Analysis

Mean Time To Recovery (MTTR) for failure scenarios:

- **Database Failure**: [To be measured]
- **Network Partition**: [To be measured]
- **Service Crash**: [To be measured]
- **Circuit Breaker Activation**: [To be measured]

**Target MTTR**: < 5 minutes

EOF

echo "Load test report generated: load-test-results/LOAD_TEST_REPORT.md"
echo ""

echo "=========================================="
echo "Load Testing Complete"
echo "=========================================="
echo ""
echo "Review results in: load-test-results/"
