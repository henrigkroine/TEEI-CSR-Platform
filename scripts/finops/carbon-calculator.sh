#!/usr/bin/env bash
#
# Carbon Emissions Calculator
# Purpose: Calculate CO2e emissions from cloud infrastructure
# Based on: Cloud Carbon Footprint methodology

set -euo pipefail

CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-clickhouse.teei-production.svc.cluster.local}"
CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-8123}"
CLICKHOUSE_DB="${CLICKHOUSE_DB:-teei_analytics}"

log() {
    echo "$(date '+%Y-%m-%d %H:%M:%S') [Carbon] $*"
}

log "Starting carbon emissions calculation"

# Carbon intensity factors (kg CO2e per kWh) by AWS region
# Source: https://www.cloudcarbonfootprint.org/docs/methodology
declare -A carbon_intensity=(
    ["us-east-1"]=0.415    # Virginia (US grid mix)
    ["eu-central-1"]=0.338 # Frankfurt (EU grid mix)
)

# Power Usage Effectiveness (PUE) - AWS average
PUE=1.135

# Create carbon emissions table
create_carbon_table() {
    log "Creating carbon emissions table..."

    cat <<EOF | curl -s -X POST "${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}" --data-binary @-
    CREATE TABLE IF NOT EXISTS ${CLICKHOUSE_DB}.carbon_emissions (
        date Date,
        region String,
        service String,
        kwh_consumed Float64,
        co2e_kg Float64,
        carbon_intensity Float64,
        reduction_opportunity String,
        created_at DateTime DEFAULT now()
    ) ENGINE = MergeTree()
    PARTITION BY toYYYYMM(date)
    ORDER BY (date, region, service);
EOF

    log "Carbon table created"
}

# Calculate emissions from compute usage
calculate_compute_emissions() {
    local region=$1
    local intensity=${carbon_intensity[$region]}

    log "Calculating compute emissions for ${region}..."

    # Get vCPU hours from cost data (approximation)
    # Assume: 1 vCPU = 5 watts average, running 24/7
    vcpu_hours=$(curl -s "${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/?query=SELECT+sum(usage_hours)+FROM+${CLICKHOUSE_DB}.cloud_costs+WHERE+region='${region}'+AND+service='AmazonEC2'+AND+date=yesterday()" || echo "0")

    # Convert to kWh: (vCPU hours * 5 watts * PUE) / 1000
    kwh=$(echo "scale=4; ${vcpu_hours} * 5 * ${PUE} / 1000" | bc)

    # Calculate CO2e: kWh * carbon intensity
    co2e=$(echo "scale=4; ${kwh} * ${intensity}" | bc)

    log "${region} compute: ${vcpu_hours} vCPU-hours = ${kwh} kWh = ${co2e} kg CO2e"

    # Insert into ClickHouse
    curl -s -X POST "${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/?query=INSERT+INTO+${CLICKHOUSE_DB}.carbon_emissions+FORMAT+TSV" \
        --data-binary "$(echo -e "$(date -d yesterday +%Y-%m-%d)\t${region}\tAmazonEC2\t${kwh}\t${co2e}\t${intensity}\tright-sizing")"
}

# Calculate storage emissions
calculate_storage_emissions() {
    local region=$1
    local intensity=${carbon_intensity[$region]}

    log "Calculating storage emissions for ${region}..."

    # Get storage GB-hours
    storage_hours=$(curl -s "${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/?query=SELECT+sum(usage_hours)+FROM+${CLICKHOUSE_DB}.cloud_costs+WHERE+region='${region}'+AND+(service='AmazonS3'+OR+service='AmazonEBS')+AND+date=yesterday()" || echo "0")

    # Convert to kWh: (GB-hours * 0.65 watts per TB * PUE) / 1000
    kwh=$(echo "scale=4; ${storage_hours} * 0.00065 * ${PUE} / 1000" | bc)

    co2e=$(echo "scale=4; ${kwh} * ${intensity}" | bc)

    log "${region} storage: ${storage_hours} GB-hours = ${kwh} kWh = ${co2e} kg CO2e"

    curl -s -X POST "${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/?query=INSERT+INTO+${CLICKHOUSE_DB}.carbon_emissions+FORMAT+TSV" \
        --data-binary "$(echo -e "$(date -d yesterday +%Y-%m-%d)\t${region}\tAmazonS3\t${kwh}\t${co2e}\t${intensity}\tlifecycle-policies")"
}

# Generate reduction recommendations
generate_recommendations() {
    log "Generating carbon reduction recommendations..."

    total_co2e=$(curl -s "${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}/?query=SELECT+sum(co2e_kg)+FROM+${CLICKHOUSE_DB}.carbon_emissions+WHERE+date=yesterday()" || echo "0")

    log "Total yesterday: ${total_co2e} kg CO2e"

    cat > /tmp/carbon-reduction-playbook.md <<EOF
# Carbon Reduction Playbook

**Date:** $(date +%Y-%m-%d)
**Total Emissions Yesterday:** ${total_co2e} kg CO2e

## Immediate Actions (0-30 days)

1. **Right-size EC2 instances** (Est. 15-20% reduction)
   - Analyze CPU utilization <30% for 7+ days
   - Downsize or use Graviton2 processors

2. **Enable S3 Intelligent-Tiering** (Est. 5-10% reduction)
   - Move infrequently accessed data to colder storage
   - Set lifecycle policies for old objects

3. **Implement Auto-Scaling** (Est. 10-15% reduction)
   - Scale down non-production during off-hours
   - Use Spot instances for batch workloads

## Medium-term Actions (30-90 days)

4. **Migrate to greener regions**
   - EU regions generally have lower carbon intensity
   - Consider renewable energy commitments

5. **Optimize database queries**
   - Reduce ClickHouse query complexity
   - Add appropriate indexes

## Long-term Actions (90+ days)

6. **Carbon-aware scheduling**
   - Run batch jobs when grid is cleanest
   - Use Carbon-Aware Kubernetes Scheduler

7. **Renewable Energy Procurement**
   - Purchase Renewable Energy Certificates (RECs)
   - Negotiate with AWS for renewable energy matching

---

**Estimated Total Reduction Potential:** 30-45%
**Playbook Link:** /docs/carbon-reduction-playbook.md
EOF

    log "Reduction playbook generated: /tmp/carbon-reduction-playbook.md"
}

# Main execution
main() {
    create_carbon_table

    calculate_compute_emissions "us-east-1"
    calculate_compute_emissions "eu-central-1"

    calculate_storage_emissions "us-east-1"
    calculate_storage_emissions "eu-central-1"

    generate_recommendations

    log "Carbon emissions calculation complete"
}

main "$@"
