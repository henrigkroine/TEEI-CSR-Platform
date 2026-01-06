/**
 * Comprehensive Visual Regression E2E Tests
 *
 * Baseline Created: 2025-11-14
 * Environment: Chromium 1920x1080, Firefox 1920x1080, WebKit 1920x1080
 *
 * Tests cover:
 * - Dashboard widgets (At-a-glance, SROI, VIS, Q2Q feed)
 * - Evidence explorer (list view, drawer open)
 * - Charts (line charts, bar charts, pie charts)
 * - Modals (report generation, export)
 * - Forms (login, settings, admin)
 * - Navigation (header, sidebar, mobile menu)
 * - Empty states
 * - Loading states
 * - Error states (404, 401, error messages)
 * - Saved views UI
 * - Multi-viewport testing (desktop, tablet, mobile)
 */

import { test, expect } from '@playwright/test';
import {
  mockSession,
  navigateToCockpit,
  TEST_USERS,
  TEST_COMPANIES,
  waitForLoadingComplete,
} from './helpers';

// Viewport configurations
const VIEWPORTS = {
  DESKTOP: { width: 1920, height: 1080 },
  TABLET: { width: 768, height: 1024 },
  MOBILE: { width: 375, height: 667 },
};

// Visual comparison thresholds
const THRESHOLDS = {
  STRICT: 50,        // For static components
  NORMAL: 100,       // For general pages
  RELAXED: 150,      // For dynamic content, i18n differences
  CHARTS: 200,       // For charts with animations
};

// Helper to wait for animations and dynamic content to settle
async function waitForVisualStability(page: any, timeout = 2000) {
  await page.waitForTimeout(timeout);
  await page.evaluate(() => {
    // Disable animations for consistent screenshots
    const style = document.createElement('style');
    style.innerHTML = `
      *, *::before, *::after {
        animation-duration: 0s !important;
        transition-duration: 0s !important;
      }
    `;
    document.head.appendChild(style);
  });
}

test.describe('Visual Regression - Dashboard Widgets', () => {
  test.describe('At-a-Glance Widget', () => {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test(`should match snapshot - ${name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await mockSession(page, TEST_USERS.ADMIN);
        await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
        await waitForLoadingComplete(page);
        await waitForVisualStability(page);

        const widget = page.locator('[data-testid="at-a-glance"], .at-a-glance-widget, .metric-summary').first();
        const exists = await widget.isVisible().catch(() => false);

        if (exists) {
          await expect(widget).toHaveScreenshot(`at-a-glance-${name.toLowerCase()}.png`, {
            maxDiffPixels: THRESHOLDS.NORMAL,
          });
        }
      });
    }
  });

  test.describe('SROI Panel Widget', () => {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test(`should match snapshot - ${name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await mockSession(page, TEST_USERS.ADMIN);
        await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
        await waitForLoadingComplete(page);
        await waitForVisualStability(page);

        const widget = page.locator('[data-testid="sroi-panel"], .sroi-panel, [data-widget="sroi"]').first();
        const exists = await widget.isVisible().catch(() => false);

        if (exists) {
          await expect(widget).toHaveScreenshot(`sroi-panel-${name.toLowerCase()}.png`, {
            maxDiffPixels: THRESHOLDS.CHARTS,
          });
        }
      });
    }
  });

  test.describe('VIS Panel Widget', () => {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test(`should match snapshot - ${name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await mockSession(page, TEST_USERS.ADMIN);
        await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
        await waitForLoadingComplete(page);
        await waitForVisualStability(page);

        const widget = page.locator('[data-testid="vis-panel"], .vis-panel, [data-widget="vis"]').first();
        const exists = await widget.isVisible().catch(() => false);

        if (exists) {
          await expect(widget).toHaveScreenshot(`vis-panel-${name.toLowerCase()}.png`, {
            maxDiffPixels: THRESHOLDS.CHARTS,
          });
        }
      });
    }
  });

  test.describe('Q2Q Feed Widget', () => {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test(`should match snapshot - ${name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await mockSession(page, TEST_USERS.ADMIN);
        await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
        await waitForLoadingComplete(page);
        await waitForVisualStability(page);

        const widget = page.locator('[data-testid="q2q-feed"], .q2q-feed, [data-widget="q2q"]').first();
        const exists = await widget.isVisible().catch(() => false);

        if (exists) {
          await expect(widget).toHaveScreenshot(`q2q-feed-${name.toLowerCase()}.png`, {
            maxDiffPixels: THRESHOLDS.NORMAL,
          });
        }
      });
    }
  });

  test.describe('KPI Cards', () => {
    test('should match all KPI cards on dashboard', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);
      await waitForVisualStability(page);

      const kpiCards = page.locator('[data-testid="kpi-card"], .kpi-card, .metric-card');
      const count = await kpiCards.count();

      if (count > 0) {
        for (let i = 0; i < Math.min(count, 6); i++) {
          const card = kpiCards.nth(i);
          await expect(card).toHaveScreenshot(`kpi-card-${i}.png`, {
            maxDiffPixels: THRESHOLDS.NORMAL,
          });
        }
      }
    });
  });
});

