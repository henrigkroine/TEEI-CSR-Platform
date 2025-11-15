# Worker 3 Phase E: Work Breakdown Structure

**Branch**: `claude/worker3-phaseE-cockpit-polish-01DEt2S7UMEooTBJBivWKcpD`
**Start Date**: 2025-11-15
**Target**: Production-ready cockpit with SSE resilience, dark mode, zero TS debt

---

## WBS Overview

```
Phase E: Cockpit Polish & Resilience
├── 1. TypeScript Zero-Debt (P0) .......... 32 errors → 0 errors
├── 2. SSE Resilience ("Boardroom Mode") .. Design → Implement → Test
├── 3. Dark Mode + Theming Parity ......... System pref → Persist → Charts
├── 4. Gen-AI Report UX Hardening ......... Cost guards → Cancel → Progress
├── 5. Evidence Explorer Productivity ..... Filters → Saved views → Export
├── 6. Impact-In Monitor Enhancements ..... SLA → Filters → Retry
├── 7. A11y & i18n Completeness ........... Axe CI → Keyboard → Strings
├── 8. Quality Gates Integration .......... E2E → VRT → Coverage
└── 9. Docs & Runbooks .................... Boardroom → SSE → Quickstart
```

---

## 1. TypeScript Zero-Debt (P0)

**Owner**: ts-fixer + eslint-doctor
**Priority**: P0 (blocks all other work)
**Estimated Effort**: 6-8 hours

### Tasks

#### 1.1 Fix Missing React Imports
**Agent**: ts-fixer
**Files** (~20 files):
- `src/a11y/keyboardNav.ts`
- `src/components/ConnectionStatus.tsx`
- `src/components/DashboardActions.tsx`
- `src/components/approvals/ApprovalWorkflowPanel.tsx`
- `src/components/common/ErrorBoundary.tsx`
- All Story files with unused React imports

**Action**: Add `import React from 'react';` or remove unused imports

#### 1.2 Create Missing @teei/shared-types Package
**Agent**: ts-fixer
**Files**:
- `/packages/shared-types/package.json` (create)
- `/packages/shared-types/src/index.ts` (create)
- `/packages/shared-types/tsconfig.json` (create)

**Types to export**:
```typescript
// From reporting.ts analysis
export type ReportType = 'quarterly' | 'annual' | 'investor' | 'impact_deep_dive';
export type ReportSection = { title: string; content: string; citations: Citation[] };
export type Citation = { evidence_id: string; snippet: string; confidence: number };
// ... other shared types
```

#### 1.3 Add Missing SSE Type Exports
**Agent**: ts-fixer
**File**: `src/utils/sseClient.ts`
**Action**: Export missing types:
```typescript
export type ConnectionState = 'connecting' | 'connected' | 'disconnected' | 'error';
export interface SSEError {
  message: string;
  code: string;
  timestamp: number;
}
```

#### 1.4 Fix Implicit `any` Types
**Agent**: ts-fixer
**Files**:
- `src/api/reporting.ts` (10+ instances)
- Component Story files

**Pattern**:
```typescript
// Before: (citation) => ...
// After: (citation: Citation) => ...
```

#### 1.5 Fix Possibly Undefined Errors
**Agent**: ts-fixer
**Files**:
- `src/components/admin/BrandingConfig.tsx`
- `src/components/benchmarks/PercentileChart.tsx`
- `src/components/benchmarks/BenchmarkCharts.tsx`

**Pattern**:
```typescript
// Before: value.toFixed()
// After: value?.toFixed() ?? '0'
// Or: if (value !== undefined) { value.toFixed() }
```

#### 1.6 Remove Unused Variables
**Agent**: eslint-doctor
**Action**: Use ESLint --fix for unused vars, or remove manually

#### 1.7 Fix Storybook Prop Type Mismatches
**Agent**: ts-fixer
**Files**:
- `src/components/approvals/ApprovalWorkflowPanel.stories.tsx`
- `src/components/benchmarks/BenchmarkCharts.stories.tsx`

**Action**: Update Story args to match component prop interfaces

