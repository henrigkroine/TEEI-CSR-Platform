# TEEI API Endpoints

**Last Updated**: 2025-01-27  
**API Version**: v1  
**Total Endpoints**: 100+

---

## API Gateway

**Base URL**: `http://localhost:3017` (dev)  
**Production**: ❓ Unknown

### Gateway Endpoints

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/` | No | Gateway information |
| GET | `/health` | No | Gateway health check |
| GET | `/health/all` | No | Check all services health |
| GET | `/v1/trust/*` | No | Trust center endpoints |
| GET | `/v1/status/*` | No | Status endpoints |
| POST | `/v1/privacy/*` | Yes | Privacy request endpoints |

**Features**:
- JWT authentication (HS256, upgrading to RS256)
- Rate limiting: 100 requests/minute
- CORS support
- Request/response logging
- Reverse proxy to services

---

## Corporate Cockpit API (Astro App)

**Base URL**: `http://localhost:4327` (dev)

### Authentication

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/login` | No | User login |
| POST | `/api/logout` | Session | User logout |
| POST | `/api/forgot-password` | No | Password reset |

### Campaigns

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/campaigns` | Session | List campaigns |
| POST | `/api/campaigns/[id]/transition` | Session | Transition campaign status |

### Demo

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/demo/metrics` | No | Demo metrics data |
| GET | `/api/demo/status` | No | Demo status |

### Server-Sent Events

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/sse/dashboard` | Session | Real-time dashboard updates |

---

## Reporting Service

**Base URL**: `http://localhost:4017` (dev)  
**Gateway Path**: `/v1/reporting/*`

### Report Generation

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/v1/gen-reports/generate` | Yes | Generate AI report with citations |
| GET | `/v1/gen-reports/cost-summary` | Yes | Get LLM cost summary |
| GET | `/companies/:id/gen-reports` | Yes | List generated reports for company |

### Export

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/export/csrd` | Yes | Export CSRD data (CSV/JSON) |
| POST | `/v1/export/pdf` | Yes | Export report to PDF |
| GET | `/v1/export/pdf/:reportId/preview` | Yes | Preview PDF metadata |

### Trust & Evidence

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/trust/v1/evidence/:reportId` | Yes | Get evidence lineage |
| GET | `/trust/v1/ledger/:reportId` | Yes | Get integrity ledger |
| GET | `/trust/v1/policies` | Yes | Get retention/residency policies |

### Campaign Dashboard

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/campaigns/:id/dashboard` | Yes | Get campaign dashboard (all metrics) |
| GET | `/api/campaigns/:id/time-series` | Yes | Get campaign time-series data |
| GET | `/api/campaigns/:id/capacity` | Yes | Get campaign capacity metrics |
| GET | `/api/campaigns/:id/financials` | Yes | Get campaign financial metrics |
| GET | `/api/campaigns/:id/volunteers` | Yes | Get campaign volunteer leaderboard |
| GET | `/api/campaigns/:id/impact` | Yes | Get campaign impact summary |

### Server-Sent Events

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/api/sse/dashboard` | Session | SSE connection for dashboard updates |
| GET | `/api/sse/stream` | Session | SSE connection for real-time updates |

### Compliance

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/compliance/alerts` | Yes | Get compliance alerts |

### Regulatory Packs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/v1/regulatory/packs` | Yes | Generate regulatory pack |
| GET | `/v1/regulatory/packs/:packId` | Yes | Get pack status |
| GET | `/v1/regulatory/packs/:packId/export` | Yes | Export pack (PDF/PPTX) |

### Companies

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/companies` | Yes | List companies |
| GET | `/companies/:id` | Yes | Get company details |

### Saved Views

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/saved-views` | Yes | List saved views |
| POST | `/saved-views` | Yes | Create saved view |
| GET | `/saved-views/:id` | Yes | Get saved view |
| PUT | `/saved-views/:id` | Yes | Update saved view |
| DELETE | `/saved-views/:id` | Yes | Delete saved view |

---

## Analytics Service

**Base URL**: `http://localhost:3023` (dev)  
**Gateway Path**: `/v1/analytics/*`

### Analytics APIs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/analytics/trends` | Yes | Time-series trends |
| GET | `/v1/analytics/cohorts` | Yes | Cohort comparisons |
| GET | `/v1/analytics/funnels` | Yes | Conversion funnels |
| GET | `/v1/analytics/benchmarks` | Yes | Industry/region/size benchmarks |
| GET | `/v1/analytics/metrics/company/:companyId/history` | Yes | Historical metrics for forecasting |
| GET | `/v1/analytics/tiles/:tileType` | Yes | Impact tiles (language, mentorship, upskilling, weei) |
| GET | `/v1/analytics/tiles` | Yes | All impact tiles for a company |

### Audit APIs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/audit/events` | Yes | Query audit events with filters |
| GET | `/v1/audit/events/:id` | Yes | Get single audit event by ID |
| GET | `/v1/audit/timeline` | Yes | Timeline aggregation for heatmap |
| GET | `/v1/audit/stats` | Yes | Audit statistics |
| POST | `/v1/audit/export` | Yes | Create compliance export bundle (ZIP) |

### FinOps APIs

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/analytics/finops/costs` | Yes | Query costs with filtering and grouping |
| GET | `/v1/analytics/finops/costs/summary` | Yes | Cost summary for dashboard |
| GET | `/v1/analytics/finops/costs/top-drivers` | Yes | Top cost drivers |
| GET | `/v1/analytics/finops/costs/by-model` | Yes | Costs by AI model |
| GET | `/v1/analytics/finops/costs/by-region` | Yes | Costs by region |
| GET | `/v1/analytics/finops/costs/by-service` | Yes | Costs by service |
| GET | `/v1/analytics/finops/forecast` | Yes | Cost forecast |
| GET | `/v1/analytics/finops/anomalies` | Yes | Cost anomalies |
| POST | `/v1/analytics/finops/aggregate` | Yes | Trigger cost aggregation |

---

## Unified Profile Service

**Base URL**: `http://localhost:3018` (dev)  
**Gateway Path**: `/v1/profile/*`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/profile/:id` | Yes | Get aggregated user profile |
| PUT | `/v1/profile/:id` | Yes | Update user profile |
| POST | `/v1/profile/mapping` | Yes | Create external ID mapping |
| GET | `/v1/profile/:id/completeness` | Yes | Get profile completeness score |
| GET | `/v1/profile/:id/journey` | Yes | Get journey flags |

---

## Kintell Connector

**Base URL**: `http://localhost:3027` (dev)  
**Gateway Path**: `/v1/kintell/*`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/v1/import/sessions` | Yes | Import session data from CSV |
| POST | `/v1/webhooks/session-scheduled` | Webhook | Webhook for scheduled sessions |
| POST | `/v1/webhooks/session-completed` | Webhook | Webhook for completed sessions |
| GET | `/v1/import/status/:batchId` | Yes | Get import batch status |

**Event Emissions**:
- `kintell.session.scheduled`
- `kintell.session.completed`
- `kintell.rating.created`

---

## Buddy Service

**Base URL**: `http://localhost:3019` (dev)  
**Gateway Path**: `/v1/buddy/*`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/v1/buddy/matches` | Yes | Create buddy match |
| GET | `/v1/buddy/matches/:id` | Yes | Get match details |
| GET | `/v1/buddy/matches` | Yes | List matches |
| POST | `/v1/buddy/events` | Yes | Create buddy event |
| POST | `/v1/buddy/checkins` | Yes | Submit check-in |
| POST | `/v1/buddy/feedback` | Yes | Submit feedback |

---

## Impact-In Service

**Base URL**: `http://localhost:3007` (dev)  
**Gateway Path**: `/v1/impact-in/*`

### Outbound Delivery

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/v1/impact-in/deliveries` | Yes | List deliveries |
| GET | `/v1/impact-in/deliveries/:id` | Yes | Get delivery details |
| POST | `/v1/impact-in/deliveries/:id/replay` | Yes | Replay single delivery |
| POST | `/v1/impact-in/deliveries/bulk-replay` | Yes | Bulk replay deliveries |
| POST | `/v1/impact-in/deliveries/retry-all-failed` | Yes | Retry all failed deliveries |
| GET | `/v1/impact-in/stats` | Yes | Delivery statistics |

### Inbound Ingestion

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/v1/ingest/benevity/volunteers` | Yes | Ingest Benevity volunteers |
| POST | `/v1/ingest/benevity/donations` | Yes | Ingest Benevity donations |
| POST | `/v1/ingest/goodera/volunteers` | Yes | Ingest Goodera volunteers |
| POST | `/v1/ingest/goodera/donations` | Yes | Ingest Goodera donations |
| POST | `/v1/ingest/workday/directory` | Yes | Ingest Workday directory |
| POST | `/v1/ingest/kintell/enrollments` | Yes | Ingest Kintell enrollments |
| POST | `/v1/ingest/upskilling/enrollments` | Yes | Ingest upskilling enrollments |
| POST | `/v1/ingest/buddy/data` | Yes | Ingest buddy data |
| POST | `/v1/ingest/mentorship/placements` | Yes | Ingest mentorship placements |
| POST | `/v1/ingest/all` | Yes | Ingest all data sources |

### Webhooks

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/webhooks/benevity` | Signature | Benevity webhook |
| POST | `/webhooks/goodera` | Signature | Goodera webhook |
| POST | `/webhooks/workday` | Signature | Workday webhook |
| GET | `/webhooks/health` | No | Webhook health check |

### Import Sessions

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/v1/impact-in/imports/sessions` | Yes | Create import session |

---

## Notifications Service

**Base URL**: `http://localhost:3024` (dev)  
**Gateway Path**: `/v1/notifications/*`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/v1/notifications/send` | Yes | Send notification immediately |
| POST | `/v1/notifications/schedule` | Yes | Schedule notification |
| DELETE | `/v1/notifications/:id/cancel` | Yes | Cancel scheduled notification |
| GET | `/v1/notifications/history` | Yes | Query notification history |
| GET | `/v1/notifications/:id` | Yes | Get notification details |
| GET | `/v1/notifications/quota` | Yes | Check quota status |
| POST | `/v1/notifications/webhooks/sendgrid` | Webhook | SendGrid webhook |
| POST | `/v1/notifications/webhooks/twilio` | Webhook | Twilio webhook |

---

## Q2Q AI Service

**Base URL**: `http://localhost:3021` (dev)  
**Gateway Path**: `/v1/q2q/*`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/v1/q2q/classify` | Yes | Classify qualitative text |
| POST | `/v1/q2q/extract-evidence` | Yes | Extract evidence snippets |
| GET | `/v1/q2q/outcomes/:userId` | Yes | Get user outcome scores |
| GET | `/v1/q2q/models` | Yes | List available models |

---

## Safety Moderation Service

**Base URL**: `http://localhost:3022` (dev)  
**Gateway Path**: `/v1/safety/*`

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/v1/safety/check` | Yes | Check content for safety |
| GET | `/v1/safety/flags` | Yes | List flagged content |
| POST | `/v1/safety/review` | Yes | Submit manual review |

---

## Health Endpoints (All Services)

All services implement standard health endpoints:

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| GET | `/health` | No | Basic health check |
| GET | `/health/live` | No | Kubernetes liveness probe |
| GET | `/health/ready` | No | Kubernetes readiness probe |
| GET | `/health/dependencies` | No | Dependency checks |

**Additional**:
- Analytics: `GET /health/cache` - Cache statistics
- Notifications: `GET /health/queue` - Queue status

---

## Authentication

### JWT Authentication
- **Algorithm**: HS256 (upgrading to RS256)
- **Expiry**: 24 hours
- **Header**: `Authorization: Bearer <token>`

### Roles
- `admin` - Full system access
- `company_admin` - Company-level access
- `participant` - Participant access
- `volunteer` - Volunteer access

### Rate Limiting
- **Limit**: 100 requests/minute
- **Header**: `X-RateLimit-Remaining`
- **Whitelist**: 127.0.0.1 (localhost)

---

## API Categories

### Public APIs (No Auth)
- Health checks
- Trust center endpoints
- Status endpoints
- Demo endpoints

### User APIs (Session Required)
- Profile management
- Dashboard data
- Saved views
- Campaign viewing

### Admin APIs (Admin Auth Required)
- Report generation
- Campaign management
- User management
- System configuration

### Webhook APIs (Signature Verification)
- Kintell webhooks
- Impact-In webhooks
- Notification provider webhooks

### Cron APIs (CRON_SECRET Required)
- Scheduled tasks
- Batch jobs
- Data sync

---

## Error Responses

All APIs return consistent error format:

```json
{
  "success": false,
  "error": "ErrorCode",
  "message": "Human-readable message",
  "details": {}
}
```

**Status Codes**:
- `200` - Success
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `429` - Rate Limited
- `500` - Internal Server Error

---

**Next**: See [04-INTEGRATIONS.md](./04-INTEGRATIONS.md) for external service integrations.
