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

# Worker 3 Phase D: Production Launch - Enterprise Hardening

**Status**: 🚀 Orchestration Started
**Branch**: `claude/worker3-phaseD-prod-launch-01KeYg8ZYW3Bv9zkk6o1DkJA`
**Started**: 2025-11-14
**Target Completion**: TBD

---

## Mission

Transform the pilot-ready Corporate Cockpit from Phase C into a production-grade enterprise platform with:
- **Governance**: Approvals, audit trails, compliance surfaces
- **Identity**: SSO (SAML/OIDC), SCIM provisioning UX
- **Executive Features**: Watermarked PDFs, PPTX exports, narrative controls
- **Resilience**: PWA offline mode, SSE resume, boardroom displays
- **Analytics**: Benchmarks, cohorts, DW integration
- **Compliance**: CSP/Trusted Types, advanced a11y (WCAG 2.2 AAA), SRI
- **Operations**: Status banners, SLO surfaces, incident shelf

---

## Team Structure (30 Agents / 5 Leads)

See `/AGENTS.md` for full team structure.

**Leads**:
1. **enterprise-ux-lead** (6 agents) - Approvals, Audit, Partner Portal, Benchmarks, Governance, Status
2. **identity-lead** (5 agents) - SSO/SCIM UX, Whitelabel, Export Logs, Error Boundaries
3. **reports-pack-lead** (5 agents) - PDF watermarking, PPTX export, Narrative controls, Docs
4. **perf-a11y-lead** (7 agents) - PWA, A11y hardening, Web-vitals, CSP
5. **qa-compliance-lead** (7 agents) - E2E tests, Visual regression, CSP compliance

---

## Deliverables (A-K)

### Slice A: Approvals & Audit Mode 📋
**Owner**: enterprise-ux-lead (approvals-workflow-dev, audit-mode-dev)
**Status**: ⏳ Pending

**Tasks**:
- [ ] Multi-step approval workflow UI (draft → reviewer → approver → locked)
- [ ] Watermark overlays: "DRAFT" / "APPROVED" / "ARCHIVED"
- [ ] Version history + diff viewer for narratives and charts
- [ ] Sign-off trail component (user, timestamp, comments)
- [ ] Audit Mode toggle: freeze UI, show lineage/evidence IDs on hover
- [ ] Backend: Approval state API (Worker 2 coordination)

**Files**:
- `apps/corp-cockpit-astro/src/components/reports/ApprovalFlow.tsx`
- `apps/corp-cockpit-astro/src/components/reports/ApprovalHistory.tsx`
- `apps/corp-cockpit-astro/src/components/reports/VersionDiff.tsx`
- `apps/corp-cockpit-astro/src/components/reports/AuditModeToggle.tsx`
- `services/reporting/routes/approvals.ts` (stub or extension)

**Acceptance**:
- ✅ Approval workflow complete (draft → approved → locked)
- ✅ Version history shows diffs
- ✅ Audit Mode freezes UI and overlays evidence IDs
- ✅ Sign-off trail displays correctly

**Report**: `/reports/w3_phaseD_approvals_audit.md`

---

### Slice B: Partner Portal & Whitelabel Packs 🏢
**Owner**: enterprise-ux-lead (partner-portal-ui) + identity-lead (whitelabel-validator)
**Status**: ⏳ Pending

**Tasks**:
- [ ] Partner-scoped landing page: `/[lang]/partners/:partnerId`
- [ ] Display: partner's tenants, deliveries, SROI/VIS snapshots
- [ ] Whitelabel pack export (logos, theme tokens, sample PDF)
- [ ] Theme validator: contrast ratios (WCAG), logo size constraints
- [ ] Backend: Partner aggregation API (read from DW/reporting)

**Files**:
- `apps/corp-cockpit-astro/src/pages/[lang]/partners/[partnerId]/index.astro`
- `apps/corp-cockpit-astro/src/pages/[lang]/partners/[partnerId]/tenants.astro`
- `apps/corp-cockpit-astro/src/components/partners/TenantSnapshot.tsx`
- `apps/corp-cockpit-astro/src/components/theme/WhitelabelPackExport.tsx`
- `apps/corp-cockpit-astro/src/utils/themeValidator.ts`

**Acceptance**:
- ✅ Partner portal displays all tenants
- ✅ Whitelabel pack exports with validation
- ✅ Contrast meets WCAG AA minimum

**Report**: `/reports/w3_phaseD_partner_portal.md`

