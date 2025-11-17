# KEDA Autoscaling Deployment Summary

**Phase J - Ticket J3.2: KEDA Autoscaling Implementation**
**Agent**: keda-tuner (Worker 1, Team 3: Cost Control)
**Date**: 2025-11-16
**Status**: ✅ Complete

---

## Executive Summary

Successfully implemented KEDA-based autoscaling for AI and reporting services, along with traditional HPA for the Impact Calculator. The deployment includes:

- **Q2Q-AI Service**: NATS JetStream queue-depth based scaling (2-20 replicas)
- **Reporting Service**: Prometheus HTTP request-rate based scaling (3-15 replicas)
- **Impact Calculator**: CPU utilization-based HPA (2-10 replicas)

All scalers are configured with burst protection, scale-down stabilization, and sub-30-second scale-up latency.

---

## Deliverables

### 1. KEDA ScaledObjects

#### 1.1 Q2Q-AI NATS Scaler
**File**: `/home/user/TEEI-CSR-Platform/k8s/base/keda/q2q-ai-scaler.yaml`

**Configuration**:
- **Trigger Type**: NATS JetStream queue depth
- **Stream**: `Q2Q_TASKS`
- **Consumer**: `q2q-ai-consumer`
- **Threshold**: 100 messages
- **Min Replicas**: 2
- **Max Replicas**: 20
- **Cooldown Period**: 30 seconds
- **Polling Interval**: 10 seconds

**Scale-Up Behavior**:
- Stabilization Window: 0 seconds (immediate)
- Max 100% increase per 30 seconds
- Max 4 pods per 30 seconds
- Policy: Select maximum (aggressive scale-up)

**Scale-Down Behavior**:
- Stabilization Window: 300 seconds (5 minutes)
- Max 50% decrease per 60 seconds
- Max 2 pods per 60 seconds
- Policy: Select minimum (conservative scale-down)

**Tuning Rationale**:
- **NATS queue depth**: Direct indicator of pending work; more accurate than CPU/memory for async processing
- **100 message threshold**: Assumes ~5s processing time per message; keeps queue depth manageable
- **20 max replicas**: Handles 2,000 pending messages with <10 min processing time
- **5-min scale-down**: Prevents thrashing during bursty workloads (common in Q2Q processing)
- **Activation lag 10 messages**: Avoids scaling for trivial queue growth

**Authentication**:
- NATS credentials stored in Kubernetes Secret `keda-nats-auth`
- TriggerAuthentication references secret for secure connection
- **Note**: Replace placeholder credentials before production deployment

---

#### 1.2 Reporting HTTP Scaler
**File**: `/home/user/TEEI-CSR-Platform/k8s/base/keda/reporting-scaler.yaml`

**Configuration**:
- **Trigger Type**: Prometheus HTTP request rate
- **Query**: `sum(rate(http_requests_total{service="teei-reporting"}[1m]))`
- **Threshold**: 50 requests/second
- **Min Replicas**: 3
- **Max Replicas**: 15
- **Cooldown Period**: 30 seconds
- **Polling Interval**: 10 seconds

**Scale-Up Behavior**:
- Stabilization Window: 0 seconds (immediate)
- Max 100% increase per 30 seconds
- Max 3 pods per 30 seconds
- Policy: Select maximum (aggressive scale-up)

**Scale-Down Behavior**:
- Stabilization Window: 300 seconds (5 minutes)
- Max 50% decrease per 60 seconds
- Max 2 pods per 60 seconds
- Policy: Select minimum (conservative scale-down)

**Tuning Rationale**:
- **50 req/s threshold**: At 3 min replicas handling ~15 req/s each, this triggers scale-up at 150 total req/s
- **3 min replicas**: Ensures baseline availability for report generation (high-latency operation)
- **15 max replicas**: Handles 750 req/s peak load (5x baseline)
- **Prometheus query**: Uses 1-minute rate window for responsiveness without noise
- **Activation 10 req/s**: Prevents scaling on minimal traffic

**Alternative Configuration**:
- Included commented HTTP metrics-api scaler for direct metric collection
- Use if Prometheus is not available or for lower latency metric polling

---

#### 1.3 Impact Calculator HPA
**File**: `/home/user/TEEI-CSR-Platform/k8s/base/keda/impact-calculator-scaler.yaml`

