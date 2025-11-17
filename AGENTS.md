# Multi-Agent Orchestration Structure

## Worker 3: Corporate Cockpit & Metrics Team

**Tech Lead Orchestrator**: Coordinates 30 specialist agents across 5 teams

---

## Phase D: Enterprise Production Launch (30 Agents / 5 Leads)

**Status**: 🚧 In Progress | **Started**: 2025-11-14
**Branch**: `claude/genai-reporting-cockpit-phase-d-01Hppffi2ErgfUV2G5jXiN7b`

### ✅ Completed Deliverables

#### Gen-AI Core (Team 2: 6 agents)
**Status**: ✅ Complete (2025-11-14)

**Completed by**: `prompt-architect`, `citation-extractor`, `redaction-engineer`, `narrative-composer`, `cost-telemetry`, `audit-logger`

**Deliverables**:
1. ✅ **4 Report Templates**: Quarterly, Annual, Investor Update, Impact Deep Dive
   - All templates include evidence-based prompting with token budgets
   - Multi-locale support (EN, ES, FR, UK, NO)
   - CSRD-aligned narratives for annual reports
   - Files: `quarterly-report.en.hbs`, `annual-report.en.hbs`, `investor-update.en.hbs`, `impact-deep-dive.en.hbs`

2. ✅ **Strict Citation Validation**:
   - Minimum 1 citation per paragraph (configurable)
   - Citation density: 0.5 per 100 words (configurable)
   - Fail-fast on missing or invalid citations
   - Enhanced: `/services/reporting/src/lib/citations.ts`

3. ✅ **PII Redaction Enforcement**:
   - Pre-LLM redaction with post-redaction leak detection
   - Audit logging with redaction counts (no PII logged)
   - Validation throws errors if PII detected after redaction
   - Enhanced: `/services/reporting/src/routes/gen-reports.ts`

4. ✅ **Documentation**:
   - Comprehensive Gen-AI Reporting guide
   - File: `/docs/GenAI_Reporting.md` (729 lines)

**Files Modified/Created**: 8 files, 960+ insertions
**Commits**: 2 (core features + documentation)

**Next**: Server-side chart rendering (Team 3), Saved views (Team 4), E2E tests (Team 5)

---

### Team 1: Enterprise UX (6 agents)
**Lead**: enterprise-ux-lead
- **Agent 1.1**: approvals-workflow-dev (report lifecycle, draft→review→approve, version diffs)
- **Agent 1.2**: audit-mode-dev (lineage overlay, freeze interactions, evidence IDs on hover)
- **Agent 1.3**: partner-portal-ui (partner views, tenant snapshots, navigation guards)
- **Agent 1.4**: benchmarks-ui-dev (cohort comparators, percentile ribbons, DW integration)
- **Agent 1.5**: consent-ui-dev (consent status, DSAR queue viewer, retention notices)
- **Agent 1.6**: incident-ui-dev (status banner, incident shelf, graceful degradation)

### Team 2: Identity & SSO (5 agents)
**Lead**: identity-lead
- **Agent 2.1**: sso-ui-engineer (SAML/OIDC metadata display, read-only views)
- **Agent 2.2**: scim-ui-engineer (provisioning mapping UX, role sync, test ping)
- **Agent 2.3**: whitelabel-validator (theme token contrast/size validation)
- **Agent 2.4**: export-log-ui-dev (export audit viewer, approval trail linking)
- **Agent 2.5**: error-boundaries-dev (per-widget error boundaries, fallback UI)

### Team 3: Reports & Executive Packs (5 agents)
**Lead**: reports-pack-lead
- **Agent 3.1**: report-pdf-engineer (watermarking, ID stamping, evidence hash)
- **Agent 3.2**: pptx-export-engineer (template, cover+KPIs+charts, evidence links)
- **Agent 3.3**: narrative-controls-dev (tone/length toggles, server prompt params)
- **Agent 3.4**: charts-perf-dev (virtualization, data windowing, memoization)
- **Agent 3.5**: docs-scribe (partner/exec docs, CXO walkthrough, runbooks)

