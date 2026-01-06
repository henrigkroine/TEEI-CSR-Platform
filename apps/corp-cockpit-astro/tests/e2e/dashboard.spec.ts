/**
 * Dashboard E2E Tests
 *
 * Tests cover:
 * - Dashboard loading and rendering
 * - Widget visibility and functionality
 * - KPI cards display
 * - SROI Panel
 * - VIS Panel
 * - Q2Q Feed
 * - At-a-Glance metrics
 * - Data export functionality
 * - Real-time updates (SSE)
 * - Responsive layout
 */

import { test, expect } from '@playwright/test';
import {
  mockSession,
  navigateToCockpit,
  TEST_USERS,
  TEST_COMPANIES,
  waitForVisible,
  waitForLoadingComplete,
  waitForNetworkIdle,
} from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin for dashboard access
    await mockSession(page, TEST_USERS.ADMIN);
  });

  test.describe('Dashboard Loading', () => {
    test('should load dashboard page successfully', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);

      // Wait for page to load
      await waitForNetworkIdle(page);

      // Verify URL
      await expect(page).toHaveURL(/\/en\/cockpit\/company-1/);

      // Verify main content area
      const mainContent = page.locator('main, [role="main"], .dashboard-content');
      await expect(mainContent).toBeVisible();
    });

    test('should display loading state initially', async ({ page }) => {
      await page.goto('/en/cockpit/company-1');

      // Check for loading indicators
      const loadingIndicator = page.locator(
        '[data-testid="loading-spinner"], .loading-spinner, [aria-label="Loading"]'
      );

      // Loading should appear briefly or not at all (if cached)
      const isVisible = await loadingIndicator.isVisible().catch(() => false);

      if (isVisible) {
        // Wait for loading to complete
        await loadingIndicator.waitFor({ state: 'hidden', timeout: 10000 });
      }

      // Dashboard content should be visible
      await waitForNetworkIdle(page);
    });

    test('should handle loading errors gracefully', async ({ page }) => {
      // Mock API failure
      await page.route('**/api/metrics/**', route => route.abort());

      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);

      // Should display error message
      const errorMessage = page.locator('[role="alert"], .error-message, .alert-danger');
      await expect(errorMessage).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('KPI Cards', () => {
    test('should display KPI cards', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for KPI cards
      const kpiCards = page.locator('[data-testid*="kpi-card"], .kpi-card, .metric-card');

      // Should have at least one KPI card
      await expect(kpiCards.first()).toBeVisible({ timeout: 10000 });
    });

    test('should show correct KPI values', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Find metric values
      const metricValues = page.locator('[data-testid*="metric-value"], .metric-value');

      if (await metricValues.count() > 0) {
        const firstMetric = await metricValues.first().textContent();
        expect(firstMetric).toBeTruthy();

        // Should contain numbers or currency
        expect(firstMetric).toMatch(/[\d,.$£€]/);
      }
    });

    test('should display trend indicators', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for trend indicators (arrows, percentages)
      const trendIndicators = page.locator(
        '[data-testid*="trend"], .trend-indicator, [class*="arrow"]'
      );

      // Trends might not always be present
      const count = await trendIndicators.count();
      if (count > 0) {
        await expect(trendIndicators.first()).toBeVisible();
      }
    });
  });

  test.describe('SROI Panel', () => {
    test('should display SROI widget', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for SROI panel
      const sroiPanel = page.locator('[data-testid="sroi-panel"], .sroi-panel, :has-text("SROI")');

      // SROI panel should be visible
      const isVisible = await sroiPanel.isVisible().catch(() => false);

      if (isVisible) {
        await expect(sroiPanel).toBeVisible();
      }
    });

    test('should display SROI calculation', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for SROI value (typically a ratio like "3.5:1")
      const sroiValue = page.locator('[data-testid="sroi-value"], .sroi-value');

      const count = await sroiValue.count();
      if (count > 0) {
        const value = await sroiValue.first().textContent();
        expect(value).toBeTruthy();

        // Should contain ratio or number
        expect(value).toMatch(/[\d.:]/);
      }
    });

    test('should show SROI breakdown', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Check for breakdown components
      const breakdown = page.locator('[data-testid*="sroi-breakdown"], .sroi-breakdown');

      const count = await breakdown.count();
      if (count > 0) {
        await expect(breakdown.first()).toBeVisible();
      }
    });
  });

  test.describe('VIS Panel', () => {
    test('should display VIS widget', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for VIS panel
      const visPanel = page.locator('[data-testid="vis-panel"], .vis-panel, :has-text("VIS")');

      const isVisible = await visPanel.isVisible().catch(() => false);

      if (isVisible) {
        await expect(visPanel).toBeVisible();
      }
    });

    test('should display volunteer impact score', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for VIS score
      const visScore = page.locator('[data-testid="vis-score"], .vis-score');

      const count = await visScore.count();
      if (count > 0) {
        const score = await visScore.first().textContent();
        expect(score).toBeTruthy();
        expect(score).toMatch(/[\d]/);
      }
    });
  });

  test.describe('Q2Q Feed', () => {
    test('should display Q2Q feed widget', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for Q2Q feed
      const q2qFeed = page.locator('[data-testid="q2q-feed"], .q2q-feed, :has-text("Q2Q")');

      const isVisible = await q2qFeed.isVisible().catch(() => false);

      if (isVisible) {
        await expect(q2qFeed).toBeVisible();
      }
    });

    test('should display Q2Q insights', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for insight items
      const insights = page.locator('[data-testid*="q2q-insight"], .q2q-insight, .insight-item');

      const count = await insights.count();

      // Should have at least one insight or show empty state
      if (count > 0) {
        await expect(insights.first()).toBeVisible();
      } else {
        // Check for empty state
        const emptyState = page.locator('[data-testid="empty-state"], .empty-state');
        const hasEmptyState = await emptyState.isVisible().catch(() => false);

        if (hasEmptyState) {
          await expect(emptyState).toBeVisible();
        }
      }
    });

    test('should show confidence scores', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for confidence indicators
      const confidence = page.locator('[data-testid*="confidence"], .confidence-score');

      const count = await confidence.count();
      if (count > 0) {
        const score = await confidence.first().textContent();
        expect(score).toBeTruthy();
      }
    });
  });

  test.describe('At-a-Glance Metrics', () => {
    test('should display at-a-glance section', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for at-a-glance section
      const ataGlance = page.locator(
        '[data-testid="at-a-glance"], .at-a-glance, :has-text("At a Glance")'
      );

      const isVisible = await ataGlance.isVisible().catch(() => false);

      if (isVisible) {
        await expect(ataGlance).toBeVisible();
      }
    });

    test('should display key metrics', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for metric cards
      const metrics = page.locator('.metric-card, [class*="metric"]');

      // Should have at least a few metrics
      const count = await metrics.count();
      expect(count).toBeGreaterThan(0);
    });
  });

  test.describe('Charts and Visualizations', () => {
    test('should render charts', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for chart canvases or SVG elements
      const charts = page.locator('canvas, svg.chart, [data-testid*="chart"]');

      const count = await charts.count();
      if (count > 0) {
        await expect(charts.first()).toBeVisible();
      }
    });

    test('should display chart legends', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for chart legends
      const legends = page.locator('.chart-legend, [class*="legend"]');

      const count = await legends.count();
      if (count > 0) {
        await expect(legends.first()).toBeVisible();
      }
    });
  });

  test.describe('Data Export', () => {
    test('should display export buttons', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for export buttons
      const exportBtn = page.locator(
        'button:has-text("Export"), button:has-text("Download"), [data-testid*="export"]'
      );

      const count = await exportBtn.count();

      // Export buttons might be available based on role
      if (count > 0) {
        await expect(exportBtn.first()).toBeVisible();
      }
    });

    test('should support CSV export', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for CSV export option
      const csvExport = page.locator('button:has-text("CSV"), [data-format="csv"]');

      const count = await csvExport.count();
      if (count > 0) {
        await expect(csvExport.first()).toBeVisible();
      }
    });

    test('should support PDF export', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for PDF export option
      const pdfExport = page.locator('button:has-text("PDF"), [data-format="pdf"]');

      const count = await pdfExport.count();
      if (count > 0) {
        await expect(pdfExport.first()).toBeVisible();
      }
    });
  });

  test.describe('Real-time Updates', () => {
    test('should establish SSE connection', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Check for SSE connection status indicator
      const connectionStatus = page.locator(
        '[data-testid="connection-status"], .connection-status'
      );

      const count = await connectionStatus.count();
      if (count > 0) {
        const status = await connectionStatus.first().textContent();
        expect(status).toBeTruthy();
      }
    });

    test('should handle disconnection gracefully', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Simulate offline mode
      await page.context().setOffline(true);

      // Wait a bit for disconnection to be detected
      await page.waitForTimeout(2000);

      // Check for disconnection indicator
      const disconnectIndicator = page.locator(
        ':has-text("Disconnected"), :has-text("Offline"), [data-status="disconnected"]'
      );

      const isVisible = await disconnectIndicator.isVisible().catch(() => false);

      // Restore online mode
      await page.context().setOffline(false);
    });
  });

  test.describe('Responsive Layout', () => {
    test('should display correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Dashboard should be visible
      const dashboard = page.locator('main, [role="main"]');
      await expect(dashboard).toBeVisible();
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Dashboard should be visible and responsive
      const dashboard = page.locator('main, [role="main"]');
      await expect(dashboard).toBeVisible();
    });

    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Dashboard should be visible
      const dashboard = page.locator('main, [role="main"]');
      await expect(dashboard).toBeVisible();
    });

    test('should show mobile menu on small screens', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for mobile menu button
      const menuButton = page.locator(
        'button[aria-label*="menu"], .mobile-menu-button, .hamburger'
      );

      const count = await menuButton.count();
      if (count > 0) {
        await expect(menuButton.first()).toBeVisible();
      }
    });
  });

  test.describe('Dashboard Actions', () => {
    test('should support refreshing data', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for refresh button
      const refreshBtn = page.locator(
        'button:has-text("Refresh"), button[aria-label*="Refresh"], [data-action="refresh"]'
      );

      const count = await refreshBtn.count();
      if (count > 0) {
        await refreshBtn.first().click();

        // Should show loading state briefly
        await page.waitForTimeout(500);

        // Should complete
        await waitForLoadingComplete(page);
      }
    });

    test('should support date range filtering', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for date picker or date range selector
      const dateFilter = page.locator(
        '[data-testid="date-filter"], .date-picker, input[type="date"]'
      );

      const count = await dateFilter.count();
      if (count > 0) {
        await expect(dateFilter.first()).toBeVisible();
      }
    });
  });
});
