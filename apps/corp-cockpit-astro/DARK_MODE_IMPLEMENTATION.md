# Dark Mode Implementation Guide

## Overview

This document describes the complete dark mode system for the TEEI Corporate Cockpit, including system preference detection, manual toggle, tenant-specific persistence, and WCAG AA contrast compliance.

## Features

### 1. System Preference Detection
- Automatically detects user's OS dark mode preference via `prefers-color-scheme` media query
- Updates theme when system preference changes
- Respects user choice of "auto" mode (follow system)

### 2. Manual Override Toggle
- 3-state toggle button: Light → Auto (System) → Dark
- Keyboard accessible (Tab, Enter, Space)
- Screen reader announcements via ARIA live regions
- Respects `prefers-reduced-motion` for smooth transitions

### 3. Tenant-Specific Persistence
- Saves theme preference to `localStorage` with key: `theme:{companyId}`
- Falls back to `localStorage` if backend API unavailable
- Can sync with backend API endpoint: `PUT /api/v1/preferences/theme`

### 4. Cross-Tab Synchronization
- Listens to `storage` events to detect theme changes in other tabs
- Updates theme in real-time across all open windows
- Uses custom `theme-changed` event for inter-component communication

### 5. SSR Support (Flash of Unstyled Content Prevention)
- Inline script in `<head>` runs before page render
- Applies theme class before styles are parsed
- Prevents flashing/flickering when page loads
- Uses `is:inline` directive to prevent bundling delays

### 6. WCAG AA Compliance
- All color combinations validated against WCAG AA standards
- Text: 4.5:1 contrast ratio minimum
- UI components/borders: 3:1 contrast ratio minimum
- Run `npm run contrast:check` to validate

## File Structure

### Components
```
src/components/theme/
├── ThemeProvider.tsx      # Context provider, system preference detection
└── ThemeToggle.tsx        # 3-state toggle button component
```

### API
```
src/api/
└── tenantPreferences.ts   # Backend sync, localStorage fallback
```

### Styling
```
src/styles/
└── global.css             # CSS variables for light/dark modes
```

### Utilities
```
src/utils/
└── themeValidator.ts      # Contrast ratio calculation (existing)
```

### Validation
```
scripts/
└── check-contrast.js      # WCAG AA compliance checker
```

### Layout
```
src/layouts/
└── Layout.astro           # FOUC prevention script added
```

## Usage

### Using ThemeProvider

Wrap your app with `ThemeProvider` to enable dark mode:

```tsx
import { ThemeProvider } from '@components/theme/ThemeProvider';

export default function App() {
  return (
    <ThemeProvider companyId={userCompanyId}>
      <YourApp />
    </ThemeProvider>
  );
}
```

### Using ThemeToggle

Add the toggle button to your header/navbar:

```tsx
import { ThemeToggle } from '@components/theme/ThemeToggle';

export function Header() {
  return (
    <header>
      <nav>
        <ThemeToggle
          showLabel={false}
          showTooltip={true}
          onThemeChange={(theme) => console.log('Theme changed to:', theme)}
        />
      </nav>
    </header>
  );
}
```

### Using useTheme Hook

Access theme state in any component:

```tsx
import { useTheme } from '@components/theme/ThemeProvider';

export function MyComponent() {
  const { theme, resolvedTheme, setTheme, isLoading } = useTheme();

  return (
    <div>
      <p>Current theme: {theme}</p>
      <p>Resolved theme: {resolvedTheme}</p>
      <button onClick={() => setTheme('dark')}>
        Use dark mode
      </button>
    </div>
  );
}
```

### Using TenantPreferences API

Sync with backend:

```tsx
import {
  saveThemePreference,
  loadThemePreference,
  onThemePreferenceChanged
} from '@api/tenantPreferences';

// Save preference
await saveThemePreference('dark', companyId);

// Load preference
const theme = await loadThemePreference(companyId);

// Listen for changes from other tabs
const unsubscribe = onThemePreferenceChanged((theme) => {
  console.log('Theme changed in another tab:', theme);
}, companyId);
```

## CSS Variables

The theme system uses CSS variables for dynamic styling:

### Light Mode (Default)
```css
:root {
  --color-primary: #2563eb;
  --color-secondary: #1e40af;
  --color-accent: #047857;
  --color-background: #ffffff;
  --color-foreground: #111827;
  --color-border: #6b7280;
  --color-warning: #b45309;
  --color-error: #dc2626;
  --color-success: #047857;
}
```

### Dark Mode
```css
[data-theme="dark"],
html.dark {
  --color-primary: #60a5fa;
  --color-secondary: #3b82f6;
  --color-accent: #34d399;
  --color-background: #111827;
  --color-foreground: #f9fafb;
  --color-border: #6b7280;
  --color-warning: #fbbf24;
  --color-error: #f87171;
  --color-success: #34d399;
}
```

## Contrast Ratios (WCAG AA Verified)

All combinations meet or exceed WCAG AA standards:

### Light Mode
- Text primary on bg: 17.74:1 ✅ AAA
- Text secondary on bg: 4.83:1 ✅ AA
- Primary button: 5.17:1 ✅ AA
- Accent colors: 5.48:1 ✅ AA
- Borders: 4.83:1 ✅ AA

### Dark Mode
- Text primary on bg: 16.98:1 ✅ AAA
- Text secondary on bg: 12.04:1 ✅ AAA
- Primary button: 6.98:1 ✅ AAA
- Accent colors: 9.23:1 ✅ AAA
- Borders: 3.67:1 ✅ AA

**Run validation:** `npm run contrast:check`

## Architecture

### Theme Flow

```
User System Preference
    ↓
ThemeProvider (detects via matchMedia)
    ↓
Check localStorage (theme:{companyId})
    ↓
If saved → use saved theme
If not → use 'auto' (follow system)
    ↓
If 'auto' → resolve to 'light' or 'dark'
    ↓
Apply classes to <html> and CSS variables
    ↓
ThemeToggle cycles: light → auto → dark → light
```

### Persistence Flow

```
User clicks ThemeToggle
    ↓
setTheme(newTheme)
    ↓
Save to localStorage (immediate)
    ↓
Try API endpoint (background)
    ↓
Emit 'theme-changed' event
    ↓
Storage event detected in other tabs
    ↓
Other tabs update automatically
```

### FOUC Prevention Flow

```
Server renders HTML
    ↓
<head> inline script runs before styles
    ↓
Script checks localStorage for saved theme
    ↓
Script applies theme class to <html>
    ↓
Styles parse and use correct CSS variables
    ↓
No flash of wrong theme!
    ↓
React hydrates and takes over
```

## Accessibility Features

### Keyboard Navigation
- `Tab`: Focus toggle button
- `Enter` or `Space`: Activate theme cycle
- Focus visible ring: 2px outline with offset

### Screen Reader Support
- ARIA label: "Switch to dark mode" / "Switch to light mode" / "Switch to automatic theme"
- Live region announces: "Theme switched to dark mode"
- Tooltip on hover for sighted users

### Motion Preferences
- Detects `prefers-reduced-motion: reduce`
- Disables animations when requested
- Fallback styling always visible

### Color Contrast
- 4.5:1 minimum for normal text (WCAG AA)
- 3:1 minimum for UI components and borders (WCAG AA)
- All colors tested via `npm run contrast:check`

## Backend Integration (Optional)

If your backend has a preferences API:

### Expected Endpoints

```
PUT /api/v1/preferences/theme
Content-Type: application/json
Body: {
  "theme": "light" | "dark" | "auto",
  "companyId": "string"
}

GET /api/v1/preferences/theme?companyId=...
Response: {
  "theme": "light" | "dark" | "auto"
}

GET /api/v1/preferences?companyId=...
Response: {
  "theme": "light" | "dark" | "auto",
  ...other preferences
}

PUT /api/v1/preferences
Content-Type: application/json
Body: {
  "theme": "light" | "dark" | "auto",
  "companyId": "string",
  ...other preferences
}
```

The `tenantPreferences.ts` module handles fallback gracefully if these endpoints don't exist.

## Testing

### Manual Testing Checklist

