# Database Issues Runbook

Troubleshooting guide for PostgreSQL database problems.

## Quick Reference

**Connection issues → Check pool → Check queries → Check disk → Restart/failover**

## Common Symptoms

- Services can't connect to database
- Slow queries causing timeouts
- Database CPU/memory maxed out
- Deadlocks in application logs
- Replication lag

## Prerequisites

- Access to Kubernetes cluster
- PostgreSQL admin credentials
- Access to database monitoring dashboard

## Database Architecture

```
┌─────────────────────────────────────┐
│  Services                           │
│  (api-gateway, reporting, etc.)     │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  PgBouncer (Connection Pooler)      │
│  Pool Size: 50 connections          │
└───────────────┬─────────────────────┘
                │
                ▼
┌─────────────────────────────────────┐
│  PostgreSQL Primary                 │
│  Max Connections: 200               │
└───────────────┬─────────────────────┘
                │
                ├─► Replica 1 (read-only)
                └─► Replica 2 (read-only)
```

## Issue 1: Connection Pool Exhausted

### Symptoms

```
Error: too many clients already
FATAL: remaining connection slots are reserved
```

### Check

```bash
# Check active connections
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -c "
  SELECT count(*), state
  FROM pg_stat_activity
  GROUP BY state
  ORDER BY count DESC;
"

# Expected output:
#  count | state
# -------+--------
#     45 | active
#     10 | idle
#      5 | idle in transaction

# Check PgBouncer pool status
kubectl exec -it pgbouncer-0 -n teei-csr -- psql -p 6432 pgbouncer -c "SHOW POOLS;"
```

### Root Causes

1. **Connection leak** - App not closing connections
2. **Traffic spike** - More connections than pool size
3. **Long-running queries** - Connections held too long
4. **PgBouncer misconfigured** - Pool too small

### Mitigation

#### Option 1: Increase PgBouncer Pool

```bash
# Edit PgBouncer ConfigMap
kubectl edit configmap pgbouncer-config -n teei-csr

# Increase pool size
default_pool_size = 100  # Was 50
max_client_conn = 200    # Was 100

# Restart PgBouncer
kubectl rollout restart statefulset/pgbouncer -n teei-csr
```

#### Option 2: Kill Idle Connections

```bash
# Find idle connections (>5 minutes)
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -c "
  SELECT pid, usename, state, state_change
  FROM pg_stat_activity
  WHERE state = 'idle'
    AND state_change < now() - interval '5 minutes'
  ORDER BY state_change;
"

# Kill specific connection
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -c "
  SELECT pg_terminate_backend(<pid>);
"
```

#### Option 3: Restart Service

```bash
# Restart service to release connections
kubectl rollout restart deployment/api-gateway -n teei-csr
```

### Prevention

1. Always use connection pooling (PgBouncer)
2. Set connection timeout in app: `pool_timeout: 10s`
3. Close connections after use
4. Monitor connection count with alerts

## Issue 2: Slow Queries

### Symptoms

```
Query execution time >5 seconds
Application timeouts: "pq: canceling statement due to statement timeout"
High database CPU usage
```

### Check

```bash
# Find slow queries (currently running)
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -c "
  SELECT pid, now() - pg_stat_activity.query_start AS duration, query, state
  FROM pg_stat_activity
  WHERE (now() - pg_stat_activity.query_start) > interval '5 seconds'
    AND state = 'active'
  ORDER BY duration DESC;
"

# Check pg_stat_statements (historical slow queries)
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -c "
  SELECT query, calls, mean_exec_time, max_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;
"

# Check for missing indexes
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -c "
  SELECT schemaname, tablename, attname, n_distinct, correlation
  FROM pg_stats
  WHERE schemaname = 'public'
    AND n_distinct > 100
    AND correlation < 0.5;
"
```

### Root Causes

1. **Missing index** - Full table scan instead of index scan
2. **Complex query** - Too many joins or subqueries
3. **Large dataset** - Query returning millions of rows
4. **Lock contention** - Waiting for locks

### Mitigation

#### Option 1: Kill Slow Query

```bash
# Kill specific query
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -c "
  SELECT pg_cancel_backend(<pid>);
"

# If cancel doesn't work, terminate
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -c "
  SELECT pg_terminate_backend(<pid>);
"
```

#### Option 2: Add Missing Index

```bash
# Analyze query plan
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -d teei_csr -c "
  EXPLAIN ANALYZE SELECT * FROM organizations WHERE slug = 'acme-corp';
"

# If sequential scan found, add index
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -d teei_csr -c "
  CREATE INDEX CONCURRENTLY idx_organizations_slug ON organizations(slug);
"
# Note: CONCURRENTLY allows queries during index creation
```

#### Option 3: Optimize Query

