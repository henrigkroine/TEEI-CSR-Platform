# Buddy Connector Service

CSR Platform subscriber service for Buddy System events. Receives webhooks from the Buddy System, validates events, and persists them to PostgreSQL for analytics and SROI calculation.

## Quick Start

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build for production
pnpm build

# Run tests
pnpm test
```

## Environment Variables

```bash
PORT_BUDDY_CONNECTOR=3010
BUDDY_WEBHOOK_SECRET=<shared-secret>
DATABASE_URL=postgresql://user:pass@localhost:5432/teei_platform
```

## API Endpoints

### `POST /webhooks/buddy-events`

Unified webhook endpoint for all Buddy System events.

**Required Headers:**
- `X-Buddy-Signature`: HMAC-SHA256 signature (format: `t=<timestamp>,v1=<signature>`)
- `X-Delivery-Id`: Unique delivery identifier

**Supported Event Types:**
- `buddy.match.created` - New buddy match
- `buddy.match.ended` - Match ended
- `buddy.event.logged` - Social activity
- `buddy.event.attended` - Formal event attendance
- `buddy.skill_share.completed` - Skill exchange session
- `buddy.checkin.completed` - Regular check-in
- `buddy.feedback.submitted` - Match feedback
- `buddy.milestone.reached` - User milestone

### `GET /health`

Health check endpoint.

### `GET /webhooks/stats`

Get service statistics and supported event types.

## Testing Webhooks

```bash
# Generate test signature
export TIMESTAMP=$(date +%s)
export PAYLOAD='{"id":"123e4567-e89b-12d3-a456-426614174000","type":"buddy.match.created",...}'
export SIGNATURE=$(echo -n "${TIMESTAMP}.${PAYLOAD}" | openssl dgst -sha256 -hmac "$SECRET" -hex)

# Send test webhook
curl -X POST http://localhost:3010/webhooks/buddy-events \
  -H "X-Buddy-Signature: t=${TIMESTAMP},v1=${SIGNATURE}" \
  -H "X-Delivery-Id: test-$(uuidgen)" \
  -H "Content-Type: application/json" \
  -d "$PAYLOAD"
```

## Architecture

```
Buddy System → Webhook (HMAC validated) → Event Validation (Zod)
              → Idempotency Check → Event Processor → PostgreSQL
```

## Database Tables

- **buddy_system_events**: Raw event storage (JSONB payload)
- **buddy_matches**: Match relationships
- **buddy_events**: Social activities
- **buddy_checkins**: Check-ins
- **buddy_feedback**: Feedback/ratings
- **webhook_deliveries**: Idempotency tracking

## Security Features

- HMAC-SHA256 signature validation
- Timestamp-based replay attack prevention
- Timing-safe signature comparison
- Idempotency guarantees (event_id uniqueness)
- Schema validation via Zod

## Error Handling

- **400**: Invalid payload, unknown event type
- **401**: Invalid signature or timestamp
- **202**: Already processed (idempotent)
- **500**: Processing error (retryable)

Max retries: 3 attempts with exponential backoff recommended.

## Documentation

See `/reports/TASK-A-03-csr-subscriber.md` for detailed architecture, API specification, and deployment guide.
