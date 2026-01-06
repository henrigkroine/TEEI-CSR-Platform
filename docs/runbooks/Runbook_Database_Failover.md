# PostgreSQL Failover Runbook

**Version**: 1.0
**Last Updated**: 2025-11-15
**RTO Target**: < 2 minutes
**RPO Target**: < 10 seconds
**Owner**: Database Operations Team / backup-restore-auditor
**Escalation**: Database Lead, SRE Lead

---

## Overview

This runbook details the PostgreSQL streaming replication failover procedure. It covers promotion of a standby replica to primary in the event of primary database failure or regional disaster.

**Architecture**:
- **Primary**: us-east-1 PostgreSQL 16.1 (3-node cluster with Patroni)
- **Standby**: eu-central-1 PostgreSQL 16.1 (streaming replica)
- **Replication**: Asynchronous streaming + WAL archiving to S3

**Related Runbooks**:
- Parent: `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Region_Failover.md`
- Restore: `/home/user/TEEI-CSR-Platform/docs/DB_Backup_Restore.md`
- Replication Setup: `/home/user/TEEI-CSR-Platform/docs/Postgres_Replication.md`

---

## Pre-Failover Assessment

### 1. Check Replication Status

**On Primary (if accessible):**
```bash
kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"
```

**Expected Output**:
```
 application_name | state     | sent_lsn   | write_lsn  | flush_lsn  | replay_lsn | sync_state
------------------+-----------+------------+------------+------------+------------+------------
 eu-standby       | streaming | 0/5000E28  | 0/5000E28  | 0/5000E28  | 0/5000E28  | async
```

**On Standby:**
```bash
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "SELECT pg_is_in_recovery(), pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn();"
```

**Expected Output**:
```
 pg_is_in_recovery | pg_last_wal_receive_lsn | pg_last_wal_replay_lsn
-------------------+-------------------------+------------------------
 t                 | 0/5000E28               | 0/5000E28
```

**Key Metric: Replication Lag**
```sql
SELECT
  now() - pg_last_xact_replay_timestamp() AS replication_lag,
  pg_wal_lsn_diff(pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn()) AS wal_lag_bytes
FROM pg_stat_replication;
```

**Acceptance Criteria**:
- Replication lag < 10 seconds → **Proceed with failover**
- Replication lag > 10 seconds < 1 minute → **Wait for catch-up if possible**
- Replication lag > 1 minute → **Expect data loss, document RPO breach**

---

### 2. Identify Last Committed Transaction

**Capture the Last Transaction ID on Primary (if accessible):**
```bash
kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  psql -U postgres -c "SELECT txid_current(), pg_current_wal_lsn();" > /tmp/last-txid-primary.txt
```

**Capture the Last Replayed Transaction on Standby:**
```bash
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "SELECT pg_last_xact_replay_timestamp(), pg_last_wal_replay_lsn();" > /tmp/last-txid-standby.txt
```

**Evidence Capture**:
```bash
# Save both files to gameday evidence directory
cp /tmp/last-txid-*.txt /home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)/
```

---

## Failover Decision Matrix

| Scenario | Primary Status | Replication Lag | Action |
|----------|----------------|-----------------|--------|
| **Planned Maintenance** | Healthy | < 1 second | Controlled switchover (see Appendix A) |
| **Primary Node Failure** | Unhealthy (node down) | < 10 seconds | Immediate failover |
| **Primary Region Outage** | Unreachable | Unknown (assume < 1 min) | Immediate failover |
| **Data Corruption** | Healthy (corrupted data) | < 1 second | Restore from backup (NOT failover) |
| **Replica Lag High** | Healthy | > 5 minutes | Do NOT failover (investigate lag root cause) |

---

## Failover Procedure

### Phase 1: Stop Application Writes (Target: 10 seconds)

**1.1 Enable Maintenance Mode**
```bash
# Gracefully drain traffic from primary region
kubectl --context prod-us-east-1 scale deployment/reporting-service -n teei-prod-us --replicas=0
kubectl --context prod-us-east-1 scale deployment/analytics-service -n teei-prod-us --replicas=0

# Or use PgBouncer to pause connections
kubectl --context prod-us-east-1 exec -it pgbouncer-0 -n teei-prod-us -- \
  psql -U pgbouncer -h 127.0.0.1 -p 6432 pgbouncer -c "PAUSE;"
```

**1.2 Verify No Active Transactions**
```bash
kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  psql -U postgres -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active' AND query NOT LIKE '%pg_stat_activity%';"
# Expected: 0
```

**Note**: If primary is unreachable, skip this step and proceed to promotion.

---

### Phase 2: Promote Standby to Primary (Target: 30 seconds)

**2.1 Trigger Promotion**

**Option A: Using Patroni (Recommended)**
```bash
# Patroni automatically handles promotion
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  patronictl failover --master postgres-primary-0 --candidate postgres-primary-1 --force
```

