# Phase C: 30-Agent Roster for Pilot-Ready Enterprise Cockpit

**Mission**: Deliver production-ready, multi-tenant Corporate Cockpit with Evidence Explorer, Generative Reporting, Performance/A11y hardening, and Whitelabel theming.

**Tech Lead Orchestrator**: Coordinates 30 specialists across 5 domain leads

---

## **LEAD AGENTS (5)**

### **1. frontend-lead** (Agent L1)
**Delegation Trigger**: MUST BE USED for routing, state, and component architecture decisions across cockpit.
**Responsibilities**:
- Tenantized routing architecture (`/[lang]/cockpit/:companyId/*`)
- Component state management (SSE integration, view persistence)
- Feature flag coordination
- React error boundaries strategy
**Sub-agents**: 6, 7, 8, 9, 28

---

### **2. reporting-ui-lead** (Agent L2)
**Delegation Trigger**: MUST BE USED for wiring widgets to Reporting SDKs, SSE, and caching.
**Responsibilities**:
- SSE client resilience (backoff, reconnect, last-event-id)
- Widget data fetching optimization
- HTTP caching strategy (ETag, If-None-Match)
- Memoization and virtualization
**Sub-agents**: 9, 18, 19, 20

---

### **3. gen-reports-lead** (Agent L3)
**Delegation Trigger**: MUST BE USED for server-side report generation, citations plumbing, and PDF rendering flows.
**Responsibilities**:
- Generative report UI workflow
- Citation system (evidence IDs in narratives)
- PDF server-side rendering (Playwright/Puppeteer)
- Report editing and draft persistence
**Sub-agents**: 13, 14

---

### **4. a11y-perf-lead** (Agent L4)
**Delegation Trigger**: MUST BE USED for a11y audits, web-vitals, performance budgets, and CI gates.
**Responsibilities**:
- WCAG 2.2 AA compliance auditing
- Web Vitals collection (LCP, INP, CLS → OTel)
- Performance budgets and monitoring
- CI integration (axe, Pa11y)
**Sub-agents**: 20, 21, 22, 23

---

### **5. integrations-lead** (Agent L5)
**Delegation Trigger**: MUST BE USED for Impact-In monitor UI, Discord UX, and tenant theming.
**Responsibilities**:
- Impact-In delivery monitoring
- Discord feedback UX refinement
- Whitelabel theming system
- Tenant branding coordination
**Sub-agents**: 24, 25, 26, 27

---

## **SPECIALIST AGENTS (25)**

### **Routing & Access Control (3)**

**6. route-architect** (Agent S1)
**Delegation Trigger**: MUST BE USED for `/:companyId` routing, guards, and 404/401 UX.
**Deliverables**:
- Tenant-scoped routing: `/[lang]/cockpit/:companyId/*`
- Route guards with company ID validation
- 404/401 tenant-aware error pages

**7. auth-guard-specialist** (Agent S2)
**Delegation Trigger**: MUST BE USED to enforce RBAC per route and widget.
**Deliverables**:
- Per-route RBAC enforcement
- Widget-level permission checks
- Session validation per company

**8. i18n-l10n-specialist** (Agent S3)
**Delegation Trigger**: MUST BE USED to add/validate all UI strings (en/uk/no), hreflang, SEO.
**Deliverables**:
- New UI strings for Evidence Explorer, Gen Reports, Scheduler
- Missing translation keys CI check
- SEO structured data (no PII)

---

### **Real-Time Data (2)**

**9. sse-client-specialist** (Agent S4)
**Delegation Trigger**: MUST BE USED to build resilient EventSource client with backoff + resume.
**Deliverables**:
- EventSource wrapper with exponential backoff
- Last-event-id resume logic
- Company-scoped channel subscription
- Fallback to polling on failure

**18. dashboard-caching** (Agent S5)
**Delegation Trigger**: MUST BE USED to add HTTP caching (ETag/If-None-Match) and memoization.
**Deliverables**:
- ETag-based conditional requests
- React.memo for expensive components
- Response caching layer

---

### **Evidence & Lineage (3)**

**10. evidence-explorer-ui** (Agent S6)
**Delegation Trigger**: MUST BE USED to build filters, grid, pagination for evidence sets.
**Deliverables**:
- Evidence list with filters (program, period, label, cohort)
- Pagination and sorting
- Anonymized snippet previews

**11. evidence-redaction-ui** (Agent S7)
**Delegation Trigger**: MUST BE USED to enforce safe rendering and copy redaction in previews.
**Deliverables**:
- XSS-safe evidence rendering
- Copy/paste guards for PII
- Redaction markers in UI

**12. lineage-drawer-dev** (Agent S8)
**Delegation Trigger**: MUST BE USED to implement "Why this metric?" drawers with provenance trails.
**Deliverables**:
- "Why this metric?" button on widgets
- Lineage drawer with aggregation → evidence chain
- Provenance ID links

---

### **Generative Reporting (2)**

**13. report-editor-ui** (Agent S9)
**Delegation Trigger**: MUST BE USED for edit-in-place of generated narratives with citations.
**Deliverables**:
- Report generation modal
- In-place editing of draft narratives
- Citation preservation during edits
- Submit to server for final render

**14. pdf-rendering-engineer** (Agent S10)
**Delegation Trigger**: MUST BE USED to implement Playwright/Puppeteer server render + asset bundling.
**Deliverables**:
- Server-side PDF generation (Reporting service)
- Themed PDF templates (logo, colors, fonts)
- Citation rendering in PDF
- Page numbers, headers, footers

---

### **Views, Sharing, Scheduling (3)**

**15. scheduler-ui** (Agent S11)
**Delegation Trigger**: MUST BE USED for scheduling flows and audit logs UI.
**Deliverables**:
- Schedule report panel (monthly/quarterly)
- Email preview rendering
- Delivery log view with status/retry

