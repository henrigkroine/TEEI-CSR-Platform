# External CSR Integrations Hardening Plan

**Mission**: Finish and harden external CSR integrations end-to-end (Goodera, Workday; keep Benevity as reference), wire them to Impact-In delivery + cockpit monitoring, and ship contract-tested, rate-limited, observable, and GDPR-safe connectors ready for tenant pilots.

**Status**: 🚧 In Progress
**Branch**: `claude/csr-integrations-hardening-01Epd5YFxs5MH5ZtvgkC95Xw`
**Started**: 2025-11-15

---

## Executive Summary

### Current State Assessment

| Component | Status | Notes |
|-----------|--------|-------|
| **Benevity Integration** | ✅ Production-Ready | Complete reference implementation |
| **Goodera Integration** | ⚠️ Needs Hardening | Core complete, missing OAuth clarification, idempotency, contract tests |
| **Workday Integration** | ⚠️ Needs Hardening | REST OAuth complete, SOAP undefined, token persistence needed |
| **Impact-In Service** | ✅ Complete | Delivery routing, retry logic, SLA tracking functional |
| **Cockpit Monitoring** | ✅ Complete | Full UI with delivery monitoring, SLA dashboard, retry controls |
| **Secrets Management** | ✅ Complete | Vault integration with AWS/HashiCorp support |
| **Observability** | 🔧 Partial | Prometheus metrics exist, missing tracing/dashboards/alerts |
| **Testing** | 🔧 Partial | Unit tests exist, missing contract tests, E2E, load tests |
| **Documentation** | ⚠️ Needs Update | Comprehensive but has discrepancies (OAuth, SOAP) |

### Key Findings

✅ **Strengths**:
- Benevity serves as excellent production-ready reference
- Impact-In service has robust retry logic with exponential backoff + jitter
- Comprehensive Prometheus metrics instrumentation
- Full cockpit UI with delivery monitoring and SLA tracking
- Secrets vault with multi-backend support (AWS, HashiCorp)
- Rate limiting implemented for Goodera (600ms delay, 100 req/min)

⚠️ **Critical Gaps**:
1. **Goodera OAuth Discrepancy**: Docs mention OAuth 2.0, code uses API Key only
2. **Workday SOAP/WS-Security**: Docs describe SOAP with WS-Security, code only has REST OAuth
3. **OAuth Token Persistence**: Workday tokens stored in-memory only (lost on restart)
4. **External API Contract Tests**: No Pact tests for Benevity/Goodera/Workday external APIs
5. **OpenAPI Specification**: No OpenAPI spec for Impact-In service
6. **Idempotency**: Only Benevity has Redis-backed idempotency cache
7. **Distributed Tracing**: No OpenTelemetry instrumentation
8. **Observability Gaps**: No Grafana dashboards or alerting rules
9. **PII Redaction**: No explicit PII redaction for Workday employee data
10. **Integration Tests**: No tests against sandbox environments

---

## Hardening Workstreams

### 🔧 Workstream 1: Authentication & Secrets Hardening

#### 1.1 Goodera OAuth Resolution
**Priority**: High
**Agents**: `@goodera-client`, `@oauth-specialist`, `@schema-linter`

**Tasks**:
- [ ] Review Goodera API documentation to verify auth method (OAuth 2.0 vs API Key)
- [ ] If OAuth: Implement Client Credentials flow with token refresh
- [ ] If OAuth: Create `impact_provider_tokens` table schema
- [ ] If API Key: Update docs to remove OAuth references
- [ ] Add Zod schema validation for auth configuration
- [ ] Update `/docs/impact_in/goodera_spec.md` with correct auth method

**Files**:
- `services/impact-in/src/connectors/goodera/client.ts`
- `docs/impact_in/goodera_spec.md`
- `migrations/XXX_create_impact_provider_tokens.sql` (if OAuth)

**Definition of Done**:
- Auth method clarified and documented
- Implementation matches documentation
- Tests cover auth flow (token refresh if OAuth)

---

#### 1.2 Workday SOAP/WS-Security Clarification
**Priority**: High
**Agents**: `@workday-rest-engineer`, `@workday-soap-engineer`, `@schema-linter`

**Tasks**:
- [ ] Determine if SOAP/WS-Security is required for Workday integration
- [ ] Option A (SOAP Required):
  - [ ] Implement SOAP client using `fast-xml-parser`
  - [ ] Add WS-Security (UsernameToken) authentication
  - [ ] Add protocol switching logic (REST vs SOAP based on config)
  - [ ] Update mapper to handle XML payloads
- [ ] Option B (REST Only):
  - [ ] Remove SOAP references from docs
  - [ ] Document REST OAuth as the only supported method
- [ ] Add protocol configuration to company settings table

**Files**:
- `services/impact-in/src/connectors/workday/client.ts`
- `services/impact-in/src/connectors/workday/soap-client.ts` (new if Option A)
- `docs/impact_in/workday_spec.md`

**Definition of Done**:
- Protocol support clarified and documented
- Implementation matches tenant requirements
- Tests cover both protocols (if dual-protocol)

---

#### 1.3 OAuth Token Persistence
**Priority**: High
**Agents**: `@oauth-specialist`, `@database-engineer`, `@secrets-vault-client`

