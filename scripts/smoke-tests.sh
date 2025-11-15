#!/usr/bin/env bash
#
# Smoke tests for TEEI CSR Platform
# Tests all 16 services for health and critical E2E paths
#
# Usage:
#   ./scripts/smoke-tests.sh [namespace]
#
# Environment:
#   KUBE_NAMESPACE - Kubernetes namespace (default: teei-staging)
#   MAX_RETRIES - Number of retry attempts (default: 3)
#   RETRY_DELAY - Delay between retries in seconds (default: 10)
#   TIMEOUT - Overall timeout in seconds (default: 300 / 5 minutes)

set -euo pipefail

# Configuration
NAMESPACE="${KUBE_NAMESPACE:-${1:-teei-staging}}"
MAX_RETRIES="${MAX_RETRIES:-3}"
RETRY_DELAY="${RETRY_DELAY:-10}"
TIMEOUT="${TIMEOUT:-300}"
START_TIME=$(date +%s)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Service definitions: "service-name:port:health-path"
SERVICES=(
  "teei-api-gateway:3000:/health/ready"
  "teei-unified-profile:3001:/health"
  "teei-kintell-connector:3002:/health"
  "teei-buddy-service:3003:/health"
  "teei-upskilling-connector:3004:/health"
  "teei-q2q-ai:3005:/health"
  "teei-safety-moderation:3006:/health"
  "teei-analytics:3007:/health"
  "teei-buddy-connector:3008:/health"
  "teei-discord-bot:3009:/health"
  "teei-impact-calculator:3010:/health"
  "teei-impact-in:3011:/health"
  "teei-journey-engine:3012:/health"
  "teei-notifications:3013:/health"
  "teei-reporting:3014:/health"
  "teei-corp-cockpit:4321:/"
)

# Critical E2E test endpoints (via API Gateway)
E2E_TESTS=(
  "auth-login:/api/v1/auth/health:Auth service reachability"
  "profile-me:/api/v1/profiles/health:Profile service reachability"
  "reporting-metrics:/api/v1/reporting/health:Reporting service reachability"
)

# Counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
FAILED_SERVICES=()

# Function to check timeout
check_timeout() {
  local current_time=$(date +%s)
  local elapsed=$((current_time - START_TIME))
  if [ $elapsed -ge $TIMEOUT ]; then
    echo -e "${RED}ERROR: Timeout reached (${TIMEOUT}s). Aborting tests.${NC}"
    exit 1
  fi
}

# Function to test a service health endpoint
test_service_health() {
  local service_name=$1
  local port=$2
  local health_path=$3
  local attempt=1

  echo -e "\n${YELLOW}Testing:${NC} ${service_name} (${port}${health_path})"

  while [ $attempt -le $MAX_RETRIES ]; do
    check_timeout

    # Use kubectl run to create a temporary pod for testing
    local test_result
    test_result=$(kubectl run smoke-test-${RANDOM} \
      --image=curlimages/curl:latest \
      --restart=Never \
      --rm \
      -i \
      --quiet \
      -n ${NAMESPACE} \
      --timeout=10s \
      --command -- \
      curl -sf -o /dev/null -w "%{http_code}" \
      "http://${service_name}.${NAMESPACE}.svc.cluster.local:${port}${health_path}" \
      2>/dev/null || echo "000")

    if [ "$test_result" = "200" ] || [ "$test_result" = "204" ]; then
      echo -e "  ${GREEN}✓${NC} Passed (HTTP ${test_result})"
      return 0
    else
      echo -e "  ${RED}✗${NC} Attempt ${attempt}/${MAX_RETRIES} failed (HTTP ${test_result})"
      if [ $attempt -lt $MAX_RETRIES ]; then
        echo "  Retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
      fi
    fi

    attempt=$((attempt + 1))
  done

  echo -e "  ${RED}✗ FAILED${NC} after ${MAX_RETRIES} attempts"
  return 1
}

