# API Degradation Runbook

Troubleshooting guide for API performance and availability issues.

## Quick Reference

**High latency → Check pods → Check database → Check dependencies → Scale/restart**

## Common Symptoms

- API response time >2 seconds (P95)
- Increased error rates (5xx errors)
- Timeouts and failed requests
- Elevated CPU/memory usage
- Circuit breakers tripping

## Prerequisites

- Access to Kubernetes cluster
- Access to Grafana dashboards
- Access to application logs

## API Architecture

```
┌──────────────┐
│   Client     │
└──────┬───────┘
       │
       ▼
┌──────────────────────┐
│  Ingress / ALB       │
└──────┬───────────────┘
       │
       ▼
┌──────────────────────┐
│  API Gateway         │  ◄── Rate limiting, auth
│  (replicas: 3-10)    │
└──────┬───────────────┘
       │
       ├─► Reporting Service
       ├─► Impact Calculator
       ├─► Q2Q AI Service
       ├─► Analytics Service
       └─► Journey Engine
              │
              ▼
       ┌─────────────┐
       │ PostgreSQL  │
       └─────────────┘
```

## Issue 1: High Latency (P95 >2s)

### Symptoms

```
Grafana Alert: API Latency High
http_request_duration_seconds{quantile="0.95"} > 2.0
Users reporting slow page loads
```

### Check

```bash
# Check current latency
kubectl exec -it -n teei-csr <api-pod> -- curl http://localhost:3000/metrics | grep http_request_duration

# Check pod CPU/memory
kubectl top pods -n teei-csr -l app=api-gateway

# Check pod logs for slow requests
kubectl logs -n teei-csr -l app=api-gateway --tail=100 | grep -E "(slow|timeout|duration)"
```

### Root Causes

1. **Database queries slow** - See [Database Issues](./database_issues.md)
2. **External API timeout** - Third-party service degraded
3. **CPU throttling** - Pods hitting CPU limits
4. **Memory pressure** - Pods running out of memory
5. **Network congestion** - Inter-service communication slow

### Mitigation

#### Option 1: Scale Horizontally

```bash
# Check current replicas
kubectl get deployment api-gateway -n teei-csr

# Scale up replicas
kubectl scale deployment api-gateway -n teei-csr --replicas=10

# Verify new pods are ready
kubectl get pods -n teei-csr -l app=api-gateway -w
```

#### Option 2: Increase Resource Limits

```bash
# Check current limits
kubectl describe pod <api-pod> -n teei-csr | grep -A 10 "Limits:"

# Edit deployment to increase limits
kubectl edit deployment api-gateway -n teei-csr

# Update:
resources:
  requests:
    cpu: 1000m      # Was 500m
    memory: 1Gi     # Was 512Mi
  limits:
    cpu: 2000m      # Was 1000m
    memory: 2Gi     # Was 1Gi
```

#### Option 3: Enable Caching

```bash
# Edit ConfigMap to enable Redis cache
kubectl edit configmap api-gateway-config -n teei-csr

# Add or update:
REDIS_ENABLED: "true"
REDIS_TTL_SECONDS: "300"
CACHE_STRATEGY: "write-through"

# Restart pods to pick up config
kubectl rollout restart deployment/api-gateway -n teei-csr
```

#### Option 4: Identify Slow Endpoint

```bash
# Check per-endpoint latency
kubectl exec -it -n teei-csr <api-pod> -- curl http://localhost:3000/metrics | grep http_request_duration_seconds | sort -t '{' -k2

# Example output:
# http_request_duration_seconds{method="GET",route="/api/reporting/sroi",quantile="0.95"} 8.5
# http_request_duration_seconds{method="GET",route="/api/dashboard",quantile="0.95"} 0.3

# If specific endpoint is slow, check its implementation
kubectl logs -n teei-csr -l app=api-gateway | grep "/api/reporting/sroi"
```

### Prevention

1. Set up latency budgets per endpoint
2. Monitor database query performance
3. Implement circuit breakers for external APIs
4. Use horizontal pod autoscaling (HPA)
5. Cache frequently accessed data

