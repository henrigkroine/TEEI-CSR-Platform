#!/bin/bash
set -euo pipefail

# Uptime Probe - Checks all service /health endpoints
# Usage: ./uptime-probe.sh
# Environment: BASE_URL (default: http://localhost:3000)

BASE_URL="${BASE_URL:-http://localhost:3000}"
TIMEOUT=10
FAILED=0

# ANSI color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================="
echo "Synthetic Uptime Probe"
echo "Base URL: $BASE_URL"
echo "Timestamp: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "================================================="
echo ""

# Service endpoints to check
declare -A SERVICES=(
  ["API Gateway"]="/api/health"
  ["Reporting Service"]="/api/reporting/health"
  ["Impact Calculator"]="/api/impact/health"
  ["Q2Q AI Service"]="/api/q2q/health"
  ["Analytics Service"]="/api/analytics/health"
  ["Journey Engine"]="/api/journey/health"
  ["Notifications Service"]="/api/notifications/health"
  ["Unified Profile"]="/api/profile/health"
  ["Corporate Cockpit UI"]="/health"
  ["Discord Bot"]="/api/discord/health"
)

check_endpoint() {
  local name="$1"
  local path="$2"
  local url="${BASE_URL}${path}"

  echo -n "Checking $name... "

  # Make HTTP request with timeout
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --max-time "$TIMEOUT" "$url" || echo "000")

  if [[ "$HTTP_CODE" == "200" ]]; then
    echo -e "${GREEN}✓ PASS${NC} (HTTP $HTTP_CODE)"
    return 0
  else
    echo -e "${RED}✗ FAIL${NC} (HTTP $HTTP_CODE)"
    FAILED=$((FAILED + 1))
    return 1
  fi
}

# Run checks
for service in "${!SERVICES[@]}"; do
  check_endpoint "$service" "${SERVICES[$service]}"
done

echo ""
echo "================================================="

if [[ $FAILED -eq 0 ]]; then
  echo -e "${GREEN}✓ All services healthy (0 failures)${NC}"
  exit 0
else
  echo -e "${RED}✗ $FAILED service(s) unhealthy${NC}"
  exit 1
fi
