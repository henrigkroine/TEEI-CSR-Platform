# Disaster Recovery Runbook

**Version:** 1.0.0
**Last Updated:** 2025-11-14
**RTO (Recovery Time Objective):** 4 hours
**RPO (Recovery Point Objective):** 1 hour

---

## Table of Contents

1. [Overview](#overview)
2. [DR Scenarios](#dr-scenarios)
3. [Backup Strategy](#backup-strategy)
4. [PostgreSQL Recovery](#postgresql-recovery)
5. [NATS JetStream Recovery](#nats-jetstream-recovery)
6. [ClickHouse Recovery](#clickhouse-recovery)
7. [Configuration Recovery](#configuration-recovery)
8. [DR Drills](#dr-drills)
9. [Contact & Escalation](#contact--escalation)

---

## Overview

### Recovery Objectives

| Data Store | RTO | RPO | Backup Frequency | Retention |
|------------|-----|-----|------------------|-----------|
| **PostgreSQL** | 2 hours | 1 hour | Hourly | 7 days daily, 4 weeks weekly |
| **NATS JetStream** | 1 hour | 15 minutes | Continuous (replicated) | 24 hours |
| **ClickHouse** | 4 hours | 1 hour | Daily | 30 days |
| **Configurations** | 30 minutes | N/A (version controlled) | Git commits | Forever |
| **Secrets** | 1 hour | N/A | Vault snapshots | 7 days |

### Disaster Scenarios

**SEV-1 (Critical):**
- Complete cluster failure
- Database corruption
- Data center outage
- Ransomware attack

**SEV-2 (High):**
- Single node failure
- Partial data loss
- Network partition

**SEV-3 (Medium):**
- Configuration drift
- Accidental deletion

---

## DR Scenarios

### Scenario 1: Complete Cluster Failure

**Symptoms:**
- All Kubernetes nodes unreachable
- Complete service outage
- No response from any endpoint

**Recovery Steps:**

1. **Activate DR Cluster (30 minutes)**
   ```bash
   # Switch to DR cluster
   export KUBECONFIG=~/.kube/config-dr

   # Verify DR cluster is ready
   kubectl get nodes
   kubectl get namespaces

   # Deploy latest known-good version
   cd /home/user/TEEI-CSR-Platform
   kubectl apply -k k8s/overlays/production
   ```

2. **Restore PostgreSQL (1-2 hours)**
   See [PostgreSQL Recovery](#postgresql-recovery)

3. **Restore ClickHouse (30 minutes)**
   See [ClickHouse Recovery](#clickhouse-recovery)

4. **Update DNS (5 minutes)**
   ```bash
   # Point production DNS to DR cluster
   aws route53 change-resource-record-sets \
     --hosted-zone-id Z123456 \
     --change-batch file://dr-dns-update.json
   ```

5. **Verify Services (15 minutes)**
   - Run smoke tests
   - Verify data integrity
   - Check monitoring dashboards

### Scenario 2: Database Corruption

**Symptoms:**
- Query errors: "invalid page header"
- PostgreSQL crash loops
- Data inconsistencies

**Recovery Steps:**

1. **Assess Damage (5 minutes)**
   ```bash
   # Try to connect to database
   psql ${DATABASE_URL} -c "SELECT 1"

   # Check PostgreSQL logs
   kubectl logs -n teei-production statefulset/postgres --tail=100

   # Attempt to dump uncorrupted tables
   pg_dump ${DATABASE_URL} --table=users > /tmp/partial-backup.sql
   ```

2. **Stop Services (2 minutes)**
   ```bash
   kubectl scale deployment -n teei-production --replicas=0 --all
   ```

3. **Restore from Backup (30-60 minutes)**
   See [PostgreSQL Recovery](#postgresql-recovery)

4. **Recover Recent Data (variable)**
   - Check NATS JetStream for recent events
   - Replay events if possible
   - Manual data entry for critical records

### Scenario 3: Accidental Data Deletion

**Symptoms:**
- User reports missing data
- Audit logs show DELETE operations
- Data exists in recent backups

**Recovery Steps:**

1. **Identify Deletion Window (5 minutes)**
   ```bash
   # Check audit logs
   psql ${DATABASE_URL} << EOF
   SELECT action, table_name, timestamp, user_id
   FROM audit_logs
   WHERE action = 'DELETE'
   ORDER BY timestamp DESC
   LIMIT 100;
   EOF
   ```

2. **Restore to Staging (15 minutes)**
   ```bash
   # Restore to staging database for investigation
   export STAGING_DB_URL="postgresql://teei:${DB_PASSWORD}@staging-db:5432/teei_staging"

   gunzip -c /backups/teei_platform_2025-11-14T10-00-00.sql.gz | \
     psql ${STAGING_DB_URL}
   ```

3. **Export Deleted Records (10 minutes)**
   ```bash
   # Export deleted records from staging
   psql ${STAGING_DB_URL} -c "\copy (
     SELECT * FROM users WHERE id IN (1,2,3)
   ) TO '/tmp/recovered-users.csv' CSV HEADER"
   ```

4. **Import to Production (5 minutes)**
   ```bash
   # Verify no conflicts
   psql ${DATABASE_URL} -c "SELECT id FROM users WHERE id IN (1,2,3)"

   # Import recovered data
   psql ${DATABASE_URL} -c "\copy users FROM '/tmp/recovered-users.csv' CSV HEADER"
   ```

---

## Backup Strategy

### Automated Backup Schedule

```
PostgreSQL:
├─ Hourly: pg_dump (compressed, logical)
├─ Daily: Full backup + WAL archiving
├─ Weekly: Full backup (long-term retention)
└─ Storage: S3 + local NAS (redundancy)

ClickHouse:
├─ Daily: Full backup (native format)
├─ Weekly: Compressed archive
└─ Storage: S3

NATS JetStream:
├─ Continuous: Stream replication
├─ Hourly: Stream state snapshot
└─ Storage: Persistent volumes (replicated)

Configurations:
├─ Real-time: Git commits
├─ Daily: Kubernetes config dump
└─ Storage: GitHub + S3

Secrets:
├─ Daily: Vault snapshot
├─ Weekly: Encrypted backup
└─ Storage: S3 (encrypted)
```

### Backup Verification

**Automated (daily):**
```bash
#!/bin/bash
# /usr/local/bin/verify-backups.sh

# Verify PostgreSQL backup
LATEST_BACKUP=$(ls -t /backups/teei_platform_*.sql.gz | head -1)
gunzip -t ${LATEST_BACKUP} || echo "ALERT: Backup corrupted"

# Test restore to temp database
createdb teei_test_restore
gunzip -c ${LATEST_BACKUP} | psql teei_test_restore
TABLE_COUNT=$(psql teei_test_restore -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
dropdb teei_test_restore

if [ "$TABLE_COUNT" -lt "20" ]; then
  echo "ALERT: Backup incomplete (only $TABLE_COUNT tables)"
fi

echo "Backup verification complete: $TABLE_COUNT tables"
```

---

## PostgreSQL Recovery

### Full Database Restoration

**Time:** 30-60 minutes (depends on database size)
**Downtime:** Required

#### Step 1: Prepare for Restoration (5 minutes)

```bash
# Stop all application services
echo "⚠️  STOPPING ALL SERVICES FOR DATABASE RESTORE"
kubectl scale deployment -n teei-production --replicas=0 --all

# Wait for all pods to terminate
kubectl wait --for=delete pod --all -n teei-production --timeout=5m

# Set variables
export DATABASE_URL="postgresql://teei:${DB_PASSWORD}@postgres-service:5432/teei_platform"
export BACKUP_DATE="2025-11-14T10-00-00"
export BACKUP_FILE="/backups/teei_platform_${BACKUP_DATE}.sql.gz"
```

#### Step 2: Verify Backup Integrity (2 minutes)

```bash
# Verify backup file exists and is not corrupted
ls -lh ${BACKUP_FILE}
gunzip -t ${BACKUP_FILE} || { echo "Backup corrupted!"; exit 1; }

# Calculate backup file hash (for audit trail)
sha256sum ${BACKUP_FILE} > /tmp/backup-hash.txt
```

#### Step 3: Drop Existing Database (2 minutes)

```bash
# Connect to PostgreSQL as superuser
kubectl exec -n teei-production statefulset/postgres -it -- psql -U teei -d postgres

# Inside psql:
-- Terminate all connections
SELECT pg_terminate_backend(pid)
FROM pg_stat_activity
WHERE datname = 'teei_platform' AND pid <> pg_backend_pid();

-- Drop database
DROP DATABASE IF EXISTS teei_platform;

-- Recreate database
CREATE DATABASE teei_platform WITH OWNER = teei;

-- Exit psql
\q
```

#### Step 4: Restore Database (20-45 minutes)

```bash
# Restore from backup
echo "Starting database restoration..."
time gunzip -c ${BACKUP_FILE} | psql ${DATABASE_URL}

# Check for errors in restore
if [ $? -ne 0 ]; then
  echo "❌ Database restore failed!"
  exit 1
fi

echo "✅ Database restore completed"
```

#### Step 5: Verify Database Integrity (5 minutes)

```bash
# Connect to restored database
psql ${DATABASE_URL} << EOF

-- Verify table count
SELECT COUNT(*) as table_count
FROM information_schema.tables
WHERE table_schema = 'public';

-- Verify critical tables
SELECT 'users' as table, COUNT(*) as count FROM users
UNION ALL
SELECT 'companies', COUNT(*) FROM companies
UNION ALL
SELECT 'metrics', COUNT(*) FROM metrics
UNION ALL
SELECT 'feedback', COUNT(*) FROM feedback;

-- Check schema version
SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 1;

-- Verify indexes
SELECT schemaname, tablename, indexname
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check foreign key constraints
SELECT conname, contype
FROM pg_constraint
WHERE contype = 'f';

EOF
```

#### Step 6: Update Sequences (2 minutes)

```bash
# Reset sequences to match data
psql ${DATABASE_URL} << EOF

-- Update all sequences
DO \$\$
DECLARE
  seq_name text;
BEGIN
  FOR seq_name IN
    SELECT sequence_name
    FROM information_schema.sequences
    WHERE sequence_schema = 'public'
  LOOP
    EXECUTE format('SELECT setval(%L, (SELECT COALESCE(MAX(id), 1) FROM %I))',
                   seq_name,
                   replace(seq_name, '_id_seq', ''));
  END LOOP;
END \$\$;

EOF
```

#### Step 7: Restart Services (5-10 minutes)

```bash
# Scale deployments back up
kubectl scale deployment -n teei-production --replicas=3 --all

# Wait for services to be ready
kubectl rollout status deployment -n teei-production --timeout=10m

# Verify health
kubectl get pods -n teei-production
```

### Point-in-Time Recovery (PITR)

**When to use:** Need to restore to specific timestamp (requires WAL archiving)

```bash
# 1. Stop database
kubectl scale statefulset -n teei-production postgres --replicas=0

# 2. Restore base backup
gunzip -c /backups/base-backup.tar.gz | tar -xf - -C /var/lib/postgresql/data

# 3. Create recovery.conf
cat > /var/lib/postgresql/data/recovery.conf << EOF
restore_command = 'cp /backups/wal_archive/%f %p'
recovery_target_time = '2025-11-14 10:30:00'
recovery_target_action = 'promote'
EOF

# 4. Start database (will enter recovery mode)
kubectl scale statefulset -n teei-production postgres --replicas=1

# 5. Monitor recovery
kubectl logs -f -n teei-production postgres-0
```

---

## NATS JetStream Recovery

### Stream State Recovery

**Time:** 15-30 minutes
**Downtime:** Minimal (consumers may lag)

#### Step 1: Assess Stream Health (2 minutes)

```bash
# Connect to NATS
kubectl exec -n teei-production deployment/prod-teei-api-gateway -- \
  nats stream list

# Check stream info
kubectl exec -n teei-production deployment/prod-teei-api-gateway -- \
  nats stream info FEEDBACK_EVENTS

# Check consumer state
kubectl exec -n teei-production deployment/prod-teei-api-gateway -- \
  nats consumer list FEEDBACK_EVENTS
```

#### Step 2: Backup Current Stream State (5 minutes)

```bash
# Backup stream configuration
kubectl exec -n teei-production deployment/prod-teei-api-gateway -- \
  nats stream info FEEDBACK_EVENTS -j > /tmp/stream-backup.json

# Backup consumer configuration
kubectl exec -n teei-production deployment/prod-teei-api-gateway -- \
  nats consumer list FEEDBACK_EVENTS -j > /tmp/consumers-backup.json
```

#### Step 3: Restore Stream from Snapshot (10 minutes)

```bash
# If stream corrupted, recreate from snapshot
SNAPSHOT_FILE="/backups/nats-streams-2025-11-14.tar.gz"

# Stop NATS
kubectl scale deployment -n teei-production nats --replicas=0

# Restore snapshot to persistent volume
kubectl cp ${SNAPSHOT_FILE} teei-production/nats-0:/data/jetstream/

# Extract snapshot
kubectl exec -n teei-production nats-0 -- \
  tar -xzf /data/jetstream/nats-streams-2025-11-14.tar.gz -C /data/jetstream/

# Restart NATS
kubectl scale deployment -n teei-production nats --replicas=3
```

#### Step 4: Rebuild Consumers (5 minutes)

```bash
# Recreate consumers from backup
kubectl exec -n teei-production deployment/prod-teei-api-gateway -- \
  nats consumer add FEEDBACK_EVENTS Q2Q_CONSUMER \
    --config=/tmp/consumers-backup.json

# Reset consumer to specific sequence
kubectl exec -n teei-production deployment/prod-teei-api-gateway -- \
  nats consumer next FEEDBACK_EVENTS Q2Q_CONSUMER --count=0
```

### Stream Replication Recovery

**When to use:** Primary stream lost, failover to replica

```bash
# 1. Identify healthy replica
kubectl get pods -n teei-production -l app=nats

# 2. Promote replica to primary
kubectl annotate pod nats-1 -n teei-production nats.io/primary=true

# 3. Update service endpoint
kubectl patch svc nats-service -n teei-production \
  -p '{"spec":{"selector":{"statefulset.kubernetes.io/pod-name":"nats-1"}}}'

# 4. Restart consumers
kubectl rollout restart deployment -n teei-production
```

---

## ClickHouse Recovery

### Full ClickHouse Restoration

**Time:** 30-60 minutes
**Downtime:** Analytics unavailable during restore

#### Step 1: Stop Analytics Services (2 minutes)

```bash
# Stop services that write to ClickHouse
kubectl scale deployment -n teei-production prod-teei-analytics --replicas=0
kubectl scale deployment -n teei-production prod-teei-reporting --replicas=0
```

#### Step 2: Backup Current Data (5 minutes)

```bash
# Backup current ClickHouse data (if partially corrupted)
kubectl exec -n teei-production clickhouse-0 -- \
  clickhouse-client --query "BACKUP DATABASE teei_analytics TO '/backups/current-clickhouse-backup'"
```

#### Step 3: Drop and Recreate Database (3 minutes)

```bash
# Connect to ClickHouse
kubectl exec -n teei-production clickhouse-0 -it -- clickhouse-client

-- Drop database
DROP DATABASE IF EXISTS teei_analytics;

-- Recreate database
CREATE DATABASE teei_analytics;

-- Exit
exit
```

#### Step 4: Restore from Backup (20-40 minutes)

```bash
# Restore from backup file
export CLICKHOUSE_BACKUP="/backups/clickhouse-teei_analytics-2025-11-14.tar.gz"

# Copy backup to pod
kubectl cp ${CLICKHOUSE_BACKUP} teei-production/clickhouse-0:/tmp/backup.tar.gz

# Extract and restore
kubectl exec -n teei-production clickhouse-0 -- sh -c '
  cd /tmp
  tar -xzf backup.tar.gz
  clickhouse-client --query "RESTORE DATABASE teei_analytics FROM /tmp/backup/"
'
```

#### Step 5: Verify Data Integrity (5 minutes)

```bash
kubectl exec -n teei-production clickhouse-0 -- clickhouse-client << EOF

-- Check table count
SELECT COUNT(*) as table_count
FROM system.tables
WHERE database = 'teei_analytics';

-- Verify critical tables
SELECT table, formatReadableSize(total_bytes) as size, total_rows as rows
FROM system.tables
WHERE database = 'teei_analytics'
ORDER BY total_bytes DESC;

-- Check recent data
SELECT toDate(timestamp) as date, COUNT(*) as events
FROM teei_analytics.events
GROUP BY date
ORDER BY date DESC
LIMIT 7;

EOF
```

#### Step 6: Rebuild Missing Data (variable)

```bash
# If recent data is missing, replay from NATS JetStream
kubectl exec -n teei-production deployment/prod-teei-analytics -- \
  node scripts/replay-events.js --since="2025-11-14T10:00:00Z"
```

#### Step 7: Restart Services (5 minutes)

```bash
kubectl scale deployment -n teei-production prod-teei-analytics --replicas=3
kubectl scale deployment -n teei-production prod-teei-reporting --replicas=3
```

---

## Configuration Recovery

### Kubernetes Configurations

**Time:** 15-30 minutes
**Downtime:** Minimal

#### Restore from Git

```bash
# Clone latest configuration
cd /tmp
git clone https://github.com/henrigkroine/TEEI-CSR-Platform.git
cd TEEI-CSR-Platform

# Checkout specific version if needed
git checkout tags/v1.2.3

# Apply configurations
kubectl apply -k k8s/overlays/production
```

#### Restore from Backup

```bash
# Daily configuration backups stored at:
export CONFIG_BACKUP="/backups/k8s-config-2025-11-14.tar.gz"

# Extract backup
tar -xzf ${CONFIG_BACKUP} -C /tmp/

# Apply all configs
kubectl apply -f /tmp/k8s-backup/ --recursive
```

### Secrets Recovery

**Time:** 10-20 minutes

#### From Vault Backup

```bash
# Restore Vault snapshot
vault operator raft snapshot restore /backups/vault-snapshot-2025-11-14.snap

# Verify secrets exist
vault kv list secret/teei-production/

# Recreate Kubernetes secrets from Vault
for secret in jwt-secret database-url openai-api-key; do
  kubectl create secret generic ${secret} \
    --from-literal=value=$(vault kv get -field=value secret/teei-production/${secret}) \
    -n teei-production
done
```

---

## DR Drills

### Quarterly DR Drill Schedule

**Q1:** PostgreSQL full restore
**Q2:** Complete cluster failover
**Q3:** ClickHouse restore + data replay
**Q4:** Multi-component failure simulation

### DR Drill Procedure

#### 1. Pre-Drill Checklist (1 day before)

- [ ] Schedule drill (non-business hours)
- [ ] Notify all stakeholders
- [ ] Prepare DR environment
- [ ] Review runbooks
- [ ] Assign roles (incident commander, scribes, specialists)

#### 2. Drill Execution (2-4 hours)

```bash
# Start timer
DRILL_START=$(date +%s)

# Execute DR scenario
# [Follow specific DR scenario steps]

# End timer
DRILL_END=$(date +%s)
DRILL_DURATION=$((DRILL_END - DRILL_START))

echo "DR drill completed in $((DRILL_DURATION / 60)) minutes"
```

#### 3. Post-Drill Review (1 hour)

- [ ] Document actual vs. target RTO/RPO
- [ ] Identify gaps in runbooks
- [ ] Note any issues or blockers
- [ ] Update runbooks with lessons learned
- [ ] Create action items for improvements

### DR Drill Report Template

```markdown
# DR Drill Report - [DATE]

## Scenario
[Describe scenario tested]

## Participants
- Incident Commander: [Name]
- DBA: [Name]
- Infrastructure: [Name]
- Application Team: [Name]

## Timeline
| Time | Event |
|------|-------|
| 00:00 | Drill started |
| 00:05 | Assessment complete |
| 00:15 | Backup restoration started |
| 01:00 | Restoration complete |
| 01:15 | Verification complete |
| 01:20 | Drill concluded |

## Metrics
- **Target RTO:** 4 hours
- **Actual RTO:** 1 hour 20 minutes ✅
- **Target RPO:** 1 hour
- **Actual RPO:** 45 minutes ✅

## Issues Encountered
1. [Issue description and resolution]

## Action Items
1. [ ] [Improvement needed]

## Conclusion
[Overall assessment]
```

---

## Contact & Escalation

### Emergency Contact List

| Role | Primary | Secondary | Phone | PagerDuty |
|------|---------|-----------|-------|-----------|
| **Incident Commander** | [Name] | [Name] | [Phone] | [Schedule] |
| **Database Admin** | [Name] | [Name] | [Phone] | [Schedule] |
| **Infrastructure Lead** | [Name] | [Name] | [Phone] | [Schedule] |
| **Platform Architect** | [Name] | [Name] | [Phone] | [Schedule] |
| **CTO** | [Name] | - | [Phone] | - |

### Escalation Path

```
SEV-1 Disaster:
├─ 0-15 min: On-call engineer + Incident Commander
├─ 15-30 min: + Infrastructure Lead + DBA
├─ 30-60 min: + Platform Architect
└─ > 60 min: + CTO

SEV-2 Partial Outage:
├─ 0-30 min: On-call engineer
├─ 30-60 min: + Incident Commander
└─ > 60 min: + Infrastructure Lead
```

### Communication Channels

**During DR Event:**
- **Primary:** Slack #platform-dr-incidents
- **Secondary:** PagerDuty conference bridge
- **Status Updates:** Every 15 minutes to #announcements

**External Communication:**
- **Status Page:** https://status.teei.example.com
- **Customer Email:** Sent via [notification system]
- **Partner Notification:** Via dedicated Slack Connect channels

---

## Appendix: Backup Locations

### Primary Backup Storage

**Local NAS:**
- Path: `/backups/teei-production/`
- Retention: 7 days
- Access: NFS mount from Kubernetes

**AWS S3:**
- Bucket: `s3://teei-backups-production/`
- Retention: 30 days (lifecycle policy)
- Encryption: AES-256 server-side
- Versioning: Enabled

**Azure Blob Storage (Secondary):**
- Container: `teei-backups-dr`
- Retention: 90 days
- Geo-replication: Enabled

### Backup Naming Convention

```
PostgreSQL:
  teei_platform_YYYY-MM-DDTHH-MM-SS.sql.gz
  teei_platform_weekly_YYYY-WW.sql.gz

ClickHouse:
  clickhouse-teei_analytics-YYYY-MM-DD.tar.gz

NATS:
  nats-streams-YYYY-MM-DD.tar.gz

Configs:
  k8s-config-YYYY-MM-DD.tar.gz

Secrets:
  vault-snapshot-YYYY-MM-DD.snap
```

---

## Appendix: Recovery Scripts

### PostgreSQL Full Recovery Script

```bash
#!/bin/bash
# /usr/local/bin/teei-pg-recover.sh
set -euo pipefail

BACKUP_FILE=$1
DATABASE_URL=${DATABASE_URL:-"postgresql://teei:password@localhost:5432/teei_platform"}
NAMESPACE=${NAMESPACE:-"teei-production"}

echo "🔄 PostgreSQL Recovery Script"
echo "Backup file: ${BACKUP_FILE}"
echo "Database: ${DATABASE_URL}"
echo "Namespace: ${NAMESPACE}"

# Confirm
read -p "This will DELETE the database and restore from backup. Type 'RECOVER' to confirm: " CONFIRM
if [ "$CONFIRM" != "RECOVER" ]; then
  echo "Aborted."
  exit 1
fi

# Stop services
echo "Stopping all services..."
kubectl scale deployment -n ${NAMESPACE} --replicas=0 --all

# Verify backup
echo "Verifying backup integrity..."
gunzip -t ${BACKUP_FILE} || { echo "Backup corrupted!"; exit 1; }

# Drop and recreate database
echo "Dropping database..."
kubectl exec -n ${NAMESPACE} statefulset/postgres -- psql -U teei -d postgres -c "
  SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = 'teei_platform';
  DROP DATABASE IF EXISTS teei_platform;
  CREATE DATABASE teei_platform WITH OWNER = teei;
"

# Restore
echo "Restoring database (this may take 30-60 minutes)..."
gunzip -c ${BACKUP_FILE} | psql ${DATABASE_URL}

# Verify
echo "Verifying restoration..."
TABLE_COUNT=$(psql ${DATABASE_URL} -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public'")
echo "Tables restored: ${TABLE_COUNT}"

# Restart services
echo "Restarting services..."
kubectl scale deployment -n ${NAMESPACE} --replicas=3 --all

echo "✅ Recovery complete!"
```

### ClickHouse Recovery Script

```bash
#!/bin/bash
# /usr/local/bin/teei-ch-recover.sh
set -euo pipefail

BACKUP_FILE=$1
NAMESPACE=${NAMESPACE:-"teei-production"}

echo "🔄 ClickHouse Recovery Script"
echo "Backup file: ${BACKUP_FILE}"

# Stop analytics services
kubectl scale deployment -n ${NAMESPACE} prod-teei-analytics --replicas=0
kubectl scale deployment -n ${NAMESPACE} prod-teei-reporting --replicas=0

# Copy backup to pod
kubectl cp ${BACKUP_FILE} ${NAMESPACE}/clickhouse-0:/tmp/backup.tar.gz

# Restore
kubectl exec -n ${NAMESPACE} clickhouse-0 -- sh -c '
  clickhouse-client --query "DROP DATABASE IF EXISTS teei_analytics"
  clickhouse-client --query "CREATE DATABASE teei_analytics"
  cd /tmp && tar -xzf backup.tar.gz
  clickhouse-client --query "RESTORE DATABASE teei_analytics FROM /tmp/backup/"
'

# Restart services
kubectl scale deployment -n ${NAMESPACE} prod-teei-analytics --replicas=3
kubectl scale deployment -n ${NAMESPACE} prod-teei-reporting --replicas=3

echo "✅ ClickHouse recovery complete!"
```

---

**Document Version History:**

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-11-14 | Initial DR runbook with RTO/RPO targets |

**Related Runbooks:**
- [Deployment Runbook](./deployment.md)
- [Rollback Runbook](./rollback.md)
- [DB Backup & Restore Guide](../DB_Backup_Restore.md)
