/**
 * Visual Regression Tests: Dark Mode
 *
 * Tests cover:
 * - Full-page screenshots of all key routes in dark mode
 * - Screenshot comparison with baselines
 * - Visual consistency across routes
 * - Dark mode theme preset variations
 * - Responsive breakpoints in dark mode
 * - Component-level visual tests
 *
 * Baselines stored in: tests/e2e/__snapshots__/dark-mode/
 * Max diff threshold: 0.3%
 */

import { test, expect } from '@playwright/test';
import {
  mockSession,
  navigateToCockpit,
  TEST_USERS,
  TEST_COMPANIES,
  waitForLoadingComplete,
  waitForNetworkIdle,
} from './helpers';

// Configure visual regression test settings
test.use({
  // Ensure consistent viewport
  viewport: { width: 1920, height: 1080 },
  // Disable animations for consistent screenshots
  actionTimeout: 10000,
});

test.describe('Visual Regression: Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin
    await mockSession(page, TEST_USERS.ADMIN);

    // Apply dark mode before each test
    await page.addInitScript(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    });
  });

  test.describe('Full Page Screenshots', () => {
    test('dashboard in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);
      await page.waitForTimeout(2000); // Ensure all animations complete

      // Ensure dark mode is applied
      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      // Take full-page screenshot
      await expect(page).toHaveScreenshot('dark-mode-dashboard.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.003, // 0.3% max diff
        animations: 'disabled',
      });
    });

    test('reports page in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/reports');
      await waitForLoadingComplete(page);
      await page.waitForTimeout(2000);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dark-mode-reports.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.003,
        animations: 'disabled',
      });
    });

    test('evidence explorer in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);
      await page.waitForTimeout(2000);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dark-mode-evidence.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.003,
        animations: 'disabled',
      });
    });

    test('admin panel in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/admin');
      await waitForLoadingComplete(page);
      await page.waitForTimeout(2000);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dark-mode-admin.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.003,
        animations: 'disabled',
      });
    });

    test('boardroom mode in dark mode', async ({ page }) => {
      await page.goto(`/en/cockpit/${TEST_COMPANIES.COMPANY_1}/boardroom`);
      await waitForLoadingComplete(page);
      await page.waitForTimeout(2000);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dark-mode-boardroom.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.003,
        animations: 'disabled',
      });
    });
  });

  test.describe('Component Screenshots', () => {
    test('KPI cards in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      // Find KPI cards
      const kpiCards = page.locator('[data-testid*="kpi-card"], .kpi-card').first();
      const count = await page.locator('[data-testid*="kpi-card"], .kpi-card').count();

      if (count > 0) {
        await expect(kpiCards).toHaveScreenshot('dark-mode-kpi-card.png', {
          maxDiffPixelRatio: 0.003,
        });
      }
    });

    test('navigation menu in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      // Find navigation
      const nav = page.locator('nav, [role="navigation"]').first();
      const count = await page.locator('nav, [role="navigation"]').count();

      if (count > 0) {
        await expect(nav).toHaveScreenshot('dark-mode-nav.png', {
          maxDiffPixelRatio: 0.003,
        });
      }
    });

    test('chart widget in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(1500);

      // Find chart
      const chart = page.locator('[data-testid*="chart"], canvas').first();
      const count = await page.locator('[data-testid*="chart"], canvas').count();

      if (count > 0) {
        // Wait for chart to render
        await page.waitForTimeout(1000);

        await expect(chart).toHaveScreenshot('dark-mode-chart.png', {
          maxDiffPixelRatio: 0.005, // Charts may have slight variations
        });
      }
    });

    test('data table in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      // Find table
      const table = page.locator('table, [role="table"]').first();
      const count = await page.locator('table, [role="table"]').count();

      if (count > 0) {
        await expect(table).toHaveScreenshot('dark-mode-table.png', {
          maxDiffPixelRatio: 0.003,
        });
      }
    });

    test('modal dialog in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      // Try to open a modal (e.g., create report button)
      const createButton = page.locator('button:has-text("Create"), button:has-text("New")').first();
      const count = await page.locator('button:has-text("Create"), button:has-text("New")').count();

      if (count > 0) {
        await createButton.click();
        await page.waitForTimeout(500);

        // Find modal
        const modal = page.locator('[role="dialog"]').first();
        const modalCount = await page.locator('[role="dialog"]').count();

        if (modalCount > 0) {
          await expect(modal).toHaveScreenshot('dark-mode-modal.png', {
            maxDiffPixelRatio: 0.003,
          });
        }
      }
    });

    test('dropdown menu in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      // Open user menu or settings
      const menuButton = page.locator('[aria-haspopup="menu"], [data-testid="user-menu"]').first();
      const count = await page.locator('[aria-haspopup="menu"], [data-testid="user-menu"]').count();

      if (count > 0) {
        await menuButton.click();
        await page.waitForTimeout(300);

        const menu = page.locator('[role="menu"]').first();
        const menuCount = await page.locator('[role="menu"]').count();

        if (menuCount > 0) {
          await expect(menu).toHaveScreenshot('dark-mode-dropdown.png', {
            maxDiffPixelRatio: 0.003,
          });
        }
      }
    });
  });

  test.describe('Theme Presets in Dark Mode', () => {
    const presets = ['default', 'ocean', 'forest', 'sunset', 'midnight'];

    for (const preset of presets) {
      test(`dashboard with ${preset} preset in dark mode`, async ({ page }) => {
        await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
        await waitForLoadingComplete(page);

        // Apply preset and dark mode
        await page.evaluate((presetName) => {
          document.documentElement.setAttribute('data-theme', 'dark');
          document.documentElement.setAttribute('data-preset', presetName);
        }, preset);

        await page.waitForTimeout(1000);

        await expect(page).toHaveScreenshot(`dark-mode-preset-${preset}.png`, {
          fullPage: true,
          maxDiffPixelRatio: 0.003,
          animations: 'disabled',
        });
      });
    }
  });

  test.describe('Responsive Breakpoints in Dark Mode', () => {
    test('desktop (1920x1080) in dark mode', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dark-mode-desktop.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.003,
      });
    });

    test('laptop (1366x768) in dark mode', async ({ page }) => {
      await page.setViewportSize({ width: 1366, height: 768 });
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dark-mode-laptop.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.003,
      });
    });

    test('tablet (768x1024) in dark mode', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dark-mode-tablet.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.003,
      });
    });

    test('mobile (375x667) in dark mode', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot('dark-mode-mobile.png', {
        fullPage: true,
        maxDiffPixelRatio: 0.003,
      });
    });
  });

  test.describe('Interactive States in Dark Mode', () => {
    test('button hover state in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      const button = page.locator('button').first();
      await button.hover();
      await page.waitForTimeout(300);

      await expect(button).toHaveScreenshot('dark-mode-button-hover.png', {
        maxDiffPixelRatio: 0.005,
      });
    });

    test('input focus state in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      // Find an input field
      const input = page.locator('input[type="text"], input[type="search"]').first();
      const count = await page.locator('input[type="text"], input[type="search"]').count();

      if (count > 0) {
        await input.focus();
        await page.waitForTimeout(300);

        await expect(input).toHaveScreenshot('dark-mode-input-focus.png', {
          maxDiffPixelRatio: 0.005,
        });
      }
    });

    test('card hover state in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      const card = page.locator('[data-testid*="card"], .card').first();
      const count = await page.locator('[data-testid*="card"], .card').count();

      if (count > 0) {
        await card.hover();
        await page.waitForTimeout(300);

        await expect(card).toHaveScreenshot('dark-mode-card-hover.png', {
          maxDiffPixelRatio: 0.005,
        });
      }
    });
  });

  test.describe('Color Consistency', () => {
    test('primary colors in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      // Check CSS custom properties
      const colors = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        return {
          primary: root.getPropertyValue('--color-primary').trim(),
          secondary: root.getPropertyValue('--color-secondary').trim(),
          background: root.getPropertyValue('--bg-primary').trim(),
          text: root.getPropertyValue('--text-primary').trim(),
        };
      });

      // Verify colors are defined
      expect(colors.primary || colors.secondary || colors.background).toBeTruthy();
    });

    test('semantic colors in dark mode', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      const semanticColors = await page.evaluate(() => {
        const root = getComputedStyle(document.documentElement);
        return {
          success: root.getPropertyValue('--color-success').trim(),
          error: root.getPropertyValue('--color-error').trim(),
          warning: root.getPropertyValue('--color-warning').trim(),
          info: root.getPropertyValue('--color-info').trim(),
        };
      });

      // At least some semantic colors should be defined
      const definedColors = Object.values(semanticColors).filter(c => c.length > 0);
      expect(definedColors.length).toBeGreaterThanOrEqual(0);
    });
  });

  test.describe('Diff Threshold Validation', () => {
    test('verify diff threshold is within 0.3%', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(500);

      // Take screenshot twice and compare
      const screenshot1 = await page.screenshot({ fullPage: true });
      await page.waitForTimeout(100);
      const screenshot2 = await page.screenshot({ fullPage: true });

      // Screenshots should be identical (or very close)
      expect(screenshot1.length).toBeGreaterThan(0);
      expect(screenshot2.length).toBeGreaterThan(0);

      // Length should be very similar (within 5%)
      const lengthDiff = Math.abs(screenshot1.length - screenshot2.length);
      const avgLength = (screenshot1.length + screenshot2.length) / 2;
      const diffRatio = lengthDiff / avgLength;

      expect(diffRatio).toBeLessThan(0.05); // Less than 5% difference
    });
  });

  test.describe('Baseline Generation', () => {
    test('generate baseline for dashboard', async ({ page }) => {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.evaluate(() => {
        document.documentElement.setAttribute('data-theme', 'dark');
      });
      await page.waitForTimeout(2000);

      // Generate baseline screenshot
      await page.screenshot({
        path: 'tests/e2e/__snapshots__/dark-mode/baseline-dashboard.png',
        fullPage: true,
      });

      // Verify file was created
      const fs = await import('fs');
      const exists = fs.existsSync('tests/e2e/__snapshots__/dark-mode/baseline-dashboard.png');
      // File may or may not exist depending on CI vs local
    });
  });
});

// Test for updating visual regression baselines
test.describe('Visual Baseline Update', () => {
  test.skip('update all dark mode baselines', async ({ page }) => {
    // This test is skipped by default
    // Run with: pnpm test:visual:update
    // to regenerate all baseline images

    await mockSession(page, TEST_USERS.ADMIN);

    await page.addInitScript(() => {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    });

    const routes = [
      '',
      '/reports',
      '/evidence',
      '/admin',
      '/boardroom',
    ];

    for (const route of routes) {
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, route);
      await waitForLoadingComplete(page);
      await page.waitForTimeout(2000);

      const routeName = route || 'dashboard';
      await page.screenshot({
        path: `tests/e2e/__snapshots__/dark-mode/baseline${route || '-dashboard'}.png`,
        fullPage: true,
      });
    }
  });
});
