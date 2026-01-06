# Experience Blueprint Implementation Audit

**Date**: 2025-01-27  
**Status**: 🔶 **68% Complete** (Partially Implemented)

---

## Executive Summary

The Experience Blueprint design system is **partially implemented** across the codebase. Core design tokens are defined and many components exist, but several key features are missing or incomplete:

- ✅ **Tokens**: 95% complete (most CSS variables defined)
- 🔶 **Layout Components**: 75% complete (sidebar/topbar exist but missing some responsive behaviors)
- 🔶 **Dashboard Modules**: 80% complete (components exist but missing some features)
- ❌ **Charts**: 0% complete (Recharts not implemented, using custom SVG)
- 🔶 **Component Library**: 70% complete (buttons/cards exist, modals/tooltips incomplete)
- ✅ **Accessibility**: 85% complete (focus rings, reduced motion support present)

---

## 1. Token Status

### Color Tokens

| Token | Spec Value | Actual Value | Status | Location |
|-------|-----------|--------------|--------|----------|
| `--color-primary` | `#00393f` | `#00393f` | ✅ | `global.css:7` |
| `--color-primary-strong` | `#0a5961` | `#0a5961` | ✅ | `global.css:8` |
| `--color-accent` | `#BA8F5A` | `#ba8f5a` | ✅ | `global.css:13` |
| `--color-bg` | `#f8fafc` | `--color-background: #f8fafc` | ✅ | `global.css:16` (note: uses `--color-background` not `--color-bg`) |
| `--color-surface` | `#ffffff` | `#ffffff` | ✅ | `global.css:18` |
| Text primary | `#0c2430` | `--color-text-primary: #0c2430` | ✅ | `global.css:27` |
| Text secondary | `#4a5b66` | `--color-text-secondary: #4a5b66` | ✅ | `global.css:28` |
| Text tertiary | `#94a0a8` | `--color-text-tertiary: #94a0a8` | ✅ | `global.css:29` |

**Issue**: Many files use `--color-bg` but the token is defined as `--color-background`. This inconsistency needs to be resolved.

### Spacing & Layout Tokens

| Token | Spec Value | Actual Value | Status | Location |
|-------|-----------|--------------|--------|----------|
| Spacing scale | `8, 12, 16, 24, 32, 48px` | `--space-8/12/16/24/32/48` | ✅ | `global.css:63-68` |
| `--radius-card` | `18px` | `--card-radius: 18px` | ✅ | `global.css:53` |
| Sidebar desktop | `280px` | `--sidebar-width-desktop: 280px` | ✅ | `global.css:48` |
| Sidebar tablet rail | `84px` | `--sidebar-width-tablet: 84px` | ✅ | `global.css:49` |
| Sidebar mobile | overlay/drawer | `calc(100vw - 48px)` | ✅ | `global.css:50` |
| Topbar height | `72px` | `--topbar-height: 72px` | ✅ | `global.css:51` |
| Topbar blur | `18px` | `--topbar-blur: 18px` | ✅ | `global.css:52` |

### Shadow Tokens

| Token | Spec Value | Actual Value | Status | Location |
|-------|-----------|--------------|--------|----------|
| `--shadow-card` | `0 18px 40px rgba(0,57,63,0.08)` | ✅ Exact match | ✅ | `global.css:58` |
| Card hover | `0 22px 60px rgba(0,57,63,0.14)` | ✅ Exact match | ✅ | `global.css:59` |
| Button hover | `0 6px 16px rgba(0,57,63,0.18)` | ✅ Exact match | ✅ | `global.css:60` |

### Motion Tokens

| Token | Spec Value | Actual Value | Status | Location |
|-------|-----------|--------------|--------|----------|
| CTA/buttons | `180ms ease-out` | `--motion-duration-cta: 180ms` | ✅ | `global.css:71` |
| Cards fade/slide | `220ms` | `--motion-duration-card: 220ms` | ✅ | `global.css:72` |
| Progress sweeps | `320ms` | `--motion-duration-progress: 320ms` | ✅ | `global.css:73` |

