# NATS JetStream Disaster Recovery (DR)

## Overview

This document describes the NATS JetStream configuration for the TEEI CSR Platform, including cross-region mirroring, disaster recovery failover, and message retention policies.

**Architecture**: Multi-region active-passive with bidirectional leafnode connectivity

**Regions**:
- **US (us-east-1)**: Primary JetStream cluster (3 nodes)
- **EU (eu-central-1)**: Replica JetStream cluster (3 nodes) + GDPR-native streams

**Key Features**:
- Cross-region stream mirroring for DR
- <10 second mirror lag target
- Automatic failover for client connections
- GDPR-compliant EU-only streams (no US replication)
- Retention policies: 7 days (transient), 90 days (audit), 30 days (metrics)
- File-based persistent storage (survives pod restarts)

---

## Architecture

### Cluster Topology

```
┌─────────────────────────────────────────────────────────────────────┐
│                         US Region (us-east-1)                       │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐                 │
│  │  nats-0   │────▶│  nats-1   │────▶│  nats-2   │                 │
│  │  Primary  │     │  Primary  │     │  Primary  │                 │
│  └─────┬─────┘     └─────┬─────┘     └─────┬─────┘                 │
│        │                 │                 │                       │
│        └─────────────────┴─────────────────┘                       │
│                          │                                         │
│                   JetStream Cluster                                │
│         ┌────────────────┴────────────────┐                        │
│         │ Streams:                        │                        │
│         │  - events-us (7d, 10Gi)         │                        │
│         │  - audit-us (90d, 50Gi)         │                        │
│         │  - metrics-us (30d, 20Gi)       │                        │
│         │  - notifications-us (14d, 5Gi)  │                        │
│         └─────────────────────────────────┘                        │
└─────────────────────────────┬───────────────────────────────────────┘
                              │
                       Leafnode Connection
                        (bidirectional)
                              │
┌─────────────────────────────┴───────────────────────────────────────┐
│                         EU Region (eu-central-1)                    │
│  ┌───────────┐     ┌───────────┐     ┌───────────┐                 │
│  │  nats-0   │────▶│  nats-1   │────▶│  nats-2   │                 │
│  │  Replica  │     │  Replica  │     │  Replica  │                 │
│  └─────┬─────┘     └─────┬─────┘     └─────┬─────┘                 │
│        │                 │                 │                       │
│        └─────────────────┴─────────────────┘                       │
│                          │                                         │
│                   JetStream Cluster                                │
│         ┌────────────────┴────────────────────────┐                │
│         │ Mirrors (from US):                      │                │
│         │  - events-eu-mirror                     │                │
│         │  - audit-eu-mirror                      │                │
│         │  - metrics-eu-mirror                    │                │
│         │                                         │                │
│         │ GDPR-Native (EU-only, no US mirror):    │                │
│         │  - events-eu-gdpr (7d, 10Gi)            │                │
│         │  - audit-eu-gdpr (90d, 20Gi)            │                │
│         └─────────────────────────────────────────┘                │
└─────────────────────────────────────────────────────────────────────┘
```

### Stream Configuration

#### US Primary Streams

| Stream | Subjects | Retention | Max Size | Replicas | Description |
|--------|----------|-----------|----------|----------|-------------|
| `events-us` | `events.*`, `buddy.*`, `kintell.*`, `upskilling.*`, `journey.*` | 7 days | 10Gi | 3 | Transient events from all services |
| `audit-us` | `audit.*`, `compliance.*`, `access-log.*` | 90 days | 50Gi | 3 | Audit and compliance events |
| `metrics-us` | `metrics.*`, `telemetry.*`, `health.*` | 30 days | 20Gi | 3 | Application and business metrics |
| `notifications-us` | `notifications.*`, `email.*`, `sms.*`, `push.*` | 14 days | 5Gi | 3 | User notifications |

#### EU Mirrors

| Stream | Mirrors | Lag Target | Description |
|--------|---------|------------|-------------|
| `events-eu-mirror` | `events-us` | <10s | Mirror of US events stream |
| `audit-eu-mirror` | `audit-us` | <10s | Mirror of US audit stream |
| `metrics-eu-mirror` | `metrics-us` | <10s | Mirror of US metrics stream |

