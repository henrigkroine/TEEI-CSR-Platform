import { test, expect } from '@playwright/test';

/**
 * E2E Test: Approval Workflow & Audit Mode
 * Tests state transitions, watermarking, version history
 */

test.describe('Approval Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display approval workflow panel', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-123');

    const workflowPanel = page.locator('[data-testid="approval-workflow-panel"]');
    await expect(workflowPanel).toBeVisible();
    await expect(workflowPanel.locator('[data-testid="approval-status"]')).toBeVisible();
  });

  test('should submit report for review (draft → review)', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-draft-1');

    // Check initial status
    await expect(page.locator('[data-testid="status-draft"]')).toBeVisible();

    // Submit for review
    await page.click('[data-testid="submit-for-review-button"]');

    // Confirm action
    await page.click('[data-testid="confirm-submit"]');

    // Status should change
    await expect(page.locator('[data-testid="status-review"]')).toBeVisible({ timeout: 5000 });
  });

  test('should request changes during review', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-review-1');

    // Click request changes
    await page.click('[data-testid="request-changes-button"]');

    // Add comment
    await page.fill('[data-testid="reviewer-comment"]', 'Please update the Q1 metrics section.');
    await page.click('[data-testid="submit-changes-request"]');

    // Should show comment thread
    await expect(page.locator('[data-testid="comment-thread"]')).toBeVisible();
    await expect(page.locator('text=Please update the Q1 metrics section.')).toBeVisible();
  });

  test('should approve report (review → approved)', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-review-1');

    // Click approve button
    await page.click('[data-testid="approve-report-button"]');

    // Confirm approval
    await page.fill('[data-testid="approval-comment"]', 'Approved for publication.');
    await page.click('[data-testid="confirm-approval"]');

    // Status should change to approved
    await expect(page.locator('[data-testid="status-approved"]')).toBeVisible({ timeout: 5000 });
  });

  test('should lock approved report (approved → locked)', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-approved-1');

    // Click lock button (admin only)
    await page.click('[data-testid="lock-report-button"]');

    // Confirm lock
    await page.click('[data-testid="confirm-lock"]');

    // Status should change to locked
    await expect(page.locator('[data-testid="status-locked"]')).toBeVisible();

    // Edit button should be disabled
    await expect(page.locator('[data-testid="edit-report-button"]')).toBeDisabled();
  });

  test('should prevent editing locked reports', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-locked-1');

    // Edit button should not exist or be disabled
    const editButton = page.locator('[data-testid="edit-report-button"]');
    if (await editButton.isVisible()) {
      await expect(editButton).toBeDisabled();
    }

    // Locked indicator should be visible
    await expect(page.locator('[data-testid="locked-indicator"]')).toBeVisible();
  });

  test('should display comment thread', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-review-1');

    // Open comment thread
    await page.click('[data-testid="view-comments-button"]');

    const commentThread = page.locator('[data-testid="comment-thread"]');
    await expect(commentThread).toBeVisible();

    // Add new comment
    await page.fill('[data-testid="new-comment-input"]', 'Looks good overall!');
    await page.click('[data-testid="submit-comment"]');

    await expect(page.locator('text=Looks good overall!')).toBeVisible();
  });

  test('should show approval notifications', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Check for notification badge
    const notificationBadge = page.locator('[data-testid="notification-badge"]');
    if (await notificationBadge.isVisible()) {
      await notificationBadge.click();

      // Should show approval notifications
      await expect(page.locator('[data-testid="notification-item"]')).toBeVisible();
    }
  });
});

test.describe('Version History & Audit Trail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display version history', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-123');

    // Click version history button
    await page.click('[data-testid="version-history-button"]');

    const versionPanel = page.locator('[data-testid="version-history-panel"]');
    await expect(versionPanel).toBeVisible();

    // Should show version list
    await expect(versionPanel.locator('[data-testid="version-item"]')).toHaveCount(1, { timeout: 5000 });
  });

  test('should show diff between versions', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-123');
    await page.click('[data-testid="version-history-button"]');

    // Select two versions to compare
    await page.click('[data-testid="version-compare-v1"]');
    await page.click('[data-testid="version-compare-v2"]');
    await page.click('[data-testid="show-diff-button"]');

    // Diff viewer should be visible
    await expect(page.locator('[data-testid="diff-viewer"]')).toBeVisible();
    await expect(page.locator('.diff-added, .diff-removed')).toBeVisible();
  });

  test('should track all edits with timestamps', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-123');
    await page.click('[data-testid="version-history-button"]');

    // Each version should have timestamp and author
    const versions = page.locator('[data-testid="version-item"]');
    const firstVersion = versions.first();

    await expect(firstVersion.locator('[data-testid="version-timestamp"]')).toBeVisible();
    await expect(firstVersion.locator('[data-testid="version-author"]')).toBeVisible();
  });

  test('should restore previous version', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-123');
    await page.click('[data-testid="version-history-button"]');

    // Select a previous version
    await page.click('[data-testid="version-item"]:nth-child(2)');
    await page.click('[data-testid="restore-version-button"]');

    // Confirm restoration
    await page.click('[data-testid="confirm-restore"]');

    // Should show success message
    await expect(page.locator('text=/restored|success/i')).toBeVisible();
  });
});

test.describe('Watermarking', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should show watermark preview on approved reports', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-approved-1');

    // Watermark indicator should be visible
    await expect(page.locator('[data-testid="watermark-indicator"]')).toBeVisible();
  });

  test('should configure watermark settings', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/admin/settings');

    // Navigate to watermark settings
    await page.click('text=Watermark Settings');

    // Configure watermark
    await page.fill('[data-testid="watermark-text"]', 'CONFIDENTIAL - Board Approved');
    await page.selectOption('[data-testid="watermark-position"]', 'diagonal');
    await page.fill('[data-testid="watermark-opacity"]', '0.3');

    await page.click('[data-testid="save-watermark-settings"]');

    await expect(page.locator('text=/saved|success/i')).toBeVisible();
  });
});
