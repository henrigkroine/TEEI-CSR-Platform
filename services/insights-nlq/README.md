# Insights NLQ Service

Natural Language Query service with guard-railed NL→SQL/CHQL conversion for the TEEI CSR Platform.

## Overview

The Insights NLQ service enables users to query CSR data using natural language. It translates natural language questions into safe SQL/ClickHouse queries using LLMs (Claude/GPT), with comprehensive safety checks and caching.

### Key Features

- **Natural Language to SQL/CHQL**: Convert plain English questions to database queries
- **Multi-LLM Support**: Claude (Anthropic) and GPT (OpenAI) providers
- **Safety Guardrails**: SQL injection prevention, table access control, keyword blocking
- **Query Templates**: Pre-built templates for common questions
- **Smart Caching**: Redis-backed query cache with automatic warming
- **Performance Optimization**: Concurrent query limits, timeouts, result row limits
- **Event Publishing**: NATS integration for query analytics
- **Comprehensive Monitoring**: Health checks, Prometheus metrics, structured logging

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Insights NLQ Service                      │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  NLQ Routes  │───▶│ Safety Check │───▶│  LLM Router  │  │
│  │ POST /query  │    │  - SQL check │    │ - Claude API │  │
│  │ POST /explain│    │  - Tables    │    │ - OpenAI API │  │
│  └──────────────┘    │  - Keywords  │    └──────────────┘  │
│                      └──────────────┘                        │
│                             │                                │
│                             ▼                                │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │  Templates   │    │ Query Cache  │    │   Database   │  │
│  │ - Common Q's │    │   (Redis)    │    │ - PostgreSQL │  │
│  │ - Pre-built  │    │ - Hit/Miss   │    │ - ClickHouse │  │
│  └──────────────┘    └──────────────┘    └──────────────┘  │
│                                                               │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐  │
│  │   Feedback   │    │   Analytics  │    │     NATS     │  │
│  │ - Thumbs up  │    │ - Prometheus │    │   Events     │  │
│  │ - Corrections│    │ - Metrics    │    └──────────────┘  │
│  └──────────────┘    └──────────────┘                        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- ClickHouse 23+ (optional)
- NATS 2.9+ (optional)
- Anthropic API key OR OpenAI API key

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment template
cp .env.example .env

# Edit .env with your configuration
nano .env
```

### Configuration

**Required environment variables:**

```bash
DATABASE_URL=postgresql://user:password@localhost:5432/teei_csr_platform
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-ant-...  # OR OPENAI_API_KEY
```

**Optional but recommended:**

```bash
JWT_SECRET=your-secret-key-here-min-32-chars
CORS_ORIGIN=http://localhost:4321
ENABLE_SAFETY_CHECKS=true
RATE_LIMIT_ENABLED=true
```

See `.env.example` for full configuration options.

### Running the Service

```bash
# Development mode (with hot reload)
pnpm dev

# Production build
pnpm build
pnpm start

# Run tests
pnpm test
```

The service will start on port **3009** by default.

## API Endpoints

### Health Checks

```bash
# Basic health check
GET /health

# Kubernetes liveness probe
GET /health/live

# Kubernetes readiness probe
GET /health/ready

# Detailed dependency health
GET /health/dependencies

# Cache statistics
GET /health/cache
```

### NLQ APIs

#### Query Endpoint

```bash
POST /v1/nlq/query
Content-Type: application/json
Authorization: Bearer <jwt-token>

{
  "question": "How many volunteers participated last quarter?",
  "companyId": "acme-corp",
  "context": {
    "timeRange": "last_quarter",
    "region": "us-west"
  }
}
```

**Response:**

```json
{
  "success": true,
  "query": {
    "id": "query_abc123",
    "sql": "SELECT COUNT(DISTINCT volunteer_id) FROM volunteer_activities WHERE company_id = 'acme-corp' AND created_at >= NOW() - INTERVAL '3 months'",
    "explanation": "This query counts unique volunteers who participated in activities during the last quarter (3 months) for Acme Corp.",
    "safetyChecks": {
      "passed": true,
      "warnings": []
    }
  },
  "results": {
    "rows": [{ "count": 234 }],
    "rowCount": 1,
    "executionTime": 45
  },
  "cached": false,
  "timestamp": "2025-11-16T10:30:00Z"
}
```

#### Explain Endpoint

```bash
POST /v1/nlq/explain
Content-Type: application/json

