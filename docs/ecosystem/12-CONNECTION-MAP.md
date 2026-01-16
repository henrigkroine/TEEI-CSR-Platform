# TEEI System Connection Map

**Last Updated**: 2025-01-27

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    External Systems                              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Kintell  │  │  Benevity │  │ Goodera  │  │ Workday  │      │
│  │ (CSV)    │  │ (Webhook) │  │(Webhook) │  │(Webhook) │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
         │              │              │              │
         ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Connector Services                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Kintell    │  │  Impact-In   │  │   Buddy      │         │
│  │  Connector   │  │   Service    │  │  Connector   │         │
│  │   :3027      │  │   :3007      │  │   :3029      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
         │              │              │
         │              │              │
         ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Event Bus (NATS)                             │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         NATS JetStream :4222                            │  │
│  │  Events: kintell.*, buddy.*, user.*, report.*           │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
         │              │              │              │
         ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Core Services                                 │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐      │
│  │ Unified  │  │ Analytics │  │ Reporting│  │   Q2Q    │      │
│  │ Profile  │  │           │  │          │  │   AI     │      │
│  │  :3018   │  │  :3023    │  │  :4017   │  │  :3021   │      │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘      │
└─────────────────────────────────────────────────────────────────┘
         │              │              │              │
         │              │              │              │
         ▼              ▼              ▼              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data Layer                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  PostgreSQL  │  │  ClickHouse   │  │     Redis     │         │
│  │  (Primary)   │  │  (Analytics)  │  │   (Cache)     │         │
│  │  50+ tables  │  │  6+ views     │  │   Sessions    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```

---

## System Connections Matrix

| From | To | Method | Protocol | Status | Notes |
|------|----|--------|----------|--------|-------|
| **Kintell** | Kintell Connector | CSV Import | Manual | ✅ | Manual process |
| **Kintell** | Kintell Connector | Webhook | HTTP | ✅ | HMAC signature |
| **Benevity** | Impact-In | Webhook | HTTP | ✅ | HMAC-SHA256 |
| **Goodera** | Impact-In | Webhook | HTTP | ✅ | OAuth 2.0 |
| **Workday** | Impact-In | Webhook | HTTP | ✅ | WS-Security |
| **Kintell Connector** | PostgreSQL | Direct | SQL | ✅ | Drizzle ORM |
| **Kintell Connector** | NATS | Publish | NATS | ✅ | Event bus |
| **Impact-In** | Benevity | API | HTTP | ✅ | Outbound delivery |
| **Impact-In** | Goodera | API | HTTP | ✅ | Outbound delivery |
| **Impact-In** | Workday | API | HTTP/SOAP | ✅ | Outbound delivery |
| **All Services** | PostgreSQL | Direct | SQL | ✅ | Shared connection |
| **Analytics** | ClickHouse | Direct | HTTP | ✅ | Analytics queries |
| **Analytics** | Redis | Cache | Redis | ✅ | Response caching |
| **All Services** | NATS | Pub/Sub | NATS | ✅ | Event bus |
| **Corporate Cockpit** | API Gateway | API | HTTP | ✅ | JWT auth |
| **API Gateway** | All Services | Reverse Proxy | HTTP | ✅ | Request routing |
| **Reporting** | OpenAI | API | HTTP | ✅ | LLM calls |
| **Reporting** | Anthropic | API | HTTP | ✅ | Backup LLM |
| **Notifications** | SendGrid | API | HTTP | ✅ | Email delivery |
| **Notifications** | Resend | API | HTTP | ✅ | Alternative email |
| **Reporting** | R2/S3 | Upload | S3 API | ✅ | File storage |
| **Discord Bot** | Discord | API | WebSocket | ✅ | Bot commands |
| **Discord Bot** | Reporting | API | HTTP | ✅ | VIS updates |

---

## Frontend to Backend Flow

```
┌─────────────────────────────────────────────────────────────┐
│              Frontend (Corporate Cockpit)                   │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Astro Pages (93+) → React Components → API Calls     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    API Gateway                              │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  JWT Auth → RBAC → Rate Limit → Reverse Proxy        │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Analytics   │  │  Reporting   │  │ Unified      │
│  Service     │  │  Service     │  │ Profile      │
└──────────────┘  └──────────────┘  └──────────────┘
        │                   │                   │
        └───────────────────┼───────────────────┘
                            │
                            ▼
                    ┌──────────────┐
                    │  PostgreSQL  │
                    └──────────────┘