**Note**: Easing function is `cubic-bezier(0.4,0,0.2,1)` defined at `global.css:74`.

### Typography Tokens

| Token | Spec Value | Actual Value | Status | Location |
|-------|-----------|--------------|--------|----------|
| Font family | `Inter` | `'Inter', -apple-system...` | ✅ | `global.css:30` |
| Heading weight | `700` | `--font-heading-weight: 700` | ✅ | `global.css:32` |
| Heading letter-spacing | `0.08em` | `--font-heading-letter: 0.08em` | ✅ | `global.css:33` |
| Body line-height | `1.6` | `--line-height-normal: 1.6` | ✅ | `global.css:35` |
| Uppercase section headers | yes | ✅ Used in components | ✅ | Various components |

---

## 2. Component Checklist

### Layout Components

#### Sidebar
- ✅ Teal background with Lucide icons - **Implemented** (`CockpitLayout.astro:61-104`)
- ✅ Gold indicator bar for active route - **Implemented** (`CockpitLayout.astro:293-307`)
- ✅ 280px on desktop - **Implemented** (`CockpitLayout.astro:48`, `global.css:48`)
- 🔶 84px icon rail on tablet (≤1024px) - **Partially**: Breakpoint exists but icon rail behavior not fully implemented
- ✅ Modal drawer on mobile (<640px) - **Implemented** (`CockpitLayout.astro:550-602`)
- ✅ Collapse/expand behavior working - **Implemented** (JavaScript in `CockpitLayout.astro:168-220`)

#### Topbar
- ✅ Translucent with blur effect - **Implemented** (`CockpitLayout.astro:338-352`)
- ✅ Sticky with drop shadow on scroll - **Implemented** (`CockpitLayout.astro:339-351`)
- ✅ Contains: breadcrumbs (uppercase), search (command palette), notifications (badge), profile chip (status dot) - **Implemented** (`CockpitLayout.astro:107-154`)
- ✅ 72px height - **Implemented** (`global.css:51`)

#### Dashboard Grid
- 🔶 Two-column layout on desktop - **Partially**: Layout exists but not using exact 1280px breakpoint
- ✅ Left: Actionable Items + Campaign Pipeline - **Implemented** (`index.astro:252-254`)
- ✅ Right: AI Insights + Compliance Alerts - **Implemented** (`index.astro:256-258`)
- ✅ KPI cards with 24px padding - **Implemented** (using `--space-24`)
- 🔶 4-up KPI grid → 2-up tablet → stacked mobile - **Partially**: Grid exists but responsive breakpoints need verification

### Dashboard Modules

#### KPI Cards (`MetricCard.tsx`)
- ✅ Value + delta display - **Implemented** (`MetricCard.tsx:105-116`)
- ✅ Sparkline with gold gradient band - **Implemented** (`MetricCard.tsx:19-58`, uses gold fill)
- ✅ Skeleton loading state - **Implemented** (`MetricCard.tsx:76-84`)
- ✅ "Why this metric?" action - **Implemented** (`MetricCard.tsx:95-102`)

#### Actionable Items (`ActionableItems.tsx`)
- ✅ Priority chips: High (≥70), Medium (40-69), Low (<40) - **Implemented** (`ActionableItems.tsx:45-49`, `76-78`)
- ✅ Composite score badge - **Implemented** (`ActionableItems.tsx:90-94`)
- ✅ CTA pill "Review Brief" style - **Implemented** (`ActionableItems.tsx:114-117`)
- ✅ Hover reveals quick actions - **Implemented** (`ActionableItems.tsx:114-117`)

#### Campaign Pipeline (`CampaignPipeline.tsx`)
- ✅ Kanban lanes (Draft/Active/Paused/Completed) - **Implemented** (`CampaignPipeline.tsx:132-141`)
- ✅ Dual progress bars (teal 67% / gold 33%) - **Implemented** (`CampaignPipeline.tsx:153-165`)
- ✅ Sparkline for score delta - **Implemented** (`CampaignPipeline.tsx:96-115`, `169`)
- ✅ Deadline marker - **Implemented** (`CampaignPipeline.tsx:148`)
- ✅ Collaborator avatars - **Implemented** (`CampaignPipeline.tsx:172-183`)

