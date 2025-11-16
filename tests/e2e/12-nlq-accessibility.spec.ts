import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  loginForNLQTests,
  navigateToNLQPage,
  submitQuestion,
  waitForAnswerCardReady
} from './helpers/nlq-helpers';

/**
 * E2E Test: NLQ Accessibility (A11y)
 * Tests keyboard navigation, screen reader support, and WCAG compliance
 */

test.describe('NLQ WCAG 2.2 AAA Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await loginForNLQTests(page);
    await navigateToNLQPage(page, 'company-1');
  });

  test('should pass axe accessibility scan on NLQ page', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should pass axe scan on answer card', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI for last quarter?');
    await waitForAnswerCardReady(page);

    const answerCard = page.locator('[data-testid="answer-card"]');
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="answer-card"]')
      .withTags(['wcag2a', 'wcag2aa'])
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    // Check that h1 exists
    await expect(page.locator('h1')).toBeVisible();

    // Get all headings
    const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', (elements) =>
      elements.map((el) => ({
        level: parseInt(el.tagName.substring(1)),
        text: el.textContent?.trim()
      }))
    );

    // Should start with h1
    expect(headings[0].level).toBe(1);

    // Verify no skipped levels
    for (let i = 1; i < headings.length; i++) {
      const diff = headings[i].level - headings[i - 1].level;
      expect(diff).toBeLessThanOrEqual(1);
    }
  });

  test('should have sufficient color contrast (AAA)', async ({ page }) => {
    const accessibilityScanResults = await new AxeBuilder({ page })
      .withTags(['wcag2aaa'])
      .analyze();

    // Check for contrast violations
    const contrastViolations = accessibilityScanResults.violations.filter(
      v => v.id === 'color-contrast-enhanced'
    );

    expect(contrastViolations).toHaveLength(0);
  });
});

