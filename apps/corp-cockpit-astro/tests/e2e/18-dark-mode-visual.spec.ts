/**
 * Dark Mode Visual Regression Tests
 *
 * Phase 5: Dark Mode Polish - VRT Snapshots
 *
 * This test suite creates visual regression baselines for all major UI views
 * in both light and dark modes to prevent unintended visual regressions.
 *
 * Coverage:
 * - Dashboard view (light + dark)
 * - Reports page (light + dark)
 * - Evidence Explorer (light + dark)
 * - Settings page (light + dark)
 * - Boardroom Mode (light + dark)
 * - Theme toggle states (light, auto, dark)
 *
 * Browsers: Chromium, Firefox, WebKit
 * Viewports: Desktop (1920x1080), Tablet (768x1024), Mobile (375x667)
 *
 * Total snapshots: 5 views × 2 themes × 3 viewports = 30 base snapshots
 * Plus theme toggle states = 33 snapshots per browser = 99 total snapshots
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
} as const;

// Theme configurations
const THEMES = ['light', 'dark'] as const;
type Theme = typeof THEMES[number];

// Company ID for localStorage key
const COMPANY_ID = TEST_COMPANIES.COMPANY_1;
const THEME_STORAGE_KEY = `theme:${COMPANY_ID}`;

/**
 * Helper to set theme in localStorage before page load
 */
async function setTheme(page: any, theme: Theme) {
  await page.addInitScript((args: any) => {
    localStorage.setItem(args.key, args.theme);
  }, { key: THEME_STORAGE_KEY, theme });
}

/**
 * Helper to apply theme class to document after page load
 */
async function applyThemeClass(page: any, theme: Theme) {
  await page.evaluate((t: Theme) => {
    document.documentElement.classList.remove('light', 'dark');
    document.documentElement.classList.add(t);
  }, theme);
}

/**
 * Wait for animations and dynamic content to settle
 */
async function waitForVisualStability(page: any, timeout = 1000) {
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

test.describe('Dark Mode Visual Regression - Major Views', () => {
  // Test configuration: views to snapshot
  const views = [
    { name: 'Dashboard', path: '', label: 'dashboard' },
    { name: 'Reports', path: '/reports', label: 'reports' },
    { name: 'Evidence Explorer', path: '/evidence', label: 'evidence' },
    { name: 'Settings', path: '/settings', label: 'settings' },
  ];

  for (const view of views) {
    test.describe(view.name, () => {
      for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
        for (const theme of THEMES) {
          test(`${viewportName} - ${theme} mode`, async ({ page }) => {
            // Set viewport
            await page.setViewportSize(viewport);

            // Set theme before navigation
            await setTheme(page, theme);

            // Authenticate and navigate
            await mockSession(page, TEST_USERS.ADMIN);
            await navigateToCockpit(page, 'en', COMPANY_ID, view.path);
            await waitForLoadingComplete(page);

            // Apply theme class (ensure it's applied)
            await applyThemeClass(page, theme);

            // Wait for visual stability
            await waitForVisualStability(page, 1500);

            // Take snapshot
            await expect(page).toHaveScreenshot(
              `${view.label}-${viewportName.toLowerCase()}-${theme}.png`,
              {
                fullPage: true,
                maxDiffPixelRatio: 0.003, // 0.3% threshold
                animations: 'disabled',
              }
            );
          });
        }
      }
    });
  }
});

test.describe('Dark Mode Visual Regression - Boardroom Mode', () => {
  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    for (const theme of THEMES) {
      test(`Boardroom Mode - ${viewportName} - ${theme} mode`, async ({ page }) => {
        await page.setViewportSize(viewport);
        await setTheme(page, theme);
        await mockSession(page, TEST_USERS.ADMIN);

        // Navigate to boardroom mode
        await navigateToCockpit(page, 'en', COMPANY_ID, '/boardroom');
        await waitForLoadingComplete(page);
        await applyThemeClass(page, theme);
        await waitForVisualStability(page, 2000);

        await expect(page).toHaveScreenshot(
          `boardroom-${viewportName.toLowerCase()}-${theme}.png`,
          {
            fullPage: true,
            maxDiffPixelRatio: 0.003,
            animations: 'disabled',
          }
        );
      });
    }
  }
});