- [ ] System preference detection: Change OS dark mode, verify cockpit updates
- [ ] Toggle cycles: Light → Auto → Dark → Light in order
- [ ] Persistence: Close tab, reopen, verify theme persists
- [ ] Cross-tab sync: Open 2 tabs, change in one, verify other updates
- [ ] No FOUC: Hard refresh with Network throttling, no flash
- [ ] Contrast: Run `npm run contrast:check`, all pass
- [ ] Keyboard: Tab to toggle, press Enter/Space, verify works
- [ ] Screen reader: Enable VoiceOver/NVDA, toggle, hear announcement
- [ ] Reduced motion: Enable in OS settings, no animations in toggle
- [ ] Mobile: Test on phone with system preference change

### Automated Tests (Example)

```typescript
// vitest
describe('ThemeProvider', () => {
  it('detects system preference on mount', () => {
    // Test system dark mode detection
  });

  it('loads saved theme from localStorage', () => {
    // Test localStorage persistence
  });

  it('syncs across tabs via storage events', () => {
    // Test cross-tab sync
  });

  it('respects prefers-reduced-motion', () => {
    // Test motion preference respect
  });
});

describe('ThemeToggle', () => {
  it('cycles through themes on click', () => {
    // Test toggle cycling
  });

  it('is keyboard accessible', () => {
    // Test Tab, Enter, Space
  });

  it('announces theme changes to screen readers', () => {
    // Test ARIA live region
  });
});
```

## Performance Considerations

### Bundle Size
- ThemeProvider: ~2.5 KB (minified)
- ThemeToggle: ~3 KB (minified)
- tenantPreferences: ~1.5 KB (minified)
- Total: ~7 KB added (with gzip)

### Runtime Performance
- FOUC prevention: Runs synchronously in `<head>`, completes in <1ms
- Theme switching: Updates DOM classes, no layout shift
- Storage events: Efficient listener, minimal overhead
- System preference listener: Uses `addEventListener`, not polling

### Optimization Tips
1. Lazy load ThemeToggle if not visible on initial load
2. Debounce theme preference changes if many components updating
3. Use CSS variables instead of inline styles for theme colors
4. Memoize components that depend on theme to prevent re-renders

## Troubleshooting

### Theme Not Persisting
- Check browser storage is enabled
- Verify `localStorage` key: should be `theme:{companyId}`
- Check for blocked third-party cookies
- Look for console errors

### Flash of Unstyled Content (FOUC)
- Verify FOUC script runs in `<head>` before styles
- Check `is:inline` directive is present
- Test with network throttling
- Look for JavaScript errors in console

### Cross-Tab Sync Not Working
- Ensure both tabs use same domain and protocol
- Check `storage` event listener is attached
- Verify `companyId` is identical across tabs
- Check browser doesn't restrict storage events

### Contrast Issues
- Run `npm run contrast:check` to identify failures
- Update color in `scripts/check-contrast.js`
- Rebuild contrast report
- Update CSS variables in `src/styles/global.css`

### Screen Reader Not Announcing
- Verify live region div created with `id="theme-announce"`
- Check `role="status"` and `aria-live="polite"` attributes
- Test with VoiceOver, NVDA, JAWS
- Clear announcement text after 1 second

## Future Enhancements

- [ ] Per-component theme variants (charts, tables, etc.)
- [ ] Time-based automatic theme switching (sunset/sunrise)
- [ ] Custom color picker for tenant-specific themes
- [ ] Theme scheduling per day of week
- [ ] A/B testing dark mode adoption
- [ ] Analytics on theme preference distribution
- [ ] Export/import theme configurations
- [ ] Contrast ratio dashboard for admins

## Related Files

- `/src/components/theme/ThemeProvider.tsx` - Main provider component
- `/src/components/theme/ThemeToggle.tsx` - Toggle button component
- `/src/api/tenantPreferences.ts` - Backend persistence API
- `/src/styles/global.css` - CSS variables and theme definitions
- `/src/layouts/Layout.astro` - FOUC prevention script
- `/scripts/check-contrast.js` - Contrast validation tool
- `/src/utils/themeValidator.ts` - Contrast calculation utilities

## Support

For issues or questions:
1. Check this guide's Troubleshooting section
2. Run `npm run contrast:check` to verify colors
3. Check browser console for errors
4. Test with different browsers (Chrome, Firefox, Safari, Edge)
5. Verify localStorage is enabled and not full

## License

Part of TEEI Corporate Cockpit. All rights reserved.