**Tasks**:
- [ ] Create `impact_provider_tokens` table:
  - Columns: `id`, `company_id`, `platform`, `access_token`, `refresh_token`, `expires_at`, `created_at`, `updated_at`
  - Encrypt `access_token` and `refresh_token` at rest (using pgcrypto)
  - TTL index on `expires_at` for auto-cleanup
- [ ] Implement token storage layer:
  - `TokenStore.save(platform, companyId, token)`
  - `TokenStore.get(platform, companyId)`
  - `TokenStore.refresh(platform, companyId)`
  - `TokenStore.invalidate(platform, companyId)`
- [ ] Update Workday client to use database-backed tokens
- [ ] Add token rotation automation (refresh 1 min before expiry)
- [ ] Add metrics: `impact_in_oauth_token_refreshes_total`, `impact_in_oauth_token_age_seconds`

**Files**:
- `migrations/XXX_create_impact_provider_tokens.sql` (new)
- `services/impact-in/src/lib/token-store.ts` (new)
- `services/impact-in/src/connectors/workday/client.ts`

**Definition of Done**:
- Tokens persisted across service restarts
- Auto-refresh works before expiry
- Database table encrypted at rest
- Metrics exposed for token health monitoring

---

### 🔧 Workstream 2: Idempotency & Reliability

#### 2.1 Extend Redis Idempotency to Goodera and Workday
**Priority**: High
**Agents**: `@idempotency-engineer`, `@goodera-client`, `@workday-rest-engineer`

**Tasks**:
- [ ] Extract Benevity's idempotency logic into shared utility:
  - `lib/idempotency.ts` with `IdempotencyCache` class
  - `generateIdempotencyKey(payload, salt)`
  - `checkDuplicate(key)`, `markProcessed(key, ttl)`
- [ ] Add idempotency cache to Goodera client:
  - 24h TTL for single records
  - Batch payloads: hash each record in batch separately
- [ ] Add idempotency cache to Workday client:
  - Hash volunteer activities array
  - 24h TTL
- [ ] Add metrics: `impact_in_idempotency_hits_total{platform}`, `impact_in_idempotency_cache_size{platform}`
- [ ] Add tests for idempotency key generation and cache behavior

**Files**:
- `services/impact-in/src/lib/idempotency.ts` (new)
- `services/impact-in/src/connectors/goodera/client.ts`
- `services/impact-in/src/connectors/workday/client.ts`
- `services/impact-in/src/__tests__/idempotency.test.ts` (new)

**Definition of Done**:
- All platforms use shared idempotency cache
- Duplicate deliveries rejected within 24h window
- Metrics track cache hits and size
- Tests cover edge cases (hash collisions, TTL expiry)

---

#### 2.2 Circuit Breaker Pattern
**Priority**: Medium
**Agents**: `@retry-backoff-engineer`, `@circuit-breaker-specialist`

**Tasks**:
- [ ] Install `opossum` library for circuit breaker
- [ ] Wrap external API calls with circuit breaker:
  - Threshold: 5 failures in 10s window
  - Timeout: 30s for single request
  - Reset timeout: 60s (half-open state)
  - Fallback: Return cached response or graceful degradation
- [ ] Add circuit breaker metrics:
  - `impact_in_circuit_breaker_state{platform, state}` (closed/open/half-open)
  - `impact_in_circuit_breaker_failures{platform}`
- [ ] Add circuit breaker status to health check endpoint
- [ ] Add tests for circuit breaker transitions (closed → open → half-open → closed)

**Files**:
- `services/impact-in/src/lib/circuit-breaker.ts` (new)
- `services/impact-in/src/connectors/*/client.ts` (update all)
- `services/impact-in/src/routes/health.ts`

**Definition of Done**:
- Circuit breaker prevents cascading failures
- Metrics track circuit breaker state transitions
- Health check reflects circuit breaker status
- Tests cover all state transitions

---

### 🔧 Workstream 3: Contract Testing & Validation

#### 3.1 Goodera External API Contract Tests
**Priority**: High
**Agents**: `@pact-publisher`, `@goodera-client`, `@sandbox-stubber`

**Tasks**:
- [ ] Create Pact consumer tests for Goodera API:
  - `packages/contracts/pact-tests/impact-in-goodera.pact.test.ts`
  - Test single record POST `/impact-data`
  - Test batch POST `/impact-data/batch`
  - Test health check GET `/health`
  - Use matchers: `uuid()`, `iso8601DateTime()`, `like()`, `eachLike()`
- [ ] Create Goodera sandbox simulator:
  - Mock server matching Goodera API spec
  - Rate limiting enforcement (100 req/min)
  - Batch validation (max 100 records)
  - `tests/sandbox/goodera-simulator.ts`
- [ ] Add Pact provider verification:
  - Run against sandbox simulator
  - Publish pact to Pact Broker (if available)
- [ ] Add CI gate: Fail on Pact drift

**Files**:
- `packages/contracts/pact-tests/impact-in-goodera.pact.test.ts` (new)
- `tests/sandbox/goodera-simulator.ts` (new)
- `.github/workflows/pact-tests.yml` (update)

