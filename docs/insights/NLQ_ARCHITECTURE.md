# NLQ Architecture

**System architecture, component interactions, and data flow for the Natural Language Query service**

---

## Table of Contents

- [System Overview](#system-overview)
- [High-Level Architecture](#high-level-architecture)
- [Component Interaction](#component-interaction)
- [Data Flow](#data-flow)
- [Database Schema](#database-schema)
- [Caching Strategy](#caching-strategy)
- [Event Architecture](#event-architecture)
- [Performance Considerations](#performance-considerations)

---

## System Overview

The NLQ (Natural Language Query) service is a production-grade AI-powered query engine that translates natural language questions into safe, validated SQL queries.

### Key Features

- **Natural Language Processing**: Claude/GPT-powered intent classification
- **Template-Based Query Generation**: Allow-listed metric templates
- **12-Point Safety Guardrails**: Comprehensive SQL injection and security validation
- **High-Performance Caching**: Sub-2.5s p95 latency with Redis
- **Complete Audit Trail**: Full query lineage and provenance tracking
- **Multi-Provider LLM Support**: Anthropic Claude and OpenAI GPT
- **Event-Driven Architecture**: NATS integration for real-time events

### Technology Stack

| Component | Technology | Purpose |
|-----------|----------|---------|
| **Runtime** | Node.js 18+ | JavaScript runtime |
| **Framework** | Fastify | High-performance HTTP server |
| **Database** | PostgreSQL 14+ | Primary data store and metadata |
| **Cache** | Redis 6+ | Query caching and rate limiting |
| **Analytics DB** | ClickHouse (optional) | High-performance analytics queries |
| **Event Bus** | NATS (optional) | Event streaming and pub/sub |
| **LLM** | Anthropic Claude / OpenAI GPT | Natural language understanding |
| **ORM** | Drizzle | Type-safe database queries |
| **Validation** | Zod | Runtime schema validation |

---

## High-Level Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        WEB[Web App<br/>Astro/React]
        API_CLIENT[NLQ API Client<br/>TypeScript]
    end

    subgraph "NLQ Service"
        FASTIFY[Fastify Server<br/>Port 3009]
        AUTH[Authentication<br/>JWT/API Key]
        RATE_LIMIT[Rate Limiter<br/>Per-Tenant]
        ROUTES[API Routes<br/>/v1/nlq/*]
    end

    subgraph "Core Processing"
        INTENT[Intent Classifier<br/>Claude/GPT]
        TEMPLATE[Template Matcher<br/>Metric Catalog]
        QUERY_GEN[Query Generator<br/>SQL/CHQL]
        SAFETY[Safety Guardrails<br/>12-Point Validation]
        EXECUTOR[Query Executor<br/>PostgreSQL/ClickHouse]
        CONFIDENCE[Confidence Scorer<br/>Multi-Component]
        LINEAGE[Lineage Resolver<br/>Provenance Tracker]
    end

    subgraph "Data Layer"
        POSTGRES[(PostgreSQL<br/>Metadata & Queries)]
        CLICKHOUSE[(ClickHouse<br/>Analytics - Optional)]
        REDIS[(Redis<br/>Cache & Locks)]
    end

    subgraph "Event Layer (Optional)"
        NATS[NATS Event Bus<br/>Pub/Sub]
        CONSUMERS[Event Consumers<br/>Audit/Analytics]
    end

    WEB --> API_CLIENT
    API_CLIENT --> FASTIFY
    FASTIFY --> AUTH
    AUTH --> RATE_LIMIT
    RATE_LIMIT --> ROUTES

    ROUTES --> INTENT
    INTENT --> TEMPLATE
    TEMPLATE --> QUERY_GEN
    QUERY_GEN --> SAFETY
    SAFETY --> EXECUTOR
    EXECUTOR --> CONFIDENCE
    CONFIDENCE --> LINEAGE

    EXECUTOR --> POSTGRES
    EXECUTOR --> CLICKHOUSE
    ROUTES --> REDIS
    SAFETY --> REDIS
    LINEAGE --> POSTGRES

    ROUTES --> NATS
    NATS --> CONSUMERS

    style SAFETY fill:#f99,stroke:#333,stroke-width:3px
    style REDIS fill:#9f9,stroke:#333,stroke-width:2px
    style INTENT fill:#99f,stroke:#333,stroke-width:2px
```

---

## Component Interaction

### 1. Request Flow

```mermaid
sequenceDiagram
    participant Client
    participant Fastify
    participant RateLimit
    participant Cache
    participant Intent
    participant QueryGen
    participant Safety
    participant Executor
    participant DB
    participant Lineage

    Client->>Fastify: POST /v1/nlq/ask
    Fastify->>RateLimit: Check rate limit
    RateLimit-->>Fastify: Allowed

    Fastify->>Cache: Check cache (key=hash)
    Cache-->>Fastify: Cache miss

    Fastify->>Intent: Classify intent (LLM)
    Intent-->>Fastify: Intent + slots + confidence

    Fastify->>QueryGen: Generate SQL from template
    QueryGen-->>Fastify: SQL + parameters

    Fastify->>Safety: Run 12-point validation
    Safety-->>Fastify: Validation passed

    Fastify->>Executor: Execute SQL
    Executor->>DB: Run query with filters
    DB-->>Executor: Result rows
    Executor-->>Fastify: Query results

    Fastify->>Lineage: Resolve data lineage
    Lineage-->>Fastify: Source provenance

    Fastify->>Cache: Store result (TTL=1h)
    Fastify->>Client: Return answer + metadata
```

### 2. Cache Stampede Protection

```mermaid
sequenceDiagram
    participant C1 as Client 1
    participant C2 as Client 2
    participant C3 as Client 3
    participant Cache
    participant Lock
    participant LLM

    C1->>Cache: Get (miss)
    C1->>Lock: Acquire lock
    Lock-->>C1: Lock acquired

    C2->>Cache: Get (miss)
    C2->>Lock: Acquire lock
    Lock-->>C2: Lock exists, wait

    C3->>Cache: Get (miss)
    C3->>Lock: Acquire lock
    Lock-->>C3: Lock exists, wait

    C1->>LLM: Classify + generate query
    LLM-->>C1: Result
    C1->>Cache: Store result
    C1->>Lock: Release lock

    C2->>Cache: Get (hit!)
    Cache-->>C2: Cached result

    C3->>Cache: Get (hit!)
    Cache-->>C3: Cached result
```

---

## Data Flow

### Question → Intent → SQL → Answer

```mermaid
graph LR
    A[Natural Language<br/>Question] --> B[Normalization<br/>lowercase, trim]
    B --> C[Intent Classification<br/>LLM]
    C --> D[Slot Extraction<br/>metric, time, filters]
    D --> E[Template Matching<br/>Metric Catalog]
    E --> F[Parameter Binding<br/>{{placeholders}}]
    F --> G[SQL Generation<br/>PostgreSQL/ClickHouse]
    G --> H[Safety Validation<br/>12 Checks]
    H --> I[Query Execution<br/>Database]
    I --> J[Confidence Scoring<br/>5 Components]
    J --> K[Lineage Resolution<br/>Provenance]
    K --> L[Answer Summary<br/>Human-readable]
    L --> M[Response<br/>JSON]

    style H fill:#f99,stroke:#333,stroke-width:3px
    style C fill:#99f,stroke:#333,stroke-width:2px
    style I fill:#9f9,stroke:#333,stroke-width:2px
```

### Intent Classification Process

```mermaid
graph TB
    Q[Question:<br/>'What is our SROI<br/>for last quarter?'] --> NORM[Normalize]
    NORM --> LLM[LLM Prompt:<br/>Intent Classification]

    LLM --> INTENT{Intent Type}
    INTENT -->|get_metric| METRIC[Metric: SROI]
    INTENT -->|compare_cohorts| COHORT[Comparison]
    INTENT -->|trend_analysis| TREND[Trend]

    METRIC --> SLOTS[Extract Slots:<br/>timeRange='last_quarter'<br/>metric='sroi_ratio']
    SLOTS --> CONF[Confidence:<br/>0.92]
    CONF --> TEMPLATE[Match Template:<br/>sroi_ratio]
```

---

## Database Schema

### Core Tables

#### 1. nlq_queries

**Purpose**: Complete audit trail for all queries

```sql
CREATE TABLE nlq_queries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- User input
  raw_question TEXT NOT NULL,
  normalized_question TEXT,
  language VARCHAR(10) DEFAULT 'en',

  -- Intent classification
  detected_intent VARCHAR(100) NOT NULL,
  extracted_slots JSONB NOT NULL,
  intent_confidence DECIMAL(4,3),

  -- Template matching
  template_id UUID REFERENCES nlq_templates(id),
  template_name VARCHAR(100),

  -- Generated query
  generated_sql TEXT,
  generated_chql TEXT,
  query_preview TEXT,

  -- Safety validation
  safety_check_id UUID REFERENCES nlq_safety_checks(id),
  safety_passed BOOLEAN NOT NULL DEFAULT false,
  safety_violations JSONB,

  -- Execution metadata
  execution_status VARCHAR(50) NOT NULL, -- pending, success, failed, rejected
  result_row_count INTEGER,
  execution_time_ms INTEGER,

  -- Answer metadata
  answer_confidence DECIMAL(4,3),
  answer_summary TEXT,
  lineage_pointers JSONB,

  -- Model information
  model_name VARCHAR(100),
  provider_name VARCHAR(50),
  tokens_used INTEGER,
  estimated_cost_usd VARCHAR(20),

  -- Rate limiting & caching
  cached BOOLEAN DEFAULT false,
  cache_key VARCHAR(64),

  -- Request tracking
  request_id VARCHAR(100),
  user_id UUID,
  session_id VARCHAR(100),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_nlq_queries_company ON nlq_queries(company_id);
CREATE INDEX idx_nlq_queries_created ON nlq_queries(created_at DESC);
CREATE INDEX idx_nlq_queries_cache_key ON nlq_queries(cache_key);
```

#### 2. nlq_templates

**Purpose**: Allow-listed metric templates for safe query generation

```sql
CREATE TABLE nlq_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Template identification
  template_name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL, -- impact, financial, engagement, outcomes

  -- SQL templates
  sql_template TEXT NOT NULL,
  chql_template TEXT,

  -- Allowed parameters
  allowed_time_ranges JSONB NOT NULL,
  allowed_group_by JSONB,
  allowed_filters JSONB,
  max_time_window_days INTEGER DEFAULT 365,

  -- Security constraints
  requires_tenant_filter BOOLEAN DEFAULT true,
  allowed_joins JSONB,
  denied_columns JSONB,

  -- Performance hints
  estimated_complexity VARCHAR(20),
  max_result_rows INTEGER DEFAULT 1000,
  cache_ttl_seconds INTEGER DEFAULT 3600,

  -- Metadata
  example_questions JSONB,
  related_templates JSONB,
  tags JSONB,

  -- Governance
  active BOOLEAN DEFAULT true,
  version INTEGER DEFAULT 1,
  created_by UUID,
  approved_by UUID,
  approved_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

#### 3. nlq_safety_checks

**Purpose**: 12-point validation audit trail

```sql
CREATE TABLE nlq_safety_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query_id UUID REFERENCES nlq_queries(id),

  -- 12-point safety validation
  check_results JSONB NOT NULL,
  overall_passed BOOLEAN NOT NULL,
  violation_codes JSONB,
  violation_severity VARCHAR(20),

  -- Detection metadata
  detection_method VARCHAR(50),
  false_positive_score DECIMAL(4,3),

  -- Audit trail
  checked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  checked_by VARCHAR(100),
  alert_triggered BOOLEAN DEFAULT false
);
```

#### 4. nlq_cache_entries

**Purpose**: Cache metadata and statistics

```sql
CREATE TABLE nlq_cache_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Cache key (SHA-256 hash)
  cache_key VARCHAR(64) NOT NULL UNIQUE,
  normalized_query TEXT NOT NULL,
  query_params JSONB,

  -- Cache metadata
  result_data JSONB,
  result_hash VARCHAR(64),
  hit_count INTEGER DEFAULT 0,
  last_hit_at TIMESTAMPTZ,

  -- TTL management
  ttl_seconds INTEGER DEFAULT 3600,
  expires_at TIMESTAMPTZ NOT NULL,
  invalidated BOOLEAN DEFAULT false,
  invalidated_reason VARCHAR(200),

  -- Performance tracking
  avg_execution_time_ms INTEGER,
  cache_generation_time_ms INTEGER,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cache_entries_key ON nlq_cache_entries(cache_key);
CREATE INDEX idx_cache_entries_expires ON nlq_cache_entries(expires_at);
```

#### 5. nlq_rate_limits

**Purpose**: Per-tenant query rate limiting

```sql
CREATE TABLE nlq_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) UNIQUE,

  -- Quota configuration
  daily_query_limit INTEGER DEFAULT 500,
  hourly_query_limit INTEGER DEFAULT 50,
  concurrent_query_limit INTEGER DEFAULT 5,

  -- Current usage
  queries_used_today INTEGER DEFAULT 0,
  queries_used_this_hour INTEGER DEFAULT 0,
  current_concurrent INTEGER DEFAULT 0,

  -- Reset tracking
  daily_reset_at TIMESTAMPTZ NOT NULL,
  hourly_reset_at TIMESTAMPTZ NOT NULL,

  -- Violation tracking
  limit_exceeded_count INTEGER DEFAULT 0,
  last_limit_exceeded_at TIMESTAMPTZ,

  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

## Caching Strategy

### Cache Key Generation

```typescript
// SHA-256 hash of normalized query + params
const cacheKey = generateCacheKey({
  normalizedQuestion: question.toLowerCase().trim(),
  companyId: '550e8400-e29b-41d4-a716-446655440000',
  timeRange: 'last_quarter',
  filters: { program: 'education' }
});

// Result: "nlq:550e8400:abc123def456..."
```

### Cache Layers

```mermaid
graph TB
    REQ[Request] --> L1{L1: Redis<br/>Hot Cache}
    L1 -->|HIT| RETURN1[Return cached result<br/>~50ms]
    L1 -->|MISS| L2{L2: PostgreSQL<br/>Warm Cache}
    L2 -->|HIT| REDIS[Store in Redis]
    REDIS --> RETURN2[Return result<br/>~200ms]
    L2 -->|MISS| LOCK{Acquire Lock?}
    LOCK -->|YES| LLM[Generate Query<br/>~1500ms]
    LOCK -->|NO| WAIT[Wait for lock<br/>~100ms retry]
    WAIT --> L1
    LLM --> EXEC[Execute Query]
    EXEC --> STORE[Store in both layers]
    STORE --> RETURN3[Return result<br/>~2000ms]

    style L1 fill:#9f9,stroke:#333,stroke-width:2px
    style RETURN1 fill:#9f9,stroke:#333,stroke-width:2px
```

### Cache TTL Strategy

| Template Category | TTL | Reason |
|------------------|-----|--------|
| **Real-time metrics** | 5 minutes | Volatile data |
| **Daily aggregates** | 1 hour | Updated daily |
| **Monthly metrics** | 4 hours | Stable data |
| **Quarterly/Annual** | 24 hours | Rarely changes |
| **Benchmarks** | 4 hours | Updated periodically |

### Cache Invalidation

**Event-based invalidation**:

```typescript
// When company data is updated
await nlqCache.invalidateByCompany(companyId);

// When a template is modified
await nlqCache.invalidateByTemplate(templateId);

// Manual invalidation
await nlqCache.invalidateAll();
```

**Pattern-based invalidation**:

```typescript
// Invalidate all SROI queries for a company
await nlqCache.invalidate(`nlq:${companyId}:*sroi*`);
```

---

## Event Architecture

### NATS Event Publishing

```mermaid
graph LR
    NLQ[NLQ Service] --> NATS[NATS Broker]
    NATS --> AUDIT[Audit Service<br/>Log events]
    NATS --> ANALYTICS[Analytics Service<br/>Track usage]
    NATS --> ALERTS[Alert Service<br/>Monitor violations]
    NATS --> CACHE_INV[Cache Invalidator<br/>Data updates]
```

### Event Types

#### 1. nlq.query.submitted

```json
{
  "eventType": "nlq.query.submitted",
  "queryId": "123e4567-e89b-12d3-a456-426614174000",
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "question": "What is our SROI for last quarter?",
  "timestamp": "2025-11-16T12:00:00.000Z"
}
```

#### 2. nlq.query.completed

```json
{
  "eventType": "nlq.query.completed",
  "queryId": "123e4567-e89b-12d3-a456-426614174000",
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "intent": "get_metric",
  "templateId": "sroi_ratio",
  "executionTimeMs": 1847,
  "cached": false,
  "confidence": 0.87,
  "timestamp": "2025-11-16T12:00:02.000Z"
}
```

#### 3. nlq.query.rejected

```json
{
  "eventType": "nlq.query.rejected",
  "queryId": "123e4567-e89b-12d3-a456-426614174000",
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "violations": ["PII_001", "TNT_001"],
  "severity": "critical",
  "timestamp": "2025-11-16T12:00:01.000Z"
}
```

---

## Performance Considerations

### Latency Targets

| Scenario | Target | Typical |
|----------|--------|---------|
| **Cache hit** | < 100ms | ~50ms |
| **Cache miss + warm DB** | < 500ms | ~300ms |
| **Full query generation** | < 3000ms | ~2000ms |
| **p95 latency** | < 2500ms | ~2100ms |
| **p99 latency** | < 4000ms | ~3500ms |

### Optimization Strategies

#### 1. Query Timeout

```typescript
const QUERY_TIMEOUT = 30000; // 30 seconds max
```

#### 2. Concurrent Query Limiting

```typescript
const MAX_CONCURRENT_QUERIES = 10; // Per service instance
```

#### 3. Result Row Limiting

```typescript
const MAX_RESULT_ROWS = 10000; // Hard cap
```

#### 4. Redis Pipelining

```typescript
// Batch cache operations
const pipeline = redis.pipeline();
keys.forEach(key => pipeline.get(key));
await pipeline.exec();
```

#### 5. Database Connection Pooling

```typescript
const pool = {
  min: 2,
  max: 10,
  timeout: 10000,
  idleTimeoutMillis: 30000,
};
```

### Scaling Strategy

```mermaid
graph TB
    LB[Load Balancer<br/>HAProxy/NGINX] --> NLQ1[NLQ Instance 1<br/>Port 3009]
    LB --> NLQ2[NLQ Instance 2<br/>Port 3009]
    LB --> NLQ3[NLQ Instance 3<br/>Port 3009]

    NLQ1 --> REDIS_CLUSTER[Redis Cluster<br/>Shared Cache]
    NLQ2 --> REDIS_CLUSTER
    NLQ3 --> REDIS_CLUSTER

    NLQ1 --> PG_REPLICA[PostgreSQL<br/>Read Replicas]
    NLQ2 --> PG_REPLICA
    NLQ3 --> PG_REPLICA

    PG_REPLICA --> PG_MASTER[PostgreSQL Master<br/>Write Operations]
```

**Horizontal Scaling**:
- Stateless service design (no local state)
- Shared Redis cache for consistency
- PostgreSQL read replicas for query load
- Load balancer with sticky sessions (optional)

**Vertical Scaling**:
- Increase Node.js memory limit: `--max-old-space-size=4096`
- Increase database connection pool size
- Increase Redis memory: `maxmemory 10gb`

---

**Next**: [Security](./NLQ_SECURITY.md) →