---

### Slice C: SSO & SCIM UX 🔐
**Owner**: identity-lead (sso-ui-engineer, scim-ui-engineer)
**Status**: ⏳ Pending

**Tasks**:
- [ ] SSO settings UI: display SAML/OIDC metadata (entityID, ACS URL, JWKS endpoint)
- [ ] Read-only view (secrets managed by Worker 1 backend)
- [ ] SCIM provisioning UX: role mapping (viewer/admin/analyst)
- [ ] Test sync button (calls Worker 1 server endpoint)
- [ ] Instructions/help text for identity admins

**Files**:
- `apps/corp-cockpit-astro/src/pages/[lang]/admin/sso-settings.astro`
- `apps/corp-cockpit-astro/src/components/admin/SSOMetadata.tsx`
- `apps/corp-cockpit-astro/src/components/admin/SCIMMapping.tsx`
- `apps/corp-cockpit-astro/src/components/admin/SyncTestButton.tsx`

**Acceptance**:
- ✅ SSO metadata displayed correctly (read-only)
- ✅ SCIM role mapping UI functional
- ✅ Test sync button calls Worker 1 endpoint
- ✅ No secrets in frontend code

**Report**: `/reports/w3_phaseD_sso_scim_ux.md`

---

### Slice D: Executive Packs 📊
**Owner**: reports-pack-lead (report-pdf-engineer, pptx-export-engineer, narrative-controls-dev)
**Status**: ⏳ Pending

**Tasks**:
- [ ] PDF watermarking: company name, period, evidence set hash
- [ ] PDF ID stamping footer on every page
- [ ] PPTX export (server-side): cover slide, KPIs, charts, evidence links
- [ ] Narrative controls: tone (formal/conversational), length (brief/detailed)
- [ ] Backend: Export endpoints (Worker 2 coordination)
- [ ] Documentation: Executive pack structure, branding constraints

**Files**:
- `apps/corp-cockpit-astro/src/components/reports/ExportExecutivePack.tsx`
- `apps/corp-cockpit-astro/src/components/reports/NarrativeControls.tsx`
- `services/reporting/routes/exports.presentations.ts` (stub or extension)
- `services/reporting/utils/pdfWatermark.ts`
- `services/reporting/utils/pptxGenerator.ts`
- `docs/cockpit/executive_packs.md`

**Acceptance**:
- ✅ PDF watermarking + ID stamping functional
- ✅ PPTX export generates (template or full implementation)
- ✅ Narrative controls adjust server prompts
- ✅ Documentation complete

**Report**: `/reports/w3_phaseD_exec_packs.md`

---

### Slice E: PWA Boardroom Mode 📱
**Owner**: perf-a11y-lead (pwa-engineer, sse-resume-specialist)
**Status**: ⏳ Pending

**Tasks**:
- [ ] PWA manifest.webmanifest (name, icons, theme, display: standalone)
- [ ] Service worker: pre-cache last successful dataset, theme, chart assets
- [ ] Offline fallback: display last approved report + key KPIs
- [ ] Offline banner when disconnected
- [ ] SSE resume with last-event-id on reconnect
- [ ] Boardroom mode: large typography, auto-refresh, clean UI

**Files**:
- `apps/corp-cockpit-astro/public/manifest.webmanifest`
- `apps/corp-cockpit-astro/public/service-worker.js`
- `apps/corp-cockpit-astro/src/lib/boardroom/offlineCache.ts`
- `apps/corp-cockpit-astro/src/lib/boardroom/sseResume.ts`
- `apps/corp-cockpit-astro/src/components/status/OfflineBanner.tsx`

**Acceptance**:
- ✅ PWA installable (manifest + service worker)
- ✅ Offline mode displays last dataset
- ✅ SSE resumes with last-event-id
- ✅ Boardroom mode renders correctly

**Report**: `/reports/w3_phaseD_pwa_boardroom.md`

---

### Slice F: Benchmarks & Cohorts UI 📈
**Owner**: enterprise-ux-lead (benchmarks-ui-dev) + perf-a11y-lead (charts-perf-dev)
**Status**: ⏳ Pending

**Tasks**:
- [ ] Benchmarks page: compare company vs cohort (industry, country, program mix)
- [ ] Cohort filters, percentile ribbons (25th, 50th, 75th)
- [ ] Explanation tooltips, DW aggregates (Worker 2)
- [ ] Export CSV/PDF of benchmark comparisons
- [ ] Chart performance: virtualization for large datasets

