# Event Bus Quick Start - 5 Minute Setup

**Status**: Phase 1 (HTTP Webhooks)
**Time**: ~5 minutes to test
**Audience**: Developers

---

## TL;DR

Buddy System publishes events via HTTP POST to CSR Platform webhook.

```
Buddy System → HTTP POST → CSR Platform webhook → Process event
```

---

## Quick Setup (Local)

### Terminal 1: CSR Platform

```bash
cd csr-platform
npm install

cat > .env.local << 'EOF'
WEBHOOK_PORT=3000
WEBHOOK_SIGNATURE_VALIDATION_ENABLED=false
EOF

npm run dev
# Runs on http://localhost:3000
```

### Terminal 2: Send Test Event

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
    "id": "345e6789-f89b-12d3-a456-426614174000",
    "timestamp": "2025-11-14T10:00:00Z"
  }'
```

### Expected Response

```json
{
  "acknowledged": true,
  "eventId": "345e6789-f89b-12d3-a456-426614174000",
  "timestamp": "2025-11-14T10:00:00Z"
}
```

---

## Environment Variables

### Buddy System

| Var | Value | Required |
|-----|-------|----------|
| `CSR_WEBHOOK_URL` | `http://csr-platform:3000/webhooks/buddy-events` | Yes |
| `CSR_WEBHOOK_TIMEOUT_MS` | `5000` | No (default) |
| `CSR_WEBHOOK_RETRY_ATTEMPTS` | `5` | No (default) |

### CSR Platform

| Var | Value | Required |
|-----|-------|----------|
| `WEBHOOK_PORT` | `3000` | No (default) |
| `WEBHOOK_SIGNATURE_VALIDATION_ENABLED` | `false` | No (Phase 1) |

---

## Code Integration

### Buddy System: Publishing an Event

```typescript
import { getPublisher } from './services/event-publisher.js';

const event = {
  type: 'buddy.match.created',
  data: {
    matchId: 'match-123',
    userId: 'user-456',
  },
  id: randomUUID(),
  timestamp: new Date().toISOString(),
};

await getPublisher().publish(event);
```

### CSR Platform: Receiving Events

Already included in API Gateway. Just send HTTP POST to:
```
POST /webhooks/buddy-events
Content-Type: application/json

{event payload}
```

---

## Common Event Types

```
buddy.match.created     - New buddy match
buddy.event.logged      - Activity/event logged
buddy.checkin.completed - Checkin completed
buddy.feedback.submitted - Feedback submitted
kintell.session.completed - Language/mentorship session
upskilling.course.completed - Course completed
```

See `packages/event-contracts/src/base.ts` for full list.

---

## Testing Events

### Test 1: Valid Event

```bash
curl -X POST http://localhost:3000/webhooks/buddy-events \
  -H "Content-Type: application/json" \
  -d '{
    "type": "buddy.match.created",
    "data": {"matchId": "123", "userId": "456"},
    "id": "789",
    "timestamp": "2025-11-14T10:00:00Z"
  }'

# Expected: 202 Accepted
```

### Test 2: Invalid Event

```bash
curl -X POST http://localhost:3000/webhooks/buddy-events \
  -H "Content-Type: application/json" \
  -d '{"type": "invalid"}'

# Expected: 400 Bad Request
```

### Test 3: Health Check

```bash
curl http://localhost:3000/health/webhook

# Expected: 200 OK with {"status": "healthy"}
```

---

## Troubleshooting

### Connection Refused
```bash
# Check if CSR Platform is running
curl http://localhost:3000/health/webhook
```

### Validation Failed
```bash
# Check event format matches schema
# Required fields: type, data, id, timestamp
```

### Timeout
```bash
# Check network connectivity
ping localhost

# Increase timeout if needed
CSR_WEBHOOK_TIMEOUT_MS=10000
```

---

## Key Metrics to Watch

```
Events published/min: rate(buddy_webhook_publish_total[1m])
Errors/min: rate(buddy_webhook_publish_errors_total[1m])
Latency p95: histogram_quantile(0.95, buddy_webhook_publish_duration_ms)
Queue size: buddy_webhook_pending_queue_size
```

See EVENT-BUS-MONITORING.md for full setup.

---

## Important Files

| File | Purpose |
|------|---------|
| `packages/event-contracts/src/` | Event schemas |
| `packages/shared-utils/src/event-bus.ts` | NATS client (internal) |
| `services/api-gateway/src/routes/webhooks.ts` | Webhook endpoint |
| `reports/ADR-002-event-bus-selection.md` | Full decision doc |
| `reports/EVENT-BUS-CONFIGURATION-GUIDE.md` | Setup & config |
| `reports/EVENT-BUS-MONITORING.md` | Metrics & alerts |

---

## Next Steps

1. ✅ Review architecture decision (ADR-002)
2. ✅ Setup local environment
3. ✅ Test event flow with curl
4. ✅ Integrate in Buddy System
5. ✅ Deploy to staging
6. ✅ Monitor in production
7. ↔️ Migrate to NATS (Phase 2)

---

## Support

- **Quick Questions**: See this file
- **Configuration Help**: EVENT-BUS-CONFIGURATION-GUIDE.md
- **Monitoring Setup**: EVENT-BUS-MONITORING.md
- **Architecture Details**: ADR-002-event-bus-selection.md

---

**Last Updated**: 2025-11-14