#### EU GDPR-Native Streams (No US Mirror)

| Stream | Subjects | Retention | Max Size | Replicas | Description |
|--------|----------|-----------|----------|----------|-------------|
| `events-eu-gdpr` | `eu.events.*`, `eu.pii.*`, `gdpr.*` | 7 days | 10Gi | 3 | EU-only events (data sovereignty) |
| `audit-eu-gdpr` | `eu.audit.*`, `eu.compliance.*`, `gdpr.access-log.*` | 90 days | 20Gi | 3 | EU-only audit events |

### Leafnode Connectivity

**Purpose**: Enable message routing and stream mirroring between geographically distributed clusters without full mesh clustering.

**Configuration**:
- US cluster connects to EU via leafnode (and vice versa)
- Account: `APP`
- Authentication: JWT credentials (`leafnode.creds`)
- Port: 7422

**Advantages**:
- Lower latency tolerance than clustering (500ms+ WAN is OK)
- Supports subject filtering for bandwidth optimization
- Automatic reconnection on network failures
- Enables JetStream stream mirroring across regions

---

## Deployment

### Prerequisites

- Kubernetes cluster in each region (us-east-1, eu-central-1)
- StorageClass `fast-ssd` with at least 100Gi available per node (adjust in `statefulset.yaml` if needed)
- Prometheus for monitoring
- `nats` CLI tool for management
- `jq` for JSON parsing in scripts

### Step 1: Deploy Base Configuration

```bash
# Deploy US cluster
kubectl apply -k k8s/overlays/us-east-1/nats/

# Deploy EU cluster
kubectl apply -k k8s/overlays/eu-central-1/nats/
```

**Note**: You'll need to create region-specific overlays at `k8s/overlays/{region}/nats/` that:
1. Set the `NATS_DOMAIN` environment variable (`us-east-1` or `eu-central-1`)
2. Configure leafnode remotes to point to the other region
3. Update secrets with actual credentials (use Vault or SealedSecrets)

### Step 2: Verify Cluster Health

```bash
# Check US cluster
./scripts/infra/nats-failover.sh health-check

# Expected output:
# [INFO] === US Cluster (us-east-1) ===
# [INFO] US cluster is HEALTHY
# [INFO] === EU Cluster (eu-central-1) ===
# [INFO] EU cluster is HEALTHY
# [INFO] ✓ Both clusters are healthy
```

### Step 3: Create Streams

```bash
# Create US primary streams
export NATS_US_URL="nats://nats-lb.us-east-1.example.com:4222"
export NATS_CREDS="/path/to/app.creds"
./scripts/infra/nats-streams.sh create-us

# Create EU mirrors and GDPR streams
export NATS_EU_URL="nats://nats-lb.eu-central-1.example.com:4222"
./scripts/infra/nats-streams.sh create-eu
```

### Step 4: Verify Stream Replication

```bash
# Check stream status and mirror lag
./scripts/infra/nats-streams.sh status

# Expected output:
# [INFO] Stream: events-us
# Messages: 12345
# Bytes: 5.2Gi
# [INFO] Stream: events-eu-mirror
# Mirror lag: 3s - OK
```

### Step 5: Configure Monitoring

Import the Grafana dashboard:

```bash
# Import dashboard
kubectl create configmap nats-jetstream-dashboard \
  --from-file=observability/grafana/dashboards/nats-jetstream.json \
  -n observability

# Label for auto-discovery by Grafana
kubectl label configmap nats-jetstream-dashboard \
  grafana_dashboard=1 \
  -n observability
```

Access dashboard: `https://grafana.teei-platform.com/d/nats-jetstream-dr`

---

## Client Connection

### Connection Strings

**US Primary** (default):
```
nats://nats-lb.us-east-1.example.com:4222
```

**EU Replica**:
```
nats://nats-lb.eu-central-1.example.com:4222
```

