# Insights NLQ Service - Bootstrap Implementation Summary

**Service**: Natural Language Query Engine
**Port**: 3009
**Status**: ✅ Complete
**Date**: 2025-11-16

---

## Service Architecture

```
┌───────────────────────────────────────────────────────────────────────┐
│                     Insights NLQ Service (Port 3009)                   │
├───────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                      Fastify Server                               │ │
│  │  - CORS, Rate Limiting, JWT Auth, Error Handling                 │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                  │                                      │
│                                  ▼                                      │
│  ┌──────────────┬──────────────┬──────────────┬──────────────────┐   │
│  │ Health Check │  NLQ Routes  │  Templates   │  Admin Routes    │   │
│  │  /health     │  /v1/nlq     │  /v1/nlq     │  /v1/nlq/admin   │   │
│  └──────────────┴──────────────┴──────────────┴──────────────────┘   │
│                                  │                                      │
│                                  ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    Core Dependencies                              │ │
│  │  ┌──────────┐  ┌─────────┐  ┌───────────┐  ┌──────────────┐    │ │
│  │  │PostgreSQL│  │  Redis  │  │ClickHouse │  │     NATS     │    │ │
│  │  │(required)│  │(required)│  │(optional) │  │  (optional)  │    │ │
│  │  └──────────┘  └─────────┘  └───────────┘  └──────────────┘    │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                  │                                      │
│                                  ▼                                      │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │                    External Services                              │ │
│  │  ┌──────────────────────┐  ┌──────────────────────────────────┐ │ │
│  │  │  Anthropic Claude    │  │        OpenAI GPT               │ │ │
│  │  │  (NL→SQL generation) │  │  (Fallback LLM provider)        │ │ │
│  │  └──────────────────────┘  └──────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                         │
└───────────────────────────────────────────────────────────────────────┘
```

---

## Startup Sequence

### Phase 1: Configuration Loading
```
1. Load environment variables from .env
2. Parse and validate configuration (src/config.ts)
3. Validate required dependencies (DATABASE_URL, REDIS_URL, API keys)
4. Set feature flags (ClickHouse, NATS, cache warming, etc.)
```

### Phase 2: Dependency Initialization
```
5. Initialize PostgreSQL connection pool
   └─ Test connection with SELECT 1

6. Initialize Redis connection
   └─ Test connection with PING

7. Initialize ClickHouse (if enabled)
   └─ Test connection with ping()

8. Initialize NATS (if enabled)
   └─ Connect to event bus
   └─ Subscribe to data update events

9. Start cache warmer (if enabled)
   └─ Pre-warm top 20 common queries
   └─ Schedule periodic warming (30 min interval)
```

### Phase 3: Server Startup
```
10. Create Fastify instance with logger
11. Register plugins:
    - CORS (origin validation)
    - Rate limiting (user-based)
    - JWT authentication (optional)

12. Setup health check routes
    └─ Set alive = true

13. Register middleware:
    - Request logging
    - Error handling

14. Register API routes:
    - /v1/nlq/* (NLQ query routes)
    - /v1/nlq/templates/* (Template routes)
    - /v1/nlq/feedback (Feedback routes)
    - /v1/nlq/admin/* (Admin routes)

15. Register Prometheus metrics (if enabled)
    └─ /metrics endpoint

16. Listen on configured port (3009)
    └─ Set ready = true

17. Setup graceful shutdown handlers
    └─ SIGINT, SIGTERM
```

### Phase 4: Ready State
```
18. Service accepts traffic
19. Health probes return 200 OK
20. Cache warmer runs in background
21. Metrics collection active
```

---

## Graceful Shutdown Sequence

```
1. Receive SIGINT/SIGTERM signal
2. Set shuttingDown = true (ready probe fails)
3. Stop accepting new requests (Fastify close)
4. Stop cache warmer
5. Close connections in parallel:
   - PostgreSQL pool drain
   - Redis connection close
   - ClickHouse close (if enabled)
   - NATS drain and close (if enabled)
6. Log shutdown complete
7. Exit process (code 0)
```

---

## Deliverables

### Core Files Created

#### 1. Configuration (`src/config.ts`)
- **Lines**: 259
- **Features**:
  - Environment variable parsing and validation
  - Type-safe configuration interface
  - Feature flags for optional services
  - Performance and security settings
  - Runtime validation with helpful error messages

#### 2. Main Entry Point (`src/index.ts`)
- **Lines**: 311
- **Features**:
  - Fastify server setup with plugins
  - Dependency initialization orchestration
  - Route registration
  - Middleware setup
  - Graceful shutdown handling
  - Comprehensive startup logging

