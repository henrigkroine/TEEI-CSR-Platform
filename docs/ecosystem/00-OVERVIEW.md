# TEEI Ecosystem Dashboard

**Last Updated**: 2025-01-27  
**Audited By**: Claude Code  
**Status**: Complete Ecosystem Audit

---

## Quick Status

| Platform | Deployed | Working | Data Connected | Notes |
|----------|----------|---------|----------------|-------|
| Corporate Cockpit | ✅ | ✅ | ✅ | Main dashboard (Astro + React) |
| Trust Center | ✅ | ✅ | ✅ | Public transparency portal |
| API Gateway | ✅ | ✅ | ✅ | Unified API entry point |
| 26 Microservices | ✅ | ✅ | ✅ | All services operational |
| PostgreSQL | ✅ | ✅ | ✅ | Primary database |
| ClickHouse | ✅ | ✅ | ✅ | Analytics warehouse |
| NATS | ✅ | ✅ | ✅ | Event bus |

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    Frontend Layer (Astro Apps)                  │
│  ┌──────────────────────┐         ┌──────────────────────┐    │
│  │ Corporate Cockpit    │         │   Trust Center        │    │
│  │  (Astro 4 + React)   │         │      (Astro 4)        │    │
│  │   Port: 4327         │         │    Port: 4322         │    │
│  │  93+ pages           │         │   Public pages        │    │
│  └──────────────────────┘         └──────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Gateway Layer                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │         API Gateway (Port 3017)                          │  │
│  │  JWT Auth (HS256), RBAC, Rate Limiting (100/min)         │  │
│  │  Reverse Proxy, Health Aggregation, CORS                 │  │
│  └──────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Service Layer (26 Microservices)              │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Unified  │ │ Analytics│ │ Reporting│ │   Q2Q AI  │         │
│  │ Profile  │ │          │ │          │ │           │         │
│  │  :3018   │ │  :3023   │ │  :4017   │ │  :3021    │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐         │
│  │ Kintell  │ │  Buddy   │ │Upskilling │ │  Impact   │         │
│  │ Connector│ │ Service  │ │ Connector │ │   In      │         │
│  │  :3027   │ │  :3019   │ │  :3028    │ │  :3007    │         │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘         │
│  ... and 18 more services (see 01-PLATFORMS.md)                │
└─────────────────────────────────────────────────────────────────┘
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Data & Event Layer                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  PostgreSQL  │  │  ClickHouse   │  │     NATS      │         │
│  │  (Primary)   │  │  (Analytics)  │  │  (Event Bus)  │         │
│  │  50+ tables  │  │  6 views      │  │  JetStream    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │    Redis     │  │   R2/S3      │                            │
│  │   (Cache)    │  │  (Storage)   │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
```

## Statistics

| Category | Count | Details |
|----------|-------|---------|
| **Frontend Apps** | 2 | Corporate Cockpit, Trust Center |
| **Microservices** | 26 | See 01-PLATFORMS.md |
| **Database Tables** | 50+ | PostgreSQL (see 02-DATABASE-SCHEMA.md) |
| **API Endpoints** | 100+ | Across all services (see 03-API-ENDPOINTS.md) |
| **Admin Pages** | 93+ | Astro pages in Corporate Cockpit |
| **External Integrations** | 10+ | Resend, R2, NATS, ClickHouse, etc. (see 04-INTEGRATIONS.md) |
| **Cron Jobs** | 8+ | Scheduled tasks (see 09-AUTOMATION.md) |
| **Migration Files** | 50+ | Database schema migrations |
| **Shared Packages** | 20+ | Reusable libraries |

## Technology Stack

### Frontend
- **Astro 4.0** - Framework
- **React 18.2** - UI components
- **Tailwind CSS 3.4** - Styling
- **TypeScript 5.3** - Type safety

### Backend
- **Node.js 20.x** - Runtime
- **Fastify 4.x** - HTTP framework
- **TypeScript 5.3** - Type safety
- **Zod** - Schema validation

### Databases
- **PostgreSQL 16** - Primary data store
- **pgvector** - Embedding storage (RAG)
- **ClickHouse 24.x** - Analytics warehouse
- **Redis 7.x** - Caching & sessions

### Event & Messaging
- **NATS JetStream** - Event bus
- **Server-Sent Events (SSE)** - Real-time UI updates

### AI/ML
- **OpenAI GPT-4** - Primary LLM (Q2Q classification)
- **Anthropic Claude 3.5 Sonnet** - Backup (narrative generation)
- **pgvector + sentence-transformers** - Retrieval (RAG)

### Observability
- **OpenTelemetry** - Tracing & metrics
- **Grafana** - Dashboards
- **Prometheus** - Metrics collection
- **Jaeger** - Distributed tracing
- **Loki + Promtail** - Log aggregation
- **Sentry** - Error tracking

### Infrastructure
- **Docker 24.x** - Containerization
- **Kubernetes 1.28+** - Orchestration
- **Kustomize** - K8s config management
- **GitHub Actions** - CI/CD
- **HashiCorp Vault** - Secrets management

## Critical Issues

### ⚠️ High Priority
1. **Badge/Certificate System**: No badge generation code found - may be legacy or removed
2. **Production URLs**: Unknown - need to document Cloudflare Pages deployments
3. **Environment Variables**: Incomplete documentation - see 10-ENV-VARIABLES.md

### ✅ Resolved/Working
1. **Database**: PostgreSQL confirmed (not Turso as originally mentioned)
2. **Service Health**: All services have health endpoints
3. **API Gateway**: Fully operational with JWT, RBAC, rate limiting
4. **Data Connections**: Most services connected to real databases

## Recommended Next Steps

1. ✅ **Complete**: Ecosystem audit documentation
2. 🔄 **In Progress**: Connect CSR Cockpit to real database queries (some metrics still mock)
3. 📋 **Todo**: Document all production URLs and Cloudflare Pages projects
4. 📋 **Todo**: Complete environment variable documentation per service
5. 📋 **Todo**: Audit badge/certificate system (if exists)
6. 📋 **Todo**: Create API endpoint catalog with examples
7. 📋 **Todo**: Map all data flows between services

## Documentation Index

1. **[01-PLATFORMS.md](./01-PLATFORMS.md)** - All deployed platforms & URLs
2. **[02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md)** - All tables across all databases
3. **[03-API-ENDPOINTS.md](./03-API-ENDPOINTS.md)** - Every API endpoint documented
4. **[04-INTEGRATIONS.md](./04-INTEGRATIONS.md)** - External services & connections
5. **[05-ADMIN-PAGES.md](./05-ADMIN-PAGES.md)** - All admin dashboard pages
6. **[06-USER-PORTALS.md](./06-USER-PORTALS.md)** - Public-facing portals
7. **[07-BADGE-CERTIFICATE.md](./07-BADGE-CERTIFICATE.md)** - Badge & certificate system
8. **[08-CSR-COCKPIT.md](./08-CSR-COCKPIT.md)** - CSR reporting infrastructure
9. **[09-AUTOMATION.md](./09-AUTOMATION.md)** - Cron jobs, webhooks, triggers
10. **[10-ENV-VARIABLES.md](./10-ENV-VARIABLES.md)** - All required env vars per project
11. **[11-GAPS-TODO.md](./11-GAPS-TODO.md)** - What's missing or broken
12. **[12-CONNECTION-MAP.md](./12-CONNECTION-MAP.md)** - What connects to what

---

## Project Structure

```
TEEI_CSR_Platform/
├── apps/                          # Frontend applications
│   ├── corp-cockpit-astro/       # Main corporate dashboard
│   └── trust-center/              # Public trust portal
├── services/                      # 26 microservices
│   ├── api-gateway/              # API routing & auth
│   ├── unified-profile/           # User identity
│   ├── analytics/                 # Analytics engine
│   ├── reporting/                 # Gen-AI reports
│   ├── q2q-ai/                    # Qualitative→Quantitative
│   ├── kintell-connector/        # Kintell integration
│   ├── buddy-service/             # Buddy matching
│   ├── buddy-connector/          # Buddy platform
│   ├── upskilling-connector/     # Upskilling platform
│   ├── impact-in/                 # Impact-In API
│   ├── notifications/             # Multi-channel notifications
│   ├── safety-moderation/         # Content moderation
│   ├── campaigns/                  # Campaign management
│   ├── program-service/           # Program management
│   ├── billing/                    # Billing & subscriptions
│   ├── forecast/                   # Forecasting
│   ├── impact-calculator/         # VIS calculations
│   ├── journey-engine/            # Journey tracking
│   ├── insights-nlq/              # Natural language queries
│   ├── ai-budget/                  # AI cost tracking
│   ├── builder-runtime/            # Builder tools
│   ├── synthetics/                 # Synthetic monitoring
│   ├── data-residency/             # Data residency
│   ├── privacy-orchestrator/      # Privacy requests
│   ├── gdpr-service/              # GDPR (stub)
│   └── discord-bot/                # Discord integration
├── packages/                      # Shared libraries
│   ├── shared-schema/             # Database schema + migrations
│   ├── shared-auth/               # Authentication utilities
│   ├── shared-types/              # TypeScript types
│   ├── shared-utils/              # Common utilities
│   ├── metrics/                    # Metrics calculation
│   ├── observability/              # OpenTelemetry
│   ├── entitlements/              # Feature flags
│   ├── data-masker/               # PII redaction
│   ├── ingestion-buddy/            # Data ingestion
│   ├── program-templates/         # Program templates
│   ├── clients/                    # HTTP clients
│   ├── event-contracts/           # Event schemas
│   ├── openapi/                   # OpenAPI specs
│   ├── sdk/typescript/            # TypeScript SDK
│   ├── sdk/embeds/                # Embed SDK
│   ├── model-registry/            # AI model registry
│   ├── http-client/               # HTTP client
│   ├── events/                    # Event definitions
│   ├── contracts/                 # Service contracts
│   └── compliance/                # Compliance utilities
└── docs/                          # Documentation
    └── ecosystem/                  # This audit documentation
```

---

**Next**: See [01-PLATFORMS.md](./01-PLATFORMS.md) for detailed platform information.
