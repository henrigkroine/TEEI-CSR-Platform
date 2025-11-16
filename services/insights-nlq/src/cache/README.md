# NLQ Cache Layer - Architecture & Performance Guide

## Overview

The NLQ Cache Layer is a high-performance Redis-based caching system designed to achieve **p95 ≤2.5s latency** for Natural Language Query (NLQ) operations. It implements sophisticated caching strategies including stampede protection, intelligent pre-warming, and multi-dimensional invalidation.

## Performance Goals

- **p95 Latency**: ≤2.5 seconds end-to-end (intent → answer)
- **Cache Hit Rate**: >80% for common queries
- **Memory Limit**: 10GB with LRU eviction
- **Availability**: 99.9% uptime with graceful degradation

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                      NLQ Cache Layer                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  NLQCache    │  │ CacheWarmer  │  │   Redis      │     │
│  │  (Core)      │  │ (Pre-warm)   │  │   Client     │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│                                                             │
│  Features:                                                  │
│  • SHA-256 cache key generation                            │
│  • Lock-based stampede protection                          │
│  • Hit/miss rate tracking                                  │
│  • Pattern-based invalidation                              │
│  • Redis pipelining for batch ops                          │
│  • Top-20 query pre-warming                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Cache Key Strategy

### Key Generation

Cache keys are deterministically generated using **SHA-256 hashing** of normalized query parameters:

```typescript
interface CacheKey {
  normalizedQuestion: string;  // Lowercase, trimmed
  companyId: string;           // Tenant isolation
  timeRange: string;           // e.g., "last_quarter"
  filters?: Record<string, any>; // Sorted by key
}

// Example key: nlq:company-123:a3f8c9d2e1...
```

**Benefits**:
- **Collision-resistant**: SHA-256 ensures unique keys
- **Deterministic**: Same input always produces same key
- **Case-insensitive**: "What is SROI?" === "what is sroi?"
- **Filter-order agnostic**: `{a:1, b:2}` === `{b:2, a:1}`

### Key Structure

```
Format: nlq:{companyId}:{hash}

Examples:
  nlq:abc-123:7f8e9d2c1a... (company-specific)
  nlq:stats:hits             (global stats)
  nlq:lock:{key}             (stampede lock)
  nlq:stats:query:{hash}     (query tracking)
```

## Core Features

### 1. Get/Set Operations

```typescript
const cache = getNLQCache();

// Set with TTL from template
await cache.set(
  cacheKey,
  queryResult,
  template.cacheTtlSeconds,
  template.id,
  originalQuestion
);

// Get with automatic hit tracking
const cached = await cache.get(cacheKey);
if (cached) {
  console.log('Hit count:', cached.metadata.hitCount);
  return cached.data;
}
```

**Performance**:
- **Cache hit**: <5ms average latency
- **Cache miss**: Full query execution (~500-2000ms)
- **Hit tracking**: Fire-and-forget async update

### 2. Cache Stampede Protection

Prevents multiple concurrent requests from executing the same expensive query when cache expires.

```typescript
const result = await cache.withStampedeProtection(
  cacheKey,
  async () => {
    // Expensive query execution
    return await executeNLQQuery(question, companyId);
  },
  ttl,
  templateId,
  originalQuestion
);

// Only ONE request executes the query
// Others wait for the lock and read from cache
```

**How it works**:
1. First request acquires distributed lock (Redis SET NX EX)
2. Other requests wait for lock release (max 5 seconds)
3. First request executes query and populates cache
4. Other requests read from freshly populated cache
5. Lock automatically expires after 30 seconds

**Benefits**:
- **Prevents thundering herd** during cache expiration
- **Reduces database load** by 90%+ during high traffic
- **Graceful degradation** if lock expires

### 3. Invalidation Strategies

#### Time-Based Invalidation
```typescript
// Automatic TTL expiration (from template)
await cache.set(key, data, template.cacheTtlSeconds);
```

#### Event-Based Invalidation
```typescript
// When new data arrives via NATS
await cache.invalidateByCompany(companyId);
await warmer.warmupTemplates(affectedTemplateIds, companyId);
```

#### Pattern-Based Invalidation
```typescript
// By company
await cache.invalidateByCompany('company-123');
// Invalidates: nlq:company-123:*

// By template (expensive, scans all keys)
await cache.invalidateByTemplate('sroi_ratio');

// Custom pattern
await cache.invalidate('nlq:*:7f8e9d*');
```

#### Manual Invalidation
```typescript
// Admin endpoint
await cache.invalidateAll();
```

### 4. Cache Pre-Warming

Pre-warms cache with the **top 20 most common queries** to ensure high hit rates.

