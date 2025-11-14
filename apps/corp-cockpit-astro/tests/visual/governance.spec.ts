import { test, expect } from '@playwright/test';

/**
 * Visual Regression Test Suite: Governance
 *
 * Captures and compares screenshots of the governance features including:
 * - Consent status table
 * - DSAR (Data Subject Access Request) queue
 * - Retention notices
 * - Export audit log
 *
 * These tests establish visual baselines for compliance and governance interfaces.
 */

test.describe('Governance Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Login as compliance admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'compliance@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should capture governance overview page', async ({ page }) => {
    // Navigate to governance
    await page.goto('/governance');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="governance-container"]', {
      state: 'visible'
    });

    // Capture full page
    await expect(page).toHaveScreenshot('governance-overview-full.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05
    });

    // Capture header with compliance metrics
    await expect(page.locator('[data-testid="governance-header"]'))
      .toHaveScreenshot('governance-header.png');
  });

  test('should capture consent status table - default view', async ({ page }) => {
    // Navigate to consent management
    await page.goto('/governance/consent');

    // Wait for table to load
    await page.waitForSelector('[data-testid="consent-status-table"]', {
      state: 'visible'
    });

    // Capture consent table
    await expect(page.locator('[data-testid="consent-status-table"]'))
      .toHaveScreenshot('consent-status-table-default.png');

    // Capture table header
    await expect(page.locator('[data-testid="consent-table-header"]'))
      .toHaveScreenshot('consent-table-header.png');

    // Capture first row
    await expect(page.locator('[data-testid="consent-table-row"]').first())
      .toHaveScreenshot('consent-table-row-sample.png');
  });

  test('should capture consent table with different statuses', async ({ page }) => {
    // Navigate to consent management
    await page.goto('/governance/consent');
    await page.waitForSelector('[data-testid="consent-status-table"]', {
      state: 'visible'
    });

    // Filter by Granted status
    await page.click('[data-testid="filter-status-granted"]');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="consent-status-table"]'))
      .toHaveScreenshot('consent-table-status-granted.png');

    // Filter by Pending status
    await page.click('[data-testid="filter-status-pending"]');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="consent-status-table"]'))
      .toHaveScreenshot('consent-table-status-pending.png');

    // Filter by Revoked status
    await page.click('[data-testid="filter-status-revoked"]');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="consent-status-table"]'))
      .toHaveScreenshot('consent-table-status-revoked.png');
  });

  test('should capture consent detail modal', async ({ page }) => {
    // Navigate to consent management
    await page.goto('/governance/consent');
    await page.waitForSelector('[data-testid="consent-table-row"]', {
      state: 'visible'
    });

    // Click on first consent row
    await page.click('[data-testid="consent-table-row"]');

    // Wait for detail modal
    await page.waitForSelector('[data-testid="consent-detail-modal"]', {
      state: 'visible'
    });

    // Capture modal
    await expect(page.locator('[data-testid="consent-detail-modal"]'))
      .toHaveScreenshot('consent-detail-modal.png');

    // Capture consent history section
    await expect(page.locator('[data-testid="consent-history"]'))
      .toHaveScreenshot('consent-history-section.png');
  });

  test('should capture DSAR queue - default view', async ({ page }) => {
    // Navigate to DSAR queue
    await page.goto('/governance/dsar');

    // Wait for queue to load
    await page.waitForSelector('[data-testid="dsar-queue"]', {
      state: 'visible'
    });

    // Capture DSAR queue
    await expect(page.locator('[data-testid="dsar-queue"]'))
      .toHaveScreenshot('dsar-queue-default.png');

    // Capture queue stats
    await expect(page.locator('[data-testid="dsar-queue-stats"]'))
      .toHaveScreenshot('dsar-queue-stats.png');
  });

  test('should capture DSAR queue with different priorities', async ({ page }) => {
    // Navigate to DSAR queue
    await page.goto('/governance/dsar');
    await page.waitForSelector('[data-testid="dsar-queue"]', {
      state: 'visible'
    });

    // Capture default (all priorities)
    await expect(page.locator('[data-testid="dsar-queue"]'))
      .toHaveScreenshot('dsar-queue-all-priorities.png');

    // Filter by high priority
    await page.click('[data-testid="filter-priority-high"]');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="dsar-queue"]'))
      .toHaveScreenshot('dsar-queue-high-priority.png');

    // Filter by urgent
    await page.click('[data-testid="filter-priority-urgent"]');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="dsar-queue"]'))
      .toHaveScreenshot('dsar-queue-urgent.png');
  });

  test('should capture DSAR request details', async ({ page }) => {
    // Navigate to DSAR queue
    await page.goto('/governance/dsar');
    await page.waitForSelector('[data-testid="dsar-request-card"]', {
      state: 'visible'
    });

    // Click on first request
    await page.click('[data-testid="dsar-request-card"]');

    // Wait for detail view
    await page.waitForSelector('[data-testid="dsar-detail-panel"]', {
      state: 'visible'
    });

    // Capture detail panel
    await expect(page.locator('[data-testid="dsar-detail-panel"]'))
      .toHaveScreenshot('dsar-detail-panel.png');

    // Capture request timeline
    await expect(page.locator('[data-testid="dsar-timeline"]'))
      .toHaveScreenshot('dsar-timeline.png');

    // Capture action buttons
    await expect(page.locator('[data-testid="dsar-actions"]'))
      .toHaveScreenshot('dsar-actions.png');
  });

  test('should capture DSAR fulfillment modal', async ({ page }) => {
    // Navigate to DSAR queue
    await page.goto('/governance/dsar');
    await page.waitForSelector('[data-testid="dsar-request-card"]', {
      state: 'visible'
    });

    // Click first request and then Fulfill button
    await page.click('[data-testid="dsar-request-card"]');
    await page.click('[data-testid="fulfill-dsar"]');

    // Wait for fulfillment modal
    await page.waitForSelector('[data-testid="dsar-fulfillment-modal"]', {
      state: 'visible'
    });

    // Capture modal
    await expect(page.locator('[data-testid="dsar-fulfillment-modal"]'))
      .toHaveScreenshot('dsar-fulfillment-modal.png');

    // Capture data export options
    await expect(page.locator('[data-testid="dsar-export-options"]'))
      .toHaveScreenshot('dsar-export-options.png');
  });

  test('should capture retention notices - overview', async ({ page }) => {
    // Navigate to retention notices
    await page.goto('/governance/retention');

    // Wait for notices to load
    await page.waitForSelector('[data-testid="retention-notices"]', {
      state: 'visible'
    });

    // Capture retention notices page
    await expect(page).toHaveScreenshot('retention-notices-full.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Capture notices list
    await expect(page.locator('[data-testid="retention-notices-list"]'))
      .toHaveScreenshot('retention-notices-list.png');
  });

  test('should capture retention policy viewer', async ({ page }) => {
    // Navigate to retention policies
    await page.goto('/governance/retention/policies');

    // Wait for policies to load
    await page.waitForSelector('[data-testid="retention-policies"]', {
      state: 'visible'
    });

    // Capture policies list
    await expect(page.locator('[data-testid="retention-policies"]'))
      .toHaveScreenshot('retention-policies-list.png');

    // Click on a policy
    await page.click('[data-testid="retention-policy-card"]');

    // Wait for policy details
    await page.waitForSelector('[data-testid="policy-detail-view"]', {
      state: 'visible'
    });

    // Capture policy details
    await expect(page.locator('[data-testid="policy-detail-view"]'))
      .toHaveScreenshot('retention-policy-detail.png');

    // Capture retention schedule
    await expect(page.locator('[data-testid="retention-schedule"]'))
      .toHaveScreenshot('retention-schedule.png');
  });

  test('should capture retention notices with different statuses', async ({ page }) => {
    // Navigate to retention notices
    await page.goto('/governance/retention');
    await page.waitForSelector('[data-testid="retention-notices"]', {
      state: 'visible'
    });

    // Filter by Active
    await page.click('[data-testid="filter-status-active"]');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="retention-notices-list"]'))
      .toHaveScreenshot('retention-notices-active.png');

    // Filter by Pending
    await page.click('[data-testid="filter-status-pending"]');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="retention-notices-list"]'))
      .toHaveScreenshot('retention-notices-pending.png');

    // Filter by Expired
    await page.click('[data-testid="filter-status-expired"]');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="retention-notices-list"]'))
      .toHaveScreenshot('retention-notices-expired.png');
  });

  test('should capture export audit log', async ({ page }) => {
    // Navigate to audit log
    await page.goto('/governance/audit-log');

    // Wait for audit log to load
    await page.waitForSelector('[data-testid="export-audit-log"]', {
      state: 'visible'
    });

    // Capture audit log page
    await expect(page).toHaveScreenshot('export-audit-log-full.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Capture audit log table
    await expect(page.locator('[data-testid="export-audit-log"]'))
      .toHaveScreenshot('export-audit-log-table.png');

    // Capture audit log filters
    await expect(page.locator('[data-testid="audit-log-filters"]'))
      .toHaveScreenshot('audit-log-filters.png');
  });

  test('should capture audit log entry details', async ({ page }) => {
    // Navigate to audit log
    await page.goto('/governance/audit-log');
    await page.waitForSelector('[data-testid="audit-log-entry"]', {
      state: 'visible'
    });

    // Click on first entry
    await page.click('[data-testid="audit-log-entry"]');

    // Wait for details modal
    await page.waitForSelector('[data-testid="audit-entry-modal"]', {
      state: 'visible'
    });

    // Capture modal
    await expect(page.locator('[data-testid="audit-entry-modal"]'))
      .toHaveScreenshot('audit-entry-detail-modal.png');

    // Capture metadata section
    await expect(page.locator('[data-testid="audit-entry-metadata"]'))
      .toHaveScreenshot('audit-entry-metadata.png');

    // Capture changes section (if applicable)
    const changesVisible = await page.locator('[data-testid="audit-entry-changes"]')
      .isVisible()
      .catch(() => false);

    if (changesVisible) {
      await expect(page.locator('[data-testid="audit-entry-changes"]'))
        .toHaveScreenshot('audit-entry-changes.png');
    }
  });

  test('should capture audit log with different event types', async ({ page }) => {
    // Navigate to audit log
    await page.goto('/governance/audit-log');
    await page.waitForSelector('[data-testid="export-audit-log"]', {
      state: 'visible'
    });

    // Filter by Export events
    await page.click('[data-testid="filter-event-export"]');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="export-audit-log"]'))
      .toHaveScreenshot('audit-log-exports.png');

    // Filter by Access events
    await page.click('[data-testid="filter-event-access"]');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="export-audit-log"]'))
      .toHaveScreenshot('audit-log-access.png');

    // Filter by Deletion events
    await page.click('[data-testid="filter-event-deletion"]');
    await page.waitForTimeout(500);

    await expect(page.locator('[data-testid="export-audit-log"]'))
      .toHaveScreenshot('audit-log-deletions.png');
  });

  test('should capture compliance framework selector', async ({ page }) => {
    // Navigate to governance settings
    await page.goto('/governance/settings');

    // Wait for settings to load
    await page.waitForSelector('[data-testid="framework-selector"]', {
      state: 'visible'
    });

    // Capture framework selector
    await expect(page.locator('[data-testid="framework-selector"]'))
      .toHaveScreenshot('framework-selector.png');

    // Expand framework details
    await page.click('[data-testid="framework-gdpr"]');
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="framework-gdpr-details"]'))
      .toHaveScreenshot('framework-gdpr-details.png');
  });

  test('should capture consent preferences center', async ({ page }) => {
    // Navigate to consent preferences
    await page.goto('/governance/consent/preferences');

    // Wait for preferences to load
    await page.waitForSelector('[data-testid="consent-preferences"]', {
      state: 'visible'
    });

    // Capture preferences center
    await expect(page.locator('[data-testid="consent-preferences"]'))
      .toHaveScreenshot('consent-preferences-center.png');

    // Capture purpose categories
    await expect(page.locator('[data-testid="consent-purposes"]'))
      .toHaveScreenshot('consent-purposes.png');

    // Expand a category
    await page.click('[data-testid="purpose-category-marketing"]');
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="purpose-category-marketing"]'))
      .toHaveScreenshot('consent-purpose-expanded.png');
  });

  test('should capture compliance dashboard', async ({ page }) => {
    // Navigate to compliance dashboard
    await page.goto('/governance/dashboard');

    // Wait for dashboard to load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="compliance-dashboard"]', {
      state: 'visible'
    });

    // Capture full dashboard
    await expect(page).toHaveScreenshot('compliance-dashboard-full.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Capture individual widgets
    await expect(page.locator('[data-testid="consent-rate-widget"]'))
      .toHaveScreenshot('consent-rate-widget.png');

    await expect(page.locator('[data-testid="dsar-metrics-widget"]'))
      .toHaveScreenshot('dsar-metrics-widget.png');

    await expect(page.locator('[data-testid="retention-compliance-widget"]'))
      .toHaveScreenshot('retention-compliance-widget.png');
  });

  test('should capture responsive layouts', async ({ page }) => {
    // Navigate to governance overview
    await page.goto('/governance');
    await page.waitForLoadState('networkidle');

    // Desktop (1920x1080) - default
    await expect(page).toHaveScreenshot('governance-desktop.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('governance-tablet.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Mobile (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('governance-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should capture dark mode', async ({ page }) => {
    // Navigate to governance
    await page.goto('/governance');
    await page.waitForLoadState('networkidle');

    // Enable dark mode
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForTimeout(300);

    // Capture dark mode governance
    await expect(page).toHaveScreenshot('governance-dark-mode.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Capture dark mode consent table
    await page.goto('/governance/consent');
    await page.waitForSelector('[data-testid="consent-status-table"]', {
      state: 'visible'
    });

    await expect(page.locator('[data-testid="consent-status-table"]'))
      .toHaveScreenshot('consent-table-dark.png');
  });

  test('should capture empty states', async ({ page }) => {
    // Navigate to DSAR queue with no requests
    await page.goto('/governance/dsar?empty=true');

    // Wait for empty state
    await page.waitForSelector('[data-testid="dsar-empty-state"]', {
      state: 'visible'
    });

    // Capture DSAR empty state
    await expect(page.locator('[data-testid="dsar-empty-state"]'))
      .toHaveScreenshot('dsar-empty-state.png');

    // Navigate to retention with no notices
    await page.goto('/governance/retention?empty=true');
    await page.waitForSelector('[data-testid="retention-empty-state"]', {
      state: 'visible'
    });

    // Capture retention empty state
    await expect(page.locator('[data-testid="retention-empty-state"]'))
      .toHaveScreenshot('retention-empty-state.png');
  });

  test('should capture loading states', async ({ page }) => {
    // Intercept API to delay response
    await page.route('**/api/governance/consent', async route => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      await route.continue();
    });

    // Navigate to consent management
    await page.goto('/governance/consent');

    // Capture loading state
    await page.waitForSelector('[data-testid="consent-loading"]', {
      state: 'visible',
      timeout: 5000
    });

    await expect(page.locator('[data-testid="consent-container"]'))
      .toHaveScreenshot('consent-loading.png');
  });
});
