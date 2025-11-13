# Phase B Hardening: Multi-Agent Orchestration Plan

**Mission**: Transform Phase A foundations into production-grade services with security, observability, resilience, and compliance.

**Orchestrator**: Tech Lead (Worker 1)
**Team Size**: 30 agents (5 leads × 6 specialists each)
**Branch**: `claude/phase-b-hardening-011CV5sicbJ5JUw8qXjjCsYW`
**Timeline**: Sequential lead deployment with parallel specialist execution

---

## Executive Summary

### Phase A Assets (7 Services)
1. **API Gateway** - JWT auth, RBAC, routing
2. **Unified Profile Service** - Identity unification
3. **Kintell Connector** - CSV/webhook ingestion
4. **Buddy Service** - Mentorship event adapter
5. **Upskilling Connector** - Course completion ingestion
6. **Q2Q AI Service** - Outcome classification stub
7. **Safety Service** - Content moderation stub

### Critical Gaps Identified
- ❌ Zero automated tests
- ❌ HS256 JWT (need RS256 + JWKS)
- ❌ No webhook signature verification
- ❌ No service-to-service auth
- ❌ No observability (OTel, metrics, tracing)
- ❌ No API versioning or OpenAPI docs
- ❌ No PII encryption or GDPR compliance
- ❌ No database backups or migration rollbacks
- ❌ No idempotency or DLQ handling
- ❌ In-memory rate limiting (non-scalable)

---

## Team Structure

### Lead 1: Security Lead (6 specialists)
**Mission**: Auth, tokens, ingress hardening, webhook authenticity

#### Specialists:
1. **JWT Architect** - Replace HS256 with RS256 + JWKS endpoint; key rotation
2. **OIDC Engineer** - Implement SSO (Google/Azure AD) for company_admin; callback routes
3. **WAF Specialist** - API Gateway rate limits, payload size checks, basic firewall rules
4. **Webhook Security Engineer** - HMAC-SHA256 signature validation (Kintell, Upskilling)
5. **Service Auth Engineer** - Internal JWT/mTLS for service-to-service calls
6. **Secrets Manager** - Secure config loaders, .env.example, vault integration planning

**Deliverables**:
- `/services/api-gateway/auth/jwks.ts` - RS256 + JWKS
- `/services/api-gateway/middleware/oidc.ts` - SSO flows
- `/services/api-gateway/middleware/waf.ts` - Rate limits + WAF
- `/services/kintell-connector/webhooks/signature.ts` - HMAC validation
- `/services/upskilling-connector/webhooks/signature.ts` - HMAC validation
- `/packages/auth/service-auth.ts` - Inter-service auth SDK
- `/docs/Security_Hardening_Checklist.md`
- `/reports/security_lead_report.md`

**Acceptance**:
- RS256 JWT + `/auth/jwks` endpoint live
- OIDC SSO works with test Google Workspace tenant
- Webhook signature validation proven with replay tests
- Service-to-service calls require JWT

---

### Lead 2: Platform Lead (6 specialists)
**Mission**: API versioning, contracts, idempotency, resilience patterns

#### Specialists:
1. **API Versioning Engineer** - `/v1` prefix on all routes; deprecation headers
2. **OpenAPI Specialist** - Generate specs per service; merged index at `/packages/openapi/`
3. **Contract Test Engineer** - Pact tests between Gateway ↔ services; CI integration
4. **Idempotency Engineer** - Deduplication tables; eventId/deliveryId tracking
5. **DLQ Architect** - Dead-letter queues for NATS; retry + exponential backoff
6. **Circuit Breaker Engineer** - Timeouts, bulkheads, breakers on HTTP calls (undici, p-retry)

**Deliverables**:
- All routes updated: `/v1/profiles`, `/v1/events`, etc.
- `/packages/openapi/index.md` - OpenAPI catalog
- `/packages/openapi/merged.yaml` - Combined spec
- `/packages/contracts/pact-tests/` - Contract tests
- `/packages/db/schema/idempotency.ts` - Deduplication tables
- `/packages/events/dlq.ts` - DLQ + retry logic
- `/packages/http-client/resilience.ts` - Circuit breaker SDK
- `/reports/platform_lead_report.md`

**Acceptance**:
- `/v1` APIs active; unversioned deprecated
- OpenAPI specs generated and published
- Contract tests pass in CI
- Idempotent webhook re-delivery verified
- DLQ captures poison pills

---

