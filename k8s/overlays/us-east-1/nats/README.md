# NATS JetStream - US Region (us-east-1)

This overlay configures NATS JetStream for the **US primary region**.

## Configuration

- **Domain**: `us-east-1`
- **Cluster Name**: `teei-nats-us`
- **Leafnode Remote**: EU cluster (`eu-central-1`)
- **Role**: Primary JetStream cluster

## Deployment

```bash
# Deploy to US cluster
kubectl apply -k k8s/overlays/us-east-1/nats/

# Verify deployment
kubectl get pods -n teei-platform -l app=nats,region=us-east-1

# Check logs
kubectl logs -n teei-platform us-nats-0 -c nats --tail=50
```

## Streams

This region hosts the **primary streams**:
- `events-us` (7d retention, 10Gi)
- `audit-us` (90d retention, 50Gi)
- `metrics-us` (30d retention, 20Gi)
- `notifications-us` (14d retention, 5Gi)

## Leafnode Connectivity

This cluster connects to **EU** as a leafnode remote for cross-region mirroring.

## Monitoring

- Grafana dashboard: https://grafana.teei-platform.com/d/nats-jetstream-dr
- Prometheus metrics: `http://nats:7777/metrics`
