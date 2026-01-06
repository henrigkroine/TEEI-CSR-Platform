# ADR-002: Event Bus Selection - HTTP Webhooks for Phase 1

**Status**: Accepted (Phase 1) | Migration Path to NATS (Phase 2+)
**Date**: 2025-11-14
**Decision Maker**: Strategic Architect (B)
**Stakeholders**: Backend Team, Infrastructure, Observability Team

---

## 1. Context

The TEEI CSR Platform requires an event-driven architecture to enable asynchronous communication between:

- **Buddy System** (Publisher): Event source emitting user engagement, matches, and activities
- **CSR Platform** (Consumer): Processes events for metrics, journey orchestration, and reporting

### Current State

- Event schemas defined in `packages/event-contracts/` with Zod validators
- Event bus infrastructure not yet implemented
- Three viable options identified for Phase 1 implementation

### Decision Drivers

1. **Phase 1 Constraint**: Minimize infrastructure complexity while getting data flowing
2. **Time-to-Value**: Rapid integration between systems
3. **Operational Overhead**: Reduce deployment and maintenance burden
4. **Future Growth**: Clear migration path as scale increases
5. **Developer Experience**: Easy debugging and testing

---

## 2. Options Evaluated

### Option 1: HTTP Webhooks (RECOMMENDED)

**How it works**:
- Buddy System POSTs events directly to CSR Platform webhook endpoint
- CSR Platform exposes `POST /webhooks/buddy-events` endpoint
- Synchronous delivery with retry logic in Buddy System
- Optional webhook signature validation for security

**Pros**:
- ✅ Zero additional infrastructure required
- ✅ Minimal operational overhead (single HTTP endpoint)
- ✅ Easy debugging (inspect HTTP requests/responses)
- ✅ Works across network boundaries (cloud-to-cloud, on-prem, hybrid)
- ✅ Simple to test with curl, Postman, REST clients
- ✅ No new dependencies or learning curve
- ✅ Natural fit for 3rd-party integrations (Zapier, Make, IFTTT)
- ✅ Deployment ready day 1

**Cons**:
- ❌ No event buffering (loss risk if CSR Platform is down)
- ❌ Retry logic implemented in Buddy System (tight coupling)
- ❌ No event replay capability
- ❌ No persistence/durability guarantees
- ❌ Not ideal for at-scale (300+ events/sec), increases HTTP overhead
- ❌ Coupling between systems' uptime (no decoupling)
- ❌ Limited to point-to-point pub/sub (hard to add 3rd consumer)

**Best For**:
- Phase 1 MVP (< 100 events/sec)
- Simple producer-consumer relationships
- Quick time-to-market
- Teams with limited DevOps resources

**Scalability Limit**: ~100 events/sec before connection pooling overhead becomes significant

---

### Option 2: NATS (Lightweight Message Broker)

**How it works**:
- Buddy System connects to NATS cluster and publishes events
- CSR Platform subscribes to event topics
- NATS handles routing, buffering, and delivery

**Pros**:
- ✅ Event buffering (survives temporary CSR Platform downtime)
- ✅ JetStream for message persistence and replay
- ✅ Decouples producer and consumer lifetimes
- ✅ Supports multiple consumers (add 3rd system easily)
- ✅ Built-in metrics and monitoring
- ✅ Queue groups for load balancing
- ✅ High performance (millions msg/sec)
- ✅ Minimal resource footprint (~10 MB memory)
- ✅ Cloud-native (runs in Kubernetes, Docker)

**Cons**:
- ❌ Additional infrastructure to deploy and maintain
- ❌ Requires Docker/Kubernetes knowledge
- ❌ Monitoring setup needed (observability not automatic)
- ❌ Not as familiar to typical web developers
- ❌ Overkill for MVP scale
- ❌ Adds ~50ms latency vs direct HTTP

**Best For**:
- Phase 2+ (when scale increases or resilience critical)
- Multiple independent consumers
- Event replay requirements
- Teams with DevOps capacity

**Scalability Limit**: 1M+ events/sec (industry-grade)

---

### Option 3: Kafka (Production-Grade Streaming)

