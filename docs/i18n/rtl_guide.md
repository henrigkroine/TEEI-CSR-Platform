# RTL (Right-to-Left) Implementation Guide

**Status**: ✅ Production Ready
**Version**: 1.0.0
**Author**: Worker 8 - Team 3 (i18n & RTL Support)
**Last Updated**: 2025-11-17

---

## Overview

This guide covers implementing **Right-to-Left (RTL)** language support for Arabic (`ar`) and Hebrew (`he`) locales in the TEEI CSR Platform.

### Supported RTL Locales

- **Arabic** (`ar.json`) - 400M+ speakers
- **Hebrew** (`he.json`) - 9M+ speakers

### Key Principles

1. **Logical Properties**: Use CSS logical properties instead of physical (`margin-inline-start` vs `margin-left`)
2. **Bidirectional (BiDi)**: HTML `dir` attribute controls text direction
3. **Icon Flipping**: Directional icons (arrows, chevrons) must flip in RTL
4. **Layout Mirroring**: UI layout mirrors horizontally (sidebar right, text-align right)

---

## Quick Start

### 1. Set Document Direction

```html
<!-- apps/corp-cockpit-astro/src/layouts/Layout.astro -->
<html lang={locale} dir={isRTL(locale) ? 'rtl' : 'ltr'}>
  <head>...</head>
  <body>...</body>
</html>
```

### 2. Use CSS Logical Properties

```css
/* ❌ DON'T: Physical properties */
.card {
  margin-left: 20px;
  padding-right: 10px;
  text-align: left;
}

/* ✅ DO: Logical properties */
.card {
  margin-inline-start: 20px;  /* Adapts to LTR/RTL */
  padding-inline-end: 10px;
  text-align: start;
}
```

### 3. Flip Directional Icons

```tsx
// Use direction-aware icon component
<ChevronIcon direction={isRTL ? 'left' : 'right'} />

// Or apply CSS transform
<style>
  [dir="rtl"] .chevron-right {
    transform: scaleX(-1);
  }
</style>
```

---

## CSS Best Practices

### Logical Properties Reference

| Physical Property | Logical Property | Notes |
|-------------------|------------------|-------|
| `margin-left` | `margin-inline-start` | Start of inline axis |
| `margin-right` | `margin-inline-end` | End of inline axis |
| `padding-left` | `padding-inline-start` | |
| `padding-right` | `padding-inline-end` | |
| `border-left` | `border-inline-start` | |
| `border-right` | `border-inline-end` | |
| `left: 0` | `inset-inline-start: 0` | Positioning |
| `right: 0` | `inset-inline-end: 0` | |
| `text-align: left` | `text-align: start` | |
| `text-align: right` | `text-align: end` | |

### Example: Card Component

```css
/* ✅ RTL-ready card */
.card {
  /* Margin/padding */
  margin-inline-start: 16px;
  padding-inline: 20px;
  padding-block: 16px;

  /* Border */
  border-inline-start: 4px solid var(--color-primary);

  /* Text alignment */
  text-align: start;

  /* Positioning */
  position: relative;
  inset-inline-start: 0;
}

.card-icon {
  position: absolute;
  inset-inline-end: 16px;
}

.card-title {
  text-align: start;
}

/* Directional icons */
[dir="rtl"] .card-icon.arrow {
  transform: scaleX(-1);
}
```

---

## Layout Patterns

### Navigation Sidebar

```css
/* LTR: Sidebar on left */
/* RTL: Sidebar on right (automatic with logical properties) */

.sidebar {
  position: fixed;
  inset-inline-start: 0; /* Left in LTR, right in RTL */
  width: 240px;
  border-inline-end: 1px solid var(--border-color);
}

.content {
  margin-inline-start: 240px; /* Sidebar width */
}
```

### Breadcrumbs

```tsx
// Separator direction-aware
<nav class="breadcrumbs">
  <a href="/">Home</a>
  <span class="separator">{isRTL ? '←' : '→'}</span>
  <a href="/reports">Reports</a>
</nav>

<style>
  .breadcrumbs {
    display: flex;
    gap: 8px;
  }

  .separator {
    color: var(--text-muted);
  }
</style>
```

### Form Layouts

```html
<form>
  <!-- Label on start side (left in LTR, right in RTL) -->
  <label>
    <span class="label-text">Email</span>
    <input type="email" />
  </label>
</form>

<style>
  label {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .label-text {
    flex: 0 0 120px;
    text-align: end; /* Right-align in LTR, left-align in RTL */
  }

  input {
    flex: 1;
    text-align: start;
  }
</style>
```

---

## Component Examples

### Button with Icon

