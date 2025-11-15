#!/bin/bash
################################################################################
# measure-rto-rpo.sh
#
# Calculates RTO (Recovery Time Objective) and RPO (Recovery Point Objective)
# by capturing metrics before, during, and after failover.
#
# Usage:
#   ./measure-rto-rpo.sh --phase pre-failover --region eu-central-1
#   ./measure-rto-rpo.sh --phase post-failover --region eu-central-1
#   ./measure-rto-rpo.sh --calculate --evidence-dir /path/to/evidence
#
# Author: backup-restore-auditor
# Version: 1.0
# Date: 2025-11-15
################################################################################

set -euo pipefail

# Configuration
PHASE="${PHASE:-pre-failover}"
REGION="${REGION:-eu-central-1}"
EVIDENCE_DIR="${EVIDENCE_DIR:-/home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)}"
LOG_FILE="${EVIDENCE_DIR}/rto-rpo-measurement.log"

# RTO/RPO targets (seconds)
TARGET_RTO=300   # 5 minutes
TARGET_RPO=10    # 10 seconds

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

################################################################################
# Helper Functions
################################################################################

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "$LOG_FILE"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $*" | tee -a "$LOG_FILE"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*" | tee -a "$LOG_FILE"
}

info() {
    echo -e "${BLUE}[$(date +'%Y-%m-%d %H:%M:%S')] INFO:${NC} $*" | tee -a "$LOG_FILE"
}

show_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Measure RTO/RPO for disaster recovery compliance.

Options:
    --phase PHASE           Phase: pre-failover, post-failover, outage-start
    --region REGION         Target region (default: eu-central-1)
    --calculate             Calculate final RTO/RPO from captured evidence
    --evidence-dir DIR      Evidence directory (for --calculate mode)
    --export-grafana        Export Grafana dashboard screenshots
    --help                  Show this help message

Examples:
    # Capture pre-failover state
    $0 --phase pre-failover --region eu-central-1

    # Capture post-failover state
    $0 --phase post-failover --region eu-central-1

    # Calculate RTO/RPO from evidence
    $0 --calculate --evidence-dir /path/to/evidence

Phases:
    pre-failover    Capture state before failover (baseline)
    outage-start    Mark the start of outage (for RTO calculation)
    post-failover   Capture state after failover (recovery point)
    calculate       Compute RTO/RPO from captured data
EOF
}

################################################################################
# Kubernetes Context Helpers
################################################################################

get_context_for_region() {
    local region="$1"
    if [[ "$region" == "us-east-1" ]]; then
        echo "prod-us-east-1"
    elif [[ "$region" == "eu-central-1" ]]; then
        echo "prod-eu-central-1"
    else
        error "Unknown region: $region"
        exit 1
    fi
}

get_namespace_for_region() {
    local region="$1"
    if [[ "$region" == "us-east-1" ]]; then
        echo "teei-prod-us"
    elif [[ "$region" == "eu-central-1" ]]; then
        echo "teei-prod-eu"
    else
        error "Unknown region: $region"
        exit 1
    fi
}

################################################################################
# Metric Capture Functions
################################################################################

