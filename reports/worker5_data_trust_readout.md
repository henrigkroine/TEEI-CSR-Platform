# Worker 5: Data Trust & Catalog — Progress Readout

**Mission**: Establish end-to-end data governance, quality, and lineage for TEEI CSR Platform

**Branch**: `claude/worker5-data-trust-catalog-01MP5u1wgV11fa33LqqEQWbp`
**Started**: 2025-11-16
**Status**: 🚧 **In Progress** - Phase 1: Foundation

---

## Executive Summary

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **OpenLineage Coverage** | ≥90% critical pipelines | 0% (baseline existing) | 🔴 Not Started |
| **GE Test Coverage** | 100% critical tables, ≥90% pass | 0/8 tables | 🔴 Not Started |
| **dbt Metrics Accuracy** | 100% match vs service calculators | N/A | 🔴 Not Started |
| **Catalog Datasets** | ≥12 governed datasets | 0 | 🔴 Not Started |
| **Residency Compliance** | 100% critical tables tagged | 0% | 🔴 Not Started |
| **Data SLO Dashboards** | Live with alerts | Not deployed | 🔴 Not Started |
| **Documentation** | 4 runbooks + readout | 0/5 | 🔴 Not Started |

**Overall Progress**: 0% (0/7 slices complete)

---

## Delivery Slices Status

### J1: OpenLineage Instrumentation 🔴 Not Started
**Owner**: lineage-lead (Agents 3.1–3.6, 1.1, 1.5)
**Target**: ≥90% critical pipelines emit OL events; dataset→metric lineage resolvable

#### Acceptance Criteria
- [ ] OL emitters in `services/impact-in` (Agent 3.1)
- [ ] OL emitters in `services/reporting` (Agent 3.2)
- [ ] OL emitters in `services/q2q-ai` (Agent 3.3)
- [ ] OL emitters in `services/analytics` (Agent 3.4)
- [ ] ClickHouse `lineage_events` table with compaction job (Agent 3.5)
- [ ] PostgreSQL `dataset_profiles` table with freshness tracking (Agent 3.6)
- [ ] OL event types: START_RUN, COMPLETE_RUN, FAIL_RUN, dataset IN/OUT
- [ ] Column-level lineage where feasible
- [ ] ≥90% critical pipelines instrumented

#### Progress Log
- **2025-11-16 (Kickoff)**: Slice planning in progress

---

### J2: Great Expectations Coverage 🔴 Not Started
**Owner**: dq-lead (Agents 2.1–2.5)
**Target**: 100% critical tables have GE suites; ≥90% test pass rate

#### Critical Tables (8)
| Table | Suite Status | Test Types | Pass Rate | Agent |
|-------|--------------|------------|-----------|-------|
| `users` | 🔴 Missing | schema, nulls, uniqueness | N/A | 2.1 |
| `companies` | 🔴 Missing | schema, nulls, uniqueness | N/A | 2.1 |
| `program_enrollments` | 🔴 Missing | schema, nulls, referential | N/A | 2.1 |
| `kintell_sessions` | 🔴 Missing | schema, nulls, ranges | N/A | 2.2 |
| `buddy_matches` | 🔴 Missing | schema, referential, uniqueness | N/A | 2.3 |
| `evidence_snippets` | 🔴 Missing | schema, nulls, ranges | N/A | 2.4 |
| `outcome_scores` | 🔴 Missing | schema, nulls, ranges (0-100) | N/A | 2.4 |
| `metrics_company_period` | 🔴 Missing | schema, nulls, ranges (SROI 0-10, VIS 0-100) | N/A | 2.4 |

#### Acceptance Criteria
- [ ] 8/8 critical tables have GE suites
- [ ] Schema validation tests for all tables
- [ ] NOT NULL tests on required columns
- [ ] Numeric range tests (SROI 0-10, VIS 0-100, outcome scores 0-100)
- [ ] Uniqueness constraints (PKs, unique indexes)
- [ ] Referential integrity tests (FKs)
- [ ] CI script `pnpm dq:ci` fails if <90% pass
- [ ] Data Quality Runbook published (`/docs/data/ge_playbook.md`)

