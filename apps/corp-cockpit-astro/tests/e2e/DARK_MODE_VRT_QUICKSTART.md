# Dark Mode VRT - Quick Start Guide

## 🎯 What is this?

Visual regression tests for dark mode - captures screenshots of UI in light/dark themes to prevent visual bugs.

## 📁 Test File

`/tests/e2e/18-dark-mode-visual.spec.ts`

## 🚀 Quick Commands

### Run Dark Mode VRT Tests
```bash
npx playwright test tests/e2e/18-dark-mode-visual.spec.ts
```

### Generate/Update Baselines
```bash
npx playwright test tests/e2e/18-dark-mode-visual.spec.ts --update-snapshots
```

### Run Specific Browser
```bash
# Chromium only (fastest)
npx playwright test tests/e2e/18-dark-mode-visual.spec.ts --project=chromium

# Firefox
npx playwright test tests/e2e/18-dark-mode-visual.spec.ts --project=firefox

# WebKit (Safari)
npx playwright test tests/e2e/18-dark-mode-visual.spec.ts --project=webkit
```

### Debug Mode
```bash
npx playwright test tests/e2e/18-dark-mode-visual.spec.ts --debug
```

### View Test Report (after failure)
```bash
npx playwright show-report
```

## 📊 Test Coverage

- **57 test scenarios** (Chromium baseline)
- **342 total tests** (across 6 browser configs)
- **5 major views**: Dashboard, Reports, Evidence, Settings, Boardroom
- **2 themes**: Light, Dark
- **3 viewports**: Desktop (1920×1080), Tablet (768×1024), Mobile (375×667)

## 📸 Snapshots Location

```
tests/e2e/18-dark-mode-visual.spec.ts-snapshots/
├── chromium-linux/
│   ├── dashboard-desktop-light.png
│   ├── dashboard-desktop-dark.png
│   └── ...
├── firefox-linux/
│   └── ...
└── webkit-linux/
    └── ...
```

## ⚙️ First Time Setup

1. **Install Playwright browsers** (if not done):
   ```bash
   npx playwright install --with-deps
   ```

2. **Start dev server** (required):
   ```bash
   pnpm dev
   ```

3. **Generate baselines** (from another terminal):
   ```bash
   npx playwright test tests/e2e/18-dark-mode-visual.spec.ts --update-snapshots
   ```

4. **Verify tests pass**:
   ```bash
   npx playwright test tests/e2e/18-dark-mode-visual.spec.ts
   ```

## 🔧 Common Issues

### ❌ Error: "net::ERR_CONNECTION_REFUSED"
**Fix**: Make sure dev server is running (`pnpm dev`)

### ❌ Tests timing out
**Fix**: Increase timeout in test file or wait longer for page load

### ❌ Snapshots don't match
**Cause**: Intentional UI change OR regression
**Action**:
1. Review diff in test report: `npx playwright show-report`
2. If intentional: Update baselines with `--update-snapshots`
3. If bug: Fix the CSS/component

## 📝 When to Update Baselines

Update baselines after:
- ✅ Intentional design changes
- ✅ Dark mode color adjustments
- ✅ New components added
- ✅ Typography or spacing changes

Never update to hide bugs!

## 🔗 Full Documentation

See `/reports/worker3/diffs/phase5_vrt.md` for comprehensive guide.

## 🎨 Test Categories

1. **Major Views** - Full page snapshots of main routes
2. **Boardroom Mode** - Full-screen dashboard
3. **Dashboard Widgets** - Individual widget components
4. **UI Components** - Header, sidebar, cards
5. **Theme Toggle** - Button states (light, dark, auto)
6. **Modals** - Report generation, export dialogs
7. **Charts** - Chart.js canvas elements
8. **Empty States** - No data scenarios
9. **Error States** - 404 pages

## 💡 Pro Tips

- Start with Chromium only for faster iteration
- Use `--headed` to see browser while testing
- Use `--debug` to step through tests
- Review HTML report for visual diffs
- Keep baselines in version control
- Run VRT before committing UI changes

## 🤝 Need Help?

- Check full docs: `/reports/worker3/diffs/phase5_vrt.md`
- Review Playwright docs: https://playwright.dev/docs/test-snapshots
- Check test implementation: `tests/e2e/18-dark-mode-visual.spec.ts`
