# TEEI Corporate Cockpit — Experience Blueprint Handoff

This document captures the design tokens, layout system, component specs, and interaction guidance for the refreshed cockpit experience so engineering, design, and QA can align on the Experience Blueprint implementation.

---

## 1. Design Tokens

| Token Group | Variable / Value | Notes |
|-------------|------------------|-------|
| **Palette** | `--color-primary: #00393f` | Teal scaffold (sidebar, buttons, chart strokes). |
| | `--color-primary-strong: #0a5961` | Used for KPI text and semantic series. |
| | `--color-accent: #BA8F5A` | Gold highlight (badges, separators, active states). |
| | `--color-background: #f8fafc` | Page canvas. |
| | `--color-surface: #ffffff` / `--color-surface-alt: #ecf1f4` | Cards & secondary panels. |
| | Text hierarchy: `--color-text-primary #0c2430`, secondary `#4a5b66`, tertiary `#94a0a8`. |
| **Layout** | Spacing scale: `8, 12, 16, 24, 32, 48 px` mapped to CSS vars (`--space-8`…`--space-48`). |
| | Card radius `--card-radius: 18px`; inline radius `12px`; pill radius `999px`. |
| | Sidebar widths: desktop `280px`, tablet rail `84px`, drawer `calc(100vw - 48px)` mobile. |
| | Topbar height `72px`, blur `18px`. |
| **Shadows** | Cards: `0 18px 40px rgba(0,57,63,0.08)`; hover `0 22px 60px rgba(0,57,63,0.14)`. |
| | Buttons hover: `0 6px 16px rgba(0,57,63,0.18)` with gold inset border. |
| **Motion** | CTA/elevations `180 ms ease-out`; card fades/slides `220 ms`; progress sweeps/keyframes `320 ms`. |
| **Typography** | Family `Inter`; headings letter spacing `0.08em`; line height `1.6`. Uppercase section headers use `text-xs`, tracking `0.3em`. |
| **Focus / Ring** | Focus ring color `#0a5961`; ring offset `#f8fafc`. Rating/control chips add inset `0 0 0 1px #00393f` on focus. |

Tokens live in `src/styles/global.css` for system-wide consumption.

---

## 2. Layout & Navigation Patterns

### Sidebar
- Component: `CockpitExperienceLayout`
- Vertical nav uses shadcn/ui styling with Lucide-inspired glyphs implemented via CSS masks.
- Active route adds a gold (`--color-accent`) indicator via border + background glow.
- Collapse behaviors:
  - ≥1280 px: full width (280px).
  - 1024–1279 px: icon rail (labels hidden, width 84px).
  - ≤1024 px: off-canvas drawer activated via hamburger; overlay closes on tap.

### Topbar
- Sticky translucent surface (white w/ blur) with slight drop shadow.
- Left: hamburger button, uppercase breadcrumb trail.
- Right: Command-style search pill, LanguageSwitcher, notification bell (badge), profile chip w/ status dot and caret.

### Dashboard Canvas
- Two-column grid: left (Actionable Items + Campaign Pipeline), right (AI Insights + Compliance Alerts).
- Micro KPI grid (4-up → 2-up → 1-up) above columns.
- Breakpoints:
  - ≥1280 px: 2 columns (1.3fr / 1fr).
  - 1024–1279 px: single column, KPI grid 2-up.
  - ≤640 px: stacked cards, topbar condenses (search hidden, profile collapses).

---

## 3. Component Specs

### KPI Card
- Padding 24px, uses `.kpi-card`.
- Shows label (uppercase micro text), value, delta, and sparkline.
- Sparkline uses inline SVG path with gold gradient fill fade.
- Loading state: `.skeleton` shimmer w/ card radius.

### Actionable Items
- `ActionableItems.tsx` uses pill CTAs + quick actions on hover.
- Priority chips map to scoring thresholds; colors:
  - High ≥70: `rgba(180,35,24,0.14)` + `#b42318`.
  - Medium 40–69: `rgba(186,143,90,0.16)` + `#ba8f5a`.
  - Low <40: `var(--color-muted)` + text secondary.
- Composite score block shows bracket color (excellent/strong/moderate/weak).
- Hover: background gradient overlay, quick action buttons fade in.
- Rating control inserted in row with tooltip copy (“9–10: must apply” etc.).

