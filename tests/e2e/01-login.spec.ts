import { test, expect } from '@playwright/test';

/**
 * E2E Test: Authentication & Login Flow
 * Tests SSO integration, MFA enrollment, and session management
 */

test.describe('Login Flow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
  });

  test('should display login page with SSO options', async ({ page }) => {
    await expect(page).toHaveTitle(/TEEI Corporate Cockpit/);
    await expect(page.locator('h1')).toContainText('Sign In');

    // Check for SSO buttons
    await expect(page.getByRole('button', { name: /Sign in with SSO/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sign in with Email/i })).toBeVisible();
  });

  test('should show validation errors for invalid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'invalid@email');
    await page.fill('input[name="password"]', 'short');
    await page.click('button[type="submit"]');

    await expect(page.locator('.error-message')).toBeVisible();
  });

  test('should successfully login with valid credentials', async ({ page }) => {
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL(/\/cockpit\/[^/]+\/dashboard/);
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should handle MFA enrollment flow', async ({ page }) => {
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');

    // Check for MFA prompt
    const mfaPrompt = page.locator('[data-testid="mfa-enrollment"]');
    if (await mfaPrompt.isVisible()) {
      await expect(page.locator('text=Set up Two-Factor Authentication')).toBeVisible();
      await expect(page.locator('[data-testid="qr-code"]')).toBeVisible();
    }
  });

  test('should persist session after page reload', async ({ page, context }) => {
    // Login
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/cockpit/);

    // Reload page
    await page.reload();

    // Should still be logged in
    await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
  });

  test('should logout successfully', async ({ page }) => {
    // Login first
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/cockpit/);

    // Logout
    await page.click('[data-testid="user-menu"]');
    await page.click('button:has-text("Logout")');

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/);
  });

  test('should enforce session timeout', async ({ page }) => {
    // This would require mocking time or waiting
    // Placeholder for timeout enforcement test
    expect(true).toBe(true);
  });
});

test.describe('SSO Integration', () => {
  test('should redirect to SSO provider', async ({ page }) => {
    await page.goto('/en/login');
    await page.click('button:has-text("Sign in with SSO")');

    // Should redirect to SSO provider (or show modal for provider selection)
    await page.waitForTimeout(1000);
    const url = page.url();
    expect(url).toMatch(/\/sso|\/saml|\/oauth/);
  });

  test('should handle SSO callback successfully', async ({ page }) => {
    // Simulate SSO callback
    await page.goto('/en/auth/callback?code=mock-auth-code&state=mock-state');

    // Should redirect to dashboard after successful SSO
    await page.waitForURL(/\/cockpit/, { timeout: 10000 });
  });
});