capture_postgres_metrics() {
    local ctx=$(get_context_for_region "$REGION")
    local ns=$(get_namespace_for_region "$REGION")
    local output_file="${EVIDENCE_DIR}/postgres-metrics-${PHASE}.json"

    info "Capturing PostgreSQL metrics for phase: $PHASE..."

    # Capture comprehensive Postgres state
    kubectl --context "$ctx" exec -it postgres-primary-0 -n "$ns" -- \
        psql -U postgres -d teei --no-align --tuples-only -c "
            SELECT json_build_object(
                'timestamp', EXTRACT(EPOCH FROM NOW()),
                'timestamp_iso', NOW()::TEXT,
                'is_recovery', pg_is_in_recovery(),
                'current_wal_lsn', pg_current_wal_lsn()::TEXT,
                'last_replay_lsn', CASE WHEN pg_is_in_recovery()
                    THEN pg_last_wal_replay_lsn()::TEXT
                    ELSE pg_current_wal_lsn()::TEXT
                    END,
                'replication_lag_seconds', CASE WHEN pg_is_in_recovery()
                    THEN EXTRACT(EPOCH FROM (NOW() - pg_last_xact_replay_timestamp()))
                    ELSE 0
                    END,
                'transaction_count', (SELECT count(*) FROM pg_stat_database WHERE datname = 'teei'),
                'active_connections', (SELECT count(*) FROM pg_stat_activity WHERE state = 'active'),
                'total_rows_events', (SELECT count(*) FROM events)
            );
        " 2>/dev/null > "$output_file" || warn "Failed to capture Postgres metrics"

    if [[ -f "$output_file" ]]; then
        log "PostgreSQL metrics saved to: $output_file"
        cat "$output_file" | jq '.' || warn "Invalid JSON in Postgres metrics"
    fi
}

capture_clickhouse_metrics() {
    local ctx=$(get_context_for_region "$REGION")
    local ns=$(get_namespace_for_region "$REGION")
    local output_file="${EVIDENCE_DIR}/clickhouse-metrics-${PHASE}.json"

    info "Capturing ClickHouse metrics for phase: $PHASE..."

    kubectl --context "$ctx" exec -it clickhouse-0 -n "$ns" -- \
        clickhouse-client --format JSONEachRow --query "
            SELECT
                now() AS timestamp,
                database,
                table,
                sum(rows) AS total_rows,
                sum(bytes) AS total_bytes,
                count(DISTINCT partition) AS partitions,
                formatReadableSize(sum(bytes)) AS size_human
            FROM system.parts
            WHERE active = 1 AND database = 'analytics'
            GROUP BY database, table;
        " 2>/dev/null > "$output_file" || warn "Failed to capture ClickHouse metrics"

    if [[ -f "$output_file" ]]; then
        log "ClickHouse metrics saved to: $output_file"
    fi
}

capture_nats_metrics() {
    local ctx=$(get_context_for_region "$REGION")
    local ns=$(get_namespace_for_region "$REGION")
    local output_file="${EVIDENCE_DIR}/nats-metrics-${PHASE}.json"

    info "Capturing NATS JetStream metrics for phase: $PHASE..."

    kubectl --context "$ctx" exec -it nats-0 -n "$ns" -- \
        nats --server nats://localhost:4222 --creds /etc/nats/creds/admin.creds \
        stream info CSR_EVENTS_MIRROR --json 2>/dev/null > "$output_file" || warn "Failed to capture NATS metrics"

    if [[ -f "$output_file" ]]; then
        log "NATS metrics saved to: $output_file"
        # Extract key metrics
        local messages=$(jq -r '.state.messages' "$output_file" 2>/dev/null || echo "0")
        local first_seq=$(jq -r '.state.first_seq' "$output_file" 2>/dev/null || echo "0")
        local last_seq=$(jq -r '.state.last_seq' "$output_file" 2>/dev/null || echo "0")
        info "NATS Stream: $messages messages (seq $first_seq - $last_seq)"
    fi
}

capture_prometheus_metrics() {
    local output_file="${EVIDENCE_DIR}/prometheus-snapshot-${PHASE}.txt"

    info "Capturing Prometheus metrics for phase: $PHASE..."

    # Port-forward to Prometheus (requires Prometheus to be accessible)
    # This is a simplified version - in production, use Prometheus API directly
    local prom_url="${PROMETHEUS_URL:-http://localhost:9090}"

    # Capture key metrics (if Prometheus is accessible)
    if curl -s --max-time 5 "$prom_url/api/v1/query?query=up" > /dev/null 2>&1; then
        # API response rate
        curl -s "$prom_url/api/v1/query?query=rate(http_requests_total[5m])" > "${EVIDENCE_DIR}/prom-api-rate-${PHASE}.json" 2>/dev/null || true

        # Error rate
        curl -s "$prom_url/api/v1/query?query=rate(http_requests_total{status=~\"5..\"}[5m])" > "${EVIDENCE_DIR}/prom-error-rate-${PHASE}.json" 2>/dev/null || true

        # Database connections
        curl -s "$prom_url/api/v1/query?query=pg_stat_database_numbackends" > "${EVIDENCE_DIR}/prom-db-connections-${PHASE}.json" 2>/dev/null || true

        log "Prometheus metrics captured"
    else
        warn "Prometheus not accessible at $prom_url. Skipping Prometheus metrics."
    fi
}