test.describe('Dark Mode Visual Regression - Dashboard Widgets', () => {
  const widgets = [
    { testId: 'at-a-glance', selectors: '[data-testid="at-a-glance"], .at-a-glance-widget', name: 'at-a-glance' },
    { testId: 'sroi-panel', selectors: '[data-testid="sroi-panel"], .sroi-panel, [data-widget="sroi"]', name: 'sroi-panel' },
    { testId: 'vis-panel', selectors: '[data-testid="vis-panel"], .vis-panel, [data-widget="vis"]', name: 'vis-panel' },
    { testId: 'q2q-feed', selectors: '[data-testid="q2q-feed"], .q2q-feed, [data-widget="q2q"]', name: 'q2q-feed' },
  ];

  for (const widget of widgets) {
    test.describe(`${widget.name} Widget`, () => {
      for (const theme of THEMES) {
        test(`Desktop - ${theme} mode`, async ({ page }) => {
          await page.setViewportSize(VIEWPORTS.DESKTOP);
          await setTheme(page, theme);
          await mockSession(page, TEST_USERS.ADMIN);
          await navigateToCockpit(page, 'en', COMPANY_ID);
          await waitForLoadingComplete(page);
          await applyThemeClass(page, theme);
          await waitForVisualStability(page);

          const widgetElement = page.locator(widget.selectors).first();
          const exists = await widgetElement.isVisible().catch(() => false);

          if (exists) {
            await expect(widgetElement).toHaveScreenshot(
              `widget-${widget.name}-${theme}.png`,
              {
                maxDiffPixelRatio: 0.003,
              }
            );
          } else {
            test.skip();
          }
        });
      }
    });
  }
});

test.describe('Dark Mode Visual Regression - UI Components', () => {
  test.describe('Navigation Header', () => {
    for (const theme of THEMES) {
      test(`Header - ${theme} mode`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.DESKTOP);
        await setTheme(page, theme);
        await mockSession(page, TEST_USERS.ADMIN);
        await navigateToCockpit(page, 'en', COMPANY_ID);
        await waitForLoadingComplete(page);
        await applyThemeClass(page, theme);
        await waitForVisualStability(page);

        const header = page.locator('header, [role="banner"], nav.header').first();
        const exists = await header.isVisible().catch(() => false);

        if (exists) {
          await expect(header).toHaveScreenshot(`header-${theme}.png`, {
            maxDiffPixelRatio: 0.002,
          });
        }
      });
    }
  });

  test.describe('Sidebar Navigation', () => {
    for (const theme of THEMES) {
      test(`Sidebar - ${theme} mode`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.DESKTOP);
        await setTheme(page, theme);
        await mockSession(page, TEST_USERS.ADMIN);
        await navigateToCockpit(page, 'en', COMPANY_ID);
        await waitForLoadingComplete(page);
        await applyThemeClass(page, theme);
        await waitForVisualStability(page);

        const sidebar = page.locator('aside, [role="navigation"], .sidebar').first();
        const exists = await sidebar.isVisible().catch(() => false);

        if (exists) {
          await expect(sidebar).toHaveScreenshot(`sidebar-${theme}.png`, {
            maxDiffPixelRatio: 0.002,
          });
        }
      });
    }
  });

  test.describe('Evidence Cards', () => {
    for (const theme of THEMES) {
      test(`Evidence Card - ${theme} mode`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.DESKTOP);
        await setTheme(page, theme);
        await mockSession(page, TEST_USERS.ADMIN);
        await navigateToCockpit(page, 'en', COMPANY_ID, '/evidence');
        await waitForLoadingComplete(page);
        await applyThemeClass(page, theme);
        await waitForVisualStability(page);

        const evidenceCard = page.locator('[data-testid="evidence-card"], .evidence-card').first();
        const exists = await evidenceCard.isVisible().catch(() => false);

        if (exists) {
          await expect(evidenceCard).toHaveScreenshot(`evidence-card-${theme}.png`, {
            maxDiffPixelRatio: 0.003,
          });
        }
      });
    }
  });
});

test.describe('Dark Mode Visual Regression - Theme Toggle Button', () => {
  test('Theme toggle - Light state', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await setTheme(page, 'light');
    await mockSession(page, TEST_USERS.ADMIN);
    await navigateToCockpit(page, 'en', COMPANY_ID);
    await waitForLoadingComplete(page);
    await applyThemeClass(page, 'light');
    await waitForVisualStability(page);

    // Find theme toggle button
    const toggleButton = page.locator('button[aria-label*="theme" i], button[title*="theme" i]').first();
    const exists = await toggleButton.isVisible().catch(() => false);

    if (exists) {
      // Hover to show tooltip (if any)
      await toggleButton.hover();
      await page.waitForTimeout(300);

      await expect(toggleButton).toHaveScreenshot('theme-toggle-light.png', {
        maxDiffPixelRatio: 0.002,
      });
    }
  });

  test('Theme toggle - Dark state', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);
    await setTheme(page, 'dark');
    await mockSession(page, TEST_USERS.ADMIN);
    await navigateToCockpit(page, 'en', COMPANY_ID);
    await waitForLoadingComplete(page);
    await applyThemeClass(page, 'dark');
    await waitForVisualStability(page);

    const toggleButton = page.locator('button[aria-label*="theme" i], button[title*="theme" i]').first();
    const exists = await toggleButton.isVisible().catch(() => false);

    if (exists) {
      await toggleButton.hover();
      await page.waitForTimeout(300);

      await expect(toggleButton).toHaveScreenshot('theme-toggle-dark.png', {
        maxDiffPixelRatio: 0.002,
      });
    }
  });

  test('Theme toggle - Auto state', async ({ page }) => {
    await page.setViewportSize(VIEWPORTS.DESKTOP);

    // Set to auto mode
    await page.addInitScript((args: any) => {
      localStorage.setItem(args.key, 'auto');
    }, { key: THEME_STORAGE_KEY });

    await mockSession(page, TEST_USERS.ADMIN);
    await navigateToCockpit(page, 'en', COMPANY_ID);
    await waitForLoadingComplete(page);
    await waitForVisualStability(page);

    const toggleButton = page.locator('button[aria-label*="theme" i], button[title*="theme" i]').first();
    const exists = await toggleButton.isVisible().catch(() => false);

    if (exists) {
      await toggleButton.hover();
      await page.waitForTimeout(300);

      await expect(toggleButton).toHaveScreenshot('theme-toggle-auto.png', {
        maxDiffPixelRatio: 0.002,
      });
    }
  });
});

