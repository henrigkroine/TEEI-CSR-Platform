# Privacy Orchestrator Service

Production-grade Privacy/DSAR (Data Subject Access Request) Orchestrator for GDPR, CCPA, and other privacy regulations.

## Features

- **Multi-Region Execution**: Respects data residency requirements across EU, US, UK, APAC regions
- **SLA Tracking**: 95% of exports < 24 hours, deletions < 72 hours
- **Job Queue**: BullMQ-based queue with retries, DLQ, and priority handling
- **Audit Logging**: Immutable audit trail for all privacy operations
- **PII Protection**: Encryption at rest and in transit, redaction for exports
- **Consent Management**: GDPR-compliant consent tracking and withdrawal
- **Metrics & Monitoring**: Prometheus metrics, Grafana dashboards, Sentry error tracking

## API Endpoints

### Export User Data
```bash
POST /privacy/export
{
  "userId": "uuid",
  "requestedBy": "uuid",
  "region": "EU",
  "email": "user@example.com",
  "priority": 5
}
```

**Response**: 202 Accepted
```json
{
  "success": true,
  "jobId": "uuid",
  "message": "Export request accepted",
  "estimatedCompletion": "24 hours"
}
```

### Delete User Data
```bash
POST /privacy/delete
{
  "userId": "uuid",
  "requestedBy": "uuid",
  "reason": "User requested account deletion",
  "region": "EU",
  "immediate": false
}
```

**Response**: 202 Accepted
```json
{
  "success": true,
  "jobId": "uuid",
  "message": "Deletion request accepted. Data will be deleted 30 days",
  "gracePeriodEnds": "2024-12-15T00:00:00Z",
  "cancelUrl": "/privacy/delete/{jobId}/cancel"
}
```

### Check Status
```bash
GET /privacy/status/:jobId
```

**Response**: 200 OK
```json
{
  "success": true,
  "jobId": "uuid",
  "status": "COMPLETED",
  "progress": 100,
  "createdAt": "2024-11-15T10:00:00Z",
  "completedAt": "2024-11-15T11:00:00Z",
  "result": {
    "exportUrl": "https://storage.teei.com/exports/...",
    "signature": "sha256:..."
  }
}
```

### Update Consent
```bash
POST /privacy/consent
{
  "userId": "uuid",
  "consentType": "marketing",
  "status": "granted",
  "legalBasis": "consent"
}
```

### Get Consent Status
```bash
GET /privacy/consent/:userId
```

### Metrics
```bash
GET /privacy/metrics/sla    # SLA compliance metrics
GET /privacy/metrics/queue  # Job queue metrics
```

## Architecture

```
┌─────────────────┐
│  Fastify API    │
│  + Rate Limit   │
│  + Auth         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Queue Manager  │
│  (BullMQ)       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Regional        │
│ Executor        │
│ (EU/US/UK)      │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌────────┐
│  DB    │ │Storage │
│ Region │ │ Region │
└────────┘ └────────┘
```

## Regional Execution

The service automatically routes requests to the correct regional database and storage based on data residency requirements:

- **EU**: GDPR compliance, data stored in EU datacenters
- **US**: CCPA compliance, data stored in US datacenters
- **UK**: UK GDPR compliance, data stored in UK datacenters
- **APAC**: APAC regulations, data stored in APAC datacenters

## SLA Configuration

Default SLAs (configurable via environment variables):

- **Export**: 24 hours
- **Delete**: 72 hours (after 30-day grace period)
- **Status**: 5 seconds
- **Consent**: 2 seconds

## Job Queue

Jobs are processed asynchronously with:

- **Priority levels**: LOW (1), NORMAL (5), HIGH (10), URGENT (20)
- **Retries**: 3 attempts with exponential backoff
- **DLQ**: Failed jobs moved to dead-letter queue
- **Concurrency**: 10 concurrent jobs
- **Rate limit**: 100 jobs/minute

## Development

```bash
# Install dependencies
pnpm install

# Start in development mode
pnpm dev

# Build
pnpm build

# Run tests
pnpm test

# Start production
pnpm start
```

## Environment Variables

See `.env.example` for all configuration options.

## Deployment

### Docker
```bash
docker build -t privacy-orchestrator .
docker run -p 3010:3010 --env-file .env privacy-orchestrator
```

### Kubernetes
```bash
kubectl apply -f k8s/base/privacy-orchestrator/
```

## Monitoring

Metrics are exposed at:
- **Prometheus**: `/metrics`
- **Health**: `/privacy/health`
- **SLA Dashboard**: Grafana dashboard at `observability/grafana/dashboards/privacy-sla.json`

## Compliance

This service implements:
- **GDPR** Articles 15, 16, 17, 20 (Access, Rectification, Erasure, Portability)
- **CCPA** Right to Know, Right to Delete
- **UK GDPR** Data Subject Rights
- **APAC** Privacy regulations (PDPA, etc.)

## Security

- **Encryption**: AES-256-GCM for PII at rest
- **TLS**: All inter-service communication over TLS
- **Audit Logging**: Immutable audit trail for all operations
- **Access Control**: RBAC with role-based permissions
- **Rate Limiting**: 100 req/min per IP
- **Input Validation**: Zod schema validation for all inputs

## License

Proprietary - TEEI CSR Platform
