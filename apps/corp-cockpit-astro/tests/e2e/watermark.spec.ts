import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * E2E Test Suite: Watermarking
 *
 * Tests document watermarking functionality including:
 * - Watermark text content (company, period, hash)
 * - ID stamp in footer
 * - Signature block for approved reports
 * - Watermark visibility and opacity
 * - PDF export with watermarks
 * - Tamper-evident hash verification
 */

test.describe('Document Watermarking', () => {
  test.beforeEach(async ({ page }) => {
    // Login as user with export permissions
    await page.goto('/login');
    await page.fill('input[name="email"]', 'user@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should display watermark on locked report', async ({ page }) => {
    // Navigate to locked report
    await page.goto('/reports/locked-annual-2024');

    // Verify report is locked
    await expect(page.locator('[data-testid="report-status"]')).toContainText('Locked');

    // Verify watermark overlay exists
    await expect(page.locator('[data-testid="watermark-overlay"]')).toBeVisible();

    // Verify watermark is semi-transparent
    const opacity = await page.locator('[data-testid="watermark-overlay"]')
      .evaluate(el => window.getComputedStyle(el).opacity);
    expect(parseFloat(opacity)).toBeLessThan(0.3);
    expect(parseFloat(opacity)).toBeGreaterThan(0);
  });

  test('should include company name in watermark', async ({ page }) => {
    // Navigate to locked report
    await page.goto('/reports/locked-annual-2024');

    // Verify watermark overlay visible
    await expect(page.locator('[data-testid="watermark-overlay"]')).toBeVisible();

    // Verify company name present
    const watermarkText = await page.locator('[data-testid="watermark-overlay"]').textContent();
    expect(watermarkText).toContain('Example Corp'); // or tenant name

    // Verify company name appears in each watermark instance
    const watermarkInstances = page.locator('[data-testid="watermark-text"]');
    const instanceCount = await watermarkInstances.count();
    expect(instanceCount).toBeGreaterThan(0);

    for (let i = 0; i < instanceCount; i++) {
      const text = await watermarkInstances.nth(i).textContent();
      expect(text).toContain('Example Corp');
    }
  });

  test('should include reporting period in watermark', async ({ page }) => {
    // Navigate to locked report
    await page.goto('/reports/locked-annual-2024');

    // Verify watermark contains period
    const watermarkText = await page.locator('[data-testid="watermark-overlay"]').textContent();
    expect(watermarkText).toMatch(/2024|Q4 2024|Annual 2024/i);

    // Verify period format is clear
    await expect(page.locator('[data-testid="watermark-period"]').first())
      .toBeVisible();
  });

  test('should include tamper-evident hash in watermark', async ({ page }) => {
    // Navigate to locked report
    await page.goto('/reports/locked-annual-2024');

    // Verify watermark contains hash
    const watermarkText = await page.locator('[data-testid="watermark-overlay"]').textContent();

    // Check for hex hash pattern
    const hashMatch = watermarkText?.match(/[A-Fa-f0-9]{8,}/);
    expect(hashMatch).toBeTruthy();
    expect(hashMatch![0].length).toBeGreaterThanOrEqual(8);

    // Verify hash is displayed with proper formatting
    await expect(page.locator('[data-testid="watermark-hash"]').first())
      .toBeVisible();

    const hashValue = await page.locator('[data-testid="watermark-hash"]').first().textContent();
    expect(hashValue).toMatch(/[A-F0-9]{8,}/i);
  });

  test('should display ID stamp in footer', async ({ page }) => {
    // Navigate to locked report
    await page.goto('/reports/locked-annual-2024');

    // Verify footer exists
    await expect(page.locator('[data-testid="report-footer"]')).toBeVisible();

    // Verify ID stamp in footer
    await expect(page.locator('[data-testid="report-id-stamp"]')).toBeVisible();

    // Verify stamp contains report ID
    const stampText = await page.locator('[data-testid="report-id-stamp"]').textContent();
    expect(stampText).toMatch(/Report ID:|Doc ID:|REP-[A-Z0-9]+/i);

    // Verify stamp contains date
    expect(stampText).toMatch(/\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4}/);
  });

  test('should show signature block on approved reports', async ({ page }) => {
    // Navigate to approved and locked report
    await page.goto('/reports/approved-locked-2024');

    // Verify report is approved
    await expect(page.locator('[data-testid="report-status"]')).toContainText('Approved');

    // Verify signature block exists
    await expect(page.locator('[data-testid="signature-block"]')).toBeVisible();

    // Verify signature contains approver name
    await expect(page.locator('[data-testid="approver-name"]')).toBeVisible();
    const approverName = await page.locator('[data-testid="approver-name"]').textContent();
    expect(approverName).toBeTruthy();
    expect(approverName!.length).toBeGreaterThan(2);

    // Verify signature contains approval date
    await expect(page.locator('[data-testid="approval-date"]')).toBeVisible();

    // Verify signature contains digital signature hash
    await expect(page.locator('[data-testid="digital-signature"]')).toBeVisible();
    const signature = await page.locator('[data-testid="digital-signature"]').textContent();
    expect(signature).toMatch(/[A-Fa-f0-9]{16,}/);
  });

  test('should repeat watermark across entire page', async ({ page }) => {
    // Navigate to locked report
    await page.goto('/reports/locked-annual-2024');

    // Verify multiple watermark instances
    const watermarkInstances = page.locator('[data-testid="watermark-text"]');
    const count = await watermarkInstances.count();

    // Should have multiple instances for coverage
    expect(count).toBeGreaterThanOrEqual(3);

    // Verify watermarks are evenly distributed
    const positions = [];
    for (let i = 0; i < count; i++) {
      const box = await watermarkInstances.nth(i).boundingBox();
      if (box) {
        positions.push({ x: box.x, y: box.y });
      }
    }

    expect(positions.length).toBeGreaterThan(1);

    // Verify positions are different (distributed)
    const uniquePositions = new Set(positions.map(p => `${p.x},${p.y}`));
    expect(uniquePositions.size).toBeGreaterThan(1);
  });

  test('should export PDF with watermark', async ({ page }) => {
    // Navigate to locked report
    await page.goto('/reports/locked-annual-2024');

    // Click Export as PDF
    await page.click('button:has-text("Export")');

    // Select PDF format
    await page.click('[data-testid="format-pdf"]');

    // Start export
    await page.click('button:has-text("Generate")');

    // Wait for export completion
    await expect(page.locator('[data-testid="export-complete"]'))
      .toBeVisible({ timeout: 30000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click download
    await page.click('button:has-text("Download")');

    // Wait for download
    const download = await downloadPromise;

    // Verify filename
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/\.pdf$/i);

    // Save file for verification
    const downloadPath = path.join('/tmp', filename);
    await download.saveAs(downloadPath);

    // Verify file exists
    const fileExists = fs.existsSync(downloadPath);
    expect(fileExists).toBe(true);

    if (fileExists) {
      // Verify file size (should have content)
      const stats = fs.statSync(downloadPath);
      expect(stats.size).toBeGreaterThan(5000); // At least 5KB

      // Note: Full PDF content verification would require PDF parsing library
      // For E2E, we verify download works and file has reasonable size

      // Clean up
      fs.unlinkSync(downloadPath);
    }
  });

  test('should include watermark metadata in export', async ({ page }) => {
    // Navigate to locked report
    await page.goto('/reports/locked-annual-2024');

    // Click Export
    await page.click('button:has-text("Export")');

    // Select PDF
    await page.click('[data-testid="format-pdf"]');

    // Verify watermark settings displayed
    await expect(page.locator('[data-testid="watermark-settings"]')).toBeVisible();

    // Verify watermark preview
    await expect(page.locator('[data-testid="watermark-preview"]')).toBeVisible();

    // Verify watermark includes expected elements
    const previewText = await page.locator('[data-testid="watermark-preview"]').textContent();
    expect(previewText).toContain('Example Corp');
    expect(previewText).toMatch(/2024/);
    expect(previewText).toMatch(/[A-F0-9]{8,}/);
  });

  test('should not show watermark on draft reports', async ({ page }) => {
    // Navigate to draft report
    await page.goto('/reports/draft-new-project');

    // Verify report is draft
    await expect(page.locator('[data-testid="report-status"]')).toContainText('Draft');

    // Verify no watermark overlay
    await expect(page.locator('[data-testid="watermark-overlay"]')).not.toBeVisible();

    // Verify no watermark text
    const watermarkCount = await page.locator('[data-testid="watermark-text"]').count();
    expect(watermarkCount).toBe(0);
  });

  test('should verify watermark hash matches report content', async ({ page }) => {
    // Navigate to locked report
    await page.goto('/reports/locked-annual-2024');

    // Capture watermark hash
    const watermarkHash = await page.locator('[data-testid="watermark-hash"]')
      .first()
      .textContent();

    expect(watermarkHash).toBeTruthy();

    // Open verification panel
    await page.click('[data-testid="verify-watermark"]');

    // Verify hash verification panel
    await expect(page.locator('[data-testid="hash-verification-panel"]')).toBeVisible();

    // Verify computed hash displayed
    await expect(page.locator('[data-testid="computed-hash"]')).toBeVisible();

    const computedHash = await page.locator('[data-testid="computed-hash"]').textContent();

    // Hashes should match
    expect(computedHash).toContain(watermarkHash!);

    // Verify validation status
    await expect(page.locator('[data-testid="validation-status"]'))
      .toContainText(/Valid|Verified|Authentic/i);

    // Verify validation icon (checkmark)
    await expect(page.locator('[data-testid="validation-icon-success"]')).toBeVisible();
  });

  test('should show watermark in print preview', async ({ page }) => {
    // Navigate to locked report
    await page.goto('/reports/locked-annual-2024');

    // Open print dialog (simulated)
    await page.click('button:has-text("Print")');

    // Verify print preview modal
    await expect(page.locator('[data-testid="print-preview"]')).toBeVisible();

    // Verify watermark visible in preview
    await expect(page.locator('[data-testid="print-preview"] [data-testid="watermark-overlay"]'))
      .toBeVisible();

    // Verify watermark appears on each page preview
    const pagePreviews = page.locator('[data-testid="preview-page"]');
    const pageCount = await pagePreviews.count();

    expect(pageCount).toBeGreaterThan(0);

    // Check first page has watermark
    await expect(pagePreviews.first().locator('[data-testid="watermark-text"]'))
      .toBeVisible();
  });

  test('should customize watermark for whitelabel exports', async ({ page }) => {
    // Navigate to report as partner admin
    await page.goto('/partner/reports/client-report-789');

    // Verify watermark uses partner branding
    await expect(page.locator('[data-testid="watermark-overlay"]')).toBeVisible();

    const watermarkText = await page.locator('[data-testid="watermark-overlay"]').textContent();

    // Should contain partner/client name, not platform name
    expect(watermarkText).toContain('Acme Corp'); // Partner name
    expect(watermarkText).not.toContain('TEEI'); // Platform name
  });

  test('should generate unique hash for each report version', async ({ page }) => {
    // Navigate to report version 1
    await page.goto('/reports/annual-2024/version/1');

    const hash1 = await page.locator('[data-testid="watermark-hash"]')
      .first()
      .textContent();

    // Navigate to report version 2
    await page.goto('/reports/annual-2024/version/2');

    const hash2 = await page.locator('[data-testid="watermark-hash"]')
      .first()
      .textContent();

    // Hashes should be different for different versions
    expect(hash1).not.toBe(hash2);
  });

  test('should display watermark warning on tampered report', async ({ page }) => {
    // Navigate to report with simulated tampering
    await page.goto('/reports/tampered-test-report');

    // Verify watermark present
    await expect(page.locator('[data-testid="watermark-overlay"]')).toBeVisible();

    // Open verification
    await page.click('[data-testid="verify-watermark"]');

    // Verify warning displayed
    await expect(page.locator('[data-testid="tamper-warning"]')).toBeVisible();
    await expect(page.locator('[data-testid="tamper-warning"]'))
      .toContainText(/Warning|Tampered|Modified|Invalid/i);

    // Verify validation failed icon
    await expect(page.locator('[data-testid="validation-icon-error"]')).toBeVisible();

    // Verify mismatch details shown
    await expect(page.locator('[data-testid="hash-mismatch-details"]')).toBeVisible();
  });
});
