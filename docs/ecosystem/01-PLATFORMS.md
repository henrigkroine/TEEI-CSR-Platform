# TEEI Platforms & Deployments

**Last Updated**: 2025-01-27

---

## Frontend Applications

### 1. Corporate Cockpit (`apps/corp-cockpit-astro`)

- **Project Name**: `@teei/corp-cockpit-astro`
- **Location**: `apps/corp-cockpit-astro/`
- **Dev Port**: `4327` (127.0.0.1)
- **Production URL**: ❓ Unknown (check Cloudflare Pages)
- **Cloudflare Pages Project**: ❓ Unknown
- **Purpose**: Main corporate dashboard for CSR reporting, metrics, and program management
- **Tech Stack**: 
  - Astro 4.0
  - React 18.2
  - Tailwind CSS 3.4
  - TypeScript 5.3
- **Features**:
  - Multi-tenant routing (`/cockpit/[companyId]`)
  - i18n support (en, no, uk)
  - Server-Sent Events (SSE) for real-time updates
  - Admin pages, evidence explorer, reports generation
  - Campaign management, boardroom mode
  - 93+ Astro pages
- **API Endpoints**: 8 endpoints (see 03-API-ENDPOINTS.md)
- **Status**: ✅ Working

### 2. Trust Center (`apps/trust-center`)

- **Project Name**: `@teei/trust-center`
- **Location**: `apps/trust-center/`
- **Dev Port**: `4322`
- **Production URL**: ❓ Unknown
- **Cloudflare Pages Project**: ❓ Unknown
- **Purpose**: Public transparency portal for security, privacy, and AI governance
- **Tech Stack**: 
  - Astro 4.0
  - Tailwind CSS 3.4
  - TypeScript 5.3
- **Pages**:
  - `/` - Home
  - `/security` - Security information
  - `/privacy` - Privacy policy
  - `/ai-transparency` - AI governance
  - `/status` - System status
  - `/incidents` - Incident reports
  - `/sub-processors` - Sub-processor list
  - `/impact/[slug]` - Impact stories
- **Status**: ✅ Working

---

## API Gateway

### API Gateway (`services/api-gateway`)

- **Project Name**: `@teei/api-gateway`
- **Location**: `services/api-gateway/`
- **Dev Port**: `3017` (or `3000` depending on config)
- **Production URL**: ❓ Unknown
- **Purpose**: Unified API gateway with JWT authentication, rate limiting, and reverse proxy routing
- **Features**:
  - JWT authentication (HS256, upgrading to RS256)
  - RBAC middleware (4 roles: admin, company_admin, participant, volunteer)
  - Rate limiting (100 req/min)
  - Health check aggregation
  - Tenant-scoped routing
  - CORS support
  - Request/response logging
- **Routes**: 12+ versioned endpoints
- **Status**: ✅ Production-ready

---

## Core Services (8)

| Service | Port | Status | Purpose | Health Endpoint |
|---------|------|--------|---------|----------------|
| **unified-profile** | 3018 | ✅ | User identity and profile management | `/health` |
| **analytics** | 3023 | ✅ | ClickHouse analytics engine, SROI/VIS | `/health` |
| **reporting** | 4017 | ✅ | Gen-AI report generation | `/health` |
| **q2q-ai** | 3021 | ✅ | Qualitative to Quantitative pipeline | `/health` |
| **safety-moderation** | 3022 | ✅ | Content moderation, AI safety | `/health` |
| **notifications** | 3024 | ✅ | Multi-channel notifications | `/health` |
| **buddy-service** | 3019 | ✅ | Buddy matching and relationships | `/health` |
| **journey-engine** | 3024 | ✅ | Journey tracking | `/health` |

---

## Connector Services (4)

| Service | Port | Status | Purpose | Health Endpoint |
|---------|------|--------|---------|----------------|
| **kintell-connector** | 3027 | ✅ | Kintell learning platform integration | `/health` |
| **buddy-connector** | 3029 | ✅ | Buddy platform integration | `/health` |
| **upskilling-connector** | 3028 | ✅ | Upskilling platform integration | `/health` |
| **impact-in** | 3007 | ✅ | Impact-In API + external connectors | `/health` |