### Team 4: Performance & A11y (7 agents)
**Lead**: perf-a11y-lead
- **Agent 4.1**: pwa-engineer (service worker, offline cache, manifest)
- **Agent 4.2**: sse-resume-specialist (last-event-id replay, offline/online banners)
- **Agent 4.3**: sr-a11y-engineer (screen reader scripts, live regions for SSE)
- **Agent 4.4**: keyboard-nav-engineer (tab order, roving tabindex, focus maps)
- **Agent 4.5**: target-size-engineer (WCAG 2.2 AAA target size compliance)
- **Agent 4.6**: web-vitals-rum (OTel spans, route labels, budget enforcement)
- **Agent 4.7**: csp-engineer (nonce-based CSP, Trusted Types policy, inline removal)

### Team 5: QA & Compliance (7 agents)
**Lead**: qa-compliance-lead
- **Agent 5.1**: visual-regression-engineer (Storybook/Ladle, image diff baselines)
- **Agent 5.2**: sri-assets-engineer (Subresource Integrity, hash generation)
- **Agent 5.3**: e2e-approvals-tester (Playwright: approval flow, audit mode)
- **Agent 5.4**: e2e-pwa-tester (offline scenarios, SSE resume, boardroom mode)
- **Agent 5.5**: e2e-sso-tester (SSO UI, SCIM mapping, role sync validation)
- **Agent 5.6**: e2e-exec-pack-tester (PPTX export, watermarking, narrative controls)
- **Agent 5.7**: csp-compliance-tester (CSP violations, Trusted Types enforcement)

---

## Worker 5: Data Trust & Catalog Team

**Tech Lead Orchestrator**: Coordinates 30 specialist agents across 5 teams

**Status**: 🚧 In Progress | **Started**: 2025-11-16
**Branch**: `claude/worker5-data-trust-catalog-01MP5u1wgV11fa33LqqEQWbp`

**Mission**: Establish end-to-end data governance, quality, and lineage for the TEEI CSR Platform. Ship OpenLineage events, Great Expectations test suites, governed semantic layer (dbt/metrics), and lightweight catalog UI integrated into Cockpit.

---

### Team Structure (30 Agents / 5 Leads)

#### Team 1: Data Engineering (5 agents)
**Lead**: data-eng-lead
- **Agent 1.1**: pipeline-instrumentation-dev (MUST BE USED when adding OL emitters to services/impact-in, services/reporting, services/analytics, services/q2q-ai. Blocks merge if OL events missing from critical pipelines)
- **Agent 1.2**: clickhouse-sink-engineer (MUST BE USED for lineage_events, dataset_profiles tables + compaction jobs. Blocks if retention policies undefined)
- **Agent 1.3**: postgres-lineage-enhancer (MUST BE USED when extending metric_lineage/report_lineage schemas. Blocks if migrations missing)
- **Agent 1.4**: ingestion-monitor (MUST BE USED for data pipeline observability. Enforces freshness SLAs)
- **Agent 1.5**: transformation-tracker (MUST BE USED for tracking dbt run lineage. Blocks if transformation jobs lack OL events)

#### Team 2: Data Quality (8 agents)
**Lead**: dq-lead
- **Agent 2.1**: ge-suite-author-critical (MUST BE USED when adding/altering GE suites for users, companies, program_enrollments. Blocks merge if suite coverage <90% on critical tables)
- **Agent 2.2**: ge-suite-author-kintell (MUST BE USED for kintell_sessions, learning_progress GE suites. Blocks if schema checks missing)
- **Agent 2.3**: ge-suite-author-buddy (MUST BE USED for buddy_matches, buddy_events, buddy_feedback GE suites. Blocks if referential integrity tests missing)
- **Agent 2.4**: ge-suite-author-metrics (MUST BE USED for outcome_scores, evidence_snippets, metrics_company_period GE suites. Blocks if numeric range tests missing)
- **Agent 2.5**: ge-suite-author-reports (MUST BE USED for report_lineage, report_citations GE suites. Blocks if NOT NULL tests missing)
- **Agent 2.6**: dq-anomaly-hunter-drift (MUST BE USED when schema drift >5% detected. Proactive agent, runs on schedule)
- **Agent 2.7**: dq-anomaly-hunter-nulls (MUST BE USED when null spike >10% detected. Proactive agent, runs on schedule)
- **Agent 2.8**: dq-anomaly-hunter-outliers (MUST BE USED when outlier metrics detected (SROI >10, VIS >100). Proactive agent, runs on schedule)

