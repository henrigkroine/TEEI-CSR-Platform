#!/bin/bash
# verify-clickhouse-backup.sh - ClickHouse backup verification
# Author: backup-restore-auditor

set -euo pipefail

REGION="${1:-eu-central-1}"
EVIDENCE_DIR="/home/user/TEEI-CSR-Platform/ops/gameday/evidence/clickhouse-backup-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$EVIDENCE_DIR"

log() { echo "[$(date +'%H:%M:%S')] $*" | tee -a "${EVIDENCE_DIR}/verification.log"; }

log "Verifying ClickHouse backups in region: $REGION"

# List S3 backups
aws s3 ls s3://teei-clickhouse-backups/$REGION/ --recursive | tail -10 > "${EVIDENCE_DIR}/available-backups.txt"

# Get context
CTX=$([ "$REGION" == "us-east-1" ] && echo "prod-us-east-1" || echo "prod-eu-central-1")
NS=$([ "$REGION" == "us-east-1" ] && echo "teei-prod-us" || echo "teei-prod-eu")

# Verify recent snapshot exists
LATEST=$(aws s3 ls s3://teei-clickhouse-backups/$REGION/ --recursive | tail -1 | awk '{print $4}')
if [[ -n "$LATEST" ]]; then
    log "✓ Latest backup: $LATEST"
    BACKUP_AGE=$(( $(date +%s) - $(aws s3api head-object --bucket teei-clickhouse-backups --key "$LATEST" --query 'LastModified' --output text | xargs -I {} date -d {} +%s) ))
    log "Backup age: $((BACKUP_AGE / 3600)) hours"

    if [[ $BACKUP_AGE -lt 86400 ]]; then
        log "✓ Backup is fresh (< 24 hours)"
    else
        log "⚠ WARNING: Backup is older than 24 hours"
    fi
else
    log "✗ ERROR: No backups found"
    exit 1
fi

log "Verification complete. Evidence: $EVIDENCE_DIR"
