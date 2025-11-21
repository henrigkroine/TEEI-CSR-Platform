# Deck Composer Module

The Deck Composer module provides a comprehensive UI for creating boardroom presentation decks from dashboard data.

## Components

### DeckComposer

Main orchestrator component that manages the deck creation workflow.

**Features:**
- 3-step wizard: Template → Content → Preview
- Step navigation with progress indicator
- Real-time configuration preview
- Export with loading states

**Props:**
- `companyId`: Company identifier
- `periodStart`: Report period start date
- `periodEnd`: Report period end date
- `logoUrl`: Optional company logo URL
- `primaryColor`: Optional primary brand color
- `onExport`: Async callback for export (receives DeckConfig)
- `onClose`: Optional callback when composer is closed

### DeckTemplateSelector

Template selection component with visual previews.

**Features:**
- Radio group with 4 templates:
  - Quarterly Report (8-10 slides)
  - Annual Report (15-20 slides)
  - Investor Update (6-8 slides)
  - Impact Deep Dive (12-15 slides)
- Visual cards with icons and descriptions
- Hover state with audience information
- Accessible ARIA attributes

### DeckTilePicker

Multi-select tile picker with drag-to-reorder.

**Features:**
- Checkbox list of 8 tile types
- Drag-and-drop reordering of selected tiles
- Max 8 tiles per deck enforcement
- Tiles grouped by category (Metrics, Charts, Achievements)
- Visual feedback for max limit reached

### DeckPreview

Preview component showing deck statistics and slide order.

**Features:**
- Deck statistics (slides, citations, pages)
- Theme preview with color palette
- Slide order list with types and icons
- Estimated citation counts per slide
- Locale and theme display

### DeckComposerModal

Modal wrapper for DeckComposer.

**Features:**
- Overlay with backdrop blur
- Keyboard support (Escape to close)
- Click outside to close
- Body scroll prevention
- Smooth animations

### CreateDeckButton

Floating action button for opening deck composer.

**Features:**
- Fixed position FAB with pulse indicator
- Opens DeckComposerModal on click
- Handles PPTX export API call
- Auto-downloads generated file

## Types

### DeckConfig

Configuration object passed to export callback:

```typescript
interface DeckConfig {
  template: 'quarterly' | 'annual' | 'investor' | 'impact';
  tiles: DeckTile[];
  locale: 'en' | 'fr' | 'es' | 'uk' | 'no';
  companyId: string;
  periodStart: Date;
  periodEnd: Date;
  includeWatermark?: boolean;
  watermarkText?: string;
  theme?: 'default' | 'corporate' | 'minimalist';
}
```

### DeckTile

Available tile types:
- `sroi-metric`: SROI key metric card
- `vis-trend`: VIS trend chart
- `evidence-density`: Evidence quality gauge
- `outcome-distribution`: Outcome breakdown
- `sdg-alignment`: SDG mapping
- `volunteer-hours`: Volunteer participation
- `integration-score`: Platform health
- `top-achievements`: Major accomplishments

## Usage

### Basic Integration

```tsx
import { DeckComposer } from '@/components/deck';

function MyComponent() {
  const handleExport = async (config: DeckConfig) => {
    const response = await fetch('/api/reports/export/pptx', {
      method: 'POST',
      body: JSON.stringify(config),
    });
    // Handle response...
  };

  return (
    <DeckComposer
      companyId="company-123"
      periodStart={new Date('2025-01-01')}
      periodEnd={new Date('2025-03-31')}
      onExport={handleExport}
      onClose={() => console.log('Closed')}
    />
  );
}
```

### With Modal

```tsx
import { DeckComposerModal } from '@/components/deck';

function MyComponent() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button onClick={() => setIsOpen(true)}>
        Create Deck
      </button>

      <DeckComposerModal
        isOpen={isOpen}
        companyId="company-123"
        periodStart={new Date()}
        periodEnd={new Date()}
        onExport={handleExport}
        onClose={() => setIsOpen(false)}
      />
    </>
  );
}
```

### In Boardroom

```tsx
import { CreateDeckButton } from '@/components/boardroom/CreateDeckButton';

// Add to BoardroomView component
<CreateDeckButton
  companyId={companyId}
  lang={lang}
  logoUrl={logoUrl}
  primaryColor={primaryColor}
/>
```

## API Integration

The deck composer expects a PPTX export API endpoint:

**Endpoint:** `POST /api/reports/export/pptx`

**Request Body:**
```json
{
  "template": "quarterly",
  "tiles": ["sroi-metric", "vis-trend", "evidence-density", "top-achievements"],
  "locale": "en",
  "companyId": "company-123",
  "periodStart": "2025-01-01T00:00:00.000Z",
  "periodEnd": "2025-03-31T00:00:00.000Z",
  "includeWatermark": false,
  "theme": "default"
}
```

**Response:** Binary PPTX file

**Headers:**
- `Content-Type: application/vnd.openxmlformats-officedocument.presentationml.presentation`
- `Content-Disposition: attachment; filename="deck.pptx"`

## Styling

All components use TailwindCSS classes and follow WCAG 2.2 AA standards:

- Contrast ratios ≥4.5:1 for text
- Focus visible styles on all interactive elements
- Touch targets ≥44x44px
- Keyboard navigation support

## Testing

Run tests with:

```bash
pnpm test src/components/deck
```

Test coverage includes:
- Component rendering
- Template selection
- Tile picker (add/remove/reorder)
- Step navigation
- Export flow
- Error handling
- Accessibility

Target: ≥80% coverage

## Accessibility

- Semantic HTML (buttons, inputs, labels)
- ARIA labels and roles
- Keyboard navigation
- Focus management
- Screen reader announcements (live regions)
- High contrast support

## File Structure

```
deck/
├── README.md                    # This file
├── index.ts                     # Module exports
├── types.ts                     # TypeScript types
├── constants.ts                 # Configuration data
├── DeckComposer.tsx            # Main component
├── DeckTemplateSelector.tsx    # Template picker
├── DeckTilePicker.tsx          # Tile selector
├── DeckPreview.tsx             # Preview component
├── DeckComposerModal.tsx       # Modal wrapper
└── __tests__/
    └── DeckComposer.test.tsx   # Test suite
```

## Integration Points

1. **Boardroom Page:** `/en/cockpit/[companyId]/boardroom`
   - Adds CreateDeckButton FAB

2. **PPTX Generator:** `/services/reporting/src/utils/pptxGenerator.ts`
   - Consumes DeckConfig
   - Generates slides based on tiles
   - Applies theme and locale

3. **Report Templates:** `/services/reporting/src/lib/prompts/`
   - Template-specific prompts
   - Multi-locale support

## Future Enhancements

- [ ] Custom tile ordering per template
- [ ] Slide preview thumbnails (actual renders)
- [ ] Real-time data preview in tiles
- [ ] Save/load deck configurations
- [ ] Deck version history
- [ ] Collaboration features (share configs)
- [ ] Custom branding per tenant
- [ ] Advanced theme customization