**16. saved-views-ui** (Agent S12)
**Delegation Trigger**: MUST BE USED to persist and manage named views; permissions.
**Deliverables**:
- Save current dashboard filters as "view"
- List/manage saved views
- Per-tenant/user view permissions

**17. share-links-ui** (Agent S13)
**Delegation Trigger**: MUST BE USED for signed links with TTL + revocation UI.
**Deliverables**:
- Generate signed share link (read-only)
- TTL configuration
- Link revocation UI

---

### **Performance Optimization (2)**

**19. charts-perf** (Agent S14)
**Delegation Trigger**: MUST BE USED to optimize charts (windowing/virtualization).
**Deliverables**:
- Chart data virtualization for large datasets
- Lazy loading for off-screen charts
- Canvas rendering for high-density plots

**20. webvitals-rum** (Agent S15)
**Delegation Trigger**: MUST BE USED to collect LCP/INP/CLS and send to OTel with route labels.
**Deliverables**:
- Web Vitals instrumentation (LCP, INP, CLS, TTFB)
- Send metrics to Worker 1 OTel collector
- Route and tenant labels

---

### **Accessibility (3)**

**21. a11y-audit-engineer** (Agent S16)
**Delegation Trigger**: MUST BE USED to integrate axe/Pa11y CI and fix violations.
**Deliverables**:
- axe-core integration in CI
- Pa11y integration for key routes
- Violation fixes
- A11y report: `reports/a11y_audit_phaseC.md`

**22. keyboard-nav-specialist** (Agent S17)
**Delegation Trigger**: MUST BE USED to guarantee focus order and keyboard operability.
**Deliverables**:
- Focus management in modals/drawers
- Keyboard shortcuts documentation
- Tab order validation

**23. target-size-specialist** (Agent S18)
**Delegation Trigger**: MUST BE USED to fix WCAG 2.2 target size violations.
**Deliverables**:
- Minimum 44×44px touch targets
- Spacing between interactive elements
- Mobile target size validation

---

### **Theming & Branding (2)**

**24. theming-whitelabel** (Agent S19)
**Delegation Trigger**: MUST BE USED to implement tokenized theming and contrast checks.
**Deliverables**:
- Tenant theming tokens (logo, primary colors, typography)
- Light/dark mode support
- Contrast validation (WCAG AA)
- Theme sync to PDFs

**27. seo-structured-data** (Agent S20)
**Delegation Trigger**: MUST BE USED to add structured data for company pages (no PII).
**Deliverables**:
- JSON-LD structured data (Organization)
- Schema.org markup
- No PII in meta tags

---

### **Integrations (2)**

**25. impactin-monitor-ui** (Agent S21)
**Delegation Trigger**: MUST BE USED to build delivery history/replay UI and mapping previews.
**Deliverables**:
- Impact-In delivery monitor page
- Last deliveries table (status, attempts, timestamp)
- Replay/retry button
- Mapping preview for upcoming pushes

**26. discord-ux** (Agent S22)
**Delegation Trigger**: MUST BE USED to refine /feedback and recognition flows and error UX.
**Deliverables**:
- Improved /feedback error messages
- Recognition confirmation UX
- Command help text

---

### **Infrastructure (4)**

**28. error-boundaries** (Agent S23)
**Delegation Trigger**: MUST BE USED to add React error boundaries + fallback UI for each widget.
**Deliverables**:
- Error boundaries per widget
- Fallback UI with retry button
- Error reporting to Sentry (Worker 1)

**29. visual-regression** (Agent S24)
**Delegation Trigger**: MUST BE USED to set up Storybook/Ladle + image diff tests.
**Deliverables**:
- Storybook for widgets
- Visual regression tests (Percy/Chromatic)
- Baseline image capture

**30. docs-scribe** (Agent S25)
**Delegation Trigger**: MUST BE USED to write and link all docs and reports for this phase.
**Deliverables**:
- `/docs/pilot/staging_rollout.md`
- `/docs/cockpit/gen_reporting.md`
- `/docs/cockpit/branding.md`
- `/reports/worker3_phaseC_pilot.md`
- `/reports/a11y_audit_phaseC.md`

---

## **COORDINATION RULES**

1. **Leads decompose; specialists implement**: Leads MUST break down deliverables (A-G) into specialist tasks
2. **Write-to-file mandate**: ALL agents update `/MULTI_AGENT_PLAN.md` with their section status
3. **No overlap**: Each specialist owns clear deliverables; no duplicate work
4. **Feature flags**: All new surfaces gated behind flags (Evidence Explorer, Gen Reports, etc.)
5. **Test coverage**: Specialists write tests for their components
6. **Documentation**: Agent 30 (docs-scribe) consolidates all docs and reports

---

## **ESCALATION PATHS**

- **Blocked by Worker 2 API**: Escalate to Tech Lead → coordinate with Worker 2
- **Blocked by Worker 1 infra**: Escalate to Tech Lead → coordinate with Worker 1
- **RBAC conflicts**: Escalate to auth-guard-specialist (Agent 7)
- **Performance budget exceeded**: Escalate to a11y-perf-lead (Agent L4)
- **A11y violations**: Escalate to a11y-audit-engineer (Agent 21)

---

## **SUCCESS CRITERIA**

✅ All 30 agents have committed code/docs
✅ `/MULTI_AGENT_PLAN.md` sections A-G marked complete
✅ CI green (tests, a11y, visual regression)
✅ Staging deployment successful
✅ Final reports delivered with screenshots

---

**Last Updated**: 2025-11-13 (Phase C Kickoff)
**Status**: Agent roster deployed - Awaiting execution orchestration
