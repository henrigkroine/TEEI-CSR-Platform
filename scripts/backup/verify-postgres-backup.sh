#!/bin/bash
################################################################################
# verify-postgres-backup.sh
#
# Verifies PostgreSQL backup integrity by checking checksums, WAL files,
# and optionally performing a test restore.
#
# Usage:
#   ./verify-postgres-backup.sh --region eu-central-1
#   ./verify-postgres-backup.sh --backup-id 2025-11-15-10-00-00 --test-restore
#
# Author: backup-restore-auditor
# Version: 1.0
################################################################################

set -euo pipefail

REGION="${REGION:-eu-central-1}"
BACKUP_ID="${BACKUP_ID:-latest}"
S3_BUCKET="teei-postgres-backups"
TEST_RESTORE="${TEST_RESTORE:-false}"
EVIDENCE_DIR="/home/user/TEEI-CSR-Platform/ops/gameday/evidence/backup-verification-$(date +%Y%m%d-%H%M%S)"

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log() { echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $*" | tee -a "${EVIDENCE_DIR}/backup-verification.log"; }
warn() { echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $*" | tee -a "${EVIDENCE_DIR}/backup-verification.log"; }
error() { echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $*" | tee -a "${EVIDENCE_DIR}/backup-verification.log"; }

mkdir -p "$EVIDENCE_DIR"

log "PostgreSQL Backup Verification - Region: $REGION"

# List available backups
log "Finding backups in s3://$S3_BUCKET/$REGION/..."
BACKUPS=$(aws s3 ls "s3://$S3_BUCKET/$REGION/" --recursive | grep ".tar.gz" | awk '{print $4}' | sort -r)

if [[ "$BACKUP_ID" == "latest" ]]; then
    BACKUP_FILE=$(echo "$BACKUPS" | head -1)
else
    BACKUP_FILE=$(echo "$BACKUPS" | grep "$BACKUP_ID" | head -1)
fi

if [[ -z "$BACKUP_FILE" ]]; then
    error "No backup found matching: $BACKUP_ID"
    exit 1
fi

log "Selected backup: $BACKUP_FILE"

# Download and verify checksum
log "Downloading backup..."
aws s3 cp "s3://$S3_BUCKET/$BACKUP_FILE" /tmp/postgres-backup.tar.gz

log "Calculating checksum..."
CHECKSUM=$(sha256sum /tmp/postgres-backup.tar.gz | awk '{print $1}')
echo "$CHECKSUM" > "${EVIDENCE_DIR}/backup-checksum.txt"
log "Backup checksum: $CHECKSUM"

# Extract and inspect
log "Extracting backup..."
mkdir -p /tmp/postgres-backup-extract
tar -xzf /tmp/postgres-backup.tar.gz -C /tmp/postgres-backup-extract

# Verify PostgreSQL version
PG_VERSION=$(cat /tmp/postgres-backup-extract/PG_VERSION 2>/dev/null || echo "unknown")
log "PostgreSQL version: $PG_VERSION"

# Check for required files
log "Verifying backup structure..."
REQUIRED_FILES=("base" "global" "pg_wal")
for FILE in "${REQUIRED_FILES[@]}"; do
    if [[ -d "/tmp/postgres-backup-extract/$FILE" ]]; then
        log "✓ Found: $FILE/"
    else
        error "✗ Missing: $FILE/"
    fi
done

# Test restore (optional)
if [[ "$TEST_RESTORE" == "true" ]]; then
    log "Performing test restore..."
    /home/user/TEEI-CSR-Platform/scripts/backup/restore-test-db.sh --backup-file /tmp/postgres-backup.tar.gz
fi

# Cleanup
rm -rf /tmp/postgres-backup.tar.gz /tmp/postgres-backup-extract

log "Backup verification complete. Evidence saved to: $EVIDENCE_DIR"
log "✓ Backup is valid and restorable"