#### Progress Log
- **2025-11-16 (Kickoff)**: Slice planning in progress

---

### J3: dbt Semantic Layer 🔴 Not Started
**Owner**: semantics-lead (Agents 4.1–4.6)
**Target**: dbt metrics match service calculators (golden tests pass)

#### dbt Project Structure
```
analytics/dbt/
├── models/
│   ├── staging/          # stg_* models (Agent 4.1)
│   │   ├── stg_users.sql
│   │   ├── stg_companies.sql
│   │   ├── stg_kintell_sessions.sql
│   │   ├── stg_buddy_matches.sql
│   │   └── stg_outcome_scores.sql
│   ├── marts/            # dims/facts (Agent 4.2)
│   │   ├── dim_company.sql
│   │   ├── dim_date.sql
│   │   ├── fact_metrics.sql
│   │   └── fact_outcomes.sql
│   └── metrics/          # metric definitions (Agent 4.3)
│       ├── sroi.yml
│       ├── vis.yml
│       ├── engagement_rate.yml
│       ├── hours_volunteered.yml
│       └── evidence_density.yml
├── tests/                # Golden tests (Agents 4.4, 4.5)
│   ├── test_sroi_vs_service.sql
│   └── test_vis_vs_service.sql
├── docs/                 # Generated docs (Agent 4.6)
│   └── catalog.json
└── dbt_project.yml
```

#### Metrics Registry
| Metric | dbt Model | Service Calculator | Golden Test | Agent |
|--------|-----------|-------------------|-------------|-------|
| **SROI** | `metrics/sroi.yml` | `/services/analytics/src/calculators/sroi.ts` | 🔴 Missing | 4.4 |
| **VIS** | `metrics/vis.yml` | `/services/analytics/src/calculators/vis.ts` | 🔴 Missing | 4.5 |
| **Engagement Rate** | `metrics/engagement_rate.yml` | TBD | 🔴 Missing | 4.3 |
| **Hours Volunteered** | `metrics/hours_volunteered.yml` | TBD | 🔴 Missing | 4.3 |
| **Evidence Density** | `metrics/evidence_density.yml` | TBD | 🔴 Missing | 4.3 |

#### Acceptance Criteria
- [ ] dbt project bootstrapped at `analytics/dbt/`
- [ ] Staging models (`stg_*`) for all critical tables with freshness checks
- [ ] Marts (dims/facts) with exposures defined for Cockpit queries
- [ ] Metrics registry (SROI, VIS, engagement, hours, evidence density)
- [ ] Golden tests: dbt metrics match service calculators (100% match)
- [ ] dbt docs artifact published (`/analytics/dbt/docs/catalog.json`)
- [ ] CI jobs: `pnpm dbt:test`, `pnpm dbt:run`

#### Progress Log
- **2025-11-16 (Kickoff)**: Slice planning in progress

---

### J4: Catalog UI in Cockpit 🔴 Not Started
**Owner**: lineage-lead (Agents 3.7–3.8, 1.4)
**Target**: ≥12 governed datasets listed; freshness + quality badges live

#### UI Mockup
```
/cockpit/[companyId]/catalog
┌─────────────────────────────────────────────────────────────┐
│ Data Catalog                                    [Search] 🔍 │
├─────────────────────────────────────────────────────────────┤
│ Dataset Cards (Grid View)                                   │
│                                                              │
│ ┌─────────────────────┐  ┌─────────────────────┐           │
│ │ users               │  │ companies           │           │
│ │ 🟢 Fresh (2h ago)   │  │ 🟢 Fresh (1h ago)   │           │
│ │ ✅ Tests: 98%       │  │ ✅ Tests: 100%      │           │
│ │ 📊 Lineage ▸▸▸      │  │ 📊 Lineage ▸▸▸      │           │
│ │ [View Details]      │  │ [View Details]      │           │
│ └─────────────────────┘  └─────────────────────┘           │
│                                                              │
│ ┌─────────────────────┐  ┌─────────────────────┐           │
│ │ metrics_company_... │  │ evidence_snippets   │           │
│ │ 🟡 Stale (26h ago)  │  │ 🟢 Fresh (30m ago)  │           │
│ │ ⚠️  Tests: 87%      │  │ ✅ Tests: 95%       │           │
│ │ 📊 Lineage ▸▸▸      │  │ 📊 Lineage ▸▸▸      │           │
│ │ [View Details]      │  │ [View Details]      │           │
│ └─────────────────────┘  └─────────────────────┘           │
│ [Load More...]                                               │
└─────────────────────────────────────────────────────────────┘
```