**Definition of Done**:
- Pact tests cover all Goodera endpoints
- Sandbox simulator validates payloads
- CI fails on contract drift
- Tests run in isolation (no external dependencies)

---

#### 3.2 Workday External API Contract Tests
**Priority**: High
**Agents**: `@pact-publisher`, `@workday-rest-engineer`, `@sandbox-stubber`

**Tasks**:
- [ ] Create Pact consumer tests for Workday API:
  - `packages/contracts/pact-tests/impact-in-workday.pact.test.ts`
  - Test OAuth token endpoint POST `/oauth2/token`
  - Test volunteer activities POST `/volunteer-management/v1/activities`
  - Test token refresh flow
  - Use matchers for OAuth tokens and activity IDs
- [ ] Create Workday sandbox simulator:
  - Mock OAuth server (token issuance, refresh, expiry)
  - Mock volunteer management API
  - Validate activity types enum
  - `tests/sandbox/workday-simulator.ts`
- [ ] Add Pact provider verification:
  - Run against sandbox simulator
  - Verify OAuth flow (token refresh, expiry)
- [ ] Add CI gate: Fail on Pact drift

**Files**:
- `packages/contracts/pact-tests/impact-in-workday.pact.test.ts` (new)
- `tests/sandbox/workday-simulator.ts` (new)
- `.github/workflows/pact-tests.yml` (update)

**Definition of Done**:
- Pact tests cover OAuth and volunteer management endpoints
- Sandbox simulator validates OAuth flow
- CI fails on contract drift
- Tests cover token refresh edge cases

---

### 🔧 Workstream 4: Observability & SLOs

#### 4.1 OpenTelemetry Distributed Tracing
**Priority**: High
**Agents**: `@otel-instrumenter`, `@jaeger-integrator`, `@cost-latency-profiler`

**Tasks**:
- [ ] Install OpenTelemetry dependencies:
  - `@opentelemetry/sdk-node`
  - `@opentelemetry/auto-instrumentations-node`
  - `@opentelemetry/exporter-jaeger`
- [ ] Add tracing instrumentation:
  - Trace deliveries end-to-end (receive → validate → send → confirm)
  - Add span attributes: `tenant_id`, `platform`, `delivery_id`, `company_id`
  - Add span events: `retry_attempt`, `idempotency_hit`, `rate_limit_hit`
- [ ] Configure Jaeger exporter:
  - Export to Jaeger collector (port 14268)
  - Sample rate: 10% in production, 100% in dev
- [ ] Add tracing to all connector clients (Benevity, Goodera, Workday)
- [ ] Add trace context propagation to outbound HTTP requests
- [ ] Update cockpit UI to display trace IDs in delivery details

**Files**:
- `services/impact-in/src/lib/tracing.ts` (new)
- `services/impact-in/src/index.ts` (initialize tracing)
- `services/impact-in/src/connectors/*/client.ts` (add spans)
- `apps/corp-cockpit-astro/src/components/impact-in/DeliveryDetailDrawer.tsx` (show trace ID)

**Definition of Done**:
- Traces visible in Jaeger UI
- Spans include tenant_id and platform labels
- Trace IDs displayed in cockpit
- Sampling configured for production

---

#### 4.2 Grafana Dashboards
**Priority**: High
**Agents**: `@grafana-paneler`, `@sla-calculator`

**Tasks**:
- [ ] Create Grafana dashboard: "Impact-In Delivery Metrics"
  - Panel 1: Success rate by platform (target: ≥98%)
  - Panel 2: Latency histogram (p50, p95, p99) (target: ≤5 min)
  - Panel 3: Retry depth distribution
  - Panel 4: Rate limit hits by platform
  - Panel 5: SLA compliance status (healthy/warning/breach)
  - Panel 6: Circuit breaker state by platform
  - Panel 7: OAuth token age gauge
  - Panel 8: Idempotency cache hit rate
- [ ] Create Grafana dashboard: "Impact-In Error Analysis"
  - Panel 1: Failures by error type (4xx, 5xx, timeout, etc.)
  - Panel 2: Top error messages (aggregated)
  - Panel 3: Failure rate trend (24h)
  - Panel 4: Webhook verification failures by reason
- [ ] Export dashboards as JSON to `observability/grafana/impact-in-*.json`
- [ ] Add datasource configuration for Prometheus and Jaeger

**Files**:
- `observability/grafana/impact-in-delivery-metrics.json` (new)
- `observability/grafana/impact-in-error-analysis.json` (new)
- `observability/grafana/datasources.yml` (update)

**Definition of Done**:
- Dashboards render all panels successfully
- SLA targets visualized clearly (green/yellow/red zones)
- Dashboards exportable and version-controlled
- Documentation includes dashboard screenshots

---

#### 4.3 Prometheus Alerting Rules
**Priority**: High
**Agents**: `@alert-rule-author`, `@error-budget-modeler`

