# TEEI CSR Platform - Service Index

**Generated**: 2025-01-27  
**Total Services**: 26  
**Status**: Complete Service Inventory

---

## Table of Contents

1. [Service Overview](#service-overview)
2. [Service-by-Service Breakdown](#service-by-service-breakdown)
3. [Service Files Database](#service-files-database)
4. [Service Dependencies](#service-dependencies)
5. [Service Ports & Configuration](#service-ports--configuration)

---

## Service Overview

### Service Categories

| Category | Count | Services |
|----------|-------|----------|
| **API Services** | 17 | api-gateway, analytics, billing, campaigns, data-residency, forecast, impact-calculator, impact-in, insights-nlq, journey-engine, notifications, program-service, q2q-ai, reporting, safety-moderation, unified-profile |
| **Connectors** | 4 | buddy-connector, kintell-connector, upskilling-connector, impact-in (dual role) |
| **Infrastructure** | 3 | ai-budget, builder-runtime, synthetics |
| **Compliance** | 2 | privacy-orchestrator, gdpr-service |
| **Bots** | 1 | discord-bot |
| **Core Services** | 2 | buddy-service, program-service |

---

## Service-by-Service Breakdown

### 1. API Gateway (`services/api-gateway/`)

**Purpose**: GraphQL/REST gateway, authentication, rate limiting  
**Port**: 3000  
**Status**: ✅ Production-ready  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`, `/health/all`

**Files**:
- `src/index.ts` - Main entry point
- `src/routes/` - API routes (48 *.ts files)
- `src/middleware/` - Auth, rate limiting middleware
- `TENANT_MIDDLEWARE.md` - Middleware documentation
- `Dockerfile` - Container definition
- `package.json`, `tsconfig.json` - Configuration

**Key Features**:
- JWT authentication
- RBAC (Role-Based Access Control)
- Rate limiting
- Request routing/proxy
- CORS handling
- Request ID propagation

**Dependencies**: Fastify, JWT, NATS, Redis

---

### 2. Analytics Service (`services/analytics/`)

**Purpose**: ClickHouse analytics engine, time-series data processing  
**Port**: 3008 (⚠️ Port conflict with insights-nlq, notifications)  
**Status**: ✅ Functional  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`

**Files**:
- `src/index.ts` - Service entry point
- `src/routes/` - Analytics API routes
- `src/lib/` - Analytics calculation modules
- `config/` - Configuration files (1 *.json)
- `src/` - 85 files total (82 *.ts, 3 *.sql)
- `Dockerfile` - Container definition
- `vitest.config.ts` - Test configuration
- `README.md` - Documentation

**Key Features**:
- ClickHouse integration
- Time-series analytics
- Dashboard data aggregation
- Metric calculations
- Data windowing

**Dependencies**: ClickHouse client, Fastify, Drizzle ORM

---

### 3. Reporting Service (`services/reporting/`)

**Purpose**: SROI/VIS calculations, PDF/PPTX report generation, Gen-AI narratives  
**Port**: 3007 (⚠️ Port conflict with forecast, impact-in)  
**Status**: ✅ Production-ready  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`

**Files** (254 total):
- `src/index.ts` - Service entry point
- `src/calculators/` - SROI, VIS calculators
  - `sroi.ts`, `sroi.test.ts`
  - `vis.ts`, `vis.test.ts`
  - `campaign-vis.test.ts`
- `src/templates/` - Report templates (19 *.hbs files)
  - `quarterly-report.en.hbs`
  - `annual-report.en.hbs`
  - `investor-update.en.hbs`
  - `impact-deep-dive.en.hbs`
- `src/routes/` - API routes
  - `gen-reports.ts` - Report generation
  - `campaign-dashboard.ts` - Campaign dashboard
  - `evidence.ts` - Evidence routes
- `src/lib/` - Library functions
  - `evidenceLineageMapper.ts`
  - `citations.ts` - Citation validation
- `src/cache/` - Caching modules
  - `campaign-cache.ts`
- `src/db/` - Database access
- `src/types/` - Type definitions
- `src/controllers/` - Controllers
- `src/srs/registry/` - SRS registry files
  - `sdg-targets.json`
  - `csrd-esrs.json`
  - `gri-standards.json`
- `tests/` - Test suites
- `src/openapi.json` - OpenAPI specification
- Multiple documentation files (*.md)

**Key Features**:
- SROI (Social Return on Investment) calculation
- VIS (Volunteer Impact Score) calculation
- PDF report generation
- PPTX export
- Gen-AI narrative generation
- Citation validation (min 1 per paragraph)
- PII redaction
- Evidence lineage tracking

**Dependencies**: Fastify, Handlebars, PDF/PPTX libraries, LLM clients

---

### 4. Impact-In Service (`services/impact-in/`)

**Purpose**: External data ingestion (Benevity, Goodera, Workday connectors)  
**Port**: 3007 (⚠️ Port conflict with forecast, reporting)  
**Status**: ✅ Production-ready  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`

**Files** (74 *.ts files):
- `src/index.ts` - Service entry point
- `src/routes/` - Ingestion routes
- `src/connectors/` - External connector implementations
  - Benevity connector
  - Goodera connector
  - Workday connector
- `src/lib/` - Data transformation modules
- `scheduler/` - Scheduling (1 *.ts)
- `sla-monitor/` - SLA monitoring (1 *.ts)
- `__tests__/` - Integration tests (2 *.ts)
- `Dockerfile` - Container definition
- `README.md` - Documentation

**Key Features**:
- External API integration
- CSV/JSON data parsing
- Data validation
- Scheduled ingestion
- SLA monitoring
- Event publishing to NATS

**Dependencies**: Fastify, CSV parser, NATS, Drizzle ORM

---

### 5. Q2Q AI Service (`services/q2q-ai/`)

**Purpose**: Qualitative-to-Quantitative AI pipeline  
**Port**: 3005  
**Status**: ✅ Production-ready  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`

**Files** (82 files: 76 *.ts, 3 *.yaml, 2 *.md, 1 *.jsonl):
- `src/index.ts` - Service entry point
- `src/routes/` - Q2Q API routes
- `src/lib/` - Q2Q processing modules
- `src/safety/` - Safety moderation
- `src/labeling/` - Labeling system
- `src/slo/` - SLO tracking
- `golden-sets/` - Golden test sets (4 files: 3 *.jsonl, 1 *.md)
- `demo-safety.ts` - Safety demo
- `Dockerfile` - Container definition
- `SAFETY_IMPLEMENTATION_REPORT.md` - Safety documentation
- `README.md` - Service documentation

**Key Features**:
- Qualitative feedback analysis
- Quantitative metric conversion
- AI model integration
- Safety checks
- Labeling taxonomy
- Evidence extraction

**Dependencies**: Fastify, LLM clients, NATS, Model registry

---

### 6. Insights NLQ Service (`services/insights-nlq/`)

**Purpose**: Natural Language Query insights  
**Port**: 3008 (⚠️ Port conflict with analytics, notifications)  
**Status**: ⚠️ Has merge conflicts  
**Dockerfile**: ❌ Missing  
**Health Endpoint**: `/health`

**Files** (89 files: 80 *.ts, 5 *.hbs, 4 *.md):
- `src/index.ts` - Service entry point (⚠️ Has merge conflicts)
- `src/routes/` - NLQ API routes
- `src/lib/` - Query processing modules
- `src/cache/` - Caching layer
- `src/events/` - Event handlers
- `scripts/` - NLQ scripts (1 *.ts)
- Multiple implementation summaries (*.md)
- `README.md` - Documentation

**Key Features**:
- Natural language query processing
- SQL query generation
- Query caching
- Result aggregation
- Chart generation

**Dependencies**: Fastify, SQL query builder, Cache (Redis), NATS

**⚠️ Critical Issue**: Merge conflicts in `src/index.ts` (lines 165-251)

---

### 7. Campaigns Service (`services/campaigns/`)

**Purpose**: Campaign management, monetization, capacity tracking  
**Port**: N/A (routed through API gateway)  
**Status**: ✅ Production-ready  
**Dockerfile**: ❌ Missing  
**Health Endpoint**: `/health`

**Files** (37 *.ts files):
- `src/index.ts` - Service entry point
- `src/routes/` - Campaign API routes
  - `campaigns.ts` - Campaign CRUD
  - `beneficiary-groups.ts` - Beneficiary groups
  - `program-templates.ts` - Template management
  - `pricing-insights.ts` - Pricing analytics
  - `upsell-opportunities.ts` - Upsell detection
- `src/lib/` - Business logic
  - `campaign-instantiator.ts` - Campaign creation
  - `lifecycle-manager.ts` - Lifecycle management
  - `capacity-tracker.ts` - Capacity tracking
  - `pricing-signals.ts` - Pricing logic
  - `upsell-analyzer.ts` - Upsell analysis
  - `metrics-aggregator.ts` - Metrics aggregation
  - `seat-tracker.ts` - Seat tracking
  - `credit-tracker.ts` - Credit tracking
  - `commercial-terms.ts` - Commercial terms
  - `evidence-selector.ts` - Evidence selection
  - `activity-associator.ts` - Activity association
  - `backfill-associations.ts` - Backfill logic
  - `billing-integrator.ts` - Billing integration
  - `campaign-validator.ts` - Validation
  - `config-merger.ts` - Config merging
  - `state-transitions.ts` - State management
- `src/middleware/` - Middleware
  - `auth.ts` - Authentication
- `tests/` - Test suites (14 *.ts files)
- `openapi.yaml` - OpenAPI specification
- Multiple agent completion reports (*.md)
- `README.md` - Documentation

**Key Features**:
- Campaign CRUD operations
- Program template instantiation
- Capacity tracking and alerts
- Pricing insights
- Upsell opportunity detection
- Billing integration
- Evidence association
- Activity tracking

**Dependencies**: Fastify, Drizzle ORM, NATS, Billing service

---

### 8. Unified Profile Service (`services/unified-profile/`)

**Purpose**: User profile aggregation & sync across programs  
**Port**: 3001  
**Status**: ✅ Production-ready  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`

**Files** (12 *.ts files):
- `src/index.ts` - Service entry point
- `src/routes/` - Profile API routes
- `src/lib/` - Profile aggregation logic
- `src/subscribers/` - NATS event subscribers
- `openapi-profile-linking.yaml` - OpenAPI spec
- `Dockerfile` - Container definition

**Key Features**:
- Profile aggregation
- Cross-program identity linking
- Profile synchronization
- Event-driven updates

**Dependencies**: Fastify, NATS, Drizzle ORM

---

### 9. Buddy Service (`services/buddy-service/`)

**Purpose**: Buddy matching & management  
**Port**: 3003  
**Status**: ✅ Production-ready  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`

**Files** (6 files: 5 *.ts, 1 *.csv):
- `src/index.ts` - Service entry point
- `src/routes/` - Buddy API routes
- `src/lib/` - Matching algorithms
- `Dockerfile` - Container definition

**Key Features**:
- Buddy matching algorithms
- Match management
- Event publishing

**Dependencies**: Fastify, NATS, Drizzle ORM

---

### 10. Buddy Connector (`services/buddy-connector/`)

**Purpose**: Buddy system connector for external integration  
**Port**: 3010 (⚠️ Port conflict)  
**Status**: ✅ Functional  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`

**Files** (35 files: 28 *.ts, 4 *.map, 2 *.js, 1 *.json):
- `src/index.ts` - Service entry point
- `src/routes/` - Connector routes
- `src/lib/` - Integration logic
- `README.md` - Documentation
- `Dockerfile` - Container definition

**Key Features**:
- External buddy system integration
- Data transformation
- Webhook handling

**Dependencies**: Fastify, NATS, External APIs

---

### 11. Kintell Connector (`services/kintell-connector/`)

**Purpose**: Kintell platform data integration  
**Port**: 3002  
**Status**: ✅ Production-ready  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`

**Files** (18 files: 16 *.ts, 1 *.csv, 1 *.md):
- `src/index.ts` - Service entry point
- `src/routes/import.ts` - Import routes
- `src/lib/campaign-association.ts` - Campaign association
- `src/identity/` - Identity resolution
- `Dockerfile` - Container definition

**Key Features**:
- Kintell CSV import
- Session data processing
- Campaign association
- Identity resolution

**Dependencies**: Fastify, CSV parser, NATS, Drizzle ORM

---

### 12. Upskilling Connector (`services/upskilling-connector/`)

**Purpose**: Learning platform integration  
**Port**: 3004  
**Status**: ✅ Production-ready  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`

**Files** (8 files: 6 *.ts, 2 *.csv):
- `src/index.ts` - Service entry point
- `src/routes/import.ts` - Import routes
- `src/lib/` - Integration logic
- `Dockerfile` - Container definition

**Key Features**:
- Course completion import
- Learning progress tracking
- Campaign association

**Dependencies**: Fastify, CSV parser, NATS

---

### 13. Program Service (`services/program-service/`)

**Purpose**: Program management service  
**Port**: N/A (routed through API gateway)  
**Status**: ✅ Functional  
**Dockerfile**: ❌ Missing  
**Health Endpoint**: `/health`

**Files** (10 *.ts files):
- `src/index.ts` - Service entry point
- `src/routes/` - Program API routes
  - `programs.ts` - Program CRUD
  - `templates.ts` - Template management
  - `campaigns.ts` - Campaign routes
- `src/lib/` - Business logic
  - `template-registry.ts` - Template registry
  - `instantiator.ts` - Program instantiation
  - `config-resolver.ts` - Config resolution
- `migrations/` - Database migrations (1 *.ts)
- `openapi.yaml` - OpenAPI specification
- `INTEGRATION_CHECKLIST.md` - Integration guide
- `README.md` - Documentation

**Key Features**:
- Program CRUD operations
- Template management
- Program instantiation
- Configuration resolution

**Dependencies**: Fastify, Drizzle ORM, NATS

---

### 14. Notifications Service (`services/notifications/`)

**Purpose**: Email/SMS/push notifications  
**Port**: 3008 (⚠️ Port conflict)  
**Status**: ✅ Functional  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`

**Files** (28 files: 24 *.ts, 4 *.mjml):
- `src/index.ts` - Service entry point
- `src/routes/` - Notification routes
- `src/lib/` - Notification logic
- `src/templates/` - Email templates (4 *.mjml)
- `migrations/` - Database migrations (1 *.sql)
- `INTEGRATION_SCHEMA.sql` - Integration schema
- `Dockerfile` - Container definition
- `W5_IMPLEMENTATION_SUMMARY.md` - Implementation summary

**Key Features**:
- Email notifications
- SMS notifications (planned)
- Push notifications (planned)
- Template rendering
- Delivery tracking

**Dependencies**: Fastify, MJML, Email service, NATS

---

### 15. Safety Moderation Service (`services/safety-moderation/`)

**Purpose**: Content safety and moderation  
**Port**: 3006  
**Status**: ✅ Production-ready  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`

**Files** (7 *.ts files):
- `src/index.ts` - Service entry point
- `src/routes/` - Moderation routes
- `src/lib/` - Moderation logic
- `Dockerfile` - Container definition

**Key Features**:
- Content screening
- Safety checks
- Moderation workflows

**Dependencies**: Fastify, Moderation APIs, NATS

---

### 16. Journey Engine (`services/journey-engine/`)

**Purpose**: User journey orchestration  
**Port**: 3009 (⚠️ Port conflict with builder-runtime)  
**Status**: ✅ Functional  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`

**Files** (15 files: 12 *.ts, 3 *.yaml):
- `src/index.ts` - Service entry point
- `src/routes/` - Journey routes
- `src/lib/` - Journey orchestration
- `__tests__/` - Tests (2 *.ts)
- `Dockerfile` - Container definition
- `README.md` - Documentation

**Key Features**:
- Journey rule engine
- User journey tracking
- Workflow orchestration

**Dependencies**: Fastify, YAML configs, NATS

---

### 17. Forecast Service (`services/forecast/`)

**Purpose**: Time-series forecasting  
**Port**: 3007 (⚠️ Port conflict)  
**Status**: ✅ Functional  
**Dockerfile**: ❌ Missing  
**Health Endpoint**: `/health`

**Files** (18 *.ts files):
- `src/index.ts` - Service entry point
- `src/routes/` - Forecast routes
- `src/lib/` - Forecasting algorithms
- `vitest.config.ts` - Test configuration
- `README.md` - Documentation

**Key Features**:
- Time-series forecasting
- Trend analysis
- Predictive metrics

**Dependencies**: Fastify, Forecasting libraries, Drizzle ORM

---

### 18. Impact Calculator (`services/impact-calculator/`)

**Purpose**: VIS score calculation  
**Port**: 3012  
**Status**: ✅ Production-ready  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`

**Files** (4 *.ts files):
- `src/index.ts` - Service entry point
- `src/lib/` - Calculation logic
- `tests/` - Tests (1 *.ts)
- `Dockerfile` - Container definition
- `README.md` - Documentation

**Key Features**:
- VIS calculation
- Impact scoring

**Dependencies**: Fastify, Calculation libraries

---

### 19. Billing Service (`services/billing/`)

**Purpose**: Billing and metering  
**Port**: 3010 (⚠️ Port conflict)  
**Status**: ✅ Functional  
**Dockerfile**: ❌ Missing  
**Health Endpoint**: `/api/billing/health`

**Files** (15 *.ts files):
- `src/index.ts` - Service entry point
- `src/routes/` - Billing routes
- `src/lib/` - Billing logic

**Key Features**:
- Usage metering
- Billing calculations
- Invoice generation

**Dependencies**: Fastify, Billing APIs

---

### 20. Data Residency Service (`services/data-residency/`)

**Purpose**: Regional data governance  
**Port**: config-based  
**Status**: ✅ Functional  
**Dockerfile**: ❌ Missing  
**Health Endpoint**: `/health`

**Files** (15 *.ts files):
- `src/index.ts` - Service entry point
- `src/routes/` - Residency routes
- `src/lib/` - Residency enforcement

**Key Features**:
- Data residency enforcement
- Regional compliance
- Data location tracking

**Dependencies**: Fastify, Drizzle ORM

---

### 21. AI Budget Service (`services/ai-budget/`)

**Purpose**: AI budget management and enforcement  
**Port**: 3010 (⚠️ Port conflict)  
**Status**: ✅ Functional  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: `/health`

**Files**:
- `src/index.ts` - Service entry point
- `src/budget-enforcer.ts` - Budget enforcement
- `src/routes/` - API routes (2 *.ts)
- `src/db/` - Database (4 files: 2 *.sql, 2 *.ts)
- `src/types/` - Types (1 *.ts)
- `Dockerfile` - Container definition

**Key Features**:
- AI token budget tracking
- Budget enforcement
- Cost monitoring

**Dependencies**: Fastify, Database, Budget APIs

---

### 22. Privacy Orchestrator (`services/privacy-orchestrator/`)

**Purpose**: Privacy orchestration and DSAR handling  
**Port**: 3010 (⚠️ Port conflict)  
**Status**: ✅ Functional  
**Dockerfile**: ❌ Missing  
**Health Endpoint**: `/privacy/health`

**Files** (6 *.ts files):
- `src/index.ts` - Service entry point
- `src/routes/` - Privacy routes
- `src/lib/` - DSAR orchestration
- `README.md` - Documentation

**Key Features**:
- DSAR (Data Subject Access Request) handling
- Privacy compliance
- Data deletion workflows

**Dependencies**: Fastify, Drizzle ORM, NATS

---

### 23. GDPR Service (`services/gdpr-service/`)

**Purpose**: GDPR compliance service  
**Port**: N/A  
**Status**: 🔴 **BROKEN** - Stub only  
**Dockerfile**: ❌ Missing  
**Health Endpoint**: N/A

**Files** (3 *.ts files - stub only):
- `src/routes/` - Route stubs only
- ❌ No `package.json`
- ❌ No main entry point
- ❌ Cannot be deployed

**⚠️ Critical Issue**: Incomplete stub - needs completion or removal

---

### 24. Builder Runtime (`services/builder-runtime/`)

**Purpose**: Query builder runtime  
**Port**: 3009 (⚠️ Port conflict)  
**Status**: ✅ Functional  
**Dockerfile**: ❌ Missing  
**Health Endpoint**: `/health`

**Files** (12 *.ts files):
- `src/index.ts` - Service entry point
- `src/lib/` - Builder logic

**Key Features**:
- Dynamic query building
- Runtime query execution

**Dependencies**: Fastify, Query builders

---

### 25. Synthetics Service (`services/synthetics/`)

**Purpose**: Synthetic monitoring (cron-based)  
**Port**: N/A (cron scheduler)  
**Status**: ✅ Functional  
**Dockerfile**: ❌ Missing  
**Health Endpoint**: N/A (non-HTTP)

**Files**:
- `src/index.ts` - Service entry point
- `pilot-routes/` - Pilot routes (10 *.ts files)
- `schemas/` - Schemas (1 *.sql)

**Key Features**:
- Synthetic monitoring
- Cron-based scheduling
- Health checks

**Dependencies**: Node cron, Monitoring libraries

---

### 26. Discord Bot (`services/discord-bot/`)

**Purpose**: Discord feedback integration  
**Port**: N/A (Discord.js client)  
**Status**: ✅ Functional  
**Dockerfile**: ✅ Yes  
**Health Endpoint**: N/A (non-HTTP)

**Files** (9 *.ts files):
- `src/index.ts` - Bot entry point
- `src/lib/` - Bot logic
- `Dockerfile` - Container definition

**Key Features**:
- Discord integration
- Feedback collection
- Event publishing

**Dependencies**: Discord.js, NATS

---

## Service Files Database

### Complete File Listing by Service

See `FILES_DATABASE.json` for complete file database with metadata.

---

## Service Dependencies

### Dependency Graph

```
api-gateway
  ├── All services (routes requests)
  └── Redis (rate limiting)

reporting
  ├── analytics (data)
  ├── q2q-ai (insights)
  └── PostgreSQL (metrics)

analytics
  ├── ClickHouse (time-series)
  └── PostgreSQL (metadata)

impact-in
  ├── External APIs (Benevity, Goodera, Workday)
  └── NATS (events)

q2q-ai
  ├── Model registry (AI models)
  └── NATS (events)

campaigns
  ├── program-service (templates)
  ├── billing (monetization)
  └── reporting (metrics)

unified-profile
  ├── NATS (events)
  └── PostgreSQL (profiles)

buddy-service
  ├── NATS (events)
  └── PostgreSQL (matches)

connectors (buddy, kintell, upskilling)
  ├── External systems
  ├── NATS (events)
  └── PostgreSQL (data)
```

---

## Service Ports & Configuration

### Port Assignment (Current - 65xx Range)

**TEEI CSR Platform Services** (Managed by PM2 ecosystem config at `D:\Dev\docker\ecosystem.config.cjs`):

| Service | PM2 Name | Port | URL | Status |
|---------|----------|------|-----|--------|
| API Gateway | `csr-api-gateway` | **6501** | http://localhost:6501 | ✅ OK |
| Unified Profile | `csr-unified-profile` | **6502** | http://localhost:6502 | ✅ OK |
| Kintell Connector | `csr-kintell-connector` | **6503** | http://localhost:6503 | ✅ OK |
| Buddy Service | `csr-buddy-service` | **6504** | http://localhost:6504 | ✅ OK |
| Buddy Connector | `csr-buddy-connector` | **6505** | http://localhost:6505 | ✅ OK |
| Upskilling Connector | `csr-upskilling-connector` | **6506** | http://localhost:6506 | ✅ OK |
| Q2Q AI | `csr-q2q-ai` | **6507** | http://localhost:6507 | ✅ OK |
| Safety Moderation | `csr-safety-moderation` | **6508** | http://localhost:6508 | ✅ OK |
| Corp Cockpit (Dashboard) | `csr-corp-cockpit` | **6509** | http://localhost:6509 | ✅ OK |

**Other Services** (Not managed by PM2 ecosystem, may use different ports):
- forecast, impact-in, reporting, analytics, insights-nlq, notifications, builder-runtime, journey-engine, ai-budget, billing, privacy-orchestrator, impact-calculator, discord-bot, synthetics, gdpr-service

> **Note**: The 9 core CSR Platform services listed above are managed by the global PM2 ecosystem and use the 65xx port range to avoid conflicts with other development servers.

---

## Service Health Status

### Production-Ready (✅)
- api-gateway
- analytics
- reporting
- impact-in
- q2q-ai
- unified-profile
- buddy-service
- kintell-connector
- upskilling-connector
- safety-moderation
- impact-calculator
- campaigns
- program-service
- notifications
- journey-engine
- forecast
- ai-budget
- privacy-orchestrator
- builder-runtime
- synthetics
- discord-bot

### Needs Attention (⚠️)
- insights-nlq (merge conflicts, missing Dockerfile)
- billing (missing Dockerfile, port conflict)
- data-residency (missing Dockerfile)
- builder-runtime (missing Dockerfile, port conflict)
- forecast (missing Dockerfile, port conflict)
- privacy-orchestrator (missing Dockerfile, port conflict)

### Broken (🔴)
- gdpr-service (incomplete stub)

---

**Last Updated**: 2025-01-27  
**Index Version**: 1.0




