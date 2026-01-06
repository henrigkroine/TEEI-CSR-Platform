# Database Integration Layer - NLQ Service

## Overview

The database integration layer provides safe, performant query execution for the Natural Language Query (NLQ) service. It supports both **PostgreSQL** (primary metadata store) and **ClickHouse** (optional analytics queries).

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    NLQ Query Pipeline                        │
├─────────────────────────────────────────────────────────────┤
│  1. Intent Classification → 2. Query Generation →           │
│  3. Safety Validation → 4. Query Execution → 5. Results     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                Database Integration Layer                    │
├──────────────────────┬──────────────────────────────────────┤
│   db-client.ts       │   query-executor.ts                  │
│   - Connection Pool  │   - Execute SQL/CHQL                 │
│   - Health Checks    │   - Timeout Handling                 │
│   - Singleton Mgmt   │   - Result Normalization             │
└──────────────────────┴──────────────────────────────────────┘
            │                            │
            ▼                            ▼
    ┌──────────────┐          ┌──────────────────┐
    │  PostgreSQL  │          │   ClickHouse     │
    │  (Primary)   │          │  (Analytics)     │
    └──────────────┘          └──────────────────┘
```

## Components

### 1. `db-client.ts` - Connection Management

Provides singleton database clients with connection pooling:

```typescript
import { getPostgresClient, getClickHouseClient, getDb } from './lib/db-client.js';

// PostgreSQL client (raw SQL)
const pgClient = getPostgresClient();
const result = await pgClient`SELECT * FROM nlq_queries WHERE id = ${queryId}`;

// Drizzle ORM (type-safe)
const db = getDb();
const queries = await db.select().from(nlqQueries).where(eq(nlqQueries.companyId, companyId));

// ClickHouse client
const chClient = getClickHouseClient();
const metrics = await chClient.query({ query: 'SELECT * FROM metrics_ch', format: 'JSONEachRow' });
```

**Features**:
- Singleton pattern (reuses connections)
- Connection pooling (max 10 for PostgreSQL)
- Configurable timeouts (connect: 10s, idle: 20s)
- Health check endpoints

**Configuration** (via environment variables):

```bash
# PostgreSQL
DATABASE_URL=postgresql://teei:password@localhost:5432/teei_platform
DATABASE_POOL_MAX=10

# ClickHouse
CLICKHOUSE_URL=http://localhost:8123
CLICKHOUSE_USER=teei
CLICKHOUSE_PASSWORD=password
CLICKHOUSE_DB=teei_analytics
```

### 2. `query-executor.ts` - Query Execution

Executes validated SQL/CHQL with safety guarantees:

```typescript
import { executeQuery } from './lib/query-executor.js';

// Execute with automatic database selection
const result = await executeQuery(
  sql,      // PostgreSQL query
  chql,     // Optional ClickHouse query
  {
    preferClickHouse: true,  // Use ClickHouse if available
    timeout: 30000,          // 30 second timeout
    maxRows: 10000,          // Safety limit
    requestId: 'req-123',    // For tracking
  }
);

console.log(result.rows);           // Normalized result data
console.log(result.metadata);       // Execution metrics
```

**Query Result Structure**:

```typescript
interface QueryResult {
  rows: any[];                     // Normalized result rows
  metadata: {
    rowCount: number;              // Number of rows returned
    executionTimeMs: number;       // Execution time in ms
    estimatedBytes: number;        // Approximate result size
    database: 'postgres' | 'clickhouse';
    cached: boolean;               // Future: cache hit indicator
    requestId?: string;
  };
  columns?: {
    name: string;
    type: string;
  }[];
}
```

**Result Normalization**:
- Dates/timestamps → ISO 8601 strings
- Decimals → Rounded to 4 decimal places
- NULL values → Preserved as `null`
- BigInt → Converted to `number`

**Error Handling**:

```typescript
try {
  const result = await executeQuery(sql, chql);
} catch (error) {
  if (error instanceof QueryExecutionError) {
    console.error('Query failed:', error.message);
    console.error('Database:', error.database);
    console.error('Error code:', error.code);
  }
}
```

## Database Schema

### NLQ Tables (PostgreSQL)

The NLQ service uses the following tables (defined in `@teei/shared-schema`):

1. **`nlq_queries`** - Query execution log
   - Stores intent, generated SQL/CHQL, safety checks, results
   - Indexed on: `company_id`, `cache_key`, `execution_status`

2. **`nlq_templates`** - Allowed query templates
   - Defines safe query patterns with parameter constraints
   - Indexed on: `template_name`, `active + category`

3. **`nlq_safety_checks`** - Safety validation audit trail
   - Records 12-point safety validation results
   - Indexed on: `query_id`, `overall_passed`, `violation_severity`

4. **`nlq_cache_entries`** - Query result cache
   - Redis-backed cache metadata
   - Indexed on: `cache_key`, `expires_at`

5. **`nlq_rate_limits`** - Per-tenant rate limiting
   - Tracks daily/hourly query quotas
   - Indexed on: `company_id`, `daily_reset_at`

### Migrations

Database indexes are created via migration:

```bash
# Run from project root
cd packages/shared-schema
pnpm run migrate
```

**Migration file**: `packages/shared-schema/migrations/0014_add_nlq_indexes.sql`

**Key indexes**:
- `idx_nlq_queries_company_created` - Company query lookups
- `idx_nlq_queries_cache_key` - Fast cache retrieval (target: <5ms)
- `idx_nlq_templates_active_category` - Template discovery
- `idx_nlq_safety_checks_severity` - Security monitoring

## Performance Targets

| Operation | Target | Index |
|-----------|--------|-------|
| Cache key lookup | < 5ms | `idx_nlq_queries_cache_key` |
| Company query list (50 rows) | < 50ms | `idx_nlq_queries_company_created` |
| Safety violation scan | < 100ms | `idx_nlq_safety_checks_severity` |
| Template discovery | < 10ms | `idx_nlq_templates_active_category` |

## Health Checks

The database layer provides health check endpoints:

```typescript
import { healthCheck } from './lib/db-client.js';

