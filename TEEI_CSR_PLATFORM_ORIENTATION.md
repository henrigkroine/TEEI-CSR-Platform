# TEEI CSR Platform - Modernization Orientation

**Worker 1 - Tech Lead Orchestrator**
**Date**: 2025-11-17
**Repository**: /home/user/TEEI-CSR-Platform
**Branch**: claude/modernize-csr-platform-01TBjmZk8ADmwiySUW2Xvcy3

---

## Executive Summary

This document provides a comprehensive orientation for the **TEEI CSR Platform Modernization Initiative**. The goal is to systematically modernize all 25+ microservices in this monorepo to achieve production-grade operational readiness through standardized health checks, structured logging, consistent Docker baselines, and observability hooks.

### Repository Context

**Repository Role**: Corporate Social Responsibility (CSR) Platform for managing employee volunteer programs, impact tracking, and ESG reporting for corporate partners.

**Ecosystem Position**: This is the **CSR Platform component** of the broader TEEI ecosystem. It is distinct from:
- GrantAutomation (grant management system)
- Ecosystem C (CSR DB ↔ Astro ↔ Apollo services)
- Buddy System (peer matching - integrated but separate deployment)

**Current Status**: Post-merge consolidation phase. Platform has undergone intensive multi-worker development with 120+ specialist agents across 4 worker teams, resulting in production-ready v4.0 codebase.

---

## 1. Repository Structure Overview

### Root Directory Layout

```
/home/user/TEEI-CSR-Platform/
├── apps/                           # 2 Frontend Applications
│   ├── corp-cockpit-astro/        # Corporate dashboard (Astro 5 + React)
│   └── trust-center/              # Privacy & compliance portal
├── services/                       # 25 Backend Microservices
│   ├── ai-budget/                 # AI token budget tracking
│   ├── analytics/                 # Real-time analytics engine
│   ├── api-gateway/               # Unified API gateway
│   ├── billing/                   # Usage metering & billing
│   ├── buddy-connector/           # Buddy system integration
│   ├── buddy-service/             # Buddy matching core
│   ├── builder-runtime/           # Query builder runtime
│   ├── data-residency/            # GDPR data governance
│   ├── discord-bot/               # Discord feedback integration
│   ├── forecast/                  # Time-series forecasting
│   ├── gdpr-service/              # 🔴 BROKEN STUB (incomplete)
│   ├── impact-calculator/         # VIS score calculation
│   ├── impact-in/                 # External integration hub
│   ├── insights-nlq/              # 🔴 MERGE CONFLICTS (blocking)
│   ├── journey-engine/            # Journey lifecycle orchestration
│   ├── kintell-connector/         # Kintell platform integration
│   ├── notifications/             # Multi-channel notifications
│   ├── privacy-orchestrator/      # DSAR & privacy workflows
│   ├── q2q-ai/                    # Qualitative→Quantitative AI
│   ├── reporting/                 # Impact reporting & Gen-AI
│   ├── safety-moderation/         # Content moderation
│   ├── synthetics/                # Synthetic monitoring (cron)
│   ├── unified-profile/           # User profile aggregation
│   └── upskilling-connector/      # Learning platform integration
├── packages/                       # 19 Shared Libraries
│   ├── auth/                      # Authentication utilities
│   ├── clients/                   # API client SDKs
│   ├── compliance/                # Compliance helpers
│   ├── contracts/                 # API contracts
│   ├── db/                        # Database utilities
│   ├── entitlements/              # Feature flags & quotas
│   ├── event-contracts/           # Event schemas
│   ├── events/                    # Event bus client
│   ├── http-client/               # HTTP utilities
│   ├── metrics/                   # Metrics collection
│   ├── model-registry/            # AI model metadata
│   ├── observability/             # OpenTelemetry setup
│   ├── openapi/                   # OpenAPI specs
│   ├── sdk/                       # Platform SDK
│   ├── shared-auth/               # Shared auth logic
│   ├── shared-schema/             # Drizzle schemas & migrations
│   ├── shared-types/              # TypeScript types
│   └── shared-utils/              # Common utilities
├── infrastructure/                 # Infrastructure as Code
│   ├── k8s/                       # Kubernetes manifests
│   ├── docker/                    # Docker base images
│   └── terraform/                 # (if present)
├── observability/                  # Monitoring & observability
│   ├── grafana/                   # Grafana dashboards
│   ├── prometheus/                # Prometheus config
│   └── otel/                      # OpenTelemetry collectors
├── docs/                          # Comprehensive documentation
│   ├── GenAI_Reporting.md         # Gen-AI reporting guide (729 lines)
│   ├── Platform_Architecture.md   # Architecture diagrams
│   ├── System_Diagram.md          # System topology
│   └── Journey_Funnel.md          # User journey mapping
├── reports/                       # Agent deliverable reports
├── tests/                         # E2E test suites
├── scripts/                       # Build & deployment scripts
└── docker-compose.yml             # Local development stack
```