test.describe('Visual Regression - Evidence Explorer', () => {
  test.describe('Evidence List View', () => {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test(`should match evidence list - ${name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await mockSession(page, TEST_USERS.ADMIN);
        await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
        await waitForLoadingComplete(page);
        await waitForVisualStability(page);

        await expect(page).toHaveScreenshot(`evidence-list-${name.toLowerCase()}.png`, {
          fullPage: true,
          maxDiffPixels: THRESHOLDS.NORMAL,
        });
      });
    }
  });

  test.describe('Evidence Cards', () => {
    test('should match individual evidence card', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);
      await waitForVisualStability(page);

      const evidenceCard = page.locator('[data-testid="evidence-card"], .evidence-card').first();
      const exists = await evidenceCard.isVisible().catch(() => false);

      if (exists) {
        await expect(evidenceCard).toHaveScreenshot('evidence-card.png', {
          maxDiffPixels: THRESHOLDS.NORMAL,
        });
      }
    });
  });

  test.describe('Evidence Detail Drawer', () => {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test(`should match drawer open state - ${name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await mockSession(page, TEST_USERS.ADMIN);
        await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
        await waitForLoadingComplete(page);

        const evidenceCard = page.locator('[data-testid="evidence-card"], .evidence-card').first();
        const exists = await evidenceCard.isVisible().catch(() => false);

        if (exists) {
          await evidenceCard.click();
          const drawer = page.locator('[data-testid="evidence-drawer"], .drawer, [role="dialog"]');
          await expect(drawer).toBeVisible({ timeout: 5000 });
          await waitForVisualStability(page, 1000);

          await expect(page).toHaveScreenshot(`evidence-drawer-${name.toLowerCase()}.png`, {
            maxDiffPixels: THRESHOLDS.NORMAL,
          });
        }
      });
    }
  });

  test.describe('Lineage Drawer', () => {
    test('should match lineage drawer', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);

      const lineageButton = page.locator('[data-testid="lineage-button"], button:has-text("Lineage"), button:has-text("Evidence Chain")').first();
      const exists = await lineageButton.isVisible().catch(() => false);

      if (exists) {
        await lineageButton.click();
        const drawer = page.locator('[data-testid="lineage-drawer"], .lineage-drawer');
        await expect(drawer).toBeVisible({ timeout: 5000 });
        await waitForVisualStability(page, 1000);

        await expect(page).toHaveScreenshot('lineage-drawer.png', {
          maxDiffPixels: THRESHOLDS.NORMAL,
        });
      }
    });
  });
});