#### Dataset Detail View
```
/cockpit/[companyId]/catalog/users
┌─────────────────────────────────────────────────────────────┐
│ Dataset: users                          🟢 Fresh (2h ago)   │
│ Last Load: 2025-11-16 14:32 UTC        ✅ Tests: 98% pass   │
├─────────────────────────────────────────────────────────────┤
│ Schema (12 columns)                                          │
│ ├── id (uuid, PK, NOT NULL)                                 │
│ ├── email (varchar(255), UNIQUE, NOT NULL)                  │
│ ├── name (varchar(255))                                     │
│ └── ...                                                      │
│                                                              │
│ Data Quality Tests (15 tests)                               │
│ ✅ Schema validation (5/5 pass)                             │
│ ✅ NOT NULL constraints (8/8 pass)                          │
│ ⚠️  Uniqueness checks (1/2 pass) ← email duplicates         │
│                                                              │
│ Lineage Graph (Interactive)                                 │
│   [raw_users] → [stg_users] → [dim_company] → [SROI]       │
│                                                              │
│ [Drill-through to Evidence Explorer ▸]                      │
└─────────────────────────────────────────────────────────────┘
```

#### Governed Datasets (≥12)
| Dataset | Freshness | Test Coverage | Lineage | Agent |
|---------|-----------|--------------|---------|-------|
| `users` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 3.7 |
| `companies` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 3.7 |
| `program_enrollments` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 3.7 |
| `kintell_sessions` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 3.7 |
| `buddy_matches` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 3.7 |
| `buddy_events` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 3.7 |
| `buddy_feedback` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 3.7 |
| `evidence_snippets` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 3.7 |
| `outcome_scores` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 3.7 |
| `metrics_company_period` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 3.7 |
| `report_lineage` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 3.7 |
| `report_citations` | 🔴 N/A | 🔴 N/A | 🔴 N/A | 3.7 |

#### Acceptance Criteria
- [ ] New Astro page: `/apps/corp-cockpit-astro/src/pages/cockpit/[companyId]/catalog.astro`
- [ ] Dataset cards with freshness badges (🟢 <24h, 🟡 24-48h, 🔴 >48h)
- [ ] Dataset cards with test pass % badges (✅ ≥90%, ⚠️ 80-89%, ❌ <80%)
- [ ] Lineage sparkline (mini graph showing dataset → metric)
- [ ] Drill-through: metric → evidence lineage → Evidence Explorer
- [ ] ≥12 governed datasets displayed
- [ ] Dataset detail view with schema, tests, lineage graph
- [ ] A11y compliance (WCAG 2.2 AAA)
- [ ] Responsive design (mobile/tablet/desktop)

#### Progress Log
- **2025-11-16 (Kickoff)**: Slice planning in progress

---

### J5: Retention & Residency Policies 🔴 Not Started
**Owner**: platform-lead (Agent 5.3, Team 1 Lead)
**Target**: All critical tables tagged with GDPR category + residency; TTL policies enforced

#### GDPR Category Matrix
| Dataset | GDPR Category | Residency | TTL (days) | DSAR Hook | Agent |
|---------|--------------|-----------|------------|-----------|-------|
| `users` | PII | EU/US/UK | 2555 (7y) | ✅ Required | 5.3 |
| `companies` | Public | Global | ∞ | ❌ N/A | 5.3 |
| `program_enrollments` | PII | EU/US/UK | 2555 (7y) | ✅ Required | 5.3 |
| `kintell_sessions` | Sensitive | EU | 1095 (3y) | ✅ Required | 5.3 |
| `buddy_matches` | PII | EU | 2555 (7y) | ✅ Required | 5.3 |
| `buddy_events` | Sensitive | EU | 1095 (3y) | ✅ Required | 5.3 |
| `buddy_feedback` | Sensitive | EU | 1095 (3y) | ✅ Required | 5.3 |
| `evidence_snippets` | Sensitive | EU/US/UK | 1825 (5y) | ✅ Required | 5.3 |
| `outcome_scores` | Sensitive | EU | 1825 (5y) | ✅ Required | 5.3 |
| `metrics_company_period` | Public | Global | ∞ | ❌ N/A | 5.3 |
| `report_lineage` | Public | Global | 1095 (3y) | ❌ N/A | 5.3 |
| `report_citations` | Public | Global | 1095 (3y) | ❌ N/A | 5.3 |

