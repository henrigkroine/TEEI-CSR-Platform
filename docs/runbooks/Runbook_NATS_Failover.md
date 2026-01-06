# NATS JetStream Failover Runbook

**Version**: 1.0
**Last Updated**: 2025-11-15
**RTO Target**: < 1 minute
**RPO Target**: < 5 seconds
**Owner**: Messaging Infrastructure Team / backup-restore-auditor
**Escalation**: Platform Lead, SRE Lead

---

## Overview

This runbook details disaster recovery procedures for NATS JetStream, which provides event streaming and message persistence for the TEEI CSR Platform. NATS uses stream mirroring between us-east-1 (primary) and eu-central-1 (secondary).

**Architecture**:
- **Primary Cluster**: us-east-1 NATS JetStream (3-node cluster)
- **DR Cluster**: eu-central-1 NATS JetStream (3-node cluster with mirrors)
- **Replication**: JetStream mirror streams (near-real-time)
- **Backup**: Snapshot exports to S3 (hourly)

**Related Runbooks**:
- Parent: `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Region_Failover.md`
- NATS Setup: `/home/user/TEEI-CSR-Platform/docs/NATS_JetStream_DR.md`
- Quick Reference: `/home/user/TEEI-CSR-Platform/docs/NATS_Quick_Reference.md`

---

## Pre-Failover Assessment

### 1. Check Mirror Status

**On Primary Cluster (if accessible):**
```bash
# Check stream status
nats --server nats://nats.teei-prod-us.svc.cluster.local:4222 \
  --creds /etc/nats/creds/admin.creds \
  stream info CSR_EVENTS --json
```

**Expected Output**:
```json
{
  "config": {
    "name": "CSR_EVENTS",
    "subjects": ["csr.events.>"],
    "retention": "limits",
    "max_age": 604800000000000,
    "storage": "file",
    "replicas": 3
  },
  "state": {
    "messages": 1234567,
    "bytes": 12345678900,
    "first_seq": 1,
    "last_seq": 1234567,
    "consumer_count": 5
  }
}
```

**On DR Cluster:**
```bash
# Check mirror lag
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  stream info CSR_EVENTS_MIRROR --json
```

**Key Metrics**:
- `mirror.lag`: < 100 messages (acceptable)
- `mirror.active`: true (replication active)
- `state.last_seq` should be close to primary's `last_seq`

---

### 2. Verify Consumer Groups

**List Active Consumers:**
```bash
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  consumer ls CSR_EVENTS_MIRROR
```

**Expected Output**:
```
Consumers for Stream CSR_EVENTS_MIRROR:
  - analytics-consumer (delivered: 1234500, ack pending: 67)
  - reporting-consumer (delivered: 1234510, ack pending: 45)
  - audit-consumer (delivered: 1234567, ack pending: 0)
```

---

### 3. Calculate Replication Lag

**Calculate Message Lag:**
```bash
# Get primary last sequence
PRIMARY_SEQ=$(nats --server nats://nats.teei-prod-us.svc.cluster.local:4222 \
  --creds /etc/nats/creds/admin.creds \
  stream info CSR_EVENTS --json | jq '.state.last_seq')

# Get mirror last sequence
MIRROR_SEQ=$(kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  stream info CSR_EVENTS_MIRROR --json | jq '.state.last_seq')

# Calculate lag
echo "Replication lag: $((PRIMARY_SEQ - MIRROR_SEQ)) messages"
```

**Acceptance Criteria**:
- Lag < 100 messages → Proceed with failover
- Lag > 100 < 1000 messages → Wait 30 seconds, re-check
- Lag > 1000 messages → Investigate replication issue

---

### 4. Capture Pre-Failover Evidence

```bash
# Save stream state
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  stream report > /home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)/nats-pre-failover.txt
```

---

## Failover Procedure

### Phase 1: Promote Mirror to Source Stream (Target: 20 seconds)

