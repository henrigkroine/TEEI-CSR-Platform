# TEEI CSR Platform Modernization - Multi-Agent Blueprint

**Initiative**: CSR Platform Modernization Pass
**Tech Lead**: Worker 1 - Tech Lead Orchestrator
**Branch**: claude/modernize-csr-platform-01TBjmZk8ADmwiySUW2Xvcy3
**Date**: 2025-11-17
**Status**: 🚧 In Progress (Blueprint Phase)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Modernization Goals](#modernization-goals)
3. [Phased Strategy](#phased-strategy)
4. [Core Service Priority List](#core-service-priority-list)
5. [Sub-Agent Specialization Plan](#sub-agent-specialization-plan)
6. [Phase Execution Details](#phase-execution-details)
7. [Quality Gates & Guardrails](#quality-gates--guardrails)
8. [Success Metrics](#success-metrics)
9. [Risk Mitigation](#risk-mitigation)
10. [Rollout Timeline](#rollout-timeline)

---

## Executive Summary

This blueprint defines a **safe, incremental modernization strategy** for all 25 microservices in the TEEI CSR Platform monorepo. The initiative focuses on achieving **production-grade operational readiness** through:

1. **Standardized Health Checks**: Uniform `/health` endpoints with liveness, readiness, and dependency probes
2. **Structured Logging**: Consistent `createServiceLogger` adoption with correlation IDs
3. **Docker Baseline**: Secure, standardized Dockerfiles with multi-stage builds and health checks
4. **Observability Hooks**: Distributed tracing, metrics collection, and centralized logging

### Key Principles

- ✅ **Incremental Changes**: Small, reversible commits per service
- ✅ **Deployable at Every Step**: No breaking changes to public APIs
- ✅ **Context Segmentation**: Use sub-agents to keep contexts small
- ✅ **Test Coverage**: Maintain ≥80% unit, ≥60% E2E coverage
- ✅ **Documentation**: Every change documented in service-specific reports

### Current State vs Target State

| Metric | Current | Target | Gap |
|--------|---------|--------|-----|
| Health Endpoints | 96% (24/25) | 100% (25/25) | +1 service |
| Docker Coverage | 64% (16/25) | 100% (25/25) | +9 Dockerfiles |
| Logging Consistency | 76% (19/25) | 100% (25/25) | +6 services |
| Port Conflicts | 12 services | 0 conflicts | Fix 12 services |
| Merge Conflicts | 1 service (insights-nlq) | 0 services | Resolve 1 |
| Distributed Tracing | 0% (instrumented but not active) | 100% (24/25 HTTP services) | +24 services |
| OpenAPI Docs | 0% | 100% (17 API services) | +17 specs |

---

## Modernization Goals

### 1. What "Modernized" Means

A **modernized service** meets the following criteria:

**Operational Readiness**:
- ✅ Standardized `/health` endpoint (returns `{ status, service, timestamp, dependencies }`)
- ✅ Structured logging with `createServiceLogger` (JSON output, correlation IDs)
- ✅ Dockerfile with multi-stage build, non-root user, health check
- ✅ Unique port assignment (no conflicts)
- ✅ OpenTelemetry instrumentation for tracing
- ✅ Graceful shutdown handlers (SIGINT, SIGTERM)

**Code Quality**:
- ✅ TypeScript strict mode enabled
- ✅ Unit test coverage ≥80%
- ✅ Integration tests for critical paths
- ✅ No console.log (replaced with structured logger)

**Documentation**:
- ✅ OpenAPI spec (for API services)
- ✅ Service README with architecture, dependencies, config
- ✅ Runbook for operational troubleshooting

**Security**:
- ✅ Runs as non-root user in container
- ✅ Base image pinned to specific version
- ✅ Secrets loaded from environment (no hardcoded values)
- ✅ Security headers configured (CSP, CORS, etc.)

---

### 2. Out of Scope (For This Initiative)

**NOT Included**:
- ❌ Rewriting services in different languages/frameworks
- ❌ Changing business logic or feature implementations
- ❌ Database schema migrations (unless required for health checks)
- ❌ Breaking changes to public APIs
- ❌ UI/UX redesigns
- ❌ New feature development

**Deferred to Future Initiatives**:
- Service mesh deployment (Istio, Linkerd)
- Horizontal pod autoscaling (HPA) configs
- Chaos engineering framework
- Load testing baselines
- Canary deployment pipelines

---

## Phased Strategy

### Phase A: Critical Blockers (Week 1)

**Goal**: Resolve deployment-blocking issues
**Duration**: 3-5 days
**Priority**: P0 (CRITICAL)

**Deliverables**:
1. ✅ Resolve merge conflicts in `insights-nlq` (lines 165-251)
2. ✅ Fix port assignment conflicts (12 services)
3. ✅ Complete or remove `gdpr-service` stub

**Success Criteria**:
- All services can compile without errors
- All services have unique port assignments
- No incomplete stubs in codebase

**Agent**: `merge-conflict-resolver-agent`, `port-reassignment-agent`

---

### Phase B: Docker & Health Baseline (Week 2-3)

**Goal**: Achieve 100% Docker coverage and standardized health checks
**Duration**: 10-12 days
**Priority**: P1 (HIGH)

**Deliverables**:
1. ✅ Create 9 missing Dockerfiles (standardized template)
2. ✅ Standardize health endpoints (all → `/health`)
3. ✅ Add HTTP health checks for non-HTTP services (discord-bot, synthetics)
4. ✅ Define resource limits (CPU, memory) for all containers

**Target Services** (9 services):
- billing
- builder-runtime
- data-residency
- forecast
- gdpr-service (if keeping)
- insights-nlq
- privacy-orchestrator
- synthetics
- (discord-bot - add HTTP server for health only)

**Success Criteria**:
- 100% of services have Dockerfile (25/25)
- All services respond to `GET /health` with 200 OK
- K8s readiness probes defined for all services
- All Dockerfiles use standardized base image (node:20-alpine)

**Agent**: `docker-hardening-agent`, `health-endpoint-standardizer-agent`

---

### Phase C: Logging Standardization (Week 3-4)

**Goal**: Achieve 100% structured logging consistency
**Duration**: 5-7 days
**Priority**: P1 (HIGH)

**Deliverables**:
1. ✅ Migrate all services to `createServiceLogger` (unified wrapper)
2. ✅ Ensure correlation ID propagation (`x-request-id` header)
3. ✅ Configure log levels per environment (dev: debug, prod: info)
4. ✅ Remove all `console.log` statements (replace with logger)
5. ✅ Document logging standards in `/docs/Logging_Standards.md`

**Target Services** (6 services need migration):
- discord-bot (console.log → createServiceLogger)
- synthetics (console.log → createServiceLogger)
- gdpr-service (if keeping)
- billing (Fastify logger → createServiceLogger)
- ai-budget (Pino → createServiceLogger - optional for consistency)
- forecast (Pino → createServiceLogger - optional)

**Success Criteria**:
- 100% of services use `createServiceLogger` (25/25)
- All logs output structured JSON
- Correlation IDs present in all log entries
- No console.log statements in production code

**Agent**: `logging-standardizer-agent`

---

### Phase D: Observability Hooks (Week 4-5)

**Goal**: Enable distributed tracing and metrics collection
**Duration**: 7-10 days
**Priority**: P2 (MEDIUM)

**Deliverables**:
1. ✅ Configure OpenTelemetry exporters (Jaeger/Tempo)
2. ✅ Instrument service-to-service calls (HTTP, NATS)
3. ✅ Add custom spans for critical operations (DB queries, external APIs)
4. ✅ Deploy centralized logging sink (Loki or CloudWatch)
5. ✅ Create Grafana dashboard for service health (RED metrics)

**Target Services** (24 HTTP services):
- All API services (17)
- All connectors (4)
- api-gateway (1)
- discord-bot (1 - if HTTP health added)
- synthetics (1 - if HTTP health added)

**Success Criteria**:
- All HTTP services emit traces to Jaeger/Tempo
- Service dependency graph visible in Jaeger UI
- RED metrics (Rate, Errors, Duration) collected for all endpoints
- Centralized logging dashboard operational

**Agent**: `observability-agent`, `tracing-instrumentation-agent`

---

### Phase E: Documentation & OpenAPI (Week 5)

**Goal**: Complete operational documentation
**Duration**: 3-5 days
**Priority**: P2 (MEDIUM)

**Deliverables**:
1. ✅ Generate OpenAPI specs for 17 API services
2. ✅ Create service READMEs (architecture, config, dependencies)
3. ✅ Write operational runbooks (troubleshooting guides)
4. ✅ Document port assignment strategy
5. ✅ Create service topology diagrams

**Target Services** (17 API services):
- ai-budget, analytics, billing, builder-runtime, data-residency
- forecast, impact-calculator, impact-in, insights-nlq, journey-engine
- notifications, privacy-orchestrator, q2q-ai, reporting
- unified-profile, upskilling-connector, kintell-connector

**Success Criteria**:
- All API services have OpenAPI 3.0 specs
- All services have README.md in service directory
- Runbooks created for top 10 operational issues
- Service topology diagram published in `/docs/`

**Agent**: `docs-scribe`, `openapi-generator-agent`

---

### Phase F: Testing & Validation (Week 5-6)

**Goal**: Validate all changes and ensure deployability
**Duration**: 5-7 days
**Priority**: P1 (HIGH)

**Deliverables**:
1. ✅ Run full test suite (unit, integration, E2E) for all services
2. ✅ Build all Docker images and verify health checks
3. ✅ Deploy to local K8s cluster (minikube/kind) and smoke test
4. ✅ Validate tracing end-to-end (request → response → trace in Jaeger)
5. ✅ Create `CSR_PLATFORM_MODERNIZATION_TEST_REPORT.md`

**Test Scenarios**:
- ✅ All services start successfully (exit code 0)
- ✅ Health endpoints return 200 OK within 5 seconds
- ✅ Services can communicate via NATS (event pub/sub)
- ✅ Correlation IDs propagate across service boundaries
- ✅ Logs appear in centralized sink (Loki/CloudWatch)
- ✅ Traces visible in Jaeger for sample requests

**Success Criteria**:
- All 25 services pass health checks
- No test failures (unit, integration, E2E)
- All Docker images build without errors
- Smoke tests pass in local K8s

**Agent**: `integration-test-specialist`, `smoke-test-engineer`

---

## Core Service Priority List

### Tier 1: Critical Path Services (P0 - Must Modernize First)

**Impact**: These services are on the critical path for every request or essential for compliance.

| Service | Port | Rationale | Estimated Effort |
|---------|------|-----------|------------------|
| **api-gateway** | 3000 | Entry point for all requests | 2 days (already has Docker, needs OTel) |
| **insights-nlq** | 3014 | 🔴 Merge conflicts blocking deployment | 1 day (resolve conflicts + port reassignment) |
| **reporting** | 3013 | Gen-AI reporting (core business feature) | 3 days (port reassignment + OTel) |
| **q2q-ai** | 3005 | Qualitative→Quantitative conversion | 3 days (OTel + OpenAPI) |
| **analytics** | 3008 | Real-time metrics for dashboards | 3 days (OTel + health improvements) |
| **unified-profile** | 3001 | User profile aggregation | 2 days (OTel + OpenAPI) |

**Total Effort**: 14 days (parallelizable across 2-3 sub-agents)

---

### Tier 2: High-Value Services (P1 - Modernize Second)

**Impact**: Core business logic but not on every request path.

| Service | Port | Rationale | Estimated Effort |
|---------|------|-----------|------------------|
| **buddy-service** | 3003 | Buddy matching (core program) | 2 days |
| **kintell-connector** | 3002 | Mentorship integration | 2 days |
| **upskilling-connector** | 3004 | Learning platform integration | 2 days |
| **impact-calculator** | 3012 | VIS score calculation | 2 days |
| **safety-moderation** | 3006 | Content moderation (compliance) | 2 days |
| **notifications** | 3015 | Multi-channel notifications | 2 days (port reassignment) |

**Total Effort**: 12 days (parallelizable)

---

### Tier 3: Supporting Services (P2 - Modernize Third)

**Impact**: Infrastructure and supporting services.

| Service | Port | Rationale | Estimated Effort |
|---------|------|-----------|------------------|
| **impact-in** | 3011 | External integration hub | 3 days (port reassignment + Docker) |
| **journey-engine** | 3016 | Journey lifecycle | 2 days (port reassignment) |
| **buddy-connector** | 3019 | Buddy system integration | 2 days (port reassignment) |
| **ai-budget** | 3017 | AI token budget tracking | 2 days (port reassignment) |
| **billing** | 3018 | Usage metering | 3 days (port reassignment + Docker + logging) |
| **forecast** | 3007 | Time-series forecasting | 3 days (Docker + health) |

**Total Effort**: 15 days (parallelizable)

---

### Tier 4: Infrastructure & Operational (P3 - Modernize Last)

**Impact**: Non-critical or infrastructure services.

| Service | Port | Rationale | Estimated Effort |
|---------|------|-----------|------------------|
| **builder-runtime** | 3009 | Query builder runtime | 3 days (Docker + health) |
| **data-residency** | config | GDPR data governance | 3 days (Docker + health) |
| **privacy-orchestrator** | 3020 | DSAR workflows | 3 days (port reassignment + Docker) |
| **discord-bot** | N/A | Community engagement | 2 days (HTTP health + logging) |
| **synthetics** | N/A | Synthetic monitoring | 2 days (HTTP health + Docker + logging) |
| **gdpr-service** | N/A | 🔴 Stub - complete or remove | 5 days (full implementation) OR 1 day (removal) |

**Total Effort**: 18 days (or 13 days if removing gdpr-service)

---

## Sub-Agent Specialization Plan

### Agent 1: `merge-conflict-resolver-agent`

**Responsibility**: Resolve git merge conflicts in `insights-nlq`
**Scope**: Single service
**Duration**: 0.5-1 day

**Tasks**:
1. Analyze merge conflict in `/services/insights-nlq/src/index.ts` (lines 165-251)
2. Determine correct resolution strategy (--ours vs --theirs vs manual merge)
3. Resolve conflicts and verify TypeScript compilation
4. Run existing tests to ensure no regressions
5. Document resolution decision in `/reports/CSR_SERVICE_MODERNIZATION_insights-nlq.md`

**Deliverables**:
- ✅ Conflict-free `services/insights-nlq/src/index.ts`
- ✅ Passing typecheck (`pnpm typecheck`)
- ✅ Passing tests (`pnpm test`)
- ✅ Commit with message: `fix(insights-nlq): resolve merge conflicts from worker5 branch`

**Quality Gates**:
- No remaining git conflict markers (`<<<<<<<`, `=======`, `>>>>>>>`)
- Service builds successfully
- All existing tests pass

---

### Agent 2: `port-reassignment-agent`

**Responsibility**: Resolve port conflicts for 12 services
**Scope**: Multiple services (config changes only)
**Duration**: 1-2 days

**Tasks**:
1. Update port assignments in `.env.example` and `.env.test`
2. Update docker-compose.yml with unique port mappings
3. Update K8s manifests (if present) with new ports
4. Update service README files with new port numbers
5. Update API gateway routing table (if hardcoded)

**Port Reassignments**:
```yaml
# From 3007 conflicts
impact-in:         3007 → 3011
reporting:         3007 → 3013

# From 3008 conflicts
insights-nlq:      3008 → 3014
notifications:      3008 → 3015

# From 3009 conflicts
journey-engine:     3009 → 3016

# From 3010 conflicts
ai-budget:         3010 → 3017
billing:           3010 → 3018
buddy-connector:    3010 → 3019
privacy-orchestrator: 3010 → 3020
```

**Deliverables**:
- ✅ Updated `.env.example` with unique ports
- ✅ Updated `docker-compose.yml` with port mappings
- ✅ Updated `/docs/Port_Assignment_Reference.md`
- ✅ Commit with message: `chore: resolve port conflicts for 12 services (3007/3008/3009/3010)`

**Quality Gates**:
- All services have unique port assignments
- Docker Compose starts all services without port binding errors
- Port reference documentation updated

---

### Agent 3: `docker-hardening-agent`

**Responsibility**: Create standardized Dockerfiles for 9 services
**Scope**: Multiple services (Dockerfile creation)
**Duration**: 5-7 days (parallelizable)

**Tasks**:
1. Create Dockerfile using standardized template (see Appendix A)
2. Implement multi-stage build (builder + runtime)
3. Use non-root user (`node:node`)
4. Add HEALTHCHECK directive with service-specific endpoint
5. Pin base image to specific version (`node:20.11-alpine`)
6. Test Docker build locally (`docker build -t <service> .`)
7. Verify health check works (`docker run --rm <service> && curl /health`)

**Target Services**:
- billing, builder-runtime, data-residency, forecast
- insights-nlq, privacy-orchestrator, synthetics
- discord-bot (HTTP health server), gdpr-service (if keeping)

**Deliverables**:
- ✅ 9 new Dockerfiles (or 8 if removing gdpr-service)
- ✅ All Dockerfiles pass `docker build` without errors
- ✅ Health checks functional in containers
- ✅ Service-specific reports in `/reports/CSR_SERVICE_MODERNIZATION_<service>.md`

**Quality Gates**:
- Dockerfile builds without errors
- Container starts and responds to health check within 30s
- Runs as non-root user (verified with `docker exec <container> whoami`)

---

### Agent 4: `health-endpoint-standardizer-agent`

**Responsibility**: Standardize health endpoints to `/health`
**Scope**: 3 services (billing, privacy-orchestrator) + 2 non-HTTP services
**Duration**: 2-3 days

**Tasks**:
1. Move health endpoints to `/health` (from `/api/billing/health`, `/privacy/health`)
2. Implement standard response format:
   ```json
   {
     "status": "ok",
     "service": "billing",
     "timestamp": "2025-11-17T10:30:00.000Z",
     "dependencies": {
       "postgres": "ok",
       "redis": "ok"
     }
   }
   ```
3. Add `/health/live` (liveness) and `/health/ready` (readiness) endpoints
4. For discord-bot and synthetics: add minimal HTTP server for health checks only

**Target Services**:
- billing (move from `/api/billing/health` → `/health`)
- privacy-orchestrator (move from `/privacy/health` → `/health`)
- discord-bot (add HTTP server on port 3021 with `/health`)
- synthetics (add HTTP server on port 3022 with `/health`)

**Deliverables**:
- ✅ All services respond to `GET /health` with 200 OK
- ✅ Health responses follow standard schema
- ✅ K8s probe configs updated (liveness + readiness)
- ✅ Service-specific reports in `/reports/`

**Quality Gates**:
- `curl http://localhost:<port>/health` returns 200 OK
- Response includes `status`, `service`, `timestamp`, `dependencies`
- No legacy health endpoints remain

---

### Agent 5: `logging-standardizer-agent`

**Responsibility**: Migrate all services to `createServiceLogger`
**Scope**: 6 services (console.log → structured logging)
**Duration**: 3-5 days

**Tasks**:
1. Replace all `console.log` with `logger.info()` (or appropriate level)
2. Replace all `console.error` with `logger.error()`
3. Add correlation ID to all log entries (`x-request-id` from headers)
4. Configure log levels per environment (dev: debug, prod: info)
5. Remove all `console.log` statements (enforce via ESLint rule)

**Target Services**:
- discord-bot (console.log → createServiceLogger)
- synthetics (console.log → createServiceLogger)
- billing (Fastify logger → createServiceLogger)
- (optional) ai-budget, forecast, privacy-orchestrator (Pino → createServiceLogger for consistency)

**Deliverables**:
- ✅ All services use `createServiceLogger`
- ✅ All logs output structured JSON
- ✅ Correlation IDs present in all log entries
- ✅ ESLint rule `no-console` enforced
- ✅ Documentation: `/docs/Logging_Standards.md`

**Quality Gates**:
- No `console.log` statements in production code (enforced by ESLint)
- All logs parseable as JSON
- Correlation IDs present in 100% of log entries

---

### Agent 6: `observability-agent`

**Responsibility**: Enable distributed tracing and metrics
**Scope**: All 24 HTTP services
**Duration**: 7-10 days (parallelizable)

**Tasks**:
1. Configure OpenTelemetry exporters (Jaeger or Tempo)
2. Instrument HTTP routes with automatic span creation
3. Instrument NATS publish/subscribe with manual spans
4. Add custom spans for DB queries, external API calls
5. Deploy Jaeger/Tempo backend
6. Deploy Loki for centralized logging
7. Create Grafana dashboard for RED metrics

**Target Services**:
- All API services (17)
- All connectors (4)
- api-gateway (1)
- discord-bot (1 - if HTTP added)
- synthetics (1 - if HTTP added)

**Deliverables**:
- ✅ All services emit traces to Jaeger/Tempo
- ✅ Service dependency graph visible in Jaeger UI
- ✅ RED metrics dashboard in Grafana
- ✅ Centralized logging in Loki
- ✅ Documentation: `/docs/Observability_Guide.md`

**Quality Gates**:
- All HTTP requests generate traces
- Traces include service name, span names, tags
- RED metrics (Rate, Errors, Duration) visible in Grafana

---

### Agent 7: `docs-scribe`

**Responsibility**: Generate OpenAPI specs and operational docs
**Scope**: 17 API services + general documentation
**Duration**: 3-5 days

**Tasks**:
1. Generate OpenAPI 3.0 specs from route definitions (use `@fastify/swagger`)
2. Create service README.md files (architecture, dependencies, config)
3. Write operational runbooks (top 10 troubleshooting scenarios)
4. Document port assignment strategy
5. Create service topology diagrams (draw.io or Mermaid)

**Target Services**:
- All 17 API services (ai-budget, analytics, billing, builder-runtime, etc.)

**Deliverables**:
- ✅ OpenAPI specs for 17 API services (`/services/<name>/openapi.json`)
- ✅ Service READMEs (`/services/<name>/README.md`)
- ✅ Operational runbooks (`/docs/Runbooks.md`)
- ✅ Port assignment reference (`/docs/Port_Assignment_Reference.md`)
- ✅ Service topology diagram (`/docs/Service_Topology.md`)

**Quality Gates**:
- All OpenAPI specs validate against OpenAPI 3.0 schema
- All service READMEs include: purpose, tech stack, dependencies, config, ports

---

### Agent 8: `integration-test-specialist`

**Responsibility**: Validate all modernization changes
**Scope**: All 25 services
**Duration**: 5-7 days

**Tasks**:
1. Run full test suite (unit, integration, E2E) for each service
2. Build all Docker images and verify health checks
3. Deploy to local K8s cluster (minikube or kind)
4. Run smoke tests (health checks, sample API calls)
5. Validate tracing end-to-end (request → trace in Jaeger)
6. Create test report: `/reports/CSR_PLATFORM_MODERNIZATION_TEST_REPORT.md`

**Test Scenarios**:
- ✅ All services start successfully
- ✅ Health endpoints return 200 OK
- ✅ Services communicate via NATS
- ✅ Correlation IDs propagate
- ✅ Logs appear in Loki
- ✅ Traces visible in Jaeger

**Deliverables**:
- ✅ Test report with pass/fail for all services
- ✅ Screenshots of Jaeger traces
- ✅ Screenshots of Grafana dashboards
- ✅ List of any issues found (with severity)

**Quality Gates**:
- All services pass health checks
- No test failures (unit, integration, E2E)
- All Docker images build without errors
- Smoke tests pass in local K8s

---

## Phase Execution Details

### Phase A: Critical Blockers (Week 1)

**Duration**: 3-5 days
**Agent Parallelization**: Sequential (blockers must be resolved first)

**Day 1-2**: `merge-conflict-resolver-agent`
- Resolve conflicts in `insights-nlq` (lines 165-251)
- Verify typecheck and tests pass
- Commit and push

**Day 2-3**: `port-reassignment-agent`
- Update port assignments in config files
- Update docker-compose.yml
- Update K8s manifests
- Update documentation
- Commit and push

**Day 3-5**: Decision on `gdpr-service`
- Option 1: Complete implementation (5 days - out of scope for this phase)
- Option 2: Remove stub (1 day)
- Option 3: Consolidate with privacy-orchestrator (3 days)
- **Recommendation**: Option 2 (remove) to unblock deployment

**Phase A Exit Criteria**:
- ✅ No merge conflicts in codebase
- ✅ All services have unique port assignments
- ✅ No incomplete stubs (gdpr-service resolved)
- ✅ All services compile without errors

---

### Phase B: Docker & Health Baseline (Week 2-3)

**Duration**: 10-12 days
**Agent Parallelization**: High (3-4 agents can work in parallel)

**Batch 1** (Day 1-4): `docker-hardening-agent` × 2
- **Agent Instance 1**: billing, builder-runtime, data-residency, forecast (4 services)
- **Agent Instance 2**: insights-nlq, privacy-orchestrator, synthetics, discord-bot (4 services)

**Batch 2** (Day 3-5): `health-endpoint-standardizer-agent`
- Standardize health endpoints (billing, privacy-orchestrator)
- Add HTTP health for discord-bot, synthetics

**Batch 3** (Day 5-10): Verification
- Build all Docker images
- Test health checks
- Update K8s manifests with new health probes

**Phase B Exit Criteria**:
- ✅ 100% Docker coverage (25/25 or 24/24 if gdpr-service removed)
- ✅ All services respond to `GET /health` with 200 OK
- ✅ All Dockerfiles use standardized template
- ✅ All containers run as non-root user

---

### Phase C: Logging Standardization (Week 3-4)

**Duration**: 5-7 days
**Agent Parallelization**: Medium (2 agents can work in parallel)

**Batch 1** (Day 1-3): `logging-standardizer-agent` × 2
- **Agent Instance 1**: discord-bot, synthetics, billing (3 services)
- **Agent Instance 2**: ai-budget, forecast, privacy-orchestrator (3 services - optional migrations)

**Batch 2** (Day 3-5): Verification
- Run ESLint with `no-console` rule
- Verify correlation ID propagation
- Test structured log output (JSON parseable)

**Batch 3** (Day 5-7): Documentation
- Create `/docs/Logging_Standards.md`
- Document correlation ID strategy
- Document log levels per environment

**Phase C Exit Criteria**:
- ✅ 100% structured logging (25/25 or 24/24 services)
- ✅ No `console.log` in production code
- ✅ Correlation IDs in all log entries
- ✅ Logging standards documented

---

### Phase D: Observability Hooks (Week 4-5)

**Duration**: 7-10 days
**Agent Parallelization**: High (4-5 agents can work in parallel)

**Batch 1** (Day 1-3): Infrastructure Setup
- Deploy Jaeger/Tempo backend (local K8s or Docker Compose)
- Deploy Loki for centralized logging
- Configure OpenTelemetry Collector

**Batch 2** (Day 3-8): `observability-agent` × 4
- **Agent Instance 1**: Tier 1 services (api-gateway, insights-nlq, reporting, q2q-ai, analytics, unified-profile)
- **Agent Instance 2**: Tier 2 services (buddy-service, kintell-connector, upskilling-connector, impact-calculator, safety-moderation, notifications)
- **Agent Instance 3**: Tier 3 services (impact-in, journey-engine, buddy-connector, ai-budget, billing, forecast)
- **Agent Instance 4**: Tier 4 services (builder-runtime, data-residency, privacy-orchestrator, discord-bot, synthetics)

**Batch 3** (Day 8-10): Verification
- Test end-to-end tracing (request → Jaeger)
- Verify service dependency graph
- Create Grafana RED metrics dashboard

**Phase D Exit Criteria**:
- ✅ All services emit traces to Jaeger/Tempo
- ✅ Service dependency graph visible
- ✅ RED metrics dashboard operational
- ✅ Centralized logging in Loki

---

### Phase E: Documentation & OpenAPI (Week 5)

**Duration**: 3-5 days
**Agent Parallelization**: High (2-3 agents can work in parallel)

**Batch 1** (Day 1-3): `docs-scribe` × 2
- **Agent Instance 1**: Generate OpenAPI specs for 17 API services
- **Agent Instance 2**: Create service READMEs (25 services)

**Batch 2** (Day 3-5): `docs-scribe`
- Write operational runbooks
- Document port assignment strategy
- Create service topology diagrams

**Phase E Exit Criteria**:
- ✅ All API services have OpenAPI specs
- ✅ All services have README.md
- ✅ Operational runbooks published
- ✅ Service topology diagram created

---

### Phase F: Testing & Validation (Week 5-6)

**Duration**: 5-7 days
**Agent Parallelization**: Low (sequential validation)

**Day 1-3**: `integration-test-specialist`
- Run full test suite for all services
- Build all Docker images
- Deploy to local K8s cluster

**Day 3-5**: Smoke Testing
- Health check validation
- Inter-service communication tests
- Tracing validation
- Logging validation

**Day 5-7**: Report Generation
- Create test report
- Capture screenshots (Jaeger, Grafana)
- Document any issues found
- Create final summary

**Phase F Exit Criteria**:
- ✅ All services pass tests
- ✅ All Docker images build
- ✅ Smoke tests pass in K8s
- ✅ Test report published

---

## Quality Gates & Guardrails

### Blocking Conditions (Fail CI/PR)

**Code Quality**:
- ❌ TypeScript compilation errors
- ❌ ESLint errors
- ❌ Unit test failures
- ❌ E2E test failures (if existing tests affected)

**Operational Readiness**:
- ❌ No health endpoint (for HTTP services)
- ❌ No Dockerfile (for deployable services)
- ❌ console.log statements in production code
- ❌ Port conflicts

**Security**:
- ❌ Dockerfile runs as root user
- ❌ Secrets hardcoded in code
- ❌ Base image not pinned to version
- ❌ npm audit high/critical vulnerabilities

**Documentation**:
- ❌ No README.md in service directory
- ❌ No OpenAPI spec (for API services)

---

### Non-Blocking Warnings (Fix in Follow-Up)

**Code Quality**:
- ⚠️ Test coverage <80% (existing coverage maintained, not reduced)
- ⚠️ Missing integration tests
- ⚠️ TypeScript strict mode disabled

**Observability**:
- ⚠️ No OpenTelemetry instrumentation
- ⚠️ No custom metrics

**Performance**:
- ⚠️ No resource limits defined (CPU, memory)
- ⚠️ No performance baselines

---

### PR Review Checklist

Before merging any modernization PR:

1. **Code Changes**:
   - ✅ Only touches files related to modernization goals (health, logging, Docker, observability)
   - ✅ No business logic changes
   - ✅ No breaking API changes
   - ✅ Follows existing code style

2. **Testing**:
   - ✅ All existing tests pass
   - ✅ New tests added for new health endpoints (if applicable)
   - ✅ Docker build succeeds
   - ✅ Health check functional in container

3. **Documentation**:
   - ✅ Service-specific report created (`/reports/CSR_SERVICE_MODERNIZATION_<service>.md`)
   - ✅ README.md updated (if applicable)
   - ✅ Changelog entry added (if applicable)

4. **Security**:
   - ✅ No secrets in code
   - ✅ Container runs as non-root
   - ✅ Base image pinned to version

5. **Commit Quality**:
   - ✅ Atomic commits (one logical change per commit)
   - ✅ Conventional commit messages (`feat:`, `fix:`, `chore:`, etc.)
   - ✅ Commit messages describe "why" not just "what"

---

## Success Metrics

### Quantitative Metrics

**Completion Rates**:
- Docker Coverage: 64% → 100% (+36%)
- Health Endpoint Coverage: 96% → 100% (+4%)
- Logging Consistency: 76% → 100% (+24%)
- Distributed Tracing: 0% → 100% (+100%)
- OpenAPI Documentation: 0% → 100% (+100%)

**Operational Metrics**:
- Port Conflicts: 12 services → 0 services
- Merge Conflicts: 1 service → 0 services
- Incomplete Stubs: 1 service → 0 services

**Code Quality**:
- console.log statements: ~50+ → 0
- Services with README: ~5 → 25 (+20)
- Services with OpenAPI spec: 0 → 17 (+17)

---

### Qualitative Success Criteria

**Deployability**:
- ✅ All services can be deployed to K8s without errors
- ✅ All services respond to health probes within SLA
- ✅ All services run as non-root user

**Observability**:
- ✅ Service dependency graph visible in Jaeger
- ✅ Logs searchable in centralized sink
- ✅ RED metrics visible in Grafana

**Operational Confidence**:
- ✅ Runbooks available for top 10 issues
- ✅ Port assignment strategy documented
- ✅ Service topology diagram available

---

## Risk Mitigation

### High-Risk Areas

**Risk 1: Breaking Changes to Public APIs**

**Mitigation**:
- Do NOT change route paths (except health endpoints)
- Do NOT change request/response schemas
- Verify integration tests pass
- Test against existing clients (Postman collections)

**Contingency**:
- Revert commits if breaking change detected
- Add deprecation warnings instead of hard breaks
- Version APIs if necessary

---

**Risk 2: Port Reassignment Breaks Existing Deployments**

**Mitigation**:
- Update all config files (`.env.example`, `docker-compose.yml`, K8s)
- Document port changes in migration guide
- Use environment variables for port overrides

**Contingency**:
- Keep old port assignments in comments
- Provide port mapping table in docs
- Allow backward compatibility via env vars

---

**Risk 3: Logging Changes Break Log Parsing**

**Mitigation**:
- Maintain JSON structure compatibility
- Test log parsing with existing tools (Loki, CloudWatch)
- Add correlation ID without removing existing fields

**Contingency**:
- Revert to old logging if parsing breaks
- Provide log format migration guide
- Support both formats during transition period

---

**Risk 4: Docker Changes Break Existing Workflows**

**Mitigation**:
- Keep Dockerfile naming consistent (`Dockerfile` at root)
- Maintain same build args and env vars
- Test Docker Compose startup

**Contingency**:
- Provide Dockerfile migration guide
- Support legacy Dockerfiles in separate branch
- Gradually migrate services (not all at once)

---

**Risk 5: Observability Overhead Impacts Performance**

**Mitigation**:
- Sample traces (not 100% of requests)
- Use async logging (non-blocking)
- Monitor performance before/after

**Contingency**:
- Reduce trace sampling rate if overhead >5%
- Disable tracing per-service if needed
- Optimize hot paths (avoid spans in tight loops)

---

## Rollout Timeline

### Week 1: Critical Blockers (Phase A)

**Days 1-2**:
- Resolve merge conflicts in `insights-nlq`
- Verify compilation and tests

**Days 2-3**:
- Reassign ports for 12 services
- Update config files and documentation

**Days 3-5**:
- Decide on `gdpr-service` (remove or complete)
- Complete any follow-up from port reassignments

**Deliverable**: All blockers resolved, system is deployable

---

### Week 2-3: Docker & Health (Phase B)

**Week 2**:
- Create Dockerfiles for 9 services (parallel agents)
- Standardize health endpoints
- Add HTTP health for non-HTTP services

**Week 3**:
- Test all Docker builds
- Verify health checks in containers
- Update K8s manifests

**Deliverable**: 100% Docker coverage, standardized health checks

---

### Week 3-4: Logging (Phase C)

**Week 3**:
- Migrate 6 services to `createServiceLogger`
- Remove `console.log` statements
- Add correlation ID propagation

**Week 4**:
- Verify log output (JSON structured)
- Document logging standards
- Add ESLint rule enforcement

**Deliverable**: 100% structured logging, correlation ID support

---

### Week 4-5: Observability (Phase D)

**Week 4**:
- Deploy Jaeger/Tempo, Loki
- Instrument Tier 1 & 2 services (parallel agents)

**Week 5**:
- Instrument Tier 3 & 4 services
- Create Grafana RED metrics dashboard
- Verify end-to-end tracing

**Deliverable**: Distributed tracing operational, centralized logging

---

### Week 5: Documentation (Phase E)

**Days 1-3**:
- Generate OpenAPI specs for 17 API services
- Create service READMEs

**Days 3-5**:
- Write operational runbooks
- Document port assignments
- Create service topology diagram

**Deliverable**: Complete operational documentation

---

### Week 5-6: Testing & Validation (Phase F)

**Week 5-6**:
- Run full test suite (all services)
- Build all Docker images
- Deploy to local K8s and smoke test
- Create test report with screenshots

**Deliverable**: Validated, tested, deployment-ready system

---

## Appendix A: Standardized Dockerfile Template

```dockerfile
# Multi-stage build: builder stage
FROM node:20.11-alpine AS builder

# Install dependencies for building
RUN apk add --no-cache python3 make g++

# Set working directory
WORKDIR /app

# Copy package files (leverage layer caching)
COPY package.json pnpm-lock.yaml ./
COPY .npmrc ./

# Install pnpm and dependencies
RUN npm install -g pnpm@8
RUN pnpm install --frozen-lockfile

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN pnpm build

# Runtime stage (smaller image)
FROM node:20.11-alpine

# Install dumb-init (for proper signal handling)
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy built artifacts from builder
COPY --from=builder --chown=nodejs:nodejs /app/dist ./dist
COPY --from=builder --chown=nodejs:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=nodejs:nodejs /app/package.json ./package.json

# Switch to non-root user
USER nodejs

# Expose port (service-specific)
EXPOSE 3000

# Health check (service-specific endpoint)
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Use dumb-init for proper signal handling
ENTRYPOINT ["dumb-init", "--"]

# Start service
CMD ["node", "dist/index.js"]
```

**Customization Points**:
- Replace `3000` with service-specific port
- Replace `dist/index.js` with service-specific entry point
- Adjust health check endpoint (`/health` is standard)

---

## Appendix B: Health Endpoint Standard Response

```typescript
// GET /health
{
  "status": "ok",  // "ok" | "degraded" | "error"
  "service": "reporting",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "version": "1.0.0",  // from package.json
  "dependencies": {
    "postgres": "ok",  // database connection
    "redis": "ok",     // cache connection
    "nats": "ok",      // message bus
    "external-api": "degraded"  // external service (optional)
  },
  "metrics": {  // optional
    "uptime": 3600,  // seconds
    "requests": 1234,
    "errors": 5
  }
}
```

**Status Codes**:
- `200 OK`: Service is healthy
- `503 Service Unavailable`: Service is degraded or unhealthy
- `500 Internal Server Error`: Health check failed (unexpected error)

---

## Appendix C: Logging Standards

### Log Levels

**Production**:
- `error`: Errors requiring immediate attention (alerts)
- `warn`: Degraded state but service still functional
- `info`: Important events (startup, shutdown, major operations)
- `debug`: NOT logged in production

**Development**:
- All levels logged (error, warn, info, debug)

### Log Format

```json
{
  "level": "info",
  "service": "reporting",
  "timestamp": "2025-11-17T10:30:00.000Z",
  "requestId": "req_abc123",  // correlation ID
  "message": "Report generated successfully",
  "context": {
    "userId": "user_xyz",
    "reportId": "report_789",
    "duration": 1234  // ms
  }
}
```

### Correlation ID Propagation

1. API Gateway generates `x-request-id` header
2. All services extract `x-request-id` from incoming requests
3. All services include `requestId` in log entries
4. All services propagate `x-request-id` to downstream services

---

**Blueprint Status**: ✅ COMPLETE
**Date Created**: 2025-11-17
**Next Step**: Execute Phase A (Critical Blockers)

---

_This blueprint will be referenced throughout the modernization initiative to maintain consistency and track progress._