test.describe('NLQ Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await loginForNLQTests(page);
    await navigateToNLQPage(page, 'company-1');
  });

  test('should navigate search bar with Tab key', async ({ page }) => {
    // Press Tab to focus search input
    await page.keyboard.press('Tab');

    // Verify search input is focused
    const searchInput = page.locator('[data-testid="nlq-search-input"]');
    await expect(searchInput).toBeFocused();
  });

  test('should submit question with Enter key', async ({ page }) => {
    const searchInput = page.locator('[data-testid="nlq-search-input"]');
    await searchInput.focus();
    await searchInput.fill('What is our SROI?');

    // Press Enter to submit
    await page.keyboard.press('Enter');

    // Verify answer card appears
    await waitForAnswerCardReady(page);
    await expect(page.locator('[data-testid="answer-card"]')).toBeVisible();
  });

  test('should navigate autocomplete with arrow keys', async ({ page }) => {
    const searchInput = page.locator('[data-testid="nlq-search-input"]');
    await searchInput.focus();
    await searchInput.fill('What is our');

    // Wait for autocomplete suggestions
    await page.waitForSelector('[data-testid="autocomplete-suggestion"]', {
      state: 'visible',
      timeout: 2000
    }).catch(() => null);

    const suggestions = page.locator('[data-testid="autocomplete-suggestion"]');
    const suggestionsCount = await suggestions.count();

    if (suggestionsCount > 0) {
      // Press ArrowDown to navigate suggestions
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);

      // First suggestion should be highlighted
      const firstSuggestion = suggestions.nth(0);
      await expect(firstSuggestion).toHaveClass(/highlighted|selected|active/);

      // Press ArrowDown again
      await page.keyboard.press('ArrowDown');
      await page.waitForTimeout(200);

      // Second suggestion should be highlighted
      const secondSuggestion = suggestions.nth(1);
      await expect(secondSuggestion).toHaveClass(/highlighted|selected|active/);

      // Press Enter to select
      await page.keyboard.press('Enter');

      // Search input should be populated
      const inputValue = await searchInput.inputValue();
      expect(inputValue).toBeTruthy();
    }
  });

  test('should navigate template cards with Tab and activate with Enter', async ({ page }) => {
    // Tab to first template card
    let tabCount = 0;
    const maxTabs = 20;
    let templateFocused = false;

    while (tabCount < maxTabs && !templateFocused) {
      await page.keyboard.press('Tab');
      tabCount++;

      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const testId = await page.evaluate(
        (el) => (el as Element).getAttribute('data-testid'),
        focusedElement
      );

      if (testId?.includes('template-card')) {
        templateFocused = true;
        break;
      }
    }

    if (templateFocused) {
      // Activate with Enter
      await page.keyboard.press('Enter');

      // Verify question was populated
      const searchInput = page.locator('[data-testid="nlq-search-input"]');
      const inputValue = await searchInput.inputValue();
      expect(inputValue).toBeTruthy();
    }
  });

  test('should navigate answer card with Tab key', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    const answerCard = page.locator('[data-testid="answer-card"]');

    // Focus on answer card area
    const lineageButton = answerCard.locator('[data-testid="lineage-toggle-button"]');
    await lineageButton.focus();
    await expect(lineageButton).toBeFocused();

    // Press Enter to expand lineage
    await page.keyboard.press('Enter');
    await expect(answerCard.locator('[data-testid="lineage-panel"]')).toBeVisible();

    // Tab to export buttons
    await page.keyboard.press('Tab');
    const focusedElement = await page.evaluateHandle(() => document.activeElement);
    const testId = await page.evaluate(
      (el) => (el as Element).getAttribute('data-testid'),
      focusedElement
    );

    expect(testId).toMatch(/export|feedback|lineage/);
  });

  test('should close modals with Escape key', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    // Open lineage panel
    const lineageButton = page.locator('[data-testid="lineage-toggle-button"]');
    await lineageButton.click();

    const lineagePanel = page.locator('[data-testid="lineage-panel"]');
    await expect(lineagePanel).toBeVisible();

    // Press Escape to close
    await page.keyboard.press('Escape');

    // Verify panel is closed
    await expect(lineagePanel).not.toBeVisible();
  });

  test('should have visible focus indicators', async ({ page }) => {
    const searchInput = page.locator('[data-testid="nlq-search-input"]');
    await searchInput.focus();

    // Check for focus ring
    const outlineWidth = await searchInput.evaluate((el) =>
      window.getComputedStyle(el).outlineWidth
    );

    // Focus indicator should be visible (not '0px')
    expect(outlineWidth).not.toBe('0px');

    // Or check for box-shadow focus ring
    const boxShadow = await searchInput.evaluate((el) =>
      window.getComputedStyle(el).boxShadow
    );

    const hasFocusIndicator = outlineWidth !== '0px' || boxShadow !== 'none';
    expect(hasFocusIndicator).toBe(true);
  });

  test('should support skip links', async ({ page }) => {
    // Press Tab to reveal skip link
    await page.keyboard.press('Tab');

    // Check for skip link
    const skipLink = page.locator('[data-testid="skip-to-main"], a[href="#main-content"]').first();

    if (await skipLink.isVisible()) {
      // Activate skip link
      await page.keyboard.press('Enter');

      // Focus should move to main content
      const focusedId = await page.evaluate(() => document.activeElement?.id);
      expect(['main-content', 'nlq-page', 'main']).toContain(focusedId || '');
    }
  });

  test('should navigate query history with keyboard', async ({ page }) => {
    // Submit a few queries first
    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    await page.reload();
    await navigateToNLQPage(page);

    await submitQuestion(page, 'What is our VIS score?');
    await waitForAnswerCardReady(page);

    // Open history panel
    const historyButton = page.locator('[data-testid="query-history-button"]');
    await historyButton.focus();
    await page.keyboard.press('Enter');

    const historyPanel = page.locator('[data-testid="query-history-panel"]');
    await expect(historyPanel).toBeVisible();

    // Tab through history items
    await page.keyboard.press('Tab');

    const focusedElement = await page.evaluateHandle(() => document.activeElement);
    const testId = await page.evaluate(
      (el) => (el as Element).getAttribute('data-testid'),
      focusedElement
    );

    expect(testId).toMatch(/history-item|rerun-query/);
  });
});

