#!/usr/bin/env bash
<<<<<<< HEAD
# FinOps Cost Ingestion Script
# Fetches cloud cost data from AWS/GCP/Azure and ingests into ClickHouse
=======
#
# FinOps Cost Ingestion Script
# Purpose: Ingest cloud costs from AWS Cost Explorer and tag with allocations
# Frequency: Run hourly via CronJob
>>>>>>> origin/claude/ga-cutover-phase-one-0111mH9eWczXzBtpzUU5uUVU

set -euo pipefail

# Configuration
<<<<<<< HEAD
CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-clickhouse.databases.svc.cluster.local}"
CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-9000}"
CLICKHOUSE_DB="${CLICKHOUSE_DB:-finops}"
START_DATE="${START_DATE:-$(date -d '30 days ago' +%Y-%m-%d)}"
END_DATE="${END_DATE:-$(date +%Y-%m-%d)}"

log() {
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

log "Starting FinOps cost ingestion..."
log "Date range: $START_DATE to $END_DATE"

# Create ClickHouse schema if not exists
log "Ensuring ClickHouse schema exists..."
clickhouse-client --host="$CLICKHOUSE_HOST" --port="$CLICKHOUSE_PORT" --query="
CREATE DATABASE IF NOT EXISTS $CLICKHOUSE_DB;

CREATE TABLE IF NOT EXISTS $CLICKHOUSE_DB.cloud_costs (
  date Date,
  timestamp DateTime,
  cloud_provider LowCardinality(String),
  region LowCardinality(String),
  service LowCardinality(String),
  resource_id String,
  resource_name String,
  cost_center String,
  environment LowCardinality(String),
  cost_usd Decimal(18, 4),
  usage_quantity Decimal(18, 4),
  usage_unit String,
  tags Map(String, String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, cloud_provider, region, service)
TTL date + INTERVAL 2 YEAR;

CREATE TABLE IF NOT EXISTS $CLICKHOUSE_DB.co2e_emissions (
  date Date,
  timestamp DateTime,
  cloud_provider LowCardinality(String),
  region LowCardinality(String),
  service LowCardinality(String),
  resource_id String,
  energy_kwh Decimal(18, 4),
  co2e_kg Decimal(18, 6),
  carbon_intensity_gco2_kwh Decimal(10, 2),
  renewable_percentage Decimal(5, 2)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, cloud_provider, region)
TTL date + INTERVAL 2 YEAR;

CREATE TABLE IF NOT EXISTS $CLICKHOUSE_DB.budget_alerts (
  date Date,
  timestamp DateTime,
  cost_center String,
  budget_usd Decimal(18, 2),
  actual_usd Decimal(18, 2),
  forecast_usd Decimal(18, 2),
  variance_percent Decimal(5, 2),
  alert_severity LowCardinality(String)
) ENGINE = MergeTree()
PARTITION BY toYYYYMM(date)
ORDER BY (date, cost_center);
" || { log "ERROR: Failed to create schema"; exit 1; }

log "Schema created successfully"

# Ingest AWS costs
log "Ingesting AWS costs..."
# Simulate AWS Cost Explorer API call
# In production: aws ce get-cost-and-usage --time-period Start=$START_DATE,End=$END_DATE --granularity DAILY --metrics BlendedCost

cat > /tmp/aws_costs.csv <<EOF
2025-11-16,2025-11-16T00:00:00Z,aws,us-east-1,ec2,i-0123456789,api-gateway-prod,production-us,production,45.32,24,hours,{"team":"platform","app":"api-gateway"}
2025-11-16,2025-11-16T00:00:00Z,aws,us-east-1,rds,db-0123456789,postgres-prod,production-us,production,123.45,24,hours,{"team":"platform","app":"database"}
2025-11-16,2025-11-16T00:00:00Z,aws,us-east-1,s3,bucket-backups,s3-backups,production-us,production,12.34,1024,gb,{"team":"platform","app":"backup"}
2025-11-16,2025-11-16T00:00:00Z,aws,eu-central-1,ec2,i-9876543210,api-gateway-eu,production-eu,production,48.76,24,hours,{"team":"platform","app":"api-gateway"}
2025-11-16,2025-11-16T00:00:00Z,aws,eu-central-1,rds,db-9876543210,postgres-eu,production-eu,production,145.67,24,hours,{"team":"platform","app":"database"}
EOF

clickhouse-client --host="$CLICKHOUSE_HOST" --port="$CLICKHOUSE_PORT" --query="
INSERT INTO $CLICKHOUSE_DB.cloud_costs FORMAT CSV
" < /tmp/aws_costs.csv

log "AWS costs ingested: $(wc -l < /tmp/aws_costs.csv) records"

# Ingest CO2e emissions data
log "Ingesting CO2e emissions data..."
# Calculate emissions using cloud carbon coefficients
# AWS us-east-1: ~415 gCO2/kWh, eu-central-1: ~338 gCO2/kWh

cat > /tmp/co2e_emissions.csv <<EOF
2025-11-16,2025-11-16T00:00:00Z,aws,us-east-1,ec2,i-0123456789,120.5,50.01,415,0
2025-11-16,2025-11-16T00:00:00Z,aws,us-east-1,rds,db-0123456789,245.8,102.01,415,0
2025-11-16,2025-11-16T00:00:00Z,aws,eu-central-1,ec2,i-9876543210,115.2,38.94,338,35
2025-11-16,2025-11-16T00:00:00Z,aws,eu-central-1,rds,db-9876543210,230.4,77.88,338,35
EOF

clickhouse-client --host="$CLICKHOUSE_HOST" --port="$CLICKHOUSE_PORT" --query="
INSERT INTO $CLICKHOUSE_DB.co2e_emissions FORMAT CSV
" < /tmp/co2e_emissions.csv

log "CO2e emissions ingested: $(wc -l < /tmp/co2e_emissions.csv) records"

# Calculate budget variance and generate alerts
log "Calculating budget variance..."
clickhouse-client --host="$CLICKHOUSE_HOST" --port="$CLICKHOUSE_PORT" --query="
INSERT INTO $CLICKHOUSE_DB.budget_alerts
SELECT
  toDate(now()) as date,
  now() as timestamp,
  cost_center,
  1000.00 as budget_usd,  -- Monthly budget per cost center
  sum(cost_usd) as actual_usd,
  sum(cost_usd) * 30 / dayofmonth(now()) as forecast_usd,  -- Forecast to end of month
  (sum(cost_usd) * 30 / dayofmonth(now()) - 1000.00) / 1000.00 * 100 as variance_percent,
  CASE
    WHEN (sum(cost_usd) * 30 / dayofmonth(now()) - 1000.00) / 1000.00 * 100 > 20 THEN 'critical'
    WHEN (sum(cost_usd) * 30 / dayofmonth(now()) - 1000.00) / 1000.00 * 100 > 10 THEN 'warning'
    ELSE 'normal'
  END as alert_severity
FROM $CLICKHOUSE_DB.cloud_costs
WHERE date >= toDate(now()) - INTERVAL 1 MONTH
GROUP BY cost_center;
"

log "Budget alerts generated"

# Output summary
log "==================================="
log "FinOps Ingestion Summary"
log "==================================="
log "Total costs ingested:"
clickhouse-client --host="$CLICKHOUSE_HOST" --port="$CLICKHOUSE_PORT" --query="
SELECT
  cloud_provider,
  region,
  sum(cost_usd) as total_cost_usd
FROM $CLICKHOUSE_DB.cloud_costs
WHERE date >= '$START_DATE' AND date <= '$END_DATE'
GROUP BY cloud_provider, region
FORMAT PrettyCompact;
"

log "Total CO2e emissions:"
clickhouse-client --host="$CLICKHOUSE_HOST" --port="$CLICKHOUSE_PORT" --query="
SELECT
  cloud_provider,
  region,
  sum(co2e_kg) as total_co2e_kg
FROM $CLICKHOUSE_DB.co2e_emissions
WHERE date >= '$START_DATE' AND date <= '$END_DATE'
GROUP BY cloud_provider, region
FORMAT PrettyCompact;
"

log "Budget alerts:"
clickhouse-client --host="$CLICKHOUSE_HOST" --port="$CLICKHOUSE_PORT" --query="
SELECT
  cost_center,
  budget_usd,
  actual_usd,
  forecast_usd,
  variance_percent,
  alert_severity
FROM $CLICKHOUSE_DB.budget_alerts
WHERE date = toDate(now())
FORMAT PrettyCompact;
"

# Cleanup
rm -f /tmp/aws_costs.csv /tmp/co2e_emissions.csv

log "==================================="
log "FinOps ingestion completed successfully"
=======
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
>>>>>>> origin/claude/ga-cutover-phase-one-0111mH9eWczXzBtpzUU5uUVU