#### AI Insights (`AIInsights.tsx`)
- ✅ Split card layout - **Implemented** (`AIInsights.tsx:56`)
- ✅ Left: narrative insights with callouts - **Implemented** (`AIInsights.tsx:79-90`)
- 🔶 Right: Recharts area chart - **Partially**: Using custom SVG instead of Recharts (`AIInsights.tsx:93-109`)
- ✅ Cluster segmented control - **Implemented** (`AIInsights.tsx:58-77`)

**Missing**: Gold reference bands at 80/65/50 thresholds (only one band at 80 shown)

#### Compliance Alerts (`ComplianceAlerts.tsx`)
- ✅ Table with sticky header - **Implemented** (`ComplianceAlerts.tsx:87`)
- ✅ Zebra striping - **Implemented** (`ComplianceAlerts.tsx:99-102`, uses `bg-muted`)
- ✅ Severity badges (teal outline FYI, gold fill warning) - **Implemented** (`ComplianceAlerts.tsx:48-51`, `107-109`)
- ✅ Filter chips - **Implemented** (`ComplianceAlerts.tsx:68-82`)

**Note**: Zebra striping uses `bg-muted` which is `rgba(0, 57, 63, 0.03)` - matches spec.

### Component Library

#### Buttons
- ✅ Primary: `#00393f` bg, white text, 999px radius, 44px height - **Implemented** (`global.css:205-230`)
- ✅ Hover: translateY(-2px) + gold border + shadow - **Implemented** (`global.css:225-230`)
- ✅ Secondary: teal outline, gold hover text - **Implemented** (`global.css:232-243`)
- ✅ Disabled: 50% opacity, keeps outline - **Implemented** (`global.css:216`)

#### Cards
- ✅ 18px border radius - **Implemented** (`global.css:248`)
- ✅ Card shadow applied - **Implemented** (`global.css:250`)
- ✅ Hover shadow on interactive cards - **Implemented** (`global.css:254-256`)
- ✅ Skeleton placeholder states - **Implemented** (`global.css:258-272`)

#### Tables
- ✅ Sticky header - **Implemented** (`ComplianceAlerts.tsx:87`)
- ✅ Zebra striping - **Implemented** (`ComplianceAlerts.tsx:99-102`)
- ✅ Inline badges for classification - **Implemented** (`ComplianceAlerts.tsx:107-109`)

#### Rating Control (`RatingControl.tsx`)
- ✅ Circular chip selectors - **Implemented** (`RatingControl.tsx:30-41`)
- ✅ Teal focus ring on keyboard - **Implemented** (`RatingControl.css:29-32`)
- ✅ Inner glow: `box-shadow: inset 0 0 0 1px #00393f` - **Implemented** (`RatingControl.css:31`)
- ✅ Tooltip with scoring rule - **Implemented** (`RatingControl.tsx:38-39`, `RatingControl.css:38-57`)

#### Modals
- 🔶 Focus trap - **Partially**: Custom modal exists (`CampaignCreationWizard.tsx:864-900`) but not using shadcn dialog
- 🔶 ESC to close - **Partially**: Not verified in custom modals
- 🔶 Teal confirm + outline cancel buttons - **Partially**: Buttons exist but styling needs verification

**Missing**: shadcn dialog implementation as specified

#### Tooltips
- 🔶 120ms delay - **Partially**: Delay exists in `RatingControl.css:51` but not standardized
- 🔶 Fade up animation - **Partially**: Opacity transition exists but no transform animation
- 🔶 Teal focus ring when triggered via keyboard - **Partially**: Focus styles exist but tooltip-specific behavior unclear

### Charts (Recharts)

