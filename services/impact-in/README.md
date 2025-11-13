# Impact-In Service

The Impact-In service delivers TEEI program impact data to external CSR platforms (Benevity, Goodera, Workday). It provides outbound connectors with feature flags, delivery logging, rate limiting, and retry mechanisms.

## Features

- **Multi-Platform Connectors**: Benevity, Goodera, and Workday integrations
- **Feature Flags**: Company-level and environment-level feature toggles
- **Delivery Tracking**: Comprehensive audit trail with payload hashing
- **Retry Logic**: Automatic retry with exponential backoff
- **Rate Limiting**: 100 requests/minute with 429 responses
- **Mock Mode**: Testing without external API calls
- **Deduplication**: SHA-256 hashing prevents duplicate deliveries

## Architecture

```
Impact-In Service (Port 3008)
├── Connectors
│   ├── Benevity (OAuth Bearer)
│   ├── Goodera (API Key, batching)
│   └── Workday (OAuth 2.0)
├── Delivery Log (Postgres)
├── Feature Flags (DB + Env)
└── Rate Limiter (Fastify)
```

## API Endpoints

### Delivery

**POST** `/impact-in/deliver/:platform/:companyId`

Trigger delivery to a platform (benevity, goodera, workday).

**Request Body:**
```json
{
  "metrics": {
    "companyId": "uuid",
    "periodStart": "2024-01-01T00:00:00Z",
    "periodEnd": "2024-01-31T23:59:59Z",
    "participantsCount": 100,
    "volunteersCount": 50,
    "volunteerHours": 200,
    "sessionsCount": 75,
    "avgIntegrationScore": 0.85,
    "avgLanguageLevel": 7.5,
    "avgJobReadiness": 0.78
  },
  "organizationId": "external-org-id",
  "programId": "program-123",
  "programName": "Integration Program"
}
```

**Response:**
```json
{
  "success": true,
  "deliveryId": "uuid",
  "platform": "benevity",
  "transactionId": "txn-abc123",
  "message": "Impact data sent successfully"
}
```

### Delivery History

**GET** `/impact-in/deliveries/:companyId?platform=benevity&limit=50`

Get delivery audit trail for a company.

**Response:**
```json
{
  "companyId": "uuid",
  "platform": "benevity",
  "count": 10,
  "deliveries": [
    {
      "id": "uuid",
      "companyId": "uuid",
      "platform": "benevity",
      "status": "delivered",
      "deliveredAt": "2024-02-01T10:30:00Z",
      "retries": 0,
      "createdAt": "2024-02-01T10:29:55Z"
    }
  ]
}
```

### Replay Failed Delivery

**POST** `/impact-in/replay/:deliveryId`

Retry a failed delivery (max 3 retries).

**Response:**
```json
{
  "success": true,
  "deliveryId": "uuid",
  "platform": "goodera",
  "retries": 2,
  "message": "Delivery replayed successfully"
}
```

### Feature Flags

**GET** `/impact-in/features/:companyId`

Get feature flags for a company.

**Response:**
```json
{
  "companyId": "uuid",
  "flags": {
    "environment": {
      "benevity": true,
      "goodera": false,
      "workday": true
    },
    "company": {
      "benevity": true,
      "goodera": true
    },
    "effective": {
      "benevity": true,
      "goodera": true,
      "workday": true
    }
  }
}
```

**POST** `/impact-in/features/:companyId`

Update company feature flags.

**Request Body:**
```json
{
  "benevity": true,
  "goodera": false,
  "workday": true
}
```

**DELETE** `/impact-in/features/:companyId`

Reset company flags to environment defaults.

### Health Check

**GET** `/health`

Service health status.

## Configuration

### Environment Variables

