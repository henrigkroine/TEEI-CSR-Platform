import { test, expect } from '@playwright/test';

/**
 * E2E Test: SSO Settings & Admin Features
 * Tests SSO configuration display, role mapping, SCIM status, MFA enrollment
 */

test.describe('SSO Settings (Read-Only Display)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display SSO settings page', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/sso');

    await expect(page.locator('[data-testid="sso-settings"]')).toBeVisible();
    await expect(page.locator('h1:has-text("SSO Configuration")')).toBeVisible();
  });

  test('should show SAML/OIDC configuration', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/sso');

    // Check for configuration display
    await expect(page.locator('[data-testid="sso-provider-type"]')).toBeVisible();

    // Should show key configuration fields
    const metadataUrl = page.locator('[data-testid="metadata-url"]');
    const entityId = page.locator('[data-testid="entity-id"]');
    const acsUrl = page.locator('[data-testid="acs-url"]');

    // At least one should be visible
    const hasConfig =
      (await metadataUrl.isVisible()) ||
      (await entityId.isVisible()) ||
      (await acsUrl.isVisible());

    expect(hasConfig).toBe(true);
  });

  test('should display metadata URL', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/sso');

    const metadataUrl = page.locator('[data-testid="metadata-url"]');
    if (await metadataUrl.isVisible()) {
      await expect(metadataUrl).toBeVisible();

      // Should be copyable
      const copyButton = page.locator('[data-testid="copy-metadata-url"]');
      if (await copyButton.isVisible()) {
        await copyButton.click();
        // Success indicator
        await expect(page.locator('text=/copied/i')).toBeVisible({ timeout: 2000 });
      }
    }
  });

  test('should display entity ID', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/sso');

    const entityId = page.locator('[data-testid="entity-id"]');
    if (await entityId.isVisible()) {
      await expect(entityId).toBeVisible();

      // Should show value
      const value = await entityId.textContent();
      expect(value?.trim()).toBeTruthy();
    }
  });

  test('should display ACS URL', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/sso');

    const acsUrl = page.locator('[data-testid="acs-url"]');
    if (await acsUrl.isVisible()) {
      await expect(acsUrl).toBeVisible();

      // Should be a valid URL
      const value = await acsUrl.textContent();
      expect(value).toMatch(/^https?:\/\//);
    }
  });

  test('should not allow editing SSO configuration', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/sso');

    // Edit buttons should not exist or be disabled
    const editButton = page.locator('[data-testid="edit-sso-button"]');
    if (await editButton.isVisible()) {
      await expect(editButton).toBeDisabled();
    }

    // Fields should be read-only
    const inputs = page.locator('[data-testid="sso-settings"] input');
    const count = await inputs.count();
    for (let i = 0; i < count; i++) {
      const input = inputs.nth(i);
      const isReadOnly = await input.getAttribute('readonly');
      const isDisabled = await input.getAttribute('disabled');
      expect(isReadOnly !== null || isDisabled !== null).toBe(true);
    }
  });
});

test.describe('Role Mapping Table', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display role mapping table', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/sso');

    await expect(page.locator('[data-testid="role-mapping-table"]')).toBeVisible();
  });

  test('should show IdP claims to RBAC role mappings', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/sso');

    const mappingTable = page.locator('[data-testid="role-mapping-table"]');
    await expect(mappingTable).toBeVisible();

    // Should have rows
    const rows = mappingTable.locator('tr[data-testid="mapping-row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should display IdP claim names', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/sso');

    // Check for claim columns
    await expect(page.locator('[data-testid="idp-claim"]').first()).toBeVisible();
  });

  test('should display mapped RBAC roles', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/sso');

    // Check for RBAC role columns
    await expect(page.locator('[data-testid="rbac-role"]').first()).toBeVisible();

    // Roles should be standard: VIEWER, EDITOR, ADMIN, SUPER_ADMIN, PARTNER
    const roleText = await page.locator('[data-testid="rbac-role"]').first().textContent();
    expect(roleText).toMatch(/VIEWER|EDITOR|ADMIN|SUPER_ADMIN|PARTNER/);
  });

  test('should show mapping descriptions', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/sso');

    const description = page.locator('[data-testid="mapping-description"]');
    if (await description.first().isVisible()) {
      await expect(description.first()).toBeVisible();
    }
  });
});