**Configuration**:
- **Type**: Traditional Kubernetes HPA (autoscaling/v2)
- **Trigger**: CPU utilization
- **Target**: 70% average CPU
- **Min Replicas**: 2
- **Max Replicas**: 10

**Scale-Up Behavior**:
- Stabilization Window: 0 seconds (immediate)
- Max 100% increase per 30 seconds
- Max 2 pods per 30 seconds
- Policy: Select maximum (aggressive scale-up)

**Scale-Down Behavior**:
- Stabilization Window: 300 seconds (5 minutes)
- Max 50% decrease per 60 seconds
- Max 2 pods per 60 seconds
- Policy: Select minimum (conservative scale-down)

**Tuning Rationale**:
- **70% CPU target**: Allows headroom for bursts while maximizing resource utilization
- **CPU-based scaling**: Impact calculations are CPU-intensive (SROI/VIS formulas)
- **2 min replicas**: Ensures baseline availability for synchronous calculations
- **10 max replicas**: Handles 5x baseline load without over-provisioning
- **Traditional HPA**: Simpler than KEDA for CPU-based scaling; no external dependencies

**Resource Requirements**:
```yaml
requests:
  cpu: 100m
  memory: 128Mi
limits:
  cpu: 500m
  memory: 512Mi
```

At 70% target, each pod handles ~350m CPU (70% of 500m limit).

---

### 2. k6 Load Test Script

**File**: `/home/user/TEEI-CSR-Platform/tests/load/keda-validation.js`

**Test Phases**:

1. **Phase 1 - Baseline** (1 min, 10 VUs)
   - Validates min replica counts
   - Warms up services and establishes baseline metrics

2. **Phase 2 - Gradual Ramp** (2 min, 10→100 VUs)
   - Observes scale-up behavior
   - Measures scale-up latency (<30s target)

3. **Phase 3 - Sustained Load** (5 min, 100 VUs)
   - Validates scaling stability
   - Measures steady-state performance

4. **Phase 4 - Burst Test** (3 min, 100→200 VUs)
   - Tests max scaling capacity
   - Validates burst protection

5. **Phase 5 - Gradual Ramp Down** (5 min, 200→50 VUs)
   - Observes scale-down behavior
   - Validates 5-minute stabilization window

6. **Phase 6 - Cool Down** (1 min, 50→0 VUs)
   - Returns to baseline

**Load Distribution**:
- 35% Q2Q-AI requests (NATS queue depth test)
- 35% Reporting requests (HTTP rate test)
- 30% Impact Calculator requests (CPU utilization test)

**Performance Thresholds**:
- Overall P95 latency: <3000ms
- Q2Q processing P95: <2000ms
- Reporting response P95: <1500ms
- Impact calculation P95: <1000ms
- Error rate: <5%
- CPU P95: <80% (monitored via Kubernetes metrics)

**Test Data Generators**:
- Realistic payloads for each service
- Variable complexity (standard vs high)
- Diverse scenarios (multiple report types, calculation types)

**Metrics Captured**:
- Request rate and error rate
- Per-service response time (avg, P95, P99)
- Concurrent users (gauge)
- Total request count

**Output**:
- Console summary with validation checklist
- JSON results: `results/keda-validation-summary.json`
- HTML report: `results/keda-validation-summary.html`

**Running the Test**:
```bash
# From repository root
k6 run tests/load/keda-validation.js

# With custom base URL
k6 run --env BASE_URL=https://staging.teei-csr.com tests/load/keda-validation.js

# With authentication
k6 run --env API_TOKEN=<token> tests/load/keda-validation.js
```

---

## Technical Implementation Details

### KEDA Architecture

KEDA (Kubernetes Event-Driven Autoscaling) extends Kubernetes HPA with:

1. **Event-Driven Scaling**: Scales based on external metrics (NATS, Prometheus, HTTP, etc.)
2. **Zero-to-N Scaling**: Can scale to zero replicas (not used in this deployment)
3. **Custom Metrics**: Exposes external metrics to Kubernetes HPA
4. **Multiple Triggers**: Supports 50+ scalers (databases, message queues, cloud services)

**Deployment Requirements**:
```bash
# Install KEDA operator
kubectl apply -f https://github.com/kedacore/keda/releases/download/v2.12.0/keda-2.12.0.yaml

# Verify installation
kubectl get pods -n keda
```

### NATS JetStream Scaler

