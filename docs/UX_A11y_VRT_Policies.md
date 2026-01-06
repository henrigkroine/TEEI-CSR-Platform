# UX, Accessibility & Visual Regression Testing Policies

**Version**: 1.0
**Last Updated**: 2025-11-15
**Phase**: F - Executive UX & Reporting Finish
**Compliance**: WCAG 2.2 Level AA/AAA

---

## Table of Contents

1. [Accessibility (A11y) Policy](#accessibility-policy)
2. [Visual Regression Testing (VRT) Policy](#visual-regression-testing-policy)
3. [UX Quality Standards](#ux-quality-standards)
4. [Testing Methodology](#testing-methodology)
5. [Quality Gates & CI Enforcement](#quality-gates--ci-enforcement)
6. [Roles & Responsibilities](#roles--responsibilities)

---

## Accessibility (A11y) Policy

### Compliance Standard

The Corporate Cockpit **must meet WCAG 2.2 Level AA** standards at minimum, with enhanced goals for AAA where feasible.

**Regulatory Compliance**:
- **ADA** (Americans with Disabilities Act)
- **Section 508** (US Federal Accessibility)
- **EN 301 549** (EU Accessibility Directive)
- **AODA** (Accessibility for Ontarians with Disabilities Act)

### WCAG 2.2 Level AA Requirements

#### Perceivable

1. **Text Alternatives** (1.1.1)
   - All images have descriptive `alt` text
   - Decorative images use `alt=""`
   - Charts have accessible data tables

2. **Captions & Alternatives** (1.2)
   - Video content has captions
   - Audio descriptions for complex visuals

3. **Adaptable Content** (1.3)
   - Semantic HTML (`<header>`, `<nav>`, `<main>`, `<footer>`)
   - Logical heading hierarchy (H1 → H2 → H3)
   - Form labels associated with inputs

4. **Distinguishable** (1.4)
   - **Color Contrast**: ≥4.5:1 for normal text, ≥3.0:1 for large text
   - **Resize Text**: Readable at 200% zoom
   - **Non-Text Contrast**: UI components ≥3.0:1
   - **Reflow**: No horizontal scrolling at 320px width

#### Operable

1. **Keyboard Accessible** (2.1)
   - All interactive elements focusable
   - No keyboard traps
   - Visible focus indicators
   - Skip to main content link

2. **Enough Time** (2.2)
   - Auto-cycling can be paused (Boardroom mode)
   - No time limits on critical tasks

3. **Seizures** (2.3)
   - No flashing content >3 times per second

4. **Navigable** (2.4)
   - Page titles descriptive
   - Breadcrumbs for deep navigation
   - Multiple ways to find content (nav, search, sitemap)

#### Understandable

1. **Readable** (3.1)
   - Language declared (`<html lang="en">`)
   - Complex terms have glossary

2. **Predictable** (3.2)
   - Navigation consistent across pages
   - No automatic context changes (e.g., form auto-submit)

3. **Input Assistance** (3.3)
   - Error messages clear and specific
   - Form validation with suggestions
   - Confirmation for destructive actions

#### Robust

1. **Compatible** (4.1)
   - Valid HTML5
   - ARIA attributes used correctly
   - Name, Role, Value for all UI components

### WCAG 2.2 AAA Enhanced Goals

**Target**: 72% of color pairs achieve AAA contrast (≥7.0:1)

**AAA Enhancements**:
- **Contrast**: ≥7.0:1 for critical text (achieved in dark mode)
- **Target Size**: ≥44×44px for all interactive elements
- **Focus Appearance**: High-contrast focus indicators (≥3px outline)

### Accessibility Testing Tools

#### Automated Testing

1. **axe-core** (via `@axe-core/playwright`)
   - Runs in E2E tests
   - Detects 30-50% of a11y issues
   - Used in CI quality gates

2. **Pa11y**
   - Standalone CLI tool
   - WCAG 2.2 validation
   - Used for manual audits

3. **Lighthouse** (Chrome DevTools)
   - Accessibility score (0-100)
   - Performance integration

#### Manual Testing

1. **Screen Readers**
   - **NVDA** (Windows) - Primary
   - **JAWS** (Windows) - Secondary
   - **VoiceOver** (macOS/iOS) - Apple ecosystem
   - **TalkBack** (Android) - Mobile

2. **Keyboard Navigation**
   - Tab order verification
   - Focus indicator visibility
   - No keyboard traps

3. **Browser Extensions**
   - axe DevTools
   - WAVE (WebAIM)
   - Color Contrast Analyzer

### Color Contrast Requirements

#### Light Mode

| Element | Min Ratio (AA) | Target Ratio (AAA) | Example |
|---------|----------------|---------------------|---------|
| Normal text | 4.5:1 | 7.0:1 | `#0F172A` on `#FFFFFF` = 16.3:1 ✅ |
| Large text | 3.0:1 | 4.5:1 | `#64748B` on `#FFFFFF` = 4.65:1 ✅ |
| UI components | 3.0:1 | N/A | `#3B82F6` on `#FFFFFF` = 4.52:1 ✅ |

#### Dark Mode

| Element | Min Ratio (AA) | Target Ratio (AAA) | Example |
|---------|----------------|---------------------|---------|
| Normal text | 4.5:1 | 7.0:1 | `#F1F5F9` on `#0F172A` = 16.3:1 ✅ |
| Large text | 3.0:1 | 4.5:1 | `#64748B` on `#0F172A` = 3.75:1 ✅ |
| UI components | 3.0:1 | N/A | `#60A5FA` on `#0F172A` = 7.02:1 ✅ |

**Validation**: Run `pnpm tsx scripts/validateDarkModeContrast.ts` to verify all color pairs.

### Keyboard Navigation Standards

#### Tab Order

1. Skip to main content link (first tab stop)
2. Logo/home link
3. Primary navigation
4. Secondary navigation
5. Main content
6. Footer

**Implementation**:
```html
<a href="#main-content" class="skip-link">Skip to main content</a>
<main id="main-content" tabindex="-1">
  <!-- Content -->
</main>
```

#### Focus Indicators

**Minimum Requirements**:
- **Outline**: ≥3px solid
- **Contrast**: ≥3.0:1 against background
- **Offset**: 2px from element edge

**Implementation**:
```css
:focus-visible {
  outline: 3px solid var(--color-accent);
  outline-offset: 2px;
}
```

#### Keyboard Shortcuts

| Context | Key | Action |
|---------|-----|--------|
| **Boardroom Mode** | Spacebar | Pause/resume auto-cycle |
| **Boardroom Mode** | Esc | Exit to main cockpit |
| **Boardroom Mode** | ←/→ | Previous/next widget |
| **Modals** | Esc | Close modal |
| **Theme Toggle** | Enter/Space | Activate toggle |

### ARIA Best Practices

#### Live Regions

**Use Cases**:
- SSE connection status changes
- Auto-cycle widget changes
- Form validation errors
- Loading states

**Implementation**:
```jsx
<div role="status" aria-live="polite" aria-atomic="true">
  {connectionStatus === 'connected' ? 'Live' : 'Offline'}
</div>
```

**Politeness Levels**:
- `aria-live="polite"` - Non-critical updates (default)
- `aria-live="assertive"` - Critical alerts (use sparingly)

#### ARIA Labels

**Required**:
- Icon-only buttons
- Visually hidden form labels
- Interactive images/SVGs

**Implementation**:
```jsx
<button aria-label="Toggle dark mode">
  <SunIcon aria-hidden="true" />
</button>
```

#### ARIA Roles

**Use Sparingly** - Semantic HTML preferred:
- `<nav>` instead of `<div role="navigation">`
- `<button>` instead of `<div role="button">`
- `<main>` instead of `<div role="main">`

**When ARIA Required**:
- Custom widgets (e.g., auto-complete, tree view)
- Dynamic content regions
- Application landmarks

---

## Visual Regression Testing (VRT) Policy

### Purpose

Visual Regression Testing detects unintended visual changes in the UI caused by code changes, ensuring pixel-perfect consistency.

### VRT Standards

#### Baseline Management

**Baseline Creation**:
```bash
pnpm test:visual:update
```

**Baseline Storage**:
- Location: `apps/corp-cockpit-astro/tests/e2e/__snapshots__/`
- Version control: Committed to Git
- Review: Manual review of baselines before commit

**Baseline Updates**:
- Only after design approval
- PR review required
- Document reason in commit message

#### Diff Thresholds

**Maximum Allowed Diff**: 0.3% pixel difference ratio

**Threshold Configuration**:
```typescript
// playwright.config.ts
expect.toHaveScreenshot({
  maxDiffPixelRatio: 0.003, // 0.3%
  maxDiffPixels: 100,
  threshold: 0.2,
});
```

**Diff Categories**:
- **0.0% - 0.1%**: Expected minor anti-aliasing differences
- **0.1% - 0.3%**: Acceptable (may require review)
- **>0.3%**: Fail (requires investigation)

#### Test Coverage

**Full-Page Snapshots**:
1. Dashboard (light + dark mode)
2. Reports (light + dark mode)
3. Evidence Explorer (light + dark mode)
4. Admin Panel (light + dark mode)
5. Boardroom Mode (light + dark mode)

**Component Snapshots**:
1. KPI Cards
2. Navigation (desktop + mobile)
3. Charts (all types)
4. Data Tables
5. Modals/Dialogs

**Theme Preset Snapshots**:
1. Corporate Blue (light + dark)
2. Healthcare Green (light + dark)
3. Finance Gold (light + dark)
4. Modern Neutral (light + dark)
5. Community Purple (light + dark)

**Responsive Snapshots**:
1. Desktop (1920×1080)
2. Laptop (1366×768)
3. Tablet (768×1024)
4. Mobile (375×667)

#### Snapshot Naming Convention

```
{route}-{mode}-{preset}-{breakpoint}.png
```

**Examples**:
- `dashboard-light-corporate-blue-desktop.png`
- `reports-dark-healthcare-green-tablet.png`
- `boardroom-light-modern-neutral-tv.png`

### VRT Workflow

#### PR Submission

1. Developer makes UI changes
2. Run `pnpm test:visual` locally
3. Review diffs in Playwright UI
4. Update baselines if intentional: `pnpm test:visual:update`
5. Commit updated baselines with PR
6. CI runs VRT on PR

#### CI Validation

1. CI runs `pnpm test:visual`
2. Compares screenshots to committed baselines
3. Uploads diff images as artifacts
4. Adds PR comment with results
5. PR blocked if diff >0.3%

#### Diff Review Process

**When CI VRT Fails**:

1. **Download Diff Artifacts**:
   - Go to Actions → VRT job → Artifacts
   - Download `playwright-report.zip`

2. **Review Diffs**:
   - Open `index.html` in Playwright report
   - View side-by-side comparison
   - Check diff percentage

3. **Determine Action**:
   - **Expected change**: Update baselines, document in PR
   - **Unexpected change**: Fix code, re-run VRT
   - **Close to threshold**: Investigate anti-aliasing, fonts, etc.

### VRT Tools

**Playwright Screenshots**:
```typescript
await page.screenshot({
  fullPage: true,
  animations: 'disabled',
  caret: 'hide',
});

await expect(page).toHaveScreenshot('dashboard-light.png', {
  maxDiffPixelRatio: 0.003,
});
```

**Diff Viewing**:
- Playwright HTML report
- GitHub Actions artifacts
- Local Playwright UI: `pnpm exec playwright show-report`

---

## UX Quality Standards

### Interaction Design

#### Loading States

**Skeleton Screens**:
- Use for data-heavy pages (>1s load)
- Match layout of loaded content
- Animate with shimmer effect

**Spinners**:
- Use for quick actions (<1s load)
- Contextual placement (button, modal)
- Disable interaction during loading

**Progress Indicators**:
- Use for long tasks (>5s load)
- Show percentage or steps
- Allow cancellation if possible

#### Empty States

**Components**:
1. Icon (illustrative)
2. Heading ("No data yet")
3. Description ("Get started by...")
4. Call-to-action button

**Example**:
```jsx
<EmptyState
  icon={<DatabaseIcon />}
  title="No reports yet"
  description="Create your first quarterly report to get started."
  action={<Button>Create Report</Button>}
/>
```

#### Error States

**Components**:
1. Icon (warning/error)
2. Error message (user-friendly)
3. Technical details (collapsible)
4. Recovery action (retry, contact support)

**Example**:
```jsx
<ErrorState
  title="Failed to load dashboard"
  message="We couldn't connect to the server. Please check your network connection."
  action={<Button onClick={retry}>Try Again</Button>}
/>
```

### Typography

**Hierarchy**:
```css
/* Headlines */
.h1 { font-size: 2.5rem; font-weight: 700; } /* 40px */
.h2 { font-size: 2rem; font-weight: 600; }   /* 32px */
.h3 { font-size: 1.5rem; font-weight: 600; } /* 24px */
.h4 { font-size: 1.25rem; font-weight: 600; }/* 20px */

/* Body */
.body-large { font-size: 1.125rem; }  /* 18px */
.body { font-size: 1rem; }            /* 16px */
.body-small { font-size: 0.875rem; }  /* 14px */
.caption { font-size: 0.75rem; }      /* 12px */
```

**Line Height**:
- Headlines: 1.2
- Body: 1.5
- Captions: 1.4

**Font Weights**:
- Regular: 400
- Medium: 500 (reserved for CTAs)
- Semibold: 600 (headings)
- Bold: 700 (emphasis)

### Spacing

**8px Grid System**:
```css
/* Spacing scale */
--space-1: 0.5rem;  /* 8px */
--space-2: 1rem;    /* 16px */
--space-3: 1.5rem;  /* 24px */
--space-4: 2rem;    /* 32px */
--space-5: 2.5rem;  /* 40px */
--space-6: 3rem;    /* 48px */
--space-8: 4rem;    /* 64px */
```

**Component Spacing**:
- Card padding: `--space-4` (32px)
- Section gaps: `--space-6` (48px)
- Button padding: `--space-2` horizontal, `--space-1` vertical
- Form field gap: `--space-3` (24px)

### Animation & Motion

**Duration**:
```css
--duration-fast: 150ms;   /* Hover, focus */
--duration-base: 300ms;   /* Default transitions */
--duration-slow: 500ms;   /* Large UI changes */
```

**Easing**:
```css
--ease-in-out: cubic-bezier(0.4, 0.0, 0.2, 1);
--ease-out: cubic-bezier(0.0, 0.0, 0.2, 1);
--ease-in: cubic-bezier(0.4, 0.0, 1, 1);
```

**Reduced Motion**:
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

---

## Testing Methodology

### Automated A11y Testing

**E2E Tests with axe-core**:
```typescript
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test('dashboard has no a11y violations', async ({ page }) => {
  await page.goto('/en/cockpit/test/dashboard');

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

**CI Integration**:
```yaml
# .github/workflows/quality-gates.yml
- name: Run A11y Tests
  run: pnpm exec playwright test a11y-phase-f

- name: Upload A11y Report
  uses: actions/upload-artifact@v3
  with:
    name: a11y-report
    path: playwright-report/
```

### Manual A11y Testing

**Screen Reader Testing Matrix**:

| Route | NVDA | JAWS | VoiceOver | TalkBack |
|-------|------|------|-----------|----------|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Reports | ✅ | ✅ | ✅ | ✅ |
| Boardroom | ✅ | ✅ | ✅ | ❌ |
| Share Link | ✅ | ✅ | ✅ | ✅ |

**Keyboard Testing Checklist**:
- [ ] Tab order logical
- [ ] All interactive elements reachable
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] Shortcuts documented
- [ ] Modal focus management
- [ ] Skip to main content works

### Visual Regression Testing

**Running VRT**:
```bash
# Generate baselines (first time)
pnpm test:visual:update

# Run VRT (compare to baselines)
pnpm test:visual

# View report
pnpm exec playwright show-report
```

**VRT in CI**:
```yaml
- name: Run VRT
  run: pnpm test:visual

- name: Upload Diff Images
  if: failure()
  uses: actions/upload-artifact@v3
  with:
    name: vrt-diffs
    path: test-results/
```

---

## Quality Gates & CI Enforcement

### Gate 1: Build & TypeScript (Blocking)

**Requirements**:
- `pnpm build` succeeds
- `pnpm typecheck` passes (0 errors)
- `pnpm lint` passes (0 errors)

**Status**: ✅ Enforced (PR blocked on failure)

### Gate 2: Unit Tests (Blocking)

**Requirements**:
- All unit tests pass
- Coverage ≥80% for `lib/`, `utils/`, `api/`

**Status**: ✅ Enforced (PR blocked on failure)

### Gate 3: Visual Regression ≤0.3% (Soft Fail)

**Requirements**:
- VRT diff ≤0.3% pixel difference ratio
- No major layout shifts

**Status**: ⚠️ Soft fail (warning only, not blocking)

**Next Steps**:
- Review diffs manually
- Update baselines if intentional
- Harden to blocking after Phase F stabilization

### Gate 4: Accessibility (0 critical/serious) (Soft Fail)

**Requirements**:
- 0 critical violations
- 0 serious violations
- ≤5 moderate violations (allowed)

**Status**: ⚠️ Soft fail (warning only, not blocking)

**Next Steps**:
- Fix all critical/serious violations
- Harden to blocking after Phase F stabilization

### Gate 5: E2E Tests (Blocking)

**Requirements**:
- All E2E tests pass
- Coverage ≥60% of routes

**Status**: ✅ Enforced (PR blocked on failure)

### Gate 6: Performance Budgets (Advisory)

**Requirements**:
- LCP ≤2.5s
- INP ≤200ms
- CLS ≤0.1
- Performance score ≥90

**Status**: 📊 Advisory (not blocking, metrics tracked)

---

## Roles & Responsibilities

### Development Team

**Responsibilities**:
- Write accessible HTML
- Use semantic elements
- Add ARIA labels where needed
- Test keyboard navigation
- Run automated a11y tests locally
- Update VRT baselines when UI changes

**Before PR Submission**:
```bash
# Checklist
pnpm typecheck  # ✅ Pass
pnpm lint       # ✅ Pass
pnpm test       # ✅ Pass
pnpm test:visual # ✅ Review diffs
pnpm exec playwright test a11y-phase-f # ✅ 0 violations
```

### QA Team

**Responsibilities**:
- Manual screen reader testing
- Keyboard navigation testing
- Cross-browser a11y testing
- VRT baseline review
- Document a11y issues

**Testing Matrix**:
- Browsers: Chrome, Firefox, Safari, Edge
- Screen readers: NVDA, JAWS, VoiceOver
- Devices: Desktop, tablet, mobile

### Design Team

**Responsibilities**:
- Design with a11y in mind (contrast, sizing)
- Review VRT baselines
- Approve UI changes
- Create accessible mockups

**Deliverables**:
- High-fidelity mockups with contrast ratios documented
- Interactive prototypes with focus states
- Color palette with WCAG compliance labels

### Product Team

**Responsibilities**:
- Prioritize a11y features
- Define UX requirements
- Accept/reject VRT baseline updates

**Decision Authority**:
- Approve major UI changes
- Accept VRT diff >0.3% with justification
- Prioritize a11y remediation

---

## Continuous Improvement

### Quarterly A11y Audit

**Scope**:
- Automated scan (axe-core)
- Manual screen reader testing
- Keyboard navigation review
- Color contrast validation

**Deliverable**: A11y Audit Report with remediation plan

### Annual VRT Baseline Refresh

**Trigger**: Major design system update

**Process**:
1. Design team approves new baselines
2. QA reviews all diffs
3. Update baselines in Git
4. Document changes in release notes

---

## References

- **WCAG 2.2**: https://www.w3.org/WAI/WCAG22/quickref/
- **axe-core**: https://www.deque.com/axe/
- **Playwright**: https://playwright.dev/
- **ARIA Authoring Practices**: https://www.w3.org/WAI/ARIA/apg/

---

**Document Version**: 1.0
**Last Updated**: 2025-11-15
**Authors**: Worker 3 Tech Lead (Phase F QA/A11y Lead)
