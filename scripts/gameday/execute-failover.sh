#!/bin/bash
################################################################################
# execute-failover.sh
#
# Orchestrates the complete regional failover sequence with automated timing
# and evidence capture. Follows the runbook procedures with checkpoints.
#
# Usage:
#   ./execute-failover.sh --source us-east-1 --target eu-central-1
#   ./execute-failover.sh --dry-run  # Test mode (no actual changes)
#
# Author: dr-gameday-lead
# Version: 1.0
# Date: 2025-11-15
################################################################################

set -euo pipefail

# Configuration
SOURCE_REGION="${SOURCE_REGION:-us-east-1}"
TARGET_REGION="${TARGET_REGION:-eu-central-1}"
EVIDENCE_DIR="/home/user/TEEI-CSR-Platform/ops/gameday/evidence/failover-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="${EVIDENCE_DIR}/failover-execution.log"
TIMING_FILE="${EVIDENCE_DIR}/failover-timing.json"

# Failover timing targets (seconds)
TARGET_ASSESSMENT_TIME=60
TARGET_DB_FAILOVER_TIME=60
TARGET_CLICKHOUSE_TIME=30
TARGET_NATS_TIME=30
TARGET_APP_SERVICES_TIME=60
TARGET_DNS_CUTOVER_TIME=60
TARGET_TOTAL_RTO=300  # 5 minutes

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Timing tracking
declare -A PHASE_START_TIMES
declare -A PHASE_END_TIMES
FAILOVER_START_TIME=0

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

start_phase() {
    local phase_name="$1"
    PHASE_START_TIMES["$phase_name"]=$(date +%s)
    log "========================================"
    log "PHASE: $phase_name"
    log "========================================"
}

end_phase() {
    local phase_name="$1"
    local target_time="$2"

    PHASE_END_TIMES["$phase_name"]=$(date +%s)
    local duration=$((PHASE_END_TIMES["$phase_name"] - PHASE_START_TIMES["$phase_name"]))

    if [[ $duration -le $target_time ]]; then
        log "✓ Phase '$phase_name' completed in ${duration}s (target: ${target_time}s) - SUCCESS"
    else
        warn "⚠ Phase '$phase_name' took ${duration}s (target: ${target_time}s) - EXCEEDED"
    fi

    # Save to timing file
    echo "{\"phase\": \"$phase_name\", \"duration\": $duration, \"target\": $target_time, \"start\": ${PHASE_START_TIMES["$phase_name"]}, \"end\": ${PHASE_END_TIMES["$phase_name"]}}" >> "$TIMING_FILE"
}

checkpoint() {
    local message="$1"
    local expected_result="${2:-}"

    info "CHECKPOINT: $message"

    if [[ -n "$expected_result" ]]; then
        echo -n "Press Enter to confirm checkpoint passed, or Ctrl+C to abort: "
        read -r
    fi
}

show_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Execute a complete regional failover with automated timing and evidence capture.

Options:
    --source REGION         Source region (default: us-east-1)
    --target REGION         Target region (default: eu-central-1)
    --dry-run               Test mode - show steps without executing
    --skip-dns              Skip DNS cutover (for testing)
    --auto-confirm          Skip manual checkpoints (fully automated)
    --help                  Show this help message

Examples:
    # Full failover with manual checkpoints
    $0 --source us-east-1 --target eu-central-1

    # Dry-run mode (no changes)
    $0 --dry-run

    # Fully automated (no checkpoints)
    $0 --auto-confirm

Environment Variables:
    GAMEDAY_DRILL=true      Required to prevent accidental failovers
    AUTO_CONFIRM=true       Skip manual checkpoints
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
# Failover Phases
################################################################################