```bash
# Rewrite query to use pagination
# Before:
SELECT * FROM events WHERE org_id = 123;  -- Returns 1M rows

# After:
SELECT * FROM events WHERE org_id = 123 ORDER BY created_at DESC LIMIT 100 OFFSET 0;
```

### Prevention

1. Always use `EXPLAIN ANALYZE` before deploying query changes
2. Add indexes for frequently queried columns
3. Use pagination for large result sets
4. Set statement timeout: `SET statement_timeout = '30s';`

## Issue 3: Database Disk Full

### Symptoms

```
PANIC: could not write to file: No space left on device
ERROR: could not extend file: No space left on device
```

### Check

```bash
# Check disk usage
kubectl exec -it postgresql-0 -n teei-csr -- df -h /var/lib/postgresql/data

# Check database size
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -c "
  SELECT pg_database.datname,
         pg_size_pretty(pg_database_size(pg_database.datname)) AS size
  FROM pg_database
  ORDER BY pg_database_size(pg_database.datname) DESC;
"

# Check table sizes
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -d teei_csr -c "
  SELECT schemaname, tablename,
         pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
  FROM pg_tables
  WHERE schemaname = 'public'
  ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
  LIMIT 10;
"
```

### Root Causes

1. **Large tables** - Unbounded data growth
2. **Bloat** - Dead tuples not vacuumed
3. **Logs** - WAL logs filling disk
4. **Temp files** - Large sorts/joins creating temp files

### Mitigation

#### Option 1: Clean Up Old Data

```bash
# Delete old audit logs (>90 days)
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -d teei_csr -c "
  DELETE FROM audit_logs WHERE created_at < now() - interval '90 days';
"

# Vacuum to reclaim space
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -d teei_csr -c "
  VACUUM FULL audit_logs;
"
```

#### Option 2: Increase Disk Size

```bash
# Resize PVC (if storage class supports it)
kubectl edit pvc data-postgresql-0 -n teei-csr

# Change:
# spec:
#   resources:
#     requests:
#       storage: 100Gi  # Was 50Gi

# Delete StatefulSet (keeps PVC)
kubectl delete statefulset postgresql -n teei-csr --cascade=orphan

# Re-apply with new size
kubectl apply -f k8s/base/postgresql/statefulset.yaml
```

#### Option 3: Offload to S3

```bash
# Export old data to S3
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -d teei_csr -c "
  COPY (SELECT * FROM events WHERE created_at < '2024-01-01')
  TO STDOUT WITH CSV HEADER
" | aws s3 cp - s3://teei-csr-archive/events-2024.csv

# Delete archived data
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -d teei_csr -c "
  DELETE FROM events WHERE created_at < '2024-01-01';
"
```

### Prevention

1. Implement data retention policy
2. Schedule regular vacuuming: `autovacuum = on`
3. Set up disk usage alerts (>80%)
4. Archive old data to S3/Glacier

## Issue 4: Replication Lag

### Symptoms

```
Replica is behind primary by 5 minutes
Reads from replica return stale data
```

### Check

```bash
# Check replication status (on primary)
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -c "
  SELECT client_addr, state, sync_state,
         pg_wal_lsn_diff(pg_current_wal_lsn(), sent_lsn) AS pending_bytes,
         pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) AS lag_bytes
  FROM pg_stat_replication;
"

# Check replica lag (on replica)
kubectl exec -it postgresql-1 -n teei-csr -- psql -U postgres -c "
  SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;
"
```

### Root Causes

1. **High write volume** - Replica can't keep up
2. **Replica under-resourced** - CPU/memory constrained
3. **Network issues** - Slow connection to primary
4. **Long-running query on replica** - Blocks replication

### Mitigation

#### Option 1: Increase Replica Resources

```bash
# Edit replica resources
kubectl edit statefulset postgresql -n teei-csr

# Increase CPU/memory
resources:
  requests:
    cpu: 2000m     # Was 1000m
    memory: 4Gi    # Was 2Gi
  limits:
    cpu: 4000m     # Was 2000m
    memory: 8Gi    # Was 4Gi
```

#### Option 2: Stop Reads on Lagging Replica

```bash
# Remove replica from load balancer
kubectl label pod postgresql-1 -n teei-csr healthy=false

# Allow replica to catch up
# Monitor lag until it's <1 second

# Re-add to load balancer
kubectl label pod postgresql-1 -n teei-csr healthy=true
```

#### Option 3: Promote Replica to Primary (Failover)

```bash
# If primary is unhealthy, promote replica
kubectl exec -it postgresql-1 -n teei-csr -- /usr/bin/pg_ctl promote

# Update DNS/service to point to new primary
kubectl patch service postgresql -n teei-csr -p '{"spec":{"selector":{"statefulset.kubernetes.io/pod-name":"postgresql-1"}}}'
```