### Campaign Pipeline
- Four lanes (Draft, Active, Paused, Completed) defined inline in component; easy to swap with data provider later.
- Each card:
  - Dual progress bars (teal/gold) representing 0.67 / 0.33 weighting.
  - Sparkline mini-chart (SVG) for score delta.
  - Collaborator avatars rendered as initials.
  - "View Campaign" text button w/ gold hover.
- Stage panel uses surface alt background for contrast.

### AI Insights
- Cluster control chips referencing `programClusterWeights`. Active chip uses gold fill; others use teal stroke.
- Narrative column surfaces summary + callouts with mini accent bullets.
- Chart column shows stacked semantic/rule area polylines + threshold line.
- Component weights displayed as dashed cards for quick reference.

### Compliance Alerts
- Filter chips (All, Policy drift, etc.) toggled via `.filter-chip`.
- Sticky table header with uppercase labels; zebra striping using `rgba(0,57,63,0.03)`.
- Severity badge styles:
  - Warning: gold fill, dark text.
  - FYI: teal outline w/ white background.
- Provided `alerts-table-wrapper` for scrollable height w/ sticky header.

### Buttons & Forms
- `.btn` base ensures 44px min touch target.
- Primary: teal fill, gold border on hover, translateY(-2px), `var(--shadow-button-hover)`.
- Secondary: transparent w/ teal stroke; hover changes text to gold.
- Rating control uses `RatingControl.css`: inner glow focus, tooltip showing scoring rule, keyboard accessible.

### Skeleton / Empty / Error
- `.skeleton` gradient for KPI, `.actionable-skeleton` for list context.
- Empty state (Actionable) uses dashed outline + guidance copy.
- Buttons always visible; quick actions appear on hover.

---

## 4. Interaction & Motion

| Element | Behavior |
|---------|----------|
| CTAs / pills | 180 ms ease-out translateY(-2px) on hover/focus, apply gold border + button shadow. |
| Cards | 220 ms box-shadow + subtle translate. Hover overlays add gradient. |
| Pipeline / clusters | Buttons use scale/opacity transitions; area charts animate via CSS transitions when data changes (pending real-time data). |
| Tooltips | Appear after 120 ms, fade in, positioned via CSS in RatingControl. |
| Sidebar | Drawer toggles by adding `.sidebar-open` class (JS snippet inside layout). |

Accessibility:
- Focus styles rely on `focus-visible`; rating chips add teal ring + inner shadow.
- Keyboard order flows: sidebar → topbar controls → main content. Buttons and chips have accessible labels/status.
- Color contrast: teal/gold on white meets AA for text ≥16px; smaller text uses darker shade.

---

## 5. Data / Content Guidelines

| Module | Input expectations |
|--------|--------------------|
| Actionable Items | Score 0–100 for composite; strings for title/program/summary; optional owner cluster tags. |
| Campaign Pipeline | Each lane contains cards with `strategicFit`, `interpretiveFit`, `scoreDelta`, `collaborators`. We currently hardcode sample data; swap with API payload as soon as connectors ready. |
| AI Insights | `programClusterWeights`, `componentWeights`, `thresholds` (exposed via `scoringWeights`). Narrative strings can be replaced with Gemini output once available. |
| Compliance Alerts | Title, type, severity, owner, due date arrays. |
| KPI Grid | Accepts `label`, `value`, `trend`, and sparkline array. Sparkline generator clamps values to 0–100 for consistent rendering. |

Loading / error states remain simplified (single skeleton row). Expand as data API gets wired.

---

## 6. Next Steps / Hand-off Checklist

1. **Data integration** — replace stub arrays in `ActionableItems`, `CampaignPipeline`, `AIInsights`, `ComplianceAlerts` with selectors from the reporting/analytics services. Keep the same shape to minimize UI churn.
2. **Docs alignment** — share this file with design/PM; confirm color tokens in `global.css` line up with future exec pack requirements.
3. **Other Cockpit routes** — gradually migrate additional cockpit pages (`/benchmarks`, `/reports`, `/governance`, etc.) onto `CockpitExperienceLayout` to keep chrome consistent.
4. **QA** — ensure mobile drawer + command search + notification states meet a11y guidelines (focus trap, aria labels).  
5. **Figma sync** — design can reference the tokens and spec sections to finalize blueprint frames. Any updates should be mirrored in this doc + `global.css`.

Feel free to expand this document with screenshots or annotated diagrams as the system evolves. For now, it provides a canonical reference for tokens, layouts, components, and micro-interactions implemented in code.