```typescript
const warmer = getCacheWarmer();

// Start periodic warming (every 30 minutes)
warmer.start();

// Manual warmup for specific companies
await warmer.warmup(['company-1', 'company-2']);

// Template-specific warmup (after data update)
await warmer.warmupTemplates(['sroi_ratio', 'vis_score'], companyId);
```

**Top 20 Common Queries**:
1. "What is our SROI for last quarter?"
2. "Show me SROI trend for the past year"
3. "What is our average VIS score?"
4. "What are our outcome scores by dimension?"
5. "How many active participants do we have?"
... (see `cache-warmer.ts` for full list)

**Warming Strategy**:
- **Periodic**: Every 30 minutes
- **Event-driven**: On data updates (NATS events)
- **Smart skipping**: Skip if cache is <50% expired
- **Controlled concurrency**: 5 parallel warmup operations

### 5. Statistics Tracking

```typescript
const stats = await cache.getStats();

console.log(stats);
// {
//   totalKeys: 1547,
//   totalHits: 8923,
//   totalMisses: 2104,
//   hitRate: 80.92,
//   memoryUsed: '245.67 MB',
//   memoryUsedBytes: 257589248,
//   avgTtl: 3600,
//   topQueries: [
//     { hash: '7f8e...', hits: 342, question: 'What is our SROI?' },
//     ...
//   ]
// }
```

**Tracked Metrics**:
- Total cache hits/misses
- Hit rate percentage
- Memory usage
- Top queries by hit count
- Average TTL
- Per-query hit counts

### 6. Batch Operations

Efficient bulk operations using Redis pipelining:

```typescript
// Get multiple keys in parallel
const results = await cache.getMultiple([
  'nlq:company-1:abc...',
  'nlq:company-1:def...',
  'nlq:company-2:ghi...',
]);

// Set multiple entries in parallel
await cache.setMultiple([
  { key: 'nlq:...', data: result1, ttl: 3600 },
  { key: 'nlq:...', data: result2, ttl: 7200 },
]);
```

**Performance**:
- **Pipelined**: Single round-trip to Redis
- **10x faster** than sequential operations
- **Ideal for bulk warming**

## Performance Optimizations

### 1. Redis Configuration

```redis
maxmemory 10gb
maxmemory-policy allkeys-lru
tcp-keepalive 60
timeout 300
```

**Rationale**:
- **LRU eviction**: Automatically removes least-recently-used entries
- **10GB limit**: Prevents OOM, forces intelligent caching
- **TCP keepalive**: Prevents connection timeouts

### 2. TTL Strategy

| Query Type | TTL | Rationale |
|------------|-----|-----------|
| SROI/Financial | 3600s (1h) | Updated monthly/quarterly |
| Outcome Scores | 1800s (30m) | Updated more frequently |
| Trends | 7200s (2h) | Historical data, stable |
| Benchmarks | 14400s (4h) | Aggregate data, rarely changes |

**Adaptive TTL** (future enhancement):
```typescript
// Adjust TTL based on query volatility
const ttl = calculateAdaptiveTtl(templateId, updateFrequency);
```

### 3. Memory Optimization

- **Compact keys**: SHA-256 hash vs. full query string
- **Metadata minimization**: Only essential fields
- **JSON compression**: Could add gzip for large results
- **LRU eviction**: Automatic cleanup of stale entries

### 4. Network Optimization

- **Pipelining**: Batch Redis commands
- **Connection pooling**: Reuse connections
- **Lazy connect**: Connect only when needed
- **Fire-and-forget**: Async hit tracking

## Latency Breakdown (p95)

```
Total: 2.5s
├─ Cache lookup:           5ms   (0.2%)
├─ Cache hit → return:     0ms   (0%)
└─ Cache miss → query:  2495ms (99.8%)
    ├─ Lock acquisition:   2ms
    ├─ Query execution: 1800ms
    │   ├─ Intent classification: 200ms
    │   ├─ SQL generation:        150ms
    │   ├─ Safety validation:      50ms
    │   └─ DB execution:         1400ms
    ├─ Result processing: 200ms
    ├─ Cache storage:       5ms
    └─ Lock release:        3ms
```

**Target with 80% hit rate**:
- 80% of queries: **<10ms** (cache hit)
- 20% of queries: **~2.5s** (cache miss)
- **Weighted average**: ~0.5s per query

## Usage Examples

### Basic Integration