**How It Works**:
1. KEDA polls NATS JetStream monitoring endpoint every 10 seconds
2. Queries consumer lag (pending messages) for `q2q-ai-consumer`
3. Calculates desired replicas: `ceil(pending_messages / lagThreshold)`
4. Updates HPA target based on calculated replicas
5. HPA scales deployment up/down based on behavior policies

**Key Metrics**:
- `stream.consumer.pending`: Number of pending messages
- `stream.consumer.ack_pending`: Number of messages awaiting acknowledgment
- `stream.consumer.redelivered`: Number of redelivered messages (failure indicator)

**Authentication**:
- Uses TriggerAuthentication to securely access NATS
- Supports username/password, token, and certificate auth
- Secrets managed via Kubernetes Secret API

### Prometheus Scaler

**How It Works**:
1. KEDA queries Prometheus API every 10 seconds
2. Executes PromQL query: `sum(rate(http_requests_total{service="teei-reporting"}[1m]))`
3. Compares result to threshold (50 req/s)
4. Calculates desired replicas: `ceil(current_rate / threshold)`
5. Updates HPA target

**Query Breakdown**:
- `http_requests_total{service="teei-reporting"}`: Counter of all HTTP requests to reporting service
- `rate(...[1m])`: Per-second rate over 1-minute window
- `sum(...)`: Aggregate across all pods

**Prometheus Integration**:
- Requires Prometheus server in cluster
- Service must expose `/metrics` endpoint with `http_requests_total` counter
- Uses Prometheus server at: `http://prometheus-server.observability.svc.cluster.local:9090`

### CPU-Based HPA

**How It Works**:
1. Kubernetes metrics-server collects CPU usage from kubelet
2. HPA controller queries metrics-server every 15 seconds (default)
3. Calculates current utilization: `sum(pod_cpu_usage) / sum(pod_cpu_requests)`
4. Compares to target (70%)
5. Adjusts replicas: `ceil(current_replicas * (current_utilization / target_utilization))`

**Advantages**:
- No external dependencies (built into Kubernetes)
- Low overhead (metrics-server is lightweight)
- Reliable for CPU-bound workloads

**Disadvantages**:
- Reactive (scales after CPU is high, not before)
- Not suitable for I/O-bound or async workloads

---

## Scale-Up/Down Behavior Analysis

### Scale-Up Latency

**Target**: <30 seconds from trigger to new pod ready

**Timeline**:
1. **0s**: Metric exceeds threshold
2. **10s**: KEDA polls and updates HPA target (pollingInterval=10s)
3. **15s**: HPA detects new target and requests pod
4. **20s**: Kubernetes schedules pod
5. **25s**: Pod starts and passes startup probe
6. **30s**: Pod marked Ready and receives traffic

**Optimizations**:
- `pollingInterval: 10s`: Reduces detection latency
- `stabilizationWindowSeconds: 0`: Immediate scale-up
- Aggressive scale-up policies (100%/30s or 4 pods/30s)
- Fast startup probes (2s period, 30 attempts = 60s max)

**Bottlenecks**:
- Image pull time (mitigated by `imagePullPolicy: Always` + image caching)
- Pod scheduling (mitigated by node autoscaling)
- Application startup (mitigated by fast health checks)

### Scale-Down Delay

**Target**: 5 minutes stabilization to prevent thrashing

**Timeline**:
1. **0s**: Metric drops below threshold
2. **10s**: KEDA polls and detects low metric
3. **10s-5m**: HPA waits for stabilization window
4. **5m**: HPA initiates scale-down
5. **5m+30s**: Pod terminates gracefully (30s grace period)

**Why 5 Minutes?**:
- **Q2Q workloads**: Bursty by nature (feedback submissions come in waves)
- **Report generation**: Long-running operations (5-60s per report)
- **Cost vs performance**: 5 minutes of extra capacity costs <$0.10/month per pod
- **Thrashing prevention**: Avoids scale-up/down cycles during periodic traffic

**Tuning Parameters**:
```yaml
scaleDown:
  stabilizationWindowSeconds: 300  # 5 minutes
  policies:
    - type: Percent
      value: 50              # Max 50% reduction per minute
      periodSeconds: 60
    - type: Pods
      value: 2               # Max 2 pods removed per minute
      periodSeconds: 60
  selectPolicy: Min          # Choose most conservative policy
```

**Effect**:
- If 10 replicas scale down, min policy ensures:
  - Minute 0-1: 10 → 8 replicas (2 pods)
  - Minute 1-2: 8 → 6 replicas (2 pods)
  - Minute 2-3: 6 → 4 replicas (2 pods)
  - Minute 3-4: 4 → 2 replicas (2 pods, hits min)

