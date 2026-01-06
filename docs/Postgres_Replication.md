# PostgreSQL Cross-Region Logical Replication

**Version**: 1.0
**Last Updated**: 2025-11-15
**Status**: Production Ready
**Owner**: Infrastructure Team / pg-replication-engineer

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Requirements](#requirements)
4. [Setup & Deployment](#setup--deployment)
5. [Data Residency & GDPR Compliance](#data-residency--gdpr-compliance)
6. [Monitoring & Alerts](#monitoring--alerts)
7. [Failover Procedures](#failover-procedures)
8. [Troubleshooting](#troubleshooting)
9. [Performance Tuning](#performance-tuning)
10. [Security](#security)
11. [Maintenance](#maintenance)
12. [References](#references)

---

## Overview

This document describes the PostgreSQL logical replication setup for the TEEI CSR Platform, providing cross-region disaster recovery between US East 1 (primary) and EU Central 1 (replica).

### Key Features

- **Async Logical Replication**: PostgreSQL 15+ logical replication with row-level filtering
- **Cross-Region DR**: US East 1 → EU Central 1 replication for disaster recovery
- **Data Residency**: Row-level filtering to ensure EU data stays in EU (GDPR compliance)
- **<5 Second Lag**: Target replication lag under 5 seconds under normal load
- **Automated Monitoring**: Grafana dashboards with alerts for lag >30 seconds
- **Manual Failover**: Promotion scripts for <5 minute failover to EU region

### Architecture Principles

1. **Performance over Consistency**: Async replication prioritizes performance for DR use case
2. **Data Sovereignty**: EU companies' PII never leaves EU region
3. **Automated Monitoring**: Continuous lag monitoring with alerts
4. **Manual Failover**: Deliberate human-in-the-loop for failover decisions
5. **Bidirectional Ready**: Architecture supports bidirectional replication if needed

---

## Architecture

### Topology Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         US East 1 (Primary)                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Primary                                           │  │
│  │  - Role: PRIMARY                                              │  │
│  │  - Write Operations: ✓                                        │  │
│  │  - Read Operations: ✓                                         │  │
│  │  - Publication: teei_us_only (with row filters)              │  │
│  │  - Replication Slot: teei_eu_slot                            │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Data:                                                   │  │  │
│  │  │  - US Companies (all data)                              │  │  │
│  │  │  - Global reference data                                │  │  │
│  │  │  - System metadata                                      │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                              │                                       │
└──────────────────────────────┼───────────────────────────────────────┘
                               │
                               │ Logical Replication
                               │ (Async, <5s lag)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────────┐
│                      EU Central 1 (Replica)                         │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │  PostgreSQL Replica                                           │  │
│  │  - Role: REPLICA                                              │  │
│  │  - Write Operations: ✗ (read-only)                           │  │
│  │  - Read Operations: ✓                                         │  │
│  │  - Subscription: teei_us_subscription                         │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │  Data:                                                   │  │  │
│  │  │  - US Companies (replicated from US)                    │  │  │
│  │  │  - EU Companies (EU-only, NOT replicated from US)       │  │  │
│  │  │  - Global reference data                                │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
```

### Component Architecture

#### Primary Database (US East 1)

- **StatefulSet**: `postgres` (1 replica)
- **Service**: `postgres-primary` (LoadBalancer, internal)
- **Publication**: `teei_us_only` (row-filtered for US companies)
- **Replication Slot**: `teei_eu_slot` (logical replication)
- **Storage**: 200Gi gp3 EBS volume
- **Resources**: 4-8Gi memory, 2-4 CPU cores

#### Replica Database (EU Central 1)

- **StatefulSet**: `postgres` (1 replica)
- **Service**: `postgres-replica` (LoadBalancer, internal)
- **Subscription**: `teei_us_subscription` (subscribes to `teei_us_only`)
- **Storage**: 150Gi gp3 EBS volume (smaller, EU data only)
- **Resources**: 4-8Gi memory, 2-4 CPU cores

#### Monitoring

- **PostgreSQL Exporter**: Exports replication metrics to Prometheus
- **Grafana Dashboard**: `postgres-replication.json` (20+ panels)
- **Alerts**:
  - Replication lag >30 seconds
  - WAL retention >1GB
  - Subscription inactive

---

## Requirements

### Software

- **PostgreSQL**: 15.0 or higher (required for row-level publication filters)
- **Kubernetes**: 1.24+ (StatefulSet support)
- **kubectl**: Latest version
- **psql**: PostgreSQL client
- **Prometheus**: For metrics collection
- **Grafana**: For dashboards and alerts

### Infrastructure

- **Network**: Cross-region VPC peering or VPN (low latency preferred)
- **Storage**: gp3 EBS volumes (or equivalent high-performance storage)
- **DNS**: Internal DNS or ExternalDNS for service discovery
- **Monitoring**: Prometheus + Grafana stack

### Network Requirements

- **Latency**: <50ms between US East 1 and EU Central 1 (recommended)
- **Bandwidth**: >100 Mbps sustained (depends on workload)
- **Ports**:
  - PostgreSQL: 5432 (internal LoadBalancer)
  - Metrics: 9187 (PostgreSQL Exporter)

---

## Setup & Deployment

### 1. Deploy PostgreSQL to US East 1 (Primary)

```bash
# Apply base configuration
kubectl apply -k k8s/overlays/us-east-1

# Verify deployment
kubectl get statefulset postgres -n teei-us-east-1
kubectl get pods -l app=postgres -n teei-us-east-1
kubectl get svc postgres-primary -n teei-us-east-1

# Check logs
kubectl logs -f postgres-0 -c postgres -n teei-us-east-1
```

### 2. Deploy PostgreSQL to EU Central 1 (Replica)

```bash
# Apply base configuration
kubectl apply -k k8s/overlays/eu-central-1

# Verify deployment
kubectl get statefulset postgres -n teei-eu-central-1
kubectl get pods -l app=postgres -n teei-eu-central-1
kubectl get svc postgres-replica -n teei-eu-central-1

# Check logs
kubectl logs -f postgres-0 -c postgres -n teei-eu-central-1
```

### 3. Setup Replication

```bash
# Set environment variables
export PRIMARY_HOST="postgres-primary-us.teei.internal"
export REPLICA_HOST="postgres-replica-eu.teei.internal"
export POSTGRES_PASSWORD="<your-secure-password>"
export REPLICATION_PASSWORD="<your-replication-password>"

# Initialize primary
./scripts/infra/setup-postgres-replication.sh primary

# Initialize replica
./scripts/infra/setup-postgres-replication.sh replica

# Verify replication
./scripts/infra/setup-postgres-replication.sh verify
```

### 4. Configure Data Residency

```bash
# Apply data residency configuration
psql -h $PRIMARY_HOST -U teei_user -d teei_platform \
  -f scripts/infra/postgres-residency-replication.sql

# Verify publications with row filters
psql -h $PRIMARY_HOST -U teei_user -d teei_platform \
  -c "\dRp+"
```

### 5. Deploy Monitoring

```bash
# Deploy Grafana dashboard
kubectl apply -f observability/grafana/dashboards/postgres-replication.json

# Access Grafana
kubectl port-forward svc/grafana 3000:3000 -n observability

# Open browser: http://localhost:3000
# Dashboard: "TEEI Platform - PostgreSQL Cross-Region Replication"
```

---

## Data Residency & GDPR Compliance

### Row-Level Filtering

PostgreSQL 15+ supports row-level filtering in publications, allowing selective replication based on data region.

#### Publication Configuration

```sql
-- US-only publication (replicates to EU for DR)
CREATE PUBLICATION teei_us_only FOR TABLE companies
WHERE (data_region = 'us-east-1' OR data_region IS NULL);

-- EU companies are NOT included in this publication
-- They exist only in EU database
```

#### Region Assignment

All sensitive tables have a `data_region` column that determines residency:

- **companies**: `data_region` VARCHAR(20) - Primary region assignment
- **users**: `data_region` VARCHAR(20) - Inherited from company
- **projects**: `data_region` VARCHAR(20) - Inherited from company

Triggers automatically assign regions based on company ownership:

```sql
-- Automatic region assignment trigger
CREATE TRIGGER enforce_company_region
    BEFORE INSERT OR UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION enforce_data_residency();
```

#### Data Residency Rules

| Company Region | Primary Storage | Replicated To | PII Location |
|---------------|-----------------|---------------|--------------|
| **us-east-1** | US East 1       | EU Central 1  | Both regions |
| **eu-central-1** | EU Central 1   | NONE          | EU only      |

**GDPR Compliance**: EU companies' PII never leaves EU region, satisfying data residency requirements.

### Row-Level Security (RLS)

Additional protection via PostgreSQL Row-Level Security:

```sql
-- Enable RLS
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access data in their region
CREATE POLICY company_region_isolation ON companies
    FOR ALL
    USING (
        data_region = current_setting('app.current_region', true)
        OR current_user IN ('teei_user', 'replicator')
    );
```

Application sets region via session variable:

```sql
SET app.current_region = 'eu-central-1';
```

---

## Monitoring & Alerts

### Grafana Dashboard

**Dashboard**: `TEEI Platform - PostgreSQL Cross-Region Replication`
**Location**: `/observability/grafana/dashboards/postgres-replication.json`

#### Key Metrics

1. **Replication Lag (Seconds)**: Time difference between primary and replica
   - **Target**: <5 seconds
   - **Warning**: >5 seconds
   - **Critical**: >30 seconds

2. **Replication Lag (Bytes)**: WAL byte difference
   - Indicates backlog size
   - High values suggest network issues or replica performance problems

3. **Replication Status**: Active/inactive state
   - Should always be "streaming"
   - "catchup" indicates replica is behind

4. **WAL Generation Rate**: Rate of write activity on primary
   - Helps predict replica load
   - Spikes indicate high write activity

5. **Subscription Health**: Health of replica subscriptions
   - 1 = healthy, 0 = unhealthy
   - Alert on unhealthy state

### Alerts

Configured via Grafana alerts:

| Alert | Condition | Severity | Action |
|-------|-----------|----------|--------|
| **Replication Lag High** | Lag >30s for 5 min | Critical | Investigate replica performance, check network |
| **WAL Retention High** | Retained WAL >1GB | Warning | Check if replica is consuming WAL, may need slot cleanup |
| **Subscription Inactive** | Subscription stopped | Critical | Restart subscription, check credentials |
| **Replica Unreachable** | Connection failures | Critical | Check network, verify replica is running |

### Manual Monitoring

```bash
# Check replication status
./scripts/infra/setup-postgres-replication.sh status

# Check specific metrics
psql -h $PRIMARY_HOST -U teei_user -d teei_platform -c "
  SELECT * FROM pg_stat_replication;
"

# Check replica subscription
psql -h $REPLICA_HOST -U teei_user -d teei_platform -c "
  SELECT * FROM pg_stat_subscription;
"
```

---

## Failover Procedures

### When to Failover

Failover to EU Central 1 should be considered when:

1. **US East 1 Region Outage**: Complete AWS region failure
2. **Prolonged Network Partition**: US-EU connectivity loss >15 minutes
3. **Data Corruption in US**: Unrecoverable data corruption requiring rollback
4. **Planned Maintenance**: Extended maintenance requiring primary downtime

### Pre-Failover Checklist

- [ ] Verify EU replica is healthy and streaming
- [ ] Check replication lag is <10 seconds
- [ ] Confirm EU replica has recent data
- [ ] Notify all stakeholders (engineering, product, customers)
- [ ] Have rollback plan ready
- [ ] Backup current state of both databases

### Failover Steps

#### 1. Test Failover Readiness (Dry-Run)

```bash
# Test without making changes
./scripts/infra/postgres-failover.sh test
```

Review output:
- Subscription status
- Database size
- Table counts
- Active connections

#### 2. Execute Failover (PRODUCTION)

```bash
# Promote EU to primary
./scripts/infra/postgres-failover.sh promote
```

This script will:
1. Disable subscription on EU
2. Drop subscription connection
3. Promote EU replica to primary (set `POSTGRES_ROLE=primary`)
4. Create publication on EU for reverse replication
5. Update DNS to point to EU as primary
6. Update application configuration
7. Verify new primary is operational

**Duration**: ~5 minutes
**Downtime**: ~2 minutes (DNS propagation)

#### 3. Post-Failover Verification

```bash
# Check failover status
./scripts/infra/postgres-failover.sh status

# Verify applications are connecting to EU
kubectl get configmap -n teei-eu-central-1 -o yaml | grep PRIMARY_DB_HOST

# Check application health
kubectl get pods -n teei-eu-central-1

# Verify writes are working
psql -h $REPLICA_HOST -U teei_user -d teei_platform -c "
  INSERT INTO failover_test (message) VALUES ('Post-failover test');
  SELECT * FROM failover_test ORDER BY id DESC LIMIT 1;
"
```

#### 4. Monitor New Primary

- Watch Grafana dashboard for EU as primary
- Monitor application error rates
- Check database performance metrics
- Verify data integrity

### Rollback to US Primary

When US East 1 recovers:

```bash
# Rollback to US primary
./scripts/infra/postgres-failover.sh rollback
```

This will:
1. Verify US is available
2. Stop writes to EU (set read-only)
3. Set up reverse replication (EU → US)
4. Wait for sync
5. Promote US back to primary
6. Demote EU back to replica
7. Update DNS back to US

---

## Troubleshooting

### Common Issues

#### 1. Replication Lag Increasing

**Symptoms**: Lag >30 seconds, continuously growing

**Possible Causes**:
- High write load on primary
- Network congestion
- Replica performance issues (CPU, disk I/O)
- Large transactions

**Diagnosis**:
```bash
# Check WAL generation rate
psql -h $PRIMARY_HOST -U teei_user -d teei_platform -c "
  SELECT pg_wal_lsn_diff(pg_current_wal_lsn(), '0/0') AS total_wal;
"

# Check replica performance
kubectl top pod postgres-0 -n teei-eu-central-1

# Check network latency
ping postgres-replica-eu.teei.internal
```

**Solutions**:
- Scale up replica resources (CPU, memory)
- Improve network bandwidth
- Reduce write load on primary
- Consider batching large transactions

#### 2. Subscription Inactive

**Symptoms**: Subscription shows as disabled or not running

**Diagnosis**:
```bash
psql -h $REPLICA_HOST -U teei_user -d teei_platform -c "
  SELECT subname, subenabled, pid FROM pg_stat_subscription;
"
```

**Solutions**:
```bash
# Restart subscription
psql -h $REPLICA_HOST -U teei_user -d teei_platform -c "
  ALTER SUBSCRIPTION teei_us_subscription ENABLE;
"

# If still failing, recreate subscription
psql -h $REPLICA_HOST -U teei_user -d teei_platform -c "
  DROP SUBSCRIPTION teei_us_subscription;
"

# Re-run setup
./scripts/infra/setup-postgres-replication.sh replica
```

#### 3. High WAL Retention

**Symptoms**: Disk space filling up, `pg_wal` directory growing

**Diagnosis**:
```bash
psql -h $PRIMARY_HOST -U teei_user -d teei_platform -c "
  SELECT slot_name, pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal
  FROM pg_replication_slots;
"
```

**Solutions**:
```bash
# Drop inactive slots
psql -h $PRIMARY_HOST -U teei_user -d teei_platform -c "
  SELECT pg_drop_replication_slot('slot_name')
  WHERE active = false;
"

# Check if replica is consuming WAL
# If replica is down, consider dropping slot temporarily
```

#### 4. Data Residency Violation

**Symptoms**: EU data detected in US database

**Diagnosis**:
```bash
# Check for EU data in US
psql -h $PRIMARY_HOST -U teei_user -d teei_platform -c "
  SELECT COUNT(*) FROM companies WHERE data_region = 'eu-central-1';
"
```

**Solutions**:
- This should never happen with proper row filters
- If detected, immediately investigate and remove EU data from US
- Review publication filters
- Check for manual data imports bypassing triggers

---

## Performance Tuning

### Optimize Primary for Replication

```sql
-- Increase WAL senders and slots
ALTER SYSTEM SET max_wal_senders = 10;
ALTER SYSTEM SET max_replication_slots = 10;

-- Increase WAL size for better performance
ALTER SYSTEM SET max_wal_size = '4GB';
ALTER SYSTEM SET min_wal_size = '1GB';

-- Checkpoint tuning
ALTER SYSTEM SET checkpoint_timeout = '10min';
ALTER SYSTEM SET checkpoint_completion_target = 0.9;

-- Reload configuration
SELECT pg_reload_conf();
```

### Optimize Replica for Consumption

```sql
-- Hot standby feedback (reduces WAL retention on primary)
ALTER SYSTEM SET hot_standby_feedback = on;

-- Max standby delay
ALTER SYSTEM SET max_standby_streaming_delay = '30s';

-- Reload configuration
SELECT pg_reload_conf();
```

### Network Optimization

- Use VPC peering instead of VPN for lower latency
- Enable jumbo frames (MTU 9000) if supported
- Monitor network saturation
- Consider dedicated replication network

---

## Security

### Encryption

- **In-Transit**: SSL/TLS for replication connections (recommended)
- **At-Rest**: EBS volume encryption (required for production)

Enable SSL for replication:

```sql
-- Primary: require SSL
ALTER SYSTEM SET ssl = on;
ALTER SYSTEM SET ssl_cert_file = '/path/to/server.crt';
ALTER SYSTEM SET ssl_key_file = '/path/to/server.key';

-- Update pg_hba.conf
hostssl replication replicator 0.0.0.0/0 md5
```

### Credential Management

- Store credentials in Kubernetes Secrets
- Use SealedSecrets for encrypted storage in Git
- Rotate passwords quarterly
- Use strong passwords (32+ characters)

```bash
# Generate sealed secret
kubectl create secret generic postgres-secret \
  --from-literal=POSTGRES_PASSWORD=$(openssl rand -base64 32) \
  --from-literal=REPLICATION_PASSWORD=$(openssl rand -base64 32) \
  --dry-run=client -o yaml | \
  kubeseal -o yaml > postgres-sealed-secret.yaml
```

### Network Security

- Use internal LoadBalancers (no public IPs)
- Restrict access via NetworkPolicies
- Enable VPC flow logs
- Monitor for unauthorized access attempts

---

## Maintenance

### Regular Tasks

#### Daily

- Check replication lag (automated via Grafana)
- Review alerts in Grafana
- Monitor disk space

#### Weekly

- Review replication slot usage
- Check for dead subscriptions
- Analyze slow queries
- Review error logs

#### Monthly

- Test failover procedures (dry-run)
- Review and rotate backups
- Update documentation
- Capacity planning review

#### Quarterly

- Full failover test (in staging)
- Password rotation
- Security audit
- Performance baseline review

### Backup Strategy

Replication is **NOT** a backup. Maintain separate backups:

```bash
# pg_dump on primary
pg_dump -h $PRIMARY_HOST -U teei_user -d teei_platform \
  -F c -f backup-$(date +%Y%m%d).dump

# Store in S3
aws s3 cp backup-$(date +%Y%m%d).dump \
  s3://teei-backups/postgres/
```

Retention:
- Daily backups: 7 days
- Weekly backups: 4 weeks
- Monthly backups: 12 months

---

## References

### Documentation

- [PostgreSQL Logical Replication](https://www.postgresql.org/docs/15/logical-replication.html)
- [Row Filters in Publications](https://www.postgresql.org/docs/15/sql-createpublication.html)
- [Monitoring Replication](https://www.postgresql.org/docs/15/monitoring-stats.html#MONITORING-PG-STAT-REPLICATION-VIEW)
- [Kubernetes StatefulSets](https://kubernetes.io/docs/concepts/workloads/controllers/statefulset/)

### Related Files

- **K8s Base Config**: `/k8s/base/postgres/`
- **US East 1 Overlay**: `/k8s/overlays/us-east-1/postgres-patch.yaml`
- **EU Central 1 Overlay**: `/k8s/overlays/eu-central-1/postgres-patch.yaml`
- **Setup Script**: `/scripts/infra/setup-postgres-replication.sh`
- **Failover Script**: `/scripts/infra/postgres-failover.sh`
- **Data Residency SQL**: `/scripts/infra/postgres-residency-replication.sql`
- **Grafana Dashboard**: `/observability/grafana/dashboards/postgres-replication.json`

### Support

- **Team**: Infrastructure Team
- **Slack**: `#teei-infrastructure`
- **On-Call**: PagerDuty rotation
- **Runbooks**: `/docs/runbooks/postgres-replication/`

---

## Appendix

### Sample Commands

#### Check Current Role

```bash
# Primary
psql -h $PRIMARY_HOST -U teei_user -d teei_platform -c "
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM pg_publication) THEN 'PRIMARY'
    WHEN EXISTS (SELECT 1 FROM pg_subscription) THEN 'REPLICA'
    ELSE 'STANDALONE'
  END AS role;
"

# Replica
psql -h $REPLICA_HOST -U teei_user -d teei_platform -c "
  SELECT CASE
    WHEN EXISTS (SELECT 1 FROM pg_publication) THEN 'PRIMARY'
    WHEN EXISTS (SELECT 1 FROM pg_subscription) THEN 'REPLICA'
    ELSE 'STANDALONE'
  END AS role;
"
```

#### Monitor Replication in Real-Time

```bash
watch -n 5 'psql -h $PRIMARY_HOST -U teei_user -d teei_platform -c "
  SELECT
    client_addr,
    application_name,
    state,
    pg_wal_lsn_diff(pg_current_wal_lsn(), replay_lsn) / 1024 / 1024 AS lag_mb,
    now() - pg_last_xact_replay_timestamp() AS lag_seconds
  FROM pg_stat_replication;
"'
```

#### Test Data Residency

```bash
# Insert test companies
psql -h $PRIMARY_HOST -U teei_user -d teei_platform -c "
  INSERT INTO companies (id, name, data_region)
  VALUES
    (gen_random_uuid(), 'US Test Company', 'us-east-1'),
    (gen_random_uuid(), 'EU Test Company', 'eu-central-1');
"

# Verify US company replicated to EU
sleep 2
psql -h $REPLICA_HOST -U teei_user -d teei_platform -c "
  SELECT name, data_region FROM companies WHERE name LIKE '%Test%';
"

# EU company should NOT be in replica (only in EU primary)
```

---

**End of Document**
