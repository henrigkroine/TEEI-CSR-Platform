# Trust Center E2E Tests

**Agent 4.1: E2E Test Engineer (Trust Center)**

## Overview

Comprehensive Playwright E2E test suite for the TEEI Platform Trust Center, covering public pages, API endpoints, accessibility, and security features.

## Test Structure

### 1. `trust-center.spec.ts` - UI Tests

Tests the public-facing Trust Center pages for:

- **Landing Page**: Title, headings, layout, navigation
- **System Status**: Uptime metrics, operational badges, SLO displays
- **Security & Compliance**: Certifications (SOC 2, GDPR, ISO 27001, CSRD)
- **Data Residency**: Regional information (US, EU, APAC)
- **Documentation Links**: Security whitepaper, DPA, SLA, privacy policy
- **Incident History**: Recent incidents, resolution status
- **Responsive Design**: Mobile, tablet, desktop viewports
- **Accessibility**: WCAG 2.2 AA compliance using @axe-core/playwright
- **Performance**: Load times, asset loading

**Coverage**: 15+ test cases across 6 test suites

### 2. `evidence-api.spec.ts` - API Tests

Tests Trust API endpoints for:

- **Evidence Endpoints**:
  - `GET /api/trust/v1/evidence/:reportId` - Citation retrieval
  - `GET /api/trust/v1/evidence/:reportId/lineage` - Evidence lineage
  - Authentication & authorization checks

- **Ledger Endpoints**:
  - `GET /api/trust/v1/ledger/:reportId` - Integrity verification
  - `GET /api/trust/v1/ledger/:reportId/history` - Audit trail
  - `POST /api/trust/v1/ledger/verify` - Hash verification

- **Policy Endpoints** (Public):
  - `GET /api/trust/v1/policies` - Residency rules & GDPR
  - `GET /api/trust/v1/policies/residency/:region` - Region-specific rules
  - `GET /api/trust/v1/policies/dpa` - DPA template
  - `GET /api/trust/v1/policies/ropa` - Record of Processing Activities
  - `GET /api/trust/v1/policies/dpia` - Data Protection Impact Assessment

- **SBOM & Provenance**:
  - `GET /api/trust/v1/sbom` - Software Bill of Materials (SPDX/CycloneDX)
  - `GET /api/trust/v1/provenance` - SLSA provenance
  - `GET /api/trust/v1/vulnerabilities` - CVE scan results

- **Status Endpoints**:
  - `GET /api/v1/trust-center/status` - Live metrics (uptime, latency)
  - `GET /api/v1/trust-center/status/history` - Historical metrics
  - `GET /api/v1/trust-center/incidents` - Incident list

- **AI Transparency**:
  - `GET /api/trust/v1/ai/model-cards` - AI model information
  - `GET /api/trust/v1/ai/usage-metrics` - AI usage statistics
  - `GET /api/trust/v1/ai/guardrails` - AI safety policies

- **Error Handling**:
  - 400 Bad Request, 401 Unauthorized, 404 Not Found
  - Rate limiting (429 Too Many Requests)
  - CORS headers

**Coverage**: 25+ test cases across 8 test suites

## Running the Tests

### Prerequisites

```bash
# Install dependencies (from repository root)
pnpm install
```

### Run All Tests

```bash
# From trust-center directory
cd apps/trust-center
pnpm exec playwright test

# Or from repository root
cd /home/user/TEEI-CSR-Platform
pnpm --filter @teei/trust-center test:e2e
```

### Run Specific Test Suite

```bash
# UI tests only
pnpm exec playwright test trust-center.spec.ts

# API tests only
pnpm exec playwright test evidence-api.spec.ts
```

### Run with UI Mode (Interactive)

```bash
pnpm exec playwright test --ui
```

### Debug Tests

```bash
pnpm exec playwright test --debug
```

### Run on Specific Browser

```bash
# Chromium only
pnpm exec playwright test --project=chromium

# Firefox only
pnpm exec playwright test --project=firefox

# WebKit (Safari) only
pnpm exec playwright test --project=webkit

# Mobile Chrome
pnpm exec playwright test --project=mobile-chrome
```

### Generate HTML Report

```bash
pnpm exec playwright test
pnpm exec playwright show-report
```

## Environment Variables

### Required for API Tests

```bash
# Optional: Authentication token for protected endpoints
export TEST_TOKEN="your-test-token"

# Optional: Custom Trust Center URL (default: http://localhost:3000)
export TRUST_CENTER_URL="http://localhost:3000"
```

### CI Environment