capture_grafana_screenshot() {
    local dashboard_url="${GRAFANA_DR_DASHBOARD:-http://localhost:3000/d/dr-metrics/disaster-recovery-metrics}"
    local output_file="${EVIDENCE_DIR}/grafana-dashboard-${PHASE}.png"

    info "Capturing Grafana dashboard screenshot..."

    # Use Puppeteer or Playwright for headless screenshot
    if command -v puppeteer &> /dev/null; then
        puppeteer screenshot "$dashboard_url" "$output_file" --wait-until networkidle0 || warn "Failed to capture Grafana screenshot"
        log "Grafana screenshot saved to: $output_file"
    else
        warn "Puppeteer not installed. Skipping Grafana screenshot."
        warn "Install with: npm install -g puppeteer"
    fi
}

mark_outage_start() {
    local output_file="${EVIDENCE_DIR}/outage-start-timestamp.txt"

    info "Marking outage start time..."

    local outage_start=$(date +%s)
    echo "$outage_start" > "$output_file"
    echo "$(date -Iseconds)" >> "$output_file"

    log "Outage start marked: $(date -Iseconds) (epoch: $outage_start)"
}

mark_recovery_complete() {
    local output_file="${EVIDENCE_DIR}/recovery-complete-timestamp.txt"

    info "Marking recovery completion time..."

    local recovery_complete=$(date +%s)
    echo "$recovery_complete" > "$output_file"
    echo "$(date -Iseconds)" >> "$output_file"

    log "Recovery complete marked: $(date -Iseconds) (epoch: $recovery_complete)"
}

################################################################################
# RTO/RPO Calculation Functions
################################################################################

calculate_rto() {
    local evidence_dir="$1"

    info "Calculating RTO (Recovery Time Objective)..."

    local outage_start_file="${evidence_dir}/outage-start-timestamp.txt"
    local recovery_complete_file="${evidence_dir}/recovery-complete-timestamp.txt"

    if [[ ! -f "$outage_start_file" ]]; then
        # Try to find from pre-failover metrics
        outage_start_file=$(find "$evidence_dir" -name "*pre-failover*" -type f | head -1)
        if [[ -z "$outage_start_file" ]]; then
            warn "Cannot find outage start timestamp. RTO calculation skipped."
            return
        fi
    fi

    if [[ ! -f "$recovery_complete_file" ]]; then
        # Use post-failover timestamp
        recovery_complete_file=$(find "$evidence_dir" -name "*post-failover*" -type f | head -1)
        if [[ -z "$recovery_complete_file" ]]; then
            warn "Cannot find recovery complete timestamp. RTO calculation skipped."
            return
        fi
    fi

    # Extract timestamps
    local outage_start=$(head -1 "$outage_start_file")
    local recovery_complete=$(head -1 "$recovery_complete_file")

    # Calculate RTO
    local rto=$((recovery_complete - outage_start))

    log "==================================================================="
    log "RTO CALCULATION"
    log "==================================================================="
    log "Outage Start:      $(date -d @${outage_start} -Iseconds 2>/dev/null || date -r ${outage_start} -Iseconds)"
    log "Recovery Complete: $(date -d @${recovery_complete} -Iseconds 2>/dev/null || date -r ${recovery_complete} -Iseconds)"
    log "RTO:               ${rto} seconds ($(printf '%d:%02d:%02d' $((rto/3600)) $((rto%3600/60)) $((rto%60))))"
    log "Target RTO:        ${TARGET_RTO} seconds ($(printf '%d:%02d:%02d' $((TARGET_RTO/3600)) $((TARGET_RTO%3600/60)) $((TARGET_RTO%60))))"

    if [[ $rto -le $TARGET_RTO ]]; then
        log "✓ RTO TARGET MET: ${rto}s <= ${TARGET_RTO}s"
    else
        warn "⚠ RTO TARGET MISSED: ${rto}s > ${TARGET_RTO}s (exceeded by $((rto - TARGET_RTO))s)"
    fi
    log "==================================================================="

    # Save RTO to file
    echo "{\"rto_seconds\": $rto, \"target_rto_seconds\": $TARGET_RTO, \"met\": $([ $rto -le $TARGET_RTO ] && echo "true" || echo "false")}" \
        > "${evidence_dir}/rto-result.json"
}

