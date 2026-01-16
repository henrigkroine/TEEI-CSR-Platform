# TEEI External Integrations

**Last Updated**: 2025-01-27

---

## Email Services

### Resend / SendGrid

- **Purpose**: Transactional emails, badge notifications, magic links
- **Service**: Notifications Service
- **Env Var**: `SENDGRID_API_KEY` or `RESEND_API_KEY`
- **Used In**:
  - Badge notification emails
  - Magic link authentication
  - WBP meeting reminders
  - Report delivery notifications
  - Scheduled report emails
- **Status**: ✅ Working
- **Webhook**: `POST /v1/notifications/webhooks/sendgrid`

---

## Storage Services

### Cloudflare R2 / S3

- **Purpose**: File storage (certificates, reports, exports)
- **Service**: Reporting Service, Badge System
- **Env Vars**: 
  - `R2_ACCESS_KEY_ID`
  - `R2_SECRET_ACCESS_KEY`
  - `R2_BUCKET_NAME`
  - `R2_ENDPOINT`
- **Used In**:
  - Badge PNG storage (3 sizes)
  - Certificate PDF storage
  - Report PDF exports
  - Evidence file attachments
- **Bucket**: `teei-certificates` (or configured bucket)
- **Path Pattern**: `credentials/{program}/{verification_code}/`
- **Status**: ✅ Working

---

## Video & Communication

### LiveKit

- **Purpose**: Video calls for WBP portal
- **Service**: WBP Portal (if exists)
- **Env Vars**:
  - `LIVEKIT_URL`
  - `LIVEKIT_API_KEY`
  - `LIVEKIT_API_SECRET`
- **Used In**:
  - Buddy video calls
  - Language Connect sessions
  - Mentorship meetings
- **Status**: ❓ Unknown (not found in codebase)

---

## Authentication & Security

### Turnstile (Cloudflare)

- **Purpose**: Bot protection, CAPTCHA
- **Service**: Corporate Cockpit
- **Env Var**: `TURNSTILE_SECRET_KEY`
- **Used In**:
  - Login forms
  - Public forms
  - Registration pages
- **Status**: ❓ Unknown (not found in codebase)

### Google OAuth

- **Purpose**: SSO authentication
- **Service**: API Gateway
- **Env Vars**:
  - `GOOGLE_CLIENT_ID`
  - `GOOGLE_CLIENT_SECRET`
- **Used In**:
  - SSO login
  - User authentication
- **Status**: ✅ Configured (OIDC support)

### LinkedIn OAuth

- **Purpose**: Professional network authentication
- **Service**: WBP Portal (if exists)
- **Env Vars**:
  - `LINKEDIN_CLIENT_ID`
  - `LINKEDIN_CLIENT_SECRET`
- **Status**: ❓ Unknown (not found in codebase)

---

## External CSR Platforms

### Benevity

- **Purpose**: Volunteer and donation tracking
- **Service**: Impact-In Service
- **Integration Type**: Outbound delivery + Inbound webhook
- **Auth**: HMAC-SHA256 signatures
- **Endpoints**:
  - `POST /v1/ingest/benevity/volunteers` - Ingest volunteers
  - `POST /v1/ingest/benevity/donations` - Ingest donations
  - `POST /webhooks/benevity` - Receive webhooks
- **Features**:
  - Idempotency keys
  - Delivery tracking
  - Retry mechanism
- **Status**: ✅ Working

### Goodera

- **Purpose**: Volunteer platform integration
- **Service**: Impact-In Service
- **Integration Type**: Outbound delivery + Inbound webhook
- **Auth**: OAuth 2.0 client credentials
- **Endpoints**:
  - `POST /v1/ingest/goodera/volunteers` - Ingest volunteers
  - `POST /v1/ingest/goodera/donations` - Ingest donations
  - `POST /webhooks/goodera` - Receive webhooks
- **Features**:
  - Rate limit handling (100 req/min)
  - OAuth token refresh
- **Status**: ✅ Working

### Workday

- **Purpose**: HR directory integration
- **Service**: Impact-In Service
- **Integration Type**: Outbound delivery + Inbound webhook
- **Auth**: Dual-protocol (SOAP/REST), WS-Security
- **Endpoints**:
  - `POST /v1/ingest/workday/directory` - Ingest directory
  - `POST /webhooks/workday` - Receive webhooks
- **Status**: ✅ Working

---

## Learning Platforms

### Kintell

- **Purpose**: Language Connect & MFU session platform
- **Service**: Kintell Connector
- **Integration Type**: CSV import + Webhooks
- **API Available**: ❌ No (manual CSV export)
- **Data Flow**: Manual CSV export → Admin import page → Database
- **Import Pages**:
  - `/admin/mfu/import` (if exists)
  - `/admin/lc/import` (if exists)
- **Endpoints**:
  - `POST /v1/import/sessions` - Import CSV
  - `POST /v1/webhooks/session-scheduled` - Webhook
  - `POST /v1/webhooks/session-completed` - Webhook
- **Status**: ⚠️ Manual process only

### Upskilling Platforms (eCornell, itslearning)

- **Purpose**: Course completion tracking
- **Service**: Upskilling Connector
- **Integration Type**: CSV import
- **API Available**: ❌ No (manual CSV export)
- **Data Flow**: Manual CSV export → Admin import → Database
- **Status**: ⚠️ Manual process only

---

## Event & Messaging

### NATS JetStream

- **Purpose**: Event bus for service communication
- **Service**: All services
- **Env Var**: `NATS_URL` (default: `nats://localhost:4222`)
- **Used In**:
  - Service-to-service communication
  - Event publishing
  - Event subscriptions
  - Real-time updates