test.describe('Dark Mode Visual Regression - Modal Dialogs', () => {
  test.describe('Report Generation Modal', () => {
    for (const theme of THEMES) {
      test(`Report Modal - ${theme} mode`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.DESKTOP);
        await setTheme(page, theme);
        await mockSession(page, TEST_USERS.ADMIN);
        await navigateToCockpit(page, 'en', COMPANY_ID);
        await waitForLoadingComplete(page);
        await applyThemeClass(page, theme);
        await waitForVisualStability(page);

        const generateButton = page.locator('[data-testid="generate-report"], button:has-text("Generate Report")').first();
        const exists = await generateButton.isVisible().catch(() => false);

        if (exists) {
          await generateButton.click();
          const modal = page.locator('[data-testid="report-modal"], [role="dialog"]');
          await expect(modal).toBeVisible({ timeout: 5000 });
          await page.waitForTimeout(500);

          await expect(modal).toHaveScreenshot(`report-modal-${theme}.png`, {
            maxDiffPixelRatio: 0.003,
          });
        }
      });
    }
  });

  test.describe('Export Modal', () => {
    for (const theme of THEMES) {
      test(`Export Modal - ${theme} mode`, async ({ page }) => {
        await page.setViewportSize(VIEWPORTS.DESKTOP);
        await setTheme(page, theme);
        await mockSession(page, TEST_USERS.ADMIN);
        await navigateToCockpit(page, 'en', COMPANY_ID);
        await waitForLoadingComplete(page);
        await applyThemeClass(page, theme);
        await waitForVisualStability(page);

        const exportButton = page.locator('[data-testid="export-button"], button:has-text("Export")').first();
        const exists = await exportButton.isVisible().catch(() => false);

        if (exists) {
          await exportButton.click();
          const modal = page.locator('[data-testid="export-modal"], [role="dialog"]');
          await expect(modal).toBeVisible({ timeout: 5000 });
          await page.waitForTimeout(500);

          await expect(modal).toHaveScreenshot(`export-modal-${theme}.png`, {
            maxDiffPixelRatio: 0.003,
          });
        }
      });
    }
  });
});

test.describe('Dark Mode Visual Regression - Chart Components', () => {
  for (const theme of THEMES) {
    test(`Charts in dashboard - ${theme} mode`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await setTheme(page, theme);
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', COMPANY_ID);
      await waitForLoadingComplete(page);
      await applyThemeClass(page, theme);

      // Wait longer for charts to render
      await waitForVisualStability(page, 3000);

      const chart = page.locator('canvas, [data-chart-type], .chart').first();
      const exists = await chart.isVisible().catch(() => false);

      if (exists) {
        await expect(chart).toHaveScreenshot(`chart-${theme}.png`, {
          maxDiffPixelRatio: 0.005, // Slightly higher threshold for dynamic charts
        });
      }
    });
  }
});

test.describe('Dark Mode Visual Regression - Empty States', () => {
  for (const theme of THEMES) {
    test(`Empty Evidence State - ${theme} mode`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await setTheme(page, theme);
      await mockSession(page, TEST_USERS.ADMIN);

      // Mock empty response
      await page.route('**/api/evidence/**', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }));

      await navigateToCockpit(page, 'en', COMPANY_ID, '/evidence');
      await waitForLoadingComplete(page);
      await applyThemeClass(page, theme);
      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot(`empty-evidence-${theme}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.003,
      });
    });
  }
});

test.describe('Dark Mode Visual Regression - Error States', () => {
  for (const theme of THEMES) {
    test(`404 Page - ${theme} mode`, async ({ page }) => {
      await page.setViewportSize(VIEWPORTS.DESKTOP);
      await setTheme(page, theme);
      await mockSession(page, TEST_USERS.ADMIN);
      await page.goto(`/en/cockpit/${COMPANY_ID}/nonexistent-page-vrt-test`);
      await page.waitForLoadState('networkidle');

      // Apply theme even on error pages
      await page.evaluate((t: Theme) => {
        document.documentElement.classList.remove('light', 'dark');
        document.documentElement.classList.add(t);
      }, theme);

      await waitForVisualStability(page);

      await expect(page).toHaveScreenshot(`404-page-${theme}.png`, {
        fullPage: true,
        maxDiffPixelRatio: 0.003,
      });
    });
  }
});