```

---

## Event Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Event Publishers                          │
│  Kintell Connector, Buddy Service, Q2Q AI, Reporting      │
└─────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────┐
│                    NATS JetStream                            │
│  Topics: kintell.*, buddy.*, user.*, report.*, campaign.*   │
└─────────────────────────────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  Analytics   │  │  Notifications│  │  Q2Q AI      │
│  (Subscriber)│  │  (Subscriber) │  │  (Subscriber)│
└──────────────┘  └──────────────┘  └──────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  ClickHouse  │  │  SendGrid     │  │  PostgreSQL  │
│  (Metrics)   │  │  (Email)      │  │  (Evidence)  │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Data Ingestion Flow

```
External System (Kintell/Benevity/etc.)
         │
         │ CSV/Webhook
         ▼
Connector Service (Kintell Connector/Impact-In)
         │
         │ Transform & Validate
         ▼
PostgreSQL (Staging)
         │
         │ Event Published
         ▼
NATS Event Bus
         │
         │ Event Subscribed
         ▼
Processing Services (Analytics/Q2Q AI)
         │
         │ Processed Data
         ▼
PostgreSQL (Final) + ClickHouse (Analytics)
```

---

## Report Generation Flow

```
User Request (Corporate Cockpit)
         │
         │ POST /v1/gen-reports/generate
         ▼
Reporting Service
         │
         │ 1. Extract Evidence
         ▼
PostgreSQL (evidence_snippets)
         │
         │ 2. Redact PII
         ▼
PII Redaction Engine
         │
         │ 3. Fetch Metrics
         ▼
Analytics Service → PostgreSQL
         │
         │ 4. Generate with LLM
         ▼
OpenAI/Anthropic API
         │
         │ 5. Validate Citations
         ▼
Citation Validator
         │
         │ 6. Store Report
         ▼
PostgreSQL (report_lineage)
         │
         │ 7. Send Notification
         ▼
Notifications Service → SendGrid
```

---

## Real-Time Updates Flow

```
User Dashboard (Corporate Cockpit)
         │
         │ GET /api/sse/dashboard
         ▼
SSE Endpoint (Reporting Service)
         │
         │ Subscribe to Events
         ▼
NATS Event Bus
         │
         │ Events Published
         ▼
Event Publishers (All Services)
         │
         │ Real-Time Events
         ▼
SSE Stream → User Browser
```

---

## Authentication Flow

```
User Login (Corporate Cockpit)
         │
         │ POST /api/login
         ▼
Auth Handler
         │
         │ Validate Credentials
         ▼
PostgreSQL (users table)
         │
         │ Generate JWT
         ▼
JWT Token (HS256)
         │
         │ Store Session
         ▼
Redis (Session Storage)
         │
         │ Return Token
         ▼
User Browser (Cookie/Header)
```

---

## Multi-Tenant Isolation

```
Request → API Gateway
         │
         │ Extract Tenant ID
         ▼
Tenant Router
         │
         │ Route to Service
         ▼
Service (with tenant_id)
         │
         │ Query with Tenant Filter
         ▼
PostgreSQL (WHERE company_id = ?)
```

---

## Connection Status Summary

| Connection Type | Count | Working | Partial | Broken |
|-----------------|-------|---------|---------|--------|
| **Database** | 3 | 3 | 0 | 0 |
| **Event Bus** | 26+ | 26+ | 0 | 0 |
| **External APIs** | 10+ | 8 | 2 | 0 |
| **Webhooks** | 7 | 6 | 1 | 0 |
| **Storage** | 2 | 2 | 0 | 0 |
| **Cache** | 1 | 1 | 0 | 0 |

---

## Network Topology

```
Internet
   │
   ▼
Cloudflare (CDN/DDoS Protection)
   │
   ▼
API Gateway (Port 3017)
   │
   ├──→ Corporate Cockpit (Port 4327)
   ├──→ Trust Center (Port 4322)
   └──→ Service Layer
          │
          ├──→ Unified Profile (3018)
          ├──→ Analytics (3023)
          ├──→ Reporting (4017)
          ├──→ Q2Q AI (3021)
          └──→ ... (22 more services)
```

---

## Data Residency & Compliance

```
User Data (PostgreSQL)
         │
         │ GDPR Category Tag
         ▼
Data Residency Service
         │
         │ Check Residency Policy
         ▼
Residency Rules (EU/US/UK)
         │
         │ Enforce TTL
         ▼
Data Retention Policies
         │
         │ DSAR Request
         ▼
Privacy Orchestrator
         │
         │ Export/Delete
         ▼
Data Subject Access Request
```

---

**End of Documentation**: Return to [00-OVERVIEW.md](./00-OVERVIEW.md) for index.
