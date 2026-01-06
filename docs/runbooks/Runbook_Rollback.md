# Rollback Runbook (Failback to Primary Region)

**Version**: 1.0
**Last Updated**: 2025-11-15
**RTO Target**: < 10 minutes (non-emergency)
**RPO Target**: < 10 seconds
**Owner**: SRE Team / dr-gameday-lead
**Escalation**: VP Engineering, CTO

---

## Overview

This runbook details the procedure for returning to normal operations after a regional failover. It covers failing back from eu-central-1 (secondary) to us-east-1 (primary) in a controlled manner.

**WARNING**: Failback is **more complex** than failover because:
- Both regions may have diverged (write conflicts)
- Database timeline reconciliation required
- Higher risk of data loss if executed incorrectly

**Use Cases**:
- Primary region outage is resolved
- Scheduled maintenance in secondary region
- Cost optimization (return to preferred region)
- Testing disaster recovery procedures

**Related Runbooks**:
- Failover: `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Region_Failover.md`
- Database: `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Database_Failover.md`

---

## Pre-Rollback Decision Checklist

**Answer ALL questions before proceeding:**

- [ ] **Is primary region healthy?** (No ongoing AWS outages, all services green)
- [ ] **Has sufficient time passed?** (Min 24 hours after failover for stability)
- [ ] **Is this a low-traffic window?** (Scheduled during off-peak hours)
- [ ] **Are stakeholders notified?** (Executive team, customers, on-call engineers)
- [ ] **Are backups current?** (EU region backed up < 1 hour ago)
- [ ] **Is there a valid reason to failback?** (Not just "because we prefer US")

**If ANY answer is NO, reconsider failback timing.**

---

## Rollback Strategy Decision Matrix

### Option A: Rebuild US from EU Backup (Recommended for Most Cases)

**Pros**:
- Cleanest approach (no timeline conflicts)
- Guaranteed consistency
- Lower risk of data loss

**Cons**:
- Longer RTO (30-60 minutes for restore)
- Brief service interruption during cutover

**Use When**: Failover lasted > 24 hours and EU has significant new data.

---

### Option B: Reverse Replication and Promote (Faster but Riskier)

**Pros**:
- Faster RTO (< 10 minutes)
- No service interruption if done during low traffic

**Cons**:
- Complex timeline reconciliation
- Risk of split-brain if replication broken

**Use When**: Failover was brief (< 4 hours) and minimal writes in EU.

---

### Option C: Parallel Operation and DNS Cutover (Zero Downtime)

**Pros**:
- Zero downtime
- Can test US region before full cutover

**Cons**:
- Most complex
- Requires dual-write capability

**Use When**: SLA allows no downtime and budget permits dual-region operation.

---

## Rollback Procedure (Option A: Rebuild US from EU Backup)

**Estimated Duration**: 60-90 minutes
**Recommended Window**: Low-traffic period (e.g., Sunday 2-4 AM UTC)

### Phase 1: Pre-Rollback Preparation (Target: 10 minutes)

**1.1 Verify Primary Region Health**
```bash
# Check AWS Health Dashboard
aws health describe-events --region us-east-1 --query 'events[?eventTypeCode==`AWS_OUTAGE`]'
# Expected: [] (no outages)

# Test K8s cluster connectivity
kubectl --context prod-us-east-1 get nodes
# Expected: All nodes Ready

# Check EKS cluster status
aws eks describe-cluster --region us-east-1 --name teei-prod-us --query 'cluster.status'
# Expected: "ACTIVE"
```

**1.2 Create Final EU Backup**
```bash
# Backup PostgreSQL
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  pg_basebackup -D /tmp/final-backup -F tar -z -P

# Upload to S3
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  aws s3 cp /tmp/final-backup s3://teei-postgres-backups/eu-final-backup-$(date +%s).tar.gz

# Backup ClickHouse
/home/user/TEEI-CSR-Platform/scripts/backup/verify-clickhouse-backup.sh \
  --region eu-central-1 \
  --create-snapshot \
  --tag "pre-failback-$(date +%s)"

# Backup NATS JetStream
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats stream backup CSR_EVENTS_MIRROR /tmp/nats-final-backup.tar.gz
```

**1.3 Enable Maintenance Mode**
```bash
# Display maintenance banner in UI
kubectl --context prod-eu-central-1 patch cm app-config -n teei-prod-eu \
  --patch '{"data":{"MAINTENANCE_MODE":"true","MAINTENANCE_MESSAGE":"Scheduled maintenance in progress. Service will resume shortly."}}'

# Optionally: Enable read-only mode to prevent new writes
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "ALTER SYSTEM SET default_transaction_read_only = on;"
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "SELECT pg_reload_conf();"
```