---

## Infrastructure Services (6)

| Service | Port | Status | Purpose | Health Endpoint |
|---------|------|--------|---------|----------------|
| **ai-budget** | ❓ | ✅ | AI cost tracking and budgets | `/health` |
| **builder-runtime** | ❓ | ✅ | Runtime for builder tools | `/health` |
| **synthetics** | ❓ | ✅ | Synthetic monitoring | `/health` |
| **data-residency** | ❓ | ✅ | Data residency enforcement | `/health` |
| **privacy-orchestrator** | ❓ | ✅ | Privacy request orchestration | `/health` |
| **gdpr-service** | ❓ | 🔴 | Stub only (broken) | `/health` |

---

## Business Services (7)

| Service | Port | Status | Purpose | Health Endpoint |
|---------|------|--------|---------|----------------|
| **campaigns** | ❓ | ✅ | Campaign lifecycle management | `/health` |
| **program-service** | ❓ | ✅ | Program management | `/health` |
| **billing** | ❓ | ✅ | Billing and subscriptions | `/health` |
| **forecast** | ❓ | ✅ | Forecasting service | `/health` |
| **impact-calculator** | ❓ | ✅ | VIS score calculations | `/health` |
| **insights-nlq** | ❓ | ✅ | Natural language queries | `/health` |
| **discord-bot** | 3026 | ⚠️ | Discord integration (partial) | `/health` |

---

## Development Ports Summary

From root `package.json` dev script:
- **Gateway**: 3017
- **Profile**: 3018
- **Kintell**: 3027
- **Buddy**: 3019
- **Buddy Connector**: 3029
- **Upskilling**: 3028
- **Q2Q**: 3021
- **Safety**: 3022
- **Cockpit**: 4327
- **Trust Center**: 4322

---

## Production Deployment

**Status**: ❓ Unknown
- Need to check Cloudflare Pages projects
- Need to verify production URLs
- Need to document deployment process
- Need to document environment variables per deployment

---

## Shared Packages (20+)

| Package | Purpose | Location |
|---------|---------|----------|
| `shared-schema` | Database schema + migrations | `packages/shared-schema/` |
| `shared-auth` | Authentication utilities | `packages/shared-auth/` |
| `shared-types` | TypeScript type definitions | `packages/shared-types/` |
| `shared-utils` | Common utilities | `packages/shared-utils/` |
| `metrics` | Metrics calculation library | `packages/metrics/` |
| `observability` | OpenTelemetry instrumentation | `packages/observability/` |
| `entitlements` | Feature flag system | `packages/entitlements/` |
| `data-masker` | PII redaction | `packages/data-masker/` |
| `ingestion-buddy` | Data ingestion utilities | `packages/ingestion-buddy/` |
| `program-templates` | Program template definitions | `packages/program-templates/` |
| `clients` | HTTP client libraries | `packages/clients/` |
| `event-contracts` | Event schema definitions | `packages/event-contracts/` |
| `openapi` | OpenAPI specifications | `packages/openapi/` |
| `sdk/typescript` | TypeScript SDK | `packages/sdk/typescript/` |
| `sdk/embeds` | Embed SDK | `packages/sdk/embeds/` |
| `model-registry` | AI model registry | `packages/model-registry/` |
| `http-client` | HTTP client | `packages/http-client/` |
| `events` | Event definitions | `packages/events/` |
| `contracts` | Service contracts | `packages/contracts/` |
| `compliance` | Compliance utilities | `packages/compliance/` |

---

## Service Health Checks

All services implement standard health endpoints:
- `GET /health` - Basic health check
- `GET /health/live` - Kubernetes liveness probe
- `GET /health/ready` - Kubernetes readiness probe
- `GET /health/dependencies` - Dependency checks

**API Gateway** also provides:
- `GET /health/all` - Aggregate health of all services

---

## Next Steps

1. Document production URLs for all platforms
2. Document Cloudflare Pages project names
3. Verify all service ports in production
4. Document deployment process
5. Create service dependency graph

**Next**: See [02-DATABASE-SCHEMA.md](./02-DATABASE-SCHEMA.md) for database structure.