### Lead 3: Reliability Lead (6 specialists)
**Mission**: Observability, tracing, metrics, monitoring, health checks

#### Specialists:
1. **OTel Engineer** - OpenTelemetry traces/metrics/logs; correlation IDs end-to-end
2. **Sentry Engineer** - Error tracking wired into all services; source maps
3. **Prometheus Engineer** - Metrics exporters; Grafana dashboards
4. **Health Check Engineer** - Liveness/readiness endpoints; startup/shutdown hooks
5. **Logging Specialist** - Structured logging standards; log aggregation docs
6. **Runbook Writer** - SRE dashboards guide; incident response playbooks

**Deliverables**:
- `/packages/observability/otel.ts` - OTel SDK wrapper
- `/packages/observability/sentry.ts` - Sentry client
- `/packages/observability/metrics.ts` - Prometheus client
- All services: `/health/liveness`, `/health/readiness`
- `/docker/grafana/dashboards/` - Pre-built dashboards
- `/docs/Observability_Overview.md`
- `/docs/SRE_Dashboards.md` - Runbooks
- `/reports/reliability_lead_report.md`

**Acceptance**:
- OTel traces visible end-to-end (correlation IDs propagate)
- Sentry captures synthetic errors
- Grafana dashboards show service health
- All services have health endpoints

---

### Lead 4: Data Lead (6 specialists)
**Mission**: Migrations, backups, data quality, validation pipelines

#### Specialists:
1. **Migration Engineer** - Zero-downtime patterns; ordering; rollback scripts
2. **Backup Specialist** - Scheduled logical backups + restore drills
3. **CSV Validation Engineer** - Schema versioning; row-level error files
4. **Data Quality Engineer** - Quarantine pipelines for invalid rows
5. **Schema Documenter** - ER diagrams; migration guides
6. **DBA Optimizer** - Connection pooling; query optimization; indexes

**Deliverables**:
- `/packages/db/migrations/` - Enhanced with rollback scripts
- `/packages/db/backup.ts` - Backup/restore automation
- `/services/kintell-connector/validation/csv-schema.ts` - Versioned schemas
- `/services/kintell-connector/quarantine/` - Error handling
- `/docs/DB_Backup_Restore.md`
- `/docs/Migration_Playbook.md`
- `/reports/data_lead_report.md`

**Acceptance**:
- Migrations run zero-downtime; rollback tested
- Backup/restore drill succeeds
- Invalid CSV rows captured to quarantine files
- ER diagram generated

---

### Lead 5: Compliance Lead (6 specialists)
**Mission**: Auditing, GDPR, PII encryption, data sovereignty

#### Specialists:
1. **Audit Engineer** - `audits` table; actor/scope/before/after logging
2. **PII Architect** - Field-level encryption; `pii` schema partitioning
3. **GDPR Engineer** - `/privacy/export` + `/privacy/delete` stub endpoints
4. **DSR Orchestrator** - Data Subject Request workflows
5. **Compliance Documenter** - GDPR compliance checklist; retention policies
6. **Access Control Specialist** - Tenant isolation enforcement; RBAC audits

**Deliverables**:
- `/packages/db/schema/audits.ts` - Audit log table
- `/packages/db/schema/pii.ts` - Encrypted PII schema
- `/packages/compliance/pii-encryption.ts` - Field encryption SDK
- `/services/api-gateway/routes/privacy.ts` - GDPR endpoints
- `/docs/GDPR_Compliance.md`
- `/docs/Audit_Log_Specification.md`
- `/reports/compliance_lead_report.md`

**Acceptance**:
- Audit logs capture key actions
- PII fields encrypted at rest
- `/privacy/export` returns user data bundle
- `/privacy/delete` orchestrates deletion flow
- Tenant isolation verified

---

### Lead 6: QA Lead (6 specialists)
**Mission**: Integration tests, load tests, contract tests, CI gates

#### Specialists:
1. **Integration Test Engineer** - Signed webhook → events → profile tests
2. **Idempotency Test Engineer** - Re-delivery replay tests
3. **Load Test Engineer** - k6 scripts; baseline throughput/latency
4. **Contract Test Engineer** - Pact CI integration
5. **E2E Test Engineer** - Full CSV import → Q2Q → API retrieval
6. **CI Gate Engineer** - Coverage thresholds; OTel route checks

