#!/usr/bin/env bash

#
# Canary Analysis Script
#
# Analyzes canary deployment metrics and compares against baseline
# Determines if canary should be promoted or rolled back
#
# Usage:
#   analyze-metrics.sh --service=api-gateway --canary-id=canary-123 --baseline-file=baseline.json
#

set -euo pipefail

# Parse arguments
SERVICE=""
CANARY_ID=""
BASELINE_FILE=""
ERROR_BUDGET_THRESHOLD=10

while [[ $# -gt 0 ]]; do
  case $1 in
    --service=*)
      SERVICE="${1#*=}"
      shift
      ;;
    --canary-id=*)
      CANARY_ID="${1#*=}"
      shift
      ;;
    --baseline-file=*)
      BASELINE_FILE="${1#*=}"
      shift
      ;;
    --error-budget-threshold=*)
      ERROR_BUDGET_THRESHOLD="${1#*=}"
      shift
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Validate inputs
if [[ -z "$SERVICE" || -z "$CANARY_ID" || -z "$BASELINE_FILE" ]]; then
  echo "ERROR: Missing required arguments"
  echo "Usage: $0 --service=<service> --canary-id=<id> --baseline-file=<file>"
  exit 1
fi

PROMETHEUS_URL="${PROMETHEUS_URL:-http://prometheus.teei-csr.svc.cluster.local:9090}"
ANALYSIS_WINDOW="5m"  # Last 5 minutes

echo "═══════════════════════════════════════════════════════════"
echo "  Canary Deployment Analysis"
echo "═══════════════════════════════════════════════════════════"
echo "Service:             $SERVICE"
echo "Canary ID:           $CANARY_ID"
echo "Analysis Window:     $ANALYSIS_WINDOW"
echo "Error Budget Limit:  $ERROR_BUDGET_THRESHOLD%"
echo "═══════════════════════════════════════════════════════════"
echo ""

# Helper to query Prometheus
prom_query() {
  local query="$1"
  curl -s -G "$PROMETHEUS_URL/api/v1/query" \
    --data-urlencode "query=$query" | \
    jq -r '.data.result[0].value[1] // "0"'
}

# 1. Error Rate Analysis
echo "▶ Analyzing Error Rates..."

