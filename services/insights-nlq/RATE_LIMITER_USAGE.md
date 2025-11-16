# Rate Limiter Usage Guide

Quick reference for integrating the NLQ rate limiter into your Fastify service.

## Basic Integration

### 1. Apply Global Rate Limiting

```typescript
import Fastify from 'fastify';
import {
  createRateLimitMiddleware,
  createRateLimitCleanupMiddleware
} from './middleware/rate-limit.js';

const fastify = Fastify();

// Apply rate limiting to all routes (except skipped paths)
fastify.addHook('preHandler', createRateLimitMiddleware({
  skipPaths: ['/health', '/metrics', '/docs'],
}));

// Add cleanup handler to decrement concurrent counters
fastify.addHook('onResponse', createRateLimitCleanupMiddleware());

// Your routes here
fastify.post('/nlq/query', async (request, reply) => {
  // Request will be rate limited automatically
  return { result: 'success' };
});
```

### 2. Route-Specific Rate Limiting

```typescript
import { createRouteRateLimitMiddleware } from './middleware/rate-limit.js';

// Apply to specific routes only
fastify.post('/nlq/query', {
  preHandler: [createRouteRateLimitMiddleware()],
  handler: async (request, reply) => {
    return { result: 'success' };
  },
});
```

### 3. Admin Bypass

```typescript
import { createAdminBypassMiddleware } from './middleware/rate-limit.js';

// Admin routes bypass rate limiting
fastify.register(async (adminRoutes) => {
  adminRoutes.addHook('preHandler', createAdminBypassMiddleware());

  adminRoutes.get('/admin/users', async (request, reply) => {
    // No rate limiting for admin
    return { users: [] };
  });
}, { prefix: '/admin' });
```

## Company ID Extraction

The rate limiter needs to identify which company the request belongs to. It tries multiple extraction methods in order:

1. **JWT Token** (recommended):
   ```typescript
   // Most secure - set by auth middleware
   request.user = { companyId: 'abc-123', ... };
   ```

2. **Request Body**:
   ```typescript
   {
     "companyId": "abc-123",
     "question": "What is our SROI?"
   }
   ```

3. **Query Parameter**:
   ```http
   GET /nlq/query?companyId=abc-123&question=...
   ```

4. **Header**:
   ```http
   X-Company-Id: abc-123
   ```

### Custom Extraction

```typescript
// Provide your own extractor
fastify.addHook('preHandler', createRateLimitMiddleware({
  extractCompanyIdFn: (request) => {
    // Custom logic
    return request.headers['x-tenant-id'] as string;
  },
}));
```

## Response Headers

Every response includes rate limit information:

```http
HTTP/1.1 200 OK
X-RateLimit-Limit-Daily: 500
X-RateLimit-Remaining-Daily: 250
X-RateLimit-Limit-Hourly: 50
X-RateLimit-Remaining-Hourly: 25
X-RateLimit-Limit-Concurrent: 5
X-RateLimit-Remaining-Concurrent: 3
```

## Handling Rate Limit Errors

When rate limited, clients receive 429 status:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
X-RateLimit-Remaining-Daily: 0

{
  "success": false,
  "error": "RateLimitError",
  "message": "Daily query limit exceeded (500 queries/day)",
  "details": {
    "retryAfter": 3600,
    "retryAfterSeconds": 3600
  },
  "retryable": true,
  "timestamp": "2024-01-15T10:30:00Z",
  "requestId": "req_abc123"
}
```

### Client-Side Handling

```typescript
async function queryNLQ(question: string) {
  try {
    const response = await fetch('/nlq/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question }),
    });

    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const error = await response.json();

      console.warn(`Rate limited. Retry after ${retryAfter} seconds`);
      console.warn(`Reason: ${error.message}`);

      // Show user-friendly message
      return { error: 'Too many requests. Please try again later.' };
    }

    return await response.json();
  } catch (error) {
    console.error('Query failed:', error);
    return { error: 'Request failed' };
  }
}
```

## Admin Quota Management

### Get Quota Status

```typescript
import { getNLQRateLimiter } from './lib/rate-limiter.js';

