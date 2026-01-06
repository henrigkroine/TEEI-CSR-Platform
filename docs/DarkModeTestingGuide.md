# Dark Mode Testing Guide

## Automated Testing

### 1. Run Contrast Validation

```bash
# Validate all dark theme colors meet WCAG AA
pnpm tsx scripts/validateDarkModeContrast.ts
```

**Expected Output**:
```
✅ All colors meet WCAG AA standards!
Total tests: 75
✓ Passed (AA): 75 (100%)
✓ Passed (AAA): 54 (72%)
```

### 2. Add to CI Pipeline

Add to `.github/workflows/quality-checks.yml`:

```yaml
- name: Validate Dark Mode Contrast
  run: pnpm tsx scripts/validateDarkModeContrast.ts
```

## Manual Testing

### Test Case 1: Theme Toggle Functionality

**Steps**:
1. Load Corporate Cockpit
2. Locate theme toggle in header
3. Click to open dropdown
4. Select "Light" mode
5. Verify UI changes to light theme
6. Select "Dark" mode
7. Verify UI changes to dark theme
8. Select "Auto" mode
9. Verify theme matches system preference

**Expected Results**:
- Dropdown opens/closes properly
- Theme changes apply immediately
- No white flash during transitions
- Current selection is highlighted
- Smooth 0.3s transition animation

### Test Case 2: System Preference Detection

**Steps**:
1. Set OS to light mode
2. Set theme to "Auto"
3. Verify light theme applied
4. Switch OS to dark mode
5. Verify dark theme applied automatically
6. Switch OS back to light mode
7. Verify light theme applied automatically

**Expected Results**:
- Theme updates immediately on OS change
- No page reload required
- Transitions are smooth

### Test Case 3: Theme Persistence

**Steps**:
1. Select dark mode
2. Reload page
3. Verify dark mode persists
4. Open in new tab
5. Verify dark mode in new tab
6. Switch to different company/tenant
7. Verify theme is tenant-specific

**Expected Results**:
- Theme persists across reloads
- Theme persists across tabs
- Different tenants can have different themes
- localStorage key: `theme-mode-{companyId}`

### Test Case 4: Chart Color Adaptation

**Steps**:
1. Navigate to dashboard with charts
2. Set theme to light mode
3. Note chart colors (darker palette)
4. Switch to dark mode
5. Verify chart colors change (brighter palette)
6. Check chart legends, tooltips, axes

**Expected Results**:
- Chart backgrounds update
- Chart colors are visible on dark background
- Tooltips have proper contrast
- Axis labels are readable
- Legend text is visible

### Test Case 5: All Theme Presets

**For each preset** (Corporate Blue, Healthcare Green, Finance Gold, Modern Neutral, Community Purple):

1. Select preset
2. Switch to dark mode
3. Verify colors match preset palette
4. Check primary button colors
5. Check border visibility
6. Check text readability
7. Check form inputs
8. Check hover states

**Expected Results**:
- Each preset has unique dark colors
- All text is readable (≥4.5:1)
- Borders are visible (≥3.0:1)
- Focus states are clear
- Hover states work properly

### Test Case 6: Keyboard Navigation

**Steps**:
1. Tab to theme toggle
2. Verify focus outline is visible
3. Press Enter or Space
4. Verify dropdown opens
5. Use arrow keys to navigate options
6. Press Enter to select
7. Press Escape to close
8. Verify focus returns to toggle

**Expected Results**:
- Focus outline visible in both themes
- Keyboard controls work as expected
- Focus trap works correctly
- Escape closes dropdown
- ARIA announcements work

### Test Case 7: Screen Reader Compatibility

**Steps** (with screen reader enabled):
1. Navigate to theme toggle
2. Verify current theme is announced
3. Activate toggle
4. Verify dropdown is announced
5. Navigate through options
6. Verify each option is announced
7. Select an option
8. Verify selection is announced

**Expected Results**:
- "Current theme: [mode]" announced
- "Expanded/Collapsed" states announced
- Each option labeled clearly
- Selection changes announced
- System preference noted in Auto mode

### Test Case 8: No White Flash

**Steps**:
1. Set OS to dark mode
2. Set app to Auto mode
3. Open app in new tab
4. Watch initial page load carefully
5. Refresh page
6. Watch for flash of light content

**Expected Results**:
- No white flash on initial load
- No white flash on refresh
- Dark theme applied before first paint
- Inline script executes before hydration