#### 1.8 Add Vitest DOM Matchers
**Agent**: ts-fixer
**File**: `vitest.config.ts` or test setup
**Action**:
```typescript
import '@testing-library/jest-dom/vitest';
```

#### 1.9 Fix JSX Style Props
**Agent**: ts-fixer
**Files**:
- `src/components/approvals/ApprovalWorkflowPanel.tsx`
- `src/components/common/ErrorBoundary.tsx`

**Pattern**: Remove `jsx` attribute from `<style>` tags (Astro handles this differently)

#### 1.10 Verify Zero Errors
**Command**: `pnpm typecheck && pnpm lint`
**Acceptance**: Exit code 0

---

## 2. SSE Resilience ("Boardroom Mode")

**Owner**: sse-architect → sse-implementer → snapshot-cache-engineer → boardroom-ux
**Priority**: P1
**Estimated Effort**: 12-16 hours

### Tasks

#### 2.1 Design SSE State Machine
**Agent**: sse-architect
**Deliverable**: `/reports/worker3/diffs/sse_architecture.md`

**Design Requirements**:
- State transitions: `connecting → connected → error → reconnecting → connected`
- Backoff strategy: exponential with jitter (2s, 4s, 8s, 16s, 32s max)
- Last-Event-ID tracking
- Reconnect limit: 10 attempts before permanent failure
- User notification: toast on disconnect, banner on degraded mode

**State Diagram**:
```
[disconnected] --connect--> [connecting]
[connecting] --success--> [connected]
[connecting] --fail--> [error] --retry--> [connecting]
[error] --max retries--> [failed]
[connected] --disconnect--> [reconnecting]
```

#### 2.2 Implement SSE Client with Resume
**Agent**: sse-implementer
**File**: `src/utils/sseClient.ts` (enhance existing)

**Features**:
- `lastEventId` tracking (from event.id)
- Reconnect with `Last-Event-ID` header
- Exponential backoff with jitter
- Event listeners: `onConnect`, `onDisconnect`, `onError`, `onMessage`
- Cleanup on unmount

**Code Snippet**:
```typescript
export class SSEClient {
  private lastEventId: string | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;

  connect(url: string) {
    const headers: Record<string, string> = {};
    if (this.lastEventId) {
      headers['Last-Event-ID'] = this.lastEventId;
    }

    this.eventSource = new EventSource(url, { /* ... */ });

    this.eventSource.addEventListener('message', (event) => {
      if (event.lastEventId) {
        this.lastEventId = event.lastEventId;
      }
      this.onMessage(event);
    });

    this.eventSource.addEventListener('error', () => {
      this.reconnectWithBackoff();
    });
  }

  private reconnectWithBackoff() {
    const delay = Math.min(
      2000 * Math.pow(2, this.reconnectAttempts),
      32000
    ) + Math.random() * 1000; // jitter

    setTimeout(() => this.connect(this.url), delay);
  }
}
```

#### 2.3 Build Snapshot Cache (Ring Buffer)
**Agent**: snapshot-cache-engineer
**Files**:
- `src/lib/snapshotCache.ts` (create)
- `src/hooks/useBoardroomMode.ts` (create)

**Features**:
- IndexedDB for persistence (10 snapshots max)
- In-memory ring buffer (last 3 snapshots)
- Compression for large snapshots (LZ-string)
- TTL: 24 hours
- API: `saveSnapshot()`, `getLatestSnapshot()`, `clearStale()`

**Schema**:
```typescript
interface Snapshot {
  id: string;
  companyId: string;
  timestamp: number;
  data: {
    kpis: Record<string, number>;
    charts: Record<string, ChartData>;
  };
  compressed: boolean;
}
```

#### 2.4 Implement Boardroom Mode UI
**Agent**: boardroom-ux
**Files**:
- `src/components/boardroom/BoardroomView.tsx` (create)
- `src/components/boardroom/BoardroomToggle.tsx` (create)
- `src/pages/[lang]/cockpit/[companyId]/boardroom.astro` (create)

