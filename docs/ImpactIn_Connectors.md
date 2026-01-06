# Impact-In Connectors Integration Guide

**Service**: Impact-In
**Version**: 1.0.0
**Last Updated**: 2025-11-14
**Ref**: MULTI_AGENT_PLAN.md § Worker 2/Integrations Lead

---

## Overview

The Impact-In service delivers impact data from the TEEI platform to external Corporate Social Responsibility (CSR) platforms. It supports three major providers:

1. **Benevity** - API key + HMAC signature authentication
2. **Goodera** - OAuth 2.0 client credentials flow
3. **Workday** - SOAP (legacy) or REST (modern) endpoints

### Key Features

- ✅ **Idempotency** - Prevents duplicate deliveries using `deliveryId`
- ✅ **Retry Logic** - Exponential backoff with jitter for transient failures
- ✅ **Request Signing** - HMAC-SHA256 signatures for Benevity
- ✅ **OAuth Token Management** - Automatic token refresh for Goodera/Workday
- ✅ **Delivery Tracking** - Full audit log with status, attempts, and errors
- ✅ **Manual Replay** - UI-driven retry for failed deliveries
- ✅ **Rate Limit Handling** - Respects provider rate limits (Goodera: 100 req/min)

---

## Architecture

```
┌─────────────────┐
│  TEEI Platform  │
│  (Internal)     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│     Impact-In Service           │
│  ┌──────────────────────────┐   │
│  │  Delivery Log Database   │   │
│  │  (impact_deliveries)     │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │  Benevity Connector      │   │
│  │  (HMAC Signature)        │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │  Goodera Connector       │   │
│  │  (OAuth 2.0)             │   │
│  └──────────────────────────┘   │
│  ┌──────────────────────────┐   │
│  │  Workday Connector       │   │
│  │  (SOAP/REST)             │   │
│  └──────────────────────────┘   │
└───────┬─────┬─────┬─────────────┘
        │     │     │
        ▼     ▼     ▼
    Benevity Goodera Workday
    (External Platforms)
```

---

## Provider Configuration

### 1. Benevity

**Authentication**: API Key + HMAC-SHA256 Signature

#### Environment Variables
```bash
BENEVITY_API_URL=https://api.benevity.com
BENEVITY_API_KEY=your_api_key_here
BENEVITY_SIGNATURE_SECRET=your_signature_secret_here
```

#### Obtaining Credentials
1. Log in to Benevity dashboard
2. Navigate to **API Settings**
3. Copy **API Key**
4. Navigate to **Webhooks** → **Signing Secret**
5. Copy **Signature Secret**

#### Schema Version
- **v1.0** - Current schema version
- Endpoint: `POST /api/v1/impact-events`

#### Request Headers
```http
Content-Type: application/json
X-API-Key: {api_key}
X-Benevity-Signature: {hmac_sha256_hex}
X-Idempotency-Key: {delivery_id}
```

#### Payload Example
```json
{
  "schema_version": "v1.0",
  "event": {
    "id": "evt_123",
    "type": "volunteer_hours",
    "timestamp": "2025-11-14T10:00:00Z",
    "user": {
      "external_id": "user_456",
      "company_id": "company_789"
    },
    "impact": {
      "value": 5.0,
      "unit": "hours",
      "metadata": {
        "program": "buddy_mentoring"
      }
    }
  }
}
```

---

### 2. Goodera

**Authentication**: OAuth 2.0 Client Credentials Flow

#### Environment Variables
```bash
GOODERA_API_URL=https://api.goodera.com
GOODERA_TOKEN_URL=https://api.goodera.com/oauth/token
GOODERA_CLIENT_ID=your_client_id_here
GOODERA_CLIENT_SECRET=your_client_secret_here
```

#### Obtaining Credentials
1. Log in to Goodera dashboard
2. Navigate to **API Credentials**
3. Create new **OAuth 2.0 Client**
4. Copy **Client ID** and **Client Secret**

#### Schema Version
- **v2.1** - Current schema version
- Endpoint: `POST /v2/events/impact`
- Rate Limit: **100 requests/minute**

#### OAuth Flow
```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=client_credentials&
client_id={client_id}&
client_secret={client_secret}
```