test.describe('Visual Regression - Charts', () => {
  test.describe('Line Charts', () => {
    test('should match line chart component', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);
      await waitForVisualStability(page, 3000);

      const lineChart = page.locator('[data-chart-type="line"], .line-chart, canvas').first();
      const exists = await lineChart.isVisible().catch(() => false);

      if (exists) {
        await expect(lineChart).toHaveScreenshot('line-chart.png', {
          maxDiffPixels: THRESHOLDS.CHARTS,
        });
      }
    });
  });

  test.describe('Bar Charts', () => {
    test('should match bar chart component', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);
      await waitForVisualStability(page, 3000);

      const barChart = page.locator('[data-chart-type="bar"], .bar-chart').first();
      const exists = await barChart.isVisible().catch(() => false);

      if (exists) {
        await expect(barChart).toHaveScreenshot('bar-chart.png', {
          maxDiffPixels: THRESHOLDS.CHARTS,
        });
      }
    });
  });

  test.describe('Pie Charts', () => {
    test('should match pie chart component', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);
      await waitForVisualStability(page, 3000);

      const pieChart = page.locator('[data-chart-type="pie"], .pie-chart').first();
      const exists = await pieChart.isVisible().catch(() => false);

      if (exists) {
        await expect(pieChart).toHaveScreenshot('pie-chart.png', {
          maxDiffPixels: THRESHOLDS.CHARTS,
        });
      }
    });
  });

  test.describe('Benchmark Charts', () => {
    test('should match benchmark charts', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/benchmarks');
      await waitForLoadingComplete(page);
      await waitForVisualStability(page, 3000);

      const benchmarkChart = page.locator('[data-testid="benchmark-chart"], .benchmark-chart').first();
      const exists = await benchmarkChart.isVisible().catch(() => false);

      if (exists) {
        await expect(benchmarkChart).toHaveScreenshot('benchmark-chart.png', {
          maxDiffPixels: THRESHOLDS.CHARTS,
        });
      }
    });
  });
});

test.describe('Visual Regression - Modals', () => {
  test.describe('Report Generation Modal', () => {
    test('should match report modal', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const generateButton = page.locator('[data-testid="generate-report"], button:has-text("Generate Report")').first();
      const exists = await generateButton.isVisible().catch(() => false);

      if (exists) {
        await generateButton.click();
        const modal = page.locator('[data-testid="report-modal"], [role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 5000 });
        await waitForVisualStability(page, 1000);

        await expect(modal).toHaveScreenshot('report-generation-modal.png', {
          maxDiffPixels: THRESHOLDS.NORMAL,
        });
      }
    });
  });

  test.describe('Export Modal', () => {
    test('should match export modal', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const exportButton = page.locator('[data-testid="export-button"], button:has-text("Export")').first();
      const exists = await exportButton.isVisible().catch(() => false);

      if (exists) {
        await exportButton.click();
        const modal = page.locator('[data-testid="export-modal"], [role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 5000 });
        await waitForVisualStability(page, 1000);

        await expect(modal).toHaveScreenshot('export-modal.png', {
          maxDiffPixels: THRESHOLDS.NORMAL,
        });
      }
    });
  });

  test.describe('Save View Modal', () => {
    test('should match save view modal', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const saveButton = page.locator('[data-testid="save-view"], button:has-text("Save View")').first();
      const exists = await saveButton.isVisible().catch(() => false);

      if (exists) {
        await saveButton.click();
        const modal = page.locator('[data-testid="save-view-modal"], [role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 5000 });
        await waitForVisualStability(page, 1000);

        await expect(modal).toHaveScreenshot('save-view-modal.png', {
          maxDiffPixels: THRESHOLDS.NORMAL,
        });
      }
    });
  });

  test.describe('Share Link Modal', () => {
    test('should match share link modal', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const shareButton = page.locator('[data-testid="share-button"], button:has-text("Share")').first();
      const exists = await shareButton.isVisible().catch(() => false);

      if (exists) {
        await shareButton.click();
        const modal = page.locator('[data-testid="share-modal"], [role="dialog"]');
        await expect(modal).toBeVisible({ timeout: 5000 });
        await waitForVisualStability(page, 1000);

        await expect(modal).toHaveScreenshot('share-link-modal.png', {
          maxDiffPixels: THRESHOLDS.NORMAL,
        });
      }
    });
  });
});