### Prevention

1. Monitor replication lag with alerts
2. Use connection pooling for reads
3. Scale replicas horizontally
4. Use read-replica routing in app

## Issue 5: Deadlocks

### Symptoms

```
ERROR: deadlock detected
DETAIL: Process 12345 waits for ShareLock on transaction 67890
```

### Check

```bash
# Check deadlock count
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -c "
  SELECT datname, deadlocks
  FROM pg_stat_database
  WHERE datname = 'teei_csr';
"

# Check locks
kubectl exec -it postgresql-0 -n teei-csr -- psql -U postgres -c "
  SELECT pid, locktype, mode, granted, query
  FROM pg_locks
  JOIN pg_stat_activity USING (pid)
  WHERE NOT granted;
"
```

### Root Causes

1. **Concurrent updates** - Two transactions updating same rows in different order
2. **Long transactions** - Holding locks too long
3. **Foreign key constraints** - Lock ordering issues

### Mitigation

#### Option 1: Retry Transaction

Most deadlocks resolve by retrying. Ensure app has retry logic:

```javascript
// Example retry logic
async function updateWithRetry(query, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await db.query(query);
    } catch (error) {
      if (error.code === '40P01' && i < maxRetries - 1) {
        // Deadlock detected, retry
        await sleep(Math.random() * 1000);
        continue;
      }
      throw error;
    }
  }
}
```

#### Option 2: Fix Lock Ordering

```sql
-- Bad: Updates in random order (can deadlock)
UPDATE organizations SET balance = balance - 100 WHERE id = 1;
UPDATE organizations SET balance = balance + 100 WHERE id = 2;

-- Good: Updates in consistent order (ID ascending)
UPDATE organizations SET balance = CASE
  WHEN id = 1 THEN balance - 100
  WHEN id = 2 THEN balance + 100
END
WHERE id IN (1, 2)
ORDER BY id;
```

### Prevention

1. Keep transactions short
2. Always acquire locks in same order
3. Use `SELECT ... FOR UPDATE NOWAIT` to fail fast
4. Avoid foreign key constraints on high-concurrency tables

## Emergency Procedures

### Restart PostgreSQL

```bash
# Graceful restart (waits for connections to close)
kubectl rollout restart statefulset/postgresql -n teei-csr

# Force restart (kills connections)
kubectl delete pod postgresql-0 -n teei-csr --grace-period=0 --force
```

### Restore from Backup

```bash
# List available backups
aws s3 ls s3://teei-csr-backups/postgresql/

# Download latest backup
aws s3 cp s3://teei-csr-backups/postgresql/backup-2025-11-15.sql.gz /tmp/

# Stop database
kubectl scale statefulset postgresql -n teei-csr --replicas=0

# Restore backup
gunzip < /tmp/backup-2025-11-15.sql.gz | kubectl exec -i postgresql-0 -n teei-csr -- psql -U postgres

# Start database
kubectl scale statefulset postgresql -n teei-csr --replicas=1
```

See: [DB Backup & Restore](../../DB_Backup_Restore.md)

### Failover to Replica

```bash
# Promote replica to primary
kubectl exec -it postgresql-1 -n teei-csr -- /usr/bin/pg_ctl promote

# Update service to point to new primary
kubectl patch service postgresql -n teei-csr -p '{"spec":{"selector":{"statefulset.kubernetes.io/pod-name":"postgresql-1"}}}'

# Verify new primary
kubectl exec -it postgresql-1 -n teei-csr -- psql -U postgres -c "SELECT pg_is_in_recovery();"
# Should return: f (false = not in recovery = primary)
```

## Monitoring Queries

### Connection Stats

```sql
SELECT count(*), state
FROM pg_stat_activity
GROUP BY state;
```

### Top 10 Slow Queries

```sql
SELECT substring(query, 1, 50) AS short_query,
       round(total_exec_time::numeric, 2) AS total_time_ms,
       calls,
       round(mean_exec_time::numeric, 2) AS mean_time_ms,
       round((100 * total_exec_time / sum(total_exec_time) OVER ())::numeric, 2) AS percentage
FROM pg_stat_statements
ORDER BY total_exec_time DESC
LIMIT 10;
```

### Table Bloat

```sql
SELECT schemaname, tablename,
       pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size,
       n_dead_tup AS dead_tuples,
       round(100 * n_dead_tup / nullif(n_live_tup, 0), 2) AS dead_ratio
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;
```

### Lock Contention

```sql
SELECT locktype, mode, count(*)
FROM pg_locks
WHERE NOT granted
GROUP BY locktype, mode
ORDER BY count DESC;
```

## Related Documentation

- [DB Backup & Restore](../../DB_Backup_Restore.md)
- [Database Schema](../../Database_Schema.md)
- [Incident Response](./incident_response.md)