---

## Monitoring & Validation

### Pre-Deployment Checklist

- [ ] KEDA operator installed and healthy
- [ ] Prometheus server accessible
- [ ] NATS JetStream deployed and configured
- [ ] Metrics endpoints exposed on all services
- [ ] NATS credentials configured in Secret
- [ ] CPU/memory requests/limits set on all deployments
- [ ] Node autoscaling enabled (GKE/EKS/AKS)

### Deployment Commands

```bash
# Apply KEDA scalers
kubectl apply -f /home/user/TEEI-CSR-Platform/k8s/base/keda/q2q-ai-scaler.yaml
kubectl apply -f /home/user/TEEI-CSR-Platform/k8s/base/keda/reporting-scaler.yaml
kubectl apply -f /home/user/TEEI-CSR-Platform/k8s/base/keda/impact-calculator-scaler.yaml

# Verify ScaledObjects
kubectl get scaledobject -n default

# Check HPA status
kubectl get hpa -n default

# Watch real-time scaling
kubectl get hpa -n default -w
```

### Validation Queries

**Check KEDA metrics**:
```bash
# Q2Q-AI NATS scaler
kubectl get scaledobject teei-q2q-ai-scaler -o yaml | grep -A 10 status

# Reporting HTTP scaler
kubectl get scaledobject teei-reporting-scaler -o yaml | grep -A 10 status

# Impact Calculator HPA
kubectl get hpa teei-impact-calculator-hpa -o yaml
```

**Monitor pod scaling**:
```bash
# Real-time pod count
watch kubectl get pods -l app=teei-q2q-ai

# Scaling events
kubectl get events --sort-by=.lastTimestamp | grep -i scal

# CPU utilization
kubectl top pods -n default
```

**KEDA metrics in Prometheus**:
```promql
# Q2Q-AI queue depth
nats_stream_consumer_pending_messages{stream="Q2Q_TASKS",consumer="q2q-ai-consumer"}

# Reporting request rate
sum(rate(http_requests_total{service="teei-reporting"}[1m]))

# HPA current replicas
kube_hpa_status_current_replicas{hpa="teei-impact-calculator-hpa"}

# HPA desired replicas
kube_hpa_status_desired_replicas{hpa="teei-impact-calculator-hpa"}
```

### Running Load Tests

```bash
# 1. Ensure services are running
kubectl get pods -n default

# 2. Port-forward API gateway (if testing locally)
kubectl port-forward svc/teei-api-gateway 4321:80

# 3. Run k6 test
k6 run tests/load/keda-validation.js

# 4. Monitor scaling in separate terminal
watch kubectl get hpa -n default

# 5. Check CPU utilization
watch kubectl top pods -n default

# 6. Review results
cat results/keda-validation-summary.json | jq '.metrics.http_req_duration.values'
open results/keda-validation-summary.html
```

### Expected Scaling Behavior

**Baseline (10 VUs)**:
- Q2Q-AI: 2 replicas (min)
- Reporting: 3 replicas (min)
- Impact Calculator: 2 replicas (min)

**Sustained Load (100 VUs)**:
- Q2Q-AI: 6-8 replicas (~300 messages in queue)
- Reporting: 8-10 replicas (~400 req/s total)
- Impact Calculator: 4-6 replicas (~60% CPU avg)

**Burst (200 VUs)**:
- Q2Q-AI: 12-15 replicas (~1200 messages in queue)
- Reporting: 12-15 replicas (~800 req/s total)
- Impact Calculator: 8-10 replicas (~70-80% CPU avg)

**Ramp Down (50 VUs)**:
- After 5 minutes stabilization, all services should scale back to ~4-6 replicas
- After 10 minutes, should approach min replicas

---

## Performance Targets & SLOs

### Latency SLOs

| Service | P50 Target | P95 Target | P99 Target |
|---------|-----------|-----------|-----------|
| Q2Q-AI | <800ms | <2000ms | <3000ms |
| Reporting | <500ms | <1500ms | <2500ms |
| Impact Calculator | <300ms | <1000ms | <1500ms |

### Scaling SLOs

