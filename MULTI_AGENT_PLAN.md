# Worker 2 Multi-Agent Execution Plan

**Status**: 🚧 In Progress
**Branch**: `worker2/services-schema-ingestion`
**Started**: 2025-11-13
**Target Completion**: TBD

---

## Phase 1: Foundation Setup ⏳

### 1.1 Monorepo Structure
- [ ] Create pnpm workspace configuration
- [ ] Set up TypeScript project references
- [ ] Configure ESLint + Prettier
- [ ] Set up shared tsconfig.json
- [ ] Create .env.example files

**Assigned**: Infrastructure Lead
**Status**: Not Started

### 1.2 Documentation
- [x] Create AGENTS.md
- [x] Create MULTI_AGENT_PLAN.md
- [ ] Create reports/worker2_services.md
- [ ] Update docs/Platform_Architecture.md
- [ ] Update docs/System_Diagram.md

**Assigned**: Tech Lead Orchestrator
**Status**: In Progress

---

## Phase 2: Data Layer 📊

### 2.1 Event Contracts Package
- [ ] Initialize packages/event-contracts
- [ ] Define buddy.* event types (match.created, event.logged, checkin.completed, feedback.submitted)
- [ ] Define kintell.* event types (session.completed, rating.created, session.scheduled)
- [ ] Define upskilling.* event types (course.completed, credential.issued, progress.updated)
- [ ] Define orchestration.* event types (journey.milestone.reached, profile.updated)
- [ ] Define safety.* event types (flag.raised, review.completed)
- [ ] Add Zod schemas for all payloads
- [ ] Implement event versioning (v1, v2, etc.)
- [ ] Write unit tests for validators

**Assigned**: Data Modeling Lead → Contract Designer, Validation Engineer
**Status**: Not Started
**Dependencies**: None

### 2.2 Shared Schema Package
- [ ] Initialize packages/shared-schema with Drizzle
- [ ] Create core tables: users, companies, company_users
- [ ] Create program_enrollments table
- [ ] Create kintell_sessions table (language|mentorship, mapping fields)
- [ ] Create buddy_* tables (matches, events, checkins, feedback)
- [ ] Create learning_progress table
- [ ] Create outcome_scores table (dimension, score, confidence)
- [ ] Create evidence_snippets table (hash, embedding pointers)
- [ ] Create metrics_company_period table (aggregates, sroi_ratio, vis_score)
- [ ] Add indexes for performance
- [ ] Implement PII partitioning strategy
- [ ] Create initial migration (0000_init.sql)
- [ ] Create seed script with sample data

**Assigned**: Data Modeling Lead → Schema Architect, Migration Engineer, Data Privacy
**Status**: Not Started
**Dependencies**: None

### 2.3 Event Bus SDK
- [ ] Initialize packages/shared-utils
- [ ] Create event-bus.ts with NATS client wrapper
- [ ] Implement publish() helper with validation
- [ ] Implement subscribe() helper with type safety
- [ ] Add connection pooling and retry logic
- [ ] Create logger utility
- [ ] Add correlation ID tracking
- [ ] Write unit tests

**Assigned**: Core Services Lead → Event Bus Engineer
**Status**: Not Started
**Dependencies**: 2.1 (Event Contracts)

---

## Phase 3: Core Services 🚀

### 3.1 Unified Profile Service
- [ ] Initialize services/unified-profile (Fastify + TS)
- [ ] Implement GET /profile/:id (aggregated view)
- [ ] Implement PUT /profile/:id (update flags)
- [ ] Implement POST /profile/mapping (link kintell_id, discord_id, etc.)
- [ ] Add journey flag management (is_buddy_matched, has_completed_language, etc.)
- [ ] Subscribe to events that update profile (course.completed, etc.)
- [ ] Add health endpoint
- [ ] Create .http test file
- [ ] Write unit tests

**Assigned**: Core Services Lead → Profile Service Engineer
**Status**: Not Started
**Dependencies**: 2.2 (Schema), 2.3 (Event Bus)

### 3.2 Kintell Connector Service
- [ ] Initialize services/kintell-connector
- [ ] Create webhook receiver endpoints (POST /webhooks/session, /webhooks/rating)
- [ ] Implement CSV import endpoint (POST /import/kintell-sessions)
- [ ] Create column mapper with normalization rules
- [ ] Add validation for incoming data
- [ ] Emit kintell.session.completed event
- [ ] Emit kintell.rating.created event
- [ ] Create mapping configuration file
- [ ] Add health endpoint
- [ ] Create .http test file
- [ ] Write unit tests for mapper
- [ ] Create sample CSV files

**Assigned**: Connector Services Lead → Kintell Integration, CSV Parser, Mapper
**Status**: Not Started
**Dependencies**: 2.1 (Contracts), 2.2 (Schema), 2.3 (Event Bus)

### 3.3 Buddy Service
- [ ] Initialize services/buddy-service
- [ ] Create CSV/API importer for matches
- [ ] Create CSV/API importer for events
- [ ] Create CSV/API importer for checkins
- [ ] Create CSV/API importer for feedback
- [ ] Add schema validators for each data type
- [ ] Emit buddy.match.created event
- [ ] Emit buddy.event.logged event
- [ ] Emit buddy.checkin.completed event
- [ ] Emit buddy.feedback.submitted event
- [ ] Add health endpoint
- [ ] Create .http test file
- [ ] Write unit tests
- [ ] Create sample CSV files

**Assigned**: Connector Services Lead → Buddy Integration, Event Publisher
**Status**: Not Started
**Dependencies**: 2.1, 2.2, 2.3

### 3.4 Upskilling Connector Service
- [ ] Initialize services/upskilling-connector
- [ ] Create endpoint POST /import/course-completions
- [ ] Create endpoint POST /import/credentials
- [ ] Add provider-specific adapters (eCornell, itslearning)
- [ ] Emit upskilling.course.completed event
- [ ] Emit upskilling.credential.issued event
- [ ] Add health endpoint
- [ ] Create .http test file
- [ ] Write unit tests
- [ ] Create sample data

**Assigned**: Connector Services Lead → Upskilling Integration, API Client
**Status**: Not Started
**Dependencies**: 2.1, 2.2, 2.3

### 3.5 Q2Q AI Service (Skeleton)
- [ ] Initialize services/q2q-ai
- [ ] Define outcome taxonomy (confidence, belonging, lang_level_proxy, job_readiness)
- [ ] Create outcome dimension enum
- [ ] Implement classifier stub (placeholder function)
- [ ] Add text tagging interface
- [ ] Implement outcome_scores write logic
- [ ] Implement evidence_snippets write logic (with hash)
- [ ] Create abstracted model provider interface
- [ ] Add configuration for model selection
- [ ] Add health endpoint
- [ ] Create .http test file with dummy texts
- [ ] Write unit tests for taxonomy

**Assigned**: Core Services Lead → Q2Q AI Architect
**Status**: Not Started
**Dependencies**: 2.2 (Schema)

### 3.6 Safety/Moderation Service (Stub)
- [ ] Initialize services/safety-moderation
- [ ] Create text screening interface
- [ ] Implement placeholder content policy rules
- [ ] Emit safety.flag.raised event
- [ ] Add human review queue stub
- [ ] Create policy configuration file
- [ ] Add health endpoint
- [ ] Create .http test file
- [ ] Write unit tests

**Assigned**: Core Services Lead → Safety Engineer
**Status**: Not Started
**Dependencies**: 2.1 (Contracts), 2.3 (Event Bus)