**Features**:
- Full-screen toggle (F11 hint)
- Auto-refresh every 30s when connected
- "Last updated: X mins ago" timestamp
- "STALE DATA" banner when offline >5 min
- Large typography (2x-3x normal)
- High-contrast KPIs
- Minimal chrome (hide nav, sidebar)
- "Resume Live" CTA when connection restored

**Accessibility**:
- Keyboard shortcut: `Ctrl+B` to toggle
- Screen reader announcements on stale data
- Focus management when entering/exiting
- ARIA live region for connection status

#### 2.5 E2E Tests for SSE Resilience
**Agent**: sse-failure-lab
**Files**:
- `tests/e2e/16-sse-resilience.spec.ts` (create)

**Test Scenarios**:
1. **Happy path**: Connect → receive events → lastEventId tracked
2. **Reconnect**: Disconnect → auto-reconnect → resume from lastEventId
3. **Backoff**: Multiple failures → exponential delays verified
4. **Max retries**: 10 failures → permanent failure state
5. **Boardroom mode**: Offline → show cached snapshot → "stale" banner
6. **Boardroom resume**: Connection restored → remove banner → fresh data

**Performance Target**: p95 reconnect time ≤ 5s

---

## 3. Dark Mode + Theming Parity

**Owner**: darkmode-theming → charts-contrast → a11y-sweeper
**Priority**: P1
**Estimated Effort**: 8-10 hours

### Tasks

#### 3.1 System Preference Detection
**Agent**: darkmode-theming
**File**: `src/components/theme/ThemeProvider.tsx` (create)

**Features**:
- Detect `prefers-color-scheme` media query
- Manual toggle override
- Persist preference in localStorage
- Emit theme change event
- Inject theme class on `<html>` element

**Code**:
```typescript
const getSystemTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
};
```

#### 3.2 Theme Toggle Component
**Agent**: darkmode-theming
**File**: `src/components/theme/ThemeToggle.tsx` (create)

**Features**:
- Sun/moon icon toggle
- ARIA label: "Switch to dark mode" / "Switch to light mode"
- Keyboard accessible (Tab, Enter, Space)
- Animate icon transition
- Show current mode in tooltip

#### 3.3 Persist Theme Per Tenant
**Agent**: darkmode-theming
**Files**:
- `src/api/tenantPreferences.ts` (create)
- Backend: `PUT /v1/preferences/theme` (if not exists, use localStorage)

**Logic**:
- If user is authenticated → save to backend
- Else → save to localStorage (`theme:${companyId}`)
- On login → sync localStorage → backend

#### 3.4 Update CSS Variables for Dark Mode
**Agent**: darkmode-theming
**File**: `src/styles/themes.ts` (enhance)

**Variables**:
```css
:root {
  --color-bg-primary: #ffffff;
  --color-bg-secondary: #f9fafb;
  --color-text-primary: #111827;
  --color-text-secondary: #6b7280;
  --color-border: #d1d5db;
}

:root.dark {
  --color-bg-primary: #111827;
  --color-bg-secondary: #1f2937;
  --color-text-primary: #f9fafb;
  --color-text-secondary: #d1d5db;
  --color-border: #374151;
}
```

#### 3.5 Update Chart Palettes for Dark Mode
**Agent**: charts-contrast
**Files**:
- `src/lib/chartConfig.ts` (enhance)
- `src/components/charts/*.tsx` (update theme prop)

**Dark Mode Palette**:
```typescript
const darkModePalette = {
  primary: '#60a5fa', // blue-400
  secondary: '#34d399', // green-400
  tertiary: '#fbbf24', // yellow-400
  quaternary: '#f87171', // red-400
  grid: '#374151', // gray-700
  text: '#f9fafb', // gray-50
};
```

**Validation**: All colors meet WCAG AA contrast (4.5:1 on background)

#### 3.6 Update Focus States for Dark Mode
**Agent**: a11y-sweeper
**Files**: All interactive components

**Pattern**:
```css
.button:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

:root {
  --color-focus: #3b82f6; /* blue-500 */
}

:root.dark {
  --color-focus: #60a5fa; /* blue-400 - higher contrast */
}
```

