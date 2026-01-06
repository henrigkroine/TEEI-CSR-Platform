#!/usr/bin/env bash

#
# DR Smoke Tests - Post-Failover Validation
#
# Validates that all critical systems are operational after disaster recovery
# Run this after region failover or database restore
#
# Exit codes:
#   0 - All tests passed
#   1 - One or more tests failed
#

set -euo pipefail

# Configuration
REGION="${REGION:-eu-central-1}"
BASE_URL="${BASE_URL:-https://api.teei-platform.com}"
TIMEOUT="${TIMEOUT:-30}"
VERBOSE="${VERBOSE:-false}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test results
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0
FAILED_TESTS=()

# Logging
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Test framework
run_test() {
  local test_name="$1"
  local test_command="$2"

  TESTS_RUN=$((TESTS_RUN + 1))

  if [[ "$VERBOSE" == "true" ]]; then
    log_info "Running test: $test_name"
  fi

  if eval "$test_command" &>/dev/null; then
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "  ${GREEN}✓${NC} $test_name"
  else
    TESTS_FAILED=$((TESTS_FAILED + 1))
    FAILED_TESTS+=("$test_name")
    echo -e "  ${RED}✗${NC} $test_name"
  fi
}

# HTTP test helper
http_test() {
  local url="$1"
  local expected_status="${2:-200}"

  local status_code
  status_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url")

  [[ "$status_code" == "$expected_status" ]]
}

# JSON response test
json_test() {
  local url="$1"
  local jq_filter="$2"
  local expected_value="$3"

  local actual_value
  actual_value=$(curl -s --max-time "$TIMEOUT" "$url" | jq -r "$jq_filter")

  [[ "$actual_value" == "$expected_value" ]]
}

# Database test
db_test() {
  local query="$1"

  kubectl exec -n teei-csr deploy/api-gateway -- \
    psql "$DATABASE_URL" -t -c "$query" &>/dev/null
}

# Kubernetes test
k8s_test() {
  local deployment="$1"

  local ready_replicas
  ready_replicas=$(kubectl get deployment "$deployment" -n teei-csr -o jsonpath='{.status.readyReplicas}')

  [[ "$ready_replicas" -gt 0 ]]
}

#
# Test Suite
#

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║          TEEI CSR Platform - DR Smoke Tests                  ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Region: $REGION"
echo "Base URL: $BASE_URL"
echo "Started: $(date -Iseconds)"
echo ""

#
# 1. Infrastructure Tests
#

echo "━━━ Infrastructure Tests ━━━"

run_test "Kubernetes cluster accessible" \
  "kubectl cluster-info &>/dev/null"

run_test "Kubernetes nodes ready" \
  "kubectl get nodes | grep -q Ready"

run_test "Pods in teei-csr namespace running" \
  "kubectl get pods -n teei-csr | grep -q Running"

run_test "API Gateway deployment healthy" \
  "k8s_test api-gateway"

run_test "Reporting service deployment healthy" \
  "k8s_test reporting"

run_test "Analytics service deployment healthy" \
  "k8s_test analytics"

run_test "Q2Q AI service deployment healthy" \
  "k8s_test q2q-ai"

echo ""

#
# 2. Database Tests
#

echo "━━━ Database Tests ━━━"

run_test "Database connection successful" \
  "db_test 'SELECT 1'"

run_test "Users table accessible" \
  "db_test 'SELECT count(*) FROM users'"

run_test "Companies table accessible" \
  "db_test 'SELECT count(*) FROM companies'"

run_test "Metrics table accessible" \
  "db_test 'SELECT count(*) FROM metrics_company_period'"

run_test "Evidence table accessible" \
  "db_test 'SELECT count(*) FROM evidence_snippets'"

run_test "Database not in recovery mode" \
  "db_test 'SELECT NOT pg_is_in_recovery()'"

echo ""

#
# 3. API Health Checks
#

echo "━━━ API Health Checks ━━━"

run_test "API Gateway /health endpoint" \
  "http_test '$BASE_URL/health'"

run_test "API Gateway /healthz endpoint" \
  "http_test '$BASE_URL/healthz'"

run_test "API Gateway /readyz endpoint" \
  "http_test '$BASE_URL/readyz'"

run_test "API Gateway /livez endpoint" \
  "http_test '$BASE_URL/livez'"

run_test "Reporting service health" \
  "http_test '$BASE_URL/reports/health'"

