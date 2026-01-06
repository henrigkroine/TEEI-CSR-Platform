#!/usr/bin/env bash
# FinOps Dashboard Renderer
# Generates static FinOps reports and renders Grafana dashboards

set -euo pipefail

GRAFANA_URL="${GRAFANA_URL:-http://grafana.observability.svc.cluster.local:3000}"
GRAFANA_API_KEY="${GRAFANA_API_KEY:-}"
OUTPUT_DIR="${OUTPUT_DIR:-/tmp/finops-reports}"

log() {
  echo "[$(date -u +"%Y-%m-%dT%H:%M:%SZ")] $*"
}

log "Starting FinOps dashboard rendering..."

mkdir -p "$OUTPUT_DIR"

# Install Grafana dashboards
log "Installing FinOps dashboards to Grafana..."

for dashboard in observability/grafana/dashboards/finops-*.json; do
  if [[ -f "$dashboard" ]]; then
    log "Installing dashboard: $dashboard"

    if [[ -n "$GRAFANA_API_KEY" ]]; then
      curl -X POST "$GRAFANA_URL/api/dashboards/db" \
        -H "Authorization: Bearer $GRAFANA_API_KEY" \
        -H "Content-Type: application/json" \
        -d @"$dashboard" || log "WARNING: Failed to install $dashboard"
    else
      log "WARNING: No GRAFANA_API_KEY set, skipping API installation"
    fi
  fi
done

log "Dashboard installation complete"

# Generate static reports
log "Generating static FinOps reports..."

# Cost summary report
clickhouse-client --query="
SELECT
  date,
  cloud_provider,
  region,
  sum(cost_usd) as total_cost
FROM finops.cloud_costs
WHERE date >= today() - INTERVAL 30 DAY
GROUP BY date, cloud_provider, region
ORDER BY date DESC
FORMAT CSVWithNames
" > "$OUTPUT_DIR/cost-summary-30d.csv"

log "Generated: $OUTPUT_DIR/cost-summary-30d.csv"

# CO2e emissions report
clickhouse-client --query="
SELECT
  date,
  cloud_provider,
  region,
  sum(co2e_kg) as total_co2e_kg,
  avg(renewable_percentage) as avg_renewable_pct
FROM finops.co2e_emissions
WHERE date >= today() - INTERVAL 30 DAY
GROUP BY date, cloud_provider, region
ORDER BY date DESC
FORMAT CSVWithNames
" > "$OUTPUT_DIR/co2e-summary-30d.csv"

log "Generated: $OUTPUT_DIR/co2e-summary-30d.csv"

# Budget alerts report
clickhouse-client --query="
SELECT
  date,
  cost_center,
  budget_usd,
  forecast_usd,
  variance_percent,
  alert_severity
FROM finops.budget_alerts
WHERE date >= today() - INTERVAL 7 DAY
ORDER BY date DESC, variance_percent DESC
FORMAT CSVWithNames
" > "$OUTPUT_DIR/budget-alerts-7d.csv"

log "Generated: $OUTPUT_DIR/budget-alerts-7d.csv"

log "==================================="
log "FinOps rendering completed"
log "Output directory: $OUTPUT_DIR"
log "==================================="
