# Deck Types Quick Reference

## Import

```typescript
import {
  // Types
  DeckDefinition,
  DeckTemplate,
  SlideBlock,
  SlideBlockType,
  DeckTheme,
  DeckMetadata,
  GenerateDeckRequest,
  GenerateDeckResponse,
  ExportDeckRequest,
  ExportDeckResponse,

  // Validation helpers
  validateDeckDefinition,
  safeParseDeckDefinition,
  isValidTemplate,
  isValidSlideBlockType,
  validateSlideBlock,
  validateDeckTheme,
  validateGenerateDeckRequest,
  validateExportDeckRequest,
} from '@teei/shared-types';
```

## Templates

```typescript
type DeckTemplate =
  | 'quarterly'           // Q1-Q4 reports
  | 'annual'              // Yearly summaries
  | 'investor'            // Investor updates
  | 'impact-deep-dive';   // Detailed impact analysis
```

## Slide Types

```typescript
type SlideBlockType =
  | 'title'       // Title/cover slide
  | 'content'     // Text content
  | 'chart'       // Chart.js visualization
  | 'table'       // Data table
  | 'image'       // Image slide
  | 'two-column'; // Two-column layout
```

## Locales

```typescript
type Locale = 'en' | 'es' | 'fr' | 'uk' | 'no';
```

## Status Values

```typescript
type Status = 'draft' | 'review' | 'approved' | 'archived';
```

## Quick Examples

### Generate a Deck

```typescript
const request: GenerateDeckRequest = {
  companyId: 'uuid-here',
  template: 'quarterly',
  period: { start: '2024-01-01', end: '2024-03-31' },
  locale: 'en',
};

const response = await fetch('/api/decks/generate', {
  method: 'POST',
  body: JSON.stringify(validateGenerateDeckRequest(request)),
});
```

### Export to PPTX

```typescript
const request: ExportDeckRequest = {
  deckId: 'uuid-here',
  format: 'pptx',
  options: {
    quality: 'high',
    includeWatermark: true,
  },
};

const response = await fetch('/api/decks/export', {
  method: 'POST',
  body: JSON.stringify(validateExportDeckRequest(request)),
});
```

### Create a Slide

```typescript
// Title slide
const titleSlide: SlideBlock = {
  id: crypto.randomUUID(),
  type: 'title',
  title: 'Q1 2024 Impact Report',
  order: 0,
  citationIds: [],
};

// Chart slide
const chartSlide: SlideBlock = {
  id: crypto.randomUUID(),
  type: 'chart',
  title: 'SROI Trend',
  chartConfig: {
    type: 'line',
    data: { labels: ['Q1', 'Q2'], datasets: [...] },
  },
  order: 1,
  citationIds: ['citation-uuid'],
};
```

### Validate Data

```typescript
// Throw on error
try {
  const validDeck = validateDeckDefinition(data);
  // Use validDeck
} catch (error) {
  console.error('Invalid:', error);
}

// Safe parse (no throw)
const result = safeParseDeckDefinition(data);
if (result.success) {
  console.log('Valid:', result.data);
} else {
  console.error('Errors:', result.error.issues);
}

// Boolean checks
if (isValidTemplate('quarterly')) {
  // ...
}
```

## Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| "Invalid uuid" | Not a valid UUID format | Use `crypto.randomUUID()` or validate UUID |
| "Must be a valid hex color" | Color not in #RRGGBB format | Use hex format: `#1A73E8` |
| "Deck must have at least one slide" | Empty slides array | Add at least one slide |
| "Invalid enum value" | Invalid template/type/locale | Use valid enum values |
| "Number must be greater than or equal to 0" | Negative order/count | Use non-negative numbers |
| "Number must be less than or equal to 50" | maxSlides > 50 | Keep maxSlides ≤ 50 |

## Theme Colors

```typescript
const theme: DeckTheme = {
  primaryColor: '#1A73E8',    // Google Blue
  secondaryColor: '#34A853',  // Google Green
  accentColor: '#FBBC04',     // Google Yellow
  logoUrl: 'https://...',
  fontFamily: 'Inter',
};
```

## Generation Options

```typescript
options: {
  includeCharts: true,           // Include chart visualizations
  includeEvidence: true,         // Include citation evidence
  includeSpeakerNotes: false,    // Include speaker notes
  maxSlides: 20,                 // Max slides (5-50)
  tone: 'formal',                // formal | conversational | technical
}
```

## Export Options

```typescript
options: {
  includeWatermark: true,        // Add watermark
  includeEvidence: true,         // Include citations
  includeSpeakerNotes: false,    // Include notes
  quality: 'high',               // standard | high | print
}
```

## File Locations

- **Schema**: `/packages/shared-types/src/deck.ts`
- **Tests**: `/packages/shared-types/src/__tests__/deck.test.ts`
- **Examples**: `/packages/shared-types/DECK_USAGE_EXAMPLES.md`
- **Diagram**: `/packages/shared-types/DECK_SCHEMA_DIAGRAM.txt`

## Test Coverage

- **65 tests** passing
- **100% coverage** (lines, branches, functions, statements)
- Run: `npm test` or `pnpm test`
- Coverage: `npm run test:coverage`

## Need Help?

- See `DECK_USAGE_EXAMPLES.md` for detailed examples
- See `DECK_SCHEMA_SUMMARY.md` for implementation details
- See `DECK_SCHEMA_DIAGRAM.txt` for architecture overview
