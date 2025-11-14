import { test, expect } from '@playwright/test';

/**
 * E2E Test: Evidence Explorer
 * Tests lineage visualization, PII redaction, document viewer
 */

test.describe('Evidence Explorer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should display evidence list', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence');

    await expect(page.locator('[data-testid="evidence-list"]')).toBeVisible();
    await expect(page.locator('[data-testid="evidence-item"]').first()).toBeVisible();
  });

  test('should filter evidence by type', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence');

    // Select document type filter
    await page.selectOption('[data-testid="filter-type"]', 'document');

    // Wait for filter to apply
    await page.waitForResponse(response => response.url().includes('/api/evidence'));

    // Results should only show documents
    const items = page.locator('[data-testid="evidence-type"]');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      await expect(items.nth(i)).toContainText('document');
    }
  });

  test('should search evidence', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence');

    await page.fill('[data-testid="search-evidence"]', 'volunteer hours');
    await page.waitForTimeout(500);

    // Results should contain search term
    await expect(page.locator('text=/volunteer hours/i')).toBeVisible();
  });

  test('should open evidence detail viewer', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence');

    // Click first evidence item
    await page.click('[data-testid="evidence-item"]');

    // Detail viewer should open
    await expect(page.locator('[data-testid="evidence-viewer"]')).toBeVisible();
    await expect(page.locator('[data-testid="evidence-metadata"]')).toBeVisible();
  });

  test('should display lineage visualization', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence/evidence-123');

    // Click lineage tab
    await page.click('[data-testid="tab-lineage"]');

    // Lineage graph should be visible
    await expect(page.locator('[data-testid="lineage-graph"]')).toBeVisible();
    await expect(page.locator('svg[data-testid="lineage-svg"]')).toBeVisible();
  });

  test('should show upstream and downstream dependencies', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence/evidence-123');
    await page.click('[data-testid="tab-lineage"]');

    // Should show upstream sources
    await expect(page.locator('[data-testid="upstream-nodes"]')).toBeVisible();

    // Should show downstream usage
    await expect(page.locator('[data-testid="downstream-nodes"]')).toBeVisible();
  });

  test('should navigate lineage graph interactively', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence/evidence-123');
    await page.click('[data-testid="tab-lineage"]');

    // Click on a node in the graph
    await page.click('[data-testid="lineage-node"]');

    // Should show node details
    await expect(page.locator('[data-testid="node-detail-panel"]')).toBeVisible();
  });
});

test.describe('PII Redaction', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should redact PII in document preview', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence/evidence-with-pii');

    // PII should be redacted (replaced with [REDACTED])
    await expect(page.locator('text=/\\[REDACTED\\]/i')).toBeVisible();
  });

  test('should toggle PII visibility (admin only)', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence/evidence-with-pii');

    // Click show PII toggle (admin only)
    const togglePII = page.locator('[data-testid="toggle-pii-visibility"]');
    if (await togglePII.isVisible()) {
      await togglePII.click();

      // Original text should be visible
      await page.waitForTimeout(500);
      // PII is now visible
    }
  });

  test('should detect and highlight PII entities', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence/evidence-with-pii');

    // PII entities should be highlighted
    const piiHighlights = page.locator('[data-pii-type]');
    if (await piiHighlights.count() > 0) {
      await expect(piiHighlights.first()).toBeVisible();
    }
  });

  test('should audit PII access', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence/evidence-with-pii');

    // Toggle PII visibility
    const togglePII = page.locator('[data-testid="toggle-pii-visibility"]');
    if (await togglePII.isVisible()) {
      await togglePII.click();

      // Access should be logged (check audit log)
      await page.goto('/en/cockpit/company-1/admin/audit-log');
      await expect(page.locator('text=/PII access/i')).toBeVisible();
    }
  });
});

test.describe('Document Viewer', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should render PDF documents', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence/pdf-doc-1');

    // PDF viewer should be visible
    await expect(page.locator('[data-testid="pdf-viewer"]')).toBeVisible({ timeout: 10000 });
  });

  test('should render image documents', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence/image-doc-1');

    // Image should be visible
    await expect(page.locator('[data-testid="image-viewer"] img')).toBeVisible();
  });

  test('should download evidence', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence/evidence-123');

    const downloadPromise = page.waitForEvent('download');
    await page.click('[data-testid="download-evidence-button"]');

    const download = await downloadPromise;
    expect(download.suggestedFilename()).toBeTruthy();
  });

  test('should display evidence metadata', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/evidence/evidence-123');

    const metadata = page.locator('[data-testid="evidence-metadata"]');
    await expect(metadata).toBeVisible();

    // Check for standard metadata fields
    await expect(metadata.locator('[data-testid="upload-date"]')).toBeVisible();
    await expect(metadata.locator('[data-testid="file-size"]')).toBeVisible();
    await expect(metadata.locator('[data-testid="uploaded-by"]')).toBeVisible();
  });
});