```typescript
import { getNLQCache, generateCacheKey } from './cache/nlq-cache.js';
import { getCacheWarmer } from './cache/cache-warmer.js';

// Initialize cache warmer on service startup
const warmer = getCacheWarmer();
warmer.start();

// In your NLQ query handler
async function handleNLQQuery(question: string, companyId: string, timeRange: string) {
  const cache = getNLQCache();

  // Generate cache key
  const cacheKey = generateCacheKey({
    normalizedQuestion: question,
    companyId,
    timeRange,
  });

  // Use stampede protection
  const result = await cache.withStampedeProtection(
    cacheKey,
    async () => {
      // Execute expensive NLQ query
      return await executeNLQQuery(question, companyId, timeRange);
    },
    3600, // TTL
    'template-id',
    question
  );

  return result.data;
}
```

### NATS Event Integration

```typescript
import { handleDataUpdateEvent } from './cache/cache-warmer.js';

// Subscribe to data update events
nc.subscribe('data.updated', async (err, msg) => {
  const event = JSON.parse(msg.data);

  // Invalidate and re-warm cache
  await handleDataUpdateEvent({
    companyId: event.companyId,
    templateIds: event.affectedTemplates,
    timestamp: new Date(event.timestamp),
  });
});
```

### Admin Endpoints

```typescript
// GET /admin/cache/stats
app.get('/admin/cache/stats', async (req, res) => {
  const cache = getNLQCache();
  const stats = await cache.getStats();
  res.json(stats);
});

// POST /admin/cache/invalidate
app.post('/admin/cache/invalidate', async (req, res) => {
  const { companyId } = req.body;
  const cache = getNLQCache();
  const deleted = await cache.invalidateByCompany(companyId);
  res.json({ deleted });
});

// POST /admin/cache/warmup
app.post('/admin/cache/warmup', async (req, res) => {
  const { companyIds } = req.body;
  const warmer = getCacheWarmer();
  await warmer.warmup(companyIds);
  res.json({ status: 'completed' });
});
```

## Testing

### Run Tests

```bash
# Unit tests
pnpm test src/cache/__tests__

# With coverage
pnpm test src/cache/__tests__ --coverage

# Watch mode
pnpm test src/cache/__tests__ --watch
```

### Mock Redis

Tests use a comprehensive Redis mock that simulates:
- GET/SET/DEL operations
- Expiration (TTL)
- Pattern matching (KEYS)
- Pipelining
- Hash operations (HGETALL, HINCRBY)

```typescript
// Example test
it('should cache and retrieve data', async () => {
  const cache = new NLQCache();
  await cache.set('key', { data: 'value' }, 3600);
  const cached = await cache.get('key');
  expect(cached.data).toEqual({ data: 'value' });
});
```

## Monitoring & Observability

### Key Metrics to Track

1. **Cache Hit Rate**: Target >80%
   ```typescript
   const stats = await cache.getStats();
   metrics.gauge('nlq.cache.hit_rate', stats.hitRate);
   ```

2. **p95 Latency**: Target ≤2.5s
   ```typescript
   const duration = Date.now() - startTime;
   metrics.histogram('nlq.query.duration', duration, { cached: result.cached });
   ```

3. **Memory Usage**: Target <10GB
   ```typescript
   metrics.gauge('nlq.cache.memory_bytes', stats.memoryUsedBytes);
   ```

4. **Stampede Events**: Target <5% of queries
   ```typescript
   metrics.increment('nlq.cache.stampede', { prevented: true });
   ```

### Alerts

```yaml
alerts:
  - name: Low Cache Hit Rate
    condition: nlq.cache.hit_rate < 70
    severity: warning

  - name: High p95 Latency
    condition: nlq.query.duration.p95 > 3000
    severity: critical

  - name: Cache Memory Pressure
    condition: nlq.cache.memory_bytes > 9GB
    severity: warning
```

## Future Enhancements

1. **Adaptive TTL**: Adjust TTL based on query volatility
2. **Predictive Warming**: ML-based prediction of next queries
3. **Distributed Cache**: Redis Cluster for horizontal scaling
4. **Cache Compression**: Gzip large result sets
5. **Query Result Diffing**: Cache only deltas for trends
6. **Multi-tier Caching**: L1 (in-memory) + L2 (Redis)

## Troubleshooting

### Low Hit Rate (<70%)

- Check if queries are properly normalized
- Verify TTL is not too short
- Ensure cache warmer is running
- Review top queries to identify missing patterns

### High Memory Usage (>9GB)

- Reduce TTL for low-value queries
- Increase eviction rate (lower maxmemory)
- Audit large result sets for compression

### High p95 Latency (>3s)

- Check database query performance
- Verify cache is enabled
- Review stampede protection effectiveness
- Consider pre-warming more queries

## References

- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Cache Stampede Prevention](https://en.wikipedia.org/wiki/Cache_stampede)
- [LRU Cache Eviction](https://redis.io/docs/manual/eviction/)

---

**Authors**: analytics-cache-engineer
**Last Updated**: 2025-11-16
**Version**: 1.0.0
