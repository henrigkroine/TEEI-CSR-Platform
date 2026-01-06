# Worker 2 Phase C: Production Analytics & Governance

**Mission**: Upgrade Worker 2 services to pilot-ready with live ingestion, Q2Q v2 model governance, Journey Orchestration, streaming updates, analytics DW, compliance flows, and cost controls.

**Branch**: `claude/worker2-phaseC-production-analytics`
**Orchestrator**: Tech Lead (30 agents, 5 leads)
**Status**: 🚀 IN PROGRESS
**Started**: 2025-11-13

---

## 🎯 PHASE C OBJECTIVES

### Baseline (Phase B Complete)
✅ Q2Q NLP Pipeline operational with Claude/OpenAI/Gemini
✅ Analytics service with SROI/VIS calculators (60/60 tests)
✅ Corporate Cockpit (Astro) with i18n/a11y
✅ Evidence lineage with PII redaction
✅ Impact-In connectors (Benevity/Goodera/Workday)
✅ Redis caching (p75 = 186ms)
✅ Comprehensive documentation (49K words, 200+ pages reports)

### Phase C Deliverables (10 Major Systems)

**A. Live Ingestion & Webhook Authenticity** 🔐
- HMAC-SHA256 signature validation on all webhooks
- Idempotency layer with deliveryId/eventId dedupe
- Dead Letter Queue (DLQ) via NATS JetStream
- Backfill pipeline for historical CSV imports

**B. Q2Q v2 — Model Governance & Multilingual** 🌍
- Language detection (en/uk/no) with language-aware prompts
- Model registry with YAML configs and versioning
- Eval harness with drift monitoring (PSI/JS divergence)
- Topic tagging (CV, interview, PM, dev)

**C. Journey Orchestration v1** 🗺️
- New service with declarative rules engine
- Computes journey flags: mentor_ready, followup_needed, language_support_needed
- Event-driven orchestration.* events
- Rule editor schema and default rule set

**D. Streaming Updates for Cockpit** 📡
- SSE endpoint for real-time widget updates
- NATS → SSE bridge with company-scoped channels
- Backpressure handling and replay from last event ID

**E. Analytics DW & Materialized Views** 🏢
- ClickHouse (or BigQuery) sink for event stream
- Cohort tables, benchmark views, trend aggregations
- Materialized views in Postgres for low-latency reads

**F. Impact-In Scheduler (Backend)** ⏰
- Cron/job runner for scheduled pushes (monthly/quarterly)
- Delivery log with retry/backoff
- Replay endpoint for Worker 3 monitor UI

**G. Safety/Moderation v1 (Backend)** 🛡️
- Text screening pipeline (rules + lightweight classifier)
- Escalation events → review queue
- Pre-Q2Q screening for Discord/DM feedback

**H. Compliance & DSAR** 📋
- `/privacy/export` and `/privacy/delete` orchestration
- Async jobs with progress states and audit trail
- Evidence redaction policy with TTLs