const health = await healthCheck();

console.log(health);
// {
//   postgres: { healthy: true, latencyMs: 12 },
//   clickhouse: { healthy: true, latencyMs: 8 },
//   overall: true
// }
```

## Testing

Run integration tests with mocked database connections:

```bash
cd services/insights-nlq
pnpm test src/lib/__tests__/db-integration.test.ts
pnpm test src/lib/__tests__/query-executor.test.ts
```

**Test coverage**:
- Connection pooling
- Health checks
- Query execution (PostgreSQL & ClickHouse)
- Timeout handling
- Result normalization
- Error handling
- Number formatting utilities

## Query Execution Flow

```
1. Receive validated SQL/CHQL from query-generator
   ↓
2. Select database (ClickHouse preferred if CHQL available)
   ↓
3. Execute with timeout wrapper (default: 30s)
   ↓
4. Validate row count (max: 10,000 by default)
   ↓
5. Normalize results:
   - Format dates → ISO 8601
   - Round decimals → 4 places
   - Handle NULLs → preserve as null
   ↓
6. Calculate execution metrics:
   - Row count
   - Execution time (ms)
   - Estimated bytes
   ↓
7. Return QueryResult with metadata
```

## Database Selection Logic

```typescript
function selectDatabase(sql: string, chql: string | undefined, options: QueryExecutionOptions) {
  // Use ClickHouse if:
  // 1. CHQL is provided
  // 2. preferClickHouse option is true (default)
  const useClickHouse = options.preferClickHouse && chql !== undefined;

  return useClickHouse ? 'clickhouse' : 'postgres';
}
```

**When to use ClickHouse**:
- Large time-series aggregations (trends, cohorts)
- Benchmarking queries (percentiles, medians)
- Funnel analysis (conversion funnels)
- Real-time dashboards (server-sent events)

**When to use PostgreSQL**:
- Small metadata queries (< 1000 rows)
- ACID-compliant writes (query logging)
- Complex joins (multi-table relationships)
- Template management (CRUD operations)

## Connection Lifecycle

```typescript
// Application startup
import { getPostgresClient, getClickHouseClient } from './lib/db-client.js';

// Connections are lazy-initialized on first use
const pgClient = getPostgresClient();  // Creates singleton
const chClient = getClickHouseClient(); // Creates singleton

// Application shutdown
import { closeConnections } from './lib/db-client.js';

process.on('SIGTERM', async () => {
  await closeConnections();  // Graceful shutdown
  process.exit(0);
});
```

## Number Formatting Utilities

Useful for displaying query results in UI:

```typescript
import { formatNumber, formatDecimal, formatLargeNumber } from './lib/query-executor.js';

formatNumber(1234567);           // "1,234,567"
formatDecimal(3.14159, 2);       // "3.14"
formatLargeNumber(1500000);      // "1.5M"
formatLargeNumber(2500000000);   // "2.5B"
```

## Error Codes

| Code | Database | Description |
|------|----------|-------------|
| `MAX_ROWS_EXCEEDED` | Both | Query returned more than `maxRows` |
| `PG_ERROR` | PostgreSQL | Generic PostgreSQL error |
| `CH_QUERY_ERROR` | ClickHouse | Generic ClickHouse error |
| `UNKNOWN_ERROR` | Both | Unexpected error |

## Security Considerations

1. **Always validate queries** with `SafetyGuardrails` before execution
2. **Never execute raw user input** - use templates only
3. **Enforce tenant isolation** - `companyId` filter required
4. **Respect rate limits** - check `nlq_rate_limits` before execution
5. **Use connection pooling** - prevents connection exhaustion
6. **Set query timeouts** - prevents long-running queries
7. **Limit result rows** - prevents memory exhaustion

## Troubleshooting

### Connection Errors

```typescript
// Check database health
import { healthCheck } from './lib/db-client.js';

const health = await healthCheck();
if (!health.postgres.healthy) {
  console.error('PostgreSQL unhealthy:', health.postgres.error);
}
if (!health.clickhouse.healthy) {
  console.error('ClickHouse unhealthy:', health.clickhouse.error);
}
```

### Query Timeouts

```typescript
// Increase timeout for slow queries
const result = await executeQuery(sql, chql, {
  timeout: 60000,  // 60 seconds
});
```

### Large Result Sets

```typescript
// Reduce maxRows or add LIMIT to query
const result = await executeQuery(sql, chql, {
  maxRows: 1000,  // Smaller limit
});
```

## Future Enhancements

- [ ] Query result caching (Redis integration)
- [ ] Prepared statement support
- [ ] Query explain plan analysis
- [ ] Connection pool metrics (Prometheus)
- [ ] Read replica support (PostgreSQL)
- [ ] Automatic failover (ClickHouse cluster)
- [ ] Query performance profiling
- [ ] Streaming result sets (large queries)

---

**Last Updated**: 2025-11-16
**Maintainer**: db-integration-specialist agent