**1.1 Stop Mirroring**
```bash
# Remove mirror configuration (converts to regular stream)
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  stream edit CSR_EVENTS_MIRROR --mirror ""
```

**1.2 Rename Stream (Optional - for clarity)**
```bash
# Note: Stream rename not supported in JetStream, skip this step
# Instead, update application configs to point to CSR_EVENTS_MIRROR
```

**1.3 Verify Stream is Writable**
```bash
# Publish test message
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  pub csr.events.dr.test "DR Test $(date +%s)"

# Verify message persisted
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  stream info CSR_EVENTS_MIRROR --json | jq '.state.last_seq'
# Expected: Sequence number incremented
```

---

### Phase 2: Update Consumer Configurations (Target: 20 seconds)

**2.1 Update Consumer Stream References**

Applications in EU region automatically connect to local NATS cluster via K8s service DNS:
- Connection URL: `nats://nats.teei-prod-eu.svc.cluster.local:4222`

**However**, consumers need to subscribe to the promoted stream:

**Option A: Update ConfigMap (Recommended)**
```bash
# Update stream name in application config
kubectl --context prod-eu-central-1 patch cm nats-config -n teei-prod-eu \
  --patch '{"data":{"NATS_STREAM_NAME":"CSR_EVENTS_MIRROR"}}'

# Rollout restart consumers
kubectl --context prod-eu-central-1 rollout restart deployment/analytics-service -n teei-prod-eu
kubectl --context prod-eu-central-1 rollout restart deployment/reporting-service -n teei-prod-eu
```

**Option B: Create Stream Alias (Alternative)**
```bash
# Create new stream that sources from mirror
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  stream add CSR_EVENTS \
  --subjects "csr.events.>" \
  --storage file \
  --replicas 3 \
  --source CSR_EVENTS_MIRROR
```

**2.2 Verify Consumers are Receiving Messages**
```bash
# Check consumer delivery stats
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  consumer info CSR_EVENTS_MIRROR analytics-consumer --json | jq '.delivered'
# Expected: delivered.last_active within last 10 seconds
```

---

### Phase 3: Update Publisher Configurations (Target: 15 seconds)

**3.1 Update Publisher Connection Strings**

Applications already use local NATS cluster, but need to publish to promoted stream:

```bash
# Update publisher config
kubectl --context prod-eu-central-1 patch cm nats-publisher-config -n teei-prod-eu \
  --patch '{"data":{"NATS_STREAM_NAME":"CSR_EVENTS_MIRROR"}}'

# Restart publisher pods
kubectl --context prod-eu-central-1 rollout restart deployment/event-publisher -n teei-prod-eu
```

**3.2 Test Publishing**
```bash
# Publish test event via API
curl -X POST https://api.teei.example.com/events \
  -H "Authorization: Bearer ${TEST_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "dr_failover_test",
    "tenant_id": "test_tenant",
    "timestamp": "'$(date -Iseconds)'"
  }'

# Verify event in stream
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  stream get CSR_EVENTS_MIRROR last
# Expected: Test event visible
```

---

### Phase 4: Verify Consumer Resume (Target: 10 seconds)

**4.1 Check Consumer Offset Preservation**
```bash
# Verify consumers resumed from last ack'd message (no message loss)
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  consumer report CSR_EVENTS_MIRROR
```

**Expected Output**:
```
Consumer report for Stream CSR_EVENTS_MIRROR

Consumer Name         | Mode    | Ack Pending | Redelivered | Unprocessed
----------------------|---------|-------------|-------------|--------------
analytics-consumer    | push    | 0           | 0           | 12
reporting-consumer    | pull    | 3           | 0           | 8
audit-consumer        | push    | 0           | 0           | 0
```

**Acceptance**:
- Ack Pending < 100 (consumers catching up)
- Redelivered = 0 (no duplicates)
- Unprocessed < 1000 (backlog manageable)

---

### Phase 5: Evidence Collection (Target: 10 seconds)