test.describe('Visual Regression - Forms', () => {
  test.describe('Login Form', () => {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test(`should match login form - ${name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await page.goto('/login');
        await waitForVisualStability(page);

        await expect(page).toHaveScreenshot(`login-form-${name.toLowerCase()}.png`, {
          fullPage: true,
          maxDiffPixels: THRESHOLDS.NORMAL,
        });
      });
    }
  });

  test.describe('Admin Settings Form', () => {
    test('should match admin settings page', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/admin');
      await waitForLoadingComplete(page);
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('admin-settings.png', {
        fullPage: true,
        maxDiffPixels: THRESHOLDS.NORMAL,
      });
    });
  });

  test.describe('SSO Settings Form', () => {
    test('should match SSO settings', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/admin/sso');
      await waitForLoadingComplete(page);
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('sso-settings.png', {
        fullPage: true,
        maxDiffPixels: THRESHOLDS.NORMAL,
      });
    });
  });

  test.describe('Weight Overrides Form', () => {
    test('should match weight overrides UI', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/admin');
      await waitForLoadingComplete(page);
      await waitForVisualStability(page);

      const weightSection = page.locator('[data-testid="weight-overrides"], .weight-overrides').first();
      const exists = await weightSection.isVisible().catch(() => false);

      if (exists) {
        await expect(weightSection).toHaveScreenshot('weight-overrides-form.png', {
          maxDiffPixels: THRESHOLDS.NORMAL,
        });
      }
    });
  });
});

test.describe('Visual Regression - Navigation', () => {
  test.describe('Header Navigation', () => {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test(`should match header - ${name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await mockSession(page, TEST_USERS.ADMIN);
        await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
        await waitForLoadingComplete(page);
        await waitForVisualStability(page);

        const header = page.locator('header, [role="banner"], nav.header').first();
        const exists = await header.isVisible().catch(() => false);

        if (exists) {
          await expect(header).toHaveScreenshot(`header-${name.toLowerCase()}.png`, {
            maxDiffPixels: THRESHOLDS.STRICT,
          });
        }
      });
    }
  });

  test.describe('Sidebar Navigation', () => {
    test('should match sidebar on desktop', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);
      await waitForVisualStability(page);

      const sidebar = page.locator('aside, [role="navigation"], .sidebar').first();
      const exists = await sidebar.isVisible().catch(() => false);

      if (exists) {
        await expect(sidebar).toHaveScreenshot('sidebar-desktop.png', {
          maxDiffPixels: THRESHOLDS.STRICT,
        });
      }
    });
  });

  test.describe('Mobile Menu', () => {
    test('should match mobile menu collapsed', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.MOBILE);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('mobile-menu-collapsed.png', {
        maxDiffPixels: THRESHOLDS.NORMAL,
      });
    });

    test('should match mobile menu expanded', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.MOBILE);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const menuButton = page.locator('[data-testid="menu-toggle"], button[aria-label="Menu"], .menu-button').first();
      const exists = await menuButton.isVisible().catch(() => false);

      if (exists) {
        await menuButton.click();
        await page.waitForTimeout(500);
        await waitForVisualStability(page, 500);

        await expect(page).toHaveScreenshot('mobile-menu-expanded.png', {
          maxDiffPixels: THRESHOLDS.NORMAL,
        });
      }
    });
  });

  test.describe('Language Switcher', () => {
    test('should match language switcher dropdown', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const langSwitcher = page.locator('[data-testid="language-switcher"], .language-switcher').first();
      const exists = await langSwitcher.isVisible().catch(() => false);

      if (exists) {
        await langSwitcher.click();
        await page.waitForTimeout(300);

        await expect(langSwitcher).toHaveScreenshot('language-switcher.png', {
          maxDiffPixels: THRESHOLDS.NORMAL,
        });
      }
    });
  });
});

test.describe('Visual Regression - Empty States', () => {
  test('should match empty evidence state', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await mockSession(page, TEST_USERS.ADMIN);

    // Mock empty response
    await page.route('**/api/evidence/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    }));

    await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
    await waitForLoadingComplete(page);
    await waitForVisualStability(page);

    await expect(page).toHaveScreenshot('empty-state-evidence.png', {
      fullPage: true,
      maxDiffPixels: THRESHOLDS.NORMAL,
    });
  });

  test('should match empty reports state', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await mockSession(page, TEST_USERS.ADMIN);

    await page.route('**/api/reports/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    }));

    await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/reports');
    await waitForLoadingComplete(page);
    await waitForVisualStability(page);

    await expect(page).toHaveScreenshot('empty-state-reports.png', {
      fullPage: true,
      maxDiffPixels: THRESHOLDS.NORMAL,
    });
  });

  test('should match no data dashboard state', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await mockSession(page, TEST_USERS.ADMIN);

    await page.route('**/api/metrics/**', route => route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ metrics: [] }),
    }));

    await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
    await waitForLoadingComplete(page);
    await waitForVisualStability(page);

    await expect(page).toHaveScreenshot('empty-state-dashboard.png', {
      fullPage: true,
      maxDiffPixels: THRESHOLDS.NORMAL,
    });
  });
});

