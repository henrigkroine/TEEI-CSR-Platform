# CI/CD Workflows Documentation

## Overview

This directory contains GitHub Actions workflows for automated testing, quality assurance, and deployment of the TEEI CSR Platform.

## Workflows

### 1. Accessibility Testing (`a11y.yml`)

**Purpose:** Enforce strict WCAG 2.2 AA compliance across all UI components.

**Triggers:**
- Pull requests to `main` or `develop`
- Pushes to `main` or `develop`
- Changes to `apps/corp-cockpit-astro/**` or workflow file

**Jobs:**

#### accessibility-tests
- Runs axe-core automated accessibility tests
- Runs Pa11y CI comprehensive audits
- **Strict Thresholds:**
  - Critical violations: **0** (zero tolerance)
  - Serious violations: **0** (zero tolerance)
  - Moderate violations: **≤ 5**
- Generates detailed violation reports
- Posts results to PR comments
- Fails build if thresholds exceeded

#### lighthouse-audit
- Performs Lighthouse performance and accessibility audits
- Tests multiple URLs (/, /en, /no)
- **Score Requirements:**
  - Accessibility: **≥ 95**
  - Performance: **≥ 85**
  - Best Practices: **≥ 90**
- Tracks score trends over time
- Posts results to PR comments

#### eslint-a11y
- Runs ESLint with accessibility-specific rules
- Annotates code with violations
- Enforces jsx-a11y plugin rules

**Artifacts Generated:**
- `accessibility-report` - Markdown summary
- `playwright-accessibility-report` - HTML test results
- `pa11y-screenshots` - Screenshots of violations
- `pa11y-results` - JSON results
- `lighthouse-report` - Lighthouse audit summary
- `lighthouse-results` - Full Lighthouse data

**Local Testing:**
```bash
# Run all accessibility tests
pnpm --filter @teei/corp-cockpit-astro test:a11y:full

# Run only axe-core tests
pnpm --filter @teei/corp-cockpit-astro exec playwright test tests/a11y

# Run only Pa11y tests
pnpm --filter @teei/corp-cockpit-astro test:a11y

# Run Lighthouse locally
pnpm --filter @teei/corp-cockpit-astro build
pnpm --filter @teei/corp-cockpit-astro preview
pnpm --filter @teei/corp-cockpit-astro lighthouse
```

---

### 2. End-to-End Testing (`e2e.yml`)

**Purpose:** Comprehensive E2E testing including functional, visual regression, performance, and security tests.

**Triggers:**
- Pushes to `main`, `develop`, or `claude/**` branches
- Pull requests to `main` or `develop`
- Manual workflow dispatch

**Jobs:**

#### e2e-tests
- Runs functional E2E tests across browsers (Chromium, Firefox, WebKit)
- Uses sharding for parallel execution (2 shards)
- Tests authentication, navigation, data operations
- Uploads test reports, artifacts, and video recordings

#### e2e-mobile
- Tests mobile and tablet viewports
- Devices: mobile-chrome, mobile-safari, tablet
- Validates responsive design
- Checks for horizontal scroll issues

#### visual-regression
- Compares UI screenshots against baselines
- **Strict Thresholds:**
  - Max pixel difference ratio: **0.2%**
  - Max different pixels: **100**
  - Color threshold: **0.2**
- Generates diff images for failures
- **Test Coverage:**
  - Dashboard layouts (desktop, tablet, mobile)
  - Component snapshots (KPI cards, navigation, widgets)
  - Multi-language consistency (en, no, uk)
  - Loading and error states
  - Responsive layouts (6 viewport sizes)
- Posts results to PR comments
- Uploads diff images on failure

#### performance-tests
- Measures page load times
- Validates Core Web Vitals
- Checks for performance regressions

#### security-tests
- Tests for common security vulnerabilities
- Validates CORS policies
- Checks CSP headers

#### test-summary
- Aggregates results from all test jobs
- Generates comprehensive summary
- Fails if critical tests fail

#### update-snapshots
- Manual workflow dispatch only
- Updates visual regression baselines
- Uploads new snapshot images

**Artifacts Generated:**
- `playwright-report-{browser}-shard-{n}` - Test reports per browser/shard
- `test-results-{browser}-shard-{n}` - Raw test results
- `test-videos-{browser}-shard-{n}` - Failure video recordings
- `visual-regression-report` - Visual diff summary
- `visual-diff-images` - Actual vs expected comparisons
- `visual-snapshots-all` - Complete snapshot set
- `performance-report` - Performance metrics
- `security-test-report` - Security audit results

**Local Testing:**
```bash
# Run all E2E tests
cd apps/corp-cockpit-astro
pnpm test:e2e

# Run specific browser
pnpm exec playwright test --project=chromium

# Run visual regression tests
pnpm exec playwright test tests/e2e/visual.spec.ts

# Update visual snapshots
pnpm exec playwright test tests/e2e/visual.spec.ts --update-snapshots

# Run with UI mode for debugging
pnpm exec playwright test --ui

# Run specific test file
pnpm exec playwright test tests/e2e/dashboard.spec.ts
```

**Updating Visual Baselines:**

When intentional UI changes are made:

1. **Locally:**
   ```bash
   cd apps/corp-cockpit-astro
   pnpm exec playwright test tests/e2e/visual.spec.ts --update-snapshots
   git add tests/e2e/**/*.png
   git commit -m "chore: update visual regression baselines"
   ```

2. **Via CI (workflow_dispatch):**
   ```bash
   gh workflow run e2e.yml
   # Download updated-snapshots artifact
   # Commit to repository
   ```

---

## CI/CD Best Practices

### Threshold Configuration

Thresholds are defined as environment variables in workflow files for easy adjustment:

**Accessibility (a11y.yml):**
```yaml
env:
  MAX_CRITICAL_VIOLATIONS: 0
  MAX_SERIOUS_VIOLATIONS: 0
  MAX_MODERATE_VIOLATIONS: 5
  MIN_ACCESSIBILITY_SCORE: 95
  MIN_PERFORMANCE_SCORE: 85
  MIN_BEST_PRACTICES_SCORE: 90
```

**Visual Regression (e2e.yml):**
```yaml
env:
  MAX_DIFF_PERCENTAGE: 0.2
  MAX_DIFF_PIXELS: 100
```

### PR Comment Integration

All workflows post automated comments to PRs with:
- ✅/❌ Status indicators
- Detailed test results
- Links to artifacts
- Quick fix commands
- Resource links

Comments are **updated** (not duplicated) on subsequent runs.

### Artifact Retention

- Test reports: **30 days**
- Screenshots/videos: **7-30 days** depending on type
- Visual snapshots: **30 days**

### Fail-Fast Strategy

- `fail-fast: false` for test matrices to run all variations
- Individual jobs can fail without stopping others
- `test-summary` job aggregates all results

---

## Troubleshooting

### Accessibility Test Failures

1. **Check the accessibility-report artifact** for detailed violations
2. **Review Pa11y screenshots** to see visual context
3. **Run tests locally** to reproduce and debug
4. **Common fixes:**
   - Add missing ARIA labels
   - Fix color contrast ratios
   - Ensure keyboard navigation
   - Add alt text to images

### Visual Regression Failures

1. **Download visual-diff-images artifact** to see actual vs expected
2. **Determine if changes are intentional:**
   - Yes → Update baselines and commit
   - No → Fix UI issues
3. **Common causes:**
   - Font rendering differences
   - Dynamic data/timestamps
   - Animation timing
   - Browser differences

### Lighthouse Score Drops

1. **Check lighthouse-results artifact** for detailed audit
2. **Review specific failing audits**
3. **Common issues:**
   - Unoptimized images
   - Missing caching headers
   - Render-blocking resources
   - Accessibility violations

### Performance Test Failures

1. **Check performance-report artifact**
2. **Profile with Chrome DevTools** locally
3. **Common optimizations:**
   - Code splitting
   - Lazy loading
   - Image optimization
   - Reduce bundle size

---

## Workflow Maintenance

### Updating Dependencies

When updating Playwright or testing libraries:

```bash
# Update packages
pnpm update @playwright/test @axe-core/playwright pa11y-ci

# Reinstall browsers
cd apps/corp-cockpit-astro
pnpm exec playwright install --with-deps

# Update snapshots if rendering changes
pnpm exec playwright test tests/e2e/visual.spec.ts --update-snapshots
```

### Adding New Tests

1. **Create test file** in appropriate directory:
   - Accessibility: `tests/a11y/*.spec.ts`
   - E2E: `tests/e2e/*.spec.ts`
   - Visual: `tests/e2e/visual.spec.ts`

2. **Follow naming conventions:**
   - `*.spec.ts` for test files
   - Descriptive test names
   - Group related tests in `describe` blocks

3. **Update Pa11y config** if testing new URLs:
   - Edit `.pa11yci.json`
   - Add URLs to test

4. **Commit snapshots** for visual tests:
   ```bash
   git add tests/e2e/**/*.png
   ```

### Monitoring CI Performance

- **Check workflow run times** regularly
- **Optimize slow tests** (target < 30 min total)
- **Use sharding** for parallel execution
- **Cache dependencies** with pnpm cache

---

## Security Considerations

- **Never commit secrets** to workflow files
- **Use GitHub Secrets** for sensitive data
- **Restrict workflow_dispatch** to maintainers
- **Review artifacts** before making public
- **Limit artifact retention** to necessary duration

---

## Support & Resources

### Documentation
- [Playwright Documentation](https://playwright.dev)
- [Axe DevTools](https://www.deque.com/axe/devtools/)
- [Pa11y Documentation](https://pa11y.org/)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)

### Getting Help
- Check workflow logs in GitHub Actions tab
- Review artifact files for detailed results
- Run tests locally to reproduce issues
- Consult team documentation in `/docs`

### Contributing
When modifying workflows:
1. Test changes in feature branch
2. Document changes in this README
3. Update threshold values carefully
4. Add examples for new features
5. Review with CI/CD team before merging

---

## Workflow Status Badges

Add to your README:

```markdown
![Accessibility](https://github.com/your-org/TEEI-CSR-Platform/actions/workflows/a11y.yml/badge.svg)
![E2E Tests](https://github.com/your-org/TEEI-CSR-Platform/actions/workflows/e2e.yml/badge.svg)
```

---

**Last Updated:** 2025-11-14
**Maintained By:** Worker 4 Phase D - CI/CD Engineering Team