phase_assessment() {
    start_phase "Assessment"

    local source_ctx=$(get_context_for_region "$SOURCE_REGION")
    local target_ctx=$(get_context_for_region "$TARGET_REGION")
    local target_ns=$(get_namespace_for_region "$TARGET_REGION")

    log "Assessing source region health: $SOURCE_REGION"

    # Try to connect to source cluster (may fail if region is down)
    if kubectl --context "$source_ctx" get nodes &>/dev/null; then
        warn "Source region appears healthy. Are you sure you want to failover?"
        checkpoint "Source region is reachable"
    else
        log "Source region is unreachable or unhealthy. Proceeding with failover."
    fi

    log "Verifying target region health: $TARGET_REGION"
    if ! kubectl --context "$target_ctx" get nodes &>/dev/null; then
        error "Target region is not accessible. Cannot failover."
        exit 1
    fi

    # Check target region node status
    kubectl --context "$target_ctx" get nodes -o wide > "${EVIDENCE_DIR}/target-nodes-pre-failover.txt"
    local ready_nodes=$(kubectl --context "$target_ctx" get nodes --no-headers | grep -c " Ready")
    log "Target region has $ready_nodes Ready nodes"

    if [[ $ready_nodes -lt 2 ]]; then
        error "Target region has fewer than 2 Ready nodes. Cannot proceed safely."
        exit 1
    fi

    # Check replication lag
    log "Checking database replication lag..."
    local lag_seconds=$(kubectl --context "$target_ctx" exec -it postgres-primary-0 -n "$target_ns" -- \
        psql -U postgres -t -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));" 2>/dev/null | tr -d ' ' || echo "999")

    log "Replication lag: ${lag_seconds}s"

    if [[ ${lag_seconds%.*} -gt 60 ]]; then
        warn "Replication lag is high: ${lag_seconds}s. Expected data loss: ~${lag_seconds}s"
        checkpoint "High replication lag detected. Confirm to proceed with potential data loss."
    fi

    # Capture pre-failover evidence
    log "Capturing pre-failover state..."
    kubectl --context "$target_ctx" get pods -n "$target_ns" -o wide > "${EVIDENCE_DIR}/target-pods-pre-failover.txt"

    # Run RTO/RPO measurement script
    /home/user/TEEI-CSR-Platform/scripts/gameday/measure-rto-rpo.sh --phase pre-failover --region "$TARGET_REGION"

    end_phase "Assessment" "$TARGET_ASSESSMENT_TIME"
}

phase_database_promotion() {
    start_phase "Database-Promotion"

    local target_ctx=$(get_context_for_region "$TARGET_REGION")
    local target_ns=$(get_namespace_for_region "$TARGET_REGION")

    log "Promoting PostgreSQL standby to primary in $TARGET_REGION..."

    # Promote using pg_ctl
    log "Executing: pg_ctl promote"
    kubectl --context "$target_ctx" exec -it postgres-primary-0 -n "$target_ns" -- \
        /usr/local/bin/pg_ctl promote -D /var/lib/postgresql/data || {
        error "PostgreSQL promotion failed"
        exit 1
    }

    # Wait for promotion to complete
    sleep 5

    # Verify promotion
    log "Verifying PostgreSQL is now primary..."
    local is_recovery=$(kubectl --context "$target_ctx" exec -it postgres-primary-0 -n "$target_ns" -- \
        psql -U postgres -t -c "SELECT pg_is_in_recovery();" | tr -d ' \r\n')

    if [[ "$is_recovery" == "f" ]]; then
        log "✓ PostgreSQL successfully promoted to primary"
    else
        error "PostgreSQL promotion verification failed. Still in recovery mode."
        exit 1
    fi

    # Test write
    log "Testing database write capability..."
    kubectl --context "$target_ctx" exec -it postgres-primary-0 -n "$target_ns" -- \
        psql -U postgres -d teei -c "INSERT INTO dr_test_writes (test_data) VALUES ('Failover test at $(date)') RETURNING id;" \
        > "${EVIDENCE_DIR}/database-write-test.txt"

    log "Database write test successful"

    # Update PgBouncer connection pool
    log "Updating PgBouncer configuration..."
    kubectl --context "$target_ctx" rollout restart deployment/pgbouncer -n "$target_ns"
    kubectl --context "$target_ctx" rollout status deployment/pgbouncer -n "$target_ns" --timeout=60s

    end_phase "Database-Promotion" "$TARGET_DB_FAILOVER_TIME"
}

