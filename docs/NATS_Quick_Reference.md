# NATS JetStream Quick Reference

## Common Commands

### Health Checks

```bash
# Ping US cluster
nats server ping --server="nats://nats-lb.us-east-1.example.com:4222" --creds="/path/to/app.creds"

# Ping EU cluster
nats server ping --server="nats://nats-lb.eu-central-1.example.com:4222" --creds="/path/to/app.creds"

# Check cluster health (automated)
./scripts/infra/nats-failover.sh health-check
```

### Stream Management

```bash
# List all streams
nats stream list --server="$NATS_US_URL" --creds="$NATS_CREDS"

# View stream info
nats stream info events-us --server="$NATS_US_URL" --creds="$NATS_CREDS"

# Create stream
nats stream add my-stream --subjects "my.subject.*" --storage file --retention limits --max-age 7d --max-bytes 10Gi --replicas 3

# Delete stream (dangerous!)
nats stream rm my-stream --server="$NATS_US_URL" --creds="$NATS_CREDS" --force

# Purge stream (delete all messages)
nats stream purge events-us --server="$NATS_US_URL" --creds="$NATS_CREDS" --force
```

### Consumer Management

```bash
# List consumers for a stream
nats consumer list events-us --server="$NATS_US_URL" --creds="$NATS_CREDS"

# View consumer info
nats consumer info events-us my-consumer --server="$NATS_US_URL" --creds="$NATS_CREDS"

# Create consumer
nats consumer add events-us my-consumer --ack explicit --deliver all --replay instant

# Delete consumer
nats consumer rm events-us my-consumer --server="$NATS_US_URL" --creds="$NATS_CREDS" --force
```

### Mirror Management

```bash
# Check mirror lag
nats stream info events-eu-mirror --server="$NATS_EU_URL" --creds="$NATS_CREDS" | grep -A5 "Mirror Information"

# View mirror status for all streams
./scripts/infra/nats-streams.sh status
```

### Publishing & Consuming

```bash
# Publish message
nats pub events.test "Hello, NATS!" --server="$NATS_US_URL" --creds="$NATS_CREDS"

# Subscribe to subject
nats sub "events.>" --server="$NATS_US_URL" --creds="$NATS_CREDS"

# Request-reply
nats request "service.ping" "ping" --server="$NATS_US_URL" --creds="$NATS_CREDS"
```

### Disaster Recovery

```bash
# Failover to EU (US down)
./scripts/infra/nats-failover.sh failover-to-eu

# Failback to US (restore normal ops)
./scripts/infra/nats-failover.sh failback-to-us

# Check DR status
./scripts/infra/nats-failover.sh status
```

### Retention Management

```bash
# Check retention settings
./scripts/infra/nats-retention.sh check

# Update retention policies
./scripts/infra/nats-retention.sh update

# Enforce limits (purge old messages)
./scripts/infra/nats-retention.sh enforce

# Generate retention report
./scripts/infra/nats-retention.sh report
```

### Backup & Restore

```bash
# Backup stream
nats stream backup events-us /backup/events-us-$(date +%Y%m%d).tar.gz --server="$NATS_US_URL" --creds="$NATS_CREDS"

# Restore stream
nats stream restore events-us /backup/events-us-20250115.tar.gz --server="$NATS_US_URL" --creds="$NATS_CREDS"
```

## Configuration Files

| File | Purpose |
|------|---------|
| `/k8s/base/nats/statefulset.yaml` | NATS StatefulSet (3 pods per region) |
| `/k8s/base/nats/service.yaml` | NATS Service (client, cluster, monitoring ports) |
| `/k8s/base/nats/configmap.yaml` | NATS server configuration |
| `/k8s/base/nats/secret.yaml` | NATS credentials (cluster auth, app auth) |
| `/k8s/base/nats/config/jetstream.conf` | JetStream configuration |
| `/k8s/base/nats/config/leafnodes.conf` | Leafnode configuration |
| `/k8s/overlays/us-east-1/nats/` | US region overlay (primary) |
| `/k8s/overlays/eu-central-1/nats/` | EU region overlay (replica + GDPR) |

