# Visual Regression Test Snapshots

This directory contains baseline screenshots for visual regression testing.

## Directory Structure

```
snapshots/
├── chromium/          # Chrome/Edge baseline screenshots
├── firefox/           # Firefox baseline screenshots
└── webkit/            # Safari baseline screenshots
```

## Baseline Information

- **Created:** November 14, 2025
- **Environment:** Playwright Test Runner
- **Node Version:** 20.x
- **OS:** Ubuntu Linux (CI environment)

## File Naming Convention

Snapshots follow the pattern:
```
{test-name}-{viewport}-{variant}.png
```

Examples:
- `dashboard-full-desktop.png`
- `sroi-panel-mobile.png`
- `login-form-tablet.png`

## Updating Baselines

### Update All Baselines
```bash
cd apps/corp-cockpit-astro
pnpm exec playwright test visual-comprehensive --update-snapshots
```

### Update Specific Browser
```bash
pnpm exec playwright test visual-comprehensive --update-snapshots --project=chromium
```

### Update Specific Test
```bash
pnpm exec playwright test visual-comprehensive --update-snapshots --grep "Dashboard Widgets"
```

## Best Practices

1. **Review Before Committing:** Always review snapshot diffs before committing
2. **Intentional Changes Only:** Only update baselines for intentional UI changes
3. **Document Changes:** Include reason for baseline updates in commit message
4. **Run All Browsers:** Ensure baselines are updated for all browser projects
5. **CI Consistency:** Use Docker to generate baselines matching CI environment

## Baseline Integrity

These baselines are checked into git because:
- Enables visual diff review in PRs
- Provides historical record of UI changes
- Ensures consistency across team members
- Relatively small file sizes (optimized PNGs)

## Troubleshooting

### Baselines Don't Match Locally

If tests fail locally but pass in CI:

1. Use Docker to match CI environment:
```bash
docker run -it --rm -v $(pwd):/work -w /work \
  mcr.microsoft.com/playwright:v1.40.0-jammy /bin/bash
```

2. Generate baselines inside container:
```bash
cd apps/corp-cockpit-astro
pnpm install
pnpm exec playwright test visual-comprehensive --update-snapshots
```

### Large Differences After Font Updates

Font changes can cause significant pixel differences:

1. Update all baselines:
```bash
pnpm exec playwright test visual-comprehensive --update-snapshots
```

2. Review changes carefully - ensure only font rendering changed
3. Document font update in commit message

### Missing Snapshots

If snapshot files are missing:

1. Run baseline generation:
```bash
pnpm exec playwright test visual-comprehensive --update-snapshots
```

2. Verify files were created in correct browser directory
3. Commit new baseline files

## Snapshot Statistics

| Browser  | Approx. Count | Avg. Size |
|----------|---------------|-----------|
| Chromium | ~100 files    | ~50 KB    |
| Firefox  | ~100 files    | ~50 KB    |
| WebKit   | ~100 files    | ~50 KB    |

**Total Size:** ~15 MB

## Questions?

See the main documentation: `/docs/visual_regression_guide.md`
