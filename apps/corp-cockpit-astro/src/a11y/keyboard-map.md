# Keyboard Navigation Map

## Corporate Cockpit - Complete Keyboard Shortcuts Reference

This document provides a comprehensive overview of all keyboard shortcuts available in the Corporate Cockpit dashboard. These shortcuts are designed to meet WCAG 2.2 AAA standards and provide efficient navigation for keyboard-only users.

---

## Global Shortcuts

These shortcuts work across all pages in the application.

### Search

| Shortcut | Description |
|----------|-------------|
| `/` | Focus global search input |
| `Ctrl + K` | Focus global search input (alternative) |

### Navigation

| Shortcut | Description |
|----------|-------------|
| `G` then `D` | Navigate to Dashboard |
| `G` then `R` | Navigate to Reports |
| `G` then `B` | Navigate to Benchmarks |
| `G` then `S` | Navigate to Settings |

**Usage**: Press `G` first, then quickly press the second key (D, R, B, or S). These are sequential shortcuts, not simultaneous key presses.

### General Actions

| Shortcut | Description |
|----------|-------------|
| `?` (Shift + /) | Show keyboard shortcuts help modal |
| `Esc` | Close modals, drawers, and overlays |

### Skip Links

These are available on focus (Tab key) at the top of every page:

| Skip Link | Target |
|-----------|--------|
| Skip to main content | Main content area |
| Skip to navigation | Main navigation menu |
| Skip to search | Global search input |
| Skip to footer | Page footer |

---

## Dashboard-Specific Shortcuts

These shortcuts are only active when viewing the Dashboard page.

### View Management

| Shortcut | Description |
|----------|-------------|
| `F` | Toggle filters panel |
| `E` | Export current view (CSV/PDF/JSON) |
| `V` | Save current view |

### Widget Navigation

| Shortcut | Description |
|----------|-------------|
| `Alt + →` | Navigate to next widget |
| `Alt + ←` | Navigate to previous widget |
| `Tab` | Navigate forward through widgets and controls |
| `Shift + Tab` | Navigate backward through widgets and controls |

### Grid Navigation (within widget grids)

When focus is inside a widget grid:

| Shortcut | Description |
|----------|-------------|
| `→` (Right Arrow) | Move to next cell/widget |
| `←` (Left Arrow) | Move to previous cell/widget |
| `↓` (Down Arrow) | Move down to next row |
| `↑` (Up Arrow) | Move up to previous row |
| `Home` | Move to first cell/widget |
| `End` | Move to last cell/widget |

---

## Modal and Dialog Shortcuts

When a modal or dialog is open:

| Shortcut | Description |
|----------|-------------|
| `Esc` | Close the modal |
| `Tab` | Navigate forward through focusable elements (trapped within modal) |
| `Shift + Tab` | Navigate backward through focusable elements |

**Note**: Focus is trapped within modals to prevent confusion. Press `Esc` to exit.

---

## Reports Page Shortcuts

| Shortcut | Description |
|----------|-------------|
| `Ctrl + P` | Print current report |
| `Ctrl + E` | Export report |

---

## Forms and Input Shortcuts

Standard form navigation applies throughout the application:

| Shortcut | Description |
|----------|-------------|
| `Tab` | Move to next form field |
| `Shift + Tab` | Move to previous form field |
| `Space` | Toggle checkbox or activate button |
| `Enter` | Submit form or activate button |
| `↓` / `↑` | Navigate dropdown options |
| `Esc` | Close dropdown or clear input (context-dependent) |

---

## Chart Interaction Shortcuts

When interacting with charts:

| Shortcut | Description |
|----------|-------------|
| `Tab` | Focus chart |
| `Enter` | Activate chart interaction mode |
| `Esc` | Exit chart interaction mode |
| `→` / `←` | Navigate between data points |

**Accessibility Note**: All charts have text alternatives and table-based fallbacks for screen reader users.

---

## Filters Panel Shortcuts

When the filters panel is open:

| Shortcut | Description |
|----------|-------------|
| `F` | Close filters panel |
| `Esc` | Close filters panel |
| `Ctrl + A` | Apply filters |
| `Ctrl + R` | Reset all filters |

---

## Saved Views Shortcuts