## Issue 2: High Error Rate (5xx Errors)

### Symptoms

```
Grafana Alert: API Error Rate High
rate(http_requests_total{status=~"5.."}[5m]) > 0.05
Error tracking shows spike in 500/502/503 errors
```

### Check

```bash
# Check error rate
kubectl exec -it -n teei-csr <api-pod> -- curl http://localhost:3000/metrics | grep http_requests_total | grep '5..'

# Check recent errors in logs
kubectl logs -n teei-csr -l app=api-gateway --tail=100 | grep -E "(ERROR|Exception|500|502|503)"

# Check pod status
kubectl get pods -n teei-csr -l app=api-gateway
# Look for: CrashLoopBackOff, Error, OOMKilled
```

### Root Causes

1. **Service crashing** - Uncaught exceptions
2. **Dependency unavailable** - Database or external API down
3. **Resource exhaustion** - OOMKilled, disk full
4. **Bad deployment** - Recent code change introduced bug
5. **Rate limiting** - Too many requests

### Mitigation

#### Option 1: Check for Crashes

```bash
# Check pod restarts
kubectl get pods -n teei-csr -l app=api-gateway

# If restarts >0, check crash logs
kubectl logs -n teei-csr <pod-name> --previous

# Common issues:
# - "Cannot find module" → Missing dependency
# - "ECONNREFUSED" → Can't connect to database
# - "FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed" → Out of memory
```

#### Option 2: Rollback Recent Deployment

```bash
# Check recent deployments
kubectl rollout history deployment/api-gateway -n teei-csr

# Rollback to previous version
kubectl rollout undo deployment/api-gateway -n teei-csr

# Monitor error rate
watch 'kubectl logs -n teei-csr -l app=api-gateway --tail=50 | grep -c ERROR'
```

See: [Deployment Rollback](./deployment_rollback.md)

#### Option 3: Check Dependencies

```bash
# Test database connectivity
kubectl exec -it -n teei-csr <api-pod> -- nc -zv postgresql.teei-csr.svc.cluster.local 5432

# Test Redis connectivity
kubectl exec -it -n teei-csr <api-pod> -- nc -zv redis.teei-csr.svc.cluster.local 6379

# Test external API
kubectl exec -it -n teei-csr <api-pod> -- curl -I https://api.auth0.com/api/v2/
```

If dependency is down, see:
- [Database Issues](./database_issues.md) for database problems
- External vendor status pages for third-party services

#### Option 4: Increase Rate Limits

```bash
# Check if rate limiting is causing 429/503 errors
kubectl logs -n teei-csr -l app=api-gateway | grep -c "rate limit exceeded"

# If yes, temporarily increase limits
kubectl edit configmap api-gateway-config -n teei-csr

# Update:
RATE_LIMIT_RPM: "10000"  # Was 5000
RATE_LIMIT_BURST: "200"  # Was 100

# Restart to apply
kubectl rollout restart deployment/api-gateway -n teei-csr
```

### Prevention

1. Implement circuit breakers for all external dependencies
2. Set up proper error tracking (Sentry, Datadog)
3. Add retry logic with exponential backoff
4. Graceful degradation when dependencies fail
5. Canary deployments to catch bugs early

## Issue 3: Request Timeouts

### Symptoms

```
502 Bad Gateway
504 Gateway Timeout
Client timeout errors
```

### Check

```bash
# Check ingress timeout settings
kubectl describe ingress api-gateway -n teei-csr | grep -i timeout

# Check application timeout settings
kubectl get configmap api-gateway-config -n teei-csr -o yaml | grep -i timeout

# Check if requests are slow (not timing out in app)
kubectl logs -n teei-csr -l app=api-gateway | grep -E "(timeout|duration|elapsed)"
```

### Root Causes

1. **Ingress timeout too low** - Kills requests before they complete
2. **Database query timeout** - Long-running queries
3. **External API timeout** - Third-party service slow
4. **Blocking operations** - Synchronous I/O blocking event loop

