# Accessibility Testing Guide

This directory contains automated accessibility tests for the TEEI Corporate Cockpit, ensuring WCAG 2.2 Level AA compliance.

## Quick Start

```bash
# Run all accessibility tests
pnpm test:e2e tests/a11y

# Run specific test file
pnpm test:e2e tests/a11y/accessibility.spec.ts

# Run Pa11y CI tests
pnpm test:a11y

# Run with UI (for debugging)
pnpm test:e2e tests/a11y --ui

# Generate report
pnpm test:e2e tests/a11y --reporter=html
```

## Test Structure

```
tests/a11y/
├── accessibility.spec.ts        # Main test suite
├── helpers/
│   └── accessibility-helpers.ts # Utility functions
└── README.md                    # This file
```

## Test Coverage

### Automated Tests (axe-core)

The test suite covers:

- **Landing Page** - Skip links, landmarks, heading hierarchy
- **Tenant Selector** - Form labels, keyboard navigation, search functionality
- **Dashboard** - KPI cards, widgets, dynamic content
- **Evidence Explorer** - Cards, drawers, lineage visualization
- **Reports Page** - Tables, modals, pagination, filters
- **Admin Console** - Forms, toggles, audit logs
- **Global** - Color contrast, focus indicators, touch targets

### WCAG Principles Tested

1. **Perceivable**
   - Text alternatives for non-text content
   - Color contrast (minimum 4.5:1)
   - Adaptable content structure
   - Distinguishable elements

2. **Operable**
   - Keyboard accessibility
   - Sufficient time for interactions
   - Navigable interface
   - Input modalities (keyboard, mouse, touch)

3. **Understandable**
   - Readable text
   - Predictable functionality
   - Input assistance (labels, error messages)

4. **Robust**
   - Valid HTML/ARIA
   - Compatible with assistive technologies

## Helper Functions

The `helpers/accessibility-helpers.ts` file provides utilities for:

- **Color Contrast:** Calculate and verify contrast ratios
- **Focus Management:** Check focus indicators and keyboard navigation
- **ARIA Validation:** Verify proper ARIA attributes
- **Screen Reader Content:** Check labels, descriptions, and live regions
- **Touch Targets:** Verify minimum sizes (44x44px)
- **Form Accessibility:** Check labels, error messages, required fields
- **Table Accessibility:** Verify scope attributes and structure

### Example Usage

```typescript
import { checkContrastRatio, hasAccessibleText } from './helpers/accessibility-helpers';

test('button has sufficient contrast', async ({ page }) => {
  const button = page.locator('.btn-primary');
  const result = await checkContrastRatio(button, 'AA');

  expect(result.passes).toBeTruthy();
  expect(result.ratio).toBeGreaterThanOrEqual(4.5);
});

test('button has accessible text', async ({ page }) => {
  const button = page.locator('.btn-primary');
  const result = await hasAccessibleText(button);

  expect(result.hasText).toBeTruthy();
});
```

## Writing New Tests

### Basic Test Template

```typescript
test('component should not have accessibility violations', async ({ page }) => {
  await page.goto('/your-page');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

### Keyboard Navigation Test

```typescript
test('component should be keyboard navigable', async ({ page }) => {
  await page.goto('/your-page');

  // Tab to first interactive element
  await page.keyboard.press('Tab');

  // Verify focus is on expected element
  const focused = await page.evaluate(() => document.activeElement?.tagName);
  expect(focused).toBe('BUTTON');

  // Test Enter key activates element
  await page.keyboard.press('Enter');

  // Verify expected action occurred
  await expect(page.locator('.modal')).toBeVisible();
});
```

### Screen Reader Test

```typescript
test('component should have proper ARIA labels', async ({ page }) => {
  await page.goto('/your-page');

  const button = page.locator('button[aria-label]');
  const ariaLabel = await button.getAttribute('aria-label');

  expect(ariaLabel).toBeTruthy();
  expect(ariaLabel?.length).toBeGreaterThan(5);
});
```

## CI/CD Integration

Accessibility tests run automatically on:

- Every pull request
- Pushes to main/develop branches
- Manual workflow dispatch

### GitHub Actions Workflow

The `.github/workflows/a11y.yml` workflow:

1. Runs axe-core tests via Playwright
2. Runs Pa11y CI tests
3. Generates Lighthouse audit
4. Checks ESLint accessibility rules
5. Comments on PRs with results
6. Blocks merging if tests fail

### Local Pre-Commit

Set up pre-commit hook:

```bash
# Install husky
pnpm add -D husky

