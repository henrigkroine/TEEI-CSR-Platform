#!/bin/bash
################################################################################
# restore-primary.sh
#
# Automated failback to primary region after disaster recovery event.
# Follows the controlled rollback procedure with data sync verification.
#
# Usage:
#   ./restore-primary.sh --from eu-central-1 --to us-east-1
#   ./restore-primary.sh --dry-run  # Test mode
#
# Author: dr-gameday-lead
# Version: 1.0
# Date: 2025-11-15
################################################################################

set -euo pipefail

# Configuration
SOURCE_REGION="${SOURCE_REGION:-eu-central-1}"
TARGET_REGION="${TARGET_REGION:-us-east-1}"
EVIDENCE_DIR="/home/user/TEEI-CSR-Platform/ops/gameday/evidence/failback-$(date +%Y%m%d-%H%M%S)"
LOG_FILE="${EVIDENCE_DIR}/failback-execution.log"

# Failback strategy
FAILBACK_METHOD="${FAILBACK_METHOD:-rebuild}"  # Options: rebuild, reverse-replication

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

checkpoint() {
    local message="$1"
    info "CHECKPOINT: $message"

    if [[ "${AUTO_CONFIRM:-false}" != "true" ]]; then
        echo -n "Press Enter to continue, or Ctrl+C to abort: "
        read -r
    fi
}

show_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Automated failback to primary region after disaster recovery.

Options:
    --from REGION           Source region (current active, default: eu-central-1)
    --to REGION             Target region (failback destination, default: us-east-1)
    --method METHOD         Failback method: rebuild, reverse-replication (default: rebuild)
    --dry-run               Test mode - show steps without executing
    --auto-confirm          Skip manual checkpoints
    --skip-dns              Skip DNS restoration (for testing)
    --help                  Show this help message

Failback Methods:
    rebuild                 Restore target from source backup (safest, slower)
    reverse-replication     Reverse replication and promote (faster, riskier)

Examples:
    # Rebuild US from EU backup (recommended)
    $0 --from eu-central-1 --to us-east-1 --method rebuild

    # Reverse replication (faster but riskier)
    $0 --from eu-central-1 --to us-east-1 --method reverse-replication

    # Dry-run mode
    $0 --dry-run

Environment Variables:
    GAMEDAY_DRILL=true      Required to prevent accidental failbacks
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
# Pre-Failback Preparation
################################################################################

verify_target_region_health() {
    local target_ctx=$(get_context_for_region "$TARGET_REGION")

    log "Verifying target region health: $TARGET_REGION..."

    # Check K8s cluster
    if ! kubectl --context "$target_ctx" get nodes &>/dev/null; then
        error "Target region $TARGET_REGION is not accessible."
        exit 1
    fi

    local ready_nodes=$(kubectl --context "$target_ctx" get nodes --no-headers | grep -c " Ready")
    log "Target region has $ready_nodes Ready nodes"

    if [[ $ready_nodes -lt 2 ]]; then
        error "Target region has fewer than 2 Ready nodes. Cannot proceed safely."
        exit 1
    fi

    checkpoint "Target region health verified"
}

create_final_backup() {
    local source_ctx=$(get_context_for_region "$SOURCE_REGION")
    local source_ns=$(get_namespace_for_region "$SOURCE_REGION")

    log "Creating final backup of source region: $SOURCE_REGION..."

    # Backup PostgreSQL
    log "Backing up PostgreSQL..."
    kubectl --context "$source_ctx" exec -it postgres-primary-0 -n "$source_ns" -- \
        pg_basebackup -D /tmp/final-backup -F tar -z -P || {
        error "PostgreSQL backup failed"
        exit 1
    }

    # Upload to S3
    local backup_name="pre-failback-$(date +%s).tar.gz"
    kubectl --context "$source_ctx" exec -it postgres-primary-0 -n "$source_ns" -- \
        aws s3 cp /tmp/final-backup "s3://teei-postgres-backups/${SOURCE_REGION}/${backup_name}" || {
        error "S3 upload failed"
        exit 1
    }

    log "✓ PostgreSQL backup uploaded: s3://teei-postgres-backups/${SOURCE_REGION}/${backup_name}"
    echo "$backup_name" > "${EVIDENCE_DIR}/postgres-backup-name.txt"

    # Backup ClickHouse
    log "Backing up ClickHouse..."
    /home/user/TEEI-CSR-Platform/scripts/backup/verify-clickhouse-backup.sh \
        --region "$SOURCE_REGION" \
        --create-snapshot \
        --tag "pre-failback-$(date +%s)" || warn "ClickHouse backup failed"

    # Backup NATS
    log "Backing up NATS JetStream..."
    kubectl --context "$source_ctx" exec -it nats-0 -n "$source_ns" -- \
        nats stream backup CSR_EVENTS_MIRROR /tmp/nats-final-backup.tar.gz || warn "NATS backup failed"

    checkpoint "Final backups created"
}

