#!/bin/bash

# ClickHouse Backup Strategy Script
# TEEI CSR Platform - Multi-Region Backup & Restore
# Uses clickhouse-backup tool with S3 backend storage

set -euo pipefail

# ============================================================================
# CONFIGURATION
# ============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
LOG_DIR="/var/log/clickhouse-backup"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
LOG_FILE="${LOG_DIR}/backup_${TIMESTAMP}.log"

# S3 Configuration (override with environment variables)
S3_BUCKET_US="${S3_BACKUP_BUCKET_US:-teei-clickhouse-backup-us-east-1}"
S3_BUCKET_EU="${S3_BACKUP_BUCKET_EU:-teei-clickhouse-backup-eu-central-1}"
S3_ENDPOINT="${S3_ENDPOINT:-s3.amazonaws.com}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# ClickHouse Configuration
CLICKHOUSE_HOST="${CLICKHOUSE_HOST:-localhost}"
CLICKHOUSE_PORT="${CLICKHOUSE_PORT:-9000}"
CLICKHOUSE_USER="${CLICKHOUSE_USER:-default}"
CLICKHOUSE_PASSWORD="${CLICKHOUSE_PASSWORD}"  # Must be set in environment

# Backup naming
BACKUP_PREFIX="teei-platform"

# ============================================================================
# LOGGING FUNCTIONS
# ============================================================================

mkdir -p "${LOG_DIR}"

log() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $*" | tee -a "${LOG_FILE}"
}

log_error() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $*" | tee -a "${LOG_FILE}" >&2
}

log_success() {
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] SUCCESS: $*" | tee -a "${LOG_FILE}"
}

# ============================================================================
# PREREQUISITE CHECKS
# ============================================================================

check_prerequisites() {
    log "Checking prerequisites..."

    # Check clickhouse-backup binary
    if ! command -v clickhouse-backup &> /dev/null; then
        log_error "clickhouse-backup not found. Install from: https://github.com/Altinity/clickhouse-backup"
        exit 1
    fi

    # Check ClickHouse connection
    if ! clickhouse-client --host="${CLICKHOUSE_HOST}" --port="${CLICKHOUSE_PORT}" \
         --user="${CLICKHOUSE_USER}" --password="${CLICKHOUSE_PASSWORD}" \
         --query="SELECT 1" &> /dev/null; then
        log_error "Cannot connect to ClickHouse at ${CLICKHOUSE_HOST}:${CLICKHOUSE_PORT}"
        exit 1
    fi

    # Check S3 credentials (AWS CLI or env vars)
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY"
        exit 1
    fi

    log_success "All prerequisites met"
}

# ============================================================================
# BACKUP FUNCTIONS
# ============================================================================

create_backup() {
    local backup_name="${BACKUP_PREFIX}_${TIMESTAMP}"
    log "Creating backup: ${backup_name}"

    # Create local backup
    if clickhouse-backup create "${backup_name}" \
        --config=/etc/clickhouse-backup/config.yml; then
        log_success "Local backup created: ${backup_name}"
    else
        log_error "Failed to create local backup"
        return 1
    fi

    # Upload to S3
    upload_backup_to_s3 "${backup_name}"
}

upload_backup_to_s3() {
    local backup_name="$1"
    local region=$(get_current_region)
    local s3_bucket

    # Determine S3 bucket based on region
    if [[ "${region}" == eu-* ]]; then
        s3_bucket="${S3_BUCKET_EU}"
    else
        s3_bucket="${S3_BUCKET_US}"
    fi

    log "Uploading backup to S3: s3://${s3_bucket}/${backup_name}"

    if clickhouse-backup upload "${backup_name}" \
        --config=/etc/clickhouse-backup/config.yml; then
        log_success "Backup uploaded to S3: ${backup_name}"
    else
        log_error "Failed to upload backup to S3"
        return 1
    fi

    # Verify backup integrity
    verify_backup "${backup_name}" "${s3_bucket}"
}

verify_backup() {
    local backup_name="$1"
    local s3_bucket="$2"

    log "Verifying backup integrity: ${backup_name}"

    # List backup in S3
    if aws s3 ls "s3://${s3_bucket}/${backup_name}/" --recursive | grep -q "metadata.json"; then
        log_success "Backup verified: metadata.json exists"
    else
        log_error "Backup verification failed: metadata.json not found"
        return 1
    fi
}