Response:
```json
{
  "access_token": "eyJ...",
  "token_type": "Bearer",
  "expires_in": 3600,
  "refresh_token": "ref_..."
}
```

Tokens are automatically stored in `impact_provider_tokens` table and refreshed when expired.

#### Request Headers
```http
Content-Type: application/json
Authorization: Bearer {access_token}
X-Idempotency-Key: {delivery_id}
```

#### Payload Example
```json
{
  "schema_version": "v2.1",
  "event": {
    "external_id": "evt_123",
    "event_type": "volunteer_hours",
    "timestamp": "2025-11-14T10:00:00Z",
    "participant": {
      "external_user_id": "user_456"
    },
    "impact": {
      "dimensions": [
        {
          "dimension_name": "community_engagement",
          "score": 0.85,
          "scale": "normalized_0_1"
        },
        {
          "dimension_name": "skill_development",
          "score": 0.72,
          "scale": "normalized_0_1"
        }
      ],
      "metadata": {
        "program": "buddy_mentoring"
      }
    }
  }
}
```

**Note**: Outcome scores from Q2Q AI are automatically mapped to Goodera's "impact dimensions".

---

### 3. Workday

**Authentication**: SOAP (WS-Security) or REST (OAuth 2.0)

#### Environment Variables (SOAP Mode)
```bash
WORKDAY_API_URL=https://wd2-impl-services1.workday.com
WORKDAY_TENANT_ID=your_tenant_id
WORKDAY_PROTOCOL=soap
WORKDAY_USERNAME=your_username
WORKDAY_PASSWORD=your_password
```

#### Environment Variables (REST Mode)
```bash
WORKDAY_API_URL=https://wd2-impl-services1.workday.com
WORKDAY_TENANT_ID=your_tenant_id
WORKDAY_PROTOCOL=rest
WORKDAY_CLIENT_ID=your_client_id
WORKDAY_CLIENT_SECRET=your_client_secret
WORKDAY_TOKEN_URL=https://wd2-impl-services1.workday.com/ccx/oauth2/token
```

#### Obtaining Credentials

**SOAP Mode**:
1. Log in to Workday as Administrator
2. Navigate to **System** → **Security** → **User Accounts**
3. Create Integration System User
4. Assign **CSR_Impact_Report** domain permissions

**REST Mode**:
1. Navigate to **System** → **API Clients**
2. Create new **OAuth 2.0 Client**
3. Grant **CSR Impact Reports** scope
4. Copy **Client ID** and **Client Secret**

#### Schema Version
- **v3.0** - CSR Impact Report format
- SOAP Endpoint: `/ccx/service/{tenant_id}/CSR_Impact_Report`
- REST Endpoint: `/api/v1/{tenant_id}/csr-impact-reports`

#### SOAP Request Example
```xml
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/"
               xmlns:wd="urn:com.workday/bsvc">
  <soap:Header>
    <wsse:Security xmlns:wsse="...">
      <wsse:UsernameToken>
        <wsse:Username>{username}</wsse:Username>
        <wsse:Password Type="...">{password}</wsse:Password>
      </wsse:UsernameToken>
    </wsse:Security>
  </soap:Header>
  <soap:Body>
    <wd:Submit_CSR_Impact_Report>
      <wd:CSR_Impact_Report>
        <wd:External_Reference_ID>evt_123</wd:External_Reference_ID>
        <wd:Report_Date>2025-11-14</wd:Report_Date>
        <wd:Worker_Reference>
          <wd:ID wd:type="Employee_ID">user_456</wd:ID>
        </wd:Worker_Reference>
        <wd:CSR_Activity>
          <wd:Activity_Type>Volunteer Hours</wd:Activity_Type>
          <wd:Value>5.0</wd:Value>
          <wd:Unit_of_Measure>Hours</wd:Unit_of_Measure>
        </wd:CSR_Activity>
      </wd:CSR_Impact_Report>
    </wd:Submit_CSR_Impact_Report>
  </soap:Body>
</soap:Envelope>
```

#### REST Request Example
```http
POST /api/v1/{tenant_id}/csr-impact-reports
Authorization: Bearer {access_token}
Content-Type: application/json
X-Idempotency-Key: {delivery_id}

{
  "schema_version": "v3.0",
  "impact_report": {
    "external_reference_id": "evt_123",
    "report_date": "2025-11-14T10:00:00Z",
    "worker": {
      "worker_id": "user_456"
    },
    "csr_activity": {
      "activity_type": "volunteer_hours",
      "value": 5.0,
      "unit_of_measure": "Hours"
    }
  }
}
```

