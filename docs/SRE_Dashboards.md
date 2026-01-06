# SRE Dashboards & Runbooks

**Version:** 1.0.0
**Last Updated:** Phase B Hardening
**Owner:** Reliability Lead

## Table of Contents

1. [Dashboard Guide](#dashboard-guide)
2. [Incident Response](#incident-response)
3. [Runbooks](#runbooks)
4. [Alerting Rules](#alerting-rules)
5. [On-Call Procedures](#on-call-procedures)
6. [Escalation Matrix](#escalation-matrix)

---

## Dashboard Guide

### Service Overview Dashboard

**Purpose:** High-level health monitoring for all services

**Location:** Grafana → Dashboards → Service Overview

**Key Metrics:**
- Services Up/Down count
- Total request rate across platform
- Platform-wide error rate
- Average response time

**When to Check:**
- Daily health check
- After deployments
- During incidents
- Performance reviews

**Critical Thresholds:**
```
Services Down > 0 → CRITICAL
Error Rate > 5% → WARNING
Error Rate > 10% → CRITICAL
Response Time > 2s → WARNING
Response Time > 5s → CRITICAL
```

### API Gateway Dashboard

**Purpose:** Monitor gateway performance and downstream health

**Key Metrics:**
- Request rate by route
- Response time percentiles (p50, p95, p99)
- Error rate by status code
- Downstream service latency
- Active connections

**Critical Thresholds:**
```
p95 Response Time > 1s → WARNING
p95 Response Time > 3s → CRITICAL
Error Rate > 2% → WARNING
Downstream Service Unavailable → CRITICAL
Active Connections > 1000 → WARNING
```

### Database Performance Dashboard

**Purpose:** Monitor PostgreSQL query performance

**Key Metrics:**
- Query rate by operation
- Query duration (p95)
- Success vs error counts
- Queries by table
- Connection pool usage

**Critical Thresholds:**
```
Query Duration p95 > 100ms → WARNING
Query Duration p95 > 500ms → CRITICAL
Query Error Rate > 1% → WARNING
Query Error Rate > 5% → CRITICAL
Connection Pool > 80% → WARNING
```

### Event Bus Dashboard

**Purpose:** Monitor NATS event processing

**Key Metrics:**
- Events processed/published per second
- Event processing duration
- Queue sizes
- Success vs error rates
- Dead letter queue size

**Critical Thresholds:**
```
Event Error Rate > 1% → WARNING
Event Error Rate > 5% → CRITICAL
Queue Size > 1000 → WARNING
Queue Size > 5000 → CRITICAL
DLQ Size > 0 → WARNING
DLQ Size > 100 → CRITICAL
```

### Node.js Runtime Dashboard

**Purpose:** Monitor service health at runtime level

**Key Metrics:**
- Heap memory usage
- Event loop lag
- CPU usage
- GC duration
- Active handles/requests

**Critical Thresholds:**
```
Heap Used > 80% Total → WARNING
Heap Used > 90% Total → CRITICAL
Event Loop Lag > 100ms → WARNING
Event Loop Lag > 500ms → CRITICAL
CPU Usage > 70% → WARNING
GC Duration > 100ms → WARNING
```

---

## Incident Response

### Severity Levels

#### SEV1 - Critical
- **Definition:** Platform-wide outage or data loss
- **Response Time:** Immediate (< 5 minutes)
- **Examples:**
  - All services down
  - Database unavailable
  - Data corruption detected
  - Security breach

#### SEV2 - High
- **Definition:** Major feature unavailable or severe degradation
- **Response Time:** < 15 minutes
- **Examples:**
  - Single service down
  - 50%+ error rate
  - Authentication failing
  - Critical API endpoints down

#### SEV3 - Medium
- **Definition:** Partial degradation, workaround available
- **Response Time:** < 1 hour
- **Examples:**
  - Non-critical feature unavailable
  - 10-50% error rate
  - Performance degradation
  - One downstream integration failing

#### SEV4 - Low
- **Definition:** Minor issue, minimal user impact
- **Response Time:** Next business day
- **Examples:**
  - Minor UI bugs
  - Logging issues
  - Documentation gaps
  - < 10% error rate

### Incident Response Workflow

```
┌─────────────────────────────────────────────────────────┐
│                    Incident Detected                    │
│          (Alert, User Report, Monitoring)               │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  1. ACKNOWLEDGE                                         │
│  - Acknowledge alert in monitoring system               │
│  - Create incident ticket (Jira/PagerDuty)             │
│  - Start incident timer                                 │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  2. ASSESS                                              │
│  - Determine severity (SEV1-4)                         │
│  - Check dashboards for scope                          │
│  - Review recent changes/deployments                    │
│  - Check correlation IDs in logs                        │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  3. COMMUNICATE                                         │
│  - Post in #incidents Slack channel                     │
│  - Update status page if customer-facing                │
│  - Set up war room for SEV1/SEV2                       │
│  - Notify stakeholders per escalation matrix            │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  4. MITIGATE                                            │
│  - Follow relevant runbook (see below)                  │
│  - Apply temporary fixes if needed                      │
│  - Document all actions taken                           │
│  - Monitor metrics during mitigation                    │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  5. RESOLVE                                             │
│  - Verify metrics returned to normal                    │
│  - Confirm with affected users                          │
│  - Update incident ticket                               │
│  - Close alert in monitoring system                     │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  6. POST-MORTEM                                         │
│  - Schedule within 48 hours                             │
│  - Document timeline, root cause, impact                │
│  - Identify action items and owners                     │
│  - Update runbooks based on learnings                   │
└─────────────────────────────────────────────────────────┘
```

---

## Runbooks

### RB-001: Service Unavailable

**Symptoms:**
- Health check returning 503
- Service not responding
- High error rate (>50%)

**Diagnosis Steps:**
```bash
# 1. Check service status
curl http://localhost:PORT/health/liveness

# 2. Check service logs
docker logs CONTAINER_NAME --tail 100

# 3. Check resource usage
docker stats CONTAINER_NAME

# 4. Check dependencies
curl http://localhost:PORT/health/readiness
```

**Resolution:**
```bash
# Option 1: Restart service
docker restart CONTAINER_NAME

# Option 2: Check for stuck processes
docker exec CONTAINER_NAME ps aux

# Option 3: Scale up if resource constrained
docker-compose up --scale SERVICE_NAME=2 -d

# Option 4: Rollback recent deployment
git revert COMMIT_HASH
docker-compose up -d --build
```

**Prevention:**
- Review resource limits
- Check for memory leaks
- Review recent code changes
- Add more comprehensive health checks

---

### RB-002: High Response Time

**Symptoms:**
- p95 response time > 1s
- Slow API responses
- User complaints about performance

**Diagnosis Steps:**
```bash
# 1. Check current latency
curl -w "@curl-format.txt" -o /dev/null -s http://localhost:PORT/api/endpoint

# 2. Check database query performance
# Access Grafana → Database Performance
# Look for slow queries

# 3. Check event loop lag
# Access Grafana → Node.js Runtime → Event Loop Lag

# 4. Check for high CPU usage
docker stats --no-stream
```

**Resolution:**
```bash
# Immediate: Add caching layer
# Deploy Redis cache for frequently accessed data

# Short-term: Scale horizontally
docker-compose up --scale SERVICE_NAME=3 -d

# Long-term: Optimize slow queries
# Use EXPLAIN ANALYZE to identify bottlenecks
# Add database indexes
# Optimize N+1 queries
```

**Prevention:**
- Implement query result caching
- Add database indexes
- Use connection pooling
- Enable database query logging

---

### RB-003: Database Connection Failures

**Symptoms:**
- "Connection refused" errors
- "Too many connections" errors
- Service health check failing for database dependency

**Diagnosis Steps:**
```bash
# 1. Check database is running
docker ps | grep postgres

# 2. Check connection count
docker exec postgres_container psql -U postgres -c "SELECT count(*) FROM pg_stat_activity;"

# 3. Check max connections setting
docker exec postgres_container psql -U postgres -c "SHOW max_connections;"

# 4. Check for connection leaks
# Review service logs for unclosed connections
```

**Resolution:**
```bash
# Immediate: Restart database
docker restart postgres_container

# If "too many connections":
# 1. Increase max_connections in postgresql.conf
# 2. Add connection pooling (PgBouncer)
# 3. Fix connection leaks in application code

# If persistent issues:
# Check for long-running queries
docker exec postgres_container psql -U postgres -c "SELECT pid, now() - query_start as duration, query FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC;"

# Kill long-running queries if needed
docker exec postgres_container psql -U postgres -c "SELECT pg_terminate_backend(PID);"
```

**Prevention:**
- Implement connection pooling
- Set connection timeouts
- Monitor connection count
- Add alerts for high connection usage

---

### RB-004: NATS Event Bus Issues

**Symptoms:**
- Events not being processed
- High queue sizes
- Event processing errors

**Diagnosis Steps:**
```bash
# 1. Check NATS status
curl http://localhost:8222/varz

# 2. Check queue depths
# Access Grafana → Event Bus → Queue Sizes

# 3. Check for consumer lag
# Look at events_processed_total vs events_published_total

# 4. Check NATS logs
docker logs nats_container --tail 100
```

**Resolution:**
```bash
# Immediate: Restart NATS consumers
docker restart SERVICE_NAME

# If high queue depths:
# 1. Scale up consumers
docker-compose up --scale SERVICE_NAME=3 -d

# 2. Process messages in DLQ
# Check /packages/events/dlq.ts for retry logic

# If persistent issues:
# 1. Check for poison messages
# 2. Review event processing logic
# 3. Increase processing parallelism
```

**Prevention:**
- Monitor queue depths
- Implement dead letter queues
- Add circuit breakers
- Set message TTLs

---

### RB-005: High Error Rate

**Symptoms:**
- Error rate > 5%
- Spike in 500 errors
- Sentry alerts firing

**Diagnosis Steps:**
```bash
# 1. Check error types in Sentry
# Access Sentry → Issues → Filter by time range

# 2. Check error distribution
# Access Grafana → Service Overview → Error Rate by Service

# 3. Check correlation IDs
# Find affected requests in logs
grep "ERROR" logs/*.log | grep CORRELATION_ID

# 4. Check recent deployments
git log --since="1 hour ago"
```

**Resolution:**
```bash
# If caused by deployment:
# Rollback immediately
git revert COMMIT_HASH
docker-compose up -d --build

# If specific endpoint:
# 1. Disable endpoint temporarily
# 2. Add circuit breaker
# 3. Fix and redeploy

# If third-party integration:
# 1. Enable fallback/cache
# 2. Contact vendor
# 3. Implement retry logic
```

**Prevention:**
- Implement canary deployments
- Add comprehensive error handling
- Use circuit breakers for external calls
- Enable feature flags for risky changes

---

### RB-006: Memory Leak

**Symptoms:**
- Heap memory continuously growing
- OOM errors
- Service crashes with heap exhausted

**Diagnosis Steps:**
```bash
# 1. Check current memory usage
docker stats --no-stream SERVICE_NAME

# 2. Check heap usage trend
# Access Grafana → Node.js Runtime → Heap Memory Usage

# 3. Take heap snapshot
docker exec SERVICE_NAME kill -USR2 1
# Snapshot saved to /tmp/heapdump-*.heapsnapshot

# 4. Analyze with Chrome DevTools
# Open chrome://inspect
# Load heapsnapshot file
```

**Resolution:**
```bash
# Immediate: Restart service
docker restart SERVICE_NAME

# Short-term: Increase memory limit
# Edit docker-compose.yml
# Add: mem_limit: 2g

# Long-term: Fix memory leak
# 1. Analyze heap snapshot
# 2. Identify leaking objects
# 3. Fix code and redeploy
```

**Common Causes:**
- Event emitter leaks (missing .off())
- Unclosed database connections
- Large in-memory caches
- Circular references

**Prevention:**
- Regular memory profiling
- Monitor heap usage trends
- Use WeakMap for caches
- Implement memory limits

---

### RB-007: Authentication Failures

**Symptoms:**
- 401 Unauthorized errors
- JWT validation failures
- Users unable to login

**Diagnosis Steps:**
```bash
# 1. Check JWT secret is configured
echo $JWT_SECRET

# 2. Check JWKS endpoint
curl http://localhost:3000/auth/jwks

# 3. Check token expiry
# Decode JWT at jwt.io

# 4. Check auth service logs
docker logs api-gateway --tail 100 | grep "auth"
```

**Resolution:**
```bash
# If JWT secret misconfigured:
# 1. Update environment variable
# 2. Restart service

# If JWKS endpoint down:
# 1. Check API Gateway health
# 2. Restart if needed

# If SSO provider issues:
# 1. Check provider status page
# 2. Test OAuth flow manually
# 3. Contact provider support
```

**Prevention:**
- Monitor authentication success rate
- Set up alerts for auth failures > 5%
- Regular token rotation testing
- Backup authentication method

---

## Alerting Rules

### Critical Alerts

```yaml
# Service Down
- alert: ServiceDown
  expr: up{job=~"teei-.*"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "Service {{ $labels.job }} is down"
    runbook: RB-001

# High Error Rate
- alert: HighErrorRate
  expr: |
    sum(rate(http_requests_total{status_code=~"5.."}[5m])) by (service) /
    sum(rate(http_requests_total[5m])) by (service) > 0.05
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "High error rate on {{ $labels.service }}"
    runbook: RB-005

# Database Down
- alert: DatabaseDown
  expr: up{job="postgres"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "PostgreSQL database is down"
    runbook: RB-003

# NATS Down
- alert: NATSDown
  expr: up{job="nats"} == 0
  for: 1m
  labels:
    severity: critical
  annotations:
    summary: "NATS event bus is down"
    runbook: RB-004
```

### Warning Alerts

```yaml
# High Response Time
- alert: HighResponseTime
  expr: |
    histogram_quantile(0.95,
      sum(rate(http_request_duration_seconds_bucket[5m])) by (service, le)
    ) > 1
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High response time on {{ $labels.service }}"
    runbook: RB-002

# High Memory Usage
- alert: HighMemoryUsage
  expr: |
    nodejs_heap_size_used_bytes / nodejs_heap_size_total_bytes > 0.8
  for: 10m
  labels:
    severity: warning
  annotations:
    summary: "High memory usage on {{ $labels.service }}"
    runbook: RB-006

# High Queue Depth
- alert: HighQueueDepth
  expr: queue_size > 1000
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "High queue depth: {{ $labels.queue_name }}"
    runbook: RB-004

# Event Loop Lag
- alert: EventLoopLag
  expr: nodejs_eventloop_lag_seconds > 0.1
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Event loop lag on {{ $labels.service }}"
    runbook: RB-002
```

---

## On-Call Procedures

### On-Call Rotation

- **Primary:** Week-long rotation, Mon-Mon
- **Secondary:** Backup escalation
- **Handoff:** Friday 5pm with current incident summary

### On-Call Responsibilities

1. **Respond to Alerts:** < 5 minutes for SEV1, < 15 minutes for SEV2
2. **Monitor Dashboards:** Check service health twice daily
3. **Document Actions:** All incidents logged in wiki
4. **Escalate When Needed:** Don't hesitate to involve specialists
5. **Post-Mortem:** Complete within 48 hours of resolution

### On-Call Tools

- **Monitoring:** Grafana, Prometheus
- **Alerting:** PagerDuty (or equivalent)
- **Logging:** Kibana, Sentry
- **Communication:** Slack #incidents channel
- **Documentation:** Confluence/Wiki

### Response Time SLAs

| Severity | Acknowledge | Initial Response | Resolution Target |
|----------|-------------|------------------|-------------------|
| SEV1 | 5 minutes | 10 minutes | 1 hour |
| SEV2 | 15 minutes | 30 minutes | 4 hours |
| SEV3 | 1 hour | 2 hours | 24 hours |
| SEV4 | Next business day | 1 business day | 1 week |

---

## Escalation Matrix

### Level 1: On-Call Engineer
- **When:** All alerts, initial response
- **Contact:** PagerDuty
- **Response:** Acknowledge and assess

### Level 2: Platform Lead
- **When:** SEV1/SEV2 not resolved in 30 minutes
- **Contact:** Phone + Slack
- **Response:** Provide guidance, coordinate resources

### Level 3: Engineering Manager
- **When:** SEV1 not resolved in 1 hour, or customer escalation
- **Contact:** Phone
- **Response:** Executive decision making, customer communication

### Level 4: CTO
- **When:** Major outage > 2 hours, security incident, data loss
- **Contact:** Phone (emergency only)
- **Response:** Executive leadership, external communication

### Specialist Contacts

| Area | Contact | When to Escalate |
|------|---------|------------------|
| Database | DBA Team | Query performance, data corruption |
| Security | Security Team | Auth issues, potential breaches |
| Infrastructure | DevOps | Kubernetes, networking issues |
| Application | Dev Team Lead | Complex bugs, deployment issues |

---

## Key Commands Reference

### Health Checks
```bash
# Check all services
for port in 3000 3001 3002 3003 3004 3005 3006; do
  echo "Port $port:"
  curl -s http://localhost:$port/health/liveness | jq '.status'
done

# Check specific service with dependencies
curl http://localhost:3001/health | jq '.'
```

### Logs
```bash
# Tail all service logs
docker-compose logs -f

# Search for errors with correlation ID
docker logs SERVICE_NAME 2>&1 | grep -A 5 CORRELATION_ID

# Export logs for analysis
docker logs SERVICE_NAME > /tmp/service.log 2>&1
```

### Metrics
```bash
# Get current metrics
curl http://localhost:PORT/metrics

# Query Prometheus
curl 'http://localhost:9090/api/v1/query?query=up'

# Check specific metric
curl 'http://localhost:9090/api/v1/query?query=http_requests_total'
```

### Database
```bash
# Connect to database
docker exec -it postgres_container psql -U postgres -d teei_csr

# Check active connections
SELECT count(*) FROM pg_stat_activity;

# Check slow queries
SELECT pid, now() - query_start as duration, query
FROM pg_stat_activity
WHERE state != 'idle'
ORDER BY duration DESC
LIMIT 10;
```

### NATS
```bash
# Check NATS status
curl http://localhost:8222/varz | jq '.'

# Check connections
curl http://localhost:8222/connz | jq '.'

# Check subscriptions
curl http://localhost:8222/subsz | jq '.'
```

---

## Contact Information

### Emergency Contacts

- **On-Call Primary:** Check PagerDuty schedule
- **On-Call Secondary:** Check PagerDuty schedule
- **Platform Lead:** Slack @platform-lead
- **Engineering Manager:** Phone (in wiki)

### Communication Channels

- **Incidents:** #incidents (Slack)
- **Alerts:** #alerts (Slack)
- **General:** #platform-team (Slack)
- **Customer-Facing:** Status page updates

---

**Last Updated:** Phase B Hardening
**Version:** 1.0.0
**Review Frequency:** Quarterly or after major incidents