## Scripts

| Script | Purpose |
|--------|---------|
| `/scripts/infra/nats-streams.sh` | Create/list/delete streams |
| `/scripts/infra/nats-retention.sh` | Manage retention policies |
| `/scripts/infra/nats-failover.sh` | DR failover/failback procedures |

## Environment Variables

```bash
# US cluster
export NATS_US_URL="nats://nats-lb.us-east-1.example.com:4222"

# EU cluster
export NATS_EU_URL="nats://nats-lb.eu-central-1.example.com:4222"

# Credentials
export NATS_CREDS="/etc/nats-secret/app.creds"
```

## Kubernetes Resources

```bash
# Check NATS pods
kubectl get pods -n teei-platform -l app=nats

# Check NATS services
kubectl get svc -n teei-platform -l app=nats

# Check NATS configmaps
kubectl get cm -n teei-platform -l app=nats

# Check NATS secrets
kubectl get secret -n teei-platform nats-cluster-secret

# Check NATS PVCs
kubectl get pvc -n teei-platform -l app=nats

# View NATS logs
kubectl logs -n teei-platform nats-0 -c nats --tail=100 -f

# Exec into NATS pod
kubectl exec -it -n teei-platform nats-0 -c nats-box -- /bin/sh
```

## Monitoring URLs

- **Grafana Dashboard**: https://grafana.teei-platform.com/d/nats-jetstream-dr
- **Prometheus Metrics**: http://nats:7777/metrics
- **NATS Monitoring**: http://nats:8222/varz

## Ports

| Port | Service | Description |
|------|---------|-------------|
| 4222 | Client | NATS client connections |
| 6222 | Cluster | NATS cluster routes |
| 7422 | Leafnode | Cross-region leafnode connections |
| 7777 | Metrics | Prometheus exporter |
| 8222 | Monitor | HTTP monitoring endpoint |

## Alert Thresholds

| Alert | Threshold | Severity |
|-------|-----------|----------|
| Cluster nodes down | < 3 nodes | Critical |
| Mirror lag | > 60 seconds | Warning |
| Consumer lag | > 10,000 messages | Warning |
| Storage usage | > 80% | Warning |

## Stream Retention Policies

| Stream | Max Age | Max Size | Subjects |
|--------|---------|----------|----------|
| `events-us` | 7 days | 10Gi | `events.*`, `buddy.*`, `kintell.*`, etc. |
| `audit-us` | 90 days | 50Gi | `audit.*`, `compliance.*`, `access-log.*` |
| `metrics-us` | 30 days | 20Gi | `metrics.*`, `telemetry.*`, `health.*` |
| `notifications-us` | 14 days | 5Gi | `notifications.*`, `email.*`, `sms.*` |
| `events-eu-gdpr` | 7 days | 10Gi | `eu.events.*`, `eu.pii.*`, `gdpr.*` |
| `audit-eu-gdpr` | 90 days | 20Gi | `eu.audit.*`, `gdpr.access-log.*` |

## Troubleshooting Quick Checks

```bash
# 1. Check if cluster is up
kubectl get pods -n teei-platform -l app=nats

# 2. Check cluster connectivity
./scripts/infra/nats-failover.sh health-check

# 3. Check mirror lag
nats stream info events-eu-mirror --server="$NATS_EU_URL" --creds="$NATS_CREDS"

# 4. Check consumer lag
nats consumer list events-us --server="$NATS_US_URL" --creds="$NATS_CREDS"

# 5. Check storage usage
./scripts/infra/nats-retention.sh check

# 6. View logs for errors
kubectl logs -n teei-platform nats-0 -c nats --tail=100 | grep -i error

# 7. Check network connectivity
kubectl exec -it -n teei-platform nats-0 -c nats-box -- nats server ping

# 8. Check leafnode connections
kubectl exec -it -n teei-platform nats-0 -c nats-box -- nats server list
```

## Support Channels

- **Documentation**: `/docs/NATS_JetStream_DR.md`
- **Slack**: #platform-ops
- **On-call**: PagerDuty escalation policy
- **NATS Community**: https://natsio.slack.com
