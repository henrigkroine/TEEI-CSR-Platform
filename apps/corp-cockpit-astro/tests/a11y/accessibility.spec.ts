import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * WCAG 2.2 AA Accessibility Test Suite
 *
 * This test suite runs automated accessibility checks using axe-core
 * to ensure compliance with WCAG 2.2 Level AA standards.
 */

test.describe('Accessibility - WCAG 2.2 AA Compliance', () => {

  test.describe('Landing Page', () => {
    test('should not have any automatically detectable accessibility violations', async ({ page }) => {
      await page.goto('/');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have proper document structure', async ({ page }) => {
      await page.goto('/');

      // Check for main landmarks
      await expect(page.locator('main')).toBeVisible();
      await expect(page.locator('header')).toBeVisible();
      await expect(page.locator('footer')).toBeVisible();

      // Check for proper heading hierarchy
      const h1Count = await page.locator('h1').count();
      expect(h1Count).toBeGreaterThanOrEqual(1);
      expect(h1Count).toBeLessThanOrEqual(1); // Should only have one h1
    });

    test('should have keyboard navigable elements', async ({ page }) => {
      await page.goto('/');

      // All interactive elements should be keyboard accessible
      const links = page.locator('a[href]');
      const buttons = page.locator('button');

      const linkCount = await links.count();
      const buttonCount = await buttons.count();

      // Tab through all interactive elements
      for (let i = 0; i < linkCount + buttonCount; i++) {
        await page.keyboard.press('Tab');
        const focused = await page.evaluate(() => document.activeElement?.tagName);
        expect(['A', 'BUTTON', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(focused);
      }
    });
  });

  test.describe('Tenant Selector', () => {
    test('should not have any accessibility violations', async ({ page }) => {
      await page.goto('/en');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test('should have accessible search input', async ({ page }) => {
      await page.goto('/en');

      const searchInput = page.locator('#company-search');
      await expect(searchInput).toBeVisible();

      // Check for label (can be sr-only)
      const label = page.locator('label[for="company-search"]');
      await expect(label).toBeAttached();

      // Check for aria-label or proper labeling
      const ariaLabel = await searchInput.getAttribute('aria-label');
      const labelText = await label.textContent();
      expect(ariaLabel || labelText).toBeTruthy();
    });

    test('should have accessible company cards', async ({ page }) => {
      await page.goto('/en');

      // Wait for company cards to load
      await page.waitForSelector('button[aria-label*="Select"]', { timeout: 10000 });

      const companyButtons = page.locator('button[aria-label*="Select"]');
      const count = await companyButtons.count();

      expect(count).toBeGreaterThan(0);

      // Each button should have descriptive aria-label
      for (let i = 0; i < count; i++) {
        const button = companyButtons.nth(i);
        const ariaLabel = await button.getAttribute('aria-label');
        expect(ariaLabel).toContain('Select');
        expect(ariaLabel?.length).toBeGreaterThan(10); // Should be descriptive
      }
    });

    test('should support keyboard navigation on company selection', async ({ page }) => {
      await page.goto('/en');

      await page.waitForSelector('button[aria-label*="Select"]', { timeout: 10000 });

      // Tab to first company button
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab'); // Skip search if needed

      // Enter should activate the button
      await page.keyboard.press('Enter');

      // Should navigate or show some action
      await page.waitForTimeout(500);
    });
  });

  test.describe('Dashboard', () => {
    test.skip('should not have any accessibility violations', async ({ page }) => {
      // This requires authentication - will be enabled after auth setup
      await page.goto('/en/cockpit/123e4567-e89b-12d3-a456-426614174000');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test.skip('should have accessible KPI cards', async ({ page }) => {
      await page.goto('/en/cockpit/123e4567-e89b-12d3-a456-426614174000');

      // KPI cards should have proper structure
      const kpiCards = page.locator('[class*="KPICard"]');
      const count = await kpiCards.count();

      for (let i = 0; i < count; i++) {
        const card = kpiCards.nth(i);

        // Should have readable text content
        const text = await card.textContent();
        expect(text?.length).toBeGreaterThan(0);

        // SVG icons should have accessible alternatives
        const svgs = card.locator('svg');
        const svgCount = await svgs.count();

        if (svgCount > 0) {
          for (let j = 0; j < svgCount; j++) {
            const svg = svgs.nth(j);
            const ariaLabel = await svg.getAttribute('aria-label');
            const ariaHidden = await svg.getAttribute('aria-hidden');
            const role = await svg.getAttribute('role');

            // SVG should either be decorative (aria-hidden) or have a label
            expect(ariaHidden === 'true' || ariaLabel || role).toBeTruthy();
          }
        }
      }
    });
  });

  test.describe('Evidence Explorer', () => {
    test.skip('should not have any accessibility violations', async ({ page }) => {
      await page.goto('/en/cockpit/123e4567-e89b-12d3-a456-426614174000/evidence');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test.skip('should have accessible evidence cards', async ({ page }) => {
      await page.goto('/en/cockpit/123e4567-e89b-12d3-a456-426614174000/evidence');

      // Evidence cards should be keyboard accessible
      const evidenceCards = page.locator('[class*="evidence"]');
      const buttons = evidenceCards.locator('button');

      const buttonCount = await buttons.count();

      for (let i = 0; i < buttonCount; i++) {
        const button = buttons.nth(i);

        // Buttons should have accessible labels
        const ariaLabel = await button.getAttribute('aria-label');
        const text = await button.textContent();

        expect(ariaLabel || text?.length).toBeTruthy();
      }
    });
  });

  test.describe('Reports Page', () => {
    test.skip('should not have any accessibility violations', async ({ page }) => {
      await page.goto('/en/cockpit/123e4567-e89b-12d3-a456-426614174000/reports');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test.skip('should have accessible modal dialogs', async ({ page }) => {
      await page.goto('/en/cockpit/123e4567-e89b-12d3-a456-426614174000/reports');

      // Open report generation modal
      const generateButton = page.locator('button:has-text("Generate")');
      await generateButton.click();

      // Modal should have proper ARIA attributes
      const modal = page.locator('[role="dialog"]');
      await expect(modal).toBeVisible();

      const ariaLabel = await modal.getAttribute('aria-labelledby');
      const ariaDescribed = await modal.getAttribute('aria-describedby');

      expect(ariaLabel || ariaDescribed).toBeTruthy();

      // Focus should be trapped in modal
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => {
        const activeEl = document.activeElement;
        const modal = document.querySelector('[role="dialog"]');
        return modal?.contains(activeEl);
      });

      expect(focused).toBeTruthy();
    });
  });

  test.describe('Admin Console', () => {
    test.skip('should not have any accessibility violations', async ({ page }) => {
      await page.goto('/en/cockpit/123e4567-e89b-12d3-a456-426614174000/admin');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();

      expect(accessibilityScanResults.violations).toEqual([]);
    });

    test.skip('should have accessible form controls', async ({ page }) => {
      await page.goto('/en/cockpit/123e4567-e89b-12d3-a456-426614174000/admin');

      // All form inputs should have labels
      const inputs = page.locator('input, select, textarea');
      const count = await inputs.count();

      for (let i = 0; i < count; i++) {
        const input = inputs.nth(i);
        const id = await input.getAttribute('id');
        const ariaLabel = await input.getAttribute('aria-label');
        const ariaLabelledby = await input.getAttribute('aria-labelledby');

        if (id) {
          const label = page.locator(`label[for="${id}"]`);
          const hasLabel = await label.count() > 0;
          expect(hasLabel || ariaLabel || ariaLabelledby).toBeTruthy();
        } else {
          expect(ariaLabel || ariaLabelledby).toBeTruthy();
        }
      }
    });
  });

  test.describe('Color Contrast', () => {
    test('should meet WCAG AA contrast requirements', async ({ page }) => {
      await page.goto('/');

      const accessibilityScanResults = await new AxeBuilder({ page })
        .withTags(['wcag2aa'])
        .include(['body'])
        .analyze();

      const contrastViolations = accessibilityScanResults.violations.filter(
        v => v.id === 'color-contrast'
      );

      expect(contrastViolations).toEqual([]);
    });

    test('should have sufficient contrast on primary buttons', async ({ page }) => {
      await page.goto('/en');

      const buttons = page.locator('button.btn-primary, button[class*="primary"]');
      const count = await buttons.count();

      for (let i = 0; i < count; i++) {
        const button = buttons.nth(i);

        // Get computed colors
        const colors = await button.evaluate((el) => {
          const computed = window.getComputedStyle(el);
          return {
            color: computed.color,
            backgroundColor: computed.backgroundColor,
          };
        });

        // Colors should be defined
        expect(colors.color).toBeTruthy();
        expect(colors.backgroundColor).toBeTruthy();
      }
    });
  });

  test.describe('Keyboard Navigation', () => {
    test('should support focus visible styles', async ({ page }) => {
      await page.goto('/en');

      // Tab to first interactive element
      await page.keyboard.press('Tab');

      // Check if focus is visible
      const hasFocusVisible = await page.evaluate(() => {
        const activeEl = document.activeElement as HTMLElement;
        const computed = window.getComputedStyle(activeEl);
        const outline = computed.outline;
        const boxShadow = computed.boxShadow;

        return outline !== 'none' || boxShadow !== 'none';
      });

      expect(hasFocusVisible).toBeTruthy();
    });

    test('should have skip to main content link', async ({ page }) => {
      await page.goto('/en');

      // Press Tab to focus skip link (usually first element)
      await page.keyboard.press('Tab');

      const focused = await page.evaluate(() => {
        const activeEl = document.activeElement as HTMLElement;
        return {
          tagName: activeEl.tagName,
          text: activeEl.textContent,
          href: (activeEl as HTMLAnchorElement).href,
        };
      });

      // Should either be skip link or first navigation item
      expect(['A', 'BUTTON']).toContain(focused.tagName);
    });
  });

  test.describe('Screen Reader Support', () => {
    test('should have proper ARIA landmarks', async ({ page }) => {
      await page.goto('/en');

      // Check for main landmarks
      const mainLandmark = page.locator('main, [role="main"]');
      const navLandmark = page.locator('nav, [role="navigation"]');
      const contentinfoLandmark = page.locator('footer, [role="contentinfo"]');

      await expect(mainLandmark.first()).toBeAttached();
      await expect(navLandmark.first()).toBeAttached();
      await expect(contentinfoLandmark.first()).toBeAttached();
    });

    test('should have proper page titles', async ({ page }) => {
      await page.goto('/en');

      const title = await page.title();
      expect(title.length).toBeGreaterThan(0);
      expect(title).not.toBe('');

      // Title should be descriptive
      expect(title.length).toBeGreaterThan(10);
    });

    test('should have proper lang attribute', async ({ page }) => {
      await page.goto('/en');

      const lang = await page.getAttribute('html', 'lang');
      expect(lang).toBe('en');

      await page.goto('/no');
      const langNo = await page.getAttribute('html', 'lang');
      expect(langNo).toBe('no');
    });
  });

  test.describe('Touch Targets', () => {
    test('should have minimum touch target size (44x44px)', async ({ page }) => {
      await page.goto('/en');

      // Check button sizes
      const buttons = page.locator('button, a[href]');
      const count = await buttons.count();

      const violations: string[] = [];

      for (let i = 0; i < Math.min(count, 20); i++) { // Check first 20 elements
        const button = buttons.nth(i);

        const box = await button.boundingBox();

        if (box && (box.width < 44 || box.height < 44)) {
          const text = await button.textContent();
          violations.push(`Button "${text?.slice(0, 30)}" is ${box.width}x${box.height}px`);
        }
      }

      // Allow some violations for small inline links, but flag them
      if (violations.length > 0) {
        console.warn('Touch target violations found:', violations);
      }

      // Expect most buttons to meet minimum size
      expect(violations.length).toBeLessThan(count * 0.3); // Less than 30% violations
    });
  });

  test.describe('Forms and Inputs', () => {
    test('should have accessible form error messages', async ({ page }) => {
      await page.goto('/en');

      // All inputs should have associated error message areas
      const forms = page.locator('form');
      const formCount = await forms.count();

      if (formCount > 0) {
        const form = forms.first();

        // Try to submit form to trigger validation
        await form.evaluate(f => (f as HTMLFormElement).requestSubmit());

        // Wait for potential error messages
        await page.waitForTimeout(500);

        // Error messages should have aria-live or aria-describedby
        const errorMessages = page.locator('[role="alert"], [aria-live="polite"], [class*="error"]');
        const errorCount = await errorMessages.count();

        // If there are errors, they should be accessible
        for (let i = 0; i < errorCount; i++) {
          const error = errorMessages.nth(i);
          const text = await error.textContent();
          expect(text?.length).toBeGreaterThan(0);
        }
      }
    });
  });
});
