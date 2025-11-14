/**
 * Visual Regression Tests for CSR Dashboard
 *
 * Test Coverage:
 * - Dashboard widget rendering
 * - Chart visualizations
 * - Data lineage visualization
 * - Responsive layouts
 * - Dark mode / theme variations
 *
 * Uses Playwright's screenshot comparison functionality
 */

import { test, expect, Page } from '@playwright/test';
import { E2ETestDataFactory } from '../fixtures/e2e-data-factory';
import { waitForPageReady, waitForStableElement } from '../utils/e2e-helpers';

const CSR_PLATFORM_URL = process.env.CSR_PLATFORM_URL || 'http://localhost:4321';

test.describe('Visual Regression: CSR Dashboard', () => {
  let dataFactory: E2ETestDataFactory;
  let testUser: any;

  test.beforeAll(async () => {
    dataFactory = new E2ETestDataFactory();

    // Create test user with known data
    testUser = await dataFactory.createTestUser({
      email: 'visual-test@teei-e2e.com',
      firstName: 'Visual',
      lastName: 'Tester'
    });

    // Create predictable data set for consistent visuals
    await dataFactory.createCompleteUserJourney(testUser.id);

    // Wait for all events to process
    await new Promise(resolve => setTimeout(resolve, 5000));
  });

  test.afterAll(async () => {
    await dataFactory.cleanup();
  });

  test.describe('Desktop Layout (1920x1080)', () => {
    test.use({ viewport: { width: 1920, height: 1080 } });

    test('should render dashboard overview correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      // Wait for all widgets to load
      await page.waitForSelector('[data-widget="buddy-matches"]');
      await page.waitForSelector('[data-widget="events-attended"]');
      await page.waitForSelector('[data-widget="skill-sharing"]');

      // Wait for animations to complete
      await waitForStableElement(page, '[data-widget="buddy-matches"]');

      // Take screenshot and compare
      await expect(page).toHaveScreenshot('dashboard-overview-desktop.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should render buddy matches widget correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      const widget = page.locator('[data-widget="buddy-matches"]');
      await widget.waitFor();
      await waitForStableElement(page, '[data-widget="buddy-matches"]');

      await expect(widget).toHaveScreenshot('widget-buddy-matches-desktop.png', {
        animations: 'disabled'
      });
    });

    test('should render event attendance chart correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      const widget = page.locator('[data-widget="events-attended"]');
      await widget.waitFor();

      // Wait for chart to render
      await page.waitForSelector('[data-widget="events-attended"] canvas, [data-widget="events-attended"] svg');
      await waitForStableElement(page, '[data-widget="events-attended"]');

      await expect(widget).toHaveScreenshot('widget-events-chart-desktop.png', {
        animations: 'disabled'
      });
    });

    test('should render SROI calculator correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      const widget = page.locator('[data-widget="sroi-calculator"]');
      await widget.waitFor();
      await waitForStableElement(page, '[data-widget="sroi-calculator"]');

      await expect(widget).toHaveScreenshot('widget-sroi-calculator-desktop.png', {
        animations: 'disabled'
      });
    });

    test('should render data lineage visualization correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/data-lineage?userId=${testUser.id}`);
      await waitForPageReady(page);

      // Wait for lineage graph to render
      const lineageGraph = page.locator('[data-viz="lineage-graph"]');
      await lineageGraph.waitFor();
      await page.waitForTimeout(2000); // Allow graph layout to stabilize

      await expect(page).toHaveScreenshot('data-lineage-desktop.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should render expanded widget detail panel correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      // Click to expand widget
      await page.click('[data-widget="buddy-matches"]');

      // Wait for detail panel
      const detailPanel = page.locator('[data-panel="buddy-details"]');
      await detailPanel.waitFor();
      await waitForStableElement(page, '[data-panel="buddy-details"]');

      await expect(detailPanel).toHaveScreenshot('detail-panel-buddy-matches-desktop.png', {
        animations: 'disabled'
      });
    });
  });

  test.describe('Tablet Layout (768x1024)', () => {
    test.use({ viewport: { width: 768, height: 1024 } });

    test('should render dashboard responsive layout correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      await page.waitForSelector('[data-widget="buddy-matches"]');
      await waitForStableElement(page, '[data-widget="buddy-matches"]');

      await expect(page).toHaveScreenshot('dashboard-overview-tablet.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should render widgets in stacked layout', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      // Verify stacked layout
      const widgets = page.locator('[data-widget]');
      await widgets.first().waitFor();

      await expect(page).toHaveScreenshot('dashboard-widgets-stacked-tablet.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Mobile Layout (375x667)', () => {
    test.use({ viewport: { width: 375, height: 667 } });

    test('should render mobile dashboard correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      await page.waitForSelector('[data-widget="buddy-matches"]');
      await waitForStableElement(page, '[data-widget="buddy-matches"]');

      await expect(page).toHaveScreenshot('dashboard-overview-mobile.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should render hamburger menu correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      // Open mobile menu
      await page.click('[data-testid="mobile-menu-button"]');
      const menu = page.locator('[data-testid="mobile-menu"]');
      await menu.waitFor();

      await expect(menu).toHaveScreenshot('mobile-menu.png', {
        animations: 'disabled'
      });
    });
  });

  test.describe('Dark Mode', () => {
    test.use({
      viewport: { width: 1920, height: 1080 },
      colorScheme: 'dark'
    });

    test('should render dashboard in dark mode correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      // Toggle dark mode if not automatic
      const darkModeToggle = page.locator('[data-testid="theme-toggle"]');
      if (await darkModeToggle.isVisible()) {
        await darkModeToggle.click();
        await page.waitForTimeout(500); // Wait for transition
      }

      await page.waitForSelector('[data-widget="buddy-matches"]');
      await waitForStableElement(page, '[data-widget="buddy-matches"]');

      await expect(page).toHaveScreenshot('dashboard-overview-dark.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should render charts in dark mode correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      const widget = page.locator('[data-widget="events-attended"]');
      await widget.waitFor();
      await waitForStableElement(page, '[data-widget="events-attended"]');

      await expect(widget).toHaveScreenshot('widget-events-chart-dark.png', {
        animations: 'disabled'
      });
    });
  });

  test.describe('Loading and Error States', () => {
    test('should render loading skeleton correctly', async ({ page }) => {
      // Intercept API calls to delay response
      await page.route('**/api/v1/analytics/**', async route => {
        await new Promise(resolve => setTimeout(resolve, 5000));
        await route.continue();
      });

      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);

      // Capture loading state before data loads
      const loadingSkeleton = page.locator('[data-testid="loading-skeleton"]');
      await loadingSkeleton.first().waitFor({ timeout: 1000 }).catch(() => {});

      await expect(page).toHaveScreenshot('dashboard-loading-state.png', {
        animations: 'disabled'
      });
    });

    test('should render error state correctly', async ({ page }) => {
      // Intercept API calls to return error
      await page.route('**/api/v1/analytics/**', async route => {
        await route.fulfill({
          status: 500,
          body: JSON.stringify({ error: 'Internal Server Error' })
        });
      });

      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      // Wait for error state to display
      const errorMessage = page.locator('[data-testid="error-message"]');
      await errorMessage.waitFor({ timeout: 5000 }).catch(() => {});

      await expect(page).toHaveScreenshot('dashboard-error-state.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });
  });

  test.describe('Accessibility Visual Checks', () => {
    test('should render high contrast mode correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      // Enable high contrast mode
      await page.evaluate(() => {
        document.documentElement.classList.add('high-contrast');
      });

      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dashboard-high-contrast.png', {
        fullPage: true,
        animations: 'disabled'
      });
    });

    test('should render focus indicators correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      // Tab through focusable elements
      for (let i = 0; i < 5; i++) {
        await page.keyboard.press('Tab');
      }

      await page.waitForTimeout(200);

      await expect(page).toHaveScreenshot('dashboard-focus-indicators.png', {
        animations: 'disabled'
      });
    });
  });

  test.describe('Chart Variations', () => {
    test('should render bar chart with data correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      // Switch to bar chart view
      const chartTypeSelector = page.locator('[data-widget="events-attended"] [data-testid="chart-type-select"]');
      if (await chartTypeSelector.isVisible()) {
        await chartTypeSelector.click();
        await page.click('text=Bar Chart');
        await page.waitForTimeout(1000); // Wait for chart transition
      }

      const widget = page.locator('[data-widget="events-attended"]');
      await waitForStableElement(page, '[data-widget="events-attended"]');

      await expect(widget).toHaveScreenshot('widget-bar-chart.png', {
        animations: 'disabled'
      });
    });

    test('should render pie chart with data correctly', async ({ page }) => {
      await page.goto(`${CSR_PLATFORM_URL}/dashboard`);
      await waitForPageReady(page);

      const chartTypeSelector = page.locator('[data-widget="events-attended"] [data-testid="chart-type-select"]');
      if (await chartTypeSelector.isVisible()) {
        await chartTypeSelector.click();
        await page.click('text=Pie Chart');
        await page.waitForTimeout(1000);
      }

      const widget = page.locator('[data-widget="events-attended"]');
      await waitForStableElement(page, '[data-widget="events-attended"]');

      await expect(widget).toHaveScreenshot('widget-pie-chart.png', {
        animations: 'disabled'
      });
    });
  });
});
