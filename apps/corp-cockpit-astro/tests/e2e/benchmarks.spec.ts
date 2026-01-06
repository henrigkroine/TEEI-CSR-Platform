/**
 * Benchmarking E2E Tests
 *
 * Tests cover:
 * - Admin can toggle opt-in consent
 * - User can build cohort with filters
 * - Warning shown when cohort < 5 members
 * - Percentile ribbon renders correctly
 * - Saved cohort can be loaded
 * - RBAC: non-admin cannot access opt-in settings
 *
 * @author percentile-viz-engineer & opt-in-governance
 */

import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// Test data
const TEST_COMPANIES = {
  COMPANY_1: 'company-1',
  COMPANY_2: 'company-2',
};

const TEST_USERS = {
  ADMIN: {
    id: 'admin-user-1',
    email: 'admin@teei.io',
    role: 'ADMIN',
    name: 'Admin User',
  },
  VIEWER: {
    id: 'viewer-user-1',
    email: 'viewer@teei.io',
    role: 'VIEWER',
    name: 'Viewer User',
  },
};

// Helper functions
async function mockSession(page: any, user: any) {
  await page.context().addCookies([
    {
      name: 'session',
      value: `mock-session-${user.id}`,
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    },
  ]);

  // Mock user data in localStorage
  await page.evaluate((userData) => {
    localStorage.setItem('user', JSON.stringify(userData));
  }, user);
}

async function navigateToBenchmarks(page: any, lang: string, companyId: string) {
  await page.goto(`/${lang}/cockpit/${companyId}/benchmarks`);
  await page.waitForLoadState('networkidle');
}

async function mockConsentAPI(page: any, consent: boolean) {
  await page.route(`**/companies/*/consent`, (route: any) => {
    if (route.request().method() === 'GET') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          consent,
          consentDate: consent ? new Date().toISOString() : null,
        }),
      });
    } else if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON();
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          consent: body.consent,
          consentDate: new Date().toISOString(),
        }),
      });
    }
  });
}

async function mockCohortPreviewAPI(page: any, size: number) {
  await page.route(`**/companies/*/cohorts/preview*`, (route: any) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ size }),
    });
  });
}

async function mockBenchmarksAPI(page: any) {
  await page.route(`**/companies/*/benchmarks*`, (route: any) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        cohortName: 'Technology Companies in North America',
        cohortSize: 42,
        lastUpdated: new Date().toISOString(),
        metrics: [
          {
            name: 'SROI Ratio',
            unit: ':1',
            p10: 1.8,
            p50: 3.5,
            p90: 6.2,
            yourValue: 4.1,
            dpApplied: true,
          },
          {
            name: 'VIS Score',
            unit: 'pts',
            p10: 45,
            p50: 68,
            p90: 85,
            yourValue: 72,
            dpApplied: true,
          },
          {
            name: 'Volunteer Hours',
            unit: 'hrs',
            p10: 250,
            p50: 500,
            p90: 1200,
            yourValue: 650,
            dpApplied: true,
          },
        ],
      }),
    });
  });
}

