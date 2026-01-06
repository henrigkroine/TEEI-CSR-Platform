# Deck Slides Components

Agent 2.4: Slide Component Developer - Component Documentation

## Overview

This module provides slide components with citation tracking, explainer panels, and preview cards for boardroom deck presentations. All components are designed with accessibility (WCAG 2.2 AA), dark mode support, and print optimization.

## Components

### 1. SlideWithCitations

Main slide component that displays content with citation tracking and optional explainer panels.

**File**: `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/SlideWithCitations.tsx`

**Props Interface**:
```typescript
interface SlideWithCitationsProps {
  title: string;                    // Slide heading
  content: string;                  // Markdown content with [citation:ID] markers
  citations: Array<{                // Evidence citations
    id: string;
    evidenceId: string;
    snippetText: string;
    source: string;
    confidence: number;             // 0-1 confidence score
  }>;
  showExplainer?: boolean;          // Show/hide explainer panel
  explainerText?: string;           // Explainer content
  minCitationsRequired?: number;    // Minimum citations (default: 1)
  onViewEvidence?: (citation: Citation) => void;  // Evidence click handler
}
```

**Features**:
- Citation count badge with validation (green/red indicator)
- Inline citation markers with tooltips
- Footer with all citations and confidence scores
- Optional explainer panel
- Color-coded confidence scores (green ≥80%, yellow ≥60%, orange <60%)
- Responsive design with container queries

**Usage**:
```tsx
<SlideWithCitations
  title="Volunteer Impact Summary"
  content="Our program showed great results [citation:ev-001]."
  citations={citationsArray}
  showExplainer={true}
  explainerText="This demonstrates our CSR commitment."
  minCitationsRequired={3}
/>
```

---

### 2. CitationBadge

Compact badge showing citation count with visual validation.

**File**: `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/CitationBadge.tsx`

**Props Interface**:
```typescript
interface CitationBadgeProps {
  count: number;                    // Number of citations
  minRequired?: number;             // Minimum required (default: 1)
}
```

**Features**:
- Green background when count ≥ minRequired
- Red background when count < minRequired
- Singular/plural "citation(s)" text
- Warning message for failed validation
- Success checkmark for passed validation
- Info icon and accessible labels

**Usage**:
```tsx
<CitationBadge count={5} minRequired={3} />
```

---

### 3. ExplainerPanel

Contextual explanation panel for slide sections.

**File**: `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/ExplainerPanel.tsx`

**Props Interface**:
```typescript
interface ExplainerPanelProps {
  title: string;                    // Panel heading
  explanation: string;              // Explanation text
  evidenceCount: number;            // Number of supporting evidence
  variant?: 'default' | 'compact';  // Size variant (default: 'default')
}
```

**Features**:
- Blue left border and background
- Play icon and list icon
- Evidence count display
- Default and compact variants
- Dark mode support
- Print-optimized styling

**Usage**:
```tsx
<ExplainerPanel
  title="Why this section?"
  explanation="This demonstrates our commitment to sustainability."
  evidenceCount={5}
  variant="default"
/>
```

---

### 4. SlidePreview

Thumbnail preview card for deck slides.

**File**: `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/SlidePreview.tsx`

**Props Interface**:
```typescript
interface SlidePreviewProps {
  slide: {
    id: string;
    slideNumber?: number;           // Optional slide number
    title: string;
    type: 'title' | 'content' | 'chart' | 'data-table' | 'two-column' | 'image';
    citationCount: number;
  };
  thumbnail?: string;               // Optional thumbnail URL
  onClick?: () => void;             // Click handler
  isSelected?: boolean;             // Selection state
}
```

**Slide Type Icons & Colors**:
- **title**: 📊 Purple background
- **content**: 📝 Blue background
- **chart**: 📈 Green background
- **data-table**: 📋 Orange background
- **two-column**: 📑 Teal background
- **image**: 🖼️ Pink background

**Features**:
- 16:9 aspect ratio thumbnail area
- Slide number badge
- Citation count badge
- Type-specific icons and colors
- Selection indicator (ring + checkmark)
- Hover effects (only when clickable)
- Keyboard navigation (Enter/Space)
- Lazy loading for images

**Usage**:
```tsx
<SlidePreview
  slide={{
    id: 'slide-1',
    slideNumber: 1,
    title: 'Volunteer Impact',
    type: 'content',
    citationCount: 5,
  }}
  thumbnail="https://example.com/thumb.jpg"
  onClick={() => handleSlideClick()}
  isSelected={true}
/>
```

---

## Styles

**File**: `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/styles/deck.css`

### Features

1. **Responsive Design**:
   - Container queries for adaptive text sizing
   - Mobile-friendly slide preview grid