**Tasks**:
- [ ] Create Prometheus alerting rules:
  - Alert: `ImpactInSuccessRateLow` (success rate < 98% for 5 min)
  - Alert: `ImpactInHighLatency` (p95 latency > 5 min for 10 min)
  - Alert: `ImpactInRetriesExhausted` (deliveries with 3+ retries)
  - Alert: `ImpactInRateLimitExceeded` (rate limit hits > 10% of total requests)
  - Alert: `ImpactInCircuitBreakerOpen` (circuit breaker open for any platform)
  - Alert: `ImpactInOAuthTokenExpiringSoon` (token expires in < 5 min)
  - Alert: `ImpactInSLABreach` (SLA status = breach for 15 min)
- [ ] Configure alert severity labels (critical, warning, info)
- [ ] Add runbook links to each alert
- [ ] Export rules to `observability/prometheus/impact-in-alerts.yml`
- [ ] Test alerts with Prometheus alertmanager (fire test alerts)

**Files**:
- `observability/prometheus/impact-in-alerts.yml` (new)
- `docs/ImpactIn_Runbook.md` (update with alert handling)

**Definition of Done**:
- All alerts fire correctly in test scenarios
- Runbook links functional
- Alerts routed to appropriate channels (Slack, PagerDuty)
- Alert fatigue minimized (no flapping alerts)

---

### 🔧 Workstream 5: Security & Compliance

#### 5.1 PII Redaction for Workday
**Priority**: High
**Agents**: `@redaction-engineer`, `@gdpr-compliance-validator`

**Tasks**:
- [ ] Identify PII fields in Workday payloads:
  - Employee ID (Worker_ID)
  - Employee name (Worker_Name, Full_Name)
  - Email address (Email_Address)
  - Phone number (Phone)
  - Date of birth (DOB)
- [ ] Implement pre-send PII redaction:
  - Hash employee IDs (SHA-256 with salt)
  - Remove names, emails, phone numbers
  - Preserve activity metadata (hours, type, date)
- [ ] Add post-redaction leak detection:
  - Scan payload for regex patterns (email, phone, SSN)
  - Throw error if PII detected after redaction
- [ ] Add redaction audit logging:
  - Log redaction count (no PII values logged)
  - Include correlation ID for traceability
- [ ] Update Workday mapper to apply redaction before sending
- [ ] Add tests for PII redaction (verify no leaks)

**Files**:
- `services/impact-in/src/lib/pii-redaction.ts` (new)
- `services/impact-in/src/connectors/workday/mapper.ts`
- `services/impact-in/src/__tests__/pii-redaction.test.ts` (new)

**Definition of Done**:
- No PII sent to Workday API
- Redaction audit logs capture redaction events
- Tests verify PII patterns are removed
- Documentation updated with GDPR compliance notes

---

#### 5.2 Enhanced Audit Logging with Evidence Lineage
**Priority**: Medium
**Agents**: `@audit-logger`, `@evidence-lineage-tracker`

**Tasks**:
- [ ] Enhance delivery log schema:
  - Add `correlation_id` (UUID for tracing across services)
  - Add `evidence_hash` (SHA-256 of payload for tamper detection)
  - Add `redaction_count` (number of PII fields redacted)
  - Add `idempotency_key` (for deduplication tracking)
- [ ] Implement evidence lineage tracking:
  - Link delivery to source data (CSR activity ID)
  - Track payload transformations (mapper changes)
  - Record retry chain (parent_delivery_id for retries)
- [ ] Add audit log query API:
  - `/v1/audit/deliveries?correlation_id=xxx`
  - `/v1/audit/deliveries?evidence_hash=xxx`
  - Filter by company, platform, date range
- [ ] Ensure no PII in audit logs (sanitize error messages)
- [ ] Add retention policy (90 days for audit logs)

**Files**:
- `migrations/XXX_enhance_delivery_log.sql` (new)
- `services/impact-in/src/delivery-log.ts`
- `services/impact-in/src/routes/audit.ts` (new)

**Definition of Done**:
- Audit logs include correlation IDs and evidence hashes
- No PII in logs (verified by tests)
- Lineage trackable across retries
- Retention policy enforced (90-day TTL)

---

#### 5.3 OWASP ZAP Security Scan
**Priority**: Medium
**Agents**: `@security-scanner`, `@vulnerability-tester`

**Tasks**:
- [ ] Install OWASP ZAP (Zed Attack Proxy)
- [ ] Configure ZAP baseline scan:
  - Target: Impact-In service endpoints
  - Scan policies: API scan (passive + active)
  - Exclude authenticated endpoints (use API key for scan)
- [ ] Run ZAP scan against all endpoints:
  - `/v1/impact-in/deliveries`
  - `/v1/impact-in/replay`
  - `/v1/impact-in/webhooks`
  - `/v1/impact-in/sla`
  - `/v1/impact-in/schedules`
  - `/metrics`
  - `/health`
- [ ] Review ZAP report:
  - High/Medium vulnerabilities must be fixed
  - Low vulnerabilities documented as accepted risk
- [ ] Add ZAP scan to CI pipeline (fail on high/medium findings)
- [ ] Document findings in `reports/worker-integrations/security-scan.md`

**Files**:
- `tests/security/zap-config.yml` (new)
- `.github/workflows/security-scan.yml` (new)
- `reports/worker-integrations/security-scan.md` (new)

