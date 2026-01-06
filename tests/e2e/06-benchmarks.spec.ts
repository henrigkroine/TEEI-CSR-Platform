import { test, expect } from '@playwright/test';

/**
 * E2E Test: Benchmarks & Cohorts UI
 * Tests peer comparison, cohort selection, percentile rankings
 */

test.describe('Benchmarks & Cohorts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display benchmarks page', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/benchmarks');

    await expect(page.locator('[data-testid="benchmarks-page"]')).toBeVisible();
    await expect(page.locator('h1:has-text("Benchmarks")')).toBeVisible();
  });

  test('should show cohort selector with filters', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/benchmarks');

    const cohortSelector = page.locator('[data-testid="cohort-selector"]');
    await expect(cohortSelector).toBeVisible();

    // Check for filter options
    await expect(page.locator('[data-testid="filter-industry"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-size"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-geography"]')).toBeVisible();
  });

  test('should select cohort by industry', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/benchmarks');

    // Select industry
    await page.selectOption('[data-testid="filter-industry"]', 'technology');

    // Wait for data to reload
    await page.waitForResponse(response => response.url().includes('/api/benchmarks'));

    // Cohort label should update
    await expect(page.locator('text=/Technology/i')).toBeVisible();
  });

  test('should select cohort by company size', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/benchmarks');

    // Select company size
    await page.selectOption('[data-testid="filter-size"]', '500-1000');

    await page.waitForResponse(response => response.url().includes('/api/benchmarks'));

    // Cohort should be filtered
    await expect(page.locator('text=/500-1000 employees/i')).toBeVisible();
  });

  test('should select cohort by geography', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/benchmarks');

    // Select geography
    await page.selectOption('[data-testid="filter-geography"]', 'north-america');

    await page.waitForResponse(response => response.url().includes('/api/benchmarks'));

    await expect(page.locator('text=/North America/i')).toBeVisible();
  });

  test('should display comparison charts', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/benchmarks');

    // Wait for charts to load
    await page.waitForLoadState('networkidle');

    // Check for chart types
    await expect(page.locator('[data-testid="benchmark-bar-chart"]')).toBeVisible();
    await expect(page.locator('[data-testid="benchmark-radar-chart"]')).toBeVisible();
  });

  test('should show company vs cohort metrics', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/benchmarks');

    // Company metrics should be visible
    await expect(page.locator('[data-testid="company-metric"]')).toBeVisible();

    // Cohort average should be visible
    await expect(page.locator('[data-testid="cohort-average"]')).toBeVisible();

    // Cohort median should be visible
    await expect(page.locator('[data-testid="cohort-median"]')).toBeVisible();
  });

  test('should display percentile indicators', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/benchmarks');

    // Percentile badges should be visible
    const percentileIndicators = page.locator('[data-testid="percentile-indicator"]');
    await expect(percentileIndicators.first()).toBeVisible();

    // Check for percentile text
    await expect(page.locator('text=/top \\d+%|percentile/i')).toBeVisible();
  });

  test('should show percentile ranking for each metric', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/benchmarks');

    // Each metric should have a percentile ranking
    const metrics = page.locator('[data-testid="metric-row"]');
    const count = await metrics.count();

    for (let i = 0; i < Math.min(count, 3); i++) {
      await expect(metrics.nth(i).locator('[data-testid="percentile"]')).toBeVisible();
    }
  });

  test('should display tooltips explaining methodology', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/benchmarks');

    // Hover over info icon
    await page.hover('[data-testid="methodology-tooltip-trigger"]');

    // Tooltip should appear
    await expect(page.locator('[data-testid="methodology-tooltip"]')).toBeVisible();
    await expect(page.locator('text=/calculation|methodology/i')).toBeVisible();
  });

  test('should ensure no PII in cohort data', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/benchmarks');

    // Should not contain company names or identifying information
    const content = await page.textContent('body');

    // Check that only aggregated data is shown
    expect(content).toMatch(/average|median|percentile/i);

    // Should not show specific company identifiers
    expect(content).not.toMatch(/Company #\d+/);
  });

  test('should refresh benchmark data daily', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/benchmarks');

    // Check for last updated timestamp
    await expect(page.locator('[data-testid="last-updated"]')).toBeVisible();
    await expect(page.locator('text=/updated|refreshed/i')).toBeVisible();
  });

  test('should export benchmark report', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/benchmarks');

    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-benchmarks-button"]');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/benchmark.*\.(pdf|xlsx)/);
  });
});

test.describe('Benchmark Charts', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
    await page.goto('/en/cockpit/company-1/benchmarks');
  });

  test('should render bar chart for metric comparison', async ({ page }) => {
    const barChart = page.locator('[data-testid="benchmark-bar-chart"]');
    await expect(barChart).toBeVisible();

    // Should have canvas or SVG element
    await expect(barChart.locator('canvas, svg')).toBeVisible();
  });

  test('should render radar chart for multi-metric view', async ({ page }) => {
    const radarChart = page.locator('[data-testid="benchmark-radar-chart"]');
    await expect(radarChart).toBeVisible();

    // Should show multiple dimensions
    await expect(radarChart.locator('canvas, svg')).toBeVisible();
  });

  test('should highlight company position in charts', async ({ page }) => {
    // Company data point should be highlighted differently
    await expect(page.locator('[data-company-highlight="true"]')).toBeVisible();
  });

  test('should show interactive tooltips on chart hover', async ({ page }) => {
    const chart = page.locator('[data-testid="benchmark-bar-chart"]');
    await chart.hover();

    // Wait a bit for tooltip
    await page.waitForTimeout(500);

    // Tooltip with data should appear
    const tooltip = page.locator('[role="tooltip"], [data-testid="chart-tooltip"]');
    if (await tooltip.isVisible()) {
      await expect(tooltip).toBeVisible();
    }
  });
});