**Failover URLs** (automatic failover):
```typescript
const natsConnection = await connect({
  servers: [
    "nats://nats-lb.us-east-1.example.com:4222",
    "nats://nats-lb.eu-central-1.example.com:4222"
  ],
  maxReconnectAttempts: -1,  // Infinite reconnect
  reconnectTimeWait: 1000,   // 1 second between attempts
  timeout: 5000,             // 5 second connection timeout
});
```

### Authentication

**Option 1**: User/Password (development only)
```typescript
const nc = await connect({
  servers: ["nats://nats-lb.us-east-1.example.com:4222"],
  user: "app_user",
  pass: process.env.NATS_PASSWORD,
});
```

**Option 2**: JWT Credentials (recommended for production)
```typescript
const nc = await connect({
  servers: ["nats://nats-lb.us-east-1.example.com:4222"],
  authenticator: credsAuthenticator(
    await Deno.readTextFile("/etc/nats-secret/app.creds")
  ),
});
```

### Publishing Messages

```typescript
// Publish to US primary (auto-replicated to EU)
await nc.publish("events.user.login", JSON.stringify({
  userId: "12345",
  timestamp: Date.now(),
}));

// Publish to EU GDPR stream (EU-only, no US replication)
await nc.publish("eu.events.gdpr.consent", JSON.stringify({
  userId: "67890",
  action: "consent_granted",
  timestamp: Date.now(),
}));
```

### Consuming Messages

```typescript
const js = nc.jetstream();

// Create consumer for events stream
const consumer = await js.consumers.get("events-us", "my-service-consumer");

// Consume messages
const messages = await consumer.consume();
for await (const msg of messages) {
  console.log(`Received: ${msg.subject}`, msg.data);
  msg.ack();
}
```

---

## Disaster Recovery Procedures

### Scenario 1: US Cluster Down (Failover to EU)

**Symptoms**:
- US cluster unreachable
- Client connection errors
- Alert: "US cluster health check failed"

**Steps**:

1. **Verify EU cluster is healthy**:
   ```bash
   ./scripts/infra/nats-failover.sh health-check
   ```

2. **Promote EU mirrors to primary streams**:
   ```bash
   ./scripts/infra/nats-failover.sh failover-to-eu
   ```

   This script will:
   - Delete EU mirror streams (`events-eu-mirror`, `audit-eu-mirror`, `metrics-eu-mirror`)
   - Create new primary streams in EU (`events-eu`, `audit-eu`, `metrics-eu`)
   - Update active endpoint file

3. **Update DNS** (manual step):
   ```bash
   # Update DNS record to point to EU cluster
   # nats.teei-platform.com -> nats-lb.eu-central-1.example.com
   ```

4. **Restart application pods** (to pick up new NATS URL):
   ```bash
   kubectl rollout restart deployment -l app.kubernetes.io/part-of=teei-platform
   ```

5. **Monitor application logs** for connection errors

6. **Verify failover**:
   ```bash
   ./scripts/infra/nats-failover.sh status
   # Expected: Active endpoint: nats-lb.eu-central-1.example.com
   ```

**RTO (Recovery Time Objective)**: ~5-10 minutes (manual steps)

**RPO (Recovery Point Objective)**: <10 seconds (mirror lag)

### Scenario 2: Failback to US (Restore Normal Operations)

**Prerequisites**:
- US cluster is healthy
- EU is currently active (after failover)

**Steps**:

1. **Verify US cluster is healthy**:
   ```bash
   ./scripts/infra/nats-failover.sh health-check
   ```

2. **Failback to US**:
   ```bash
   ./scripts/infra/nats-failover.sh failback-to-us
   ```

   This script will:
   - Delete EU primary streams (`events-eu`, `audit-eu`, `metrics-eu`)
   - Recreate EU mirrors from US (`events-eu-mirror`, etc.)
   - Update active endpoint file

3. **Update DNS** (manual step):
   ```bash
   # Update DNS record to point back to US cluster
   # nats.teei-platform.com -> nats-lb.us-east-1.example.com
   ```