#### 3.7 Validate Contrast Ratios
**Agent**: charts-contrast
**Tool**: Contrast checker script

**Command**: `pnpm contrast:check`
**Acceptance**: All text/background pairs ≥ 4.5:1 (AA)

---

## 4. Gen-AI Report UX Hardening

**Owner**: cost-guardrails → report-citations-ui → sse-implementer
**Priority**: P2
**Estimated Effort**: 6-8 hours

### Tasks

#### 4.1 Implement Cost Guardrails
**Agent**: cost-guardrails
**Files**:
- `src/components/reports/CostGuardrail.tsx` (create)
- `src/api/reporting.ts` (add cost check)

**Features**:
- Pre-generation cost estimate (tokens * $0.002/1K)
- Tenant budget cap (fetch from backend)
- Warning modal: "Estimated cost: $X.XX. Budget remaining: $Y.YY. Continue?"
- Block generation if budget exceeded
- Link to upgrade plan (if applicable)

**Backend** (if not exists):
- `GET /v1/tenants/:id/usage` → { budget_usd, used_usd, remaining_usd }

#### 4.2 Add Cancel/Retry UI
**Agent**: report-citations-ui
**File**: `src/components/reports/GenerateReportModal.tsx` (enhance)

**Features**:
- "Cancel" button during generation (AbortController)
- "Retry" button on failure
- Error details accordion (show API error message)
- Retry counter (max 3 attempts)

#### 4.3 Granular Progress Stages
**Agent**: sse-implementer
**File**: `src/components/reports/ReportProgress.tsx` (create)

**Stages** (from SSE events):
1. Fetching metrics... (0-20%)
2. Querying evidence... (20-40%)
3. Generating narrative... (40-80%)
4. Validating citations... (80-95%)
5. Finalizing report... (95-100%)

**UI**: Progress bar + stage label + estimated time remaining

#### 4.4 Citation Preview Drawer
**Agent**: report-citations-ui
**File**: `src/components/reports/CitationDrawer.tsx` (create)

**Features**:
- Drawer opens on citation number click
- Show evidence snippet (anonymized)
- Link to full evidence in Evidence Explorer
- Confidence score badge
- "Copy citation" button (formatted for CSRD)

**Example**:
```
[1] Evidence ID: ev_abc123
Confidence: 92%
Source: Q2Q feedback, 2024-Q1
Snippet: "Program helped me gain confidence in..."
[View Full Evidence] [Copy Citation]
```

---

## 5. Evidence Explorer Productivity

**Owner**: evidence-facets → report-citations-ui → pii-guardian
**Priority**: P2
**Estimated Effort**: 8-10 hours

### Tasks

#### 5.1 Add Faceted Filters
**Agent**: evidence-facets
**File**: `src/components/evidence/EvidenceFilters.tsx` (enhance)

**Filters**:
- Program (multi-select dropdown)
- Time Period (quarter/year picker)
- Outcome Dimension (confidence, belonging, job_readiness, etc.)
- Confidence Score (slider: 0-100%)
- Cohort (if available)

**UI**: Filter chips with clear-all button

#### 5.2 Implement Saved Views
**Agent**: evidence-facets
**Files**:
- `src/components/evidence/SavedViews.tsx` (create)
- `src/api/savedViews.ts` (create)

**Features**:
- "Save current filters" → name modal → save to backend
- Saved views dropdown (personal + shared)
- RBAC: user sees own + public views
- Edit/Delete actions (own views only)
- Share toggle (make public/private)

**Backend** (if not exists):
- `POST /v1/saved-views` → { name, filters, is_public }
- `GET /v1/saved-views` → list
- `DELETE /v1/saved-views/:id`

#### 5.3 CSV Export with PII Redaction Preview
**Agent**: pii-guardian + evidence-facets
**File**: `src/components/evidence/ExportModal.tsx` (create)

**Features**:
- "Export to CSV" button
- Preview modal: show first 5 rows with redaction applied
- Checkbox: "Include PII (admin only)" (disabled for non-admins)
- Download triggers `POST /v1/evidence/export` with filters

