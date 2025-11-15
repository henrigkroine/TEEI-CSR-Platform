# GDPR & Data Subject Rights Runbook

**Service**: API Gateway / Privacy Module
**Owner**: Worker 4 / Compliance Team
**Last Updated**: 2025-11-14
**Status**: Production Ready
**Compliance**: GDPR Articles 15-22, CCPA, UK DPA 2018

## Overview

The GDPR/DSAR (Data Subject Access Request) system orchestrates user privacy rights across all TEEI services. It handles data export, deletion (right to erasure), rectification, and portability with audit trails and SLA tracking.

### Service Architecture

- **Framework**: Fastify (API Gateway)
- **Database**: PostgreSQL (dsar_requests, consent_records)
- **Orchestration**: Service fan-out to all microservices
- **Storage**: S3 (encrypted exports)
- **Compliance**: 30-day deletion grace period, audit logging

### Supported Rights

1. **Right to Access** (GDPR Art. 15) - Data export
2. **Right to Erasure** (GDPR Art. 17) - Data deletion
3. **Right to Rectification** (GDPR Art. 16) - Data correction
4. **Right to Portability** (GDPR Art. 20) - Machine-readable export

---

## Service Endpoints

### DSAR APIs
- `POST /v1/privacy/export` - Request data export
- `POST /v1/privacy/delete` - Request data deletion
- `GET /v1/privacy/requests/:id` - Check request status
- `POST /v1/privacy/requests/:id/cancel` - Cancel deletion (within 30 days)
- `GET /v1/privacy/export/:id/download` - Download export (signed URL)

### Consent Management
- `POST /v1/privacy/consent` - Record consent
- `GET /v1/privacy/consent/:userId` - Get consent history
- `POST /v1/privacy/consent/:id/withdraw` - Withdraw consent

### Admin APIs (Internal)
- `GET /admin/privacy/requests` - List all DSAR requests
- `POST /admin/privacy/requests/:id/approve` - Approve deletion
- `POST /admin/privacy/requests/:id/extend` - Extend deadline

---

## Environment Configuration

### Required Environment Variables

```bash
# Database
DATABASE_URL=postgresql://user:pass@host:5432/teei

# Storage (for exports)
AWS_REGION=us-east-1
AWS_S3_EXPORTS_BUCKET=teei-privacy-exports
AWS_KMS_KEY_ID=arn:aws:kms:us-east-1:xxx:key/xxx

# Service Discovery (for fan-out)
SERVICE_REGISTRY_URL=http://consul:8500
SERVICES=analytics,notifications,impact-in,reporting,unified-profile

# Compliance
DSAR_EXPORT_TTL_DAYS=30
DSAR_DELETION_GRACE_PERIOD_DAYS=30
DSAR_SLA_DAYS=30

# Encryption
EXPORT_ENCRYPTION_ENABLED=true
EXPORT_ENCRYPTION_KEY_ID=alias/teei-privacy

# Notifications
NOTIFY_ON_EXPORT_COMPLETE=true
NOTIFY_ON_DELETION_SCHEDULED=true
```

---

## Operations

### Processing a Data Export Request

**User Flow:**
1. User requests export via UI or API
2. System creates `dsar_requests` record with status=`pending`
3. Orchestrator fans out to all services
4. Each service exports user data to JSON
5. Data is aggregated, encrypted, and uploaded to S3
6. User receives notification with signed download URL (30-day TTL)

**Commands:**
```bash
# Manually trigger export
curl -X POST http://localhost:3000/v1/privacy/export \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"userId": "user-uuid"}'

# Check export status
curl http://localhost:3000/v1/privacy/requests/$REQUEST_ID

# Download export (opens signed URL)
curl http://localhost:3000/v1/privacy/export/$REQUEST_ID/download
```

**Service Fan-Out** (orchestrator calls):
```
POST /v1/analytics/privacy/export?userId=xxx
POST /v1/notifications/privacy/export?userId=xxx
POST /v1/impact-in/privacy/export?userId=xxx
POST /v1/reporting/privacy/export?userId=xxx
POST /v1/unified-profile/privacy/export?userId=xxx
```