4. **Restart application pods**:
   ```bash
   kubectl rollout restart deployment -l app.kubernetes.io/part-of=teei-platform
   ```

5. **Monitor mirror lag** to ensure replication is working:
   ```bash
   ./scripts/infra/nats-streams.sh status
   ```

### Scenario 3: Split-Brain Prevention

**Problem**: Both US and EU clusters are accepting writes (split-brain scenario)

**Prevention**:
- Use DNS-based service discovery with single active endpoint
- Application connection strings should NOT hardcode both regions
- Auto-failover should update DNS atomically

**Detection**:
- Monitor for duplicate message IDs (JetStream deduplication window)
- Alert on diverging stream message counts between regions

**Resolution**:
1. Identify which region is the source of truth (usually US)
2. Stop applications from writing to the other region
3. Delete and recreate mirrors in the passive region
4. Resume normal operations

---

## Retention Policy Management

### Check Current Retention Settings

```bash
./scripts/infra/nats-retention.sh check
```

Output:
```
Stream: events-us
  Expected: Transient events (buddy, kintell, journey)
  Policy: max_age=7d, max_bytes=10Gi
  Current: age=7d, bytes=10737418240, messages=123456, size=5368709120
```

### Update Retention Policies

```bash
./scripts/infra/nats-retention.sh update
```

This updates all streams to match the policy definitions in the script.

### Enforce Limits (Purge Old Messages)

```bash
./scripts/infra/nats-retention.sh enforce
```

**Warning**: This will purge messages that exceed age or size limits. Use with caution.

### Generate Retention Report

```bash
./scripts/infra/nats-retention.sh report
```

Generates a detailed report saved to `/tmp/nats-retention-report-{timestamp}.txt`.

---

## Monitoring & Alerting

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|-----------------|
| `up{job="nats"}` | NATS server health | < 3 nodes per region |
| `gnatsd_jetstream_mirror_lag_seconds` | Mirror replication lag | > 60 seconds |
| `gnatsd_jetstream_consumer_num_pending` | Consumer lag (messages) | > 10,000 messages |
| `gnatsd_jetstream_stream_bytes` | Stream storage usage | > 80% of max_bytes |
| `gnatsd_varz_in_msgs` | Inbound message rate | N/A (monitoring only) |
| `gnatsd_varz_out_msgs` | Outbound message rate | N/A (monitoring only) |

### Grafana Dashboard

Access: `https://grafana.teei-platform.com/d/nats-jetstream-dr`

**Panels**:
1. **Cluster Health**: Node count per region
2. **Mirror Lag**: Replication lag (EU mirrors)
3. **Message Rate**: Inbound/outbound messages per second
4. **Consumer Lag**: Pending messages per consumer
5. **Storage Usage**: Disk usage per stream
6. **Memory/CPU**: Node resource usage

### Alerting Rules (Prometheus)

```yaml
groups:
  - name: nats-jetstream
    interval: 30s
    rules:
      # Cluster health
      - alert: NATSClusterNodesDown
        expr: count(up{job="nats"} == 1) by (region) < 3
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "NATS cluster has less than 3 nodes in {{ $labels.region }}"

      # Mirror lag
      - alert: NATSMirrorLagHigh
        expr: gnatsd_jetstream_mirror_lag_seconds > 60
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "NATS mirror lag is {{ $value }}s for {{ $labels.stream }}"

      # Consumer lag
      - alert: NATSConsumerLagHigh
        expr: gnatsd_jetstream_consumer_num_pending > 10000
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Consumer {{ $labels.consumer }} has {{ $value }} pending messages"

      # Storage usage
      - alert: NATSStreamStorageHigh
        expr: 100 * gnatsd_jetstream_stream_bytes / gnatsd_jetstream_stream_max_bytes > 80
        for: 15m
        labels:
          severity: warning
        annotations:
          summary: "Stream {{ $labels.stream }} is at {{ $value }}% storage capacity"
```

---

## Troubleshooting

### Issue: US cluster unreachable

**Symptoms**:
- `nats server ping` fails
- Client connection timeouts
- Pods in `CrashLoopBackOff`