**Deliverables**:
- `/tests/integration/webhook-to-profile.test.ts`
- `/tests/integration/idempotency-replay.test.ts`
- `/tests/integration/circuit-breaker.test.ts`
- `/tests/load/k6-baseline.js` - Load test scripts
- `/reports/perf_baseline.md` - Performance metrics
- `/tests/e2e/csv-end-to-end.test.ts`
- `.github/workflows/test.yml` - CI gates updated
- `/reports/qa_lead_report.md`

**Acceptance**:
- Integration tests pass (webhook → profile)
- Idempotent re-delivery proven
- Circuit breaker fallback verified
- k6 baseline established (RPS, p95 latency)
- CI fails on < 80% coverage or un-traced routes

---

## Execution Phases

### Phase 1: Foundation (Leads 1-2) - Days 1-3
**Parallel Execution**:
- Security Lead: RS256 JWT + OIDC + Webhook signatures
- Platform Lead: API versioning + Idempotency + DLQ

**Sync Point**: JWT + OIDC working; `/v1` routes live

---

### Phase 2: Observability & Data (Leads 3-4) - Days 4-6
**Parallel Execution**:
- Reliability Lead: OTel + Sentry + Health checks
- Data Lead: Migrations + Backups + CSV validation

**Sync Point**: OTel traces visible; backups tested

---

### Phase 3: Compliance & Testing (Leads 5-6) - Days 7-9
**Parallel Execution**:
- Compliance Lead: Auditing + PII encryption + GDPR stubs
- QA Lead: Integration tests + Load tests + CI gates

**Sync Point**: All tests passing; compliance verified

---

### Phase 4: Integration & Validation - Day 10
**Orchestrator Activities**:
1. Run full test suite
2. Verify all acceptance criteria
3. Generate consolidated reports
4. Update Platform_Architecture.md
5. Final commit + push

---

## Communication Protocol

### Specialist → Lead
- Commit artifacts to repository
- Update status in this file (see Status Tracking below)
- Report blockers immediately

### Lead → Orchestrator
- Integration report in `/reports/{lead}_report.md`
- Blockers requiring orchestration decisions
- Acceptance criteria validation

### All Commits
- Prefix: `feat(phaseB):` or `docs(phaseB):` or `test(phaseB):`
- Small, incremental commits per artifact
- Reference this plan: `Ref: MULTI_AGENT_PLAN.md § {Lead}/{Specialist}`

---

## Status Tracking

### Security Lead Progress
- [x] JWT Architect - RS256 + JWKS
- [x] OIDC Engineer - SSO implementation
- [x] WAF Specialist - Rate limits + firewall
- [x] Webhook Security Engineer - HMAC validation
- [x] Service Auth Engineer - Internal auth
- [x] Secrets Manager - Config loaders

### Platform Lead Progress
- [x] API Versioning Engineer - /v1 routes
- [x] OpenAPI Specialist - Spec generation
- [x] Contract Test Engineer - Pact tests
- [x] Idempotency Engineer - Deduplication
- [x] DLQ Architect - Dead-letter queues
- [x] Circuit Breaker Engineer - Resilience patterns

### Reliability Lead Progress
- [x] OTel Engineer - Tracing + metrics
- [x] Sentry Engineer - Error tracking
- [x] Prometheus Engineer - Metrics + dashboards
- [x] Health Check Engineer - Endpoints
- [x] Logging Specialist - Standards
- [x] Runbook Writer - SRE docs

### Data Lead Progress
- [x] Migration Engineer - Rollback scripts
- [x] Backup Specialist - Backup automation
- [x] CSV Validation Engineer - Schema validation
- [x] Data Quality Engineer - Quarantine pipelines
- [x] Schema Documenter - ER diagrams
- [x] DBA Optimizer - Performance tuning

### Compliance Lead Progress
- [ ] Audit Engineer - Audit logs
- [ ] PII Architect - Encryption schema
- [ ] GDPR Engineer - Privacy endpoints
- [ ] DSR Orchestrator - Request workflows
- [ ] Compliance Documenter - Checklists
- [ ] Access Control Specialist - Tenant isolation

### QA Lead Progress
- [ ] Integration Test Engineer - Webhook tests
- [ ] Idempotency Test Engineer - Replay tests
- [ ] Load Test Engineer - k6 scripts
- [ ] Contract Test Engineer - Pact CI
- [ ] E2E Test Engineer - Full flow tests
- [ ] CI Gate Engineer - Coverage gates

---

## Final Deliverables Checklist

