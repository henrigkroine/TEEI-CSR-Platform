# NLQ Event Integration

NATS-based event system for cache invalidation, query notifications, and cross-service communication.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     NLQ Service Events                       │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Publishers (Outbound)          Subscribers (Inbound)        │
│  ─────────────────────          ──────────────────────       │
│                                                               │
│  • nlq.query.started            • metrics.updated            │
│  • nlq.query.completed            (from analytics)           │
│  • nlq.query.failed             • outcomes.classified        │
│  • nlq.query.rejected             (from Q2Q AI)              │
│  • nlq.cache.invalidated        • reports.generated          │
│                                    (from reporting)          │
│                                                               │
│                   Cache Invalidation Flow                    │
│                   ─────────────────────────                  │
│                                                               │
│   Event → Handler → Invalidate Cache → Warm Queries          │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Event Types

### Published Events (Outbound)

#### 1. `nlq.query.started`
Fired when a query execution begins.

```typescript
{
  queryId: string;
  companyId: string;
  userId?: string;
  normalizedQuestion: string;
  templateId?: string;
  startedAt: string;
}
```

**Use cases:**
- Track query initiation for analytics
- Monitor concurrent query load
- Detect slow queries (if completed event doesn't arrive)

#### 2. `nlq.query.completed`
Fired when a query finishes successfully.

```typescript
{
  queryId: string;
  companyId: string;
  userId?: string;
  templateId: string;
  executionTimeMs: number;
  cached: boolean;
  resultRowCount: number;
  confidence: number;
  safetyPassed: boolean;
  completedAt: string;
}
```

**Use cases:**
- Track query performance metrics
- Monitor cache hit rates
- Analyze query patterns for optimization
- Alert on slow queries (executionTimeMs > threshold)

#### 3. `nlq.query.failed`
Fired when a query fails with an error.

```typescript
{
  queryId: string;
  companyId: string;
  userId?: string;
  normalizedQuestion: string;
  templateId?: string;
  errorMessage: string;
  errorType: 'validation' | 'execution' | 'timeout' | 'unknown';
  executionTimeMs: number;
  failedAt: string;
}
```

**Use cases:**
- Track error rates by type
- Alert on spikes in failures
- Debug problematic queries
- Improve error messages based on patterns

#### 4. `nlq.query.rejected`
Fired when a query is rejected by safety guardrails.

```typescript
{
  queryId: string;
  companyId: string;
  userId?: string;
  normalizedQuestion: string;
  rejectionReason: 'unsafe_content' | 'pii_detected' | 'rate_limit' | 'invalid_intent' | 'blacklisted_pattern';
  safetyScore?: number;
  rejectedAt: string;
}
```

**Use cases:**
- Track safety guardrail effectiveness
- Alert on potential abuse patterns
- Improve safety detection accuracy
- Audit PII detection

#### 5. `nlq.cache.invalidated`
Fired when cache entries are invalidated.

```typescript
{
  companyId?: string;
  templateId?: string;
  pattern?: string;
  keysInvalidated: number;
  reason: 'manual' | 'data_update' | 'metrics_updated' | 'scheduled';
  invalidatedAt: string;
}
```

**Use cases:**
- Track cache invalidation frequency
- Monitor cache effectiveness
- Debug cache-related issues
- Audit manual cache operations

### Subscribed Events (Inbound)

#### 1. `metrics.updated` (from analytics service)
Triggers cache invalidation when metrics are recalculated.

```typescript
{
  companyId: string;
  metricType: 'sroi' | 'vis' | 'outcomes' | 'engagement' | 'volunteer' | 'integration' | 'job_readiness';
  period: string;
  updatedAt: string;
}
```

**Behavior:**
1. Invalidates all cache for the company
2. Re-warms queries using affected templates
3. Publishes `nlq.cache.invalidated` event

**Template mapping:**
- `sroi` → `sroi_ratio`, `sroi_quarterly_comparison`, `cohort_sroi_benchmark`
- `vis` → `vis_score`
- `outcomes` → `outcome_scores_by_dimension`, `outcome_trends_monthly`
- `engagement` → `participant_engagement`
- `volunteer` → `volunteer_activity`
- `integration` → `integration_scores`
- `job_readiness` → `job_readiness_scores`

#### 2. `outcomes.classified` (from Q2Q AI service)
Triggers cache invalidation when feedback is classified.

```typescript
{
  companyId: string;
  feedbackId: string;
  outcomeScores: Record<string, number>;
  classifiedAt: string;
}
```

**Behavior:**
1. Invalidates all cache for the company
2. Re-warms outcome-related queries
3. Publishes `nlq.cache.invalidated` event

#### 3. `reports.generated` (from reporting service)
Warms common queries when reports are generated (users often verify data).

```typescript
{
  companyId: string;
  reportId: string;
  reportType: 'quarterly' | 'annual' | 'investor' | 'impact';
  generatedAt: string;
}
```

**Behavior:**
1. Warms queries relevant to the report type
2. Does NOT invalidate cache (reports don't change data)

## Usage

### Publishing Events

```typescript
import { publishQueryCompleted } from './events/index.js';

// After successful query execution
await publishQueryCompleted({
  queryId: 'uuid',
  companyId: 'uuid',
  templateId: 'sroi_ratio',
  executionTimeMs: 1250,
  cached: false,
  resultRowCount: 42,
  confidence: 0.95,
  safetyPassed: true,
});
```

### Subscribing to Events

```typescript
import { subscribeToQueryCompleted } from './events/index.js';

// Subscribe to query completed events
await subscribeToQueryCompleted(async (event) => {
  console.log(`Query ${event.data.queryId} completed in ${event.data.executionTimeMs}ms`);

  // Send to monitoring service
  await trackMetric('nlq.query.duration', event.data.executionTimeMs);
});
```

### Initializing Subscribers

In your service startup code:

```typescript
import { initializeSubscribers } from './events/index.js';

// Initialize all cross-service event subscriptions
await initializeSubscribers();

// Service is now listening to:
// - metrics.updated
// - outcomes.classified
// - reports.generated
```

### Manual Cache Invalidation

```typescript
import { manuallyInvalidateCompany, invalidateTemplateGlobally } from './events/index.js';

// Invalidate all cache for a company (e.g., after data correction)
const keysInvalidated = await manuallyInvalidateCompany('company-uuid');
console.log(`Invalidated ${keysInvalidated} cache entries`);

// Invalidate a template globally (e.g., after template logic change)
await invalidateTemplateGlobally('sroi_ratio');
```

### Scheduled Cache Refresh

Set up a cron job to run daily:

```typescript
import { scheduledCacheRefresh } from './events/index.js';

// Run daily at 2 AM
cron.schedule('0 2 * * *', async () => {
  await scheduledCacheRefresh();
});
```

## Cache Invalidation Strategy

### Smart Invalidation

Instead of invalidating all cache on every data update, we use targeted invalidation:

1. **Company-scoped**: Only invalidate cache for the affected company
2. **Template-mapped**: Only warm queries using affected metric templates
3. **Background warming**: Re-warm cache asynchronously to avoid blocking

### Example Flow

```
1. Analytics service calculates new SROI for Company A
   ↓
2. Publishes: metrics.updated { companyId: 'A', metricType: 'sroi' }
   ↓
3. NLQ service receives event
   ↓
4. Invalidates all cache for Company A (42 keys)
   ↓
5. Publishes: nlq.cache.invalidated { companyId: 'A', keysInvalidated: 42 }
   ↓
6. Re-warms queries using SROI templates:
   - 'What is our SROI for last quarter?'
   - 'Show SROI trend for the past year'
   - 'Compare our SROI to peers'
   ↓
7. Cache is now fresh and ready for user queries
```

## Monitoring

### Health Check

```typescript
import { checkSubscribersHealth } from './events/index.js';

const health = await checkSubscribersHealth();
console.log(health);
// {
//   healthy: true,
//   connected: true,
//   subscriptions: 3
// }
```

### Event Statistics

```typescript
import { getEventStats } from './events/index.js';

const stats = getEventStats();
console.log(stats);
// {
//   metricsUpdated: 125,
//   outcomesClassified: 89,
//   reportsGenerated: 12,
//   totalProcessed: 226,
//   totalErrors: 3,
//   lastEventAt: '2024-01-15T10:30:00Z'
// }
```

## Error Handling

Event publishing failures are logged but do not throw errors to prevent query execution from failing:

```typescript
try {
  await eventBus.publish(event);
  logger.info('Event published');
} catch (error) {
  logger.error({ error }, 'Failed to publish event');
  // Don't throw - continue query execution
}
```

Event subscription handlers catch errors to prevent event NACKing:

```typescript
await eventBus.subscribe('nlq.query.completed', async (event) => {
  try {
    await handler(event);
  } catch (error) {
    logger.error({ error, eventId: event.id }, 'Error handling event');
    // Error is logged but not thrown
  }
});
```

## Testing

Run tests with:

```bash
pnpm test src/events/__tests__
```

Test files:
- `nlq-events.test.ts` - Event publishing and subscription
- `cache-invalidation.test.ts` - Cache invalidation handlers
- `subscribers.test.ts` - Cross-service event integration

## Configuration

Environment variables:

```bash
# NATS connection
NATS_URL=nats://localhost:4222

# Redis for cache
REDIS_URL=redis://localhost:6379
```

## Best Practices

1. **Always publish events**: Even if no one is listening, events provide audit trail
2. **Use queue groups**: Prevents duplicate processing with multiple instances
3. **Handle failures gracefully**: Event publishing should never break query execution
4. **Monitor event stats**: Track processing rates and error counts
5. **Test with mocks**: Use NATS mock for unit tests, real NATS for integration tests
6. **Document event contracts**: Keep event schemas in sync with documentation

## Troubleshooting

### Events not being received

1. Check NATS connection:
   ```typescript
   const health = await checkSubscribersHealth();
   console.log(health.connected); // Should be true
   ```

2. Verify subscribers are initialized:
   ```bash
   # In service logs, look for:
   # "Subscribed to metrics.updated events"
   # "Subscribed to outcomes.classified events"
   # "Subscribed to reports.generated events"
   ```

3. Check queue groups match:
   ```typescript
   // Publisher uses subject: 'metrics.updated'
   // Subscriber uses queue: 'insights-nlq-metrics'
   // These must match the NATS stream configuration
   ```

### Cache not being invalidated

1. Check event stats:
   ```typescript
   const stats = getEventStats();
   console.log(stats.metricsUpdated); // Should be > 0 if events are being processed
   ```

2. Verify cache invalidation logic:
   ```typescript
   // Add debug logging to cache invalidation handler
   logger.debug({ companyId, keysInvalidated }, 'Cache invalidated');
   ```

3. Test manually:
   ```typescript
   await manuallyInvalidateCompany('company-uuid');
   ```

## Future Enhancements

- [ ] Dead letter queue for failed event processing
- [ ] Event replay capability for debugging
- [ ] Distributed tracing with correlation IDs
- [ ] Event schema validation with Zod
- [ ] Metrics export to Prometheus
- [ ] Event retention policies
- [ ] Circuit breaker for cache warming