| Shortcut | Description |
|----------|-------------|
| `V` | Open saved views menu |
| `Ctrl + S` | Save current view |

---

## Advanced Navigation Patterns

### Focus Management

The application implements several focus management patterns:

1. **Focus Trap**: When modals open, focus is trapped within the modal. This prevents users from accidentally navigating to background content.

2. **Roving Tabindex**: Widget grids use roving tabindex, meaning only one widget at a time is in the tab order. Use arrow keys to navigate between widgets.

3. **Focus Restoration**: When closing modals or navigating back, focus is restored to the element that triggered the action.

### Live Regions

The application announces important updates to screen readers:

- **Metric Updates**: "SROI updated from 3.2 to 3.5"
- **Navigation**: "Navigated to Reports page"
- **Alerts**: "Critical threshold exceeded"
- **Loading States**: "Loading dashboard", "Dashboard loaded"

These announcements are automatic and require no user action.

---

## Customization

### Disabling Shortcuts

If keyboard shortcuts interfere with browser or assistive technology shortcuts, you can temporarily disable them:

1. Open Settings (G + S)
2. Navigate to Accessibility
3. Toggle "Enable keyboard shortcuts"

### Browser Conflicts

Some shortcuts may conflict with browser shortcuts:

- **Chrome/Edge**: `Ctrl + K` opens browser address bar by default
- **Firefox**: `/` activates quick find
- **Safari**: May vary

If conflicts occur, use alternative shortcuts where available or temporarily disable browser shortcuts.

---

## Screen Reader Compatibility

### Tested With

- **NVDA** (Windows) - Fully compatible
- **JAWS** (Windows) - Fully compatible
- **VoiceOver** (macOS, iOS) - Fully compatible
- **TalkBack** (Android) - Fully compatible

### Recommended Settings

For the best experience:

1. Enable "Forms Mode" or "Focus Mode" when navigating forms
2. Enable "Application Mode" when interacting with the dashboard
3. Use Table navigation mode when reviewing chart data tables

---

## Keyboard-Only Navigation Tips

### Efficient Dashboard Navigation

1. Use `G + D` to jump directly to the dashboard
2. Use `Tab` to navigate to the first widget
3. Use `Arrow Keys` to navigate between widgets
4. Press `Enter` on a widget to expand/interact
5. Use `Esc` to return to the grid

### Filter Application

1. Press `F` to open filters
2. `Tab` through filter fields
3. `Space` to select checkboxes
4. `Ctrl + A` to apply (custom shortcut)
5. `F` or `Esc` to close

### Export Workflow

1. Navigate to desired view
2. Press `E` to open export menu
3. `Tab` to export format options
4. `Space` to select format
5. `Enter` to confirm export

---

## Accessibility Statement

All keyboard shortcuts are designed to meet:

- **WCAG 2.2 Level AAA** compliance
- **Section 508** standards
- **EN 301 549** European accessibility standard

For accessibility feedback or to report issues, contact: accessibility@teei-platform.com

---

## Quick Reference Card

Print this section for a quick reference:

```
GLOBAL SHORTCUTS
/ or Ctrl+K     Focus search
G + D           Dashboard
G + R           Reports
G + B           Benchmarks
?               Help
Esc             Close overlays

DASHBOARD SHORTCUTS
F               Toggle filters
E               Export
V               Save view
Alt + →/←       Navigate widgets
→/←/↑/↓         Navigate grid cells

NAVIGATION
Tab             Next element
Shift+Tab       Previous element
Enter           Activate
Space           Toggle/Select
Esc             Cancel/Close
```

---

## Version History

- **v1.0.0** (2025-11-14) - Initial keyboard navigation implementation
- Phase D implementation with WCAG 2.2 AAA compliance

---

## Related Documentation

- [Accessibility Audit Report](./targetSizeAudit.md)
- [Screen Reader Support](./screenReaderScripts.ts)
- [WCAG 2.2 Guidelines](https://www.w3.org/WAI/WCAG22/quickref/)
- [Keyboard Accessibility Best Practices](https://www.w3.org/WAI/ARIA/apg/practices/keyboard-interface/)

---

**Last Updated**: 2025-11-14
**Maintained by**: Worker 3 - Performance & Accessibility Team
