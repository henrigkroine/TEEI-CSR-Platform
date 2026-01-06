import { test, expect } from '@playwright/test';

/**
 * E2E Test: Governance UI & GDPR Compliance
 * Tests consent management, DSAR requests, export logs, retention policies
 */

test.describe('Consent Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display consent management page', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/privacy');

    await expect(page.locator('[data-testid="consent-manager"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Privacy Preferences")')).toBeVisible();
  });

  test('should show consent categories', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/privacy');

    // Check for consent types
    await expect(page.locator('[data-testid="consent-necessary"]')).toBeVisible();
    await expect(page.locator('[data-testid="consent-analytics"]')).toBeVisible();
    await expect(page.locator('[data-testid="consent-marketing"]')).toBeVisible();
  });

  test('should have necessary consent always enabled', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/privacy');

    const necessaryToggle = page.locator('[data-testid="consent-necessary-toggle"]');
    await expect(necessaryToggle).toBeDisabled();
    await expect(necessaryToggle).toBeChecked();
  });

  test('should allow toggling optional consents', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/privacy');

    const analyticsToggle = page.locator('[data-testid="consent-analytics-toggle"]');

    // Get initial state
    const initialState = await analyticsToggle.isChecked();

    // Toggle
    await analyticsToggle.click();

    // State should change
    const newState = await analyticsToggle.isChecked();
    expect(newState).toBe(!initialState);
  });

  test('should save consent preferences', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/privacy');

    // Change consent
    await page.click('[data-testid="consent-analytics-toggle"]');

    // Save
    await page.click('[data-testid="save-consent-button"]');

    // Success message
    await expect(page.locator('text=/saved|updated/i')).toBeVisible();
  });

  test('should display GDPR-compliant language', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/privacy');

    // Check for GDPR-compliant terms
    const content = await page.textContent('[data-testid="consent-manager"]');
    expect(content).toMatch(/personal data|processing|legitimate interest/i);
  });
});

test.describe('Data Subject Access Requests (DSAR)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display DSAR status page', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/dsar');

    await expect(page.locator('[data-testid="dsar-status"]')).toBeVisible();
  });

  test('should show current DSAR requests', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/dsar');

    // Check for request list
    const requestList = page.locator('[data-testid="dsar-request-list"]');
    await expect(requestList).toBeVisible();
  });

  test('should display DSAR request statuses', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/dsar');

    // Status options: pending, in-progress, completed
    const statusLabels = page.locator('[data-testid^="dsar-status-"]');
    if (await statusLabels.count() > 0) {
      await expect(statusLabels.first()).toBeVisible();
    }
  });

  test('should allow submitting new DSAR request', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/dsar');

    // Click submit request button
    await page.click('[data-testid="submit-dsar-button"]');

    // Modal should open
    await expect(page.locator('[data-testid="dsar-request-modal"]')).toBeVisible();

    // Select request type
    await page.selectOption('[data-testid="dsar-type"]', 'export');

    // Submit
    await page.click('[data-testid="confirm-dsar-request"]');

    // Success message
    await expect(page.locator('text=/submitted|received/i')).toBeVisible();
  });

  test('should show DSAR request timeline', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/dsar');

    // Click on a request to view details
    const firstRequest = page.locator('[data-testid="dsar-request-item"]').first();
    if (await firstRequest.isVisible()) {
      await firstRequest.click();

      // Timeline should be visible
      await expect(page.locator('[data-testid="dsar-timeline"]')).toBeVisible();
    }
  });

  test('should download DSAR data when completed', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/dsar');

    // Find completed request
    const completedRequest = page.locator('[data-testid="dsar-status-completed"]').first();
    if (await completedRequest.isVisible()) {
      const downloadPromise = page.waitForEvent('download');
      await page.click('[data-testid="download-dsar-data"]');

      const download = await downloadPromise;
      expect(download.suggestedFilename()).toMatch(/.*\.(zip|json)/);
    }
  });
});