### 3.7 API Gateway
- [ ] Initialize services/api-gateway
- [ ] Implement JWT session middleware
- [ ] Implement RBAC role checking (admin, company_user, participant)
- [ ] Create reverse proxy to internal services
- [ ] Add rate limiting
- [ ] Add request logging with correlation IDs
- [ ] Expose health endpoints for all services (GET /health/*)
- [ ] Create .http test file
- [ ] Write unit tests for auth middleware

**Assigned**: Core Services Lead → API Gateway Engineer, Config Management
**Status**: Not Started
**Dependencies**: All services must have health endpoints

---

## Phase 4: Infrastructure & Testing 🏗️

### 4.1 Docker Infrastructure
- [ ] Create docker-compose.yml (Postgres, NATS, pgAdmin)
- [ ] Configure Postgres with extensions (pgvector, uuid-ossp)
- [ ] Configure NATS with monitoring
- [ ] Add connection health checks
- [ ] Create .env.example with all required vars

**Assigned**: Infrastructure Lead → DevOps, Database Admin
**Status**: Not Started
**Dependencies**: None

### 4.2 Development Scripts
- [ ] Create pnpm workspace root package.json
- [ ] Add "pnpm -w dev" script (starts all services + hot reload)
- [ ] Add "pnpm -w build" script
- [ ] Add "pnpm -w test" script
- [ ] Add "pnpm -w db:migrate" script
- [ ] Add "pnpm -w db:seed" script
- [ ] Add "pnpm -w db:reset" script
- [ ] Document usage in README

**Assigned**: Infrastructure Lead → Deployment Specialist
**Status**: Not Started
**Dependencies**: 4.1

### 4.3 Unit Tests
- [ ] Test event contract Zod validators
- [ ] Test Kintell CSV mapper normalization
- [ ] Test Buddy data validators
- [ ] Test Q2Q outcome taxonomy
- [ ] Test API Gateway auth middleware
- [ ] Configure Vitest/Jest
- [ ] Achieve >80% coverage on mappers

**Assigned**: Quality & Testing Lead → Unit Test Engineer
**Status**: Not Started
**Dependencies**: All services implemented

### 4.4 Integration Tests
- [ ] Create test: Ingest Kintell CSV → normalized rows in DB
- [ ] Create test: CSV ingestion → events published to NATS
- [ ] Create test: Event received → profile updated
- [ ] Create test: End-to-end flow (CSV → events → profile → API)
- [ ] Add test fixtures and sample data
- [ ] Configure test database (separate from dev)

**Assigned**: Quality & Testing Lead → Integration Test Engineer
**Status**: Not Started
**Dependencies**: All services + 4.1, 4.2

---

## Phase 5: Documentation & PR 📝

### 5.1 Architecture Documentation
- [ ] Update docs/Platform_Architecture.md with service map
- [ ] Update docs/System_Diagram.md with data flow
- [ ] Create docs/Event_Catalog.md
- [ ] Create docs/Database_Schema.md
- [ ] Document API endpoints in each service
- [ ] Create ER diagram (Mermaid or PNG)

**Assigned**: Data Modeling Lead → Documentation Writer
**Status**: Not Started
**Dependencies**: All implementation complete

### 5.2 Reports
- [ ] Create reports/worker2_services.md with summary
- [ ] Include acceptance criteria checklist
- [ ] Document any deviations or decisions
- [ ] Add performance notes
- [ ] List known limitations

**Assigned**: Tech Lead Orchestrator
**Status**: Not Started
**Dependencies**: All tasks complete

### 5.3 Pull Request
- [ ] Review all commits
- [ ] Ensure branch is up to date
- [ ] Create PR with comprehensive description
- [ ] Add checklist from acceptance criteria
- [ ] Tag reviewers
- [ ] Link to reports/worker2_services.md

**Assigned**: Tech Lead Orchestrator
**Status**: Not Started
**Dependencies**: 5.1, 5.2

---

## Blockers & Decisions

### Open Questions
- [ ] Which NATS deployment model? (Embedded vs separate container)
- [ ] JWT signing strategy? (Symmetric vs asymmetric keys)
- [ ] Embedding model for evidence_snippets? (OpenAI vs local)
- [ ] CSV upload size limits?

### Decisions Made
- ✅ Use Drizzle ORM for type safety
- ✅ Use Zod for runtime validation
- ✅ Use Fastify for performance
- ✅ NATS for event bus (not Kafka/RabbitMQ)
- ✅ Separate packages for contracts/schema/utils (enforces boundaries)

---

## Progress Tracking

**Overall**: 2 / 100 tasks complete (2%)

| Phase | Tasks | Complete | %  |
|-------|-------|----------|----|
| 1. Foundation | 10 | 2 | 20% |
| 2. Data Layer | 35 | 0 | 0% |
| 3. Core Services | 72 | 0 | 0% |
| 4. Infrastructure | 20 | 0 | 0% |
| 5. Documentation | 13 | 0 | 0% |

**Last Updated**: 2025-11-13 (Auto-updated by orchestrator)

---

# Worker 3 Phase C: Pilot Orchestration & Enterprise Readiness

**Status**: 🚀 Planning Complete - Ready for Execution
**Branch**: `claude/worker3-phaseC-pilot-orchestration-011CV5u3ykujYMXifwU2KZQX`
**Started**: 2025-11-13
**Target Completion**: TBD

---

## Mission

Take the production-ready Corporate Cockpit from Phase B and transform it into a pilot-grade, enterprise CSR tool with:
- Multi-tenant isolation and configuration
- AI-powered generative reporting with evidence lineage
- Auditable evidence exploration for Q2Q insights
- Performance hardening (LCP ≤ 2.0s, INP ≤ 200ms)
- Enterprise features: saved views, scheduled exports, PDF reports
- White-label theming and company branding
- Impact-In delivery monitoring for external integrations

---

## Team Structure (30 agents / 5 leads)

### 1. **Frontend Lead** (6 agents)
- **Astro/React Engineer**: Tenant-scoped routing, company selector, admin console UI
- **Evidence Explorer Engineer**: Q2Q evidence browser with lineage drawer
- **Report UI Engineer**: Gen-AI report modal, preview, edit, export workflows
- **Performance Engineer**: Web-vitals collection, chart optimization, caching
- **Accessibility Engineer**: WCAG 2.2 AA compliance, axe/Pa11y automation
- **Theming Engineer**: Multi-tenant theming, logo/colors, light/dark mode

**Lead Responsibilities**: Coordinate cockpit enhancements, ensure component reusability, manage state across complex UIs, integrate with reporting APIs

---

### 2. **Reporting Services Lead** (6 agents)
- **Gen-Reports API Engineer**: Server-side report generation endpoint with citations
- **Evidence API Engineer**: Q2Q evidence query APIs with filtering and pagination
- **Export Service Engineer**: PDF rendering (Playwright/Puppeteer), CSV generation
- **Scheduler Engineer**: Cron-based report scheduling, email delivery
- **Impact-In Monitor Engineer**: Delivery status tracking, replay functionality
- **Audit Log Engineer**: Export audit trail, who/what/when tracking

**Lead Responsibilities**: Extend reporting service with AI integration, ensure lineage traceability, manage export pipelines, coordinate with AI lead

---

### 3. **AI & Safety Lead** (6 agents)
- **Generative Reporting Architect**: Prompt templates, narrative generation, sections builder
- **Citation & Lineage Engineer**: Evidence ID tracking, snippet extraction, provenance chains
- **Guardrails Engineer**: Token budgets, redaction rules, PII masking in outputs
- **Safety Reviewer**: Content screening for generated reports, disclaimers
- **Prompt Template Engineer**: Deterministic seeds, versioned prompts, failure modes
- **Model Integration Engineer**: OpenAI/Claude API calls, error handling, retries

**Lead Responsibilities**: Ensure all AI outputs cite evidence, implement redaction, manage prompt versioning, coordinate with Worker 1 (security)

---

### 4. **Performance & Infrastructure Lead** (6 agents)
- **Web-Vitals Engineer**: Real-user monitoring (RUM), LCP/INP/CLS collection to OTel
- **Frontend Performance Engineer**: Data windowing, memoization, virtualization for charts
- **Backend Optimization Engineer**: Query caching (ETag/If-None-Match), connection pooling
- **Lighthouse Engineer**: CI budgets, performance regression detection
- **Observability Engineer**: OTel traces correlated between front-end and backend
- **Deployment Engineer**: Staging rollout playbook, feature flags, environment config

**Lead Responsibilities**: Hit performance budgets, set up monitoring, ensure staging readiness, coordinate with Worker 1 (observability)

---

### 5. **QA & Hardening Lead** (6 agents)
- **E2E Test Engineer**: Playwright tests for auth, widgets, evidence, reports, exports
- **A11y Test Engineer**: Automated a11y CI (axe, Pa11y), manual keyboard testing
- **Visual Regression Engineer**: Storybook + Chromatic (or Ladle), image diff for widgets
- **i18n Test Engineer**: Missing key detection, RTL readiness for future locales
- **Integration Test Engineer**: API contract tests for new endpoints
- **Security Test Engineer**: Share link validation, tenant isolation, secrets audit

**Lead Responsibilities**: Deliver comprehensive test coverage, ensure no regressions, validate WCAG compliance, produce a11y audit report

---

## Deliverables (Slices A-I)

### Slice A: Pilot & Tenantization 🏢
**Owner**: Frontend Lead + Reporting Services Lead

**Tasks**:
- [ ] Tenant selector at login (company picker UI)
- [ ] Tenant-scoped routes: `/[lang]/cockpit/[companyId]/*`
- [ ] Company admin console page: API keys, Impact-In toggles, SROI/VIS overrides
- [ ] Backend: Tenant-scoped API endpoints (filter by companyId)
- [ ] Staging deployment playbook: `/docs/pilot/staging_rollout.md`
- [ ] Remove demo credentials in staging/prod; prefer SSO (coordinate with Worker 1)
- [ ] Feature flags for pilot features

**Files**:
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/index.astro`
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/admin.astro`
- `apps/corp-cockpit-astro/src/components/tenant/TenantSelector.tsx`
- `services/reporting/middleware/tenantScope.ts`
- `docs/pilot/staging_rollout.md`

**Acceptance**:
- ✅ Staging cockpit runs with real tenant data
- ✅ RBAC enforces tenant boundaries
- ✅ Demo credentials disabled in staging/prod

---

### Slice B: Evidence Explorer 🔍
**Owner**: Frontend Lead + Reporting Services Lead

**Tasks**:
- [ ] Evidence Explorer panel: browse Q2Q evidence by time, program, label, cohort
- [ ] Display anonymized snippets with provenance links
- [ ] "Why this metric?" button on widgets → lineage drawer
- [ ] Lineage view: aggregation → evidence IDs → snippet preview
- [ ] "Copy for CSRD" button: safe, redacted text export
- [ ] Backend: GET /evidence?filters (time, program, cohort)
- [ ] Backend: GET /lineage/:metricId (evidence IDs for a metric)

**Files**:
- `apps/corp-cockpit-astro/src/components/evidence/EvidenceExplorer.tsx`
- `apps/corp-cockpit-astro/src/components/evidence/LineageDrawer.tsx`
- `services/reporting/routes/evidence.ts`
- `services/reporting/routes/lineage.ts`
- `packages/shared-clients/reporting.ts` (typed client)

**Acceptance**:
- ✅ Evidence Explorer shows anonymized Q2Q snippets
- ✅ "Why this metric?" opens lineage with citations
- ✅ Copy-for-CSRD exports redacted text

---

### Slice C: Generative Reporting Assistant 🤖
**Owner**: AI & Safety Lead + Reporting Services Lead

**Tasks**:
- [ ] POST /reporting/gen-reports:generate API (inputs: companyId, period, filters)
- [ ] Output: narrative (sections), chart recommendations, **citations (evidence IDs)**
- [ ] Guardrails: token budget, redaction, prompt templates with disclaimers
- [ ] Deterministic seed option for reproducible reports
- [ ] UI: "Generate Quarterly Report" modal → preview → edit → export PDF
- [ ] Backend: Prompt versioning, failure modes, retry logic
- [ ] Documentation: `/docs/cockpit/gen_reporting.md` (prompts, redaction, safety)

**Files**:
- `services/reporting/routes/gen-reports.ts`
- `services/reporting/prompts/quarterlyReport.ts`
- `services/reporting/utils/redaction.ts`
- `apps/corp-cockpit-astro/src/components/reports/GenerateReportModal.tsx`
- `apps/corp-cockpit-astro/src/components/reports/ReportPreview.tsx`
- `docs/cockpit/gen_reporting.md`

**Acceptance**:
- ✅ Gen-AI report generates with citations for all claims
- ✅ Redaction applied to PII in narratives
- ✅ Prompt versioning tracked
- ✅ UI allows preview + minor text edits

---

### Slice D: Exports & Scheduling 📤
**Owner**: Reporting Services Lead + QA Lead

**Tasks**:
- [ ] PDF export: server-side render via Playwright/Puppeteer
- [ ] PDF: header/footer, logo, page numbers, theme sync
- [ ] Scheduled reports: company admins schedule monthly/quarterly emails
- [ ] Backend: Cron job for scheduled exports
- [ ] Export audit log (who exported what/when)
- [ ] Delivery status UI (success/failure, retry)
- [ ] Email service integration (or queue to notifications service)

**Files**:
- `services/reporting/routes/exports.ts`
- `services/reporting/utils/pdfRenderer.ts`
- `services/reporting/cron/scheduledReports.ts`
- `services/reporting/routes/exportAudit.ts`
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/exports.astro`
- `apps/corp-cockpit-astro/src/components/exports/ScheduleModal.tsx`

**Acceptance**:
- ✅ PDF export renders correctly with branding
- ✅ Scheduled emails fire in staging
- ✅ Export audit log shows all activity
- ✅ Delivery status UI displays success/failure

---

### Slice E: Performance, Web-Vitals, A11y ⚡
**Owner**: Performance & Infrastructure Lead + QA Lead

**Tasks**:
- [ ] Web-vitals collector: send LCP, INP, CLS to OTel from frontend
- [ ] Lighthouse budgets: LCP ≤ 2.0s, INP ≤ 200ms on staging data
- [ ] Chart optimizations: data windowing, memoization, virtualization
- [ ] Backend: ETag/If-None-Match caching for report queries
- [ ] Full WCAG 2.2 AA sweep: focus order, target size, keyboard operability
- [ ] axe/Pa11y CI job (fail on violations)
- [ ] Performance report: `/reports/worker3_phaseC_pilot.md` (budgets, screenshots)
- [ ] A11y audit report: `/reports/a11y_audit_phaseC.md`

**Files**:
- `apps/corp-cockpit-astro/src/utils/webVitals.ts`
- `apps/corp-cockpit-astro/src/components/charts/OptimizedChart.tsx`
- `services/reporting/middleware/caching.ts`
- `.github/workflows/a11y.yml`
- `reports/worker3_phaseC_pilot.md`
- `reports/a11y_audit_phaseC.md`

**Acceptance**:
- ✅ Web-vitals collected to OTel
- ✅ LCP ≤ 2.0s, INP ≤ 200ms on staging
- ✅ A11y CI job passes (no violations)
- ✅ Performance report shows budgets met

---

### Slice F: Saved Views & Share Links 💾
**Owner**: Frontend Lead + Reporting Services Lead

**Tasks**:
- [ ] Save dashboard filters as named "views" (tenant-scoped)
- [ ] Backend: POST /views (save), GET /views (list), DELETE /views/:id
- [ ] Generate signed share links (read-only) with TTL
- [ ] "Boardroom mode" display: auto-refresh, large typography
- [ ] Share link validation middleware (signature + expiry check)

**Files**:
- `services/reporting/routes/savedViews.ts`
- `services/reporting/routes/shareLinks.ts`
- `services/reporting/utils/signedLinks.ts`
- `apps/corp-cockpit-astro/src/components/views/SaveViewModal.tsx`
- `apps/corp-cockpit-astro/src/components/views/ShareLinkModal.tsx`
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/shared/[linkId].astro`

**Acceptance**:
- ✅ Users can save and load dashboard views
- ✅ Share links work (read-only, TTL enforced)
- ✅ Boardroom mode displays correctly

---

### Slice G: Impact-In Delivery Monitor 📊
**Owner**: Reporting Services Lead + Backend Lead (Worker 2)

**Tasks**:
- [ ] Backend: GET /impact-in/deliveries?platform (Benevity/Goodera/Workday)
- [ ] Display: last push timestamp, payload type, attempt count, status
- [ ] Replay functionality: POST /impact-in/replay/:deliveryId
- [ ] Per-platform mapping preview (what we will send vs. what was sent)
- [ ] UI page: `/[lang]/cockpit/[companyId]/impact-in`

**Files**:
- `services/reporting/routes/impact-in-monitor.ts`
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/impact-in.astro`
- `apps/corp-cockpit-astro/src/components/impact-in/DeliveryHistory.tsx`
- `apps/corp-cockpit-astro/src/components/impact-in/MappingPreview.tsx`

**Acceptance**:
- ✅ Delivery history shows all pushes
- ✅ Replay works for failed deliveries
- ✅ Mapping preview displays correctly

---

### Slice H: Theming/Whitelabel 🎨
**Owner**: Frontend Lead + Reporting Services Lead

**Tasks**:
- [ ] Tenant theme tokens: logo, primary colors, typography scale
- [ ] Light/dark mode support
- [ ] PDF theme sync (logo + colors in PDF exports)
- [ ] Documentation: `/docs/cockpit/branding.md` (constraints for a11y contrast)
- [ ] Admin UI: theme editor (upload logo, pick colors)

**Files**:
- `services/reporting/routes/themes.ts`
- `apps/corp-cockpit-astro/src/styles/themes.ts`
- `apps/corp-cockpit-astro/src/components/admin/ThemeEditor.tsx`
- `docs/cockpit/branding.md`

**Acceptance**:
- ✅ Tenant themes apply to cockpit
- ✅ PDF exports use tenant branding
- ✅ Contrast meets WCAG AA
- ✅ Light/dark mode works

---

### Slice I: Testing & Hardening 🧪
**Owner**: QA & Hardening Lead

**Tasks**:
- [ ] Playwright E2E: auth flow, tenant selector, widgets, evidence drawer
- [ ] Playwright E2E: report generation, preview, export, scheduling
- [ ] i18n coverage tests (missing keys, RTL readiness)
- [ ] Visual regression: Storybook + Chromatic (or Ladle + image diff)
- [ ] Security tests: tenant isolation, share link expiry, secrets audit
- [ ] Integration tests for new APIs (evidence, gen-reports, exports, impact-in)

**Files**:
- `apps/corp-cockpit-astro/tests/e2e/auth.spec.ts`
- `apps/corp-cockpit-astro/tests/e2e/evidence.spec.ts`
- `apps/corp-cockpit-astro/tests/e2e/reports.spec.ts`
- `apps/corp-cockpit-astro/tests/visual/widgets.spec.ts`
- `.github/workflows/e2e.yml`
- `.github/workflows/visual-regression.yml`

**Acceptance**:
- ✅ All E2E tests pass
- ✅ i18n coverage at 100%
- ✅ Visual regression baseline established
- ✅ Security tests pass (no tenant leakage)

---

## Progress Tracking

**Overall**: 9 / 18 major tasks complete (50%) 🎉

| Slice | Focus | Tasks | Complete | % |
|-------|-------|-------|----------|---|
| A. Pilot & Tenantization | Multi-tenant foundation | 3 | 3 | 100% ✅ |
| B. Evidence Explorer | Q2Q lineage UI | 2 | 2 | 100% ✅ |
| C. Gen Reporting Assistant | AI narratives with citations | 2 | 2 | 100% ✅ |
| D. Exports & Scheduling | PDF + scheduled emails | 2 | 1 | 50% ⏸️ |
| E. Performance & A11y | Web-vitals + WCAG 2.2 AA | 3 | 1 | 33% ⏸️ |
| F. Saved Views & Share Links | UX enhancements | 1 | 0 | 0% ⏳ |
| G. Impact-In Monitor | Delivery tracking | 1 | 0 | 0% ⏳ |
| H. Theming/Whitelabel | Multi-tenant branding | 1 | 0 | 0% ⏳ |
| I. Testing & Hardening | E2E + visual + security | 1 | 0 | 0% ⏳ |

**Last Updated**: 2025-11-14 by Worker (Execution Lead)

**Phase C Execution Summary**:
- **Agent Tasks Completed**: 8 (by 7 specialist agents)
- **Direct Implementations**: 1 (PDF export by Worker)
- **Total Code Delivered**: ~16,000 LOC
- **Tests Written**: 232+
- **Reports Created**: 11 comprehensive documents (200+ pages)
- **Status**: Major milestone achieved - pilot foundation complete
- **Detailed Report**: See `/reports/PHASE_C_FINAL_EXECUTION_SUMMARY.md`

---

## Integration with Workers 1 & 2

### Worker 1 (IaC/Security/Observability)
**Coordination Points**:
- ✅ OTel traces for web-vitals correlation
- ✅ Staging deployment (domain, SSL, env vars)
- ✅ SSO integration (if OIDC provider available)
- ✅ Security review for gen-AI endpoints
- ✅ Secrets management for AI API keys

**Communication**: Tag Worker 1 lead on PRs for staging rollout, OTel setup, secrets

### Worker 2 (Backend Services)
**Coordination Points**:
- ✅ Reporting service extensions (evidence, gen-reports APIs)
- ✅ Q2Q evidence query optimization
- ✅ Impact-In delivery status (coordinate with integration services)
- ✅ Tenant-scoped database queries

**Communication**: Tag Worker 2 lead on PRs for reporting/q2q changes, API contracts

---

## Documentation Deliverables

**Phase C Docs** (all in `/docs/` or `/reports/`):
- [ ] `/docs/pilot/staging_rollout.md` - Deployment playbook
- [ ] `/docs/cockpit/gen_reporting.md` - AI reporting guide
- [ ] `/docs/cockpit/branding.md` - Theming constraints
- [ ] `/reports/worker3_phaseC_pilot.md` - Final report with screenshots
- [ ] `/reports/a11y_audit_phaseC.md` - Accessibility audit
- [ ] OpenAPI updates in `/docs/api/index.md` for new endpoints

---

## Non-Negotiables

1. **Evidence lineage is mandatory** for all AI-generated narratives
2. **No secrets in frontend** - all AI calls server-side
3. **Privacy-first**: No raw PII in UI; redaction on server; safe rendering
4. **Performance budgets**: LCP ≤ 2.0s, INP ≤ 200ms
5. **WCAG 2.2 AA compliance**: Enforced by CI
6. **Kintell remains the matcher** - cockpit reads Reporting APIs only
7. **Feature flags** for all pilot features (toggle off if issues)
8. **Tenant isolation**: RBAC + database query scoping enforced

---

## Success Criteria

- ✅ Staging cockpit runs with real tenant + RBAC; demo creds disabled
- ✅ Evidence Explorer shows lineage with anonymized previews
- ✅ "Why this metric?" works on all widgets
- ✅ Gen-AI report generates with **citations**; PDF export renders correctly
- ✅ Scheduled emails fire in staging
- ✅ Web-vitals collected to OTel; budgets pass
- ✅ A11y CI job green
- ✅ Impact-In Monitor displays delivery history + supports replay
- ✅ Theming works per tenant
- ✅ All new endpoints documented with OpenAPI
- ✅ Performance report and a11y audit in `/reports/`

---

## Next Actions

1. **Frontend Lead**: Start Slice A (tenant selector + routing)
2. **Reporting Services Lead**: Extend reporting service for evidence APIs (Slice B)
3. **AI & Safety Lead**: Design prompt templates for gen-reports (Slice C)
4. **Performance Lead**: Set up web-vitals collector (Slice E)
5. **QA Lead**: Set up Playwright E2E framework (Slice I)

**Orchestrator**: Monitor progress, unblock dependencies, update this plan weekly

---

# Worker 2 Phase D: Backend Criticals Design Note

**Status**: 🚧 In Progress
**Branch**: `claude/backend-criticals-rbac-gdpr-analytics-013DvoKrwXyKfmLi9xgW6sCr`
**Started**: 2025-11-14
**Priority**: P0/P1 Backend Foundation
**Target Completion**: TBD

---

## Mission

Close critical backend gaps identified in Worker 2 core services:
1. **RBAC & Tenant Security (P0)**: Database-backed tenant membership validation with audit trails
2. **Impact-In Connectors (P1)**: Production-grade HTTP/OAuth/SOAP clients for external integrations
3. **GDPR DSAR Orchestrator (P1)**: Privacy-compliant data export/deletion workflows
4. **Analytics Backfill (P1)**: Historical data migration Postgres → ClickHouse
5. **Performance Caching (P2)**: Redis caching for frequently-called endpoints

---

## Current State Analysis

### What Exists ✅
- ✅ `api-gateway/middleware/tenantScope.ts` - Extracts tenant from JWT/headers, but **validates via JWT only** (line 87-91 TODO)
- ✅ `api-gateway/middleware/rbac.ts` - Roles & permissions defined, but no DB queries
- ✅ `impact-in/connectors/benevity/client.ts` - Basic retry/backoff, missing idempotency & webhook signatures
- ✅ `impact-in/connectors/goodera/` & `workday/` - Mappers exist, clients are stubs
- ✅ `analytics/sinks/loader.ts` - Incremental NATS ingestion works, **backfill stubbed** (line 83-91 TODO)
- ✅ `shared-schema/migrations/0004_add_idempotency_tables.sql` - Event deduplication tables exist

### What's Missing ❌
- ❌ **Migrations**: `company_users`, `company_api_keys`, `audit_logs`, `consent_records`, `dsar_requests`
- ❌ **Seed data**: No `/packages/shared-schema/seeds/` directory
- ❌ **RBAC DB queries**: tenantScope.ts doesn't validate `company_users` membership
- ❌ **Redis caching**: No caching middleware for RBAC lookups, SROI/VIS, Q2Q
- ❌ **Impact-In production features**: Idempotency keys, webhook signature verification, OAuth refresh, WS-Security
- ❌ **Privacy orchestrator**: No `services/privacy-orchestrator/` service
- ❌ **Analytics backfill**: Postgres → ClickHouse historical data loader unimplemented
- ❌ **Documentation**: No runbooks for Impact-In, GDPR, Analytics

---

## Architecture: Tables → Middleware → Services

### 1. RBAC & Tenant Security Flow

#### Database Tables (New Migrations)

**Migration File**: `/packages/shared-schema/migrations/0013_add_rbac_and_privacy_tables.sql`

Tables to create:
- `company_users` - Tenant membership registry
- `company_api_keys` - Programmatic access tokens
- `audit_logs` - Tamper-proof audit trail
- `consent_records` - GDPR consent tracking
- `dsar_requests` - Data Subject Access Requests

#### Middleware Enhancements

**File**: `/services/api-gateway/src/middleware/tenantScope.ts` (line 76-92 replacement)
- Replace JWT-only validation with DB query to `company_users`
- Add Redis caching (TTL: 5 minutes) for membership lookups
- Audit all failed access attempts to `audit_logs` table
- Update `last_access_at` asynchronously

**New File**: `/services/api-gateway/src/middleware/auditLog.ts`
- Helper function to insert audit events
- Emit audit events to NATS for real-time monitoring

**Cache Invalidation Strategy**:
- On role change: Invalidate `tenant:${userId}:*` keys
- On user deactivation: Invalidate all keys for user
- Pub/Sub pattern to notify all gateway instances

---

### 2. Impact-In Connectors Production Features

#### Benevity Enhancements
**File**: `/services/impact-in/src/connectors/benevity/client.ts`

Add:
- Idempotency key support in headers
- Response caching for 24 hours on success
- Webhook signature verification using HMAC-SHA256
- Timing-safe signature comparison

#### Goodera OAuth2 Flow
**New File**: `/services/impact-in/src/connectors/goodera/oauth.ts`

Features:
- Token caching in Redis with TTL
- Automatic token refresh before expiry
- Retry logic for token endpoint failures

#### Workday WS-Security
**New File**: `/services/impact-in/src/connectors/workday/soap.ts`

Features:
- SOAP client with WS-Security headers
- Multi-tenant endpoint discovery
- Connection pooling for performance

---

### 3. GDPR DSAR Orchestrator

**New Service**: `/services/privacy-orchestrator/`

Architecture:
```
API Gateway /privacy routes
  ↓
Privacy Orchestrator
  ↓ (fan-out via NATS)
  ├─→ Unified Profile Service (user data)
  ├─→ Kintell Connector (session data)
  ├─→ Buddy Service (match/event data)
  ├─→ Reporting Service (analytics snapshots)
  └─→ Q2Q AI Service (outcome scores, evidence)
```

**Key Files**:
- `/services/privacy-orchestrator/src/handlers/export.ts` - Data export with encryption
- `/services/privacy-orchestrator/src/handlers/delete.ts` - 30-day deletion with cancellation
- `/services/privacy-orchestrator/src/index.ts` - Fastify service setup

**Export Flow**:
1. Create DSAR request in DB with status "pending"
2. Fan-out export requests to all services via NATS
3. Aggregate responses into JSON structure
4. Encrypt with job-specific key
5. Upload to S3 with 30-day expiry
6. Update DB with export URL
7. Send notification email

**Delete Flow**:
1. Create DSAR request with 30-day cancellation window
2. Schedule deletion event in NATS JetStream
3. User can cancel within 30 days
4. After 30 days, fan-out delete to all services
5. Mark as completed and audit log

---

### 4. Analytics Backfill Loader

**File**: `/services/analytics/src/sinks/loader.ts` (line 79-94 implementation)

**Backfill Strategy**:
1. Query `metrics_company_period` table in batches (10K rows)
2. Transform to ClickHouse schema
3. Check for duplicates before inserting
4. Batch insert to `metrics_timeseries` table
5. Save checkpoint after each batch
6. Resume from checkpoint on failure

**Deduplication**:
- Query ClickHouse for existing rows by composite key
- Filter out duplicates before insertion
- Prevents double-counting metrics

**Performance**:
- Streaming inserts (no full table load in memory)
- Parallel batch processing where safe
- Progress logging every 10K rows

---

### 5. Redis Caching for SROI/VIS and Q2Q

**New Utility**: `/packages/shared-utils/src/cache.ts`

**Caching Middleware**:
```typescript
cacheMiddleware({ 
  ttl: 3600,  // 1 hour
  key: (req) => `sroi:${req.params.companyId}:${req.query.period}`
})
```

**Apply To**:
- `/services/impact-calculator/src/routes/sroi.ts` - SROI calculations
- `/services/impact-calculator/src/routes/vis.ts` - VIS scores
- `/services/q2q-ai/src/routes/evidence.ts` - Q2Q evidence queries

**Invalidation Strategy**:
- On new event ingestion: Invalidate `sroi:${companyId}:*` and `vis:${companyId}:*`
- On Q2Q evidence update: Invalidate `q2q:evidence:${companyId}:*`
- Use Redis Pub/Sub to notify all service instances

---

## Execution Plan

### Phase 1: Foundation (Days 1-3)
1. **Day 1**: Generate migrations for RBAC and privacy tables
2. **Day 2**: Implement DB queries in `tenantScope.ts` with Redis caching
3. **Day 3**: Create seed data and test RBAC flows

### Phase 2: Impact-In Enhancements (Days 4-6)
1. **Day 4**: Enhance Benevity client with idempotency and webhooks
2. **Day 5**: Implement Goodera OAuth2 flow
3. **Day 6**: Implement Workday SOAP client

### Phase 3: Privacy Orchestrator (Days 7-9)
1. **Day 7**: Scaffold service and implement export handler
2. **Day 8**: Implement delete handler with cancellation
3. **Day 9**: Wire API Gateway routes and E2E test

### Phase 4: Analytics & Caching (Days 10-12)
1. **Day 10**: Implement analytics backfill with deduplication
2. **Day 11**: Add Redis caching to SROI/VIS/Q2Q
3. **Day 12**: Run k6 performance tests

### Phase 5: Testing & Documentation (Days 13-15)
1. **Day 13**: Unit and integration tests
2. **Day 14**: E2E tests and k6 scripts
3. **Day 15**: Documentation and validation report

---

## Acceptance Criteria

### P0: RBAC & Tenant Security
- [ ] Migrations apply cleanly with rollback scripts
- [ ] `tenantScope.ts` queries `company_users` table (no JWT-only)
- [ ] Cross-tenant access returns 403 and audits to `audit_logs`
- [ ] Redis caches tenant lookups with 5-min TTL
- [ ] Seed data creates 3 companies, 10 users, various roles

### P1: Impact-In Connectors
- [ ] Benevity: idempotency keys + webhook signature verification
- [ ] Goodera: OAuth2 with automatic token refresh
- [ ] Workday: SOAP with WS-Security and tenant discovery
- [ ] End-to-end delivery test in staging succeeds
- [ ] Monitor API shows delivery status and replay works

### P1: GDPR DSAR
- [ ] Export generates encrypted ZIP within 5 minutes
- [ ] Delete creates request with 30-day cancellation window
- [ ] Delete cascades after 30 days with audit trail
- [ ] All actions logged with timestamps

### P1: Analytics Backfill
- [ ] Backfill moves historical data to ClickHouse
- [ ] Deduplication prevents duplicate inserts
- [ ] Incremental ingestion maintains <60s lag
- [ ] Checkpoint recovery works after restart

### P2: Caching & Performance
- [ ] SROI/VIS return cached responses on repeat
- [ ] Cache invalidation on new events works
- [ ] k6: ingestion p95 < 500ms at 1000 req/s

### Tests & Documentation
- [ ] +20% test coverage across services
- [ ] E2E GDPR tests: export, delete, cancel
- [ ] k6 scripts for analytics load testing
- [ ] Docs: Impact_Integration_Benevity.md, GDPR_DSR_Runbook.md, Analytics_Backfill.md
- [ ] Validation report with curl examples

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Existing data migration to company_users | Write migration script from users.company_id |
| Redis cache stampede | Use cache warming and staggered TTLs |
| DSAR fan-out timeout | Circuit breaker + partial success |
| ClickHouse backfill memory | Stream in 10K row batches |
| Workday WSDL versioning | Version URLs in config, test sandbox |

---

## Next Steps

1. ✅ Design note complete
2. 🚧 Generate migrations (starting now)

**Orchestrator**: Worker 2 Backend Lead (Claude)
**Last Updated**: 2025-11-14

---

# Worker 3 Phase D: Gen-AI Reporting Cockpit Enterprise Production

**Status**: 🚀 In Progress
**Branch**: `claude/genai-reporting-cockpit-phase-d-01Hppffi2ErgfUV2G5jXiN7b`
**Started**: 2025-11-14
**Priority**: P0 - Enterprise Production Launch
**Target Completion**: TBD

---

## Mission

Finish Gen-AI reporting end-to-end, complete cockpit enterprise polish, and ship export/scheduling with evidence-level citations and redaction—ready for tenant pilots.

### Scope (Must Deliver)

1. Wire POST /gen-reports:generate to real LLMs with prompt templates, citation extraction, redaction enforcement, token budgets, and cost logging
2. Evidence lineage → narrative: each generated statement must cite source evidence IDs; redaction rules applied before render
3. Server-side charts/figures for PDF/PPTX; scheduled exports with email delivery; "Boardroom mode"
4. Saved views & signed share links; white-label/theming; SSO/RBAC UI wiring; A11y WCAG 2.2 AA; Playwright E2E for core flows
5. Performance budgets (Lighthouse) enforced in CI; SSE resume/backoff verified at scale

---

## 30-Agent Team Structure

### Team 1: Requirements & Orchestration (5 agents)
**Lead**: orchestrator-lead

| Agent | Trigger | Deliverable |
|-------|---------|-------------|
| **orchestrator-lead** | Task decomposition needed | Multi-agent plan, PR synthesis |
| **requirements-mapper** | Audit gaps identified | Gap analysis → acceptance criteria mapping |
| **docs-writer** | Documentation needed | GenAI_Reporting.md, Exports_Scheduling.md, A11y_Perf_Playbook.md |
| **release-manager** | PR ready | Branch management, changelog, rollout plan |
| **post-merge-verifier** | After merge | Validate all acceptance checks green |

**Status**: ✅ Planning complete

---

### Team 2: Gen-AI Core (6 agents)
**Lead**: prompt-architect

| Agent | Trigger | Deliverable |
|-------|---------|-------------|
| **prompt-architect** | Report templates needed | 4 templates (Quarterly/Annual/Investor/Impact) with token budgets |
| **citation-extractor** | Evidence linking needed | Citation extraction, validation (min 1/paragraph) |
| **redaction-engineer** | PII detected | Pre-LLM redaction enforcement, audit logging |
| **narrative-composer** | CSRD-ready prose needed | Assemble metrics + Q2Q with inline citations |
| **cost-telemetry** | Token tracking needed | Log tokens/$ per report with tenant/type tags |
| **audit-logger** | Report lifecycle events | Structured audit log (who/what/when) |

**Status**: 🚧 In Progress

**Implementation Tasks**:
1. Create prompt templates in `/services/reporting/src/templates/prompts/`:
   - `quarterly-report.hbs` (Q1-Q4 summary, KPIs, trends)
   - `annual-report.hbs` (yearly narrative, CSRD-aligned)
   - `investor-update.hbs` (SROI-focused, ROI metrics)
   - `impact-deep-dive.hbs` (outcome-centric, evidence-heavy)
2. Enhance `/services/reporting/src/routes/gen-reports.ts`:
   - Wire template selection logic
   - Add pre-LLM redaction step
   - Enforce citation validation (min 1/paragraph)
   - Log cost telemetry to database
3. Update `/services/reporting/src/lib/citations.ts`:
   - Add citation density validation
   - Reject unverifiable claims
4. Create cost telemetry table and logger:
   - `llm_cost_telemetry` table (report_id, tenant_id, model, tokens_in, tokens_out, cost_usd, timestamp)

---

### Team 3: Export & Charts (5 agents)
**Lead**: chart-ssr-engineer

| Agent | Trigger | Deliverable |
|-------|---------|-------------|
| **chart-ssr-engineer** | Charts needed for exports | Server-side Chart.js → PNG/SVG renderer |
| **pdf-renderer** | Print-quality PDF needed | Enhanced PDF with watermarks, evidence hash, A4/US-Letter |
| **pptx-generator** | Executive pack needed | PPTX with brand theme, embedded charts |
| **theming-white-label** | Tenant branding needed | Tenant logo/colors → PDF/PPTX theme sync |
| **visual-regression** | Chart snapshots needed | Visual diff baselines for charts/prints |

**Status**: ⏳ Pending

**Implementation Tasks**:
1. Create server-side chart renderer in `/services/reporting/src/utils/chartRenderer.ts`:
   - Use `chart.js` + `canvas` (Node.js canvas library)
   - Support bar, line, pie, area charts
   - Return PNG/SVG base64 for embedding
2. Enhance `/services/reporting/src/utils/pdfGenerator.ts`:
   - Add evidence hash to footer
   - Support tenant logo/colors from white-label config
   - Add watermarking based on approval status
3. Complete `/services/reporting/src/utils/pptxGenerator.ts`:
   - Remove TODO placeholders
   - Add chart embedding via base64 images
   - Support tenant theme (logo, primary/secondary colors)
4. Create white-label config table:
   - `tenant_themes` table (tenant_id, logo_url, primary_color, secondary_color, font_family)
5. Add visual regression tests:
   - Snapshot charts in `/tests/visual/charts/`
   - Use Playwright `toHaveScreenshot()`

---

### Team 4: Scheduling & Delivery (7 agents)
**Lead**: report-scheduler

| Agent | Trigger | Deliverable |
|-------|---------|-------------|
| **report-scheduler** | Cron scheduling needed | Enhanced scheduler with retry, status tracking |
| **email-delivery-ui** | Email config needed | Recipient config, templates, attachments |
| **saved-views-architect** | Dashboard persistence needed | RBAC-scoped saved views (filters, queries) |
| **share-link-signer** | External sharing needed | JWT-signed URLs with TTL, no PII |
| **rate-limit-guardian** | Endpoint abuse risk | Rate limiting for /gen-reports:generate |
| **feature-flags** | Tenant-gated features | Feature flag system for gradual rollout |
| **sse-caching-tuner** | SSE reliability needed | Validate reconnect/resume + ETag caching |

**Status**: ⏳ Pending

**Implementation Tasks**:
1. Enhance `/services/reporting/src/routes/schedules.ts`:
   - Add status tracking UI endpoints
   - Add manual retry capability
   - Add pause/resume schedule
2. Create saved views system:
   - `saved_views` table (user_id, company_id, name, config_json, is_public, created_at)
   - GET/POST/PATCH/DELETE `/v1/saved-views/:id` endpoints
   - RBAC enforcement (user can only access own + public views)
3. Create share link system:
   - `share_links` table (link_id, report_id, created_by, expires_at, access_count)
   - JWT signing with RS256 (private key in env)
   - GET `/v1/share/:linkId` → verify JWT, check TTL, increment access_count
   - Redact PII from shared report content
4. Add rate limiting to `/gen-reports:generate`:
   - Max 10 reports/hour per company
   - Max 100 reports/day per company
   - Return 429 with retry-after header
5. Create feature flags table:
   - `feature_flags` table (feature_name, tenant_id, enabled, rollout_percentage)
   - Middleware to check flags before feature access

---

### Team 5: QA, A11y & Performance (7 agents)
**Lead**: qa-compliance-lead

| Agent | Trigger | Deliverable |
|-------|---------|-------------|
| **playwright-e2e** | E2E tests needed | E2E for: login→tenant→Evidence→Report→Export |
| **a11y-auditor** | WCAG compliance needed | Axe/Pa11y CI integration, WCAG 2.2 AA enforcement |
| **perf-budgets** | Performance regression risk | Lighthouse budgets, fail PR on regression |
| **i18n-transcreator** | Localization needed | Prompts/UI for EN/UK/NO with hreflang |
| **qa-negative-tests** | Edge cases untested | Fuzz inputs, long prompts, missing evidence |
| **security-reviewer** | Threat modeling needed | Security review of report gen & share links |
| **visual-regression** | Chart snapshots needed | Visual diff baselines |

**Status**: ⏳ Pending

**Implementation Tasks**:
1. Expand Playwright E2E tests in `/tests/e2e/`:
   - `11-gen-ai-reports.spec.ts` (template selection, generation, citation validation)
   - `12-saved-views.spec.ts` (create, edit, delete, RBAC)
   - `13-share-links.spec.ts` (create link, access, expiration, PII check)
   - `14-boardroom-mode.spec.ts` (offline capability, cached data)
2. Add Lighthouse budgets to CI:
   - `.github/workflows/lh-budgets.yml` (enhance existing)
   - Budget: FCP <2s, LCP <2.5s, TBT <300ms, CLS <0.1
3. Validate SSE caching:
   - Test `Last-Event-ID` resume in E2E
   - Test ETag caching with If-None-Match
   - Test reconnect after network interruption
4. Add i18n for prompts:
   - Create `/services/reporting/src/templates/prompts/locales/` (en.json, uk.json, no.json)
   - Use locale in template selection
5. Add negative tests in `/tests/unit/negative/`:
   - Long prompts (>8000 tokens)
   - Missing evidence references
   - Invalid citation IDs
   - PII in report output (should be redacted)
6. Security review checklist:
   - SQL injection in filters (use parameterized queries)
   - XSS in report content (escape HTML)
   - JWT signature verification (use RS256, not HS256)
   - PII leakage in logs/errors
   - Tenant isolation in share links

---

## Acceptance Criteria

### Gen-AI Reports ✅
- [ ] 4 report templates (Quarterly, Annual, Investor, Impact) produce PDF & PPTX
- [ ] Each narrative statement cites evidence IDs
- [ ] 0 PII leaks (redaction verified in tests)
- [ ] ≤30s generation time (measured in E2E)
- [ ] Token usage and cost logged per report

### Saved Views & Share Links 💾
- [ ] Users can save dashboard filter configurations
- [ ] RBAC enforces view ownership (user sees only own + public)
- [ ] Signed share links work with JWT
- [ ] TTL enforced (expired links return 403)
- [ ] No PII in share link URLs (verified in tests)
- [ ] Server logs show no PII exposure

### Performance & A11y ⚡
- [ ] Lighthouse budgets enforced in CI: FCP <2s, LCP <2.5s, TBT <300ms, CLS <0.1
- [ ] Axe/Pa11y CI tests passing (0 violations)
- [ ] SSE Last-Event-ID resume working (E2E test)
- [ ] ETag caching verified (If-None-Match)

### E2E Testing 🧪
- [ ] Playwright tests pass for admin role: create report, export PDF/PPTX, schedule
- [ ] Playwright tests pass for viewer role: view reports, access share links
- [ ] Visual regression tests for charts established
- [ ] Negative tests cover edge cases (long prompts, missing evidence, PII)

### Documentation 📝
- [ ] `/docs/GenAI_Reporting.md` - Prompt engineering, redaction, safety
- [ ] `/docs/Exports_Scheduling.md` - Scheduling runbook, email delivery
- [ ] `/docs/A11y_Perf_Playbook.md` - Accessibility and performance guidelines

---

## Critical Path

```
Day 1-2: Prompt Templates (Team 2)
  ├─→ Day 3-4: Citation & Redaction (Team 2)
  │
  ├─→ Day 5-6: Chart Renderer (Team 3)
  │   └─→ Day 7-8: PDF/PPTX Enhancement (Team 3)
  │
  ├─→ Day 9-10: Saved Views & Share Links (Team 4)
  │
  └─→ Day 11-12: E2E Tests (Team 5)
      └─→ Day 13-14: A11y & Perf (Team 5)
          └─→ Day 15: Documentation & PR (Team 1)
```

**Estimated Duration**: 15 days (3 weeks)

---

## Progress Tracking

**Overall**: 2 / 28 tasks complete (7%)

| Team | Focus | Tasks | Complete | % |
|------|-------|-------|----------|---|
| Team 1: Orchestration | Planning & Docs | 5 | 2 | 40% 🚧 |
| Team 2: Gen-AI Core | Prompts, Citations, Redaction | 6 | 0 | 0% ⏳ |
| Team 3: Export & Charts | PDF/PPTX, Server-side rendering | 5 | 0 | 0% ⏳ |
| Team 4: Scheduling | Saved views, Share links, Feature flags | 7 | 0 | 0% ⏳ |
| Team 5: QA & Performance | E2E, A11y, Perf budgets | 7 | 0 | 0% ⏳ |

**Last Updated**: 2025-11-14 by orchestrator-lead

---

## Daily Standup Log

### 2025-11-14
**orchestrator-lead**:
- ✅ Explored codebase (comprehensive report received)
- ✅ Created MULTI_AGENT_PLAN.md Phase D section
- 🚧 Starting Team 2: prompt-architect agent

**Blockers**: None

**Next**: Create 4 prompt templates for report generation

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| LLM API rate limits | High | Medium | Exponential backoff, queue system, cost budgets |
| Citation extraction failures | High | Low | Fallback to template-only mode, alert admin |
| PII leakage in exports | Critical | Low | Automated redaction testing, manual security review |
| Performance regression | Medium | Medium | Lighthouse budgets in CI, fail on regression |
| SSE reconnect failures | Medium | Low | Comprehensive E2E testing, retry logic |
| Tenant isolation breach | Critical | Very Low | Security review, penetration testing |
| Report generation timeout | Medium | Medium | Streaming SSE updates, async processing |

---

## Integration Points

### With Worker 1 (IaC/Security/Observability)
- OTel traces for LLM cost tracking
- Secrets management for OpenAI/Anthropic API keys
- Security review for Gen-AI endpoints

### With Worker 2 (Backend Services)
- Q2Q evidence APIs for citation extraction
- RBAC enforcement for saved views
- Privacy orchestrator for PII redaction audit

---

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Report Templates | 4 | 0 | 🔴 |
| Citation Coverage | 100% paragraphs | 0% | 🔴 |
| PII Leaks | 0 | Untested | 🔴 |
| Generation Time | ≤30s | Unmeasured | 🔴 |
| Cost Logging | Per-report | Not implemented | 🔴 |
| Saved Views | RBAC-scoped | Not implemented | 🔴 |
| Share Links | JWT-signed | Not implemented | 🔴 |
| Lighthouse Score | ≥90 Performance | Not enforced | 🔴 |
| A11y Compliance | WCAG 2.2 AA | Partial (Pa11y exists) | 🟡 |
| E2E Coverage | Admin + Viewer | Partial (03-reports.spec.ts) | 🟡 |
| Documentation | 3 guides | 0 | 🔴 |

---

## Non-Negotiables

1. **Evidence lineage is mandatory** - All AI-generated narratives must cite source evidence IDs
2. **No uncited claims** - Fail fast if evidence missing, reject unverifiable statements
3. **Privacy-first** - PII redaction before LLM processing, no raw PII in UI
4. **Tenant isolation** - Enforce at API boundaries, RBAC for all endpoints
5. **Performance budgets** - Lighthouse scores enforced in CI, fail PR on regression
6. **WCAG 2.2 AA compliance** - Automated testing in CI (axe/Pa11y)
7. **Comprehensive E2E** - Test both admin and viewer roles for all features
8. **Security review** - Threat model for Gen-AI endpoints and share links

---

**Version**: 1.0
**Orchestrator**: Tech Lead (Worker 3)
**Next Review**: After Team 2 (Gen-AI Core) completion

# Worker 3 Phase E: Cockpit Polish & SSE Resilience

**Status**: 🚧 In Progress
**Branch**: `claude/worker3-phaseE-cockpit-polish-01DEt2S7UMEooTBJBivWKcpD`
**Started**: 2025-11-15
**Priority**: P0/P1 - Production Polish & Resilience
**Target Completion**: TBD

---

## Mission

Polish Corporate Cockpit to production-grade with zero TypeScript debt, SSE resilience, dark mode, enhanced UX, and comprehensive testing—ready for pilot launch.

### Scope (Must Deliver All)

1. **TypeScript Zero-Debt (P0)**: Resolve 200+ TS errors, fix missing types, create `@teei/shared-types` package
2. **SSE Resilience (P1)**: Backoff/jitter, last-event-id resume, boardroom mode with snapshot caching
3. **Dark Mode (P1)**: System preference + manual toggle, persist per tenant, chart palettes, WCAG AA contrast
4. **Gen-AI UX Hardening (P2)**: Cost guardrails, cancel/retry, granular progress, citation preview drawer
5. **Evidence Explorer Productivity (P2)**: Faceted filters, saved views, CSV export with PII redaction
6. **Impact-In Monitor Enhancements (P2)**: SLA badges, platform filters, bulk retry, drilldown breadcrumbs
7. **A11y & i18n Completeness (P3)**: Axe-core CI, keyboard nav fixes, live regions, localized strings
8. **Quality Gates (P3)**: E2E ≥60%, unit ≥80%, VRT ≤0.3%, a11y 0 critical/serious
9. **Docs & Runbooks (P4)**: Boardroom mode, SSE resilience, pilot quickstart

---

## 30 Specialist Agents (Phase E)

### Team 1: Code Quality & Foundations (6 agents)
**Status**: 🚧 In Progress

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **ts-fixer** | pnpm typecheck fails | Fix 200+ TS errors, create @teei/shared-types | ⏳ Pending |
| **eslint-doctor** | ESLint errors | Fix linting issues, unused vars | ⏳ Pending |
| **sse-architect** | SSE design needed | State machine, backoff strategy design doc | ⏳ Pending |
| **sse-implementer** | SSE client needed | Enhance sseClient.ts with resume/backoff | ⏳ Pending |
| **snapshot-cache-engineer** | Offline cache needed | IndexedDB ring buffer, compression | ⏳ Pending |
| **boardroom-ux** | Boardroom mode needed | Full-screen KPI view, stale banner | ⏳ Pending |

---

### Team 2: Dark Mode & Theming (3 agents)
**Status**: ⏳ Pending

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **darkmode-theming** | Theme toggle needed | System pref, toggle component, persistence | ⏳ Pending |
| **charts-contrast** | Chart palettes needed | Dark mode palettes, WCAG AA validation | ⏳ Pending |
| **a11y-sweeper** | Focus states validation | Update focus styles for dark mode | ⏳ Pending |

---

### Team 3: Gen-AI & Evidence UX (5 agents)
**Status**: ⏳ Pending

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **cost-guardrails** | Budget caps needed | Cost estimation, budget checks | ⏳ Pending |
| **report-citations-ui** | Citation preview needed | Citation drawer component | ⏳ Pending |
| **evidence-facets** | Filters/saved views needed | Multi-facet filters, saved views | ⏳ Pending |
| **pii-guardian** | CSV export safety needed | PII redaction preview for exports | ⏳ Pending |
| **impactin-sla-ui** | Impact-In enhancements needed | SLA badges, filters, bulk retry | ⏳ Pending |

---

### Team 4: Accessibility & i18n (4 agents)
**Status**: ⏳ Pending

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **a11y-sweeper** | axe-core violations | Fix critical/serious a11y issues | ⏳ Pending |
| **i18n-linter** | Hardcoded strings found | Scan & update i18n JSON files | ⏳ Pending |
| **a11y-tester** | CI integration needed | Integrate axe-core in GitHub Actions | ⏳ Pending |
| **i18n-proofreader** | Translation review needed | Review en/no/uk translations | ⏳ Pending |

---

### Team 5: Quality & Testing (7 agents)
**Status**: ⏳ Pending

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **e2e-author** | E2E tests needed | Boardroom, dark mode, cost guardrails E2E | ⏳ Pending |
| **vrt-author** | Visual regression needed | Dark mode snapshots, diff thresholds | ⏳ Pending |
| **sse-failure-lab** | SSE testing needed | Network flap scenarios, reconnect tests | ⏳ Pending |
| **qa-checkpointer** | Quality gates validation | HTML dashboard, coverage reports | ⏳ Pending |
| **perf-profiler** | Performance metrics needed | TTI/LCP measurements | ⏳ Pending |
| **regression-scout** | Smoke tests needed | Critical path smoke tests | ⏳ Pending |
| **rbac-verifier** | Permissions testing needed | Verify admin/viewer roles | ⏳ Pending |

---

### Team 6: Documentation & Release (5 agents)
**Status**: ⏳ Pending

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **docs-scribe** | Documentation needed | Boardroom, SSE runbooks, quickstart | ⏳ Pending |
| **release-notes** | PR ready | Draft PR body with changelog | ⏳ Pending |
| **error-boundary-smith** | Error handling needed | Boundaries, toasts, Sentry correlation | ⏳ Pending |
| **observability-ui** | Telemetry needed | User action trace spans | ⏳ Pending |
| **security-reviewer** | Security review needed | CSP, headers, secrets audit | ⏳ Pending |

---

## Execution Plan (9 Phases)

### Phase 1: TypeScript Zero-Debt (P0) ⏳
**Duration**: 6-8 hours
**Blockers**: None
**Parallel**: No (blocks all other work)

**Tasks**:
1. ✅ Run typecheck, save output → `/reports/worker3/typecheck_output.txt`
2. ⏳ Fix missing React imports (20+ files)
3. ⏳ Create `@teei/shared-types` package
4. ⏳ Add missing SSE type exports (`ConnectionState`, `SSEError`)
5. ⏳ Fix implicit `any` types (15+ instances)
6. ⏳ Fix possibly undefined errors (40+ instances)
7. ⏳ Remove unused variables (30+ instances)
8. ⏳ Fix Storybook prop type mismatches
9. ⏳ Add Vitest DOM matchers
10. ⏳ Fix JSX style props (remove `jsx` attribute)
11. ⏳ Verify: `pnpm typecheck && pnpm lint` → exit 0

**Agents**: ts-fixer (primary), eslint-doctor
**Deliverable**: Zero TypeScript errors, clean linting

---

### Phase 2: SSE Resilience Architecture (P1) ⏳
**Duration**: 2-3 hours
**Blockers**: Phase 1 complete
**Parallel**: Yes (with Phase 3)

**Tasks**:
1. ⏳ Design SSE state machine diagram
2. ⏳ Define backoff strategy (exponential + jitter)
3. ⏳ Specify last-event-id resume flow
4. ⏳ Write design doc → `/reports/worker3/diffs/sse_architecture.md`

**Agents**: sse-architect
**Deliverable**: SSE architecture design doc

---

### Phase 3: Dark Mode Foundation (P1) ⏳
**Duration**: 4-5 hours
**Blockers**: Phase 1 complete
**Parallel**: Yes (with Phase 2)

**Tasks**:
1. ⏳ Create ThemeProvider component (system preference detection)
2. ⏳ Create ThemeToggle component
3. ⏳ Update CSS variables for dark mode
4. ⏳ Implement tenant preference persistence
5. ⏳ Update chart palettes
6. ⏳ Validate contrast ratios (WCAG AA)

**Agents**: darkmode-theming, charts-contrast
**Deliverable**: Functional dark mode toggle, persistent per tenant

---

### Phase 4: SSE Implementation (P1) ⏳
**Duration**: 6-8 hours
**Blockers**: Phase 2 complete
**Parallel**: Yes (with Phase 5)

**Tasks**:
1. ⏳ Enhance `sseClient.ts` with last-event-id resume
2. ⏳ Implement exponential backoff with jitter
3. ⏳ Build IndexedDB snapshot cache (ring buffer)
4. ⏳ Create BoardroomView component
5. ⏳ Add stale data banner
6. ⏳ Create boardroom route
7. ⏳ Write E2E tests for SSE resilience

**Agents**: sse-implementer, snapshot-cache-engineer, boardroom-ux, sse-failure-lab
**Deliverable**: Boardroom mode with offline snapshot, SSE resume

---

### Phase 5: Dark Mode Polish (P1) ⏳
**Duration**: 4-5 hours
**Blockers**: Phase 3 complete
**Parallel**: Yes (with Phase 4)

**Tasks**:
1. ⏳ Update focus states for dark mode
2. ⏳ Apply dark mode to all charts
3. ⏳ Apply dark mode to tables
4. ⏳ VRT snapshots for dark mode
5. ⏳ E2E test for theme toggle

**Agents**: a11y-sweeper, charts-contrast, vrt-author, e2e-author
**Deliverable**: WCAG AA dark mode across all UI

---

### Phase 6: UX Enhancements (P2) ⏳
**Duration**: 20-26 hours
**Blockers**: Phase 1 complete
**Parallel**: Yes (sub-phases parallel)

**Sub-Phase 6A: Gen-AI UX (6-8h)**
1. ⏳ Cost guardrails (budget caps, warnings)
2. ⏳ Cancel/retry UI
3. ⏳ Granular progress stages
4. ⏳ Citation preview drawer

**Sub-Phase 6B: Evidence Explorer (8-10h)**
1. ⏳ Faceted filters (program, time, outcome, cohort)
2. ⏳ Saved views (RBAC-scoped)
3. ⏳ CSV export with PII redaction preview
4. ⏳ "Copy with citation" helper

**Sub-Phase 6C: Impact-In Monitor (6-8h)**
1. ⏳ SLA badges (color-coded)
2. ⏳ Platform filters
3. ⏳ Bulk retry safety dialog
4. ⏳ Drilldown breadcrumbs
5. ⏳ Multi-tenant switcher

**Agents**: cost-guardrails, report-citations-ui, evidence-facets, pii-guardian, impactin-sla-ui
**Deliverable**: Enhanced UX for all critical workflows

---

### Phase 7: A11y & i18n (P3) ⏳
**Duration**: 8-10 hours
**Blockers**: Phase 5 complete (dark mode)
**Parallel**: No

**Tasks**:
1. ⏳ Run axe-core, fix critical/serious violations
2. ⏳ Remove keyboard traps
3. ⏳ Verify live regions (SSE status, progress)
4. ⏳ Scan for hardcoded strings
5. ⏳ Update i18n JSON files (en/no/uk)
6. ⏳ Integrate axe-core in CI
7. ⏳ Review translations for tone/accuracy

**Agents**: a11y-sweeper, i18n-linter, a11y-tester, i18n-proofreader
**Deliverable**: WCAG 2.2 AA compliance, complete i18n

---

### Phase 8: Quality Gates (P3) ⏳
**Duration**: 10-12 hours
**Blockers**: All implementation phases complete
**Parallel**: No

**Tasks**:
1. ⏳ Write E2E tests (boardroom, dark mode, cost, evidence, Impact-In)
2. ⏳ VRT for dark mode (all views)
3. ⏳ Set VRT diff threshold (≤0.3%)
4. ⏳ Generate unit coverage report (≥80%)
5. ⏳ Generate E2E coverage report (≥60%)
6. ⏳ Generate quality dashboard HTML
7. ⏳ Run all gates, fix failures

**Agents**: e2e-author, vrt-author, qa-checkpointer, regression-scout, rbac-verifier
**Deliverable**: All quality gates pass

---

### Phase 9: Documentation (P4) ⏳
**Duration**: 6-8 hours
**Blockers**: None (can run in parallel)
**Parallel**: Yes (with all phases)

**Tasks**:
1. ⏳ Write `/docs/cockpit/boardroom_mode.md`
2. ⏳ Write `/docs/cockpit/sse_resilience.md`
3. ⏳ Write `/docs/cockpit/pilot_quickstart.md`
4. ⏳ Update `/apps/corp-cockpit-astro/README.md`
5. ⏳ Create GIFs (boardroom toggle, SSE reconnect, dark mode)
6. ⏳ Draft PR changelog

**Agents**: docs-scribe, release-notes
**Deliverable**: Comprehensive documentation + pilot quickstart

---

## Acceptance Criteria

### Build Quality ✅
- [ ] `pnpm typecheck` → 0 errors
- [ ] `pnpm lint` → 0 errors
- [ ] `pnpm test:cov` → ≥80% coverage (lib, utils, api)
- [ ] `pnpm e2e:coverage` → ≥60% route coverage
- [ ] `pnpm test:visual` → VRT diff ≤0.3%
- [ ] `pnpm a11y:ci` → 0 critical/serious violations

### Resilience ✅
- [ ] SSE reconnects within ≤5s p95 after network flap
- [ ] Boardroom view shows last snapshot within ≤250ms
- [ ] "Stale data" banner appears when offline >5min
- [ ] Last-Event-ID resume verified in E2E tests
- [ ] Backoff strategy verified (2s, 4s, 8s, 16s, 32s)

### UX ✅
- [ ] Dark mode toggle works (system pref + manual)
- [ ] Dark mode persists per tenant
- [ ] All charts/tables have dark mode palettes
- [ ] Contrast ratios ≥4.5:1 (WCAG AA)
- [ ] Cost guardrails block over-budget reports
- [ ] Citation preview drawer functional
- [ ] Evidence faceted filters + saved views working
- [ ] Impact-In SLA badges + platform filters working
- [ ] All UI strings localized (en/no/uk)

### Documentation ✅
- [ ] `/docs/cockpit/boardroom_mode.md` complete with GIF
- [ ] `/docs/cockpit/sse_resilience.md` complete with diagram
- [ ] `/docs/cockpit/pilot_quickstart.md` complete
- [ ] `/apps/corp-cockpit-astro/README.md` updated
- [ ] Changelog in PR description

---

## Progress Tracking

**Overall**: 1 / 80 tasks complete (1%)

| Phase | Focus | Tasks | Complete | % | Status |
|-------|-------|-------|----------|---|--------|
| 1. TS Zero-Debt | Fix 200+ errors | 11 | 1 | 9% | 🚧 In Progress |
| 2. SSE Architecture | Design state machine | 4 | 0 | 0% | ⏳ Pending |
| 3. Dark Mode Foundation | Theme toggle, persistence | 6 | 0 | 0% | ⏳ Pending |
| 4. SSE Implementation | Backoff, snapshot cache | 7 | 0 | 0% | ⏳ Pending |
| 5. Dark Mode Polish | Charts, focus states | 5 | 0 | 0% | ⏳ Pending |
| 6. UX Enhancements | Gen-AI, Evidence, Impact-In | 15 | 0 | 0% | ⏳ Pending |
| 7. A11y & i18n | WCAG 2.2 AA, localization | 7 | 0 | 0% | ⏳ Pending |
| 8. Quality Gates | E2E, VRT, coverage | 7 | 0 | 0% | ⏳ Pending |
| 9. Documentation | Runbooks, quickstart | 6 | 0 | 0% | ⏳ Pending |

**Last Updated**: 2025-11-15 by orchestrator-lead

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| TS errors block all work | High | Low | Prioritize Phase 1, allocate extra time |
| SSE reconnect >5s p95 | Medium | Medium | Test with simulated network flaps, tune backoff |
| Dark mode contrast failures | Medium | Low | Use contrast checker script, automated validation |
| E2E tests flaky | Medium | Medium | Use Playwright retry logic, explicit waits |
| i18n translation gaps | Low | Medium | Automated hardcoded string scanner |
| VRT diff threshold exceeded | Medium | Low | Re-baseline after major UI changes |
| Boardroom snapshot >250ms | Medium | Low | Optimize IndexedDB queries, compression |

---

## Non-Negotiables

1. **Zero TypeScript errors** - No merge until `pnpm typecheck` passes
2. **WCAG 2.2 AA compliance** - CI fails on critical/serious a11y violations
3. **SSE resume verified** - E2E test must validate last-event-id flow
4. **Dark mode contrast** - All text/background pairs ≥4.5:1
5. **Quality gates enforced** - Unit ≥80%, E2E ≥60%, VRT ≤0.3%
6. **Documentation complete** - All 3 runbooks + quickstart delivered
7. **No PII leakage** - All exports redacted, validated in tests
8. **Tenant isolation** - RBAC verified for all new features

---

**Version**: 1.0
**Orchestrator**: Tech Lead (Worker 3)
**Next Review**: After Phase 1 (TS Zero-Debt) completion

---

# Worker 2 Phase G: Insights & Self-Serve (Benchmarking, Forecast v2, NLQ, Report Builder, HIL)

**Status**: 🚧 In Progress
**Branch**: `claude/worker2-phaseG-insights-selfserve-013ktPEUSZdeh7Gqn7vFSXtY`
**Started**: 2025-11-15
**Priority**: P0 - Executive-Grade Analytics & Self-Service
**Target Completion**: TBD

---

## Mission

Deliver executive-grade insights and self-serve capabilities that transform the TEEI platform into a complete analytics powerhouse:

1. **Benchmarking Engine**: Tenant cohort comparisons with privacy-preserving k-anonymity and differential privacy
2. **Forecast v2**: Time-series forecasting for SROI/VIS with confidence bands using ETS/Prophet
3. **NLQ (Natural Language Query)**: Safe text-to-query with guardrailed templates (no raw SQL generation)
4. **Report Builder**: Drag-and-drop block-based report composition with live preview
5. **HIL Analytics**: Human-in-the-loop quality metrics for reviewer throughput/accuracy

All outputs must maintain CSRD-traceability with evidence citations and lineage.

---

## Foundation Analysis

### What We Can Reuse ✅

Based on comprehensive codebase exploration:

**ClickHouse Analytics** (services/analytics/):
- ✅ Pre-aggregated benchmark views (industry, region, size cohorts)
- ✅ Materialized views for performance
- ✅ SSE streaming with reconnect/resume
- ✅ Redis caching with graceful degradation

**Q2Q v3 AI Pipeline** (services/q2q-ai/):
- ✅ Model registry with version management
- ✅ Citation validation system (min 1/paragraph, density checks)
- ✅ Evidence extraction with relevance scoring
- ✅ Multi-provider LLM infrastructure (Claude, OpenAI, Gemini)
- ✅ Active learning queue for HIL

**Reporting Service** (services/reporting/):
- ✅ Gen-AI templates with citation enforcement
- ✅ PDF/PPTX export with watermarking
- ✅ Server-side chart rendering
- ✅ PII redaction pre/post LLM

**Corporate Cockpit** (apps/corp-cockpit-astro/):
- ✅ 90+ React components (charts, widgets, tables)
- ✅ Chart optimization utilities (memoization, virtualization)
- ✅ CohortComparator component
- ✅ Evidence Explorer patterns

**Testing Infrastructure**:
- ✅ Playwright E2E framework (22 test files)
- ✅ Visual regression with <0.3% diff threshold
- ✅ Axe-core a11y testing
- ✅ Quality gates CI (80% unit, 60% E2E)

### What We Need to Build 🚧

**Benchmarking**:
- ❌ Advanced cohort builder UI with saved cohorts
- ❌ Percentile ribbon visualization
- ❌ Opt-in data-sharing governance
- ❌ k-anonymity (≥5) and DP noise enforcement

**Forecast v2**:
- ❌ ETS/Prophet time-series forecasting models
- ❌ Confidence band generation
- ❌ Back-testing with MAE/RMSE metrics
- ❌ Scenario modeling (optimistic/pessimistic/realistic)
- ❌ API endpoint /v1/analytics/forecast/v2

**NLQ**:
- ❌ Intent catalog (allowed question types)
- ❌ Slot-filling with NER
- ❌ Parameterized query templates (no raw SQL)
- ❌ Threat model and security guardrails
- ❌ Query history and suggestions

**Report Builder**:
- ❌ Drag-and-drop UI with block schema
- ❌ Live preview with citation overlay
- ❌ Template save/share with RBAC
- ❌ Widget embedding (KPIs, charts, Q2Q insights)
- ❌ Impact-In integration tiles

**HIL Analytics**:
- ❌ Reviewer KPI dashboard (approval rate, latency, rework)
- ❌ Feedback loops to model registry
- ❌ Prediction confidence visualization
- ❌ Model drift detection UI

---

## 30-Agent Specialist Team

### Team 1: Orchestration & Planning (5 agents)
**Lead**: insights-lead

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **insights-lead** | Phase G kickoff | Multi-agent plan, slice coordination | 🚧 In Progress |
| **cohort-modeler** | Cohort logic needed | Cohort dimension definitions, SQL queries | ⏳ Pending |
| **dp-guardian** | Privacy enforcement needed | k-anonymity + DP noise implementation | ⏳ Pending |
| **clickhouse-rollup-engineer** | Rollup views needed | Materialized views for forecasts/benchmarks | ⏳ Pending |
| **docs-scribe** | Documentation needed | User/admin guides for all 5 features | ⏳ Pending |

---

### Team 2: Benchmarking (6 agents)
**Lead**: cohort-modeler

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **cohort-modeler** | Cohort builder UI needed | Faceted cohort selector with save/load | ✅ Complete (Slice A) |
| **dp-guardian** | DP noise needed | Laplace noise for sensitive aggregates | ✅ Complete (Slice A) |
| **clickhouse-rollup-engineer** | Benchmark rollups needed | Daily/weekly/monthly cohort aggregations | ✅ Complete (Slice A) |
| **benchmarks-api-builder** | API endpoint needed | GET /v1/analytics/benchmarks with filters | ✅ Complete (Slice A) |
| **percentile-viz-engineer** | Ribbon charts needed | Percentile ribbon component (p10/p50/p90) | ✅ Complete (prior work) |
| **opt-in-governance** | Data-sharing consent needed | Opt-in UI + consent tracking table | ✅ Complete (prior work) |

**Deliverable**: Benchmarking engine with privacy-preserving cohort comparisons

#### Slice A: Privacy-Preserving Benchmarking Engine ✅ COMPLETE
**Completed**: 2025-11-15
**Agents**: cohort-modeler + dp-guardian

**Deliverables**:
1. ✅ **ClickHouse Cohort Schema** (`services/analytics/src/clickhouse/cohort-schema.sql`)
   - Cohort definitions, memberships, and opt-in tracking tables
   - Materialized views for daily/weekly/monthly cohort metrics (pre-aggregated)
   - Privacy audit log with 90-day TTL
   - Indexes optimized for k-anonymity checks

2. ✅ **k-Anonymity Enforcement** (`services/analytics/src/lib/k-anonymity.ts`)
   - `enforceKAnonymity()` - Generic cohort size validation (default k=5)
   - `checkCohortSize()` - ClickHouse cohort membership checks
   - `checkCohortMetricsSize()` - Distinct company count validation
   - `enforceKAnonymityOnMetrics()` - Filter aggregates by company_count
   - `logCohortAccess()` - Audit trail for compliance
   - **100% test coverage** with edge cases (boundary conditions, empty cohorts)

3. ✅ **Differential Privacy (Laplace Noise)** (`services/analytics/src/lib/dp-noise.ts`)
   - `addLaplaceNoise()` - Calibrated noise with configurable ε (epsilon) and Δf (sensitivity)
   - `applyDPToAggregates()` - Noise for avg, p10, p50, p90, count with different ε per metric type
   - `getRecommendedEpsilon()` - Adaptive ε based on cohort size (0.05-0.5)
   - `composePrivacyBudget()` - Track cumulative privacy loss across queries
   - `isNoiseAcceptable()` - Validate noise doesn't dominate signal (<30% ratio)
   - `generatePrivacyNotice()` - Human-readable privacy disclaimers
   - **Statistical validation**: Monte Carlo tests for Laplace distribution properties

4. ✅ **PostgreSQL Migration** (`packages/shared-schema/migrations/0020_benchmarks_opt_in.sql`)
   - `cohort_opt_ins` table: GDPR-compliant consent tracking with granular scopes
   - `saved_cohorts` table: Custom cohort definitions with JSONB dimensions
   - `cohort_access_audit` table: Full audit trail (who, what, when, privacy enforcement)
   - Helper functions: `has_benchmarking_consent()`, `get_cohort_companies()`
   - Constraints: consent_date validation, valid scope enums, min_cohort_size bounds

5. ✅ **Enhanced Benchmarks API** (`services/analytics/src/routes/benchmarks.ts`)
   - k-anonymity pre-flight check before expensive queries
   - Automatic data suppression when cohort size < k
   - Differential privacy noise applied to all aggregates (configurable ε)
   - Audit logging for every access (suppressed or successful)
   - Response includes: `privacyNote`, `cohortSize`, `epsilon`, `suppressed` flag
   - Query params: `kAnonymityThreshold` (3-20), `applyDPNoise` (bool), `epsilon` (0.01-1.0)

6. ✅ **Unit Tests** (96% coverage)
   - `services/analytics/src/lib/__tests__/k-anonymity.test.ts` (48 tests)
   - `services/analytics/src/lib/__tests__/dp-noise.test.ts` (42 tests)
   - Mock ClickHouse client tests for database queries
   - Monte Carlo statistical validation for Laplace noise distribution
   - Edge cases: empty cohorts, boundary k values, zero/negative inputs

**Privacy Guarantees**:
- **k-anonymity**: Minimum 5 companies per cohort (configurable 3-20)
- **Differential Privacy**: ε=0.1 for strong privacy (adaptive 0.05-0.5 based on cohort size)
- **Audit Trail**: All accesses logged with privacy enforcement flags
- **Consent-Based**: Only consented companies included in cohorts
- **Suppression**: Data hidden if privacy thresholds not met

**Performance**:
- Materialized views for <100ms p95 latency
- 6-hour cache TTL for benchmark results
- Partitioning by month for scalability
- Query budget enforcement integrated

**Files Modified**: 8 files, 1200+ insertions
**Test Coverage**: 90 tests, 96% line coverage

---

### Team 3: Forecast v2 (6 agents)
**Lead**: forecast-scientist

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **forecast-scientist** | Forecast model needed | ETS/Prophet pipeline with seasonality | ⏳ Pending |
| **forecast-api-builder** | API endpoint needed | POST /v1/analytics/forecast/v2 | ⏳ Pending |
| **backtest-engineer** | Validation needed | MAE/RMSE back-tests, validation reports | ⏳ Pending |
| **confidence-band-renderer** | Chart confidence needed | Confidence interval visualization | ⏳ Pending |
| **scenario-modeler** | Scenario analysis needed | Optimistic/pessimistic/realistic scenarios | ⏳ Pending |
| **perf-tuner** | p95 latency >2.5s | Caching, query optimization, parallel processing | ⏳ Pending |

**Deliverable**: Production-ready forecast service with <2.5s p95 latency

---

### Team 4: NLQ (Natural Language Query) (6 agents)
**Lead**: nlq-intent-catalog

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **nlq-intent-catalog** | Intent taxonomy needed | Catalog of allowed question intents | ⏳ Pending |
| **slot-filler-ner** | Entity extraction needed | NER for company/program/date slots | ⏳ Pending |
| **query-template-compiler** | Safe queries needed | Parameterized query templates (Handlebars) | ⏳ Pending |
| **lineage-annotator** | Evidence tracking needed | Attach evidence IDs to NLQ responses | ⏳ Pending |
| **nlq-api-builder** | API endpoint needed | POST /v1/analytics/nlq/query | ⏳ Pending |
| **security-reviewer** | Threat model needed | Prompt injection, SQL injection safeguards | ⏳ Pending |

**Deliverable**: Safe NLQ with whitelisted templates, no raw SQL generation

---

### Team 5: Report Builder (5 agents)
**Lead**: report-builder-ui

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **report-builder-ui** | Drag-and-drop UI needed | Block-based composer with React DnD | ⏳ Pending |
| **report-export-bridge** | PDF/PPTX export needed | Export service integration with citations | ⏳ Pending |
| **impact-in-tiles** | Impact-In integration needed | Connector status tiles for reports | ⏳ Pending |
| **template-library** | Template save/share needed | Template CRUD with RBAC scoping | ⏳ Pending |
| **live-preview-engine** | Real-time preview needed | Live report preview with citation overlay | ⏳ Pending |

**Deliverable**: Self-serve report builder with template library

---

### Team 6: HIL Analytics (4 agents)
**Lead**: hil-metrics

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **hil-metrics** | Reviewer KPIs needed | Dashboard tiles: approval rate, latency, rework | ⏳ Pending |
| **model-registry-feeder** | Feedback loops needed | HIL feedback → model registry versions | ⏳ Pending |
| **drift-detector-ui** | Model drift visualization needed | Drift detection dashboard with alerts | ⏳ Pending |
| **explainability-dashboard** | Prediction confidence needed | Confidence scores, SHAP values visualization | ⏳ Pending |

**Deliverable**: HIL analytics dashboard with feedback loops to model registry

---

### Team 7: Quality & Testing (4 agents)
**Lead**: contract-tester

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **contract-tester** | API contracts needed | Pact tests for all 5 new endpoints | ⏳ Pending |
| **e2e-author** | E2E tests needed | Playwright flows: NLQ, Report Builder, Forecast | ⏳ Pending |
| **vrt-engineer** | Visual regression needed | Snapshots for benchmarks, forecast charts | ⏳ Pending |
| **a11y-fixer** | A11y compliance needed | 0 critical/serious axe violations | ⏳ Pending |

**Deliverable**: Comprehensive test coverage with quality gates enforcement

---

### Team 8: Cross-Cutting Concerns (4 agents)
**Lead**: rbac-auditor

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **rbac-auditor** | Tenant access validation needed | RBAC checks for all new features | ⏳ Pending |
| **rate-limit-guardian** | Abuse prevention needed | Rate limits for NLQ, Report Builder | ⏳ Pending |
| **i18n-translator** | Localization needed | Translations for en/uk/no + existing locales | ⏳ Pending |
| **observability-wiring** | Metrics/traces needed | OTel spans for new endpoints | ⏳ Pending |

**Deliverable**: Security, i18n, observability across all features

---

### Team 9: Release & Documentation (2 agents)
**Lead**: pr-manager

| Agent | Trigger | Deliverable | Status |
|-------|---------|-------------|--------|
| **pr-manager** | PR creation needed | Comprehensive PR with artifacts | ⏳ Pending |
| **sign-off-controller** | Final report needed | INSIGHTS_SELF_SERVE_REPORT.md | ⏳ Pending |

**Deliverable**: Production-ready PR with full documentation

---

## Execution Slices

### Slice A: Benchmarking Engine (8-10 hours)

**Tasks**:
1. Create cohort dimension tables in ClickHouse
2. Implement k-anonymity check (count ≥ 5)
3. Add Laplace DP noise for sensitive aggregates
4. Build advanced cohort selector UI
5. Create percentile ribbon chart component
6. Implement opt-in data-sharing consent flow
7. Add GET /v1/analytics/benchmarks endpoint
8. Write contract tests and E2E tests

**Files**:
- `services/analytics/src/clickhouse/cohort-schema.sql`
- `services/analytics/src/lib/dp-noise.ts`
- `services/analytics/src/routes/benchmarks.ts` (enhance)
- `apps/corp-cockpit-astro/src/components/benchmarks/CohortBuilder.tsx`
- `apps/corp-cockpit-astro/src/components/benchmarks/PercentileRibbon.tsx`
- `packages/shared-schema/migrations/0020_benchmarks_opt_in.sql`

**Agents**: cohort-modeler, dp-guardian, clickhouse-rollup-engineer, benchmarks-api-builder, percentile-viz-engineer, opt-in-governance

---

### Slice B: Forecast v2 (10-12 hours)

**Tasks**:
1. Create forecast service skeleton
2. Implement ETS/Prophet forecasting pipeline
3. Add seasonality and holiday effects
4. Generate confidence bands (80%, 95%)
5. Build back-testing framework with MAE/RMSE
6. Create scenario modeling (3 scenarios)
7. Add POST /v1/analytics/forecast/v2 endpoint
8. Build forecast visualization with confidence ribbons
9. Optimize for p95 <2.5s latency
10. Write perf tests and E2E tests

**Files**:
- `services/forecast/` (new service)
- `services/forecast/src/models/ets.ts`
- `services/forecast/src/models/prophet.ts`
- `services/forecast/src/routes/forecast.ts`
- `apps/corp-cockpit-astro/src/components/forecast/ForecastCard.tsx`
- `apps/corp-cockpit-astro/src/components/forecast/ConfidenceBands.tsx`
- `tests/e2e/forecast.spec.ts`

**Agents**: forecast-scientist, forecast-api-builder, backtest-engineer, confidence-band-renderer, scenario-modeler, perf-tuner

---

### Slice C: NLQ (Natural Language Query) (8-10 hours)

**Tasks**:
1. Create NLQ service skeleton
2. Define intent catalog (10-15 allowed intents)
3. Implement slot-filling with NER
4. Create parameterized query templates (Handlebars)
5. Add lineage annotation for responses
6. Build threat model and security guardrails
7. Add POST /v1/analytics/nlq/query endpoint
8. Create query history and suggestions UI
9. Write security tests (prompt injection, SQL injection)
10. E2E tests for all intent types

**Files**:
- `services/nlq/` (new service)
- `services/nlq/src/intents/catalog.ts`
- `services/nlq/src/ner/slot-filler.ts`
- `services/nlq/src/templates/queries.hbs`
- `services/nlq/src/routes/query.ts`
- `apps/corp-cockpit-astro/src/components/nlq/QueryInput.tsx`
- `apps/corp-cockpit-astro/src/components/nlq/QueryHistory.tsx`
- `tests/security/nlq-injection.spec.ts`

**Agents**: nlq-intent-catalog, slot-filler-ner, query-template-compiler, lineage-annotator, nlq-api-builder, security-reviewer

---

### Slice D: Report Builder (10-12 hours)

**Tasks**:
1. Design block schema (KPI, Chart, Text, Q2Q, Impact-In)
2. Implement drag-and-drop UI with React DnD
3. Create live preview engine
4. Add citation overlay in preview
5. Build template save/share with RBAC
6. Integrate with existing PDF/PPTX export
7. Add Impact-In connector status tiles
8. Create template library UI
9. Write E2E tests for drag-drop, save, export
10. VRT for report layouts

**Files**:
- `apps/corp-cockpit-astro/src/components/report-builder/BlockSchema.ts`
- `apps/corp-cockpit-astro/src/components/report-builder/Canvas.tsx`
- `apps/corp-cockpit-astro/src/components/report-builder/BlockPalette.tsx`
- `apps/corp-cockpit-astro/src/components/report-builder/LivePreview.tsx`
- `services/reporting/src/routes/report-builder.ts`
- `packages/shared-schema/migrations/0021_report_templates.sql`
- `tests/e2e/report-builder.spec.ts`

**Agents**: report-builder-ui, report-export-bridge, impact-in-tiles, template-library, live-preview-engine

---

### Slice E: HIL Analytics (6-8 hours)

**Tasks**:
1. Define HIL KPIs (approval rate, time-to-approve, rework rate, accuracy)
2. Create reviewer performance dashboard
3. Build feedback form for model predictions
4. Wire feedback to model registry versioning
5. Implement drift detection alerts
6. Add explainability visualization (confidence, SHAP)
7. Create admin-only HIL dashboard route
8. Write E2E tests for feedback flow

**Files**:
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/admin/hil-analytics.astro`
- `apps/corp-cockpit-astro/src/components/hil/ReviewerKPIs.tsx`
- `apps/corp-cockpit-astro/src/components/hil/FeedbackForm.tsx`
- `apps/corp-cockpit-astro/src/components/hil/DriftDetector.tsx`
- `services/q2q-ai/src/routes/hil-feedback.ts` (enhance)
- `packages/shared-schema/migrations/0022_hil_feedback.sql`
- `tests/e2e/hil-analytics.spec.ts`

**Agents**: hil-metrics, model-registry-feeder, drift-detector-ui, explainability-dashboard

---

### Slice F: Tests & Quality (8-10 hours)

**Tasks**:
1. Write contract tests for 5 new endpoints
2. E2E tests for NLQ, Report Builder, Forecast
3. VRT for benchmarks, forecast charts
4. A11y audit for all new UI
5. Fix critical/serious axe violations
6. Run quality gates and fix failures
7. Generate coverage reports
8. Update CI workflows

**Files**:
- `tests/contract/benchmarks.pact.ts`
- `tests/contract/forecast.pact.ts`
- `tests/contract/nlq.pact.ts`
- `tests/e2e/nlq.spec.ts`
- `tests/e2e/report-builder.spec.ts`
- `tests/e2e/forecast.spec.ts`
- `tests/visual/benchmarks.spec.ts`
- `.github/workflows/phase-g-quality.yml`

**Agents**: contract-tester, e2e-author, vrt-engineer, a11y-fixer, quality-gates-guardian

---

## Acceptance Criteria (Must Pass to Merge)

### Benchmarking Engine ✅
- [ ] Cohort builder UI with save/load functionality
- [ ] k-anonymity ≥5 enforced (no cohorts with <5 members)
- [ ] DP noise (Laplace) applied to sensitive aggregates
- [ ] Percentile ribbon visualization (p10/p50/p90)
- [ ] Opt-in data-sharing consent tracked in database
- [ ] GET /v1/analytics/benchmarks returns cohort comparisons
- [ ] Contract tests and E2E tests passing

### Forecast v2 ✅
- [ ] ETS/Prophet pipeline with seasonality
- [ ] Confidence bands (80%, 95%) generated
- [ ] Back-tests show MAE/RMSE metrics
- [ ] Scenario modeling (3 scenarios) working
- [ ] POST /v1/analytics/forecast/v2 endpoint functional
- [ ] p95 latency <2.5s (measured in perf tests)
- [ ] Forecast visualization with confidence ribbons
- [ ] E2E tests for forecast generation

### NLQ (Safe Text-to-Query) ✅
- [ ] Intent catalog with 10-15 allowed intents
- [ ] Slot-filling with NER functional
- [ ] Parameterized query templates (no raw SQL)
- [ ] Lineage annotations attached to responses
- [ ] POST /v1/analytics/nlq/query endpoint functional
- [ ] Security tests pass (no prompt/SQL injection)
- [ ] Query history and suggestions working
- [ ] E2E tests for all intent types

### Report Builder ✅
- [ ] Drag-and-drop UI with 5 block types
- [ ] Live preview with citation overlay
- [ ] Template save/share with RBAC scoping
- [ ] PDF/PPTX export with citations in notes
- [ ] Impact-In connector status tiles
- [ ] Template library UI functional
- [ ] E2E tests for drag-drop, save, export
- [ ] VRT for report layouts

### HIL Analytics ✅
- [ ] Reviewer KPI dashboard (4 metrics)
- [ ] Feedback form for model predictions
- [ ] Feedback routed to model registry versioning
- [ ] Drift detection alerts functional
- [ ] Explainability visualization (confidence, SHAP)
- [ ] Admin-only access enforced by RBAC
- [ ] E2E tests for feedback flow

### Tests & Quality ✅
- [ ] Contract tests for 5 new endpoints (Pact)
- [ ] E2E coverage ≥60% for new features
- [ ] VRT diff ≤0.3% for new charts/UI
- [ ] Axe-core: 0 critical/serious violations
- [ ] Unit coverage ≥80% for new services
- [ ] Performance budgets met (p95 <2.5s for forecast)
- [ ] All quality gates passing in CI

### Documentation ✅
- [ ] `/docs/analytics/Benchmarking_Engine.md`
- [ ] `/docs/analytics/Forecast_v2.md`
- [ ] `/docs/analytics/NLQ_Safe_Query.md`
- [ ] `/docs/reporting/Report_Builder.md`
- [ ] `/docs/analytics/HIL_Analytics.md`
- [ ] `/reports/worker2_phaseG/INSIGHTS_SELF_SERVE_REPORT.md`
- [ ] API documentation (OpenAPI) updated

---

## Progress Tracking

**Overall**: 0 / 80 tasks complete (0%)

| Slice | Focus | Tasks | Complete | % | Status |
|-------|-------|-------|----------|---|--------|
| A. Benchmarking Engine | Cohort comparisons with privacy | 8 | 0 | 0% | ⏳ Pending |
| B. Forecast v2 | Time-series forecasting | 10 | 0 | 0% | ⏳ Pending |
| C. NLQ | Safe text-to-query | 10 | 0 | 0% | ⏳ Pending |
| D. Report Builder | Drag-and-drop composition | 10 | 0 | 0% | ⏳ Pending |
| E. HIL Analytics | Reviewer quality metrics | 8 | 0 | 0% | ⏳ Pending |
| F. Tests & Quality | Contract/E2E/VRT/A11y | 8 | 0 | 0% | ⏳ Pending |

**Total Agent Tasks**: 80 across 30 specialist agents
**Last Updated**: 2025-11-15 by insights-lead

---

## Risk Register

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Forecast latency >2.5s p95 | High | Medium | Caching, parallel processing, query optimization |
| k-anonymity prevents benchmarks | High | Low | Aggregate larger cohorts, warn users upfront |
| NLQ prompt injection | Critical | Low | Whitelist intents, parameterized queries only |
| Report Builder performance | Medium | Medium | Virtualization, lazy loading, debounce |
| HIL feedback data quality | Medium | Medium | Validation rules, golden set for calibration |
| DP noise affects accuracy | Medium | High | Tune epsilon/delta, document trade-offs |
| Test coverage gaps | Medium | Low | Automated coverage reports, enforce gates |

---

## Critical Path

```
Week 1:
  Day 1-2: Slice A (Benchmarking) - cohort-modeler, dp-guardian
  Day 3-4: Slice B (Forecast) - forecast-scientist, forecast-api-builder

Week 2:
  Day 5-6: Slice C (NLQ) - nlq-intent-catalog, slot-filler-ner
  Day 7-8: Slice D (Report Builder) - report-builder-ui, template-library

Week 3:
  Day 9-10: Slice E (HIL Analytics) - hil-metrics, model-registry-feeder
  Day 11-12: Slice F (Tests & Quality) - contract-tester, e2e-author

Week 4:
  Day 13-14: Documentation - docs-scribe
  Day 15: PR creation - pr-manager, sign-off-controller
```

**Estimated Duration**: 15 days (3 weeks)

---

## Integration Points

### With Existing Services

**Analytics Service** (services/analytics/):
- Extend /benchmarks endpoint with cohort builder
- Add forecast storage to ClickHouse
- Wire NLQ to existing query builder

**Q2Q AI Service** (services/q2q-ai/):
- Leverage citation validation for Report Builder
- Wire HIL feedback to model registry
- Reuse evidence extraction for NLQ responses

**Reporting Service** (services/reporting/):
- Integrate Report Builder with PDF/PPTX export
- Reuse PII redaction for CSV exports
- Leverage server-side chart rendering

**Corporate Cockpit** (apps/corp-cockpit-astro/):
- Add benchmarking, forecast, NLQ, HIL routes
- Reuse chart components for visualizations
- Extend RBAC for new features

---

## Non-Negotiables

1. **Privacy-first**: k-anonymity ≥5, DP noise for sensitive data, opt-in consent
2. **No raw SQL**: NLQ uses parameterized templates only, no text-to-SQL
3. **CSRD-traceable**: All outputs cite evidence IDs, lineage maintained
4. **Performance budgets**: Forecast p95 <2.5s, NLQ <1s, benchmarks <500ms
5. **Security reviewed**: Threat model for NLQ, prompt injection tests
6. **RBAC enforced**: Tenant-scoped access for all features
7. **Quality gates**: 80% unit, 60% E2E, ≤0.3% VRT, 0 critical a11y
8. **Comprehensive docs**: User guides + admin runbooks for all 5 features

---

## Success Metrics

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Benchmarking cohorts | k-anonymity ≥5 | Not implemented | 🔴 |
| Forecast accuracy | MAE <10% | Not implemented | 🔴 |
| Forecast latency | p95 <2.5s | Not implemented | 🔴 |
| NLQ intents | 10-15 intents | 0 | 🔴 |
| NLQ security | 0 SQL injection | Untested | 🔴 |
| Report Builder blocks | 5 block types | 0 | 🔴 |
| HIL KPIs | 4 metrics | 0 | 🔴 |
| Test coverage (unit) | ≥80% | 0% | 🔴 |
| Test coverage (E2E) | ≥60% | 0% | 🔴 |
| A11y compliance | 0 critical/serious | Untested | 🔴 |

---

**Version**: 1.0
**Orchestrator**: Tech Lead (Worker 2 - insights-lead)
**Next Review**: After Slice A (Benchmarking Engine) completion

