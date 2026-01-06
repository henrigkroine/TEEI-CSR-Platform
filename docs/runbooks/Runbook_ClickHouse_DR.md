# ClickHouse Disaster Recovery Runbook

**Version**: 1.0
**Last Updated**: 2025-11-15
**RTO Target**: < 1 minute
**RPO Target**: < 30 seconds
**Owner**: Analytics Team / backup-restore-auditor
**Escalation**: Data Engineering Lead, SRE Lead

---

## Overview

This runbook details disaster recovery procedures for ClickHouse analytics database, which powers real-time dashboards and reporting. ClickHouse uses asynchronous table-level replication between us-east-1 (primary) and eu-central-1 (replica).

**Architecture**:
- **Primary Cluster**: us-east-1 (3 shards, 2 replicas per shard)
- **DR Cluster**: eu-central-1 (3 shards, 2 replicas per shard)
- **Replication**: ReplicatedMergeTree + Distributed tables
- **Backup**: S3 incremental snapshots (hourly)

**Related Runbooks**:
- Parent: `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Region_Failover.md`
- Replication Setup: `/home/user/TEEI-CSR-Platform/docs/ClickHouse_Replication.md`

---

## Pre-Failover Assessment

### 1. Check Replication Status

**On Primary Cluster (if accessible):**
```bash
kubectl --context prod-us-east-1 exec -it clickhouse-0 -n teei-prod-us -- \
  clickhouse-client --query "
    SELECT
      database,
      table,
      is_leader,
      total_replicas,
      active_replicas,
      zookeeper_exception
    FROM system.replicas
    WHERE is_leader = 1
    FORMAT Vertical;
  "
```

**Expected Output**:
```
database:         analytics
table:            events_local
is_leader:        1
total_replicas:   4
active_replicas:  4
zookeeper_exception:
```

**On DR Cluster:**
```bash
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT
      table,
      inserts_in_queue,
      merges_in_queue,
      queue_oldest_time,
      absolute_delay
    FROM system.replication_queue
    FORMAT Vertical;
  "
```

**Key Metrics**:
- `inserts_in_queue`: < 1000 (acceptable lag)
- `absolute_delay`: < 30 seconds (RPO target)
- `queue_oldest_time`: < 1 minute ago

---

### 2. Verify Data Freshness

**Check Latest Data Timestamp:**
```bash
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT
      max(timestamp) AS latest_event,
      now() - max(timestamp) AS lag_seconds
    FROM analytics.events_distributed;
  "
```

**Expected Output**:
```
latest_event │ lag_seconds
─────────────┼─────────────
2025-11-15 10:23:45 │ 12
```

**Acceptance Criteria**:
- Lag < 30 seconds → Proceed with failover
- Lag > 30 seconds < 5 minutes → Wait for catch-up if possible
- Lag > 5 minutes → Investigate replication issue before failover

---

### 3. Capture Pre-Failover Evidence

```bash
# Save cluster state
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT
      hostName() AS host,
      database,
      table,
      formatReadableSize(total_bytes) AS size,
      total_rows,
      is_leader
    FROM system.replicas
    FORMAT JSONEachRow;
  " > /home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)/clickhouse-pre-failover.json
```

---

## Failover Procedure

### Phase 1: Stop Replication from Primary (Target: 10 seconds)

**1.1 Disable Replication Fetches**
```bash
# Stop fetching data from US cluster
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "SYSTEM STOP FETCHES analytics.events_local;"

# Verify replication is paused
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT
      database,
      table,
      is_readonly
    FROM system.replicas
    WHERE database = 'analytics';
  "
# Expected: is_readonly = 0 (writable)
```

**1.2 Wait for Pending Merges to Complete**
```bash
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT count(*) AS pending_merges
    FROM system.merges;
  "
# Wait until: pending_merges = 0
```

---

### Phase 2: Verify Data Integrity (Target: 15 seconds)

**2.1 Check Table Consistency**
```bash
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT
      database,
      table,
      sum(rows) AS total_rows,
      sum(bytes) AS total_bytes,
      count(DISTINCT partition) AS partitions
    FROM system.parts
    WHERE active = 1
      AND database = 'analytics'
    GROUP BY database, table;
  "
```

**2.2 Validate Recent Data Exists**
```bash
# Verify events from last 5 minutes are present
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT count(*) AS recent_events
    FROM analytics.events_distributed
    WHERE timestamp > now() - INTERVAL 5 MINUTE;
  "
# Expected: Non-zero count
```

**2.3 Check for Corrupted Parts**
```bash
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT count(*) AS broken_parts
    FROM system.parts
    WHERE is_broken = 1;
  "
# Expected: 0
```

---

### Phase 3: Enable Direct Writes to EU Cluster (Target: 10 seconds)

**3.1 Verify Cluster is Writable**
```bash
# Test insert on local table
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    INSERT INTO analytics.events_local (event_id, timestamp, event_type, tenant_id, user_id)
    VALUES (uuid(), now(), 'dr_test', 'test_tenant', 'test_user');
  "

# Verify insert propagated to distributed table
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT * FROM analytics.events_distributed
    WHERE event_type = 'dr_test'
    ORDER BY timestamp DESC
    LIMIT 1;
  "
```