test.describe('Visual Regression - Loading States', () => {
  test('should match loading spinner', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await mockSession(page, TEST_USERS.ADMIN);

    // Slow down network to capture loading state
    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 3000);
    });

    const navigationPromise = navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);

    // Wait to capture loading state
    await page.waitForTimeout(500);

    const loadingIndicator = page.locator('[data-testid="loading"], [data-testid="loading-spinner"], .loading, .spinner').first();
    const isLoading = await loadingIndicator.isVisible().catch(() => false);

    if (isLoading) {
      await expect(loadingIndicator).toHaveScreenshot('loading-spinner.png', {
        maxDiffPixels: THRESHOLDS.STRICT,
      });
    }

    await navigationPromise;
  });

  test('should match skeleton loaders', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await mockSession(page, TEST_USERS.ADMIN);

    await page.route('**/api/**', route => {
      setTimeout(() => route.continue(), 3000);
    });

    const navigationPromise = navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
    await page.waitForTimeout(500);

    const skeleton = page.locator('[data-testid="skeleton"], .skeleton, .animate-pulse').first();
    const exists = await skeleton.isVisible().catch(() => false);

    if (exists) {
      await expect(skeleton).toHaveScreenshot('skeleton-loader.png', {
        maxDiffPixels: THRESHOLDS.NORMAL,
      });
    }

    await navigationPromise;
  });
});

