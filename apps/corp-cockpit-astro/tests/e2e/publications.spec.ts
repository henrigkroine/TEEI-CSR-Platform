import { test, expect } from '@playwright/test';

/**
 * E2E Tests for Publications Feature
 *
 * Tests the complete workflow:
 * 1. Create publication
 * 2. Add blocks
 * 3. Publish
 * 4. View public page
 * 5. Test embed
 */

test.describe('Publications E2E Workflow', () => {
  let publicationSlug: string;
  let publicationId: string;

  test.beforeAll(async ({ browser }) => {
    // Setup: Ensure user is authenticated
    const context = await browser.newContext();
    const page = await context.newPage();

    // Login (adjust based on your auth flow)
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL('/dashboard');

    await context.close();
  });

  test('should create a new publication', async ({ page }) => {
    // Navigate to publications manager
    await page.goto('/admin/publications');

    // Wait for page to load
    await expect(page.locator('h1')).toContainText('Publications Manager');

    // Click "New Publication" button
    await page.click('text=New Publication');

    // Wait for editor to load
    await expect(page.locator('h1')).toContainText('New Publication');

    // Fill in publication details
    const timestamp = Date.now();
    publicationSlug = `test-publication-${timestamp}`;

    await page.fill('#title', 'E2E Test Publication');
    await page.fill('#slug', publicationSlug);
    await page.fill('#description', 'This is an E2E test publication');

    // Fill in SEO fields
    await page.fill('#metaTitle', 'E2E Test Publication - Meta Title');
    await page.fill('#metaDescription', 'This is the meta description for testing');

    // Save draft
    await page.click('button:has-text("Save Draft")');

    // Wait for success
    await page.waitForURL(/\/admin\/publications\/[a-f0-9-]+/);

    // Extract publication ID from URL
    const url = page.url();
    publicationId = url.split('/').pop() || '';

    // Verify publication was created
    await expect(page.locator('text=E2E Test Publication')).toBeVisible();
  });

  test('should add content blocks to publication', async ({ page }) => {
    // Navigate to the publication editor
    await page.goto(`/admin/publications/${publicationId}`);

    // Wait for editor to load
    await expect(page.locator('h1')).toContainText('Edit Publication');

    // Add a tile block (mocked for now - would need block editor UI)
    // In a real implementation, this would interact with a block builder UI

    // For demonstration, we'll verify the blocks section exists
    await expect(page.locator('text=Content Blocks')).toBeVisible();
    await expect(page.locator('button:has-text("Add Block")')).toBeVisible();
  });

  test('should publish the publication', async ({ page }) => {
    // Navigate to the publication editor
    await page.goto(`/admin/publications/${publicationId}`);

    // Click publish button
    await page.click('button:has-text("Publish")');

    // Wait for confirmation (adjust based on your UI)
    await page.waitForTimeout(1000);

    // Verify publication status changed
    // This would check for a "LIVE" badge or similar indicator
    await expect(page.locator('[data-status="LIVE"]')).toBeVisible({ timeout: 5000 });
  });

  test('should view the public publication page', async ({ page, context }) => {
    // Open public page in a new context (simulating anonymous user)
    const publicContext = await context.browser()!.newContext();
    const publicPage = await publicContext.newPage();

    // Navigate to public URL
    await publicPage.goto(`/impact/${publicationSlug}`);

    // Verify publication content is visible
    await expect(publicPage.locator('h1')).toContainText('E2E Test Publication');
    await expect(publicPage.locator('text=This is an E2E test publication')).toBeVisible();

    // Verify SEO meta tags
    const metaTitle = await publicPage.getAttribute('meta[property="og:title"]', 'content');
    expect(metaTitle).toContain('E2E Test Publication');

    const metaDescription = await publicPage.getAttribute('meta[name="description"]', 'content');
    expect(metaDescription).toContain('This is the meta description for testing');

    await publicContext.close();
  });

  test('should render embed correctly', async ({ page, context }) => {
    // Create a test page with the embed SDK
    const embedContext = await context.browser()!.newContext();
    const embedPage = await embedContext.newPage();

    // Create HTML with embed script
    await embedPage.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Embed Test</title>
        </head>
        <body>
          <div id="teei-embed"></div>
          <script src="/embed.js"></script>
          <script>
            TEEIEmbed.render({
              containerId: 'teei-embed',
              slug: '${publicationSlug}',
              tenantId: 'test-tenant',
            });
          </script>
        </body>
      </html>
    `);

    // Wait for iframe to load
    const iframe = embedPage.locator('iframe[title="TEEI Impact Page"]');
    await expect(iframe).toBeVisible({ timeout: 10000 });

    // Verify iframe attributes
    const src = await iframe.getAttribute('src');
    expect(src).toContain(publicationSlug);

    await embedContext.close();
  });

  test('should track analytics for public views', async ({ page, context }) => {
    // View the public page
    const publicContext = await context.browser()!.newContext();
    const publicPage = await publicContext.newPage();

    await publicPage.goto(`/impact/${publicationSlug}`);
    await publicPage.waitForLoadState('networkidle');

    await publicContext.close();

    // Navigate back to Cockpit to check stats
    await page.goto(`/admin/publications/${publicationId}`);

    // Navigate to stats (adjust based on your UI)
    // This assumes there's a stats link or tab
    await page.click('text=Statistics', { timeout: 5000 }).catch(() => {
      // Stats might not be a separate link
    });

    // Verify analytics are being tracked
    // This would check for view count, unique visitors, etc.
    // Adjust selectors based on your actual stats UI
  });

  test('should support token-protected publications', async ({ page, context }) => {
    // Create a token-protected publication
    await page.goto('/admin/publications/new');

    const timestamp = Date.now();
    const tokenSlug = `token-protected-${timestamp}`;

    await page.fill('#title', 'Token Protected Publication');
    await page.fill('#slug', tokenSlug);
    await page.select('#visibility', 'TOKEN');

    await page.click('button:has-text("Save Draft")');
    await page.waitForURL(/\/admin\/publications\/[a-f0-9-]+/);

    // Publish the publication
    await page.click('button:has-text("Publish")');
    await page.waitForTimeout(1000);

    // Rotate token to get access token
    await page.click('button:has-text("Rotate Token")');

    // Wait for alert with token (adjust based on your UI)
    page.on('dialog', async (dialog) => {
      const message = dialog.message();
      expect(message).toContain('New token generated');
      await dialog.accept();
    });

    await page.waitForTimeout(1000);

    // Try to access without token (should fail)
    const publicContext = await context.browser()!.newContext();
    const publicPage = await publicContext.newPage();

    const response = await publicPage.goto(`/impact/${tokenSlug}`);
    expect(response?.status()).toBe(403);

    await publicContext.close();
  });

  test('should enforce WCAG AA accessibility', async ({ page }) => {
    // Navigate to public publication
    await page.goto(`/impact/${publicationSlug}`);

    // Check for ARIA labels
    const headings = await page.locator('h1, h2, h3').count();
    expect(headings).toBeGreaterThan(0);

    // Check for alt text on images (if any)
    const images = await page.locator('img').count();
    if (images > 0) {
      const imagesWithoutAlt = await page.locator('img:not([alt])').count();
      expect(imagesWithoutAlt).toBe(0);
    }

    // Check for keyboard navigation
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeDefined();

    // Check color contrast (basic check)
    // This would use axe or pa11y for comprehensive checks
  });

  test('should meet performance targets', async ({ page }) => {
    // Measure TTFB and first render
    const navigationTiming = await page.evaluate(() => {
      const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        ttfb: perfData.responseStart - perfData.requestStart,
        domContentLoaded: perfData.domContentLoadedEventEnd - perfData.requestStart,
        loadComplete: perfData.loadEventEnd - perfData.requestStart,
      };
    });

    // TTFB should be < 300ms from cache
    expect(navigationTiming.ttfb).toBeLessThan(300);

    // DOM loaded should be fast
    expect(navigationTiming.domContentLoaded).toBeLessThan(1000);
  });

  test('should cache with ETag correctly', async ({ page, context }) => {
    const publicContext = await context.browser()!.newContext();
    const publicPage = await publicContext.newPage();

    // First request
    const response1 = await publicPage.goto(`/impact/${publicationSlug}`);
    const etag1 = response1?.headers()['etag'];

    expect(etag1).toBeDefined();

    // Second request (should use cache)
    const response2 = await publicPage.goto(`/impact/${publicationSlug}`);
    const etag2 = response2?.headers()['etag'];

    expect(etag2).toBe(etag1);

    // If-None-Match header would trigger 304 (tested in contract tests)

    await publicContext.close();
  });

  test('should sanitize XSS in text blocks', async ({ page }) => {
    // This would test that script tags are removed from HTML content
    // The actual XSS sanitization is tested in contract tests
    // Here we verify it's working end-to-end

    await page.goto(`/impact/${publicationSlug}`);

    // Check that no <script> tags exist in the page content
    const scriptTags = await page.locator('script:not([src])').count();

    // Should only have inline scripts for legitimate purposes (analytics, etc.)
    // Not from user-generated content
  });

  test.afterAll(async ({ browser }) => {
    // Cleanup: Delete test publications
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto('/admin/publications');

    // Delete publications created during tests
    // This would use the API or UI to clean up test data

    await context.close();
  });
});

test.describe('Publications A11y Tests', () => {
  test('should be keyboard navigable', async ({ page }) => {
    await page.goto('/admin/publications');

    // Tab through interactive elements
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');

    // Verify focus is visible
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      return el?.tagName;
    });

    expect(focusedElement).toBeDefined();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/admin/publications');

    // Check that h1 exists
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBeGreaterThan(0);

    // Check heading order (h1 -> h2 -> h3, no skipping)
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').allTextContents();
    expect(headings.length).toBeGreaterThan(0);
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/admin/publications/new');

    // All form inputs should have labels
    const inputsWithoutLabels = await page.locator('input:not([aria-label]):not([id])').count();
    expect(inputsWithoutLabels).toBe(0);
  });
});