**Files**:
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/benchmarks/index.astro`
- `apps/corp-cockpit-astro/src/components/benchmarks/CohortComparator.tsx`
- `apps/corp-cockpit-astro/src/components/benchmarks/PercentileChart.tsx`
- `apps/corp-cockpit-astro/src/components/benchmarks/ExportBenchmarks.tsx`

**Acceptance**:
- ✅ Benchmarks UI displays cohort comparisons
- ✅ Percentile ribbons render correctly
- ✅ Exports available (CSV/PDF)
- ✅ Charts virtualized for performance

**Report**: `/reports/w3_phaseD_benchmarks_ui.md`

---

### Slice G: Governance UI 🛡️
**Owner**: enterprise-ux-lead (consent-ui-dev) + identity-lead (export-log-ui-dev)
**Status**: ⏳ Pending

**Tasks**:
- [ ] Consent status viewer (read-only from Worker 2)
- [ ] DSAR queue status (pending/in-progress/completed)
- [ ] Retention ticking banners (records near TTL)
- [ ] Export log viewer: who exported what/when, link to approval
- [ ] Backend: Read governance endpoints (Worker 2)

**Files**:
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/governance/index.astro`
- `apps/corp-cockpit-astro/src/components/governance/ConsentStatus.tsx`
- `apps/corp-cockpit-astro/src/components/governance/DSARQueue.tsx`
- `apps/corp-cockpit-astro/src/components/governance/RetentionNotices.tsx`
- `apps/corp-cockpit-astro/src/components/governance/ExportAuditLog.tsx`

**Acceptance**:
- ✅ Consent status displayed
- ✅ DSAR queue visible
- ✅ Export audit log functional
- ✅ Retention notices show correctly

**Report**: `/reports/w3_phaseD_governance_ui.md`

---

### Slice H: Advanced A11y & Performance ⚡
**Owner**: perf-a11y-lead (sr-a11y-engineer, keyboard-nav-engineer, target-size-engineer, web-vitals-rum)
**Status**: ⏳ Pending

**Tasks**:
- [ ] Screen reader scripts for complex widgets (live regions for SSE)
- [ ] Keyboard navigation maps (roving tabindex, skip links)
- [ ] Target-size remediation (WCAG 2.2 AAA: 44×44px minimum)
- [ ] Route-level code-split, prefetch saved views
- [ ] Virtualize long evidence lists
- [ ] Fine-grained memoization in React components
- [ ] Web-vitals collection with route labels (OTel spans)
- [ ] CI: axe/Pa11y zero violations, Lighthouse budgets enforced

**Files**:
- `apps/corp-cockpit-astro/src/a11y/screenReaderScripts.ts`
- `apps/corp-cockpit-astro/src/a11y/keyboardNav.ts`
- `apps/corp-cockpit-astro/src/a11y/targetSizeAudit.md`
- `apps/corp-cockpit-astro/src/telemetry/web-vitals.ts`
- `.github/workflows/a11y.yml`
- `.github/workflows/lh-budgets.yml`

**Acceptance**:
- ✅ Screen reader navigation functional
- ✅ Keyboard nav complete (tab order documented)
- ✅ Target sizes meet WCAG 2.2 AAA
- ✅ Web-vitals collected to OTel
- ✅ A11y/LH CI jobs green

**Report**: `/reports/w3_phaseD_a11y_advanced.md` + `/reports/w3_phaseD_perf_hardening.md`

---

### Slice I: CSP & Trusted Types Compliance 🔒
**Owner**: perf-a11y-lead (csp-engineer) + qa-compliance-lead (sri-assets-engineer, csp-compliance-tester)
**Status**: ⏳ Pending

**Tasks**:
- [ ] Strict CSP (nonce-based, align with Worker 1 gateways)
- [ ] Remove all inline scripts, migrate to external files
- [ ] Register Trusted Types policy for DOM manipulation
- [ ] Subresource Integrity (SRI) for static assets
- [ ] Sanitize href/src attributes, forbid data: URLs
- [ ] CI: CSP violation tests, Trusted Types enforcement tests

**Files**:
- `apps/corp-cockpit-astro/src/security/CSP.md`
- `apps/corp-cockpit-astro/src/client/init/trustedTypes.ts`
- `apps/corp-cockpit-astro/src/utils/sanitizers.ts`
- `build/sri-hashes.json`
- `.github/workflows/csp-tests.yml`