#### Acceptance Criteria
- [ ] All 12 critical tables tagged with GDPR category (PII, Sensitive, Public)
- [ ] All tables tagged with residency (EU, US, UK, Global)
- [ ] TTL policies defined per category (PII: 7y, Sensitive: 3-5y, Public: configurable)
- [ ] DSAR hooks for PII/Sensitive tables (selective deletion)
- [ ] Integration tested with existing `services/gdpr-service`
- [ ] Residency enforcement: EU data stays in EU (row-level checks if needed)
- [ ] Residency matrix documented (`/docs/data/residency_matrix.md`)

#### Progress Log
- **2025-11-16 (Kickoff)**: Slice planning in progress

---

### J6: Data SLOs & Dashboards 🔴 Not Started
**Owner**: data-eng-lead (Agent 1.4, Team 5 Lead)
**Target**: Grafana dashboard live; SLOs tracked; alerts functional

#### Data Trust Dashboard (Grafana)
**Panels**:
1. **Freshness SLO**: % datasets refreshed in <24h (target: ≥95%)
2. **Test Pass SLO**: % GE tests passing (target: ≥90%)
3. **Lineage Coverage SLO**: % critical pipelines emitting OL events (target: ≥90%)
4. **Anomaly Alerts**: Drift/null spike/outlier counts (last 7 days)
5. **DSAR Queue**: Pending data deletion requests
6. **Residency Violations**: Datasets in wrong region (target: 0)

#### SLO Definitions
| SLO | Target | Burn Rate Alert | Agent |
|-----|--------|-----------------|-------|
| **Freshness** | ≥95% datasets <24h old | 1% error budget consumed in 1h | 1.4 |
| **Test Pass Rate** | ≥90% GE tests passing | Critical suite <85% for 15min | 1.4 |
| **Lineage Coverage** | ≥90% critical pipelines instrumented | Coverage drops below 85% | 1.4 |

#### Acceptance Criteria
- [ ] Grafana dashboard: "Data Trust" (`/observability/grafana/dashboards/data_trust.json`)
- [ ] Freshness SLO tracked (Prometheus metrics from `dataset_profiles` table)
- [ ] Test pass rate SLO tracked (Prometheus metrics from GE checkpoint results)
- [ ] Lineage coverage SLO tracked (Prometheus metrics from `lineage_events` table)
- [ ] Burn-rate alerts configured (Alertmanager rules)
- [ ] Alerts routed to on-call (PagerDuty/OpsGenie integration)
- [ ] SLO badges in Catalog UI (link to Grafana dashboard)

#### Progress Log
- **2025-11-16 (Kickoff)**: Slice planning in progress

---

### J7: Docs & Runbooks 🔴 Not Started
**Owner**: All Leads, Team 5
**Target**: 4 runbooks + readout published

#### Documentation Structure
```
/docs/data/
├── ge_playbook.md             # GE usage, adding suites, CI integration (Agent 2.1-2.5)
├── openlineage_guide.md       # OL instrumentation, event types, sinks (Agent 3.1-3.6)
├── dbt_standards.md           # dbt conventions, metrics registry, golden tests (Agent 4.1-4.6)
└── residency_matrix.md        # GDPR categories, TTL policies, DSAR hooks (Agent 5.3)

/reports/
└── worker5_data_trust_readout.md  # This file (All Leads)
```

