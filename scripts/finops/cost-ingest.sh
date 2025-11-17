#!/usr/bin/env bash
set -euo pipefail

##############################################################################
# AWS Cost Explorer Data Ingestion Script
#
# Purpose: Daily ingestion of AWS cost data for forecasting and alerting
#
# Data Sources:
#   - AWS Cost Explorer API (90-day historical costs)
#   - Cost and Usage Reports (detailed breakdowns)
#
# Outputs:
#   - /data/finops/costs/aws-costs-YYYY-MM-DD.json
#   - Pushes metrics to Prometheus Pushgateway
#   - Stores detailed data in ClickHouse
#
# Schedule: Daily at 02:00 UTC (cron: 0 2 * * *)
#
# Requirements:
#   - AWS CLI configured with Cost Explorer permissions
#   - jq (JSON processing)
#   - curl (API calls)
#   - ClickHouse client
##############################################################################

# Configuration
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly DATA_DIR="/data/finops/costs"
readonly LOOKBACK_DAYS=90
readonly TODAY=$(date -u +%Y-%m-%d)
readonly START_DATE=$(date -u -d "${LOOKBACK_DAYS} days ago" +%Y-%m-%d)
readonly OUTPUT_FILE="${DATA_DIR}/aws-costs-${TODAY}.json"
readonly PROMETHEUS_PUSHGATEWAY="${PROMETHEUS_PUSHGATEWAY:-http://pushgateway:9091}"
readonly CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-clickhouse}"
readonly CLICKHOUSE_DB="${CLICKHOUSE_DB:-teei_observability}"

# Logging
log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] $*" >&2
}

error() {
  log "ERROR: $*"
  exit 1
}

# Ensure output directory exists
mkdir -p "${DATA_DIR}"

##############################################################################
# Step 1: Fetch AWS Cost Explorer Data
##############################################################################

log "Fetching AWS cost data from ${START_DATE} to ${TODAY}..."

aws ce get-cost-and-usage \
  --time-period Start="${START_DATE}",End="${TODAY}" \
  --granularity DAILY \
  --metrics "UnblendedCost" "UsageQuantity" \
  --group-by Type=DIMENSION,Key=SERVICE \
  --group-by Type=DIMENSION,Key=REGION \
  --group-by Type=TAG,Key=tenant_id \
  --output json \
  > "${OUTPUT_FILE}" \
  || error "Failed to fetch AWS Cost Explorer data"

log "Saved raw cost data to: ${OUTPUT_FILE}"

##############################################################################
# Step 2: Parse and Transform Data
##############################################################################

log "Parsing cost data..."

