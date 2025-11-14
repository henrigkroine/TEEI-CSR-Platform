import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: SCIM Role Mapping
 *
 * Tests the SCIM (System for Cross-domain Identity Management) role mapping interface including:
 * - SCIM settings page navigation (SUPER_ADMIN only)
 * - Role mapping creation
 * - Role mapping editing
 * - Role mapping deletion with confirmation
 * - Test sync functionality
 * - Group-to-role mapping
 * - Attribute mapping
 */

test.describe('SCIM Role Mapping', () => {
  test.beforeEach(async ({ page }) => {
    // Login as SUPER_ADMIN (required for SCIM settings)
    await page.goto('/login');
    await page.fill('input[name="email"]', 'superadmin@example.com');
    await page.fill('input[name="password"]', 'superadmin123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should navigate to SCIM settings (SUPER_ADMIN only)', async ({ page }) => {
    // Navigate to admin settings
    await page.goto('/admin/settings');

    // Verify SCIM tab is visible (only for SUPER_ADMIN)
    await expect(page.locator('[data-testid="settings-tab-scim"]')).toBeVisible();

    // Click SCIM tab
    await page.click('[data-testid="settings-tab-scim"]');

    // Verify SCIM settings page loaded
    await expect(page.locator('h1')).toContainText('SCIM Configuration');

    // Verify role mapping section visible
    await expect(page.locator('[data-testid="scim-role-mapping-section"]')).toBeVisible();
  });

  test('should deny access to non-SUPER_ADMIN users', async ({ page }) => {
    // Logout
    await page.goto('/logout');

    // Login as regular admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Try to navigate to SCIM settings
    await page.goto('/admin/settings/scim');

    // Verify access denied
    await expect(page.locator('[data-testid="access-denied"]')).toBeVisible();
    await expect(page.locator('[data-testid="access-denied"]'))
      .toContainText(/Access Denied|Insufficient Permissions|SUPER_ADMIN required/i);

    // Verify redirected or shown error
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/scim');
  });

  test('should display existing role mappings', async ({ page }) => {
    // Navigate to SCIM settings
    await page.goto('/admin/settings/scim');

    // Verify role mapping list displayed
    await expect(page.locator('[data-testid="role-mapping-list"]')).toBeVisible();

    // Verify mapping entries
    const mappingEntries = page.locator('[data-testid="role-mapping-entry"]');
    const entryCount = await mappingEntries.count();

    if (entryCount > 0) {
      // Verify first entry structure
      const firstEntry = mappingEntries.first();
      await expect(firstEntry.locator('[data-testid="scim-group"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="platform-role"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="mapping-actions"]')).toBeVisible();
    }
  });

  test('should create new role mapping', async ({ page }) => {
    // Navigate to SCIM settings
    await page.goto('/admin/settings/scim');

    // Click Create Mapping button
    await page.click('[data-testid="create-role-mapping"]');

    // Verify create modal opens
    await expect(page.locator('[data-testid="role-mapping-modal"]')).toBeVisible();

    // Fill in SCIM group name
    await page.fill('[data-testid="scim-group-input"]', 'Engineering');

    // Select platform role
    await page.selectOption('[data-testid="platform-role-select"]', 'ADMIN');

    // Add optional description
    await page.fill('[data-testid="mapping-description"]',
      'Maps Engineering IdP group to Admin role');

    // Save mapping
    await page.click('[data-testid="save-role-mapping"]');

    // Verify success notification
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Role mapping created');

    // Verify modal closes
    await expect(page.locator('[data-testid="role-mapping-modal"]')).not.toBeVisible();

    // Verify new mapping appears in list
    await expect(page.locator('[data-testid="role-mapping-entry"]')
      .filter({ hasText: 'Engineering' }))
      .toBeVisible();
  });

  test('should edit existing role mapping', async ({ page }) => {
    // Navigate to SCIM settings
    await page.goto('/admin/settings/scim');

    // Find first mapping entry
    const firstMapping = page.locator('[data-testid="role-mapping-entry"]').first();
    await expect(firstMapping).toBeVisible();

    // Click edit button
    await firstMapping.locator('[data-testid="edit-mapping"]').click();

    // Verify edit modal opens
    await expect(page.locator('[data-testid="role-mapping-modal"]')).toBeVisible();

    // Verify fields are pre-filled
    const groupName = await page.locator('[data-testid="scim-group-input"]').inputValue();
    expect(groupName).toBeTruthy();

    // Update platform role
    await page.selectOption('[data-testid="platform-role-select"]', 'USER');

    // Update description
    await page.fill('[data-testid="mapping-description"]',
      'Updated: Maps to regular user role');

    // Save changes
    await page.click('[data-testid="save-role-mapping"]');

    // Verify success
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText(/Role mapping updated|Changes saved/i);

    // Verify modal closes
    await expect(page.locator('[data-testid="role-mapping-modal"]')).not.toBeVisible();

    // Verify updated mapping displays new role
    await expect(firstMapping.locator('[data-testid="platform-role"]'))
      .toContainText('USER');
  });

  test('should delete role mapping with confirmation', async ({ page }) => {
    // Navigate to SCIM settings
    await page.goto('/admin/settings/scim');

    // Find a mapping entry
    const mappingToDelete = page.locator('[data-testid="role-mapping-entry"]').first();
    await expect(mappingToDelete).toBeVisible();

    // Capture group name before deletion
    const groupName = await mappingToDelete.locator('[data-testid="scim-group"]').textContent();

    // Click delete button
    await mappingToDelete.locator('[data-testid="delete-mapping"]').click();

    // Verify confirmation modal appears
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible();

    // Verify warning message
    await expect(page.locator('[data-testid="delete-confirm-modal"]'))
      .toContainText(/Are you sure|Delete role mapping|cannot be undone/i);

    // Verify group name shown in confirmation
    await expect(page.locator('[data-testid="delete-confirm-modal"]'))
      .toContainText(groupName!);

    // Confirm deletion
    await page.click('[data-testid="confirm-delete"]');

    // Verify success notification
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Role mapping deleted');

    // Verify modal closes
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).not.toBeVisible();

    // Verify mapping removed from list
    const remainingMappings = await page.locator('[data-testid="role-mapping-entry"]')
      .filter({ hasText: groupName! })
      .count();
    expect(remainingMappings).toBe(0);
  });

  test('should cancel deletion', async ({ page }) => {
    // Navigate to SCIM settings
    await page.goto('/admin/settings/scim');

    // Get initial count of mappings
    const initialCount = await page.locator('[data-testid="role-mapping-entry"]').count();

    // Click delete on first mapping
    await page.locator('[data-testid="role-mapping-entry"]')
      .first()
      .locator('[data-testid="delete-mapping"]')
      .click();

    // Verify confirmation modal
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).toBeVisible();

    // Click cancel
    await page.click('[data-testid="cancel-delete"]');

    // Verify modal closes
    await expect(page.locator('[data-testid="delete-confirm-modal"]')).not.toBeVisible();

    // Verify mapping still exists
    const currentCount = await page.locator('[data-testid="role-mapping-entry"]').count();
    expect(currentCount).toBe(initialCount);
  });

  test('should test SCIM sync', async ({ page }) => {
    // Navigate to SCIM settings
    await page.goto('/admin/settings/scim');

    // Click Test Sync button
    await page.click('[data-testid="test-scim-sync"]');

    // Verify test sync modal opens
    await expect(page.locator('[data-testid="scim-test-modal"]')).toBeVisible();

    // Verify modal shows test options
    await expect(page.locator('[data-testid="test-mode-dry-run"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-mode-full-sync"]')).toBeVisible();

    // Select dry run mode
    await page.click('[data-testid="test-mode-dry-run"]');

    // Start test
    await page.click('[data-testid="start-scim-test"]');

    // Verify test progress indicator
    await expect(page.locator('[data-testid="scim-test-progress"]')).toBeVisible();

    // Wait for test completion (with timeout)
    await expect(page.locator('[data-testid="scim-test-results"]'))
      .toBeVisible({ timeout: 30000 });

    // Verify test results displayed
    await expect(page.locator('[data-testid="test-users-found"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-groups-found"]')).toBeVisible();
    await expect(page.locator('[data-testid="test-mappings-applied"]')).toBeVisible();
  });

  test('should map multiple groups to same role', async ({ page }) => {
    // Navigate to SCIM settings
    await page.goto('/admin/settings/scim');

    // Create first mapping
    await page.click('[data-testid="create-role-mapping"]');
    await page.fill('[data-testid="scim-group-input"]', 'Developers');
    await page.selectOption('[data-testid="platform-role-select"]', 'ADMIN');
    await page.click('[data-testid="save-role-mapping"]');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

    // Create second mapping to same role
    await page.click('[data-testid="create-role-mapping"]');
    await page.fill('[data-testid="scim-group-input"]', 'DevOps');
    await page.selectOption('[data-testid="platform-role-select"]', 'ADMIN');
    await page.click('[data-testid="save-role-mapping"]');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

    // Verify both mappings exist
    await expect(page.locator('[data-testid="role-mapping-entry"]')
      .filter({ hasText: 'Developers' }))
      .toBeVisible();
    await expect(page.locator('[data-testid="role-mapping-entry"]')
      .filter({ hasText: 'DevOps' }))
      .toBeVisible();

    // Verify both show ADMIN role
    const devMapping = page.locator('[data-testid="role-mapping-entry"]')
      .filter({ hasText: 'Developers' });
    await expect(devMapping.locator('[data-testid="platform-role"]'))
      .toContainText('ADMIN');

    const opsMapping = page.locator('[data-testid="role-mapping-entry"]')
      .filter({ hasText: 'DevOps' });
    await expect(opsMapping.locator('[data-testid="platform-role"]'))
      .toContainText('ADMIN');
  });

  test('should prevent duplicate group mappings', async ({ page }) => {
    // Navigate to SCIM settings
    await page.goto('/admin/settings/scim');

    // Create mapping
    await page.click('[data-testid="create-role-mapping"]');
    await page.fill('[data-testid="scim-group-input"]', 'Finance');
    await page.selectOption('[data-testid="platform-role-select"]', 'USER');
    await page.click('[data-testid="save-role-mapping"]');
    await expect(page.locator('[data-testid="toast-success"]')).toBeVisible();

    // Try to create duplicate
    await page.click('[data-testid="create-role-mapping"]');
    await page.fill('[data-testid="scim-group-input"]', 'Finance');
    await page.selectOption('[data-testid="platform-role-select"]', 'ADMIN');
    await page.click('[data-testid="save-role-mapping"]');

    // Verify error
    await expect(page.locator('[data-testid="toast-error"]')).toBeVisible();
    await expect(page.locator('[data-testid="toast-error"]'))
      .toContainText(/already exists|duplicate mapping/i);

    // Verify modal stays open
    await expect(page.locator('[data-testid="role-mapping-modal"]')).toBeVisible();
  });

  test('should configure attribute mapping', async ({ page }) => {
    // Navigate to SCIM settings
    await page.goto('/admin/settings/scim');

    // Click Attribute Mapping tab
    await page.click('[data-testid="scim-tab-attributes"]');

    // Verify attribute mapping section
    await expect(page.locator('[data-testid="attribute-mapping-section"]')).toBeVisible();

    // Verify standard attributes displayed
    await expect(page.locator('[data-testid="attr-email"]')).toBeVisible();
    await expect(page.locator('[data-testid="attr-firstName"]')).toBeVisible();
    await expect(page.locator('[data-testid="attr-lastName"]')).toBeVisible();

    // Edit email attribute mapping
    await page.click('[data-testid="edit-attr-email"]');

    // Verify edit modal
    await expect(page.locator('[data-testid="attribute-mapping-modal"]')).toBeVisible();

    // Update SCIM attribute path
    await page.fill('[data-testid="scim-attribute-path"]', 'emails[type eq "work"].value');

    // Save
    await page.click('[data-testid="save-attribute-mapping"]');

    // Verify saved
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Attribute mapping updated');
  });

  test('should display SCIM endpoint information', async ({ page }) => {
    // Navigate to SCIM settings
    await page.goto('/admin/settings/scim');

    // Verify SCIM endpoint info section
    await expect(page.locator('[data-testid="scim-endpoint-info"]')).toBeVisible();

    // Verify base URL displayed
    await expect(page.locator('[data-testid="scim-base-url"]')).toBeVisible();
    const baseUrl = await page.locator('[data-testid="scim-base-url"]').textContent();
    expect(baseUrl).toContain('/scim/v2');

    // Verify bearer token displayed (masked)
    await expect(page.locator('[data-testid="scim-bearer-token"]')).toBeVisible();
    const token = await page.locator('[data-testid="scim-bearer-token"]').textContent();
    expect(token).toMatch(/\*+/); // Should be masked

    // Click show token
    await page.click('[data-testid="show-scim-token"]');

    // Verify token revealed
    const revealedToken = await page.locator('[data-testid="scim-bearer-token"]').textContent();
    expect(revealedToken).not.toMatch(/^\*+$/); // Should not be all asterisks
  });

  test('should regenerate SCIM token', async ({ page }) => {
    // Navigate to SCIM settings
    await page.goto('/admin/settings/scim');

    // Capture current token (masked)
    await page.click('[data-testid="show-scim-token"]');
    const originalToken = await page.locator('[data-testid="scim-bearer-token"]').textContent();

    // Click regenerate token
    await page.click('[data-testid="regenerate-scim-token"]');

    // Verify confirmation modal
    await expect(page.locator('[data-testid="regenerate-token-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="regenerate-token-modal"]'))
      .toContainText(/invalidate|existing token|IdP configuration/i);

    // Confirm regeneration
    await page.click('[data-testid="confirm-regenerate"]');

    // Verify success
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Token regenerated');

    // Verify new token displayed (different from original)
    const newToken = await page.locator('[data-testid="scim-bearer-token"]').textContent();
    expect(newToken).not.toBe(originalToken);
  });

  test('should copy SCIM endpoint to clipboard', async ({ page, context }) => {
    // Grant clipboard permissions
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    // Navigate to SCIM settings
    await page.goto('/admin/settings/scim');

    // Click copy base URL
    await page.click('[data-testid="copy-scim-base-url"]');

    // Verify copied
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Copied to clipboard');

    // Verify clipboard content
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toContain('/scim/v2');
  });

  test('should view SCIM sync logs', async ({ page }) => {
    // Navigate to SCIM settings
    await page.goto('/admin/settings/scim');

    // Click View Sync Logs
    await page.click('[data-testid="view-scim-logs"]');

    // Verify logs panel opens
    await expect(page.locator('[data-testid="scim-logs-panel"]')).toBeVisible();

    // Verify log entries
    const logEntries = page.locator('[data-testid="scim-log-entry"]');
    const entryCount = await logEntries.count();

    if (entryCount > 0) {
      // Verify first entry structure
      const firstEntry = logEntries.first();
      await expect(firstEntry.locator('[data-testid="log-timestamp"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="log-operation"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="log-status"]')).toBeVisible();
    }

    // Verify filter options
    await expect(page.locator('[data-testid="log-filter-user-ops"]')).toBeVisible();
    await expect(page.locator('[data-testid="log-filter-group-ops"]')).toBeVisible();
  });
});