**How it works**:
- Buddy System publishes to Kafka topics
- CSR Platform subscribes as consumer group
- Central message log with partition-based scaling

**Pros**:
- ✅ Enterprise-grade durability and fault tolerance
- ✅ Event replay from any point in time
- ✅ Partitioned topics for horizontal scaling
- ✅ Consumer group offset management
- ✅ 1M+ events/sec scalability
- ✅ Canonical log for audit compliance

**Cons**:
- ❌ Heavy operational overhead (clustering, ZooKeeper, monitoring)
- ❌ Resource intensive (1+ GB memory, multiple instances)
- ❌ Complex configuration and tuning
- ❌ Steep learning curve for team
- ❌ Overkill for Phase 1 (premature optimization)
- ❌ 3-6 month maturation timeline in new environments
- ❌ Higher infrastructure costs

**Best For**:
- Phase 3+ (at scale with complex requirements)
- Organizations with Kafka expertise
- High-durability audit log requirements
- Multi-region deployments

**Scalability Limit**: Unlimited (enterprise grade)

---

## 3. Decision

### Selected: HTTP Webhooks (Phase 1)

**Rationale**:

1. **Simplicity First**: Phase 1 mission is to validate the event-driven model with real data flowing, not to build production-grade infrastructure.

2. **Fast Time-to-Value**: HTTP webhooks can be deployed and tested in hours, not days. Buddy System team can integrate immediately.

3. **Zero Infrastructure**: No additional services to deploy, configure, or monitor. Works with existing tech stack.

4. **Clear Upgrade Path**: Well-established pattern for migrating from webhooks to NATS (documented below).

5. **Scale Appropriate**: CSR Platform Phase 1 target: < 100 events/sec (buddy checkins, matches, events). Direct HTTP fully adequate.

6. **Developer Experience**: Team familiarity reduces risk. HTTP debugging is trivial vs distributed systems.

7. **Operational Readiness**: Can launch without DevOps/SRE overhead.

### Phase Roadmap

| Phase | Mechanism | Events/sec | Key Drivers |
|-------|-----------|-----------|-------------|
| **Phase 1** | HTTP Webhooks | < 100 | MVP validation, time-to-market |
| **Phase 2** | NATS JetStream | 100-10K | Resilience, multi-consumer, replay |
| **Phase 3** | Kafka Clusters | 10K+ | Enterprise-scale, audit logs, analytics |

---

## 4. HTTP Webhooks Implementation

### Architecture

```
┌──────────────────┐                    ┌──────────────────────┐
│  Buddy System    │                    │   CSR Platform       │
│  (Event Source)  │                    │   (Event Sink)       │
└────────┬─────────┘                    └──────────┬───────────┘
         │                                         ▲
         │                                         │
         │  POST /webhooks/buddy-events            │
         │  Content-Type: application/json         │
         │  X-Webhook-Signature: sha256=...        │
         │  X-Webhook-Id: uuid                     │
         │  X-Webhook-Timestamp: iso8601           │
         │                                         │
         ├────────────────────────────────────────►│
         │                                         │
         │  { "type": "buddy.match.created",      │
         │    "data": { ... },                    │
         │    "id": "event-uuid",                 │
         │    "timestamp": "2025-11-14..." }      │
         │                                         │
         │                  200 OK                 │
         │◄────────────────────────────────────────┤
         │                                         │
         │  If 5xx or timeout, retry with          │
         │  exponential backoff:                   │
         │  1s, 2s, 4s, 8s, 16s                    │
         │                                         │
```

### Configuration

#### Buddy System Setup

**Environment Variables**:
```bash
# .env.buddy-system
CSR_WEBHOOK_URL=http://csr-platform:3000/webhooks/buddy-events
CSR_WEBHOOK_SECRET=<webhook-signature-secret>
CSR_WEBHOOK_TIMEOUT_MS=5000
CSR_WEBHOOK_RETRY_ATTEMPTS=5
CSR_WEBHOOK_RETRY_BACKOFF_MS=1000
```

