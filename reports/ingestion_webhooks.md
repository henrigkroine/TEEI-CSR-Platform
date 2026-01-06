# Webhook Ingestion System Documentation

## Overview

The Kintell Connector service implements a secure, reliable, and idempotent webhook ingestion system with the following features:

- HMAC-SHA256 signature validation for security
- Idempotency layer to prevent duplicate processing
- Dead Letter Queue (DLQ) for failed webhooks with replay capability
- Comprehensive error handling and retry logic
- Audit trail for all webhook deliveries

## Architecture

```
External System (Kintell) → Webhook Endpoint
                            ↓
                    Signature Validation
                            ↓
                    Idempotency Check
                            ↓
                    Process & Store
                            ↓
                    Emit NATS Event
                            ↓
                    Mark Processed

                    (On Failure)
                            ↓
                    Retry (max 3 times)
                            ↓
                    Dead Letter Queue
```

## Webhook Endpoints

### 1. Session Completed
**Endpoint**: `POST /webhooks/session-completed`

**Description**: Receives session completion notifications for both language and mentorship sessions.

**Payload**:
```json
{
  "session_id": "external-session-123",
  "session_type": "language",
  "participant_email": "participant@example.com",
  "volunteer_email": "volunteer@example.com",
  "scheduled_at": "2024-01-01T10:00:00Z",
  "completed_at": "2024-01-01T11:00:00Z",
  "duration_minutes": 60,
  "topics": ["grammar", "conversation"],
  "language_level": "B1"
}
```

**Required Headers**:
- `X-Kintell-Signature`: HMAC-SHA256 signature (format: `t=<timestamp>,v1=<signature>`)
- `X-Delivery-Id`: Unique delivery identifier for idempotency
- `Content-Type`: `application/json`

**Response Codes**:
- `200 OK`: Webhook processed successfully
- `202 Accepted`: Webhook already processed (idempotent) or sent to DLQ
- `401 Unauthorized`: Invalid signature or missing headers
- `500 Internal Server Error`: Processing failed

### 2. Rating Created
**Endpoint**: `POST /webhooks/rating-created`

**Description**: Receives feedback rating notifications after a session.

**Payload**:
```json
{
  "rating_id": "rating-uuid-123",
  "session_id": "external-session-123",
  "from_role": "participant",
  "rating": 0.8,
  "feedback_text": "Great session, very helpful!",
  "created_at": "2024-01-01T11:05:00Z"
}
```

**Required Headers**: Same as Session Completed

### 3. Booking Confirmed
**Endpoint**: `POST /webhooks/booking-confirmed`

**Description**: Receives future session booking confirmations.

**Payload**:
```json
{
  "booking_id": "booking-uuid-456",
  "session_type": "mentorship",
  "participant_email": "participant@example.com",
  "volunteer_email": "volunteer@example.com",
  "scheduled_at": "2024-02-01T14:00:00Z"
}
```

**Required Headers**: Same as Session Completed

## Security: Signature Validation

### Overview
All webhook requests must be signed using HMAC-SHA256 to prevent unauthorized access and ensure data integrity.

### Signature Generation Algorithm

```typescript
// 1. Get current timestamp (seconds since epoch)
const timestamp = Math.floor(Date.now() / 1000);

// 2. Create signed payload
const signedPayload = `${timestamp}.${JSON.stringify(requestBody)}`;

// 3. Compute HMAC-SHA256 signature
const signature = crypto
  .createHmac('sha256', WEBHOOK_SECRET)
  .update(signedPayload)
  .digest('hex');

// 4. Format header value
const headerValue = `t=${timestamp},v1=${signature}`;
```

### Example (Node.js)

```javascript
const crypto = require('crypto');

function generateWebhookSignature(payload, secret) {
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${JSON.stringify(payload)}`;
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');

  return `t=${timestamp},v1=${signature}`;
}