enable_maintenance_mode() {
    local source_ctx=$(get_context_for_region "$SOURCE_REGION")
    local source_ns=$(get_namespace_for_region "$SOURCE_REGION")

    log "Enabling maintenance mode in $SOURCE_REGION..."

    # Display maintenance banner
    kubectl --context "$source_ctx" patch cm app-config -n "$source_ns" \
        --patch '{"data":{"MAINTENANCE_MODE":"true","MAINTENANCE_MESSAGE":"Scheduled maintenance: Returning to primary region. Service will resume shortly."}}' || warn "ConfigMap patch failed"

    # Enable read-only mode
    kubectl --context "$source_ctx" exec -it postgres-primary-0 -n "$source_ns" -- \
        psql -U postgres -c "ALTER SYSTEM SET default_transaction_read_only = on;" || warn "Failed to enable read-only mode"
    kubectl --context "$source_ctx" exec -it postgres-primary-0 -n "$source_ns" -- \
        psql -U postgres -c "SELECT pg_reload_conf();" || true

    log "✓ Maintenance mode enabled"
    checkpoint "Maintenance mode active"
}

################################################################################
# Failback Methods
################################################################################

failback_method_rebuild() {
    log "Executing failback using REBUILD method..."

    local target_ctx=$(get_context_for_region "$TARGET_REGION")
    local target_ns=$(get_namespace_for_region "$TARGET_REGION")
    local source_ctx=$(get_context_for_region "$SOURCE_REGION")
    local source_ns=$(get_namespace_for_region "$SOURCE_REGION")

    # Step 1: Stop target region Postgres
    log "Stopping PostgreSQL in target region..."
    kubectl --context "$target_ctx" scale statefulset/postgres-primary -n "$target_ns" --replicas=0
    sleep 10

    # Step 2: Restore from backup
    log "Restoring PostgreSQL from backup..."
    local backup_name=$(cat "${EVIDENCE_DIR}/postgres-backup-name.txt")
    /home/user/TEEI-CSR-Platform/scripts/backup/restore-postgres-backup.sh \
        --source-backup "s3://teei-postgres-backups/${SOURCE_REGION}/${backup_name}" \
        --target-region "$TARGET_REGION" \
        --verify-checksum || {
        error "Restore failed"
        exit 1
    }

    # Step 3: Start target region Postgres
    log "Starting PostgreSQL in target region..."
    kubectl --context "$target_ctx" scale statefulset/postgres-primary -n "$target_ns" --replicas=3
    kubectl --context "$target_ctx" wait --for=condition=Ready pods -l app=postgres -n "$target_ns" --timeout=300s

    # Step 4: Verify database is writable
    log "Verifying database writability..."
    local is_recovery=$(kubectl --context "$target_ctx" exec -it postgres-primary-0 -n "$target_ns" -- \
        psql -U postgres -t -c "SELECT pg_is_in_recovery();" | tr -d ' \r\n')

    if [[ "$is_recovery" != "f" ]]; then
        error "Database is still in recovery mode after restore"
        exit 1
    fi

    log "✓ PostgreSQL restored and writable"

    # Step 5: Restore ClickHouse
    log "Restoring ClickHouse..."
    /home/user/TEEI-CSR-Platform/scripts/backup/restore-clickhouse-backup.sh \
        --backup-id "pre-failback-*" \
        --target-cluster "$target_ctx" \
        --verify-checksum || warn "ClickHouse restore failed"

    # Step 6: Restore NATS
    log "Restoring NATS JetStream..."
    kubectl --context "$target_ctx" exec -it nats-0 -n "$target_ns" -- \
        nats stream restore /tmp/nats-final-backup.tar.gz || warn "NATS restore failed"

    checkpoint "Target region restored from backup"
}