**Acceptance**:
- ✅ CSP strict (no unsafe-inline, no unsafe-eval)
- ✅ Trusted Types policy registered
- ✅ SRI hashes generated for assets
- ✅ CI tests pass (no CSP violations)

**Report**: `/reports/w3_phaseD_csp_trusted_types.md`

---

### Slice J: Status & SLO Surface 🚦
**Owner**: enterprise-ux-lead (incident-ui-dev) + identity-lead (error-boundaries-dev)
**Status**: ⏳ Pending

**Tasks**:
- [ ] Status banner: pull SLO state from Worker 1/2 (ingestion, reporting, SSE)
- [ ] Incident shelf: display active incidents, link to runbooks
- [ ] Graceful UI degradation during incidents (disable non-essential features)
- [ ] Per-widget error boundaries with fallback UI
- [ ] Backend: Status endpoint aggregation (Worker 1/2 coordination)

**Files**:
- `apps/corp-cockpit-astro/src/components/status/StatusBanner.tsx`
- `apps/corp-cockpit-astro/src/components/status/IncidentShelf.tsx`
- `apps/corp-cockpit-astro/src/components/status/SLOIndicator.tsx`
- `apps/corp-cockpit-astro/src/components/common/ErrorBoundary.tsx`

**Acceptance**:
- ✅ Status banner reflects Worker 1/2 endpoints
- ✅ Incident shelf displays active incidents
- ✅ UI degrades gracefully during incidents
- ✅ Error boundaries catch widget failures

**Report**: `/reports/w3_phaseD_status_slo_ui.md`

---

### Slice K: Docs, Demos, Tests 📚
**Owner**: qa-compliance-lead (all testers) + reports-pack-lead (docs-scribe)
**Status**: ⏳ Pending

**Tasks**:
- [ ] Playwright E2E: Approval/Audit flows
- [ ] Playwright E2E: PWA offline, SSE resume
- [ ] Playwright E2E: PPTX export, watermarking
- [ ] Playwright E2E: SSO UI, SCIM mapping
- [ ] Visual regression: Partner portal, benchmarks
- [ ] Exec demo script: `/docs/demos/cxo_walkthrough.md`
- [ ] Update `/docs/cockpit/branding.md` with whitelabel constraints
- [ ] Update `/docs/cockpit/governance.md` with DSAR/consent flows

**Files**:
- `apps/corp-cockpit-astro/tests/e2e/approvals.spec.ts`
- `apps/corp-cockpit-astro/tests/e2e/pwa-offline.spec.ts`
- `apps/corp-cockpit-astro/tests/e2e/exec-pack.spec.ts`
- `apps/corp-cockpit-astro/tests/e2e/sso-ui.spec.ts`
- `apps/corp-cockpit-astro/tests/visual/partner-portal.spec.ts`
- `docs/demos/cxo_walkthrough.md`
- `docs/cockpit/branding.md`
- `docs/cockpit/governance.md`

**Acceptance**:
- ✅ All E2E tests pass
- ✅ Visual regression baselines established
- ✅ Demo script complete
- ✅ Documentation updated

**Report**: `/reports/w3_phaseD_e2e_results.md`

---

## Execution Order

### Wave 1: Core Enterprise Features (A, C, D)
1. **Slice A**: Approvals & Audit Mode (enterprise-ux-lead)
2. **Slice C**: SSO & SCIM UX (identity-lead)
3. **Slice D**: Executive Packs (reports-pack-lead)

### Wave 2: Resilience & Analytics (E, F)
4. **Slice E**: PWA Boardroom Mode (perf-a11y-lead)
5. **Slice F**: Benchmarks & Cohorts UI (enterprise-ux-lead + perf-a11y-lead)

### Wave 3: Governance & Hardening (G, H, I, J, K)
6. **Slice G**: Governance UI (enterprise-ux-lead + identity-lead)
7. **Slice H**: Advanced A11y & Performance (perf-a11y-lead)
8. **Slice I**: CSP & Trusted Types (perf-a11y-lead + qa-compliance-lead)
9. **Slice J**: Status & SLO Surface (enterprise-ux-lead + identity-lead)
10. **Slice K**: Docs, Demos, Tests (qa-compliance-lead + reports-pack-lead)

---

## Progress Tracking

**Overall**: 0 / 11 slices complete (0%)

