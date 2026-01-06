# NATS JetStream - EU Region (eu-central-1)

This overlay configures NATS JetStream for the **EU replica region**.

## Configuration

- **Domain**: `eu-central-1`
- **Cluster Name**: `teei-nats-eu`
- **Leafnode Remote**: US cluster (`us-east-1`)
- **Role**: Replica JetStream cluster + GDPR-native streams

## Deployment

```bash
# Deploy to EU cluster
kubectl apply -k k8s/overlays/eu-central-1/nats/

# Verify deployment
kubectl get pods -n teei-platform -l app=nats,region=eu-central-1

# Check logs
kubectl logs -n teei-platform eu-nats-0 -c nats --tail=50
```

## Streams

This region hosts:

### Mirrors (from US)
- `events-eu-mirror` (mirrors `events-us`)
- `audit-eu-mirror` (mirrors `audit-us`)
- `metrics-eu-mirror` (mirrors `metrics-us`)

### GDPR-Native Streams (EU-only, no US replication)
- `events-eu-gdpr` (7d retention, 10Gi)
- `audit-eu-gdpr` (90d retention, 20Gi)

## Leafnode Connectivity

This cluster connects to **US** as a leafnode remote for stream mirroring.

## Data Sovereignty

GDPR-native streams (`events-eu-gdpr`, `audit-eu-gdpr`) remain in the EU region only. They are **NOT** mirrored to the US cluster to comply with data residency requirements.

## Monitoring

- Grafana dashboard: https://grafana.teei-platform.com/d/nats-jetstream-dr
- Prometheus metrics: `http://nats:7777/metrics`
