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

# Worker 4 Phase D: Communications, Experiences & Quality

**Status**: 🚀 In Progress
**Branch**: `claude/worker4-phase-d-comms-quality-01TBR1yoTekYbhJsRJbFfsij`
**Started**: 2025-11-14
**Target Completion**: TBD

---

## Mission

Complete the experience and quality layer for the platform:
- Multi-channel notifications (email/SMS/push) with GDPR compliance
- Full Discord bot integration with VIS updates and Q2Q feedback
- Enhanced cockpit UX (saved views, share links, Impact-In monitor)
- Comprehensive automated quality gates (E2E, A11y, visual regression)
- Production-ready reporting exports with watermarking and server-side rendering

---

## Team Structure (30 agents / 5 leads)

### 1. **Notifications & Messaging Lead** (6 agents)
- **Email Provider Engineer**: SendGrid implementation with templates, tracking, webhooks
- **SMS Provider Engineer**: Twilio integration with E.164 validation, delivery status
- **Push Provider Engineer**: FCM implementation with device registry, topics, batching
- **Queue & Retry Engineer**: BullMQ/RabbitMQ integration, rate limiting, backoff strategies
- **Template Engineer**: MJML templates, localization (en/no/uk), variable substitution
- **Delivery Tracking Engineer**: Status webhooks, audit logs, per-tenant quotas

**Lead Responsibilities**: Deliver production-ready notification infrastructure with GDPR compliance, rate limits, and audit trails

---

### 2. **Discord Integration Lead** (5 agents)
- **Command Developer**: Implement /feedback, /recognize, /help with permissions
- **Q2Q Integration Engineer**: Wire feedback to Q2Q AI service
- **Role & VIS Engineer**: Role assignment logic, VIS score updates
- **Webhook Developer**: Milestone announcements, activity feeds
- **Testing & Documentation Engineer**: Command testing, usage guides

**Lead Responsibilities**: Complete Discord bot with Q2Q feedback loop and VIS scoring system

---

### 3. **Cockpit Experience Lead** (7 agents)
- **Saved Views Backend Engineer**: CRUD APIs for dashboard views (tenant-scoped)
- **Saved Views Frontend Engineer**: Save/load/delete UI components
- **Share Links Backend Engineer**: Signed URL generation with TTL validation
- **Share Links Frontend Engineer**: Share modal, read-only mode, boardroom display
- **Impact-In Monitor Backend Engineer**: Delivery history API, replay functionality
- **Impact-In Monitor Frontend Engineer**: Delivery timeline UI, mapping preview
- **UX Polish Engineer**: Loading states, error handling, empty states

**Lead Responsibilities**: Deliver saved views, share links, and Impact-In monitoring UI

---

### 4. **Quality Automation Lead** (7 agents)
- **E2E Test Engineer**: Playwright tests for tenant routing, evidence, reports, exports
- **Visual Regression Engineer**: Snapshot testing for widgets, layouts, themes
- **A11y Testing Engineer**: axe-core/Pa11y integration, WCAG 2.2 AA validation
- **Performance Test Engineer**: Web vitals tracking, Lighthouse budgets
- **Security Test Engineer**: Tenant isolation, share link validation, XSS/CSRF tests
- **CI/CD Engineer**: GitHub Actions workflows, test parallelization, artifact management
- **Test Data Engineer**: Fixtures, mocks, seed data for test scenarios

**Lead Responsibilities**: Achieve >80% test coverage with automated quality gates in CI

---

### 5. **Reporting & Export Lead** (5 agents)
- **PDF Watermarking Engineer**: Puppeteer/Playwright PDF generation with branding
- **Chart Rendering Engineer**: Server-side chart exports (ChartJS → PNG/SVG)
- **PPT Export Engineer**: PowerPoint generation with charts and narratives
- **Export Security Engineer**: Redaction, tenant watermarks, download audit logs
- **Export Testing Engineer**: Test PDF/CSV/JSON/PPT exports across tenants