- **Event Types**:
  - `kintell.session.scheduled`
  - `kintell.session.completed`
  - `buddy.match.created`
  - `user.profile.updated`
  - And many more...
- **Status**: ✅ Working

### Discord

- **Purpose**: Community integration, volunteer recognition
- **Service**: Discord Bot
- **Env Vars**:
  - `DISCORD_BOT_TOKEN`
  - `DISCORD_GUILD_ID`
- **Features**:
  - Volunteer recognition commands
  - VIS score updates
  - Role assignment
- **Status**: ⚠️ Partial (some features not implemented)

---

## Analytics & Observability

### ClickHouse

- **Purpose**: Analytics data warehouse
- **Service**: Analytics Service
- **Env Var**: `CLICKHOUSE_URL` (default: `http://localhost:8123`)
- **Used In**:
  - Time-series analytics
  - Cohort analysis
  - Benchmark calculations
  - Materialized views for fast queries
- **Tables**: 6+ materialized views
- **Status**: ✅ Working

### Redis

- **Purpose**: Caching, sessions, rate limiting
- **Service**: Multiple services
- **Env Var**: `REDIS_URL` (default: `redis://localhost:6379`)
- **Used In**:
  - Response caching (ETag support)
  - Session storage
  - Rate limiting
  - Queue management
- **Status**: ✅ Working

### OpenTelemetry

- **Purpose**: Distributed tracing, metrics
- **Service**: All services
- **Used In**:
  - Request tracing
  - Performance metrics
  - Error tracking
- **Exporters**: Jaeger, Prometheus, Grafana
- **Status**: ✅ Configured

### Sentry

- **Purpose**: Error tracking
- **Service**: All services
- **Env Var**: `SENTRY_DSN`
- **Status**: ✅ Configured

---

## AI/ML Services

### OpenAI

- **Purpose**: Primary LLM for Q2Q classification, report generation
- **Service**: Q2Q AI, Reporting Service
- **Env Vars**:
  - `OPENAI_API_KEY`
  - `OPENAI_MODEL` (default: `gpt-4-turbo`)
- **Used In**:
  - Qualitative to Quantitative classification
  - Report narrative generation
  - Evidence extraction
- **Status**: ✅ Working

### Anthropic Claude

- **Purpose**: Backup LLM for narrative generation
- **Service**: Reporting Service
- **Env Vars**:
  - `ANTHROPIC_API_KEY`
  - `ANTHROPIC_MODEL` (default: `claude-3-5-sonnet`)
- **Status**: ✅ Configured

---

## Database Services

### PostgreSQL

- **Purpose**: Primary data store
- **Service**: All services
- **Env Var**: `DATABASE_URL`
- **Connection**: All services use shared connection pool
- **Status**: ✅ Working

### pgvector

- **Purpose**: Vector embeddings for RAG
- **Service**: Q2Q AI, Evidence extraction
- **Extension**: `vector` extension in PostgreSQL
- **Used In**:
  - Evidence snippet embeddings
  - Semantic search
  - Similarity matching
- **Status**: ✅ Working

---

## Integration Status Summary

| Integration | Type | Status | Notes |
|-------------|------|--------|-------|
| **Resend/SendGrid** | Email | ✅ | Working |
| **R2/S3** | Storage | ✅ | Working |
| **NATS** | Event Bus | ✅ | Working |
| **ClickHouse** | Analytics | ✅ | Working |
| **Redis** | Cache | ✅ | Working |
| **PostgreSQL** | Database | ✅ | Working |
| **OpenAI** | AI | ✅ | Working |
| **Anthropic** | AI | ✅ | Configured |
| **Benevity** | CSR Platform | ✅ | Working |
| **Goodera** | CSR Platform | ✅ | Working |
| **Workday** | HR | ✅ | Working |
| **Kintell** | Learning | ⚠️ | Manual CSV only |
| **Upskilling** | Learning | ⚠️ | Manual CSV only |
| **Discord** | Community | ⚠️ | Partial |
| **LiveKit** | Video | ❓ | Not found |
| **Turnstile** | Security | ❓ | Not found |
| **LinkedIn** | Auth | ❓ | Not found |

---

## Webhook Endpoints

All webhooks require signature verification:

| Source | Endpoint | Auth | Purpose | Status |
|--------|----------|------|---------|--------|
| **Resend** | `/v1/notifications/webhooks/sendgrid` | Signature | Email delivery status | ✅ |
| **Twilio** | `/v1/notifications/webhooks/twilio` | Signature | SMS delivery status | ⚠️ Stub |
| **Benevity** | `/webhooks/benevity` | HMAC-SHA256 | Volunteer/donation updates | ✅ |
| **Goodera** | `/webhooks/goodera` | OAuth | Volunteer updates | ✅ |
| **Workday** | `/webhooks/workday` | WS-Security | Directory updates | ✅ |
| **Kintell** | `/v1/webhooks/session-scheduled` | Signature | Session scheduled | ✅ |
| **Kintell** | `/v1/webhooks/session-completed` | Signature | Session completed | ✅ |

---

## Integration Patterns

### Outbound Delivery (Impact-In)
1. Data collected from internal sources
2. Transformed to platform format
3. Delivered via API
4. Delivery status tracked
5. Retry on failure

### Inbound Ingestion
1. Webhook received or CSV uploaded
2. Signature/format validated
3. Data transformed to internal format
4. Stored in database
5. Events published to NATS

### Event-Driven
1. Service publishes event to NATS
2. Subscribers receive event
3. Processing occurs asynchronously
4. Results stored in database

---

**Next**: See [05-ADMIN-PAGES.md](./05-ADMIN-PAGES.md) for admin dashboard pages.
