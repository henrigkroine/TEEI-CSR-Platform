/**
 * E2E Test Helpers
 *
 * Shared utilities for Playwright E2E tests including:
 * - Authentication helpers
 * - Page navigation helpers
 * - Assertion helpers
 * - Mock data generators
 * - Performance measurement utilities
 */

import { expect, type Page, type Locator } from '@playwright/test';
import type { Role } from '../../src/types/roles';

/**
 * Test user credentials for different roles
 */
export const TEST_USERS = {
  SUPER_ADMIN: {
    email: 'superadmin@teei.test',
    password: 'SuperAdmin123!',
    name: 'Super Admin',
    company_id: 'company-1',
    role: 'SUPER_ADMIN' as Role,
  },
  ADMIN: {
    email: 'admin@teei.test',
    password: 'Admin123!',
    name: 'Admin User',
    company_id: 'company-1',
    role: 'ADMIN' as Role,
  },
  MANAGER: {
    email: 'manager@teei.test',
    password: 'Manager123!',
    name: 'Manager User',
    company_id: 'company-1',
    role: 'MANAGER' as Role,
  },
  VIEWER: {
    email: 'viewer@teei.test',
    password: 'Viewer123!',
    name: 'Viewer User',
    company_id: 'company-1',
    role: 'VIEWER' as Role,
  },
  TENANT_2_ADMIN: {
    email: 'admin2@teei.test',
    password: 'Admin123!',
    name: 'Tenant 2 Admin',
    company_id: 'company-2',
    role: 'ADMIN' as Role,
  },
} as const;

/**
 * Test company IDs for multi-tenant testing
 */
export const TEST_COMPANIES = {
  COMPANY_1: 'company-1',
  COMPANY_2: 'company-2',
  COMPANY_3: 'company-3',
} as const;

/**
 * Login helper - authenticates a user and stores session
 */
export async function login(page: Page, user: typeof TEST_USERS[keyof typeof TEST_USERS]) {
  await page.goto('/login');

  await page.fill('input[name="email"]', user.email);
  await page.fill('input[name="password"]', user.password);
  await page.click('button[type="submit"]');

  // Wait for navigation to complete
  await page.waitForURL(/\/(en|no|uk)\/cockpit\/.+/, { timeout: 10000 });

  // Verify login was successful by checking for session cookie
  const cookies = await page.context().cookies();
  const sessionCookie = cookies.find(c => c.name === 'session');
  expect(sessionCookie).toBeDefined();
}

/**
 * Mock session helper - sets session cookie directly without login flow
 */
export async function mockSession(
  page: Page,
  user: typeof TEST_USERS[keyof typeof TEST_USERS],
  expiresInHours: number = 24
) {
  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + expiresInHours);

  const session = {
    userId: user.email.split('@')[0],
    email: user.email,
    name: user.name,
    companyId: user.company_id,
    role: user.role,
    sessionId: `session-${Date.now()}`,
    createdAt: new Date().toISOString(),
    expiresAt: expiresAt.toISOString(),
    ipAddress: '127.0.0.1',
  };

  await page.context().addCookies([{
    name: 'session',
    value: JSON.stringify(session),
    domain: 'localhost',
    path: '/',
    expires: Math.floor(expiresAt.getTime() / 1000),
  }]);
}

/**
 * Logout helper
 */
export async function logout(page: Page) {
  await page.goto('/api/logout');
  await page.waitForURL('/login', { timeout: 5000 });
}

/**
 * Navigate to cockpit page for specific language and company
 */
export async function navigateToCockpit(
  page: Page,
  lang: 'en' | 'no' | 'uk' = 'en',
  companyId: string = TEST_COMPANIES.COMPANY_1,
  subPath: string = ''
) {
  const url = `/${lang}/cockpit/${companyId}${subPath}`;
  await page.goto(url);
  await page.waitForLoadState('networkidle');
}

/**
 * Wait for element to be visible with custom timeout
 */
export async function waitForVisible(locator: Locator, timeout: number = 10000) {
  await expect(locator).toBeVisible({ timeout });
}

/**
 * Check if element exists in DOM (may not be visible)
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return (await page.$(selector)) !== null;
}

/**
 * Wait for API response
 */
export async function waitForApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 30000
): Promise<any> {
  const response = await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );

  return response.json();
}

/**
 * Take a screenshot with timestamp
 */
export async function takeScreenshot(page: Page, name: string) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  await page.screenshot({
    path: `test-results/screenshots/${name}-${timestamp}.png`,
    fullPage: true
  });
}

/**
 * Measure page load performance
 */
export async function measurePageLoad(page: Page): Promise<{
  loadTime: number;
  domContentLoaded: number;
  firstContentfulPaint: number;
}> {
  const performanceMetrics = await page.evaluate(() => {
    const perfData = window.performance.timing;
    const navigation = window.performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

    return {
      loadTime: perfData.loadEventEnd - perfData.navigationStart,
      domContentLoaded: perfData.domContentLoadedEventEnd - perfData.navigationStart,
      firstContentfulPaint: navigation ? navigation.domContentLoadedEventEnd : 0,
    };
  });

  return performanceMetrics;
}

/**
 * Measure Web Vitals (LCP, FID, CLS)
 */
