# ClickHouse Multi-Region Deployment

This directory contains Kubernetes manifests for deploying ClickHouse with sharded replication across US and EU regions.

## Quick Start

### 1. Prerequisites

- Kubernetes 1.24+
- ZooKeeper cluster (3 nodes minimum)
- S3 buckets for backups
- `kubectl` and `kustomize` installed

### 2. Deploy ClickHouse

```bash
# Create namespace
kubectl create namespace teei-platform

# Deploy ZooKeeper first (if not already deployed)
kubectl apply -f ../observability/zookeeper/

# Apply ClickHouse manifests
kubectl apply -k /home/user/TEEI-CSR-Platform/k8s/base/clickhouse/

# Verify deployment
kubectl get pods -n teei-platform | grep clickhouse
```

### 3. Initialize Tables

```bash
# Wait for all pods to be ready
kubectl wait --for=condition=ready pod -l app=clickhouse -n teei-platform --timeout=300s

# Create tables and distributed schemas
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client < /home/user/TEEI-CSR-Platform/scripts/infra/clickhouse-tables.sql

# Apply TTL policies
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client < /home/user/TEEI-CSR-Platform/scripts/infra/clickhouse-ttl.sql
```

### 4. Verify Cluster Health

```bash
# Check cluster configuration
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
SELECT cluster, shard_num, replica_num, host_name
FROM system.clusters
WHERE cluster LIKE 'teei%'
ORDER BY cluster, shard_num, replica_num;
"

# Check replication status
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
SELECT database, table, is_leader, absolute_delay, queue_size
FROM system.replicas
WHERE database = 'default';
"
```

## Architecture

### US Cluster (teei_us_cluster)
- **Shards**: 3
- **Replicas per Shard**: 2
- **Pods**: clickhouse-us-0 through clickhouse-us-5
- **Region**: us-east-1

### EU Cluster (teei_eu_cluster)
- **Shards**: 2
- **Replicas per Shard**: 2
- **Pods**: clickhouse-eu-0 through clickhouse-eu-3
- **Region**: eu-central-1

### Global Cluster (teei_global_cluster)
- **Total Shards**: 5 (3 US + 2 EU)
- **Purpose**: Cross-region unified queries

## Configuration Files

| File                        | Description                                      |
|-----------------------------|--------------------------------------------------|
| `statefulset-us.yaml`       | US cluster StatefulSet (6 pods)                  |
| `statefulset-eu.yaml`       | EU cluster StatefulSet (4 pods)                  |
| `service.yaml`              | Headless and load balancer services              |
| `configmap.yaml`            | Cluster configuration (clusters.xml)             |
| `secret.yaml`               | ClickHouse credentials (seal before production!) |
| `pvc.yaml`                  | PersistentVolumeClaim documentation              |
| `kustomization.yaml`        | Kustomize configuration                          |
| `config.d/clusters.xml`     | Remote servers and ZooKeeper config              |
| `clickhouse-backup-config.yaml` | Backup tool configuration                    |

## Common Operations

### Scale Shards

**Add US Shard 4** (2 new pods):
```bash
# Update statefulset-us.yaml: replicas: 8
kubectl apply -k /home/user/TEEI-CSR-Platform/k8s/base/clickhouse/

# Update clusters.xml to add shard 4 configuration
# Restart pods to pick up new config
kubectl rollout restart statefulset/clickhouse-us -n teei-platform
```

### Backup & Restore

```bash
# Create backup
/home/user/TEEI-CSR-Platform/scripts/infra/clickhouse-backup.sh backup

# List backups
/home/user/TEEI-CSR-Platform/scripts/infra/clickhouse-backup.sh list

# Restore backup
/home/user/TEEI-CSR-Platform/scripts/infra/clickhouse-backup.sh restore teei-platform_20250115_120000
```

### Monitor Replication

```bash
# Real-time replication lag
watch -n 5 'kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
SELECT table, max(absolute_delay) AS max_lag_sec
FROM system.replicas
WHERE database = \"default\"
GROUP BY table;
"'
```

### Force TTL Cleanup

```bash
# Manually trigger TTL merge
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
OPTIMIZE TABLE events_local FINAL;
"
```

### GDPR Data Erasure