**Definition of Done**:
- ZAP scan completes successfully
- No high/medium vulnerabilities found
- CI fails on new vulnerabilities
- Security report published

---

### 🔧 Workstream 6: API Documentation

#### 6.1 Generate OpenAPI 3.0 Specification
**Priority**: High
**Agents**: `@openapi-writer`, `@schema-linter`

**Tasks**:
- [ ] Install `@fastify/swagger` and `@fastify/swagger-ui` plugins
- [ ] Define OpenAPI schemas for all endpoints:
  - `/v1/impact-in/deliveries` (GET, POST)
  - `/v1/impact-in/deliveries/{id}` (GET)
  - `/v1/impact-in/deliveries/stats` (GET)
  - `/v1/impact-in/replay` (POST)
  - `/v1/impact-in/webhooks/{platform}` (POST)
  - `/v1/impact-in/sla` (GET)
  - `/v1/impact-in/schedules` (GET, POST, DELETE)
  - `/health` (GET)
  - `/metrics` (GET)
- [ ] Add Zod schema annotations for auto-documentation:
  - Request query parameters (page, limit, status, platform, etc.)
  - Request body schemas (replay payload, schedule payload)
  - Response schemas (delivery object, stats object, SLA object)
- [ ] Add API versioning header requirement (X-API-Version: 1.0)
- [ ] Add authentication documentation (Bearer token, API key)
- [ ] Add rate limiting documentation (per-tenant limits)
- [ ] Export OpenAPI spec to `services/impact-in/src/openapi.json`
- [ ] Serve Swagger UI at `/docs`

**Files**:
- `services/impact-in/src/openapi.ts` (new)
- `services/impact-in/src/openapi.json` (generated)
- `services/impact-in/src/index.ts` (register Swagger plugin)

**Definition of Done**:
- OpenAPI spec includes all endpoints
- Swagger UI accessible at `/docs`
- Schemas validated with Zod
- CI gate: Fail if OpenAPI spec outdated

---

### 🔧 Workstream 7: Testing & CI Gates

#### 7.1 Integration Tests Against Sandbox Environments
**Priority**: High
**Agents**: `@integration-tester`, `@sandbox-stubber`

**Tasks**:
- [ ] Create Goodera sandbox integration tests:
  - `services/impact-in/src/__tests__/integration/goodera.integration.test.ts`
  - Test full delivery flow (send → confirm → verify)
  - Test rate limiting enforcement (send 101 requests)
  - Test batch splitting (send 250 records)
  - Test error handling (4xx, 5xx responses)
  - Test idempotency (send duplicate payload)
- [ ] Create Workday sandbox integration tests:
  - `services/impact-in/src/__tests__/integration/workday.integration.test.ts`
  - Test OAuth flow (token acquisition, refresh, expiry)
  - Test volunteer activities delivery
  - Test token persistence across restarts
  - Test error handling (401, 403, 429, 500)
- [ ] Add sandbox environment setup scripts:
  - `tests/sandbox/start-goodera.sh`
  - `tests/sandbox/start-workday.sh`
- [ ] Run tests in CI with sandbox containers (Docker Compose)

**Files**:
- `services/impact-in/src/__tests__/integration/goodera.integration.test.ts` (new)
- `services/impact-in/src/__tests__/integration/workday.integration.test.ts` (new)
- `tests/sandbox/docker-compose.yml` (new)
- `.github/workflows/integration-tests.yml` (new)

**Definition of Done**:
- Integration tests pass against sandbox environments
- Tests cover error scenarios and edge cases
- Sandbox environments reproducible (Docker Compose)
- CI runs integration tests on every PR

---

#### 7.2 k6 Load Tests for Rate Limiting and Spike Scenarios
**Priority**: Medium
**Agents**: `@k6-scenarist`, `@rate-limit-governor`

**Tasks**:
- [ ] Create k6 load test scenarios:
  - **Steady Load**: 100 req/min for 5 min (verify rate limiting)
  - **Spike**: 1000 req/min for 30s (verify circuit breaker)
  - **Gradual Ramp**: 0 → 200 req/min over 10 min (verify auto-scaling)
  - **Burst**: 500 concurrent requests (verify queue backpressure)
- [ ] Measure SLA compliance under load:
  - Success rate ≥98%
  - Latency p95 ≤5 min
  - No dropped requests
- [ ] Add k6 test for Goodera rate limiting:
  - Send 150 req/min, expect 429 after 100
  - Verify Retry-After header
- [ ] Add k6 test for Workday OAuth token refresh:
  - Simulate 1-hour token expiry
  - Verify auto-refresh before expiry
- [ ] Run k6 tests in CI (nightly builds)
- [ ] Export k6 results to InfluxDB + Grafana

**Files**:
- `tests/load/impact-in-steady.js` (new)
- `tests/load/impact-in-spike.js` (new)
- `tests/load/impact-in-ramp.js` (new)
- `tests/load/impact-in-burst.js` (new)
- `.github/workflows/load-tests.yml` (new)

**Definition of Done**:
- k6 tests run successfully with passing SLA targets
- Rate limiting enforced correctly
- Circuit breaker prevents cascading failures
- Load test results published to Grafana

---