test.describe('Visual Regression - Error States', () => {
  test.describe('404 Page', () => {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test(`should match 404 page - ${name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await mockSession(page, TEST_USERS.ADMIN);
        await page.goto('/en/cockpit/company-1/nonexistent-page');
        await waitForVisualStability(page);

        await expect(page).toHaveScreenshot(`404-page-${name.toLowerCase()}.png`, {
          fullPage: true,
          maxDiffPixels: THRESHOLDS.NORMAL,
        });
      });
    }
  });

  test.describe('401 Page', () => {
    test('should match 401 unauthorized page', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      // Don't set session to trigger 401
      await page.goto('/en/cockpit/company-1');
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('401-page.png', {
        fullPage: true,
        maxDiffPixels: THRESHOLDS.NORMAL,
      });
    });
  });

  test('should match API error message', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await mockSession(page, TEST_USERS.ADMIN);

    // Mock error response
    await page.route('**/api/metrics/**', route => route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ error: 'Internal Server Error' }),
    }));

    await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
    await page.waitForTimeout(2000);

    const errorMessage = page.locator('[role="alert"], .error-message, .alert-error').first();
    const exists = await errorMessage.isVisible({ timeout: 5000 }).catch(() => false);

    if (exists) {
      await expect(errorMessage).toHaveScreenshot('error-message.png', {
        maxDiffPixels: THRESHOLDS.NORMAL,
      });
    }
  });

  test('should match network error state', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await mockSession(page, TEST_USERS.ADMIN);

    // Abort all API requests to simulate network error
    await page.route('**/api/**', route => route.abort());

    await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
    await page.waitForTimeout(2000);

    await expect(page).toHaveScreenshot('network-error-state.png', {
      fullPage: true,
      maxDiffPixels: THRESHOLDS.NORMAL,
    });
  });
});

test.describe('Visual Regression - Saved Views UI', () => {
  test('should match saved views list', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await mockSession(page, TEST_USERS.ADMIN);
    await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
    await waitForLoadingComplete(page);

    const savedViewsButton = page.locator('[data-testid="saved-views"], button:has-text("Saved Views")').first();
    const exists = await savedViewsButton.isVisible().catch(() => false);

    if (exists) {
      await savedViewsButton.click();
      await page.waitForTimeout(500);
      await waitForVisualStability(page, 500);

      const savedViewsList = page.locator('[data-testid="saved-views-list"], .saved-views-list');
      await expect(savedViewsList).toBeVisible({ timeout: 5000 });

      await expect(savedViewsList).toHaveScreenshot('saved-views-list.png', {
        maxDiffPixels: THRESHOLDS.NORMAL,
      });
    }
  });

  test('should match saved view card', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await mockSession(page, TEST_USERS.ADMIN);
    await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
    await waitForLoadingComplete(page);

    const savedViewCard = page.locator('[data-testid="saved-view-card"], .saved-view-card').first();
    const exists = await savedViewCard.isVisible().catch(() => false);

    if (exists) {
      await expect(savedViewCard).toHaveScreenshot('saved-view-card.png', {
        maxDiffPixels: THRESHOLDS.NORMAL,
      });
    }
  });
});

test.describe('Visual Regression - Full Page Snapshots', () => {
  test.describe('Dashboard Full Page', () => {
    for (const [name, viewport] of Object.entries(VIEWPORTS)) {
      test(`should match full dashboard - ${name}`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await mockSession(page, TEST_USERS.ADMIN);
        await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
        await waitForLoadingComplete(page);
        await waitForVisualStability(page);

        await expect(page).toHaveScreenshot(`dashboard-full-${name.toLowerCase()}.png`, {
          fullPage: true,
          maxDiffPixels: THRESHOLDS.RELAXED,
        });
      });
    }
  });

  test.describe('Reports Page', () => {
    test('should match reports page full', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/reports');
      await waitForLoadingComplete(page);
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('reports-page-full.png', {
        fullPage: true,
        maxDiffPixels: THRESHOLDS.NORMAL,
      });
    });
  });

  test.describe('Benchmarks Page', () => {
    test('should match benchmarks page full', async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/benchmarks');
      await waitForLoadingComplete(page);
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot('benchmarks-page-full.png', {
        fullPage: true,
        maxDiffPixels: THRESHOLDS.NORMAL,
      });
    });
  });
});

test.describe('Visual Regression - Multi-Language', () => {
  const languages = ['en', 'no', 'uk'];

  for (const lang of languages) {
    test(`should match dashboard in ${lang}`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, lang as any, TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot(`dashboard-${lang}.png`, {
        fullPage: true,
        maxDiffPixels: THRESHOLDS.RELAXED,
      });
    });
  }
});

test.describe('Visual Regression - Additional UI Elements', () => {
  test('should match connection status indicator', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await mockSession(page, TEST_USERS.ADMIN);
    await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
    await waitForLoadingComplete(page);

    const connectionStatus = page.locator('[data-testid="connection-status"], .connection-status').first();
    const exists = await connectionStatus.isVisible().catch(() => false);

    if (exists) {
      await expect(connectionStatus).toHaveScreenshot('connection-status.png', {
        maxDiffPixels: THRESHOLDS.STRICT,
      });
    }
  });

  test('should match tenant selector', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await mockSession(page, TEST_USERS.SUPER_ADMIN);
    await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
    await waitForLoadingComplete(page);

    const tenantSelector = page.locator('[data-testid="tenant-selector"], .tenant-selector').first();
    const exists = await tenantSelector.isVisible().catch(() => false);

    if (exists) {
      await expect(tenantSelector).toHaveScreenshot('tenant-selector.png', {
        maxDiffPixels: THRESHOLDS.NORMAL,
      });
    }
  });

  test('should match approval workflow panel', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await mockSession(page, TEST_USERS.ADMIN);
    await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/reports');
    await waitForLoadingComplete(page);

    const approvalPanel = page.locator('[data-testid="approval-panel"], .approval-panel').first();
    const exists = await approvalPanel.isVisible().catch(() => false);

    if (exists) {
      await expect(approvalPanel).toHaveScreenshot('approval-workflow-panel.png', {
        maxDiffPixels: THRESHOLDS.NORMAL,
      });
    }
  });

  test('should match export buttons group', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await mockSession(page, TEST_USERS.ADMIN);
    await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
    await waitForLoadingComplete(page);

    const exportButtons = page.locator('[data-testid="export-buttons"], .export-buttons').first();
    const exists = await exportButtons.isVisible().catch(() => false);

    if (exists) {
      await expect(exportButtons).toHaveScreenshot('export-buttons.png', {
        maxDiffPixels: THRESHOLDS.STRICT,
      });
    }
  });
});