#### Team 3: Lineage & Catalog (8 agents)
**Lead**: lineage-lead
- **Agent 3.1**: lineage-emitter-impact-in (MUST BE USED when instrumenting services/impact-in with OL events. Blocks if connector jobs lack dataset lineage)
- **Agent 3.2**: lineage-emitter-reporting (MUST BE USED when instrumenting services/reporting with OL events. Blocks if report generation lacks input dataset tracking)
- **Agent 3.3**: lineage-emitter-q2q-ai (MUST BE USED when instrumenting services/q2q-ai with OL events. Blocks if Q2Q pipeline lacks evidence lineage)
- **Agent 3.4**: lineage-emitter-analytics (MUST BE USED when instrumenting services/analytics with OL events. Blocks if SROI/VIS calculations lack lineage)
- **Agent 3.5**: lineage-sink-builder-clickhouse (MUST BE USED for ClickHouse lineage_events table + retention. Blocks if compaction job missing)
- **Agent 3.6**: lineage-sink-builder-postgres (MUST BE USED for PostgreSQL dataset_profiles table. Blocks if freshness tracking missing)
- **Agent 3.7**: catalog-ui-integrator-cockpit (MUST BE USED when adding /cockpit/[companyId]/catalog page. Blocks if dataset cards lack freshness badges)
- **Agent 3.8**: catalog-ui-integrator-lineage (MUST BE USED for lineage sparkline + drill-through to Evidence Explorer. Blocks if metric→evidence linking broken)

#### Team 4: Semantic Layer & Metrics (6 agents)
**Lead**: semantics-lead
- **Agent 4.1**: dbt-modeler-staging (MUST BE USED for dbt stg_* models (raw → cleaned). Blocks if source freshness checks missing)
- **Agent 4.2**: dbt-modeler-marts (MUST BE USED for dbt marts (dims/facts). Blocks if exposures undefined)
- **Agent 4.3**: dbt-modeler-metrics (MUST BE USED for dbt metrics (SROI/VIS). Blocks if metrics diverge from service calculators)
- **Agent 4.4**: metrics-governor-sroi (MUST BE USED for SROI metric spec + freshness policies. Blocks if golden tests fail)
- **Agent 4.5**: metrics-governor-vis (MUST BE USED for VIS metric spec + freshness policies. Blocks if golden tests fail)
- **Agent 4.6**: dbt-docs-generator (MUST BE USED for dbt docs artifact generation. Blocks if exposures missing for Cockpit queries)

#### Team 5: Platform & Compliance (3 agents)
**Lead**: platform-lead
- **Agent 5.1**: ci-wiring-engineer-dq (MUST BE USED for pnpm dq:ci script + CI job. Blocks if critical GE suites not enforced)
- **Agent 5.2**: ci-wiring-engineer-dbt (MUST BE USED for dbt test/run CI jobs. Blocks if dbt docs not published)
- **Agent 5.3**: residency-policy-engineer (MUST BE USED for GDPR category tagging + TTL policies. Blocks if DSAR hooks missing)

---

### Delivery Slices (J1–J7)