**CSV Columns**:
- Evidence ID
- Program
- Outcome Dimension
- Confidence Score
- Snippet (redacted)
- Time Period

#### 5.4 "Copy with Citation" Helper
**Agent**: report-citations-ui
**File**: `src/components/evidence/EvidenceCard.tsx` (enhance)

**Feature**:
- "Copy for CSRD" button
- Clipboard format:
  ```
  [Evidence ID: ev_abc123]
  "Program participants reported increased confidence..."
  (Source: Q2Q feedback, 2024-Q1, Confidence: 92%)
  ```
- Toast notification: "Copied to clipboard"

---

## 6. Impact-In Monitor Enhancements

**Owner**: impactin-sla-ui → error-boundary-smith
**Priority**: P2
**Estimated Effort**: 6-8 hours

### Tasks

#### 6.1 Add SLA Badges
**Agent**: impactin-sla-ui
**File**: `src/components/impact-in/DeliveryHistory.tsx` (enhance)

**SLA Definitions** (from docs):
- Benevity: 24h
- Goodera: 48h
- Workday: 72h

**Badge Logic**:
```typescript
const getSLAStatus = (delivery: Delivery): 'ok' | 'warning' | 'breach' => {
  const elapsed = Date.now() - delivery.created_at;
  const sla = SLA_THRESHOLDS[delivery.platform];

  if (delivery.status === 'success') return 'ok';
  if (elapsed > sla) return 'breach';
  if (elapsed > sla * 0.8) return 'warning';
  return 'ok';
};
```

**UI**: Color-coded badge (green/yellow/red) + tooltip with SLA deadline

#### 6.2 Add Platform Filters
**Agent**: impactin-sla-ui
**File**: `src/components/impact-in/FilterBar.tsx` (create)

**Filters**:
- Platform (Benevity/Goodera/Workday/All)
- Status (Success/Failed/Pending/All)
- Date Range (last 7d/30d/90d/custom)

#### 6.3 Bulk Retry Safety Dialog
**Agent**: impactin-sla-ui
**File**: `src/components/impact-in/BulkRetryModal.tsx` (create)

**Features**:
- Select multiple failed deliveries (checkbox)
- "Retry Selected" button
- Confirmation modal:
  ```
  You are about to retry 5 deliveries:
  - Benevity: 2 deliveries
  - Goodera: 3 deliveries

  This will re-send data to external platforms.
  Are you sure?
  ```
- Show progress (X/Y retried)
- Error summary if any fail

#### 6.4 Drilldown Breadcrumbs
**Agent**: impactin-sla-ui
**Files**:
- `src/components/impact-in/DeliveryDetails.tsx` (enhance)
- `src/components/impact-in/Breadcrumbs.tsx` (create)

**Navigation**:
```
Dashboard > Impact-In Monitor > Benevity > Delivery #123
```

**Details View**:
- Request payload (JSON viewer)
- Response (if available)
- Retry history (timestamp, status)
- Logs (sanitized)

#### 6.5 Multi-Tenant Switcher
**Agent**: impactin-sla-ui
**File**: `src/components/tenant/TenantSwitcher.tsx` (enhance for Impact-In)

**Feature**: Quick-switch tenant dropdown in Impact-In page header

---

## 7. A11y & i18n Completeness

**Owner**: a11y-sweeper → i18n-linter → a11y-tester
**Priority**: P3
**Estimated Effort**: 8-10 hours

### Tasks

#### 7.1 Run axe-core and Fix Violations
**Agent**: a11y-sweeper
**Command**: `pnpm a11y:ci`

**Fix Categories**:
- Missing `alt` text on images
- Missing form labels
- Incorrect heading hierarchy
- Missing ARIA landmarks
- Color contrast issues

**Files**: Iterate through violations output

#### 7.2 Remove Keyboard Traps
**Agent**: a11y-sweeper
**Files** (from context):
- `src/a11y/keyboardNav.ts` (fix undefined access)
- `src/components/a11y/FocusManager.tsx`