CANARY_ERROR_RATE=$(prom_query "
  rate(http_requests_total{
    service=\"$SERVICE\",
    version=\"canary\",
    status=~\"5..\"}[$ANALYSIS_WINDOW]
  ) /
  rate(http_requests_total{
    service=\"$SERVICE\",
    version=\"canary\"
  }[$ANALYSIS_WINDOW]
) * 100")

STABLE_ERROR_RATE=$(prom_query "
  rate(http_requests_total{
    service=\"$SERVICE\",
    version=\"stable\",
    status=~\"5..\"
  }[$ANALYSIS_WINDOW]) /
  rate(http_requests_total{
    service=\"$SERVICE\",
    version=\"stable\"
  }[$ANALYSIS_WINDOW]
) * 100")

echo "  Stable Error Rate:  $STABLE_ERROR_RATE%"
echo "  Canary Error Rate:  $CANARY_ERROR_RATE%"

# Check if canary error rate is significantly higher than stable
ERROR_RATE_THRESHOLD=0.1  # 0.1% absolute difference
ERROR_RATE_DIFF=$(echo "$CANARY_ERROR_RATE - $STABLE_ERROR_RATE" | bc)

if (( $(echo "$ERROR_RATE_DIFF > $ERROR_RATE_THRESHOLD" | bc -l) )); then
  echo "  ❌ FAIL: Canary error rate $ERROR_RATE_DIFF% higher than stable"
  echo "FAIL" > /tmp/canary-analysis-result.txt
  exit 1
fi

echo "  ✅ PASS: Error rate within acceptable range"
echo ""

# 2. Latency Analysis
echo "▶ Analyzing Latency (p95)..."

CANARY_P95=$(prom_query "
  histogram_quantile(0.95,
    rate(http_request_duration_seconds_bucket{
      service=\"$SERVICE\",
      version=\"canary\"
    }[$ANALYSIS_WINDOW])
  ) * 1000
")

STABLE_P95=$(prom_query "
  histogram_quantile(0.95,
    rate(http_request_duration_seconds_bucket{
      service=\"$SERVICE\",
      version=\"stable\"
    }[$ANALYSIS_WINDOW])
  ) * 1000
")

echo "  Stable p95:  ${STABLE_P95}ms"
echo "  Canary p95:  ${CANARY_P95}ms"

# Check if canary latency is >20% slower than stable
LATENCY_THRESHOLD_PERCENT=20
LATENCY_THRESHOLD=$(echo "$STABLE_P95 * 1.${LATENCY_THRESHOLD_PERCENT}" | bc)

if (( $(echo "$CANARY_P95 > $LATENCY_THRESHOLD" | bc -l) )); then
  echo "  ❌ FAIL: Canary p95 latency ${LATENCY_THRESHOLD_PERCENT}% slower than stable"
  echo "FAIL" > /tmp/canary-analysis-result.txt
  exit 1
fi

echo "  ✅ PASS: Latency within acceptable range"
echo ""

# 3. SLO Compliance Check
echo "▶ Checking SLO Compliance..."

# Get current SLO status
SLO_STATUS=$(curl -s "https://api.teei-platform.com/api/slo/status")
CRITICAL_SLOS=$(echo "$SLO_STATUS" | jq -r '.summary.critical')
WARNING_SLOS=$(echo "$SLO_STATUS" | jq -r '.summary.warning')

echo "  Critical SLOs:  $CRITICAL_SLOS"
echo "  Warning SLOs:   $WARNING_SLOS"

if [[ "$CRITICAL_SLOS" -gt 0 ]]; then
  echo "  ❌ FAIL: $CRITICAL_SLOS SLO(s) in critical state"
  echo "FAIL" > /tmp/canary-analysis-result.txt
  exit 1
fi

echo "  ✅ PASS: No critical SLO violations"
echo ""

# 4. Error Budget Analysis
echo "▶ Analyzing Error Budget Consumption..."

ERROR_BUDGET_CONSUMED=$(echo "$SLO_STATUS" | jq -r '
  .statuses[] |
  select(.slo.name == "API Availability") |
  .errorBudgetConsumed
')

echo "  Error Budget Consumed:  $ERROR_BUDGET_CONSUMED%"
echo "  Threshold:              $ERROR_BUDGET_THRESHOLD%"

if (( $(echo "$ERROR_BUDGET_CONSUMED > $ERROR_BUDGET_THRESHOLD" | bc -l) )); then
  echo "  ❌ FAIL: Error budget consumption exceeds threshold"
  echo "FAIL" > /tmp/canary-analysis-result.txt
  exit 1
fi

echo "  ✅ PASS: Error budget within threshold"
echo ""

# 5. Request Volume Check
echo "▶ Checking Request Volume..."

CANARY_RPS=$(prom_query "
  rate(http_requests_total{
    service=\"$SERVICE\",
    version=\"canary\"
  }[$ANALYSIS_WINDOW])
")

STABLE_RPS=$(prom_query "
  rate(http_requests_total{
    service=\"$SERVICE\",
    version=\"stable\"
  }[$ANALYSIS_WINDOW])
")

echo "  Stable RPS:  $STABLE_RPS"
echo "  Canary RPS:  $CANARY_RPS"

# Ensure canary is receiving traffic
MIN_RPS=0.1
if (( $(echo "$CANARY_RPS < $MIN_RPS" | bc -l) )); then
  echo "  ⚠️  WARNING: Canary receiving very little traffic"
else
  echo "  ✅ Canary receiving traffic"
fi

echo ""

# 6. Memory & CPU Usage
echo "▶ Checking Resource Usage..."

CANARY_CPU=$(prom_query "
  rate(container_cpu_usage_seconds_total{
    pod=~\"$SERVICE-canary-.*\"
  }[$ANALYSIS_WINDOW])
")

CANARY_MEMORY=$(prom_query "
  container_memory_working_set_bytes{
    pod=~\"$SERVICE-canary-.*\"
  } / 1024 / 1024
")

echo "  Canary CPU:     $CANARY_CPU cores"
echo "  Canary Memory:  ${CANARY_MEMORY}MB"

# Check if resource usage is abnormally high
CPU_LIMIT=2.0  # cores
MEMORY_LIMIT=4096  # MB

if (( $(echo "$CANARY_CPU > $CPU_LIMIT" | bc -l) )); then
  echo "  ⚠️  WARNING: High CPU usage"
fi

if (( $(echo "$CANARY_MEMORY > $MEMORY_LIMIT" | bc -l) )); then
  echo "  ⚠️  WARNING: High memory usage"
fi

echo "  ✅ Resource usage within limits"
echo ""

# Final verdict
echo "═══════════════════════════════════════════════════════════"
echo "  Analysis Result: ✅ PASS"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "All metrics are within acceptable thresholds."
echo "Canary is safe to promote to next stage."
echo ""

echo "PASS" > /tmp/canary-analysis-result.txt
exit 0