**J1: OpenLineage Instrumentation** (Agents 3.1–3.6, 1.1, 1.5)
- OL emitters in 4 services (impact-in, reporting, q2q-ai, analytics)
- ClickHouse + PostgreSQL sinks with compaction/retention
- Event types: START_RUN, COMPLETE_RUN, FAIL_RUN, dataset IN/OUT, column lineage
- **Acceptance**: ≥90% critical pipelines emit OL events; dataset→metric lineage resolvable

**J2: Great Expectations Coverage** (Agents 2.1–2.5, Team 2 Lead)
- GE suites for 8 critical tables (users, companies, program_enrollments, kintell_sessions, buddy_matches, evidence_snippets, outcome_scores, metrics_company_period)
- Schema + nulls + ranges + uniqueness + referential integrity tests
- CI script `pnpm dq:ci` fails if critical suites <90% pass
- **Acceptance**: 100% critical tables have GE suites; ≥90% test pass rate; runbook published

**J3: dbt Semantic Layer** (Agents 4.1–4.6, Team 4 Lead)
- dbt project: analytics/dbt/ with stg/marts/metrics models
- Metrics registry: sroi, vis, engagement_rate, hours_volunteered, evidence_density
- Freshness checks + exposures for Cockpit queries
- **Acceptance**: dbt metrics match service calculators (golden tests pass); docs artifact published

**J4: Catalog UI in Cockpit** (Agents 3.7–3.8, 1.4)
- New page: /cockpit/[companyId]/catalog with dataset cards
- Display: dataset name, freshness, last load, test status, lineage sparkline
- Drill-through: metric → evidence lineage → Evidence Explorer
- **Acceptance**: ≥12 governed datasets listed; freshness + quality badges live; drill-through functional

**J5: Retention & Residency Policies** (Agent 5.3, Team 1 Lead)
- Tag datasets with GDPR category (PII, sensitive, public) + residency (EU/US/UK)
- TTL policies per category; DSAR hooks for selective deletion
- **Acceptance**: All critical tables tagged; TTL policies enforced; DSAR integration tested

**J6: Data SLOs & Dashboards** (Agent 1.4, Team 5 Lead)
- Grafana: "Data Trust" dashboard (freshness, test pass %, lineage coverage %)
- SLOs: freshness <24h, test pass ≥90%, lineage coverage ≥90%
- Burn-rate alerts to on-call
- **Acceptance**: Dashboards live; alerts functional; SLO badges in Catalog UI

**J7: Docs & Runbooks** (All Leads, Team 5)
- /docs/data/ (GE playbook, OL guide, dbt standards, residency matrix)
- /reports/worker5_data_trust_readout.md (coverage table, lineage screenshots)
- **Acceptance**: All 4 runbooks published; readout includes coverage ≥90% evidence

---

### Orchestration Workflow

**Phase 1: Foundation** (Week 1)
1. data-eng-lead: Set up OL sink infrastructure (ClickHouse tables, retention jobs)
2. dq-lead: Initialize GE project + checkpoint configs
3. semantics-lead: Bootstrap dbt project structure (stg/marts/metrics dirs)
4. platform-lead: Wire CI jobs (dq:ci, dbt:test, dbt:run)

**Phase 2: Instrumentation & Suites** (Week 2)
1. Team 3 (Lineage): Add OL emitters to 4 services (impact-in, reporting, q2q-ai, analytics)
2. Team 2 (DQ): Author GE suites for 8 critical tables
3. Team 4 (Semantics): Create dbt staging models (stg_*)

**Phase 3: Semantic Layer & UI** (Week 3)
1. Team 4 (Semantics): Build dbt marts + metrics; generate docs
2. Team 3 (Catalog): Implement Catalog UI in Cockpit (/catalog page)
3. Team 2 (DQ): Deploy anomaly hunters (drift/nulls/outliers monitors)

**Phase 4: Compliance & Dashboards** (Week 4)
1. Team 5 (Platform): Tag datasets with GDPR categories + residency
2. Team 1 (Data Eng): Set up Data Trust Grafana dashboard + SLO alerts
3. All Leads: Documentation review + /reports/worker5_data_trust_readout.md

