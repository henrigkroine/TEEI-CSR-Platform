# Accessibility Guide - TEEI Corporate Cockpit

## Overview

The TEEI Corporate Cockpit is designed to be accessible to all users, including those with disabilities. We are committed to meeting WCAG 2.2 Level AA standards and continuously improving the accessibility of our platform.

**Last Updated:** November 2025
**WCAG Version:** 2.2 Level AA
**Testing Tools:** axe-core, Pa11y, Lighthouse, Screen Readers (NVDA, JAWS, VoiceOver)

---

## Table of Contents

1. [Keyboard Navigation](#keyboard-navigation)
2. [Screen Reader Support](#screen-reader-support)
3. [Visual Accessibility](#visual-accessibility)
4. [Touch and Mobile Accessibility](#touch-and-mobile-accessibility)
5. [Forms and Inputs](#forms-and-inputs)
6. [Testing Accessibility](#testing-accessibility)
7. [Known Issues](#known-issues)
8. [Reporting Issues](#reporting-issues)

---

## Keyboard Navigation

### Global Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Tab` | Move focus to the next interactive element |
| `Shift + Tab` | Move focus to the previous interactive element |
| `Enter` | Activate buttons, links, and other interactive elements |
| `Space` | Activate buttons and checkboxes |
| `Escape` | Close modals, dropdowns, and drawers |
| `Arrow Keys` | Navigate within menus, dropdowns, and tab interfaces |

### Skip Links

Press `Tab` immediately after page load to reveal the "Skip to main content" link. This allows keyboard users to bypass navigation and jump directly to the main content area.

### Page-Specific Shortcuts

#### Dashboard
- `Tab` to navigate between KPI cards
- `Enter` on a KPI card to view detailed evidence
- `Escape` to close evidence drawers

#### Tenant Selector
- `Tab` to focus on the search input
- Type to filter companies
- `Tab` to navigate between company cards
- `Enter` or `Space` to select a company

#### Reports Page
- `Tab` to navigate between filter controls
- `Enter` to apply filters or generate reports
- Arrow keys to navigate within dropdown menus
- `Tab` through table rows
- `Enter` on action buttons to view, edit, or delete reports

#### Evidence Explorer
- `Tab` to navigate between evidence cards
- `Enter` to open evidence details
- `Tab` within drawers to navigate content
- `Escape` to close drawers

#### Admin Console
- `Tab` to navigate between form fields and controls
- `Arrow Keys` to navigate toggle switches
- `Space` to toggle checkboxes and switches
- `Enter` to submit forms or activate buttons

### Focus Management

- All interactive elements have visible focus indicators (blue outline)
- Focus is trapped within modal dialogs
- Focus returns to the triggering element when modals close
- Skip links are provided for keyboard navigation

---

## Screen Reader Support

### Tested Screen Readers

The TEEI Corporate Cockpit has been tested with:
- **NVDA** (Windows) - Latest version
- **JAWS** (Windows) - Latest version
- **VoiceOver** (macOS/iOS) - Latest version
- **TalkBack** (Android) - Latest version

### Landmarks and Regions

The application uses semantic HTML5 landmarks to help screen reader users navigate:

- `<header role="banner">` - Site header with navigation
- `<nav role="navigation">` - Navigation menus
- `<main role="main">` - Main content area
- `<footer role="contentinfo">` - Footer information
- `<aside role="complementary">` - Sidebar content
- `<section>` - Distinct sections within pages

### ARIA Labels and Descriptions

All interactive elements have descriptive labels:
- Buttons have descriptive text or `aria-label` attributes
- Form inputs have associated `<label>` elements or `aria-labelledby`
- Icons are marked as decorative with `aria-hidden="true"`
- Status messages use `role="status"` and `aria-live` regions
- Error messages use `role="alert"` for immediate announcement

### Live Regions

Dynamic content updates are announced to screen readers using ARIA live regions:
- Loading states: `aria-live="polite"`
- Error messages: `aria-live="assertive"` with `role="alert"`
- Status updates: `aria-live="polite"` with `role="status"`

### Tables

Data tables include proper markup:
- `<th scope="col">` for column headers
- `<th scope="row">` for row headers
- `<caption>` elements for table descriptions
- `aria-label` for table purpose

---

## Visual Accessibility

### Color Contrast

All text meets WCAG 2.2 AA color contrast requirements:
- **Normal text:** Minimum 4.5:1 contrast ratio
- **Large text (18pt+):** Minimum 3:1 contrast ratio
- **UI components:** Minimum 3:1 contrast ratio

#### Color Palette

**Light Mode:**
- Primary: `#0066CC` (Blue) - Contrast ratio: 7.5:1 on white
- Secondary: `#FF6600` (Orange) - Contrast ratio: 4.7:1 on white
- Text: `#1A1A1A` (Near-black) - Contrast ratio: 16.1:1 on white
- Background: `#FFFFFF` (White)
- Border: `#E0E0E0` (Light gray)

**Dark Mode:**
- Text: `#E0E0E0` (Light gray) - Contrast ratio: 11.6:1 on dark background
- Background: `#121212` (Near-black)
- Border: `#333333` (Dark gray)

### Color Independence

Information is never conveyed by color alone:
- Status indicators include icons and text labels
- Error states include icons and descriptive messages
- Charts include patterns and text labels

### Text Resizing

The interface supports text resizing up to 200% without loss of functionality:
- Relative units (rem, em) used throughout
- Flexible layouts adapt to larger text sizes
- No horizontal scrolling required at 200% zoom

### Focus Indicators

All interactive elements have visible focus indicators:
- 2px solid outline with 2px offset
- High contrast color (primary blue)
- Never removed or hidden

---

## Touch and Mobile Accessibility

### Touch Target Sizes

All interactive elements meet WCAG 2.2 Level AA requirements:
- **Minimum size:** 44x44 pixels
- **Recommended size:** 48x48 pixels or larger
- **Spacing:** Minimum 8px between targets

### Mobile Navigation

- Hamburger menu for small screens
- Touch-friendly dropdowns and modals
- Swipe gestures for carousels and drawers (with keyboard alternatives)

### Responsive Design

The interface adapts to different screen sizes:
- Mobile: 320px - 767px
- Tablet: 768px - 1023px
- Desktop: 1024px and above

---

## Forms and Inputs

### Form Accessibility

All forms follow accessibility best practices:

#### Labels
- Every input has an associated `<label>` element
- Labels are visible and positioned near their inputs
- Placeholder text is not used as the sole label

#### Error Handling
- Errors are announced with `role="alert"`
- Error messages are specific and actionable
- Errors are associated with inputs using `aria-describedby`
- Invalid inputs are marked with `aria-invalid="true"`

#### Required Fields
- Required fields are marked with `aria-required="true"`
- Visual indicators (asterisks) are provided
- Required status is announced to screen readers

#### Field Instructions
- Instructions are provided before form fields
- Complex fields include help text linked via `aria-describedby`

### Input Types

Appropriate input types are used for better mobile experience:
- `type="email"` for email addresses
- `type="tel"` for phone numbers
- `type="date"` for date pickers
- `type="search"` for search fields
- `type="number"` for numeric inputs

---

## Testing Accessibility

### Automated Testing

Run automated accessibility tests:

```bash
# Run all accessibility tests
pnpm --filter @teei/corp-cockpit-astro test:e2e tests/a11y

# Run Pa11y tests
pnpm --filter @teei/corp-cockpit-astro test:a11y

# Run ESLint accessibility rules
pnpm --filter @teei/corp-cockpit-astro lint

# Run Lighthouse audit
pnpm --filter @teei/corp-cockpit-astro lighthouse
```

### Manual Testing Checklist

#### Keyboard Navigation
- [ ] Can you reach all interactive elements with Tab key?
- [ ] Is the focus order logical and intuitive?
- [ ] Are focus indicators visible on all elements?
- [ ] Can you operate all controls with keyboard alone?
- [ ] Does Escape close modals and dropdowns?

#### Screen Reader
- [ ] Are page landmarks announced correctly?
- [ ] Are all images described or marked as decorative?
- [ ] Are form labels properly associated?
- [ ] Are error messages announced?
- [ ] Are dynamic content updates announced?

#### Visual
- [ ] Is text readable at 200% zoom?
- [ ] Does information work without color?
- [ ] Is contrast sufficient for all text?
- [ ] Are focus indicators visible?

#### Touch/Mobile
- [ ] Are touch targets at least 44x44 pixels?
- [ ] Does the interface work on small screens?
- [ ] Can you operate all features on mobile?

---

## Known Issues

We are actively working to resolve the following accessibility issues:

### In Progress
- **Charts and Visualizations:** Working on adding data tables as alternatives
- **PDF Export:** Improving PDF accessibility for screen readers
- **Video Content:** Adding captions to instructional videos

### Planned Improvements
- Enhanced keyboard shortcuts for power users
- Improved dark mode contrast
- Additional language support for screen readers

---

## Reporting Issues

If you encounter an accessibility barrier while using the TEEI Corporate Cockpit, please let us know:

### How to Report
1. **Email:** accessibility@teei-platform.com
2. **GitHub Issues:** [Create an issue](https://github.com/teei/csr-platform/issues/new?template=accessibility.md)
3. **In-app Feedback:** Use the feedback button in the footer

### What to Include
- **Description:** What problem did you encounter?
- **Location:** Which page or feature?
- **Assistive Technology:** Screen reader, browser, OS version
- **Steps to Reproduce:** How can we recreate the issue?
- **Impact:** How does this affect your use of the platform?

### Response Time
- Critical issues (blocking access): 24-48 hours
- High priority issues: 1 week
- Medium priority issues: 2-4 weeks
- Low priority issues: Next release cycle

---

## Developer Guidelines

### Best Practices

#### Semantic HTML
```html
<!-- Good -->
<button type="button">Click me</button>
<nav aria-label="Main navigation">...</nav>

<!-- Bad -->
<div onClick={handleClick}>Click me</div>
<div class="nav">...</div>
```

#### ARIA Labels
```html
<!-- Good -->
<button aria-label="Close modal">×</button>
<svg aria-hidden="true">...</svg>

<!-- Bad -->
<button>×</button>
<svg>...</svg>
```

#### Focus Management
```typescript
// Good
const Modal = ({ isOpen, onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus();
    }
  }, [isOpen]);

  return (
    <div role="dialog" aria-modal="true">
      <button ref={closeButtonRef} onClick={onClose}>Close</button>
    </div>
  );
};
```

#### Color Contrast
```css
/* Good - Meets WCAG AA */
.primary-button {
  background: #0066CC; /* Contrast: 7.5:1 */
  color: #FFFFFF;
}

/* Bad - Fails WCAG AA */
.primary-button {
  background: #8BC34A; /* Contrast: 2.3:1 */
  color: #FFFFFF;
}
```

### Testing Before Committing

```bash
# Run accessibility tests
pnpm test:a11y

# Run linting
pnpm lint

# Check in browser
npm run dev
# Then test with keyboard and screen reader
```

---

## Resources

### WCAG Guidelines
- [WCAG 2.2 Quick Reference](https://www.w3.org/WAI/WCAG22/quickref/)
- [Understanding WCAG 2.2](https://www.w3.org/WAI/WCAG22/Understanding/)
- [How to Meet WCAG 2.2](https://www.w3.org/WAI/WCAG22/quickref/)

### Testing Tools
- [axe DevTools Browser Extension](https://www.deque.com/axe/devtools/)
- [WAVE Browser Extension](https://wave.webaim.org/extension/)
- [Lighthouse in Chrome DevTools](https://developers.google.com/web/tools/lighthouse)
- [Pa11y Command Line Tool](https://pa11y.org/)

### Screen Readers
- [NVDA (Windows)](https://www.nvaccess.org/)
- [JAWS (Windows)](https://www.freedomscientific.com/products/software/jaws/)
- [VoiceOver (macOS/iOS)](https://www.apple.com/accessibility/voiceover/)

### Learning Resources
- [WebAIM Articles](https://webaim.org/articles/)
- [A11y Project Checklist](https://www.a11yproject.com/checklist/)
- [MDN Accessibility Docs](https://developer.mozilla.org/en-US/docs/Web/Accessibility)
- [Inclusive Components](https://inclusive-components.design/)

---

## Contact

For questions or feedback about accessibility:

- **Email:** accessibility@teei-platform.com
- **Documentation:** [docs/accessibility.md](./accessibility.md)
- **Accessibility Statement:** [/accessibility](/accessibility)

---

_This document is maintained by the TEEI Platform accessibility team and is reviewed quarterly._