calculate_rpo() {
    local evidence_dir="$1"

    info "Calculating RPO (Recovery Point Objective)..."

    local pre_failover_postgres="${evidence_dir}/postgres-metrics-pre-failover.json"
    local post_failover_postgres="${evidence_dir}/postgres-metrics-post-failover.json"

    if [[ ! -f "$pre_failover_postgres" || ! -f "$post_failover_postgres" ]]; then
        warn "Cannot find PostgreSQL metrics files. RPO calculation skipped."
        return
    fi

    # Extract WAL LSNs
    local pre_lsn=$(jq -r '.last_replay_lsn' "$pre_failover_postgres" 2>/dev/null || echo "0/0")
    local post_lsn=$(jq -r '.last_replay_lsn' "$post_failover_postgres" 2>/dev/null || echo "0/0")

    # Extract row counts
    local pre_rows=$(jq -r '.total_rows_events' "$pre_failover_postgres" 2>/dev/null || echo "0")
    local post_rows=$(jq -r '.total_rows_events' "$post_failover_postgres" 2>/dev/null || echo "0")

    # Calculate replication lag from pre-failover
    local replication_lag=$(jq -r '.replication_lag_seconds' "$pre_failover_postgres" 2>/dev/null || echo "0")

    log "==================================================================="
    log "RPO CALCULATION"
    log "==================================================================="
    log "Pre-Failover WAL LSN:  $pre_lsn"
    log "Post-Failover WAL LSN: $post_lsn"
    log "Pre-Failover Rows:     $pre_rows"
    log "Post-Failover Rows:    $post_rows"
    log "Row Difference:        $((post_rows - pre_rows))"
    log "Replication Lag:       ${replication_lag} seconds"
    log "Target RPO:            ${TARGET_RPO} seconds"

    # RPO is essentially the replication lag at time of failover
    local rpo=${replication_lag%.*}  # Remove decimal

    if [[ $rpo -le $TARGET_RPO ]]; then
        log "✓ RPO TARGET MET: ${rpo}s <= ${TARGET_RPO}s"
    else
        warn "⚠ RPO TARGET MISSED: ${rpo}s > ${TARGET_RPO}s (exceeded by $((rpo - TARGET_RPO))s)"
    fi
    log "==================================================================="

    # Save RPO to file
    echo "{\"rpo_seconds\": $rpo, \"target_rpo_seconds\": $TARGET_RPO, \"met\": $([ $rpo -le $TARGET_RPO ] && echo "true" || echo "false"), \"rows_lost\": $((pre_rows - post_rows))}" \
        > "${evidence_dir}/rpo-result.json"
}

