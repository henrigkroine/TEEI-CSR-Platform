/**
 * Accessibility Testing Helpers
 *
 * Utilities for testing accessibility compliance in components
 */

import type { Page, Locator } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Calculate contrast ratio between two colors
 * Based on WCAG 2.1 formula
 */
export function getContrastRatio(rgb1: string, rgb2: string): number {
  const getLuminance = (rgb: string) => {
    const match = rgb.match(/\d+/g);
    if (!match) return 0;

    const [r, g, b] = match.map(Number).map(val => {
      val = val / 255;
      return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };

  const l1 = getLuminance(rgb1);
  const l2 = getLuminance(rgb2);

  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);

  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Check if an element meets WCAG AA contrast requirements
 */
export async function checkContrastRatio(
  locator: Locator,
  level: 'AA' | 'AAA' = 'AA'
): Promise<{ passes: boolean; ratio: number; required: number }> {
  const colors = await locator.evaluate((el) => {
    const computed = window.getComputedStyle(el);
    return {
      color: computed.color,
      backgroundColor: computed.backgroundColor,
      fontSize: computed.fontSize,
    };
  });

  const ratio = getContrastRatio(colors.color, colors.backgroundColor);
  const fontSize = parseFloat(colors.fontSize);

  // Large text is 18pt+ (24px+) or 14pt+ (18.66px+) bold
  const isLargeText = fontSize >= 24 || fontSize >= 18.66;

  const required = level === 'AAA'
    ? (isLargeText ? 4.5 : 7)
    : (isLargeText ? 3 : 4.5);

  return {
    passes: ratio >= required,
    ratio,
    required,
  };
}

/**
 * Check if an element has proper keyboard focus indicators
 */
export async function checkFocusIndicators(page: Page, selector: string): Promise<boolean> {
  await page.locator(selector).focus();

  return await page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;

    const computed = window.getComputedStyle(el);
    const outline = computed.outline;
    const outlineWidth = computed.outlineWidth;
    const boxShadow = computed.boxShadow;

    // Element should have visible focus indicator
    return (
      (outline !== 'none' && outlineWidth !== '0px') ||
      (boxShadow !== 'none' && !boxShadow.includes('0px 0px'))
    );
  }, selector);
}

/**
 * Get all focusable elements on the page
 */
export async function getFocusableElements(page: Page): Promise<string[]> {
  return await page.evaluate(() => {
    const focusableSelectors = [
      'a[href]',
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])',
    ];

    const elements = Array.from(
      document.querySelectorAll(focusableSelectors.join(','))
    );

    return elements.map(el => {
      const tag = el.tagName.toLowerCase();
      const id = el.id ? `#${el.id}` : '';
      const classes = el.className ? `.${el.className.split(' ').join('.')}` : '';
      return `${tag}${id}${classes}`;
    });
  });
}

/**
 * Check if focus is trapped within a container (useful for modals)
 */
export async function checkFocusTrap(
  page: Page,
  containerSelector: string,
  iterations: number = 10
): Promise<boolean> {
  for (let i = 0; i < iterations; i++) {
    await page.keyboard.press('Tab');
  }

  return await page.evaluate((selector) => {
    const container = document.querySelector(selector);
    const activeEl = document.activeElement;
    return container?.contains(activeEl) ?? false;
  }, containerSelector);
}

/**
 * Check if an element has accessible text (via aria-label, aria-labelledby, or text content)
 */
export async function hasAccessibleText(locator: Locator): Promise<{
  hasText: boolean;
  source: string;
  text: string;
}> {
  const info = await locator.evaluate((el) => {
    const ariaLabel = el.getAttribute('aria-label');
    const ariaLabelledby = el.getAttribute('aria-labelledby');
    const title = el.getAttribute('title');
    const textContent = el.textContent?.trim();

    let labelledByText = '';
    if (ariaLabelledby) {
      const labelEl = document.getElementById(ariaLabelledby);
      labelledByText = labelEl?.textContent?.trim() || '';
    }

    if (ariaLabel) return { hasText: true, source: 'aria-label', text: ariaLabel };
    if (labelledByText) return { hasText: true, source: 'aria-labelledby', text: labelledByText };
    if (title) return { hasText: true, source: 'title', text: title };
    if (textContent) return { hasText: true, source: 'textContent', text: textContent };

    return { hasText: false, source: 'none', text: '' };
  });

  return info;
}

/**
 * Check if images have alt text
 */
export async function checkImagesHaveAltText(page: Page): Promise<{
  total: number;
  withAlt: number;
  violations: string[];
}> {
  return await page.evaluate(() => {
    const images = Array.from(document.querySelectorAll('img'));
    const violations: string[] = [];

    images.forEach((img, index) => {
      const alt = img.getAttribute('alt');
      if (alt === null || alt === undefined) {
        const src = img.src || `image-${index}`;
        violations.push(src);
      }
    });

    return {
      total: images.length,
      withAlt: images.length - violations.length,
      violations,
    };
  });
}

/**
 * Check if SVG icons have accessible labels
 */