---

### Processing a Data Deletion Request

**User Flow:**
1. User requests deletion
2. System creates `dsar_requests` record with `status=pending`
3. 30-day grace period begins (`cancellation_deadline` set)
4. User can cancel anytime within 30 days
5. After 30 days, deletion executed automatically
6. Orchestrator fans out delete commands to all services
7. Each service hard-deletes user data (irreversible)
8. Request marked as `completed`

**Commands:**
```bash
# Request deletion
curl -X POST http://localhost:3000/v1/privacy/delete \
  -H "Authorization: Bearer $USER_TOKEN" \
  -d '{"userId": "user-uuid"}'

# Cancel deletion (within 30 days)
curl -X POST http://localhost:3000/v1/privacy/requests/$REQUEST_ID/cancel

# Check deletion status
curl http://localhost:3000/v1/privacy/requests/$REQUEST_ID

# Manual deletion execution (admin only)
psql -d teei -c \
  "UPDATE dsar_requests SET deletion_scheduled_at = NOW() WHERE id='$REQUEST_ID';"
```

**Service Fan-Out** (orchestrator calls):
```
DELETE /v1/analytics/privacy/user/:userId
DELETE /v1/notifications/privacy/user/:userId
DELETE /v1/impact-in/privacy/user/:userId
DELETE /v1/reporting/privacy/user/:userId
DELETE /v1/unified-profile/privacy/user/:userId
```

---

## Monitoring & Alerts

### Key Metrics

- **DSAR Request Rate**: Requests per day
- **Export Success Rate**: Exports completed successfully
- **Deletion Success Rate**: Deletions completed successfully
- **SLA Compliance**: % of requests completed within 30 days
- **Service Fan-Out Failures**: Services that failed to respond
- **Export Download Rate**: % of exports downloaded before expiry

### Recommended Alerts

```yaml
groups:
  - name: gdpr-dsar
    rules:
      - alert: DSARSLABreach
        expr: dsar_requests_pending_days > 25
        labels:
          severity: critical
        annotations:
          summary: "DSAR request approaching SLA deadline"

      - alert: ExportGenerationFailure
        expr: rate(dsar_export_failed_total[1h]) > 0.1
        for: 30m
        labels:
          severity: high

      - alert: ServiceFanOutFailure
        expr: dsar_service_fanout_failed_total > 5
        for: 10m
        labels:
          severity: critical
        annotations:
          summary: "Multiple services failing to respond to DSAR fan-out"

      - alert: UnscheduledDeletionsPending
        expr: count(dsar_requests{status="pending",request_type="delete"} and on() dsar_cancellation_deadline < time())
        for: 1h
        labels:
          severity: high
        annotations:
          summary: "Deletions past grace period not yet scheduled"
```

---

## Troubleshooting

### Issue: Export Fails with "Service Timeout"

**Symptoms**: Export request stuck in `in_progress`, logs show timeout errors

**Diagnosis**:
```bash
# Check which service timed out
psql -d teei -c \
  "SELECT metadata FROM dsar_requests WHERE id='$REQUEST_ID';"

# Check service health
curl http://analytics:3008/health
curl http://notifications:3009/health

# Check service logs
kubectl logs -l app=analytics --tail=100 | grep "privacy/export"
```

**Resolution**:
1. If service is down, restart it
2. If service is slow, increase timeout:
   ```typescript
   // In privacy/export.ts
   const EXPORT_TIMEOUT_MS = 30000; // Increase to 60000
   ```
3. Retry export:
   ```bash
   curl -X POST http://localhost:3000/v1/privacy/requests/$REQUEST_ID/retry
   ```

---

### Issue: Deletion Not Executing After 30 Days

**Symptoms**: Deletion request status still `pending` after grace period

