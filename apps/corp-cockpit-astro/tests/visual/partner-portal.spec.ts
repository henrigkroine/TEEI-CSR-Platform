import { test, expect } from '@playwright/test';

/**
 * Visual Regression Test Suite: Partner Portal
 *
 * Captures and compares screenshots of the partner portal UI including:
 * - Partner overview page
 * - Tenant grid (loading, empty, populated states)
 * - Whitelabel export modal
 * - Theme preview
 *
 * These tests establish visual baselines and detect unintended UI changes.
 */

test.describe('Partner Portal Visual Regression', () => {
  test.beforeEach(async ({ page }) => {
    // Login as partner admin
    await page.goto('/login');
    await page.fill('input[name="email"]', 'partner@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });

  test('should capture partner overview page', async ({ page }) => {
    // Navigate to partner portal overview
    await page.goto('/partner/overview');

    // Wait for page to fully load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="partner-stats"]', { state: 'visible' });

    // Take full page screenshot
    await expect(page).toHaveScreenshot('partner-overview-full.png', {
      fullPage: true,
      animations: 'disabled',
      maxDiffPixelRatio: 0.05 // 5% diff threshold
    });

    // Capture key sections
    await expect(page.locator('[data-testid="partner-stats"]'))
      .toHaveScreenshot('partner-stats-section.png');

    await expect(page.locator('[data-testid="partner-activity-chart"]'))
      .toHaveScreenshot('partner-activity-chart.png');
  });

  test('should capture tenant grid - loading state', async ({ page }) => {
    // Navigate to tenants page
    await page.goto('/partner/tenants');

    // Intercept API to delay response (simulate loading)
    await page.route('**/api/partner/tenants', async route => {
      await new Promise(resolve => setTimeout(resolve, 1000));
      await route.continue();
    });

    // Reload to trigger loading state
    await page.reload();

    // Capture loading state quickly
    await page.waitForSelector('[data-testid="tenant-grid-loading"]', {
      state: 'visible',
      timeout: 5000
    });

    await expect(page.locator('[data-testid="tenant-grid-container"]'))
      .toHaveScreenshot('tenant-grid-loading.png');
  });

  test('should capture tenant grid - empty state', async ({ page }) => {
    // Navigate to tenants page with empty result
    await page.goto('/partner/tenants?filter=no-results');

    // Wait for empty state to render
    await page.waitForSelector('[data-testid="tenant-grid-empty"]', {
      state: 'visible'
    });

    // Capture empty state
    await expect(page.locator('[data-testid="tenant-grid-container"]'))
      .toHaveScreenshot('tenant-grid-empty.png');

    // Capture empty state illustration
    await expect(page.locator('[data-testid="empty-state-illustration"]'))
      .toHaveScreenshot('tenant-grid-empty-illustration.png');
  });

  test('should capture tenant grid - populated state', async ({ page }) => {
    // Navigate to tenants page
    await page.goto('/partner/tenants');

    // Wait for tenants to load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="tenant-card"]', { state: 'visible' });

    // Capture full grid
    await expect(page.locator('[data-testid="tenant-grid-container"]'))
      .toHaveScreenshot('tenant-grid-populated.png', {
        animations: 'disabled'
      });

    // Capture first tenant card
    await expect(page.locator('[data-testid="tenant-card"]').first())
      .toHaveScreenshot('tenant-card-sample.png');

    // Capture grid with filters applied
    await page.click('[data-testid="filter-active-tenants"]');
    await page.waitForTimeout(500); // Wait for filter animation

    await expect(page.locator('[data-testid="tenant-grid-container"]'))
      .toHaveScreenshot('tenant-grid-filtered.png');
  });

  test('should capture tenant grid - different view modes', async ({ page }) => {
    // Navigate to tenants page
    await page.goto('/partner/tenants');
    await page.waitForSelector('[data-testid="tenant-card"]', { state: 'visible' });

    // Capture grid view
    await expect(page.locator('[data-testid="tenant-grid-container"]'))
      .toHaveScreenshot('tenant-view-grid.png');

    // Switch to list view
    await page.click('[data-testid="view-mode-list"]');
    await page.waitForTimeout(300); // Wait for transition

    // Capture list view
    await expect(page.locator('[data-testid="tenant-list-container"]'))
      .toHaveScreenshot('tenant-view-list.png');

    // Switch to table view
    await page.click('[data-testid="view-mode-table"]');
    await page.waitForTimeout(300);

    // Capture table view
    await expect(page.locator('[data-testid="tenant-table-container"]'))
      .toHaveScreenshot('tenant-view-table.png');
  });

  test('should capture whitelabel export modal', async ({ page }) => {
    // Navigate to a tenant
    await page.goto('/partner/tenants/tenant-123');

    // Click whitelabel export button
    await page.click('[data-testid="whitelabel-export"]');

    // Wait for modal to open
    await page.waitForSelector('[data-testid="whitelabel-modal"]', { state: 'visible' });

    // Capture modal
    await expect(page.locator('[data-testid="whitelabel-modal"]'))
      .toHaveScreenshot('whitelabel-modal-initial.png');

    // Select format options
    await page.click('[data-testid="format-pdf"]');
    await page.waitForTimeout(200);

    await expect(page.locator('[data-testid="whitelabel-modal"]'))
      .toHaveScreenshot('whitelabel-modal-pdf-selected.png');

    // Open branding customization
    await page.click('[data-testid="customize-branding"]');
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="whitelabel-modal"]'))
      .toHaveScreenshot('whitelabel-modal-branding-options.png');
  });

  test('should capture theme preview', async ({ page }) => {
    // Navigate to tenant branding settings
    await page.goto('/partner/tenants/tenant-123/branding');

    // Wait for theme preview to load
    await page.waitForSelector('[data-testid="theme-preview"]', { state: 'visible' });

    // Capture default theme preview
    await expect(page.locator('[data-testid="theme-preview"]'))
      .toHaveScreenshot('theme-preview-default.png');

    // Change primary color
    await page.fill('[data-testid="primary-color-input"]', '#0066cc');
    await page.waitForTimeout(300); // Wait for preview update

    await expect(page.locator('[data-testid="theme-preview"]'))
      .toHaveScreenshot('theme-preview-custom-primary.png');

    // Change secondary color
    await page.fill('[data-testid="secondary-color-input"]', '#ff6600');
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="theme-preview"]'))
      .toHaveScreenshot('theme-preview-custom-both.png');

    // Upload logo (simulate with placeholder)
    await page.click('[data-testid="logo-upload-trigger"]');
    await page.waitForTimeout(300);

    await expect(page.locator('[data-testid="theme-preview"]'))
      .toHaveScreenshot('theme-preview-with-logo.png');
  });

  test('should capture tenant creation wizard', async ({ page }) => {
    // Navigate to create tenant
    await page.goto('/partner/tenants/create');

    // Wait for wizard to load
    await page.waitForSelector('[data-testid="tenant-wizard"]', { state: 'visible' });

    // Capture step 1 - Basic Info
    await expect(page.locator('[data-testid="tenant-wizard"]'))
      .toHaveScreenshot('tenant-wizard-step1-basic-info.png');

    // Fill basic info and go to step 2
    await page.fill('[data-testid="tenant-name"]', 'Acme Corp');
    await page.fill('[data-testid="tenant-domain"]', 'acme.example.com');
    await page.click('[data-testid="wizard-next"]');
    await page.waitForTimeout(300);

    // Capture step 2 - Branding
    await expect(page.locator('[data-testid="tenant-wizard"]'))
      .toHaveScreenshot('tenant-wizard-step2-branding.png');

    // Go to step 3
    await page.click('[data-testid="wizard-next"]');
    await page.waitForTimeout(300);

    // Capture step 3 - Configuration
    await expect(page.locator('[data-testid="tenant-wizard"]'))
      .toHaveScreenshot('tenant-wizard-step3-configuration.png');
  });

  test('should capture tenant analytics dashboard', async ({ page }) => {
    // Navigate to tenant analytics
    await page.goto('/partner/tenants/tenant-123/analytics');

    // Wait for charts to render
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="analytics-chart"]', { state: 'visible' });

    // Capture full analytics page
    await expect(page).toHaveScreenshot('tenant-analytics-full.png', {
      fullPage: true,
      animations: 'disabled'
    });

    // Capture individual charts
    await expect(page.locator('[data-testid="user-activity-chart"]'))
      .toHaveScreenshot('tenant-analytics-user-activity.png');

    await expect(page.locator('[data-testid="engagement-metrics"]'))
      .toHaveScreenshot('tenant-analytics-engagement.png');
  });

  test('should capture partner billing dashboard', async ({ page }) => {
    // Navigate to billing
    await page.goto('/partner/billing');

    // Wait for billing info to load
    await page.waitForLoadState('networkidle');
    await page.waitForSelector('[data-testid="billing-summary"]', { state: 'visible' });

    // Capture billing summary
    await expect(page.locator('[data-testid="billing-summary"]'))
      .toHaveScreenshot('partner-billing-summary.png');

    // Capture invoice list
    await expect(page.locator('[data-testid="invoice-list"]'))
      .toHaveScreenshot('partner-billing-invoices.png');

    // Capture usage chart
    await expect(page.locator('[data-testid="usage-chart"]'))
      .toHaveScreenshot('partner-billing-usage-chart.png');
  });

  test('should capture responsive layouts', async ({ page }) => {
    // Navigate to partner overview
    await page.goto('/partner/overview');
    await page.waitForLoadState('networkidle');

    // Desktop (1920x1080) - already default
    await page.setViewportSize({ width: 1920, height: 1080 });
    await expect(page).toHaveScreenshot('partner-overview-desktop.png', {
      fullPage: true
    });

    // Tablet (768x1024)
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.waitForTimeout(500); // Wait for responsive adjustments
    await expect(page).toHaveScreenshot('partner-overview-tablet.png', {
      fullPage: true
    });

    // Mobile (375x667)
    await page.setViewportSize({ width: 375, height: 667 });
    await page.waitForTimeout(500);
    await expect(page).toHaveScreenshot('partner-overview-mobile.png', {
      fullPage: true
    });
  });

  test('should capture dark mode theme', async ({ page }) => {
    // Navigate to partner overview
    await page.goto('/partner/overview');
    await page.waitForLoadState('networkidle');

    // Enable dark mode
    await page.click('[data-testid="theme-toggle"]');
    await page.waitForTimeout(300); // Wait for theme transition

    // Capture dark mode overview
    await expect(page).toHaveScreenshot('partner-overview-dark.png', {
      fullPage: true
    });

    // Navigate to tenants grid
    await page.goto('/partner/tenants');
    await page.waitForSelector('[data-testid="tenant-card"]', { state: 'visible' });

    // Capture dark mode tenant grid
    await expect(page.locator('[data-testid="tenant-grid-container"]'))
      .toHaveScreenshot('tenant-grid-dark.png');
  });

  test('should capture hover states', async ({ page }) => {
    // Navigate to tenants page
    await page.goto('/partner/tenants');
    await page.waitForSelector('[data-testid="tenant-card"]', { state: 'visible' });

    // Hover over first tenant card
    const firstCard = page.locator('[data-testid="tenant-card"]').first();
    await firstCard.hover();
    await page.waitForTimeout(200); // Wait for hover animation

    // Capture hover state
    await expect(firstCard).toHaveScreenshot('tenant-card-hover.png');

    // Hover over action button
    const actionButton = firstCard.locator('[data-testid="tenant-actions"]');
    await actionButton.hover();
    await page.waitForTimeout(200);

    await expect(actionButton).toHaveScreenshot('tenant-actions-hover.png');
  });
});