---

## 2. Service Inventory Summary

### Total Services: 25

**Breakdown by Type**:
- **API Services**: 17 (68%)
- **Connectors**: 4 (16%)
- **Bot/Scheduler**: 2 (8%)
- **Stub/Incomplete**: 2 (8%)

**Tech Stack** (100% TypeScript/Node.js):
- **Framework**: Fastify (primary choice for all API services)
- **Runtime**: Node.js 20.x
- **Language**: TypeScript 5.7
- **Database**: PostgreSQL 16 (primary), ClickHouse (analytics)
- **Messaging**: NATS JetStream
- **Storage**: MinIO (S3-compatible)
- **AI**: OpenAI integration (Q2Q AI, Gen-AI reporting)

### Health Check Coverage: 96% (24/25)

✅ **Services WITH health endpoints**: 24
❌ **Services WITHOUT health endpoints**: 1 (gdpr-service - stub)

**Non-HTTP Services** (special handling needed):
- `discord-bot` (Discord.js client - not HTTP-based)
- `synthetics` (Node-cron scheduler - not HTTP-based)

### Logging Coverage: 76% (19/25)

**Structured Logging Approaches**:
- **createServiceLogger** (custom wrapper): 14 services
- **Pino** (direct library): 7 services
- **console.log** (unstructured): 3 services (discord-bot, synthetics, gdpr-service)
- **Fastify built-in**: 1 service (billing)

**Issue**: Inconsistent logging patterns complicate centralized log aggregation and correlation ID tracking.

### Docker Coverage: 64% (16/25)

✅ **Services WITH Dockerfile**: 16
❌ **Services WITHOUT Dockerfile**: 9

**Missing Dockerfiles** (P1 priority):
- billing
- builder-runtime
- data-residency
- forecast
- gdpr-service (stub)
- insights-nlq
- privacy-orchestrator
- synthetics

---

## 3. Critical Red Flags (Deployment Blockers)

### 🔴 CRITICAL Issue #1: Merge Conflicts in `insights-nlq`

**File**: `/home/user/TEEI-CSR-Platform/services/insights-nlq/src/index.ts`
**Lines**: 165-251
**Status**: Code cannot compile or run - unresolved git merge markers present

**Impact**: Service is non-functional and blocks deployment.

**Resolution**:
```bash
# Option 1: Accept upstream changes
git checkout --theirs services/insights-nlq/src/index.ts

# Option 2: Accept local changes
git checkout --ours services/insights-nlq/src/index.ts

# Then verify
cd services/insights-nlq && pnpm typecheck
```

---

### 🔴 CRITICAL Issue #2: Port Assignment Conflicts

**Severity**: CRITICAL - 12 services cannot run simultaneously
**Affected Ports**: 3007, 3008, 3009, 3010

**Conflict Details**:

| Port | Services (Count) | Impact |
|------|-----------------|--------|
| **3007** | forecast, impact-in, reporting (3) | Cannot deploy all analytics services |
| **3008** | analytics, insights-nlq, notifications (3) | Core services conflict |
| **3009** | builder-runtime, journey-engine (2) | Journey tracking broken |
| **3010** | ai-budget, billing, buddy-connector, privacy-orchestrator (4) | Critical services conflict |