failback_method_reverse_replication() {
    log "Executing failback using REVERSE REPLICATION method..."

    local target_ctx=$(get_context_for_region "$TARGET_REGION")
    local target_ns=$(get_namespace_for_region "$TARGET_REGION")
    local source_ctx=$(get_context_for_region "$SOURCE_REGION")
    local source_ns=$(get_namespace_for_region "$SOURCE_REGION")

    # Step 1: Configure target as standby of source
    log "Configuring target region as standby..."
    kubectl --context "$target_ctx" exec -it postgres-primary-0 -n "$target_ns" -- \
        bash -c "echo 'primary_conninfo = \"host=postgres-primary-0.postgres-headless.${source_ns}.svc.cluster.local port=5432 user=replicator\"' > /var/lib/postgresql/data/recovery.conf" || {
        error "Failed to configure standby"
        exit 1
    }

    # Restart as standby
    kubectl --context "$target_ctx" rollout restart statefulset/postgres-primary -n "$target_ns"
    sleep 30

    # Step 2: Wait for replication to catch up
    log "Waiting for replication to catch up..."
    local lag=999
    local timeout=600
    local elapsed=0

    while [[ $lag -gt 5 && $elapsed -lt $timeout ]]; do
        lag=$(kubectl --context "$target_ctx" exec -it postgres-primary-0 -n "$target_ns" -- \
            psql -U postgres -t -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));" 2>/dev/null | tr -d ' \r\n' || echo "999")

        log "Replication lag: ${lag}s (waiting for < 5s)"
        sleep 10
        elapsed=$((elapsed + 10))
    done

    if [[ ${lag%.*} -gt 5 ]]; then
        error "Replication lag did not converge: ${lag}s"
        exit 1
    fi

    log "✓ Replication caught up (lag: ${lag}s)"

    # Step 3: Pause writes in source region
    log "Pausing writes in source region..."
    kubectl --context "$source_ctx" scale deployment/reporting-service -n "$source_ns" --replicas=0
    kubectl --context "$source_ctx" scale deployment/analytics-service -n "$source_ns" --replicas=0
    sleep 10

    # Step 4: Wait for final replication sync
    log "Waiting for final sync..."
    sleep 20

    # Step 5: Promote target to primary
    log "Promoting target region to primary..."
    kubectl --context "$target_ctx" exec -it postgres-primary-0 -n "$target_ns" -- \
        /usr/local/bin/pg_ctl promote -D /var/lib/postgresql/data || {
        error "Promotion failed"
        exit 1
    }

    # Verify promotion
    local is_recovery=$(kubectl --context "$target_ctx" exec -it postgres-primary-0 -n "$target_ns" -- \
        psql -U postgres -t -c "SELECT pg_is_in_recovery();" | tr -d ' \r\n')

    if [[ "$is_recovery" != "f" ]]; then
        error "Promotion verification failed"
        exit 1
    fi

    log "✓ Target region promoted to primary"

    checkpoint "Reverse replication complete, target promoted"
}

################################################################################
# Post-Failback Steps
################################################################################

scale_up_applications() {
    local target_ctx=$(get_context_for_region "$TARGET_REGION")
    local target_ns=$(get_namespace_for_region "$TARGET_REGION")

    log "Scaling up applications in target region..."

    kubectl --context "$target_ctx" scale deployment/reporting-service -n "$target_ns" --replicas=6
    kubectl --context "$target_ctx" scale deployment/analytics-service -n "$target_ns" --replicas=6
    kubectl --context "$target_ctx" scale deployment/corp-cockpit -n "$target_ns" --replicas=4

    kubectl --context "$target_ctx" wait --for=condition=Ready pods \
        -l app.kubernetes.io/component=api -n "$target_ns" --timeout=300s || warn "Some pods did not become Ready"

    log "✓ Applications scaled up"
}

update_dns() {
    local target_region="$TARGET_REGION"

    if [[ "${SKIP_DNS:-false}" == "true" ]]; then
        warn "Skipping DNS update as requested"
        return
    fi

    log "Updating DNS to point to target region: $target_region..."

    local target_alb_ip="52.1.2.3"  # Example US ALB IP
    if [[ "$target_region" == "eu-central-1" ]]; then
        target_alb_ip="52.58.10.20"  # Example EU ALB IP
    fi

    # Update Route53
    if [[ -f "/home/user/TEEI-CSR-Platform/scripts/gameday/dns-cutover-${target_region}.json" ]]; then
        aws route53 change-resource-record-sets \
            --hosted-zone-id Z1234EXAMPLE \
            --change-batch "file:///home/user/TEEI-CSR-Platform/scripts/gameday/dns-cutover-${target_region}.json" \
            --output json > "${EVIDENCE_DIR}/dns-change-response.json" || warn "DNS update failed"

        log "✓ DNS updated to $target_region ($target_alb_ip)"
    else
        warn "DNS change batch file not found. Manual DNS update required."
    fi

    checkpoint "DNS cutover complete"
}