**Option B: Manual pg_ctl Promotion**
```bash
# Stop Patroni to take manual control
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  systemctl stop patroni

# Promote standby
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  /usr/local/bin/pg_ctl promote -D /var/lib/postgresql/data
```

**Option C: Using Trigger File (Legacy)**
```bash
# Create trigger file (PostgreSQL 12 and below)
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  touch /var/lib/postgresql/data/trigger_file
```

**2.2 Verify Promotion Success**
```bash
# Check recovery status (false = primary, true = standby)
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "SELECT pg_is_in_recovery();"
# Expected: f
```

**2.3 Verify Timeline Increment**
```bash
# Timeline should increment after promotion (e.g., 1 → 2)
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "SELECT timeline_id FROM pg_control_checkpoint();"
# Expected: 2 (or higher if multiple failovers occurred)
```

---

### Phase 3: Update Connection Configuration (Target: 30 seconds)

**3.1 Update PgBouncer Connection Pool**
```bash
# Update database host in PgBouncer config
kubectl --context prod-eu-central-1 exec -it pgbouncer-0 -n teei-prod-eu -- bash -c "
cat > /etc/pgbouncer/pgbouncer.ini <<EOF
[databases]
teei = host=postgres-primary-0.postgres-headless.teei-prod-eu.svc.cluster.local port=5432 dbname=teei

[pgbouncer]
listen_port = 6432
listen_addr = 0.0.0.0
auth_type = md5
auth_file = /etc/pgbouncer/userlist.txt
pool_mode = transaction
max_client_conn = 1000
default_pool_size = 25
EOF
"

# Reload PgBouncer
kubectl --context prod-eu-central-1 exec -it pgbouncer-0 -n teei-prod-eu -- \
  kill -HUP $(pgrep pgbouncer)
```

**3.2 Update Application ConfigMaps**
```bash
# Update database connection string
kubectl --context prod-eu-central-1 patch cm app-config -n teei-prod-eu \
  --patch '{"data":{"DATABASE_HOST":"postgres-primary-0.postgres-headless.teei-prod-eu.svc.cluster.local"}}'

# Rollout restart applications to pick up new config
kubectl --context prod-eu-central-1 rollout restart deployment/reporting-service -n teei-prod-eu
kubectl --context prod-eu-central-1 rollout restart deployment/analytics-service -n teei-prod-eu
```

---

### Phase 4: Verify Database Writability (Target: 15 seconds)

**4.1 Test Write Operations**
```bash
# Create test table if not exists
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -d teei -c "
    CREATE TABLE IF NOT EXISTS dr_test_writes (
      id SERIAL PRIMARY KEY,
      test_timestamp TIMESTAMPTZ DEFAULT NOW(),
      test_data TEXT
    );
  "

# Insert test row
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -d teei -c "
    INSERT INTO dr_test_writes (test_data)
    VALUES ('Failover test at ' || NOW()::TEXT)
    RETURNING *;
  "
```

**Expected Output**:
```
 id |       test_timestamp        |            test_data
----+-----------------------------+----------------------------------
  1 | 2025-11-15 10:23:45.123456 | Failover test at 2025-11-15 10:23:45
```

**4.2 Verify Foreign Key Constraints Still Enforced**
```bash
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -d teei -c "
    SELECT COUNT(*) FROM information_schema.table_constraints
    WHERE constraint_type = 'FOREIGN KEY';
  "
# Expected: Non-zero count (all FKs intact)
```

---

### Phase 5: Re-enable Application Traffic (Target: 30 seconds)

**5.1 Scale Up Application Pods**
```bash
kubectl --context prod-eu-central-1 scale deployment/reporting-service -n teei-prod-eu --replicas=6
kubectl --context prod-eu-central-1 scale deployment/analytics-service -n teei-prod-eu --replicas=6
kubectl --context prod-eu-central-1 scale deployment/corp-cockpit -n teei-prod-eu --replicas=4
```

**5.2 Monitor Application Logs for Errors**
```bash
# Check for database connection errors
kubectl --context prod-eu-central-1 logs -n teei-prod-eu deployment/reporting-service --tail=100 | grep -i error
# Expected: No connection errors
```

**5.3 Run Smoke Tests**
```bash
/home/user/TEEI-CSR-Platform/scripts/smoke-tests.sh --region eu-central-1
```

---

### Phase 6: Evidence Collection (Target: 15 seconds)

**6.1 Capture Post-Failover State**
```bash
# Save database state
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -d teei -c "
    SELECT
      txid_current() AS current_txid,
      pg_current_wal_lsn() AS current_lsn,
      timeline_id AS timeline,
      NOW() AS failover_complete_time
    FROM pg_control_checkpoint();
  " > /home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)/post-failover-db-state.txt
```

