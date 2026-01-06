/**
 * Visual Regression E2E Tests
 *
 * Tests cover:
 * - Screenshot comparison
 * - Layout consistency
 * - Responsive design verification
 * - Theme consistency
 * - Component visual testing
 * - Cross-browser visual consistency
 */

import { test, expect } from '@playwright/test';
import {
  mockSession,
  navigateToCockpit,
  TEST_USERS,
  TEST_COMPANIES,
  waitForLoadingComplete,
} from './helpers';

test.describe('Visual Regression', () => {
  test.describe('Dashboard Screenshots', () => {
    test('should match dashboard snapshot (desktop)', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Wait for dynamic content to settle
      await page.waitForTimeout(1000);

      // Take screenshot and compare
      await expect(page).toHaveScreenshot('dashboard-desktop.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });

    test('should match dashboard snapshot (tablet)', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('dashboard-tablet.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });

    test('should match dashboard snapshot (mobile)', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('dashboard-mobile.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('Evidence Page Screenshots', () => {
    test('should match evidence page snapshot', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);

      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('evidence-page.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });

    test('should match evidence detail drawer snapshot', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);

      // Open first evidence card
      const evidenceCard = page.locator('[data-testid="evidence-card"], .evidence-card').first();
      const cardExists = await evidenceCard.isVisible().catch(() => false);

      if (cardExists) {
        await evidenceCard.click();

        const drawer = page.locator('[data-testid="evidence-drawer"], .drawer');
        await expect(drawer).toBeVisible({ timeout: 5000 });

        await page.waitForTimeout(500);

        await expect(page).toHaveScreenshot('evidence-drawer.png', {
          maxDiffPixels: 100,
        });
      }
    });
  });

  test.describe('Component Visual Testing', () => {
    test('should match KPI card component', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const kpiCard = page.locator('[data-testid="kpi-card"], .kpi-card, .metric-card').first();
      const cardExists = await kpiCard.isVisible().catch(() => false);

      if (cardExists) {
        await expect(kpiCard).toHaveScreenshot('kpi-card.png', {
          maxDiffPixels: 50,
        });
      }
    });

    test('should match navigation menu', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const nav = page.locator('nav, [role="navigation"]').first();
      const navExists = await nav.isVisible().catch(() => false);

      if (navExists) {
        await expect(nav).toHaveScreenshot('navigation.png', {
          maxDiffPixels: 50,
        });
      }
    });

    test('should match SROI widget', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const sroiWidget = page.locator('[data-testid="sroi-panel"], .sroi-panel').first();
      const widgetExists = await sroiWidget.isVisible().catch(() => false);

      if (widgetExists) {
        await expect(sroiWidget).toHaveScreenshot('sroi-widget.png', {
          maxDiffPixels: 50,
        });
      }
    });

    test('should match VIS widget', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const visWidget = page.locator('[data-testid="vis-panel"], .vis-panel').first();
      const widgetExists = await visWidget.isVisible().catch(() => false);

      if (widgetExists) {
        await expect(visWidget).toHaveScreenshot('vis-widget.png', {
          maxDiffPixels: 50,
        });
      }
    });
  });

  test.describe('Admin Console Screenshots', () => {
    test('should match admin console snapshot', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/admin');
      await waitForLoadingComplete(page);

      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('admin-console.png', {
        fullPage: true,
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('Multi-Language Visual Consistency', () => {
    test('should match Norwegian version visually', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'no', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('dashboard-norwegian.png', {
        fullPage: true,
        maxDiffPixels: 150, // Allow more diff due to text length changes
      });
    });

    test('should match Ukrainian version visually', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 });
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'uk', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      await page.waitForTimeout(1000);

      await expect(page).toHaveScreenshot('dashboard-ukrainian.png', {
        fullPage: true,
        maxDiffPixels: 150,
      });
    });
  });

  test.describe('Theme Consistency', () => {
    test('should maintain consistent styling across pages', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);

      // Dashboard
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const dashboardStyles = await page.evaluate(() => {
        const styles = window.getComputedStyle(document.body);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          fontFamily: styles.fontFamily,
        };
      });

      // Evidence page
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);

      const evidenceStyles = await page.evaluate(() => {
        const styles = window.getComputedStyle(document.body);
        return {
          backgroundColor: styles.backgroundColor,
          color: styles.color,
          fontFamily: styles.fontFamily,
        };
      });

      // Styles should be consistent
      expect(dashboardStyles.backgroundColor).toBe(evidenceStyles.backgroundColor);
      expect(dashboardStyles.fontFamily).toBe(evidenceStyles.fontFamily);
    });

    test('should use consistent color palette', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const colors = await page.evaluate(() => {
        const root = document.documentElement;
        const styles = window.getComputedStyle(root);

        return {
          primary: styles.getPropertyValue('--color-primary') || 'not-set',
          secondary: styles.getPropertyValue('--color-secondary') || 'not-set',
          background: styles.getPropertyValue('--color-background') || 'not-set',
        };
      });

      // Should have CSS variables defined
      expect(colors.primary).not.toBe('not-set');
    });
  });

  test.describe('Responsive Layout Verification', () => {
    const viewports = [
      { name: 'mobile-portrait', width: 375, height: 667 },
      { name: 'mobile-landscape', width: 667, height: 375 },
      { name: 'tablet-portrait', width: 768, height: 1024 },
      { name: 'tablet-landscape', width: 1024, height: 768 },
      { name: 'desktop', width: 1920, height: 1080 },
      { name: 'large-desktop', width: 2560, height: 1440 },
    ];

    for (const viewport of viewports) {
      test(`should render correctly at ${viewport.name} (${viewport.width}x${viewport.height})`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await mockSession(page, TEST_USERS.ADMIN);
        await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
        await waitForLoadingComplete(page);

        await page.waitForTimeout(1000);

        // Check for layout issues
        const hasHorizontalScroll = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth;
        });

        // Horizontal scroll should be minimal or controlled
        expect(hasHorizontalScroll).toBe(false);

        // Take screenshot for visual comparison
        await expect(page).toHaveScreenshot(`layout-${viewport.name}.png`, {
          fullPage: false,
          maxDiffPixels: 100,
        });
      });
    }
  });

  test.describe('Loading States Visual', () => {
    test('should show consistent loading indicators', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);

      // Slow down network to capture loading state
      await page.route('**/api/**', route => {
        setTimeout(() => route.continue(), 2000);
      });

      const navigationPromise = navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);

      // Wait a bit to capture loading state
      await page.waitForTimeout(500);

      const loadingIndicator = page.locator('[data-testid="loading"], .loading, .spinner');
      const isLoading = await loadingIndicator.isVisible().catch(() => false);

      if (isLoading) {
        await expect(loadingIndicator).toHaveScreenshot('loading-state.png', {
          maxDiffPixels: 50,
        });
      }

      await navigationPromise;
    });
  });

  test.describe('Empty States Visual', () => {
    test('should display consistent empty state', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);

      // Mock empty response
      await page.route('**/api/evidence/**', route => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([]),
      }));

      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);

      const emptyState = page.locator('[data-testid="empty-state"], .empty-state');
      const hasEmptyState = await emptyState.isVisible().catch(() => false);

      if (hasEmptyState) {
        await expect(emptyState).toHaveScreenshot('empty-state.png', {
          maxDiffPixels: 50,
        });
      }
    });
  });

  test.describe('Error States Visual', () => {
    test('should display consistent error state', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);

      // Mock error response
      await page.route('**/api/metrics/**', route => route.abort());

      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);

      const errorState = page.locator('[role="alert"], .error, .error-message');
      const hasError = await errorState.isVisible({ timeout: 5000 }).catch(() => false);

      if (hasError) {
        await expect(errorState).toHaveScreenshot('error-state.png', {
          maxDiffPixels: 50,
        });
      }
    });
  });
});
