# Worker 3 Phase C: Pilot Orchestration & Enterprise Readiness

**Orchestrator**: Tech Lead (Worker 3)
**Branch**: `claude/worker3-phaseC-pilot-orchestration-011CV5u3ykujYMXifwU2KZQX`
**Status**: 🚀 Planning Complete - Ready for Execution
**Date Started**: 2025-11-13
**Target Completion**: TBD

---

## Executive Summary

Worker 3 Phase C transforms the Corporate Cockpit into a pilot-grade, enterprise-ready CSR platform. This phase focuses on:

1. **Multi-tenant isolation** with company-scoped data and configuration
2. **AI-powered generative reporting** with mandatory evidence lineage
3. **Evidence Explorer** for auditable Q2Q insights
4. **Performance hardening** to meet enterprise budgets (LCP ≤ 2.0s, INP ≤ 200ms)
5. **Enterprise features**: saved views, scheduled exports, PDF reports
6. **White-label theming** with per-tenant branding
7. **Impact-In delivery monitoring** for external integrations (Benevity/Goodera/Workday)
8. **WCAG 2.2 AA compliance** enforced by CI

---

## Mission Statement

Take the production-ready Corporate Cockpit from Phase B and deliver a pilot deployment with:
- Real tenant data and strict RBAC enforcement
- AI-generated narratives that cite evidence for every claim
- Auditable evidence trails for regulatory reporting (CSRD)
- Sub-2-second page loads with real-user monitoring
- Comprehensive accessibility coverage
- White-label branding for multiple corporate customers

---

## Team Structure

### 5 Leads × 6 Specialists = 30 Agents

#### 1. Frontend Lead (6 agents)
- Astro/React Engineer (tenant routing, admin console)
- Evidence Explorer Engineer (Q2Q browser, lineage drawer)
- Report UI Engineer (gen-AI modals, preview, export)
- Performance Engineer (web-vitals, chart optimization)
- Accessibility Engineer (WCAG 2.2 AA, axe/Pa11y)
- Theming Engineer (multi-tenant styles, logo/colors)

#### 2. Reporting Services Lead (6 agents)
- Gen-Reports API Engineer (server-side generation with citations)
- Evidence API Engineer (Q2Q query APIs)
- Export Service Engineer (PDF/CSV rendering)
- Scheduler Engineer (cron-based scheduled reports)
- Impact-In Monitor Engineer (delivery tracking)
- Audit Log Engineer (export activity tracking)

#### 3. AI & Safety Lead (6 agents)
- Generative Reporting Architect (prompt templates, narrative builder)
- Citation & Lineage Engineer (evidence ID tracking)
- Guardrails Engineer (token budgets, redaction, PII masking)
- Safety Reviewer (content screening, disclaimers)
- Prompt Template Engineer (versioning, deterministic seeds)
- Model Integration Engineer (OpenAI/Claude API, error handling)

#### 4. Performance & Infrastructure Lead (6 agents)
- Web-Vitals Engineer (RUM, LCP/INP/CLS to OTel)
- Frontend Performance Engineer (data windowing, memoization)
- Backend Optimization Engineer (query caching, ETag)
- Lighthouse Engineer (CI budgets, regression detection)
- Observability Engineer (OTel trace correlation)
- Deployment Engineer (staging playbook, feature flags)

#### 5. QA & Hardening Lead (6 agents)
- E2E Test Engineer (Playwright: auth, widgets, evidence, reports)
- A11y Test Engineer (automated CI, keyboard testing)
- Visual Regression Engineer (Storybook + Chromatic/Ladle)
- i18n Test Engineer (missing keys, RTL readiness)
- Integration Test Engineer (API contract tests)
- Security Test Engineer (tenant isolation, share links, secrets)

---

## Deliverables (9 Slices)

### Slice A: Pilot & Tenantization 🏢
**Status**: ⏳ Pending
**Owner**: Frontend Lead + Reporting Services Lead

**Objective**: Enable multi-tenant deployment with company-scoped data and admin controls

**Features**:
- Tenant selector at login (company picker)
- Tenant-scoped routes: `/[lang]/cockpit/[companyId]/*`
- Company admin console: API keys, Impact-In toggles, SROI/VIS overrides
- Backend tenant-scoped queries (filter by companyId)
- Staging deployment playbook
- Remove demo credentials in staging/prod
- Feature flags for pilot features