**Lead Responsibilities**: Production-ready exports with watermarking and audit trails

---

## Deliverables (Slices A-H)

### Slice A: Notifications Service - Email Provider ✉️
**Owner**: Notifications & Messaging Lead → Email Provider Engineer

**Tasks**:
- [ ] Complete SendGrid integration (already started)
  - [ ] Verify template rendering (MJML → HTML)
  - [ ] Add localization support (en/no/uk)
  - [ ] Implement webhook endpoint for delivery status
  - [ ] Add rate limiting per tenant (configurable limits)
  - [ ] Audit logging for all sends
- [ ] Test scheduled notifications (weekly reports, milestone alerts)
- [ ] Document setup in `/docs/Notifications_Integration.md`

**Files**:
- `services/notifications/src/providers/sendgrid.ts` (✅ exists)
- `services/notifications/src/templates/*.mjml` (✅ exists)
- `services/notifications/src/webhooks/sendgrid.ts` (create)
- `services/notifications/src/lib/rate-limiter.ts` (✅ exists)
- `services/notifications/src/lib/audit-logger.ts` (create)

**Acceptance**:
- ✅ SendGrid sends emails with localized templates
- ✅ Webhooks track delivery/open/click events
- ✅ Rate limits enforced per tenant
- ✅ Audit log captures all notification attempts

---

### Slice B: Notifications Service - SMS & Push Providers 📱
**Owner**: Notifications & Messaging Lead → SMS & Push Engineers

**Tasks**:
- [ ] Implement Twilio SMS provider (replace stub)
  - [ ] E.164 phone number validation
  - [ ] SMS rate limiting and delivery tracking
  - [ ] Status webhooks (queued/sent/delivered/failed)
  - [ ] Character count validation (1600 max)
- [ ] Implement FCM push provider (replace stub)
  - [ ] Device token registry (per user/tenant)
  - [ ] Topic-based notifications
  - [ ] Batch sending for multiple devices
  - [ ] Push notification analytics
- [ ] Add per-tenant channel preferences (email/SMS/push toggles)
- [ ] Test notification workflows end-to-end

**Files**:
- `services/notifications/src/providers/twilio.ts` (upgrade stub)
- `services/notifications/src/providers/fcm.ts` (upgrade stub)
- `services/notifications/src/models/device-tokens.ts` (create)
- `services/notifications/src/webhooks/twilio.ts` (create)
- `services/notifications/src/routes/preferences.ts` (create)

**Acceptance**:
- ✅ Twilio sends SMS with E.164 validation
- ✅ FCM sends push to registered devices
- ✅ Batch notifications work for 100+ recipients
- ✅ Per-tenant channel preferences respected

---

### Slice C: Discord Bot - Commands & Q2Q Integration 🤖
**Owner**: Discord Integration Lead → Command & Q2Q Engineers

**Tasks**:
- [ ] Complete `/feedback` command
  - [ ] Wire to Q2Q AI service (POST /q2q/feedback)
  - [ ] Add sentiment analysis option
  - [ ] Store feedback with user/tenant context
  - [ ] Return confirmation with tracking ID
- [ ] Complete `/recognize` command
  - [ ] Assign Discord role based on badge level
  - [ ] Update VIS score in database (POST /reporting/vis-update)
  - [ ] Post public recognition in channel
  - [ ] DM volunteer with achievement details
- [ ] Implement `/help` command
  - [ ] List available commands with descriptions
  - [ ] Role-specific help (admin vs volunteer)
  - [ ] Link to documentation
- [ ] Add admin-only permissions guard
- [ ] Test all commands in staging Discord server

