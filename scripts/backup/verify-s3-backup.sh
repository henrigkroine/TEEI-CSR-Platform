#!/bin/bash
# verify-s3-backup.sh - S3 bucket versioning and encryption verification
# Author: backup-restore-auditor

set -euo pipefail

BUCKETS=("teei-postgres-backups" "teei-clickhouse-backups" "teei-nats-backups")
EVIDENCE_DIR="/home/user/TEEI-CSR-Platform/ops/gameday/evidence/s3-verification-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$EVIDENCE_DIR"

log() { echo "[$(date +'%H:%M:%S')] $*" | tee -a "${EVIDENCE_DIR}/s3-verification.log"; }

for BUCKET in "${BUCKETS[@]}"; do
    log "Checking bucket: $BUCKET"

    # Verify versioning
    VERSIONING=$(aws s3api get-bucket-versioning --bucket "$BUCKET" --query 'Status' --output text 2>/dev/null || echo "not-configured")
    if [[ "$VERSIONING" == "Enabled" ]]; then
        log "  ✓ Versioning: Enabled"
    else
        log "  ✗ Versioning: $VERSIONING (SHOULD BE ENABLED)"
    fi

    # Verify encryption
    ENCRYPTION=$(aws s3api get-bucket-encryption --bucket "$BUCKET" --query 'ServerSideEncryptionConfiguration.Rules[0].ApplyServerSideEncryptionByDefault.SSEAlgorithm' --output text 2>/dev/null || echo "none")
    if [[ "$ENCRYPTION" == "AES256" || "$ENCRYPTION" == "aws:kms" ]]; then
        log "  ✓ Encryption: $ENCRYPTION"
    else
        log "  ✗ Encryption: $ENCRYPTION (SHOULD BE ENABLED)"
    fi

    # Check lifecycle policies
    LIFECYCLE=$(aws s3api get-bucket-lifecycle-configuration --bucket "$BUCKET" 2>/dev/null | jq -r '.Rules[0].Status' || echo "none")
    log "  Lifecycle policy: $LIFECYCLE"

    # List recent backups
    RECENT=$(aws s3 ls s3://$BUCKET/ --recursive | tail -5)
    log "  Recent backups (last 5):"
    echo "$RECENT" | while read -r line; do log "    $line"; done
done

log "S3 backup verification complete. Evidence: $EVIDENCE_DIR"