**Phase 5: Testing & Validation** (Week 5)
1. All Teams: Execute golden tests (dbt metrics vs service calculators)
2. platform-lead: Run CI gate validation (GE suites, dbt tests, OL coverage)
3. All Leads: PR review, screenshots, demo prep

---

### Quality Gates & Guardrails

**Blocking Conditions** (Fail CI):
- ❌ GE suite coverage <90% on any critical table
- ❌ GE suite missing for any critical table
- ❌ dbt metrics diverge from service calculators (golden test fail)
- ❌ OL events missing from critical pipelines (impact-in, reporting, q2q-ai, analytics)
- ❌ Catalog UI missing freshness or quality badges
- ❌ DSAR hooks missing for PII tables
- ❌ Retention policies undefined for GDPR-categorized datasets

**Enforcement**:
- Existing PR gates apply: lint, typecheck, unit ≥80%, E2E ≥60%, security audits, a11y (where UI touched)
- New gates: `pnpm dq:ci` (GE suites), `pnpm dbt:test` (dbt tests), `pnpm lineage:validate` (OL coverage)

**No Secrets Policy**:
- Use existing Vault/Secrets Manager injections
- No API keys, DB passwords, or PII in repo

---

### Success Criteria

✅ **J1 (OpenLineage)**: ≥90% critical pipelines emit OL events; dataset→metric lineage resolvable; ClickHouse sink operational
✅ **J2 (Great Expectations)**: 100% critical tables have GE suites; ≥90% test pass rate; `pnpm dq:ci` wired
✅ **J3 (dbt Semantic Layer)**: dbt metrics match service calculators (golden tests pass); docs artifact published; exposures defined
✅ **J4 (Catalog UI)**: ≥12 governed datasets listed; freshness + quality badges live; drill-through to Evidence Explorer functional
✅ **J5 (Retention & Residency)**: All critical tables tagged with GDPR category + residency; TTL policies enforced; DSAR integration tested
✅ **J6 (Data SLOs)**: Grafana dashboard live; SLOs tracked (freshness <24h, test pass ≥90%, lineage coverage ≥90%); alerts functional
✅ **J7 (Docs)**: 4 runbooks published (GE, OL, dbt, residency); /reports/worker5_data_trust_readout.md includes coverage ≥90% evidence; screenshots included

---

### Communication Protocol

- **Daily**: Lead standup (5 mins) - blockers escalated immediately
- **Commits**: Small, atomic, tested slices - no monolithic PRs
- **Documentation**: Update /reports/worker5_data_trust_readout.md after each milestone
- **Agent Artifacts**: All agents write-to-file in /reports/ + update /MULTI_AGENT_PLAN.md

---

### Agent Coordination Rules

1. **Orchestrator-only planning** - No specialist does Tech Lead's orchestration
2. **No implementation overlap** - Clear ownership per agent
3. **Dependencies mapped** - Blocked work escalated early (e.g., dbt depends on GE schema validation)
4. **Test coverage required** - No merges without tests (unit ≥80%, E2E ≥60%)
5. **Documentation mandatory** - Every GE suite, dbt model, OL emitter, policy documented
6. **Least-privilege tools** - Agents use minimum required tools (no unnecessary Bash/Grep by UI agents)

---

## Phase 1-3 Teams (Historical Reference)

<details>
<summary>Click to expand: Original Phase 1-3 team structure</summary>

### Team 1: Frontend Engineering (6 agents)
**Lead**: Frontend Architect
- **Agent 1.1**: Astro 5 Setup Specialist (routing, SSR, islands)
- **Agent 1.2**: React Component Developer (widgets, charts)
- **Agent 1.3**: UI/UX Designer (layouts, responsive design)
- **Agent 1.4**: A11y Specialist (WCAG 2.2 AA compliance)
- **Agent 1.5**: i18n Engineer (en/uk/no, SEO, hreflang)
- **Agent 1.6**: State Management Developer (auth, RBAC, context)