| Metric | Target | Measurement |
|--------|--------|-------------|
| Scale-Up Latency | <30s | Time from threshold breach to pod ready |
| Scale-Down Delay | 5 min | Stabilization window |
| CPU P95 | <80% | 95th percentile CPU utilization |
| Error Rate | <5% | Failed requests / total requests |
| Thrashing Events | 0 | Scale-up immediately followed by scale-down |

### Cost Targets

**Baseline Cost** (min replicas):
- Q2Q-AI: 2 pods × $0.05/hr = $0.10/hr = $73/month
- Reporting: 3 pods × $0.05/hr = $0.15/hr = $109/month
- Impact Calculator: 2 pods × $0.05/hr = $0.10/hr = $73/month
- **Total**: $255/month

**Peak Cost** (max replicas, sustained 24/7):
- Q2Q-AI: 20 pods × $0.05/hr = $1.00/hr = $730/month
- Reporting: 15 pods × $0.05/hr = $0.75/hr = $548/month
- Impact Calculator: 10 pods × $0.05/hr = $0.50/hr = $365/month
- **Total**: $1,643/month

**Realistic Cost** (average 30% scale-up):
- Q2Q-AI: 4 pods average = $146/month
- Reporting: 5 pods average = $182/month
- Impact Calculator: 3 pods average = $109/month
- **Total**: $437/month

**Cost Savings vs Fixed Provisioning**:
- Fixed at peak: $1,643/month
- Autoscaling average: $437/month
- **Savings**: $1,206/month (73% reduction)

---

## Troubleshooting Guide

### Issue: Pods not scaling up

**Symptoms**:
- HPA shows desired replicas = current replicas
- High latency but no new pods

**Diagnosis**:
```bash
# Check ScaledObject status
kubectl describe scaledobject teei-q2q-ai-scaler

# Check HPA status
kubectl describe hpa teei-q2q-ai-scaler

# Check KEDA operator logs
kubectl logs -n keda -l app=keda-operator --tail=100
```

**Common Causes**:
1. **Metrics unavailable**: NATS/Prometheus unreachable
   - Fix: Verify connectivity, check network policies
2. **Metric below threshold**: Queue depth <100 or request rate <50
   - Fix: Review metric values, adjust threshold if needed
3. **Max replicas reached**: Already at maxReplicaCount
   - Fix: Increase maxReplicaCount or optimize workload
4. **Resource constraints**: Cluster out of capacity
   - Fix: Enable cluster autoscaling or add nodes

### Issue: Excessive thrashing (rapid scale-up/down)

**Symptoms**:
- Pods scaling up and down every few minutes
- High churn in pod events

**Diagnosis**:
```bash
# Check scaling events
kubectl get events --sort-by=.lastTimestamp | grep -i scal

# Monitor HPA over time
kubectl get hpa -n default -w
```

**Common Causes**:
1. **Threshold too low**: Triggers on normal traffic variation
   - Fix: Increase lagThreshold/threshold by 20-30%
2. **Insufficient stabilization**: Scale-down too aggressive
   - Fix: Increase stabilizationWindowSeconds
3. **Bursty workload**: Short spikes followed by lulls
   - Fix: Increase scaleDown stabilization, decrease scaleUp policies

### Issue: High latency during scale-up

**Symptoms**:
- P95 latency >3s during ramp-up
- Requests queuing during burst

**Diagnosis**:
```bash
# Check pod startup times
kubectl get events --sort-by=.lastTimestamp | grep -i pull

# Review startup probe config
kubectl get deployment teei-q2q-ai -o yaml | grep -A 10 startupProbe
```

**Common Causes**:
1. **Slow image pull**: Large images or slow registry
   - Fix: Use imagePullPolicy: IfNotPresent, optimize image size
2. **Slow application startup**: Long initialization
   - Fix: Optimize startup code, use readiness probes correctly
3. **Insufficient scale-up rate**: Max 4 pods/30s too slow
   - Fix: Increase maxScaleUp policies (e.g., 6 pods/30s)

### Issue: CPU utilization >80% despite autoscaling

**Symptoms**:
- Impact Calculator at 80-90% CPU
- HPA at max replicas

**Diagnosis**:
```bash
# Check current CPU usage
kubectl top pods -l app=teei-impact-calculator

# Review HPA config
kubectl get hpa teei-impact-calculator-hpa -o yaml
```

**Common Causes**:
1. **Insufficient max replicas**: 10 not enough for load
   - Fix: Increase maxReplicaCount
2. **CPU target too high**: 70% leaves little headroom
   - Fix: Reduce target to 60%