---

## API Endpoints

### Base URL
```
http://localhost:3007/v1/impact-in
```

### 1. Trigger Delivery (Not Yet Implemented - Internal Use)
```http
POST /v1/impact-in/deliver
Content-Type: application/json

{
  "companyId": "uuid",
  "provider": "benevity" | "goodera" | "workday",
  "event": {
    "eventId": "string",
    "userId": "string",
    "eventType": "string",
    "timestamp": "ISO8601",
    "value": 0,
    "unit": "string",
    "outcomeScores": {},
    "metadata": {}
  }
}
```

### 2. List Deliveries
```http
GET /v1/impact-in/deliveries?companyId={uuid}&provider=benevity&status=success&page=1&limit=20

Response:
{
  "data": [
    {
      "id": "uuid",
      "companyId": "uuid",
      "provider": "benevity",
      "deliveryId": "uuid",
      "status": "success",
      "attemptCount": 1,
      "deliveredAt": "2025-11-14T10:05:00Z",
      "createdAt": "2025-11-14T10:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5,
    "hasNext": true,
    "hasPrev": false
  }
}
```

### 3. Get Single Delivery
```http
GET /v1/impact-in/deliveries/{id}

Response:
{
  "data": {
    "id": "uuid",
    "companyId": "uuid",
    "provider": "goodera",
    "deliveryId": "uuid",
    "payload": {...},
    "status": "success",
    "attemptCount": 2,
    "providerResponse": {...},
    "deliveredAt": "2025-11-14T10:05:00Z",
    "createdAt": "2025-11-14T10:00:00Z",
    "updatedAt": "2025-11-14T10:05:00Z"
  }
}
```

### 4. Get Delivery Statistics
```http
GET /v1/impact-in/stats?companyId={uuid}&startDate=2025-11-01&endDate=2025-11-30

Response:
{
  "data": {
    "overall": {
      "total": 500,
      "successful": 480,
      "failed": 15,
      "pending": 3,
      "retrying": 2
    },
    "byProvider": [
      {
        "provider": "benevity",
        "status": "success",
        "count": 200,
        "avgAttempts": 1.02
      },
      {
        "provider": "goodera",
        "status": "success",
        "count": 180,
        "avgAttempts": 1.15
      },
      {
        "provider": "workday",
        "status": "success",
        "count": 100,
        "avgAttempts": 1.05
      }
    ]
  }
}
```

### 5. Replay Single Delivery
```http
POST /v1/impact-in/deliveries/{id}/replay

Response:
{
  "success": true,
  "message": "Delivery replayed successfully",
  "newStatus": "success"
}
```

### 6. Bulk Replay Deliveries
```http
POST /v1/impact-in/deliveries/bulk-replay
Content-Type: application/json

{
  "ids": ["uuid1", "uuid2", "uuid3"]
}

Response:
{
  "summary": {
    "total": 3,
    "successful": 2,
    "failed": 1
  },
  "results": [
    { "id": "uuid1", "success": true, "newStatus": "success" },
    { "id": "uuid2", "success": true, "newStatus": "success" },
    { "id": "uuid3", "success": false, "error": "Rate limit exceeded" }
  ]
}
```

### 7. Retry All Failed Deliveries
```http
POST /v1/impact-in/deliveries/retry-all-failed
Content-Type: application/json

{
  "companyId": "uuid",
  "provider": "benevity"  // optional
}

Response:
{
  "summary": {
    "total": 10,
    "successful": 8,
    "failed": 2
  },
  "results": [...]
}
```

---

## Error Handling

### Retryable Errors
- Network timeouts (ETIMEDOUT, ECONNRESET)
- HTTP 429 (Rate Limit)
- HTTP 503, 504 (Service Unavailable)

**Retry Strategy**:
- Max Attempts: 3
- Initial Delay: 1 second
- Max Delay: 30 seconds
- Backoff Multiplier: 2x
- Jitter: ±10%

### Permanent Errors (No Retry)
- HTTP 400 (Bad Request)
- HTTP 401 (Unauthorized)
- HTTP 403 (Forbidden)
- HTTP 404 (Not Found)

