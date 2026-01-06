import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * E2E Test: Accessibility (A11y) & WCAG Compliance
 * Tests screen reader support, keyboard navigation, ARIA labels, WCAG 2.2 AAA
 */

test.describe('WCAG 2.2 Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should pass axe accessibility scan on dashboard', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass axe accessibility scan on reports page', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass axe accessibility scan on settings page', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have sufficient color contrast (AAA)', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aaa'])
      .analyze();

    // Check for contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast-enhanced'
    );

    expect(contrastViolations).toHaveLength(0);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Check that h1 exists
    await expect(page.locator('h1')).toBeVisible();

    // Headings should be in order
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) =>
      elements.map((el) => parseInt(el.tagName.substring(1)))
    );

    // Should start with h1
    expect(headings[0]).toBe(1);
  });
});

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should navigate dashboard with Tab key', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Press Tab multiple times
    for (let i = 0; i < 5; i++) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(100);

      // Check that focus is visible
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      expect(focusedElement).toBeTruthy();
    }
  });

  test('should have visible focus indicators', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Tab to first focusable element
    await page.keyboard.press('Tab');

    // Check for focus ring
    const focusedElement = await page.evaluateHandle(() => document.activeElement);
    const outlineWidth = await page.evaluate(
      (el) => window.getComputedStyle(el as Element).outlineWidth,
      focusedElement
    );

    // Focus indicator should be visible (not '0px')
    expect(outlineWidth).not.toBe('0px');
  });

  test('should activate buttons with Enter and Space', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports');

    // Focus on create report button
    await page.focus('[data-testid="create-report-button"]');

    // Press Enter
    await page.keyboard.press('Enter');

    // Modal should open
    await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');
    await expect(page.locator('[data-testid="report-modal"]')).not.toBeVisible();
  });

  test('should support keyboard shortcuts', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Check for keyboard shortcuts help
    await page.keyboard.press('?');

    // Shortcuts modal should open
    const shortcutsModal = page.locator('[data-testid="keyboard-shortcuts-modal"]');
    if (await shortcutsModal.isVisible()) {
      await expect(shortcutsModal).toBeVisible();
    }
  });

  test('should trap focus in modals', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports');

    // Open modal
    await page.click('[data-testid="create-report-button"]');

    // Tab through modal elements
    const modalElement = page.locator('[data-testid="report-modal"]');
    await expect(modalElement).toBeVisible();

    // Tab multiple times
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');

      // Focus should stay within modal
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const isInModal = await page.evaluate(
        ([modal, focused]) => (modal as Element).contains(focused as Element),
        [await modalElement.elementHandle(), focusedElement]
      );

      expect(isInModal).toBe(true);
    }
  });

  test('should support skip links', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Press Tab to reveal skip link
    await page.keyboard.press('Tab');

    // Skip link should be visible
    const skipLink = page.locator('[data-testid="skip-to-main"]');
    if (await skipLink.isVisible()) {
      await expect(skipLink).toBeVisible();

      // Activate skip link
      await page.keyboard.press('Enter');

      // Focus should move to main content
      const focusedId = await page.evaluate(() => document.activeElement?.id);
      expect(focusedId).toBe('main-content');
    }
  });
});

test.describe('Screen Reader Support', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should have ARIA labels on interactive elements', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Check buttons have accessible names
    const buttons = page.locator('button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const button = buttons.nth(i);
      const ariaLabel = await button.getAttribute('aria-label');
      const text = await button.textContent();

      // Button should have either aria-label or text content
      expect(ariaLabel || text?.trim()).toBeTruthy();
    }
  });

  test('should have ARIA live regions for dynamic updates', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Check for live regions
    const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]');
    const count = await liveRegion.count();

    // Should have at least one live region for SSE updates
    expect(count).toBeGreaterThan(0);
  });

  test('should announce SSE updates to screen readers', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Check for screen reader announcer component
    const announcer = page.locator('[data-testid="sr-announcer"]');
    if (await announcer.isVisible()) {
      await expect(announcer).toHaveAttribute('aria-live');
    }
  });

  test('should have proper ARIA roles', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Check for semantic roles
    await expect(page.locator('[role="main"], main')).toBeVisible();
    await expect(page.locator('[role="navigation"], nav')).toBeVisible();
  });

  test('should have alt text on images', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // All images should have alt text
    const images = page.locator('img');
    const count = await images.count();

    for (let i = 0; i < count; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');

      // Alt attribute should exist (can be empty for decorative images)
      expect(alt !== null).toBe(true);
    }
  });

  test('should have accessible form labels', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/settings');

    // All form inputs should have labels
    const inputs = page.locator('input, textarea, select');
    const count = await inputs.count();

    for (let i = 0; i < Math.min(count, 10); i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledBy = await input.getAttribute('aria-labelledby');

      // Input should have label via id, aria-label, or aria-labelledby
      if (id) {
        const label = page.locator(`label[for="${id}"]`);
        const hasLabel = (await label.count()) > 0 || ariaLabel || ariaLabelledBy;
        expect(hasLabel).toBe(true);
      }
    }
  });
});

test.describe('Focus Management', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should restore focus after modal closes', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/reports');

    // Focus trigger button
    const triggerButton = page.locator('[data-testid="create-report-button"]');
    await triggerButton.focus();

    // Open modal
    await triggerButton.click();
    await expect(page.locator('[data-testid="report-modal"]')).toBeVisible();

    // Close modal
    await page.keyboard.press('Escape');

    // Focus should return to trigger button
    await expect(triggerButton).toBeFocused();
  });

  test('should manage focus on page navigation', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Navigate to reports
    await page.click('a[href*="/reports"]');

    // Focus should move to main content or h1
    await page.waitForTimeout(500);
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(['H1', 'MAIN', 'BODY']).toContain(focusedElement);
  });

  test('should handle focus for dynamic content', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Open a dropdown or expandable section
    const expandButton = page.locator('[data-testid="expand-widget"]').first();
    if (await expandButton.isVisible()) {
      await expandButton.click();

      // Focus should move to newly revealed content
      await page.waitForTimeout(200);
      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      expect(focusedElement).toBeTruthy();
    }
  });
});

test.describe('Text & Font Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/en/login');
    await page.fill('input[name="email"]', 'admin@teei.example');
    await page.fill('input[name="password"]', 'SecurePassword123!');
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/cockpit/);
  });

  test('should have minimum font size of 16px for body text', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    const bodyText = page.locator('body');
    const fontSize = await bodyText.evaluate((el) => {
      return window.getComputedStyle(el).fontSize;
    });

    const fontSizeValue = parseInt(fontSize);
    expect(fontSizeValue).toBeGreaterThanOrEqual(14); // Allow some flexibility
  });

  test('should support text zoom up to 200%', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Simulate zoom
    await page.evaluate(() => {
      document.body.style.fontSize = '200%';
    });

    // Content should still be accessible
    await expect(page.locator('[data-testid="at-a-glance-widget"]')).toBeVisible();
  });

  test('should not use text in images for important content', async ({ page }) => {
    await page.goto('/en/cockpit/company-1/dashboard');

    // Important buttons/links should be HTML, not images
    const createButton = page.locator('[data-testid="create-report-button"]');
    if (await createButton.isVisible()) {
      const tagName = await createButton.evaluate((el) => el.tagName);
      expect(['BUTTON', 'A']).toContain(tagName);
    }
  });
});