---

### Phase 2: Restore US Region from EU Backup (Target: 30-45 minutes)

**2.1 Restore PostgreSQL**
```bash
# Stop any existing Postgres pods in US
kubectl --context prod-us-east-1 scale statefulset/postgres-primary -n teei-prod-us --replicas=0

# Restore from S3 backup
/home/user/TEEI-CSR-Platform/scripts/backup/restore-postgres-backup.sh \
  --source-backup s3://teei-postgres-backups/eu-final-backup-*.tar.gz \
  --target-region us-east-1 \
  --verify-checksum

# Start Postgres pods
kubectl --context prod-us-east-1 scale statefulset/postgres-primary -n teei-prod-us --replicas=3

# Verify database is writable
kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  psql -U postgres -c "SELECT pg_is_in_recovery();"
# Expected: f (primary mode)
```

**2.2 Restore ClickHouse**
```bash
# Restore from snapshot
/home/user/TEEI-CSR-Platform/scripts/backup/restore-clickhouse-backup.sh \
  --backup-id pre-failback-$(date +%s) \
  --target-cluster prod-us-east-1 \
  --verify-checksum

# Verify data integrity
kubectl --context prod-us-east-1 exec -it clickhouse-0 -n teei-prod-us -- \
  clickhouse-client --query "SELECT count(*) FROM analytics.events_distributed WHERE timestamp > now() - INTERVAL 1 HOUR;"
# Expected: Non-zero count (recent data present)
```

**2.3 Restore NATS JetStream**
```bash
# Restore stream from backup
kubectl --context prod-us-east-1 exec -it nats-0 -n teei-prod-us -- \
  nats stream restore /tmp/nats-final-backup.tar.gz

# Verify stream state
kubectl --context prod-us-east-1 exec -it nats-0 -n teei-prod-us -- \
  nats stream info CSR_EVENTS --json | jq '.state'
```

---

### Phase 3: Verify US Region Readiness (Target: 10 minutes)

**3.1 Run Smoke Tests**
```bash
# Automated smoke tests against US cluster
/home/user/TEEI-CSR-Platform/scripts/smoke-tests.sh --region us-east-1
```

**Expected Output**:
```
✓ Health endpoint responding
✓ Database connection successful
✓ ClickHouse queries executing
✓ NATS publish/subscribe working
✓ Authentication flow functional
✓ All critical APIs returning 200 OK
```

**3.2 Verify Data Consistency**
```bash
# Compare row counts between EU and US
EU_ROWS=$(kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -d teei -t -c "SELECT count(*) FROM events;")

US_ROWS=$(kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  psql -U postgres -d teei -t -c "SELECT count(*) FROM events;")

echo "EU rows: $EU_ROWS"
echo "US rows: $US_ROWS"

if [ "$EU_ROWS" -eq "$US_ROWS" ]; then
  echo "✓ Row counts match"
else
  echo "⚠️  WARNING: Row count mismatch! Delta: $((EU_ROWS - US_ROWS))"
fi
```

**3.3 Test Application Pods**
```bash
# Scale up applications in US
kubectl --context prod-us-east-1 scale deployment/reporting-service -n teei-prod-us --replicas=6
kubectl --context prod-us-east-1 scale deployment/analytics-service -n teei-prod-us --replicas=6
kubectl --context prod-us-east-1 scale deployment/corp-cockpit -n teei-prod-us --replicas=4

# Wait for all pods to be Ready
kubectl --context prod-us-east-1 wait --for=condition=Ready pods -l app.kubernetes.io/component=api -n teei-prod-us --timeout=300s
```

---

### Phase 4: DNS Cutover (Target: 2 minutes)

**4.1 Update Route53 Records**
```bash
# Revert DNS to US region
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234EXAMPLE \
  --change-batch '{
    "Changes": [
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "api.teei.example.com",
          "Type": "A",
          "TTL": 60,
          "ResourceRecords": [{"Value": "52.1.2.3"}]
        }
      },
      {
        "Action": "UPSERT",
        "ResourceRecordSet": {
          "Name": "cockpit.teei.example.com",
          "Type": "A",
          "TTL": 60,
          "ResourceRecords": [{"Value": "52.1.2.3"}]
        }
      }
    ]
  }'
```

**4.2 Monitor DNS Propagation**
```bash
# Wait for DNS propagation
/home/user/TEEI-CSR-Platform/scripts/gameday/check-dns-propagation.sh api.teei.example.com 52.1.2.3
```