### Mitigation

#### Option 1: Increase Ingress Timeout

```bash
# Edit ingress annotations
kubectl edit ingress api-gateway -n teei-csr

# Add or update annotations:
metadata:
  annotations:
    nginx.ingress.kubernetes.io/proxy-connect-timeout: "30"
    nginx.ingress.kubernetes.io/proxy-send-timeout: "60"
    nginx.ingress.kubernetes.io/proxy-read-timeout: "60"
```

#### Option 2: Increase Application Timeout

```bash
# Edit application config
kubectl edit configmap api-gateway-config -n teei-csr

# Update:
REQUEST_TIMEOUT_MS: "30000"  # Was 10000
DATABASE_TIMEOUT_MS: "20000" # Was 5000

# Restart
kubectl rollout restart deployment/api-gateway -n teei-csr
```

#### Option 3: Add Async Processing

For long-running operations, switch to async:

```javascript
// Before (synchronous)
app.post('/api/reports/generate', async (req, res) => {
  const report = await generateReport(req.body); // Takes 60 seconds
  res.json(report);
});

// After (asynchronous with job queue)
app.post('/api/reports/generate', async (req, res) => {
  const jobId = await enqueueReportJob(req.body);
  res.json({ jobId, status: 'processing' });
});
```

### Prevention

1. Set realistic timeout values (30-60 seconds)
2. Move long operations to background jobs
3. Add request timeout monitoring
4. Implement streaming responses for large payloads

## Issue 4: Memory Leaks

### Symptoms

```
Pod OOMKilled and restarting
Memory usage steadily increasing
Pods becoming unresponsive
```

### Check

```bash
# Check memory usage trend
kubectl top pods -n teei-csr -l app=api-gateway

# Check if pods are being OOMKilled
kubectl get events -n teei-csr | grep OOMKilled

# Get memory metrics from pod
kubectl exec -it -n teei-csr <api-pod> -- curl http://localhost:3000/metrics | grep process_resident_memory_bytes
```

### Root Causes

1. **Memory leak in code** - Objects not being garbage collected
2. **Large response bodies** - Buffering too much data in memory
3. **Cache growing unbounded** - In-memory cache without eviction
4. **Memory limit too low** - Normal operation exceeds limit

### Mitigation

#### Option 1: Restart Leaking Pods

```bash
# Restart deployment (temporary fix)
kubectl rollout restart deployment/api-gateway -n teei-csr

# Or delete specific pods
kubectl delete pod <pod-name> -n teei-csr
```

#### Option 2: Increase Memory Limit

```bash
# Edit deployment
kubectl edit deployment api-gateway -n teei-csr

# Increase memory limit
resources:
  limits:
    memory: 2Gi  # Was 1Gi
  requests:
    memory: 1Gi  # Was 512Mi
```

#### Option 3: Enable Heap Dumps

```bash
# Edit deployment to enable heap dumps on OOM
kubectl edit deployment api-gateway -n teei-csr

# Add to container args:
args:
  - --max-old-space-size=1536
  - --heapsnapshot-signal=SIGUSR2
  - --max-http-header-size=16384

# Trigger heap dump before OOM
kubectl exec -it -n teei-csr <api-pod> -- kill -SIGUSR2 1

# Copy heap dump for analysis
kubectl cp teei-csr/<pod-name>:/app/heapdump-*.heapsnapshot ./heapdump.heapsnapshot
```

### Prevention

1. Monitor memory usage trends
2. Set memory limits slightly above normal usage
3. Implement cache eviction policies (LRU)
4. Use streaming for large responses
5. Profile application with heap snapshots regularly

## Issue 5: Circuit Breakers Tripping

### Symptoms

```
Logs: "Circuit breaker is OPEN"
Elevated 503 errors
Requests failing fast
```

### Check

```bash
# Check circuit breaker status
kubectl logs -n teei-csr -l app=api-gateway | grep -i "circuit"

# Check metrics
kubectl exec -it -n teei-csr <api-pod> -- curl http://localhost:3000/metrics | grep circuit_breaker
```