**Validation**: Manual tab-through all interactive elements

#### 7.3 Verify Live Regions
**Agent**: a11y-tester
**Files**:
- `src/components/ConnectionStatus.tsx` (add `aria-live="polite"`)
- `src/components/reports/ReportProgress.tsx` (add `aria-live="polite"`)
- `src/components/evidence/EvidenceExplorer.tsx` (add `aria-live="assertive"` for errors)

#### 7.4 Scan for Hardcoded Strings
**Agent**: i18n-linter
**Tool**: Custom script or `eslint-plugin-i18n`

**Command**: `pnpm i18n:scan`

**Pattern**:
```typescript
// Before: <button>Submit</button>
// After: <button>{t('common.submit')}</button>
```

#### 7.5 Update i18n JSON Files
**Agent**: i18n-linter + i18n-proofreader
**Files**:
- `src/i18n/en.json` (update)
- `src/i18n/no.json` (update)
- `src/i18n/uk.json` (update)

**New Keys** (examples):
```json
{
  "boardroom": {
    "title": "Boardroom Mode",
    "toggle": "Toggle Boardroom View",
    "stale_warning": "Data is stale. Last updated: {minutes} minutes ago",
    "resume": "Resume Live Updates"
  },
  "theme": {
    "toggle_dark": "Switch to dark mode",
    "toggle_light": "Switch to light mode"
  }
}
```

#### 7.6 Integrate axe-core in CI
**Agent**: a11y-tester
**File**: `.github/workflows/a11y.yml` (create or enhance)

**Workflow**:
```yaml
- name: Run A11y Tests
  run: pnpm a11y:ci
- name: Fail on Critical/Serious
  run: |
    if grep -q "critical\|serious" a11y-report.json; then
      echo "A11y violations found"
      exit 1
    fi
```

---

## 8. Quality Gates Integration

**Owner**: qa-checkpointer → e2e-author → vrt-author
**Priority**: P3
**Estimated Effort**: 10-12 hours

### Tasks

#### 8.1 Add E2E Route Coverage Tests
**Agent**: e2e-author
**Files**:
- `tests/e2e/17-boardroom-mode.spec.ts` (create)
- `tests/e2e/18-dark-mode.spec.ts` (create)
- `tests/e2e/19-cost-guardrails.spec.ts` (create)
- `tests/e2e/20-evidence-export.spec.ts` (create)
- `tests/e2e/21-impact-in-filters.spec.ts` (create)

**Coverage Target**: ≥60% of critical routes

**Critical Routes**:
- `/[lang]/cockpit/[companyId]` (dashboard)
- `/[lang]/cockpit/[companyId]/boardroom` (boardroom mode)
- `/[lang]/cockpit/[companyId]/evidence` (evidence explorer)
- `/[lang]/cockpit/[companyId]/reports` (gen-AI reports)
- `/[lang]/cockpit/[companyId]/impact-in` (Impact-In monitor)

#### 8.2 VRT for Dark Mode
**Agent**: vrt-author
**Files**:
- `tests/visual/dark-mode.spec.ts` (create)

**Snapshots**:
- Dashboard (light vs dark)
- Evidence Explorer (light vs dark)
- Reports page (light vs dark)
- Charts (light vs dark)

**Command**: `pnpm test:visual:update` (first run), then `pnpm test:visual`

#### 8.3 VRT Diff Threshold Enforcement
**Agent**: vrt-author
**File**: `playwright.config.ts` (update)

**Config**:
```typescript
export default {
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.003, // 0.3%
    },
  },
};
```

#### 8.4 Unit Test Coverage Report
**Agent**: qa-checkpointer
**Command**: `pnpm test:cov`

**Generate HTML Report**:
```bash
pnpm test:cov --coverage.reporter=html
```

**Target**: ≥80% for `src/lib/*`, `src/utils/*`, `src/api/*`

#### 8.5 E2E Coverage Report
**Agent**: qa-checkpointer
**Command**: `pnpm e2e:coverage` (if exists, else create)

