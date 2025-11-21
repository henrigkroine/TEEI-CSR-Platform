# RTL (Right-to-Left) Layout Guide

## Overview

This guide covers RTL (Right-to-Left) language support for Arabic (`ar`) and Hebrew (`he`) locales in the TEEI CSR Platform.

## Supported RTL Languages

- **Arabic** (`ar`) - 420M+ native speakers
- **Hebrew** (`he`) - 9M+ native speakers

## Implementation

### HTML Attributes

Always set `dir` and `lang` attributes on the root HTML element:

```html
<!-- For Arabic -->
<html dir="rtl" lang="ar">

<!-- For Hebrew -->
<html dir="rtl" lang="he">
```

### CSS Logical Properties

Use CSS logical properties instead of physical ones for automatic RTL support:

```css
/* ❌ Avoid physical properties */
.element {
  margin-left: 20px;
  padding-right: 10px;
  border-left: 1px solid #ccc;
}

/* ✅ Use logical properties */
.element {
  margin-inline-start: 20px;
  padding-inline-end: 10px;
  border-inline-start: 1px solid #ccc;
}
```

### Logical Property Mappings

| Physical | Logical | RTL Behavior |
|----------|---------|--------------|
| `margin-left` | `margin-inline-start` | Right in RTL |
| `margin-right` | `margin-inline-end` | Left in RTL |
| `padding-left` | `padding-inline-start` | Right in RTL |
| `padding-right` | `padding-inline-end` | Left in RTL |
| `left` | `inset-inline-start` | Right in RTL |
| `right` | `inset-inline-end` | Left in RTL |

### RTL Utility Functions

Use the utilities in `apps/corp-cockpit-astro/src/utils/rtl.ts`:

```typescript
import { isRTL, getDirection, getRTLAttributes } from '@/utils/rtl';

// Check if locale is RTL
const rtl = isRTL('ar'); // true

// Get text direction
const dir = getDirection('he'); // 'rtl'

// Get HTML attributes
const attrs = getRTLAttributes('ar');
// { dir: 'rtl', lang: 'ar' }
```

### Flexbox RTL Support

Use the `getFlexDirection` helper for automatic row reversal:

```typescript
import { getFlexDirection } from '@/utils/rtl';

const flexDirection = getFlexDirection(locale, 'row');
// LTR: 'row'
// RTL: 'row-reverse'
```

```css
.navigation {
  display: flex;
  /* In RTL, this will automatically reverse */
  flex-direction: var(--flex-direction);
}
```

### Text Alignment

Use `getTextAlign` for automatic text alignment:

```typescript
import { getTextAlign } from '@/utils/rtl';

const align = getTextAlign('ar', 'left');
// LTR: 'left'
// RTL: 'right'
```

## Translation Parity

### CI Parity Check

Run the i18n parity check to ensure all locales have complete translations:

```bash
node scripts/ci/i18n-parity-check.ts
```

Expected output:
```
🔍 Checking i18n parity across all locales...

✅ Loaded base locale: en (340 keys)

Checking ar.json...
  ✅ Perfect parity (100%)
  ✅ RTL layout checks passed

Checking he.json...
  ✅ Perfect parity (100%)
  ✅ RTL layout checks passed

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 Summary

Base locale (en): 340 keys

✅ ar: 340 keys (100% parity)
✅ he: 340 keys (100% parity)

✅ i18n parity check PASSED
```

### Required Keys for RTL

All RTL locales must include these keys:

```json
{
  "accessibility": {
    "skip_to_content": "...",
    "toggle_menu": "...",
    "language": "...",
    "screen_reader_mode": "..."
  },
  "common": {
    "next": "...",
    "previous": "...",
    "back": "..."
  },
  "nav": {
    "dashboard": "...",
    "settings": "..."
  }
}
```

## Component Examples

### Navigation Component

```tsx
import { isRTL, rtlClass } from '@/utils/rtl';

interface NavProps {
  locale: string;
}

export function Navigation({ locale }: NavProps) {
  const rtl = isRTL(locale);

  return (
    <nav className={rtlClass('navigation', locale)} dir={rtl ? 'rtl' : 'ltr'}>
      <ul style={{ flexDirection: rtl ? 'row-reverse' : 'row' }}>
        <li>Home</li>
        <li>Dashboard</li>
        <li>Settings</li>
      </ul>
    </nav>
  );
}
```