const rateLimiter = getNLQRateLimiter();
const quota = await rateLimiter.getRemainingQuota('company-id');

console.log('Daily:', quota.dailyRemaining, '/', quota.dailyLimit);
console.log('Hourly:', quota.hourlyRemaining, '/', quota.hourlyLimit);
console.log('Concurrent:', quota.concurrentRemaining, '/', quota.concurrentLimit);
```

### Update Quotas

```typescript
// Increase limits for a company
await rateLimiter.updateQuotaLimits({
  companyId: 'company-id',
  dailyQueryLimit: 1000,
  hourlyQueryLimit: 100,
  concurrentQueryLimit: 10,
  reason: 'Enterprise customer upgrade',
});
```

### Reset Quota Usage

```typescript
// Emergency reset (admin operation)
await rateLimiter.resetCompanyQuota('company-id');
```

## Environment Configuration

```bash
# .env
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgres://user:pass@localhost:5432/dbname
```

## Graceful Shutdown

```typescript
import { shutdownRateLimiter } from './lib/rate-limiter.js';
import { cleanupAllActiveRequests } from './middleware/rate-limit.js';

// On shutdown
process.on('SIGTERM', async () => {
  console.log('Shutting down gracefully...');

  // Cleanup active requests
  await cleanupAllActiveRequests();

  // Shutdown rate limiter (syncs to DB and closes Redis)
  await shutdownRateLimiter();

  // Close Fastify
  await fastify.close();
});
```

## Monitoring

### Active Requests

```typescript
import { getActiveRequestsCount } from './middleware/rate-limit.js';

// Monitoring endpoint
fastify.get('/metrics/rate-limit', async (request, reply) => {
  const activeRequests = getActiveRequestsCount();

  return {
    activeRequests,
    totalCompanies: Object.keys(activeRequests).length,
  };
});
```

### Quota Stats

```http
GET /admin/quotas/stats

{
  "totalCompanies": 150,
  "averageUtilization": {
    "daily": 45,
    "hourly": 30,
    "concurrent": 20
  },
  "topConsumers": [...],
  "recentViolations": [...]
}
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect, vi } from 'vitest';
import { getNLQRateLimiter } from './lib/rate-limiter.js';

describe('Rate Limiter', () => {
  it('should enforce daily limits', async () => {
    const rateLimiter = getNLQRateLimiter();

    // Mock heavy usage
    // ... test logic
  });
});
```

### Integration Tests

```typescript
import Fastify from 'fastify';
import { createRateLimitMiddleware } from './middleware/rate-limit.js';

describe('Rate Limit Middleware', () => {
  it('should reject when limit exceeded', async () => {
    const fastify = Fastify();
    fastify.addHook('preHandler', createRateLimitMiddleware());

    // ... test logic
  });
});
```

## Common Issues

### Issue: All requests rate limited

**Solution**: Check Redis counters and reset if needed:
```bash
redis-cli KEYS "nlq:ratelimit:*" | xargs redis-cli DEL
```

### Issue: Quotas not resetting

**Solution**: Verify cron jobs are running for daily/hourly resets.

### Issue: Redis connection failures

**Solution**: Rate limiter will fail open (allow requests) but log errors. Check Redis status and connectivity.

## Best Practices

1. **Always use JWT-based company ID extraction** for security
2. **Set up monitoring alerts** for quota violations
3. **Configure appropriate limits** based on tier (free/pro/enterprise)
4. **Test graceful degradation** when Redis is down
5. **Monitor Redis memory usage** and set appropriate eviction policies
6. **Log admin quota changes** with reason for audit trail
7. **Use temporary quota increases** with expiration for demos/testing

## Performance Tips

- Rate limiter adds <1ms latency (Redis is very fast)
- Use Redis cluster for high availability
- Monitor cache hit rates in Redis
- Consider per-region quotas for multi-region deployments
- Set up alerts for fail-open events

## Next Steps

1. Integrate with authentication middleware
2. Set up cron jobs for quota resets
3. Configure monitoring and alerting
4. Test under load
5. Document tier-specific limits
6. Add quota management UI for admins