3. **Workload optimization needed**: Inefficient calculations
   - Fix: Profile code, optimize algorithms

---

## Next Steps

### Phase J3.3: SLO Dashboard Creation
- Create Grafana dashboard with KEDA metrics
- Add alerting for scaling anomalies
- Set up cost tracking dashboard

### Phase J3.4: Error Budget Tracking
- Define error budgets for each service
- Implement budget burn-rate alerts
- Create weekly error budget reports

### Production Readiness Tasks

1. **Security**:
   - [ ] Replace NATS placeholder credentials with actual secrets
   - [ ] Use External Secrets Operator or Sealed Secrets
   - [ ] Implement RBAC for KEDA operator
   - [ ] Enable Pod Security Standards

2. **Observability**:
   - [ ] Add KEDA metrics to Prometheus
   - [ ] Create Grafana dashboards for scaling events
   - [ ] Set up PagerDuty/Opsgenie alerts
   - [ ] Configure log aggregation for KEDA operator

3. **Testing**:
   - [ ] Run k6 validation test in staging
   - [ ] Verify scale-up latency <30s
   - [ ] Confirm scale-down delay prevents thrashing
   - [ ] Load test at 2x expected peak traffic

4. **Documentation**:
   - [ ] Add runbook for scaling incidents
   - [ ] Document metric thresholds and tuning rationale
   - [ ] Create on-call guide for HPA troubleshooting
   - [ ] Update architecture diagrams with KEDA

5. **Cost Optimization**:
   - [ ] Enable cluster autoscaling
   - [ ] Configure pod topology spread constraints
   - [ ] Implement preemptible/spot instances for non-critical pods
   - [ ] Set up cost alerts in cloud provider console

---

## Appendix A: KEDA Scaler Reference

### Supported Scalers

KEDA supports 50+ scalers, including:

**Message Queues**:
- NATS JetStream (used in this deployment)
- RabbitMQ, Kafka, AWS SQS, Azure Service Bus, Google Pub/Sub

**Metrics**:
- Prometheus (used in this deployment)
- Datadog, New Relic, AppDynamics
- Custom metrics API

**Cloud Services**:
- AWS CloudWatch, Azure Monitor, GCP Stackdriver
- AWS DynamoDB, Kinesis, SQS
- Azure Blob Storage, Event Hubs, Cosmos DB

**Databases**:
- PostgreSQL, MySQL, Redis, MongoDB, Elasticsearch

**HTTP**:
- HTTP endpoint scraping
- GraphQL

### ScaledObject Spec Reference

```yaml
apiVersion: keda.sh/v1alpha1
kind: ScaledObject
metadata:
  name: {name}
spec:
  scaleTargetRef:
    name: {deployment-name}                  # Required
    kind: Deployment                         # Optional, default: Deployment
    apiVersion: apps/v1                      # Optional, default: apps/v1
    envSourceContainerName: {container}      # Optional
  pollingInterval: 30                        # Optional, default: 30s
  cooldownPeriod: 300                        # Optional, default: 300s
  idleReplicaCount: 0                        # Optional, default: ignored
  minReplicaCount: 0                         # Optional, default: 0
  maxReplicaCount: 100                       # Optional, default: 100
  fallback:                                  # Optional
    failureThreshold: 3
    replicas: 6
  advanced:                                  # Optional
    restoreToOriginalReplicaCount: false
    horizontalPodAutoscalerConfig:
      behavior:
        scaleDown:
          stabilizationWindowSeconds: 300
          policies: [...]
        scaleUp:
          stabilizationWindowSeconds: 0
          policies: [...]
  triggers:                                  # Required
    - type: {scaler-type}
      metadata:
        {scaler-specific-config}
      authenticationRef:
        name: {trigger-auth-name}
```

---

## Appendix B: k6 Load Test CLI Reference

### Basic Usage

```bash
# Run test
k6 run script.js

# Run with custom VUs and duration
k6 run --vus 100 --duration 5m script.js

# Run with environment variables
k6 run --env BASE_URL=https://prod.example.com script.js

# Run with multiple environment variables
k6 run \
  --env BASE_URL=https://prod.example.com \
  --env API_TOKEN=$API_TOKEN \
  script.js
```

### Advanced Usage