#### 3. Health Check System (`src/health/index.ts`)
- **Lines**: 236
- **Features**:
  - Kubernetes-compatible probes (liveness, readiness)
  - Dependency health checks (PostgreSQL, Redis, ClickHouse, NATS)
  - Cache statistics endpoint
  - Uptime tracking
  - Detailed health status reporting

#### 4. Error Handler Middleware (`src/middleware/error-handler.ts`)
- **Lines**: 278
- **Features**:
  - Custom error types (ValidationError, SafetyError, etc.)
  - Consistent error responses
  - Request/response logging
  - Production-safe error messages
  - Retry guidance

#### 5. Auth Middleware (`src/middleware/auth.ts`)
- **Lines**: 243
- **Features**:
  - JWT verification
  - Role-based access control (RBAC)
  - Permission checking
  - Company access control
  - Optional authentication support

### Infrastructure Files Created

#### 6. PostgreSQL Client (`src/lib/postgres.ts`)
- **Lines**: 60
- **Features**:
  - Connection pool management
  - Health check
  - Graceful shutdown

#### 7. Redis Cache Client (`src/cache/redis.ts`)
- **Lines**: 128
- **Features**:
  - Connection management
  - Cache statistics tracking
  - Hit/miss counters
  - Cache clearing
  - Health check

#### 8. ClickHouse Client (`src/lib/clickhouse.ts`)
- **Lines**: 61
- **Features**:
  - Optional analytics database
  - Connection management
  - Health check

#### 9. NATS Event Bus (`src/lib/nats.ts`)
- **Lines**: 105
- **Features**:
  - Event publishing
  - Connection management
  - Query event tracking
  - Reconnection handling

#### 10. Prometheus Metrics (`src/lib/metrics.ts`)
- **Lines**: 149
- **Features**:
  - Query duration histogram
  - Cache hit/miss counters
  - Safety violation tracking
  - LLM request tracking
  - Error counting

#### 11. Admin Routes (`src/routes/admin.ts`)
- **Lines**: 122
- **Features**:
  - Service statistics
  - Recent query logs
  - Cache management
  - Admin-only access

### Documentation Files Created

#### 12. Environment Template (`.env.example`)
- **Lines**: 75
- **Features**:
  - All configuration options documented
  - Sensible defaults
  - Security best practices
  - Feature flag examples

#### 13. Service README (`README.md`)
- **Lines**: 588
- **Features**:
  - Quick start guide
  - API documentation
  - Architecture diagram
  - Configuration guide
  - Deployment instructions
  - Troubleshooting guide

#### 14. Bootstrap Summary (`SERVICE_BOOTSTRAP_SUMMARY.md`)
- **Lines**: This file
- **Features**:
  - Service architecture overview
  - Startup sequence documentation
  - Complete deliverables list

---

## Configuration Summary

### Required Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/teei_csr_platform
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-...  # OR OPENAI_API_KEY
```

### Optional Environment Variables

```bash
# Server
PORT_INSIGHTS_NLQ=3009
HOST=0.0.0.0
NODE_ENV=development

# ClickHouse (optional)
ENABLE_CLICKHOUSE=false
CLICKHOUSE_URL=http://localhost:8123

# NATS (optional)
ENABLE_NATS=false
NATS_URL=nats://localhost:4222

# Security
JWT_SECRET=your-secret-key
CORS_ORIGIN=http://localhost:4321

# Features
ENABLE_CACHE_WARMING=true
ENABLE_PROMETHEUS=true
ENABLE_SAFETY_CHECKS=true

