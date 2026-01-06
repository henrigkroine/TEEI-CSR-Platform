import { test, expect } from '@playwright/test';

/**
 * Synthetic Test: Login Flow
 *
 * Tests the critical user journey:
 * 1. Navigate to login page
 * 2. Enter credentials
 * 3. Submit login form
 * 4. Verify redirect to dashboard
 * 5. Verify dashboard loads with key elements
 *
 * Run: pnpm exec playwright test scripts/synthetics/login-flow.spec.ts
 */

const BASE_URL = process.env.BASE_URL || 'http://localhost:4321';
const USERNAME = process.env.SYNTHETIC_USERNAME || 'test@example.com';
const PASSWORD = process.env.SYNTHETIC_PASSWORD || 'testpassword';
const TIMEOUT = 30000; // 30 seconds

test.describe('Login Flow Synthetic', () => {
  test.setTimeout(TIMEOUT);

  test('should successfully complete login flow and reach dashboard', async ({ page }) => {
    // Step 1: Navigate to login page
    console.log(`[Synthetic] Navigating to ${BASE_URL}/login`);
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    // Verify login page loaded
    await expect(page).toHaveTitle(/Login|Sign In|TEEI CSR/i);
    console.log('[Synthetic] ✓ Login page loaded');

    // Step 2: Fill in credentials
    const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();

    await expect(emailInput).toBeVisible({ timeout: 5000 });
    await expect(passwordInput).toBeVisible({ timeout: 5000 });

    await emailInput.fill(USERNAME);
    await passwordInput.fill(PASSWORD);
    console.log('[Synthetic] ✓ Credentials entered');

    // Step 3: Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first();
    await expect(submitButton).toBeEnabled();

    await submitButton.click();
    console.log('[Synthetic] ✓ Login form submitted');

    // Step 4: Wait for navigation to dashboard
    await page.waitForURL(/\/(dashboard|cockpit|home)/i, { timeout: 10000 });
    console.log('[Synthetic] ✓ Redirected to dashboard');

    // Step 5: Verify dashboard loaded with key elements
    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Check for common dashboard elements
    const dashboardIndicators = [
      page.locator('h1, h2').first(), // Page heading
      page.locator('nav, [role="navigation"]').first(), // Navigation
      page.locator('[data-testid*="metric"], [class*="metric"], [class*="card"]').first() // Metric cards
    ];

    // At least one indicator should be visible
    let foundIndicator = false;
    for (const indicator of dashboardIndicators) {
      if (await indicator.isVisible({ timeout: 2000 }).catch(() => false)) {
        foundIndicator = true;
        break;
      }
    }

    expect(foundIndicator).toBe(true);
    console.log('[Synthetic] ✓ Dashboard content loaded');

    // Step 6: Verify no error messages
    const errorSelectors = [
      '[role="alert"]',
      '[class*="error"]',
      '[class*="alert-danger"]',
      'text=/error|failed|something went wrong/i'
    ];

    for (const selector of errorSelectors) {
      const errorElement = page.locator(selector).first();
      if (await errorElement.isVisible({ timeout: 1000 }).catch(() => false)) {
        const errorText = await errorElement.textContent();
        throw new Error(`Error message found on dashboard: ${errorText}`);
      }
    }

    console.log('[Synthetic] ✓ No error messages detected');

    // Take screenshot for verification
    await page.screenshot({ path: 'test-results/login-flow-success.png', fullPage: true });
    console.log('[Synthetic] ✓ Screenshot captured');

    // Log success metrics
    const loadTime = await page.evaluate(() => {
      const perfData = window.performance.timing;
      return perfData.loadEventEnd - perfData.navigationStart;
    });

    console.log(`[Synthetic] ✓✓ Login flow completed successfully (load time: ${loadTime}ms)`);
  });

  test('should handle invalid credentials gracefully', async ({ page }) => {
    // Navigate to login page
    await page.goto(`${BASE_URL}/login`, { waitUntil: 'networkidle' });

    // Enter invalid credentials
    const emailInput = page.locator('input[type="email"], input[name="email"], input[id="email"]').first();
    const passwordInput = page.locator('input[type="password"], input[name="password"], input[id="password"]').first();

    await emailInput.fill('invalid@example.com');
    await passwordInput.fill('wrongpassword');

    // Submit form
    const submitButton = page.locator('button[type="submit"], button:has-text("Log in"), button:has-text("Sign in")').first();
    await submitButton.click();

    // Wait for error message
    const errorMessage = page.locator('[role="alert"], [class*="error"], text=/invalid|incorrect|failed/i').first();
    await expect(errorMessage).toBeVisible({ timeout: 5000 });

    console.log('[Synthetic] ✓ Invalid credentials handled correctly');
  });
});
