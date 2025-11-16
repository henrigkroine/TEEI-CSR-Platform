#!/usr/bin/env bash
#
# FinOps Cost Ingestion Script
# Purpose: Ingest cloud costs from AWS Cost Explorer and tag with allocations
# Frequency: Run hourly via CronJob

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-clickhouse.teei-production.svc.cluster.local}"
CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-8123}"
CLICKHOUSE_DB="${CLICKHOUSE_DB:-teei_analytics}"

# Date range for cost data (yesterday)
START_DATE=$(date -d "yesterday" +%Y-%m-%d)
END_DATE=$(date +%Y-%m-%d)

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [FinOps] $*"
}

log "Starting FinOps cost ingestion for ${START_DATE} to ${END_DATE}"

# Create ClickHouse table if not exists
create_cost_table() {
    log "Creating ClickHouse cost tables..."

    cat <<EOF | curl -s -X POST "${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}" --data-binary @-
    CREATE TABLE IF NOT EXISTS ${CLICKHOUSE_DB}.cloud_costs (
        date Date,
        timestamp DateTime,
        region String,
        service String,
        cost_center String,
        resource_type String,
        resource_id String,
        usage_hours Float64,
        cost_usd Float64,
        currency String DEFAULT 'USD',
        tags Map(String, String)
    ) ENGINE = MergeTree()
    PARTITION BY toYYYYMM(date)
    ORDER BY (date, region, service, cost_center);

    CREATE TABLE IF NOT EXISTS ${CLICKHOUSE_DB}.cost_forecasts (
        forecast_date Date,
        region String,
        cost_center String,
        predicted_cost_usd Float64,
        confidence_lower Float64,
        confidence_upper Float64,
        model_version String,
        created_at DateTime DEFAULT now()
    ) ENGINE = MergeTree()
    ORDER BY (forecast_date, region, cost_center);

    CREATE TABLE IF NOT EXISTS ${CLICKHOUSE_DB}.budget_alerts (
        alert_date Date,
        region String,
        cost_center String,
        budget_limit_usd Float64,
        actual_cost_usd Float64,
        utilization_percent Float64,
        alert_level String,
        created_at DateTime DEFAULT now()
    ) ENGINE = MergeTree()
    ORDER BY (alert_date, region, cost_center);
EOF

    log "ClickHouse tables created"
}

# Fetch AWS costs using Cost Explorer
fetch_aws_costs() {
    local region=$1
    log "Fetching AWS costs for region: ${region}"

    # AWS Cost Explorer query
    aws ce get-cost-and-usage \
        --region us-east-1 \
        --time-period Start="${START_DATE}",End="${END_DATE}" \
        --granularity DAILY \
        --metrics "BlendedCost" "UsageQuantity" \
        --group-by Type=DIMENSION,Key=SERVICE \
        --filter file://<(cat <<EOF
{
  "Tags": {
    "Key": "region",
    "Values": ["${region}"]
  }
}
EOF
) \
        --output json > /tmp/aws-costs-${region}.json || {
        log "WARNING: Failed to fetch costs for ${region}"
        return 1
    }

    # Parse and insert into ClickHouse
    jq -r '.ResultsByTime[] |
        .TimePeriod.Start as $date |
        .Groups[] |
        [$date, .Keys[0], .Metrics.BlendedCost.Amount] |
        @tsv' /tmp/aws-costs-${region}.json | while IFS=$'\t' read -r date service cost; do

        # Insert into ClickHouse
        curl -s -X POST "${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/?query=INSERT+INTO+${CLICKHOUSE_DB}.cloud_costs+FORMAT+TSV" \
            --data-binary "$(echo -e "${date}\t${date} 00:00:00\t${region}\t${service}\tplatform\taws-service\t${service}\t0\t${cost}")"
    done

    log "Inserted costs for ${region}"
}

# Generate cost forecast using simple moving average
generate_forecast() {
    log "Generating cost forecast..."

    cat <<EOF | curl -s -X POST "${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}" --data-binary @-
    INSERT INTO ${CLICKHOUSE_DB}.cost_forecasts
    SELECT
        today() + INTERVAL number DAY as forecast_date,
        region,
        cost_center,
        avg(cost_usd) * 1.1 as predicted_cost_usd,  -- 10% buffer
        avg(cost_usd) * 0.9 as confidence_lower,
        avg(cost_usd) * 1.3 as confidence_upper,
        'sma-7day' as model_version,
        now() as created_at
    FROM ${CLICKHOUSE_DB}.cloud_costs
    WHERE date >= today() - INTERVAL 7 DAY
    AND date < today()
    GROUP BY region, cost_center, number
    SETTINGS max_block_size = 30;
EOF

    log "Forecast generated for next 30 days"
}

# Check budget thresholds and create alerts
check_budgets() {
    log "Checking budget thresholds..."

    # Define budgets
    declare -A budgets=(
        ["us-east-1"]=50000
        ["eu-central-1"]=40000
    )

    for region in "${!budgets[@]}"; do
        budget_limit=${budgets[$region]}

        # Get current month cost
        current_cost=$(curl -s "${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/?query=SELECT+sum(cost_usd)+FROM+${CLICKHOUSE_DB}.cloud_costs+WHERE+region='${region}'+AND+toYYYYMM(date)=toYYYYMM(today())" || echo "0")

        utilization=$(echo "scale=2; ${current_cost} / ${budget_limit} * 100" | bc)

        alert_level="none"
        if (( $(echo "${utilization} >= 90" | bc -l) )); then
            alert_level="critical"
        elif (( $(echo "${utilization} >= 80" | bc -l) )); then
            alert_level="warning"
        elif (( $(echo "${utilization} >= 70" | bc -l) )); then
            alert_level="info"
        fi

        if [[ "${alert_level}" != "none" ]]; then
            log "⚠️  Budget alert for ${region}: ${utilization}% (${current_cost}/${budget_limit} USD)"

            # Insert alert
            curl -s -X POST "${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/?query=INSERT+INTO+${CLICKHOUSE_DB}.budget_alerts+FORMAT+TSV" \
                --data-binary "$(echo -e "$(date +%Y-%m-%d)\t${region}\tplatform\t${budget_limit}\t${current_cost}\t${utilization}\t${alert_level}")"
        fi
    done

    log "Budget checks complete"
}

# Main execution
main() {
    log "=== FinOps Cost Ingestion Started ==="

    create_cost_table

    # Fetch costs for both regions
    fetch_aws_costs "us-east-1" || log "WARNING: US costs fetch failed"
    fetch_aws_costs "eu-central-1" || log "WARNING: EU costs fetch failed"

    # Generate forecast
    generate_forecast

    # Check budgets
    check_budgets

    log "=== FinOps Cost Ingestion Complete ==="
}

main "$@"