**Publishing Code Pattern**:
```typescript
// packages/shared-utils/src/webhook-publisher.ts
import { EventEnvelope } from '@teei/event-contracts';

export class WebhookPublisher {
  constructor(
    private webhookUrl: string,
    private secret?: string,
    private timeoutMs: number = 5000,
    private retryAttempts: number = 5
  ) {}

  async publish<T extends EventEnvelope>(event: T): Promise<void> {
    const headers = this.buildHeaders(event);
    
    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        const response = await fetch(this.webhookUrl, {
          method: 'POST',
          headers,
          body: JSON.stringify(event),
          signal: AbortSignal.timeout(this.timeoutMs),
        });

        if (response.ok) {
          logger.info({ eventId: event.metadata.id }, 'Event published');
          return;
        }

        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}`);
        }

        // 4xx error - don't retry
        throw new Error(`Client error: ${response.status}`);
      } catch (error) {
        const backoff = Math.pow(2, attempt - 1) * 1000; // Exponential
        if (attempt < this.retryAttempts) {
          logger.warn({ attempt, nextBackoffMs: backoff }, 'Webhook failed, retrying');
          await new Promise(r => setTimeout(r, backoff));
        } else {
          logger.error({ attempt, error }, 'Webhook failed after retries');
          throw error;
        }
      }
    }
  }

  private buildHeaders(event: EventEnvelope): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Id': randomUUID(),
      'X-Webhook-Timestamp': new Date().toISOString(),
    };

    if (this.secret) {
      const signature = createHmac('sha256', this.secret)
        .update(JSON.stringify(event))
        .digest('hex');
      headers['X-Webhook-Signature'] = `sha256=${signature}`;
    }

    return headers;
  }
}

export const getWebhookPublisher = () => {
  return new WebhookPublisher(
    process.env.CSR_WEBHOOK_URL || 'http://localhost:3000/webhooks/buddy-events',
    process.env.CSR_WEBHOOK_SECRET,
    parseInt(process.env.CSR_WEBHOOK_TIMEOUT_MS || '5000'),
    parseInt(process.env.CSR_WEBHOOK_RETRY_ATTEMPTS || '5')
  );
};
```

#### CSR Platform Setup

**Environment Variables**:
```bash
# .env.csr-platform
WEBHOOK_SIGNATURE_SECRET=<same-secret-as-buddy-system>
WEBHOOK_SIGNATURE_VALIDATION_ENABLED=false  # Phase 1: optional
```

**Receiving Code Pattern**:
```typescript
// services/api-gateway/src/routes/webhooks.ts
import { FastifyInstance } from 'fastify';
import { EventEnvelopeSchema } from '@teei/event-contracts';
import { validateWebhookSignature } from '../utils/webhook-utils.js';