// Usage
const payload = { session_id: "123", session_type: "language" };
const secret = process.env.KINTELL_WEBHOOK_SECRET;
const signature = generateWebhookSignature(payload, secret);

// Include in request headers
headers['X-Kintell-Signature'] = signature;
headers['X-Delivery-Id'] = generateUniqueId(); // UUID or similar
```

### Example (Python)

```python
import hmac
import hashlib
import json
import time

def generate_webhook_signature(payload, secret):
    timestamp = int(time.time())
    signed_payload = f"{timestamp}.{json.dumps(payload)}"
    signature = hmac.new(
        secret.encode('utf-8'),
        signed_payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()

    return f"t={timestamp},v1={signature}"

# Usage
payload = {"session_id": "123", "session_type": "language"}
secret = os.environ['KINTELL_WEBHOOK_SECRET']
signature = generate_webhook_signature(payload, secret)

# Include in request headers
headers['X-Kintell-Signature'] = signature
headers['X-Delivery-Id'] = str(uuid.uuid4())
```

### Signature Validation Rules

1. **Timestamp Tolerance**: ±5 minutes to account for clock skew
2. **Timing-Safe Comparison**: Prevents timing attacks
3. **Replay Attack Prevention**: Old timestamps are rejected

### Testing Signature Generation

```bash
# Test endpoint (development only)
curl -X POST http://localhost:3002/webhooks/session-completed \
  -H "Content-Type: application/json" \
  -H "X-Delivery-Id: test-delivery-123" \
  -H "X-Kintell-Signature: t=1234567890,v1=abcdef..." \
  -d '{
    "session_id": "test-session",
    "session_type": "language",
    "participant_email": "participant@example.com",
    "volunteer_email": "volunteer@example.com",
    "scheduled_at": "2024-01-01T10:00:00Z",
    "completed_at": "2024-01-01T11:00:00Z",
    "duration_minutes": 60
  }'
```

## Idempotency Behavior

### Overview
The system ensures that duplicate webhook deliveries (same `X-Delivery-Id`) are processed exactly once, preventing data duplication.

### Delivery States

| State | Description | Should Process? | Response Code |
|-------|-------------|----------------|---------------|
| **Pending** | Newly received, not yet processed | Yes | 200 |
| **Processed** | Successfully processed previously | No | 202 |
| **Failed (< 3 retries)** | Failed, can retry | Yes | 200 |
| **Failed (≥ 3 retries)** | Max retries exceeded, sent to DLQ | No | 202 |

### Idempotency Workflow

```
1. Webhook Received
   ↓
2. Check delivery_id in webhook_deliveries table
   ↓
3a. NOT FOUND → Create pending record, process
   ↓
3b. FOUND + processed → Return 202 (already processed)
   ↓
3c. FOUND + failed (< 3 retries) → Retry processing
   ↓
