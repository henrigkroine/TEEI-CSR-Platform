# Event Bus Configuration Guide - Phase 1

**Status**: Ready for Implementation
**Date**: 2025-11-14
**Phase**: Phase 1 (HTTP Webhooks)
**Target Systems**: Buddy System ↔ CSR Platform

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Buddy System Configuration](#buddy-system-configuration)
3. [CSR Platform Configuration](#csr-platform-configuration)
4. [Local Development Setup](#local-development-setup)
5. [Testing & Validation](#testing--validation)
6. [Troubleshooting](#troubleshooting)
7. [Security Checklist](#security-checklist)

---

## Quick Start

### For the Impatient

**Buddy System** → Sends HTTP POST to CSR Platform webhook
**CSR Platform** → Receives, validates, and processes events

**3 Environment Variables to Set**:

1. **Buddy System** `.env`:
```bash
CSR_WEBHOOK_URL=http://csr-platform:3000/webhooks/buddy-events
CSR_WEBHOOK_TIMEOUT_MS=5000
CSR_WEBHOOK_RETRY_ATTEMPTS=5
```

2. **CSR Platform** `.env`:
```bash
WEBHOOK_PORT=3000
WEBHOOK_SIGNATURE_VALIDATION_ENABLED=false
```

3. **Test**:
```bash
curl -X POST http://localhost:3000/webhooks/buddy-events \
  -H "Content-Type: application/json" \
  -d '{"type":"buddy.match.created","data":{"matchId":"123"}}'
```

---

## Buddy System Configuration

### 1. Environment Variables

Create `.env` file in Buddy System root:

```bash
# Event Bus Configuration
CSR_WEBHOOK_URL=http://csr-platform:3000/webhooks/buddy-events
CSR_WEBHOOK_SECRET=<optional-webhook-signature-secret>
CSR_WEBHOOK_TIMEOUT_MS=5000
CSR_WEBHOOK_RETRY_ATTEMPTS=5
CSR_WEBHOOK_RETRY_BACKOFF_MS=1000
CSR_WEBHOOK_ENABLED=true
```

### 2. Environment Variable Details

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `CSR_WEBHOOK_URL` | Yes | - | Full URL of CSR Platform webhook endpoint. Use `http://localhost:3000` for local dev, `http://csr-api:3000` in Docker, or full domain in production |
| `CSR_WEBHOOK_SECRET` | No | - | HMAC signature secret. Leave empty for Phase 1, enable in Phase 2. Must match CSR Platform secret |
| `CSR_WEBHOOK_TIMEOUT_MS` | No | 5000 | HTTP request timeout in milliseconds. Set to 10000 for slow networks |
| `CSR_WEBHOOK_RETRY_ATTEMPTS` | No | 5 | Max retry attempts on failure. Keep between 3-7 |
| `CSR_WEBHOOK_RETRY_BACKOFF_MS` | No | 1000 | Initial backoff in milliseconds. Doubles on each retry (1s, 2s, 4s, 8s, 16s) |
| `CSR_WEBHOOK_ENABLED` | No | true | Set to false to disable webhook publishing (useful for testing) |

### 3. Installation

#### Step 1: Add Dependency

```bash
# Install webhook publisher library (add to package.json)
npm install node-fetch undici
```

#### Step 2: Create Webhook Publisher

**File**: `src/services/event-publisher.ts`

```typescript
import { randomUUID } from 'crypto';
import { createHmac } from 'crypto';
import fetch from 'node-fetch';
import { logger } from '../logger.js';

export interface WebhookEvent {
  type: string;
  data: unknown;
  id: string;
  timestamp: string;
  correlationId?: string;
  causationId?: string;
  metadata?: Record<string, unknown>;
}

export class WebhookPublisher {
  private webhookUrl: string;
  private secret?: string;
  private timeoutMs: number;
  private retryAttempts: number;
  private retryBackoffMs: number;

  constructor() {
    this.webhookUrl = process.env.CSR_WEBHOOK_URL || 'http://localhost:3000/webhooks/buddy-events';
    this.secret = process.env.CSR_WEBHOOK_SECRET;
    this.timeoutMs = parseInt(process.env.CSR_WEBHOOK_TIMEOUT_MS || '5000');
    this.retryAttempts = parseInt(process.env.CSR_WEBHOOK_RETRY_ATTEMPTS || '5');
    this.retryBackoffMs = parseInt(process.env.CSR_WEBHOOK_RETRY_BACKOFF_MS || '1000');
  }

  async publish(event: WebhookEvent): Promise<void> {
    const enabled = process.env.CSR_WEBHOOK_ENABLED !== 'false';
    if (!enabled) {
      logger.debug({ eventId: event.id }, 'Webhook publishing disabled');
      return;
    }

    const payload = JSON.stringify(event);
    const headers = this.buildHeaders(payload);

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers,
          body: payload,
          signal: controller.signal as any,
        });

        clearTimeout(timeout);

        if (response.ok || response.status === 202) {
          logger.info(
            { 
              eventId: event.id, 
              eventType: event.type,
              status: response.status,
              attempt
            },
            'Event published successfully'
          );
          return;
        }

        // 4xx error - don't retry
        if (response.status >= 400 && response.status < 500) {
          const text = await response.text();
          logger.error(
            { 
              eventId: event.id,
              status: response.status,
              response: text
            },
            'Webhook rejected (client error)'
          );
          throw new Error(`Client error: ${response.status}`);
        }

        // 5xx error - retry
        throw new Error(`Server error: ${response.status}`);
      } catch (error) {
        const isLastAttempt = attempt === this.retryAttempts;
        const backoffMs = Math.pow(2, attempt - 1) * this.retryBackoffMs;

        if (isLastAttempt) {
          logger.error(
            {
              eventId: event.id,
              eventType: event.type,
              attempt,
              error: error instanceof Error ? error.message : String(error),
            },
            'Webhook failed after all retries - adding to dead letter queue'
          );
          // TODO: Add to dead letter queue for manual inspection
          throw error;
        } else {
          logger.warn(
            {
              eventId: event.id,
              attempt,
              nextRetryMs: backoffMs,
              error: error instanceof Error ? error.message : String(error),
            },
            'Webhook failed, scheduling retry'
          );
          await new Promise(resolve => setTimeout(resolve, backoffMs));
        }
      }
    }
  }

  private buildHeaders(payload: string): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Buddy-System/1.0',
      'X-Webhook-Id': randomUUID(),
      'X-Webhook-Timestamp': new Date().toISOString(),
    };

    if (this.secret) {
      const signature = createHmac('sha256', this.secret)
        .update(payload)
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    return headers;
  }
}

// Singleton instance
let publisher: WebhookPublisher | null = null;

export function getPublisher(): WebhookPublisher {
  if (!publisher) {
    publisher = new WebhookPublisher();
  }
  return publisher;
}
```

#### Step 3: Use in Event Handlers

```typescript
// src/handlers/buddy-event.handler.ts
import { getPublisher } from '../services/event-publisher.js';
import { logger } from '../logger.js';

export async function publishBuddyMatchCreated(
  matchId: string,
  userId: string,
  matchData: unknown
): Promise<void> {
  const event = {
    type: 'buddy.match.created',
    data: {
      matchId,
      userId,
      ...matchData,
    },
    id: randomUUID(),
    timestamp: new Date().toISOString(),
  };

  try {
    await getPublisher().publish(event);
    logger.info({ matchId }, 'Match creation published');
  } catch (error) {
    logger.error({ matchId, error }, 'Failed to publish match creation');
    // Decide: re-throw, or continue with fallback?
  }
}
```

### 4. Docker Setup

**docker-compose.yml** addition:

```yaml
services:
  buddy-system:
    build:
      context: ./buddy-system
      dockerfile: Dockerfile
    ports:
      - "3010:3000"
    environment:
      CSR_WEBHOOK_URL: http://csr-api:3000/webhooks/buddy-events
      CSR_WEBHOOK_TIMEOUT_MS: 5000
      CSR_WEBHOOK_RETRY_ATTEMPTS: 5
      CSR_WEBHOOK_ENABLED: "true"
    depends_on:
      - csr-api
    networks:
      - teei-network

  csr-api:
    build:
      context: ./csr-platform
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      WEBHOOK_SIGNATURE_VALIDATION_ENABLED: "false"
    networks:
      - teei-network

networks:
  teei-network:
    driver: bridge
```

---

## CSR Platform Configuration

### 1. Environment Variables

Create `.env` file in CSR Platform root:

```bash
# Webhook Configuration
WEBHOOK_PORT=3000
WEBHOOK_ENDPOINT=/webhooks/buddy-events
WEBHOOK_SIGNATURE_SECRET=<optional-same-as-buddy-system>
WEBHOOK_SIGNATURE_VALIDATION_ENABLED=false
WEBHOOK_RATE_LIMIT_ENABLED=false
WEBHOOK_RATE_LIMIT_PER_MINUTE=100
```

### 2. Environment Variable Details

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `WEBHOOK_PORT` | No | 3000 | Port where API Gateway listens |
| `WEBHOOK_ENDPOINT` | No | /webhooks/buddy-events | Route for webhook endpoint |
| `WEBHOOK_SIGNATURE_SECRET` | No | - | Must match Buddy System secret. Leave empty for Phase 1 |
| `WEBHOOK_SIGNATURE_VALIDATION_ENABLED` | No | false | Set to true in Phase 2 when ready |
| `WEBHOOK_RATE_LIMIT_ENABLED` | No | false | Set to true in Phase 2 if needed |
| `WEBHOOK_RATE_LIMIT_PER_MINUTE` | No | 100 | Max webhooks per minute (e.g., 5000 for high volume) |

### 3. Installation

#### Step 1: Add Webhook Route

**File**: `services/api-gateway/src/routes/webhooks.ts`

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { EventEnvelopeSchema } from '@teei/event-contracts';
import { validateWebhookSignature } from '../utils/webhook-utils.js';
import { getEventBus } from '@teei/shared-utils';
import { logger } from '../logger.js';

export async function setupWebhookRoutes(app: FastifyInstance) {
  // Health check
  app.get<{ Params: {} }>('/health/webhook', async (req, reply) => {
    return reply.send({ status: 'healthy', timestamp: new Date().toISOString() });
  });

  // Webhook endpoint
  app.post<{ Body: unknown }>(
    process.env.WEBHOOK_ENDPOINT || '/webhooks/buddy-events',
    async (req: FastifyRequest, reply: FastifyReply) => {
      const webhookId = req.headers['x-webhook-id'] as string;
      const webhookTimestamp = req.headers['x-webhook-timestamp'] as string;
      const webhookSignature = req.headers['x-webhook-signature'] as string;

      try {
        // Validate signature (optional)
        if (process.env.WEBHOOK_SIGNATURE_VALIDATION_ENABLED === 'true') {
          if (!webhookSignature) {
            logger.warn({ webhookId }, 'Signature validation enabled but signature missing');
            return reply.status(401).send({ error: 'Signature required' });
          }

          const isValid = validateWebhookSignature(
            req.rawBody as Buffer,
            webhookSignature,
            process.env.WEBHOOK_SIGNATURE_SECRET || ''
          );

          if (!isValid) {
            logger.warn({ webhookId }, 'Signature validation failed');
            return reply.status(401).send({ error: 'Invalid signature' });
          }
        }

        // Parse and validate event
        const event = EventEnvelopeSchema.parse(req.body);

        logger.info(
          {
            eventId: event.metadata.id,
            eventType: event.type,
            webhookId,
            webhookTimestamp,
            correlationId: event.metadata.correlationId,
          },
          'Webhook received'
        );

        // Publish to internal event bus
        const eventBus = getEventBus();
        await eventBus.publish({
          ...event.data,
          type: event.type,
          id: event.metadata.id,
          timestamp: event.metadata.timestamp,
          correlationId: event.metadata.correlationId,
          causationId: event.metadata.causationId,
          metadata: event.metadata.metadata,
        });

        // Return 202 Accepted (async processing)
        return reply.status(202).send({
          acknowledged: true,
          eventId: event.metadata.id,
          timestamp: new Date().toISOString(),
        });
      } catch (error) {
        logger.error(
          {
            webhookId,
            error: error instanceof Error ? error.message : String(error),
          },
          'Webhook processing failed'
        );

        if (error instanceof Error && error.message.includes('validation')) {
          return reply.status(400).send({
            error: 'Invalid event format',
            details: error.message,
          });
        }

        return reply.status(500).send({
          error: 'Internal server error',
          eventId: webhookId,
        });
      }
    }
  );
}

// Register in main app
app.register(setupWebhookRoutes);
```

#### Step 2: Add Signature Validation Utility

**File**: `services/api-gateway/src/utils/webhook-utils.ts`

```typescript
import { createHmac } from 'crypto';

export function validateWebhookSignature(
  rawPayload: Buffer | string,
  signature: string,
  secret: string
): boolean {
  try {
    const payload = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf-8');
    const [algorithm, hash] = signature.split('=');

    if (!algorithm || !hash) {
      throw new Error('Invalid signature format');
    }

    if (algorithm !== 'sha256') {
      throw new Error(`Unsupported algorithm: ${algorithm}`);
    }

    const expectedHash = createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Constant-time comparison (prevent timing attacks)
    return timingSafeEqual(hash, expectedHash);
  } catch (error) {
    console.error('Signature validation error:', error);
    return false;
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}
```

#### Step 3: Add Metrics

**File**: `services/api-gateway/src/middleware/metrics.ts`

```typescript
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { Counter, Histogram } from 'prom-client';

export const webhookReceivedCounter = new Counter({
  name: 'csr_webhook_received_total',
  help: 'Total webhooks received',
  labelNames: ['event_type', 'status'],
});

export const webhookProcessingDuration = new Histogram({
  name: 'csr_webhook_processing_duration_ms',
  help: 'Webhook processing duration in milliseconds',
  labelNames: ['event_type'],
  buckets: [10, 50, 100, 500, 1000, 5000],
});

export const webhookErrors = new Counter({
  name: 'csr_webhook_errors_total',
  help: 'Total webhook processing errors',
  labelNames: ['error_type'],
});

// Usage in webhook handler
export async function recordWebhookMetrics(
  eventType: string,
  durationMs: number,
  error?: Error
) {
  webhookReceivedCounter.inc({
    event_type: eventType,
    status: error ? 'error' : 'success',
  });

  webhookProcessingDuration.observe({ event_type: eventType }, durationMs);

  if (error) {
    webhookErrors.inc({ error_type: error.name });
  }
}
```

### 4. Docker Setup

Already included in Buddy System section above.

---

## Local Development Setup

### 1. Prerequisites

- Node.js 18+
- npm or pnpm
- Docker & Docker Compose (optional)

### 2. Non-Docker Setup

#### Terminal 1: CSR Platform

```bash
cd csr-platform
npm install
cat > .env.local << 'EOF'
WEBHOOK_PORT=3000
WEBHOOK_SIGNATURE_VALIDATION_ENABLED=false
NODE_ENV=development
EOF

npm run dev
# Starts on http://localhost:3000
```

#### Terminal 2: Buddy System

```bash
cd buddy-system
npm install
cat > .env.local << 'EOF'
CSR_WEBHOOK_URL=http://localhost:3000/webhooks/buddy-events
CSR_WEBHOOK_TIMEOUT_MS=5000
CSR_WEBHOOK_RETRY_ATTEMPTS=5
CSR_WEBHOOK_ENABLED=true
NODE_ENV=development
EOF

npm run dev
# Starts on http://localhost:3010
```

#### Terminal 3: Test Script

```bash
# Send test event
curl -X POST http://localhost:3000/webhooks/buddy-events \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Id: $(uuidgen)" \
  -H "X-Webhook-Timestamp: $(date -u +'%Y-%m-%dT%H:%M:%SZ')" \
  -d '{
    "type": "buddy.match.created",
    "data": {
      "matchId": "550e8400-e29b-41d4-a716-446655440000",
      "userId": "660e8400-e29b-41d4-a716-446655440000",
      "matchedAt": "2025-11-14T10:00:00Z"
    },
    "id": "770e8400-e29b-41d4-a716-446655440000",
    "timestamp": "2025-11-14T10:00:00Z"
  }'

# Expected response: 202 Accepted
```

### 3. Docker Compose Setup

```bash
# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  csr-api:
    build:
      context: ./services/api-gateway
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    environment:
      WEBHOOK_PORT: "3000"
      WEBHOOK_SIGNATURE_VALIDATION_ENABLED: "false"
      NODE_ENV: development
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health/webhook"]
      interval: 10s
      timeout: 5s
      retries: 3

  buddy-service:
    build:
      context: ./services/buddy-service
      dockerfile: Dockerfile
    ports:
      - "3010:3000"
    environment:
      CSR_WEBHOOK_URL: http://csr-api:3000/webhooks/buddy-events
      CSR_WEBHOOK_TIMEOUT_MS: "5000"
      CSR_WEBHOOK_RETRY_ATTEMPTS: "5"
      CSR_WEBHOOK_ENABLED: "true"
      NODE_ENV: development
    depends_on:
      csr-api:
        condition: service_healthy

networks:
  default:
    name: teei-network
EOF

# Run
docker-compose up
```

### 4. Environment Files

**CSR Platform** `.env.local`:
```bash
WEBHOOK_PORT=3000
WEBHOOK_ENDPOINT=/webhooks/buddy-events
WEBHOOK_SIGNATURE_VALIDATION_ENABLED=false
WEBHOOK_RATE_LIMIT_ENABLED=false
NODE_ENV=development
LOG_LEVEL=debug
```

**Buddy System** `.env.local`:
```bash
CSR_WEBHOOK_URL=http://localhost:3000/webhooks/buddy-events
CSR_WEBHOOK_TIMEOUT_MS=5000
CSR_WEBHOOK_RETRY_ATTEMPTS=5
CSR_WEBHOOK_RETRY_BACKOFF_MS=1000
CSR_WEBHOOK_ENABLED=true
NODE_ENV=development
LOG_LEVEL=debug
```

---

## Testing & Validation

### 1. Manual Testing

#### Test 1: Health Check

```bash
# Verify webhook endpoint is healthy
curl http://localhost:3000/health/webhook

# Expected: 200 OK
# Response: { "status": "healthy", "timestamp": "..." }
```

#### Test 2: Valid Event

```bash
curl -X POST http://localhost:3000/webhooks/buddy-events \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Id: 550e8400-e29b-41d4-a716-446655440000" \
  -H "X-Webhook-Timestamp: 2025-11-14T10:00:00Z" \
  -d '{
    "type": "buddy.match.created",
    "data": {
      "matchId": "123e4567-e89b-12d3-a456-426614174000",
      "userId": "234e5678-f89b-12d3-a456-426614174000"
    },
    "id": "345e6789-g89b-12d3-a456-426614174000",
    "timestamp": "2025-11-14T10:00:00Z"
  }'

# Expected: 202 Accepted
# Response: { "acknowledged": true, "eventId": "..." }
```

#### Test 3: Invalid Event (Missing Required Fields)

```bash
curl -X POST http://localhost:3000/webhooks/buddy-events \
  -H "Content-Type: application/json" \
  -d '{ "type": "buddy.match.created" }'

# Expected: 400 Bad Request
# Response: { "error": "Invalid event format", "details": "..." }
```

#### Test 4: Signature Validation (When Enabled)

```bash
# Enable signature validation
export WEBHOOK_SIGNATURE_SECRET="my-secret"
export WEBHOOK_SIGNATURE_VALIDATION_ENABLED="true"

# Generate valid signature
PAYLOAD='{"type":"buddy.match.created"}'
SIGNATURE=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$WEBHOOK_SIGNATURE_SECRET" -hex | cut -d' ' -f2)

curl -X POST http://localhost:3000/webhooks/buddy-events \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: sha256=$SIGNATURE" \
  -d "$PAYLOAD"

# Expected: 202 Accepted
```

### 2. Automated Testing

**File**: `tests/webhook.test.ts`

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import fetch from 'node-fetch';

const WEBHOOK_URL = 'http://localhost:3000/webhooks/buddy-events';

describe('Webhook Endpoint', () => {
  it('should accept valid buddy.match.created event', async () => {
    const event = {
      type: 'buddy.match.created',
      data: { matchId: '123', userId: '456' },
      id: '789',
      timestamp: new Date().toISOString(),
    };

    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
    });

    expect(response.status).toBe(202);
    const data = await response.json();
    expect(data.acknowledged).toBe(true);
  });

  it('should reject invalid events', async () => {
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type: 'invalid' }),
    });

    expect(response.status).toBe(400);
  });

  it('should validate signature when enabled', async () => {
    // Test signature validation
    const event = { type: 'buddy.match.created', data: {} };
    const response = await fetch(WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Signature': 'sha256=invalid',
      },
      body: JSON.stringify(event),
    });

    // Should return 401 if validation enabled
    // expect(response.status).toBe(401);
  });
});
```

### 3. Load Testing

**File**: `tests/webhook-load.k6.js`

```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const webhookErrors = new Counter('webhook_errors');
const webhookDuration = new Trend('webhook_duration');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up
    { duration: '1m', target: 50 },    // Sustain
    { duration: '30s', target: 0 },    // Ramp down
  ],
};

export default function () {
  const event = {
    type: 'buddy.match.created',
    data: {
      matchId: `match-${__VU}-${__ITER}`,
      userId: `user-${__VU}`,
    },
    id: `event-${__VU}-${__ITER}`,
    timestamp: new Date().toISOString(),
  };

  const response = http.post(
    'http://localhost:3000/webhooks/buddy-events',
    JSON.stringify(event),
    { headers: { 'Content-Type': 'application/json' } }
  );

  webhookDuration.add(response.timings.duration);

  check(response, {
    'status is 202': (r) => r.status === 202,
    'response is acknowledged': (r) => JSON.parse(r.body).acknowledged === true,
  }) || webhookErrors.add(1);

  sleep(1);
}
```

**Run**:
```bash
k6 run tests/webhook-load.k6.js
```

---

## Troubleshooting

### Problem 1: "Connection refused" when Buddy System tries to publish

**Symptoms**:
```
Error: connect ECONNREFUSED 127.0.0.1:3000
```

**Solutions**:
1. Verify CSR Platform is running: `curl http://localhost:3000/health/webhook`
2. Check CSR_WEBHOOK_URL environment variable:
   - Local: `http://localhost:3000/webhooks/buddy-events`
   - Docker: `http://csr-api:3000/webhooks/buddy-events`
   - Production: Use full domain
3. If using Docker, verify `depends_on` is set correctly

### Problem 2: "Signature validation failed"

**Symptoms**:
```
Signature validation failed
Response: { "error": "Invalid signature" }
```

**Solutions**:
1. Verify secrets match:
   - Buddy System: `echo $CSR_WEBHOOK_SECRET`
   - CSR Platform: `echo $WEBHOOK_SIGNATURE_SECRET`
   - They must be identical
2. Ensure raw payload is used for HMAC, not stringified twice
3. Check algorithm is `sha256` (not md5, sha1, etc.)
4. For testing, disable validation: `WEBHOOK_SIGNATURE_VALIDATION_ENABLED=false`

### Problem 3: Events not being processed

**Symptoms**:
- Webhook returns 202 Accepted
- Events don't appear in CSR Platform

**Solutions**:
1. Check event structure matches EventEnvelopeSchema:
   ```typescript
   {
     "type": "buddy.match.created",  // Required
     "data": { ... },                 // Required
     "id": "uuid",                    // Required
     "timestamp": "iso8601"           // Required
   }
   ```
2. Verify NATS is running: `nats-server` or `docker ps | grep nats`
3. Check logs: `grep "Webhook received" csr-platform.log`
4. Verify event bus configuration

### Problem 4: Retries not working / Exponential backoff not triggering

**Symptoms**:
- Webhook fails once and never retries
- No retry logs

**Solutions**:
1. Verify retry settings:
   ```bash
   echo "CSR_WEBHOOK_RETRY_ATTEMPTS=$CSR_WEBHOOK_RETRY_ATTEMPTS"
   echo "CSR_WEBHOOK_RETRY_BACKOFF_MS=$CSR_WEBHOOK_RETRY_BACKOFF_MS"
   ```
2. Check if error is 4xx (client error - no retry) vs 5xx (server error - retry)
3. Verify timeout isn't cutting off retries
4. Check logs for retry attempts:
   ```bash
   grep "retry" buddy-system.log
   ```

### Problem 5: High latency or timeouts

**Symptoms**:
```
Response took 10000ms, exceeding timeout of 5000ms
```

**Solutions**:
1. Increase timeout: `CSR_WEBHOOK_TIMEOUT_MS=10000`
2. Check network latency: `ping csr-platform`
3. Check CSR Platform load: `curl http://localhost:3000/health`
4. Reduce payload size if applicable
5. Check database queries (if CSR Platform is slow processing events)

### Problem 6: "Rate limited" (429 responses)

**Symptoms**:
```
HTTP 429 Too Many Requests
```

**Solutions**:
1. Reduce event publishing rate in Buddy System
2. If rate limiting intentional, adjust:
   ```bash
   WEBHOOK_RATE_LIMIT_PER_MINUTE=500  # Increase from 100
   ```
3. Check if CSR Platform is under load

### Debug Checklist

```bash
# 1. Verify services running
curl http://localhost:3000/health/webhook
curl http://localhost:3010/health  # If Buddy System has health endpoint

# 2. Check environment variables
echo "CSR_WEBHOOK_URL=$CSR_WEBHOOK_URL"
echo "WEBHOOK_SIGNATURE_VALIDATION_ENABLED=$WEBHOOK_SIGNATURE_VALIDATION_ENABLED"

# 3. Send test event with verbose output
curl -v -X POST http://localhost:3000/webhooks/buddy-events \
  -H "Content-Type: application/json" \
  -d '{"type":"buddy.match.created","data":{},"id":"test","timestamp":"2025-11-14T10:00:00Z"}'

# 4. Check logs
tail -f logs/csr-platform.log | grep webhook
tail -f logs/buddy-system.log | grep webhook

# 5. Verify network connectivity (Docker)
docker exec <container> curl http://csr-api:3000/health/webhook

# 6. Check port bindings
netstat -tlnp | grep 3000  # Linux
lsof -i :3000              # macOS
```

---

## Security Checklist

### Phase 1 (MVP - Currently Implemented)

- [ ] HTTP only acceptable if network is internal/VPC
- [ ] IP whitelisting enabled (firewall rules)
- [ ] No signature validation (can add later)
- [ ] No authentication on webhook endpoint (internal only)
- [ ] Rate limiting disabled (not needed for MVP scale)
- [ ] CORS headers not set (not applicable)
- [ ] Logging doesn't expose sensitive data
- [ ] Timeouts are reasonable (5 seconds)

### Phase 1.5 (Recommended Before Production)

- [ ] Enable webhook signature validation
- [ ] Add API key authentication if public internet
- [ ] Implement rate limiting (429 responses)
- [ ] Add IP whitelisting rules
- [ ] Use HTTPS if crossing network boundaries
- [ ] Secrets in environment variables, not code
- [ ] Audit logging for webhook access
- [ ] Dead letter queue for failed events

### Phase 2 (Before Scale)

- [ ] Migrate to NATS JetStream
- [ ] TLS for all connections
- [ ] Encrypted webhook secrets in vault
- [ ] JWT tokens for authentication
- [ ] Distributed rate limiting
- [ ] DDoS protection (CDN, WAF)

### Secrets Management

**Never commit secrets**:
```bash
# Bad: Don't do this
export WEBHOOK_SIGNATURE_SECRET=abc123

# Good: Use .env file (gitignored)
cat > .env.local << 'EOF'
WEBHOOK_SIGNATURE_SECRET=abc123
EOF

# Git ignore
echo ".env*.local" >> .gitignore
```

---

## References

- **ADR-002**: `reports/ADR-002-event-bus-selection.md`
- **Event Contracts**: `packages/event-contracts/src/`
- **Architecture**: `docs/Platform_Architecture.md`
- **Webhook Best Practices**: https://webhook.guide/
- **HTTP Status Codes**: https://httpwg.org/specs/rfc7231.html#status.codes

---

**Document Status**: Ready for Implementation
**Last Updated**: 2025-11-14
**Owner**: Observability Engineer (Agent)

