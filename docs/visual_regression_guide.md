# Visual Regression Testing Guide

## Overview

This guide provides comprehensive documentation for the Corporate Cockpit visual regression testing suite. Visual regression testing helps ensure UI consistency across code changes, browser versions, and viewport sizes.

**Baseline Created:** November 14, 2025
**Test Environment:** Chromium, Firefox, WebKit
**Playwright Version:** Latest

---

## Table of Contents

1. [Architecture](#architecture)
2. [Test Coverage](#test-coverage)
3. [Running Tests](#running-tests)
4. [Updating Baselines](#updating-baselines)
5. [CI/CD Integration](#cicd-integration)
6. [Troubleshooting](#troubleshooting)
7. [Best Practices](#best-practices)

---

## Architecture

### Test Structure

Visual regression tests are organized in the following structure:

```
apps/corp-cockpit-astro/
├── tests/
│   └── e2e/
│       ├── visual.spec.ts                    # Original visual tests
│       ├── visual-comprehensive.spec.ts       # Enhanced comprehensive tests
│       ├── helpers.ts                         # Test utilities
│       └── snapshots/                         # Baseline screenshots
│           ├── chromium/
│           ├── firefox/
│           └── webkit/
├── playwright.config.ts                       # Playwright configuration
└── test-results/                              # Test artifacts
```

### Viewport Configurations

Three standard viewports are tested:

| Name    | Width | Height | Use Case           |
|---------|-------|--------|--------------------|
| Desktop | 1920  | 1080   | Desktop browsers   |
| Tablet  | 768   | 1024   | iPad/tablet devices|
| Mobile  | 375   | 667    | iPhone/mobile      |

### Comparison Thresholds

Different thresholds are used based on content type:

| Threshold | Pixels | Use Case                                    |
|-----------|--------|---------------------------------------------|
| STRICT    | 50     | Static components (nav, buttons)            |
| NORMAL    | 100    | General pages and components                |
| RELAXED   | 150    | Dynamic content, i18n text length changes   |
| CHARTS    | 200    | Charts with animations or canvas rendering  |

---

## Test Coverage

### 1. Dashboard Widgets

**Test File:** `visual-comprehensive.spec.ts`

- **At-a-Glance Widget** - Desktop, tablet, mobile viewports
- **SROI Panel** - Desktop, tablet, mobile viewports
- **VIS Panel** - Desktop, tablet, mobile viewports
- **Q2Q Feed** - Desktop, tablet, mobile viewports
- **KPI Cards** - Individual card snapshots (up to 6 cards)

**Selectors:**
```typescript
'[data-testid="at-a-glance"]'
'[data-testid="sroi-panel"]'
'[data-testid="vis-panel"]'
'[data-testid="q2q-feed"]'
'[data-testid="kpi-card"]'
```

### 2. Evidence Explorer

- **List View** - Desktop, tablet, mobile
- **Individual Evidence Cards**
- **Detail Drawer** - Open state across viewports
- **Lineage Drawer** - Evidence chain visualization

**Selectors:**
```typescript
'[data-testid="evidence-card"]'
'[data-testid="evidence-drawer"]'
'[data-testid="lineage-drawer"]'
```

### 3. Charts

- **Line Charts** - Trend visualizations
- **Bar Charts** - Comparative data
- **Pie Charts** - Distribution data
- **Benchmark Charts** - Cohort comparisons

**Selectors:**
```typescript
'[data-chart-type="line"]'
'[data-chart-type="bar"]'
'[data-chart-type="pie"]'
'[data-testid="benchmark-chart"]'
```

### 4. Modals

- **Report Generation Modal**
- **Export Modal** - CSV/JSON/PDF options
- **Save View Modal** - Dashboard view persistence
- **Share Link Modal** - Public/private link sharing

**Selectors:**
```typescript
'[data-testid="report-modal"]'
'[data-testid="export-modal"]'
'[data-testid="save-view-modal"]'
'[data-testid="share-modal"]'
```

### 5. Forms

- **Login Form** - Desktop, tablet, mobile
- **Admin Settings**
- **SSO Settings**
- **Weight Overrides Form**

### 6. Navigation

- **Header** - Desktop, tablet, mobile
- **Sidebar** - Desktop view
- **Mobile Menu** - Collapsed and expanded states
- **Language Switcher** - Dropdown with en/no/uk options

**Selectors:**
```typescript
'header, [role="banner"]'
'aside, [role="navigation"]'
'[data-testid="menu-toggle"]'
'[data-testid="language-switcher"]'
```

### 7. Empty States

- **Empty Evidence**
- **Empty Reports**
- **No Data Dashboard**

### 8. Loading States

- **Loading Spinner**
- **Skeleton Loaders**

**Selectors:**
```typescript
'[data-testid="loading-spinner"]'
'[data-testid="skeleton"]'
```

### 9. Error States

- **404 Page** - Not Found
- **401 Page** - Unauthorized
- **API Error Messages**
- **Network Error State**

### 10. Additional UI Elements

- **Connection Status Indicator**
- **Tenant Selector** (Super Admin)
- **Approval Workflow Panel**
- **Export Buttons Group**

---

## Running Tests

### Prerequisites

1. Install dependencies:
```bash
cd apps/corp-cockpit-astro
pnpm install
```

2. Install Playwright browsers:
```bash
pnpm exec playwright install
```

### Run All Visual Tests

```bash
# Run all visual regression tests
pnpm exec playwright test visual-comprehensive

# Run specific test suite
pnpm exec playwright test visual-comprehensive --grep "Dashboard Widgets"

# Run in headed mode (see browser)
pnpm exec playwright test visual-comprehensive --headed

# Run in debug mode
pnpm exec playwright test visual-comprehensive --debug
```

### Run Tests for Specific Viewport

```bash
# Desktop only
pnpm exec playwright test visual-comprehensive --grep "desktop"

# Mobile only
pnpm exec playwright test visual-comprehensive --grep "mobile"

# Tablet only
pnpm exec playwright test visual-comprehensive --grep "tablet"
```

### Run Tests for Specific Browser

```bash
# Chromium only
pnpm exec playwright test visual-comprehensive --project=chromium

# Firefox only
pnpm exec playwright test visual-comprehensive --project=firefox

# WebKit only
pnpm exec playwright test visual-comprehensive --project=webkit
```

### View Test Results

```bash
# Open HTML report
pnpm exec playwright show-report

# Open specific test report
pnpm exec playwright show-report playwright-report
```

---

## Updating Baselines

### When to Update Baselines

Update baseline snapshots when:

1. **Intentional UI changes** - New features, design updates
2. **Bug fixes** - Correcting visual defects
3. **Dependency updates** - Font rendering, browser updates
4. **Viewport changes** - Adding new responsive breakpoints

### How to Update Baselines

#### Update All Baselines

```bash
# Update all snapshots
pnpm exec playwright test visual-comprehensive --update-snapshots

# Update for specific browser
pnpm exec playwright test visual-comprehensive --update-snapshots --project=chromium
```

#### Update Specific Test Baselines

```bash
# Update specific test suite
pnpm exec playwright test visual-comprehensive --update-snapshots --grep "Dashboard Widgets"

# Update specific test
pnpm exec playwright test visual-comprehensive --update-snapshots --grep "should match SROI panel"
```

#### Update Baselines for Failed Tests Only

```bash
# Update only failed snapshots
pnpm exec playwright test visual-comprehensive --update-snapshots --only-changed
```

### Baseline Review Process

1. **Run tests** to identify visual differences
2. **Review diffs** in the HTML report
3. **Verify changes** are intentional
4. **Update baselines** using commands above
5. **Re-run tests** to confirm all pass
6. **Commit new baselines** to git

### Baseline File Naming Convention

Snapshots are named using the pattern:
```
{test-name}-{browser}-{viewport?}.png
```

Examples:
- `dashboard-full-desktop-chromium.png`
- `sroi-panel-mobile-firefox.png`
- `login-form-tablet-webkit.png`

---

## CI/CD Integration

### GitHub Actions Configuration

Add to `.github/workflows/visual-regression.yml`:

```yaml
name: Visual Regression Tests

on:
  pull_request:
    branches: [main, develop]
  push:
    branches: [main]

jobs:
  visual-tests:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Install pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8

      - name: Install dependencies
        run: pnpm install

      - name: Install Playwright browsers
        run: pnpm exec playwright install --with-deps

      - name: Run dev server
        run: |
          cd apps/corp-cockpit-astro
          pnpm dev &
          sleep 10

      - name: Run visual regression tests
        run: |
          cd apps/corp-cockpit-astro
          pnpm exec playwright test visual-comprehensive

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: playwright-report
          path: apps/corp-cockpit-astro/playwright-report
          retention-days: 30

      - name: Upload failed screenshots
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: failed-screenshots
          path: apps/corp-cockpit-astro/test-results
          retention-days: 7
```

### Pre-commit Hook

Add to `.husky/pre-commit`:

```bash
#!/bin/sh
. "$(dirname "$0")/_/husky.sh"

# Run visual regression tests before commit
cd apps/corp-cockpit-astro
pnpm exec playwright test visual-comprehensive --project=chromium

# If tests fail, abort commit
if [ $? -ne 0 ]; then
  echo "❌ Visual regression tests failed. Please review and update baselines if needed."
  exit 1
fi
```

### Docker Configuration

Run tests in Docker for consistency:

```dockerfile
FROM mcr.microsoft.com/playwright:v1.40.0-jammy

WORKDIR /app

COPY package*.json pnpm-lock.yaml ./
RUN npm install -g pnpm && pnpm install

COPY . .

CMD ["pnpm", "exec", "playwright", "test", "visual-comprehensive"]
```

Run with:
```bash
docker build -t cockpit-visual-tests .
docker run --rm cockpit-visual-tests
```

---

## Troubleshooting

### Common Issues

#### 1. Flaky Tests (Inconsistent Failures)

**Problem:** Tests pass sometimes, fail others
**Causes:**
- Animations not fully settled
- Network timing issues
- Font loading delays

**Solutions:**
```typescript
// Increase stability wait time
await waitForVisualStability(page, 3000);

// Disable animations globally
await page.addStyleTag({
  content: `
    *, *::before, *::after {
      animation-duration: 0s !important;
      transition-duration: 0s !important;
    }
  `
});

// Wait for fonts to load
await page.evaluate(() => document.fonts.ready);
```

#### 2. Large Pixel Differences

**Problem:** Tests fail with large pixel count differences
**Causes:**
- Font rendering differences between OS
- Subpixel anti-aliasing
- Canvas/WebGL rendering variations

**Solutions:**
```typescript
// Increase threshold for problematic components
await expect(element).toHaveScreenshot('chart.png', {
  maxDiffPixels: 200,
  threshold: 0.2, // Allow 20% difference
});

// Use CSS to force consistent rendering
await page.addStyleTag({
  content: `
    * {
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
    }
  `
});
```

#### 3. Missing Elements

**Problem:** Elements not found during test
**Causes:**
- Feature flags disabled
- User role permissions
- API mock data missing

**Solutions:**
```typescript
// Check if element exists before testing
const exists = await element.isVisible().catch(() => false);
if (exists) {
  await expect(element).toHaveScreenshot('component.png');
}

// Ensure proper user role
await mockSession(page, TEST_USERS.ADMIN);

// Verify API mocks return data
await page.route('**/api/metrics/**', route => route.fulfill({
  status: 200,
  body: JSON.stringify({ /* full mock data */ })
}));
```

#### 4. Browser-Specific Failures

**Problem:** Tests pass in Chromium, fail in Firefox/WebKit
**Causes:**
- CSS rendering differences
- JavaScript API differences
- Font availability

**Solutions:**
```typescript
// Use browser-agnostic selectors
// Avoid browser-specific CSS

// Set browser-specific thresholds
const threshold = browserName === 'webkit' ? 250 : 100;

await expect(page).toHaveScreenshot('page.png', {
  maxDiffPixels: threshold
});
```

#### 5. CI Failures (Local Pass)

**Problem:** Tests pass locally but fail in CI
**Causes:**
- Different OS (macOS vs Linux)
- Missing fonts
- Environment variables

**Solutions:**
```bash
# Use Docker to match CI environment
docker run -it --rm -v $(pwd):/work -w /work mcr.microsoft.com/playwright:v1.40.0-jammy /bin/bash

# Inside container:
pnpm install
pnpm exec playwright test visual-comprehensive
```

### Debug Commands

```bash
# Show detailed test output
pnpm exec playwright test visual-comprehensive --reporter=line

# Show trace viewer for failed tests
pnpm exec playwright show-trace test-results/*/trace.zip

# Run single test in debug mode
pnpm exec playwright test visual-comprehensive --debug --grep "specific test name"

# Generate full trace
pnpm exec playwright test visual-comprehensive --trace on

# Take screenshot at any point
await page.screenshot({ path: 'debug-screenshot.png' });
```

---

## Best Practices

### 1. Test Organization

✅ **DO:**
- Group related tests in describe blocks
- Use descriptive test names
- Test one component per test
- Use data-testid attributes for selectors

❌ **DON'T:**
- Test multiple unrelated components in one test
- Use brittle CSS selectors
- Make tests dependent on each other
- Skip visual stability waits

### 2. Baseline Management

✅ **DO:**
- Review all baseline changes before committing
- Update baselines intentionally, not automatically
- Document why baselines changed in commit messages
- Keep baseline images in git (they're not large)

❌ **DON'T:**
- Auto-update baselines in CI
- Commit baseline changes without review
- Use `.gitignore` for snapshots
- Update baselines to pass failing tests without investigation

### 3. Snapshot Configuration

✅ **DO:**
- Use appropriate thresholds for content type
- Wait for visual stability before capturing
- Disable animations for consistency
- Test critical viewports (mobile, tablet, desktop)

❌ **DON'T:**
- Use same threshold for all tests
- Take snapshots immediately after navigation
- Test too many viewport variations
- Capture full page when component snapshot is sufficient

### 4. Test Data

✅ **DO:**
- Use consistent mock data
- Mock API responses for deterministic tests
- Use realistic sample data
- Test empty states with empty mocks

❌ **DON'T:**
- Rely on live API data
- Use random data generators
- Skip edge cases (empty, loading, error)
- Test with production data

### 5. Performance

✅ **DO:**
- Run visual tests separately from functional tests
- Use parallel execution for independent tests
- Cache node_modules and Playwright browsers
- Skip visual tests for minor changes

❌ **DON'T:**
- Run all visual tests on every commit
- Run visual tests serially
- Install browsers on every test run
- Test every possible state variation

---

## Maintenance Schedule

### Weekly
- Review failed visual tests
- Update baselines for merged PRs
- Check for flaky tests

### Monthly
- Review threshold configurations
- Update Playwright version
- Clean up old test artifacts
- Audit test coverage

### Quarterly
- Review and refactor test suite
- Update baseline environment documentation
- Performance optimization review
- Add tests for new components

---

## Appendix

### A. Data Test IDs

Standard `data-testid` values used across the application:

```typescript
// Widgets
'at-a-glance'
'sroi-panel'
'vis-panel'
'q2q-feed'
'kpi-card'

// Evidence
'evidence-card'
'evidence-drawer'
'lineage-drawer'
'lineage-button'

// Modals
'report-modal'
'export-modal'
'save-view-modal'
'share-modal'

// Navigation
'menu-toggle'
'language-switcher'
'tenant-selector'

// Forms
'weight-overrides'

// States
'loading-spinner'
'skeleton'
'empty-state'
'connection-status'

// Actions
'generate-report'
'export-button'
'save-view'
'share-button'
'saved-views'
'saved-views-list'
'saved-view-card'

// Charts
'benchmark-chart'

// Admin
'approval-panel'
'export-buttons'
```

### B. Helper Functions

Key helper functions available in `helpers.ts`:

```typescript
// Authentication
mockSession(page, user, expiresInHours?)
login(page, user)
logout(page)

// Navigation
navigateToCockpit(page, lang, companyId, subPath?)

// Waiting
waitForLoadingComplete(page, timeout?)
waitForVisible(locator, timeout?)
waitForNetworkIdle(page, timeout?)

// Visual stability (custom)
waitForVisualStability(page, timeout?)
```

### C. Snapshot Storage

Snapshots are stored in browser-specific directories:

```
tests/e2e/snapshots/
├── chromium/
│   ├── dashboard-full-desktop.png
│   ├── sroi-panel-mobile.png
│   └── ...
├── firefox/
│   └── ...
└── webkit/
    └── ...
```

### D. Resources

- [Playwright Visual Comparisons](https://playwright.dev/docs/test-snapshots)
- [Best Practices for Visual Testing](https://playwright.dev/docs/best-practices)
- [Troubleshooting Flaky Tests](https://playwright.dev/docs/test-timeouts)

---

## Support

For questions or issues:

1. Check this documentation
2. Review test code comments
3. Check Playwright documentation
4. Contact the QA team
5. Open an issue in the project repository

---

**Document Version:** 1.0
**Last Updated:** November 14, 2025
**Maintained By:** Visual Regression Engineer / Worker 4 Phase D