3d. FOUND + failed (≥ 3 retries) → Send to DLQ, return 202
```

### Example Responses

**First Request (Success)**:
```json
{
  "status": "success",
  "message": "Webhook processed successfully",
  "deliveryId": "delivery-123"
}
```

**Duplicate Request (Idempotent)**:
```json
{
  "status": "accepted",
  "message": "Webhook already processed",
  "deliveryId": "delivery-123"
}
```

**Failed After Max Retries**:
```json
{
  "status": "accepted",
  "message": "Webhook sent to DLQ for manual review",
  "deliveryId": "delivery-123"
}
```

## Dead Letter Queue (DLQ)

### Overview
Webhooks that fail processing after 3 retry attempts are automatically sent to the Dead Letter Queue for manual review and replay.

### DLQ Operations

#### 1. View DLQ Messages
**Endpoint**: `GET /webhooks/dlq?limit=100`

**Response**:
```json
{
  "stats": {
    "totalMessages": 5,
    "oldestMessage": "2024-01-01T10:00:00Z",
    "newestMessage": "2024-01-05T15:30:00Z",
    "byEventType": {
      "session-completed": 3,
      "rating-created": 2
    }
  },
  "messages": [
    {
      "deliveryId": "failed-delivery-123",
      "eventType": "session-completed",
      "payload": { /* original payload */ },
      "retryCount": 3,
      "lastError": "Participant not found: user@example.com",
      "originalTimestamp": "2024-01-01T10:00:00Z",
      "dlqTimestamp": "2024-01-01T10:15:00Z"
    }
  ]
}
```

#### 2. Replay Webhook from DLQ
**Endpoint**: `POST /webhooks/dlq/:deliveryId/replay`

**Description**: Resets the delivery to pending state for reprocessing. Use this after fixing the underlying issue (e.g., creating missing user).

**Response**:
```json
{
  "status": "success",
  "message": "Webhook reset to pending for replay",
  "deliveryId": "failed-delivery-123",
  "payload": { /* original payload */ }
}
```

**Workflow**:
1. Identify root cause of failure
2. Fix the issue (e.g., create missing user, fix data format)
3. Call replay endpoint
4. Webhook will be reprocessed automatically on next request

#### 3. Delete Webhook from DLQ
**Endpoint**: `DELETE /webhooks/dlq/:deliveryId`

**Description**: Permanently deletes a webhook from the DLQ. Use with caution - this action is irreversible.

**Response**:
```json
{
  "status": "success",
  "message": "Webhook permanently deleted from DLQ",
  "deliveryId": "failed-delivery-123"
}
```

**When to Delete**:
- After successful replay and verification
- When the webhook is determined to be invalid/malicious
- When the data is no longer needed

### DLQ Monitoring

**Recommended Monitoring**:
- Alert when DLQ size exceeds threshold (e.g., 10 messages)
- Daily DLQ report to operations team
- Track DLQ message age (alert if > 24 hours)

**Query Example**:
```bash
# Check DLQ status
curl http://localhost:3002/webhooks/dlq | jq '.stats'

# Output:
# {
#   "totalMessages": 5,
#   "oldestMessage": "2024-01-01T10:00:00Z",
#   "newestMessage": "2024-01-05T15:30:00Z",
#   "byEventType": {
#     "session-completed": 3,
#     "rating-created": 2
#   }
# }
```

## Error Handling and Retry Policies

### Automatic Retry Logic

1. **Retry Count**: Maximum 3 attempts
2. **Retry Interval**: Immediate retry (no backoff)
3. **Failure Tracking**: Each failure increments retry count and stores error message
4. **DLQ Threshold**: After 3 failures, webhook is sent to DLQ

### Common Error Scenarios

| Error | Retry Behavior | Solution |
|-------|---------------|----------|
| User not found | Retry 3x, then DLQ | Create user, replay from DLQ |
| Invalid email format | Fail immediately, DLQ | Fix source data, replay from DLQ |
| Database connection error | Retry 3x, then DLQ | Fix DB, webhook will auto-retry |
| Invalid session type | Fail immediately, DLQ | Update data mapping, replay |
| NATS publish error | Retry 3x, then DLQ | Fix NATS connection, replay |

### Error Response Format

```json
{
  "status": "error",
  "message": "Webhook processing failed",
  "error": "Participant not found: user@example.com",
  "deliveryId": "delivery-123"
}
```

## Monitoring and Observability

### Key Metrics

1. **Webhook Success Rate**: `successful_webhooks / total_webhooks`
2. **Average Processing Time**: Time from receipt to completion
3. **DLQ Size**: Number of webhooks in DLQ
4. **Retry Rate**: Webhooks requiring retries
5. **Idempotent Requests**: Duplicate delivery attempts

### Log Levels

- **INFO**: Successful webhook processing, idempotent responses
- **WARN**: Retries, DLQ additions
- **ERROR**: Processing failures, signature validation failures

### Sample Log Output

```
[INFO] Webhook signature validated successfully { deliveryId: "delivery-123" }
[INFO] New webhook delivery, creating record { deliveryId: "delivery-123", eventType: "session-completed" }
[INFO] Session completed webhook processed successfully { deliveryId: "delivery-123", sessionId: "uuid-456" }
[INFO] Webhook marked as processed { deliveryId: "delivery-123" }
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `KINTELL_WEBHOOK_SECRET` | Shared secret for HMAC-SHA256 | Yes | `dev-secret-change-in-production` |
| `PORT_KINTELL_CONNECTOR` | Service port | No | `3002` |
| `DATABASE_URL` | PostgreSQL connection string | Yes | - |
| `NATS_URL` | NATS server URL | Yes | - |