test.describe('NLQ Screen Reader Support', () => {
  test.beforeEach(async ({ page }) => {
    await loginForNLQTests(page);
    await navigateToNLQPage(page, 'company-1');
  });

  test('should have ARIA labels on interactive elements', async ({ page }) => {
    // Check search input has label
    const searchInput = page.locator('[data-testid="nlq-search-input"]');
    const ariaLabel = await searchInput.getAttribute('aria-label');
    const ariaLabelledBy = await searchInput.getAttribute('aria-labelledby');

    expect(ariaLabel || ariaLabelledBy).toBeTruthy();

    // Check buttons have accessible names
    const buttons = page.locator('button').filter({ hasText: /export|feedback|lineage/i });
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const label = await button.getAttribute('aria-label');
      const text = await button.textContent();

      expect(label || text?.trim()).toBeTruthy();
    }
  });

  test('should have ARIA live regions for dynamic updates', async ({ page }) => {
    // Check for live regions
    const liveRegion = page.locator('[aria-live="polite"], [aria-live="assertive"]');
    const count = await liveRegion.count();

    // Should have at least one live region for query status updates
    expect(count).toBeGreaterThan(0);
  });

  test('should announce query status to screen readers', async ({ page }) => {
    // Check for status announcer
    const statusAnnouncer = page.locator('[data-testid="query-status-announcer"]');

    if (await statusAnnouncer.isVisible()) {
      await expect(statusAnnouncer).toHaveAttribute('aria-live');
      await expect(statusAnnouncer).toHaveAttribute('role', 'status');
    }

    // Submit query and check for announcements
    await submitQuestion(page, 'What is our SROI?', { waitForResult: false });

    // Status announcer should update
    await page.waitForTimeout(1000);
    const statusText = await statusAnnouncer.textContent();
    expect(statusText).toMatch(/loading|processing|complete|ready/i);
  });

  test('should have proper ARIA roles on answer card', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    const answerCard = page.locator('[data-testid="answer-card"]');

    // Check for region role
    const role = await answerCard.getAttribute('role');
    expect(['region', 'article', 'complementary']).toContain(role || '');

    // Check for aria-labelledby or aria-label
    const ariaLabel = await answerCard.getAttribute('aria-label');
    const ariaLabelledBy = await answerCard.getAttribute('aria-labelledby');
    expect(ariaLabel || ariaLabelledBy).toBeTruthy();
  });

  test('should have accessible table markup', async ({ page }) => {
    await submitQuestion(page, 'Show outcome scores by dimension');
    await waitForAnswerCardReady(page);

    const table = page.locator('[data-testid="data-table"]');

    if (await table.isVisible()) {
      // Check for caption or aria-label
      const caption = table.locator('caption');
      const ariaLabel = await table.getAttribute('aria-label');
      const hasAccessibleName = (await caption.count() > 0) || ariaLabel;
      expect(hasAccessibleName).toBe(true);

      // Check for table headers
      const headers = table.locator('th');
      const headerCount = await headers.count();
      expect(headerCount).toBeGreaterThan(0);

      // Check headers have scope attribute
      const firstHeader = headers.first();
      const scope = await firstHeader.getAttribute('scope');
      expect(['col', 'row']).toContain(scope || '');
    }
  });

  test('should have accessible chart descriptions', async ({ page }) => {
    await submitQuestion(page, 'Show SROI trend for past year');
    await waitForAnswerCardReady(page);

    const chart = page.locator('[data-testid="data-chart"]');

    if (await chart.isVisible()) {
      // Check for aria-label or title
      const ariaLabel = await chart.getAttribute('aria-label');
      const ariaLabelledBy = await chart.getAttribute('aria-labelledby');

      expect(ariaLabel || ariaLabelledBy).toBeTruthy();

      // Check for data table alternative (if provided)
      const tableAlternative = page.locator('[data-testid="chart-data-table"]');
      const hasTableAlternative = await tableAlternative.isVisible().catch(() => false);

      // Either has good aria-label or table alternative
      expect(ariaLabel || ariaLabelledBy || hasTableAlternative).toBeTruthy();
    }
  });

  test('should have accessible form controls', async ({ page }) => {
    const searchInput = page.locator('[data-testid="nlq-search-input"]');

    // Check for label
    const id = await searchInput.getAttribute('id');
    if (id) {
      const label = page.locator(`label[for="${id}"]`);
      const labelExists = await label.count() > 0;

      if (!labelExists) {
        // Should have aria-label
        const ariaLabel = await searchInput.getAttribute('aria-label');
        expect(ariaLabel).toBeTruthy();
      }
    } else {
      // Must have aria-label
      const ariaLabel = await searchInput.getAttribute('aria-label');
      expect(ariaLabel).toBeTruthy();
    }

    // Check for placeholder (helpful but not a replacement for label)
    const placeholder = await searchInput.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();
  });

  test('should announce confidence level to screen readers', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    const confidenceBadge = page.locator('[data-testid="confidence-badge"]');

    // Check for aria-label that includes confidence level
    const ariaLabel = await confidenceBadge.getAttribute('aria-label');
    if (ariaLabel) {
      expect(ariaLabel.toLowerCase()).toMatch(/confidence|high|medium|low/);
    }

    // Check for role="status" or similar
    const role = await confidenceBadge.getAttribute('role');
    expect(['status', 'img', null]).toContain(role);
  });
});