# Function to test E2E critical paths
test_e2e_path() {
  local test_name=$1
  local endpoint=$2
  local description=$3
  local gateway_service="teei-api-gateway"
  local gateway_port="3000"

  echo -e "\n${YELLOW}E2E Test:${NC} ${test_name} - ${description}"

  local attempt=1
  while [ $attempt -le $MAX_RETRIES ]; do
    check_timeout

    local test_result
    test_result=$(kubectl run e2e-test-${RANDOM} \
      --image=curlimages/curl:latest \
      --restart=Never \
      --rm \
      -i \
      --quiet \
      -n ${NAMESPACE} \
      --timeout=10s \
      --command -- \
      curl -sf -o /dev/null -w "%{http_code}" \
      "http://${gateway_service}.${NAMESPACE}.svc.cluster.local:${gateway_port}${endpoint}" \
      2>/dev/null || echo "000")

    if [ "$test_result" = "200" ] || [ "$test_result" = "204" ]; then
      echo -e "  ${GREEN}✓${NC} Passed (HTTP ${test_result})"
      return 0
    else
      echo -e "  ${RED}✗${NC} Attempt ${attempt}/${MAX_RETRIES} failed (HTTP ${test_result})"
      if [ $attempt -lt $MAX_RETRIES ]; then
        echo "  Retrying in ${RETRY_DELAY}s..."
        sleep $RETRY_DELAY
      fi
    fi

    attempt=$((attempt + 1))
  done

  echo -e "  ${RED}✗ FAILED${NC} after ${MAX_RETRIES} attempts"
  return 1
}

# Function to display summary
display_summary() {
  local elapsed=$(($(date +%s) - START_TIME))

  echo ""
  echo "================================================================"
  echo "                    SMOKE TEST SUMMARY"
  echo "================================================================"
  echo "Total Tests:   ${TOTAL_TESTS}"
  echo -e "Passed:        ${GREEN}${PASSED_TESTS}${NC}"
  echo -e "Failed:        ${RED}${FAILED_TESTS}${NC}"
  echo "Duration:      ${elapsed}s"
  echo "================================================================"

  if [ $FAILED_TESTS -gt 0 ]; then
    echo -e "\n${RED}Failed Services:${NC}"
    for service in "${FAILED_SERVICES[@]}"; do
      echo "  - ${service}"
    done
    echo ""
    echo "================================================================"
    return 1
  else
    echo -e "\n${GREEN}All smoke tests passed successfully!${NC}\n"
    return 0
  fi
}

# Main execution
main() {
  echo "================================================================"
  echo "         TEEI CSR Platform - Smoke Tests"
  echo "================================================================"
  echo "Namespace:     ${NAMESPACE}"
  echo "Max Retries:   ${MAX_RETRIES}"
  echo "Retry Delay:   ${RETRY_DELAY}s"
  echo "Timeout:       ${TIMEOUT}s"
  echo "================================================================"

  # Verify namespace exists
  if ! kubectl get namespace "${NAMESPACE}" &>/dev/null; then
    echo -e "${RED}ERROR: Namespace '${NAMESPACE}' does not exist${NC}"
    exit 1
  fi

  # Test all service health endpoints
  echo -e "\n${YELLOW}=== Testing Service Health Endpoints ===${NC}"
  for service_def in "${SERVICES[@]}"; do
    IFS=':' read -r service_name port health_path <<< "$service_def"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if test_service_health "$service_name" "$port" "$health_path"; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
      FAILED_SERVICES+=("${service_name} (${port}${health_path})")
    fi
  done

  # Test critical E2E paths
  echo -e "\n${YELLOW}=== Testing Critical E2E Paths ===${NC}"
  for e2e_def in "${E2E_TESTS[@]}"; do
    IFS=':' read -r test_name endpoint description <<< "$e2e_def"
    TOTAL_TESTS=$((TOTAL_TESTS + 1))

    if test_e2e_path "$test_name" "$endpoint" "$description"; then
      PASSED_TESTS=$((PASSED_TESTS + 1))
    else
      FAILED_TESTS=$((FAILED_TESTS + 1))
      FAILED_SERVICES+=("E2E: ${test_name}")
    fi
  done

  # Display summary and exit
  display_summary
}

# Run main function
main "$@"
