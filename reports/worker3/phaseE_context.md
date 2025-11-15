# Worker 3 Phase E: Cockpit Polish & Resilience - Context

**Date**: 2025-11-15
**Branch**: `claude/worker3-phaseE-cockpit-polish-01DEt2S7UMEooTBJBivWKcpD`
**Status**: Bootstrap Complete

---

## Current State Assessment

### TypeScript Debt Analysis
**Total Errors Found**: 200+ (output truncated at line 3355)

#### Error Categories:
1. **Missing React imports** (20+ instances)
   - Files: `keyboardNav.ts`, `ConnectionStatus.tsx`, `DashboardActions.tsx`, etc.
   - Pattern: `'React' refers to a UMD global, but the current file is a module`

2. **Implicit `any` types** (15+ instances)
   - Files: `reporting.ts`, various component files
   - Pattern: `Parameter 'x' implicitly has an 'any' type`

3. **Possibly undefined** (40+ instances)
   - Files: `BrandingConfig.tsx`, `PercentileChart.tsx`, `BenchmarkCharts.tsx`
   - Pattern: `Object is possibly 'undefined'`

4. **Unused variables** (30+ instances)
   - Pattern: `'x' is declared but its value is never read`

5. **Missing module** (CRITICAL)
   - `@teei/shared-types` - Cannot find module
   - Affects: `src/api/reporting.ts`

6. **Missing exports** (SSE-related)
   - `ConnectionState`, `SSEError` missing from `src/utils/sseClient.ts`
   - Affects: `ConnectionStatus.tsx`

7. **Story files type errors** (25+ instances)
   - Storybook props not matching component interfaces
   - Examples: `ApprovalWorkflowPanel.stories.tsx`, `BenchmarkCharts.stories.tsx`

8. **Test utilities** (10+ instances)
   - Missing test matchers: `toBeInTheDocument`, `toHaveAttribute`
   - Files: `EvidenceCard.test.tsx`, `EvidenceExplorer.test.tsx`

### Existing Infrastructure

#### Package Structure
- ✅ Astro 4.0 + React 18.2
- ✅ TanStack Query for state management
- ✅ Zustand for client state
- ✅ Chart.js 4.5.1 + react-chartjs-2
- ✅ Tailwind CSS + clsx/tailwind-merge
- ✅ Web Vitals 3.5.0
- ✅ Playwright + axe-core + pa11y-ci
- ✅ Lighthouse + visual regression

#### Available Scripts
```json
{
  "dev": "astro dev",
  "build": "astro build",
  "typecheck": "astro check",
  "test": "vitest",
  "test:e2e": "playwright test",
  "test:visual": "playwright test visual-comprehensive",
  "test:a11y": "pa11y-ci",
  "lint": "eslint . --ext .js,.jsx,.ts,.tsx,.astro"
}
```

#### Existing Directories
- `src/a11y/` - Accessibility utilities (keyboardNav, screenReaderScripts)
- `src/api/` - API clients (reporting, etc.)
- `src/client/` - Client-side initialization
- `src/components/` - 24 component directories
- `src/contexts/` - React contexts
- `src/hooks/` - Custom hooks
- `src/i18n/` - Internationalization (en/no/uk support exists)
- `src/layouts/` - Astro layouts
- `src/lib/` - Shared utilities
- `src/middleware/` - Astro middleware
- `src/monitoring/` - Monitoring utilities
- `src/pages/` - Astro pages
- `src/security/` - Security utilities
- `src/styles/` - Theme definitions
- `src/telemetry/` - Telemetry utilities
- `src/types/` - TypeScript types
- `src/utils/` - General utilities
- `tests/` - E2E, visual, a11y tests

#### Documentation Already Present
In cockpit root:
- `ACCESSIBILITY.md` (5.3KB)
- `ADMIN_CONSOLE_SUMMARY.md` (5.9KB)
- `CHART_OPTIMIZATION_QUICKSTART.md` (4.2KB)
- `IMPLEMENTATION_SUMMARY.md` (9.8KB)
- `PWA_IMPLEMENTATION.md` (14.4KB)
- `TENANT_IMPLEMENTATION.md` (3.9KB)
- `TESTING_SETUP.md` (2.0KB)
- `VISUAL_REGRESSION_DELIVERABLES.md` (11.6KB)
- `VISUAL_REGRESSION_SUMMARY.md` (13.6KB)
- `VISUAL_TESTING_QUICKSTART.md` (5.3KB)
- `WEB_VITALS_IMPLEMENTATION.md` (6.6KB)

### Phase C/D Deliverables (Completed)
From `MULTI_AGENT_PLAN.md`:
- ✅ Tenant-scoped routing
- ✅ Evidence Explorer with Q2Q lineage
- ✅ Gen-AI report templates (4 types)
- ✅ Citation extraction and validation
- ✅ PII redaction enforcement
- ✅ PDF export with watermarking
- ✅ Visual regression testing framework
- ✅ Web vitals collection
- ✅ A11y automation (Pa11y + axe-core)
- ✅ PWA with service worker