export async function setupWebhookRoutes(app: FastifyInstance) {
  app.post<{ Body: unknown }>('/webhooks/buddy-events', async (req, reply) => {
    try {
      // Validate signature (optional Phase 1)
      if (process.env.WEBHOOK_SIGNATURE_VALIDATION_ENABLED === 'true') {
        validateWebhookSignature(
          req.rawBody as Buffer,
          req.headers['x-webhook-signature'] as string,
          process.env.WEBHOOK_SIGNATURE_SECRET || ''
        );
      }

      // Parse and validate event
      const event = EventEnvelopeSchema.parse(req.body);

      // Log receipt
      logger.info(
        {
          eventId: event.metadata.id,
          type: event.type,
          webhookId: req.headers['x-webhook-id'],
          timestamp: req.headers['x-webhook-timestamp'],
        },
        'Webhook received'
      );

      // Dispatch to event bus (local NATS or in-memory queue for Phase 1)
      await getEventBus().publish(event);

      // Acknowledge immediately (async processing)
      reply.status(202).send({ acknowledged: true, eventId: event.metadata.id });
    } catch (error) {
      logger.error({ error }, 'Webhook processing failed');
      reply.status(400).send({ error: 'Invalid event format' });
    }
  });
}
```

### Webhook Headers

**Request Headers Sent by Buddy System**:

| Header | Format | Example | Purpose |
|--------|--------|---------|---------|
| `Content-Type` | string | `application/json` | Payload format |
| `X-Webhook-Id` | UUID | `550e8400-e29b-41d4-a716-446655440000` | Idempotency key |
| `X-Webhook-Timestamp` | ISO 8601 | `2025-11-14T10:30:00Z` | When webhook was sent |
| `X-Webhook-Signature` | sha256 | `sha256=abc123...` | HMAC signature (optional Phase 1) |

**Response Codes Expected by Buddy System**:

| Code | Behavior |
|------|----------|
| `200 OK` | Event accepted |
| `202 Accepted` | Event queued for async processing |
| `400 Bad Request` | Validation failed - don't retry |
| `401/403 Unauthorized` | Auth failed - don't retry |
| `429 Too Many Requests` | Rate limited - retry with backoff |
| `500+ Server Error` | Temporary failure - retry with exponential backoff |
| `Timeout` | No response in 5s - retry |

### Security Considerations

#### Phase 1 (Minimal)
- HTTP only acceptable if network is internal (same VPC/datacenter)
- No signature validation (can be added later)
- IP whitelisting recommended

#### Phase 2 (Enhanced)
- Enable webhook signature validation (HMAC-SHA256)
- Add rate limiting (429 responses for > 100 req/min)
- Implement idempotency using `X-Webhook-Id`
- Add authentication (API key, OAuth)

#### Phase 3+ (Production)
- Migrate to NATS JetStream
- TLS for webhook transport
- Encrypted webhook secrets in vault
- Distributed rate limiting

---

## 5. Monitoring Setup

### Metrics to Track

#### Buddy System (Publisher)

**Key Metrics**:
- `buddy_webhook_publish_total` - Total events sent (counter)
- `buddy_webhook_publish_duration_ms` - Event publication latency (histogram)
- `buddy_webhook_publish_errors_total` - Publication failures (counter)
- `buddy_webhook_retry_attempts` - Retry events (counter)
- `buddy_webhook_pending_queue` - Events awaiting retry (gauge)

**Alerting**:
- `buddy_webhook_publish_errors_total` > 10/min → Page on-call
- `buddy_webhook_retry_attempts` > 5/hour → Alert, investigate
- `buddy_webhook_pending_queue` > 100 → Webhook endpoint may be down

#### CSR Platform (Consumer)

**Key Metrics**:
- `csr_webhook_received_total` - Events received (counter)
- `csr_webhook_processing_duration_ms` - Event processing latency (histogram)
- `csr_webhook_errors_total` - Processing failures (counter)
- `csr_webhook_signature_validation_failures` - Invalid signatures (counter)
- `csr_event_processing_lag_ms` - Time from receipt to processing (gauge)

**Alerting**:
- `csr_webhook_errors_total` > 5/min → Page on-call
- `csr_event_processing_lag_ms` > 5000 → Alert, queue backlog
- `csr_webhook_signature_validation_failures` > 3 → Alert, check Buddy System config

### Dashboard

```yaml
# Prometheus dashboard configuration
dashboard:
  title: "Buddy → CSR Event Pipeline"
  panels:
    - title: "Event Flow (events/min)"
      metrics:
        - buddy_webhook_publish_total
        - csr_webhook_received_total
    
    - title: "Publication Latency (ms)"
      metric: buddy_webhook_publish_duration_ms
      quantiles: [p50, p95, p99]
    
    - title: "Errors & Retries"
      metrics:
        - buddy_webhook_publish_errors_total
        - buddy_webhook_retry_attempts
        - csr_webhook_errors_total
    
    - title: "Processing Lag (ms)"
      metric: csr_event_processing_lag_ms
      warning: > 1000ms
      critical: > 5000ms