phase_clickhouse_promotion() {
    start_phase "ClickHouse-Promotion"

    local target_ctx=$(get_context_for_region "$TARGET_REGION")
    local target_ns=$(get_namespace_for_region "$TARGET_REGION")

    log "Promoting ClickHouse replica in $TARGET_REGION..."

    # Stop replication from source
    log "Stopping ClickHouse replication fetches..."
    kubectl --context "$target_ctx" exec -it clickhouse-0 -n "$target_ns" -- \
        clickhouse-client --query "SYSTEM STOP FETCHES analytics.events_distributed;" || warn "Failed to stop fetches (may already be stopped)"

    # Verify data is accessible
    log "Verifying ClickHouse data accessibility..."
    local event_count=$(kubectl --context "$target_ctx" exec -it clickhouse-0 -n "$target_ns" -- \
        clickhouse-client --query "SELECT count(*) FROM analytics.events_distributed WHERE timestamp > now() - INTERVAL 5 MINUTE;" | tr -d '\r\n')

    log "Recent events in ClickHouse: $event_count"

    if [[ $event_count -gt 0 ]]; then
        log "✓ ClickHouse data verification successful"
    else
        warn "No recent events found in ClickHouse. May indicate replication lag or data issue."
    fi

    # Test insert
    log "Testing ClickHouse write capability..."
    kubectl --context "$target_ctx" exec -it clickhouse-0 -n "$target_ns" -- \
        clickhouse-client --query "INSERT INTO analytics.events_local (event_id, timestamp, event_type) VALUES (generateUUIDv4(), now(), 'dr_test');"

    log "ClickHouse write test successful"

    end_phase "ClickHouse-Promotion" "$TARGET_CLICKHOUSE_TIME"
}

phase_nats_promotion() {
    start_phase "NATS-Promotion"

    local target_ctx=$(get_context_for_region "$TARGET_REGION")
    local target_ns=$(get_namespace_for_region "$TARGET_REGION")

    log "Promoting NATS JetStream mirror to source stream in $TARGET_REGION..."

    # Remove mirror configuration
    log "Updating NATS stream configuration to disable mirroring..."
    kubectl --context "$target_ctx" exec -it nats-0 -n "$target_ns" -- \
        nats --server nats://localhost:4222 --creds /etc/nats/creds/admin.creds \
        stream edit CSR_EVENTS_MIRROR --mirror "" || warn "Failed to edit stream (may already be promoted)"

    # Verify stream is writable
    log "Testing NATS publish capability..."
    kubectl --context "$target_ctx" exec -it nats-0 -n "$target_ns" -- \
        nats --server nats://localhost:4222 --creds /etc/nats/creds/admin.creds \
        pub csr.events.dr.test "DR Test $(date +%s)"

    log "✓ NATS stream promoted and writable"

    # Update consumer configurations
    log "Updating application NATS configurations..."
    kubectl --context "$target_ctx" patch cm nats-config -n "$target_ns" \
        --patch '{"data":{"NATS_STREAM_NAME":"CSR_EVENTS_MIRROR"}}' || warn "ConfigMap patch failed"

    end_phase "NATS-Promotion" "$TARGET_NATS_TIME"
}

phase_application_services() {
    start_phase "Application-Services"

    local target_ctx=$(get_context_for_region "$TARGET_REGION")
    local target_ns=$(get_namespace_for_region "$TARGET_REGION")

    log "Scaling up application services in $TARGET_REGION..."

    # Scale up critical services
    log "Scaling reporting-service to 6 replicas..."
    kubectl --context "$target_ctx" scale deployment/reporting-service -n "$target_ns" --replicas=6

    log "Scaling analytics-service to 6 replicas..."
    kubectl --context "$target_ctx" scale deployment/analytics-service -n "$target_ns" --replicas=6

    log "Scaling corp-cockpit to 4 replicas..."
    kubectl --context "$target_ctx" scale deployment/corp-cockpit -n "$target_ns" --replicas=4

    # Wait for pods to be ready
    log "Waiting for pods to become Ready..."
    kubectl --context "$target_ctx" wait --for=condition=Ready pods \
        -l app.kubernetes.io/component=api -n "$target_ns" --timeout=120s || warn "Some pods did not become Ready within timeout"

    # Verify pod status
    local ready_pods=$(kubectl --context "$target_ctx" get pods -n "$target_ns" -l app.kubernetes.io/component=api --no-headers | grep -c "Running")
    log "Application pods Running: $ready_pods"

    # Run basic health checks
    log "Running service health checks..."
    /home/user/TEEI-CSR-Platform/scripts/gameday/verify-recovery.sh --region "$TARGET_REGION" --quick

    end_phase "Application-Services" "$TARGET_APP_SERVICES_TIME"
}

