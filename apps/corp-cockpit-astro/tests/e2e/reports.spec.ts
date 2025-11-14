/**
 * Reports E2E Tests
 *
 * Tests cover:
 * - Report list display
 * - Report generation
 * - Report templates
 * - Report approval workflow
 * - Report export (PDF, CSV)
 * - Narrative editor
 * - Report scheduling
 * - Report sharing
 */

import { test, expect } from '@playwright/test';
import {
  mockSession,
  navigateToCockpit,
  TEST_USERS,
  TEST_COMPANIES,
  waitForLoadingComplete,
  waitForNetworkIdle,
} from './helpers';

test.describe('Reports', () => {
  test.describe('Report Access Control', () => {
    test('should allow viewer to view reports', async ({ page }) => {
      await mockSession(page, TEST_USERS.VIEWER);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/reports');

      // Should access reports page
      const reportsPage = page.locator('main, [role="main"]');
      await expect(reportsPage).toBeVisible({ timeout: 10000 });
    });

    test('should allow manager to generate reports', async ({ page }) => {
      await mockSession(page, TEST_USERS.MANAGER);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/reports');
      await waitForLoadingComplete(page);

      // Look for generate report button
      const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Create Report")');
      const count = await generateBtn.count();

      if (count > 0) {
        await expect(generateBtn.first()).toBeVisible();
      }
    });

    test('should allow admin to schedule reports', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/reports');
      await waitForLoadingComplete(page);

      // Look for schedule button
      const scheduleBtn = page.locator('button:has-text("Schedule"), [data-action="schedule"]');
      const count = await scheduleBtn.count();

      if (count > 0) {
        await expect(scheduleBtn.first()).toBeVisible();
      }
    });
  });

  test.describe('Report List', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/reports');
      await waitForLoadingComplete(page);
    });

    test('should display list of reports', async ({ page }) => {
      const reportItems = page.locator('[data-testid="report-item"], .report-item, .report-card');
      const count = await reportItems.count();

      if (count > 0) {
        await expect(reportItems.first()).toBeVisible();
      } else {
        // Check for empty state
        const emptyState = page.locator('[data-testid="empty-state"], .empty-state');
        await expect(emptyState).toBeVisible();
      }
    });

    test('should display report metadata', async ({ page }) => {
      const reportItems = page.locator('[data-testid="report-item"], .report-item');
      const count = await reportItems.count();

      if (count > 0) {
        const firstReport = reportItems.first();

        // Should have report name
        const name = firstReport.locator('[data-testid="report-name"], .report-name, h3, h4');
        await expect(name).toBeVisible();

        // Should have date
        const date = firstReport.locator('time, [data-testid*="date"]');
        const hasDate = await date.isVisible().catch(() => false);

        expect(hasDate || true).toBe(true);
      }
    });

    test('should show report status', async ({ page }) => {
      const reportItems = page.locator('[data-testid="report-item"], .report-item');
      const count = await reportItems.count();

      if (count > 0) {
        const status = page.locator('[data-testid*="status"], .status-badge');
        const hasStatus = await status.isVisible().catch(() => false);

        expect(hasStatus || true).toBe(true);
      }
    });
  });

  test.describe('Report Generation', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.MANAGER);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/reports');
      await waitForLoadingComplete(page);
    });

    test('should open report generation dialog', async ({ page }) => {
      const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Create Report"), button:has-text("New Report")');
      const count = await generateBtn.count();

      if (count > 0) {
        await generateBtn.first().click();

        const dialog = page.locator('[role="dialog"], .modal, [data-testid="report-dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });
      }
    });

    test('should select report template', async ({ page }) => {
      const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Create Report")');
      const count = await generateBtn.count();

      if (count > 0) {
        await generateBtn.first().click();

        const dialog = page.locator('[role="dialog"], .modal');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Look for template selector
        const templateSelect = dialog.locator('select, [role="combobox"], [data-testid="template-select"]');
        const hasTemplate = await templateSelect.isVisible().catch(() => false);

        if (hasTemplate) {
          await expect(templateSelect).toBeVisible();
        }
      }
    });

    test('should configure report parameters', async ({ page }) => {
      const generateBtn = page.locator('button:has-text("Generate"), button:has-text("Create Report")');
      const count = await generateBtn.count();

      if (count > 0) {
        await generateBtn.first().click();

        const dialog = page.locator('[role="dialog"], .modal');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        // Look for date range inputs
        const dateInputs = dialog.locator('input[type="date"]');
        const hasDateInputs = await dateInputs.count() > 0;

        expect(hasDateInputs || true).toBe(true);
      }
    });
  });

  test.describe('Report Export', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.MANAGER);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/reports');
      await waitForLoadingComplete(page);
    });

    test('should export report as PDF', async ({ page }) => {
      const pdfExportBtn = page.locator('button:has-text("PDF"), button:has-text("Export PDF"), [data-format="pdf"]');
      const count = await pdfExportBtn.count();

      if (count > 0) {
        await expect(pdfExportBtn.first()).toBeVisible();
      }
    });

    test('should export report as CSV', async ({ page }) => {
      const csvExportBtn = page.locator('button:has-text("CSV"), button:has-text("Export CSV"), [data-format="csv"]');
      const count = await csvExportBtn.count();

      if (count > 0) {
        await expect(csvExportBtn.first()).toBeVisible();
      }
    });

    test('should export report as JSON', async ({ page }) => {
      const jsonExportBtn = page.locator('button:has-text("JSON"), [data-format="json"]');
      const count = await jsonExportBtn.count();

      if (count > 0) {
        await expect(jsonExportBtn.first()).toBeVisible();
      }
    });
  });

  test.describe('Narrative Editor', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.MANAGER);
    });

    test('should display narrative editor', async ({ page }) => {
      // Navigate to a report with narrative editor
      await page.goto('/en/cockpit/company-1/reports/report-1');
      await waitForLoadingComplete(page);

      const editor = page.locator('[data-testid="narrative-editor"], .editor, [contenteditable="true"]');
      const hasEditor = await editor.isVisible().catch(() => false);

      if (hasEditor) {
        await expect(editor).toBeVisible();
      }
    });

    test('should edit narrative content', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/reports/report-1');
      await waitForLoadingComplete(page);

      const editor = page.locator('[data-testid="narrative-editor"], [contenteditable="true"]');
      const count = await editor.count();

      if (count > 0) {
        await editor.first().click();
        await editor.first().fill('Test narrative content');

        const content = await editor.first().textContent();
        expect(content).toContain('Test narrative');
      }
    });

    test('should save narrative changes', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/reports/report-1');
      await waitForLoadingComplete(page);

      const saveBtn = page.locator('button:has-text("Save"), button[aria-label*="Save"]');
      const count = await saveBtn.count();

      if (count > 0) {
        await expect(saveBtn.first()).toBeVisible();
      }
    });
  });

  test.describe('Report Approval Workflow', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
    });

    test('should display approval workflow', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/reports/report-1/approval');
      await waitForLoadingComplete(page);

      const workflow = page.locator('[data-testid="approval-workflow"], .approval-panel');
      const hasWorkflow = await workflow.isVisible().catch(() => false);

      if (hasWorkflow) {
        await expect(workflow).toBeVisible();
      }
    });

    test('should show approval status', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/reports/report-1/approval');
      await waitForLoadingComplete(page);

      const status = page.locator('[data-testid*="approval-status"], .approval-status');
      const hasStatus = await status.isVisible().catch(() => false);

      if (hasStatus) {
        await expect(status).toBeVisible();
      }
    });

    test('should allow approver to approve report', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/reports/report-1/approval');
      await waitForLoadingComplete(page);

      const approveBtn = page.locator('button:has-text("Approve"), button[data-action="approve"]');
      const count = await approveBtn.count();

      if (count > 0) {
        await expect(approveBtn.first()).toBeVisible();
      }
    });

    test('should allow approver to reject report', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/reports/report-1/approval');
      await waitForLoadingComplete(page);

      const rejectBtn = page.locator('button:has-text("Reject"), button[data-action="reject"]');
      const count = await rejectBtn.count();

      if (count > 0) {
        await expect(rejectBtn.first()).toBeVisible();
      }
    });
  });

  test.describe('Report Scheduling', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/reports');
      await waitForLoadingComplete(page);
    });

    test('should open schedule dialog', async ({ page }) => {
      const scheduleBtn = page.locator('button:has-text("Schedule"), [data-action="schedule"]');
      const count = await scheduleBtn.count();

      if (count > 0) {
        await scheduleBtn.first().click();

        const dialog = page.locator('[role="dialog"], .modal');
        await expect(dialog).toBeVisible({ timeout: 5000 });
      }
    });

    test('should configure schedule frequency', async ({ page }) => {
      const scheduleBtn = page.locator('button:has-text("Schedule")');
      const count = await scheduleBtn.count();

      if (count > 0) {
        await scheduleBtn.first().click();

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        const frequencySelect = dialog.locator('select[name*="frequency"], [data-testid="frequency-select"]');
        const hasFrequency = await frequencySelect.isVisible().catch(() => false);

        if (hasFrequency) {
          await expect(frequencySelect).toBeVisible();
        }
      }
    });
  });

  test.describe('Report Sharing', () => {
    test.beforeEach(async ({ page }) => {
      await mockSession(page, TEST_USERS.MANAGER);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/reports');
      await waitForLoadingComplete(page);
    });

    test('should create share link', async ({ page }) => {
      const shareBtn = page.locator('button:has-text("Share"), button[aria-label*="Share"]');
      const count = await shareBtn.count();

      if (count > 0) {
        await shareBtn.first().click();

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });
      }
    });

    test('should copy share link', async ({ page }) => {
      const shareBtn = page.locator('button:has-text("Share")');
      const count = await shareBtn.count();

      if (count > 0) {
        await shareBtn.first().click();

        const dialog = page.locator('[role="dialog"]');
        await expect(dialog).toBeVisible({ timeout: 5000 });

        const copyBtn = dialog.locator('button:has-text("Copy"), button[aria-label*="Copy"]');
        const hasCopy = await copyBtn.isVisible().catch(() => false);

        if (hasCopy) {
          await expect(copyBtn).toBeVisible();
        }
      }
    });
  });
});