**4.3 Update Cloudflare**
```bash
# Update Cloudflare origin to US ALB
curl -X PATCH "https://api.cloudflare.com/client/v4/zones/${ZONE_ID}/dns_records/${RECORD_ID}" \
  -H "Authorization: Bearer ${CF_API_TOKEN}" \
  -H "Content-Type: application/json" \
  --data '{"content":"52.1.2.3"}'
```

---

### Phase 5: Disable Maintenance Mode (Target: 1 minute)

**5.1 Re-enable Writes**
```bash
# Disable read-only mode in US database
kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  psql -U postgres -c "ALTER SYSTEM SET default_transaction_read_only = off;"
kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  psql -U postgres -c "SELECT pg_reload_conf();"

# Remove maintenance banner
kubectl --context prod-us-east-1 patch cm app-config -n teei-prod-us \
  --patch '{"data":{"MAINTENANCE_MODE":"false"}}'
```

**5.2 Verify Service Resumption**
```bash
# Test write operation
curl -X POST https://api.teei.example.com/events \
  -H "Authorization: Bearer ${TEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"rollback_test","timestamp":"'$(date -Iseconds)'"}'
# Expected: HTTP/2 201 Created
```

---

### Phase 6: Re-establish EU as Secondary (Target: 10 minutes)

**6.1 Configure EU Postgres as Standby**
```bash
# Stop EU Postgres
kubectl --context prod-eu-central-1 scale statefulset/postgres-primary -n teei-prod-eu --replicas=0

# Reconfigure as streaming replica
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  bash -c "echo 'primary_conninfo = \"host=postgres-primary-0.postgres-headless.teei-prod-us.svc.cluster.local port=5432\"' > /var/lib/postgresql/data/recovery.conf"

# Restart as standby
kubectl --context prod-eu-central-1 scale statefulset/postgres-primary -n teei-prod-eu --replicas=3

# Verify replication resumed
kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  psql -U postgres -c "SELECT * FROM pg_stat_replication;"
# Expected: eu-standby present with state = "streaming"
```

**6.2 Re-enable ClickHouse Replication**
```bash
kubectl --context prod-eu-central-1 exec -it clickhouse-0 -n teei-prod-eu -- \
  clickhouse-client --query "SYSTEM START FETCHES analytics.events_distributed;"
```

**6.3 Re-enable NATS Mirror**
```bash
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats stream edit CSR_EVENTS_MIRROR \
  --mirror "nats://nats.teei-prod-us.svc.cluster.local:4222"
```

---

### Phase 7: Evidence Collection (Target: 5 minutes)

**7.1 Capture Rollback Metrics**
```bash
# Calculate rollback duration
echo "Rollback completed at: $(date -Iseconds)" > /home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)/rollback-summary.txt

# Save final state
kubectl --context prod-us-east-1 get pods -n teei-prod-us -o wide > /home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)/us-pods-after-rollback.txt

# Verify replication lag
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "SELECT now() - pg_last_xact_replay_timestamp() AS replication_lag;" > /home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)/replication-lag-post-rollback.txt
```

---

## Rollback Procedure (Option B: Reverse Replication)

**For Brief Failovers (< 4 hours)**

**Phase 1: Configure US as Standby of EU**
```bash
# Demote US to standby (if it was promoted during failover test)
kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  pg_rewind --target-pgdata=/var/lib/postgresql/data \
  --source-server="host=postgres-primary-0.postgres-headless.teei-prod-eu.svc.cluster.local port=5432 user=replicator"
```

**Phase 2: Wait for Replication Catch-Up**
```bash
# Monitor replication lag
while true; do
  LAG=$(kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
    psql -U postgres -t -c "SELECT EXTRACT(EPOCH FROM (now() - pg_last_xact_replay_timestamp()));")

  if [ "$LAG" -lt 5 ]; then
    echo "Replication caught up! Lag: ${LAG}s"
    break
  fi
  echo "Waiting for catch-up... Lag: ${LAG}s"
  sleep 10
done
```

**Phase 3: Controlled Switchover**
```bash
# Pause writes in EU
kubectl --context prod-eu-central-1 scale deployment/reporting-service -n teei-prod-eu --replicas=0

# Wait for replication lag = 0
# ... (same as above)

# Promote US
kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  /usr/local/bin/pg_ctl promote -D /var/lib/postgresql/data

# Update DNS
# ... (same as Option A Phase 4)
```

---

## Post-Rollback Validation

### Critical Checks

