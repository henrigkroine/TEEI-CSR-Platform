# Events Package - DLQ & Retry Logic

> **Purpose:** Production-grade event processing with dead letter queues and exponential backoff retries.

## Overview

This package provides robust event processing capabilities for NATS JetStream with:
- **Dead Letter Queue (DLQ)** - Capture poison messages that fail repeatedly
- **Exponential Backoff** - Intelligent retry delays that increase over time
- **Error Classification** - Distinguish transient vs permanent errors
- **Monitoring Hooks** - Integration points for alerting systems

## Installation

```bash
pnpm add @teei/events
```

## Quick Start

### Initialize DLQ Manager

```typescript
import { connect } from 'nats';
import { DLQManager, RetryStrategies } from '@teei/events';

// Connect to NATS
const nc = await connect({ servers: 'nats://localhost:4222' });
const js = nc.jetstream();

// Create DLQ manager with exponential backoff
const dlq = new DLQManager(nc, js, RetryStrategies.exponential({
  maxRetries: 3,
  verbose: true,
}));

// Initialize DLQ stream
await dlq.initialize();
```

### Process Events with Retry

```typescript
import { EventProcessingResult } from '@teei/events';

async function handleEvent(data: any): Promise<EventProcessingResult> {
  try {
    // Process event
    await processUserEvent(data);

    return { success: true };
  } catch (error) {
    // Return error for retry logic
    return {
      success: false,
      error: error as Error,
      shouldRetry: true, // Let DLQ decide based on error type
    };
  }
}

// Process with automatic retry
await dlq.processWithRetry(
  'user.created',
  eventData,
  handleEvent
);
```

## Retry Strategies

### Exponential Backoff (Default)

Delays double with each retry:
- Retry 1: 1 second
- Retry 2: 2 seconds
- Retry 3: 4 seconds

```typescript
const dlq = new DLQManager(nc, js, RetryStrategies.exponential());
```

### Linear Backoff

Constant delay between retries:

```typescript
const dlq = new DLQManager(nc, js, RetryStrategies.linear({
  initialDelayMs: 2000, // 2 seconds between each retry
}));
```

### Aggressive Retry

More retries with shorter delays:

```typescript
const dlq = new DLQManager(nc, js, RetryStrategies.aggressive());
// 5 retries: 500ms, 750ms, 1.125s, 1.687s, 2.5s
```

### Conservative Retry

Fewer retries with longer delays:

```typescript
const dlq = new DLQManager(nc, js, RetryStrategies.conservative());
// 2 retries: 5s, 15s
```

### Custom Strategy

```typescript
const dlq = new DLQManager(nc, js, {
  maxRetries: 4,
  initialDelayMs: 1500,
  maxDelayMs: 30000,
  backoffMultiplier: 2.5,
  deadLetterStream: 'MY_DLQ',
  verbose: true,
});
```

## Error Classification

The DLQ automatically classifies errors to determine retry behavior:

### Transient Errors (Will Retry)
- Network timeouts
- Connection refused
- Service unavailable (503)
- Rate limits (429)

### Permanent Errors (Won't Retry)
- Validation errors
- Not found (404)
- Bad request (400)
- Unauthorized (401)

```typescript
import { classifyError, ErrorType } from '@teei/events';

try {
  await processEvent();
} catch (error) {
  const errorType = classifyError(error as Error);

  if (errorType === ErrorType.PERMANENT) {
    // Don't retry, log and skip
    logger.error('Permanent error, skipping retry');
  }
}
```

## DLQ Management

### View DLQ Messages

```typescript
// Get failed messages for manual review
const dlqMessages = await dlq.getDLQMessages(100);

console.log(`Found ${dlqMessages.length} failed messages`);
dlqMessages.forEach(msg => {
  console.log({
    subject: msg.subject,
    attempts: msg.data.metadata.attemptCount,
    error: msg.data.metadata.errorMessage,
  });
});
```

### Reprocess DLQ Messages

```typescript
// Manually reprocess a failed message
for (const msg of dlqMessages) {
  const result = await dlq.reprocessDLQMessage(msg, handleEvent);

  if (result.success) {
    console.log(`Successfully reprocessed ${msg.subject}`);
  }
}
```

### Get DLQ Statistics

```typescript
const stats = await dlq.getDLQStats();

console.log({
  messages: stats.messageCount,
  stream: stats.streamName,
  consumers: stats.consumers,
});
```