**5.1 Capture Post-Failover State**
```bash
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  stream report > /home/user/TEEI-CSR-Platform/ops/gameday/evidence/$(date +%Y%m%d-%H%M%S)/nats-post-failover.txt
```

**5.2 Calculate RPO**
```bash
# Compare sequence numbers
PRE_SEQ=$(grep "CSR_EVENTS_MIRROR" /home/user/TEEI-CSR-Platform/ops/gameday/evidence/*/nats-pre-failover.txt | awk '{print $5}')
POST_SEQ=$(grep "CSR_EVENTS_MIRROR" /home/user/TEEI-CSR-Platform/ops/gameday/evidence/*/nats-post-failover.txt | awk '{print $5}')

echo "Messages lost (if any): $((POST_SEQ - PRE_SEQ))"
# Expected: 0 (no message loss) or < 100 (acceptable)
```

---

## Post-Failover Validation

### Critical Checks

**1. Verify Stream Replication (Within EU)**
```bash
# Check that stream is replicated across 3 nodes in EU cluster
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  stream info CSR_EVENTS_MIRROR --json | jq '.cluster'
```

**Expected Output**:
```json
{
  "name": "eu-central-1",
  "leader": "nats-0",
  "replicas": [
    {"name": "nats-0", "current": true, "active": 12345},
    {"name": "nats-1", "current": true, "active": 12346},
    {"name": "nats-2", "current": true, "active": 12344}
  ]
}
```

**2. Monitor Message Throughput**
```bash
# Watch message rate
watch -n 5 "kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  stream info CSR_EVENTS_MIRROR --json | jq '.state.messages'"
# Expected: Message count increasing steadily
```

**3. Check Consumer Lag**
```bash
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  consumer report CSR_EVENTS_MIRROR
# Expected: Ack Pending decreasing over time
```

**4. Verify No Message Loss**
```bash
# Check for sequence number gaps
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  stream info CSR_EVENTS_MIRROR --json | jq '.state | {first_seq, last_seq, num_deleted}'
# Expected: num_deleted = 0 (no gaps)
```

---

## Failback Procedure (Return to US Primary)

**When to Failback**:
- US NATS cluster is healthy
- EU cluster has been running production traffic successfully
- Scheduled maintenance window

**Failback Steps**:

1. **Create New Mirror in US from EU**
   ```bash
   kubectl --context prod-us-east-1 exec -it nats-0 -n teei-prod-us -- \
     nats --server nats://localhost:4222 \
     --creds /etc/nats/creds/admin.creds \
     stream add CSR_EVENTS_MIRROR_FROM_EU \
     --mirror CSR_EVENTS_MIRROR \
     --mirror-external "nats://nats.teei-prod-eu.svc.cluster.local:4222"
   ```

2. **Wait for Mirror Catch-Up**
   ```bash
   # Monitor lag until < 100 messages
   watch -n 5 "kubectl --context prod-us-east-1 exec -it nats-0 -n teei-prod-us -- \
     nats stream info CSR_EVENTS_MIRROR_FROM_EU --json | jq '.mirror.lag'"
   ```

3. **Pause EU Publishers**
   ```bash
   kubectl --context prod-eu-central-1 scale deployment/event-publisher -n teei-prod-eu --replicas=0
   ```

4. **Promote US Stream**
   ```bash
   kubectl --context prod-us-east-1 exec -it nats-0 -n teei-prod-us -- \
     nats stream edit CSR_EVENTS_MIRROR_FROM_EU --mirror ""
   ```

5. **Update DNS and Resume Traffic in US**

**Detailed Procedure**: See `/home/user/TEEI-CSR-Platform/docs/runbooks/Runbook_Rollback.md`

---

## Troubleshooting

### Issue: Mirror Lag Not Decreasing

**Root Cause**: Network partition or primary cluster slow to respond.

**Diagnosis**:
```bash
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats --server nats://localhost:4222 \
  --creds /etc/nats/creds/admin.creds \
  stream info CSR_EVENTS_MIRROR --json | jq '.mirror.error'
```