**Diagnosis**:
```bash
# Check pod status
kubectl get pods -n teei-platform -l app=nats

# Check pod logs
kubectl logs -n teei-platform nats-0 -c nats --tail=100

# Check service endpoints
kubectl get endpoints -n teei-platform nats
```

**Resolution**:
- If networking issue: Check security groups, network policies
- If pod crash: Check logs for errors, verify PVC is mounted
- If quorum lost: Manually restart pods in sequence

### Issue: High mirror lag

**Symptoms**:
- Mirror lag > 60 seconds
- EU data is stale

**Diagnosis**:
```bash
# Check mirror status
nats stream info events-eu-mirror --server="$NATS_EU_URL" --creds="$NATS_CREDS"

# Check leafnode connectivity
nats server list --server="$NATS_EU_URL" --creds="$NATS_CREDS"
```

**Resolution**:
- Check network latency between regions (should be <100ms)
- Verify leafnode connection is active
- Check EU cluster resource usage (CPU, memory, disk I/O)
- Consider increasing EU cluster resources

### Issue: Consumer lag increasing

**Symptoms**:
- Consumer pending messages > 10,000
- Slow message processing

**Diagnosis**:
```bash
# Check consumer info
nats consumer info events-us my-consumer --server="$NATS_US_URL" --creds="$NATS_CREDS"

# Check consumer connection
nats consumer next events-us my-consumer --server="$NATS_US_URL" --creds="$NATS_CREDS"
```

**Resolution**:
- Scale up consumer application (more pods)
- Optimize message processing logic
- Consider using work queue pattern (multiple consumers)
- Check for slow database queries or external API calls

### Issue: Stream storage full

**Symptoms**:
- Storage usage > 90%
- Alert: "NATSStreamStorageHigh"

**Diagnosis**:
```bash
# Check stream info
nats stream info events-us --server="$NATS_US_URL" --creds="$NATS_CREDS"

# Check retention policy
./scripts/infra/nats-retention.sh check
```

**Resolution**:
- Purge old messages: `./scripts/infra/nats-retention.sh enforce`
- Reduce retention period (if acceptable)
- Increase `max_bytes` limit (requires stream edit)
- Add more storage to PVCs (requires PVC expansion)

### Issue: Duplicate messages after failover

**Symptoms**:
- Same message processed twice
- Duplicate IDs in database

**Diagnosis**:
- Check JetStream deduplication window (default: 2 minutes)
- Verify application is using message IDs for idempotency

**Resolution**:
- Increase deduplication window: `--dupe-window 5m`
- Implement idempotent message handlers in application
- Use database constraints to prevent duplicate inserts

---

## Security Considerations

### Authentication

- **Production**: Use JWT credentials with NKeys (not user/password)
- **Secrets**: Store credentials in Vault or Kubernetes Secrets (sealed)
- **Rotation**: Rotate credentials every 90 days

### Authorization

- **Accounts**: Separate system account (`SYS`) from application account (`APP`)
- **Permissions**: Use subject-based permissions to limit access
- **Exports**: Only export subjects that need cross-account access

### Network Security

- **TLS**: Enable TLS for client and cluster connections in production
- **Network Policies**: Restrict pod-to-pod traffic to NATS namespace
- **Firewall**: Limit leafnode port (7422) to known IP ranges

### Audit Logging

- **Enable**: Log all stream operations (create, delete, purge)
- **Retention**: Store audit logs in `audit-us` stream (90 days)
- **Review**: Regularly review audit logs for suspicious activity

---

## Performance Tuning

### JetStream Memory

- Default: 4Gi per node
- Increase if you have many in-memory streams
- Monitor: `gnatsd_jetstream_memory_used_bytes`

### JetStream Storage

- Default: 100Gi per node (SSD)
- Use fast storage (NVMe SSD) for best performance
- Monitor: `gnatsd_jetstream_file_store_used_bytes`

### Consumer Batch Size

- Default: 100 messages per pull
- Increase for high-throughput consumers (up to 1000)
- Decrease for low-latency requirements (down to 10)

### Slow Consumer Handling

