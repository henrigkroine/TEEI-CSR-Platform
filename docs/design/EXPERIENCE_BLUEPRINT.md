# Experience Blueprint Design System – Full Overview

> **📚 Platform Context:** Before diving into design details, read [`/docs/TEEI_PLATFORM_OVERVIEW.md`](../../../docs/TEEI_PLATFORM_OVERVIEW.md) to understand what TEEI is, its programs, and what the CSR Platform does. This provides essential context for all design decisions.

The Experience Blueprint keeps the cockpit aligned with our premium CSR management experience: teal scaffolding, gold highlights, evidence-first storytelling, and executive polish. Treat this file as immutable truth—no new surface ships until it satisfies every section below.

---

## Table of Contents

- [Experience Blueprint Design System – Full Overview](#experience-blueprint-design-system--full-overview)
  - [Table of Contents](#table-of-contents)
    - [1. Design Pillars \& Voice](#1-design-pillars--voice)
    - [2. Token Catalog](#2-token-catalog)
    - [3. Layout \& Navigation Guidelines](#3-layout--navigation-guidelines)
    - [4. Dashboard Modules](#4-dashboard-modules)
    - [5. Component \& Interaction Library](#5-component--interaction-library)
    - [6. Data Viz Tokens](#6-data-viz-tokens)
    - [7. Functional Flows \& Data States](#7-functional-flows--data-states)
    - [8. Accessibility \& Responsiveness](#8-accessibility--responsiveness)
    - [9. Implementation Checklist](#9-implementation-checklist)

---

### 1. Design Pillars & Voice

| Pillar | What it means in the UI | Implementation touchpoints |
| --- | --- | --- |
| Evidence-first | KPIs, briefs, and AI insights always link back to lineage and scoring thresholds. No decorative numbers. | `src/components/dashboard/*`, `src/data/scoringWeights.ts`, Lineage drawers. |
| Executive cadence | Uppercase breadcrumbs, generous line height, calm typography, subtle motion (180–320 ms). | `CockpitLayout.astro`, `global.css` motion tokens. |
| Teal scaffold & gold accents | Teal (#00393f) rails/headers/CTAs with gold (#BA8F5A) highlights on chips, separators, tooltips. | `global.css` tokens, Tailwind aliases, `themes.ts`. |
| Responsive control room | Sidebar widths 280 px → 84 px → overlay; dashboard collapses gracefully; tablets still show 2-up KPIs. | `CockpitLayout.astro`, dashboard pages. |
| Accessibility by default | WCAG AA contrast, keyboard roving, focus rings, reduced-motion support. | `global.css` focus styles, `theme` scripts, shadcn components. |

Tone: crisp, confident, data-backed. Microcopy favors outcomes (“Approve brief”, “Assign owner”) over marketing fluff. Motion is purposeful (lifts/fades) instead of ornamental.

---

### 2. Token Catalog

All tokens live in [`apps/corp-cockpit-astro/src/styles/global.css`](../src/styles/global.css) and are mirrored in Tailwind via [`tailwind.config.mjs`](../tailwind.config.mjs). When you add utilities (`text-text-secondary`, `shadow-card`, etc.), map them back to these variables.

| Category | Values | Usage |
| --- | --- | --- |
| Colors | `--color-primary #00393f`, `--color-primary-strong #0a5961`, `--color-accent #BA8F5A`, `--color-background #f8fafc`, `--color-surface #ffffff`, text stack `#0c2430 / #4a5b66 / #94a0a8`. | Teal for scaffolding + CTAs, gold for highlights/severity. |
| Typography | `--font-heading 'Inter', 700, letter-spacing 0.08em`, `--line-height-normal 1.6`. | Uppercase section headers, generous line height for executive tone. |
| Spacing / Layout | `--space-8/12/16/24/32/48`, `--card-radius 18px`, `--sidebar-width-desktop 280px`, tablet 84 px rail, mobile overlay `calc(100vw - 48px)`. | No ad-hoc padding—pick from the scale. |
| Shadows & Elevation | Cards `0 18px 40px rgba(0,57,63,0.08)`, hover `0 22px 60px rgba(0,57,63,0.14)`, buttons `0 6px 16px rgba(0,57,63,0.18)`. | Combine with gold inset border for CTA hover states. |
| Motion | `--motion-duration-cta 180ms`, `--motion-duration-card 220ms`, `--motion-duration-progress 320ms`, `--motion-ease cubic-bezier(0.4,0,0.2,1)`. | Respect `prefers-reduced-motion`; never invent custom durations. |

Dark mode uses the same structure but inherits the same relationships (teal/gold → luminous variants). `themes.ts` ensures tenant overrides respect this baseline.

---

### 3. Layout & Navigation Guidelines

1. **Sidebar (Lucide nav built on shadcn primitives)**
   - Default width 280 px. Collapse to icon rail (84 px) ≤1024 px; convert to modal drawer ≤640 px.
   - Active route shows gold indicator bar, icon/label weight shift, tinted background.
   - Footer call-to-action (“Trigger AI Writer”) uses teal pill button.

2. **Topbar**
   - Translucent teal-on-white strip with sticky drop shadow + backdrop blur (`--topbar-blur` = 18 px).
   - Contents: hamburger (mobile only), uppercase breadcrumb trail, command palette search (`⌘K`), notification bell with badge, theme toggle, profile chip with status dot.

3. **Dashboard grid**
   - ≥1280 px: Actionable Items + Campaign Pipeline (left), AI Insights + Compliance Alerts (right). KPI cards above as 4-up micro-grid (24 px padding).
   - 1024–1279 px: sidebar collapses, KPI grid becomes 2-up, modules stack two-per-row.
   - ≤640 px: cards stack vertically, topbar condenses to hamburger + floating CTA.

4. **Routing / Shell**
   - `src/layouts/CockpitLayout.astro` must wrap every cockpit page to guarantee consistent shell behavior (sidebar, topbar, overlay states, focus order).

---

### 4. Dashboard Modules

Use [`src/data/scoringWeights.ts`](../src/data/scoringWeights.ts) for composite weights, thresholds, cluster weights, and helper functions. Never duplicate threshold logic inline.

1. **Actionable Items (`src/components/dashboard/ActionableItems.tsx`)**
   - Card stack referencing `getPriority` + `classifyScore`. Chips show High ≥70 (gold fill), Medium 40–69 (gold tint), Low <40 (muted teal outline).
   - Tile contents: campaign title, cluster, owner, due badge, composite score + textual classification ("Excellent/Strong/Moderate/Weak"), summary, CTA pill "Review Campaign". Hover reveals quick actions ("Assign", "Open Writer").

2. **Campaign Pipeline (`src/components/dashboard/CampaignPipeline.tsx`)**
   - Lanes: Draft → Active → Paused → Completed. Each card displays dual bars (strategic 67% teal, interpretive 33% gold), score sparkline, collaborator avatars, due badge, "View Campaign" link.
   - Lane headers show card counts; cards use card radius + `shadow-card`.

3. **AI Insights (`src/components/dashboard/AIInsights.tsx`)**
   - Segmented control tied to `programClusterWeights`. Left column = Gemini narrative summary + bullet callouts. Right column = Recharts comparison (semantic vs rule contributions) with gold reference bands at 80/65/50.

4. **Compliance Alerts (`src/components/dashboard/ComplianceAlerts.tsx`)**
   - Table w/ sticky header, zebra striping `rgba(0,57,63,0.03)`, severity badges (teal outline FYI, gold fill warning). Filter chips for “Policy drift”, “Missing documents”, “Deadline risk”.

5. **KPI Cards (`src/components/shared/MetricCard.tsx`)**
   - Badge, subtitle, value, delta (green/red), target label, sparkline with gold gradient threshold band, skeleton loading state. “Why this metric?” button opens lineage drawer.

Wire these modules to live APIs once available—placeholder arrays are temporary. Respect scoring helper outputs when rendering chips or classification labels.

---

### 5. Component & Interaction Library

- **Buttons**: Primary teal fill, pill radius, gold border + lift on hover. Secondary outline teal; hover flips text to gold. Disabled state retains outline w/ 50% opacity.
- **Forms / Wizards**: Multi-step cards w/ teal track + gold active dot. Inputs include helper text (“X-API-Key must be masked”). Support tooltips for policy reminders.
- **Tables**: shadcn table primitives, sticky headers, zebra rows. Inline badges show composite classification + cluster weights.
- **Rating Control**: Circular chips, teal focus glow, tooltip describing scoring (“9–10: must apply”). Add `box-shadow: inset 0 0 0 1px #00393f` on focus-visible.
- **Cards & Skeletons**: Use `--card-radius`, `shadow-card`, `.skeleton` gradient for loading states (cards, rows, charts).
- **Modals & Notifications**: shadcn dialog w/ focus trap and ESC close. Notification bell reveals timeline items with infinite scroll + skeletons.
- **Tooltips & Motion**: 120 ms delay, fade up, teal focus ring when triggered via keyboard.

Document new patterns here before shipping them. Include code references when appropriate.

---

### 6. Data Viz Tokens

- Recharts: minimal axes, 12 px labels, teal stroke `#0a5961`, gold reference bands at thresholds (80/65/50). Tooltips reuse card styling and list component contributions.
- Sparklines: Spline line with gradient fill fading to transparent gold accent.
- Composite bars: 67% teal / 33% desaturated gold segments with textual classification (“Strategic Fit 74 — Strong”). Use `scoringWeights` to determine thresholds.

All visualizations must degrade gracefully (skeletons → empty states → error chips).

---

### 7. Functional Flows & Data States

1. **Action Modals**: shadcn dialog, title + checklist + signature block. Primary teal confirm, secondary outline cancel.
2. **Notifications**: Bell menu surfaces timeline events with icon, title, timestamp, CTA. Infinite scroll + skeleton placeholders.
3. **Data Fetch States**:
   - Loading: shimmer skeleton matching the component footprint.
   - Empty: line-art teal illustration + CTA (“Trigger AI Writer”). No dead ends.
   - Error: inline alert chip w/ next steps (“Retry”, “Check API key”). Keep focusable.
4. **Rating Control**: incorporate tooltips for scoring rules and inset glow on focus to satisfy keyboard accessibility.

---

### 8. Accessibility & Responsiveness

- Contrast: teal on white and gold on teal meet WCAG AA for ≥16 px text.
- Focus order: sidebar → topbar → main modules → floating CTAs. Ensure chips/buttons have visible teal focus rings.
- Breakpoints:
  - ≥1280 px: two-column dashboard, sidebar 280 px.
  - 1024–1279 px: sidebar collapses to 84 px icon rail, KPI grid 2-up.
  - ≤640 px: stacked cards, modal drawer nav, floating CTA.
- Motion: respect `prefers-reduced-motion`; skip lifts/fades when disabled.
- Screen reader support: breadcrumbs announce full trail, command search has `role="search"`, notification badge uses `aria-label` (“3 unread alerts”).

---

### 9. Implementation Checklist

1. ✅ Token + component primitives updated (`apps/corp-cockpit-astro/src/styles/global.css`, `tailwind.config.mjs`, `src/styles/themes.ts`).
2. ☐ Shell components (`src/layouts/CockpitLayout.astro`, sidebar/topbar) must consume the new layout tokens (widths, shadows, focus states). Ensure mobile drawer behavior matches spec.
3. ☐ Dashboard modules (`src/components/dashboard/*.tsx`) should import `scoringWeights` and render chips/bars/sparklines using live data once APIs land.
4. ☐ Charts (Recharts + sparklines) need teal/gold styling with reference bands and tooltips matching card tokens.
5. ☐ Forms, tables, rating control, and notifications should apply the focus/glow/tooltip guidance above.
6. ☐ Re-run visual/E2E baselines after styling changes to guarantee premium parity (`pnpm --filter @teei/corp-cockpit-astro test:visual`).

Use this document alongside the blueprint spec, Figma frames, and code comments to keep the cockpit unmistakably premium. If you're adding a new module or component, update this file before merging to maintain the single source of truth.