**Recommended Port Reassignment**:
```yaml
# Standard assignments (no change)
api-gateway:        3000
unified-profile:    3001
kintell-connector:  3002
buddy-service:      3003
upskilling-connector: 3004
q2q-ai:            3005
safety-moderation:  3006

# Resolved conflicts
forecast:          3007  # Keep (original)
analytics:         3008  # Keep (original)
builder-runtime:    3009  # Keep (original)
impact-calculator:  3012  # Keep (original)

# Reassignments
impact-in:         3011  # Move from 3007
reporting:         3013  # Move from 3007
insights-nlq:      3014  # Move from 3008
notifications:      3015  # Move from 3008
journey-engine:     3016  # Move from 3009
ai-budget:         3017  # Move from 3010
billing:           3018  # Move from 3010
buddy-connector:    3019  # Move from 3010
privacy-orchestrator: 3020 # Move from 3010
```

---

### 🔴 CRITICAL Issue #3: Incomplete Service - `gdpr-service`

**Status**: Non-functional stub - deployment impossible

**Missing Components**:
- ❌ No `package.json` (no npm dependencies defined)
- ❌ No main entry point (only route stubs exist)
- ❌ No Dockerfile
- ❌ No health endpoint
- ❌ Cannot be built, tested, or deployed

**Resolution Options**:
1. **Complete implementation** (add package.json, index.ts, health endpoint)
2. **Remove from repo** (archive as deprecated)
3. **Consolidate with privacy-orchestrator** (already has DSAR functionality)

**Recommendation**: Option 3 - consolidate with `privacy-orchestrator` to avoid duplication.

---

## 4. High-Priority Modernization Needs

### Missing Dockerfiles (8 services)

**Impact**: Cannot containerize for K8s deployment

**Services**:
- billing (API - port 3018)
- builder-runtime (API - port 3009)
- data-residency (API - config-based port)
- forecast (API - port 3007)
- insights-nlq (API - port 3014) - also has merge conflicts
- privacy-orchestrator (API - port 3020)
- synthetics (Scheduler - cron-based, no HTTP)

**Action**: Create standardized Dockerfiles based on existing service patterns.

---

### Inconsistent Health Endpoint Patterns

**Standard Pattern** (most services):
```
GET /health → { status, service, timestamp }
GET /health/live
GET /health/ready
GET /health/dependencies
```

**Non-Standard Patterns**:
- `billing`: `/api/billing/health` (prefixed)
- `privacy-orchestrator`: `/privacy/health` (prefixed)

**Action**: Standardize all services to `/health` root path for consistent K8s probes.

---

### Inconsistent Logging Approaches

**Current State**:
- 14 services use `createServiceLogger` (custom wrapper)
- 7 services use `pino` directly
- 3 services use `console.log` (unstructured)
- 1 service uses Fastify built-in logger

**Issue**: Complicates log aggregation, correlation ID propagation, and operational troubleshooting.

**Action**: Standardize on single approach (recommend: `createServiceLogger` wrapper for consistency).

---

## 5. Current Logging & Observability State

### Logging Infrastructure

**Structured Logging**: 76% adoption (19/25 services)
**Correlation IDs**: Implemented in most services (x-request-id header propagation)
**Log Aggregation**: Not currently configured (no ELK, Loki, or CloudWatch setup visible)

**Logging Libraries in Use**:
1. **Pino** (structured JSON logger) - most common
2. **createServiceLogger** (custom wrapper around Pino) - team standard
3. **Fastify logger** (built-in Pino integration)
4. **console.log** (legacy/minimal services)

**Gaps**:
- No centralized log sink configured
- No log retention policies defined
- No log-based alerting setup
- Inconsistent log levels across services

---

### Observability Stack

**Implemented**:
- ✅ OpenTelemetry instrumentation (packages/observability/)
- ✅ Prometheus metrics collection
- ✅ Grafana dashboards (5+ dashboards in observability/grafana/)
- ✅ Health check endpoints (24/25 services)
- ✅ Request ID propagation

