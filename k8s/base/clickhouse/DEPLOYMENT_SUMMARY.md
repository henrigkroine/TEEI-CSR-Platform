# ClickHouse Multi-Region Deployment Summary

## Architecture

**US Region (Primary)**
- 3 shards × 2 replicas = 6 pods
- Region: us-east-1
- Traffic: 60%

**EU Region (GDPR)**
- 2 shards × 2 replicas = 4 pods
- Region: eu-central-1
- Traffic: 40%

**Total**: 10 pods, 5 shards globally

## Quick Commands

### Deploy
```bash
# Automated deployment
./scripts/infra/deploy-clickhouse.sh

# Manual deployment
kubectl apply -k k8s/base/clickhouse/
kubectl wait --for=condition=ready pod -l app=clickhouse -n teei-platform --timeout=300s
```

### Initialize Tables
```bash
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client < scripts/infra/clickhouse-tables.sql
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client < scripts/infra/clickhouse-ttl.sql
```

### Verify Cluster
```bash
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
SELECT cluster, shard_num, replica_num, host_name
FROM system.clusters WHERE cluster LIKE 'teei%';
"
```

### Check Replication
```bash
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
SELECT database, table, is_leader, absolute_delay, queue_size
FROM system.replicas WHERE database = 'default';
"
```

### Backup & Restore
```bash
# Create backup
./scripts/infra/clickhouse-backup.sh backup

# Restore backup
./scripts/infra/clickhouse-backup.sh restore teei-platform_20250115_120000
```

## File Structure

### Kubernetes Manifests
- `statefulset-us.yaml` - US cluster (6 pods)
- `statefulset-eu.yaml` - EU cluster (4 pods)
- `service.yaml` - Headless and LB services
- `configmap.yaml` - Cluster configuration
- `secret.yaml` - Credentials (seal before production!)
- `config.d/clusters.xml` - Remote servers config
- `kustomization.yaml` - Kustomize config

### SQL Scripts
- `clickhouse-tables.sql` - Table DDL with replication
- `clickhouse-ttl.sql` - TTL policies (GDPR compliance)
- `clickhouse-sharding.sql` - Sharding strategy guide

### Operations
- `clickhouse-backup.sh` - Backup/restore automation
- `deploy-clickhouse.sh` - Deployment automation

### Monitoring
- `observability/grafana/dashboards/clickhouse-replication.json` - Grafana dashboard

### Documentation
- `docs/ClickHouse_Replication.md` - Comprehensive guide

## Table Creation Commands

Run these after deployment:

```bash
# On US cluster coordinator
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client

-- Create replicated tables
CREATE TABLE events_local ON CLUSTER teei_global_cluster (
    event_id UUID,
    company_id UUID,
    event_type String,
    timestamp DateTime64(3),
    region String,
    payload String
) ENGINE = ReplicatedMergeTree('/clickhouse/tables/{region}/{shard}/events', '{replica}')
PARTITION BY toYYYYMM(timestamp)
ORDER BY (company_id, timestamp)
TTL timestamp + INTERVAL 90 DAY DELETE;

-- Create distributed table
CREATE TABLE events_distributed ON CLUSTER teei_global_cluster AS events_local
ENGINE = Distributed(teei_global_cluster, default, events_local, cityHash64(company_id));
```

Full SQL in: `scripts/infra/clickhouse-tables.sql`

## Monitoring Setup

### Import Grafana Dashboard
```bash
# Dashboard file
observability/grafana/dashboards/clickhouse-replication.json

# Import via Grafana UI or API
curl -X POST http://grafana:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @observability/grafana/dashboards/clickhouse-replication.json
```

### Key Metrics to Monitor
- Replica lag (alert if >60s)
- Disk usage (alert if >80%)
- Replication queue length
- Query latency (p95/p99)
- ZooKeeper connection status

## TTL Policies

| Data Type | US Retention | EU Retention | Reason |
|-----------|--------------|--------------|--------|
| Raw Events | 90 days | 90 days | GDPR Article 5(1)(e) |
| Aggregates | 7 years | 2 years | SOX / GDPR |
| SROI/VIS | 7 years | 2 years | Financial compliance |

## GDPR Compliance

### Right to Erasure (Article 17)
```bash
COMPANY_ID="550e8400-e29b-41d4-a716-446655440000"

kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
ALTER TABLE events_local DELETE WHERE company_id = '$COMPANY_ID';
ALTER TABLE metrics_company_period_local DELETE WHERE company_id = '$COMPANY_ID';
"

# Monitor mutation progress
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
SELECT * FROM system.mutations WHERE is_done = 0;
"
```

## Troubleshooting

### Pod Won't Start
```bash
kubectl logs clickhouse-us-0 -n teei-platform
kubectl describe pod clickhouse-us-0 -n teei-platform
```

### Replica Lag
```bash
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
SELECT database, table, absolute_delay, queue_size
FROM system.replicas WHERE absolute_delay > 10;
"
```

### Out of Disk
```bash
# Force TTL cleanup
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
OPTIMIZE TABLE events_local FINAL;
"

# Drop old partitions
kubectl exec -it clickhouse-us-0 -n teei-platform -- clickhouse-client --query "
ALTER TABLE events_local DROP PARTITION '202401';
"
```

## Security Checklist

- [ ] Seal secrets with sealed-secrets or SOPS
- [ ] Configure network policies (ClickHouse ↔ ZooKeeper)
- [ ] Enable TLS for interserver communication
- [ ] Set up RBAC for ClickHouse users
- [ ] Configure S3 backup encryption
- [ ] Enable audit logging
- [ ] Rotate credentials quarterly

## Performance Tips

1. **Batch inserts**: 10k-100k rows per batch
2. **Use PREWHERE**: For filtering large datasets
3. **Include company_id**: In WHERE clause (shard pruning)
4. **Query local tables**: For debugging only
5. **Async inserts**: Enable for high throughput

## Next Steps

1. ✅ Deploy ClickHouse clusters
2. ✅ Initialize tables and TTL policies
3. ⬜ Configure backup automation (cron job)
4. ⬜ Import Grafana dashboard
5. ⬜ Set up Prometheus alerts
6. ⬜ Test GDPR erasure workflow
7. ⬜ Load test with production-like data
8. ⬜ Document runbooks for team

## Support

- Documentation: `docs/ClickHouse_Replication.md`
- Issues: #clickhouse-support (Slack)
- On-Call: PagerDuty rotation

---

**Created**: 2025-11-15
**Agent**: clickhouse-replicator
