# Impact-In Integrations Guide

## Overview

The TEEI CSR Platform provides production-grade integrations with external CSR platforms (Benevity, Goodera, Workday) to deliver impact data, track delivery status, and handle webhooks.

## Architecture

```
┌──────────────┐
│ API Gateway  │
└──────┬───────┘
       │
┌──────▼────────────────────────────────┐
│ Impact-In Service                     │
│ ┌──────────────────────────────────┐  │
│ │ Delivery Manager                 │  │
│ ├──────────────────────────────────┤  │
│ │ - Benevity Connector             │  │
│ │ - Goodera Connector (OAuth2)     │  │
│ │ - Workday Connector (SOAP/REST)  │  │
│ └──────────────────────────────────┘  │
│                                       │
│ ┌──────────────────────────────────┐  │
│ │ Delivery Monitor                 │  │
│ │ - History & Status               │  │
│ │ - Replay Failed Deliveries       │  │
│ │ - Statistics Dashboard           │  │
│ └──────────────────────────────────┘  │
│                                       │
│ ┌──────────────────────────────────┐  │
│ │ Webhook Handler                  │  │
│ │ - Signature Verification         │  │
│ │ - Status Updates                 │  │
│ └──────────────────────────────────┘  │
└───────────────────────────────────────┘
```

## Supported Platforms

### 1. Benevity

**Authentication**: API Key + HMAC-SHA256 signature
**Endpoint**: `/api/v1/impact-events`
**Features**:
- Idempotency via X-Idempotency-Key header
- Automatic retry with exponential backoff
- HMAC signature authentication
- Delivery tracking and replay

**Configuration**:
```env
BENEVITY_API_URL=https://api.benevity.com
BENEVITY_API_KEY=your_api_key
BENEVITY_SIGNATURE_SECRET=your_signature_secret
```

**Example Delivery**:
```typescript
import { BenevityConnector } from '@teei/impact-in/connectors/benevity';

const connector = new BenevityConnector({
  apiUrl: process.env.BENEVITY_API_URL,
  apiKey: process.env.BENEVITY_API_KEY,
  signatureSecret: process.env.BENEVITY_SIGNATURE_SECRET,
});

const result = await connector.deliver({
  eventId: 'evt_123',
  companyId: 'company_456',
  userId: 'user_789',
  eventType: 'volunteer_hours',
  timestamp: new Date().toISOString(),
  value: 5,
  unit: 'hours',
}, 'delivery_abc');
```

### 2. Goodera

**Authentication**: OAuth 2.0 (Client Credentials flow)
**Endpoint**: `/v2/events/impact`
**Features**:
- OAuth token refresh
- Database-backed token storage
- Rate limit tracking
- SDG mapping via outcome scores
- Idempotency support

**Configuration**:
```env
GOODERA_API_URL=https://api.goodera.com
GOODERA_CLIENT_ID=your_client_id
GOODERA_CLIENT_SECRET=your_client_secret
GOODERA_TOKEN_URL=https://api.goodera.com/oauth/token
```

**Example Delivery**:
```typescript
import { GooderaConnector } from '@teei/impact-in/connectors/goodera';

const connector = new GooderaConnector({
  apiUrl: process.env.GOODERA_API_URL,
  clientId: process.env.GOODERA_CLIENT_ID,
  clientSecret: process.env.GOODERA_CLIENT_SECRET,
  tokenUrl: process.env.GOODERA_TOKEN_URL,
}, companyId);

const result = await connector.deliver({
  eventId: 'evt_123',
  companyId: 'company_456',
  userId: 'user_789',
  eventType: 'mentorship_session',
  timestamp: new Date().toISOString(),
  outcomeScores: {
    'sdg_4_quality_education': 0.8,
    'sdg_10_reduced_inequalities': 0.6,
  },
}, 'delivery_abc');
```

### 3. Workday

**Authentication**:
- SOAP: WS-Security (Username/Password)
- REST: OAuth 2.0

**Endpoints**:
- SOAP: `/ccx/service/{tenantId}/CSR_Impact_Report`
- REST: `/api/v1/{tenantId}/csr-impact-reports`

**Features**:
- Dual protocol support (SOAP and REST)
- Tenant-based routing
- XML/JSON format handling
- Automatic protocol selection

**Configuration**:
```env
# Common
WORKDAY_API_URL=https://wd2-impl-services1.workday.com
WORKDAY_TENANT_ID=your_tenant_id
WORKDAY_PROTOCOL=rest  # or 'soap'

# SOAP (WS-Security)
WORKDAY_USERNAME=your_username
WORKDAY_PASSWORD=your_password

# REST (OAuth)
WORKDAY_CLIENT_ID=your_client_id
WORKDAY_CLIENT_SECRET=your_client_secret
WORKDAY_TOKEN_URL=https://wd2-impl-services1.workday.com/ccx/oauth2/token
```

