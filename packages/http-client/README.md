# HTTP Client - Resilience SDK

> **Purpose:** Production-grade HTTP client with circuit breakers, timeouts, retries, and bulkheads for fault-tolerant microservices.

## Overview

This package provides a resilient HTTP client that implements reliability patterns:
- **Circuit Breaker** - Prevent cascading failures by short-circuiting failing services
- **Timeouts** - Avoid hanging requests with configurable timeouts
- **Retries** - Exponential backoff retries for transient errors
- **Bulkhead** - Limit concurrent requests to prevent resource exhaustion

## Installation

```bash
pnpm add @teei/http-client
```

## Quick Start

### Basic Usage

```typescript
import { createHttpClient } from '@teei/http-client';

// Create client with default configuration
const client = createHttpClient();

// Make GET request
const user = await client.get('http://localhost:3001/v1/profile/123');

// Make POST request
const result = await client.post('http://localhost:3005/v1/classify/text', {
  text: 'Sample text',
  userId: '123',
});
```

### With Custom Configuration

```typescript
const client = createHttpClient({
  timeoutMs: 3000,           // 3 second timeout
  maxRetries: 5,             // 5 retry attempts
  failureThreshold: 10,      // Open circuit after 10 failures
  maxConcurrentRequests: 50, // Max 50 concurrent requests per service
  verbose: true,             // Enable detailed logging
});
```

## Circuit Breaker Pattern

The circuit breaker prevents cascading failures by tracking request success/failure rates:

### States

1. **CLOSED** (Normal)
   - Requests flow normally
   - Failures are counted
   - Transitions to OPEN when failure threshold exceeded

2. **OPEN** (Failing)
   - Requests are rejected immediately
   - Service given time to recover
   - Transitions to HALF_OPEN after timeout

3. **HALF_OPEN** (Testing)
   - Limited requests allowed through
   - Tests if service recovered
   - Transitions to CLOSED on success or OPEN on failure

### Example

```typescript
const client = createHttpClient({
  failureThreshold: 5,     // Open after 5 failures
  successThreshold: 2,     // Close after 2 successes in half-open
  openDurationMs: 60000,   // Stay open for 1 minute
});

try {
  await client.get('http://failing-service/api');
} catch (error) {
  if (error.message.includes('Circuit breaker is OPEN')) {
    // Service is unavailable, use fallback
    return getFallbackData();
  }
}
```

## Timeout Configuration

Prevent hanging requests with automatic timeouts:

```typescript
const client = createHttpClient({
  timeoutMs: 5000, // 5 second timeout
});

try {
  await client.get('http://slow-service/api');
} catch (error) {
  if (error.message.includes('timeout')) {
    console.error('Request timed out');
  }
}
```

## Retry Logic

Automatic retries with exponential backoff:

```typescript
const client = createHttpClient({
  maxRetries: 3,    // 3 retry attempts
  retryFactor: 2,   // Exponential backoff: 1s, 2s, 4s
});

// Automatically retries on:
// - Network errors
// - Timeouts
// - 5xx server errors

// Does NOT retry on:
// - 4xx client errors (invalid request)
```

## Bulkhead Pattern

Limit concurrent requests to prevent resource exhaustion:

```typescript
const client = createHttpClient({
  maxConcurrentRequests: 100, // Max 100 concurrent requests per service
});

// Requests beyond limit are queued automatically
const promises = Array(200).fill(0).map(() =>
  client.get('http://api/endpoint')
);

// First 100 execute immediately, rest are queued
await Promise.all(promises);
```

## HTTP Methods

### GET Request

```typescript
const data = await client.get<User>('http://api/users/123', {
  headers: { 'Authorization': 'Bearer token' },
  query: { include: 'profile' },
});
```

### POST Request

```typescript
const created = await client.post('http://api/users', {
  firstName: 'John',
  lastName: 'Doe',
}, {
  headers: { 'Authorization': 'Bearer token' },
});
```

### PUT Request

```typescript
const updated = await client.put('http://api/users/123', {
  firstName: 'Jane',
});
```

### DELETE Request

```typescript
await client.delete('http://api/users/123');
```

### PATCH Request

```typescript
const patched = await client.patch('http://api/users/123', {
  email: 'newemail@example.com',
});
```

## Monitoring

### Get Circuit Stats

```typescript
// Get stats for specific service
const stats = client.getCircuitStats('http://localhost:3001');
console.log({
  state: stats.state,        // CLOSED, OPEN, or HALF_OPEN
  failures: stats.failures,
  successes: stats.successes,
});

// Get stats for all services
const allStats = client.getCircuitStats();
console.log(allStats);
```

### Get Bulkhead Stats

```typescript
// Get bulkhead stats for specific service
const bulkhead = client.getBulkheadStats('http://localhost:3001');
console.log({
  current: bulkhead.current,  // Current concurrent requests
  max: bulkhead.max,          // Maximum allowed
  queued: bulkhead.queued,    // Requests waiting in queue
});
```

## Manual Circuit Control

### Reset Circuit

```typescript
// Reset circuit to CLOSED state
client.resetCircuit('http://localhost:3001');
```

### Manually Open Circuit

```typescript
// Force circuit open (reject all requests)
client.openCircuit('http://localhost:3001');
```

### Manually Close Circuit

```typescript
// Force circuit closed (allow requests)
client.closeCircuit('http://localhost:3001');
```

## Integration with Services

### Unified Profile Service

```typescript
// services/unified-profile/src/clients/http.ts
import { createHttpClient } from '@teei/http-client';

const client = createHttpClient({
  timeoutMs: 3000,
  maxRetries: 3,
});

export async function fetchUserFromExternalSystem(externalId: string) {
  try {
    return await client.get(
      `http://external-system/api/users/${externalId}`
    );
  } catch (error) {
    logger.error({ error, externalId }, 'Failed to fetch external user');
    throw error;
  }
}
```

### API Gateway

```typescript
// services/api-gateway/src/proxy.ts
import { createHttpClient } from '@teei/http-client';