#### 7.3 Playwright E2E Tests for Cockpit
**Priority**: Medium
**Agents**: `@e2e-tester`, `@playwright-scripter`

**Tasks**:
- [ ] Create Playwright E2E tests for cockpit delivery monitoring:
  - `tests/e2e/cockpit-delivery-monitor.spec.ts`
  - Test: Load delivery dashboard, verify stats cards render
  - Test: Filter deliveries by platform (Goodera, Workday)
  - Test: Filter deliveries by status (success, failed, retrying)
  - Test: Paginate through delivery list
  - Test: Open delivery detail drawer, verify payload display
  - Test: Click retry button, verify status update
  - Test: Bulk retry (select multiple deliveries, retry all)
  - Test: Export deliveries to CSV
- [ ] Create Playwright E2E tests for SLA dashboard:
  - `tests/e2e/cockpit-sla-dashboard.spec.ts`
  - Test: Load SLA dashboard, verify overall SLA status
  - Test: Verify per-platform breakdown (Benevity, Goodera, Workday)
  - Test: Check auto-refresh (wait 5 min, verify data updates)
- [ ] Add E2E tests for admin toggles:
  - `tests/e2e/cockpit-admin-toggles.spec.ts`
  - Test: Toggle Goodera integration on/off
  - Test: Toggle Workday integration on/off
  - Test: Verify feature flag persisted to database
- [ ] Run E2E tests in CI with headless browser

**Files**:
- `tests/e2e/cockpit-delivery-monitor.spec.ts` (new)
- `tests/e2e/cockpit-sla-dashboard.spec.ts` (new)
- `tests/e2e/cockpit-admin-toggles.spec.ts` (new)
- `.github/workflows/e2e-tests.yml` (new)

**Definition of Done**:
- E2E tests cover all user flows in cockpit
- Tests run in CI on every PR
- Screenshots captured on test failures
- Test report published to CI artifacts

---

#### 7.4 CI Gates for Quality Checks
**Priority**: High
**Agents**: `@ci-gatekeeper`, `@coverage-enforcer`

**Tasks**:
- [ ] Add CI gate: OpenAPI spec validation
  - Fail if OpenAPI spec missing or outdated
  - Compare spec against route definitions (auto-detect drift)
- [ ] Add CI gate: Pact contract drift detection
  - Fail if consumer contract changed without provider update
  - Publish Pact to broker on merge to main
- [ ] Add CI gate: Test coverage on changed files
  - Require ≥80% coverage for new/modified files
  - Use `jest --coverage --changedSince=origin/main`
- [ ] Add CI gate: Security scan (OWASP ZAP)
  - Fail on high/medium vulnerabilities
- [ ] Add CI gate: Linting and type checking
  - ESLint: No errors, max 10 warnings
  - TypeScript: Strict mode, no `any` types
- [ ] Add CI gate: Bundle size check
  - Fail if bundle size increases > 10% without justification
- [ ] Add pre-commit hooks:
  - Format code with Prettier
  - Run unit tests for changed files

**Files**:
- `.github/workflows/ci-gates.yml` (new)
- `.github/workflows/pull-request.yml` (update)
- `.husky/pre-commit` (new)

**Definition of Done**:
- All CI gates pass on main branch
- PRs blocked if gates fail
- Coverage enforced for new code
- Pre-commit hooks prevent bad commits

---

### 🔧 Workstream 8: Documentation & Runbooks

#### 8.1 Update Integration Documentation
**Priority**: Medium
**Agents**: `@docs-scribe`, `@technical-writer`, `@runbook-author`

**Tasks**:
- [ ] Update `/docs/impact_in/goodera_spec.md`:
  - Clarify auth method (OAuth or API Key)
  - Add idempotency key requirement
  - Add rate limiting details (600ms delay, 100 req/min)
  - Add PII redaction notes (if applicable)
  - Add contract test examples
- [ ] Update `/docs/impact_in/workday_spec.md`:
  - Clarify protocol (REST vs SOAP)
  - Add OAuth token persistence details
  - Add PII redaction requirements (employee data)
  - Add contract test examples
- [ ] Update `/docs/ImpactIn_Integrations.md`:
  - Add circuit breaker section
  - Add distributed tracing section (Jaeger)
  - Add Grafana dashboard screenshots
  - Add alerting rules documentation
  - Add OpenAPI spec link
- [ ] Update `/docs/ImpactIn_Connectors.md`:
  - Add idempotency cache section
  - Add token persistence section
  - Add PII redaction guidelines
  - Add contract testing guide
- [ ] Create `/docs/ImpactIn_Runbook.md`:
  - Alert handling procedures (for each alert)
  - Troubleshooting guide (common errors)
  - Escalation paths (who to contact)
  - Rollback procedures (if deployment fails)
  - Circuit breaker manual reset
  - Token rotation manual trigger
  - PII incident response

**Files**:
- `docs/impact_in/goodera_spec.md` (update)
- `docs/impact_in/workday_spec.md` (update)
- `docs/ImpactIn_Integrations.md` (update)
- `docs/ImpactIn_Connectors.md` (update)
- `docs/ImpactIn_Runbook.md` (new)