```bash
# Service
PORT_IMPACT_IN=3008
DATABASE_URL=postgres://localhost:5432/teei
CORS_ORIGIN=*

# Benevity
BENEVITY_API_KEY=your-api-key
BENEVITY_WEBHOOK_URL=https://api.benevity.com/v1/impact
BENEVITY_MOCK_MODE=false

# Goodera
GOODERA_API_KEY=your-api-key
GOODERA_API_URL=https://api.goodera.com/v1
GOODERA_MOCK_MODE=false

# Workday
WORKDAY_CLIENT_ID=your-client-id
WORKDAY_CLIENT_SECRET=your-client-secret
WORKDAY_TENANT_ID=your-tenant-id
WORKDAY_API_URL=https://api.workday.com
WORKDAY_MOCK_MODE=false

# Feature Flags (global defaults)
IMPACT_IN_BENEVITY_ENABLED=false
IMPACT_IN_GOODERA_ENABLED=false
IMPACT_IN_WORKDAY_ENABLED=false
```

## Database Schema

### impact_deliveries

Tracks all delivery attempts:

```sql
CREATE TABLE impact_deliveries (
  id UUID PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  platform ENUM('benevity', 'goodera', 'workday'),
  payload_hash VARCHAR(64),  -- SHA-256
  payload_sample JSONB,      -- Truncated payload
  status ENUM('pending', 'delivered', 'failed', 'retrying'),
  retries INTEGER DEFAULT 0,
  error_msg TEXT,
  delivered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### companies.features

Feature flags stored as JSONB:

```json
{
  "impactIn": {
    "benevity": true,
    "goodera": false,
    "workday": true
  }
}
```

## Development

### Install Dependencies

```bash
pnpm install
```

### Run in Development Mode

```bash
pnpm dev
```

### Run Tests

```bash
pnpm test
```

### Build for Production

```bash
pnpm build
pnpm start
```

## Testing

### Mock Mode

Enable mock mode to test without external APIs:

```bash
BENEVITY_MOCK_MODE=true
GOODERA_MOCK_MODE=true
WORKDAY_MOCK_MODE=true
```

### Manual Testing

Use the provided `test.http` file with the REST Client extension in VS Code, or use curl:

```bash
curl -X POST http://localhost:3008/impact-in/deliver/benevity/{companyId} \
  -H "Content-Type: application/json" \
  -d @sample-payload.json
```

## Error Handling

### 400 Bad Request
- Invalid platform
- Invalid request body
- Company ID mismatch

### 403 Forbidden
- Platform not enabled for company

### 409 Conflict
- Duplicate delivery (same payload hash already delivered)

### 429 Too Many Requests
- Rate limit exceeded (100 req/min)
- Includes `Retry-After` header

### 500 Internal Server Error
- External API error
- Database error

## Retry Strategy

1. Max 3 retries per delivery
2. Exponential backoff: 1s, 2s, 4s
3. Manual replay available via `/replay/:deliveryId`
4. Delivery status: `pending` → `retrying` → `delivered`/`failed`

## Rate Limiting

- Global: 100 requests/minute per IP
- Goodera client: 600ms between requests (100 req/min)
- Returns 429 with `Retry-After` header

## Deduplication

- SHA-256 hash of payload computed before delivery
- Checks against delivered payloads for same company/platform
- Returns 409 Conflict if duplicate detected

## Platform-Specific Notes

### Benevity
- Bearer token authentication
- Webhook-based delivery
- Supports outcome scores

### Goodera
- API key authentication
- Batch support (max 100 records)
- Impact dimensions mapping

### Workday
- OAuth 2.0 client credentials
- Token auto-refresh (1 hour expiry)
- Volunteer activities + program enrollments

## Documentation

- [Benevity API Spec](../../docs/impact_in/benevity_spec.md)
- [Goodera API Spec](../../docs/impact_in/goodera_spec.md)
- [Workday API Spec](../../docs/impact_in/workday_spec.md)

## Support

For issues or questions:
- Platform Architecture: `docs/Platform_Architecture.md`
- Team: Worker 2 - Connectors Lead
- Slack: #teei-impact-in
