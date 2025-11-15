# Automated Monthly Backup Verification

## Overview

This document describes the automated monthly backup verification job that runs on the first day of each month to ensure all backups are valid and restorable.

## Schedule

**Frequency**: Monthly (1st of each month at 02:00 UTC)
**Duration**: ~30 minutes
**Owner**: backup-restore-auditor

## What Gets Verified

1. **PostgreSQL Backups**:
   - Checksum integrity
   - Backup structure (base, global, pg_wal)
   - WAL file completeness
   - Optional: Test restore to temporary instance

2. **ClickHouse Backups**:
   - Recent snapshot exists (< 24 hours old)
   - S3 object metadata
   - Backup age alerting

3. **S3 Bucket Configuration**:
   - Versioning enabled
   - Encryption at rest (AES256 or KMS)
   - Lifecycle policies configured
   - Recent backup count

## Kubernetes CronJob Configuration

**File**: `/home/user/TEEI-CSR-Platform/k8s/cronjobs/backup-verification.yaml`

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: monthly-backup-verification
  namespace: teei-prod-ops
spec:
  schedule: "0 2 1 * *"  # 02:00 UTC on 1st of month
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          serviceAccountName: backup-verifier
          containers:
          - name: backup-verification
            image: teei/backup-tools:latest
            command:
            - /bin/bash
            - -c
            - |
              set -e
              echo "Starting monthly backup verification..."

              # Postgres verification
              /scripts/backup/verify-postgres-backup.sh --region us-east-1
              /scripts/backup/verify-postgres-backup.sh --region eu-central-1

              # ClickHouse verification
              /scripts/backup/verify-clickhouse-backup.sh us-east-1
              /scripts/backup/verify-clickhouse-backup.sh eu-central-1

              # S3 verification
              /scripts/backup/verify-s3-backup.sh

              # Upload evidence to S3
              aws s3 cp /tmp/backup-verification-* s3://teei-compliance-evidence/backup-verifications/ --recursive

              # Send Slack notification
              curl -X POST $SLACK_WEBHOOK_URL -d '{"text":"✅ Monthly backup verification complete"}'
            env:
            - name: SLACK_WEBHOOK_URL
              valueFrom:
                secretKeyRef:
                  name: slack-webhooks
                  key: backup-verification-url
            volumeMounts:
            - name: scripts
              mountPath: /scripts
          volumes:
          - name: scripts
            configMap:
              name: backup-scripts
              defaultMode: 0755
```

## Manual Execution

To run verification manually:

```bash
# Verify all backups
./scripts/backup/verify-postgres-backup.sh --region us-east-1
./scripts/backup/verify-postgres-backup.sh --region eu-central-1
./scripts/backup/verify-clickhouse-backup.sh us-east-1
./scripts/backup/verify-clickhouse-backup.sh eu-central-1
./scripts/backup/verify-s3-backup.sh

# With test restore (takes longer)
./scripts/backup/verify-postgres-backup.sh --region us-east-1 --test-restore
```

## Alerting

**Success**: Slack notification to #backup-ops
**Failure**: PagerDuty alert to on-call SRE + Slack notification

**Alert Conditions**:
- Backup age > 48 hours
- Checksum mismatch
- Missing required files
- S3 encryption disabled
- Test restore failed

## Evidence Storage

All verification results are stored in:
- Local: `/home/user/TEEI-CSR-Platform/ops/gameday/evidence/backup-verification-*/`
- S3: `s3://teei-compliance-evidence/backup-verifications/YYYY-MM/`

**Retention**: 13 months (for SOC2 compliance)

## SOC2 Compliance

**Control**: BC-1.2 (Backup and Restore)
**Frequency**: Monthly
**Evidence Required**:
- Verification logs with timestamps
- Checksum calculations
- Test restore results (quarterly minimum)
- S3 configuration screenshots

## Troubleshooting

### Issue: Backup not found
**Cause**: Backup job may have failed
**Action**: Check backup job logs, re-run backup manually

### Issue: Checksum mismatch
**Cause**: Corruption during upload or download
**Action**: Download again, if persists, restore from earlier backup

### Issue: Test restore fails
**Cause**: PostgreSQL version mismatch or corrupted WAL files
**Action**: Check PostgreSQL logs, verify WAL archive completeness

## Contact

**Owner**: backup-restore-auditor
**Escalation**: SRE Team (#sre-ops)
**Runbook**: `/home/user/TEEI-CSR-Platform/docs/DB_Backup_Restore.md`