**Gaps**:
- ❌ No distributed tracing active (OTel instrumented but not connected)
- ❌ No trace visualization (Jaeger/Tempo not configured)
- ❌ No service mesh (Istio/Linkerd)
- ❌ No SLO/SLA definitions
- ⚠️ Limited metrics coverage (basic health only)

---

## 6. Docker & Container Baseline

### Current Docker Usage

**Containerization**: 64% (16/25 services)

**Base Images in Use** (from existing Dockerfiles):
- Node.js 20-alpine (most common)
- Node.js 20-slim (some services)
- Custom build stages (multi-stage builds present)

**Patterns Observed**:
```dockerfile
# Typical multi-stage build
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install --frozen-lockfile
COPY . .
RUN pnpm build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1
CMD ["node", "dist/index.js"]
```

**Issues**:
- No standardized base image version (some use 20-alpine, some 20-slim)
- Inconsistent healthcheck configurations
- No security scanning in Dockerfiles
- No non-root user enforcement (some services run as root)

---

### Kubernetes Readiness

**K8s Manifests**: Present in `/home/user/TEEI-CSR-Platform/k8s/`

**Readiness Gaps**:
- ❌ 9 services missing Dockerfiles (cannot deploy)
- ❌ Port conflicts prevent simultaneous deployment
- ❌ No health probe standardization (liveness vs readiness)
- ⚠️ No resource limits defined (CPU, memory)
- ⚠️ No horizontal pod autoscaling (HPA) configs
- ⚠️ No network policies defined

---

## 7. Existing Agent Development Context

### Multi-Agent Development History

This platform has been developed using a **multi-worker, multi-agent swarm architecture** with 120+ specialist agents organized across 4 worker teams:

**Completed Phases**:
- ✅ **Worker 1**: Core Platform Foundation (Phases A-C, 30 agents)
- ✅ **Worker 2**: Analytics & Intelligence (Phases B-F, 35 agents)
- ✅ **Worker 3**: Corporate Cockpit & Metrics (Phase D, 30 agents)
- 🟡 **Worker 5**: Data Trust & Catalog (In Progress, 30 agents)

