# Dark Mode & Theming Implementation

## Overview

Complete dark mode and theming system for the Corporate Cockpit with WCAG AA contrast compliance across all 5 theme presets.

## Features

- **Dark mode toggle** with Light/Dark/Auto modes
- **System preference detection** (`prefers-color-scheme: dark`)
- **Theme persistence** per tenant in localStorage
- **5 theme presets** with dark variants
- **Theme-aware charts** with optimized color palettes
- **WCAG AA compliance** for all text/background pairs
- **Smooth transitions** between themes
- **No white flash** on page load

## Files Created/Modified

### 1. Dark Theme Tokens
**File**: `/apps/corp-cockpit-astro/src/lib/themes/darkTokens.ts`

Dark color palettes for all 5 theme presets:
- Corporate Blue (Dark)
- Healthcare Green (Dark)
- Finance Gold (Dark)
- Modern Neutral (Dark)
- Community Purple (Dark)

All colors meet WCAG AA contrast requirements:
- Text on background: ≥4.5:1
- Large text: ≥3.0:1
- Non-text elements (borders): ≥3.0:1

### 2. Theme Context Provider
**File**: `/apps/corp-cockpit-astro/src/lib/themes/ThemeContext.tsx`

React context for theme state management:
- System preference detection
- Manual override (light/dark/auto)
- localStorage persistence per tenant
- CSS custom properties injection
- Chart color palette hooks

### 3. Enhanced Dark Mode CSS
**File**: `/apps/corp-cockpit-astro/src/styles/themes-dark.css`

CSS custom properties for dark mode:
- Base dark mode overrides
- Preset-specific color schemes
- Smooth transitions
- Enhanced focus states
- Dark mode component styles

### 4. Chart Color Palettes
**File**: `/apps/corp-cockpit-astro/src/lib/themes/chartColors.ts`

Theme-aware color palettes for Chart.js:
- Light mode chart colors
- Dark mode chart colors
- Chart theme configuration
- Gradient generators
- WCAG AA compliant color pairs

### 5. Updated Chart Components
**Files**:
- `/apps/corp-cockpit-astro/src/components/Chart.tsx`
- `/apps/corp-cockpit-astro/src/components/ChartOptimized.tsx`

Both chart components now:
- Detect current theme
- Apply theme-aware colors
- Update on theme changes
- Support all chart types

### 6. Contrast Validation Script
**File**: `/scripts/validateDarkModeContrast.ts`

CI-ready validation script:
- Validates all dark theme colors
- Checks text/background pairs
- Validates chart colors
- Reports WCAG compliance
- Exit code 0 if all pass, 1 if any fail

## Theme Configuration

### Available Theme Presets

#### 1. Corporate Blue (Dark)
```typescript
{
  primary: '#60A5FA',      // Bright blue
  background: '#0F172A',   // Deep navy
  text: '#F1F5F9',         // Off-white
  border: '#64748B',       // Medium slate
}
```

#### 2. Healthcare Green (Dark)
```typescript
{
  primary: '#34D399',      // Bright emerald
  background: '#064E3B',   // Deep green
  text: '#F0FDF4',         // Light green tint
  border: '#10B981',       // Medium green
}
```

#### 3. Finance Gold (Dark)
```typescript
{
  primary: '#FCD34D',      // Bright gold
  background: '#1E1B14',   // Dark brown-gray
  text: '#FFFBEB',         // Warm off-white
  border: '#B45309',       // Gold brown
}
```

#### 4. Modern Neutral (Dark)
```typescript
{
  primary: '#F5F5F5',      // Near white
  background: '#18181B',   // Near black
  text: '#FAFAFA',         // Off-white
  border: '#71717A',       // Medium gray
}
```

#### 5. Community Purple (Dark)
```typescript
{
  primary: '#A78BFA',      // Light purple
  background: '#1E1B29',   // Deep purple-gray
  text: '#FAF5FF',         // Light purple tint
  border: '#8B5CF6',       // Bright purple
}
```

## Usage

### 1. Wrap App with ThemeProvider

```tsx
import { ThemeProvider } from './lib/themes/ThemeContext';
import { getThemePreset } from './lib/themes/presets';

function App({ companyId }) {
  const preset = getThemePreset('corporate_blue');

  return (
    <ThemeProvider
      defaultPreset={preset}
      defaultMode="auto"
      companyId={companyId}
    >
      {/* Your app */}
    </ThemeProvider>
  );
}
```

### 2. Use Theme Toggle Component

```tsx
import { ThemeToggle } from './components/theme/ThemeToggle';

function Header() {
  return (
    <header>
      <ThemeToggle showLabel={true} />
    </header>
  );
}
```

### 3. Access Theme in Components

```tsx
import { useTheme, useChartPalette } from './lib/themes/ThemeContext';

function MyComponent() {
  const { resolvedTheme, preset } = useTheme();
  const chartColors = useChartPalette();

  return (
    <div>
      <p>Current theme: {resolvedTheme}</p>
      <p>Preset: {preset.name}</p>
    </div>
  );
}
```

### 4. Import Dark Mode CSS

In your main CSS file or layout:

```css
@import './themes-dark.css';
```