# ============================================================================
# RESTORE FUNCTIONS
# ============================================================================

restore_backup() {
    local backup_name="$1"
    local region=$(get_current_region)
    local s3_bucket

    if [[ -z "${backup_name}" ]]; then
        log_error "Usage: restore_backup <backup_name>"
        return 1
    fi

    # Determine S3 bucket
    if [[ "${region}" == eu-* ]]; then
        s3_bucket="${S3_BUCKET_EU}"
    else
        s3_bucket="${S3_BUCKET_US}"
    fi

    log "Restoring backup from S3: ${backup_name}"

    # Download from S3
    if ! clickhouse-backup download "${backup_name}" \
        --config=/etc/clickhouse-backup/config.yml; then
        log_error "Failed to download backup from S3"
        return 1
    fi

    # Restore tables
    if clickhouse-backup restore --rm "${backup_name}" \
        --config=/etc/clickhouse-backup/config.yml; then
        log_success "Backup restored successfully: ${backup_name}"
    else
        log_error "Failed to restore backup"
        return 1
    fi

    # Verify restore
    verify_restore "${backup_name}"
}

verify_restore() {
    local backup_name="$1"
    log "Verifying restore: ${backup_name}"

    # Check if tables exist
    local tables=$(clickhouse-client --host="${CLICKHOUSE_HOST}" --port="${CLICKHOUSE_PORT}" \
        --user="${CLICKHOUSE_USER}" --password="${CLICKHOUSE_PASSWORD}" \
        --query="SHOW TABLES FROM default" | wc -l)

    if [[ ${tables} -gt 0 ]]; then
        log_success "Restore verified: ${tables} tables found"
    else
        log_error "Restore verification failed: no tables found"
        return 1
    fi
}

# ============================================================================
# CLEANUP FUNCTIONS
# ============================================================================

cleanup_old_backups() {
    log "Cleaning up backups older than ${BACKUP_RETENTION_DAYS} days..."

    local cutoff_date=$(date -d "${BACKUP_RETENTION_DAYS} days ago" +%Y%m%d)

    # List local backups
    local local_backups=$(clickhouse-backup list local \
        --config=/etc/clickhouse-backup/config.yml | grep "${BACKUP_PREFIX}" || true)

    for backup in ${local_backups}; do
        # Extract date from backup name (format: teei-platform_20250115_120000)
        if [[ ${backup} =~ ${BACKUP_PREFIX}_([0-9]{8})_ ]]; then
            local backup_date="${BASH_REMATCH[1]}"
            if [[ ${backup_date} -lt ${cutoff_date} ]]; then
                log "Deleting old local backup: ${backup}"
                clickhouse-backup delete local "${backup}" \
                    --config=/etc/clickhouse-backup/config.yml || log_error "Failed to delete ${backup}"
            fi
        fi
    done

    # Cleanup S3 backups
    cleanup_s3_backups
}

cleanup_s3_backups() {
    local region=$(get_current_region)
    local s3_bucket

    if [[ "${region}" == eu-* ]]; then
        s3_bucket="${S3_BUCKET_EU}"
    else
        s3_bucket="${S3_BUCKET_US}"
    fi

    log "Cleaning up S3 backups in: s3://${s3_bucket}"

    # Use S3 lifecycle policy (preferred) or manual deletion
    local cutoff_timestamp=$(date -d "${BACKUP_RETENTION_DAYS} days ago" +%s)

    aws s3 ls "s3://${s3_bucket}/" | grep "${BACKUP_PREFIX}" | while read -r line; do
        local backup_name=$(echo "${line}" | awk '{print $2}' | sed 's/\///')
        if [[ ${backup_name} =~ ${BACKUP_PREFIX}_([0-9]{8})_([0-9]{6}) ]]; then
            local backup_timestamp=$(date -d "${BASH_REMATCH[1]} ${BASH_REMATCH[2]}" +%s 2>/dev/null || echo 0)
            if [[ ${backup_timestamp} -lt ${cutoff_timestamp} ]]; then
                log "Deleting old S3 backup: ${backup_name}"
                clickhouse-backup delete remote "${backup_name}" \
                    --config=/etc/clickhouse-backup/config.yml || log_error "Failed to delete ${backup_name} from S3"
            fi
        fi
    done
}

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