All errors are logged to `impact_deliveries.last_error` for debugging.

---

## Idempotency

Each delivery uses a unique `deliveryId` (UUID) as an idempotency key. Providers must respect this key to prevent duplicate processing.

**Implementation**:
- Benevity: `X-Idempotency-Key` header
- Goodera: `X-Idempotency-Key` header
- Workday: `X-Idempotency-Key` header

If a delivery fails and is replayed, the same `deliveryId` is used to ensure providers can deduplicate.

---

## Security Considerations

1. **Credentials Storage**
   All API keys, secrets, and OAuth tokens are stored in environment variables or database (encrypted at rest).

2. **HMAC Signature Verification (Benevity)**
   Prevents tampering of requests. Signature is computed as:
   ```
   HMAC-SHA256(JSON.stringify(payload), secret)
   ```

3. **OAuth Token Refresh**
   Tokens are automatically refreshed before expiration. Refresh tokens are securely stored in `impact_provider_tokens` table.

4. **Rate Limiting**
   Goodera enforces 100 req/min. Connector tracks rate limits via `X-RateLimit-Remaining` headers and respects `Retry-After`.

5. **Audit Trail**
   All deliveries are logged with full payloads, responses, and timestamps for compliance and debugging.

---

## Monitoring & Observability

### Health Endpoints
- `GET /health` - Overall service health
- `GET /health/liveness` - Kubernetes liveness probe
- `GET /health/readiness` - Kubernetes readiness probe

### Metrics (Future)
- `impact_in_deliveries_total{provider, status}` - Total deliveries
- `impact_in_delivery_duration_seconds{provider}` - Delivery latency
- `impact_in_retry_count{provider}` - Retry attempts

### Logs
All logs include:
- `deliveryId` - Unique delivery identifier
- `provider` - Target platform
- `eventId` - Original event identifier
- `status` - Current delivery status
- `attemptCount` - Number of attempts

---

## Troubleshooting

### Issue: Delivery stuck in "pending" status
**Cause**: Service not processing deliveries (internal trigger not implemented yet)
**Solution**: Manually replay via API or implement internal delivery trigger

### Issue: "Invalid signature" error (Benevity)
**Cause**: Incorrect `BENEVITY_SIGNATURE_SECRET`
**Solution**: Verify secret from Benevity dashboard matches `.env`

### Issue: "Token expired" error (Goodera/Workday)
**Cause**: OAuth token not refreshed
**Solution**: Check `impact_provider_tokens` table and verify token refresh logic

### Issue: Rate limit exceeded (Goodera)
**Cause**: Exceeding 100 req/min
**Solution**: Connector automatically respects rate limits; wait for reset

### Issue: SOAP fault (Workday)
**Cause**: Invalid credentials or malformed SOAP envelope
**Solution**:
- Verify `WORKDAY_USERNAME` and `WORKDAY_PASSWORD`
- Check tenant ID is correct
- Review SOAP fault details in `last_error` field

---

## Testing

See `/reports/impactin_cert_pack.md` for comprehensive certification test results.

### Manual Testing

1. **Test Benevity Connector**:
```bash
curl -X POST http://localhost:3007/v1/impact-in/deliveries/{id}/replay
```

2. **Verify Delivery Log**:
```bash
curl http://localhost:3007/v1/impact-in/deliveries?provider=benevity&status=success
```

3. **Check Statistics**:
```bash
curl http://localhost:3007/v1/impact-in/stats?companyId={uuid}
```

---

## Future Enhancements

1. **Scheduled Deliveries** - Cron-based batch delivery jobs
2. **Webhook Callbacks** - Receive delivery confirmations from providers
3. **Provider Health Checks** - Periodic connectivity tests
4. **Delivery Priority Queue** - Prioritize urgent deliveries
5. **Advanced Filtering** - Date ranges, error types, metadata search

---

## Support

For issues or questions:
- Internal: Contact Integrations Lead
- External: Consult provider documentation
  - [Benevity API Docs](https://developer.benevity.com)
  - [Goodera API Docs](https://developer.goodera.com)
  - [Workday API Docs](https://community.workday.com/developer)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-14
**Maintained By**: Integrations Lead (Worker 2)