### Known Gaps (Phase E Scope)

#### 1. TypeScript Zero-Debt
- 200+ errors across 100+ files
- Missing `@teei/shared-types` package
- SSE types incomplete (`ConnectionState`, `SSEError`)
- Story files need prop type fixes

#### 2. SSE Resilience
- `src/utils/sseClient.ts` missing exports
- No last-event-id resume implementation
- No backoff/jitter strategy
- No ring buffer for snapshot caching
- No "Boardroom Mode" toggle/UI

#### 3. Dark Mode
- Theme definitions exist in `src/styles/themes.ts`
- No system preference detection
- No manual toggle component
- No persistence per tenant
- Charts/tables may lack dark mode palettes
- Focus states not validated for contrast

#### 4. Gen-AI Report UX Hardening
- No cost guardrails (tenant budget caps)
- No cancel/retry UI
- No granular progress stages
- No citation preview drawer

#### 5. Evidence Explorer Productivity
- No faceted filters
- No saved views
- No CSV export
- No PII-safe redaction preview
- No "copy with citation" helper

#### 6. Impact-In Monitor
- No SLA badges
- No platform filters
- No bulk retry safety dialogs
- No drilldown breadcrumbs
- No multi-tenant switcher

#### 7. A11y & i18n
- Axe-core not integrated in CI
- Keyboard traps present (see errors)
- Live regions not verified
- en/no/uk strings incomplete (hardcoded strings detected)

#### 8. Quality Gates
- No E2E route coverage metrics
- No VRT diff thresholds enforced
- No coverage reports generated
- No automated quality dashboard

#### 9. Documentation
- No `/docs/cockpit/boardroom_mode.md`
- No `/docs/cockpit/sse_resilience.md`
- No quickstart for pilots

---

## Constraints & Context

### API Endpoints Available
From existing codebase:
- `GET /v1/reporting/metrics`
- `GET /v1/reporting/evidence`
- `GET /v1/reporting/lineage/:metricId`
- `POST /v1/reporting/gen-reports:generate`
- `GET /v1/reporting/schedules`
- `POST /v1/reporting/schedules`
- `GET /v1/impact-in/deliveries`
- `POST /v1/impact-in/replay/:deliveryId`

### RBAC Roles
- `SUPER_ADMIN` - Full access
- `COMPANY_ADMIN` - Tenant admin
- `COMPANY_USER` - Tenant viewer

### Tenant Isolation
- All queries scoped by `companyId`
- Middleware enforces tenant boundaries
- No cross-tenant data leakage allowed

### Performance Budgets
- LCP ≤ 2.5s (current target from Lighthouse config)
- INP ≤ 200ms (new WCAG 2.2 AA requirement)
- Unit coverage ≥ 80%
- E2E route coverage ≥ 60%
- VRT diff ≤ 0.3%

### Technology Stack
- **Frontend**: Astro 5 + React 18 + Tailwind CSS
- **State**: Zustand (client), TanStack Query (server)
- **Charts**: Chart.js 4.5.1
- **Testing**: Vitest, Playwright, axe-core, pa11y-ci
- **Build**: pnpm workspaces, TypeScript 5.9.3

---

## Priority Order (from Instructions)

1. **P0**: TypeScript zero-debt (blocker for all other work)
2. **P1**: SSE resilience (core UX requirement)
3. **P1**: Dark mode (pilot requirement)
4. **P2**: Gen-AI UX hardening
5. **P2**: Evidence Explorer productivity
6. **P2**: Impact-In Monitor enhancements
7. **P3**: A11y & i18n completeness
8. **P3**: Quality Gates integration
9. **P4**: Documentation & runbooks

---

## Agent Triggers Identified

### Must Use
- **ts-fixer** - 200+ TypeScript errors
- **eslint-doctor** - ESLint errors (not yet run)
- **sse-architect** - Design SSE state machine
- **sse-implementer** - Implement SSE hooks
- **snapshot-cache-engineer** - Build boardroom snapshot store
- **boardroom-ux** - Implement full-screen KPI layout
- **darkmode-theming** - Wire CSS variables, system preference
- **charts-contrast** - Validate chart palettes for dark mode
- **a11y-sweeper** - Runs axe-core, fixes violations
- **i18n-linter** - Scans for hardcoded strings

### Should Use
- **cost-guardrails** - Add cost caps to report flow
- **report-citations-ui** - Build citation preview drawer
- **evidence-facets** - Add multi-facet filters, saved views
- **impactin-sla-ui** - Add SLA badges, platform filters
- **perf-profiler** - Measure TTI/LCP
- **vrt-author** - Set Playwright snapshots
- **e2e-author** - Write E2E tests
- **a11y-tester** - Integrate axe in CI
- **docs-scribe** - Update cockpit docs

---

## Next Steps

1. Create WBS in `/MULTI_AGENT_PLAN.md`
2. Start with `ts-fixer` to unblock all agents
3. Parallel execution after TS debt cleared
4. Run quality gates
5. Write documentation
6. Create PR

---

**Last Updated**: 2025-11-15 by orchestrator-lead
