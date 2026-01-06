import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: SSO UI
 *
 * Tests the Single Sign-On configuration interface including:
 * - SSO settings page navigation
 * - SAML metadata display
 * - OIDC configuration display
 * - Copy to clipboard functionality
 * - Test SSO connection
 * - SSO status indicators
 */

test.describe('SSO Configuration UI', () => {
  test.beforeEach(async ({ page }) => {
    // Login as admin with SSO configuration permissions
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should navigate to SSO settings', async ({ page }) => {
    // Navigate to admin settings
    await page.goto('/admin/settings');

    // Click SSO tab
    await page.click('[data-testid="settings-tab-sso"]');

    // Verify SSO settings page loaded
    await expect(page.locator('h1')).toContainText('Single Sign-On');

    // Verify SSO configuration sections visible
    await expect(page.locator('[data-testid="sso-saml-section"]')).toBeVisible();
    await expect(page.locator('[data-testid="sso-oidc-section"]')).toBeVisible();
  });

  test('should display SAML metadata', async ({ page }) => {
    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Verify SAML section
    await expect(page.locator('[data-testid="sso-saml-section"]')).toBeVisible();

    // Verify SAML metadata fields displayed
    await expect(page.locator('[data-testid="saml-entity-id"]')).toBeVisible();
    await expect(page.locator('[data-testid="saml-acs-url"]')).toBeVisible();
    await expect(page.locator('[data-testid="saml-metadata-url"]')).toBeVisible();

    // Verify values are populated
    const entityId = await page.locator('[data-testid="saml-entity-id"]').textContent();
    expect(entityId).toBeTruthy();
    expect(entityId).toContain('https://');

    const acsUrl = await page.locator('[data-testid="saml-acs-url"]').textContent();
    expect(acsUrl).toBeTruthy();
    expect(acsUrl).toContain('/saml/acs');
  });

  test('should display OIDC configuration', async ({ page }) => {
    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Verify OIDC section
    await expect(page.locator('[data-testid="sso-oidc-section"]')).toBeVisible();

    // Verify OIDC configuration fields
    await expect(page.locator('[data-testid="oidc-client-id"]')).toBeVisible();
    await expect(page.locator('[data-testid="oidc-issuer"]')).toBeVisible();
    await expect(page.locator('[data-testid="oidc-redirect-uri"]')).toBeVisible();
    await expect(page.locator('[data-testid="oidc-discovery-url"]')).toBeVisible();

    // Verify values are populated
    const clientId = await page.locator('[data-testid="oidc-client-id"]').textContent();
    expect(clientId).toBeTruthy();

    const redirectUri = await page.locator('[data-testid="oidc-redirect-uri"]').textContent();
    expect(redirectUri).toBeTruthy();
    expect(redirectUri).toContain('/oidc/callback');
  });

  test('should copy SAML entity ID to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Get entity ID value
    const entityId = await page.locator('[data-testid="saml-entity-id"]').textContent();

    // Click copy button
    await page.click('[data-testid="copy-saml-entity-id"]');

    // Verify toast notification
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Copied to clipboard');

    // Verify clipboard contains the value
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(entityId);
  });

  test('should copy SAML ACS URL to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Get ACS URL
    const acsUrl = await page.locator('[data-testid="saml-acs-url"]').textContent();

    // Click copy button
    await page.click('[data-testid="copy-saml-acs-url"]');

    // Verify copied
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Copied to clipboard');

    // Verify clipboard
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBe(acsUrl);
  });

  test('should copy OIDC configuration to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Click copy all OIDC config button
    await page.click('[data-testid="copy-oidc-config"]');

    // Verify copied
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('OIDC configuration copied');

    // Verify clipboard contains JSON
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toBeTruthy();

    // Parse JSON to verify structure
    const config = JSON.parse(clipboardText);
    expect(config.client_id).toBeTruthy();
    expect(config.redirect_uri).toBeTruthy();
    expect(config.issuer).toBeTruthy();
  });

  test('should download SAML metadata XML', async ({ page }) => {
    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click download metadata button
    await page.click('[data-testid="download-saml-metadata"]');

    // Wait for download
    const download = await downloadPromise;

    // Verify filename
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/metadata\.xml$/i);

    // Verify file can be saved
    const downloadPath = `/tmp/${filename}`;
    await download.saveAs(downloadPath);

    // Verify file exists
    const fs = require('fs');
    expect(fs.existsSync(downloadPath)).toBe(true);

    // Clean up
    fs.unlinkSync(downloadPath);
  });

  test('should test SAML SSO connection', async ({ page }) => {
    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Click Test SSO button
    await page.click('[data-testid="test-saml-sso"]');

    // Verify test modal opens
    await expect(page.locator('[data-testid="sso-test-modal"]')).toBeVisible();

    // Verify test instructions displayed
    await expect(page.locator('[data-testid="test-instructions"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-instructions"]'))
      .toContainText(/new window|redirected|IdP/i);

    // Click proceed button (would open new window in real scenario)
    await page.click('[data-testid="proceed-test-sso"]');

    // Note: In real test, would handle popup window
    // For E2E spec, we verify the button works and modal appears
  });

  test('should test OIDC SSO connection', async ({ page }) => {
    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Click Test OIDC button
    await page.click('[data-testid="test-oidc-sso"]');

    // Verify test modal
    await expect(page.locator('[data-testid="sso-test-modal"]')).toBeVisible();

    // Verify OIDC-specific instructions
    await expect(page.locator('[data-testid="test-instructions"]'))
      .toContainText(/authorization endpoint|OpenID Connect/i);

    // Click proceed
    await page.click('[data-testid="proceed-test-sso"]');

    // Modal should close or show next step
    await page.waitForTimeout(1000);
  });

  test('should show SSO status indicators', async ({ page }) => {
    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Verify SAML status indicator
    await expect(page.locator('[data-testid="saml-status"]')).toBeVisible();

    const samlStatus = await page.locator('[data-testid="saml-status"]').textContent();
    expect(samlStatus).toMatch(/Enabled|Disabled|Configured|Not Configured/i);

    // Verify OIDC status indicator
    await expect(page.locator('[data-testid="oidc-status"]')).toBeVisible();

    const oidcStatus = await page.locator('[data-testid="oidc-status"]').textContent();
    expect(oidcStatus).toMatch(/Enabled|Disabled|Configured|Not Configured/i);
  });

  test('should toggle SAML SSO on/off', async ({ page }) => {
    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Find SAML enable toggle
    const samlToggle = page.locator('[data-testid="saml-enable-toggle"]');
    await expect(samlToggle).toBeVisible();

    // Get current state
    const initialState = await samlToggle.isChecked();

    // Toggle state
    await samlToggle.click();

    // Verify confirmation modal (if applicable)
    const confirmModal = page.locator('[data-testid="confirm-sso-change"]');
    const modalVisible = await confirmModal.isVisible().catch(() => false);

    if (modalVisible) {
      await page.click('[data-testid="confirm-change"]');
    }

    // Verify state changed
    await expect(samlToggle).toBeChecked({ checked: !initialState });

    // Verify toast notification
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText(/SAML.*updated|SSO.*updated/i);
  });

  test('should update SAML configuration', async ({ page }) => {
    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Click edit SAML config button
    await page.click('[data-testid="edit-saml-config"]');

    // Verify edit modal opens
    await expect(page.locator('[data-testid="saml-config-modal"]')).toBeVisible();

    // Update IdP metadata URL
    await page.fill('[data-testid="saml-idp-metadata-url"]',
      'https://idp.example.com/saml/metadata');

    // Update IdP SSO URL
    await page.fill('[data-testid="saml-idp-sso-url"]',
      'https://idp.example.com/saml/login');

    // Upload IdP certificate (simulate)
    const fileInput = page.locator('[data-testid="saml-idp-cert-upload"]');
    // In real test, would upload file
    // await fileInput.setInputFiles('path/to/cert.pem');

    // Save configuration
    await page.click('[data-testid="save-saml-config"]');

    // Verify saved
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('SAML configuration saved');

    // Verify modal closes
    await expect(page.locator('[data-testid="saml-config-modal"]')).not.toBeVisible();
  });

  test('should update OIDC configuration', async ({ page }) => {
    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Click edit OIDC config
    await page.click('[data-testid="edit-oidc-config"]');

    // Verify edit modal
    await expect(page.locator('[data-testid="oidc-config-modal"]')).toBeVisible();

    // Update fields
    await page.fill('[data-testid="oidc-client-id-input"]', 'new-client-id-123');
    await page.fill('[data-testid="oidc-client-secret-input"]', 'super-secret-value');
    await page.fill('[data-testid="oidc-issuer-input"]', 'https://oidc.example.com');

    // Select scopes
    await page.check('[data-testid="scope-openid"]');
    await page.check('[data-testid="scope-email"]');
    await page.check('[data-testid="scope-profile"]');

    // Save
    await page.click('[data-testid="save-oidc-config"]');

    // Verify saved
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('OIDC configuration saved');

    // Verify modal closes
    await expect(page.locator('[data-testid="oidc-config-modal"]')).not.toBeVisible();
  });

  test('should show SSO connection logs', async ({ page }) => {
    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Click View Logs button
    await page.click('[data-testid="view-sso-logs"]');

    // Verify logs panel opens
    await expect(page.locator('[data-testid="sso-logs-panel"]')).toBeVisible();

    // Verify log entries displayed
    const logEntries = page.locator('[data-testid="sso-log-entry"]');
    const entryCount = await logEntries.count();

    if (entryCount > 0) {
      // Verify first log entry structure
      const firstEntry = logEntries.first();
      await expect(firstEntry.locator('[data-testid="log-timestamp"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="log-event-type"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="log-status"]')).toBeVisible();
    }

    // Verify filter options
    await expect(page.locator('[data-testid="log-filter-success"]')).toBeVisible();
    await expect(page.locator('[data-testid="log-filter-failure"]')).toBeVisible();
  });

  test('should display SSO documentation links', async ({ page }) => {
    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Verify documentation section
    await expect(page.locator('[data-testid="sso-documentation"]')).toBeVisible();

    // Verify SAML setup guide link
    await expect(page.locator('a[href*="saml-setup"]')).toBeVisible();

    // Verify OIDC setup guide link
    await expect(page.locator('a[href*="oidc-setup"]')).toBeVisible();

    // Verify troubleshooting link
    await expect(page.locator('a[href*="sso-troubleshooting"]')).toBeVisible();
  });

  test('should validate SSO configuration before saving', async ({ page }) => {
    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Click edit SAML
    await page.click('[data-testid="edit-saml-config"]');

    // Enter invalid URL
    await page.fill('[data-testid="saml-idp-sso-url"]', 'not-a-valid-url');

    // Try to save
    await page.click('[data-testid="save-saml-config"]');

    // Verify validation error
    await expect(page.locator('[data-testid="validation-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="validation-error"]'))
      .toContainText(/invalid URL|valid URL required/i);

    // Verify modal stays open
    await expect(page.locator('[data-testid="saml-config-modal"]')).toBeVisible();
  });

  test('should show SSO provider templates', async ({ page }) => {
    // Navigate to SSO settings
    await page.goto('/admin/settings/sso');

    // Click "Configure with Template"
    await page.click('[data-testid="use-sso-template"]');

    // Verify template selector modal
    await expect(page.locator('[data-testid="sso-template-modal"]')).toBeVisible();

    // Verify popular providers listed
    await expect(page.locator('[data-testid="template-okta"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-auth0"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-azure-ad"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-google"]')).toBeVisible();

    // Select a template
    await page.click('[data-testid="template-okta"]');

    // Verify pre-filled configuration
    await expect(page.locator('[data-testid="saml-config-modal"]')).toBeVisible();

    // Verify fields have Okta-specific defaults
    const idpUrl = await page.locator('[data-testid="saml-idp-sso-url"]').inputValue();
    expect(idpUrl).toContain('okta.com');
  });
});