### Code Artifacts
- [ ] All services use RS256 JWT with JWKS
- [ ] OIDC SSO routes implemented
- [ ] Webhook HMAC validation in connectors
- [x] All APIs versioned with `/v1` prefix
- [x] OpenAPI specs generated + merged
- [x] Idempotency tables + deduplication logic
- [x] DLQ + retry logic for NATS
- [x] Circuit breakers on inter-service HTTP
- [x] OTel instrumentation in all services
- [x] Sentry error tracking configured
- [x] Health endpoints (liveness/readiness)
- [x] Migration rollback scripts
- [x] Backup/restore automation
- [x] CSV validation + quarantine pipelines
- [ ] Audit log implementation
- [ ] PII encryption schema
- [ ] GDPR privacy endpoints (stubs)

### Tests
- [ ] Integration test: signed webhook → profile
- [ ] Integration test: idempotent re-delivery
- [ ] Integration test: circuit breaker fallback
- [ ] Load test: k6 baseline established
- [ ] Contract tests: Gateway ↔ services
- [ ] E2E test: CSV → events → Q2Q → API

### Documentation
- [ ] `/docs/Security_Hardening_Checklist.md`
- [x] `/docs/Observability_Overview.md`
- [x] `/docs/SRE_Dashboards.md`
- [x] `/docs/DB_Backup_Restore.md`
- [x] `/docs/Migration_Playbook.md`
- [ ] `/docs/GDPR_Compliance.md`
- [ ] `/docs/Audit_Log_Specification.md`
- [ ] `/reports/phaseB_worker1_hardening.md` (MASTER REPORT)
- [ ] `/reports/perf_baseline.md`
- [ ] `/reports/security_lead_report.md`
- [ ] `/reports/platform_lead_report.md`
- [x] `/reports/reliability_lead_report.md`
- [x] `/reports/data_lead_report.md`
- [ ] `/reports/compliance_lead_report.md`
- [ ] `/reports/qa_lead_report.md`

### CI/CD
- [ ] Test coverage threshold enforced
- [ ] OTel route coverage check
- [ ] Contract tests in CI pipeline
- [ ] Backup restore drill documented

---

## Acceptance Criteria (FINAL GATE)

### Security ✅
- RS256 JWT + JWKS endpoint responding
- OIDC SSO login works with test tenant
- Webhook signature validation proven via replay test
- Service-to-service JWT working

### Platform ✅
- All routes use `/v1` prefix
- OpenAPI merged spec generated
- Contract tests passing in CI
- Idempotent re-delivery verified
- DLQ captures failed events

### Reliability ✅
- ✅ OTel traces visible end-to-end with correlation IDs
- ✅ Sentry alerts fire on synthetic errors
- ✅ Grafana dashboards deployed
- ✅ All services have health endpoints

### Data ✅
- [x] Migration rollback tested successfully
- [x] Backup/restore drill completed
- [x] CSV quarantine flow verified
- [x] ER diagram generated

### Compliance ✅
- Audit logs capture key actions
- PII fields encrypted
- GDPR endpoints reachable (stubs)
- Tenant isolation verified

### Testing ✅
- Integration tests pass (webhook → profile)
- Idempotency replay test passes
- Circuit breaker test passes
- k6 baseline documented
- CI gates enforced

---

## Risk Register

| Risk | Impact | Mitigation | Owner |
|------|--------|------------|-------|
| JWT migration breaks existing clients | HIGH | Version both HS256 + RS256; deprecate gradually | Security Lead |
| OIDC provider configuration delays | MEDIUM | Start with .env.example + docs; providers configurable | Security Lead |
| OTel overhead impacts performance | MEDIUM | Sample traces (10%); benchmark before/after | Reliability Lead |
| Migration rollback untested in prod-like env | HIGH | Test on staging clone; document edge cases | Data Lead |
| PII encryption key rotation not automated | MEDIUM | Manual rotation docs first; plan vault integration | Compliance Lead |
| Load test infrastructure unavailable | LOW | Use local k6; document cloud setup for future | QA Lead |

---

## Next Steps (Orchestrator)

1. ✅ Deploy Security Lead team
2. ✅ Deploy Platform Lead team (parallel)
3. Monitor commits; unblock dependencies
4. Deploy Reliability + Data Leads (Phase 2)
5. Deploy Compliance + QA Leads (Phase 3)
6. Synthesize final reports
7. Validate all acceptance criteria
8. Commit + push to branch

---

**Last Updated**: Phase B initiation
**Status**: 🟡 IN PROGRESS
**Orchestrator**: Active