**Files**:
- `services/discord-bot/src/commands/feedback.ts` (✅ exists, enhance)
- `services/discord-bot/src/commands/recognize.ts` (✅ exists, complete TODOs)
- `services/discord-bot/src/commands/help.ts` (create)
- `services/discord-bot/src/utils/roleManager.ts` (create)
- `services/discord-bot/src/utils/visUpdater.ts` (create)
- `services/reporting/routes/vis-update.ts` (create)

**Acceptance**:
- ✅ `/feedback` ingests to Q2Q pipeline
- ✅ `/recognize` assigns roles and updates VIS
- ✅ `/help` displays role-appropriate guidance
- ✅ Permissions enforced (admin commands)

---

### Slice D: Cockpit - Saved Views (Backend) 💾
**Owner**: Cockpit Experience Lead → Saved Views Backend Engineer

**Tasks**:
- [ ] Create saved views data model (tenant-scoped)
- [ ] Implement CRUD endpoints:
  - [ ] POST /api/views (create saved view)
  - [ ] GET /api/views (list views for user/tenant)
  - [ ] GET /api/views/:id (load view)
  - [ ] PUT /api/views/:id (update view)
  - [ ] DELETE /api/views/:id (delete view)
- [ ] Add view metadata: name, filters, dateRange, chartConfigs
- [ ] Implement RBAC: users see own views + shared views
- [ ] Add validation for view payloads
- [ ] Write integration tests

**Files**:
- `services/reporting/src/models/saved-views.ts` (create)
- `services/reporting/src/controllers/savedViews.ts` (create)
- `services/reporting/src/routes/saved-views.ts` (create)
- `services/reporting/src/middleware/viewValidation.ts` (create)
- `services/reporting/tests/saved-views.test.ts` (create)

**Acceptance**:
- ✅ Users can save dashboard configurations
- ✅ Views scoped to tenant + user
- ✅ CRUD operations work with RBAC
- ✅ Validation prevents malformed views

---

### Slice E: Cockpit - Saved Views (Frontend) 💾
**Owner**: Cockpit Experience Lead → Saved Views Frontend Engineer

**Tasks**:
- [ ] Create "Save View" button in dashboard header
- [ ] Build SaveViewModal component (name, description, visibility)
- [ ] Create saved views sidebar/dropdown
- [ ] Implement load view functionality (restore filters/charts)
- [ ] Add delete/edit view actions
- [ ] Show loading states and error handling
- [ ] Add empty state for no saved views
- [ ] Test responsiveness and keyboard navigation

**Files**:
- `apps/corp-cockpit-astro/src/components/views/SaveViewModal.tsx` (create)
- `apps/corp-cockpit-astro/src/components/views/ViewsList.tsx` (create)
- `apps/corp-cockpit-astro/src/components/views/ViewsDropdown.tsx` (create)
- `apps/corp-cockpit-astro/src/hooks/useSavedViews.ts` (create)
- `apps/corp-cockpit-astro/src/lib/viewsApi.ts` (create)

**Acceptance**:
- ✅ Users can save current dashboard state
- ✅ Saved views load correctly (filters + charts)
- ✅ Delete/edit actions work
- ✅ UI is responsive and accessible

---

### Slice F: Cockpit - Share Links 🔗
**Owner**: Cockpit Experience Lead → Share Links Engineers

**Tasks**:
- [ ] Backend: Generate signed share links with TTL
  - [ ] POST /api/share-links (create link from view)
  - [ ] GET /api/share-links/:token (validate and load)
  - [ ] Add expiry validation (1h/24h/7d/30d options)
  - [ ] Signature verification (HMAC-SHA256)
  - [ ] Read-only enforcement (no mutations allowed)
- [ ] Frontend: Share link modal and display
  - [ ] ShareLinkModal component (generate link UI)
  - [ ] Copy-to-clipboard functionality
  - [ ] QR code generation for mobile
  - [ ] Boardroom mode (auto-refresh, large fonts)
  - [ ] Share link viewer page (read-only)
- [ ] Add audit log for share link access
- [ ] Test tenant isolation for shared links