export async function measureWebVitals(page: Page): Promise<{
  lcp?: number;
  fid?: number;
  cls?: number;
}> {
  return page.evaluate(() => {
    return new Promise((resolve) => {
      const vitals: any = {};

      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1] as any;
        vitals.lcp = lastEntry.renderTime || lastEntry.loadTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry: any) => {
          vitals.fid = entry.processingStart - entry.startTime;
        });
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let clsValue = 0;
        list.getEntries().forEach((entry: any) => {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        });
        vitals.cls = clsValue;
      }).observe({ entryTypes: ['layout-shift'] });

      // Resolve after a delay to collect metrics
      setTimeout(() => resolve(vitals), 3000);
    });
  });
}

/**
 * Check for console errors
 */
export async function getConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];

  page.on('console', (message) => {
    if (message.type() === 'error') {
      errors.push(message.text());
    }
  });

  return errors;
}

/**
 * Check for accessibility violations using basic checks
 */
export async function checkBasicA11y(page: Page) {
  const issues = await page.evaluate(() => {
    const violations: string[] = [];

    // Check for images without alt text
    const images = document.querySelectorAll('img:not([alt])');
    if (images.length > 0) {
      violations.push(`Found ${images.length} images without alt text`);
    }

    // Check for buttons without accessible names
    const buttons = document.querySelectorAll('button:not([aria-label]):not(:has(text))');
    if (buttons.length > 0) {
      violations.push(`Found ${buttons.length} buttons without accessible names`);
    }

    // Check for form inputs without labels
    const inputs = document.querySelectorAll('input:not([aria-label]):not([id])');
    if (inputs.length > 0) {
      violations.push(`Found ${inputs.length} inputs without labels`);
    }

    return violations;
  });

  return issues;
}

/**
 * Fill form field and verify
 */
export async function fillField(page: Page, selector: string, value: string) {
  await page.fill(selector, value);
  const actualValue = await page.inputValue(selector);
  expect(actualValue).toBe(value);
}

/**
 * Select dropdown option
 */
export async function selectOption(page: Page, selector: string, value: string) {
  await page.selectOption(selector, value);
  const selectedValue = await page.$eval(selector, (el: any) => el.value);
  expect(selectedValue).toBe(value);
}

/**
 * Wait for loading spinner to disappear
 */
export async function waitForLoadingComplete(page: Page, timeout: number = 30000) {
  // Wait for any loading spinners to disappear
  const loadingSelectors = [
    '[data-testid="loading-spinner"]',
    '.loading-spinner',
    '[aria-label="Loading"]',
    '.animate-spin',
  ];

  for (const selector of loadingSelectors) {
    const element = page.locator(selector);
    if (await element.count() > 0) {
      await element.waitFor({ state: 'hidden', timeout });
    }
  }
}

/**
 * Mock API response
 */
export async function mockApiResponse(
  page: Page,
  urlPattern: string | RegExp,
  response: any,
  status: number = 200
) {
  await page.route(urlPattern, (route) => {
    route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify(response),
    });
  });
}

/**
 * Block API requests
 */
export async function blockApiRequest(page: Page, urlPattern: string | RegExp) {
  await page.route(urlPattern, (route) => route.abort());
}

/**
 * Wait for network to be idle
 */
export async function waitForNetworkIdle(page: Page, timeout: number = 30000) {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Verify element has specific CSS class
 */
export async function hasClass(locator: Locator, className: string): Promise<boolean> {
  const classes = await locator.getAttribute('class');
  return classes?.split(' ').includes(className) ?? false;
}

/**
 * Verify current language from URL
 */
export async function getCurrentLanguage(page: Page): Promise<'en' | 'no' | 'uk' | null> {
  const url = page.url();
  const match = url.match(/\/(en|no|uk)\//);
  return match ? (match[1] as 'en' | 'no' | 'uk') : null;
}

/**
 * Verify current company ID from URL
 */
export async function getCurrentCompanyId(page: Page): Promise<string | null> {
  const url = page.url();
  const match = url.match(/\/cockpit\/([^\/]+)/);
  return match ? match[1] : null;
}

/**
 * Generate random test data
 */
export function generateTestData() {
  const timestamp = Date.now();
  return {
    email: `test-${timestamp}@teei.test`,
    companyName: `Test Company ${timestamp}`,
    reportName: `Test Report ${timestamp}`,
    apiKeyName: `Test API Key ${timestamp}`,
  };
}

/**
 * Retry helper for flaky tests
 */
export async function retry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}

/**
 * Verify text content is translated (not showing i18n keys)
 */
export async function verifyTranslations(page: Page) {
  const content = await page.textContent('body');

  // Check for untranslated i18n keys (typically in format: common.key or page.section.key)
  const i18nKeyPattern = /\b[a-z]+\.[a-z]+(\.[a-z]+)?\b/g;
  const matches = content?.match(i18nKeyPattern) || [];

  // Filter out common false positives
  const suspiciousKeys = matches.filter(key =>
    !key.startsWith('http') &&
    !key.includes('@') &&
    !key.match(/\d+\.\d+/) // Not version numbers
  );

  if (suspiciousKeys.length > 0) {
    console.warn('Potential untranslated keys found:', suspiciousKeys.slice(0, 5));
  }
}