**Files**:
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/index.astro`
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/admin.astro`
- `apps/corp-cockpit-astro/src/components/tenant/TenantSelector.tsx`
- `services/reporting/middleware/tenantScope.ts`
- `docs/pilot/staging_rollout.md`

**Acceptance Criteria**:
- ✅ Staging cockpit runs with real tenant data
- ✅ RBAC enforces tenant boundaries (no cross-tenant data leaks)
- ✅ Demo credentials disabled in staging/prod
- ✅ Feature flags allow pilot feature toggling

**Dependencies**: None (foundational slice)

---

### Slice B: Evidence Explorer 🔍
**Status**: ⏳ Pending
**Owner**: Frontend Lead + Reporting Services Lead

**Objective**: Provide auditable Q2Q evidence exploration with lineage traceability

**Features**:
- Evidence Explorer panel: browse Q2Q evidence by time, program, label, cohort
- Display anonymized snippets with provenance links
- "Why this metric?" button on widgets → lineage drawer
- Lineage view: aggregation → evidence IDs → snippet preview
- "Copy for CSRD" button: safe, redacted text export
- Backend APIs: GET /evidence, GET /lineage/:metricId

**Files**:
- `apps/corp-cockpit-astro/src/components/evidence/EvidenceExplorer.tsx`
- `apps/corp-cockpit-astro/src/components/evidence/LineageDrawer.tsx`
- `services/reporting/routes/evidence.ts`
- `services/reporting/routes/lineage.ts`
- `packages/shared-clients/reporting.ts`

**Acceptance Criteria**:
- ✅ Evidence Explorer shows anonymized Q2Q snippets
- ✅ "Why this metric?" opens lineage with full citation chain
- ✅ Copy-for-CSRD exports redacted text
- ✅ No raw PII in UI (all redaction server-side)

**Dependencies**: Slice A (tenant-scoped queries)

---

### Slice C: Generative Reporting Assistant 🤖
**Status**: ⏳ Pending
**Owner**: AI & Safety Lead + Reporting Services Lead

**Objective**: AI-powered report generation with mandatory evidence citations

**Features**:
- POST /reporting/gen-reports:generate API
- Input: companyId, period, filters
- Output: narrative (sections), chart recommendations, **citations (evidence IDs)**
- Guardrails: token budget, redaction, prompt templates with disclaimers
- Deterministic seed option for reproducible reports
- UI: "Generate Quarterly Report" modal → preview → edit → export PDF
- Prompt versioning, failure modes, retry logic

**Files**:
- `services/reporting/routes/gen-reports.ts`
- `services/reporting/prompts/quarterlyReport.ts`
- `services/reporting/utils/redaction.ts`
- `apps/corp-cockpit-astro/src/components/reports/GenerateReportModal.tsx`
- `apps/corp-cockpit-astro/src/components/reports/ReportPreview.tsx`
- `docs/cockpit/gen_reporting.md`

**Acceptance Criteria**:
- ✅ Gen-AI report generates with citations for all claims
- ✅ Redaction applied to PII in narratives
- ✅ Prompt versioning tracked (v1, v2, etc.)
- ✅ UI allows preview + minor text edits
- ✅ No secrets in frontend (all AI calls server-side)

**Dependencies**: Slice B (evidence APIs for citations)

---

### Slice D: Exports & Scheduling 📤
**Status**: ⏳ Pending
**Owner**: Reporting Services Lead + QA Lead

**Objective**: Server-side PDF rendering and scheduled report delivery

**Features**:
- PDF export: server-side render via Playwright/Puppeteer
- PDF: header/footer, logo, page numbers, theme sync
- Scheduled reports: company admins schedule monthly/quarterly emails
- Backend: Cron job for scheduled exports
- Export audit log (who exported what/when)
- Delivery status UI (success/failure, retry)
- Email service integration

