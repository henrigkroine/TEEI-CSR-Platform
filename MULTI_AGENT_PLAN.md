# Worker 2 Phase B: Analytics Cockpit & Q2Q Production
**Mission**: Replace stubs with production analytics and UI: operational Q2Q NLP pipeline, auditable evidence lineage, calibrated SROI and VIS, polished Corporate Cockpit with i18n/a11y, and first working Impact-In connectors.

**Branch**: `claude/worker2-analytics-cockpit-phase-b-011CV5sjVL1wWrVkHZxkULHk`
**Orchestrator**: Tech Lead (30 agents, 5 leads)
**Status**: 🚀 IN PROGRESS

---

## 🎯 PHASE B OBJECTIVES

### Baseline (From Phase A)
✅ All 7 backend services operational
✅ Event-driven architecture with NATS
✅ Complete database schema with analytics tables
✅ Sample data with feedback text
✅ Comprehensive documentation

### Phase B Deliverables
1. **Q2Q NLP Pipeline (Production)** - Real AI model, not stubs
2. **Evidence Lineage & Auditability** - Traceable metrics → evidence
3. **Metrics & Calculators** - SROI v1.0, VIS v1.0 with tests
4. **Corporate Cockpit** - Astro app with dashboards, i18n, a11y
5. **Impact-In Connectors** - Benevity/Goodera/Workday (feature-flagged)
6. **Performance & Caching** - Sub-second cockpit, Redis cache
7. **Documentation** - Metrics catalog, demos, operator guides

---

## 🏗️ TEAM STRUCTURE (5 Leads × 6 Specialists = 30 Agents)

### 1. NLP Lead (6 agents) - **Q2Q Pipeline**
**Mission**: Replace random score stub with production NLP; evidence lineage; calibration harness.

#### Specialists
1. **Label Set Designer** - Define production labels
2. **Inference Driver Engineer** - Provider-agnostic adapters (Claude/Gemini/OpenAI)
3. **Storage Engineer** - Enhance schema for embeddings
4. **Embedding Specialist** - Generate embeddings for evidence
5. **Calibration Harness Engineer** - Build eval harness
6. **Q2Q Test Engineer** - Unit and integration tests

### 2. Analytics Lead (6 agents) - **Metrics & Calculators**
**Mission**: Implement SROI v1.0, VIS v1.0, aggregation pipelines.

#### Specialists
1. **SROI Calculator Developer** - Conservative SROI formula
2. **VIS Calculator Developer** - Weighted hours × quality score
3. **Aggregation Pipeline Engineer** - Nightly aggregation jobs
4. **Metrics Service API Developer** - Analytics service endpoints
5. **Integration Score Specialist** - Composite integration metric
6. **Metrics Test Engineer** - Property-based testing

### 3. Frontend Lead (6 agents) - **Corporate Cockpit**
**Mission**: Build Astro app with dashboards, i18n (en/uk/no), a11y (WCAG 2.2 AA).

#### Specialists
1. **Astro Setup Engineer** - Initialize app with Tailwind/shadcn
2. **Dashboard Components Developer** - KPI cards, charts
3. **Evidence Drawer Specialist** - Anonymized evidence UI
4. **i18n Engineer** - en/uk/no translations
5. **A11y Specialist** - WCAG 2.2 AA compliance
6. **Export & PDF Engineer** - CSV/PDF exports

### 4. Connectors Lead (6 agents) - **Impact-In Integration**
**Mission**: Build Benevity/Goodera/Workday outbound connectors.

#### Specialists
1. **Benevity Mapper Engineer** - Benevity API integration
2. **Goodera Mapper Engineer** - Goodera API integration
3. **Workday Mapper Engineer** - Workday Volunteer API
4. **Feature Flag & Config Engineer** - Company-level flags
5. **Delivery Log & Replay Specialist** - Audit and retry logic
6. **Impact-In Test Engineer** - Mock external APIs

### 5. QA & Performance Lead (6 agents) - **Caching, Testing**
**Mission**: Query optimization, Redis caching, k6 load testing.

#### Specialists
1. **Database Optimization Specialist** - Indices and query tuning
2. **Redis Caching Engineer** - Cache layer with TTLs
3. **k6 Load Test Engineer** - Performance budgets
4. **Integration Test Lead** - End-to-end tests
5. **Acceptance Criteria Validator** - Validate all deliverables
6. **QA Coordinator** - Smoke tests and final report

---

## 📋 EXECUTION PHASES (7 Phases)

### Phase 1: Core Infrastructure (Days 1-2)
- [ ] Create `/services/analytics/` service (port 3007)
- [ ] Create `/packages/metrics/` library (SROI/VIS/Integration)
- [ ] Initialize `/apps/corp-cockpit-astro/` with Astro 5
- [ ] Add Redis to `docker-compose.yml`
- [ ] Add database indices for hot queries

### Phase 2: Q2Q Production Pipeline (Days 3-4)
- [ ] Define production label set (confidence↑/↓, belonging↑/↓, etc.)
- [ ] Build provider-agnostic inference driver
- [ ] Enhance schema: `evidence_snippets.embedding`, `outcome_scores.method`
- [ ] Generate embeddings for evidence
- [ ] Build calibration harness (`/q2q/eval/`)
- [ ] Write Q2Q tests and calibration report

### Phase 3: Metrics & Aggregations (Days 5-6)
- [ ] Implement SROI v1.0 calculator with tests
- [ ] Implement VIS v1.0 calculator with tests
- [ ] Build aggregation pipeline: events → `metrics_company_period`
- [ ] Create analytics service API endpoints
- [ ] Add Redis caching to metrics endpoints
- [ ] Integration test: seed → aggregate → validate