# Performance
MAX_CONCURRENT_QUERIES=10
QUERY_TIMEOUT=30000
MAX_RESULT_ROWS=10000

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100
RATE_LIMIT_WINDOW_MS=60000
```

---

## Health Check Endpoints

| Endpoint                  | Purpose                          | Used By        |
|---------------------------|----------------------------------|----------------|
| `GET /health`             | Basic health check               | Monitoring     |
| `GET /health/live`        | Liveness probe                   | Kubernetes     |
| `GET /health/ready`       | Readiness probe                  | Kubernetes     |
| `GET /health/dependencies`| Detailed dependency status       | Debugging      |
| `GET /health/cache`       | Cache statistics                 | Monitoring     |

---

## API Routes Summary

### NLQ Routes (`/v1/nlq`)
- `POST /query` - Execute natural language query
- `POST /explain` - Explain SQL query
- `GET /history` - Query history

### Template Routes (`/v1/nlq/templates`)
- `GET /` - List available templates
- `POST /:id/use` - Use a template

### Feedback Routes (`/v1/nlq`)
- `POST /feedback` - Submit query feedback

### Admin Routes (`/v1/nlq/admin`)
- `GET /stats` - Service statistics
- `GET /queries` - Recent queries
- `POST /cache/clear` - Clear cache

---

## Monitoring Integration

### Prometheus Metrics

```
nlq_query_duration_seconds       - Query execution time histogram
nlq_cache_hits_total             - Cache hit counter
nlq_cache_misses_total           - Cache miss counter
nlq_safety_violations_total      - Safety check failures
nlq_llm_requests_total           - LLM API calls by provider
nlq_query_errors_total           - Query errors by type
```

### Structured Logging

All requests logged with:
- Request ID
- User ID (if authenticated)
- Company ID
- Method and URL
- Response status
- Duration

---

## Error Handling

All errors return consistent JSON:

```json
{
  "success": false,
  "error": "ErrorType",
  "message": "Human-readable message",
  "details": { /* Additional context */ },
  "timestamp": "2025-11-16T10:30:00Z",
  "requestId": "req_xyz789",
  "retryable": true/false
}
```

### Error Types

- `ValidationError` (400) - Invalid request
- `SafetyError` (400) - Safety check failed
- `RateLimitError` (429) - Too many requests
- `QueryTimeoutError` (504) - Query timeout
- `LLMProviderError` (503) - LLM API error
- `DatabaseError` (500) - Database error
- `CacheError` (500) - Cache error

---

## Security Features

### Safety Guardrails

1. **SQL Injection Prevention**
   - Parameterized queries only
   - No raw SQL concatenation
   - Input sanitization

2. **Access Control**
   - Table whitelist (regex patterns)
   - Keyword blocking (DROP, DELETE, etc.)
   - Row limits enforcement
   - Query timeout protection

3. **Authentication & Authorization**
   - JWT token validation
   - Role-based access control (RBAC)
   - Company-level data isolation

4. **Rate Limiting**
   - User-based limits
   - Configurable thresholds
   - Retry-After headers

---

## Performance Optimizations

### Caching Strategy

- **Query Cache**: Hash-based key generation
- **TTL**: 1 hour (configurable)
- **Warming**: Top 20 queries pre-cached
- **Hit Rate Target**: >80%

### Concurrent Query Limits

- **Max Concurrent**: 10 queries (configurable)
- **Timeout**: 30 seconds (configurable)
- **Max Rows**: 10,000 rows (configurable)

### Database Pooling

- **PostgreSQL**: 2-10 connections
- **Redis**: Single connection with reconnection
- **ClickHouse**: On-demand connections

---

## Testing

### Unit Tests
```bash
pnpm test
```

### Integration Tests
```bash
pnpm test:integration
```

### Coverage
```bash
pnpm test:coverage
```

---

## Deployment

### Docker

```bash
# Build
docker build -t teei/insights-nlq:latest .

# Run
docker run -p 3009:3009 \
  -e DATABASE_URL=$DATABASE_URL \
  -e REDIS_URL=$REDIS_URL \
  -e ANTHROPIC_API_KEY=$ANTHROPIC_API_KEY \
  teei/insights-nlq:latest
```

### Kubernetes

```bash
# Deploy
kubectl apply -f k8s/deployment.yaml

# Check status
kubectl get pods -l app=insights-nlq

# View logs
kubectl logs -f deployment/insights-nlq
```

---

## Next Steps

### Immediate Tasks
1. ✅ Service bootstrap complete
2. ⏳ Install dependencies: `pnpm install`
3. ⏳ Configure environment: Copy `.env.example` to `.env`
4. ⏳ Start service: `pnpm dev`
5. ⏳ Test health: `curl http://localhost:3009/health`

### Integration Tasks
1. Connect to PostgreSQL database
2. Configure Redis cache
3. Add LLM API keys
4. Test NLQ query flow
5. Enable optional features (ClickHouse, NATS)

### Production Readiness
1. Enable JWT authentication
2. Configure CORS for production domain
3. Set up SSL/TLS
4. Configure Prometheus scraping
5. Set up log aggregation
6. Configure alerts for health checks

---

## Service Patterns Followed

✅ **Consistent with Analytics Service** (`services/analytics/src/index.ts`)
- Health check manager pattern
- Fastify server setup
- Graceful shutdown handling

✅ **Consistent with Reporting Service** (`services/reporting/src/index.ts`)
- Route organization
- Middleware setup
- Error handling

✅ **Shared Package Usage**
- `@teei/shared-utils` for logging
- `@teei/shared-schema` for types
- `@teei/event-contracts` for events

✅ **TEEI Platform Standards**
- TypeScript with strict mode
- ESM modules (.js imports)
- Pino structured logging
- Fastify framework
- Drizzle ORM patterns

---

## Support

**Documentation**: `/services/insights-nlq/README.md`
**Health Check**: `http://localhost:3009/health`
**Metrics**: `http://localhost:3009/metrics`
**Logs**: Structured JSON via Pino

---

**Status**: ✅ Service bootstrap complete and ready for development
**Author**: service-bootstrap-engineer
**Date**: 2025-11-16