Tests automatically detect CI environment and adjust settings:
- **Retries**: 2 retries on failure (vs. 0 locally)
- **Workers**: 1 parallel worker (vs. unlimited locally)
- **Server**: Does not reuse existing server (vs. reuse locally)
- **Timeout**: 10 minutes global timeout

## Accessibility Compliance

All tests verify **WCAG 2.2 AA** compliance using @axe-core/playwright:

```typescript
const results = await new AxeBuilder({ page })
  .withTags(['wcag2aa', 'wcag22aa'])
  .analyze();

expect(results.violations).toEqual([]);
```

Covered areas:
- Color contrast (WCAG AA minimum 4.5:1 for normal text)
- Keyboard navigation (all interactive elements accessible via Tab)
- Semantic HTML (proper heading hierarchy, ARIA attributes)
- Screen reader compatibility

## Test Patterns

### 1. Multi-Browser Testing

All tests run on 6 browser configurations:
- Desktop Chrome (1920x1080)
- Desktop Firefox (1920x1080)
- Desktop Safari (1920x1080)
- Mobile Chrome (Pixel 5)
- Mobile Safari (iPhone 13)
- Tablet (iPad Pro)

### 2. Screenshot on Failure

Failed tests automatically capture:
- Screenshot at failure point
- Video recording (retained on failure only)
- Trace (on first retry only)

Artifacts saved to: `apps/trust-center/test-results/`

### 3. Retry Strategy

- **Local**: 0 retries (fail fast for quick feedback)
- **CI**: 2 retries (handle transient failures)

### 4. API Mocking

For tests requiring specific API responses, use Playwright's route mocking:

```typescript
await page.route('**/api/v1/trust-center/status', route => {
  route.fulfill({
    status: 200,
    body: JSON.stringify({ uptime: 99.95, latencyP95: 245 })
  });
});
```

## Coverage Summary

| Category | Test Cases | Status |
|----------|-----------|--------|
| UI - Landing Page | 7 | ✅ |
| UI - Status API Integration | 2 | ✅ |
| UI - Responsive Design | 3 | ✅ |
| UI - Accessibility | 5 | ✅ |
| UI - Performance | 2 | ✅ |
| API - Evidence | 4 | ✅ |
| API - Ledger | 3 | ✅ |
| API - Policies | 4 | ✅ |
| API - SBOM & Provenance | 3 | ✅ |
| API - Status | 3 | ✅ |
| API - AI Transparency | 3 | ✅ |
| API - Error Handling | 3 | ✅ |
| **Total** | **42** | **✅** |

## CI Integration

Tests integrate with existing CI pipeline:

```yaml
# .github/workflows/trust-center-e2e.yml
- name: Run Trust Center E2E Tests
  run: |
    cd apps/trust-center
    pnpm exec playwright test --reporter=html,json,junit
  env:
    TEST_TOKEN: ${{ secrets.TEST_TOKEN }}
    CI: true
```

Reports are published as CI artifacts:
- `playwright-report/index.html` - HTML report with screenshots/videos
- `playwright-report/results.json` - JSON for programmatic analysis
- `playwright-report/results.xml` - JUnit XML for CI dashboards

## Maintenance

### Adding New Tests

1. Follow existing patterns in `trust-center.spec.ts` or `evidence-api.spec.ts`
2. Use descriptive test names: `test('feature does X when Y')`
3. Include accessibility checks for UI tests
4. Verify API response structure for API tests
5. Add test to coverage summary in this README

### Updating Baselines

If Trust Center UI changes intentionally:

```bash
# Update visual regression baselines (if added)
pnpm exec playwright test --update-snapshots
```

### Debugging Flaky Tests

1. Run test multiple times:
   ```bash
   pnpm exec playwright test --repeat-each=10
   ```

2. Check test traces:
   ```bash
   pnpm exec playwright show-trace test-results/.../trace.zip
   ```

3. Use flakiness tracker (repository root):
   ```bash
   pnpm run flakiness:analyze
   ```

## Quality Gates

Tests are part of the PR quality gates. PRs must pass:

- ✅ All E2E tests (42 tests)
- ✅ No accessibility violations (WCAG 2.2 AA)
- ✅ All API endpoints return expected structure
- ✅ Load time < 3 seconds
- ✅ Multi-browser compatibility (6 configurations)

## References

- [Playwright Documentation](https://playwright.dev/)
- [@axe-core/playwright](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [SLSA Provenance](https://slsa.dev/provenance/)
- [SPDX SBOM](https://spdx.dev/)

---

**Last Updated**: 2025-11-17
**Agent**: Agent 4.1 - E2E Test Engineer (Trust Center)
**Status**: ✅ Complete
