import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

/**
 * E2E Test Suite: Executive Pack Export (PPTX)
 *
 * Tests the executive pack generation and export including:
 * - Export modal opening
 * - Format selection (PDF, PPTX)
 * - Narrative controls (tone, length)
 * - Export progress tracking
 * - Download link generation
 * - File download verification
 */

test.describe('Executive Pack Export', () => {
  test.beforeEach(async ({ page }) => {
    // Login as executive user
    await page.goto('/login');
    await page.fill('input[name="email"]', 'executive@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should open export modal', async ({ page }) => {
    // Navigate to reports
    await page.goto('/reports/annual-2024');

    // Click Export button
    await page.click('button:has-text("Export")');

    // Verify export modal opens
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();

    // Verify modal title
    await expect(page.locator('[data-testid="export-modal-title"]'))
      .toContainText('Export Executive Pack');

    // Verify format options visible
    await expect(page.locator('[data-testid="format-pdf"]')).toBeVisible();
    await expect(page.locator('[data-testid="format-pptx"]')).toBeVisible();
  });

  test('should select PPTX format', async ({ page }) => {
    // Navigate to reports
    await page.goto('/reports/annual-2024');

    // Open export modal
    await page.click('button:has-text("Export")');
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();

    // Select PPTX format
    await page.click('[data-testid="format-pptx"]');

    // Verify PPTX selected (visual indication)
    await expect(page.locator('[data-testid="format-pptx"]'))
      .toHaveClass(/selected|active/);

    // Verify PPTX-specific options appear
    await expect(page.locator('[data-testid="pptx-template-selector"]')).toBeVisible();
    await expect(page.locator('[data-testid="pptx-theme-selector"]')).toBeVisible();
  });

  test('should configure narrative tone', async ({ page }) => {
    // Navigate to reports
    await page.goto('/reports/annual-2024');

    // Open export modal
    await page.click('button:has-text("Export")');
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();

    // Verify tone selector visible
    await expect(page.locator('[data-testid="narrative-tone-selector"]')).toBeVisible();

    // Verify tone options
    await expect(page.locator('input[value="professional"]')).toBeVisible();
    await expect(page.locator('input[value="inspirational"]')).toBeVisible();
    await expect(page.locator('input[value="technical"]')).toBeVisible();

    // Select "inspirational" tone
    await page.click('input[value="inspirational"]');

    // Verify selection
    await expect(page.locator('input[value="inspirational"]')).toBeChecked();

    // Verify tone description updates
    await expect(page.locator('[data-testid="tone-description"]'))
      .toContainText(/engaging|motivating|uplifting/i);
  });

  test('should configure narrative length', async ({ page }) => {
    // Navigate to reports
    await page.goto('/reports/annual-2024');

    // Open export modal
    await page.click('button:has-text("Export")');
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();

    // Verify length selector visible
    await expect(page.locator('[data-testid="narrative-length-selector"]')).toBeVisible();

    // Verify length options
    await expect(page.locator('input[value="brief"]')).toBeVisible();
    await expect(page.locator('input[value="standard"]')).toBeVisible();
    await expect(page.locator('input[value="detailed"]')).toBeVisible();

    // Select "brief" length
    await page.click('input[value="brief"]');

    // Verify selection
    await expect(page.locator('input[value="brief"]')).toBeChecked();

    // Verify length description
    await expect(page.locator('[data-testid="length-description"]'))
      .toContainText(/concise|summary|highlights/i);

    // Verify estimated page count updates
    const estimatedPages = await page.locator('[data-testid="estimated-pages"]').textContent();
    expect(estimatedPages).toMatch(/\d+-\d+ pages?/);
  });

  test('should start PPTX export with progress indicator', async ({ page }) => {
    // Navigate to reports
    await page.goto('/reports/annual-2024');

    // Open export modal
    await page.click('button:has-text("Export")');
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();

    // Select PPTX
    await page.click('[data-testid="format-pptx"]');

    // Configure options
    await page.click('input[value="professional"]'); // tone
    await page.click('input[value="standard"]'); // length

    // Start export
    await page.click('button:has-text("Generate Executive Pack")');

    // Verify progress indicator appears
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();

    // Verify progress stages
    await expect(page.locator('[data-testid="progress-stage"]'))
      .toContainText(/Analyzing metrics|Generating narrative|Creating slides|Finalizing/i);

    // Verify progress bar
    await expect(page.locator('[data-testid="progress-bar"]')).toBeVisible();

    // Verify progress percentage
    const progressText = await page.locator('[data-testid="progress-percentage"]').textContent();
    expect(progressText).toMatch(/\d+%/);
  });

  test('should display download link when export completes', async ({ page }) => {
    // Navigate to reports
    await page.goto('/reports/annual-2024');

    // Open export modal
    await page.click('button:has-text("Export")');

    // Select format and start export
    await page.click('[data-testid="format-pptx"]');
    await page.click('button:has-text("Generate Executive Pack")');

    // Wait for export to complete (with timeout)
    await expect(page.locator('[data-testid="export-complete"]'))
      .toBeVisible({ timeout: 60000 });

    // Verify completion message
    await expect(page.locator('[data-testid="export-complete"]'))
      .toContainText('Executive pack ready');

    // Verify download link visible
    await expect(page.locator('[data-testid="download-link"]')).toBeVisible();

    // Verify download button enabled
    await expect(page.locator('button:has-text("Download")')).toBeEnabled();

    // Verify file info displayed
    await expect(page.locator('[data-testid="file-size"]')).toBeVisible();
    await expect(page.locator('[data-testid="file-name"]'))
      .toContainText(/Annual_2024.*\.pptx$/i);
  });

  test('should download PPTX file', async ({ page }) => {
    // Navigate to reports
    await page.goto('/reports/annual-2024');

    // Open export modal and start export
    await page.click('button:has-text("Export")');
    await page.click('[data-testid="format-pptx"]');
    await page.click('button:has-text("Generate Executive Pack")');

    // Wait for completion
    await expect(page.locator('[data-testid="export-complete"]'))
      .toBeVisible({ timeout: 60000 });

    // Set up download listener
    const downloadPromise = page.waitForEvent('download');

    // Click download button
    await page.click('button:has-text("Download")');

    // Wait for download
    const download = await downloadPromise;

    // Verify filename
    const filename = download.suggestedFilename();
    expect(filename).toMatch(/.*\.pptx$/);
    expect(filename).toContain('Annual_2024');

    // Save file to temp location for verification
    const downloadPath = path.join('/tmp', filename);
    await download.saveAs(downloadPath);

    // Verify file exists and has content
    const fileExists = fs.existsSync(downloadPath);
    expect(fileExists).toBe(true);

    if (fileExists) {
      const stats = fs.statSync(downloadPath);
      expect(stats.size).toBeGreaterThan(1000); // At least 1KB

      // Clean up
      fs.unlinkSync(downloadPath);
    }
  });

  test('should handle PDF export', async ({ page }) => {
    // Navigate to reports
    await page.goto('/reports/annual-2024');

    // Open export modal
    await page.click('button:has-text("Export")');

    // Select PDF format
    await page.click('[data-testid="format-pdf"]');

    // Verify PDF selected
    await expect(page.locator('[data-testid="format-pdf"]'))
      .toHaveClass(/selected|active/);

    // Verify PDF-specific options
    await expect(page.locator('[data-testid="pdf-layout-selector"]')).toBeVisible();

    // Start export
    await page.click('button:has-text("Generate Executive Pack")');

    // Wait for completion
    await expect(page.locator('[data-testid="export-complete"]'))
      .toBeVisible({ timeout: 60000 });

    // Verify PDF download link
    await expect(page.locator('[data-testid="file-name"]'))
      .toContainText(/\.pdf$/i);
  });

  test('should show export history', async ({ page }) => {
    // Navigate to reports
    await page.goto('/reports/annual-2024');

    // Open export modal
    await page.click('button:has-text("Export")');

    // Click "Export History" tab
    await page.click('[data-testid="export-history-tab"]');

    // Verify history list displayed
    await expect(page.locator('[data-testid="export-history-list"]')).toBeVisible();

    // Verify history entries
    const historyEntries = page.locator('[data-testid="history-entry"]');
    const entryCount = await historyEntries.count();

    if (entryCount > 0) {
      // Verify first entry has key info
      const firstEntry = historyEntries.first();
      await expect(firstEntry.locator('[data-testid="export-date"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="export-format"]')).toBeVisible();
      await expect(firstEntry.locator('[data-testid="export-status"]')).toBeVisible();

      // Verify re-download button
      await expect(firstEntry.locator('button:has-text("Download")')).toBeVisible();
    }
  });

  test('should handle export error gracefully', async ({ page }) => {
    // Navigate to reports with missing data
    await page.goto('/reports/incomplete-draft');

    // Open export modal
    await page.click('button:has-text("Export")');

    // Select format and start export
    await page.click('[data-testid="format-pptx"]');
    await page.click('button:has-text("Generate Executive Pack")');

    // Wait for error or completion
    await page.waitForTimeout(5000);

    // Check for error state
    const errorVisible = await page.locator('[data-testid="export-error"]').isVisible();

    if (errorVisible) {
      // Verify error message
      await expect(page.locator('[data-testid="export-error"]'))
        .toContainText(/error|failed|unable/i);

      // Verify retry button
      await expect(page.locator('button:has-text("Retry")')).toBeVisible();

      // Verify close button
      await expect(page.locator('button:has-text("Close")')).toBeVisible();
    }
  });

  test('should include custom sections in export', async ({ page }) => {
    // Navigate to reports
    await page.goto('/reports/annual-2024');

    // Open export modal
    await page.click('button:has-text("Export")');

    // Click "Customize Sections" button
    await page.click('button:has-text("Customize Sections")');

    // Verify section selector modal
    await expect(page.locator('[data-testid="section-selector"]')).toBeVisible();

    // Verify default sections checked
    await expect(page.locator('input[name="section-executive-summary"]')).toBeChecked();
    await expect(page.locator('input[name="section-metrics"]')).toBeChecked();

    // Uncheck optional section
    await page.click('input[name="section-appendix"]');

    // Verify unchecked
    await expect(page.locator('input[name="section-appendix"]')).not.toBeChecked();

    // Save selections
    await page.click('button:has-text("Apply")');

    // Verify modal closes
    await expect(page.locator('[data-testid="section-selector"]')).not.toBeVisible();

    // Start export with custom sections
    await page.click('button:has-text("Generate Executive Pack")');

    // Verify export starts
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();
  });

  test('should preview narrative before export', async ({ page }) => {
    // Navigate to reports
    await page.goto('/reports/annual-2024');

    // Open export modal
    await page.click('button:has-text("Export")');

    // Select narrative options
    await page.click('input[value="inspirational"]');
    await page.click('input[value="brief"]');

    // Click preview button
    await page.click('button:has-text("Preview Narrative")');

    // Verify preview modal
    await expect(page.locator('[data-testid="narrative-preview"]')).toBeVisible();

    // Verify preview contains generated text
    const previewText = await page.locator('[data-testid="preview-content"]').textContent();
    expect(previewText).toBeTruthy();
    expect(previewText!.length).toBeGreaterThan(100);

    // Verify preview shows selected tone
    await expect(page.locator('[data-testid="preview-tone-label"]'))
      .toContainText('Inspirational');

    // Close preview
    await page.click('[data-testid="close-preview"]');

    // Verify back to export modal
    await expect(page.locator('[data-testid="export-modal"]')).toBeVisible();
  });

  test('should support branding options for whitelabel export', async ({ page }) => {
    // Navigate to reports as partner admin
    await page.goto('/partner/reports/client-report-123');

    // Open export modal
    await page.click('button:has-text("Export")');

    // Verify branding section visible
    await expect(page.locator('[data-testid="branding-section"]')).toBeVisible();

    // Verify logo upload option
    await expect(page.locator('[data-testid="logo-upload"]')).toBeVisible();

    // Verify color customization
    await expect(page.locator('[data-testid="primary-color-picker"]')).toBeVisible();
    await expect(page.locator('[data-testid="secondary-color-picker"]')).toBeVisible();

    // Verify company name field
    await expect(page.locator('input[name="company-name"]')).toBeVisible();

    // Fill in branding details
    await page.fill('input[name="company-name"]', 'Acme Corp');

    // Select primary color
    await page.fill('[data-testid="primary-color-picker"]', '#0066cc');

    // Verify preview updates with branding
    await expect(page.locator('[data-testid="brand-preview"]')).toBeVisible();
  });

  test('should cancel export in progress', async ({ page }) => {
    // Navigate to reports
    await page.goto('/reports/annual-2024');

    // Open export modal and start export
    await page.click('button:has-text("Export")');
    await page.click('[data-testid="format-pptx"]');
    await page.click('button:has-text("Generate Executive Pack")');

    // Verify export in progress
    await expect(page.locator('[data-testid="export-progress"]')).toBeVisible();

    // Click cancel button
    await page.click('button:has-text("Cancel")');

    // Verify cancellation confirmation
    await expect(page.locator('[data-testid="cancel-confirm-modal"]')).toBeVisible();

    // Confirm cancellation
    await page.click('[data-testid="confirm-cancel"]');

    // Verify export cancelled
    await expect(page.locator('[data-testid="export-cancelled"]')).toBeVisible();
    await expect(page.locator('[data-testid="export-cancelled"]'))
      .toContainText('Export cancelled');

    // Verify can close modal
    await page.click('button:has-text("Close")');
    await expect(page.locator('[data-testid="export-modal"]')).not.toBeVisible();
  });
});
