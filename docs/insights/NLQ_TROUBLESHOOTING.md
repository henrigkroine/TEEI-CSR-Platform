# NLQ Troubleshooting Guide

**Common issues, solutions, and performance optimization**

---

## Table of Contents

- [Service Won't Start](#service-wont-start)
- [Query Rejections](#query-rejections)
- [Performance Issues](#performance-issues)
- [Cache Problems](#cache-problems)
- [Rate Limit Errors](#rate-limit-errors)
- [Low Confidence Scores](#low-confidence-scores)
- [LLM API Failures](#llm-api-failures)
- [Database Connection Issues](#database-connection-issues)
- [Debugging Tools](#debugging-tools)

---

## Service Won't Start

### Symptom

Service crashes on startup or fails to listen on port.

### Troubleshooting Flow

```mermaid
graph TB
    START[Service won't start] --> CHECK_ENV{.env file<br/>exists?}
    CHECK_ENV -->|NO| CREATE_ENV[Copy .env.example<br/>to .env]
    CHECK_ENV -->|YES| CHECK_PG{PostgreSQL<br/>reachable?}

    CHECK_PG -->|NO| FIX_PG[Fix DATABASE_URL<br/>Check PostgreSQL status]
    CHECK_PG -->|YES| CHECK_REDIS{Redis<br/>reachable?}

    CHECK_REDIS -->|NO| FIX_REDIS[Fix REDIS_URL<br/>Check Redis status]
    CHECK_REDIS -->|YES| CHECK_API{LLM API key<br/>valid?}

    CHECK_API -->|NO| FIX_API[Add ANTHROPIC_API_KEY<br/>or OPENAI_API_KEY]
    CHECK_API -->|YES| CHECK_PORT{Port 3009<br/>available?}

    CHECK_PORT -->|NO| FIX_PORT[Change PORT_INSIGHTS_NLQ<br/>or kill process]
    CHECK_PORT -->|YES| CHECK_LOGS[Check logs for<br/>other errors]

    style FIX_PG fill:#f99,stroke:#333,stroke-width:2px
    style FIX_REDIS fill:#f99,stroke:#333,stroke-width:2px
    style FIX_API fill:#f99,stroke:#333,stroke-width:2px
```

### Common Issues

#### 1. PostgreSQL Connection Failed

**Error**:
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```

**Solution**:
```bash
# Check PostgreSQL status
pg_isready -h localhost -p 5432

# Test connection
psql $DATABASE_URL -c "SELECT 1"

# Fix .env
DATABASE_URL=postgresql://user:password@localhost:5432/teei_csr_platform
```

#### 2. Redis Connection Failed

**Error**:
```
Error: connect ECONNREFUSED 127.0.0.1:6379
```

**Solution**:
```bash
# Check Redis status
redis-cli ping
# Expected: PONG

# Start Redis if not running
redis-server

# Fix .env
REDIS_URL=redis://localhost:6379
```

#### 3. Missing LLM API Key

**Error**:
```
Error: ANTHROPIC_API_KEY or OPENAI_API_KEY is required
```

**Solution**:
```bash
# Add to .env
ANTHROPIC_API_KEY=sk-ant-your-key-here

# OR for OpenAI
OPENAI_API_KEY=sk-your-key-here

# Set provider
LLM_PROVIDER=anthropic
LLM_MODEL=claude-3-5-sonnet-20241022
```

#### 4. Port Already in Use

**Error**:
```
Error: listen EADDRINUSE: address already in use :::3009
```

**Solution**:
```bash
# Find process using port 3009
lsof -i :3009

# Kill process
kill -9 <PID>

# OR change port in .env
PORT_INSIGHTS_NLQ=3010
```

#### 5. Database Migrations Not Run

**Error**:
```
Error: relation "nlq_queries" does not exist
```

**Solution**:
```bash
# Run migrations
pnpm -w db:migrate

# OR manually
cd packages/shared-schema
pnpm drizzle-kit push
```

---

## Query Rejections

### Symptom

Query returns `403 Forbidden` with safety violation error.

### Troubleshooting by Violation Code

#### INJ_001: SQL Injection Pattern

**Error**:
```json
{
  "error": "Safety check failed",
  "message": "Safety validation failed: INJ_001"
}
```

**Cause**: Query contains SQL injection patterns (semicolons, DROP, etc.)

**Solution**:
1. Check the question for special characters
2. Ensure LLM is generating safe SQL
3. Review intent classification logs
4. Contact support if false positive

**Example**:
```
Question: "Show SROI; DROP TABLE users"
❌ Rejected: Contains "; DROP" pattern
```

#### PII_001: PII Column Access

**Error**:
```json
{
  "error": "Safety check failed",
  "message": "Safety validation failed: PII_001",
  "details": "PII column detected: email"
}
```

**Cause**: Query attempts to access PII columns

**Solution**:
1. Rephrase question to ask for aggregates, not individual records
2. Use templates that exclude PII columns
3. Request template update if legitimate use case

**Example**:
```
❌ "Show me all user emails"
✅ "How many users do we have?"
```

#### TNT_001: Missing Tenant Filter

**Error**:
```json
{
  "error": "Safety check failed",
  "message": "Safety validation failed: TNT_001",
  "details": "Missing or incorrect companyId filter"
}
```

**Cause**: Generated SQL is missing `company_id` filter

**Solution**:
1. Verify `companyId` is provided in request
2. Check template includes `{{companyId}}` placeholder
3. Review query generation logs
4. Report bug if template is correct

**Example**:
```sql
-- ❌ Missing tenant filter
SELECT * FROM metrics WHERE period_start >= '2024-01-01'

-- ✅ Correct
SELECT * FROM metrics
WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
  AND period_start >= '2024-01-01'
```

#### LIMIT_001: Missing LIMIT Clause

**Error**:
```json
{
  "error": "Safety check failed",
  "message": "Safety validation failed: LIMIT_001",
  "details": "Missing LIMIT clause"
}
```

**Cause**: Generated SQL doesn't have `LIMIT`

**Solution**:
1. Ensure template includes `LIMIT {{limit}}`
2. Check query generation logic
3. Report template bug

#### TBL_001: Unauthorized Table Access

**Error**:
```json
{
  "error": "Safety check failed",
  "message": "Safety validation failed: TBL_001",
  "details": "Unauthorized tables accessed: admin_credentials"
}
```

**Cause**: Query accesses tables not in whitelist

**Solution**:
1. Use only allowed tables (see [Template Catalog](./NLQ_TEMPLATE_CATALOG.md))
2. Request new template if legitimate use case
3. Check if table name is misspelled

---

## Performance Issues

### Symptom

Queries are slow (> 3 seconds) or timing out.

### Performance Troubleshooting Flowchart

```mermaid
graph TB
    SLOW[Query is slow<br/>> 3s] --> CACHED{Is query<br/>cached?}
    CACHED -->|YES| REDIS_SLOW[Redis latency<br/>Check Redis performance]
    CACHED -->|NO| FIRST_RUN{First time<br/>running?}

    FIRST_RUN -->|YES| NORMAL[Normal<br/>LLM + DB execution]
    FIRST_RUN -->|NO| LLM_SLOW{LLM API<br/>slow?}

    LLM_SLOW -->|YES| FIX_LLM[Check LLM API status<br/>Switch provider<br/>Reduce max_tokens]
    LLM_SLOW -->|NO| DB_SLOW{Database<br/>slow?}

    DB_SLOW -->|YES| FIX_DB[Add indexes<br/>Optimize query<br/>Check DB load]
    DB_SLOW -->|NO| NETWORK[Network latency<br/>Check connections]

    style FIX_LLM fill:#f99,stroke:#333,stroke-width:2px
    style FIX_DB fill:#f99,stroke:#333,stroke-width:2px
```

### Performance Metrics

Check current performance:

```bash
curl http://localhost:3009/health/cache
```

Response:
```json
{
  "stats": {
    "totalHits": 8934,
    "totalMisses": 2156,
    "hitRate": 80.54,  // Target: > 70%
    "avgTtl": 3600
  }
}
```

### Optimization Strategies

#### 1. Improve Cache Hit Rate

**Target**: > 70% cache hit rate

**Solutions**:
- Increase cache TTL for stable metrics
- Pre-warm cache with common queries
- Normalize questions (lowercase, trim)
- Use consistent filter formats

```typescript
// Enable cache warming
ENABLE_CACHE_WARMING=true

// Increase TTL for quarterly metrics
cache_ttl_seconds: 7200  // 2 hours
```

#### 2. Optimize LLM API Calls

**Target**: < 1500ms for intent classification

**Solutions**:
- Reduce `LLM_MAX_TOKENS` (default: 4096)
- Use faster model (Claude Haiku vs Sonnet)
- Implement request batching
- Cache intent classifications

```bash
# Use faster model
LLM_MODEL=claude-3-haiku-20240307

# Reduce tokens
LLM_MAX_TOKENS=2048
```

#### 3. Optimize Database Queries

**Target**: < 500ms for query execution

**Solutions**:
- Add indexes on commonly filtered columns
- Use ClickHouse for analytics queries
- Partition large tables by date
- Optimize template queries

```sql
-- Add index on period_start
CREATE INDEX idx_metrics_period_start
ON metrics_company_period(company_id, period_start);

-- Enable ClickHouse
ENABLE_CLICKHOUSE=true
CLICKHOUSE_URL=http://localhost:8123
```

#### 4. Connection Pooling

**Solutions**:
- Increase database pool size
- Reuse Redis connections
- Enable connection keepalive

```bash
DATABASE_POOL_MIN=5
DATABASE_POOL_MAX=20
DATABASE_TIMEOUT=10000
```

---

## Cache Problems

### Symptom

Stale data in responses or cache misses on identical queries.

### Common Cache Issues

#### 1. Stale Data

**Symptom**: Query returns old data after company data is updated

**Solution**:
```bash
# Invalidate cache for specific company
curl -X POST http://localhost:3009/v1/nlq/admin/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"companyId": "550e8400-e29b-41d4-a716-446655440000"}'

# OR invalidate all cache
curl -X POST http://localhost:3009/v1/nlq/admin/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"pattern": "nlq:*"}'
```

#### 2. Cache Misses on Identical Queries

**Symptom**: Same question generates different cache keys

**Cause**: Question normalization issue or inconsistent filters

**Solution**:
1. Ensure questions are lowercase and trimmed
2. Sort filter keys consistently
3. Check cache key generation logs

```typescript
// Debug cache key
const cacheKey = generateCacheKey({
  normalizedQuestion: question.toLowerCase().trim(),
  companyId,
  timeRange: 'last_quarter',
  filters: { program: 'education' }  // Keys must be sorted
});

console.log('Cache key:', cacheKey);
```

#### 3. Redis Out of Memory

**Symptom**: Cache operations fail with OOM error

**Solution**:
```bash
# Check Redis memory usage
redis-cli INFO memory

# Increase maxmemory
redis-cli CONFIG SET maxmemory 2gb

# Set eviction policy
redis-cli CONFIG SET maxmemory-policy allkeys-lru
```

---

## Rate Limit Errors

### Symptom

Query returns `429 Too Many Requests`.

### Response Example

```json
{
  "error": "Rate limit exceeded",
  "message": "Hourly query limit exceeded (50 queries/hour)",
  "limits": {
    "daily": 387,
    "hourly": 0
  },
  "resetAt": "2025-11-16T13:00:00.000Z"
}
```

### Solutions

#### 1. Wait for Reset

Wait until `resetAt` timestamp.

#### 2. Increase Limits

```sql
UPDATE nlq_rate_limits
SET hourly_query_limit = 100,
    daily_query_limit = 1000
WHERE company_id = '550e8400-e29b-41d4-a716-446655440000';
```

#### 3. Optimize Query Patterns

- Use cache more effectively
- Batch related questions
- Pre-compute common metrics

---

## Low Confidence Scores

### Symptom

Queries return low confidence scores (< 0.7) or "low" confidence level.

### Confidence Score Components

```json
{
  "confidence": {
    "overall": 0.52,
    "level": "low",
    "components": {
      "intentConfidence": 0.65,      // LLM classification confidence
      "dataCompleteness": 0.40,      // Missing data penalty
      "sampleSizeScore": 0.55,       // Sample size too small
      "recencyScore": 0.80,          // Data freshness
      "ambiguityPenalty": 0.20       // Question ambiguity
    },
    "recommendations": [
      "Increase data completeness (40% of expected data points missing)",
      "Increase sample size (current: 15, recommended: >= 30)",
      "Rephrase question to be more specific"
    ]
  }
}
```

### Troubleshooting by Component

#### Low Intent Confidence (< 0.7)

**Cause**: Ambiguous or complex question

**Solutions**:
- Rephrase question to be more specific
- Use example questions from templates
- Avoid multi-part questions

**Examples**:
```
❌ "Show me some numbers about volunteers or participants"
✅ "How many volunteers were active last month?"

❌ "What's our performance?"
✅ "What is our SROI for Q4 2024?"
```

#### Low Data Completeness (< 0.8)

**Cause**: Missing data in result set

**Solutions**:
- Expand time range
- Remove restrictive filters
- Check data availability

#### Low Sample Size Score (< 30 data points)

**Cause**: Not enough data for statistical significance

**Solutions**:
- Aggregate over longer time period
- Remove filters that narrow results too much
- Use different grouping

#### Low Recency Score (data > 90 days old)

**Cause**: Stale data

**Solutions**:
- Update company data
- Use more recent time range
- Check data ingestion pipeline

---

## LLM API Failures

### Symptom

Queries fail with LLM API errors.

### Common LLM Errors

#### 1. API Key Invalid

**Error**:
```json
{
  "error": "Query execution failed",
  "message": "Anthropic API error: Invalid API key"
}
```

**Solution**:
```bash
# Verify API key
curl https://api.anthropic.com/v1/messages \
  -H "x-api-key: $ANTHROPIC_API_KEY" \
  -H "anthropic-version: 2023-06-01" \
  -H "content-type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","max_tokens":10,"messages":[{"role":"user","content":"hi"}]}'
```

#### 2. Rate Limit from LLM Provider

**Error**:
```json
{
  "error": "Query execution failed",
  "message": "Anthropic API error: Rate limit exceeded"
}
```

**Solution**:
- Wait and retry (exponential backoff)
- Upgrade LLM API plan
- Switch to alternate provider temporarily

```bash
# Switch to OpenAI temporarily
LLM_PROVIDER=openai
LLM_MODEL=gpt-4-turbo
OPENAI_API_KEY=sk-your-key-here
```

#### 3. Model Not Available

**Error**:
```json
{
  "error": "Query execution failed",
  "message": "Model 'claude-3-5-sonnet-old' not found"
}
```

**Solution**:
```bash
# Use current model
LLM_MODEL=claude-3-5-sonnet-20241022

# OR
LLM_MODEL=gpt-4-turbo
```

#### 4. Token Limit Exceeded

**Error**:
```json
{
  "error": "Query execution failed",
  "message": "Maximum token limit exceeded"
}
```

**Solution**:
```bash
# Reduce max tokens
LLM_MAX_TOKENS=2048

# OR split complex questions
```

---

## Database Connection Issues

### Symptom

Queries fail with database connection errors.

### Common Database Errors

#### 1. Connection Pool Exhausted

**Error**:
```
Error: Connection pool exhausted
```

**Solution**:
```bash
# Increase pool size
DATABASE_POOL_MAX=20

# Reduce query timeout
DATABASE_TIMEOUT=5000
```

#### 2. Query Timeout

**Error**:
```
Error: Query execution timeout (30000ms)
```

**Solution**:
- Add database indexes
- Optimize template query
- Increase timeout

```bash
QUERY_TIMEOUT=60000  # 60 seconds
```

#### 3. Table/Column Not Found

**Error**:
```
Error: relation "nlq_queries" does not exist
```

**Solution**:
```bash
# Run migrations
pnpm -w db:migrate
```

---

## Debugging Tools

### 1. Enable Debug Logging

```bash
LOG_LEVEL=debug
LOG_PRETTY=true
```

### 2. Check Service Health

```bash
curl http://localhost:3009/health
curl http://localhost:3009/health/dependencies
curl http://localhost:3009/health/cache
```

### 3. View Query Logs

```sql
-- Recent queries
SELECT
  id,
  raw_question,
  detected_intent,
  execution_status,
  execution_time_ms,
  created_at
FROM nlq_queries
ORDER BY created_at DESC
LIMIT 20;

-- Failed queries
SELECT
  id,
  raw_question,
  execution_status,
  safety_violations
FROM nlq_queries
WHERE execution_status IN ('failed', 'rejected')
ORDER BY created_at DESC
LIMIT 20;

-- Safety violations
SELECT
  nq.raw_question,
  nsc.violation_codes,
  nsc.violation_severity,
  nsc.checked_at
FROM nlq_safety_checks nsc
JOIN nlq_queries nq ON nq.safety_check_id = nsc.id
WHERE nsc.overall_passed = false
ORDER BY nsc.checked_at DESC
LIMIT 20;
```

### 4. Test LLM Integration

```bash
# Test intent classification
curl -X POST http://localhost:3009/v1/nlq/ask \
  -H "Content-Type: application/json" \
  -d '{
    "question": "What is our SROI?",
    "companyId": "550e8400-e29b-41d4-a716-446655440000"
  }' | jq '.metadata'
```

### 5. Monitor Cache Stats

```bash
# Watch cache stats
watch -n 5 'curl -s http://localhost:3009/health/cache | jq .stats'
```

### 6. Profile Query Execution

```sql
-- Enable query timing
\timing

-- Explain query plan
EXPLAIN ANALYZE
SELECT * FROM metrics_company_period
WHERE company_id = '550e8400-e29b-41d4-a716-446655440000'
  AND period_start >= '2024-01-01'
LIMIT 10;
```

---

## Getting Help

### Before Opening an Issue

1. Check this troubleshooting guide
2. Review service logs
3. Test with curl (isolate client issues)
4. Check PostgreSQL/Redis/LLM API status
5. Verify .env configuration

### Include in Issue Report

- Service version
- Full error message and stack trace
- Request payload (remove sensitive data)
- Query logs (`SELECT * FROM nlq_queries WHERE id = '...'`)
- Environment (dev/staging/production)
- Steps to reproduce

### Support Channels

- **Documentation**: `/docs/insights/`
- **GitHub Issues**: For bugs and feature requests
- **Logs**: `logs/insights-nlq.log`
- **Slack**: #nlq-support channel

---

**Next**: [Production Deployment](./NLQ_PRODUCTION_DEPLOYMENT.md) →