### Team 2: Backend & Data Services (7 agents)
**Lead**: Backend Architect
- **Agent 2.1**: Reporting API Engineer (metrics endpoints)
- **Agent 2.2**: Database Schema Designer (PostgreSQL models)
- **Agent 2.3**: SROI Calculator Engineer (formula implementation)
- **Agent 2.4**: VIS Calculator Engineer (volunteer scoring)
- **Agent 2.5**: Export Service Developer (CSV/JSON/PDF)
- **Agent 2.6**: Rate Limiting & Security Engineer
- **Agent 2.7**: API Documentation Specialist (OpenAPI/Swagger)

### Team 3: Integration & External APIs (6 agents)
**Lead**: Integration Architect
- **Agent 3.1**: Impact-In API Developer (outbound push)
- **Agent 3.2**: Benevity Connector Engineer (stub + mapper)
- **Agent 3.3**: Goodera Connector Engineer (stub + mapper)
- **Agent 3.4**: Workday Connector Engineer (stub + mapper)
- **Agent 3.5**: Discord Bot Developer (feedback hooks)
- **Agent 3.6**: Webhook & Event System Engineer

### Team 4: AI & Q2Q Pipeline (5 agents)
**Lead**: AI/ML Engineer
- **Agent 4.1**: Q2Q Feed Generator (qualitative to quantitative)
- **Agent 4.2**: Evidence Lineage Tracker (provenance)
- **Agent 4.3**: Insight Scoring Engine (confidence ratings)
- **Agent 4.4**: NLP Preprocessor (feedback analysis)
- **Agent 4.5**: ML Model Evaluator (quality metrics)

### Team 5: DevOps, QA & Documentation (6 agents)
**Lead**: QA & DevOps Lead
- **Agent 5.1**: Test Engineer (unit, integration tests)
- **Agent 5.2**: E2E Test Specialist (Playwright scenarios)
- **Agent 5.3**: CI/CD Engineer (build, deploy pipelines)
- **Agent 5.4**: Technical Writer (docs, playbooks)
- **Agent 5.5**: Demo & Sample Data Engineer
- **Agent 5.6**: Performance & Monitoring Engineer

</details>

## Orchestration Workflow

### Phase 1: Foundation (Leads 1, 2, 5)
1. Frontend Lead: Set up Astro 5 app structure
2. Backend Lead: Create service skeletons
3. QA Lead: Initialize test frameworks

### Phase 2: Core Services (Leads 2, 4)
1. Backend Lead: Implement reporting endpoints
2. AI Lead: Build Q2Q pipeline
3. Backend Lead: SROI/VIS calculators

### Phase 3: UI & Integration (Leads 1, 3)
1. Frontend Lead: Build dashboard widgets
2. Integration Lead: Create Impact-In API
3. Integration Lead: Discord bot setup

### Phase 4: Polish & Demo (All Leads)
1. Frontend Lead: A11y audit and i18n
2. Integration Lead: Test all connectors
3. QA Lead: Sample data and demo
4. QA Lead: Documentation review

## Communication Protocol

- **Daily**: Lead standup (5 mins)
- **Blockers**: Escalate to Tech Lead immediately
- **Commits**: Small, atomic, tested slices
- **Documentation**: Update `MULTI_AGENT_PLAN.md` after each milestone

## Success Criteria

✅ All endpoints return shaped data
✅ UI builds and runs with `pnpm -w dev`
✅ SROI/VIS formulas tested and documented
✅ Discord bot receives feedback
✅ Demo dashboard renders with mock data
✅ A11y baseline passes (WCAG 2.2 AA)
✅ i18n works for en/uk/no
✅ Export functions download files
✅ No secrets in repo
✅ PR ready with screenshots

## Agent Coordination Rules

1. **No specialist does the Tech Lead's orchestration**
2. **No implementation overlap** - clear ownership
3. **Dependencies mapped** - blocked work escalated early
4. **Test coverage required** - no merges without tests
5. **Documentation mandatory** - every formula, API, decision documented