**Example Delivery**:
```typescript
import { WorkdayConnector } from '@teei/impact-in/connectors/workday';

const connector = new WorkdayConnector({
  apiUrl: process.env.WORKDAY_API_URL,
  protocol: 'rest', // or 'soap'
  tenantId: process.env.WORKDAY_TENANT_ID,
  clientId: process.env.WORKDAY_CLIENT_ID,
  clientSecret: process.env.WORKDAY_CLIENT_SECRET,
  tokenUrl: process.env.WORKDAY_TOKEN_URL,
}, companyId);

const result = await connector.deliver({
  eventId: 'evt_123',
  companyId: 'company_456',
  userId: 'worker_789',
  eventType: 'volunteer_hours',
  timestamp: new Date().toISOString(),
  value: 10,
  unit: 'hours',
}, 'delivery_abc');
```

## Delivery Monitoring

### API Endpoints

#### GET `/api/deliveries/history`

Get delivery history for a company.

**Query Parameters**:
- `companyId` (required): Company UUID
- `platform` (optional): Filter by platform (benevity, goodera, workday)
- `limit` (optional): Results per page (default: 100, max: 500)
- `offset` (optional): Pagination offset (default: 0)

**Example**:
```bash
curl -X GET "https://api.teei.com/api/deliveries/history?companyId=company_123&platform=benevity&limit=50" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "data": {
    "deliveries": [
      {
        "id": "delivery_abc",
        "companyId": "company_123",
        "platform": "benevity",
        "status": "delivered",
        "retries": 1,
        "createdAt": "2025-01-15T10:30:00Z",
        "deliveredAt": "2025-01-15T10:30:05Z"
      }
    ],
    "total": 150,
    "limit": 50,
    "offset": 0
  }
}
```

#### POST `/api/deliveries/replay/:deliveryId`

Replay a failed delivery.

**Example**:
```bash
curl -X POST "https://api.teei.com/api/deliveries/replay/delivery_xyz" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

**Response**:
```json
{
  "success": true,
  "message": "Delivery replayed successfully",
  "data": {
    "deliveryId": "delivery_xyz",
    "status": "delivered",
    "retries": 2
  }
}
```

#### GET `/api/deliveries/stats`

Get delivery statistics.

**Query Parameters**:
- `companyId` (required): Company UUID
- `platform` (optional): Filter by platform
- `timeRange` (optional): 1h, 24h, 7d, 30d (default: 24h)

**Example Response**:
```json
{
  "success": true,
  "data": {
    "timeRange": "24h",
    "summary": {
      "total": 1000,
      "successful": 950,
      "failed": 45,
      "retrying": 5,
      "pending": 0,
      "successRate": "95.00%"
    },
    "byPlatform": {
      "benevity": { "total": 400, "successful": 385, "failed": 15 },
      "goodera": { "total": 350, "successful": 340, "failed": 10 },
      "workday": { "total": 250, "successful": 225, "failed": 20 }
    }
  }
}
```

## Webhook Integration

### Webhook Endpoints

#### POST `/webhooks/benevity`

Receive delivery status updates from Benevity.

**Headers**:
- `X-Benevity-Signature`: HMAC signature (`t=<timestamp>,v1=<signature>`)

**Verification**:
```typescript
import { createWebhookVerificationMiddleware } from '@teei/impact-in/lib/webhook-verifier';

app.post('/webhooks/benevity', {
  preHandler: createWebhookVerificationMiddleware('benevity', process.env.BENEVITY_WEBHOOK_SECRET)
}, async (request, reply) => {
  const event = request.body;
  // Process webhook event
  return { success: true };
});
```

#### POST `/webhooks/goodera`

Receive delivery status updates from Goodera.

**Headers**:
- `X-Goodera-Signature`: HMAC signature (`sha256=<signature>`)
- `X-Goodera-Request-Timestamp`: Unix timestamp

#### POST `/webhooks/workday`

Receive delivery status updates from Workday.

**Headers**:
- `X-Workday-Signature`: Base64-encoded HMAC signature
- `X-Workday-Request-Timestamp`: ISO 8601 timestamp

## Retry Strategy

All connectors implement exponential backoff:

```typescript
{
  maxAttempts: 3,
  initialDelayMs: 1000,    // 1 second
  maxDelayMs: 30000,       // 30 seconds
  backoffMultiplier: 2     // Double delay each retry
}
```

**Retry Schedule**:
1. Attempt 1: Immediate
2. Attempt 2: After 1 second
3. Attempt 3: After 2 seconds
4. Attempt 4: After 4 seconds (up to maxAttempts)

## Rate Limiting

### Per-Tenant Limits

Configured via `company_api_keys.rate_limit_per_minute`:

```typescript
{
  rateLimitPerMinute: 60  // Default: 60 requests/minute
}
```

### Platform-Specific Limits

- **Benevity**: 120 requests/minute (per API key)
- **Goodera**: 100 requests/minute (tracked via headers)
- **Workday**: 60 requests/minute (SOAP) / 120 requests/minute (REST)

## Monitoring & Metrics

### Prometheus Metrics

Exposed at `/metrics`:

```promql
# Total deliveries
impact_in_deliveries_total{platform="benevity",status="success"}