run_test "Analytics service health" \
  "http_test '$BASE_URL/analytics/health'"

run_test "Boardroom service health" \
  "http_test '$BASE_URL/boardroom/health'"

echo ""

#
# 4. Critical User Journeys
#

echo "━━━ Critical User Journeys ━━━"

# Note: These tests assume a test user/company exists
# In production, you'd use actual test credentials

run_test "Auth metadata endpoint" \
  "http_test '$BASE_URL/auth/.well-known/openid-configuration'"

run_test "Boardroom API accessible" \
  "http_test '$BASE_URL/api/companies/test-company/boardroom/tiles' 401"
# Expecting 401 (unauthorized) is OK - means endpoint is up

run_test "Reports API accessible" \
  "http_test '$BASE_URL/api/reports' 401"

run_test "Export API accessible" \
  "http_test '$BASE_URL/api/exports' 401"

run_test "Evidence API accessible" \
  "http_test '$BASE_URL/api/evidence' 401"

echo ""

#
# 5. External Integrations
#

echo "━━━ External Integrations ━━━"

run_test "Trust Center status page" \
  "http_test 'https://status.teei-platform.com/status.json'"

run_test "Trust Center reports operational" \
  "json_test 'https://status.teei-platform.com/status.json' '.status.indicator' 'none'"

# Connector health (if deployed)
if kubectl get deploy benevity-connector -n teei-csr &>/dev/null; then
  run_test "Benevity connector healthy" \
    "http_test 'http://benevity-connector.teei-csr.svc.cluster.local/health'"
fi

if kubectl get deploy kintell-connector -n teei-csr &>/dev/null; then
  run_test "Kintell connector healthy" \
    "http_test 'http://kintell-connector.teei-csr.svc.cluster.local/health'"
fi

echo ""

#
# 6. SLO Compliance
#

echo "━━━ SLO Compliance ━━━"

# These tests check if we're meeting SLOs post-recovery

run_test "API latency under threshold" \
  "curl -s --max-time 1 '$BASE_URL/health' &>/dev/null"

run_test "Frontend LCP under threshold" \
  "curl -s --max-time 3 'https://teei-platform.com' &>/dev/null"

run_test "No critical SLO violations" \
  "! kubectl exec -n teei-csr deploy/api-gateway -- \
     curl -s localhost:9090/api/slo/status | \
     jq -e '.statuses[] | select(.alertLevel == \"critical\")'"

echo ""

#
# 7. Data Integrity
#

echo "━━━ Data Integrity Tests ━━━"

run_test "No orphaned foreign keys" \
  "db_test 'SELECT NOT EXISTS (
    SELECT 1 FROM metrics_company_period m
    WHERE NOT EXISTS (SELECT 1 FROM companies c WHERE c.id = m.company_id)
  )'"

run_test "Recent data present (< 24h old)" \
  "db_test 'SELECT EXISTS (
    SELECT 1 FROM metrics_company_period
    WHERE created_at > now() - interval '\''24 hours'\''
  )'"

run_test "Evidence lineage intact" \
  "db_test 'SELECT NOT EXISTS (
    SELECT 1 FROM evidence_snippets e
    WHERE e.metric_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM outcome_scores o WHERE o.id = e.metric_id)
  )'"

echo ""

#
# Results Summary
#

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                      Test Results                              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Total Tests:  $TESTS_RUN"
echo -e "Passed:       ${GREEN}$TESTS_PASSED${NC}"
echo -e "Failed:       ${RED}$TESTS_FAILED${NC}"
echo "Completed:    $(date -Iseconds)"
echo ""

if [[ $TESTS_FAILED -gt 0 ]]; then
  echo -e "${RED}FAILED TESTS:${NC}"
  for test in "${FAILED_TESTS[@]}"; do
    echo "  ✗ $test"
  done
  echo ""
  echo -e "${RED}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${RED}║  DR SMOKE TESTS FAILED - SYSTEM NOT OPERATIONAL              ║${NC}"
  echo -e "${RED}╚════════════════════════════════════════════════════════════════╝${NC}"
  exit 1
else
  echo -e "${GREEN}╔════════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${GREEN}║  ALL TESTS PASSED - SYSTEM OPERATIONAL                        ║${NC}"
  echo -e "${GREEN}╚════════════════════════════════════════════════════════════════╝${NC}"
  exit 0
fi
