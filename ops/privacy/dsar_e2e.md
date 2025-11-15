# DSAR End-to-End Runbook

**Purpose**: Execute GDPR Data Subject Access Requests (DSAR) in production
**Compliance**: GDPR Article 15 (Right of Access), Article 17 (Right to Erasure)
**RTO**: Export within 72 hours, Delete within 30 days
**Scope**: All tenant data across services

---

## Table of Contents

1. [Overview](#overview)
2. [Data Export (Article 15)](#data-export)
3. [Data Deletion (Article 17)](#data-deletion)
4. [Audit Trail](#audit-trail)
5. [Testing](#testing)
6. [Compliance Checklist](#compliance-checklist)

---

## Overview

### Services Involved

| Service | Data Types | Export API | Delete API |
|---------|------------|------------|------------|
| Unified Profile | User profile, journey flags | `/privacy/export` | `/privacy/delete` |
| Kintell Connector | Session data, ratings | `/privacy/export` | `/privacy/delete` |
| Buddy Service | Matches, events, feedback | `/privacy/export` | `/privacy/delete` |
| Upskilling Connector | Course completions, credentials | `/privacy/export` | `/privacy/delete` |
| Q2Q AI | Outcome scores, evidence snippets | `/privacy/export` | `/privacy/delete` |
| Reporting | Analytics snapshots, reports | `/privacy/export` | `/privacy/delete` |
| Impact Calculator | SROI/VIS scores | `/privacy/export` | `/privacy/delete` |

### Data Retention Policies

- **Active user data**: Retained indefinitely
- **Inactive user data**: Retained for 7 years (compliance)
- **Deleted data**: 30-day soft delete, then purged
- **Audit logs**: Retained for 10 years (immutable)

---

## Data Export

### Manual Export Process

#### Step 1: Verify Request

```bash
# Verify user identity (must match verified email or support ticket)
USER_EMAIL="user@example.com"
USER_ID=$(psql $DATABASE_URL -t -c \
  "SELECT id FROM users WHERE email = '$USER_EMAIL';")

echo "User ID: $USER_ID"

# Check if user exists
if [ -z "$USER_ID" ]; then
  echo "Error: User not found"
  exit 1
fi
```

#### Step 2: Create DSAR Request

```bash
# Create export request in database
REQUEST_ID=$(psql $DATABASE_URL -t -c "
  INSERT INTO dsar_requests (user_id, request_type, status, requested_at)
  VALUES ('$USER_ID', 'export', 'pending', NOW())
  RETURNING id;
" | xargs)

echo "DSAR Request ID: $REQUEST_ID"
```

#### Step 3: Orchestrate Export

```bash
# Trigger export via Privacy Orchestrator API
curl -X POST http://privacy-orchestrator.teei-prod/v1/dsar/export \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "request_id": "$REQUEST_ID",
  "user_id": "$USER_ID",
  "email": "$USER_EMAIL",
  "include_deleted": false
}
EOF
```

#### Step 4: Monitor Progress

```bash
# Poll export status
watch -n 10 "curl -s http://privacy-orchestrator.teei-prod/v1/dsar/$REQUEST_ID/status \
  -H 'Authorization: Bearer $ADMIN_TOKEN' | jq ."
```

#### Step 5: Download Export

```bash
# Wait for status: completed
# Download encrypted export package
curl -o "/tmp/dsar_export_${REQUEST_ID}.zip" \
  "http://privacy-orchestrator.teei-prod/v1/dsar/$REQUEST_ID/download" \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Verify checksum
EXPECTED_HASH=$(curl -s http://privacy-orchestrator.teei-prod/v1/dsar/$REQUEST_ID/checksum \
  -H "Authorization: Bearer $ADMIN_TOKEN" | jq -r .sha256)

ACTUAL_HASH=$(sha256sum "/tmp/dsar_export_${REQUEST_ID}.zip" | awk '{print $1}')

if [ "$EXPECTED_HASH" != "$ACTUAL_HASH" ]; then
  echo "Error: Checksum mismatch!"
  exit 1
fi

echo "Export verified ✓"
```

#### Step 6: Deliver to User

```bash
# Upload to secure S3 bucket with pre-signed URL (7-day expiry)
aws s3 cp "/tmp/dsar_export_${REQUEST_ID}.zip" \
  "s3://teei-dsar-exports/$REQUEST_ID/" \
  --server-side-encryption AES256

# Generate pre-signed URL
DOWNLOAD_URL=$(aws s3 presign \
  "s3://teei-dsar-exports/$REQUEST_ID/dsar_export_${REQUEST_ID}.zip" \
  --expires-in 604800)  # 7 days

# Send email to user
curl -X POST http://notifications.teei-prod/v1/email/send \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "to": "$USER_EMAIL",
  "template": "dsar_export_ready",
  "variables": {
    "download_url": "$DOWNLOAD_URL",
    "expires_at": "$(date -d '+7 days' '+%Y-%m-%d %H:%M UTC')",
    "request_id": "$REQUEST_ID"
  }
}
EOF

echo "Export delivered ✓"
```

### Automated Export (CronJob)

See `/ops/privacy/dsar-export-job.yaml` for automated scheduled exports.

---

## Data Deletion

### Manual Deletion Process

#### Step 1: Verify Request

```bash
USER_EMAIL="user@example.com"
USER_ID=$(psql $DATABASE_URL -t -c \
  "SELECT id FROM users WHERE email = '$USER_EMAIL';")

echo "User ID: $USER_ID"
```

#### Step 2: Create Deletion Request (30-day cancellation window)

```bash
REQUEST_ID=$(psql $DATABASE_URL -t -c "
  INSERT INTO dsar_requests (user_id, request_type, status, requested_at, scheduled_delete_at)
  VALUES ('$USER_ID', 'delete', 'pending', NOW(), NOW() + INTERVAL '30 days')
  RETURNING id;
" | xargs)

echo "Deletion Request ID: $REQUEST_ID"
echo "Scheduled for: $(date -d '+30 days' '+%Y-%m-%d')"
```

#### Step 3: Notify User (Cancellation Window)

```bash
curl -X POST http://notifications.teei-prod/v1/email/send \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "to": "$USER_EMAIL",
  "template": "dsar_delete_scheduled",
  "variables": {
    "request_id": "$REQUEST_ID",
    "cancel_url": "https://app.teei.com/privacy/cancel/$REQUEST_ID",
    "scheduled_date": "$(date -d '+30 days' '+%Y-%m-%d')"
  }
}
EOF
```

#### Step 4: Execute Deletion (After 30 days)

```bash
# Check if request was cancelled
STATUS=$(psql $DATABASE_URL -t -c \
  "SELECT status FROM dsar_requests WHERE id = '$REQUEST_ID';" | xargs)

if [ "$STATUS" = "cancelled" ]; then
  echo "Request was cancelled by user"
  exit 0
fi

# Execute deletion
curl -X POST http://privacy-orchestrator.teei-prod/v1/dsar/delete \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d @- <<EOF
{
  "request_id": "$REQUEST_ID",
  "user_id": "$USER_ID",
  "hard_delete": false,
  "backup_before_delete": true
}
EOF
```

#### Step 5: Verify Deletion

```bash
# Check that user data is marked as deleted
psql $DATABASE_URL -c "
  SELECT 'users' as table_name, COUNT(*) as remaining
  FROM users WHERE id = '$USER_ID' AND deleted_at IS NULL
  UNION ALL
  SELECT 'buddy_matches', COUNT(*)
  FROM buddy_matches WHERE participant_id = '$USER_ID' AND deleted_at IS NULL
  UNION ALL
  SELECT 'kintell_sessions', COUNT(*)
  FROM kintell_sessions WHERE user_id = '$USER_ID' AND deleted_at IS NULL
  UNION ALL
  SELECT 'outcome_scores', COUNT(*)
  FROM outcome_scores WHERE user_id = '$USER_ID' AND deleted_at IS NULL;
"

# Expected: All counts should be 0
```

#### Step 6: Audit Trail

```bash
# Log deletion in audit trail
psql $DATABASE_URL -c "
  INSERT INTO audit_logs (event_type, user_id, request_id, metadata, created_at)
  VALUES (
    'dsar.delete.completed',
    '$USER_ID',
    '$REQUEST_ID',
    jsonb_build_object(
      'deleted_tables', ARRAY['users', 'buddy_matches', 'kintell_sessions', 'outcome_scores'],
      'deleted_rows', 0,
      'operator', '$ADMIN_EMAIL'
    ),
    NOW()
  );
"
```

---

## Audit Trail

### Required Audit Logs

Every DSAR operation must log:

1. **Request received**: Who, when, what type (export/delete)
2. **Request processed**: Services queried, data volume
3. **Request completed**: Download URL generated, expiry time
4. **Request cancelled**: User cancelled within 30-day window
5. **Deletion executed**: Tables affected, row counts, operator

### Query Audit Logs

```bash
# View all DSAR requests for a user
psql $DATABASE_URL -c "
  SELECT
    id,
    request_type,
    status,
    requested_at,
    completed_at,
    scheduled_delete_at
  FROM dsar_requests
  WHERE user_id = '$USER_ID'
  ORDER BY requested_at DESC;
"

# View audit trail
psql $DATABASE_URL -c "
  SELECT
    event_type,
    metadata,
    created_at
  FROM audit_logs
  WHERE user_id = '$USER_ID' AND event_type LIKE 'dsar.%'
  ORDER BY created_at DESC;
"
```

---

## Testing

### Test in Staging

```bash
# Create test user
TEST_USER_ID=$(psql $STAGING_DATABASE_URL -t -c "
  INSERT INTO users (email, name, company_id)
  VALUES ('dsar-test@teei.com', 'DSAR Test User', 1)
  RETURNING id;
" | xargs)

# Create sample data
psql $STAGING_DATABASE_URL -c "
  INSERT INTO buddy_matches (participant_id, buddy_id, status, created_at)
  VALUES ('$TEST_USER_ID', 'buddy-123', 'active', NOW());

  INSERT INTO kintell_sessions (user_id, session_type, duration_minutes, created_at)
  VALUES ('$TEST_USER_ID', 'mentorship', 60, NOW());
"

# Run export test
./test-dsar-export.sh $TEST_USER_ID

# Run delete test
./test-dsar-delete.sh $TEST_USER_ID
```

### Validate Export Contents

```bash
# Unzip export
unzip /tmp/dsar_export_*.zip -d /tmp/dsar_export

# Verify structure
tree /tmp/dsar_export

# Expected structure:
# /tmp/dsar_export/
#   ├── manifest.json
#   ├── user_profile.json
#   ├── buddy_matches.json
#   ├── kintell_sessions.json
#   ├── upskilling_progress.json
#   ├── q2q_evidence.json
#   └── audit_log.json

# Verify no PII leakage
grep -r "password\|ssn\|credit_card" /tmp/dsar_export/ && {
  echo "Error: Sensitive data found in export!"
  exit 1
}
```

---

## Compliance Checklist

- [ ] **Response Time**: Export delivered within 72 hours
- [ ] **Completeness**: All user data across services included
- [ ] **Redaction**: No sensitive data (passwords, tokens) in export
- [ ] **Encryption**: Export package encrypted at rest and in transit
- [ ] **Audit Trail**: All operations logged with timestamps
- [ ] **Cancellation Window**: 30-day window for delete requests
- [ ] **Hard Delete**: Data purged after cancellation window
- [ ] **Notification**: User notified at each step
- [ ] **Verification**: Export checksum verified before delivery
- [ ] **Access Control**: Only authorized operators can execute DSAR

---

## Troubleshooting

### Export Stuck in "Pending"

```bash
# Check Privacy Orchestrator logs
kubectl logs -n teei-prod deployment/privacy-orchestrator --tail=100

# Check NATS queue for export events
kubectl exec -n teei-prod nats-0 -- nats consumer info dsar-exports

# Retry export
curl -X POST http://privacy-orchestrator.teei-prod/v1/dsar/$REQUEST_ID/retry \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Deletion Failed

```bash
# Check for foreign key constraints
psql $DATABASE_URL -c "
  SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
  FROM information_schema.table_constraints AS tc
  JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
  JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
  WHERE tc.constraint_type = 'FOREIGN KEY'
    AND ccu.table_name = 'users';
"

# Cascade delete (use with caution!)
psql $DATABASE_URL -c "
  DELETE FROM users WHERE id = '$USER_ID';
"
```

---

## References

- [GDPR Article 15 - Right of Access](https://gdpr-info.eu/art-15-gdpr/)
- [GDPR Article 17 - Right to Erasure](https://gdpr-info.eu/art-17-gdpr/)
- [Privacy Orchestrator API Docs](../../docs/api/privacy-orchestrator.md)
- [Audit Log Schema](../../docs/database/audit-logs.md)
