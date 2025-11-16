# NLQ Production Deployment

**Infrastructure requirements, Docker/Kubernetes setup, and production best practices**

---

## Table of Contents

- [Infrastructure Requirements](#infrastructure-requirements)
- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Docker Deployment](#docker-deployment)
- [Kubernetes Deployment](#kubernetes-deployment)
- [Environment Variables](#environment-variables)
- [Database Setup](#database-setup)
- [Redis Configuration](#redis-configuration)
- [ClickHouse Setup (Optional)](#clickhouse-setup-optional)
- [NATS Configuration (Optional)](#nats-configuration-optional)
- [Monitoring & Alerting](#monitoring--alerting)
- [Scaling Strategies](#scaling-strategies)
- [Backup & Disaster Recovery](#backup--disaster-recovery)
- [Security Hardening](#security-hardening)

---

## Infrastructure Requirements

### Minimum Production Requirements

| Component | Requirement | Recommended |
|-----------|-------------|-------------|
| **CPU** | 2 cores | 4+ cores |
| **RAM** | 4 GB | 8+ GB |
| **Disk** | 20 GB SSD | 50+ GB SSD |
| **Network** | 100 Mbps | 1 Gbps |
| **PostgreSQL** | 14+ | 15+ |
| **Redis** | 6.0+ | 7.0+ |
| **Node.js** | 18+ | 20+ LTS |

### Recommended Architecture

```mermaid
graph TB
    subgraph "Load Balancer Layer"
        LB[Load Balancer<br/>NGINX/HAProxy]
    end

    subgraph "Application Layer (3+ instances)"
        NLQ1[NLQ Service 1<br/>4GB RAM, 2 CPU]
        NLQ2[NLQ Service 2<br/>4GB RAM, 2 CPU]
        NLQ3[NLQ Service 3<br/>4GB RAM, 2 CPU]
    end

    subgraph "Cache Layer (High Availability)"
        REDIS_MASTER[Redis Master<br/>8GB RAM]
        REDIS_REPLICA1[Redis Replica 1]
        REDIS_REPLICA2[Redis Replica 2]
    end

    subgraph "Database Layer"
        PG_MASTER[PostgreSQL Master<br/>16GB RAM, 4 CPU]
        PG_REPLICA1[PostgreSQL Replica 1<br/>Read Queries]
        PG_REPLICA2[PostgreSQL Replica 2<br/>Read Queries]
    end

    subgraph "Analytics Layer (Optional)"
        CH_CLUSTER[ClickHouse Cluster<br/>32GB RAM, 8 CPU]
    end

    subgraph "Event Bus (Optional)"
        NATS_CLUSTER[NATS Cluster<br/>3 nodes]
    end

    LB --> NLQ1
    LB --> NLQ2
    LB --> NLQ3

    NLQ1 --> REDIS_MASTER
    NLQ2 --> REDIS_MASTER
    NLQ3 --> REDIS_MASTER

    NLQ1 --> PG_REPLICA1
    NLQ2 --> PG_REPLICA2
    NLQ3 --> PG_MASTER

    REDIS_MASTER --> REDIS_REPLICA1
    REDIS_MASTER --> REDIS_REPLICA2

    PG_MASTER --> PG_REPLICA1
    PG_MASTER --> PG_REPLICA2

    NLQ1 -.-> CH_CLUSTER
    NLQ2 -.-> CH_CLUSTER
    NLQ3 -.-> CH_CLUSTER

    NLQ1 -.-> NATS_CLUSTER
    NLQ2 -.-> NATS_CLUSTER
    NLQ3 -.-> NATS_CLUSTER
```

---

## Pre-Deployment Checklist

### Security

- [ ] LLM API keys stored in secrets manager (AWS Secrets Manager, HashiCorp Vault)
- [ ] JWT secret generated (min 32 characters, cryptographically random)
- [ ] Database credentials rotated and stored securely
- [ ] Redis password set and stored securely
- [ ] TLS/SSL certificates obtained and configured
- [ ] CORS origins configured for production domains
- [ ] Rate limits configured per tenant
- [ ] Firewall rules configured (allow only necessary ports)

### Database

- [ ] PostgreSQL 14+ installed and configured
- [ ] Database created: `teei_csr_platform`
- [ ] Database migrations run successfully
- [ ] Database indexes created on frequently queried columns
- [ ] Connection pooling configured (min: 5, max: 20)
- [ ] Automated backups configured (daily snapshots)
- [ ] Point-in-time recovery (PITR) enabled

### Cache

- [ ] Redis 6+ installed and configured
- [ ] Redis persistence enabled (AOF + RDB)
- [ ] Redis maxmemory policy set to `allkeys-lru`
- [ ] Redis password authentication enabled
- [ ] Redis replication configured (master-replica)
- [ ] Redis Sentinel or Cluster for high availability

### Monitoring

- [ ] Health check endpoint configured
- [ ] Prometheus metrics enabled
- [ ] Grafana dashboards created
- [ ] Alerts configured (service down, high error rate, etc.)
- [ ] Log aggregation configured (ELK, Datadog, etc.)
- [ ] APM configured (New Relic, Datadog, etc.)

### Performance

- [ ] Load testing completed (target: 100 req/s)
- [ ] Cache hit rate target: > 70%
- [ ] P95 latency target: < 2.5s
- [ ] Database query performance optimized
- [ ] ClickHouse configured for analytics queries (optional)

---

## Docker Deployment

### Dockerfile

Create `/home/user/TEEI-CSR-Platform/services/insights-nlq/Dockerfile`:

```dockerfile
# Stage 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Copy workspace files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages ./packages
COPY services/insights-nlq ./services/insights-nlq

# Install pnpm and dependencies
RUN npm install -g pnpm@8
RUN pnpm install --frozen-lockfile

# Build shared packages
WORKDIR /app/packages/shared-schema
RUN pnpm build

WORKDIR /app/packages/shared-utils
RUN pnpm build

# Build NLQ service
WORKDIR /app/services/insights-nlq
RUN pnpm build

# Stage 2: Production
FROM node:20-alpine

WORKDIR /app

# Copy built files
COPY --from=builder /app/services/insights-nlq/dist ./dist
COPY --from=builder /app/services/insights-nlq/node_modules ./node_modules
COPY --from=builder /app/services/insights-nlq/package.json ./

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

USER nodejs

# Expose port
EXPOSE 3009

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3009/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# Start service
CMD ["node", "dist/index.js"]
```

### docker-compose.yml

Create `/home/user/TEEI-CSR-Platform/services/insights-nlq/docker-compose.yml`:

```yaml
version: '3.8'

services:
  insights-nlq:
    build:
      context: ../..
      dockerfile: services/insights-nlq/Dockerfile
    image: teei/insights-nlq:latest
    container_name: insights-nlq
    restart: unless-stopped
    ports:
      - "3009:3009"
    environment:
      NODE_ENV: production
      PORT_INSIGHTS_NLQ: 3009
      HOST: 0.0.0.0
      DATABASE_URL: postgresql://user:password@postgres:5432/teei_csr_platform
      REDIS_URL: redis://:password@redis:6379
      ANTHROPIC_API_KEY: ${ANTHROPIC_API_KEY}
      LLM_PROVIDER: anthropic
      LLM_MODEL: claude-3-5-sonnet-20241022
      LOG_LEVEL: info
      LOG_PRETTY: false
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD", "node", "-e", "require('http').get('http://localhost:3009/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
    networks:
      - teei-network
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"

  postgres:
    image: postgres:15-alpine
    container_name: teei-postgres
    restart: unless-stopped
    environment:
      POSTGRES_DB: teei_csr_platform
      POSTGRES_USER: user
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U user"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - teei-network

  redis:
    image: redis:7-alpine
    container_name: teei-redis
    restart: unless-stopped
    command: redis-server --requirepass ${REDIS_PASSWORD} --maxmemory 2gb --maxmemory-policy allkeys-lru
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "--raw", "incr", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - teei-network

volumes:
  postgres-data:
  redis-data:

networks:
  teei-network:
    driver: bridge
```

### Build and Run

```bash
# Build image
docker-compose build

# Start services
docker-compose up -d

# Check logs
docker-compose logs -f insights-nlq

# Check health
curl http://localhost:3009/health
```

---

## Kubernetes Deployment

### Namespace

Create `k8s/namespace.yaml`:

```yaml
apiVersion: v1
kind: Namespace
metadata:
  name: teei-insights
```

### ConfigMap

Create `k8s/configmap.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: insights-nlq-config
  namespace: teei-insights
data:
  NODE_ENV: "production"
  PORT_INSIGHTS_NLQ: "3009"
  HOST: "0.0.0.0"
  LLM_PROVIDER: "anthropic"
  LLM_MODEL: "claude-3-5-sonnet-20241022"
  LLM_MAX_TOKENS: "4096"
  LLM_TEMPERATURE: "0"
  LOG_LEVEL: "info"
  LOG_PRETTY: "false"
  ENABLE_CACHE_WARMING: "true"
  ENABLE_PROMETHEUS: "true"
  ENABLE_SAFETY_CHECKS: "true"
  MAX_CONCURRENT_QUERIES: "10"
  QUERY_TIMEOUT: "30000"
  MAX_RESULT_ROWS: "10000"
  RATE_LIMIT_ENABLED: "true"
  RATE_LIMIT_MAX: "100"
  RATE_LIMIT_WINDOW_MS: "60000"
```

### Secret

Create secrets (use kubectl or external secrets manager):

```bash
kubectl create secret generic insights-nlq-secrets \
  --namespace=teei-insights \
  --from-literal=DATABASE_URL='postgresql://user:password@postgres:5432/teei_csr_platform' \
  --from-literal=REDIS_URL='redis://:password@redis:6379' \
  --from-literal=ANTHROPIC_API_KEY='sk-ant-your-key-here' \
  --from-literal=JWT_SECRET='your-jwt-secret-min-32-chars'
```

### Deployment

Create `k8s/deployment.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: insights-nlq
  namespace: teei-insights
  labels:
    app: insights-nlq
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  selector:
    matchLabels:
      app: insights-nlq
  template:
    metadata:
      labels:
        app: insights-nlq
      annotations:
        prometheus.io/scrape: "true"
        prometheus.io/port: "3009"
        prometheus.io/path: "/metrics"
    spec:
      containers:
      - name: insights-nlq
        image: teei/insights-nlq:latest
        imagePullPolicy: Always
        ports:
        - containerPort: 3009
          name: http
          protocol: TCP
        envFrom:
        - configMapRef:
            name: insights-nlq-config
        - secretRef:
            name: insights-nlq-secrets
        resources:
          requests:
            memory: "2Gi"
            cpu: "1000m"
          limits:
            memory: "4Gi"
            cpu: "2000m"
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3009
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          successThreshold: 1
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3009
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          successThreshold: 1
          failureThreshold: 3
        lifecycle:
          preStop:
            exec:
              command: ["/bin/sh", "-c", "sleep 15"]
      terminationGracePeriodSeconds: 30
      affinity:
        podAntiAffinity:
          preferredDuringSchedulingIgnoredDuringExecution:
          - weight: 100
            podAffinityTerm:
              labelSelector:
                matchExpressions:
                - key: app
                  operator: In
                  values:
                  - insights-nlq
              topologyKey: kubernetes.io/hostname
```

### Service

Create `k8s/service.yaml`:

```yaml
apiVersion: v1
kind: Service
metadata:
  name: insights-nlq
  namespace: teei-insights
  labels:
    app: insights-nlq
spec:
  type: ClusterIP
  ports:
  - port: 80
    targetPort: 3009
    protocol: TCP
    name: http
  selector:
    app: insights-nlq
  sessionAffinity: None
```

### Ingress

Create `k8s/ingress.yaml`:

```yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: insights-nlq
  namespace: teei-insights
  annotations:
    cert-manager.io/cluster-issuer: "letsencrypt-prod"
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/rate-limit: "100"
spec:
  ingressClassName: nginx
  tls:
  - hosts:
    - insights-nlq.your-domain.com
    secretName: insights-nlq-tls
  rules:
  - host: insights-nlq.your-domain.com
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: insights-nlq
            port:
              number: 80
```

### HorizontalPodAutoscaler

Create `k8s/hpa.yaml`:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: insights-nlq-hpa
  namespace: teei-insights
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: insights-nlq
  minReplicas: 3
  maxReplicas: 10
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
  - type: Resource
    resource:
      name: memory
      target:
        type: Utilization
        averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
      - type: Percent
        value: 50
        periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 60
      policies:
      - type: Percent
        value: 100
        periodSeconds: 30
      - type: Pods
        value: 2
        periodSeconds: 30
      selectPolicy: Max
```

### Deploy to Kubernetes

```bash
# Create namespace
kubectl apply -f k8s/namespace.yaml

# Create configmap
kubectl apply -f k8s/configmap.yaml

# Create secrets (use external secrets manager in production)
kubectl apply -f k8s/secret.yaml

# Deploy application
kubectl apply -f k8s/deployment.yaml

# Create service
kubectl apply -f k8s/service.yaml

# Create ingress
kubectl apply -f k8s/ingress.yaml

# Create HPA
kubectl apply -f k8s/hpa.yaml

# Check deployment
kubectl get pods -n teei-insights
kubectl logs -f -n teei-insights -l app=insights-nlq

# Check service
kubectl get svc -n teei-insights

# Check ingress
kubectl get ingress -n teei-insights
```

---

## Environment Variables

### Production Environment Template

```bash
# ═══════════════════════════════════════════════════════
# Insights NLQ Service - Production Configuration
# ═══════════════════════════════════════════════════════

# Server Configuration
NODE_ENV=production
PORT_INSIGHTS_NLQ=3009
HOST=0.0.0.0

# Database Configuration (Required)
DATABASE_URL=postgresql://user:password@postgres-primary:5432/teei_csr_platform
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_TIMEOUT=10000

# Redis Cache (Required)
REDIS_URL=redis://:password@redis-master:6379
REDIS_KEY_PREFIX=insights-nlq:
REDIS_DEFAULT_TTL=3600

# ClickHouse (Optional - for advanced analytics)
ENABLE_CLICKHOUSE=true
CLICKHOUSE_URL=http://clickhouse:8123
CLICKHOUSE_DATABASE=teei_analytics

# LLM Provider Configuration (Required)
ANTHROPIC_API_KEY=sk-ant-api-key-from-secrets-manager
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022
LLM_MAX_TOKENS=4096
LLM_TEMPERATURE=0

# NATS Event Bus (Optional)
ENABLE_NATS=true
NATS_URL=nats://nats-cluster:4222
NATS_RECONNECT_ATTEMPTS=10

# Feature Flags
ENABLE_CACHE_WARMING=true
ENABLE_PROMETHEUS=true
ENABLE_SAFETY_CHECKS=true

# Performance & Limits
MAX_CONCURRENT_QUERIES=10
QUERY_TIMEOUT=30000
MAX_RESULT_ROWS=10000
ENABLE_QUERY_CACHE=true

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_SKIP_SUCCESSFUL=false

# Security
JWT_SECRET=store-in-secrets-manager-min-32-chars
CORS_ORIGIN=https://app.your-domain.com,https://admin.your-domain.com

# Logging
LOG_LEVEL=info
LOG_PRETTY=false
```

---

## Database Setup

### PostgreSQL Production Configuration

**postgresql.conf**:

```ini
# Connection Settings
max_connections = 200
shared_buffers = 4GB
effective_cache_size = 12GB
maintenance_work_mem = 1GB
work_mem = 16MB

# WAL Configuration
wal_level = replica
max_wal_senders = 5
max_replication_slots = 5

# Query Performance
random_page_cost = 1.1  # For SSD
effective_io_concurrency = 200

# Logging
log_min_duration_statement = 1000  # Log queries > 1s
log_line_prefix = '%t [%p]: [%l-1] user=%u,db=%d,app=%a,client=%h '
log_checkpoints = on
log_connections = on
log_disconnections = on
log_lock_waits = on
```

### Recommended Indexes

```sql
-- NLQ Queries
CREATE INDEX CONCURRENTLY idx_nlq_queries_company_created
ON nlq_queries(company_id, created_at DESC);

CREATE INDEX CONCURRENTLY idx_nlq_queries_status
ON nlq_queries(execution_status);

CREATE INDEX CONCURRENTLY idx_nlq_queries_cache_key
ON nlq_queries(cache_key) WHERE cached = true;

-- Metrics Table
CREATE INDEX CONCURRENTLY idx_metrics_company_period
ON metrics_company_period(company_id, period_start, period_end);

-- Outcome Scores
CREATE INDEX CONCURRENTLY idx_outcome_scores_company_created
ON outcome_scores(company_id, created_at);
```

---

## Redis Configuration

### Redis Production Configuration

**redis.conf**:

```ini
# Network
bind 0.0.0.0
protected-mode yes
port 6379
tcp-backlog 511
timeout 0
tcp-keepalive 300

# Security
requirepass your-redis-password-here

# Memory Management
maxmemory 8gb
maxmemory-policy allkeys-lru
maxmemory-samples 5

# Persistence
save 900 1
save 300 10
save 60 10000
stop-writes-on-bgsave-error yes
rdbcompression yes
rdbchecksum yes
dbfilename dump.rdb
dir /var/lib/redis

# AOF
appendonly yes
appendfilename "appendonly.aof"
appendfsync everysec
no-appendfsync-on-rewrite no
auto-aof-rewrite-percentage 100
auto-aof-rewrite-min-size 64mb

# Replication
replica-serve-stale-data yes
replica-read-only yes
repl-diskless-sync no
repl-diskless-sync-delay 5
```

### Redis Sentinel Configuration

For high availability, configure Redis Sentinel:

**sentinel.conf**:

```ini
sentinel monitor nlq-redis redis-master 6379 2
sentinel auth-pass nlq-redis your-redis-password
sentinel down-after-milliseconds nlq-redis 5000
sentinel parallel-syncs nlq-redis 1
sentinel failover-timeout nlq-redis 10000
```

---

## Monitoring & Alerting

### Prometheus Metrics

NLQ service exposes metrics at `/metrics`:

```prometheus
# Query metrics
nlq_queries_total{status="success|failed|rejected"}
nlq_query_duration_seconds
nlq_cache_hits_total
nlq_cache_misses_total
nlq_safety_violations_total{severity="critical|high|medium|low"}

# LLM metrics
nlq_llm_requests_total{provider="anthropic|openai"}
nlq_llm_tokens_used_total
nlq_llm_errors_total

# System metrics
nodejs_heap_size_used_bytes
nodejs_heap_size_total_bytes
process_cpu_user_seconds_total
```

### Grafana Dashboard

Create dashboard with panels for:
1. Query throughput (req/s)
2. P95/P99 latency
3. Cache hit rate
4. Error rate
5. Safety violations
6. LLM API usage
7. Database connection pool

### Alerts

**Prometheus alert rules**:

```yaml
groups:
- name: nlq
  rules:
  - alert: NLQServiceDown
    expr: up{job="insights-nlq"} == 0
    for: 1m
    annotations:
      summary: "NLQ service is down"

  - alert: NLQHighErrorRate
    expr: rate(nlq_queries_total{status="failed"}[5m]) > 0.1
    for: 5m
    annotations:
      summary: "NLQ error rate > 10%"

  - alert: NLQHighLatency
    expr: histogram_quantile(0.95, rate(nlq_query_duration_seconds_bucket[5m])) > 3
    for: 5m
    annotations:
      summary: "NLQ P95 latency > 3s"

  - alert: NLQLowCacheHitRate
    expr: rate(nlq_cache_hits_total[10m]) / (rate(nlq_cache_hits_total[10m]) + rate(nlq_cache_misses_total[10m])) < 0.5
    for: 15m
    annotations:
      summary: "NLQ cache hit rate < 50%"
```

---

## Scaling Strategies

### Horizontal Scaling

**Load balancer configuration** (NGINX):

```nginx
upstream nlq_backend {
    least_conn;
    server nlq-1:3009 max_fails=3 fail_timeout=30s;
    server nlq-2:3009 max_fails=3 fail_timeout=30s;
    server nlq-3:3009 max_fails=3 fail_timeout=30s;
    keepalive 32;
}

server {
    listen 80;
    server_name insights-nlq.your-domain.com;

    location / {
        proxy_pass http://nlq_backend;
        proxy_http_version 1.1;
        proxy_set_header Connection "";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_connect_timeout 30s;
        proxy_send_timeout 90s;
        proxy_read_timeout 90s;
    }
}
```

### Vertical Scaling

Increase Node.js memory:

```bash
node --max-old-space-size=4096 dist/index.js
```

---

## Backup & Disaster Recovery

### PostgreSQL Backups

```bash
# Daily full backup
pg_dump -U user -h postgres -d teei_csr_platform | gzip > backup-$(date +%Y%m%d).sql.gz

# Upload to S3
aws s3 cp backup-$(date +%Y%m%d).sql.gz s3://backups/nlq/

# Restore
gunzip < backup-20251116.sql.gz | psql -U user -h postgres -d teei_csr_platform
```

### Redis Backups

```bash
# Trigger RDB snapshot
redis-cli BGSAVE

# Copy snapshot
cp /var/lib/redis/dump.rdb /backups/redis-$(date +%Y%m%d).rdb

# Restore
cp /backups/redis-20251116.rdb /var/lib/redis/dump.rdb
redis-cli SHUTDOWN NOSAVE
redis-server
```

---

**Next**: [Template Catalog](./NLQ_TEMPLATE_CATALOG.md) →