```bash
# Run with custom stage configuration (override script)
k6 run --stage 1m:10,5m:100,1m:0 script.js

# Run with custom thresholds
k6 run --threshold 'http_req_duration=p(95)<2000' script.js

# Run distributed test (cloud)
k6 cloud script.js

# Run and output to InfluxDB
k6 run --out influxdb=http://localhost:8086/k6 script.js

# Run with custom summary export
k6 run --summary-export=summary.json script.js

# Run in quiet mode (less output)
k6 run --quiet script.js

# Run with custom log level
k6 run --log-level=debug script.js
```

### Monitoring During Test

```bash
# Watch HPA scaling
watch kubectl get hpa -n default

# Watch pod count
watch kubectl get pods -n default

# Watch CPU utilization
watch kubectl top pods -n default

# Stream KEDA operator logs
kubectl logs -n keda -l app=keda-operator -f

# Monitor scaling events
kubectl get events -n default -w | grep -i scal
```

---

## Appendix C: Prometheus Queries for KEDA Monitoring

### Scaling Metrics

```promql
# Current replica count
kube_deployment_status_replicas{deployment="teei-q2q-ai"}

# Desired replica count (from HPA)
kube_hpa_status_desired_replicas{hpa=~"teei-.*-scaler"}

# Current vs desired replicas (scaling lag)
kube_hpa_status_desired_replicas - kube_hpa_status_current_replicas

# Scaling events (scale-up/down count)
rate(kube_hpa_status_desired_replicas[5m])
```

### Queue Depth Metrics (NATS)

```promql
# Current queue depth
nats_stream_consumer_pending_messages{stream="Q2Q_TASKS"}

# Queue depth trend
rate(nats_stream_consumer_pending_messages{stream="Q2Q_TASKS"}[5m])

# Messages delivered per second
rate(nats_stream_consumer_delivered_messages{stream="Q2Q_TASKS"}[1m])

# Consumer lag (pending - delivered)
nats_stream_consumer_pending_messages - nats_stream_consumer_ack_pending
```

### Request Rate Metrics

```promql
# Current request rate (req/s)
sum(rate(http_requests_total{service="teei-reporting"}[1m]))

# Request rate per pod
sum(rate(http_requests_total{service="teei-reporting"}[1m])) by (pod)

# Request rate trend (5-minute window)
avg_over_time(sum(rate(http_requests_total{service="teei-reporting"}[1m]))[5m:])
```

### CPU Utilization Metrics

```promql
# Current CPU utilization (%)
100 * sum(rate(container_cpu_usage_seconds_total{pod=~"teei-impact-calculator.*"}[1m])) / sum(kube_pod_container_resource_requests{pod=~"teei-impact-calculator.*",resource="cpu"})

# P95 CPU utilization over 5 minutes
histogram_quantile(0.95, sum(rate(container_cpu_usage_seconds_total{pod=~"teei-impact-calculator.*"}[5m])) by (le))

# CPU throttling (requests exceeding limits)
rate(container_cpu_cfs_throttled_seconds_total{pod=~"teei-impact-calculator.*"}[1m])
```

### Alerting Queries

```promql
# Alert: HPA at max replicas for >5 minutes
(kube_hpa_status_current_replicas == kube_hpa_spec_max_replicas) and (kube_hpa_status_current_replicas > 1)

# Alert: Scaling lag >2 minutes
(kube_hpa_status_desired_replicas - kube_hpa_status_current_replicas) > 0 for 2m

# Alert: CPU throttling >10%
rate(container_cpu_cfs_throttled_seconds_total[5m]) > 0.1

# Alert: Queue depth growing rapidly
deriv(nats_stream_consumer_pending_messages[5m]) > 100
```

---

## Conclusion

The KEDA autoscaling deployment is complete and ready for validation testing. All configuration files follow Kubernetes best practices, include comprehensive tuning rationale, and are production-ready pending credential updates and load testing.

**Key Achievements**:
✅ 3 KEDA/HPA configuration files created
✅ Scale-up latency <30s configured
✅ Scale-down delay (5 min) prevents thrashing
✅ k6 load test script ready for validation
✅ Comprehensive documentation with tuning rationale

**Next Actions**:
1. Deploy KEDA operator to cluster
2. Apply ScaledObject and HPA configurations
3. Run k6 validation test
4. Monitor scaling behavior and adjust thresholds
5. Create Grafana dashboards (Phase J3.3)

---

**Report Path**: `/home/user/TEEI-CSR-Platform/reports/worker1_phaseJ/keda_deployment_summary.md`
**Agent**: keda-tuner
**Status**: ✅ Complete