get_current_region() {
    # Detect region from hostname or environment variable
    local hostname=$(hostname)

    if [[ "${hostname}" == *"eu"* ]]; then
        echo "eu-central-1"
    else
        echo "us-east-1"
    fi
}

list_backups() {
    log "Listing available backups..."

    echo "=== LOCAL BACKUPS ==="
    clickhouse-backup list local --config=/etc/clickhouse-backup/config.yml || log_error "Failed to list local backups"

    echo ""
    echo "=== REMOTE BACKUPS (S3) ==="
    clickhouse-backup list remote --config=/etc/clickhouse-backup/config.yml || log_error "Failed to list remote backups"
}

shard_consistency_check() {
    log "Checking shard consistency..."

    local shards=$(clickhouse-client --host="${CLICKHOUSE_HOST}" --port="${CLICKHOUSE_PORT}" \
        --user="${CLICKHOUSE_USER}" --password="${CLICKHOUSE_PASSWORD}" \
        --query="SELECT DISTINCT hostName() FROM system.parts WHERE active" | wc -l)

    log "Active shards: ${shards}"

    # Check replication lag
    clickhouse-client --host="${CLICKHOUSE_HOST}" --port="${CLICKHOUSE_PORT}" \
        --user="${CLICKHOUSE_USER}" --password="${CLICKHOUSE_PASSWORD}" \
        --query="SELECT database, table, is_leader, absolute_delay, queue_size FROM system.replicas WHERE database = 'default'" \
        | tee -a "${LOG_FILE}"

    log_success "Shard consistency check complete"
}

# ============================================================================
# MAIN SCRIPT
# ============================================================================

usage() {
    cat <<EOF
Usage: $0 <command> [options]

Commands:
    backup              Create a new backup and upload to S3
    restore <name>      Restore a specific backup
    list                List all available backups (local and S3)
    cleanup             Remove backups older than retention period
    verify <name>       Verify backup integrity
    consistency         Check shard consistency before/after restore

Environment Variables:
    CLICKHOUSE_HOST              ClickHouse server host (default: localhost)
    CLICKHOUSE_PORT              ClickHouse server port (default: 9000)
    CLICKHOUSE_USER              ClickHouse user (default: default)
    CLICKHOUSE_PASSWORD          ClickHouse password (required)
    S3_BACKUP_BUCKET_US          S3 bucket for US backups
    S3_BACKUP_BUCKET_EU          S3 bucket for EU backups
    BACKUP_RETENTION_DAYS        Backup retention in days (default: 30)

Examples:
    # Create backup
    $0 backup

    # Restore from specific backup
    $0 restore teei-platform_20250115_120000

    # List all backups
    $0 list

    # Clean up old backups
    $0 cleanup

EOF
}

main() {
    local command="${1:-}"

    if [[ -z "${command}" ]]; then
        usage
        exit 1
    fi

    # Check prerequisites
    check_prerequisites

    case "${command}" in
        backup)
            create_backup
            cleanup_old_backups
            ;;
        restore)
            local backup_name="${2:-}"
            restore_backup "${backup_name}"
            ;;
        list)
            list_backups
            ;;
        cleanup)
            cleanup_old_backups
            ;;
        verify)
            local backup_name="${2:-}"
            if [[ -z "${backup_name}" ]]; then
                log_error "Usage: $0 verify <backup_name>"
                exit 1
            fi
            local region=$(get_current_region)
            local s3_bucket
            if [[ "${region}" == eu-* ]]; then
                s3_bucket="${S3_BUCKET_EU}"
            else
                s3_bucket="${S3_BUCKET_US}"
            fi
            verify_backup "${backup_name}" "${s3_bucket}"
            ;;
        consistency)
            shard_consistency_check
            ;;
        *)
            log_error "Unknown command: ${command}"
            usage
            exit 1
            ;;
    esac
}

main "$@"