### Root Causes

Circuit breakers trip when downstream service is unhealthy:

1. **Database down** - Can't connect to PostgreSQL
2. **External API down** - Third-party service unavailable
3. **Timeout threshold exceeded** - Requests taking too long
4. **Error threshold exceeded** - Too many failed requests

### Mitigation

#### Option 1: Check Downstream Service

```bash
# Check what service the circuit breaker is protecting
kubectl logs -n teei-csr -l app=api-gateway | grep "circuit.*OPEN"

# Example output:
# Circuit breaker OPEN for service: postgresql
# Circuit breaker OPEN for service: auth0-api

# Check that service's health
kubectl get pods -n teei-csr -l app=postgresql
```

#### Option 2: Manually Close Circuit

```bash
# If downstream is healthy but circuit is stuck open
kubectl exec -it -n teei-csr <api-pod> -- curl -X POST http://localhost:3000/admin/circuit-breaker/reset

# Or restart pods to reset circuits
kubectl rollout restart deployment/api-gateway -n teei-csr
```

#### Option 3: Adjust Circuit Breaker Settings

```bash
# If too sensitive, adjust thresholds
kubectl edit configmap api-gateway-config -n teei-csr

# Update:
CIRCUIT_BREAKER_ERROR_THRESHOLD: "50"  # Was 10 (50% errors)
CIRCUIT_BREAKER_TIMEOUT_MS: "5000"     # Was 1000
CIRCUIT_BREAKER_RESET_TIMEOUT_MS: "30000"  # Was 10000

# Restart
kubectl rollout restart deployment/api-gateway -n teei-csr
```

### Prevention

1. Circuit breakers are working as designed (fail fast)
2. Fix downstream service issues
3. Implement graceful degradation (fallback responses)
4. Monitor circuit breaker state changes

## Diagnostic Commands

### Check API Health

```bash
# Health endpoint
curl https://api.teei-csr.com/health

# Readiness probe
kubectl exec -it -n teei-csr <api-pod> -- curl http://localhost:3000/ready

# Liveness probe
kubectl exec -it -n teei-csr <api-pod> -- curl http://localhost:3000/health
```

### Load Test Endpoint

```bash
# Simple load test with hey
kubectl run -it --rm hey --image=williamyeh/hey --restart=Never -- \
  -n 1000 -c 10 https://api.teei-csr.com/api/dashboard

# k6 load test (more comprehensive)
k6 run tests/load/api-gateway-load.js
```

### Check Metrics

```bash
# Port-forward to metrics endpoint
kubectl port-forward -n teei-csr <api-pod> 9090:9090

# Open http://localhost:9090/metrics
# Look for:
# - http_request_duration_seconds
# - http_requests_total
# - process_cpu_seconds_total
# - process_resident_memory_bytes
```

### Trace Request

```bash
# Enable debug logging temporarily
kubectl exec -it -n teei-csr <api-pod> -- curl -X POST http://localhost:3000/admin/log-level -d '{"level":"debug"}'

# Make test request
curl -v https://api.teei-csr.com/api/dashboard

# Watch logs for that request
kubectl logs -n teei-csr <api-pod> --tail=100 --follow

# Disable debug logging
kubectl exec -it -n teei-csr <api-pod> -- curl -X POST http://localhost:3000/admin/log-level -d '{"level":"info"}'
```

## Performance Optimization Checklist

When API is slow:

- [ ] Check database query performance
- [ ] Enable caching (Redis)
- [ ] Implement pagination for large datasets
- [ ] Use connection pooling
- [ ] Enable gzip compression
- [ ] Optimize JSON serialization
- [ ] Use CDN for static assets
- [ ] Implement HTTP/2 or HTTP/3
- [ ] Add indexes to database
- [ ] Review N+1 query patterns

## Related Documentation

- [Database Issues](./database_issues.md)
- [Deployment Rollback](./deployment_rollback.md)
- [Incident Response](./incident_response.md)
- [Load Testing Guide](../../../tests/load/README.md)
