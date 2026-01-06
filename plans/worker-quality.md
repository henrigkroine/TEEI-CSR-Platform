# Quality Gates to Production - Comprehensive Plan

**Mission**: Raise quality gates to production thresholds: unit ≥80%, E2E ≥60%, visual regression established, a11y automated, load tests for key flows. Gate deployments via CI.

**Status**: 🚧 In Progress
**Start Date**: 2025-11-15
**Branch**: `claude/quality-gates-production-015Zu8WyXWzGf5FmsZeJ7s6o`

---

## Executive Summary

### Current State Assessment

✅ **Already Implemented:**
- Vitest configured with 80% coverage thresholds (lines, functions, branches, statements)
- Playwright E2E tests with multi-browser support (chromium, firefox, webkit)
- k6 load tests for dashboard, reporting, ingestion, streaming
- axe-core accessibility tests with WCAG 2.2 AA compliance
- Visual regression tests with Playwright snapshots
- Multiple CI/CD workflows: test.yml, e2e.yml, a11y.yml, loadtests.yml, visual-regression.yml

🔧 **Needs Enhancement:**
1. Unified quality gates workflow that gates all PRs and deployments
2. E2E coverage tracking (currently no coverage measurement for E2E tests)
3. Flakiness detection and quarantine system
4. Coverage enforcement (thresholds defined but not strictly enforced)
5. Test data seeding and fixture management
6. Aggregated quality reports across all test types
7. Performance budgets enforcement
8. Contract testing expansion

---

## Team Topology (30 Agents / 5 Leads)

### Lead 1: @lead-unit (Unit Testing & Coverage)
**Objective**: Achieve and maintain ≥80% unit test coverage across all services

**Specialists** (5 agents):
- **vitest-author**: Write missing unit tests for uncovered code paths
- **mocker**: Create comprehensive mocks and stubs for external dependencies
- **fixture-forge**: Build deterministic test fixtures and seed data
- **coverage-enricher**: Analyze coverage gaps and prioritize testing
- **contract-auditor**: Validate API contracts and schema adherence

**Deliverables**:
- [ ] Coverage reports per service with ≥80% for lines, functions, branches, statements
- [ ] Enhanced vitest config with strict thresholds enforcement
- [ ] Test fixtures library under `/tests/fixtures/`
- [ ] Missing tests for:
  - SROI/VIS calculator edge cases
  - Auth/tenant middleware
  - Q2Q utility functions
  - Reporting generation logic
  - Impact-In mappers

### Lead 2: @lead-e2e (E2E Testing)
**Objective**: Achieve ≥60% coverage of critical user flows

**Specialists** (5 agents):
- **playwright-flow**: Implement E2E test scenarios for critical paths
- **login-sso-scenarist**: SSO login flows (SAML, OIDC) with multiple IdPs
- **sse-resume-tester**: SSE reconnection and last-event-id replay scenarios
- **report-gen-scenarist**: End-to-end report generation and export flows
- **impact-in-ui-tester**: Impact-In dashboard replay and filtering
- **csv-export-verifier**: Validate export outputs (PDF, CSV, PPTX)

**Critical Flows** (Priority Order):
1. **SSO Login → Dashboard** (auth flow)
2. **Generate Report → Export (PDF/CSV)** (reporting flow)
3. **Impact-In Event Replay** (data ingestion flow)
4. **DSAR Export/Delete** (compliance flow)
5. **Tenant Switch + i18n Toggle** (multi-tenancy flow)
6. **Approval Workflow** (governance flow)
7. **Offline Mode → SSE Resume** (resilience flow)

**Deliverables**:
- [ ] E2E coverage tracking script (measures % of routes covered)
- [ ] 60%+ of critical routes covered by E2E tests
- [ ] Playwright scripts with page object pattern
- [ ] Screenshot comparison on failures
- [ ] Test data seeder for E2E scenarios

### Lead 3: @lead-vrt (Visual Regression Testing)
**Objective**: Establish baselines for top 20 cockpit routes

**Specialists** (4 agents):
- **chromatic-baseliner**: Create Storybook baselines for component library
- **playwright-snapshot**: Capture full-page snapshots for key routes
- **snapshot-curator**: Organize and version snapshot baselines
- **diff-analyzer**: Calculate pixel diff thresholds (≤0.3%)