**Tool**: Playwright code coverage plugin
**Target**: ≥60% route coverage

#### 8.6 Quality Dashboard HTML
**Agent**: qa-checkpointer
**File**: `/reports/quality/dashboard.html` (generate)

**Contents**:
- Unit coverage: X%
- E2E route coverage: Y%
- VRT diff: Z%
- A11y violations: N (critical/serious)
- TypeScript errors: 0
- ESLint errors: 0

---

## 9. Docs & Runbooks

**Owner**: docs-scribe → i18n-proofreader
**Priority**: P4
**Estimated Effort**: 6-8 hours

### Tasks

#### 9.1 Create Boardroom Mode Runbook
**Agent**: docs-scribe
**File**: `/docs/cockpit/boardroom_mode.md` (create)

**Sections**:
1. Overview (what is boardroom mode?)
2. Enabling/Disabling (keyboard shortcut, toggle)
3. Snapshot caching (how it works, TTL)
4. Offline behavior (stale banner, resume)
5. Troubleshooting (common issues)
6. GIF/screenshots

#### 9.2 Create SSE Resilience Runbook
**Agent**: docs-scribe
**File**: `/docs/cockpit/sse_resilience.md` (create)

**Sections**:
1. SSE Architecture (state machine diagram)
2. Backoff Strategy (exponential + jitter)
3. Last-Event-ID Resume (how it works)
4. Monitoring (connection status, metrics)
5. Debugging (browser DevTools, server logs)
6. Performance (p95 reconnect time)

#### 9.3 Update Cockpit README
**Agent**: docs-scribe
**File**: `/apps/corp-cockpit-astro/README.md` (enhance)

**Add Sections**:
- **Dark Mode**: How to toggle, system preference
- **Boardroom Mode**: Quick guide + link to runbook
- **Quality Gates**: How to run tests, coverage targets

#### 9.4 Create Pilot Quickstart
**Agent**: docs-scribe
**File**: `/docs/cockpit/pilot_quickstart.md` (create)

**Audience**: Pilot users (non-technical)

**Sections**:
1. Login & Tenant Selection
2. Dashboard Overview (KPIs, charts)
3. Evidence Explorer (filters, export)
4. Generating Reports (Gen-AI, templates)
5. Dark Mode & Boardroom Mode
6. Getting Help (support link)

#### 9.5 Add GIFs for Boardroom & SSE
**Agent**: docs-scribe
**Tool**: LICEcap or similar

**GIFs**:
- `boardroom_toggle.gif` (entering/exiting boardroom mode)
- `sse_reconnect.gif` (network flap → reconnect → banner)
- `dark_mode_toggle.gif` (light → dark → light)

**Location**: `/docs/cockpit/assets/`

---

## Execution Strategy

### Parallel Workstreams

**Stream A (P0)**: TypeScript Zero-Debt
- Run first, blocks all other work
- Estimated: 6-8 hours
- Agents: ts-fixer, eslint-doctor

**Stream B (P1)**: SSE + Boardroom
- Can start after Stream A completes
- Estimated: 12-16 hours
- Agents: sse-architect, sse-implementer, snapshot-cache-engineer, boardroom-ux

**Stream C (P1)**: Dark Mode
- Can start after Stream A completes
- Estimated: 8-10 hours
- Agents: darkmode-theming, charts-contrast, a11y-sweeper

**Stream D (P2)**: UX Enhancements (parallel)
- Can start after Stream A completes
- Estimated: 20-26 hours total
- Sub-streams:
  - D1: Gen-AI UX (6-8h) → cost-guardrails, report-citations-ui
  - D2: Evidence Explorer (8-10h) → evidence-facets, pii-guardian
  - D3: Impact-In Monitor (6-8h) → impactin-sla-ui

**Stream E (P3)**: A11y & i18n
- Can start after Stream C (dark mode) completes
- Estimated: 8-10 hours
- Agents: a11y-sweeper, i18n-linter, a11y-tester

**Stream F (P3)**: Quality Gates
- Runs after all implementation complete
- Estimated: 10-12 hours
- Agents: qa-checkpointer, e2e-author, vrt-author

