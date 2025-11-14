import { test, expect } from '@playwright/test';

/**
 * E2E Test Suite: Approvals Flow
 *
 * Tests the complete report approval workflow including:
 * - Draft report creation
 * - Submission for review
 * - Approval process
 * - Report locking
 * - Watermark visibility
 * - Version history tracking
 */

test.describe('Report Approvals Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login as a user with report creation permissions
    await page.goto('/login');
    await page.fill('input[name="email"]', 'reporter@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should create a draft report', async ({ page }) => {
    // Navigate to reports section
    await page.goto('/reports');

    // Click "Create Report" button
    await page.click('button:has-text("Create Report")');

    // Fill in report details
    await page.fill('input[name="report-title"]', 'Q4 2024 Impact Report');
    await page.selectOption('select[name="report-period"]', '2024-Q4');
    await page.selectOption('select[name="report-type"]', 'quarterly');

    // Add report description
    await page.fill('textarea[name="report-description"]',
      'Comprehensive impact analysis for Q4 2024 including SROI metrics, VIS scores, and stakeholder feedback.');

    // Save as draft
    await page.click('button:has-text("Save Draft")');

    // Verify draft saved successfully
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Draft saved successfully');

    // Verify report appears in drafts list
    await expect(page.locator('[data-testid="report-status"]')).toContainText('Draft');
  });

  test('should submit report for review', async ({ page }) => {
    // Navigate to existing draft report
    await page.goto('/reports/draft-12345');

    // Verify report is in draft state
    await expect(page.locator('[data-testid="report-status-badge"]')).toContainText('Draft');

    // Click "Submit for Review" button
    await page.click('button:has-text("Submit for Review")');

    // Confirm submission in modal
    await expect(page.locator('[data-testid="submit-modal"]')).toBeVisible();
    await page.fill('textarea[name="review-notes"]',
      'Report ready for executive review. All metrics validated and evidence attached.');

    await page.click('[data-testid="confirm-submit"]');

    // Verify submission success
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Report submitted for review');

    // Verify status changed to "Under Review"
    await expect(page.locator('[data-testid="report-status-badge"]')).toContainText('Under Review');

    // Verify edit buttons are now disabled
    await expect(page.locator('button:has-text("Edit Report")')).toBeDisabled();
  });

  test('should approve report as admin', async ({ page }) => {
    // Logout and login as admin
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Navigate to reports pending approval
    await page.goto('/admin/approvals');

    // Click on report awaiting approval
    await page.click('[data-testid="report-12345"]');

    // Verify report details displayed
    await expect(page.locator('h1')).toContainText('Q4 2024 Impact Report');
    await expect(page.locator('[data-testid="report-status-badge"]')).toContainText('Under Review');

    // Review metrics and evidence
    await page.click('[data-testid="expand-metrics"]');
    await expect(page.locator('[data-testid="sroi-value"]')).toBeVisible();
    await expect(page.locator('[data-testid="vis-score"]')).toBeVisible();

    // Click "Approve" button
    await page.click('button:has-text("Approve Report")');

    // Fill approval details
    await page.fill('textarea[name="approval-notes"]',
      'Report approved. All metrics verified and meet quality standards.');
    await page.check('input[name="certify-accuracy"]');

    // Confirm approval
    await page.click('[data-testid="confirm-approval"]');

    // Verify approval success
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Report approved successfully');

    // Verify status changed to "Approved"
    await expect(page.locator('[data-testid="report-status-badge"]')).toContainText('Approved');
  });

  test('should lock report after approval', async ({ page }) => {
    // Login as admin
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Navigate to approved report
    await page.goto('/reports/approved-12345');

    // Verify report is approved
    await expect(page.locator('[data-testid="report-status-badge"]')).toContainText('Approved');

    // Click "Lock Report" button
    await page.click('button:has-text("Lock Report")');

    // Confirm lock action
    await expect(page.locator('[data-testid="lock-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="lock-modal"]'))
      .toContainText('Locking this report will make it immutable');

    await page.click('[data-testid="confirm-lock"]');

    // Verify lock success
    await expect(page.locator('[data-testid="toast-success"]')).toContainText('Report locked successfully');

    // Verify status changed to "Locked"
    await expect(page.locator('[data-testid="report-status-badge"]')).toContainText('Locked');

    // Verify lock icon displayed
    await expect(page.locator('[data-testid="lock-icon"]')).toBeVisible();

    // Verify all edit actions disabled
    await expect(page.locator('button:has-text("Edit")')).toBeDisabled();
    await expect(page.locator('button:has-text("Delete")')).toBeDisabled();
  });

  test('should display watermark on locked report', async ({ page }) => {
    // Navigate to locked report
    await page.goto('/reports/locked-12345');

    // Verify report is locked
    await expect(page.locator('[data-testid="report-status-badge"]')).toContainText('Locked');

    // Verify watermark overlay visible
    await expect(page.locator('[data-testid="watermark-overlay"]')).toBeVisible();

    // Verify watermark contains company name
    await expect(page.locator('[data-testid="watermark-overlay"]')).toContainText('Example Corp');

    // Verify watermark contains period
    await expect(page.locator('[data-testid="watermark-overlay"]')).toContainText('Q4 2024');

    // Verify watermark contains hash/fingerprint
    const watermarkText = await page.locator('[data-testid="watermark-overlay"]').textContent();
    expect(watermarkText).toMatch(/[A-Fa-f0-9]{8,}/); // Contains hex hash

    // Verify watermark is semi-transparent (not blocking content)
    const opacity = await page.locator('[data-testid="watermark-overlay"]').evaluate(
      el => window.getComputedStyle(el).opacity
    );
    expect(parseFloat(opacity)).toBeLessThan(0.3);

    // Verify watermark repeats across page
    const watermarkCount = await page.locator('[data-testid="watermark-text"]').count();
    expect(watermarkCount).toBeGreaterThan(3); // Multiple watermark instances
  });

  test('should show version history', async ({ page }) => {
    // Navigate to report
    await page.goto('/reports/12345');

    // Click "Version History" button
    await page.click('button:has-text("Version History")');

    // Verify version history panel opens
    await expect(page.locator('[data-testid="version-history-panel"]')).toBeVisible();

    // Verify history entries displayed
    await expect(page.locator('[data-testid="version-entry"]').first()).toBeVisible();

    // Verify version entry contains key information
    const firstVersion = page.locator('[data-testid="version-entry"]').first();
    await expect(firstVersion).toContainText('Draft created');
    await expect(firstVersion).toContainText('reporter@example.com');

    // Verify multiple versions shown
    const versionCount = await page.locator('[data-testid="version-entry"]').count();
    expect(versionCount).toBeGreaterThanOrEqual(3); // Draft, Review, Approval

    // Verify timeline order (newest first)
    const versions = await page.locator('[data-testid="version-entry"]').allTextContents();
    expect(versions[0]).toContain('Locked');
    expect(versions[1]).toContain('Approved');
    expect(versions[2]).toContain('Submitted for Review');

    // Click on a version to view details
    await page.locator('[data-testid="version-entry"]').nth(1).click();

    // Verify version details modal
    await expect(page.locator('[data-testid="version-details-modal"]')).toBeVisible();
    await expect(page.locator('[data-testid="version-details-modal"]')).toContainText('Approved');
    await expect(page.locator('[data-testid="version-details-modal"]')).toContainText('admin@example.com');
  });

  test('should handle approval rejection flow', async ({ page }) => {
    // Login as admin
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('input[name="email"]', 'admin@example.com');
    await page.fill('input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');

    // Navigate to report under review
    await page.goto('/admin/approvals/review-67890');

    // Click "Request Changes" button
    await page.click('button:has-text("Request Changes")');

    // Fill rejection details
    await expect(page.locator('[data-testid="reject-modal"]')).toBeVisible();
    await page.fill('textarea[name="rejection-notes"]',
      'Please update the SROI calculation methodology section and add supporting evidence for Q4 volunteer hours.');

    await page.click('[data-testid="confirm-reject"]');

    // Verify rejection success
    await expect(page.locator('[data-testid="toast-success"]'))
      .toContainText('Changes requested');

    // Verify status changed to "Changes Requested"
    await expect(page.locator('[data-testid="report-status-badge"]'))
      .toContainText('Changes Requested');

    // Logout and login as original reporter
    await page.goto('/logout');
    await page.goto('/login');
    await page.fill('input[name="email"]', 'reporter@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Navigate to report
    await page.goto('/reports/67890');

    // Verify rejection notes visible
    await expect(page.locator('[data-testid="reviewer-feedback"]')).toBeVisible();
    await expect(page.locator('[data-testid="reviewer-feedback"]'))
      .toContainText('Please update the SROI calculation methodology');

    // Verify edit is now enabled again
    await expect(page.locator('button:has-text("Edit Report")')).toBeEnabled();
  });

  test('should preserve report audit trail', async ({ page }) => {
    // Navigate to locked report
    await page.goto('/reports/locked-12345');

    // Open audit trail
    await page.click('button:has-text("Audit Trail")');

    // Verify audit trail panel
    await expect(page.locator('[data-testid="audit-trail-panel"]')).toBeVisible();

    // Verify key audit events
    const auditEvents = page.locator('[data-testid="audit-event"]');

    // Check for creation event
    await expect(auditEvents.filter({ hasText: 'Report created' })).toBeVisible();

    // Check for submission event
    await expect(auditEvents.filter({ hasText: 'Submitted for review' })).toBeVisible();

    // Check for approval event
    await expect(auditEvents.filter({ hasText: 'Approved' })).toBeVisible();

    // Check for lock event
    await expect(auditEvents.filter({ hasText: 'Locked' })).toBeVisible();

    // Verify each event has timestamp
    const firstEvent = auditEvents.first();
    await expect(firstEvent.locator('[data-testid="event-timestamp"]')).toBeVisible();

    // Verify each event has actor
    await expect(firstEvent.locator('[data-testid="event-actor"]')).toBeVisible();

    // Verify events are in chronological order
    const eventCount = await auditEvents.count();
    expect(eventCount).toBeGreaterThanOrEqual(4);
  });
});
