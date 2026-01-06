/**
 * Authentication E2E Tests
 *
 * Tests cover:
 * - Login flow (valid/invalid credentials)
 * - Logout flow
 * - Session persistence
 * - Session expiration
 * - Redirect to login for unauthenticated requests
 * - Redirect after login
 * - Protected route access
 */

import { test, expect } from '@playwright/test';
import {
  login,
  logout,
  mockSession,
  navigateToCockpit,
  TEST_USERS,
  TEST_COMPANIES,
  waitForVisible,
} from './helpers';

test.describe('Authentication', () => {
  test.describe('Login Flow', () => {
    test('should display login page', async ({ page }) => {
      await page.goto('/login');

      // Verify login form elements
      await expect(page.locator('input[name="email"]')).toBeVisible();
      await expect(page.locator('input[name="password"]')).toBeVisible();
      await expect(page.locator('button[type="submit"]')).toBeVisible();
    });

    test('should login with valid admin credentials', async ({ page }) => {
      await login(page, TEST_USERS.ADMIN);

      // Verify redirect to cockpit
      await expect(page).toHaveURL(/\/cockpit\/company-1/, { timeout: 10000 });

      // Verify session cookie exists
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name === 'session');
      expect(sessionCookie).toBeDefined();
    });

    test('should login with valid manager credentials', async ({ page }) => {
      await login(page, TEST_USERS.MANAGER);

      // Verify redirect to cockpit
      await expect(page).toHaveURL(/\/cockpit\/company-1/);
    });

    test('should login with valid viewer credentials', async ({ page }) => {
      await login(page, TEST_USERS.VIEWER);

      // Verify redirect to cockpit
      await expect(page).toHaveURL(/\/cockpit\/company-1/);
    });

    test('should reject invalid credentials', async ({ page }) => {
      await page.goto('/login');

      await page.fill('input[name="email"]', 'invalid@teei.test');
      await page.fill('input[name="password"]', 'WrongPassword123!');
      await page.click('button[type="submit"]');

      // Should remain on login page
      await expect(page).toHaveURL(/\/login/);

      // Should show error message
      const errorMessage = page.locator('[role="alert"], .error-message, .alert-error');
      await expect(errorMessage).toBeVisible({ timeout: 5000 });
    });

    test('should reject empty credentials', async ({ page }) => {
      await page.goto('/login');

      await page.click('button[type="submit"]');

      // Should show validation errors
      const emailInput = page.locator('input[name="email"]');
      const passwordInput = page.locator('input[name="password"]');

      // Check for HTML5 validation or custom error messages
      const emailValid = await emailInput.evaluate((el: HTMLInputElement) => el.validity.valid);
      const passwordValid = await passwordInput.evaluate((el: HTMLInputElement) => el.validity.valid);

      expect(emailValid || passwordValid).toBe(false);
    });

    test('should redirect to requested page after login', async ({ page }) => {
      // Try to access protected page
      await page.goto('/en/cockpit/company-1/evidence');

      // Should redirect to login with redirect parameter
      await expect(page).toHaveURL(/\/login\?redirect=/);

      // Login
      await page.fill('input[name="email"]', TEST_USERS.ADMIN.email);
      await page.fill('input[name="password"]', TEST_USERS.ADMIN.password);
      await page.click('button[type="submit"]');

      // Should redirect back to requested page
      await expect(page).toHaveURL(/\/cockpit\/company-1\/evidence/, { timeout: 10000 });
    });
  });

  test.describe('Logout Flow', () => {
    test('should logout successfully', async ({ page }) => {
      // Login first
      await login(page, TEST_USERS.ADMIN);

      // Logout
      await logout(page);

      // Should redirect to login page
      await expect(page).toHaveURL(/\/login/);

      // Session cookie should be cleared
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name === 'session');
      expect(sessionCookie).toBeUndefined();
    });

    test('should require re-authentication after logout', async ({ page }) => {
      // Login
      await login(page, TEST_USERS.ADMIN);

      // Logout
      await logout(page);

      // Try to access protected page
      await page.goto('/en/cockpit/company-1');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Session Management', () => {
    test('should persist session across page reloads', async ({ page }) => {
      await login(page, TEST_USERS.ADMIN);

      const initialUrl = page.url();

      // Reload page
      await page.reload();

      // Should remain on same page
      await expect(page).toHaveURL(initialUrl);

      // Session cookie should still exist
      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name === 'session');
      expect(sessionCookie).toBeDefined();
    });

    test('should handle expired session', async ({ page }) => {
      // Create session with past expiration
      const expiredUser = { ...TEST_USERS.ADMIN };
      await mockSession(page, expiredUser, -1); // Expired 1 hour ago

      // Try to access protected page
      await page.goto('/en/cockpit/company-1');

      // Should redirect to login due to expired session
      await expect(page).toHaveURL(/\/login/, { timeout: 10000 });
    });

    test('should validate session structure', async ({ page }) => {
      // Create malformed session
      await page.context().addCookies([{
        name: 'session',
        value: JSON.stringify({ invalid: 'structure' }),
        domain: 'localhost',
        path: '/',
      }]);

      // Try to access protected page
      await page.goto('/en/cockpit/company-1');

      // Should redirect to login
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Protected Routes', () => {
    test('should block unauthenticated access to dashboard', async ({ page }) => {
      await page.goto('/en/cockpit/company-1');

      await expect(page).toHaveURL(/\/login/);
    });

    test('should block unauthenticated access to evidence page', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/evidence');

      await expect(page).toHaveURL(/\/login/);
    });

    test('should block unauthenticated access to admin page', async ({ page }) => {
      await page.goto('/en/cockpit/company-1/admin');

      await expect(page).toHaveURL(/\/login/);
    });

    test('should allow access to public routes', async ({ page }) => {
      // Root page should be accessible
      await page.goto('/');
      await expect(page).not.toHaveURL(/\/login/);

      // Login page should be accessible
      await page.goto('/login');
      await expect(page).toHaveURL(/\/login/);
    });
  });

  test.describe('Multi-User Sessions', () => {
    test('should support concurrent sessions for different users', async ({ browser }) => {
      // Create two separate browser contexts (like two different users)
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Login as different users
      await mockSession(page1, TEST_USERS.ADMIN);
      await mockSession(page2, TEST_USERS.MANAGER);

      // Navigate to cockpit
      await page1.goto('/en/cockpit/company-1');
      await page2.goto('/en/cockpit/company-1');

      // Both should be authenticated
      await expect(page1).toHaveURL(/\/cockpit\/company-1/);
      await expect(page2).toHaveURL(/\/cockpit\/company-1/);

      // Verify different sessions
      const cookies1 = await context1.cookies();
      const cookies2 = await context2.cookies();

      const session1 = cookies1.find(c => c.name === 'session');
      const session2 = cookies2.find(c => c.name === 'session');

      expect(session1?.value).not.toBe(session2?.value);

      await context1.close();
      await context2.close();
    });

    test('should isolate sessions between browser contexts', async ({ browser }) => {
      const context1 = await browser.newContext();
      const context2 = await browser.newContext();

      const page1 = await context1.newPage();
      const page2 = await context2.newPage();

      // Login only in context1
      await mockSession(page1, TEST_USERS.ADMIN);

      // Navigate both to cockpit
      await page1.goto('/en/cockpit/company-1');
      await page2.goto('/en/cockpit/company-1');

      // context1 should be authenticated
      await expect(page1).toHaveURL(/\/cockpit\/company-1/);

      // context2 should be redirected to login
      await expect(page2).toHaveURL(/\/login/);

      await context1.close();
      await context2.close();
    });
  });

  test.describe('Security', () => {
    test('should not expose sensitive session data in client-side code', async ({ page }) => {
      await login(page, TEST_USERS.ADMIN);

      // Check localStorage
      const localStorage = await page.evaluate(() => {
        return JSON.stringify(window.localStorage);
      });

      // Should not contain password or sensitive tokens
      expect(localStorage).not.toContain(TEST_USERS.ADMIN.password);
      expect(localStorage).not.toContain('Bearer ');

      // Check sessionStorage
      const sessionStorage = await page.evaluate(() => {
        return JSON.stringify(window.sessionStorage);
      });

      expect(sessionStorage).not.toContain(TEST_USERS.ADMIN.password);
    });

    test('should use secure session cookies in production', async ({ page }) => {
      await login(page, TEST_USERS.ADMIN);

      const cookies = await page.context().cookies();
      const sessionCookie = cookies.find(c => c.name === 'session');

      // In production, these should be true
      // For local dev, they might be false
      if (process.env.NODE_ENV === 'production') {
        expect(sessionCookie?.secure).toBe(true);
        expect(sessionCookie?.httpOnly).toBe(true);
      }
    });

    test('should prevent session fixation attacks', async ({ page, context }) => {
      // Get initial session cookie if any
      const initialCookies = await context.cookies();
      const initialSession = initialCookies.find(c => c.name === 'session');

      // Login
      await login(page, TEST_USERS.ADMIN);

      // Get session after login
      const loginCookies = await context.cookies();
      const loginSession = loginCookies.find(c => c.name === 'session');

      // Session should be different after login (new session created)
      if (initialSession) {
        expect(loginSession?.value).not.toBe(initialSession.value);
      }

      expect(loginSession).toBeDefined();
    });
  });
});
