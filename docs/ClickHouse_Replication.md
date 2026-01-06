# ClickHouse Multi-Region Replication & Sharding

**TEEI CSR Platform - Enterprise Analytics Infrastructure**

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Cluster Configuration](#cluster-configuration)
- [Data Flow & Sharding Logic](#data-flow--sharding-logic)
- [TTL Policies & GDPR Compliance](#ttl-policies--gdpr-compliance)
- [Backup & Restore Procedures](#backup--restore-procedures)
- [Query Patterns](#query-patterns)
- [Monitoring & Alerting](#monitoring--alerting)
- [Troubleshooting](#troubleshooting)
- [Operational Runbooks](#operational-runbooks)

---

## Architecture Overview

### Deployment Topology

The TEEI platform uses a multi-region ClickHouse deployment with sharded replication:

**US Region (Primary - 60% traffic)**
- **Cluster Name**: `teei_us_cluster`
- **Shards**: 3
- **Replicas per Shard**: 2
- **Total Pods**: 6 (clickhouse-us-0 through clickhouse-us-5)
- **Location**: `us-east-1`

**EU Region (GDPR - 40% traffic)**
- **Cluster Name**: `teei_eu_cluster`
- **Shards**: 2
- **Replicas per Shard**: 2
- **Total Pods**: 4 (clickhouse-eu-0 through clickhouse-eu-3)
- **Location**: `eu-central-1`

**Global Cluster**
- **Cluster Name**: `teei_global_cluster`
- **Shards**: 5 (3 US + 2 EU)
- **Purpose**: Cross-region analytics and unified queries

### High Availability

- **Replication Factor**: 2 (each shard has 2 replicas)
- **Automatic Failover**: Yes (via ReplicatedMergeTree)
- **Replica Lag Target**: <1 second
- **ZooKeeper Quorum**: 3 nodes (distributed across AZs)

### Storage & Performance

- **Storage Class**: `fast-ssd` (NVMe-backed)
- **Storage per Shard**: 200 GiB (auto-expandable)
- **Compression**: LZ4 (default), ZSTD(9) for cold data
- **Query Parallelization**: Automatic across shards
- **Resource Allocation**:
  - US Shards: 2-4 CPU, 8-16 GiB RAM
  - EU Shards: 1.5-3 CPU, 6-12 GiB RAM

---

## Cluster Configuration

### Shard-to-Pod Mapping

#### US Cluster
| Shard | Replica | Pod Name        | Role        |
|-------|---------|-----------------|-------------|
| 1     | 1       | clickhouse-us-0 | Leader      |
| 1     | 2       | clickhouse-us-1 | Follower    |
| 2     | 1       | clickhouse-us-2 | Leader      |
| 2     | 2       | clickhouse-us-3 | Follower    |
| 3     | 1       | clickhouse-us-4 | Leader      |
| 3     | 2       | clickhouse-us-5 | Follower    |

#### EU Cluster
| Shard | Replica | Pod Name        | Role        |
|-------|---------|-----------------|-------------|
| 1     | 1       | clickhouse-eu-0 | Leader      |
| 1     | 2       | clickhouse-eu-1 | Follower    |
| 2     | 1       | clickhouse-eu-2 | Leader      |
| 2     | 2       | clickhouse-eu-3 | Follower    |

### ZooKeeper Coordination

**Path Structure**:
```
/clickhouse/
├── tables/
│   ├── us-east-1/
│   │   ├── 1/
│   │   │   ├── events/
│   │   │   ├── metrics_company_period/
│   │   │   └── ...
│   │   ├── 2/
│   │   └── 3/
│   └── eu-central-1/
│       ├── 1/
│       └── 2/
└── task_queue/
    └── ddl/
```

**ZooKeeper Nodes**:
- `zookeeper-0.zookeeper.teei-platform.svc.cluster.local:2181`
- `zookeeper-1.zookeeper.teei-platform.svc.cluster.local:2181`
- `zookeeper-2.zookeeper.teei-platform.svc.cluster.local:2181`

### Network Services

| Service Name                | Type      | Port(s)                  | Purpose                          |
|-----------------------------|-----------|--------------------------|----------------------------------|
| clickhouse-us               | Headless  | 8123, 9000, 9009         | US cluster internal              |
| clickhouse-eu               | Headless  | 8123, 9000, 9009         | EU cluster internal              |
| clickhouse-us-lb            | ClusterIP | 8123, 9000               | US load balancer                 |
| clickhouse-eu-lb            | ClusterIP | 8123, 9000               | EU load balancer                 |
| clickhouse-global           | ClusterIP | 8123, 9000               | Global query endpoint            |

**Port Descriptions**:
- **8123**: HTTP interface (queries, monitoring)
- **9000**: Native protocol (high-performance client)
- **9009**: Interserver HTTP (replication traffic)

---

## Data Flow & Sharding Logic

### Sharding Strategy

**Shard Key**: `cityHash64(company_id)`

**Benefits**:
- ✅ Even distribution across shards (hash-based)
- ✅ All company data on same shard (efficient aggregations)
- ✅ Deterministic routing (same company → same shard)
- ✅ No hotspots (compared to time-based sharding)

**Example Distribution**:
```sql
SELECT
    company_id,
    cityHash64(company_id) % 5 AS shard_number
FROM events_distributed
LIMIT 5;

-- Sample output:
-- company_id                           | shard_number
-- 550e8400-e29b-41d4-a716-446655440000 | 2
-- 660e8400-e29b-41d4-a716-446655440001 | 4
-- 770e8400-e29b-41d4-a716-446655440002 | 0
```

### Regional Routing

**Application-Level Routing**:
```javascript
// Pseudo-code for regional routing
const company = await getCompany(companyId);
const region = company.primaryRegion; // 'us-east-1' or 'eu-central-1'

if (region.startsWith('eu-')) {
    // Route to EU cluster (GDPR data residency)
    await clickhouseEU.insert('events_eu_distributed', event);
} else {
    // Route to US cluster
    await clickhouseUS.insert('events_us_distributed', event);
}
```

**Regional Distributed Tables**:
- `events_eu_distributed` → Routes only to EU shards
- `events_us_distributed` → Routes only to US shards
- `events_distributed` → Routes to all shards (global queries)

### Write Flow

1. **Application** sends event to regional service
2. **Regional Service** determines company region from `company_region_mapping`
3. **Insert** into region-specific distributed table
4. **ClickHouse** hashes `company_id` and routes to shard
5. **Leader Replica** writes data locally
6. **ZooKeeper** notifies follower replica
7. **Follower Replica** pulls and replicates data (async)

### Read Flow

**Single-Company Query** (efficient):
```sql
SELECT count(*)
FROM events_distributed
WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
  AND timestamp > now() - INTERVAL 7 DAY;
-- Execution: Queries only 1 shard (where company data resides)
```

**Global Aggregation** (parallel):
```sql
SELECT
    event_type,
    count() AS event_count
FROM events_distributed
WHERE timestamp > now() - INTERVAL 1 DAY
GROUP BY event_type;
-- Execution: Parallel query on all 5 shards, merge results
```

---

## TTL Policies & GDPR Compliance

### Retention Policies

| Data Type                 | Retention (US)  | Retention (EU) | Rationale                        |
|---------------------------|-----------------|----------------|----------------------------------|
| Raw Events                | 90 days         | 90 days        | GDPR Article 5(1)(e)             |
| User Activity Logs        | 90 days         | 90 days        | GDPR minimization                |
| Aggregated Metrics        | 7 years         | 2 years        | SOX (US), GDPR (EU)              |
| SROI Calculations         | 7 years         | 2 years        | Financial compliance             |
| VIS Scores                | 7 years         | 2 years        | Impact tracking                  |
| Query Logs                | 30 days         | 30 days        | Operational monitoring           |

### TTL Implementation

**Raw Events** (90 days, all regions):
```sql
ALTER TABLE events_local
MODIFY TTL timestamp + INTERVAL 90 DAY DELETE;
```

**Aggregated Metrics** (region-specific):
```sql
ALTER TABLE metrics_company_period_local
MODIFY TTL created_at + INTERVAL
    CASE
        WHEN region = 'eu-central-1' THEN 730  -- 2 years
        ELSE 2555  -- 7 years
    END DAY DELETE;
```

### GDPR Right to Erasure (Article 17)

**Immediate Deletion** (DSAR request):
```bash
#!/bin/bash
# Usage: ./gdpr-erasure.sh <company_uuid>

COMPANY_ID="$1"

TABLES=(
    "events_local"
    "user_activity_local"
    "metrics_company_period_local"
    "sroi_calculations_local"
    "vis_scores_local"
)

for table in "${TABLES[@]}"; do
    clickhouse-client --query \
        "ALTER TABLE $table DELETE WHERE company_id = '$COMPANY_ID';"
done

# Monitor mutation progress
clickhouse-client --query \
    "SELECT * FROM system.mutations WHERE is_done = 0;"
```

**Mutation Status**:
```sql
-- Check GDPR deletion progress
SELECT
    database,
    table,
    mutation_id,
    command,
    is_done,
    parts_to_do
FROM system.mutations
WHERE command LIKE '%DELETE%'
ORDER BY create_time DESC;
```

### TTL Merge Monitoring

```sql
-- Monitor TTL cleanup status
SELECT
    database,
    table,
    partition,
    min_date,
    max_date,
    CASE
        WHEN max_date < now() - INTERVAL 90 DAY THEN 'EXPIRED'
        WHEN max_date < now() - INTERVAL 80 DAY THEN 'EXPIRING_SOON'
        ELSE 'ACTIVE'
    END AS ttl_status
FROM system.parts
WHERE active AND database = 'default'
ORDER BY max_date DESC;
```

---

## Backup & Restore Procedures

### Backup Strategy

**Tool**: `clickhouse-backup` (Altinity)
**Storage**: AWS S3 (regional buckets)
**Frequency**: Daily (automated via cron)
**Retention**: 30 days

#### S3 Buckets
- **US Backups**: `s3://teei-clickhouse-backup-us-east-1`
- **EU Backups**: `s3://teei-clickhouse-backup-eu-central-1`

### Daily Backup (Automated)

**Cron Schedule** (2 AM local time):
```cron
# US cluster
0 2 * * * /home/user/TEEI-CSR-Platform/scripts/infra/clickhouse-backup.sh backup

# EU cluster
0 2 * * * /home/user/TEEI-CSR-Platform/scripts/infra/clickhouse-backup.sh backup
```

**Backup Script**:
```bash
# Create and upload backup
./scripts/infra/clickhouse-backup.sh backup

# List available backups
./scripts/infra/clickhouse-backup.sh list

# Clean up old backups
./scripts/infra/clickhouse-backup.sh cleanup
```

### Restore Procedures

#### Full Cluster Restore
```bash
# 1. List available backups
./scripts/infra/clickhouse-backup.sh list

# 2. Restore specific backup
./scripts/infra/clickhouse-backup.sh restore teei-platform_20250115_120000

# 3. Verify restore
./scripts/infra/clickhouse-backup.sh consistency
```

#### Single Table Restore
```bash
# Restore only specific tables
clickhouse-backup restore --table=events_local teei-platform_20250115_120000
```

#### Cross-Region Disaster Recovery
```bash
# 1. Download backup from US S3 to EU cluster
export S3_BACKUP_BUCKET_EU="teei-clickhouse-backup-us-east-1"
clickhouse-backup download teei-platform_20250115_120000

# 2. Restore with remapping
clickhouse-backup restore --rm teei-platform_20250115_120000
```

### Backup Verification

```bash
# Verify backup integrity
./scripts/infra/clickhouse-backup.sh verify teei-platform_20250115_120000

# Check shard consistency
clickhouse-client --query "
SELECT
    database,
    table,
    sum(rows) AS total_rows,
    count(DISTINCT hostName()) AS num_shards
FROM system.parts
WHERE active AND database = 'default'
GROUP BY database, table;
"
```

---

## Query Patterns

### Recommended Query Patterns

#### ✅ GOOD: Single-Company Query
```sql
-- Efficient: Touches only 1 shard
SELECT
    event_type,
    count() AS event_count,
    avg(JSONExtractFloat(payload, 'duration')) AS avg_duration
FROM events_distributed
WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
  AND timestamp BETWEEN '2025-01-01' AND '2025-01-31'
GROUP BY event_type
ORDER BY event_count DESC;
```

#### ✅ GOOD: Global Aggregation (Parallel)
```sql
-- Parallel query across all shards
SELECT
    toDate(timestamp) AS date,
    region,
    count() AS event_count
FROM events_distributed
WHERE timestamp > now() - INTERVAL 7 DAY
GROUP BY date, region
ORDER BY date DESC;
```

#### ✅ GOOD: Materialized View Query
```sql
-- Pre-aggregated data (fast)
SELECT
    company_id,
    metric_name,
    sum(total_value) AS total
FROM mv_daily_company_metrics_distributed
WHERE date = today()
GROUP BY company_id, metric_name;
```

#### ⚠️ AVOID: Large Result Set Without Shard Key
```sql
-- Inefficient: Queries all shards, transfers large dataset
SELECT *
FROM events_distributed
WHERE timestamp > now() - INTERVAL 7 DAY
LIMIT 1000000;  -- BAD: Large limit without company_id filter
```

#### ⚠️ AVOID: Cross-Shard JOINs
```sql
-- Slow: Requires data shuffle across shards
SELECT e.*, m.metric_value
FROM events_distributed e
JOIN metrics_company_period_distributed m
  ON e.company_id = m.company_id
WHERE e.timestamp > now() - INTERVAL 1 DAY;
-- Better: Use materialized views or application-level joins
```

### Query Optimization Tips

1. **Always include `company_id` in WHERE clause** for single-company queries
2. **Use `PREWHERE`** for filtering large datasets:
   ```sql
   SELECT count()
   FROM events_distributed
   PREWHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
   WHERE timestamp > now() - INTERVAL 7 DAY;
   ```
3. **Batch inserts** (10k+ rows per batch) for high throughput
4. **Use `LIMIT` judiciously** on distributed tables
5. **Query local tables** (`events_local`) for debugging, not production

---

## Monitoring & Alerting

### Grafana Dashboard

**Dashboard**: `clickhouse-replication.json`
**Location**: `/observability/grafana/dashboards/clickhouse-replication.json`

**Key Panels**:
1. **Replica Lag** (alert if >60 seconds)
2. **Replication Queue Length** (alert if >500)
3. **Shard Health Status** (all shards online)
4. **Disk Usage by Shard** (alert if >80%)
5. **Query Latency by Region** (p95/p99)
6. **TTL Cleanup Jobs Status**
7. **ZooKeeper Connection Status**

### Critical Alerts

| Alert                     | Condition                      | Severity | Action                          |
|---------------------------|--------------------------------|----------|---------------------------------|
| Replica Lag               | >60 seconds                    | Critical | Check network, ZooKeeper        |
| Disk Usage                | >80%                           | Warning  | Add storage, clean old data     |
| Replication Queue         | >500 items                     | Warning  | Check replica health            |
| ZooKeeper Disconnected    | Connection lost                | Critical | Restart ZK, check network       |
| Shard Offline             | Pod not ready                  | Critical | Check pod logs, restart         |
| TTL Merge Stalled         | No TTL merges in 24h           | Warning  | Force OPTIMIZE TABLE            |

### Prometheus Metrics

**Key Metrics**:
```promql
# Replica lag
clickhouse_replica_absolute_delay{database="default"}

# Replication queue
clickhouse_replica_queue_size{database="default"}

# Disk usage
clickhouse_disk_used_bytes / clickhouse_disk_total_bytes * 100

# Query latency (p95)
histogram_quantile(0.95, rate(clickhouse_query_duration_seconds_bucket[5m]))

# Inserts per second
rate(clickhouse_rows_written_total[5m])
```

### Health Check Queries

```bash
# 1. Check cluster health
clickhouse-client --query "
SELECT
    cluster,
    shard_num,
    replica_num,
    host_name,
    port,
    is_local,
    errors_count
FROM system.clusters
WHERE cluster LIKE 'teei%'
ORDER BY cluster, shard_num, replica_num;
"

# 2. Check replication status
clickhouse-client --query "
SELECT
    database,
    table,
    is_leader,
    is_readonly,
    absolute_delay,
    queue_size,
    inserts_in_queue,
    merges_in_queue
FROM system.replicas
WHERE database = 'default'
ORDER BY absolute_delay DESC;
"

# 3. Check disk usage
clickhouse-client --query "
SELECT
    name,
    path,
    formatReadableSize(total_space) AS total,
    formatReadableSize(free_space) AS free,
    round(free_space / total_space * 100, 2) AS free_percent
FROM system.disks;
"
```

---

## Troubleshooting

### Common Issues

#### 1. Replica Lag Increasing

**Symptoms**:
- `absolute_delay` >60 seconds in `system.replicas`
- Replication queue growing

**Diagnosis**:
```sql
-- Check replication lag
SELECT
    database,
    table,
    is_leader,
    absolute_delay,
    queue_size,
    log_pointer,
    last_queue_update
FROM system.replicas
WHERE absolute_delay > 10
ORDER BY absolute_delay DESC;
```

**Solutions**:
1. Check network connectivity between replicas
2. Verify ZooKeeper is healthy
3. Check if follower replica is overloaded (CPU/memory)
4. Increase `max_replicated_fetches_network_bandwidth`
5. Restart lagging replica as last resort

#### 2. Out of Disk Space

**Symptoms**:
- Insert failures with "No space left on device"
- `clickhouse_disk_used_bytes` >90%

**Solutions**:
```bash
# 1. Check which tables are largest
clickhouse-client --query "
SELECT
    database,
    table,
    formatReadableSize(sum(bytes_on_disk)) AS total_size,
    sum(rows) AS total_rows
FROM system.parts
WHERE active
GROUP BY database, table
ORDER BY sum(bytes_on_disk) DESC
LIMIT 10;
"

# 2. Force TTL cleanup
clickhouse-client --query "OPTIMIZE TABLE events_local FINAL;"

# 3. Drop old partitions manually
clickhouse-client --query "ALTER TABLE events_local DROP PARTITION '202401';"

# 4. Expand PVC (Kubernetes)
kubectl edit pvc data-clickhouse-us-0 -n teei-platform
# Update storage size, then restart pod
```

#### 3. ZooKeeper Connection Lost

**Symptoms**:
- `is_readonly = 1` in `system.replicas`
- Insert failures

**Diagnosis**:
```bash
# Check ZooKeeper status
kubectl exec -it zookeeper-0 -n teei-platform -- zkCli.sh ls /clickhouse/tables
```

**Solutions**:
1. Restart ZooKeeper pods
2. Check ZooKeeper logs for errors
3. Verify network policies allow ClickHouse → ZooKeeper traffic
4. Increase ZooKeeper heap size if under memory pressure

#### 4. Slow Queries

**Diagnosis**:
```sql
-- Find slow queries
SELECT
    query_id,
    user,
    query_start_time,
    query_duration_ms,
    read_rows,
    read_bytes,
    memory_usage,
    query
FROM system.query_log
WHERE type = 'QueryFinish'
  AND query_duration_ms > 5000  -- >5 seconds
ORDER BY query_duration_ms DESC
LIMIT 10;
```

**Solutions**:
1. Add `company_id` to WHERE clause (shard pruning)
2. Use `PREWHERE` for filtering
3. Check if indexes are being used (`EXPLAIN` query)
4. Optimize table: `OPTIMIZE TABLE events_local FINAL;`
5. Add bloom filter indexes for common filters

#### 5. Shard Imbalance

**Diagnosis**:
```sql
-- Check data distribution
SELECT
    hostName() AS host,
    table,
    sum(rows) AS total_rows,
    formatReadableSize(sum(bytes_on_disk)) AS total_size
FROM system.parts
WHERE active AND database = 'default'
GROUP BY hostName(), table
ORDER BY table, host;
```

**Solution**:
- Imbalance <10%: Normal (hash distribution variance)
- Imbalance >20%: Investigate if specific companies dominate certain shards
- Consider sub-sharding high-volume companies

---

## Operational Runbooks

### Daily Operations

#### Morning Health Check
```bash
# Run daily health check script
cat > /tmp/daily-health-check.sh <<'EOF'
#!/bin/bash
echo "=== ClickHouse Daily Health Check ==="
echo ""

echo "1. Cluster Status:"
clickhouse-client --query "
SELECT cluster, count() AS shard_count
FROM system.clusters
WHERE cluster LIKE 'teei%'
GROUP BY cluster;
"

echo ""
echo "2. Replication Lag:"
clickhouse-client --query "
SELECT
    table,
    max(absolute_delay) AS max_lag_sec
FROM system.replicas
WHERE database = 'default'
GROUP BY table;
"

echo ""
echo "3. Disk Usage:"
clickhouse-client --query "
SELECT
    hostName(),
    round((1 - free_space / total_space) * 100, 2) AS used_percent
FROM system.disks
WHERE name = 'default';
"

echo ""
echo "4. Query Performance (last 1h):"
clickhouse-client --query "
SELECT
    quantile(0.95)(query_duration_ms) AS p95_ms,
    quantile(0.99)(query_duration_ms) AS p99_ms,
    count() AS query_count
FROM system.query_log
WHERE event_time > now() - INTERVAL 1 HOUR
  AND type = 'QueryFinish';
"
EOF

chmod +x /tmp/daily-health-check.sh
/tmp/daily-health-check.sh
```

### Weekly Maintenance

#### Sunday 2 AM - Full Backup & Optimization
```bash
# 1. Create backup
/home/user/TEEI-CSR-Platform/scripts/infra/clickhouse-backup.sh backup

# 2. Optimize tables (merge small parts)
clickhouse-client --query "OPTIMIZE TABLE events_local;"
clickhouse-client --query "OPTIMIZE TABLE metrics_company_period_local;"

# 3. Clean up old backups
/home/user/TEEI-CSR-Platform/scripts/infra/clickhouse-backup.sh cleanup

# 4. Check for failed mutations
clickhouse-client --query "
SELECT * FROM system.mutations WHERE is_done = 0;
"
```

### Emergency Procedures

#### Full Cluster Failure Recovery
```bash
# 1. Assess damage
kubectl get pods -n teei-platform | grep clickhouse

# 2. Restore from latest backup
LATEST_BACKUP=$(./scripts/infra/clickhouse-backup.sh list | grep teei-platform | tail -1)
./scripts/infra/clickhouse-backup.sh restore "$LATEST_BACKUP"

# 3. Verify data integrity
clickhouse-client --query "
SELECT
    table,
    sum(rows) AS total_rows
FROM system.parts
WHERE active AND database = 'default'
GROUP BY table;
"

# 4. Resume normal operations
kubectl rollout status statefulset/clickhouse-us -n teei-platform
kubectl rollout status statefulset/clickhouse-eu -n teei-platform
```

---

## Performance Tuning

### Best Practices

1. **Batch Inserts**: Insert 10k-100k rows per batch
   ```javascript
   // Good: Batch insert
   await clickhouse.insert('events_distributed', events); // 50k rows

   // Bad: Row-by-row insert
   for (const event of events) {
       await clickhouse.insert('events_distributed', [event]); // Slow!
   }
   ```

2. **Use Async Inserts** (ClickHouse 21.11+):
   ```sql
   SET async_insert = 1;
   SET wait_for_async_insert = 0;
   INSERT INTO events_distributed VALUES (...);
   ```

3. **Optimize Partitioning**:
   - Monthly partitions for high-volume tables
   - Yearly partitions for low-volume tables
   - Avoid too many partitions (>1000)

4. **Index Selection**:
   - Primary key: Use for ORDER BY
   - Bloom filters: Use for existence checks (`WHERE company_id IN (...)`)
   - Skip indexes: Use for range queries

5. **Query Optimization**:
   - Use `PREWHERE` instead of `WHERE` for filtering
   - Limit result sets with `LIMIT`
   - Avoid `SELECT *` (specify columns)

---

## Appendix

### Configuration Files

- K8s StatefulSets: `/k8s/base/clickhouse/statefulset-{us,eu}.yaml`
- Services: `/k8s/base/clickhouse/service.yaml`
- Cluster Config: `/k8s/base/clickhouse/config.d/clusters.xml`
- Tables DDL: `/scripts/infra/clickhouse-tables.sql`
- TTL Policies: `/scripts/infra/clickhouse-ttl.sql`
- Sharding Logic: `/scripts/infra/clickhouse-sharding.sql`
- Backup Script: `/scripts/infra/clickhouse-backup.sh`
- Grafana Dashboard: `/observability/grafana/dashboards/clickhouse-replication.json`

### Useful Links

- [ClickHouse Documentation](https://clickhouse.com/docs)
- [ReplicatedMergeTree Engine](https://clickhouse.com/docs/en/engines/table-engines/mergetree-family/replication)
- [clickhouse-backup Tool](https://github.com/Altinity/clickhouse-backup)
- [ClickHouse Monitoring](https://clickhouse.com/docs/en/operations/monitoring)
- [GDPR Compliance](https://gdpr-info.eu/)

### Support Contacts

- **ClickHouse Issues**: #clickhouse-support (Slack)
- **Backup Issues**: #platform-ops (Slack)
- **GDPR Questions**: #legal-compliance (Slack)
- **On-Call**: PagerDuty rotation

---

**Last Updated**: 2025-11-15
**Maintained By**: Platform Engineering Team (clickhouse-replicator agent)
**Review Cycle**: Quarterly