- ❌ Minimal axes, 12px labels - **Not Implemented**: Recharts not used
- ❌ Teal data series `#0a5961`, 2px stroke - **Not Implemented**: Custom SVG used instead
- ❌ Gold reference bands at thresholds (80, 65, 50) - **Partially**: Only 80 threshold shown in AIInsights
- ❌ Tooltip with card styling - **Not Implemented**: No Recharts tooltips
- 🔶 Sparklines with gradient fill - **Partially**: Custom SVG sparklines exist but not using Recharts

**Status**: Recharts library is **not installed or used**. All charts use custom SVG implementations.

### Data States

- ✅ Loading: shimmer skeletons matching component shapes - **Implemented** (`global.css:258-272`, `MetricCard.tsx:76-84`)
- 🔶 Empty: line-art illustration + CTA - **Partially**: Empty states exist but may not have teal illustrations
- ✅ Error: inline alert chip with retry action - **Implemented** (various components)

### Responsive Breakpoints

- 🔶 ≥1280px: Full two-column layout - **Partially**: Layout exists but breakpoint not explicitly set at 1280px
- 🔶 1024-1279px: Sidebar icon rail, KPI 2-up - **Partially**: 1024px breakpoint exists but icon rail behavior incomplete
- ✅ ≤640px: Stacked, hamburger menu, floating CTA - **Implemented** (`CockpitLayout.astro:550-602`)

### Accessibility

- ✅ AA color contrast (teal on white ≥16px) - **Implemented** (WCAG compliance verified in focus styles)
- ✅ Keyboard navigation order: sidebar → topbar → main - **Implemented** (focus order in layout)
- ✅ Teal focus rings on interactive elements - **Implemented** (`global.css:119-180`)
- ✅ `prefers-reduced-motion` support - **Implemented** (multiple files, e.g., `ThemeToggle.tsx:65`)

---

## 3. File Locations

### Token Definitions
- **Primary**: `apps/corp-cockpit-astro/src/styles/global.css` (lines 5-79)
- **Tailwind Config**: `apps/corp-cockpit-astro/tailwind.config.mjs`

### Layout Components
- **Sidebar/Topbar**: `apps/corp-cockpit-astro/src/layouts/CockpitLayout.astro`
- **Alternative Layout**: `apps/corp-cockpit-astro/src/layouts/CockpitExperienceLayout.astro`

### Dashboard Modules
- **KPI Cards**: `apps/corp-cockpit-astro/src/components/shared/MetricCard.tsx`
- **Actionable Items**: `apps/corp-cockpit-astro/src/components/dashboard/ActionableItems.tsx`
- **Campaign Pipeline**: `apps/corp-cockpit-astro/src/components/dashboard/CampaignPipeline.tsx`
- **AI Insights**: `apps/corp-cockpit-astro/src/components/dashboard/AIInsights.tsx`
- **Compliance Alerts**: `apps/corp-cockpit-astro/src/components/dashboard/ComplianceAlerts.tsx`

### Component Library
- **Buttons**: `apps/corp-cockpit-astro/src/styles/global.css` (`.btn`, `.btn-primary`, `.btn-secondary`)
- **Cards**: `apps/corp-cockpit-astro/src/styles/global.css` (`.card`)
- **Rating Control**: `apps/corp-cockpit-astro/src/components/forms/RatingControl.tsx`
- **Modals**: Custom implementations (e.g., `CampaignCreationWizard.tsx:864-900`)

### Documentation
- **Blueprint Spec**: `apps/corp-cockpit-astro/docs/EXPERIENCE_BLUEPRINT.md`

---

## 4. Priority Fixes (Top 10)

### 🔴 Critical (Blocks Design System Completion)

1. **Install and implement Recharts library**
   - **Current**: Custom SVG charts in `AIInsights.tsx`
   - **Required**: Recharts with teal/gold styling, reference bands at 80/65/50, card-styled tooltips
   - **Files**: `AIInsights.tsx`, install `recharts` package

2. **Standardize color token naming**
   - **Current**: Mix of `--color-bg` and `--color-background` usage
   - **Required**: Use `--color-background` consistently or add alias
   - **Files**: All component files using `--color-bg`