### Phase 4: Cockpit UI (Days 7-8)
- [ ] Build dashboard pages (At-a-glance, Trends, Q2Q Feed, SROI, VIS)
- [ ] Build Evidence Drawer component with redaction
- [ ] i18n setup: en/uk/no translation files
- [ ] Run axe/Pa11y, fix a11y issues
- [ ] CSV and PDF export functionality
- [ ] Document in `/reports/cockpit_demo_walkthrough.md`

### Phase 5: Impact-In Connectors (Days 9-10)
- [ ] Create `/services/impact-in/` service (port 3008)
- [ ] Implement Benevity/Goodera/Workday mappers
- [ ] Feature flag system (env + database)
- [ ] Delivery log and replay tool
- [ ] Rate limiting (100 req/min)
- [ ] Document in `/reports/impact_in_specs.md`

### Phase 6: Performance & QA (Days 11-12)
- [ ] Query optimization and documentation
- [ ] Create k6 load test scenario
- [ ] Run k6 test, validate p75 < 500ms
- [ ] End-to-end integration test
- [ ] Validate acceptance criteria
- [ ] Write comprehensive report

### Phase 7: Documentation (Days 13-14)
- [ ] `/docs/Q2Q_Label_Taxonomy.md`
- [ ] `/docs/Metrics_Catalog.md`
- [ ] `/docs/VIS_Model.md`
- [ ] `/docs/Evidence_Lineage.md`
- [ ] `/docs/Database_Optimization.md`
- [ ] `/docs/impact_in/` - Specs for all platforms
- [ ] `/reports/phaseB_worker2_q2q_and_cockpit.md`
- [ ] `/reports/q2q_eval.md`
- [ ] `/reports/cockpit_perf.md`
- [ ] `/reports/a11y_audit.md`
- [ ] `/reports/acceptance_validation.md`

---

## ✅ ACCEPTANCE CRITERIA

### Must-Have (Blockers)
- [ ] Q2Q pipeline live with real AI model (not random scores)
- [ ] Calibration harness computes F1 scores; results in `/reports/q2q_eval.md`
- [ ] Cockpit displays live metrics with charts
- [ ] Evidence drawers show anonymized snippets (no PII)
- [ ] i18n complete for en/uk/no; language switcher works
- [ ] A11y: axe/Pa11y pass; WCAG 2.2 AA documented
- [ ] SROI v1.0 and VIS v1.0 calculators with 100% test coverage
- [ ] Impact-In service delivers to mock endpoints (feature-flagged)
- [ ] k6 test passes: p75 < 500ms for cockpit queries
- [ ] All 13 documentation files complete

---

## 📊 SERVICES & PACKAGES STATUS

### New Services (Phase B)
| Service | Port | Status | Lead |
|---------|------|--------|------|
| **analytics** | 3007 | 🚀 TO BUILD | Analytics Lead |
| **impact-in** | 3008 | 🚀 TO BUILD | Connectors Lead |

### New Apps (Phase B)
| App | URL | Status | Lead |
|-----|-----|--------|------|
| **corp-cockpit-astro** | http://localhost:4321 | 🚀 TO BUILD | Frontend Lead |

### New Packages (Phase B)
| Package | Status | Lead |
|---------|--------|------|
| **metrics** | 🚀 TO BUILD | Analytics Lead |

### Existing Services (Phase A - Enhance)
| Service | Port | Enhancement | Lead |
|---------|------|-------------|------|
| q2q-ai | 3005 | Replace stub with real AI | NLP Lead |

---

## 🔗 KEY FILES TO CREATE

### Services
```
/services/analytics/               # NEW: Metrics aggregation
/services/impact-in/               # NEW: Outbound connectors
```

### Apps
```
/apps/corp-cockpit-astro/          # NEW: Astro dashboard
```

### Packages
```
/packages/metrics/                 # NEW: SROI/VIS calculators
  /src/sroi/calculator.ts
  /src/sroi/config.ts
  /src/vis/calculator.ts
  /src/integration/score.ts
  /tests/
```

### Documentation
```
/docs/Q2Q_Label_Taxonomy.md
/docs/Metrics_Catalog.md
/docs/VIS_Model.md
/docs/Evidence_Lineage.md
/docs/Database_Optimization.md
/docs/impact_in/benevity_spec.md
/docs/impact_in/goodera_spec.md
/docs/impact_in/workday_spec.md
```

### Reports
```
/reports/phaseB_worker2_q2q_and_cockpit.md
/reports/q2q_eval.md
/reports/cockpit_perf.md
/reports/impact_in_specs.md
/reports/cockpit_demo_walkthrough.md
/reports/a11y_audit.md
/reports/acceptance_validation.md
```

### Tests
```
/tests/k6/cockpit-load.js
/tests/integration/e2e-cockpit.test.ts
```

---

## ✨ SUCCESS DEFINITION

Phase B is **COMPLETE** when:
1. ✅ Q2Q pipeline classifies real feedback; F1 scores documented
2. ✅ Cockpit displays live metrics; evidence drawers work
3. ✅ i18n (en/uk/no) + a11y (WCAG 2.2 AA) complete
4. ✅ SROI/VIS v1.0 tested and documented
5. ✅ Impact-In delivers to mock endpoints
6. ✅ k6 shows p75 < 500ms
7. ✅ All documentation and reports complete
8. ✅ Demo walkthrough with screenshots

**LET'S BUILD! 🚀**