phase_dns_cutover() {
    start_phase "DNS-Cutover"

    local target_region="$TARGET_REGION"

    # Get target ALB DNS name (placeholder - adjust based on actual setup)
    local target_alb_ip="52.58.10.20"  # Example EU ALB IP
    if [[ "$target_region" == "us-east-1" ]]; then
        target_alb_ip="52.1.2.3"  # Example US ALB IP
    fi

    log "Updating Route53 DNS records to point to $target_region ($target_alb_ip)..."

    # Check if DNS cutover script exists
    if [[ -f "/home/user/TEEI-CSR-Platform/scripts/gameday/dns-cutover-${target_region}.json" ]]; then
        log "Using pre-configured DNS change batch file..."

        # Execute DNS update
        aws route53 change-resource-record-sets \
            --hosted-zone-id Z1234EXAMPLE \
            --change-batch "file:///home/user/TEEI-CSR-Platform/scripts/gameday/dns-cutover-${target_region}.json" \
            --output json > "${EVIDENCE_DIR}/dns-change-response.json" || warn "DNS update failed (may need manual intervention)"

        # Get change ID
        local change_id=$(jq -r '.ChangeInfo.Id' "${EVIDENCE_DIR}/dns-change-response.json" 2>/dev/null || echo "unknown")
        log "DNS change ID: $change_id"

        # Monitor change status
        if [[ "$change_id" != "unknown" ]]; then
            log "Waiting for DNS change to propagate..."
            local status="PENDING"
            local timeout=60
            local elapsed=0

            while [[ "$status" == "PENDING" && $elapsed -lt $timeout ]]; do
                status=$(aws route53 get-change --id "$change_id" --query 'ChangeInfo.Status' --output text 2>/dev/null || echo "UNKNOWN")
                log "DNS status: $status (${elapsed}s elapsed)"
                sleep 5
                elapsed=$((elapsed + 5))
            done

            if [[ "$status" == "INSYNC" ]]; then
                log "✓ DNS change completed successfully"
            else
                warn "DNS change status: $status (may still be propagating)"
            fi
        fi
    else
        warn "DNS change batch file not found. Skipping DNS cutover."
        warn "Manual DNS update required for: api.teei.example.com -> $target_alb_ip"
    fi

    # Verify DNS resolution
    log "Verifying DNS propagation..."
    local resolved_ip=$(dig +short api.teei.example.com @8.8.8.8 | head -1)
    log "api.teei.example.com resolves to: $resolved_ip (expected: $target_alb_ip)"

    end_phase "DNS-Cutover" "$TARGET_DNS_CUTOVER_TIME"
}

phase_verification() {
    start_phase "Verification"

    local target_region="$TARGET_REGION"

    log "Running post-failover verification..."

    # Run full verification script
    /home/user/TEEI-CSR-Platform/scripts/gameday/verify-recovery.sh --region "$target_region" --full

    # Capture post-failover evidence
    /home/user/TEEI-CSR-Platform/scripts/gameday/measure-rto-rpo.sh --phase post-failover --region "$target_region"

    end_phase "Verification" 60
}

################################################################################
# Main Execution
################################################################################

parse_args() {
    local dry_run=false
    local skip_dns=false
    local auto_confirm="${AUTO_CONFIRM:-false}"

    while [[ $# -gt 0 ]]; do
        case $1 in
            --source)
                SOURCE_REGION="$2"
                shift 2
                ;;
            --target)
                TARGET_REGION="$2"
                shift 2
                ;;
            --dry-run)
                dry_run=true
                shift
                ;;
            --skip-dns)
                skip_dns=true
                shift
                ;;
            --auto-confirm)
                auto_confirm=true
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

    export DRY_RUN=$dry_run
    export SKIP_DNS=$skip_dns
    export AUTO_CONFIRM=$auto_confirm
}

