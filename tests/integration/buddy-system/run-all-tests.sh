#!/bin/bash

# Buddy System → CSR Platform Integration Test Suite Runner
# Runs all integration tests with comprehensive reporting

set -e

echo "=========================================="
echo "Buddy System Integration Test Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test results tracking
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
START_TIME=$(date +%s)

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v node &> /dev/null; then
    echo -e "${RED}Node.js is not installed${NC}"
    exit 1
fi

if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}pnpm is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}Prerequisites OK${NC}"
echo ""

# Set environment variables for testing
export NODE_ENV=test
export BUDDY_CONNECTOR_URL=${BUDDY_CONNECTOR_URL:-http://localhost:3010}
export API_GATEWAY_URL=${API_GATEWAY_URL:-http://localhost:3000}
export BUDDY_WEBHOOK_SECRET=${BUDDY_WEBHOOK_SECRET:-test-webhook-secret}
export TEST_API_TOKEN=${TEST_API_TOKEN:-test-token}

echo "Test Configuration:"
echo "  Buddy Connector: $BUDDY_CONNECTOR_URL"
echo "  API Gateway: $API_GATEWAY_URL"
echo ""

# Create test results directory
mkdir -p test-results/buddy-system

# Function to run test suite
run_test_suite() {
    local test_name=$1
    local test_file=$2

    echo -e "${YELLOW}Running: $test_name${NC}"

    if pnpm vitest run "$test_file" --reporter=verbose --reporter=json --outputFile="test-results/buddy-system/${test_name}.json" 2>&1 | tee "test-results/buddy-system/${test_name}.log"; then
        echo -e "${GREEN}✓ $test_name PASSED${NC}"
        PASSED_TESTS=$((PASSED_TESTS + 1))
    else
        echo -e "${RED}✗ $test_name FAILED${NC}"
        FAILED_TESTS=$((FAILED_TESTS + 1))
    fi

    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    echo ""
}

# Run test suites
echo "=========================================="
echo "Running Integration Tests"
echo "=========================================="
echo ""

run_test_suite "event-flow" "tests/integration/buddy-system/event-flow.test.ts"
run_test_suite "webhook-delivery" "tests/integration/buddy-system/webhook-delivery.test.ts"
run_test_suite "data-validation" "tests/integration/buddy-system/data-validation.test.ts"
run_test_suite "calculation-accuracy" "tests/integration/buddy-system/calculation-accuracy.test.ts"
run_test_suite "failure-injection" "tests/integration/buddy-system/failure-injection.test.ts"

# Calculate test duration
END_TIME=$(date +%s)
DURATION=$((END_TIME - START_TIME))

# Generate summary report
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo ""
echo "Total Test Suites: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo "Duration: ${DURATION}s"
echo ""

# Generate HTML report
cat > test-results/buddy-system/summary.html <<EOF
<!DOCTYPE html>
<html>
<head>
    <title>Buddy System Integration Test Results</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background-color: #f0f0f0; padding: 20px; border-radius: 5px; }
        .passed { color: green; font-weight: bold; }
        .failed { color: red; font-weight: bold; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        th { background-color: #4CAF50; color: white; }
        tr:nth-child(even) { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Buddy System Integration Test Results</h1>
        <p>Run Date: $(date)</p>
        <p>Duration: ${DURATION}s</p>
    </div>

    <h2>Summary</h2>
    <table>
        <tr>
            <th>Metric</th>
            <th>Value</th>
        </tr>
        <tr>
            <td>Total Test Suites</td>
            <td>$TOTAL_TESTS</td>
        </tr>
        <tr>
            <td class="passed">Passed</td>
            <td class="passed">$PASSED_TESTS</td>
        </tr>
        <tr>
            <td class="failed">Failed</td>
            <td class="failed">$FAILED_TESTS</td>
        </tr>
        <tr>
            <td>Success Rate</td>
            <td>$(awk "BEGIN {printf \"%.1f%%\", ($PASSED_TESTS/$TOTAL_TESTS)*100}")</td>
        </tr>
    </table>

    <h2>Test Suites</h2>
    <ul>
        <li>Event Flow Integration</li>
        <li>Webhook Delivery & Retry</li>
        <li>Data Validation</li>
        <li>Calculation Accuracy (SROI/VIS)</li>
        <li>Failure Injection & Resilience</li>
    </ul>
</body>
</html>
EOF

echo "HTML report generated: test-results/buddy-system/summary.html"
echo ""

# Exit with appropriate code
if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "${RED}Some tests failed. Please review the logs.${NC}"
    exit 1
else
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
fi
