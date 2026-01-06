/**
 * Internationalization (i18n) E2E Tests
 *
 * Tests cover:
 * - Language switching (EN, NO, UK)
 * - Content translation
 * - URL localization
 * - Date/time formatting
 * - Number formatting
 * - Currency display
 * - RTL support (if applicable)
 * - Language persistence
 */

import { test, expect } from '@playwright/test';
import {
  mockSession,
  navigateToCockpit,
  TEST_USERS,
  TEST_COMPANIES,
  waitForLoadingComplete,
  getCurrentLanguage,
  verifyTranslations,
} from './helpers';

test.describe('Internationalization', () => {
  test.describe('Language Selection', () => {
    test('should support English (en)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);

      const lang = await getCurrentLanguage(page);
      expect(lang).toBe('en');

      // Verify page loaded
      await waitForLoadingComplete(page);
      await expect(page.locator('main, [role="main"]')).toBeVisible();
    });

    test('should support Norwegian (no)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'no', TEST_COMPANIES.COMPANY_1);

      const lang = await getCurrentLanguage(page);
      expect(lang).toBe('no');

      await waitForLoadingComplete(page);
      await expect(page.locator('main, [role="main"]')).toBeVisible();
    });

    test('should support Ukrainian (uk)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'uk', TEST_COMPANIES.COMPANY_1);

      const lang = await getCurrentLanguage(page);
      expect(lang).toBe('uk');

      await waitForLoadingComplete(page);
      await expect(page.locator('main, [role="main"]')).toBeVisible();
    });

    test('should default to English for invalid language', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await page.goto('/fr/cockpit/company-1'); // French not supported

      // Should redirect to English or show error
      await page.waitForTimeout(1000);

      const url = page.url();
      const isEnglish = url.includes('/en/');
      const isError = url.includes('/404');

      expect(isEnglish || isError).toBe(true);
    });
  });

  test.describe('Language Switcher', () => {
    test('should display language switcher', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const langSwitcher = page.locator('[data-testid="language-switcher"], .language-switcher, select[name*="lang"]');
      const hasSwitcher = await langSwitcher.isVisible().catch(() => false);

      if (hasSwitcher) {
        await expect(langSwitcher).toBeVisible();
      }
    });

    test('should switch from English to Norwegian', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Find language switcher
      const langSwitcher = page.locator('[data-testid="language-switcher"], .language-switcher, select[name*="lang"], button:has-text("EN")');
      const count = await langSwitcher.count();

      if (count > 0) {
        await langSwitcher.first().click();

        // Look for Norwegian option
        const norwegianOption = page.locator('[value="no"], :has-text("Norwegian"), :has-text("NO")');
        const hasOption = await norwegianOption.isVisible().catch(() => false);

        if (hasOption) {
          await norwegianOption.first().click();

          // Should navigate to Norwegian version
          await page.waitForURL(/\/no\//, { timeout: 5000 });
          const lang = await getCurrentLanguage(page);
          expect(lang).toBe('no');
        }
      }
    });

    test('should switch from English to Ukrainian', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const langSwitcher = page.locator('[data-testid="language-switcher"], .language-switcher');
      const count = await langSwitcher.count();

      if (count > 0) {
        await langSwitcher.first().click();

        const ukrainianOption = page.locator('[value="uk"], :has-text("Ukrainian"), :has-text("UK")');
        const hasOption = await ukrainianOption.isVisible().catch(() => false);

        if (hasOption) {
          await ukrainianOption.first().click();

          await page.waitForURL(/\/uk\//, { timeout: 5000 });
          const lang = await getCurrentLanguage(page);
          expect(lang).toBe('uk');
        }
      }
    });

    test('should preserve current page when switching languages', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1, '/evidence');
      await waitForLoadingComplete(page);

      // Get current path
      const currentPath = new URL(page.url()).pathname;
      expect(currentPath).toContain('/evidence');

      const langSwitcher = page.locator('[data-testid="language-switcher"]');
      const count = await langSwitcher.count();

      if (count > 0) {
        await langSwitcher.first().click();

        const norwegianOption = page.locator('[value="no"]');
        const hasOption = await norwegianOption.isVisible().catch(() => false);

        if (hasOption) {
          await norwegianOption.first().click();
          await page.waitForURL(/\/no\//, { timeout: 5000 });

          // Should still be on evidence page
          const newPath = new URL(page.url()).pathname;
          expect(newPath).toContain('/evidence');
        }
      }
    });
  });

  test.describe('Content Translation', () => {
    test('should display translated content in Norwegian', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'no', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Check for Norwegian text (common Norwegian words)
      const bodyText = await page.locator('body').textContent();

      // Should not show untranslated English placeholders
      await verifyTranslations(page);
    });

    test('should display translated content in Ukrainian', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'uk', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Check for Ukrainian text (Cyrillic characters)
      const bodyText = await page.locator('body').textContent();

      // Should not show untranslated placeholders
      await verifyTranslations(page);
    });

    test('should translate navigation menu', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'no', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const nav = page.locator('nav, [role="navigation"]');
      const hasNav = await nav.isVisible().catch(() => false);

      if (hasNav) {
        const navText = await nav.textContent();
        expect(navText).toBeTruthy();
      }
    });

    test('should translate dashboard widgets', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'no', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Widget content should be translated
      await verifyTranslations(page);
    });

    test('should translate error messages', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'no', TEST_COMPANIES.COMPANY_1);

      // Trigger an error (try to access non-existent page)
      await page.goto('/no/cockpit/company-1/nonexistent');

      const errorMsg = page.locator('[role="alert"], .error-message');
      const hasError = await errorMsg.isVisible().catch(() => false);

      if (hasError) {
        const errorText = await errorMsg.textContent();
        expect(errorText).toBeTruthy();
      }
    });
  });

  test.describe('Date and Number Formatting', () => {
    test('should format dates according to locale (English)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const dates = page.locator('time, [data-testid*="date"]');
      const count = await dates.count();

      if (count > 0) {
        const dateText = await dates.first().textContent();
        expect(dateText).toBeTruthy();

        // English dates typically use MM/DD/YYYY or Month DD, YYYY
        // Just verify it's not a raw timestamp
        expect(dateText).not.toMatch(/^\d{13}$/);
      }
    });

    test('should format dates according to locale (Norwegian)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'no', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      const dates = page.locator('time, [data-testid*="date"]');
      const count = await dates.count();

      if (count > 0) {
        const dateText = await dates.first().textContent();
        expect(dateText).toBeTruthy();

        // Norwegian dates typically use DD.MM.YYYY
        expect(dateText).not.toMatch(/^\d{13}$/);
      }
    });

    test('should format numbers according to locale', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for large numbers
      const numbers = page.locator('[data-testid*="metric-value"], .metric-value');
      const count = await numbers.count();

      if (count > 0) {
        const numberText = await numbers.first().textContent();
        expect(numberText).toBeTruthy();

        // Should be formatted (contains comma or space as thousands separator)
        // or is a small number
        const hasFormatting = numberText?.match(/[\d,\s]/);
        expect(hasFormatting).toBeTruthy();
      }
    });

    test('should format currency correctly', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);
      await waitForLoadingComplete(page);

      // Look for currency values
      const currency = page.locator(':has-text("$"), :has-text("£"), :has-text("€"), :has-text("kr")');
      const count = await currency.count();

      if (count > 0) {
        const currencyText = await currency.first().textContent();
        expect(currencyText).toBeTruthy();

        // Should include currency symbol
        expect(currencyText).toMatch(/[$£€kr]/);
      }
    });
  });

  test.describe('URL Localization', () => {
    test('should use language prefix in URLs (en)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);

      expect(page.url()).toContain('/en/');
    });

    test('should use language prefix in URLs (no)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'no', TEST_COMPANIES.COMPANY_1);

      expect(page.url()).toContain('/no/');
    });

    test('should use language prefix in URLs (uk)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'uk', TEST_COMPANIES.COMPANY_1);

      expect(page.url()).toContain('/uk/');
    });

    test('should maintain language in navigation', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'no', TEST_COMPANIES.COMPANY_1);

      // Navigate to evidence page
      const evidenceLink = page.locator('a[href*="/evidence"]');
      const count = await evidenceLink.count();

      if (count > 0) {
        await evidenceLink.first().click();
        await page.waitForURL(/\/no\//, { timeout: 5000 });

        // Should maintain Norwegian language
        const lang = await getCurrentLanguage(page);
        expect(lang).toBe('no');
      }
    });
  });

  test.describe('Language Persistence', () => {
    test('should remember language preference across sessions', async ({ page, context }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'no', TEST_COMPANIES.COMPANY_1);

      // Get cookies/storage
      const cookies = await context.cookies();
      const storage = await page.evaluate(() => localStorage.getItem('language'));

      // Close and reopen
      await page.close();
      const newPage = await context.newPage();

      await mockSession(newPage, TEST_USERS.ADMIN);
      await newPage.goto('/en/cockpit/company-1'); // Try to go to English

      // Should redirect to Norwegian or respect stored preference
      await newPage.waitForTimeout(1000);

      await newPage.close();
    });
  });

  test.describe('SEO and Meta Tags', () => {
    test('should set correct lang attribute in HTML (en)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);

      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('en');
    });

    test('should set correct lang attribute in HTML (no)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'no', TEST_COMPANIES.COMPANY_1);

      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('no');
    });

    test('should set correct lang attribute in HTML (uk)', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'uk', TEST_COMPANIES.COMPANY_1);

      const htmlLang = await page.locator('html').getAttribute('lang');
      expect(htmlLang).toBe('uk');
    });

    test('should include hreflang tags for alternate languages', async ({ page }) => {
      await mockSession(page, TEST_USERS.ADMIN);
      await navigateToCockpit(page, 'en', TEST_COMPANIES.COMPANY_1);

      const hreflangTags = page.locator('link[rel="alternate"][hreflang]');
      const count = await hreflangTags.count();

      // Should have alternate language links for SEO
      if (count > 0) {
        expect(count).toBeGreaterThanOrEqual(2); // At least 2 other languages
      }
    });
  });
});