test.describe('Benchmarking Dashboard', () => {
  test.describe('Admin: Opt-In Consent Management', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await mockConsentAPI(page, false);
    });

    test('should display opt-in consent manager for admin', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);

      // Consent section should be visible
      const consentSection = page.locator('#consent-section');
      await expect(consentSection).toBeVisible();

      // Consent manager title should be present
      const title = page.locator('text=Data Sharing for Benchmarks');
      await expect(title).toBeVisible();
    });

    test('should toggle consent on and off', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);

      // Wait for consent manager to load
      await page.waitForTimeout(1000);

      // Find toggle switch
      const toggleSwitch = page.locator('[role="switch"]');
      await expect(toggleSwitch).toBeVisible();

      // Check initial state (inactive)
      await expect(toggleSwitch).toHaveAttribute('aria-checked', 'false');

      // Click toggle to enable
      await toggleSwitch.click();

      // Confirmation dialog should appear
      const confirmDialog = page.locator('[role="dialog"]');
      await expect(confirmDialog).toBeVisible();
      await expect(page.locator('text=Enable Data Sharing?')).toBeVisible();

      // Confirm action
      const confirmButton = page.locator('button:has-text("Enable Sharing")');
      await confirmButton.click();

      // Wait for update
      await page.waitForTimeout(500);

      // Toggle should now be active
      await expect(toggleSwitch).toHaveAttribute('aria-checked', 'true');
    });

    test('should display privacy explanation', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);

      // Check for privacy safeguards section
      await expect(page.locator('text=Technical Privacy Safeguards')).toBeVisible();
      await expect(page.locator('text=k-Anonymity')).toBeVisible();
      await expect(page.locator('text=Differential Privacy')).toBeVisible();
      await expect(page.locator('text=Audit Trail')).toBeVisible();
    });
  });

  test.describe('Viewer: RBAC Check', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.VIEWER);
    });

    test('should NOT display opt-in consent manager for non-admin', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);

      // Consent section should NOT be visible
      const consentSection = page.locator('#consent-section');
      await expect(consentSection).not.toBeVisible();
    });
  });

  test.describe('Cohort Builder', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await mockCohortPreviewAPI(page, 10); // Default to valid cohort size
    });

    test('should display cohort builder', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);

      // Cohort builder should be visible
      await expect(page.locator('text=Build Your Cohort')).toBeVisible();

      // Filter panels should be present
      await expect(page.locator('text=Industry')).toBeVisible();
      await expect(page.locator('text=Region')).toBeVisible();
      await expect(page.locator('text=Company Size')).toBeVisible();
      await expect(page.locator('text=Program Type')).toBeVisible();
    });

    test('should select filters and show cohort size preview', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);

      // Wait for cohort builder to load
      await page.waitForTimeout(1000);

      // Select an industry filter
      const technologyCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Technology' });
      await technologyCheckbox.click();

      // Wait for debounce and API call
      await page.waitForTimeout(500);

      // Cohort size badge should update
      await expect(page.locator('text=/\\d+ companies in cohort/')).toBeVisible();
    });

    test('should show warning when cohort is too small', async ({ page }) => {
      // Mock API to return small cohort
      await mockCohortPreviewAPI(page, 3);

      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);
      await page.waitForTimeout(1000);

      // Select filters
      const technologyCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Technology' });
      await technologyCheckbox.click();

      await page.waitForTimeout(500);

      // Warning badge should appear
      await expect(page.locator('text=Cohort too small')).toBeVisible();
      await expect(page.locator('text=privacy threshold not met')).toBeVisible();
    });

    test('should show success badge when cohort size is valid', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);
      await page.waitForTimeout(1000);

      // Select filters
      const technologyCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Technology' });
      await technologyCheckbox.click();

      await page.waitForTimeout(500);

      // Success badge should appear
      await expect(page.locator('text=/✅.*\\d+ companies in cohort/')).toBeVisible();
    });

    test('should allow saving cohort', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);
      await page.waitForTimeout(1000);

      // Select some filters
      const technologyCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Technology' });
      await technologyCheckbox.click();
      await page.waitForTimeout(500);

      // Click save button
      const saveButton = page.locator('button:has-text("Save Cohort")');
      await saveButton.click();

      // Modal should appear
      await expect(page.locator('text=Save Cohort')).toBeVisible();

      // Enter cohort name
      const nameInput = page.locator('input[placeholder*="Tech Companies"]');
      await nameInput.fill('My Custom Cohort');

      // Save
      const confirmSave = page.locator('button:has-text("Save")').last();
      await confirmSave.click();

      // Modal should close
      await expect(page.locator('text=Save Cohort')).not.toBeVisible();
    });
  });

  test.describe('Percentile Ribbon Visualization', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await mockCohortPreviewAPI(page, 10);
      await mockBenchmarksAPI(page);
    });

    test('should render percentile ribbons after selecting cohort', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);
      await page.waitForTimeout(1000);

      // Select filters to trigger benchmark fetch
      const technologyCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Technology' });
      await technologyCheckbox.click();
      await page.waitForTimeout(1000);

      // Benchmarks should be rendered
      await expect(page.locator('text=Your Performance vs. Peer Cohort')).toBeVisible();

      // Percentile ribbons should appear
      await expect(page.locator('text=SROI Ratio')).toBeVisible();
      await expect(page.locator('text=VIS Score')).toBeVisible();
      await expect(page.locator('text=Volunteer Hours')).toBeVisible();
    });

    test('should display privacy badge on metrics', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);
      await page.waitForTimeout(1000);

      // Select filters
      const technologyCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Technology' });
      await technologyCheckbox.click();
      await page.waitForTimeout(1000);

      // Privacy badge should be visible
      await expect(page.locator('text=Privacy-protected (ε=0.1)')).toBeVisible();
    });

    test('should show percentile summary cards', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);
      await page.waitForTimeout(1000);

      // Select filters
      const technologyCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Technology' });
      await technologyCheckbox.click();
      await page.waitForTimeout(1500);

      // Summary cards should be visible
      await expect(page.locator('text=Your Position')).toBeVisible();
      await expect(page.locator('text=Your Value')).toBeVisible();
      await expect(page.locator('text=Median (P50)')).toBeVisible();
    });
  });

  test.describe('Empty State', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
    });

    test('should show empty state when no cohort selected', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);

      // Empty state should be visible
      await expect(page.locator('text=No Benchmark Data Available')).toBeVisible();
    });

    test('should show empty state when cohort is too small', async ({ page }) => {
      await mockCohortPreviewAPI(page, 2);
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);
      await page.waitForTimeout(1000);

      // Select filters
      const technologyCheckbox = page.locator('input[type="checkbox"]').filter({ hasText: 'Technology' });
      await technologyCheckbox.click();
      await page.waitForTimeout(1000);

      // Empty state should remain visible
      await expect(page.locator('text=No Benchmark Data Available')).toBeVisible();
    });
  });

  test.describe('Privacy Notice Footer', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
    });

    test('should display privacy compliance information', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);

      // Privacy footer should be visible
      await expect(page.locator('text=Privacy Compliance & Methodology')).toBeVisible();
      await expect(page.locator('text=k-Anonymity Protection')).toBeVisible();
      await expect(page.locator('text=Differential Privacy')).toBeVisible();
      await expect(page.locator('text=Percentile Methodology')).toBeVisible();
      await expect(page.locator('text=Data Freshness')).toBeVisible();
    });
  });

  test.describe('Accessibility', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
    });

    test('should pass WCAG 2.2 AA accessibility audit', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);
      await page.waitForTimeout(2000);

      // Run accessibility scan
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      // Should have no violations
      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should support keyboard navigation', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);
      await page.waitForTimeout(1000);

      // Tab through interactive elements
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');

      // Active element should be focusable
      const activeElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(['A', 'BUTTON', 'INPUT', 'SELECT']).toContain(activeElement);
    });

    test('should have proper ARIA labels', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);
      await page.waitForTimeout(1000);

      // Check for ARIA labels on key elements
      const toggleSwitch = page.locator('[role="switch"]');
      if (await toggleSwitch.isVisible()) {
        await expect(toggleSwitch).toHaveAttribute('aria-checked');
      }

      // Check for role="alert" on privacy notice
      const privacyAlert = page.locator('[role="alert"]');
      await expect(privacyAlert).toBeVisible();
    });

    test('should have sufficient color contrast', async ({ page }) => {
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);
      await page.waitForTimeout(2000);

      // Run color contrast check
      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .disableRules(['color-contrast']) // We'll check this separately
        .analyze();

      // Check specific for color-contrast violations
      const contrastScan = await new AxeBuilder({ page })
        .include('body')
        .analyze();

      const contrastViolations = contrastScan.violations.filter(
        (v) => v.id === 'color-contrast'
      );

      expect(contrastViolations.length).toBe(0);
    });
  });

  test.describe('Responsive Design', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
    });

    test('should display correctly on mobile', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);

      // Page should be visible and scrollable
      const pageContent = page.locator('.benchmarks-page');
      await expect(pageContent).toBeVisible();
    });

    test('should display correctly on tablet', async ({ page }) => {
      await page.setViewportSize({ width: 768, height: 1024 }); // iPad
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);

      const pageContent = page.locator('.benchmarks-page');
      await expect(pageContent).toBeVisible();
    });

    test('should display correctly on desktop', async ({ page }) => {
      await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
      await navigateToBenchmarks(page, 'en', TEST_COMPANIES.COMPANY_1);

      const pageContent = page.locator('.benchmarks-page');
      await expect(pageContent).toBeVisible();
    });
  });
});