export async function checkSVGAccessibility(page: Page): Promise<{
  total: number;
  accessible: number;
  violations: string[];
}> {
  return await page.evaluate(() => {
    const svgs = Array.from(document.querySelectorAll('svg'));
    const violations: string[] = [];

    svgs.forEach((svg, index) => {
      const ariaLabel = svg.getAttribute('aria-label');
      const ariaHidden = svg.getAttribute('aria-hidden');
      const role = svg.getAttribute('role');
      const title = svg.querySelector('title');

      // SVG should be either decorative (aria-hidden) or have a label
      const isAccessible = ariaHidden === 'true' || ariaLabel || role === 'img' || title;

      if (!isAccessible) {
        const id = svg.id || svg.className.baseVal || `svg-${index}`;
        violations.push(id);
      }
    });

    return {
      total: svgs.length,
      accessible: svgs.length - violations.length,
      violations,
    };
  });
}

/**
 * Check if form inputs have associated labels
 */
export async function checkFormLabels(page: Page): Promise<{
  total: number;
  labeled: number;
  violations: string[];
}> {
  return await page.evaluate(() => {
    const inputs = Array.from(
      document.querySelectorAll('input, select, textarea')
    ) as HTMLInputElement[];

    const violations: string[] = [];

    inputs.forEach((input) => {
      // Skip hidden inputs
      if (input.type === 'hidden') return;

      const id = input.id;
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledby = input.getAttribute('aria-labelledby');
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);

      if (!hasLabel && !ariaLabel && !ariaLabelledby) {
        violations.push(
          input.id || input.name || input.type || 'unknown-input'
        );
      }
    });

    return {
      total: inputs.length,
      labeled: inputs.length - violations.length,
      violations,
    };
  });
}

/**
 * Check heading hierarchy
 */
export async function checkHeadingHierarchy(page: Page): Promise<{
  valid: boolean;
  headings: Array<{ level: number; text: string }>;
  violations: string[];
}> {
  return await page.evaluate(() => {
    const headings = Array.from(
      document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    ).map(h => ({
      level: parseInt(h.tagName.substring(1)),
      text: h.textContent?.trim() || '',
    }));

    const violations: string[] = [];

    // Check for single h1
    const h1Count = headings.filter(h => h.level === 1).length;
    if (h1Count === 0) {
      violations.push('No h1 heading found');
    } else if (h1Count > 1) {
      violations.push(`Multiple h1 headings found (${h1Count})`);
    }

    // Check for skipped levels
    for (let i = 1; i < headings.length; i++) {
      const diff = headings[i].level - headings[i - 1].level;
      if (diff > 1) {
        violations.push(
          `Heading level skipped: h${headings[i - 1].level} to h${headings[i].level}`
        );
      }
    }

    return {
      valid: violations.length === 0,
      headings,
      violations,
    };
  });
}

/**
 * Check if touch targets meet minimum size (44x44px for WCAG 2.2)
 */
export async function checkTouchTargetSize(
  locator: Locator,
  minSize: number = 44
): Promise<{ meets: boolean; width: number; height: number }> {
  const box = await locator.boundingBox();

  if (!box) {
    return { meets: false, width: 0, height: 0 };
  }

  return {
    meets: box.width >= minSize && box.height >= minSize,
    width: box.width,
    height: box.height,
  };
}

/**
 * Verify ARIA attributes are valid
 */
export async function validateARIAAttributes(page: Page): Promise<{
  valid: boolean;
  violations: Array<{ element: string; attribute: string; issue: string }>;
}> {
  return await page.evaluate(() => {
    const violations: Array<{ element: string; attribute: string; issue: string }> = [];

    // Valid ARIA roles
    const validRoles = [
      'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
      'checkbox', 'columnheader', 'combobox', 'complementary', 'contentinfo',
      'definition', 'dialog', 'directory', 'document', 'feed', 'figure',
      'form', 'grid', 'gridcell', 'group', 'heading', 'img', 'link', 'list',
      'listbox', 'listitem', 'log', 'main', 'marquee', 'math', 'menu',
      'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio', 'navigation',
      'none', 'note', 'option', 'presentation', 'progressbar', 'radio',
      'radiogroup', 'region', 'row', 'rowgroup', 'rowheader', 'scrollbar',
      'search', 'searchbox', 'separator', 'slider', 'spinbutton', 'status',
      'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term', 'textbox',
      'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'
    ];

    const allElements = document.querySelectorAll('*');

    allElements.forEach((el) => {
      const role = el.getAttribute('role');

      if (role && !validRoles.includes(role)) {
        violations.push({
          element: el.tagName.toLowerCase(),
          attribute: 'role',
          issue: `Invalid role: "${role}"`,
        });
      }

      // Check aria-labelledby references valid IDs
      const labelledby = el.getAttribute('aria-labelledby');
      if (labelledby) {
        const ids = labelledby.split(' ');
        ids.forEach(id => {
          if (!document.getElementById(id)) {
            violations.push({
              element: el.tagName.toLowerCase(),
              attribute: 'aria-labelledby',
              issue: `References non-existent ID: "${id}"`,
            });
          }
        });
      }

      // Check aria-describedby references valid IDs
      const describedby = el.getAttribute('aria-describedby');
      if (describedby) {
        const ids = describedby.split(' ');
        ids.forEach(id => {
          if (!document.getElementById(id)) {
            violations.push({
              element: el.tagName.toLowerCase(),
              attribute: 'aria-describedby',
              issue: `References non-existent ID: "${id}"`,
            });
          }
        });
      }
    });

    return {
      valid: violations.length === 0,
      violations,
    };
  });
}