```tsx
// components/Button.tsx
interface ButtonProps {
  icon?: 'arrow' | 'check' | 'close';
  iconPosition?: 'start' | 'end';
  children: React.ReactNode;
}

function Button({ icon, iconPosition = 'end', children }: ButtonProps) {
  const isRTL = document.dir === 'rtl';

  return (
    <button class="btn">
      {iconPosition === 'start' && <Icon name={icon} flip={isRTL} />}
      <span>{children}</span>
      {iconPosition === 'end' && <Icon name={icon} flip={isRTL} />}
    </button>
  );
}
```

```css
.btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-inline: 16px;
  padding-block: 8px;
}

[dir="rtl"] .btn .icon.arrow {
  transform: scaleX(-1);
}
```

### Data Table

```tsx
// Table with start-aligned text
<table class="data-table">
  <thead>
    <tr>
      <th>Name</th>
      <th>SROI</th>
      <th>Actions</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>ACME Corp</td>
      <td>4.2</td>
      <td>
        <button>View</button>
      </td>
    </tr>
  </tbody>
</table>

<style>
  .data-table {
    width: 100%;
    text-align: start; /* LTR: left, RTL: right */
  }

  .data-table th {
    text-align: start;
    padding-inline: 12px;
  }

  .data-table td {
    padding-inline: 12px;
  }
</style>
```

### Modal / Dialog

```css
.modal-overlay {
  position: fixed;
  inset: 0; /* All sides */
}

.modal {
  position: absolute;
  inset-inline-start: 50%;
  inset-block-start: 50%;
  transform: translate(-50%, -50%); /* Center in both directions */
  width: 500px;
  max-width: 90vw;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-inline: 24px;
  padding-block: 16px;
}

.modal-close {
  /* Close button always on end side */
  margin-inline-start: auto;
}
```

---

## Icon Flipping

### Icons That SHOULD Flip

- ➡️ Arrows (→, ←, ↗, ↘)
- Chevrons (›, ‹, ⋁, ⋀)
- Forward/back navigation
- Undo/redo (⟲, ⟳)
- Volume controls
- Play/pause (in some contexts)

### Icons That SHOULD NOT Flip

- ✅ Checkmarks
- ❌ Close/X buttons
- 🔍 Search icon
- ⚙️ Settings gear
- 📊 Charts (unless directional)
- 🌐 Global/world icons
- ⏱️ Clock icons

### Implementation

```tsx
// Icon component with flip support
interface IconProps {
  name: string;
  flip?: boolean;
  className?: string;
}

function Icon({ name, flip = false, className = '' }: IconProps) {
  const shouldFlip =
    flip &&
    [
      'arrow-right',
      'arrow-left',
      'chevron-right',
      'chevron-left',
      'undo',
      'redo',
    ].includes(name);

  return (
    <svg
      class={`icon icon-${name} ${shouldFlip ? 'icon-flip-rtl' : ''} ${className}`}
      aria-hidden="true"
    >
      <use href={`#icon-${name}`} />
    </svg>
  );
}
```

```css
[dir="rtl"] .icon-flip-rtl {
  transform: scaleX(-1);
}
```

---

## Typography

### Font Selection

- **Arabic**: Noto Sans Arabic, Cairo, Tajawal
- **Hebrew**: Noto Sans Hebrew, Rubik, Assistant

```css
:root {
  --font-sans: system-ui, -apple-system, sans-serif;
}

[dir="rtl"][lang="ar"] {
  --font-sans: 'Noto Sans Arabic', 'Cairo', sans-serif;
}

[dir="rtl"][lang="he"] {
  --font-sans: 'Noto Sans Hebrew', 'Rubik', sans-serif;
}

body {
  font-family: var(--font-sans);
}
```

### Text Direction

```html
<!-- Bidirectional text -->
<p dir="auto">
  This paragraph automatically detects direction based on first strong character.
</p>

<!-- Force LTR for mixed content -->
<p dir="rtl">
  Arabic text with <span dir="ltr">English embedded text</span> continues.
</p>
```

---

## Testing RTL Layouts

### Manual Testing

1. **Switch Locale**: Change app language to Arabic/Hebrew
2. **Visual Inspection**: Check layout mirroring
3. **Icon Flipping**: Verify directional icons flip correctly
4. **Text Alignment**: Ensure text aligns to start (right in RTL)
5. **Scrollbars**: Check scrollbar position (left side in RTL)

### Automated Testing (Playwright)

```typescript
// tests/e2e/rtl.spec.ts
import { test, expect } from '@playwright/test';