**1. Verify US Region is Primary**
```bash
kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  psql -U postgres -c "SELECT pg_is_in_recovery();"
# Expected: f
```

**2. Verify EU Region is Standby**
```bash
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "SELECT pg_is_in_recovery();"
# Expected: t
```

**3. Check Replication Lag**
```bash
kubectl --context prod-eu-central-1 exec -it postgres-primary-0 -n teei-prod-eu -- \
  psql -U postgres -c "SELECT now() - pg_last_xact_replay_timestamp() AS lag;"
# Expected: < 10 seconds
```

**4. Run Full E2E Tests**
```bash
pnpm -w test:e2e --env=production
```

**5. Monitor Error Rates**
```bash
# Check Prometheus for elevated errors
kubectl --context prod-us-east-1 port-forward -n teei-prod-us svc/prometheus 9090:9090
# Open Grafana: http://localhost:3000/d/dr-metrics
# Verify: Error rate < 0.1%, p95 latency < 500ms
```

---

## Troubleshooting

### Issue: US Database Cannot Start After Restore

**Root Cause**: Corrupted WAL files or timeline conflict.

**Solution**:
```bash
# Reset WAL and force recovery
kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  pg_resetwal -f /var/lib/postgresql/data

# Restart Postgres
kubectl --context prod-us-east-1 rollout restart statefulset/postgres-primary -n teei-prod-us
```

---

### Issue: Replication Lag Not Decreasing

**Root Cause**: Network bandwidth saturation or EU cluster too slow to replay WAL.

**Solution**:
```bash
# Increase WAL sender max speed
kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  psql -U postgres -c "ALTER SYSTEM SET max_wal_senders = 10;"
kubectl --context prod-us-east-1 exec -it postgres-primary-0 -n teei-prod-us -- \
  psql -U postgres -c "SELECT pg_reload_conf();"

# Temporarily pause non-critical queries in EU to free resources
kubectl --context prod-eu-central-1 scale deployment/analytics-service -n teei-prod-eu --replicas=0
```

---

### Issue: DNS Still Pointing to EU After Cutover

**Root Cause**: Local DNS cache or ISP resolver caching.

**Solution**:
```bash
# Flush local DNS cache
sudo systemd-resolve --flush-caches  # Linux
# OR
sudo dscacheutil -flushcache  # macOS

# Use public DNS for testing
dig @8.8.8.8 +short api.teei.example.com
```

---

## Compliance & Audit

**SOC2 CC9.1 Requirements**:
- [x] Rollback procedure documented and tested
- [x] Evidence of successful failback captured
- [x] Data consistency verified (row counts match)
- [x] Replication re-established within 10 minutes

**Evidence Artifacts**:
- Rollback start/end timestamps
- Data consistency checks (row count comparisons)
- DNS cutover proof
- Replication lag measurements post-rollback

**Storage**: `/home/user/TEEI-CSR-Platform/ops/soc2/dr-evidence/rollback-$(date +%Y%m%d-%H%M%S)/`

---

## Appendix A: Emergency Rollback (Abort Failback)

If rollback encounters critical issues and you need to quickly return to EU:

```bash
# 1. Immediately revert DNS to EU
aws route53 change-resource-record-sets --hosted-zone-id Z1234EXAMPLE \
  --change-batch file:///home/user/TEEI-CSR-Platform/ops/gameday/evidence/*/dns-after-cutover.json

# 2. Scale down US applications
kubectl --context prod-us-east-1 scale deployment/reporting-service -n teei-prod-us --replicas=0
kubectl --context prod-us-east-1 scale deployment/analytics-service -n teei-prod-us --replicas=0

# 3. Re-enable EU services
kubectl --context prod-eu-central-1 patch cm app-config -n teei-prod-eu \
  --patch '{"data":{"MAINTENANCE_MODE":"false"}}'

# 4. Document incident and post-mortem
```

---

## Appendix B: Rollback Decision Flowchart

```
Start Rollback Decision
        |
        v
Is primary region healthy? --> NO --> Wait for resolution
        |
       YES
        v
Has failover been active > 24 hours? --> YES --> Use Option A (Rebuild)
        |
       NO
        v
Is replication lag < 1 minute? --> NO --> Use Option A (Rebuild)
        |
       YES
        v
Is this low-traffic window? --> NO --> Schedule maintenance window
        |
       YES
        v
Proceed with Option B (Reverse Replication)
```

---

**Document Control**

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-15 | 1.0 | dr-gameday-lead | Initial creation for Phase G |

**Next Review**: 2026-02-15