**Definition of Done**:
- All documentation reflects current implementation
- No discrepancies between docs and code
- Runbook covers all alerts and incidents
- Screenshots updated with latest UI

---

#### 8.2 Create Hardening Report
**Priority**: Low
**Agents**: `@technical-writer`, `@qa-compliance-lead`

**Tasks**:
- [ ] Create comprehensive hardening report at `/reports/worker-integrations/hardening-summary.md`:
  - Executive summary
  - Scope of work completed
  - Authentication improvements
  - Idempotency enhancements
  - Contract testing results
  - Observability additions (tracing, dashboards, alerts)
  - Security hardening (PII redaction, audit logging, OWASP scan)
  - Testing coverage (unit, integration, E2E, load)
  - CI/CD improvements
  - Performance metrics (before/after)
  - Lessons learned
  - Recommendations for future work
- [ ] Include screenshots:
  - Grafana dashboards
  - Jaeger traces
  - Cockpit UI (delivery monitor, SLA dashboard)
  - OpenAPI Swagger UI
  - k6 load test results
- [ ] Add metrics comparison table (before/after hardening)
- [ ] Add test coverage report

**Files**:
- `reports/worker-integrations/hardening-summary.md` (new)

**Definition of Done**:
- Comprehensive report published
- Screenshots included
- Metrics demonstrate improvements
- Report reviewed by stakeholders

---

## Definition of Done (Overall Mission)

### ✅ Goodera Integration Complete:
- [ ] Auth method clarified and documented (OAuth or API Key)
- [ ] Redis-backed idempotency cache implemented
- [ ] Pact contract tests passing with sandbox verification
- [ ] Integration tests passing against sandbox
- [ ] PII redaction implemented (if applicable)
- [ ] Rate limiting enforced (100 req/min)
- [ ] Circuit breaker protecting external API calls
- [ ] OpenTelemetry tracing instrumented
- [ ] Metrics exposed and dashboards created
- [ ] Documentation updated

### ✅ Workday Integration Complete:
- [ ] Protocol clarified (REST vs SOAP/WS-Security)
- [ ] OAuth token persistence implemented (database-backed)
- [ ] Redis-backed idempotency cache implemented
- [ ] Pact contract tests passing with sandbox verification
- [ ] Integration tests passing against sandbox (including OAuth refresh)
- [ ] PII redaction implemented for employee data
- [ ] Circuit breaker protecting external API calls
- [ ] OpenTelemetry tracing instrumented
- [ ] Metrics exposed and dashboards created
- [ ] Documentation updated

### ✅ Impact-In Service Hardened:
- [ ] All connectors use shared idempotency cache
- [ ] Circuit breaker pattern implemented
- [ ] OpenTelemetry distributed tracing instrumented
- [ ] Grafana dashboards created (delivery metrics, error analysis)
- [ ] Prometheus alerting rules configured (7 alerts)
- [ ] Enhanced audit logging with evidence lineage
- [ ] OpenAPI 3.0 spec generated and Swagger UI available at `/docs`
- [ ] OWASP ZAP security scan passing (no high/medium vulnerabilities)

### ✅ Cockpit Monitoring Enhanced:
- [ ] Trace IDs displayed in delivery detail drawer
- [ ] Live delivery status visible
- [ ] Retry controls functional (single + bulk)
- [ ] CSV export working
- [ ] SLA dashboard auto-refreshing
- [ ] E2E tests passing for all user flows

### ✅ Testing & CI Gates:
- [ ] Pact contract tests for Goodera and Workday external APIs
- [ ] Integration tests against sandbox environments
- [ ] k6 load tests for rate limiting and spike scenarios
- [ ] Playwright E2E tests for cockpit
- [ ] CI gates enforcing: OpenAPI validation, Pact drift detection, coverage on changed files, security scan
- [ ] Pre-commit hooks for formatting and unit tests

### ✅ Observability:
- [ ] Metrics: success %, latency (p50/p95/p99), retry depth, rate-limit hits, SLA breaches, circuit breaker state
- [ ] Grafana dashboards: Delivery metrics, error analysis
- [ ] Jaeger traces: End-to-end delivery tracing with tenant_id and platform labels
- [ ] Alerts: 7 alerts configured (success rate, latency, retries, rate limits, circuit breaker, OAuth token, SLA breach)

### ✅ Security & Compliance:
- [ ] No PII in logs (verified by tests)
- [ ] PII redaction for Workday employee data
- [ ] Audit logs with correlation IDs and evidence hashes
- [ ] Secrets from Vault only (no hardcoded credentials)
- [ ] HMAC signature verification for webhooks
- [ ] OWASP ZAP scan passing

### ✅ Documentation:
- [ ] All integration specs updated (Goodera, Workday)
- [ ] Runbook created with alert handling procedures
- [ ] OpenAPI spec published at `/docs`
- [ ] Hardening report published with screenshots and metrics
- [ ] No discrepancies between docs and code

### ✅ Deployment Ready:
- [ ] PRs labeled `integrations-ready` with checklists
- [ ] All tests passing (unit, integration, E2E, load, contract)
- [ ] CI/CD gates passing (OpenAPI, Pact, coverage, security)
- [ ] Secrets configured in Vault (staging and production)
- [ ] Grafana dashboards and alerts deployed
- [ ] Runbook reviewed by on-call team

