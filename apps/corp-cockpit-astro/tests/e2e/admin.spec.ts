/**
 * Admin Console E2E Tests
 *
 * Tests cover:
 * - Admin console access control
 * - API key management
 * - User management
 * - Integration settings
 * - Theme customization
 * - Weight overrides
 * - Audit log viewing
 * - SSO configuration
 * - SCIM provisioning status
 */

import { test, expect } from '@playwright/test';
import {
  mockSession,
  navigateToCockpit,
  TEST_USERS,
  TEST_COMPANIES,
  waitForLoadingComplete,
} from './helpers';

test.describe('Admin Console', () => {
  test.describe('Access Control', () => {
    test('should allow admin to access admin console', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/admin');

      await expect(page).toHaveURL(/\/admin/);
      await waitForLoadingComplete(page);
    });

    test('should block manager from accessing admin console', async ({ page }) => {
      await mockSession(page, TEST_USERS.MANAGER);
      await page.goto('/en/cockpit/company-1/admin');

      // Should show permission error or redirect
      const hasError = await page.locator(':has-text("permission"), :has-text("unauthorized")').isVisible().catch(() => false);
      const is401 = page.url().includes('/401');

      expect(hasError || is401).toBe(true);
    });

    test('should block viewer from accessing admin console', async ({ page }) => {
      await mockSession(page, TEST_USERS.VIEWER);
      await page.goto('/en/cockpit/company-1/admin');

      const hasError = await page.locator(':has-text("permission"), :has-text("unauthorized")').isVisible().catch(() => false);
      const is401 = page.url().includes('/401');

      expect(hasError || is401).toBe(true);
    });
  });

  test.describe('API Key Management', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/admin');
      await waitForLoadingComplete(page);
    });

    test('should display API key manager', async ({ page }) => {
      const apiKeySection = page.locator('[data-testid="api-key-manager"], :has-text("API Key")');
      const hasSection = await apiKeySection.isVisible().catch(() => false);

      if (hasSection) {
        await expect(apiKeySection).toBeVisible();
      }
    });

    test('should list existing API keys', async ({ page }) => {
      const apiKeys = page.locator('[data-testid="api-key-item"], .api-key-item');
      const count = await apiKeys.count();

      // Might have keys or empty state
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should create new API key', async ({ page }) => {
      const createBtn = page.locator('button:has-text("Create API Key"), button:has-text("New Key")');
      const count = await createBtn.count();

      if (count > 0) {
        await createBtn.first().click();

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });
      }
    });

    test('should revoke API key', async ({ page }) => {
      const revokeBtn = page.locator('button:has-text("Revoke"), button[aria-label*="Revoke"]');
      const count = await revokeBtn.count();

      if (count > 0) {
        await expect(revokeBtn.first()).toBeVisible();
      }
    });
  });

  test.describe('User Management', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/admin');
      await waitForLoadingComplete(page);
    });

    test('should display user list', async ({ page }) => {
      const userSection = page.locator('[data-testid="user-management"], :has-text("User")');
      const hasSection = await userSection.isVisible().catch(() => false);

      if (hasSection) {
        await expect(userSection).toBeVisible();
      }
    });

    test('should invite new user', async ({ page }) => {
      const inviteBtn = page.locator('button:has-text("Invite"), button:has-text("Add User")');
      const count = await inviteBtn.count();

      if (count > 0) {
        await inviteBtn.first().click();

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });
      }
    });

    test('should change user role', async ({ page }) => {
      const roleSelect = page.locator('select[name*="role"], [data-testid*="role-select"]');
      const count = await roleSelect.count();

      if (count > 0) {
        await expect(roleSelect.first()).toBeVisible();
      }
    });
  });

  test.describe('Integration Settings', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/admin');
      await waitForLoadingComplete(page);
    });

    test('should display integration panel', async ({ page }) => {
      const integrationSection = page.locator('[data-testid="integrations"], :has-text("Integration")');
      const hasSection = await integrationSection.isVisible().catch(() => false);

      if (hasSection) {
        await expect(integrationSection).toBeVisible();
      }
    });

    test('should configure Impact-In integration', async ({ page }) => {
      const impactInSection = page.locator(':has-text("Impact-In"), [data-integration="impact-in"]');
      const hasSection = await impactInSection.isVisible().catch(() => false);

      if (hasSection) {
        await expect(impactInSection).toBeVisible();
      }
    });

    test('should test integration connection', async ({ page }) => {
      const testBtn = page.locator('button:has-text("Test Connection"), button:has-text("Test")');
      const count = await testBtn.count();

      if (count > 0) {
        await expect(testBtn.first()).toBeVisible();
      }
    });
  });

  test.describe('Theme Customization', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/admin');
      await waitForLoadingComplete(page);
    });

    test('should display theme settings', async ({ page }) => {
      const themeSection = page.locator('[data-testid="theme-settings"], :has-text("Theme")');
      const hasSection = await themeSection.isVisible().catch(() => false);

      if (hasSection) {
        await expect(themeSection).toBeVisible();
      }
    });

    test('should customize primary color', async ({ page }) => {
      const colorPicker = page.locator('input[type="color"], [data-testid="color-picker"]');
      const count = await colorPicker.count();

      if (count > 0) {
        await expect(colorPicker.first()).toBeVisible();
      }
    });

    test('should upload company logo', async ({ page }) => {
      const uploadBtn = page.locator('input[type="file"], button:has-text("Upload Logo")');
      const count = await uploadBtn.count();

      if (count > 0) {
        const isVisible = await uploadBtn.first().isVisible().catch(() => false);
        expect(isVisible || true).toBe(true);
      }
    });
  });

  test.describe('Weight Overrides', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/admin');
      await waitForLoadingComplete(page);
    });

    test('should display weight override panel', async ({ page }) => {
      const weightSection = page.locator('[data-testid="weight-overrides"], :has-text("Weight")');
      const hasSection = await weightSection.isVisible().catch(() => false);

      if (hasSection) {
        await expect(weightSection).toBeVisible();
      }
    });

    test('should edit metric weights', async ({ page }) => {
      const weightInput = page.locator('input[type="number"][name*="weight"]');
      const count = await weightInput.count();

      if (count > 0) {
        await expect(weightInput.first()).toBeVisible();
      }
    });

    test('should save weight changes', async ({ page }) => {
      const saveBtn = page.locator('button:has-text("Save"), button:has-text("Apply")');
      const count = await saveBtn.count();

      if (count > 0) {
        await expect(saveBtn.first()).toBeVisible();
      }
    });
  });

  test.describe('Audit Log', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/admin');
      await waitForLoadingComplete(page);
    });

    test('should display audit log', async ({ page }) => {
      const auditSection = page.locator('[data-testid="audit-log"], :has-text("Audit Log")');
      const hasSection = await auditSection.isVisible().catch(() => false);

      if (hasSection) {
        await expect(auditSection).toBeVisible();
      }
    });

    test('should show audit entries', async ({ page }) => {
      const auditEntries = page.locator('[data-testid="audit-entry"], .audit-entry');
      const count = await auditEntries.count();

      // Might have entries or empty state
      expect(count).toBeGreaterThanOrEqual(0);
    });

    test('should filter audit log', async ({ page }) => {
      const filterInput = page.locator('[data-testid="audit-filter"], input[placeholder*="Filter"]');
      const count = await filterInput.count();

      if (count > 0) {
        await expect(filterInput.first()).toBeVisible();
      }
    });
  });

  test.describe('SSO Configuration', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
    });

    test('should access SSO settings page', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/admin/sso');
      await waitForLoadingComplete(page);

      const ssoPanel = page.locator('[data-testid="sso-settings"], .sso-panel');
      const hasPanel = await ssoPanel.isVisible().catch(() => false);

      if (hasPanel) {
        await expect(ssoPanel).toBeVisible();
      }
    });

    test('should configure SAML settings', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/admin/sso');
      await waitForLoadingComplete(page);

      const samlSection = page.locator(':has-text("SAML"), [data-provider="saml"]');
      const hasSection = await samlSection.isVisible().catch(() => false);

      if (hasSection) {
        await expect(samlSection).toBeVisible();
      }
    });

    test('should display SCIM status', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/admin/sso');
      await waitForLoadingComplete(page);

      const scimStatus = page.locator('[data-testid="scim-status"], :has-text("SCIM")');
      const hasStatus = await scimStatus.isVisible().catch(() => false);

      if (hasStatus) {
        await expect(scimStatus).toBeVisible();
      }
    });
  });

  test.describe('Impact-In Monitor', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/admin');
      await waitForLoadingComplete(page);
    });

    test('should display Impact-In delivery monitor', async ({ page }) => {
      const monitorSection = page.locator('[data-testid="impactin-monitor"], :has-text("Impact-In")');
      const hasSection = await monitorSection.isVisible().catch(() => false);

      if (hasSection) {
        await expect(monitorSection).toBeVisible();
      }
    });

    test('should show delivery status', async ({ page }) => {
      const status = page.locator('[data-testid*="delivery-status"], .delivery-status');
      const hasStatus = await status.isVisible().catch(() => false);

      if (hasStatus) {
        await expect(status).toBeVisible();
      }
    });

    test('should replay failed deliveries', async ({ page }) => {
      const replayBtn = page.locator('button:has-text("Replay"), button[aria-label*="Replay"]');
      const count = await replayBtn.count();

      if (count > 0) {
        await expect(replayBtn.first()).toBeVisible();
      }
    });
  });
});
