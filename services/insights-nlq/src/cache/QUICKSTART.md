# NLQ Cache - Quick Start Guide

⚡ Get up and running with the NLQ cache layer in 5 minutes.

## Prerequisites

- Redis server running (default: `localhost:6379`)
- Node.js 20+ with pnpm

## 1. Environment Setup

```bash
# .env file
REDIS_URL=redis://localhost:6379
LOG_LEVEL=info
NODE_ENV=development
```

## 2. Basic Usage

### Initialize Cache Warmer

```typescript
import { getCacheWarmer } from './cache/cache-warmer.js';

// Start periodic cache warming (every 30 minutes)
const warmer = getCacheWarmer();
warmer.start();
```

### Cache Your Queries

```typescript
import { getNLQCache, generateCacheKey } from './cache/nlq-cache.js';

async function handleQuery(question: string, companyId: string) {
  const cache = getNLQCache();

  // Generate deterministic cache key
  const cacheKey = generateCacheKey({
    normalizedQuestion: question,
    companyId,
    timeRange: 'last_quarter',
  });

  // Use stampede protection (prevents thundering herd)
  const result = await cache.withStampedeProtection(
    cacheKey,
    async () => {
      // Your expensive query here
      return await executeExpensiveQuery(question, companyId);
    },
    3600, // TTL in seconds
    'sroi_ratio', // Template ID
    question // Original question for tracking
  );

  return result.data;
}
```

## 3. Invalidation

### By Company

```typescript
const cache = getNLQCache();
await cache.invalidateByCompany('company-123');
```

### By Template

```typescript
await cache.invalidateByTemplate('sroi_ratio');
```

### All Cache

```typescript
await cache.invalidateAll();
```

## 4. Monitoring

### Get Cache Statistics

```typescript
const stats = await cache.getStats();
console.log(`Hit Rate: ${stats.hitRate}%`);
console.log(`Memory: ${stats.memoryUsed}`);
console.log(`Keys: ${stats.totalKeys}`);
```

### Health Check

```typescript
const healthy = await cache.healthCheck();
console.log(`Cache healthy: ${healthy}`);
```

## 5. Testing

```bash
# Run tests
pnpm test src/cache/__tests__

# Run benchmark
tsx src/cache/benchmark.ts
```

## 6. Common Patterns

### Manual Cache Warmup

```typescript
const warmer = getCacheWarmer();

// Warm specific companies
await warmer.warmup(['company-1', 'company-2']);

// Warm specific templates
await warmer.warmupTemplates(['sroi_ratio', 'vis_score'], 'company-1');
```

### Event-Driven Invalidation

```typescript
import { handleDataUpdateEvent } from './cache/cache-warmer.js';

// When new data arrives
await handleDataUpdateEvent({
  companyId: 'company-123',
  templateIds: ['sroi_ratio', 'vis_score'],
  timestamp: new Date(),
});
```

### Batch Operations

```typescript
// Get multiple entries
const results = await cache.getMultiple([
  'nlq:company-1:abc...',
  'nlq:company-1:def...',
]);

// Set multiple entries
await cache.setMultiple([
  { key: 'nlq:...', data: result1, ttl: 3600 },
  { key: 'nlq:...', data: result2, ttl: 7200 },
]);
```

## Troubleshooting

### Cache Not Working?

1. Check Redis connection: `redis-cli ping`
2. Verify environment variables
3. Check logs for errors: `LOG_LEVEL=debug`

### Low Hit Rate?

1. Ensure queries are normalized (lowercase, trimmed)
2. Check cache warmer is running: `warmer.start()`
3. Review TTL settings (may be too short)

### High Memory Usage?

1. Check `maxmemory` Redis config
2. Verify LRU eviction is enabled
3. Reduce TTL for low-value queries

## Next Steps

- Read full documentation: [README.md](./README.md)
- Review implementation: [CACHE_IMPLEMENTATION_SUMMARY.md](../CACHE_IMPLEMENTATION_SUMMARY.md)
- Run performance benchmark: `tsx src/cache/benchmark.ts`

**Questions?** Check the troubleshooting section in README.md
