# TEEI Platform Observability

This directory contains observability configuration for monitoring and alerting.

## Structure

```
observability/
├── grafana/
│   └── dashboards/
│       ├── http-overview.json           # HTTP metrics (requests, errors, latency)
│       ├── nats-consumer-lag.json       # NATS messaging metrics
│       ├── postgres-metrics.json        # PostgreSQL database metrics
│       └── clickhouse-metrics.json      # ClickHouse analytics metrics
├── prometheus/
│   └── rules.yaml                       # Prometheus alerting rules
└── README.md                            # This file
```

## Dashboards

### HTTP Overview
- **Request Rate**: Requests per second by service
- **Error Rate**: HTTP 5xx errors as percentage
- **Response Time**: p95 latency by service
- **Status Codes**: Distribution of HTTP status codes
- **Active Connections**: Current active connections

### NATS Consumer Metrics
- **Consumer Lag**: Pending messages in queue
- **Processing Rate**: Messages consumed per second
- **Ack Pending**: Messages awaiting acknowledgment
- **Redeliveries**: Failed message retries
- **Stream Lag**: Time since last message delivery

### PostgreSQL Metrics
- **Active Connections**: Current database connections
- **TPS**: Transactions per second
- **Cache Hit Ratio**: Buffer cache efficiency
- **Query Duration**: Average query execution time
- **Table Sizes**: Disk usage by table
- **Replication Lag**: Replica delay

### ClickHouse Metrics
- **Query Rate**: Queries per second
- **Query Duration**: p95 query execution time
- **Rows Read/Written**: Data throughput
- **Disk Usage**: Storage utilization
- **Active Connections**: Current connections
- **Memory Usage**: RAM consumption

## Alerts

Prometheus alerts are configured in `prometheus/rules.yaml`:

### Service Alerts
- **HighErrorRate**: Error rate > 5% for 5 minutes (warning)
- **CriticalErrorRate**: Error rate > 20% for 2 minutes (critical)
- **HighLatency**: p95 latency > 2s for 10 minutes (warning)
- **ServiceDown**: Service unavailable for 2 minutes (critical)
- **PodCrashLooping**: Pod restarting repeatedly (warning)
- **HighMemoryUsage**: Memory usage > 90% for 5 minutes (warning)
- **HighCPUUsage**: CPU usage > 90% for 10 minutes (warning)

### Database Alerts
- **DatabasePoolExhausted**: Connection pool > 80% utilized (warning)
- **SlowDatabaseQueries**: Average query time > 1s for 10 minutes (warning)

### Messaging Alerts
- **NATSConsumerLag**: > 10,000 pending messages for 10 minutes (warning)
- **NATSSlowConsumer**: Consumer stuck (critical)

## Deployment

### Kubernetes Auto-Provisioning (Recommended)

The platform now includes Grafana with auto-provisioned dashboards via Kubernetes manifests.

**Dashboards are automatically loaded on Grafana startup** - no manual import required!

#### What's Deployed

Located in `k8s/base/observability/`:

1. **grafana-provisioning.yaml** - ConfigMaps containing:
   - Prometheus datasource configuration
   - Dashboard provider configuration
   - All 4 dashboard JSON files (auto-imported)

2. **grafana-deployment.yaml** - Grafana Deployment with:
   - Persistent storage (emptyDir, 1Gi)
   - Volume mounts for dashboards and datasources
   - Health checks (liveness/readiness probes)
   - Resource limits (512Mi memory, 500m CPU)
   - Security context (non-root user, read-only root filesystem)

3. **grafana-service.yaml** - ClusterIP Service on port 3000

4. **grafana-secret.yaml** - Admin credentials (should be sealed in production)

#### Deployment

Grafana is automatically deployed when applying the Kustomize overlays:

```bash
# Deploy to staging
kubectl apply -k k8s/overlays/staging/

# Deploy to production
kubectl apply -k k8s/overlays/production/
```

#### Access Grafana UI

**Staging**: `https://staging.teei.example.com/grafana`