**Stream G (P4)**: Documentation
- Can start early, runs in parallel
- Estimated: 6-8 hours
- Agents: docs-scribe, i18n-proofreader

---

## Acceptance Criteria Summary

### Build Quality
- ✅ `pnpm typecheck` → 0 errors
- ✅ `pnpm lint` → 0 errors
- ✅ `pnpm test:cov` → ≥80% coverage (lib, utils, api)
- ✅ `pnpm e2e:coverage` → ≥60% route coverage
- ✅ `pnpm test:visual` → VRT diff ≤0.3%
- ✅ `pnpm a11y:ci` → 0 critical/serious violations

### Resilience
- ✅ SSE reconnects within ≤5s p95 after network flap
- ✅ Boardroom view shows last snapshot within ≤250ms
- ✅ "Stale data" banner appears when offline >5min
- ✅ Last-Event-ID resume verified in E2E tests

### UX
- ✅ Dark mode toggle works (system pref + manual)
- ✅ Dark mode persists per tenant
- ✅ All charts/tables have dark mode palettes
- ✅ Contrast ratios ≥4.5:1 (WCAG AA)
- ✅ Cost guardrails block over-budget reports
- ✅ Citation preview drawer functional
- ✅ Evidence faceted filters + saved views working
- ✅ Impact-In SLA badges + platform filters working
- ✅ All UI strings localized (en/no/uk)

### Docs
- ✅ `/docs/cockpit/boardroom_mode.md` complete with GIF
- ✅ `/docs/cockpit/sse_resilience.md` complete with diagram
- ✅ `/docs/cockpit/pilot_quickstart.md` complete
- ✅ `/apps/corp-cockpit-astro/README.md` updated
- ✅ Changelog in PR description

---

## File Paths Reference

### New Files to Create
```
/packages/shared-types/                     (new package)
/src/components/boardroom/                  (boardroom mode)
/src/components/theme/                      (dark mode toggle)
/src/lib/snapshotCache.ts
/src/hooks/useBoardroomMode.ts
/src/api/savedViews.ts
/src/api/tenantPreferences.ts
/src/components/reports/CostGuardrail.tsx
/src/components/reports/CitationDrawer.tsx
/src/components/reports/ReportProgress.tsx
/src/components/evidence/EvidenceFilters.tsx (enhance)
/src/components/evidence/SavedViews.tsx
/src/components/evidence/ExportModal.tsx
/src/components/impact-in/FilterBar.tsx
/src/components/impact-in/BulkRetryModal.tsx
/src/components/impact-in/Breadcrumbs.tsx
/tests/e2e/16-sse-resilience.spec.ts
/tests/e2e/17-boardroom-mode.spec.ts
/tests/e2e/18-dark-mode.spec.ts
/tests/e2e/19-cost-guardrails.spec.ts
/tests/e2e/20-evidence-export.spec.ts
/tests/e2e/21-impact-in-filters.spec.ts
/tests/visual/dark-mode.spec.ts
/docs/cockpit/boardroom_mode.md
/docs/cockpit/sse_resilience.md
/docs/cockpit/pilot_quickstart.md
/docs/cockpit/assets/*.gif
/reports/quality/dashboard.html
/reports/worker3/diffs/*.md
```

### Files to Enhance
```
/src/utils/sseClient.ts
/src/styles/themes.ts
/src/lib/chartConfig.ts
/src/components/evidence/EvidenceCard.tsx
/src/components/impact-in/DeliveryHistory.tsx
/src/components/tenant/TenantSwitcher.tsx
/src/api/reporting.ts
/apps/corp-cockpit-astro/README.md
/playwright.config.ts
/.github/workflows/a11y.yml
/vitest.config.ts
```

---

**Total Estimated Effort**: 76-102 hours (~10-13 days with parallel execution)
**Critical Path**: P0 TypeScript (6-8h) → P1 SSE (12-16h) → P3 QA (10-12h) = 28-36h minimum

**Last Updated**: 2025-11-15 by orchestrator-lead