```bash
# Delete all data for a company (DSAR request)
COMPANY_ID="550e8400-e29b-41d4-a716-446655440000"

kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
ALTER TABLE events_local DELETE WHERE company_id = '$COMPANY_ID';
ALTER TABLE user_activity_local DELETE WHERE company_id = '$COMPANY_ID';
ALTER TABLE metrics_company_period_local DELETE WHERE company_id = '$COMPANY_ID';
"

# Monitor deletion progress
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
SELECT * FROM system.mutations WHERE is_done = 0;
"
```

## Troubleshooting

### Pod Won't Start

```bash
# Check pod logs
kubectl logs clickhouse-us-0 -n teei-platform

# Check events
kubectl describe pod clickhouse-us-0 -n teei-platform

# Common issues:
# 1. ZooKeeper not reachable → Check network policies
# 2. PVC not bound → Check storage class
# 3. Secrets missing → Apply secret.yaml
```

### Replica Lag

```bash
# Check replication status
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
SELECT
    database,
    table,
    is_leader,
    absolute_delay,
    queue_size,
    last_queue_update
FROM system.replicas
WHERE absolute_delay > 10;
"

# Solutions:
# 1. Check network between replicas
# 2. Verify ZooKeeper health
# 3. Restart lagging replica
```

### Out of Disk Space

```bash
# Check disk usage
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
SELECT
    name,
    path,
    formatReadableSize(total_space) AS total,
    formatReadableSize(free_space) AS free,
    round(free_space / total_space * 100, 2) AS free_percent
FROM system.disks;
"

# Solutions:
# 1. Force TTL cleanup: OPTIMIZE TABLE ... FINAL
# 2. Drop old partitions: ALTER TABLE ... DROP PARTITION 'old_partition'
# 3. Expand PVC: kubectl edit pvc data-clickhouse-us-0
```

## Security

### Production Secrets

**DO NOT use default passwords in production!** Seal secrets using `sealed-secrets`:

```bash
# 1. Create strong passwords
CLICKHOUSE_PASSWORD=$(openssl rand -base64 32)
INTERSERVER_PASSWORD=$(openssl rand -base64 32)

# 2. Create sealed secret
kubectl create secret generic clickhouse-credentials \
  --from-literal=password="$CLICKHOUSE_PASSWORD" \
  --from-literal=interserver_credentials="replica_user:$INTERSERVER_PASSWORD" \
  --from-literal=admin_password="$(openssl rand -base64 32)" \
  --dry-run=client -o yaml | \
  kubeseal --format=yaml > sealed-clickhouse-credentials.yaml

# 3. Apply sealed secret
kubectl apply -f sealed-clickhouse-credentials.yaml -n teei-platform
```

### Network Policies

Ensure network policies allow:
- ClickHouse pods → ZooKeeper (port 2181)
- ClickHouse pods → ClickHouse pods (ports 9000, 9009)
- Application pods → ClickHouse services (ports 8123, 9000)

## Monitoring

### Grafana Dashboard

Import dashboard: `/home/user/TEEI-CSR-Platform/observability/grafana/dashboards/clickhouse-replication.json`

**Key Metrics**:
- Replica lag (alert if >60 seconds)
- Disk usage (alert if >80%)
- Query latency (p95/p99)
- Replication queue length
- ZooKeeper connection status

### Prometheus Alerts

```yaml
groups:
  - name: clickhouse
    rules:
      - alert: ClickHouseReplicaLag
        expr: clickhouse_replica_absolute_delay > 60
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "ClickHouse replica lag >60 seconds"

      - alert: ClickHouseDiskUsage
        expr: clickhouse_disk_used_bytes / clickhouse_disk_total_bytes > 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "ClickHouse disk usage >80%"
```

## Documentation

For comprehensive documentation, see:
- **Main Docs**: `/home/user/TEEI-CSR-Platform/docs/ClickHouse_Replication.md`
- **Table DDL**: `/home/user/TEEI-CSR-Platform/scripts/infra/clickhouse-tables.sql`
- **TTL Policies**: `/home/user/TEEI-CSR-Platform/scripts/infra/clickhouse-ttl.sql`
- **Sharding Guide**: `/home/user/TEEI-CSR-Platform/scripts/infra/clickhouse-sharding.sql`
- **Backup Guide**: `/home/user/TEEI-CSR-Platform/scripts/infra/clickhouse-backup.sh`

## Support

- **Issues**: #clickhouse-support (Slack)
- **On-Call**: PagerDuty rotation
- **Runbooks**: See main documentation

---

**Last Updated**: 2025-11-15
**Maintained By**: clickhouse-replicator agent