**Files**:
- `services/reporting/routes/exports.ts`
- `services/reporting/utils/pdfRenderer.ts`
- `services/reporting/cron/scheduledReports.ts`
- `services/reporting/routes/exportAudit.ts`
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/exports.astro`
- `apps/corp-cockpit-astro/src/components/exports/ScheduleModal.tsx`

**Acceptance Criteria**:
- ✅ PDF export renders correctly with tenant branding
- ✅ Scheduled emails fire in staging (cron job works)
- ✅ Export audit log shows all activity
- ✅ Delivery status UI displays success/failure

**Dependencies**: Slice C (gen-reports for PDF content), Slice H (theming for PDF branding)

---

### Slice E: Performance, Web-Vitals, A11y ⚡
**Status**: ⏳ Pending
**Owner**: Performance & Infrastructure Lead + QA Lead

**Objective**: Meet enterprise performance budgets and WCAG 2.2 AA compliance

**Features**:
- Web-vitals collector: send LCP, INP, CLS to OTel from frontend
- Lighthouse budgets: LCP ≤ 2.0s, INP ≤ 200ms on staging data
- Chart optimizations: data windowing, memoization, virtualization
- Backend: ETag/If-None-Match caching for report queries
- Full WCAG 2.2 AA sweep: focus order, target size, keyboard operability
- axe/Pa11y CI job (fail on violations)
- Performance report with screenshots
- A11y audit report

**Files**:
- `apps/corp-cockpit-astro/src/utils/webVitals.ts`
- `apps/corp-cockpit-astro/src/components/charts/OptimizedChart.tsx`
- `services/reporting/middleware/caching.ts`
- `.github/workflows/a11y.yml`
- `reports/worker3_phaseC_pilot.md` (this file - will include perf data)
- `reports/a11y_audit_phaseC.md`

**Acceptance Criteria**:
- ✅ Web-vitals collected to OTel (correlation with backend traces)
- ✅ LCP ≤ 2.0s, INP ≤ 200ms on staging
- ✅ A11y CI job passes (no violations)
- ✅ Performance report shows budgets met with evidence

**Dependencies**: Slice A (staging deployment for real-user metrics)

---

### Slice F: Saved Views & Share Links 💾
**Status**: ⏳ Pending
**Owner**: Frontend Lead + Reporting Services Lead

**Objective**: Enable dashboard personalization and secure sharing

**Features**:
- Save dashboard filters as named "views" (tenant-scoped)
- Backend: POST /views, GET /views, DELETE /views/:id
- Generate signed share links (read-only) with TTL
- "Boardroom mode" display: auto-refresh, large typography
- Share link validation middleware (signature + expiry check)

**Files**:
- `services/reporting/routes/savedViews.ts`
- `services/reporting/routes/shareLinks.ts`
- `services/reporting/utils/signedLinks.ts`
- `apps/corp-cockpit-astro/src/components/views/SaveViewModal.tsx`
- `apps/corp-cockpit-astro/src/components/views/ShareLinkModal.tsx`
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/shared/[linkId].astro`

**Acceptance Criteria**:
- ✅ Users can save and load dashboard views
- ✅ Share links work (read-only, TTL enforced)
- ✅ Boardroom mode displays correctly (auto-refresh works)

**Dependencies**: Slice A (tenant-scoped views)

---

### Slice G: Impact-In Delivery Monitor 📊
**Status**: ⏳ Pending
**Owner**: Reporting Services Lead + Backend Lead (Worker 2)

**Objective**: Monitor and replay Impact-In data pushes to external platforms

**Features**:
- Backend: GET /impact-in/deliveries?platform (Benevity/Goodera/Workday)
- Display: last push timestamp, payload type, attempt count, status
- Replay functionality: POST /impact-in/replay/:deliveryId
- Per-platform mapping preview (what we will send vs. what was sent)
- UI page showing delivery history

