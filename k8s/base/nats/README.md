# NATS JetStream with Cross-Region DR

This directory contains the base Kubernetes manifests for NATS JetStream with cross-region disaster recovery configuration.

## Architecture

- **3-node cluster per region** (US and EU)
- **Cross-region mirroring** via leafnode connections
- **Persistent storage** (100Gi per node)
- **High availability** within each region (3 replicas)
- **GDPR compliance** (EU-only streams for data sovereignty)

## Files

| File | Description |
|------|-------------|
| `statefulset.yaml` | NATS StatefulSet with 3 replicas, JetStream enabled, Prometheus exporter sidecar |
| `headless-service.yaml` | Headless service for StatefulSet DNS discovery |
| `service.yaml` | ClusterIP service for client connections + LoadBalancer for external access |
| `configmap.yaml` | NATS server configuration (cluster, accounts, JetStream) |
| `secret.yaml` | NATS credentials (cluster auth, admin, app user) - **replace with Vault/SealedSecrets** |
| `network-policy.yaml` | Network policy for ingress/egress control |
| `config/jetstream.conf` | JetStream-specific configuration (storage, limits) |
| `config/leafnodes.conf` | Leafnode configuration (cross-region connectivity) |
| `kustomization.yaml` | Kustomize configuration for base resources |

## Deployment

**Do not deploy this base directly.** Use region-specific overlays:

### US Region (Primary)
```bash
kubectl apply -k k8s/overlays/us-east-1/nats/
```

### EU Region (Replica + GDPR)
```bash
kubectl apply -k k8s/overlays/eu-central-1/nats/
```

## Key Features

### JetStream Configuration
- **Memory**: 4Gi per node
- **Storage**: 100Gi per node (file-based, persistent)
- **Domains**: `us-east-1` and `eu-central-1`
- **Sync interval**: 2 minutes

### Cluster Configuration
- **Cluster name**: `teei-nats-cluster`
- **Cluster routes**: Auto-configured via StatefulSet DNS
- **Cluster authentication**: User/password (configurable)

### Leafnode Configuration
- **Port**: 7422
- **Remotes**: Configured via region overlays
- **Authentication**: JWT credentials (recommended)

### Accounts
- **SYS**: System account for monitoring and management
- **APP**: Application account with JetStream enabled

### Monitoring
- **Prometheus exporter**: Port 7777
- **HTTP monitoring**: Port 8222
- **Metrics**: Auto-scraped by Prometheus

## Security

### Secrets Management
**IMPORTANT**: Replace placeholder secrets in `secret.yaml` with actual secrets from Vault or SealedSecrets.

```bash
# Generate strong passwords
CLUSTER_PASSWORD=$(openssl rand -base64 32)
ADMIN_PASSWORD=$(openssl rand -base64 32)
APP_PASSWORD=$(openssl rand -base64 32)

# Create secret
kubectl create secret generic nats-cluster-secret \
  --from-literal=NATS_CLUSTER_USER=cluster_user \
  --from-literal=NATS_CLUSTER_PASSWORD="$CLUSTER_PASSWORD" \
  --from-literal=NATS_ADMIN_PASSWORD="$ADMIN_PASSWORD" \
  --from-literal=NATS_APP_PASSWORD="$APP_PASSWORD" \
  -n teei-platform
```

### Network Policy
- **Ingress**: Allow from application pods (port 4222), cluster pods (6222, 7422), Prometheus (7777, 8222)
- **Egress**: Allow to DNS, cluster pods, external leafnodes

### TLS (Production)
Uncomment TLS sections in `configmap.yaml` and provide certificates via secrets.

## Resource Requirements

### Per Pod
- **CPU**: 1 core (request), 2 cores (limit)
- **Memory**: 4Gi (request), 8Gi (limit)
- **Storage**: 100Gi (PVC)

### Per Region (3 pods)
- **CPU**: 3 cores (request), 6 cores (limit)
- **Memory**: 12Gi (request), 24Gi (limit)
- **Storage**: 300Gi total

## Stream Configuration

Streams are created via `/scripts/infra/nats-streams.sh`, not in Kubernetes manifests.

### US Primary Streams
- `events-us` (7d, 10Gi)
- `audit-us` (90d, 50Gi)
- `metrics-us` (30d, 20Gi)
- `notifications-us` (14d, 5Gi)

### EU Mirrors
- `events-eu-mirror` (mirrors `events-us`)
- `audit-eu-mirror` (mirrors `audit-us`)
- `metrics-eu-mirror` (mirrors `metrics-us`)

### EU GDPR-Native
- `events-eu-gdpr` (7d, 10Gi) - **EU-only, no US replication**
- `audit-eu-gdpr` (90d, 20Gi) - **EU-only, no US replication**

## Monitoring & Alerting

### Grafana Dashboard
Import: `/observability/grafana/dashboards/nats-jetstream.json`

### Prometheus Alerts
- Cluster nodes down: < 3 nodes
- Mirror lag: > 60 seconds
- Consumer lag: > 10,000 messages
- Storage usage: > 80%

## Troubleshooting

### Check Pod Status
```bash
kubectl get pods -n teei-platform -l app=nats
```

### View Logs
```bash
kubectl logs -n teei-platform nats-0 -c nats --tail=100
```

### Exec into Pod
```bash
kubectl exec -it -n teei-platform nats-0 -c nats-box -- /bin/sh
```

### Check Cluster Health
```bash
./scripts/infra/nats-failover.sh health-check
```

## Documentation

- **Full DR Guide**: `/docs/NATS_JetStream_DR.md`
- **Quick Reference**: `/docs/NATS_Quick_Reference.md`
- **Failover Procedures**: `/docs/NATS_JetStream_DR.md#disaster-recovery-procedures`

## Support

- **Slack**: #platform-ops
- **On-call**: PagerDuty escalation policy
- **NATS Docs**: https://docs.nats.io/