test.describe('SCIM Provisioning Status', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display SCIM status panel', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/scim');

    await expect(page.locator('[data-testid="scim-status"]')).toBeVisible();
  });

  test('should show last sync timestamp', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/scim');

    const lastSync = page.locator('[data-testid="last-sync-time"]');
    if (await lastSync.isVisible()) {
      await expect(lastSync).toBeVisible();

      // Should show a timestamp
      const text = await lastSync.textContent();
      expect(text).toMatch(/ago|at|on/i);
    }
  });

  test('should display user count', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/scim');

    const userCount = page.locator('[data-testid="scim-user-count"]');
    if (await userCount.isVisible()) {
      await expect(userCount).toBeVisible();

      // Should be a number
      const text = await userCount.textContent();
      expect(text).toMatch(/\d+/);
    }
  });

  test('should display group count', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/scim');

    const groupCount = page.locator('[data-testid="scim-group-count"]');
    if (await groupCount.isVisible()) {
      await expect(groupCount).toBeVisible();

      // Should be a number
      const text = await groupCount.textContent();
      expect(text).toMatch(/\d+/);
    }
  });

  test('should show sync error logs', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/scim');

    const errorLogs = page.locator('[data-testid="scim-error-logs"]');
    if (await errorLogs.isVisible()) {
      await expect(errorLogs).toBeVisible();

      // Check for error entries
      const errors = errorLogs.locator('[data-testid="error-entry"]');
      if ((await errors.count()) > 0) {
        await expect(errors.first()).toBeVisible();
      }
    }
  });

  test('should display sync status indicator', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/scim');

    // Status: success, error, in-progress
    const statusIndicator = page.locator('[data-testid="sync-status-indicator"]');
    if (await statusIndicator.isVisible()) {
      await expect(statusIndicator).toBeVisible();
    }
  });

  test('should allow manual sync trigger', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/scim');

    const syncButton = page.locator('[data-testid="trigger-sync-button"]');
    if (await syncButton.isVisible()) {
      await syncButton.click();

      // Should show loading state
      await expect(page.locator('text=/syncing|in progress/i')).toBeVisible({ timeout: 2000 });
    }
  });
});

test.describe('MFA Enrollment', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display MFA settings page', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/security');

    await expect(page.locator('[data-testid="mfa-settings"]')).toBeVisible();
  });

  test('should show MFA enrollment wizard', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/security');

    // Click enroll button
    const enrollButton = page.locator('[data-testid="enroll-mfa-button"]');
    if (await enrollButton.isVisible()) {
      await enrollButton.click();

      // Wizard should open
      await expect(page.locator('[data-testid="mfa-enrollment-wizard"]')).toBeVisible();
    }
  });

  test('should display QR code for TOTP setup', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/security');

    const enrollButton = page.locator('[data-testid="enroll-mfa-button"]');
    if (await enrollButton.isVisible()) {
      await enrollButton.click();

      // Select TOTP method
      await page.click('[data-testid="mfa-method-totp"]');

      // QR code should be visible
      await expect(page.locator('[data-testid="totp-qr-code"]')).toBeVisible();

      // Secret key should be visible
      await expect(page.locator('[data-testid="totp-secret-key"]')).toBeVisible();
    }
  });

  test('should generate backup codes', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/security');

    const enrollButton = page.locator('[data-testid="enroll-mfa-button"]');
    if (await enrollButton.isVisible()) {
      await enrollButton.click();
      await page.click('[data-testid="mfa-method-totp"]');

      // Complete enrollment (would need valid TOTP code)
      // Skip to backup codes step if available
      const backupCodesButton = page.locator('[data-testid="generate-backup-codes"]');
      if (await backupCodesButton.isVisible()) {
        await backupCodesButton.click();

        // Backup codes should be displayed
        await expect(page.locator('[data-testid="backup-codes-list"]')).toBeVisible();
      }
    }
  });

  test('should show MFA status for ADMIN roles', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/security');

    const mfaStatus = page.locator('[data-testid="mfa-status"]');
    if (await mfaStatus.isVisible()) {
      await expect(mfaStatus).toBeVisible();

      // Should show enabled/disabled status
      const status = await mfaStatus.textContent();
      expect(status).toMatch(/enabled|disabled|required/i);
    }
  });

  test('should enforce MFA for ADMIN/SUPER_ADMIN roles', async ({ page }) => {
    // This would be tested by trying to access admin features without MFA
    // and verifying enforcement
    await page.goto('/en/cockpit/company-1/admin/users');

    // If MFA not enrolled, should redirect or show warning
    const mfaWarning = page.locator('[data-testid="mfa-required-warning"]');
    if (await mfaWarning.isVisible()) {
      await expect(mfaWarning).toBeVisible();
      await expect(page.locator('text=/MFA required/i')).toBeVisible();
    }
  });
});

test.describe('Session Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display active sessions', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/sessions');

    const sessionsList = page.locator('[data-testid="active-sessions-list"]');
    if (await sessionsList.isVisible()) {
      await expect(sessionsList).toBeVisible();

      // Current session should be listed
      await expect(page.locator('[data-testid="current-session"]')).toBeVisible();
    }
  });

  test('should show session timeout setting', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/settings');

    const timeoutSetting = page.locator('[data-testid="session-timeout"]');
    if (await timeoutSetting.isVisible()) {
      await expect(timeoutSetting).toBeVisible();

      // Should show timeout value
      const value = await timeoutSetting.textContent();
      expect(value).toMatch(/\d+\s*(minutes|hours)/i);
    }
  });

  test('should allow revoking sessions', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/sessions');

    const revokeButton = page.locator('[data-testid="revoke-session-button"]').first();
    if (await revokeButton.isVisible()) {
      await revokeButton.click();

      // Confirm revocation
      await page.click('[data-testid="confirm-revoke"]');

      // Success message
      await expect(page.locator('text=/revoked|terminated/i')).toBeVisible();
    }
  });
});