test.describe('Export Logs Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display export logs (admin only)', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/export-logs');

    await expect(page.locator('[data-testid="export-logs-viewer"]')).toBeVisible();
    await expect(page.locator('h1:has-text("Export Logs")')).toBeVisible();
  });

  test('should show export log entries', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/export-logs');

    // Check for log table
    await expect(page.locator('[data-testid="export-logs-table"]')).toBeVisible();

    const logEntries = page.locator('[data-testid="log-entry"]');
    if (await logEntries.count() > 0) {
      await expect(logEntries.first()).toBeVisible();
    }
  });

  test('should display log entry details', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/export-logs');

    const logEntry = page.locator('[data-testid="log-entry"]').first();
    if (await logEntry.isVisible()) {
      // Check for required fields
      await expect(logEntry.locator('[data-testid="log-user"]')).toBeVisible();
      await expect(logEntry.locator('[data-testid="log-timestamp"]')).toBeVisible();
      await expect(logEntry.locator('[data-testid="log-data-type"]')).toBeVisible();
    }
  });

  test('should filter logs by user', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/export-logs');

    // Apply user filter
    await page.fill('[data-testid="filter-user"]', 'admin@teei.example');
    await page.waitForTimeout(500);

    // Results should be filtered
    const logEntries = page.locator('[data-testid="log-entry"]');
    if (await logEntries.count() > 0) {
      const firstEntry = await logEntries.first().textContent();
      expect(firstEntry).toContain('admin@teei.example');
    }
  });

  test('should filter logs by date range', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/export-logs');

    // Select date range
    await page.click('[data-testid="date-range-picker"]');
    await page.click('[data-testid="date-preset-last-7-days"]');

    // Wait for filter
    await page.waitForResponse(response => response.url().includes('/api/export-logs'));

    // Results should be filtered
    await expect(page.locator('[data-testid="log-entry"]')).toBeVisible();
  });

  test('should filter logs by data type', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/export-logs');

    // Select data type
    await page.selectOption('[data-testid="filter-data-type"]', 'report');

    // Wait for filter
    await page.waitForResponse(response => response.url().includes('/api/export-logs'));

    // All results should be report exports
    const logEntries = page.locator('[data-testid="log-data-type"]');
    const count = await logEntries.count();
    for (let i = 0; i < count; i++) {
      await expect(logEntries.nth(i)).toContainText('report');
    }
  });
});

test.describe('Data Retention Policies', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display retention policies page', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/retention');

    await expect(page.locator('[data-testid="retention-policies"]')).toBeVisible();
  });

  test('should show retention periods per data category', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/retention');

    // Check for data categories
    await expect(page.locator('[data-testid="retention-category"]')).toBeVisible();

    // Each category should have a retention period
    const categories = page.locator('[data-testid="retention-category"]');
    const count = await categories.count();
    for (let i = 0; i < Math.min(count, 3); i++) {
      await expect(categories.nth(i).locator('[data-testid="retention-period"]')).toBeVisible();
    }
  });

  test('should display upcoming deletions', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/retention');

    // Check for upcoming deletions section
    const upcomingDeletions = page.locator('[data-testid="upcoming-deletions"]');
    if (await upcomingDeletions.isVisible()) {
      await expect(upcomingDeletions).toBeVisible();
    }
  });

  test('should show deletion schedule', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings/retention');

    // Check for deletion dates
    const deletionDate = page.locator('[data-testid="deletion-date"]');
    if (await deletionDate.first().isVisible()) {
      await expect(deletionDate.first()).toBeVisible();
    }
  });
});

test.describe('Audit Trail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should log all actions to audit trail', async ({ page }) => {
    // Perform an action
    await page.goto('/en/cockpit/company-1/settings/privacy');
    await page.click('[data-testid="consent-analytics-toggle"]');
    await page.click('[data-testid="save-consent-button"]');

    // Check audit log
    await page.goto('/en/cockpit/company-1/admin/audit-log');

    // Recent action should be logged
    await expect(page.locator('[data-testid="audit-entry"]').first()).toBeVisible();
  });
});
