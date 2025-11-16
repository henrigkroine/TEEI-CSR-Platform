# Phase 5: Dark Mode Polish - Focus Indicator Testing Checklist

## Test Date: 2025-11-15
## Tester: _____________
## Browser: _____________
## OS: _____________

---

## Light Mode Tests

### Navigation & Header
- [ ] **Navigation Links**: Tab through dashboard navigation links
  - [ ] Focus indicator visible on all links
  - [ ] Focus ring is blue (#2563eb) with 2px thickness
  - [ ] Focus ring has 2px offset from element
  - [ ] No focus ring appears on mouse click (only keyboard)
- [ ] **Logout Link**: Tab to and focus logout link
  - [ ] Focus indicator visible and distinct
  - [ ] Proper contrast against background
- [ ] **Language Switcher**:
  - [ ] Focus visible on dropdown button
  - [ ] Tab through language options
  - [ ] Arrow keys navigate menu items
  - [ ] Focus visible on each menu item
  - [ ] Enter/Space activates selection
  - [ ] Escape closes dropdown and returns focus to button

### Dashboard Widgets
- [ ] **KPI Cards**: Tab through KPI cards on dashboard
  - [ ] Cards are keyboard focusable if interactive
  - [ ] Focus indicators visible
- [ ] **Export Buttons**: Focus all export buttons
  - [ ] Focus indicators visible on all buttons
  - [ ] Contrast ≥3:1 against button background
- [ ] **Theme Toggle**:
  - [ ] Tab to theme toggle button
  - [ ] Focus ring visible (blue, 2px)
  - [ ] Enter/Space toggles theme

### Forms & Inputs
- [ ] **Evidence Explorer Filters**:
  - [ ] Focus visible on date inputs (start date, end date)
  - [ ] Focus visible on program type select
  - [ ] Focus visible on dimension select
  - [ ] Focus visible on search input
  - [ ] Focus visible on search button
  - [ ] All focus indicators have ≥3:1 contrast
- [ ] **Benchmark Filters**:
  - [ ] Focus visible on cohort type buttons (4 buttons)
  - [ ] Active/selected state distinguishable from focus state
  - [ ] Focus visible on industry select
  - [ ] Focus visible on company size select
  - [ ] Focus visible on geography select
  - [ ] Focus visible on metric select
  - [ ] Focus visible on time period select
  - [ ] Focus visible on "Apply Filters" button
- [ ] **Schedule Modal** (if accessible):
  - [ ] Focus visible on close button
  - [ ] Focus visible on all text inputs (schedule name, description)
  - [ ] Focus visible on all select dropdowns (template, format, frequency, timezone)
  - [ ] Focus visible on all checkboxes (active, include charts, include evidence, etc.)
  - [ ] Focus visible on email recipient inputs
  - [ ] Focus visible on submit and cancel buttons

### Boardroom Mode
- [ ] **Enter Boardroom Mode**:
  - [ ] Navigate to boardroom view
  - [ ] Focus visible on "Exit" button
  - [ ] Press Escape key to exit (works correctly)
  - [ ] Press Ctrl+B to toggle (works correctly)
- [ ] **Stale Data Banner** (if triggered):
  - [ ] Focus visible on "Resume Live Updates" button

### Focus Order & Keyboard Navigation
- [ ] **Tab Order**: Tab through entire dashboard
  - [ ] Focus order is logical (follows visual layout)
  - [ ] All interactive elements are reachable
  - [ ] No unexpected focus jumps
  - [ ] Shift+Tab reverses order correctly
- [ ] **Skip Links** (if present):
  - [ ] Tab from URL bar reveals skip link
  - [ ] Skip link has visible focus indicator
  - [ ] Skip link functional
- [ ] **No Keyboard Traps**:
  - [ ] Can tab into and out of all modals
  - [ ] Can tab into and out of all dropdowns
  - [ ] Can tab into and out of all custom widgets

---

## Dark Mode Tests

### Before Testing Dark Mode
- [ ] Switch to dark mode using theme toggle
- [ ] Verify dark background is active (#111827 or similar)

### Navigation & Header
- [ ] **Navigation Links**: Tab through navigation links in dark mode
  - [ ] Focus indicator visible and distinct
  - [ ] Focus ring is lighter blue (#60a5fa) for contrast
  - [ ] Focus ring has ≥3:1 contrast against dark background
  - [ ] Ring offset uses dark offset color
- [ ] **Logout Link**: Focus logout link in dark mode
  - [ ] Focus indicator visible against dark background
- [ ] **Language Switcher**:
  - [ ] Focus visible on dropdown button
  - [ ] Focus visible on menu items
  - [ ] Contrast sufficient in dark mode

### Dashboard Widgets
- [ ] **KPI Cards**: Tab through KPI cards in dark mode
  - [ ] Focus indicators visible against dark cards
  - [ ] Contrast ≥3:1 against card backgrounds
- [ ] **Export Buttons**: Focus all export buttons in dark mode
  - [ ] Focus indicators visible
  - [ ] Sufficient contrast against dark backgrounds
- [ ] **Theme Toggle**:
  - [ ] Focus ring visible in dark mode (lighter blue)
  - [ ] Contrast ≥3:1 against dark background

### Forms & Inputs
- [ ] **Evidence Explorer Filters** (Dark Mode):
  - [ ] Focus visible on all inputs (date, selects, text)
  - [ ] Focus rings use lighter blue (#60a5fa)
  - [ ] Contrast ≥3:1 against dark input backgrounds
  - [ ] Focus visible on buttons
- [ ] **Benchmark Filters** (Dark Mode):
  - [ ] Focus visible on cohort buttons
  - [ ] Focus visible on all select dropdowns
  - [ ] Focus indicators have sufficient contrast
  - [ ] "Apply Filters" button has visible focus
- [ ] **Schedule Modal** (Dark Mode):
  - [ ] All inputs have visible focus indicators
  - [ ] Contrast sufficient against dark modal background
  - [ ] Buttons have visible focus indicators

### Boardroom Mode (Dark Mode)
- [ ] **Exit Button**:
  - [ ] Focus visible on exit button
  - [ ] Contrast sufficient against boardroom dark gradient
- [ ] **Stale Banner Button**:
  - [ ] Focus visible on "Resume" button if banner shows

### Contrast Verification (Dark Mode)
- [ ] **Focus Ring Color**:
  - [ ] Primary focus ring is #60a5fa (Blue-400)
  - [ ] Visually verify ≥3:1 contrast against #111827 (dark background)
  - [ ] Visually verify ≥3:1 contrast against #1E293B (card backgrounds)

---

## Cross-Browser Tests (Optional)

### Chrome/Edge
- [ ] Light mode focus indicators work correctly
- [ ] Dark mode focus indicators work correctly
- [ ] No rendering issues

### Firefox
- [ ] Light mode focus indicators work correctly
- [ ] Dark mode focus indicators work correctly
- [ ] No rendering issues

### Safari (macOS/iOS)
- [ ] Light mode focus indicators work correctly
- [ ] Dark mode focus indicators work correctly
- [ ] No rendering issues

---

## Accessibility Tools Verification

### axe DevTools (Browser Extension)
- [ ] Run axe on dashboard in light mode
  - [ ] No focus indicator violations
  - [ ] No color contrast violations for focus states
- [ ] Run axe on dashboard in dark mode
  - [ ] No focus indicator violations
  - [ ] No color contrast violations for focus states

### Lighthouse (Chrome DevTools)
- [ ] Run Lighthouse accessibility audit
  - [ ] Score ≥90
  - [ ] No focus-related issues reported

---

## Issues Found

| Issue # | Component | Description | Severity | Status |
|---------|-----------|-------------|----------|--------|
| 1 | | | | |
| 2 | | | | |
| 3 | | | | |

---

## Notes

_Add any additional observations or notes here._

---

## Sign-off

- [ ] All critical tests pass
- [ ] All major tests pass
- [ ] Dark mode contrast verified
- [ ] WCAG 2.2 AA Success Criterion 2.4.7 (Focus Visible) met

**Tester Signature**: _________________ **Date**: _________