test.describe('RTL Layout', () => {
  test('should mirror layout in Arabic', async ({ page }) => {
    // Set locale to Arabic
    await page.goto('/?lang=ar');

    // Check HTML dir attribute
    const html = page.locator('html');
    await expect(html).toHaveAttribute('dir', 'rtl');

    // Check sidebar position (right side in RTL)
    const sidebar = page.locator('.sidebar');
    const box = await sidebar.boundingBox();
    expect(box?.x).toBeGreaterThan(800); // Right side of viewport

    // Check chevron icon flip
    const chevron = page.locator('.chevron-right');
    const transform = await chevron.evaluate(
      el => getComputedStyle(el).transform
    );
    expect(transform).toContain('matrix(-1'); // scaleX(-1)
  });

  test('should align text to right in RTL', async ({ page }) => {
    await page.goto('/?lang=ar');

    const heading = page.locator('h1');
    const textAlign = await heading.evaluate(
      el => getComputedStyle(el).textAlign
    );
    expect(textAlign).toBe('right');
  });
});
```

### Visual Regression (Percy/Chromatic)

```bash
# Capture screenshots for LTR and RTL
pnpm test:visual -- --locale=en
pnpm test:visual -- --locale=ar
pnpm test:visual -- --locale=he
```

---

## Common Pitfalls

### ❌ Hardcoded Left/Right

```css
/* ❌ BAD: Hardcoded left */
.sidebar {
  left: 0;
}

/* ✅ GOOD: Logical property */
.sidebar {
  inset-inline-start: 0;
}
```

### ❌ Absolute Positioning

```css
/* ❌ BAD: Absolute left/right */
.tooltip {
  position: absolute;
  left: 100%;
}

/* ✅ GOOD: Use logical properties */
.tooltip {
  position: absolute;
  inset-inline-start: 100%;
}
```

### ❌ Transform Translate

```css
/* ❌ BAD: Fixed translateX */
.slide-in {
  transform: translateX(100%);
}

/* ✅ GOOD: Direction-aware */
[dir="ltr"] .slide-in {
  transform: translateX(100%);
}

[dir="rtl"] .slide-in {
  transform: translateX(-100%);
}
```

### ❌ Flex/Grid Order

```css
/* ❌ BAD: Fixed order */
.header {
  display: flex;
}

.header .logo {
  order: 1;
}

.header .nav {
  order: 2;
}

/* ✅ GOOD: Use flex-direction: row-reverse in RTL */
[dir="rtl"] .header {
  flex-direction: row-reverse;
}
```

---

## i18n Parity Check

### CI Script

Run the i18n parity checker to ensure all RTL locales have complete translations:

```bash
# Check i18n parity
pnpm i18n:check

# Output:
# 🌍 i18n Parity Checker
# Base locale: en.json
# Base locale has 340 keys
#
# ✓ PASS ar.json
#   Keys: 340 | Coverage: 100.0%
#
# ✓ PASS he.json
#   Keys: 340 | Coverage: 100.0%
#
# ✅ i18n parity check PASSED
```

### CI Integration

```yaml
# .github/workflows/ci.yml
- name: Check i18n Parity
  run: pnpm i18n:check
```

---

## Resources

### Documentation

- [MDN: CSS Logical Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties)
- [W3C: BiDi Text](https://www.w3.org/International/articles/inline-bidi-markup/)
- [Material Design RTL Guidelines](https://m2.material.io/design/usability/bidirectionality.html)

### Tools

- [RTL Debugger (Chrome Extension)](https://chrome.google.com/webstore/detail/rtl-debugger)
- [BiDi Character Inspector](https://r12a.github.io/app-conversion/)
- [Arabic Keyboard (Virtual)](https://www.branah.com/arabic)

### Fonts

- [Google Fonts: Arabic](https://fonts.google.com/?subset=arabic)
- [Google Fonts: Hebrew](https://fonts.google.com/?subset=hebrew)

---

## Checklist

### Before Launch

- [ ] All pages render correctly in RTL mode
- [ ] Directional icons flip appropriately
- [ ] Text aligns to start (right in RTL)
- [ ] Sidebars/drawers appear on correct side
- [ ] Forms layout correctly
- [ ] Tables align text properly
- [ ] Modal/dialog positioning correct
- [ ] Breadcrumbs use correct separators
- [ ] Visual regression tests pass
- [ ] i18n parity check passes (100% coverage)
- [ ] Arabic font loaded correctly
- [ ] Hebrew font loaded correctly
- [ ] Accessibility tested with screen readers (NVDA/JAWS)

---

**Maintained by**: Worker 8 - i18n & RTL Support Team
**Support**: [email protected]
**i18n Scripts**: `/scripts/ci/i18n-parity-check.ts`
