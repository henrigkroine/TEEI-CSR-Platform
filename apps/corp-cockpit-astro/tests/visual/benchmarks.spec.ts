import { test, expect } from '@playwright/test';

/**
 * Visual Regression Test Suite: Benchmarks
 *
 * Captures and compares screenshots of the benchmarks feature including:
 * - Cohort comparator chart
 * - Percentile chart
 * - Filters panel
 * - Export modal
 *
 * These tests establish visual baselines for benchmark visualizations.
 */

test.describe('Benchmarks Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Login as user with benchmark access
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should capture benchmarks overview page', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="benchmarks-container"]', {
      state: 'visible'
    });

    // Take full page screenshot
    await expect(page).toHaveScreenshot('benchmarks-overview-full.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05
    });

    // Capture header section
    await expect(page.locator('[data-testid="benchmarks-header"]'))
      .toHaveScreenshot('benchmarks-header.png');
  });

  test('should capture cohort comparator chart', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="cohort-comparator"]', {
      state: 'visible'
    });

    // Wait for chart to render completely
    await page.waitForTimeout(1000);

    // Capture cohort comparator
    await expect(page.locator('[data-testid="cohort-comparator"]'))
      .toHaveScreenshot('cohort-comparator-default.png', {
        animations: 'disabled'
      });

    // Capture chart legend
    await expect(page.locator('[data-testid="cohort-legend"]'))
      .toHaveScreenshot('cohort-comparator-legend.png');

    // Capture chart with tooltip (hover over data point)
    const chartArea = page.locator('[data-testid="cohort-chart-area"]');
    await chartArea.hover({ position: { x: 100, y: 100 } });
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="cohort-comparator"]'))
      .toHaveScreenshot('cohort-comparator-with-tooltip.png');
  });

  test('should capture cohort comparator with different metrics', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');
    await page.waitForSelector('[data-testid="cohort-comparator"]', {
      state: 'visible'
    });

    // Capture default metric (SROI)
    await expect(page.locator('[data-testid="cohort-comparator"]'))
      .toHaveScreenshot('cohort-comparator-sroi.png');

    // Switch to VIS metric
    await page.selectOption('[data-testid="metric-selector"]', 'VIS');
    await page.waitForTimeout(800); // Wait for chart animation

    await expect(page.locator('[data-testid="cohort-comparator"]'))
      .toHaveScreenshot('cohort-comparator-vis.png', {
        animations: 'disabled'
      });

    // Switch to Participation Rate
    await page.selectOption('[data-testid="metric-selector"]', 'participation_rate');
    await page.waitForTimeout(800);

    await expect(page.locator('[data-testid="cohort-comparator"]'))
      .toHaveScreenshot('cohort-comparator-participation.png', {
        animations: 'disabled'
      });
  });

  test('should capture percentile chart', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');
    await page.waitForSelector('[data-testid="percentile-chart"]', {
      state: 'visible'
    });

    // Wait for chart to render
    await page.waitForTimeout(1000);

    // Capture percentile chart
    await expect(page.locator('[data-testid="percentile-chart"]'))
      .toHaveScreenshot('percentile-chart-default.png', {
        animations: 'disabled'
      });

    // Capture with marker highlight
    const marker = page.locator('[data-testid="your-position-marker"]');
    await marker.hover();
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="percentile-chart"]'))
      .toHaveScreenshot('percentile-chart-with-marker.png');

    // Capture percentile breakdown
    await expect(page.locator('[data-testid="percentile-breakdown"]'))
      .toHaveScreenshot('percentile-breakdown.png');
  });

  test('should capture percentile chart for different metrics', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');
    await page.waitForSelector('[data-testid="percentile-chart"]', {
      state: 'visible'
    });

    // Capture SROI percentile
    await expect(page.locator('[data-testid="percentile-chart"]'))
      .toHaveScreenshot('percentile-chart-sroi.png', {
        animations: 'disabled'
      });

    // Switch metric
    await page.selectOption('[data-testid="percentile-metric-selector"]', 'VIS');
    await page.waitForTimeout(800);

    await expect(page.locator('[data-testid="percentile-chart"]'))
      .toHaveScreenshot('percentile-chart-vis.png', {
        animations: 'disabled'
      });
  });

  test('should capture filters panel - collapsed state', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');
    await page.waitForSelector('[data-testid="filters-panel"]', {
      state: 'visible'
    });

    // Ensure filters are collapsed
    const filtersExpanded = await page.locator('[data-testid="filters-panel"]')
      .evaluate(el => el.classList.contains('expanded'));

    if (filtersExpanded) {
      await page.click('[data-testid="toggle-filters"]');
      await page.waitForTimeout(300);
    }

    // Capture collapsed filters
    await expect(page.locator('[data-testid="filters-panel"]'))
      .toHaveScreenshot('filters-panel-collapsed.png');
  });

  test('should capture filters panel - expanded state', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');
    await page.waitForSelector('[data-testid="filters-panel"]', {
      state: 'visible'
    });

    // Expand filters
    await page.click('[data-testid="toggle-filters"]');
    await page.waitForTimeout(300);

    // Capture expanded filters
    await expect(page.locator('[data-testid="filters-panel"]'))
      .toHaveScreenshot('filters-panel-expanded.png');

    // Capture individual filter sections
    await expect(page.locator('[data-testid="filter-industry"]'))
      .toHaveScreenshot('filter-industry.png');

    await expect(page.locator('[data-testid="filter-company-size"]'))
      .toHaveScreenshot('filter-company-size.png');

    await expect(page.locator('[data-testid="filter-region"]'))
      .toHaveScreenshot('filter-region.png');
  });

  test('should capture filters with selections', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');
    await page.click('[data-testid="toggle-filters"]');
    await page.waitForTimeout(300);

    // Select industry filter
    await page.check('[data-testid="industry-technology"]');
    await page.waitForTimeout(200);

    // Select company size
    await page.check('[data-testid="size-1000-5000"]');
    await page.waitForTimeout(200);

    // Capture filters with selections
    await expect(page.locator('[data-testid="filters-panel"]'))
      .toHaveScreenshot('filters-panel-with-selections.png');

    // Capture active filters chips
    await expect(page.locator('[data-testid="active-filters"]'))
      .toHaveScreenshot('active-filters-chips.png');
  });

  test('should capture benchmark comparison table', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');

    // Scroll to comparison table
    await page.locator('[data-testid="comparison-table"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Capture comparison table
    await expect(page.locator('[data-testid="comparison-table"]'))
      .toHaveScreenshot('comparison-table.png');

    // Capture with sorted column
    await page.click('[data-testid="sort-by-sroi"]');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="comparison-table"]'))
      .toHaveScreenshot('comparison-table-sorted.png');
  });

  test('should capture export modal', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');

    // Open export modal
    await page.click('[data-testid="export-benchmarks"]');
    await page.waitForSelector('[data-testid="benchmark-export-modal"]', {
      state: 'visible'
    });

    // Capture export modal
    await expect(page.locator('[data-testid="benchmark-export-modal"]'))
      .toHaveScreenshot('benchmark-export-modal-initial.png');

    // Select format
    await page.click('[data-testid="export-format-pdf"]');
    await page.waitForTimeout(200);

    await expect(page.locator('[data-testid="benchmark-export-modal"]'))
      .toHaveScreenshot('benchmark-export-modal-pdf-selected.png');

    // Expand options
    await page.click('[data-testid="export-advanced-options"]');
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="benchmark-export-modal"]'))
      .toHaveScreenshot('benchmark-export-modal-advanced.png');
  });

  test('should capture peer group selector', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');

    // Click peer group selector
    await page.click('[data-testid="peer-group-selector"]');
    await page.waitForSelector('[data-testid="peer-group-dropdown"]', {
      state: 'visible'
    });

    // Capture dropdown
    await expect(page.locator('[data-testid="peer-group-dropdown"]'))
      .toHaveScreenshot('peer-group-dropdown.png');

    // Hover over a peer group
    await page.locator('[data-testid="peer-group-option"]').first().hover();
    await page.waitForTimeout(200);

    await expect(page.locator('[data-testid="peer-group-dropdown"]'))
      .toHaveScreenshot('peer-group-dropdown-hover.png');
  });

  test('should capture time period selector', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');

    // Capture default time period
    await expect(page.locator('[data-testid="time-period-selector"]'))
      .toHaveScreenshot('time-period-selector-default.png');

    // Open time period dropdown
    await page.click('[data-testid="time-period-selector"]');
    await page.waitForTimeout(200);

    await expect(page.locator('[data-testid="time-period-dropdown"]'))
      .toHaveScreenshot('time-period-dropdown.png');

    // Select custom range
    await page.click('[data-testid="time-period-custom"]');
    await page.waitForSelector('[data-testid="date-range-picker"]', {
      state: 'visible'
    });

    await expect(page.locator('[data-testid="date-range-picker"]'))
      .toHaveScreenshot('date-range-picker.png');
  });

  test('should capture benchmark insights panel', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');

    // Scroll to insights
    await page.locator('[data-testid="benchmark-insights"]').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // Capture insights panel
    await expect(page.locator('[data-testid="benchmark-insights"]'))
      .toHaveScreenshot('benchmark-insights.png');

    // Capture individual insight cards
    await expect(page.locator('[data-testid="insight-card"]').first())
      .toHaveScreenshot('benchmark-insight-card.png');
  });

  test('should capture responsive layouts', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');
    await page.waitForLoadState('networkidle');

    // Desktop (1920x1080) - default
    await expect(page).toHaveScreenshot('benchmarks-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('benchmarks-tablet.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Mobile (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('benchmarks-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should capture empty state', async ({ page }) => {
    // Navigate to benchmarks with no data
    await page.goto('/benchmarks?no-data=true');

    // Wait for empty state
    await page.waitForSelector('[data-testid="benchmarks-empty-state"]', {
      state: 'visible'
    });

    // Capture empty state
    await expect(page.locator('[data-testid="benchmarks-empty-state"]'))
      .toHaveScreenshot('benchmarks-empty-state.png');
  });

  test('should capture loading state', async ({ page }) => {
    // Intercept API to delay response
    await page.route('**/api/benchmarks/data', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    // Navigate to benchmarks
    await page.goto('/benchmarks');

    // Capture loading state quickly
    await page.waitForSelector('[data-testid="benchmarks-loading"]', {
      state: 'visible',
      timeout: 5000
    });

    await expect(page.locator('[data-testid="benchmarks-container"]'))
      .toHaveScreenshot('benchmarks-loading.png');

    // Capture loading skeletons
    await expect(page.locator('[data-testid="chart-skeleton"]').first())
      .toHaveScreenshot('benchmark-chart-skeleton.png');
  });

  test('should capture dark mode', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');
    await page.waitForLoadState('networkidle');

    // Enable dark mode
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForTimeout(300);

    // Capture dark mode benchmarks
    await expect(page).toHaveScreenshot('benchmarks-dark-mode.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Capture dark mode charts
    await expect(page.locator('[data-testid="cohort-comparator"]'))
      .toHaveScreenshot('cohort-comparator-dark.png', {
        animations: 'disabled'
      });

    await expect(page.locator('[data-testid="percentile-chart"]'))
      .toHaveScreenshot('percentile-chart-dark.png', {
        animations: 'disabled'
      });
  });

  test('should capture chart zoom interaction', async ({ page }) => {
    // Navigate to benchmarks
    await page.goto('/benchmarks');
    await page.waitForSelector('[data-testid="cohort-comparator"]', {
      state: 'visible'
    });

    // Enable zoom mode
    await page.click('[data-testid="enable-chart-zoom"]');
    await page.waitForTimeout(200);

    // Capture zoom UI
    await expect(page.locator('[data-testid="cohort-comparator"]'))
      .toHaveScreenshot('cohort-comparator-zoom-enabled.png');

    // Perform zoom (drag)
    const chartArea = page.locator('[data-testid="cohort-chart-area"]');
    await chartArea.hover({ position: { x: 100, y: 100 } });
    await page.mouse.down();
    await page.mouse.move(200, 100);
    await page.mouse.up();
    await page.waitForTimeout(500);

    // Capture zoomed chart
    await expect(page.locator('[data-testid="cohort-comparator"]'))
      .toHaveScreenshot('cohort-comparator-zoomed.png', {
        animations: 'disabled'
      });
  });
});