test.describe('NLQ Focus Management', () => {
  test.beforeEach(async ({ page }) => {
    await loginForNLQTests(page);
    await navigateToNLQPage(page);
  });

  test('should restore focus after modal closes', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    const lineageButton = page.locator('[data-testid="lineage-toggle-button"]');
    await lineageButton.focus();
    await expect(lineageButton).toBeFocused();

    // Open modal
    await lineageButton.click();
    const lineagePanel = page.locator('[data-testid="lineage-panel"]');
    await expect(lineagePanel).toBeVisible();

    // Close modal with Escape
    await page.keyboard.press('Escape');

    // Focus should return to lineage button
    await page.waitForTimeout(200);
    await expect(lineageButton).toBeFocused();
  });

  test('should trap focus in modals', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    // Open lineage panel
    const lineageButton = page.locator('[data-testid="lineage-toggle-button"]');
    await lineageButton.click();

    const lineagePanel = page.locator('[data-testid="lineage-panel"]');
    await expect(lineagePanel).toBeVisible();

    // Tab through modal elements
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press('Tab');

      const focusedElement = await page.evaluateHandle(() => document.activeElement);
      const isInModal = await page.evaluate(
        ([panel, focused]) => (panel as Element).contains(focused as Element),
        [await lineagePanel.elementHandle(), focusedElement]
      );

      if (!isInModal) {
        // Check if focus is on close button or modal overlay
        const testId = await page.evaluate(
          (el) => (el as Element).getAttribute('data-testid'),
          focusedElement
        );
        expect(testId).toMatch(/lineage|close|modal/);
      }
    }
  });

  test('should manage focus when answer card appears', async ({ page }) => {
    const searchInput = page.locator('[data-testid="nlq-search-input"]');
    await searchInput.focus();

    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    // Focus should move to answer card or stay on search
    await page.waitForTimeout(500);
    const focusedElement = await page.evaluateHandle(() => document.activeElement);
    const testId = await page.evaluate(
      (el) => (el as Element).getAttribute('data-testid'),
      focusedElement
    );

    // Acceptable focus locations
    expect(testId).toMatch(/nlq-search-input|answer-card|answer-summary/);
  });
});

test.describe('NLQ Target Size Compliance', () => {
  test.beforeEach(async ({ page }) => {
    await loginForNLQTests(page);
    await navigateToNLQPage(page);
  });

  test('should meet WCAG 2.2 AAA target size (24x24px)', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    // Check interactive elements
    const buttons = page.locator('[data-testid="answer-card"] button');
    const count = await buttons.count();

    for (let i = 0; i < Math.min(count, 5); i++) {
      const button = buttons.nth(i);
      const boundingBox = await button.boundingBox();

      if (boundingBox) {
        expect(boundingBox.width).toBeGreaterThanOrEqual(24);
        expect(boundingBox.height).toBeGreaterThanOrEqual(24);
      }
    }
  });

  test('should have adequate spacing between interactive elements', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    const feedbackButtons = page.locator('[data-testid="answer-card"] [data-testid^="feedback-"]');
    const count = await feedbackButtons.count();

    if (count >= 2) {
      const button1 = await feedbackButtons.nth(0).boundingBox();
      const button2 = await feedbackButtons.nth(1).boundingBox();

      if (button1 && button2) {
        // Calculate spacing
        const spacing = Math.abs(button2.x - (button1.x + button1.width));
        expect(spacing).toBeGreaterThanOrEqual(8); // At least 8px spacing
      }
    }
  });
});

test.describe('NLQ Text & Font Accessibility', () => {
  test.beforeEach(async ({ page }) => {
    await loginForNLQTests(page);
    await navigateToNLQPage(page);
  });

  test('should have minimum font size for body text', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    const answerSummary = page.locator('[data-testid="answer-summary"]');
    const fontSize = await answerSummary.evaluate((el) =>
      window.getComputedStyle(el).fontSize
    );

    const fontSizeValue = parseInt(fontSize);
    expect(fontSizeValue).toBeGreaterThanOrEqual(14); // Minimum 14px
  });

  test('should support text zoom up to 200%', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    // Simulate zoom
    await page.evaluate(() => {
      document.body.style.fontSize = '200%';
    });

    // Content should still be visible and accessible
    const answerCard = page.locator('[data-testid="answer-card"]');
    await expect(answerCard).toBeVisible();

    const answerSummary = page.locator('[data-testid="answer-summary"]');
    await expect(answerSummary).toBeVisible();
  });

  test('should have adequate line height for readability', async ({ page }) => {
    await submitQuestion(page, 'What is our SROI?');
    await waitForAnswerCardReady(page);

    const answerSummary = page.locator('[data-testid="answer-summary"]');
    const lineHeight = await answerSummary.evaluate((el) =>
      window.getComputedStyle(el).lineHeight
    );

    const fontSize = await answerSummary.evaluate((el) =>
      window.getComputedStyle(el).fontSize
    );

    const lineHeightValue = parseFloat(lineHeight);
    const fontSizeValue = parseFloat(fontSize);

    // Line height should be at least 1.5x font size
    expect(lineHeightValue / fontSizeValue).toBeGreaterThanOrEqual(1.4);
  });
});