---

## Team Assignments (30 Agents / 5 Leads)

### Lead 1: @lead-externals (Goodera & Workday Clients)
**Specialists (6)**:
- @goodera-client (Goodera auth clarification, idempotency, rate limiting)
- @workday-rest-engineer (Workday OAuth persistence, PII redaction)
- @workday-soap-engineer (SOAP/WS-Security implementation if required)
- @oauth-specialist (Token storage, refresh, rotation)
- @mapper-transformer (Payload mapping, schema validation)
- @schema-linter (Zod validation, type safety)

### Lead 2: @lead-impact-in (Delivery Routing & Reliability)
**Specialists (6)**:
- @idempotency-engineer (Shared idempotency cache)
- @retry-backoff-engineer (Enhanced retry logic)
- @circuit-breaker-specialist (Circuit breaker implementation)
- @rate-limit-governor (Per-tenant rate limiting)
- @delivery-router (Routing logic, feature flags)
- @database-engineer (Token storage table, audit log enhancements)

### Lead 3: @lead-security (Auth, Secrets, PII, Compliance)
**Specialists (6)**:
- @secrets-vault-client (Vault integration, secret rotation)
- @hmac-verifier (Webhook signature verification)
- @redaction-engineer (PII redaction for Workday)
- @audit-logger (Enhanced audit logging, evidence lineage)
- @gdpr-compliance-validator (GDPR compliance checks)
- @vulnerability-tester (OWASP ZAP security scan)

### Lead 4: @lead-qa-contracts (Testing & CI Gates)
**Specialists (6)**:
- @pact-publisher (Pact contract tests for Goodera, Workday)
- @sandbox-stubber (Goodera and Workday sandbox simulators)
- @integration-tester (Integration tests against sandboxes)
- @k6-scenarist (Load tests for rate limiting, spike scenarios)
- @playwright-scripter (E2E tests for cockpit)
- @ci-gatekeeper (CI gates for OpenAPI, Pact, coverage, security)

### Lead 5: @lead-observability (Metrics, Tracing, Dashboards, Alerts)
**Specialists (6)**:
- @otel-instrumenter (OpenTelemetry tracing instrumentation)
- @jaeger-integrator (Jaeger exporter, trace context propagation)
- @cost-latency-profiler (Performance profiling, latency analysis)
- @grafana-paneler (Grafana dashboards creation)
- @alert-rule-author (Prometheus alerting rules)
- @sla-calculator (SLA compliance tracking, error budgets)

---

## Communication Protocol

- **Daily Standup**: Leads report progress, blockers, dependencies
- **Blockers**: Escalate to Tech Lead immediately
- **Commits**: Small, atomic, tested slices with descriptive messages
- **Documentation**: Update docs with every code change
- **Code Reviews**: All PRs require at least 1 lead approval

---

## Success Criteria

✅ All endpoints return shaped data
✅ Goodera + Workday green on contract tests and sandbox replays
✅ Cockpit shows live delivery status, retries, and export
✅ No PII in logs (verified by tests and GDPR compliance checks)
✅ Alerts firing on SLA breach
✅ OpenAPI spec published at `/docs`
✅ Grafana dashboards deployed
✅ k6 load tests passing with SLA targets
✅ E2E tests passing for cockpit
✅ OWASP ZAP scan passing
✅ CI gates enforcing quality
✅ Docs + runbooks updated
✅ PRs labeled `integrations-ready` with checklists
✅ No secrets in repo (all from Vault)
✅ PR ready with screenshots and metrics

---

## Appendix: Key Metrics (Before/After Hardening)

| Metric | Before Hardening | After Hardening | Target |
|--------|------------------|-----------------|--------|
| Success Rate | ~95% | ≥98% | ≥98% |
| Avg Latency (p95) | ~6 min | ≤5 min | ≤5 min |
| Retry Success | ~85% | ≥90% | ≥90% |
| Test Coverage | ~65% | ≥80% | ≥80% |
| PII Incidents | 1-2/month | 0 | 0 |
| Circuit Breaker | N/A | Implemented | N/A |
| Distributed Tracing | N/A | 100% coverage | 100% |
| Dashboards | 0 | 2 (delivery + errors) | 2+ |
| Alerts | 0 | 7 configured | 7+ |
| Contract Tests | 1 (internal) | 3 (Benevity, Goodera, Workday) | 3+ |
| OpenAPI Spec | No | Yes (Swagger UI at `/docs`) | Yes |
| Security Scan | Never | Passing (0 high/med) | Passing |

---

## Next Steps

1. ✅ **Plan created** - This document serves as the comprehensive roadmap
2. 🔧 **Execute workstreams** - Leads assign tasks to specialists
3. 🔧 **Track progress** - Update todo list daily
4. 🔧 **Review & iterate** - Code reviews, testing, refinement
5. 🔧 **Deploy to staging** - Test in staging environment
6. 🔧 **Pilot with tenants** - Select 2-3 tenants for pilot
7. 🔧 **Production rollout** - Gradual rollout with monitoring
8. 🔧 **Retrospective** - Document lessons learned

---

**End of Plan**