**I. API Versioning, Contracts & SDKs** 🔧
- /v1 route prefixes for all public APIs
- OpenAPI catalog per service + merged docs
- Pact/contract tests in CI
- Typed client SDKs (packages/clients/*)

**J. Performance & Cost Controls** 💰
- k6 load tests for ingestion and reporting
- AI spend guardrails: per-company caps, rate limits
- Cost metrics exported to Prometheus/OTel
- Soak test (1h) with realistic event rates

---

## 🏗️ TEAM STRUCTURE (5 Leads × 6 Specialists = 30 Agents)

### 1. Ingestion Lead (6 agents) - **Live Data & Webhooks**
**Mission**: Secure, reliable, idempotent ingestion from Kintell and other sources.

#### Specialists
1. **Webhook Security Engineer** - HMAC-SHA256 signature validation, timestamp tolerance
2. **Idempotency Specialist** - Dedupe tables, safe retries, conflict resolution
3. **DLQ Engineer** - NATS JetStream DLQ setup, retry policies, monitoring
4. **Backfill Pipeline Developer** - CSV bulk import with checkpoints, error files
5. **Integration Test Engineer** - Webhook replay tests, backfill validation
6. **Documentation Writer** - /reports/ingestion_webhooks.md, /reports/backfill_runbook.md

### 2. NLP Lead (6 agents) - **Q2Q v2 Governance**
**Mission**: Multilingual Q2Q with model registry, eval harness, and drift monitoring.

#### Specialists
1. **Language Detection Engineer** - Language detection (en/uk/no), language-aware prompts
2. **Model Registry Architect** - YAML configs, versioning, DB persistence, effective-from timestamps
3. **Eval Harness Engineer** - Precision/recall/F1 per label per language, confusion matrices
4. **Drift Monitor Specialist** - PSI/JS divergence tracking, alert thresholds
5. **Topic Tagging Engineer** - CV, interview, PM, dev tags for analytics
6. **Q2Q v2 Test Engineer** - Unit tests, multilingual test sets, eval validation

**Deliverables**:
- `/services/q2q-ai/src/registry/models.yaml` - Model configs
- `/services/q2q-ai/src/eval/drift.ts` - Drift monitoring
- `/reports/q2q_eval_phaseC.md` - Evaluation report
- `/docs/Q2Q_Model_Governance.md` - Governance documentation

### 3. Orchestration Lead (6 agents) - **Journey Engine**
**Mission**: Build Journey Orchestration service with declarative rules.

#### Specialists
1. **Journey Engine Architect** - Service structure, routes, subscribers
2. **Rules Engine Developer** - JSON/YAML rule schema, rule evaluation logic
3. **Profile Flag Manager** - Compute mentor_ready, followup_needed, language_support_needed
4. **Event Publisher** - Emit orchestration.* events (milestone.reached, flag.updated)
5. **Rule Editor Schema Designer** - JSON schema for rule editor (consumed by Worker 3)
6. **Journey Test Engineer** - Unit tests for rules, integration tests for event flow

**Deliverables**:
- `/services/journey-engine/*` - New service (port 3009)
- `/services/journey-engine/src/rules/` - Rule definitions and engine
- `/docs/Journey_Engine.md` - Documentation
- `/reports/journey_engine_rules.md` - Default rule set

### 4. Data Lead (6 agents) - **Streaming & DW**
**Mission**: Real-time streaming and analytics data warehouse.

#### Specialists
1. **SSE Streaming Engineer** - SSE endpoint, NATS → SSE bridge, company-scoped channels
2. **Replay Specialist** - Event replay from last ID, backpressure handling
3. **ClickHouse Integration Engineer** - Event sink, incremental loaders, partitioning
4. **Materialized Views Architect** - Postgres MVs for low-latency reads
5. **Cohort Analytics Developer** - Cohort tables, benchmark views, trend aggregations
6. **Streaming Test Engineer** - SSE tests, load tests, replay validation

**Deliverables**:
- `/services/reporting/src/stream/sse.ts` - SSE endpoint
- `/services/reporting/src/sinks/clickhouse.ts` - ClickHouse sink
- `/docs/Streaming_Updates.md` - Streaming documentation
- `/docs/Analytics_DW.md` - DW architecture with ERD

### 5. QA & Operations Lead (6 agents) - **Production Readiness**
**Mission**: Compliance, cost controls, performance, API contracts.

#### Specialists
1. **Impact-In Scheduler Developer** - Cron jobs, delivery logs, replay endpoint
2. **Safety Pipeline Engineer** - Text screening, review queue, pre-Q2Q filtering
3. **Compliance Orchestrator** - Export/delete flows, async jobs, audit trail
4. **API Versioning Specialist** - /v1 routes, OpenAPI catalog, Pact tests
5. **Performance Engineer** - k6 load tests, budgets, soak tests
6. **Cost Controls Engineer** - AI spend caps, rate limits, cost metrics to Prometheus

**Deliverables**:
- `/services/impact-in/src/scheduler/` - Cron scheduler
- `/services/safety-moderation/*` - Enhanced safety service
- `/services/api-gateway/src/privacy/` - Export/delete orchestration
- `/packages/clients/*` - Typed SDKs (reporting, journey, q2q)
- `/tests/k6/ingestion-load.js`, `/tests/k6/reporting-load.js` - Load tests
- `/reports/perf_ingest_reporting.md`, `/reports/ai_costs.md` - Performance reports

---

## 📋 PHASE C EXECUTION PLAN (4 Waves)

### Wave 1: Foundation (A + B) - Days 1-4
**Priority**: Secure ingestion and Q2Q model governance

#### A) Live Ingestion & Webhook Authenticity
- [ ] Implement HMAC-SHA256 signature validation in Kintell connector
- [ ] Create idempotency layer: `webhook_deliveries` table with dedupe logic
- [ ] Setup NATS JetStream DLQ for failed webhooks
- [ ] Build backfill pipeline: CSV import with checkpoints and error files
- [ ] Integration tests: webhook replay, signature validation, idempotency
- [ ] Documentation: /reports/ingestion_webhooks.md, /reports/backfill_runbook.md

**Owner**: Ingestion Lead
**Status**: Pending

#### B) Q2Q v2 — Model Governance & Multilingual
- [ ] Add language detection to Q2Q pipeline (langdetect or OpenAI)
- [ ] Create language-aware prompts for en/uk/no
- [ ] Build model registry: models.yaml with versioning, persist to DB
- [ ] Implement eval harness: precision/recall/F1 per label per language
- [ ] Add drift monitoring: PSI/JS divergence with alert thresholds
- [ ] Implement topic tagging: CV, interview, PM, dev
- [ ] Documentation: /reports/q2q_eval_phaseC.md, /docs/Q2Q_Model_Governance.md

**Owner**: NLP Lead
**Status**: Pending

---

### Wave 2: Orchestration (C) - Days 5-7
**Priority**: Journey engine for automated participant progression

#### C) Journey Orchestration v1
- [ ] Create new service: `services/journey-engine/` (port 3009)
- [ ] Define rule schema: JSON/YAML for declarative rules
- [ ] Implement rule engine: evaluate conditions, compute flags
- [ ] Subscribe to buddy.*, kintell.*, upskilling.* events
- [ ] Compute journey flags: mentor_ready, followup_needed, language_support_needed
- [ ] Emit orchestration.* events: milestone.reached, flag.updated
- [ ] Create default rule set (e.g., mentor_ready if completed 3+ language sessions)
- [ ] Integration tests: event flow, rule evaluation
- [ ] Documentation: /docs/Journey_Engine.md, /reports/journey_engine_rules.md

**Owner**: Orchestration Lead
**Status**: Pending

---

### Wave 3: Real-time & DW (D + E) - Days 8-11
**Priority**: Streaming analytics and data warehouse

#### D) Streaming Updates for Cockpit
- [ ] Create SSE endpoint in reporting service: GET /stream/updates
- [ ] Build NATS → SSE bridge: subscribe to metrics.* events, forward to SSE clients
- [ ] Implement company-scoped channels: only send events for user's company
- [ ] Add replay support: query param `?lastEventId=xyz`, replay from offset
- [ ] Implement backpressure handling: drop old events if client is slow
- [ ] Feature flag: STREAMING_ENABLED=true/false
- [ ] Documentation: /docs/Streaming_Updates.md with examples for Worker 3

**Owner**: Data Lead (SSE Streaming Engineer, Replay Specialist)
**Status**: Pending

#### E) Analytics DW & Materialized Views
- [ ] Setup ClickHouse container in docker-compose.yml (or BigQuery connection)
- [ ] Create event sink: NATS → ClickHouse incremental loader
- [ ] Define ClickHouse schema: partition by period/company/program
- [ ] Build cohort tables: cohort_metrics (cohort_id, metric, value, period)
- [ ] Build trend aggregations: trend_metrics (metric, value, timestamp, granularity)
- [ ] Create materialized views in Postgres for hot queries (e.g., company dashboard)
- [ ] Add cache keys with company-scoped TTLs
- [ ] Documentation: /docs/Analytics_DW.md with ERD, cost notes

**Owner**: Data Lead (ClickHouse Engineer, MV Architect, Cohort Developer)
**Status**: Pending

---

### Wave 4: Production Ops (F + G + H + I + J) - Days 12-16
**Priority**: Scheduler, safety, compliance, API contracts, performance

#### F) Impact-In Scheduler (Backend)
- [ ] Create cron/job runner in impact-in service: monthly/quarterly schedules
- [ ] Implement delivery log table: scheduled_deliveries (schedule_id, status, next_run, last_run)
- [ ] Add retry/backoff logic for failed scheduled deliveries
- [ ] Create replay endpoint: POST /impact-in/scheduled/:id/replay
- [ ] Implement feature flags per partner: SCHEDULE_BENEVITY=monthly
- [ ] Build payload preview API: GET /impact-in/scheduled/:id/preview
- [ ] Documentation: /docs/ImpactIn_Scheduler_Backend.md

**Owner**: QA & Ops Lead (Scheduler Developer)
**Status**: Pending

#### G) Safety/Moderation v1 (Backend)
- [ ] Enhance safety-moderation service with rule-based screening
- [ ] Add lightweight classifier for toxic/spam content (simple ML or regex)
- [ ] Implement escalation: emit safety.flag.raised event → review queue
- [ ] Add pre-Q2Q filtering: Discord/DM feedback routes call Safety first
- [ ] Create review queue API: GET /safety/queue, POST /safety/review/:id
- [ ] Documentation: /docs/Safety_Pipeline.md

**Owner**: QA & Ops Lead (Safety Engineer)
**Status**: Pending

#### H) Compliance & DSAR
- [ ] Create privacy orchestration routes in API gateway: POST /privacy/export, POST /privacy/delete
- [ ] Implement async job framework: job status (pending, running, completed, failed)
- [ ] Build export flow: gather all user data, redact PII, generate ZIP
- [ ] Build delete flow: cascade delete across all tables, emit deletion events
- [ ] Add audit trail: privacy_requests table (user_id, type, status, completed_at)
- [ ] Implement evidence redaction policy: TTLs for raw snippets (90 days), keep hashes/embeddings
- [ ] Documentation: /docs/Privacy_Export_Delete.md, /reports/privacy_test_matrix.md

**Owner**: QA & Ops Lead (Compliance Orchestrator)
**Status**: Pending

#### I) API Versioning, Contracts & SDKs
- [ ] Add /v1 prefix to all public routes across services
- [ ] Deprecate old routes with warnings (keep for 6 months)
- [ ] Generate OpenAPI specs per service (using fastify-swagger)
- [ ] Create merged OpenAPI catalog: /api-docs/catalog
- [ ] Setup Pact/contract tests: Gateway ↔ Services
- [ ] Add CI job: fail on contract drift
- [ ] Create typed client SDKs in packages/clients/:
   - reporting.ts (getMetrics, getSROI, getVIS)
   - journey.ts (getJourneyFlags, triggerMilestone)
   - q2q.ts (classify, getEval)
- [ ] Documentation: /docs/API_Versioning.md, /docs/Client_SDKs.md

**Owner**: QA & Ops Lead (API Versioning Specialist)
**Status**: Pending

#### J) Performance & Cost Controls
- [ ] Create k6 load tests for ingestion: /tests/k6/ingestion-load.js (1000 req/sec)
- [ ] Create k6 load tests for reporting: /tests/k6/reporting-load.js (100 VUs)
- [ ] Define performance budgets: p50 < 100ms, p95 < 500ms for ingestion
- [ ] Run soak test: 1 hour with realistic event rates (50 events/sec)
- [ ] Implement AI spend guardrails:
   - Per-company monthly caps (stored in companies table)
   - Rate limiting: max 100 Q2Q requests/min per company
   - Cost tracking: log tokens/cost per request
- [ ] Export cost metrics to Prometheus/OTel
- [ ] Create dashboards: Grafana panels for AI spend, request rates, error rates
- [ ] Documentation: /reports/perf_ingest_reporting.md, /reports/ai_costs.md

**Owner**: QA & Ops Lead (Performance Engineer, Cost Controls Engineer)
**Status**: Pending

---

## ✅ ACCEPTANCE CRITERIA

### Must-Have (Blockers for Pilot)

**A) Ingestion**
- [ ] Webhook signatures verified (HMAC-SHA256); invalid requests rejected (401)
- [ ] Idempotency: duplicate deliveryIds don't create duplicate records
- [ ] DLQ: failed webhooks retry 3x with exponential backoff, then go to DLQ
- [ ] Backfill: CSV import completes 10K rows in < 5 minutes, generates error CSV

**B) Q2Q v2**
- [ ] Language detection works for en/uk/no (95%+ accuracy on test set)
- [ ] Model registry persists configs to DB; effective-from timestamps enforced
- [ ] Eval harness produces F1 scores per label per language
- [ ] Drift monitor emits alerts when PSI > 0.2

**C) Journey Engine**
- [ ] Rules engine evaluates conditions and sets journey flags correctly
- [ ] Orchestration events emitted on milestone completion
- [ ] Integration test: participant completes 3 sessions → mentor_ready flag set

**D) Streaming**
- [ ] SSE endpoint streams events to clients
- [ ] Replay works: ?lastEventId parameter replays missed events
- [ ] Company scoping: user only receives events for their company

**E) Analytics DW**
- [ ] ClickHouse (or BigQuery) receives events from NATS sink
- [ ] Cohort tables populated with aggregates
- [ ] Materialized views return results in < 50ms

**F) Impact-In Scheduler**
- [ ] Cron jobs trigger monthly/quarterly deliveries
- [ ] Delivery log records all attempts
- [ ] Replay endpoint re-sends failed deliveries

**G) Safety**
- [ ] Text screening catches profanity, spam (test cases pass)
- [ ] safety.flag.raised events emitted for flagged content
- [ ] Review queue API accessible

**H) Compliance**
- [ ] Export flow generates ZIP with all user data
- [ ] Delete flow cascades across all tables, confirms deletion
- [ ] Audit trail logs all privacy requests

**I) API Versioning**
- [ ] All public routes have /v1 prefix
- [ ] OpenAPI catalog published at /api-docs/catalog
- [ ] Pact tests pass in CI
- [ ] Client SDKs (reporting, journey, q2q) are type-safe and tested

**J) Performance & Cost**
- [ ] k6 ingestion test: p95 < 500ms at 1000 req/sec
- [ ] k6 reporting test: p95 < 1000ms at 100 VUs
- [ ] Soak test: 1 hour with no memory leaks, error rate < 1%
- [ ] AI spend guardrails: per-company cap enforced, requests blocked when exceeded
- [ ] Cost metrics visible in Prometheus/Grafana

---

## 📊 SERVICES & PACKAGES STATUS

### New Services (Phase C)
| Service | Port | Status | Lead |
|---------|------|--------|------|
| **journey-engine** | 3009 | 🚀 TO BUILD | Orchestration Lead |

### Enhanced Services (Phase C)
| Service | Port | Enhancements | Lead |
|---------|------|--------------|------|
| kintell-connector | 3002 | Webhook signatures, idempotency, backfill | Ingestion Lead |
| q2q-ai | 3005 | Language detection, model registry, drift monitoring | NLP Lead |
| reporting (analytics) | 3007 | SSE streaming, ClickHouse sink | Data Lead |
| impact-in | 3008 | Cron scheduler, delivery logs | QA & Ops Lead |
| safety-moderation | 3006 | Rule-based screening, review queue | QA & Ops Lead |
| api-gateway | 3000 | /v1 routes, privacy endpoints, Pact tests | QA & Ops Lead |

### New Packages (Phase C)
| Package | Purpose | Lead |
|---------|---------|------|
| **clients/reporting** | Typed SDK for reporting service | QA & Ops Lead |
| **clients/journey** | Typed SDK for journey engine | QA & Ops Lead |
| **clients/q2q** | Typed SDK for Q2Q service | QA & Ops Lead |

### Infrastructure (Phase C)
- **ClickHouse** (or BigQuery) for analytics DW
- **NATS JetStream DLQ** for webhook retries
- **Prometheus/OTel** for cost/performance metrics

---

## 🔗 KEY FILES TO CREATE

### Ingestion (Wave 1 - A)
```
/services/kintell-connector/src/routes/webhooks.ts          # HMAC validation
/services/kintell-connector/src/middleware/signature.ts     # Signature verification
/services/kintell-connector/src/utils/idempotency.ts        # Dedupe logic
/services/kintell-connector/src/importers/csv_backfill.ts   # Bulk CSV import
/packages/shared-schema/src/schema/webhook_deliveries.ts    # Dedupe table
/reports/ingestion_webhooks.md                              # Webhook spec
/reports/backfill_runbook.md                                # Backfill guide
```

### Q2Q v2 (Wave 1 - B)
```
/services/q2q-ai/src/inference/language_detection.ts        # Language detection
/services/q2q-ai/src/inference/prompts/multilingual.ts      # Language-aware prompts
/services/q2q-ai/src/registry/models.yaml                   # Model configs
/services/q2q-ai/src/registry/persist.ts                    # DB persistence
/services/q2q-ai/src/eval/drift.ts                          # Drift monitoring (PSI/JS)
/services/q2q-ai/src/eval/multilingual.ts                   # Per-language eval
/services/q2q-ai/src/tags/topics.ts                         # Topic tagging
/reports/q2q_eval_phaseC.md                                 # Evaluation report
/docs/Q2Q_Model_Governance.md                               # Governance docs
```

### Journey Engine (Wave 2 - C)
```
/services/journey-engine/src/index.ts                       # Main server
/services/journey-engine/src/routes/flags.ts                # Journey flags API
/services/journey-engine/src/routes/milestones.ts           # Milestone API
/services/journey-engine/src/rules/schema.ts                # Rule JSON schema
/services/journey-engine/src/rules/engine.ts                # Rule evaluation
/services/journey-engine/src/rules/defaults/mentor_ready.yaml    # Default rules
/services/journey-engine/src/subscribers/index.ts           # Event subscribers
/services/journey-engine/src/__tests__/rules.test.ts        # Rule tests
/docs/Journey_Engine.md                                     # Documentation
/reports/journey_engine_rules.md                            # Rule set docs
```

### Streaming & DW (Wave 3 - D, E)
```
/services/reporting/src/stream/sse.ts                       # SSE endpoint
/services/reporting/src/stream/nats_bridge.ts               # NATS → SSE
/services/reporting/src/stream/replay.ts                    # Event replay
/services/reporting/src/sinks/clickhouse.ts                 # ClickHouse sink
/services/reporting/src/sinks/loader.ts                     # Incremental loader
/services/reporting/src/queries/cohort.ts                   # Cohort queries
/services/reporting/src/materialized_views/                 # MV definitions
/docs/Streaming_Updates.md                                  # Streaming docs
/docs/Analytics_DW.md                                       # DW architecture
```

### Production Ops (Wave 4 - F, G, H, I, J)
```
/services/impact-in/src/scheduler/cron.ts                   # Cron jobs
/services/impact-in/src/scheduler/delivery_log.ts           # Log table
/services/safety-moderation/src/screening/rules.ts          # Screening rules
/services/safety-moderation/src/queue/review.ts             # Review queue
/services/api-gateway/src/privacy/export.ts                 # Export orchestration
/services/api-gateway/src/privacy/delete.ts                 # Delete orchestration
/services/api-gateway/src/v1/routes.ts                      # /v1 routes
/packages/clients/reporting.ts                              # Reporting SDK
/packages/clients/journey.ts                                # Journey SDK
/packages/clients/q2q.ts                                    # Q2Q SDK
/tests/k6/ingestion-load.js                                 # Ingestion load test
/tests/k6/reporting-load.js                                 # Reporting load test
/tests/pact/gateway-reporting.pact.ts                       # Pact tests
/docs/ImpactIn_Scheduler_Backend.md                         # Scheduler docs
/docs/Safety_Pipeline.md                                    # Safety docs
/docs/Privacy_Export_Delete.md                              # Privacy docs
/docs/API_Versioning.md                                     # Versioning docs
/docs/Client_SDKs.md                                        # SDK docs
/reports/perf_ingest_reporting.md                           # Performance report
/reports/ai_costs.md                                        # Cost report
/reports/privacy_test_matrix.md                             # Privacy test matrix
```

---

## 📝 REPORTS & DOCUMENTATION

### Phase C Comprehensive Report
```
/reports/worker2_phaseC_prod_analytics.md                   # Master report
```

**Contents**:
- Executive summary of Phase C deliverables
- Architecture diagrams (Mermaid)
- Endpoints catalog (all services)
- Performance benchmarks (k6 results)
- Cost analysis (AI spend, infrastructure)
- Open risks and mitigation strategies
- Handoff notes for Worker 1 (OTel/Sentry) and Worker 3 (SSE/UI)

### Individual Component Reports
All reports listed above in "KEY FILES TO CREATE"

---

## 🚀 ORCHESTRATION PROTOCOL

### Lead → Specialist Communication
1. **Orchestrator → Leads**: Assign deliverables (A-J) with acceptance criteria
2. **Leads → Specialists**: Decompose into tasks with file paths and test requirements
3. **Specialists → Repository**: Write code, tests, docs directly to files
4. **Specialists → Reports**: Update /reports/*.md with implementation notes
5. **Leads → MULTI_AGENT_PLAN.md**: Update status, mark completed tasks
6. **Leads → Orchestrator**: Report blockers, request reviews, coordinate dependencies

### Feature Flags Strategy
- **Risky features**: SSE streaming, scheduler, new Q2Q labels
- Environment vars: `STREAMING_ENABLED=false`, `SCHEDULER_ENABLED=false`, `Q2Q_MULTILINGUAL=false`
- Gradual rollout: enable for test companies first, monitor, then enable globally

### Coordination with Other Workers
- **Worker 1** (Security/Observability): Provide OTel/Sentry integration points for cost metrics, performance traces
- **Worker 3** (Cockpit/UI): Provide SSE consumption docs, Impact-In monitor API specs, Journey flags UI data

---

## ✨ SUCCESS DEFINITION

Phase C is **COMPLETE** when:
1. ✅ All 10 deliverables (A-J) implemented and tested
2. ✅ Acceptance criteria validated (checklist above)
3. ✅ Reports generated (/reports/worker2_phaseC_prod_analytics.md + 13 individual reports)
4. ✅ Documentation complete (10+ new/updated docs)
5. ✅ All changes committed to branch `claude/worker2-phaseC-production-analytics`
6. ✅ k6 performance tests pass budgets
7. ✅ Pact contract tests pass in CI
8. ✅ Phase C ready for pilot deployment

**LET'S BUILD PRODUCTION-GRADE ANALYTICS! 🚀**

---

**Last Updated**: 2025-11-13
**Version**: 3.0 (Phase C)
**Orchestrator**: Worker 2 Tech Lead