- Set `max_ack_pending` to limit unacknowledged messages
- Configure `ack_wait` timeout (default: 30s)
- Use `max_deliver` to prevent infinite retries

---

## Backup & Recovery

### Stream Backup

**Manual backup** (exports stream to file):
```bash
nats stream backup events-us /backup/events-us-$(date +%Y%m%d).tar.gz \
  --server="$NATS_US_URL" \
  --creds="$NATS_CREDS"
```

**Automated backup** (daily via CronJob):
```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: nats-stream-backup
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: backup
            image: natsio/nats-box:latest
            command:
            - /bin/sh
            - -c
            - |
              for stream in events-us audit-us metrics-us; do
                nats stream backup "$stream" "/backup/${stream}-$(date +%Y%m%d).tar.gz" \
                  --server="nats://nats:4222" \
                  --creds="/etc/nats-secret/app.creds"
              done
            volumeMounts:
            - name: backup
              mountPath: /backup
            - name: creds
              mountPath: /etc/nats-secret
          restartPolicy: OnFailure
          volumes:
          - name: backup
            persistentVolumeClaim:
              claimName: nats-backup-pvc
          - name: creds
            secret:
              secretName: nats-cluster-secret
```

### Stream Restore

```bash
nats stream restore events-us /backup/events-us-20250115.tar.gz \
  --server="$NATS_US_URL" \
  --creds="$NATS_CREDS"
```

---

## Maintenance

### Rolling Restart

```bash
# Restart StatefulSet pods one at a time
kubectl rollout restart statefulset nats -n teei-platform

# Monitor rollout status
kubectl rollout status statefulset nats -n teei-platform
```

### Upgrade NATS Version

1. Update image version in `statefulset.yaml`
2. Apply changes (rolling update):
   ```bash
   kubectl apply -k k8s/overlays/us-east-1/nats/
   ```
3. Monitor logs for errors
4. Verify cluster health after upgrade

### Scale Cluster (Add/Remove Nodes)

**Not recommended**: JetStream clusters should remain at 3 nodes for quorum.

If you must scale:
```bash
# Scale to 5 nodes (requires cluster route updates)
kubectl scale statefulset nats --replicas=5 -n teei-platform

# Update cluster routes in configmap
# Restart pods to pick up new routes
```

---

## FAQ

**Q: Can I run a single-region deployment?**
A: Yes, but you lose DR capability. Deploy only the US cluster and skip EU mirroring.

**Q: What happens if both regions go down?**
A: Total outage. Messages published during outage are lost (unless clients buffer). Restore from backups.

**Q: Can I mirror from EU to US?**
A: Yes, configure bidirectional mirroring. Create US mirrors of EU GDPR streams if data sovereignty allows.

**Q: How do I handle message ordering during failover?**
A: JetStream preserves order within a stream. After failover, consumers resume from last acked message.

**Q: Can I use NATS for request-reply (RPC)?**
A: Yes, but JetStream is optimized for pub-sub. Use core NATS (non-JetStream) for low-latency RPC.

**Q: What's the difference between leafnodes and clustering?**
A: Clustering requires low-latency (<10ms), full mesh, same datacenter. Leafnodes support high-latency (500ms+), hub-spoke, cross-region.

---

## References

- **NATS Documentation**: https://docs.nats.io/
- **JetStream Guide**: https://docs.nats.io/nats-concepts/jetstream
- **Leafnodes**: https://docs.nats.io/running-a-nats-service/configuration/leafnodes
- **Disaster Recovery**: https://docs.nats.io/running-a-nats-service/nats_admin/jetstream_admin/disaster_recovery
- **Prometheus Exporter**: https://github.com/nats-io/prometheus-nats-exporter

---

## Changelog

| Date | Version | Changes |
|------|---------|---------|
| 2025-11-15 | 1.0 | Initial DR setup with cross-region mirroring |

---

## Support

For issues or questions:
- **Platform Team**: #platform-ops (Slack)
- **On-call**: PagerDuty escalation policy
- **Documentation**: This file (`docs/NATS_JetStream_DR.md`)