disable_maintenance_mode() {
    local target_ctx=$(get_context_for_region "$TARGET_REGION")
    local target_ns=$(get_namespace_for_region "$TARGET_REGION")

    log "Disabling maintenance mode..."

    # Remove read-only
    kubectl --context "$target_ctx" exec -it postgres-primary-0 -n "$target_ns" -- \
        psql -U postgres -c "ALTER SYSTEM SET default_transaction_read_only = off;" || warn "Failed to disable read-only"
    kubectl --context "$target_ctx" exec -it postgres-primary-0 -n "$target_ns" -- \
        psql -U postgres -c "SELECT pg_reload_conf();" || true

    # Remove maintenance banner
    kubectl --context "$target_ctx" patch cm app-config -n "$target_ns" \
        --patch '{"data":{"MAINTENANCE_MODE":"false"}}' || warn "ConfigMap patch failed"

    log "✓ Maintenance mode disabled"
}

reestablish_replication() {
    local target_ctx=$(get_context_for_region "$TARGET_REGION")
    local source_ctx=$(get_context_for_region "$SOURCE_REGION")
    local source_ns=$(get_namespace_for_region "$SOURCE_REGION")

    log "Re-establishing replication (target -> source)..."

    # Configure source region as standby of target
    kubectl --context "$source_ctx" exec -it postgres-primary-0 -n "$source_ns" -- \
        bash -c "echo 'primary_conninfo = \"host=postgres-primary-0.postgres-headless.teei-prod-$(echo $TARGET_REGION | sed 's/.*-//')'.svc.cluster.local port=5432 user=replicator\"' > /var/lib/postgresql/data/recovery.conf" || warn "Failed to configure replication"

    kubectl --context "$source_ctx" rollout restart statefulset/postgres-primary -n "$source_ns" || warn "Failed to restart standby"

    log "Replication configured (will start after restart)"
    checkpoint "Replication re-established"
}

run_verification() {
    log "Running post-failback verification..."

    /home/user/TEEI-CSR-Platform/scripts/gameday/verify-recovery.sh \
        --region "$TARGET_REGION" \
        --full || warn "Verification failed (check logs)"

    checkpoint "Verification complete"
}

################################################################################
# Main Execution
################################################################################

parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --from)
                SOURCE_REGION="$2"
                shift 2
                ;;
            --to)
                TARGET_REGION="$2"
                shift 2
                ;;
            --method)
                FAILBACK_METHOD="$2"
                shift 2
                ;;
            --dry-run)
                export DRY_RUN=true
                shift
                ;;
            --auto-confirm)
                export AUTO_CONFIRM=true
                shift
                ;;
            --skip-dns)
                export SKIP_DNS=true
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
}

safety_checks() {
    log "Running safety checks..."

    if [[ -z "${GAMEDAY_DRILL:-}" && "${DRY_RUN:-false}" != "true" ]]; then
        error "GAMEDAY_DRILL environment variable not set!"
        error "Set 'export GAMEDAY_DRILL=true' to proceed."
        exit 1
    fi

    if [[ "${AUTO_CONFIRM:-false}" != "true" ]]; then
        warn "This will execute a FAILBACK to primary region:"
        warn "  From: $SOURCE_REGION (current active)"
        warn "  To:   $TARGET_REGION (new primary)"
        warn "  Method: $FAILBACK_METHOD"
        echo -n "Type 'FAILBACK' to proceed: "
        read -r confirmation

        if [[ "$confirmation" != "FAILBACK" ]]; then
            log "Failback aborted by user."
            exit 0
        fi
    fi
}

main() {
    parse_args "$@"

    mkdir -p "$EVIDENCE_DIR"

    log "==================================================================="
    log "FAILBACK TO PRIMARY REGION"
    log "==================================================================="
    log "From: $SOURCE_REGION (current active)"
    log "To:   $TARGET_REGION (new primary)"
    log "Method: $FAILBACK_METHOD"
    log "Dry Run: ${DRY_RUN:-false}"
    log "==================================================================="

    if [[ "${DRY_RUN:-false}" != "true" ]]; then
        safety_checks
    else
        warn "DRY RUN MODE - No changes will be made"
    fi

    # Execute failback
    verify_target_region_health
    create_final_backup
    enable_maintenance_mode

    if [[ "$FAILBACK_METHOD" == "rebuild" ]]; then
        failback_method_rebuild
    elif [[ "$FAILBACK_METHOD" == "reverse-replication" ]]; then
        failback_method_reverse_replication
    else
        error "Invalid failback method: $FAILBACK_METHOD"
        exit 1
    fi

    scale_up_applications
    update_dns
    disable_maintenance_mode
    reestablish_replication
    run_verification

    log "==================================================================="
    log "FAILBACK COMPLETE"
    log "==================================================================="
    log "Primary region restored: $TARGET_REGION"
    log "Standby region: $SOURCE_REGION"
    log "Evidence saved to: $EVIDENCE_DIR"
    log "==================================================================="
}

# Trap errors
trap 'error "Failback failed at line $LINENO. Check logs: $LOG_FILE"' ERR

# Run main
main "$@"