**Files**:
- `services/reporting/src/controllers/shareLinks.ts` (create)
- `services/reporting/src/routes/share-links.ts` (create)
- `services/reporting/src/utils/signedLinks.ts` (create)
- `apps/corp-cockpit-astro/src/components/share/ShareLinkModal.tsx` (create)
- `apps/corp-cockpit-astro/src/pages/[lang]/shared/[token].astro` (create)
- `apps/corp-cockpit-astro/src/components/share/BoardroomMode.tsx` (create)

**Acceptance**:
- ✅ Share links generated with TTL
- ✅ Links validate signature and expiry
- ✅ Read-only mode enforced
- ✅ Boardroom mode displays correctly
- ✅ Tenant isolation verified

---

### Slice G: Cockpit - Impact-In Delivery Monitor 📊
**Owner**: Cockpit Experience Lead → Impact-In Monitor Engineers

**Tasks**:
- [ ] Backend: Delivery history API
  - [ ] GET /api/impact-in/deliveries?platform=benevity
  - [ ] GET /api/impact-in/deliveries/:id (detail view)
  - [ ] POST /api/impact-in/replay/:id (retry failed delivery)
  - [ ] Return: timestamp, platform, payload, status, attempts
- [ ] Frontend: Delivery monitor page
  - [ ] Timeline view of all deliveries
  - [ ] Filter by platform (Benevity/Goodera/Workday)
  - [ ] Status badges (success/pending/failed)
  - [ ] Payload preview (JSON diff view)
  - [ ] Retry button for failed deliveries
- [ ] Add mapping preview (what we send vs. what they expect)
- [ ] Test with mock delivery data