# Configure hook
npx husky install
npx husky add .husky/pre-commit "pnpm test:a11y"
```

## Debugging Failed Tests

### View Test Reports

```bash
# HTML report (interactive)
pnpm test:e2e tests/a11y --reporter=html
open playwright-report/index.html

# JSON report
pnpm test:e2e tests/a11y --reporter=json
cat playwright-report/results.json
```

### Run Tests with UI Mode

```bash
pnpm test:e2e tests/a11y --ui
```

This opens Playwright's UI where you can:
- Step through tests
- See live browser preview
- View axe violations visually
- Inspect element properties

### Debug Specific Violation

```typescript
test('debug specific element', async ({ page }) => {
  await page.goto('/your-page');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .include('#specific-element')
    .analyze();

  console.log('Violations:', JSON.stringify(accessibilityScanResults.violations, null, 2));

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Common Issues and Solutions

### 1. Missing ARIA Labels

**Issue:** Button or link without discernible text

**Fix:**
```tsx
// Bad
<button onClick={handleClick}>
  <svg>...</svg>
</button>

// Good
<button onClick={handleClick} aria-label="Close dialog">
  <svg aria-hidden="true">...</svg>
</button>
```

### 2. Color Contrast

**Issue:** Text doesn't meet 4.5:1 contrast ratio

**Fix:**
```css
/* Bad */
.text-secondary {
  color: #999999; /* 2.8:1 on white */
}

/* Good */
.text-secondary {
  color: #666666; /* 5.7:1 on white */
}
```

### 3. Form Labels

**Issue:** Input without associated label

**Fix:**
```tsx
// Bad
<input type="text" placeholder="Enter name" />

// Good
<label htmlFor="name-input">Name</label>
<input id="name-input" type="text" />

// Also Good
<input type="text" aria-label="Name" />
```

### 4. SVG Icons

**Issue:** Decorative SVG announced by screen readers

**Fix:**
```tsx
// Bad
<svg>...</svg>

// Good
<svg aria-hidden="true">...</svg>
```

### 5. Loading States

**Issue:** Loading state not announced to screen readers

**Fix:**
```tsx
// Bad
<div className="spinner" />

// Good
<div role="status" aria-live="polite">
  <div className="spinner" aria-hidden="true" />
  <span className="sr-only">Loading...</span>
</div>
```

## Best Practices

### 1. Use Semantic HTML

```tsx
// Bad
<div onClick={handleClick}>Click me</div>

// Good
<button onClick={handleClick}>Click me</button>
```

### 2. Provide Skip Links

```tsx
<a href="#main-content" className="skip-link">
  Skip to main content
</a>
```

### 3. Use Proper Heading Hierarchy

```tsx
// Bad
<h1>Page Title</h1>
<h3>Section Title</h3> {/* Skipped h2 */}

// Good
<h1>Page Title</h1>
<h2>Section Title</h2>
<h3>Subsection Title</h3>
```

### 4. Focus Management in Modals

```tsx
const Modal = ({ isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div role="dialog" aria-modal="true">
      <button ref={closeButtonRef} onClick={onClose}>
        Close
      </button>
    </div>
  );
};
```

### 5. Error Messages

```tsx
<div>
  <label htmlFor="email">Email</label>
  <input
    id="email"
    type="email"
    aria-invalid={hasError}
    aria-describedby="email-error"
  />
  {hasError && (
    <div id="email-error" role="alert">
      Please enter a valid email address
    </div>
  )}
</div>
```

## Resources

### Tools
- [axe DevTools Browser Extension](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse in Chrome DevTools](https://developers.google.com/web/tools/lighthouse)

### Documentation
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [MDN Accessibility Docs](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Playwright Accessibility Testing](https://playwright.dev/docs/accessibility-testing)
- [axe-core Documentation](https://github.com/dequelabs/axe-core)

### Learning
- [WebAIM Articles](https://webaim.org/articles/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [Inclusive Components](https://inclusive-components.design/)

## Support

For questions or issues with accessibility testing:

- **Documentation:** [docs/accessibility.md](../../../docs/accessibility.md)
- **Accessibility Team:** accessibility@teei-platform.com
- **GitHub Issues:** Tag with `accessibility` label

---

_Last updated: November 14, 2025_