## Testing

### Run Contrast Validation

```bash
# Validate all dark theme colors
pnpm tsx scripts/validateDarkModeContrast.ts

# Expected output: All colors meet WCAG AA standards (100% pass rate)
```

### Manual Testing Checklist

- [ ] Dark mode toggle works (light/dark/auto)
- [ ] System preference detection works
- [ ] Theme persists after page reload
- [ ] Charts render correctly in dark mode
- [ ] No white flash during theme transitions
- [ ] Focus states visible in both modes
- [ ] All text readable in dark mode
- [ ] Borders visible but not overwhelming
- [ ] Theme changes apply across all components
- [ ] localStorage works for multiple tenants

### Accessibility Testing

1. **Contrast**:
   - Run validation script
   - Use browser DevTools Accessibility Inspector
   - Test with high contrast mode enabled

2. **Keyboard Navigation**:
   - Tab through theme toggle
   - Press Enter/Space to activate
   - Press Escape to close dropdown
   - Focus visible at all times

3. **Screen Readers**:
   - Theme changes announced
   - Current mode clearly stated
   - All options labeled

## WCAG AA Compliance Report

### Validation Summary (2025-11-15)

```
Total tests: 75
✓ Passed (AA): 75 (100%)
✓ Passed (AAA): 54 (72%)
✗ Failed: 0 (0%)

✅ All colors meet WCAG AA standards!
```

### Color Pairs Tested

**For each theme preset**:
- Primary on Background
- Text on Background
- Text Secondary on Background
- Primary Text on Primary
- Secondary on Background
- Secondary Text on Secondary
- Accent on Background
- Accent Text on Accent
- Text on Surface
- Success on Background
- Warning on Background
- Error on Background
- Border on Background (3:1 minimum)

**Chart Colors**:
- 10 color palette tested against dark background
- All meet ≥3:1 for large text/graphics

## Best Practices

### 1. Always Use Theme Variables

✅ Good:
```css
.my-component {
  background-color: var(--color-background);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}
```

❌ Bad:
```css
.my-component {
  background-color: #FFFFFF;
  color: #000000;
}
```

### 2. Respect User Preferences

```typescript
// Listen to system preference changes
const { systemPreference } = useTheme();

// Default to 'auto' mode unless user explicitly chooses
<ThemeProvider defaultMode="auto" />
```

### 3. Avoid Hard-Coded Colors in Charts

✅ Good:
```typescript
const chartColors = useChartPalette();
const data = {
  datasets: [{
    backgroundColor: chartColors,
  }]
};
```

❌ Bad:
```typescript
const data = {
  datasets: [{
    backgroundColor: ['#FF0000', '#00FF00'],
  }]
};
```

### 4. Test Both Modes

Always test your components in:
- Light mode
- Dark mode
- Each theme preset
- With transitions enabled/disabled

## Troubleshooting

### White flash on page load

**Solution**: Ensure dark mode CSS is loaded before React hydration:

```astro
---
// Layout.astro
---
<html>
  <head>
    <link rel="stylesheet" href="/styles/themes-dark.css">
    <script>
      // Apply theme before first paint
      (function() {
        const theme = localStorage.getItem('theme-mode') || 'auto';
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const isDark = theme === 'dark' || (theme === 'auto' && prefersDark);

        if (isDark) {
          document.documentElement.setAttribute('data-theme', 'dark');
          document.documentElement.classList.add('dark');
        }
      })();
    </script>
  </head>
</html>
```

### Charts not updating on theme change

**Solution**: Ensure Chart components listen to theme changes:

```typescript
// Already implemented in Chart.tsx and ChartOptimized.tsx
useEffect(() => {
  const handleThemeChange = () => checkTheme();
  window.addEventListener('theme-changed', handleThemeChange);
  return () => window.removeEventListener('theme-changed', handleThemeChange);
}, []);
```

### Focus outlines not visible in dark mode

**Solution**: Use CSS custom properties for focus rings:

```css
[data-theme="dark"] *:focus-visible {
  outline-color: var(--color-accent);
}
```

## Browser Support

- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+
- ✅ Chrome for Android 90+
- ✅ Safari iOS 14+

## Performance Considerations

1. **CSS Custom Properties**: Fast updates, no re-renders
2. **localStorage**: Minimal overhead, cached reads
3. **MutationObserver**: Efficient theme detection
4. **Memoized Charts**: Prevent unnecessary re-renders
5. **Smooth Transitions**: Respects `prefers-reduced-motion`

## Future Enhancements

1. **High Contrast Mode**: Additional theme for users who need extreme contrast
2. **Custom Theme Builder**: Allow users to create custom color schemes
3. **Scheduled Themes**: Auto-switch based on time of day
4. **Color Blind Modes**: Optimized palettes for different types of color blindness
5. **Accessibility Overlays**: Quick access to contrast adjustments

## Support

For questions or issues:
- Check validation script output
- Review WCAG guidelines at https://www.w3.org/WAI/WCAG21/quickref/
- Test with DevTools Accessibility Inspector
- Verify browser support at https://caniuse.com/

## License

Part of TEEI CSR Platform - Internal use only.