generate_compliance_report() {
    local evidence_dir="$1"

    info "Generating SOC2 compliance evidence bundle..."

    local rto_result="${evidence_dir}/rto-result.json"
    local rpo_result="${evidence_dir}/rpo-result.json"

    if [[ ! -f "$rto_result" || ! -f "$rpo_result" ]]; then
        warn "RTO/RPO results not found. Cannot generate compliance report."
        return
    fi

    # Generate comprehensive compliance report
    cat > "${evidence_dir}/soc2-dr-evidence-report.json" <<EOF
{
  "report_type": "Disaster Recovery Evidence",
  "standard": "SOC2 CC9.1",
  "generated_at": "$(date -Iseconds)",
  "evidence_directory": "$evidence_dir",
  "rto": $(cat "$rto_result"),
  "rpo": $(cat "$rpo_result"),
  "artifacts": [
    $(find "$evidence_dir" -type f -name "*.json" -o -name "*.txt" | while read -r file; do
        echo "\"$(basename "$file")\","
    done | sed '$ s/,$//')
  ],
  "compliance_status": {
    "rto_compliant": $(jq -r '.met' "$rto_result"),
    "rpo_compliant": $(jq -r '.met' "$rpo_result"),
    "overall_compliant": $(
        rto_met=$(jq -r '.met' "$rto_result")
        rpo_met=$(jq -r '.met' "$rpo_result")
        if [[ "$rto_met" == "true" && "$rpo_met" == "true" ]]; then
            echo "true"
        else
            echo "false"
        fi
    )
  },
  "attestation": {
    "executed_by": "dr-gameday-lead",
    "drill_type": "Automated Gameday Drill",
    "signed_hash": "$(find "$evidence_dir" -type f | sort | xargs cat | sha256sum | awk '{print $1}')"
  }
}
EOF

    log "SOC2 compliance report generated: ${evidence_dir}/soc2-dr-evidence-report.json"

    # Display summary
    cat "${evidence_dir}/soc2-dr-evidence-report.json" | jq '.compliance_status'
}

################################################################################
# Main Execution
################################################################################

parse_args() {
    local calculate=false
    local export_grafana=false

    while [[ $# -gt 0 ]]; do
        case $1 in
            --phase)
                PHASE="$2"
                shift 2
                ;;
            --region)
                REGION="$2"
                shift 2
                ;;
            --calculate)
                calculate=true
                shift
                ;;
            --evidence-dir)
                EVIDENCE_DIR="$2"
                shift 2
                ;;
            --export-grafana)
                export_grafana=true
                shift
                ;;
            --help)
                show_usage
                exit 0
                ;;
            *)
                error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    export CALCULATE=$calculate
    export EXPORT_GRAFANA=$export_grafana
}

main() {
    parse_args "$@"

    mkdir -p "$EVIDENCE_DIR"

    log "==================================================================="
    log "RTO/RPO MEASUREMENT"
    log "==================================================================="
    log "Phase: $PHASE"
    log "Region: $REGION"
    log "Evidence Directory: $EVIDENCE_DIR"
    log "==================================================================="

    if [[ "${CALCULATE:-false}" == "true" ]]; then
        # Calculate RTO/RPO from existing evidence
        calculate_rto "$EVIDENCE_DIR"
        calculate_rpo "$EVIDENCE_DIR"
        generate_compliance_report "$EVIDENCE_DIR"

    elif [[ "$PHASE" == "outage-start" ]]; then
        # Mark outage start (for RTO baseline)
        mark_outage_start

    elif [[ "$PHASE" == "pre-failover" ]]; then
        # Capture pre-failover state
        capture_postgres_metrics
        capture_clickhouse_metrics
        capture_nats_metrics
        capture_prometheus_metrics

        if [[ "${EXPORT_GRAFANA:-false}" == "true" ]]; then
            capture_grafana_screenshot
        fi

    elif [[ "$PHASE" == "post-failover" ]]; then
        # Capture post-failover state
        mark_recovery_complete
        capture_postgres_metrics
        capture_clickhouse_metrics
        capture_nats_metrics
        capture_prometheus_metrics

        if [[ "${EXPORT_GRAFANA:-false}" == "true" ]]; then
            capture_grafana_screenshot
        fi

    else
        error "Invalid phase: $PHASE"
        show_usage
        exit 1
    fi

    log "==================================================================="
    log "Measurement complete. Evidence saved to: $EVIDENCE_DIR"
    log "==================================================================="
}

# Run main
main "$@"