**Files**:
- `services/reporting/routes/impact-in-monitor.ts`
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/impact-in.astro`
- `apps/corp-cockpit-astro/src/components/impact-in/DeliveryHistory.tsx`
- `apps/corp-cockpit-astro/src/components/impact-in/MappingPreview.tsx`

**Acceptance Criteria**:
- ✅ Delivery history shows all pushes (success/failure)
- ✅ Replay works for failed deliveries
- ✅ Mapping preview displays correctly

**Dependencies**: Worker 2 (Impact-In integration services must exist)

---

### Slice H: Theming/Whitelabel 🎨
**Status**: ⏳ Pending
**Owner**: Frontend Lead + Reporting Services Lead

**Objective**: Per-tenant branding with accessibility constraints

**Features**:
- Tenant theme tokens: logo, primary colors, typography scale
- Light/dark mode support
- PDF theme sync (logo + colors in PDF exports)
- Documentation: branding constraints for a11y contrast
- Admin UI: theme editor (upload logo, pick colors)

**Files**:
- `services/reporting/routes/themes.ts`
- `apps/corp-cockpit-astro/src/styles/themes.ts`
- `apps/corp-cockpit-astro/src/components/admin/ThemeEditor.tsx`
- `docs/cockpit/branding.md`

**Acceptance Criteria**:
- ✅ Tenant themes apply to cockpit
- ✅ PDF exports use tenant branding
- ✅ Contrast meets WCAG AA (enforced by CI)
- ✅ Light/dark mode works

**Dependencies**: Slice A (tenant-scoped theme storage)

---

### Slice I: Testing & Hardening 🧪
**Status**: ⏳ Pending
**Owner**: QA & Hardening Lead

**Objective**: Comprehensive test coverage for all Phase C features

**Features**:
- Playwright E2E: auth flow, tenant selector, widgets, evidence drawer
- Playwright E2E: report generation, preview, export, scheduling
- i18n coverage tests (missing keys, RTL readiness)
- Visual regression: Storybook + Chromatic (or Ladle + image diff)
- Security tests: tenant isolation, share link expiry, secrets audit
- Integration tests for new APIs (evidence, gen-reports, exports, impact-in)

**Files**:
- `apps/corp-cockpit-astro/tests/e2e/auth.spec.ts`
- `apps/corp-cockpit-astro/tests/e2e/evidence.spec.ts`
- `apps/corp-cockpit-astro/tests/e2e/reports.spec.ts`
- `apps/corp-cockpit-astro/tests/visual/widgets.spec.ts`
- `.github/workflows/e2e.yml`
- `.github/workflows/visual-regression.yml`

**Acceptance Criteria**:
- ✅ All E2E tests pass (auth, evidence, reports, exports)
- ✅ i18n coverage at 100% (no missing keys)
- ✅ Visual regression baseline established
- ✅ Security tests pass (no tenant leakage)

**Dependencies**: All slices (integration testing requires completed features)

---

## Performance Budgets

### Target Metrics (Lighthouse CI)

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| **LCP** (Largest Contentful Paint) | ≤ 2.0s | TBD | ⏳ |
| **INP** (Interaction to Next Paint) | ≤ 200ms | TBD | ⏳ |
| **CLS** (Cumulative Layout Shift) | ≤ 0.1 | TBD | ⏳ |
| **FCP** (First Contentful Paint) | ≤ 1.2s | TBD | ⏳ |
| **TTI** (Time to Interactive) | ≤ 3.5s | TBD | ⏳ |

**Measurement Context**: Staging environment with real tenant data, 3G throttling

### Optimization Strategies

1. **Data Windowing**: Limit chart data to visible range, paginate large datasets
2. **Memoization**: React.memo for expensive components, useMemo for computed values
3. **Virtualization**: Virtual scrolling for long lists (evidence snippets)
4. **Caching**: ETag/If-None-Match for report queries, stale-while-revalidate
5. **Code Splitting**: Lazy load evidence/report components
6. **Image Optimization**: Astro Image for tenant logos, WebP format

---

## Accessibility Compliance

### WCAG 2.2 Level AA

**Scope**: All cockpit pages, modals, and interactive components

**Key Requirements**:
- ✅ **Focus Order**: Logical tab order (1.3.2)
- ✅ **Target Size**: ≥ 24×24px for interactive elements (2.5.8)
- ✅ **Names, Roles, Values**: ARIA labels for all controls (4.1.2)
- ✅ **Keyboard Operability**: All features keyboard-accessible (2.1.1)
- ✅ **Contrast**: 4.5:1 for normal text, 3:1 for large text (1.4.3)
- ✅ **Focus Visible**: Clear focus indicators (2.4.7)
- ✅ **Reflow**: No horizontal scroll at 320px width (1.4.10)
- ✅ **Text Spacing**: Adjustable without loss of content (1.4.12)

### Testing Strategy

1. **Automated**: axe-core + Pa11y in CI (fail on violations)
2. **Manual**: Keyboard-only navigation testing
3. **Screen Reader**: NVDA/JAWS testing for complex components (evidence drawer, report modal)
4. **Color Contrast**: Automated checks for all theme combinations

---

## Security & Privacy

### Tenant Isolation

**Database**: All queries scoped by `companyId` (enforced at middleware level)
**API**: JWT tokens include `companyId` claim, verified on every request
**UI**: Route guards prevent cross-tenant navigation
**Testing**: Security tests verify no tenant data leaks

### Evidence Redaction

**Server-Side**: PII redaction before sending to frontend
**Rules**: Email, phone, address patterns replaced with `[REDACTED]`
**Audit**: Redaction events logged for compliance

### AI Safety

**Guardrails**:
- Token budget limits (max 4000 tokens per report)
- Content policy screening (no hate speech, no profanity)
- Disclaimers on all AI-generated content
- Deterministic seeds for reproducible outputs

**Secrets**:
- No AI API keys in frontend
- All AI calls server-side via `/reporting/gen-reports`
- Keys stored in environment variables (not committed)

---

## Integration Points

### Worker 1 (IaC/Security/Observability)

**Coordination**:
- ✅ OTel traces for web-vitals correlation
- ✅ Staging deployment (domain, SSL, env vars)
- ✅ SSO integration (if OIDC provider available)
- ✅ Security review for gen-AI endpoints
- ✅ Secrets management for AI API keys

**Communication**: Tag Worker 1 lead on PRs for staging rollout, OTel setup, secrets

### Worker 2 (Backend Services)

**Coordination**:
- ✅ Reporting service extensions (evidence, gen-reports APIs)
- ✅ Q2Q evidence query optimization
- ✅ Impact-In delivery status (coordinate with integration services)
- ✅ Tenant-scoped database queries

**Communication**: Tag Worker 2 lead on PRs for reporting/q2q changes, API contracts

---

## Documentation Deliverables

### Phase C Docs

| Document | Path | Status | Owner |
|----------|------|--------|-------|
| Staging Rollout Playbook | `/docs/pilot/staging_rollout.md` | ⏳ | Performance Lead |
| Gen Reporting Guide | `/docs/cockpit/gen_reporting.md` | ⏳ | AI Lead |
| Branding Constraints | `/docs/cockpit/branding.md` | ⏳ | Frontend Lead |
| Phase C Report | `/reports/worker3_phaseC_pilot.md` | 🚧 In Progress | Orchestrator |
| A11y Audit | `/reports/a11y_audit_phaseC.md` | ⏳ | QA Lead |
| API Updates | `/docs/api/index.md` | ⏳ | Reporting Lead |

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

### Pilot Readiness

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

### Quality Gates (CI/CD)

- ✅ All E2E tests pass (Playwright)
- ✅ A11y tests pass (axe + Pa11y)
- ✅ Performance budgets met (Lighthouse CI)
- ✅ Visual regression tests pass (Chromatic/Ladle)
- ✅ i18n coverage at 100%
- ✅ Security tests pass (no tenant leakage)
- ✅ Type checking passes (no `any` types)
- ✅ Linting passes (ESLint + Prettier)

---

## Risk Assessment

### High Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **AI API Rate Limits** | Gen-reports fail | Implement retry with exponential backoff, queue system |
| **PDF Rendering Performance** | Export timeouts | Optimize Playwright/Puppeteer config, cache rendered pages |
| **Tenant Isolation Bugs** | Data leaks | Comprehensive security tests, code review, middleware enforcement |
| **Web-Vitals Regression** | Performance degradation | Lighthouse CI with fail-on-budget, real-user monitoring |

### Medium Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Evidence Lineage Gaps** | Missing citations | Automated validation in gen-reports endpoint, CI tests |
| **Redaction Failures** | PII exposure | Multiple redaction layers, audit logging, manual review |
| **Theme Contrast Issues** | A11y violations | Automated contrast checks, admin warnings in theme editor |
| **Share Link Expiry Bugs** | Unauthorized access | Comprehensive middleware tests, signed URLs with HMAC |

### Low Risk

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **i18n Missing Keys** | UI text bugs | Automated i18n coverage tests in CI |
| **Scheduled Email Failures** | Missed reports | Email delivery status tracking, retry queue |
| **Boardroom Mode Issues** | Display bugs | Visual regression tests, manual QA |

---

## Timeline & Milestones

### Phase C.1: Foundation (Weeks 1-2)
- ✅ Slice A: Pilot & Tenantization
- ✅ Slice H: Theming/Whitelabel (base implementation)
- ✅ Documentation stubs created

### Phase C.2: Evidence & AI (Weeks 3-4)
- ✅ Slice B: Evidence Explorer
- ✅ Slice C: Generative Reporting Assistant
- ✅ AI safety guardrails

### Phase C.3: Exports & Performance (Weeks 5-6)
- ✅ Slice D: Exports & Scheduling
- ✅ Slice E: Performance, Web-Vitals, A11y
- ✅ Lighthouse budgets enforced

### Phase C.4: Polish & Testing (Weeks 7-8)
- ✅ Slice F: Saved Views & Share Links
- ✅ Slice G: Impact-In Delivery Monitor
- ✅ Slice I: Testing & Hardening
- ✅ All documentation complete

### Phase C.5: Pilot Launch (Week 9)
- ✅ Staging deployment
- ✅ Stakeholder demo
- ✅ Performance report
- ✅ A11y audit
- ✅ Launch readiness review

---

## Known Limitations

### Current Scope (Phase C)

- ✅ Single-region deployment (staging only)
- ✅ English-only gen-AI reports (i18n for UK/NO in future)
- ✅ 3 external platforms for Impact-In (Benevity/Goodera/Workday)
- ✅ Stub email service (production email TBD)
- ✅ Single LLM provider (OpenAI or Claude, not both)

### Future Work (Phase D+)

- ❌ Multi-region deployment (EU/US/APAC)
- ❌ Real-time collaboration (multi-user dashboards)
- ❌ Advanced analytics (ClickHouse integration)
- ❌ Custom KPI builder
- ❌ Mobile app (React Native)
- ❌ Advanced theming (CSS custom properties editor)

---

## Recommendations for Next Phase

### Phase D Priorities

1. **Multi-Region Deployment**: Deploy to EU region for GDPR compliance
2. **Advanced Analytics**: Integrate ClickHouse for large-scale reporting
3. **Custom KPI Builder**: Allow companies to define custom metrics
4. **Real-Time Collaboration**: WebSocket-based multi-user dashboards
5. **Mobile App**: React Native app for on-the-go access

### Technical Debt to Address

1. **API Versioning**: Add `/v1/` prefix to all endpoints
2. **Circuit Breakers**: Add resilience patterns for service-to-service calls
3. **Distributed Tracing**: Full OpenTelemetry implementation
4. **Asymmetric JWT**: Move from HS256 to RS256 for production
5. **Read Replicas**: Add Postgres read replicas for query scaling

---

## Conclusion

Worker 3 Phase C is **ready for execution**. The plan decomposes the pilot transformation into 9 slices (A-I) with clear ownership, acceptance criteria, and dependencies. All 5 leads have their specialist teams assigned, and integration points with Workers 1 & 2 are defined.

**Key Deliverables**:
- 🏢 Multi-tenant cockpit with admin console
- 🔍 Evidence Explorer with lineage traceability
- 🤖 AI-powered generative reporting with citations
- 📤 PDF exports and scheduled reports
- ⚡ Performance budgets met (LCP ≤ 2.0s, INP ≤ 200ms)
- ♿ WCAG 2.2 AA compliance enforced
- 📊 Impact-In delivery monitoring
- 🎨 White-label theming

**Status**: 🚀 Planning Complete - Ready for Parallel Execution

**Next Actions**:
1. Frontend Lead: Start Slice A (tenant selector + routing)
2. Reporting Services Lead: Extend reporting service for evidence APIs (Slice B)
3. AI & Safety Lead: Design prompt templates for gen-reports (Slice C)
4. Performance Lead: Set up web-vitals collector (Slice E)
5. QA Lead: Set up Playwright E2E framework (Slice I)

**Orchestrator**: Monitor progress, unblock dependencies, update plan weekly

---

**Report Generated**: 2025-11-13
**Worker**: Worker 3 (Tech Lead Orchestrator)
**Branch**: `claude/worker3-phaseC-pilot-orchestration-011CV5u3ykujYMXifwU2KZQX`
**Status**: 🚀 Planning Complete
