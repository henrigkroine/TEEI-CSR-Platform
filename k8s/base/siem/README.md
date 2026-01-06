# SIEM Infrastructure

This directory contains the Kubernetes manifests for the centralized Security Information and Event Management (SIEM) system.

## Components

### OpenSearch Cluster
- **Purpose**: Centralized log storage and search
- **Replicas**: 3-node cluster
- **Storage**: 500GB per node (fast SSD)
- **Retention**: 90 days hot, 2 years archive (S3 Glacier)

### Vector Aggregator
- **Purpose**: Log collection, parsing, and enrichment
- **Sources**: Kubernetes logs, NATS streams, Syslog
- **Transforms**: Security event detection, anomaly tagging
- **Sinks**: OpenSearch, S3 archive, NATS alerts

### OpenSearch Dashboards
- **Purpose**: Security event visualization
- **Access**: https://siem.teei-csr.com
- **Auth**: Basic Auth + OIDC (optional)

## Deployment

### Prerequisites
1. Generate TLS certificates:
```bash
cd /home/user/TEEI-CSR-Platform/k8s/base/siem
mkdir -p certs
# Generate CA
openssl req -x509 -new -nodes -keyout certs/ca.key -sha256 -days 1825 \
  -out certs/ca.crt -subj "/CN=TEEI SIEM CA/O=TEEI/C=US"
# Generate server cert
openssl req -new -nodes -out certs/tls.csr -keyout certs/tls.key \
  -subj "/CN=opensearch.siem.svc.cluster.local/O=TEEI/C=US"
openssl x509 -req -in certs/tls.csr -CA certs/ca.crt -CAkey certs/ca.key \
  -CAcreateserial -out certs/tls.crt -days 825 -sha256
```

2. Update OpenSearch credentials in `kustomization.yaml`:
```bash
# Generate strong password
OPENSEARCH_PASSWORD=$(openssl rand -base64 32)
# Update secretGenerator in kustomization.yaml
```

### Deploy
```bash
kubectl apply -k /home/user/TEEI-CSR-Platform/k8s/base/siem
```

### Verify
```bash
# Check OpenSearch cluster health
kubectl exec -n siem opensearch-0 -- curl -k -u admin:password \
  https://localhost:9200/_cluster/health?pretty

# Check Vector aggregator
kubectl logs -n siem -l app=vector-aggregator --tail=50

# Check OpenSearch Dashboards
kubectl port-forward -n siem svc/opensearch-dashboards 5601:5601
# Visit http://localhost:5601
```

## Index Patterns

| Index Pattern | Data Type | Retention |
|---------------|-----------|-----------|
| `auth-events-*` | Authentication events | 90 days |
| `data-access-*` | Data access logs | 2 years (compliance) |
| `security-events-*` | Security alerts, authorization | 90 days |

## Metrics

Vector exposes Prometheus metrics on port 9090:
- `siem_auth_events_total` - Authentication event counts
- `siem_data_access_total` - Data access event counts
- `siem_security_anomalies_total` - Detected anomalies

## Troubleshooting

### OpenSearch won't start
- Check `vm.max_map_count`: `sysctl vm.max_map_count` (should be ≥262144)
- Check storage: `kubectl get pvc -n siem`

### Vector not shipping logs
- Check NATS connection: `kubectl logs -n siem -l app=vector-aggregator | grep nats`
- Verify OpenSearch credentials: `kubectl get secret -n siem opensearch-credentials -o yaml`

### High memory usage
- Reduce JVM heap: Edit `OPENSEARCH_JAVA_OPTS` in deployment
- Scale horizontally: Increase replicas

## Security Considerations

- All communication uses mTLS
- Basic Auth required for OpenSearch Dashboards ingress
- PII is redacted before ingestion (see Vector transforms)
- Audit logs are immutable (append-only indices)