#### Acceptance Criteria
- [ ] **GE Playbook** (`/docs/data/ge_playbook.md`): How to add suites, run `pnpm dq:ci`, interpret results
- [ ] **OpenLineage Guide** (`/docs/data/openlineage_guide.md`): How to add OL emitters, event types, sink setup
- [ ] **dbt Standards** (`/docs/data/dbt_standards.md`): Naming conventions, metrics registry, golden test patterns
- [ ] **Residency Matrix** (`/docs/data/residency_matrix.md`): GDPR categories, TTL policies, enforcement
- [ ] **Readout** (`/reports/worker5_data_trust_readout.md`): Coverage ≥90% evidence, lineage screenshots, demo guide
- [ ] All runbooks include examples, troubleshooting, FAQs
- [ ] Readout includes before/after screenshots of Catalog UI

#### Progress Log
- **2025-11-16 (Kickoff)**: Readout initialized; runbooks pending

---

## Team Coordination Status

### Team 1: Data Engineering (5 agents)
**Lead**: data-eng-lead
**Status**: 🔴 Not Started

| Agent | Task | Status |
|-------|------|--------|
| 1.1 (pipeline-instrumentation-dev) | OL emitter patterns | 🔴 Pending |
| 1.2 (clickhouse-sink-engineer) | ClickHouse lineage_events table | 🔴 Pending |
| 1.3 (postgres-lineage-enhancer) | PostgreSQL dataset_profiles table | 🔴 Pending |
| 1.4 (ingestion-monitor) | Data Trust Grafana dashboard | 🔴 Pending |
| 1.5 (transformation-tracker) | dbt run lineage tracking | 🔴 Pending |

---

### Team 2: Data Quality (8 agents)
**Lead**: dq-lead
**Status**: 🔴 Not Started

| Agent | Task | Status |
|-------|------|--------|
| 2.1 (ge-suite-author-critical) | GE suites: users, companies, program_enrollments | 🔴 Pending |
| 2.2 (ge-suite-author-kintell) | GE suites: kintell_sessions | 🔴 Pending |
| 2.3 (ge-suite-author-buddy) | GE suites: buddy_matches, buddy_events, buddy_feedback | 🔴 Pending |
| 2.4 (ge-suite-author-metrics) | GE suites: evidence_snippets, outcome_scores, metrics_company_period | 🔴 Pending |
| 2.5 (ge-suite-author-reports) | GE suites: report_lineage, report_citations | 🔴 Pending |
| 2.6 (dq-anomaly-hunter-drift) | Schema drift monitor | 🔴 Pending |
| 2.7 (dq-anomaly-hunter-nulls) | Null spike monitor | 🔴 Pending |
| 2.8 (dq-anomaly-hunter-outliers) | Outlier monitor (SROI >10, VIS >100) | 🔴 Pending |

---

### Team 3: Lineage & Catalog (8 agents)
**Lead**: lineage-lead
**Status**: 🔴 Not Started

| Agent | Task | Status |
|-------|------|--------|
| 3.1 (lineage-emitter-impact-in) | OL emitters: services/impact-in | 🔴 Pending |
| 3.2 (lineage-emitter-reporting) | OL emitters: services/reporting | 🔴 Pending |
| 3.3 (lineage-emitter-q2q-ai) | OL emitters: services/q2q-ai | 🔴 Pending |
| 3.4 (lineage-emitter-analytics) | OL emitters: services/analytics | 🔴 Pending |
| 3.5 (lineage-sink-builder-clickhouse) | ClickHouse lineage_events sink + compaction | 🔴 Pending |
| 3.6 (lineage-sink-builder-postgres) | PostgreSQL dataset_profiles sink | 🔴 Pending |
| 3.7 (catalog-ui-integrator-cockpit) | Catalog page UI | 🔴 Pending |
| 3.8 (catalog-ui-integrator-lineage) | Lineage sparkline + drill-through | 🔴 Pending |

---

### Team 4: Semantic Layer & Metrics (6 agents)
**Lead**: semantics-lead
**Status**: 🔴 Not Started

| Agent | Task | Status |
|-------|------|--------|
| 4.1 (dbt-modeler-staging) | dbt stg_* models | 🔴 Pending |
| 4.2 (dbt-modeler-marts) | dbt dims/facts | 🔴 Pending |
| 4.3 (dbt-modeler-metrics) | dbt metrics registry | 🔴 Pending |
| 4.4 (metrics-governor-sroi) | SROI metric spec + golden tests | 🔴 Pending |
| 4.5 (metrics-governor-vis) | VIS metric spec + golden tests | 🔴 Pending |
| 4.6 (dbt-docs-generator) | dbt docs artifact | 🔴 Pending |