2. **Animations**:
   - Badge appearance animation
   - Explainer panel slide-in
   - Smooth hover transitions
   - Respects `prefers-reduced-motion`

3. **Print Optimization**:
   - Page break controls
   - Simplified colors (no gradients)
   - Visible citations footer
   - Hidden interactive elements

4. **Accessibility**:
   - High contrast mode support
   - Custom scrollbar styling
   - Focus visible enhancements
   - Proper ARIA attributes

5. **Dark Mode**:
   - Dark scrollbar colors
   - Adjusted background colors
   - Maintained contrast ratios

### Usage

Import in your Astro layout or component:
```astro
---
import '../styles/deck.css';
---
```

---

## Tests

**Location**: `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/__tests__/`

### Test Coverage

All components have comprehensive test suites targeting ≥80% coverage:

1. **SlideWithCitations.test.tsx** (10,869 bytes)
   - Rendering tests
   - Citation display and validation
   - Confidence score color coding
   - Explainer panel visibility
   - Empty states
   - Accessibility checks
   - Edge cases

2. **CitationBadge.test.tsx** (6,966 bytes)
   - Rendering tests
   - Validation states (green/red)
   - Singular/plural text
   - Warning messages
   - Success indicators
   - Accessibility (role, aria-label)
   - Dark mode classes

3. **ExplainerPanel.test.tsx** (8,622 bytes)
   - Rendering tests
   - Evidence count display
   - Variant styles (default/compact)
   - Accessibility (role, headings)
   - Visual styling
   - Icon rendering

4. **SlidePreview.test.tsx** (13,784 bytes)
   - Rendering tests
   - Slide type icons and colors
   - Thumbnail vs placeholder
   - Selection state
   - Click and keyboard interaction
   - Accessibility (role, aria-label, tabindex)
   - Hover effects

### Running Tests

```bash
# Run all tests
pnpm --filter corp-cockpit-astro test

# Run with coverage
pnpm --filter corp-cockpit-astro test:coverage

# Run specific test file
pnpm --filter corp-cockpit-astro test SlideWithCitations.test.tsx
```

---

## Export Index

**File**: `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/index.ts`

All components and types are exported from a single index file:

```typescript
export { SlideWithCitations } from './SlideWithCitations';
export type { SlideWithCitationsProps } from './SlideWithCitations';

export { CitationBadge } from './CitationBadge';
export type { CitationBadgeProps } from './CitationBadge';

export { ExplainerPanel } from './ExplainerPanel';
export type { ExplainerPanelProps } from './ExplainerPanel';

export { SlidePreview } from './SlidePreview';
export type { SlidePreviewProps } from './SlidePreview';
```

**Usage**:
```tsx
import {
  SlideWithCitations,
  CitationBadge,
  ExplainerPanel,
  SlidePreview,
  type SlideWithCitationsProps,
} from '@/components/deck/slides';
```

---

## File Paths Summary

### Components
- `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/SlideWithCitations.tsx`
- `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/CitationBadge.tsx`
- `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/ExplainerPanel.tsx`
- `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/SlidePreview.tsx`
- `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/index.ts`

### Styles
- `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/styles/deck.css`

### Tests
- `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/__tests__/SlideWithCitations.test.tsx`
- `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/__tests__/CitationBadge.test.tsx`
- `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/__tests__/ExplainerPanel.test.tsx`
- `/home/user/TEEI-CSR-Platform/apps/corp-cockpit-astro/src/components/deck/slides/__tests__/SlidePreview.test.tsx`

---

## Integration Notes

### Dependencies

These components depend on:
- React (for component rendering)
- TailwindCSS (for styling)
- `@/types/reports` (Citation type)
- `@/components/reports/CitationTooltip` (renderWithCitations helper)

### Accessibility Compliance

✅ **WCAG 2.2 AA Requirements Met**:
- Semantic HTML (headings, roles)
- ARIA labels and live regions
- Keyboard navigation (Enter/Space)
- Focus visible indicators
- Minimum contrast ratios
- High contrast mode support
- Screen reader friendly

### Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- CSS Container Queries (with fallback)
- CSS Custom Properties (for theming)
- SVG icons (with aria-hidden)

### Print Support

- Page break controls
- Simplified colors
- Visible citations
- Hidden interactive elements
- Border-based styling

---

## Next Steps

1. **Integration**: Import slides into DeckComposer component
2. **Data Binding**: Connect to report generation API
3. **Export**: Add PPTX export functionality (Agent 2.6)
4. **Testing**: Run full E2E tests with real data
5. **Documentation**: Add Storybook stories for visual testing

---

**Created by**: Agent 2.4 (Slide Component Developer)
**Date**: 2025-11-17
**Branch**: `claude/trust-boardroom-implementation-014BFtRtck3mdq8vZoPjGkE8`
