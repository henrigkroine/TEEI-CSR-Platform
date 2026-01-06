# Visual Regression Testing - Quick Start Guide

Quick reference for running visual regression tests on the Corporate Cockpit.

## Prerequisites

```bash
# Install dependencies
pnpm install

# Install Playwright browsers
pnpm exec playwright install
```

## Common Commands

### Run Visual Tests

```bash
# Run all visual tests
pnpm test:visual

# Run in headed mode (see the browser)
pnpm test:visual:headed

# Run in debug mode (step through)
pnpm test:visual:debug

# Run specific browser only
pnpm test:visual:chromium
pnpm test:visual:firefox
pnpm test:visual:webkit
```

### View Test Reports

```bash
# Open HTML test report
pnpm test:visual:report
```

### Update Baselines

```bash
# Update all baselines
pnpm test:visual:update

# Update specific browser
pnpm exec playwright test visual-comprehensive --update-snapshots --project=chromium

# Update specific test suite
pnpm exec playwright test visual-comprehensive --update-snapshots --grep "Dashboard Widgets"

# Generate baselines with script
pnpm test:visual:baselines
```

## Test Structure

Visual tests are organized by:

1. **Dashboard Widgets** - SROI, VIS, Q2Q, At-a-Glance
2. **Evidence Explorer** - List, cards, drawers
3. **Charts** - Line, bar, pie, benchmarks
4. **Modals** - Report generation, export, share
5. **Forms** - Login, admin settings, SSO
6. **Navigation** - Header, sidebar, mobile menu
7. **Empty States** - No data views
8. **Loading States** - Spinners, skeletons
9. **Error States** - 404, 401, API errors
10. **Saved Views UI** - View management

## Viewports Tested

- **Desktop**: 1920x1080
- **Tablet**: 768x1024
- **Mobile**: 375x667

## Workflow

### Making UI Changes

1. Make your UI changes
2. Run visual tests: `pnpm test:visual`
3. Review any failures in the HTML report
4. If changes are intentional, update baselines: `pnpm test:visual:update`
5. Re-run tests to confirm: `pnpm test:visual`
6. Commit updated baselines with your changes

### Reviewing Failures

1. Open test report: `pnpm test:visual:report`
2. Click on failed test to see:
   - **Expected**: Baseline screenshot
   - **Actual**: Current screenshot
   - **Diff**: Highlighted differences
3. Determine if differences are:
   - **Intentional**: Update baselines
   - **Bug**: Fix the issue
   - **Flaky**: Adjust test or threshold

## Troubleshooting

### Tests fail locally but pass in CI

```bash
# Use Docker to match CI environment
cd apps/corp-cockpit-astro
./scripts/generate-visual-baselines.sh --docker
```

### Tests are flaky (sometimes pass, sometimes fail)

1. Check for animations - ensure they're disabled
2. Verify font loading is complete
3. Increase visual stability wait time
4. Check for dynamic content (dates, random data)

### Large pixel differences

1. Review the diff image in test report
2. Check if it's a font rendering difference
3. Consider increasing threshold for that specific test
4. Regenerate baselines if change is intentional

## File Locations

- **Test file**: `tests/e2e/visual-comprehensive.spec.ts`
- **Baselines**: `tests/e2e/snapshots/{browser}/`
- **Test results**: `test-results/`
- **HTML report**: `playwright-report/`
- **Documentation**: `/docs/visual_regression_guide.md`

## CI/CD

Visual tests run automatically on:
- Pull requests to main/develop
- Pushes to main
- Manual workflow dispatch

Check the GitHub Actions tab for results.

## Best Practices

✅ **DO:**
- Review all baseline changes before committing
- Update baselines intentionally, not automatically
- Document why baselines changed in commit messages
- Run tests before committing UI changes

❌ **DON'T:**
- Auto-update baselines without review
- Commit test results or reports
- Ignore failing tests
- Update baselines to fix flaky tests without investigating

## Getting Help

1. Read full documentation: `/docs/visual_regression_guide.md`
2. Check Playwright docs: https://playwright.dev/docs/test-snapshots
3. Review test code comments in `visual-comprehensive.spec.ts`
4. Contact QA team or open an issue

## Quick Examples

### Example 1: Adding a new component

```bash
# 1. Add component to the page
# 2. Add test to visual-comprehensive.spec.ts
# 3. Generate baseline
pnpm exec playwright test visual-comprehensive --update-snapshots --grep "new component"
# 4. Verify baseline looks correct
pnpm test:visual:report
# 5. Commit changes including baseline
git add tests/e2e/visual-comprehensive.spec.ts
git add tests/e2e/snapshots/
git commit -m "feat: add new component with visual test"
```

### Example 2: Fixing a UI bug

```bash
# 1. Fix the bug in code
# 2. Run visual tests
pnpm test:visual
# 3. If tests fail, review differences
pnpm test:visual:report
# 4. If fix is correct, update baselines
pnpm test:visual:update
# 5. Commit fix and updated baselines
git add .
git commit -m "fix: correct button alignment"
```

### Example 3: Investigating flaky test

```bash
# 1. Run test multiple times in headed mode
for i in {1..5}; do
  pnpm exec playwright test visual-comprehensive --headed --grep "flaky test"
done

# 2. Run in debug mode to step through
pnpm test:visual:debug --grep "flaky test"

# 3. Check for animations, dynamic content, timing issues
# 4. Fix root cause in test or application code
# 5. Verify stability
```

---

**Last Updated:** November 14, 2025
**Version:** 1.0