**Top 20 Routes for VRT**:
1. `/dashboard` (overview)
2. `/reports` (list view)
3. `/reports/generate` (modal)
4. `/analytics/sroi` (calculator)
5. `/analytics/vis` (volunteer scoring)
6. `/impact-in/replay` (event log)
7. `/settings/profile`
8. `/settings/tenant`
9. `/settings/sso`
10. `/governance/approvals`
11. `/governance/audit-log`
12. `/benchmarks/cohorts`
13. `/evidence/lineage`
14. `/exports/history`
15. `/notifications/inbox`
16. `/admin/users`
17. `/admin/roles`
18. `/partner-portal/overview`
19. `/compliance/dsar`
20. `/help/docs`

**Deliverables**:
- [ ] Snapshot baselines for all 20 routes (light mode)
- [ ] Dark mode baselines (once dark mode is implemented)
- [ ] CI gate: fail on >0.3% pixel diff
- [ ] Baseline update workflow (manual approval required)

### Lead 4: @lead-a11y (Accessibility Automation)
**Objective**: Zero critical/serious WCAG 2.2 AA violations

**Specialists** (6 agents):
- **axe-runner**: Run axe-core on all target pages
- **pa11y-runner**: Complementary Pa11y CI checks
- **a11y-annotator**: Add ARIA labels and roles where missing
- **keyboard-nav-exerciser**: Validate tab order and keyboard navigation
- **sr-tester**: Screen reader compatibility (NVDA/JAWS/VoiceOver)
- **wcag-auditor**: Manual audit of complex interactions

**Deliverables**:
- [ ] Zero critical violations on target pages
- [ ] Zero serious violations on target pages
- [ ] ≤5 moderate violations (with documented exceptions)
- [ ] ESLint a11y rules enabled (eslint-plugin-jsx-a11y)
- [ ] Automated a11y tests in CI (fail on critical/serious violations)
- [ ] A11y report with issue map → Jira ticket links

### Lead 5: @lead-load (Load & Performance Testing)
**Objective**: Validate capacity and enforce SLOs

**Specialists** (5 agents):
- **k6-scenarist**: Write load test scenarios for key flows
- **results-aggregator**: Aggregate and analyze k6 metrics
- **flake-hunter**: Identify and quarantine flaky tests
- **performance-budgeter**: Define and enforce performance budgets
- **ci-gatekeeper**: Integrate quality gates into CI/CD

**Load Test Scenarios**:
1. **Cockpit Concurrent Users**: 100 VUs, 5min duration
2. **Report Generation Burst**: 50 simultaneous report requests
3. **Impact-In Sustained Load**: 1k events/s for 10min
4. **SSE Streaming**: 500 concurrent dashboard connections
5. **Export Queue**: 100 PDF exports queued

**SLO Targets**:
- P95 latency ≤500ms for dashboard routes
- P95 latency ≤2s for report generation
- P95 latency ≤100ms for SSE event delivery
- Error rate ≤0.1%
- Success rate ≥99.9%

**Deliverables**:
- [ ] k6 scripts with thresholds for all 5 scenarios
- [ ] Load test results with SLO pass/fail indicators
- [ ] Capacity planning document (max VUs, bottlenecks)
- [ ] Performance budgets enforced in CI
- [ ] Flakiness tracker (auto-quarantine tests with >10% failure rate)

---

## Cross-Team Deliverables

### 1. Unified Quality Gates Workflow
**Owner**: @ci-gatekeeper
**File**: `.github/workflows/quality-gates.yml`

**Gates** (All must pass):
- ✅ Unit coverage ≥80%
- ✅ E2E coverage ≥60%
- ✅ VRT diffs ≤0.3%
- ✅ A11y: 0 critical/serious violations
- ✅ Load tests: All SLOs green
- ✅ Lint: No errors
- ✅ TypeScript: No type errors
- ✅ Security: No critical vulnerabilities

**Workflow**:
```yaml
on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  quality-gates:
    runs-on: ubuntu-latest
    steps:
      - Checkout code
      - Run unit tests with coverage
      - Enforce 80% coverage threshold (fail if below)
      - Run E2E tests with coverage tracking
      - Enforce 60% E2E route coverage
      - Run VRT and check diff ≤0.3%
      - Run a11y tests (fail on critical/serious)
      - Run load tests and check SLOs
      - Aggregate results into single report
      - Comment PR with quality scorecard
      - Gate merge on all checks passing
```

### 2. Test Data Seeder
**Owner**: @test-data-seeder
**Location**: `/tests/fixtures/seed.ts`

**Fixtures**:
- Users (multiple roles: admin, viewer, partner)
- Tenants (multi-tenant scenarios)
- Reports (quarterly, annual, investor update, impact deep dive)
- Evidence (citations, lineage, provenance)
- Impact-In events (Benevity, Goodera, Workday samples)
- SROI/VIS calculations (edge cases: zero, negative, outliers)