**3.2 Update Application Connection Strings**

ClickHouse connections are already region-aware via Kubernetes service DNS:
- US apps use: `clickhouse.teei-prod-us.svc.cluster.local:9000`
- EU apps use: `clickhouse.teei-prod-eu.svc.cluster.local:9000`

**No configuration change needed** - applications automatically use local cluster after DNS cutover.

---

### Phase 4: Verify Query Performance (Target: 15 seconds)

**4.1 Run Benchmark Queries**
```bash
# Test query performance
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT
      tenant_id,
      count(*) AS events,
      uniq(user_id) AS unique_users
    FROM analytics.events_distributed
    WHERE timestamp > now() - INTERVAL 1 DAY
    GROUP BY tenant_id
    ORDER BY events DESC
    LIMIT 10;
  " --time
```

**Expected Performance**:
- Query execution time < 1 second (for 1 day of data)
- No "Memory limit exceeded" errors
- No "Too many parts" warnings

**4.2 Monitor Query Threads**
```bash
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT count(*) AS running_queries
    FROM system.processes;
  "
# Expected: < 50 concurrent queries
```

---

### Phase 5: Re-enable Application Traffic (Target: 10 seconds)

**5.1 Scale Up Analytics Services**
```bash
# Applications will automatically connect to EU ClickHouse via K8s DNS
kubectl --context prod-eu-central-1 scale deployment/analytics-service -n teei-prod-eu --replicas=6
kubectl --context prod-eu-central-1 scale deployment/reporting-service -n teei-prod-eu --replicas=6
```

**5.2 Monitor Insert Rate**
```bash
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT
      table,
      formatReadableQuantity(sum(rows)) AS rows_inserted
    FROM system.query_log
    WHERE type = 'QueryFinish'
      AND query_kind = 'Insert'
      AND event_time > now() - INTERVAL 1 MINUTE
    GROUP BY table;
  "
```

---

### Phase 6: Evidence Collection (Target: 10 seconds)

**6.1 Capture Post-Failover State**
```bash
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT
      hostName() AS host,
      database,
      table,
      formatReadableSize(total_bytes) AS size,
      total_rows,
      is_leader,
      now() AS failover_complete_time
    FROM system.replicas
    FORMAT JSONEachRow;
  " > /home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)/clickhouse-post-failover.json
```

**6.2 Calculate RPO**
```bash
# Compare row counts before and after
diff /home/user/TEEI-CSR-Platform/ops/gameday/evidence/*/clickhouse-pre-failover.json \
     /home/user/TEEI-CSR-Platform/ops/gameday/evidence/*/clickhouse-post-failover.json
```

---

## Post-Failover Validation

### Critical Checks

**1. Verify All Shards Operational**
```bash
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT
      shard_num,
      replica_num,
      host_name,
      errors_count,
      is_local
    FROM system.clusters
    WHERE cluster = 'analytics_cluster';
  "
# Expected: errors_count = 0 for all shards
```

**2. Check ZooKeeper Connectivity**
```bash
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT * FROM system.zookeeper
    WHERE path = '/clickhouse/tables/analytics';
  "
# Expected: Results returned (ZooKeeper accessible)
```

**3. Monitor Disk Usage**
```bash
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT
      formatReadableSize(free_space) AS free,
      formatReadableSize(total_space) AS total,
      round(free_space / total_space * 100, 2) AS free_percent
    FROM system.disks;
  "
# Expected: free_percent > 20%
```

**4. Verify Distributed Table Routing**
```bash
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "EXPLAIN SELECT * FROM analytics.events_distributed LIMIT 1;"
# Expected: Shows query distribution across all shards
```

---

## Failback Procedure (Return to US Primary)

**When to Failback**:
- Original US cluster is healthy
- EU cluster has been running production traffic successfully
- Scheduled low-traffic window

**Failback Steps**:

1. **Restore US Cluster from S3 Backup**
   ```bash
   /home/user/TEEI-CSR-Platform/scripts/backup/restore-clickhouse-backup.sh \
     --region us-east-1 \
     --backup-id latest \
     --target-cluster prod-us-east-1
   ```

2. **Configure US as Replica of EU**
   ```sql
   -- On US cluster, update replication source
   ALTER TABLE analytics.events_local
   MODIFY SETTING replicated_deduplication_window = 1000;
   ```

3. **Wait for Replication Catch-Up**
   ```bash
   # Monitor replication lag
   watch -n 5 "kubectl --context prod-us-east-1 exec -it clickhouse-0 -n teei-prod-us -- \
     clickhouse-client --query 'SELECT absolute_delay FROM system.replication_queue;'"
   # Wait until: absolute_delay < 10 seconds
   ```

4. **Execute Controlled Switchover**
   - Pause writes to EU cluster
   - Wait for replication lag = 0
   - Update DNS to US
   - Resume writes to US cluster