| Slice | Focus | Owner | Status | Report |
|-------|-------|-------|--------|--------|
| A | Approvals & Audit | enterprise-ux-lead | ⏳ Pending | `/reports/w3_phaseD_approvals_audit.md` |
| B | Partner Portal | enterprise-ux + identity | ⏳ Pending | `/reports/w3_phaseD_partner_portal.md` |
| C | SSO & SCIM UX | identity-lead | ⏳ Pending | `/reports/w3_phaseD_sso_scim_ux.md` |
| D | Executive Packs | reports-pack-lead | ⏳ Pending | `/reports/w3_phaseD_exec_packs.md` |
| E | PWA Boardroom | perf-a11y-lead | ⏳ Pending | `/reports/w3_phaseD_pwa_boardroom.md` |
| F | Benchmarks & Cohorts | enterprise-ux + perf-a11y | ⏳ Pending | `/reports/w3_phaseD_benchmarks_ui.md` |
| G | Governance UI | enterprise-ux + identity | ⏳ Pending | `/reports/w3_phaseD_governance_ui.md` |
| H | A11y & Performance | perf-a11y-lead | ⏳ Pending | `/reports/w3_phaseD_a11y_advanced.md` + `perf_hardening.md` |
| I | CSP & Trusted Types | perf-a11y + qa-compliance | ⏳ Pending | `/reports/w3_phaseD_csp_trusted_types.md` |
| J | Status & SLO | enterprise-ux + identity | ⏳ Pending | `/reports/w3_phaseD_status_slo_ui.md` |
| K | Docs, Demos, Tests | qa-compliance + reports-pack | ⏳ Pending | `/reports/w3_phaseD_e2e_results.md` |

**Last Updated**: 2025-11-14 (Orchestration Start)

---

## Coordination with Workers 1 & 2

### Worker 1 (IaC/Security/Observability)
**Dependencies**:
- OIDC/SAML metadata endpoints (for SSO UI)
- CSP header configuration alignment
- OTel/Sentry wiring for web-vitals
- Status/SLO endpoints for incident shelf
- Secrets management for AI/export services

**Communication**: Tag Worker 1 on CSP, SSO, OTel PRs

### Worker 2 (Backend Services)
**Dependencies**:
- Approval state API (save/retrieve approvals)
- DW cohort/benchmark aggregates
- Governance endpoints (consent, DSAR, export logs)
- Export service extensions (PPTX generation)
- Evidence lineage API extensions

**Communication**: Tag Worker 2 on reporting, DW, governance PRs

---

## Non-Negotiables

1. **Evidence lineage mandatory** for all claims and reports
2. **No secrets in frontend** - all sensitive operations server-side
3. **Privacy-first**: redaction on server, no raw PII in UI
4. **WCAG 2.2 AAA target** for critical paths (minimum AA everywhere)
5. **CSP strict** - no unsafe-inline, no unsafe-eval
6. **Feature flags** for all Phase D features
7. **Tenant isolation** enforced at DB and API layers
8. **All AI outputs cite evidence** with provenance chains

---

## Success Criteria

- ✅ Approvals workflow complete (draft → approved → locked) with version history
- ✅ Audit Mode functional (lineage overlay, frozen UI)
- ✅ Partner portal displays tenants + whitelabel pack exports
- ✅ SSO/SCIM UX surfaces present (read-only, role mapping works)
- ✅ Executive packs: PDF watermarked, PPTX exported, narratives configurable
- ✅ PWA installs, offline mode works, SSE resumes with last-event-id
- ✅ Benchmarks UI renders DW cohorts with percentile ribbons
- ✅ Governance UI shows consent, DSAR, export logs
- ✅ A11y/LH budgets green (WCAG 2.2 AAA target sizes)
- ✅ CSP strict + Trusted Types enabled, SRI in place
- ✅ Status banner reflects Worker 1/2 SLOs, incident shelf degrades UI gracefully
- ✅ All E2E tests pass, visual regression baselines established
- ✅ Reports produced for all slices (A-K)

---

## Final Deliverable

**Master Report**: `/reports/worker3_phaseD_prod_launch.md`

Contents:
- Executive summary
- All slice reports aggregated
- Screenshots of key features
- Metrics (LOC, tests, coverage)
- Sign-offs from all 5 leads
- Open risks and mitigation plans
- Production readiness checklist

---

**Orchestration Start**: 2025-11-14
**Next Action**: Execute Wave 1 (Slices A, C, D)