**Diagnosis**:
```bash
# Find overdue deletions
psql -d teei -c \
  "SELECT id, user_id, cancellation_deadline, deletion_scheduled_at
   FROM dsar_requests
   WHERE request_type='delete'
     AND status='pending'
     AND cancellation_deadline < NOW()
     AND deletion_scheduled_at IS NULL;"
```

**Resolution**:
1. Check scheduler cron job:
   ```bash
   pm2 list | grep dsar-scheduler
   pm2 logs dsar-scheduler
   ```
2. Manually trigger scheduler:
   ```bash
   curl -X POST http://localhost:3000/admin/privacy/scheduler/run
   ```
3. If scheduler is failing, check database locks:
   ```sql
   SELECT * FROM pg_locks WHERE NOT granted;
   ```

---

### Issue: Export Download URL Expired

**Symptoms**: User clicks download link, gets 403 Forbidden

**Diagnosis**:
```bash
# Check export expiration
psql -d teei -c \
  "SELECT id, export_expires_at FROM dsar_requests WHERE id='$REQUEST_ID';"

# Check if file still exists in S3
aws s3 ls s3://teei-privacy-exports/$REQUEST_ID/
```

**Resolution**:
1. If within 30 days, regenerate signed URL:
   ```bash
   curl -X POST http://localhost:3000/v1/privacy/export/$REQUEST_ID/renew
   ```
2. If past 30 days, export has been deleted per policy
   - User must request new export
3. Update export TTL if needed:
   ```bash
   export DSAR_EXPORT_TTL_DAYS=60  # Extend to 60 days
   pm2 restart api-gateway
   ```

---

### Issue: Service Fan-Out Partial Failures

**Symptoms**: Export completes but some services missing data

**Diagnosis**:
```bash
# Check export completeness
psql -d teei -c \
  "SELECT services_total, services_completed, services_failed, metadata
   FROM dsar_requests
   WHERE id='$REQUEST_ID';"

# Check which service failed
# (metadata contains {"analytics": "success", "notifications": "failed"})
```

**Resolution**:
1. Identify failed service from metadata
2. Check service-specific logs:
   ```bash
   kubectl logs -l app=notifications --since=1h | grep "privacy/export"
   ```
3. Retry failed service manually:
   ```bash
   curl -X POST http://notifications:3009/v1/privacy/export?userId=$USER_ID
   ```
4. Update export with missing data:
   ```bash
   # Re-aggregate and upload
   curl -X POST http://localhost:3000/admin/privacy/requests/$REQUEST_ID/rebuild
   ```

---

## Compliance & Audit

### Audit Trail

All DSAR operations are logged to `audit_logs` table:

```sql
-- View DSAR audit trail for a user
SELECT
  action,
  resource_type,
  created_at,
  metadata
FROM audit_logs
WHERE resource_id = '$REQUEST_ID'
  OR metadata @> jsonb_build_object('userId', '$USER_ID')
ORDER BY created_at DESC;
```

### Required Audit Events

- `DSAR_EXPORT_REQUESTED` - User requests export
- `DSAR_EXPORT_COMPLETED` - Export file generated
- `DSAR_EXPORT_DOWNLOADED` - User downloads export
- `DSAR_DELETE_REQUESTED` - User requests deletion
- `DSAR_DELETE_CANCELLED` - User cancels deletion
- `DSAR_DELETE_SCHEDULED` - Deletion scheduled after grace period
- `DSAR_DELETE_EXECUTED` - Data actually deleted
- `CONSENT_GRANTED` - User grants consent
- `CONSENT_WITHDRAWN` - User withdraws consent

### SLA Compliance Reporting

```sql
-- Calculate SLA compliance rate (last 90 days)
SELECT
  COUNT(*) FILTER (WHERE completed_at - requested_at <= INTERVAL '30 days') * 100.0 / COUNT(*) as sla_compliance_rate
FROM dsar_requests
WHERE requested_at > NOW() - INTERVAL '90 days';

-- Identify SLA breaches
SELECT
  id,
  user_id,
  request_type,
  requested_at,
  completed_at,
  AGE(completed_at, requested_at) as duration
FROM dsar_requests
WHERE completed_at - requested_at > INTERVAL '30 days'
  AND requested_at > NOW() - INTERVAL '90 days'
ORDER BY duration DESC;
```