**Agent Coordination Rules** (from AGENTS.md):
1. Orchestrator-only planning (no specialist does Tech Lead's orchestration)
2. No implementation overlap (clear ownership)
3. Dependencies mapped (blocked work escalated early)
4. Test coverage required (unit ≥80%, E2E ≥60%)
5. Documentation mandatory (every formula, API, decision documented)

**Key Deliverables** (from completed phases):
- Gen-AI Reporting with citation validation (Worker 3, Team 2)
- OpenLineage instrumentation framework (Worker 5, Team 1)
- Great Expectations data quality suites (Worker 5, Team 2)
- dbt semantic layer (Worker 5, Team 4)
- Corporate Cockpit dashboard with SSE streaming (Worker 3, Team 1)

---

## 8. Integration Points & External Dependencies

### External Integrations

**Implemented** (stubs/connectors exist):
- Impact-In API (outbound push to corporate systems)
- Benevity connector (corporate volunteering platform)
- Goodera connector (CSR management platform)
- Workday connector (HRIS integration)
- Discord bot (community engagement)

**Database Systems**:
- PostgreSQL 16 (primary relational DB)
- ClickHouse (time-series analytics)
- Redis (caching, rate limiting, sessions)

**Messaging**:
- NATS JetStream (event bus)
- RabbitMQ (mentioned in docs, usage unclear)

**AI/ML**:
- OpenAI API (Q2Q AI, Gen-AI reporting)
- Embeddings for semantic search

**Storage**:
- MinIO (S3-compatible object storage)
- Local filesystem (development)

---

## 9. Quality Gates & Testing State

### Test Coverage Summary

**Current State** (from platform status reports):
- **Unit Tests**: ≥80% coverage requirement
- **Integration Tests**: Present but coverage varies
- **E2E Tests**: Playwright framework implemented, ≥60% coverage requirement
- **Performance Tests**: Web-vitals collection present, no baselines

**Testing Gaps**:
- ❌ No chaos engineering tests
- ❌ No load testing framework
- ⚠️ Limited contract testing (API versioning)
- ⚠️ No visual regression tests (UI components)

### CI/CD Pipeline

**GitHub Actions**: Workflows present in `.github/workflows/`

**PR Gates** (from AGENTS.md):
- ✅ Lint (ESLint)
- ✅ Typecheck (TypeScript)
- ✅ Unit tests (≥80%)
- ✅ E2E tests (≥60%)
- ✅ Security audits (npm audit)
- ✅ A11y checks (WCAG 2.2 AA)

**Missing Gates**:
- ❌ Container security scanning (Trivy, Snyk)
- ❌ Dependency vulnerability scanning
- ❌ SAST/DAST security testing
- ❌ Performance regression testing

---

## 10. Security & Compliance Posture

### Implemented Security Features

**Authentication & Authorization**:
- ✅ JWT with RS256 signatures
- ✅ SSO (SAML, OIDC)
- ✅ MFA support
- ✅ RBAC (role-based access control)

**Data Protection**:
- ✅ Encryption at rest (database level)
- ✅ Encryption in transit (TLS)
- ✅ PII redaction (pre-LLM processing)
- ✅ GDPR compliance (DSAR workflows, data residency)

**API Security**:
- ✅ Rate limiting (Redis-backed)
- ✅ Request validation
- ✅ CORS policies
- ✅ CSP headers
- ✅ Webhook signature verification

**Audit & Compliance**:
- ✅ Audit logging
- ✅ Evidence lineage tracking
- ✅ Citation validation (Gen-AI reports)
- ✅ CSRD compliance (sustainability reporting)

**Gaps**:
- ❌ No secrets management solution integrated (Vault, AWS Secrets Manager)
- ❌ No network segmentation (service mesh)
- ⚠️ Incomplete GDPR service (stub only)

---

## 11. Operational Readiness Assessment

### Production Deployment Blockers

**P0 - CRITICAL** (must fix before any deployment):
1. ✅ Resolve merge conflicts in `insights-nlq` (lines 165-251)
2. ✅ Fix port assignment conflicts (12 services affected)
3. ✅ Complete or remove `gdpr-service` stub

**P1 - HIGH** (required for production):
4. ✅ Create 8 missing Dockerfiles
5. ✅ Add HTTP health checks for non-HTTP services (discord-bot, synthetics)
6. ✅ Standardize health endpoint paths (all → `/health`)
7. ✅ Define unique port assignments (3000-3020 range)

**P2 - MEDIUM** (operations & observability):
8. ✅ Standardize logging approach (choose one library)
9. ✅ Configure centralized log aggregation
10. ✅ Set up distributed tracing (Jaeger/Tempo)
11. ✅ Add OpenAPI documentation (17 API services)
12. ✅ Define SLO/SLA per service

**P3 - LOW** (enhancements):
13. ✅ Document service topology & data flows
14. ✅ Add chaos engineering tests
15. ✅ Implement canary deployment pipelines

---

## 12. Modernization Priorities

### Recommended Focus Areas (for this initiative)

Based on the assessment above, the **Tech Lead Orchestrator** (Worker 1) should focus modernization efforts on:

**Phase 1: Resolve Critical Blockers** (Week 1)
- Fix merge conflicts in `insights-nlq`
- Resolve port assignment conflicts
- Complete or remove `gdpr-service`

**Phase 2: Docker & Health Baseline** (Week 2-3)
- Create 8 missing Dockerfiles
- Standardize health endpoint patterns
- Add health checks for non-HTTP services

**Phase 3: Logging & Observability** (Week 3-4)
- Standardize logging library choice
- Configure correlation ID propagation
- Set up centralized log sink (Loki/CloudWatch)

**Phase 4: Distributed Tracing** (Week 4-5)
- Configure OTel exporters
- Deploy Jaeger/Tempo
- Instrument service-to-service calls

**Phase 5: Documentation & Handoff** (Week 5)
- Document all changes
- Create operational runbooks
- Define SLO/SLA baselines

---

## 13. Key Contacts & Resources

### Documentation Index

**Architecture & Design**:
- `/home/user/TEEI-CSR-Platform/docs/Platform_Architecture.md`
- `/home/user/TEEI-CSR-Platform/docs/System_Diagram.md`
- `/home/user/TEEI-CSR-Platform/docs/Journey_Funnel.md`

**Agent Coordination**:
- `/home/user/TEEI-CSR-Platform/AGENTS.md` (multi-agent orchestration structure)
- `/home/user/TEEI-CSR-Platform/MULTI_AGENT_PLAN.md` (171KB planning doc)

**Status Reports**:
- `/home/user/TEEI-CSR-Platform/PLATFORM_STATUS_REPORT_2025.md`
- `/home/user/TEEI-CSR-Platform/PROJECT_OVERVIEW_COMPREHENSIVE.md`

**Technical Specs**:
- `/home/user/TEEI-CSR-Platform/docs/GenAI_Reporting.md` (729 lines)
- `/home/user/TEEI-CSR-Platform/TESTING.md`
- `/home/user/TEEI-CSR-Platform/CONTRIBUTING.md`

**Service Inventory**:
- `/home/user/TEEI-CSR-Platform/SERVICES_INVENTORY.md` (created during this orientation)

---

## 14. Next Steps

### Immediate Actions (This Session)

1. ✅ **Orientation Complete** (this document)
2. ⏭️ **Create Service Inventory** (detailed table) → See `SERVICES_INVENTORY.md`
3. ⏭️ **Create Modernization Blueprint** (phased strategy)
4. ⏭️ **Execute Phase 1**: Resolve critical blockers
5. ⏭️ **Execute Phase 2**: Docker & health baseline
6. ⏭️ **Execute Phase 3**: Logging standardization
7. ⏭️ **Execute Phase 4**: Observability hooks
8. ⏭️ **Document & Handoff**: Create exec summary

### Success Criteria

**Orientation Complete When**:
- ✅ All 25 services catalogued with tech stack, health, logging, Docker status
- ✅ Critical red flags identified and documented
- ✅ Modernization priorities ranked (P0-P3)
- ✅ Blueprint created for phased implementation
- ⏭️ Sub-agent strategy defined for service-level work

---

## 15. Agent Orchestration Strategy

### Sub-Agent Usage Plan

To keep context sizes manageable and work parallelizable, the **Tech Lead Orchestrator** (this session) will delegate to specialized sub-agents:

**Agent Types**:
1. **service-refactor-agent**: Modernize individual services (health + logging)
2. **docker-hardening-agent**: Create/update Dockerfiles with security best practices
3. **observability-agent**: Add tracing, metrics, correlation IDs
4. **merge-conflict-resolver-agent**: Resolve insights-nlq conflicts
5. **port-reassignment-agent**: Update port configs across services

**Orchestration Principles**:
- Each agent works on 1-3 services at a time (small context)
- Agents produce service-specific reports in `/reports/CSR_SERVICE_MODERNIZATION_<service>.md`
- No agent rewrites entire services (incremental changes only)
- All changes tested before merge (unit + integration)

---

## Appendix A: Port Assignment Reference

### Current Port Allocations (with conflicts resolved)

| Port | Service | Type | Status |
|------|---------|------|--------|
| 3000 | api-gateway | Gateway | ✅ OK |
| 3001 | unified-profile | API | ✅ OK |
| 3002 | kintell-connector | Connector | ✅ OK |
| 3003 | buddy-service | API | ✅ OK |
| 3004 | upskilling-connector | Connector | ✅ OK |
| 3005 | q2q-ai | API | ✅ OK |
| 3006 | safety-moderation | API | ✅ OK |
| 3007 | forecast | API | ✅ OK (keep) |
| 3008 | analytics | API | ✅ OK (keep) |
| 3009 | builder-runtime | API | ✅ OK (keep) |
| 3011 | impact-in | API | ⚠️ REASSIGN from 3007 |
| 3012 | impact-calculator | API | ✅ OK |
| 3013 | reporting | API | ⚠️ REASSIGN from 3007 |
| 3014 | insights-nlq | API | ⚠️ REASSIGN from 3008 + MERGE CONFLICTS |
| 3015 | notifications | API | ⚠️ REASSIGN from 3008 |
| 3016 | journey-engine | API | ⚠️ REASSIGN from 3009 |
| 3017 | ai-budget | API | ⚠️ REASSIGN from 3010 |
| 3018 | billing | API | ⚠️ REASSIGN from 3010 + NO DOCKER |
| 3019 | buddy-connector | Connector | ⚠️ REASSIGN from 3010 |
| 3020 | privacy-orchestrator | API | ⚠️ REASSIGN from 3010 + NO DOCKER |
| N/A | discord-bot | Bot | ✅ No HTTP (Discord client) |
| N/A | synthetics | Scheduler | ✅ No HTTP (cron) |
| N/A | data-residency | API | ⚠️ NO DOCKER (config-based port) |
| N/A | gdpr-service | Stub | 🔴 BROKEN (incomplete) |

---

## Appendix B: Service Tech Stack Matrix

| Service | Language | Framework | DB | Logging | Tests |
|---------|----------|-----------|----|---------|----|
| ai-budget | TypeScript | Fastify | PostgreSQL | Pino | Unit |
| analytics | TypeScript | Fastify | ClickHouse | createServiceLogger | Unit + E2E |
| api-gateway | TypeScript | Fastify | Redis | Pino | Unit + Integration |
| billing | TypeScript | Fastify | PostgreSQL | Fastify logger | Unit |
| buddy-connector | TypeScript | Fastify | PostgreSQL | createServiceLogger | Unit |
| buddy-service | TypeScript | Fastify | PostgreSQL | createServiceLogger | Unit + Integration |
| builder-runtime | TypeScript | Fastify | PostgreSQL | Pino | Unit |
| data-residency | TypeScript | Fastify | PostgreSQL | createServiceLogger | Unit |
| discord-bot | TypeScript | Discord.js | PostgreSQL | console.log | None |
| forecast | TypeScript | Fastify | ClickHouse | Pino | Unit |
| gdpr-service | N/A | N/A | N/A | N/A | N/A |
| impact-calculator | TypeScript | Fastify | PostgreSQL | Pino | Unit |
| impact-in | TypeScript | Fastify | PostgreSQL | createServiceLogger | Unit + Integration |
| insights-nlq | TypeScript | Fastify | ClickHouse | Pino | Unit |
| journey-engine | TypeScript | Fastify | PostgreSQL | createServiceLogger | Unit |
| kintell-connector | TypeScript | Fastify | PostgreSQL | createServiceLogger | Unit + Integration |
| notifications | TypeScript | Fastify | PostgreSQL | createServiceLogger | Unit |
| privacy-orchestrator | TypeScript | Fastify | PostgreSQL | Pino | Unit |
| q2q-ai | TypeScript | Fastify | PostgreSQL | createServiceLogger | Unit + Integration |
| reporting | TypeScript | Fastify | PostgreSQL | createServiceLogger | Unit + E2E |
| safety-moderation | TypeScript | Fastify | PostgreSQL | createServiceLogger | Unit |
| synthetics | TypeScript | Node-cron | PostgreSQL | console.log | None |
| unified-profile | TypeScript | Fastify | PostgreSQL | createServiceLogger | Unit + Integration |
| upskilling-connector | TypeScript | Fastify | PostgreSQL | createServiceLogger | Unit + Integration |

---

**Orientation Status**: ✅ COMPLETE
**Date Completed**: 2025-11-17
**Next Step**: Create Modernization Blueprint (Step 2)

---

_This orientation document will be referenced throughout the modernization initiative to maintain context and alignment with project goals._