---

### Team 5: Platform & Compliance (3 agents)
**Lead**: platform-lead
**Status**: 🔴 Not Started

| Agent | Task | Status |
|-------|------|--------|
| 5.1 (ci-wiring-engineer-dq) | pnpm dq:ci script + CI job | 🔴 Pending |
| 5.2 (ci-wiring-engineer-dbt) | pnpm dbt:test/run CI jobs | 🔴 Pending |
| 5.3 (residency-policy-engineer) | GDPR tagging + TTL policies | 🔴 Pending |

---

## Blockers & Risks

### Current Blockers
- None (kickoff phase)

### Identified Risks
| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **dbt metrics diverge from service calculators** | Medium | High | Golden tests enforced in CI; pair Agent 4.4/4.5 with service owners |
| **GE suite coverage <90% on critical tables** | Low | High | Blocking CI gate; Team 2 has clear ownership |
| **OL emitter performance overhead** | Medium | Medium | Async event emission; benchmark in staging |
| **Catalog UI performance with >100 datasets** | Low | Medium | Pagination + virtualization (existing patterns) |
| **GDPR residency enforcement complexity** | Medium | High | Start with tagging only; row-level enforcement deferred to Phase 2 |

---

## Next Steps (Phase 1: Foundation)

### Week 1 (2025-11-16 to 2025-11-22)
1. **data-eng-lead**: Set up ClickHouse `lineage_events` table + compaction job (Agent 1.2)
2. **data-eng-lead**: Set up PostgreSQL `dataset_profiles` table (Agent 1.3)
3. **dq-lead**: Initialize GE project + checkpoint configs (bootstrap structure)
4. **semantics-lead**: Bootstrap dbt project at `analytics/dbt/` (Agent 4.1)
5. **platform-lead**: Wire CI jobs (`pnpm dq:ci`, `pnpm dbt:test`, `pnpm dbt:run`) (Agents 5.1, 5.2)

### Week 2 (2025-11-23 to 2025-11-29)
1. **Team 3 (Lineage)**: Add OL emitters to 4 services (Agents 3.1–3.4)
2. **Team 2 (DQ)**: Author GE suites for 8 critical tables (Agents 2.1–2.5)
3. **Team 4 (Semantics)**: Create dbt staging models (Agent 4.1)

---

## Appendix

### Existing Lineage Infrastructure (Baseline)
- **Tables**: `metric_lineage`, `report_lineage` (PostgreSQL)
- **Columns tracked**: metric_type, source_event_ids, calculation_formula, calculated_at, calculated_by
- **Lineage visualization**: `/services/reporting/src/lineage/graph-export.ts` (DOT/JSON export)
- **Report audit**: model, cost, token usage tracking

### Critical Services for Instrumentation
| Service | Port | Entry Point | Critical Pipelines |
|---------|------|-------------|--------------------|
| **impact-in** | 3003 | `/services/impact-in/src/index.ts` | Connector jobs (Benevity, Goodera, Workday) |
| **reporting** | 3001 | `/services/reporting/src/index.ts` | Report generation, exports |
| **q2q-ai** | 3005 | `/services/q2q-ai/src/index.ts` | Q2Q pipeline (feedback → evidence) |
| **analytics** | 3007 | `/services/analytics/src/index.ts` | SROI/VIS calculations, aggregations |

### Technology Stack
- **OpenLineage**: Python client (via containerized jobs) or TypeScript (via `@openlineage/nodejs`)
- **Great Expectations**: Python (via containerized jobs or subprocess calls)
- **dbt**: dbt-core (PostgreSQL + ClickHouse adapters)
- **Grafana**: Existing stack at `/observability/grafana/`
- **Prometheus**: Existing metrics collection

---

**Last Updated**: 2025-11-16 (Kickoff)
**Next Update**: 2025-11-22 (Phase 1 checkpoint)