### Purge DLQ

```typescript
// Clear all messages from DLQ
await dlq.purgeDLQ();
```

## Integration with Event Bus

### Update Event Subscriber

```typescript
// packages/shared-utils/src/event-bus.ts
import { DLQManager, RetryStrategies } from '@teei/events';

export class EventBus {
  private dlq?: DLQManager;

  async connect() {
    this.nc = await connect({ servers: NATS_URL });
    this.js = this.nc.jetstream();

    // Initialize DLQ
    this.dlq = new DLQManager(this.nc, this.js, RetryStrategies.exponential());
    await this.dlq.initialize();
  }

  async subscribe(subject: string, handler: EventHandler) {
    const subscription = this.js.subscribe(subject);

    for await (const msg of subscription) {
      const data = JSON.parse(msg.data.toString());

      // Process with DLQ retry logic
      if (this.dlq) {
        await this.dlq.processWithRetry(subject, data, async (eventData) => {
          try {
            await handler(eventData);
            msg.ack();
            return { success: true };
          } catch (error) {
            msg.nak();
            return {
              success: false,
              error: error as Error,
            };
          }
        });
      }
    }
  }
}
```

## Monitoring & Alerts

### Hook into Monitoring Systems

```typescript
class CustomDLQManager extends DLQManager {
  private emitDLQAlert(subject: string, metadata: DLQMessageMetadata): void {
    super.emitDLQAlert(subject, metadata);

    // Send to Sentry
    Sentry.captureException(new Error(metadata.errorMessage), {
      tags: {
        subject,
        attemptCount: metadata.attemptCount,
      },
    });

    // Increment Prometheus metric
    dlqCounter.inc({ subject });

    // Send to PagerDuty if critical
    if (subject.includes('payment') || subject.includes('critical')) {
      await pagerduty.trigger({
        summary: `DLQ: ${subject}`,
        severity: 'error',
      });
    }
  }
}
```

### Metrics to Track

- **DLQ message count** - Number of messages in DLQ
- **Retry attempts** - Distribution of retry counts
- **Error types** - Breakdown by error classification
- **Reprocessing success rate** - Manual reprocessing outcomes

## Best Practices

### 1. Set Appropriate Retry Limits

- **Transient errors:** 3-5 retries with exponential backoff
- **Critical events:** Conservative retries with alerts
- **Non-critical events:** Aggressive retries

### 2. Monitor DLQ Size

Alert when DLQ message count exceeds threshold:

```typescript
const stats = await dlq.getDLQStats();
if (stats.messageCount > 100) {
  // Alert operations team
  sendAlert('DLQ threshold exceeded');
}
```

### 3. Regular DLQ Review

Schedule periodic review of DLQ messages:

```typescript
// Daily cron job
cron.schedule('0 9 * * *', async () => {
  const messages = await dlq.getDLQMessages();
  await sendDLQReport(messages);
});
```

### 4. Classify Errors Properly

Return appropriate error types:

```typescript
catch (error) {
  const errorType = classifyError(error);

  return {
    success: false,
    error,
    shouldRetry: errorType === ErrorType.TRANSIENT,
  };
}
```

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { calculateRetryDelay, RetryStrategies } from '@teei/events';

describe('DLQ Retry Logic', () => {
  it('should calculate exponential backoff', () => {
    const config = RetryStrategies.exponential();

    expect(calculateRetryDelay(1, config)).toBe(1000);
    expect(calculateRetryDelay(2, config)).toBe(2000);
    expect(calculateRetryDelay(3, config)).toBe(4000);
  });
});
```

## Troubleshooting

### DLQ Messages Keep Growing

1. Check error messages in DLQ
2. Identify common error patterns
3. Fix root cause or update error handling
4. Reprocess messages

### Retries Not Working

1. Verify NATS connection
2. Check DLQ stream exists: `await dlq.initialize()`
3. Review retry configuration
4. Enable verbose logging

### Memory Issues

1. Limit DLQ message retention (default: 7 days)
2. Purge old messages regularly
3. Use file storage (not memory) for DLQ stream

## Resources

- [NATS JetStream Docs](https://docs.nats.io/nats-concepts/jetstream)
- [Retry Patterns](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
- [DLQ Best Practices](https://www.cloudamqp.com/blog/what-is-a-dead-letter-queue.html)

---

**Maintained by:** Platform Lead (Phase B Hardening)
**DLQ Architect:** Specialist implementation