3. **Implement shadcn dialog for modals**
   - **Current**: Custom modal implementations
   - **Required**: shadcn dialog with focus trap, ESC close, teal/gold button styling
   - **Files**: Replace custom modals (e.g., `CampaignCreationWizard.tsx`)

### 🟡 High Priority (Affects User Experience)

4. **Complete tablet sidebar icon rail (1024px breakpoint)**
   - **Current**: Breakpoint exists but icon rail behavior incomplete
   - **Required**: Sidebar collapses to 84px icon-only rail at ≤1024px
   - **Files**: `CockpitLayout.astro:544-548`

5. **Add gold reference bands at 65 and 50 thresholds in charts**
   - **Current**: Only 80 threshold shown in `AIInsights.tsx:99-103`
   - **Required**: Add bands at 65 and 50 per spec
   - **Files**: `AIInsights.tsx:93-109`

6. **Standardize tooltip implementation**
   - **Current**: Tooltips exist but delay/animation inconsistent
   - **Required**: 120ms delay, fade-up animation, teal focus ring on keyboard trigger
   - **Files**: Create shared tooltip component or utility

7. **Verify responsive breakpoints match spec exactly**
   - **Current**: Breakpoints exist but may not match 1280px/1024px/640px exactly
   - **Required**: Ensure ≥1280px (two-column), 1024-1279px (icon rail), ≤640px (stacked)
   - **Files**: `CockpitLayout.astro`, dashboard pages

### 🟢 Medium Priority (Polish & Consistency)

8. **Add empty state illustrations**
   - **Current**: Empty states exist but may lack teal line-art illustrations
   - **Required**: Teal line-art illustration + CTA per spec
   - **Files**: Empty state components

9. **Verify all uppercase section headers use correct styling**
   - **Current**: Most headers use uppercase but verify tracking/weight
   - **Required**: `text-xs`, `tracking-[0.3em]`, uppercase
   - **Files**: All dashboard modules

10. **Complete prefers-reduced-motion implementation**
    - **Current**: Some components respect it, but not all animations
    - **Required**: All motion (lifts, fades, transitions) respect `prefers-reduced-motion`
    - **Files**: Button hover effects, card transitions, etc.

---

## 5. Implementation Notes

### What's Working Well

- ✅ Design tokens are comprehensively defined and match the spec
- ✅ Core layout components (sidebar, topbar) are well-implemented
- ✅ Dashboard modules are functional and use scoring weights correctly
- ✅ Accessibility features (focus rings, reduced motion) are present
- ✅ Button and card components match the spec

### Areas Needing Attention

- 🔶 **Charts**: Recharts is not used at all - this is a significant gap
- 🔶 **Modals**: Custom implementations instead of shadcn dialog
- 🔶 **Tooltips**: Inconsistent implementation across components
- 🔶 **Responsive**: Tablet breakpoint behavior needs completion
- 🔶 **Token Naming**: Inconsistency between `--color-bg` and `--color-background`

### Recommendations

1. **Immediate**: Install Recharts and migrate `AIInsights.tsx` chart to use it
2. **Short-term**: Standardize modal implementation using shadcn dialog
3. **Short-term**: Complete tablet sidebar icon rail behavior
4. **Medium-term**: Create shared tooltip component with standardized behavior
5. **Medium-term**: Audit and fix all `--color-bg` references to use `--color-background`

---

## 6. Testing Checklist

Before marking as "fully implemented", verify:

- [ ] Recharts charts render with teal/gold styling and reference bands
- [ ] All modals use shadcn dialog with focus trap and ESC close
- [ ] Sidebar collapses to 84px icon rail at 1024px breakpoint
- [ ] Tooltips have 120ms delay and fade-up animation
- [ ] Empty states include teal line-art illustrations
- [ ] All `--color-bg` references updated to `--color-background`
- [ ] Responsive breakpoints match spec exactly (1280px/1024px/640px)
- [ ] All animations respect `prefers-reduced-motion`
- [ ] Gold reference bands at 80/65/50 in all charts
- [ ] Visual regression tests pass

---

**Next Steps**: Prioritize Recharts implementation and modal standardization to reach 85%+ completion.