---

## Incident Response

### P0: DSAR Data Leak

**Scenario**: Unencrypted export exposed, unauthorized access to user data

**Actions**:
1. **IMMEDIATE**: Revoke all S3 signed URLs:
   ```bash
   aws s3 rm s3://teei-privacy-exports/ --recursive --exclude="*" --include="user-data-export-*"
   ```
2. Notify affected users within 72 hours (GDPR requirement)
3. Report to DPA (Data Protection Authority) if required
4. Investigate root cause (misconfigured bucket policy, leaked credentials)
5. Implement corrective measures (enable default encryption, bucket policies)

### P1: SLA Breach Imminent

**Scenario**: DSAR request nearing 30-day deadline

**Actions**:
1. Identify cause of delay (service outage, large dataset)
2. Manually prioritize request:
   ```bash
   curl -X POST http://localhost:3000/admin/privacy/requests/$REQUEST_ID/prioritize
   ```
3. If cannot complete in time, notify user and request extension
4. Document reason for delay in request metadata

---

## Maintenance

### Cleanup Expired Exports

```bash
# Delete exports older than 30 days from S3
aws s3 ls s3://teei-privacy-exports/ \
  | awk '$1 < "'$(date -d '30 days ago' +%Y-%m-%d)'" {print $4}' \
  | xargs -I {} aws s3 rm s3://teei-privacy-exports/{}

# Clean up database records
psql -d teei -c \
  "DELETE FROM dsar_requests WHERE completed_at < NOW() - INTERVAL '1 year';"
```

### Rotate Encryption Keys

```bash
# Create new KMS key
aws kms create-key --description "TEEI Privacy Exports 2026"

# Update environment variable
export EXPORT_ENCRYPTION_KEY_ID=arn:aws:kms:us-east-1:xxx:key/new-key-id

# Re-encrypt existing exports (optional)
aws s3 sync s3://teei-privacy-exports/ s3://teei-privacy-exports/ \
  --sse aws:kms \
  --sse-kms-key-id $EXPORT_ENCRYPTION_KEY_ID
```

---

## Disaster Recovery

### Restore Deleted User (Emergency)

**WARNING**: Only perform if deletion was erroneous (e.g., bug, wrong user ID)

```bash
# Check if backups exist (within 7-day retention window)
aws rds describe-db-snapshots \
  --db-instance-identifier teei-prod \
  --snapshot-type automated \
  --query 'DBSnapshots[0].DBSnapshotIdentifier'

# Restore from backup to temporary instance
aws rds restore-db-instance-from-db-snapshot \
  --db-instance-identifier teei-restore-temp \
  --db-snapshot-identifier <snapshot-id>

# Extract user data from backup
pg_dump -h teei-restore-temp.xxx.rds.amazonaws.com \
  -d teei \
  -t users \
  -t profiles \
  --where="user_id='$USER_ID'" \
  > user_restore.sql

# Import to production (use extreme caution)
psql -h teei-prod.xxx.rds.amazonaws.com -d teei < user_restore.sql
```

---

## Contacts

- **Primary On-Call**: compliance-team@teei.com
- **DPO (Data Protection Officer)**: dpo@teei.com
- **Legal**: legal@teei.com
- **Slack Channel**: #alerts-gdpr
- **PagerDuty**: https://teei.pagerduty.com/services/gdpr-dsar

---

## References

- **GDPR Compliance Guide**: `/docs/GDPR_Compliance.md`
- **Database Schema**: `/packages/shared-schema/migrations/0013_add_rbac_and_privacy_tables.sql`
- **API Spec**: `/packages/openapi/api-gateway.yaml#/privacy`
- **Legal Requirements**: https://gdpr.eu
- **Change Log**: `/CHANGELOG.md`