**Usage**:
```bash
pnpm test:seed        # Seed local DB
pnpm test:seed:reset  # Reset to clean state
```

### 3. Flakiness Tracker
**Owner**: @flake-hunter
**Location**: `/tests/utils/flakiness-tracker.ts`

**Features**:
- Auto-detect flaky tests (>10% failure rate over 10 runs)
- Quarantine flaky tests (run separately, don't block CI)
- Generate flakiness report with root cause analysis
- Integration with CI (track failures per test over time)

**Quarantine Workflow**:
1. Test fails intermittently
2. Flake hunter detects pattern
3. Test moved to `.spec.flaky.ts`
4. Runs in separate CI job (informational only)
5. Team investigates and fixes
6. Test restored to main suite

### 4. Coverage Enhancement Script
**Owner**: @coverage-enricher
**Location**: `/scripts/coverage-analysis.ts`

**Features**:
- Analyze coverage reports per service
- Identify uncovered critical paths
- Prioritize files by:
  - Low coverage %
  - High complexity (cyclomatic)
  - High change frequency (git blame)
- Generate TODO list for missing tests

**Usage**:
```bash
pnpm coverage:analyze
# Output: coverage-gaps-2025-11-15.md with prioritized test targets
```

### 5. Quality Dashboard
**Owner**: @results-aggregator
**Location**: `/reports/quality/dashboard.html`

**Metrics**:
- Unit coverage trend (last 30 days)
- E2E coverage trend
- VRT baseline drift
- A11y violations by severity
- Load test SLO pass rate
- Flaky test count
- Test execution time trends

**Generation**:
```bash
pnpm quality:report
# Aggregates all test results into HTML dashboard
```

---

## Implementation Phases

### Phase 1: Foundation (Week 1)
**Focus**: Infrastructure and tooling

- [ ] Create `/plans/worker-quality.md` (this document)
- [ ] Set up `/tests/fixtures/` with seed data
- [ ] Implement flakiness tracker utility
- [ ] Create coverage analysis script
- [ ] Set up quality report aggregation

### Phase 2: Unit & Integration (Week 1-2)
**Focus**: Achieve 80% unit coverage

- [ ] Audit current coverage per service
- [ ] Write missing tests for high-priority gaps:
  - SROI/VIS calculators
  - Auth/tenant middleware
  - Q2Q utilities
  - Reporting templates
  - Impact-In mappers
- [ ] Enforce coverage thresholds in CI
- [ ] Add coverage trend tracking

### Phase 3: E2E Coverage (Week 2)
**Focus**: Cover critical flows

- [ ] Implement E2E coverage tracking script
- [ ] Write missing E2E tests for 7 critical flows
- [ ] Add page object pattern for maintainability
- [ ] Integrate E2E coverage gate (≥60%)

### Phase 4: VRT & A11y (Week 2-3)
**Focus**: Visual and accessibility baselines

- [ ] Capture snapshots for top 20 routes
- [ ] Run initial a11y audit and fix critical violations
- [ ] Set up VRT diff threshold gate (≤0.3%)
- [ ] Set up a11y violation gate (0 critical/serious)

### Phase 5: Load Testing (Week 3)
**Focus**: Performance validation

- [ ] Enhance k6 scripts with SLO thresholds
- [ ] Run load tests for 5 key scenarios
- [ ] Document capacity and bottlenecks
- [ ] Integrate load test gate into CI

### Phase 6: CI Integration (Week 3)
**Focus**: Unified quality gates

- [ ] Create `quality-gates.yml` workflow
- [ ] Integrate all test suites
- [ ] Set up PR quality scorecard comments
- [ ] Enable deployment gating

### Phase 7: Monitoring & Iteration (Week 4)
**Focus**: Continuous improvement

- [ ] Generate weekly quality dashboard
- [ ] Review flaky tests and fix root causes
- [ ] Optimize slow tests (parallelization, mocking)
- [ ] Document runbooks for quality gates

---

## Success Criteria

### Unit Testing
- [x] Vitest configured with 80% thresholds
- [ ] All services meet 80% coverage (lines, functions, branches, statements)
- [ ] Coverage reports uploaded to CI artifacts
- [ ] Coverage enforcement blocks failing PRs

### E2E Testing
- [x] Playwright configured with multi-browser support
- [ ] 7 critical flows covered by E2E tests
- [ ] E2E coverage tracking measures ≥60% route coverage
- [ ] Screenshots on failure uploaded to CI

### Visual Regression
- [x] Playwright snapshot infrastructure exists
- [ ] Baselines captured for top 20 routes
- [ ] VRT diff threshold ≤0.3% enforced
- [ ] Baseline update workflow documented

### Accessibility
- [x] axe-core integrated into CI
- [ ] 0 critical violations on target pages
- [ ] 0 serious violations on target pages
- [ ] ESLint a11y rules enabled and enforced

### Load Testing
- [x] k6 scripts exist for key flows
- [ ] SLO thresholds defined and enforced
- [ ] Load test results tracked over time
- [ ] Capacity planning document published

### CI/CD Integration
- [x] Individual test workflows exist
- [ ] Unified `quality-gates.yml` workflow created
- [ ] All gates enforced on PRs
- [ ] Deployment gated by quality checks
- [ ] PR comments with quality scorecard

---

## Metrics & KPIs

### Coverage Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Unit Coverage (Lines) | ≥80% | TBD | 🔍 |
| Unit Coverage (Functions) | ≥80% | TBD | 🔍 |
| Unit Coverage (Branches) | ≥80% | TBD | 🔍 |
| Unit Coverage (Statements) | ≥80% | TBD | 🔍 |
| E2E Route Coverage | ≥60% | TBD | 🔍 |

### Quality Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| VRT Diff Threshold | ≤0.3% | TBD | 🔍 |
| A11y Critical Violations | 0 | TBD | 🔍 |
| A11y Serious Violations | 0 | TBD | 🔍 |
| A11y Moderate Violations | ≤5 | TBD | 🔍 |

### Performance Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Dashboard P95 Latency | ≤500ms | TBD | 🔍 |
| Report Gen P95 Latency | ≤2s | TBD | 🔍 |
| SSE Event P95 Latency | ≤100ms | TBD | 🔍 |
| Error Rate | ≤0.1% | TBD | 🔍 |
| Success Rate | ≥99.9% | TBD | 🔍 |

### Reliability Metrics
| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Flaky Test Rate | ≤5% | TBD | 🔍 |
| Test Execution Time | ≤10min | TBD | 🔍 |
| CI Success Rate | ≥95% | TBD | 🔍 |

---

## Risks & Mitigations

### Risk 1: Coverage Gaps Too Large
**Likelihood**: Medium
**Impact**: High
**Mitigation**: Prioritize by critical path and complexity; aim for incremental improvement

### Risk 2: E2E Tests Too Slow
**Likelihood**: High
**Impact**: Medium
**Mitigation**: Parallelize with sharding; optimize with selective test execution

### Risk 3: VRT Baselines Drift
**Likelihood**: Medium
**Impact**: Low
**Mitigation**: Strict approval workflow for baseline updates; version control snapshots

### Risk 4: Flaky Tests
**Likelihood**: High
**Impact**: High
**Mitigation**: Flakiness tracker with auto-quarantine; deterministic fixtures

### Risk 5: Load Tests Too Resource Intensive
**Likelihood**: Low
**Impact**: Medium
**Mitigation**: Run on schedule (weekly) vs per-PR; use smaller VU counts

---

## Kickoff Commands

```bash
# Install dependencies (if not already done)
pnpm install

# Unit tests with coverage
pnpm -w test:cov
pnpm vitest --coverage --run

# E2E tests
pnpm -w test:e2e
cd apps/corp-cockpit-astro && pnpm exec playwright test

# Visual regression tests
cd apps/corp-cockpit-astro && pnpm exec playwright test visual-comprehensive

# Accessibility tests
cd apps/corp-cockpit-astro && pnpm exec playwright test tests/a11y/accessibility.spec.ts

# Load tests (requires k6 installed)
k6 run tests/load/dashboard-load.js
k6 run tests/load/reporting-load.js
k6 run tests/load/ingestion-load.js
k6 run tests/load/streaming-load.js

# Quality dashboard generation
pnpm quality:report  # (to be implemented)

# Seed test data
pnpm test:seed  # (to be implemented)
```

---

## Next Steps

1. ✅ Review and approve this plan
2. 🚧 Set up test fixtures and seed data
3. 🚧 Audit current coverage per service
4. 🚧 Write missing unit tests for critical gaps
5. 🚧 Implement E2E coverage tracking
6. 🚧 Capture VRT baselines for top 20 routes
7. 🚧 Fix critical a11y violations
8. 🚧 Enhance k6 scripts with SLO thresholds
9. 🚧 Create unified quality-gates.yml workflow
10. 🚧 Enable deployment gating

---

**Document Owner**: @lead-unit, @lead-e2e, @lead-vrt, @lead-a11y, @lead-load
**Last Updated**: 2025-11-15
**Status**: 🚧 In Progress