# Delivery failures
impact_in_delivery_failures_total{platform="goodera",error_type="NETWORK_ERROR"}

# Delivery duration
impact_in_delivery_duration_seconds{platform="workday",quantile="0.95"}

# Webhooks received
impact_in_webhooks_received_total{platform="benevity",verified="true"}

# Rate limit hits
impact_in_rate_limit_hits_total{platform="goodera",company_id="company_123"}
```

### Example Grafana Queries

**Success Rate**:
```promql
sum(rate(impact_in_deliveries_total{status="success"}[5m])) by (platform)
/
sum(rate(impact_in_deliveries_total[5m])) by (platform)
```

**P95 Latency**:
```promql
histogram_quantile(0.95, sum(rate(impact_in_delivery_duration_seconds_bucket[5m])) by (platform, le))
```

## Error Handling

### Error Types

- `NETWORK_ERROR`: Connection timeout or DNS failure
- `AUTH_ERROR`: Invalid credentials or expired token
- `RATE_LIMIT`: API rate limit exceeded
- `VALIDATION_ERROR`: Invalid payload format
- `SERVER_ERROR`: External platform returned 5xx error

### Error Logging

All errors are logged with context:

```json
{
  "level": "error",
  "message": "Goodera delivery failed",
  "eventId": "evt_123",
  "deliveryId": "delivery_abc",
  "error": "RATE_LIMIT",
  "statusCode": 429,
  "retryCount": 2,
  "companyId": "company_456"
}
```

## Security

### Secrets Management

Use AWS Secrets Manager or HashiCorp Vault:

```typescript
import { getSecretsVault } from '@teei/shared-utils/secrets-vault';

const vault = getSecretsVault();
const apiKey = await vault.getSecret('impact-in/benevity/api-key');
```

### Webhook Signature Verification

All webhook signatures are verified using constant-time comparison:

```typescript
import { WebhookVerifierFactory } from '@teei/impact-in/lib/webhook-verifier';

const result = WebhookVerifierFactory.verify(
  'benevity',
  webhookSecret,
  rawBody,
  headers
);

if (!result.verified) {
  throw new Error(`Webhook verification failed: ${result.reason}`);
}
```

### Tenant Isolation

All deliveries are tenant-scoped:

```typescript
// Middleware ensures user can only access their company's deliveries
const tenantContext = request.tenant;
const deliveries = await getDeliveryHistory(tenantContext.companyId);
```

## Troubleshooting

### Common Issues

**1. OAuth Token Expired**

Symptom: `401 Unauthorized` from Goodera/Workday REST
Solution: Token refreshes automatically. Check `oauth_token_refreshes_total` metric.

**2. Rate Limit Exceeded**

Symptom: `429 Too Many Requests`
Solution: Implement backoff or increase rate limit in company settings.

**3. Webhook Signature Mismatch**

Symptom: `401 Unauthorized` on webhook endpoint
Solution: Verify webhook secret matches platform configuration. Check timestamp tolerance (default: 300 seconds).

**4. SOAP Fault (Workday)**

Symptom: `500 Internal Server Error` with SOAP Fault
Solution: Check WS-Security credentials and tenant ID. Verify WSDL endpoint is accessible.

### Debug Mode

Enable debug logging:

```env
LOG_LEVEL=debug
```

View detailed logs:

```bash
# Filter by delivery ID
grep "delivery_abc" logs/impact-in.log

# Filter by platform
grep "platform=benevity" logs/impact-in.log
```

## Runbook

### Deployment Checklist

- [ ] Configure platform credentials in secrets vault
- [ ] Set up webhook endpoints and secrets
- [ ] Configure rate limits for each tenant
- [ ] Set up Prometheus scraping for `/metrics`
- [ ] Configure alerts for delivery failures > 2%
- [ ] Test connection to each platform
- [ ] Set up replay jobs for failed deliveries

### Rollback Procedure

1. Stop accepting new deliveries:
   ```bash
   kubectl scale deployment impact-in --replicas=0
   ```

2. Drain pending deliveries:
   ```bash
   curl -X POST /api/admin/drain-queue
   ```

3. Roll back deployment:
   ```bash
   kubectl rollout undo deployment/impact-in
   ```

4. Resume accepting deliveries:
   ```bash
   kubectl scale deployment impact-in --replicas=3
   ```

## Support

For issues or questions:
- **Documentation**: https://docs.teei.com/impact-in
- **Issues**: https://github.com/teei-platform/csr-platform/issues
- **Slack**: #impact-in-support