## Security Best Practices

1. **Rotate Webhook Secret**: Regularly rotate `KINTELL_WEBHOOK_SECRET` (every 90 days)
2. **TLS/HTTPS Only**: Always use HTTPS in production
3. **Rate Limiting**: Implement rate limiting on webhook endpoints
4. **IP Allowlist**: Restrict webhook endpoints to known IP ranges
5. **Audit Logs**: Maintain audit trail of all webhook deliveries
6. **Monitor Suspicious Activity**: Alert on unusual patterns (e.g., many failed signatures)

## Troubleshooting Guide

### Issue: Signature Validation Fails

**Symptoms**: 401 Unauthorized responses

**Possible Causes**:
1. Incorrect webhook secret
2. Clock skew between systems
3. Incorrect signature generation algorithm

**Solutions**:
1. Verify webhook secret matches on both sides
2. Check system time synchronization (NTP)
3. Review signature generation code against documentation

### Issue: Webhooks Not Processing

**Symptoms**: Webhooks stuck in pending state

**Possible Causes**:
1. Database connection issues
2. NATS connection issues
3. User lookup failures

**Solutions**:
1. Check database connectivity and logs
2. Verify NATS connection is active
3. Review error messages in DLQ
4. Check user data exists in database

### Issue: High DLQ Volume

**Symptoms**: Many webhooks in DLQ

**Possible Causes**:
1. Missing users in database
2. Invalid data format from source
3. Database performance issues

**Solutions**:
1. Identify common error patterns in DLQ
2. Bulk create missing users
3. Contact Kintell team about data quality
4. Optimize database queries

## Testing

### Unit Tests
```bash
cd services/kintell-connector
pnpm test src/__tests__/webhooks.test.ts
```

### Integration Tests
```bash
# Requires running database and NATS
docker-compose up -d postgres nats
pnpm test
```

### Manual Testing
```bash
# Generate valid signature
node -e "
const crypto = require('crypto');
const timestamp = Math.floor(Date.now() / 1000);
const payload = JSON.stringify({session_id: 'test-123', session_type: 'language', participant_email: 'test@example.com', volunteer_email: 'volunteer@example.com', scheduled_at: '2024-01-01T10:00:00Z', completed_at: '2024-01-01T11:00:00Z', duration_minutes: 60});
const secret = 'dev-secret-change-in-production';
const signature = crypto.createHmac('sha256', secret).update(\`\${timestamp}.\${payload}\`).digest('hex');
console.log(\`X-Kintell-Signature: t=\${timestamp},v1=\${signature}\`);
console.log(\`X-Delivery-Id: test-delivery-\${Date.now()}\`);
"

# Use output to make curl request
curl -X POST http://localhost:3002/webhooks/session-completed \
  -H "Content-Type: application/json" \
  -H "X-Delivery-Id: test-delivery-123456" \
  -H "X-Kintell-Signature: <generated-signature>" \
  -d '<payload>'
```

## Support and Contact

For issues or questions:
- Technical Lead: Worker 2 Orchestrator
- DLQ Monitoring: Operations Team
- Security Issues: Security Team

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2024-01-15 | Initial webhook system implementation |