### Form Component

```tsx
import { getRTLAttributes } from '@/utils/rtl';

interface FormProps {
  locale: string;
}

export function ContactForm({ locale }: FormProps) {
  const attrs = getRTLAttributes(locale);

  return (
    <form {...attrs} className="contact-form">
      <label>
        {t('form.name', locale)}
        <input type="text" />
      </label>
      <label>
        {t('form.email', locale)}
        <input type="email" />
      </label>
      <button type="submit">{t('form.submit', locale)}</button>
    </form>
  );
}
```

## Testing

### Visual Smoke Tests

Run RTL layout checks:

```typescript
import { rtlLayoutCheck } from '@/utils/rtl';

// For Arabic
const arCheck = rtlLayoutCheck('ar');
console.log(arCheck.passed); // true
console.log(arCheck.issues); // []

// For Hebrew
const heCheck = rtlLayoutCheck('he');
console.log(heCheck.passed); // true
```

### Manual Testing Checklist

- [ ] Switch language to Arabic/Hebrew
- [ ] Verify navigation items flow right-to-left
- [ ] Check form inputs align correctly
- [ ] Ensure buttons and icons mirror appropriately
- [ ] Test dropdown menus open in correct direction
- [ ] Verify scroll bars appear on left side
- [ ] Check tooltips position correctly
- [ ] Test keyboard navigation (Tab goes right-to-left)

## Common Pitfalls

### 1. Hardcoded Directions

❌ **Don't:**
```css
.card {
  text-align: left;
  float: left;
}
```

✅ **Do:**
```css
.card {
  text-align: start;
  float: inline-start;
}
```

### 2. Icon Mirroring

Some icons should mirror in RTL, others shouldn't:

**Mirror these:**
- Arrows (← →)
- Chevrons (‹ ›)
- Back/Forward buttons

**Don't mirror these:**
- Clocks
- Play/Pause buttons
- Numbers
- Latin alphabet

### 3. Numbers and Dates

Arabic numerals (0-9) are used in both LTR and RTL contexts:

```typescript
// ✅ Correct
const date = new Intl.DateTimeFormat('ar-SA').format(new Date());
// "١٧‏/١١‏/٢٠٢٤" (Arabic-Indic numerals)

const number = new Intl.NumberFormat('ar-SA').format(1234);
// "١٬٢٣٤" (Arabic-Indic numerals)
```

## Browser Support

RTL support is excellent across modern browsers:

| Feature | Chrome | Firefox | Safari | Edge |
|---------|--------|---------|--------|------|
| `dir` attribute | ✅ | ✅ | ✅ | ✅ |
| Logical properties | ✅ 89+ | ✅ 68+ | ✅ 15+ | ✅ 89+ |
| `inline-start/end` | ✅ | ✅ | ✅ | ✅ |
| Flexbox RTL | ✅ | ✅ | ✅ | ✅ |

## Resources

### Documentation
- [MDN: CSS Logical Properties](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Logical_Properties)
- [W3C: Structural markup and right-to-left text](https://www.w3.org/International/questions/qa-html-dir)

### Tools
- [RTL Debugger Chrome Extension](https://chrome.google.com/webstore/detail/rtl-debugger)
- [Bidirectional Text Converter](https://r12a.github.io/app-conversion/)

### Testing
- Test with native RTL speakers
- Use real Arabic/Hebrew content (not Lorem Ipsum)
- Test on mobile devices (important for RTL UX)

## CI Integration

Add to your CI pipeline:

```yaml
# .github/workflows/ci.yml
- name: Check i18n Parity
  run: node scripts/ci/i18n-parity-check.ts
```

This ensures all RTL locales stay in sync with the base English locale.

## Support

For RTL-specific issues:
- **Internal**: #i18n Slack channel
- **Documentation**: https://docs.teei.app/i18n/rtl
- **Translations**: translations@teei.app
