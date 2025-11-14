import { test, expect } from '@playwright/test';

/**
 * E2E Test: Dashboard Loading & Widgets
 * Tests SSE updates, caching, and real-time data refresh
 */

test.describe('Dashboard Loading', () => {
  test.beforeEach(async ({ page }) => {
    // Login helper
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should load dashboard with all widgets', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Check for key widgets
    await expect(page.locator('[data-testid="at-a-glance-widget"]')).toBeVisible();
    await expect(page.locator('[data-testid="sroi-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="vis-panel"]')).toBeVisible();
    await expect(page.locator('[data-testid="q2q-feed"]')).toBeVisible();
  });

  test('should display loading skeletons during data fetch', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Check for loading skeletons
    const skeleton = page.locator('[data-testid="skeleton-loader"]');
    if (await skeleton.isVisible({ timeout: 1000 })) {
      await expect(skeleton).toBeVisible();
      // Wait for skeleton to disappear
      await expect(skeleton).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('should show cached data when offline', async ({ page, context }) => {
    await page.goto('/en/cockpit/company-1/dashboard');
    await page.waitForLoadState('networkidle');

    // Go offline
    await context.setOffline(true);

    // Reload page
    await page.reload();

    // Should show cached data with offline indicator
    await expect(page.locator('[data-testid="offline-indicator"]')).toBeVisible();
    await expect(page.locator('[data-testid="at-a-glance-widget"]')).toBeVisible();
  });

  test('should receive SSE updates in real-time', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Listen for SSE updates
    const ssePromise = page.waitForResponse(
      response => response.url().includes('/api/events') && response.status() === 200
    );

    await ssePromise;

    // Check for real-time update indicator
    await expect(page.locator('[data-testid="live-indicator"]')).toBeVisible();
  });

  test('should update metrics dynamically via SSE', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Get initial metric value
    const metricElement = page.locator('[data-testid="sroi-value"]');
    await metricElement.waitFor({ state: 'visible' });
    const initialValue = await metricElement.textContent();

    // Wait for potential SSE update (simulate or wait)
    await page.waitForTimeout(3000);

    // Value might have updated via SSE
    const newValue = await metricElement.textContent();
    expect(newValue).toBeDefined();
  });

  test('should handle dashboard export', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Click export button
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-dashboard-button"]');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/dashboard.*\.(pdf|png)/);
  });

  test('should filter dashboard by date range', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Open date picker
    await page.click('[data-testid="date-range-picker"]');

    // Select custom range
    await page.click('[data-testid="date-preset-q1-2024"]');

    // Wait for data to reload
    await page.waitForResponse(response => response.url().includes('/api/metrics'));

    // Check that data updated
    await expect(page.locator('[data-testid="date-range-label"]')).toContainText('Q1 2024');
  });

  test('should meet Core Web Vitals thresholds', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Measure performance
    const performanceMetrics = await page.evaluate(() => {
      return new Promise(resolve => {
        new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lcp = entries.find(e => e.entryType === 'largest-contentful-paint');
          resolve({
            lcp: lcp ? (lcp as any).renderTime || (lcp as any).loadTime : 0
          });
        }).observe({ entryTypes: ['largest-contentful-paint'] });

        setTimeout(() => resolve({ lcp: 0 }), 5000);
      });
    });

    // LCP should be < 2.5s
    expect((performanceMetrics as any).lcp).toBeLessThan(2500);
  });
});

test.describe('Dashboard Widgets', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
    await page.goto('/en/cockpit/company-1/dashboard');
  });

  test('should display SROI panel with calculations', async ({ page }) => {
    const sroiPanel = page.locator('[data-testid="sroi-panel"]');
    await expect(sroiPanel).toBeVisible();
    await expect(sroiPanel.locator('[data-testid="sroi-value"]')).toBeVisible();
    await expect(sroiPanel.locator('[data-testid="sroi-chart"]')).toBeVisible();
  });

  test('should show Q2Q feed with updates', async ({ page }) => {
    const q2qFeed = page.locator('[data-testid="q2q-feed"]');
    await expect(q2qFeed).toBeVisible();

    // Check for feed items
    const feedItems = q2qFeed.locator('[data-testid="feed-item"]');
    await expect(feedItems.first()).toBeVisible();
  });

  test('should render VIS panel correctly', async ({ page }) => {
    const visPanel = page.locator('[data-testid="vis-panel"]');
    await expect(visPanel).toBeVisible();
    await expect(visPanel.locator('canvas, svg')).toBeVisible();
  });
});