```

### Logging

**Structured Log Format** (JSON):

```json
{
  "timestamp": "2025-11-14T10:30:00.123Z",
  "level": "info",
  "service": "buddy-system",
  "operation": "webhook_publish",
  "eventId": "550e8400-e29b-41d4-a716-446655440000",
  "eventType": "buddy.match.created",
  "duration_ms": 45,
  "status": "success",
  "webhookId": "abc123...",
  "correlationId": "req-uuid-123"
}
```

**Log Levels**:
- `error`: Publication failures, retries exhausted
- `warn`: Retries, timeouts, slow operations (> 2s)
- `info`: Successful publications, webhook receipts
- `debug`: Signature validation, payload details (disabled by default)

---

## 6. Migration Path: HTTP Webhooks → NATS (Phase 2+)

### Why Migrate

When Phase 2 triggers (scale > 100 events/sec or need for resilience):
- Event buffering (NATS JetStream)
- Event replay capability
- Multiple independent consumers
- Reduced coupling between systems

### Migration Strategy (Zero Downtime)

**Step 1: Deploy NATS Infrastructure**
```bash
# docker-compose.yml addition
services:
  nats:
    image: nats:latest
    ports:
      - "4222:4222"
      - "8222:8222"  # Monitoring
    volumes:
      - nats-data:/data
    command: -js -sd /data
```

**Step 2: Update Buddy System**
```typescript
// Support dual-publishing (webhooks + NATS)
const publishers = [
  getWebhookPublisher(),      // Phase 1
  getNatsPublisher(),         // Phase 2+
];

for (const publisher of publishers) {
  try {
    await publisher.publish(event);
  } catch (error) {
    logger.error({ publisher: publisher.name, error }, 'Publish failed');
    // Continue to next publisher for resilience
  }
}
```

**Step 3: Update CSR Platform**
```typescript
// Accept events from both sources
import { setupWebhookRoutes } from './routes/webhooks.js';
import { setupNatsSubscriptions } from './subscribers/nats.js';

await setupWebhookRoutes(app);      // Webhooks from Phase 1
await setupNatsSubscriptions(app);  // NATS from Phase 2+
```

**Step 4: Gradual Cutover**
- Monitor metrics for 1-2 weeks with dual publishers
- Once NATS stable, disable webhook publishing
- Keep webhook endpoint for backwards compatibility (if needed)
- Sunsetting: Remove webhook code in Phase 3

**Rollback Plan**:
If NATS fails during Phase 2:
- Switch `NATS_ENABLED=false` in Buddy System
- Fall back to webhooks only
- Minimal impact (seconds of downtime if dual-publish)

### Code Changes Required

| File | Change | Effort |
|------|--------|--------|
| `packages/shared-utils/event-bus.ts` | Implement NATS client | 2 hours |
| `packages/shared-utils/webhook-publisher.ts` | Keep (Phase 1 compatibility) | 0 hours |
| `services/buddy-service/src/events.ts` | Add NATS publisher | 1 hour |
| `services/api-gateway/src/routes/webhooks.ts` | Keep (backwards compat) | 0 hours |
| `services/api-gateway/src/subscribers/nats.ts` | Add NATS subscriber | 2 hours |

**Total Migration Effort**: ~5 hours

### Success Criteria for Phase 2

Before migrating, validate:
- [x] NATS cluster running stably for 48 hours
- [x] Events processing at > 100/sec without errors
- [x] Dual-publish test passing (webhooks + NATS)
- [x] Monitoring dashboards in place
- [x] Runbooks for common issues documented
- [x] Team trained on NATS operations

---

## 7. Risk Analysis

### HTTP Webhooks Risks (Phase 1)

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| CSR Platform downtime → Event loss | Low (Phase 1) | High | Add retry logic in Buddy System (5 attempts, exponential backoff) |
| Buddy System overwhelmed by errors | Low | Medium | Implement circuit breaker, fallback queue |
| Event processing lag | Low | Low | Monitor lag, scale CSR Platform if needed |
| Network partition | Low | Medium | Use DNS with failover, document recovery steps |
| Webhook endpoint DoS | Very Low | Medium | Add rate limiting (Phase 2), IP whitelisting |

### Mitigation Strategy

1. **Immediate** (Phase 1):
   - Exponential backoff retry in Buddy System (5 attempts)
   - Dead letter queue for permanently failed events
   - Health check endpoint in CSR Platform
   - Slack alerts for delivery failures

2. **Short-term** (Phase 1.5):
   - Webhook signature validation (optional)
   - Rate limiting (429 responses)
   - Idempotency key tracking
   - Dead letter queue UI for admin inspection

3. **Long-term** (Phase 2):
   - Migrate to NATS JetStream
   - Event replay capability
   - Multiple consumer support

---

## 8. Phase 1 Checklist

### Implementation

- [ ] Add webhook publisher to `packages/shared-utils/`
- [ ] Implement webhook signature validation (optional)
- [ ] Add webhook endpoint to CSR Platform API Gateway
- [ ] Update environment variable templates (.env.example)
- [ ] Add retry logic with exponential backoff
- [ ] Implement dead letter queue for failed events
- [ ] Add health check `/health/webhook` endpoint

### Testing

- [ ] Unit tests: webhook publisher, signature validation
- [ ] Integration tests: end-to-end event delivery
- [ ] Retry behavior tests (network failures, timeouts)
- [ ] Signature validation tests (valid/invalid signatures)
- [ ] Load testing (burst of 50 events/sec)

### Operations

- [ ] Prometheus metrics configured
- [ ] Alert rules defined (in AlertManager)
- [ ] Grafana dashboard created
- [ ] Structured logging implemented
- [ ] Runbook: "Webhook endpoint down" created
- [ ] Runbook: "Check failed events in dead letter queue" created

### Documentation

- [ ] Configuration guide (this document, section 4)
- [ ] API documentation (webhook endpoint spec)
- [ ] Troubleshooting guide
- [ ] Team training (30 min walkthrough)

---

## 9. Success Metrics (Phase 1)

### Definition of Done

- Events flow from Buddy System → CSR Platform without manual intervention
- < 1% event loss rate (< 1 per 100 events)
- Event delivery latency < 2 seconds (p95)
- Processing time < 500ms per event
- Webhook endpoint uptime > 99.5%
- Team can troubleshoot failures in < 10 minutes

### Validation

After 1 week of production:
- [ ] > 500 events successfully delivered
- [ ] 0 events lost due to infrastructure
- [ ] No paging incidents related to webhooks
- [ ] < 3 alerts for processing failures

---

## 10. Appendix: Webhook Signature Validation

### Optional: Implement in Phase 2

**Why validate**:
- Confirm events come from authorized Buddy System
- Detect man-in-the-middle attacks
- Compliance requirement (future)

**Implementation**:

```typescript
// packages/shared-utils/src/webhook-utils.ts
import { createHmac } from 'crypto';