{
  "sql": "SELECT COUNT(*) FROM events WHERE created_at > NOW() - INTERVAL '7 days'"
}
```

**Response:**

```json
{
  "success": true,
  "explanation": {
    "plainEnglish": "This query counts all events created in the last 7 days.",
    "breakdown": {
      "operation": "COUNT aggregation",
      "tables": ["events"],
      "filters": ["created_at in last 7 days"],
      "estimatedRows": 1500
    }
  }
}
```

#### History Endpoint

```bash
GET /v1/nlq/history?limit=10&offset=0
Authorization: Bearer <jwt-token>
```

### Templates

```bash
# List available templates
GET /v1/nlq/templates

# Use a template
POST /v1/nlq/templates/:id/use
{
  "parameters": {
    "companyId": "acme-corp",
    "timeRange": "last_month"
  }
}
```

### Feedback

```bash
POST /v1/nlq/feedback
{
  "queryId": "query_abc123",
  "rating": "positive",
  "comment": "Exactly what I needed!",
  "corrections": null
}
```

### Admin APIs (Requires Admin Role)

```bash
# Service statistics
GET /v1/nlq/admin/stats

# Recent queries
GET /v1/nlq/admin/queries?limit=50

# Clear cache
POST /v1/nlq/admin/cache/clear
```

## Safety Features

### SQL Injection Prevention

- Parameterized queries only
- No raw SQL concatenation
- Input sanitization and validation

### Access Control

- **Table Whitelist**: Only allowed tables can be queried
- **Keyword Blocking**: Destructive SQL operations blocked (DROP, DELETE, etc.)
- **Row Limits**: Maximum result rows enforced
- **Timeout Protection**: Queries killed after timeout

### Configuration

```bash
# Allowed tables (regex patterns)
ALLOWED_TABLE_PATTERNS=events,metrics,analytics,csrd_metrics

# Blocked keywords
BLOCKED_SQL_KEYWORDS=DROP,DELETE,TRUNCATE,ALTER,CREATE,INSERT,UPDATE
```

## Caching Strategy

### Query Cache

- **Key**: Hash of (question + context + companyId)
- **TTL**: 1 hour (configurable)
- **Invalidation**: Manual or time-based

### Cache Warming

Automatically pre-caches popular queries:

```bash
ENABLE_CACHE_WARMING=true
```

### Cache Statistics

```bash
GET /health/cache