**Detailed Procedure**: See `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Rollback.md`

---

## Troubleshooting

### Issue: "Too many parts" Error After Failover

**Root Cause**: Background merges fell behind during replication catch-up.

**Solution**:
```bash
# Force merge on all partitions
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "OPTIMIZE TABLE analytics.events_local FINAL;"

# Adjust merge throttling
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SET max_bytes_to_merge_at_max_space_in_pool = 150000000000;
    SET max_bytes_to_merge_at_min_space_in_pool = 100000000000;
  "
```

---

### Issue: Queries Timeout After Failover

**Root Cause**: Cold cache - EU cluster doesn't have data cached in memory.

**Solution**:
```bash
# Warm up cache with common queries
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT * FROM analytics.events_distributed
    WHERE timestamp > now() - INTERVAL 7 DAY
    FORMAT Null;
  "

# Increase query timeout temporarily
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "SET max_execution_time = 300;" # 5 minutes
```

---

### Issue: Replication Queue Not Draining

**Root Cause**: Network partition or ZooKeeper connectivity issues.

**Diagnosis**:
```bash
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "
    SELECT
      postpone_reason,
      count(*) AS count
    FROM system.replication_queue
    GROUP BY postpone_reason;
  "
```

**Solution**:
```bash
# Restart replication
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "SYSTEM RESTART REPLICAS analytics.events_local;"

# If ZooKeeper issue, restart ZooKeeper ensemble
kubectl --context prod-eu-central-1 rollout restart statefulset/zookeeper -n teei-prod-eu
```

---

## Backup & Restore Integration

### On-Demand Backup Before Failover

```bash
# Create snapshot of EU cluster state
/home/user/TEEI-CSR-Platform/scripts/backup/verify-clickhouse-backup.sh \
  --region eu-central-1 \
  --create-snapshot \
  --tag "pre-failover-$(date +%s)"
```

### Restore from S3 Backup (If Failover Fails)

```bash
# List available backups
aws s3 ls s3://teei-clickhouse-backups/eu-central-1/ --recursive

# Restore specific backup
/home/user/TEEI-CSR-Platform/scripts/backup/restore-clickhouse-backup.sh \
  --backup-id 2025-11-15-10-00-00 \
  --target-cluster prod-eu-central-1 \
  --verify-checksum
```

---

## Compliance & Audit

**SOC2 CC9.1 Requirements**:
- [x] RTO < 5 minutes (ClickHouse component: < 1 minute)
- [x] RPO < 30 seconds (replication queue delay)
- [x] Evidence of replication lag captured
- [x] Row count comparison documented

**Evidence Artifacts**:
- Pre-failover cluster state (JSON)
- Post-failover cluster state (JSON)
- Replication queue status
- RPO calculation (row count diff)

**Storage**: `/home/user/TEEI-CSR-Platform/ops/soc2/dr-evidence/clickhouse/failover-$(date +%Y%m%d-%H%M%S)/`

---

## Appendix A: Replication Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       US-EAST-1 (Primary)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Shard 1     │  │  Shard 2     │  │  Shard 3     │      │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │      │
│  │ │ Replica  │ │  │ │ Replica  │ │  │ │ Replica  │ │      │
│  │ │    1     │ │  │ │    1     │ │  │ │    1     │ │      │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │      │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │      │
│  │ │ Replica  │ │  │ │ Replica  │ │  │ │ Replica  │ │      │
│  │ │    2     │ │  │ │    2     │ │  │ │    2     │ │      │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└────────────────────────┬────────────────────────────────────┘
                         │ Async Replication
                         │ (ZooKeeper + ReplicatedMergeTree)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                    EU-CENTRAL-1 (Replica)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Shard 1     │  │  Shard 2     │  │  Shard 3     │      │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │      │
│  │ │ Replica  │ │  │ │ Replica  │ │  │ │ Replica  │ │      │
│  │ │    1     │ │  │ │    1     │ │  │ │    1     │ │      │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │      │
│  │ ┌──────────┐ │  │ ┌──────────┐ │  │ ┌──────────┐ │      │
│  │ │ Replica  │ │  │ │ Replica  │ │  │ │ Replica  │ │      │
│  │ │    2     │ │  │ │    2     │ │  │ │    2     │ │      │
│  │ └──────────┘ │  │ └──────────┘ │  │ └──────────┘ │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

**Key Points**:
- Each shard has 2 replicas for HA within region
- Cross-region replication via ZooKeeper coordination
- Distributed tables route queries to all shards
- Failover promotes EU cluster to standalone (breaks replication)

---

## Appendix B: Automation Roadmap

**Q2 2026**: Automated replication monitoring with PagerDuty alerts
**Q3 2026**: One-click failover via custom Kubernetes operator
**Q4 2026**: Active-active ClickHouse with CRDT-based conflict resolution

---

**Document Control**

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-15 | 1.0 | backup-restore-auditor | Initial creation for Phase G |

**Next Review**: 2026-02-15