**Solution**:
```bash
# Restart mirroring
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats stream edit CSR_EVENTS_MIRROR --mirror "" && \
  nats stream edit CSR_EVENTS_MIRROR --mirror "nats://nats.teei-prod-us.svc.cluster.local:4222"
```

---

### Issue: Consumers Not Receiving Messages After Failover

**Root Cause**: Consumers still subscribed to old stream name.

**Solution**:
```bash
# Delete old consumers and recreate
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats consumer rm CSR_EVENTS analytics-consumer --force

# Recreate on promoted stream
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats consumer add CSR_EVENTS_MIRROR analytics-consumer \
  --filter "csr.events.>" \
  --ack explicit \
  --pull \
  --deliver all \
  --max-deliver 5
```

---

### Issue: Message Duplication After Failover

**Root Cause**: Consumers reprocessing messages due to offset reset.

**Diagnosis**:
```bash
# Check redelivered count
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats consumer info CSR_EVENTS_MIRROR analytics-consumer --json | jq '.num_redelivered'
```

**Solution**:
- **Expected**: Idempotent message processing in consumers
- **Mitigation**: Use message deduplication based on event ID
- **Prevention**: Ensure consumers commit offsets before failover

---

## Backup & Restore Integration

### On-Demand Stream Snapshot

```bash
# Export stream state to S3
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats stream backup CSR_EVENTS_MIRROR /tmp/stream-backup.tar.gz

# Upload to S3
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  aws s3 cp /tmp/stream-backup.tar.gz s3://teei-nats-backups/eu-central-1/$(date +%Y%m%d-%H%M%S).tar.gz
```

### Restore from Backup

```bash
# Download from S3
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  aws s3 cp s3://teei-nats-backups/eu-central-1/20251115-102000.tar.gz /tmp/restore.tar.gz

# Restore stream
kubectl --context prod-eu-central-1 exec -it nats-0 -n teei-prod-eu -- \
  nats stream restore /tmp/restore.tar.gz
```

---

## Compliance & Audit

**SOC2 CC9.1 Requirements**:
- [x] RTO < 5 minutes (NATS component: < 1 minute)
- [x] RPO < 5 seconds (mirror replication lag)
- [x] Evidence of mirror lag captured
- [x] Message sequence comparison documented

**Evidence Artifacts**:
- Pre-failover stream report
- Post-failover stream report
- Consumer offset preservation
- RPO calculation (message sequence diff)

**Storage**: `/home/user/TEEI-CSR-Platform/ops/soc2/dr-evidence/nats/failover-$(date +%Y%m%d-%H%M%S)/`

---

## Appendix A: Stream Configuration

**Primary Stream (US):**
```json
{
  "name": "CSR_EVENTS",
  "subjects": ["csr.events.>"],
  "retention": "limits",
  "max_age": 604800000000000,
  "max_bytes": 107374182400,
  "storage": "file",
  "replicas": 3,
  "discard": "old"
}
```

**Mirror Stream (EU):**
```json
{
  "name": "CSR_EVENTS_MIRROR",
  "mirror": {
    "name": "CSR_EVENTS",
    "external": {
      "api": "nats://nats.teei-prod-us.svc.cluster.local:4222"
    }
  },
  "storage": "file",
  "replicas": 3
}
```

---

## Appendix B: Consumer Configuration Example

```json
{
  "stream_name": "CSR_EVENTS_MIRROR",
  "config": {
    "durable_name": "analytics-consumer",
    "deliver_policy": "all",
    "ack_policy": "explicit",
    "ack_wait": 30000000000,
    "max_deliver": 5,
    "filter_subject": "csr.events.analytics.>",
    "replay_policy": "instant"
  }
}
```

---

**Document Control**

| Date | Version | Author | Changes |
|------|---------|--------|---------|
| 2025-11-15 | 1.0 | backup-restore-auditor | Initial creation for Phase G |

**Next Review**: 2026-02-15