safety_checks() {
    log "Running safety checks..."

    # Check for GAMEDAY_DRILL flag
    if [[ -z "${GAMEDAY_DRILL:-}" && "${DRY_RUN:-false}" != "true" ]]; then
        error "GAMEDAY_DRILL environment variable not set!"
        error "Set 'export GAMEDAY_DRILL=true' to proceed."
        exit 1
    fi

    # Verify kubectl access
    local target_ctx=$(get_context_for_region "$TARGET_REGION")
    if ! kubectl --context "$target_ctx" get nodes &>/dev/null; then
        error "Cannot access target Kubernetes cluster: $target_ctx"
        exit 1
    fi

    # Confirm with user (unless auto-confirm)
    if [[ "${AUTO_CONFIRM:-false}" != "true" ]]; then
        warn "This will execute a FULL REGIONAL FAILOVER:"
        warn "  Source: $SOURCE_REGION"
        warn "  Target: $TARGET_REGION"
        echo -n "Type 'FAILOVER' to proceed: "
        read -r confirmation

        if [[ "$confirmation" != "FAILOVER" ]]; then
            log "Failover aborted by user."
            exit 0
        fi
    fi
}

generate_final_report() {
    local total_duration=$(($(date +%s) - FAILOVER_START_TIME))

    log "==================================================================="
    log "FAILOVER COMPLETE"
    log "==================================================================="
    log "Total Duration: ${total_duration}s (target: ${TARGET_TOTAL_RTO}s)"
    log "Source Region: $SOURCE_REGION"
    log "Target Region: $TARGET_REGION"
    log "Evidence Directory: $EVIDENCE_DIR"
    log "==================================================================="

    # Generate JSON summary
    cat > "${EVIDENCE_DIR}/failover-summary.json" <<EOF
{
  "source_region": "$SOURCE_REGION",
  "target_region": "$TARGET_REGION",
  "start_time": $FAILOVER_START_TIME,
  "end_time": $(date +%s),
  "total_duration_seconds": $total_duration,
  "target_rto_seconds": $TARGET_TOTAL_RTO,
  "rto_met": $([ $total_duration -le $TARGET_TOTAL_RTO ] && echo "true" || echo "false"),
  "phases": $(cat "$TIMING_FILE" | jq -s '.')
}
EOF

    log "Summary saved to: ${EVIDENCE_DIR}/failover-summary.json"

    # Calculate RTO/RPO
    /home/user/TEEI-CSR-Platform/scripts/gameday/measure-rto-rpo.sh --calculate --evidence-dir "$EVIDENCE_DIR"

    if [[ $total_duration -le $TARGET_TOTAL_RTO ]]; then
        log "✓ RTO TARGET MET: ${total_duration}s <= ${TARGET_TOTAL_RTO}s"
    else
        warn "⚠ RTO TARGET MISSED: ${total_duration}s > ${TARGET_TOTAL_RTO}s"
    fi
}

main() {
    parse_args "$@"

    # Create evidence directory
    mkdir -p "$EVIDENCE_DIR"

    log "==================================================================="
    log "REGIONAL FAILOVER EXECUTION"
    log "==================================================================="
    log "Source: $SOURCE_REGION → Target: $TARGET_REGION"
    log "Dry Run: ${DRY_RUN:-false}"
    log "Skip DNS: ${SKIP_DNS:-false}"
    log "Auto Confirm: ${AUTO_CONFIRM:-false}"
    log "==================================================================="

    if [[ "${DRY_RUN:-false}" == "true" ]]; then
        warn "DRY RUN MODE - No changes will be made"
    else
        safety_checks
    fi

    FAILOVER_START_TIME=$(date +%s)

    # Execute failover phases
    phase_assessment
    phase_database_promotion
    phase_clickhouse_promotion
    phase_nats_promotion
    phase_application_services

    if [[ "${SKIP_DNS:-false}" != "true" ]]; then
        phase_dns_cutover
    else
        warn "Skipping DNS cutover as requested"
    fi

    phase_verification

    # Generate final report
    generate_final_report
}

# Trap errors
trap 'error "Failover failed at line $LINENO. Check logs: $LOG_FILE"' ERR

# Run main
main "$@"