**Files**:
- `services/reporting/src/controllers/impactInMonitor.ts` (create)
- `services/reporting/src/routes/impact-in-monitor.ts` (create)
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/impact-in.astro` (create)
- `apps/corp-cockpit-astro/src/components/impact-in/DeliveryTimeline.tsx` (create)
- `apps/corp-cockpit-astro/src/components/impact-in/PayloadPreview.tsx` (create)
- `apps/corp-cockpit-astro/src/components/impact-in/MappingPreview.tsx` (create)

**Acceptance**:
- ✅ Delivery history displays all pushes
- ✅ Filter by platform works
- ✅ Replay functionality retries failed deliveries
- ✅ Payload preview shows JSON diffs
- ✅ Mapping preview accurate

---

### Slice H: E2E Test Coverage 🧪
**Owner**: Quality Automation Lead → E2E Test Engineer

**Tasks**:
- [ ] Tenant routing tests
  - [ ] Test company selector at login
  - [ ] Verify tenant-scoped routes (/[lang]/cockpit/[companyId]/*)
  - [ ] Test RBAC enforcement (admin vs user)
- [ ] Evidence explorer tests
  - [ ] Browse Q2Q evidence with filters
  - [ ] Open lineage drawer
  - [ ] Copy-for-CSRD export
- [ ] Saved views & share links tests
  - [ ] Save dashboard view
  - [ ] Load saved view
  - [ ] Generate share link
  - [ ] Open share link in incognito (read-only)
- [ ] Report generation tests
  - [ ] Generate quarterly report
  - [ ] Preview report
  - [ ] Export PDF/CSV
- [ ] Impact-In monitor tests
  - [ ] View delivery history
  - [ ] Filter by platform
  - [ ] Replay failed delivery
- [ ] Run tests in CI (chromium/firefox/webkit)

**Files**:
- `apps/corp-cockpit-astro/tests/e2e/tenant-routing.spec.ts` (create)
- `apps/corp-cockpit-astro/tests/e2e/evidence-explorer.spec.ts` (create)
- `apps/corp-cockpit-astro/tests/e2e/saved-views.spec.ts` (create)
- `apps/corp-cockpit-astro/tests/e2e/share-links.spec.ts` (create)
- `apps/corp-cockpit-astro/tests/e2e/reports.spec.ts` (enhance)
- `apps/corp-cockpit-astro/tests/e2e/impact-in.spec.ts` (create)

**Acceptance**:
- ✅ 10+ E2E flows covered
- ✅ Tests pass in CI across 3 browsers
- ✅ Video recordings on failure
- ✅ Test coverage >80%

---

### Slice I: A11y Fixes & Visual Regression 🎨
**Owner**: Quality Automation Lead → A11y & Visual Engineers

**Tasks**:
- [ ] Run axe-core audit on all pages
- [ ] Fix critical WCAG 2.2 AA violations:
  - [ ] Keyboard navigation issues
  - [ ] Focus indicators missing
  - [ ] Color contrast failures
  - [ ] Missing ARIA labels
  - [ ] Interactive element target sizes
- [ ] Run Pa11y CI for automated checks
- [ ] Visual regression baseline:
  - [ ] Dashboard widgets
  - [ ] Evidence drawer
  - [ ] Report modal
  - [ ] Saved views UI
  - [ ] Share link viewer
  - [ ] Mobile responsive views
- [ ] Generate A11y audit report (`/reports/a11y_phaseD.md`)
- [ ] Set CI to fail on critical violations

**Files**:
- `apps/corp-cockpit-astro/tests/a11y/accessibility.spec.ts` (enhance)
- `apps/corp-cockpit-astro/tests/e2e/visual.spec.ts` (enhance)
- `.github/workflows/a11y.yml` (✅ exists)
- `.github/workflows/e2e.yml` (✅ exists, enhance)
- `reports/a11y_phaseD.md` (create)

**Acceptance**:
- ✅ No critical WCAG 2.2 AA violations
- ✅ A11y CI job passes
- ✅ Visual regression baselines established
- ✅ Lighthouse accessibility score ≥95%

---

### Slice J: PDF Watermarking & Chart Rendering 📄
**Owner**: Reporting & Export Lead → PDF & Chart Engineers

**Tasks**:
- [ ] Implement server-side chart rendering
  - [ ] Convert ChartJS canvas to PNG/SVG
  - [ ] Use Puppeteer/Playwright for headless rendering
  - [ ] Cache rendered charts (Redis/disk)
- [ ] Add PDF watermarking utilities
  - [ ] Tenant logo overlay
  - [ ] "CONFIDENTIAL" watermark with timestamp
  - [ ] Page numbering and headers/footers
- [ ] Wire into reporting service PDF export
- [ ] Test watermarking across tenants
- [ ] Add export audit log (who exported what/when)
- [ ] Document watermark customization options

**Files**:
- `services/reporting/src/utils/chartRenderer.ts` (create)
- `services/reporting/src/utils/pdfWatermark.ts` (create)
- `services/reporting/src/utils/pdfExport.ts` (enhance)
- `services/reporting/src/lib/exportAudit.ts` (create)
- `docs/Reporting_Exports.md` (create)

**Acceptance**:
- ✅ Charts render server-side in PDFs
- ✅ Watermarks applied per tenant
- ✅ Export audit log captures all downloads
- ✅ PDF exports include branding and timestamps

---

## Progress Tracking

**Overall**: 0 / 62 tasks complete (0%)

| Slice | Focus | Tasks | Complete | % |
|-------|-------|-------|----------|---|
| A. Notifications - Email | SendGrid completion | 5 | 0 | 0% |
| B. Notifications - SMS/Push | Twilio + FCM | 6 | 0 | 0% |
| C. Discord Bot | Commands + Q2Q | 7 | 0 | 0% |
| D. Saved Views - Backend | CRUD APIs | 6 | 0 | 0% |
| E. Saved Views - Frontend | UI components | 8 | 0 | 0% |
| F. Share Links | Backend + Frontend | 10 | 0 | 0% |
| G. Impact-In Monitor | Delivery tracking UI | 7 | 0 | 0% |
| H. E2E Tests | Playwright coverage | 6 | 0 | 0% |
| I. A11y & Visual | WCAG compliance | 6 | 0 | 0% |
| J. PDF & Watermarking | Export polish | 6 | 0 | 0% |

**Last Updated**: 2025-11-14 by Worker 4 Lead

---

## Integration Points

### Worker 2 (Backend Services)
**Coordination**:
- Q2Q AI service must accept feedback from Discord bot
- Reporting service VIS update endpoint for Discord recognition
- Impact-In delivery APIs for monitor UI

**Communication**: Tag Worker 2 on PRs for Q2Q integration, VIS updates

### Worker 3 (Corporate Cockpit)
**Coordination**:
- Saved views and share links extend cockpit functionality
- Impact-In monitor is a new cockpit page
- A11y fixes apply to existing cockpit components

**Communication**: Extend Phase C work, ensure no regressions

---

## Documentation Deliverables

**Phase D Docs** (all in `/docs/`):
- [ ] `/docs/Notifications_Integration.md` - Email/SMS/Push setup guide
- [ ] `/docs/Discord_Usage_Guide.md` - Command reference, Q2Q flow
- [ ] `/docs/Cockpit_Saved_Views.md` - Saved views and share links
- [ ] `/docs/Impact_In_Monitor.md` - Delivery tracking guide
- [ ] `/docs/Reporting_Exports.md` - PDF watermarking, chart rendering
- [ ] `/reports/worker4_phaseD_results.md` - Final execution report
- [ ] `/reports/a11y_phaseD.md` - Accessibility audit
- [ ] `/reports/e2e_coverage_phaseD.md` - Test coverage report

---

## Non-Negotiables

1. **GDPR Compliance**: PII redaction in notifications, opt-in per consent
2. **Multi-tenant Isolation**: All features scoped to company, no data leaks
3. **Signed Share Links**: HMAC signature, TTL enforcement, read-only
4. **WCAG 2.2 AA**: No critical violations, Lighthouse ≥95%
5. **Test Coverage**: E2E for all new flows, visual regression baselines
6. **Audit Trails**: Log all exports, notifications, share link access
7. **Rate Limiting**: Per-tenant quotas for notifications and exports
8. **No Secrets in Code**: All API keys in env vars, never committed

---

## Success Criteria

- ✅ Email/SMS/push notifications deliver with rate limits and audit logs
- ✅ Discord `/feedback` ingests to Q2Q, `/recognize` updates VIS
- ✅ Users can save views, generate share links (TTL), open read-only
- ✅ Impact-In monitor displays delivery history, replay works
- ✅ E2E suite covers 10+ flows, runs in CI
- ✅ A11y CI passes (no criticals), Lighthouse ≥95%
- ✅ Visual regression baselines established
- ✅ PDF exports include watermarking, server-side charts
- ✅ Export audit logs track all downloads
- ✅ All docs written, final report generated

---

## Next Actions

1. **Notifications Lead**: Complete SendGrid integration (Slice A)
2. **Notifications Lead**: Implement Twilio + FCM (Slice B)
3. **Discord Lead**: Wire feedback to Q2Q, complete recognize (Slice C)
4. **Cockpit Lead**: Build saved views backend (Slice D)
5. **Cockpit Lead**: Build saved views frontend (Slice E)
6. **Cockpit Lead**: Implement share links (Slice F)
7. **Cockpit Lead**: Build Impact-In monitor (Slice G)
8. **Quality Lead**: Expand E2E test coverage (Slice H)
9. **Quality Lead**: Fix A11y issues, visual baselines (Slice I)
10. **Reporting Lead**: Add PDF watermarking, chart rendering (Slice J)

**Orchestrator (Worker 4 Lead)**: Coordinate across leads, unblock dependencies, update plan daily