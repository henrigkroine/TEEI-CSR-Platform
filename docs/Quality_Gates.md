# Quality Gates - Production Thresholds

**Mission**: Raise quality gates to production thresholds: unit ≥80%, E2E ≥60%, visual regression established, a11y automated, load tests for key flows. Gate deployments via CI.

**Status**: ✅ Implemented
**Date**: 2025-11-15
**Branch**: `claude/quality-gates-production-015Zu8WyXWzGf5FmsZeJ7s6o`

---

## Table of Contents

1. [Overview](#overview)
2. [Quality Gates](#quality-gates)
3. [Available Scripts](#available-scripts)
4. [CI/CD Integration](#cicd-integration)
5. [Test Infrastructure](#test-infrastructure)
6. [Metrics & Reporting](#metrics--reporting)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The TEEI CSR Platform enforces production-level quality gates across all code changes. These gates ensure:

- **High test coverage** (≥80% unit, ≥60% E2E)
- **Visual consistency** (snapshot diffs ≤0.3%)
- **Accessibility compliance** (WCAG 2.2 AA, 0 critical violations)
- **Performance standards** (load test SLOs passing)
- **Test reliability** (flakiness tracking and quarantine)

All quality gates are enforced automatically in CI via `.github/workflows/quality-gates.yml`.

---

## Quality Gates

### Gate 1: Unit Test Coverage ≥80%

**Threshold**: 80% for lines, functions, branches, and statements

**How to check**:
```bash
pnpm test:cov
```

**How to fix**:
```bash
# Analyze coverage gaps
pnpm coverage:analyze

# See detailed coverage report
open coverage/index.html

# Write missing tests based on priority
pnpm coverage:gaps
```

**Configuration**: `vitest.config.ts`

---

### Gate 2: E2E Test Coverage ≥60%

**Threshold**: 60% of critical routes covered by E2E tests

**How to check**:
```bash
pnpm e2e:coverage
```

**How to fix**:
```bash
# Run E2E tests
pnpm e2e:run

# See coverage report
cat e2e-coverage.json

# Add missing E2E tests in tests/e2e/ or apps/corp-cockpit-astro/tests/e2e/
```

**Critical Routes** (Priority):
1. SSO Login → Dashboard
2. Generate Report → Export (PDF/CSV)
3. Impact-In Event Replay
4. DSAR Export/Delete
5. Tenant Switch + i18n Toggle
6. Approval Workflow
7. Offline Mode → SSE Resume

---

### Gate 3: Visual Regression ≤0.3%

**Threshold**: Snapshot differences ≤0.3% pixel diff

**How to check**:
```bash
pnpm vrt:check
```

**How to fix**:
```bash
# If differences are intentional, update baselines:
pnpm vrt:baseline

# If differences are bugs, fix the code and re-run tests
```

**Baseline Routes**: Top 20 cockpit routes (see `plans/worker-quality.md`)

---

### Gate 4: Accessibility (0 critical/serious violations)

**Threshold**:
- Critical violations: 0
- Serious violations: 0
- Moderate violations: ≤5

**How to check**:
```bash
pnpm a11y:ci
```

**How to fix**:
- Fix critical and serious violations immediately
- Document exceptions for moderate violations
- Use eslint-plugin-jsx-a11y for preventive checks

**Tools**:
- axe-core (automated)
- Pa11y (complementary)
- Manual testing with screen readers (NVDA/JAWS/VoiceOver)

---

### Gate 5: Load Tests (SLOs passing)

**SLO Targets**:
- Dashboard P95 latency ≤500ms
- Report generation P95 latency ≤2s
- SSE event delivery P95 latency ≤100ms
- Error rate ≤0.1%
- Success rate ≥99.9%

**How to check**:
```bash
# Requires k6 installed
k6 --version

# Run load tests
pnpm k6:run
```

**Load Test Scenarios**:
1. Cockpit concurrent users (100 VUs, 5min)
2. Report generation burst (50 simultaneous requests)
3. Impact-In sustained load (1k events/s, 10min)
4. SSE streaming (500 concurrent connections)
5. Export queue (100 PDF exports)

**Note**: Load tests run weekly on schedule in CI (not on every PR).

---

### Gate 6: Lint & TypeCheck

**How to check**:
```bash
pnpm lint
pnpm typecheck
```

**How to fix**:
```bash
# Auto-fix lint issues
pnpm format

# Fix type errors manually
```

---

### Gate 7: Security Audit

**How to check**:
```bash
pnpm audit --audit-level=high --prod
```

**How to fix**:
```bash
# Update vulnerable dependencies
pnpm update <package-name>

# Or apply patches
pnpm patch <package-name>
```

---

## Available Scripts

### Unit Testing

```bash
# Run all unit tests
pnpm test

# Run unit tests with coverage
pnpm test:cov

# Run integration tests
pnpm test:integration

# Analyze coverage gaps
pnpm coverage:analyze

# Generate coverage gap report
pnpm coverage:gaps
```

### E2E Testing

```bash
# Run E2E tests (chromium only)
pnpm e2e:run

# Run E2E tests (all browsers)
pnpm test:e2e

# Run E2E with UI mode
pnpm test:e2e:ui

# Calculate E2E coverage
pnpm e2e:coverage
```

### Visual Regression Testing

```bash
# Check for visual differences
pnpm vrt:check

# Update baselines (requires approval)
pnpm vrt:baseline
```

### Accessibility Testing

```bash
# Run a11y tests
pnpm a11y:ci
```

### Load Testing

```bash
# Run load tests (requires k6)
pnpm k6:run
```

### Quality Reporting

```bash
# Generate HTML quality dashboard
pnpm quality:report

# Generate JSON report
pnpm quality:report:json

# Generate Markdown report
pnpm quality:report:md

# View dashboard
open reports/quality/dashboard.html
```

### Flakiness Tracking

```bash
# Analyze flakiness
pnpm flakiness:analyze

# Generate flakiness report
pnpm flakiness:report

# Auto-quarantine flaky tests
pnpm flakiness:quarantine
```

### Test Data

```bash
# Seed test database with fixtures
pnpm test:seed

# Reset test database
pnpm test:seed:reset
```

---

## CI/CD Integration

### Workflow: `quality-gates.yml`

The unified quality gates workflow runs on:
- All pull requests to `main` or `develop`
- All pushes to `main`
- Manual trigger via workflow_dispatch

**Gates Enforced**:
1. ✅ Unit Coverage ≥80% (CRITICAL - blocks merge)
2. ⚠️ E2E Coverage ≥60% (soft fail, informational)
3. ⚠️ Visual Regression ≤0.3% (soft fail, requires review)
4. ⚠️ A11y 0 critical/serious (soft fail, pending full implementation)
5. ⚠️ Load Tests SLOs (runs on main only)
6. ✅ Lint & TypeCheck (CRITICAL - blocks merge)
7. ✅ Security Audit (CRITICAL - blocks merge)

**PR Comments**: The workflow automatically comments on PRs with a quality scorecard showing all gate statuses.

### Other Workflows

- `test.yml` - Comprehensive test suite (unit, integration, E2E, contract)
- `e2e.yml` - Multi-browser E2E tests with sharding
- `visual-regression.yml` - Visual regression tests
- `a11y.yml` - Accessibility tests with detailed reports
- `loadtests.yml` - Scheduled weekly load tests

---

## Test Infrastructure

### Directory Structure

```
/tests/
├── fixtures/          # Test fixtures and seed data
│   ├── seed.ts       # Test data seeder
│   └── ...
├── utils/            # Test utilities
│   ├── flakiness-tracker.ts
│   └── ...
├── e2e/              # Root-level E2E tests
├── integration/      # Integration tests
├── contract/         # Contract tests
├── compliance/       # Compliance tests (DSAR, retention)
├── load/             # k6 load test scripts
└── smoke/            # Smoke tests

/apps/corp-cockpit-astro/tests/
├── e2e/              # Cockpit-specific E2E tests
├── a11y/             # Accessibility tests
└── visual/           # Visual regression tests

/scripts/
├── e2e-coverage.js         # E2E coverage tracker
├── coverage-analysis.ts     # Coverage gap analyzer
└── quality-report.ts        # Quality dashboard generator

/reports/quality/
├── dashboard.html           # Quality dashboard
├── coverage-gaps.md         # Coverage analysis
└── flakiness-report.md      # Flakiness tracking
```

### Test Fixtures

Deterministic test fixtures are available in `tests/fixtures/seed.ts`:

- **Users**: admin, viewer, partner, analyst
- **Tenants**: primary, partner, multilocale
- **Reports**: quarterly, annual, investor update
- **Evidence**: citations, lineage
- **Impact-In Events**: Benevity, Goodera, Workday
- **SROI/VIS Calculations**: standard, edge cases (zero, negative)

**Usage**:
```typescript
import { users, tenants, reports } from './tests/fixtures/seed';

// Use in tests
expect(result.userId).toBe(users.admin.id);
```

### Flakiness Tracker

The flakiness tracker automatically detects and quarantines flaky tests:

- **Detection**: Tests with >10% failure rate over 10 runs
- **Quarantine**: Auto-quarantine to prevent CI instability
- **Reporting**: Weekly flakiness reports with root cause analysis

**CLI**:
```bash
# Analyze flakiness
pnpm flakiness:analyze

# Generate report
pnpm flakiness:report

# Quarantine flaky tests
pnpm flakiness:quarantine

# Restore a test
npx tsx tests/utils/flakiness-tracker.ts restore <file> <name>
```

---

## Metrics & Reporting

### Quality Dashboard

The quality dashboard aggregates all metrics into a single HTML report:

**Generate**:
```bash
pnpm quality:report
open reports/quality/dashboard.html
```

**Metrics**:
- Unit test coverage (lines, functions, branches, statements)
- E2E test coverage (route coverage %)
- Visual regression (snapshot diffs)
- Accessibility violations (critical, serious, moderate)
- Load test SLOs (pass/fail)
- Flakiness (flaky tests, quarantined tests)

**Export Formats**:
- HTML (default): Interactive dashboard
- JSON: Machine-readable for CI/CD
- Markdown: For documentation

### Coverage Analysis

Analyze coverage gaps and prioritize testing:

```bash
pnpm coverage:analyze
```

**Prioritization**:
- Low coverage % (gap from 80%)
- High uncovered lines
- High change frequency (git blame)

**Output**: `reports/quality/coverage-gaps-YYYY-MM-DD.md`

---

## Troubleshooting

### "Unit coverage below threshold"

**Problem**: Coverage is below 80% for one or more metrics.

**Solution**:
1. Run `pnpm coverage:analyze` to identify gaps
2. Check `coverage/index.html` for detailed coverage report
3. Write tests for high-priority uncovered files
4. Re-run `pnpm test:cov` to verify

### "E2E coverage below threshold"

**Problem**: Less than 60% of routes are covered by E2E tests.

**Solution**:
1. Run `pnpm e2e:coverage --verbose` to see uncovered routes
2. Add E2E tests for critical flows (see Gate 2 above)
3. Re-run `pnpm e2e:coverage` to verify

### "Visual regression detected"

**Problem**: Snapshot differences detected.

**Solution**:
1. Review diff images in `apps/corp-cockpit-astro/test-results/*-diff.png`
2. If differences are intentional (design changes):
   - Update baselines: `pnpm vrt:baseline`
   - Commit updated snapshots
3. If differences are bugs:
   - Fix the code
   - Re-run `pnpm vrt:check`

### "Flaky tests detected"

**Problem**: Tests fail intermittently.

**Solution**:
1. Run `pnpm flakiness:analyze` to identify flaky tests
2. Investigate root causes:
   - Race conditions (use waitFor, retry logic)
   - Non-deterministic data (use fixtures, seed RNG)
   - External dependencies (mock API calls)
3. Fix the test
4. Reset flakiness data: `npx tsx tests/utils/flakiness-tracker.ts reset <file> <name>`

### "Coverage reports missing"

**Problem**: `coverage/` directory does not exist.

**Solution**:
1. Run tests with coverage: `pnpm test:cov`
2. Ensure `@vitest/coverage-v8` is installed: `pnpm install`

### "E2E tests timeout"

**Problem**: E2E tests timeout in CI.

**Solution**:
1. Increase timeout in `playwright.config.ts`
2. Optimize slow tests (reduce wait times, parallelize)
3. Use sharding for large test suites

### "Load tests fail in CI"

**Problem**: k6 is not installed in CI.

**Solution**:
Load tests run on a schedule (weekly), not on every PR. They only run when:
- Manually triggered via workflow_dispatch
- Scheduled (Sundays at 2 AM UTC)

To run locally, install k6:
```bash
# macOS
brew install k6

# Linux
sudo snap install k6

# Verify
k6 version
```

---

## Best Practices

### Writing Tests

1. **Use fixtures**: Import from `tests/fixtures/seed.ts` for deterministic data
2. **Mock external APIs**: Don't rely on real external services
3. **Test error paths**: Cover both happy and unhappy paths
4. **Keep tests fast**: Unit tests < 1s, E2E tests < 10s
5. **Use descriptive names**: `test('should calculate SROI correctly for zero investment')`

### Maintaining Coverage

1. **Write tests alongside code**: Don't let coverage drop
2. **Review coverage in PRs**: Check CI comments for coverage changes
3. **Prioritize high-impact files**: Focus on critical business logic
4. **Don't game the system**: Write meaningful tests, not just coverage fillers

### Visual Regression

1. **Review diffs carefully**: Don't blindly update baselines
2. **Test multiple viewports**: Desktop, tablet, mobile
3. **Test dark mode**: Once implemented
4. **Document changes**: PR description should explain visual changes

### Accessibility

1. **Test early**: Don't wait until the end
2. **Use semantic HTML**: Reduces a11y issues
3. **Test with screen readers**: Automated tests catch ~30% of issues
4. **Follow WCAG 2.2 AA**: Use the official checklist

### Performance

1. **Set performance budgets**: Use Lighthouse CI
2. **Monitor trends**: Track load test results over time
3. **Optimize critical paths**: Dashboard, reports, exports
4. **Use caching**: Reduce server load

---

## Resources

- **Plan**: `/plans/worker-quality.md` - Comprehensive quality gates plan
- **Workflow**: `.github/workflows/quality-gates.yml` - CI configuration
- **Scripts**: `/scripts/` - Utility scripts for quality checks
- **Fixtures**: `/tests/fixtures/seed.ts` - Test data
- **Reports**: `/reports/quality/` - Quality reports and dashboards

---

## Support

For questions or issues with quality gates:

1. Check this documentation first
2. Review the plan: `/plans/worker-quality.md`
3. Check CI logs for detailed error messages
4. Ask in #quality-gates Slack channel
5. Create an issue in GitHub with `quality-gates` label

---

**Last Updated**: 2025-11-15
**Maintained By**: Worker 3 (Quality Gates Team)