**6.2 Calculate RPO**
```bash
# Compare last transaction IDs
echo "Primary Last LSN:" $(cat /tmp/last-txid-primary.txt)
echo "Standby Replay LSN:" $(cat /tmp/last-txid-standby.txt)

# Calculate data loss window (if any)
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "
    SELECT pg_wal_lsn_diff('0/5000E28', '0/5000E00') AS bytes_lost;
  "
```

---

## Post-Failover Validation

### Critical Checks

**1. Verify All Application Pods Running**
```bash
kubectl --context prod-eu-central-1 get pods -n teei-prod-eu -o wide
```

**2. Check Database Connection Pool Stats**
```bash
kubectl --context prod-eu-central-1 exec -it pgbouncer-0 -n teei-prod-eu -- \
  psql -U pgbouncer -h 127.0.0.1 -p 6432 pgbouncer -c "SHOW POOLS;"
```

**3. Monitor Query Performance**
```bash
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "SELECT query, mean_exec_time FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;"
```

**4. Verify No Split-Brain**
```bash
# Ensure old primary is NOT accepting writes
kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  psql -U postgres -c "SELECT pg_is_in_recovery();"
# Expected: Connection refused (if region down) OR true (if demoted to standby)
```

---

## Failback Procedure (Return to US Primary)

**When to Failback**:
- Original region outage is resolved
- US cluster is healthy and tested
- Low-traffic window scheduled (e.g., overnight)

**Failback Steps** (High-Level):
1. Restore US cluster from EU backup or promote demoted primary
2. Configure US as streaming replica of EU
3. Wait for replication to catch up (lag < 1 second)
4. Execute controlled switchover (reverse of this runbook)
5. Update DNS to point back to US

**Detailed Procedure**: See `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Rollback.md`

---

## Troubleshooting

### Issue: Promotion Hangs with "waiting for WAL files from archive"

**Root Cause**: Standby is waiting for missing WAL segments from S3 archive.

**Solution**:
```bash
# Check WAL archive status
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  ls -lh /var/lib/postgresql/data/pg_wal/

# Force promotion without waiting for archive
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  bash -c "echo 'recovery_target_action = promote' >> /var/lib/postgresql/data/postgresql.auto.conf"
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  pg_ctl restart -D /var/lib/postgresql/data
```

---

### Issue: Applications Report "database is read-only"

**Root Cause**: Standby was promoted but `default_transaction_read_only` is still enabled.

**Solution**:
```bash
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "ALTER SYSTEM SET default_transaction_read_only = off;"
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "SELECT pg_reload_conf();"
```

---

### Issue: Replication Lag Was High, Data Loss Confirmed

**Root Cause**: Failover occurred before standby caught up.

**Action**:
1. Document data loss window in incident report
2. Query `pg_stat_replication` history to determine lost transactions
3. Restore missing data from S3 WAL archive (if critical)
4. Notify affected customers

**Evidence**:
```bash
# Extract lost transaction IDs
SELECT xid FROM pg_xact_commit_timestamp
WHERE timestamp > '2025-11-15 10:20:00'
  AND timestamp < '2025-11-15 10:23:00'
  AND xid > (SELECT txid_snapshot_xmax(txid_current_snapshot()));
```

---

## Compliance & Audit

**SOC2 CC9.1 Requirements**:
- [x] RTO < 5 minutes (database component: < 2 minutes)
- [x] RPO < 10 seconds (streaming replication lag)
- [x] Evidence of promotion timestamps captured
- [x] Transaction ID comparison documented

**Evidence Artifacts**:
- Pre-failover replication lag metrics
- Promotion timestamp (from PostgreSQL logs)
- Post-failover transaction ID
- RPO calculation (data loss window)

**Storage**: `/home/user/TEEI-CSR-Platform/ops/soc2/dr-evidence/postgres/failover-$(date +%Y%m%d-%H%M%S)/`

---

## Appendix A: Controlled Switchover (Zero Downtime)

For **planned** failovers during maintenance windows, use this procedure to minimize downtime:

1. **Reduce Replication Lag to < 1 second**
2. **Enable Synchronous Replication Temporarily**
   ```sql
   ALTER SYSTEM SET synchronous_standby_names = 'eu-standby';
   SELECT pg_reload_conf();
   ```
3. **Pause Application Writes** (maintenance mode)
4. **Wait for Lag = 0**
5. **Promote Standby**
6. **Update DNS**
7. **Resume Application Writes**

**Expected Downtime**: < 30 seconds

---

## Appendix B: Automation Hooks

**Future Enhancement**: Integrate with Kubernetes operator for automated failover.

**Prototype**:
```yaml
apiVersion: postgresql.k8s.io/v1
kind: PostgresCluster
metadata:
  name: teei-postgres
spec:
  automaticFailover:
    enabled: true
    maxReplicationLag: 10s
  patroni:
    enabled: true
    ttl: 30
    loopWait: 10
```

---

**Document Control**

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-15 | 1.0 | backup-restore-auditor | Initial creation for Phase G |

**Next Review**: 2026-02-15