**Production**: `https://teei.example.com/grafana`

Default credentials:
- **Username**: `admin`
- **Password**: `admin123` (change via sealed secrets in production!)

#### Dashboard Auto-Loading

Dashboards are loaded automatically via the following mechanism:

1. **ConfigMap** `grafana-dashboards` contains all 4 dashboard JSONs as data keys
2. **Volume mount** at `/etc/grafana/dashboards` exposes the ConfigMap to Grafana
3. **Dashboard provider** configuration tells Grafana to scan `/etc/grafana/dashboards`
4. **On startup**, Grafana imports all dashboards into the "TEEI" folder

No manual import needed - dashboards appear immediately after pod starts!

#### Updating Dashboards

To update dashboards after deployment:

```bash
# Edit the dashboard JSON in observability/grafana/dashboards/
# Then re-apply the manifests
kubectl apply -k k8s/overlays/staging/

# Restart Grafana to reload dashboards
kubectl rollout restart deployment/grafana -n teei-staging
```

### Manual Deployment (Legacy)

If not using Kubernetes auto-provisioning:

1. **Via UI**:
   - Open Grafana
   - Navigate to Dashboards → Import
   - Upload JSON file from `grafana/dashboards/`

2. **Via ConfigMap**:
   ```bash
   kubectl create configmap grafana-dashboards \
     --from-file=observability/grafana/dashboards/ \
     -n monitoring
   ```

### Deploy Prometheus Rules

```bash
kubectl apply -f observability/prometheus/rules.yaml
```

## Metrics Collection

Services expose metrics on `/metrics` endpoint. Prometheus scrapes these using pod annotations:

```yaml
annotations:
  prometheus.io/scrape: "true"
  prometheus.io/port: "3000"
  prometheus.io/path: "/metrics"
```

## Viewing Dashboards

### Via Ingress (Recommended)

Access Grafana directly through the platform ingress:

- **Staging**: `https://staging.teei.example.com/grafana`
- **Production**: `https://teei.example.com/grafana`

Login with:
- **Username**: `admin`
- **Password**: `admin123` (default - change in production!)

All 4 dashboards are available in the "TEEI" folder immediately after login.

### Via Port Forward (Development)

For local testing or development:

```bash
# Staging
kubectl port-forward -n teei-staging svc/grafana 3000:3000

# Production
kubectl port-forward -n teei-production svc/grafana 3000:3000
```

Then open browser: `http://localhost:3000/grafana`

## Custom Metrics

To add custom metrics to your services:

```typescript
import { Registry, Counter, Histogram } from 'prom-client';

const registry = new Registry();

// Counter example
const requestCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total HTTP requests',
  labelNames: ['method', 'status', 'path'],
  registers: [registry]
});

// Histogram example
const requestDuration = new Histogram({
  name: 'http_request_duration_seconds',
  help: 'HTTP request latency',
  labelNames: ['method', 'path'],
  buckets: [0.1, 0.5, 1, 2, 5],
  registers: [registry]
});

// Expose metrics
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', registry.contentType);
  res.end(await registry.metrics());
});
```

## Troubleshooting

### No data in dashboards

1. Check Prometheus is scraping targets:
   ```bash
   kubectl port-forward -n monitoring svc/prometheus 9090:9090
   ```
   Visit `http://localhost:9090/targets`

2. Verify service annotations are correct

3. Check network policies allow Prometheus to scrape pods

### Alerts not firing

1. Verify Prometheus rules are loaded:
   ```bash
   kubectl get prometheusrule -n monitoring
   ```

2. Check Alertmanager is configured:
   ```bash
   kubectl get alertmanager -n monitoring
   ```

3. View active alerts in Prometheus UI

## References

- [Prometheus Query Language](https://prometheus.io/docs/prometheus/latest/querying/basics/)
- [Grafana Dashboard Best Practices](https://grafana.com/docs/grafana/latest/best-practices/)
- [Node.js prom-client](https://github.com/siimon/prom-client)