# Extract total daily costs
TOTAL_COST=$(jq -r '
  .ResultsByTime
  | map(.Total.UnblendedCost.Amount | tonumber)
  | add
' "${OUTPUT_FILE}")

log "Total cost for ${LOOKBACK_DAYS}-day period: \$${TOTAL_COST}"

# Generate Prometheus metrics
PROM_METRICS=$(jq -r '
  .ResultsByTime[]
  | .TimePeriod.Start as $date
  | .Groups[]
  | {
      date: $date,
      service: (.Keys[0] // "Unknown"),
      region: (.Keys[1] // "Unknown"),
      tenant_id: (.Keys[2] // "untagged"),
      cost: (.Metrics.UnblendedCost.Amount | tonumber),
      usage: (.Metrics.UsageQuantity.Amount | tonumber)
    }
  | "aws_cost_usd{service=\"\(.service)\",region=\"\(.region)\",tenant_id=\"\(.tenant_id)\",date=\"\(.date)\"} \(.cost)"
' "${OUTPUT_FILE}")

##############################################################################
# Step 3: Push to Prometheus Pushgateway
##############################################################################

log "Pushing metrics to Prometheus Pushgateway at ${PROMETHEUS_PUSHGATEWAY}..."

cat <<EOF | curl --data-binary @- "${PROMETHEUS_PUSHGATEWAY}/metrics/job/aws_cost_ingestion/instance/$(hostname)"
# TYPE aws_cost_usd gauge
# HELP aws_cost_usd AWS daily cost in USD by service, region, and tenant
${PROM_METRICS}
# TYPE aws_cost_ingestion_timestamp gauge
# HELP aws_cost_ingestion_timestamp Unix timestamp of last successful ingestion
aws_cost_ingestion_timestamp $(date +%s)
EOF

log "Prometheus metrics pushed successfully"

##############################################################################
# Step 4: Load into ClickHouse
##############################################################################

log "Loading cost data into ClickHouse..."

# Create table if not exists
clickhouse-client --host="${CLICKHOUSE_HOST}" --query="
CREATE TABLE IF NOT EXISTS ${CLICKHOUSE_DB}.aws_costs (
  date Date,
  service String,
  region String,
  tenant_id String,
  cost_usd Float64,
  usage_quantity Float64,
  ingestion_timestamp DateTime DEFAULT now()
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, service, region, tenant_id)
SETTINGS index_granularity = 8192;
" || error "Failed to create ClickHouse table"

# Transform JSON to CSV for ClickHouse insertion
jq -r '
  .ResultsByTime[]
  | .TimePeriod.Start as $date
  | .Groups[]
  | [
      $date,
      (.Keys[0] // "Unknown"),
      (.Keys[1] // "Unknown"),
      (.Keys[2] // "untagged"),
      (.Metrics.UnblendedCost.Amount | tonumber),
      (.Metrics.UsageQuantity.Amount | tonumber)
    ]
  | @csv
' "${OUTPUT_FILE}" | clickhouse-client \
  --host="${CLICKHOUSE_HOST}" \
  --query="INSERT INTO ${CLICKHOUSE_DB}.aws_costs (date, service, region, tenant_id, cost_usd, usage_quantity) FORMAT CSV" \
  || error "Failed to insert data into ClickHouse"

log "ClickHouse insertion complete"

##############################################################################
# Step 5: Calculate and Store Aggregated Metrics
##############################################################################

log "Calculating aggregate metrics..."

# Per-service costs (last 7 days)
SERVICE_COSTS=$(clickhouse-client --host="${CLICKHOUSE_HOST}" --format=JSONCompact --query="
SELECT
  service,
  sum(cost_usd) AS total_cost_7d
FROM ${CLICKHOUSE_DB}.aws_costs
WHERE date >= today() - 7
GROUP BY service
ORDER BY total_cost_7d DESC
LIMIT 10
")

log "Top 10 services by cost (last 7 days):"
echo "${SERVICE_COSTS}" | jq -r '.data[] | "\(.0): $\(.1 | tonumber | . * 100 | round / 100)"'

# Per-tenant costs
TENANT_COSTS=$(clickhouse-client --host="${CLICKHOUSE_HOST}" --format=JSONCompact --query="
SELECT
  tenant_id,
  sum(cost_usd) AS total_cost_7d
FROM ${CLICKHOUSE_DB}.aws_costs
WHERE date >= today() - 7
  AND tenant_id != 'untagged'
GROUP BY tenant_id
ORDER BY total_cost_7d DESC
LIMIT 10
")

log "Top 10 tenants by cost (last 7 days):"
echo "${TENANT_COSTS}" | jq -r '.data[] | "\(.0): $\(.1 | tonumber | . * 100 | round / 100)"'

# Daily cost variance
DAILY_VARIANCE=$(clickhouse-client --host="${CLICKHOUSE_HOST}" --format=JSONCompact --query="
WITH daily_totals AS (
  SELECT
    date,
    sum(cost_usd) AS daily_cost
  FROM ${CLICKHOUSE_DB}.aws_costs
  WHERE date >= today() - 30
  GROUP BY date
)
SELECT
  date,
  daily_cost,
  (daily_cost - lag(daily_cost, 1) OVER (ORDER BY date)) / lag(daily_cost, 1) OVER (ORDER BY date) * 100 AS variance_pct
FROM daily_totals
ORDER BY date DESC
LIMIT 7
")

log "Daily cost variance (last 7 days):"
echo "${DAILY_VARIANCE}" | jq -r '.data[] | "\(.0): $\(.1 | tonumber | . * 100 | round / 100) (\(.2 | tonumber | . * 100 | round / 100)% change)"'

##############################################################################
# Step 6: Data Quality Checks
##############################################################################

log "Running data quality checks..."

# Check for missing tenant tags
UNTAGGED_COST=$(clickhouse-client --host="${CLICKHOUSE_HOST}" --format=JSONCompact --query="
SELECT sum(cost_usd) AS untagged_cost_7d
FROM ${CLICKHOUSE_DB}.aws_costs
WHERE date >= today() - 7
  AND tenant_id = 'untagged'
")

UNTAGGED_AMOUNT=$(echo "${UNTAGGED_COST}" | jq -r '.data[0][0] // 0')

if (( $(echo "${UNTAGGED_AMOUNT} > 100" | bc -l) )); then
  log "WARNING: High untagged costs detected: \$${UNTAGGED_AMOUNT} (last 7 days)"
  log "Consider improving resource tagging for tenant attribution"
fi

# Check for cost spikes
MAX_DAILY_COST=$(clickhouse-client --host="${CLICKHOUSE_HOST}" --format=JSONCompact --query="
SELECT max(daily_cost)
FROM (
  SELECT sum(cost_usd) AS daily_cost
  FROM ${CLICKHOUSE_DB}.aws_costs
  WHERE date >= today() - 7
  GROUP BY date
)
")

MAX_COST_VALUE=$(echo "${MAX_DAILY_COST}" | jq -r '.data[0][0] // 0')
AVG_DAILY_COST=$(clickhouse-client --host="${CLICKHOUSE_HOST}" --format=JSONCompact --query="
SELECT avg(daily_cost)
FROM (
  SELECT sum(cost_usd) AS daily_cost
  FROM ${CLICKHOUSE_DB}.aws_costs
  WHERE date >= today() - 30
  GROUP BY date
)
")

AVG_COST_VALUE=$(echo "${AVG_DAILY_COST}" | jq -r '.data[0][0] // 0')

if (( $(echo "${MAX_COST_VALUE} > ${AVG_COST_VALUE} * 1.5" | bc -l) )); then
  log "WARNING: Cost spike detected: Max daily cost (\$${MAX_COST_VALUE}) is 50%+ above 30-day average (\$${AVG_COST_VALUE})"
fi

##############################################################################
# Step 7: Cleanup Old Data
##############################################################################

log "Cleaning up old cost files..."

# Keep only last 30 days of raw JSON files
find "${DATA_DIR}" -name "aws-costs-*.json" -type f -mtime +30 -delete

log "Cleanup complete"

##############################################################################
# Done
##############################################################################

log "Cost ingestion complete! Summary:"
log "  - Date range: ${START_DATE} to ${TODAY}"
log "  - Total cost: \$${TOTAL_COST}"
log "  - Data file: ${OUTPUT_FILE}"
log "  - Prometheus: Pushed to ${PROMETHEUS_PUSHGATEWAY}"
log "  - ClickHouse: Loaded into ${CLICKHOUSE_DB}.aws_costs"
log ""
log "Next steps:"
log "  - Run cost-forecast.py to generate predictions"
log "  - Check Grafana FinOps dashboards for visualizations"
log "  - Review budget alerts in Prometheus/Alertmanager"

exit 0