const client = createHttpClient({
  failureThreshold: 5,
  openDurationMs: 30000,
  verbose: true,
});

// Use resilient client for service-to-service calls
export async function proxyToService(serviceUrl: string, path: string) {
  return await client.get(`${serviceUrl}${path}`);
}
```

## Configuration Reference

```typescript
interface ResilienceConfig {
  /** Request timeout in milliseconds (default: 5000) */
  timeoutMs: number;

  /** Maximum retry attempts (default: 3) */
  maxRetries: number;

  /** Retry delay factor - exponential backoff multiplier (default: 2) */
  retryFactor: number;

  /** Circuit breaker failure threshold (default: 5) */
  failureThreshold: number;

  /** Circuit breaker success threshold for half-open state (default: 2) */
  successThreshold: number;

  /** Circuit breaker open duration in ms (default: 60000) */
  openDurationMs: number;

  /** Circuit breaker monitoring window in ms (default: 60000) */
  windowMs: number;

  /** Bulkhead max concurrent requests (default: 100) */
  maxConcurrentRequests: number;

  /** Enable detailed logging (default: false) */
  verbose: boolean;
}
```

## Best Practices

### 1. Use Different Clients for Different SLAs

```typescript
// Critical services - conservative settings
const criticalClient = createHttpClient({
  timeoutMs: 2000,
  maxRetries: 5,
  failureThreshold: 3,
});

// Non-critical services - aggressive settings
const nonCriticalClient = createHttpClient({
  timeoutMs: 10000,
  maxRetries: 2,
  failureThreshold: 10,
});
```

### 2. Implement Fallbacks

```typescript
async function getUserProfile(userId: string) {
  try {
    return await client.get(`http://profile-service/v1/profile/${userId}`);
  } catch (error) {
    if (error.message.includes('Circuit breaker is OPEN')) {
      // Return cached data or default profile
      return getCachedProfile(userId);
    }
    throw error;
  }
}
```

### 3. Monitor Circuit States

```typescript
// Periodic health check
setInterval(() => {
  const stats = client.getCircuitStats();

  Object.entries(stats).forEach(([service, circuit]) => {
    if (circuit.state === 'OPEN') {
      logger.error({ service }, 'Circuit breaker OPEN - service unavailable');
      // Alert operations team
    }
  });
}, 30000); // Check every 30 seconds
```

### 4. Set Appropriate Timeouts

- **Fast queries:** 1-2 seconds
- **Normal operations:** 5 seconds (default)
- **Heavy processing:** 10-30 seconds
- **Batch operations:** 60+ seconds

### 5. Don't Retry Idempotent Operations

```typescript
// Safe to retry
await client.get('http://api/users/123');

// NOT safe to retry without idempotency key
await client.post('http://api/payments', { amount: 100 });
```

## Error Handling

### Timeout Errors

```typescript
try {
  await client.get('http://slow-service/api');
} catch (error) {
  if (error.message.includes('timeout')) {
    // Handle timeout
  }
}
```

### Circuit Breaker Errors

```typescript
try {
  await client.get('http://failing-service/api');
} catch (error) {
  if (error.message.includes('Circuit breaker is OPEN')) {
    // Service is down, use fallback
  }
}
```

### HTTP Errors

```typescript
try {
  await client.get('http://api/not-found');
} catch (error) {
  if (error.message.includes('HTTP 404')) {
    // Handle not found
  } else if (error.message.includes('HTTP 5')) {
    // Handle server error
  }
}
```

## Testing

### Mock Circuit Breaker

```typescript
import { vi, describe, it, expect } from 'vitest';
import { createHttpClient } from '@teei/http-client';

describe('Circuit Breaker', () => {
  it('should open circuit after failures', async () => {
    const client = createHttpClient({
      failureThreshold: 3,
      maxRetries: 0, // Disable retries for faster test
    });

    // Trigger 3 failures
    for (let i = 0; i < 3; i++) {
      try {
        await client.get('http://failing-service/api');
      } catch {}
    }

    // Circuit should be open
    const stats = client.getCircuitStats('http://failing-service');
    expect(stats.state).toBe('OPEN');
  });
});
```

## Performance Considerations

### Connection Pooling

undici automatically manages HTTP connection pooling for optimal performance.

### Memory Usage

- Circuit stats are stored per service (minimal memory overhead)
- Bulkhead queues grow with concurrent requests (monitor queue size)

### CPU Usage

- Exponential backoff calculations are lightweight
- Circuit state transitions are infrequent

## Comparison with Other Libraries

| Feature | @teei/http-client | axios | node-fetch |
|---------|-------------------|-------|------------|
| Circuit Breaker | ✅ Built-in | ❌ Requires plugin | ❌ Manual |
| Timeout | ✅ Native | ✅ Config | ⚠️ AbortController |
| Retry | ✅ Exponential | ⚠️ Plugin | ❌ Manual |
| Bulkhead | ✅ Built-in | ❌ Manual | ❌ Manual |
| HTTP/2 | ✅ undici | ❌ | ❌ |
| TypeScript | ✅ Native | ✅ | ⚠️ @types |

## Resources

- [Circuit Breaker Pattern](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Bulkhead Pattern](https://docs.microsoft.com/en-us/azure/architecture/patterns/bulkhead)
- [undici Documentation](https://undici.nodejs.org/)
- [p-retry Documentation](https://github.com/sindresorhus/p-retry)

---

**Maintained by:** Platform Lead (Phase B Hardening)
**Circuit Breaker Engineer:** Specialist implementation
