import { test, expect } from '@playwright/test';

/**
 * E2E Test: Report Generation & Executive Packs
 * Tests report wizard, PDF/PPTX export, narrative editor
 */

test.describe('Report Generation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should open report generation modal', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports');

    await page.click('[data-testid="create-report-button"]');
    await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();
    await expect(page.locator('h2:has-text("Create New Report")')).toBeVisible();
  });

  test('should show executive template options', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports');
    await page.click('[data-testid="create-report-button"]');

    // Check for 3 executive templates
    await expect(page.locator('[data-testid="template-quarterly"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-annual"]')).toBeVisible();
    await expect(page.locator('[data-testid="template-investor"]')).toBeVisible();
  });

  test('should generate report with narrative editor', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports');
    await page.click('[data-testid="create-report-button"]');

    // Select template
    await page.click('[data-testid="template-quarterly"]');
    await page.click('button:has-text("Next")');

    // Use narrative editor
    const editor = page.locator('[data-testid="narrative-editor"]');
    await expect(editor).toBeVisible();

    await editor.click();
    await page.keyboard.type('Executive Summary: Strong Q1 performance with 15% growth.');

    // Check for rich text controls
    await expect(page.locator('[data-testid="editor-bold"]')).toBeVisible();
    await expect(page.locator('[data-testid="editor-italic"]')).toBeVisible();
  });

  test('should export report as PDF', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-123');

    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-pdf-button"]');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/.*\.pdf$/);
  });

  test('should export report as PPTX', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-123');

    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-pptx-button"]');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/.*\.pptx$/);
  });

  test('should include watermark on approved reports', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-123');

    // Check if report is approved
    const approvedBadge = page.locator('[data-testid="approval-status-approved"]');
    if (await approvedBadge.isVisible()) {
      // Export and check for watermark indicator
      await page.click('[data-testid="export-pdf-button"]');
      await expect(page.locator('text=/watermark|stamped/i')).toBeVisible({ timeout: 2000 });
    }
  });

  test('should embed charts in exported reports', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports/report-123');

    // Check for charts in preview
    await expect(page.locator('canvas, svg[data-testid="report-chart"]')).toBeVisible();

    // Export report
    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="export-pdf-button"]');
    await downloadPromise;
  });

  test('should validate report data before generation', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports');
    await page.click('[data-testid="create-report-button"]');

    // Try to generate without required fields
    await page.click('button:has-text("Generate")');

    // Should show validation errors
    await expect(page.locator('.error-message')).toBeVisible();
  });
});

test.describe('Report List & Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display reports list with filters', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports');

    await expect(page.locator('[data-testid="reports-table"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-status"]')).toBeVisible();
    await expect(page.locator('[data-testid="filter-date"]')).toBeVisible();
  });

  test('should filter reports by status', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports');

    // Select approved filter
    await page.selectOption('[data-testid="filter-status"]', 'approved');

    // Wait for filter to apply
    await page.waitForResponse(response => response.url().includes('/api/reports'));

    // All visible reports should be approved
    const statusBadges = page.locator('[data-testid^="report-status-"]');
    const count = await statusBadges.count();
    for (let i = 0; i < count; i++) {
      await expect(statusBadges.nth(i)).toHaveAttribute('data-testid', 'report-status-approved');
    }
  });

  test('should search reports by title', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports');

    await page.fill('[data-testid="search-reports"]', 'Q1 2024');
    await page.waitForTimeout(500); // Debounce

    // Results should contain search term
    await expect(page.locator('[data-testid="report-title"]:has-text("Q1 2024")')).toBeVisible();
  });

  test('should navigate to report detail page', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports');

    // Click first report
    await page.click('[data-testid="report-row"]');

    // Should navigate to detail page
    await expect(page).toHaveURL(/\/reports\/[^/]+$/);
    await expect(page.locator('[data-testid="report-detail"]')).toBeVisible();
  });
});