export function validateWebhookSignature(
  rawPayload: Buffer | string,
  signature: string,
  secret: string
): boolean {
  const payload = typeof rawPayload === 'string' ? rawPayload : rawPayload.toString('utf-8');
  const [algorithm, hash] = signature.split('=');
  
  if (algorithm !== 'sha256') {
    throw new Error('Unsupported signature algorithm');
  }

  const expectedHash = createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  // Constant-time comparison (prevent timing attacks)
  return timingSafeEqual(hash, expectedHash);
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

**Usage**:

```typescript
// In webhook endpoint
const rawBody = req.rawBody as Buffer;
const signature = req.headers['x-webhook-signature'] as string;

try {
  const isValid = validateWebhookSignature(
    rawBody,
    signature,
    process.env.WEBHOOK_SIGNATURE_SECRET || ''
  );
  
  if (!isValid) {
    logger.warn({ webhookId: req.headers['x-webhook-id'] }, 'Signature validation failed');
    return reply.status(401).send({ error: 'Unauthorized' });
  }
} catch (error) {
  logger.error({ error }, 'Signature validation error');
  return reply.status(400).send({ error: 'Invalid signature' });
}
```

---

## 11. References

- **Event Contracts**: `packages/event-contracts/src/`
- **Shared Utils**: `packages/shared-utils/src/`
- **API Gateway**: `services/api-gateway/src/`
- **Buddy Service**: `services/buddy-service/src/`
- **Architecture Document**: `docs/Platform_Architecture.md`
- **NATS Documentation**: https://nats.io/
- **Webhook Best Practices**: https://webhook.guide/

---

**Document Status**: Ready for Implementation
**Next Review**: After Phase 1 complete (2-3 weeks)
**Document Owner**: Strategic Architect (B) | Observability Engineer (Agent)
**Last Updated**: 2025-11-14