# Response
{
  "stats": {
    "hits": 1234,
    "misses": 456,
    "hitRate": 73.02,
    "keys": 89,
    "memory": "12.5MB"
  }
}
```

## Monitoring

### Prometheus Metrics

Available at `/metrics`:

- `nlq_query_duration_seconds` - Query execution time histogram
- `nlq_cache_hits_total` - Cache hit counter
- `nlq_cache_misses_total` - Cache miss counter
- `nlq_safety_violations_total` - Safety check failures
- `nlq_llm_requests_total` - LLM API calls by provider
- `nlq_query_errors_total` - Query errors by type

### Structured Logging

All logs include:

- Request ID
- User ID (if authenticated)
- Company ID
- Query duration
- Safety check results

## Performance

### Recommended Limits

```bash
MAX_CONCURRENT_QUERIES=10
QUERY_TIMEOUT=30000  # 30 seconds
MAX_RESULT_ROWS=10000
```

### Rate Limiting

```bash
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX=100       # 100 requests
RATE_LIMIT_WINDOW_MS=60000  # per minute
```

## Error Handling

All errors return consistent JSON:

```json
{
  "success": false,
  "error": "SafetyError",
  "message": "Query contains unsafe operations",
  "details": {
    "violations": ["Blocked keyword: DROP"]
  },
  "timestamp": "2025-11-16T10:30:00Z",
  "requestId": "req_xyz789",
  "retryable": false
}
```

### Error Types

- `ValidationError` (400) - Invalid request
- `SafetyError` (400) - Safety check failed
- `RateLimitError` (429) - Too many requests
- `QueryTimeoutError` (504) - Query took too long
- `LLMProviderError` (503) - LLM API error
- `DatabaseError` (500) - Database operation failed

## Development

### Project Structure

```
services/insights-nlq/
├── src/
│   ├── index.ts              # Main entry point
│   ├── config.ts             # Configuration
│   ├── health/               # Health checks
│   │   └── index.ts
│   ├── middleware/           # Middleware
│   │   ├── auth.ts
│   │   └── error-handler.ts
│   ├── routes/               # API routes
│   │   ├── nlq.ts
│   │   ├── templates.ts
│   │   ├── feedback.ts
│   │   └── admin.ts
│   ├── lib/                  # Core libraries
│   │   ├── postgres.ts
│   │   ├── clickhouse.ts
│   │   ├── nats.ts
│   │   └── metrics.ts
│   ├── cache/                # Caching layer
│   │   ├── redis.ts
│   │   └── warmer.ts
│   ├── validators/           # Schema validation
│   │   └── nlq-schemas.ts
│   ├── templates/            # Query templates
│   │   └── common-queries.ts
│   └── types/                # TypeScript types
│       └── nlq.ts
├── .env.example              # Environment template
├── package.json
├── tsconfig.json
└── README.md
```

### Testing

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage
pnpm test:coverage
```

## Deployment

### Docker

```dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --production
COPY dist ./dist
CMD ["node", "dist/index.js"]
```

### Kubernetes

```yaml
apiVersion: v1
kind: Service
metadata:
  name: insights-nlq
spec:
  selector:
    app: insights-nlq
  ports:
    - port: 3009
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: insights-nlq
spec:
  replicas: 3
  selector:
    matchLabels:
      app: insights-nlq
  template:
    metadata:
      labels:
        app: insights-nlq
    spec:
      containers:
      - name: insights-nlq
        image: teei/insights-nlq:latest
        ports:
        - containerPort: 3009
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: postgres-secret
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-secret
              key: url
        - name: ANTHROPIC_API_KEY
          valueFrom:
            secretKeyRef:
              name: llm-secret
              key: anthropic-key
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3009
          initialDelaySeconds: 10
          periodSeconds: 30
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3009
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Security Best Practices

1. **Always use JWT authentication** in production
2. **Enable rate limiting** to prevent abuse
3. **Use HTTPS** for all external communication
4. **Rotate API keys** regularly
5. **Monitor safety violations** and audit logs
6. **Restrict table access** to minimum required
7. **Set conservative query limits** (timeout, rows)

## Troubleshooting

### Service won't start

```bash
# Check required environment variables
grep -v '^#' .env | grep -E 'DATABASE_URL|REDIS_URL|ANTHROPIC_API_KEY'

# Test database connection
psql $DATABASE_URL -c "SELECT 1"

# Test Redis connection
redis-cli -u $REDIS_URL ping
```

### Queries timing out

```bash
# Increase timeout
QUERY_TIMEOUT=60000  # 60 seconds

# Check database performance
# Enable query logging in PostgreSQL
```

### High cache miss rate

```bash
# Check cache stats
curl http://localhost:3009/health/cache

# Enable cache warming
ENABLE_CACHE_WARMING=true

# Increase TTL
REDIS_DEFAULT_TTL=7200  # 2 hours
```

## Support

- **Documentation**: `/docs` directory
- **Issues**: GitHub Issues
- **Slack**: #insights-nlq channel

## License

Proprietary - TEEI CSR Platform