### Test Case 9: Reduced Motion Preference

**Steps**:
1. Enable "Reduce motion" in OS settings
2. Open app
3. Switch themes
4. Verify no transitions occur
5. Disable "Reduce motion"
6. Switch themes again
7. Verify smooth transitions

**Expected Results**:
- No transitions when reduced motion enabled
- Transitions work when disabled
- Respects user preference
- No jarring changes

### Test Case 10: Focus Visibility

**For both light and dark modes**:

1. Tab through all interactive elements
2. Verify focus rings are visible
3. Check buttons, links, inputs, selects
4. Verify ≥3:1 contrast for focus indicators
5. Check custom components (dropdowns, modals)

**Expected Results**:
- All focus states visible
- Focus rings meet WCAG 2.2 requirements
- Color is not the only indicator
- Focus order is logical

## Browser Testing Matrix

| Browser | Version | Light Mode | Dark Mode | Auto Mode | Charts |
|---------|---------|------------|-----------|-----------|--------|
| Chrome  | 120+    | ✓          | ✓         | ✓         | ✓      |
| Firefox | 115+    | ✓          | ✓         | ✓         | ✓      |
| Safari  | 16+     | ✓          | ✓         | ✓         | ✓      |
| Edge    | 120+    | ✓          | ✓         | ✓         | ✓      |

## Device Testing

### Desktop
- Windows 10/11 (Chrome, Edge, Firefox)
- macOS Ventura+ (Safari, Chrome, Firefox)
- Linux (Chrome, Firefox)

### Mobile
- iOS 15+ (Safari, Chrome)
- Android 10+ (Chrome, Firefox)

### Tablet
- iPad (Safari)
- Android tablets (Chrome)

## Accessibility Tools

### Automated Testing
1. **axe DevTools**: Scan for WCAG violations
2. **Lighthouse**: Accessibility audit
3. **WAVE**: Web accessibility evaluation

### Manual Testing
1. **VoiceOver** (macOS/iOS): Screen reader testing
2. **NVDA** (Windows): Screen reader testing
3. **JAWS** (Windows): Screen reader testing

### Color Contrast
1. **Validation Script**: `pnpm tsx scripts/validateDarkModeContrast.ts`
2. **Chrome DevTools**: Contrast ratio checker
3. **axe DevTools**: Automated contrast checking

## Performance Testing

### Metrics to Monitor

1. **First Paint**: Theme should apply before first paint
2. **Layout Shift**: No CLS when theme changes
3. **Memory**: No memory leaks from theme listeners
4. **Bundle Size**: Dark mode CSS should be code-split

### Tools
- Chrome DevTools Performance tab
- Lighthouse performance audit
- Bundle analyzer

## Common Issues & Fixes

### Issue: White flash on load
**Fix**: Ensure inline script in HTML head runs before React hydration

### Issue: Charts not updating
**Fix**: Verify theme-changed event listeners are attached

### Issue: Focus not visible in dark mode
**Fix**: Check CSS custom properties for focus ring colors

### Issue: localStorage not persisting
**Fix**: Verify tenant ID is correctly passed to ThemeProvider

### Issue: Transitions too slow/fast
**Fix**: Adjust transition duration in themes-dark.css

## Regression Testing Checklist

After any theme-related changes:

- [ ] Run contrast validation script
- [ ] Test all 5 theme presets
- [ ] Verify localStorage persistence
- [ ] Check system preference detection
- [ ] Test keyboard navigation
- [ ] Verify screen reader announcements
- [ ] Check chart color updates
- [ ] Test on multiple browsers
- [ ] Verify no white flash
- [ ] Check reduced motion preference
- [ ] Validate all focus states
- [ ] Test cross-tab sync

## Reporting Issues

When reporting dark mode issues, include:

1. Browser and version
2. Operating system
3. Current theme preset
4. Current theme mode (light/dark/auto)
5. System dark mode setting
6. Steps to reproduce
7. Screenshots (light and dark)
8. Console errors (if any)
9. localStorage contents
10. Contrast validation results

## Sign-off Template

```
Dark Mode Implementation Testing Sign-off

Tested by: _______________
Date: _______________

✓ All automated tests pass
✓ Manual test cases completed
✓ Cross-browser testing done
✓ Accessibility audit passed
✓ Performance metrics acceptable
✓ No regressions found

Notes:
_______________________________________
_______________________________________

Approved for production: Yes / No
Signature: _______________
```
