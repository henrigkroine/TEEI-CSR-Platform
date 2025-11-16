# NLQ Answer Card Components

Natural Language Query (NLQ) answer card components for displaying query results with confidence indicators, visualizations, and lineage information.

## Component Architecture

```
nlq/
├── AnswerCard.tsx           # Main answer card component
├── ConfidenceBadge.tsx      # Confidence score indicator
├── DataVisualization.tsx    # Auto-detecting data visualization
├── LineageView.tsx          # Data lineage explorer
├── index.ts                 # Barrel export
├── AnswerCard.stories.tsx   # Usage examples
└── README.md                # This file
```

## Components

### AnswerCard

Main component for displaying NLQ query results.

**Props:**
- `queryId: string` - Unique identifier for the query
- `question: string` - The natural language question
- `answer: NLQAnswer` - The answer data structure
- `metadata: QueryMetadata` - Execution metadata
- `onFeedback?: (rating: 'positive' | 'negative') => void` - Feedback handler
- `onExport?: (format: 'csv' | 'json') => void` - Export handler
- `onLineageExpand?: () => void` - Lineage expansion handler

**Features:**
- Question display with timestamp
- Confidence badge with breakdown
- Summary text with expand/collapse
- Data visualization
- Lineage information
- Feedback buttons (thumbs up/down)
- Export options (CSV, JSON, Copy)
- Cache indicator badge

**Example:**
```tsx
import { AnswerCard } from '@/components/nlq';

<AnswerCard
  queryId="q-001"
  question="What are the top 5 programs by volunteer hours?"
  answer={{
    summary: "Based on Q1 2024 data...",
    data: [...],
    confidence: {...},
    lineage: {...}
  }}
  metadata={{
    executionTimeMs: 145,
    cached: false,
    timestamp: new Date().toISOString()
  }}
  onFeedback={(rating) => console.log(rating)}
  onExport={(format) => downloadData(format)}
/>
```

### ConfidenceBadge

Visual indicator for answer confidence with optional breakdown tooltip.

**Props:**
- `score: ConfidenceScore` - Confidence score object
- `showBreakdown?: boolean` - Show detailed breakdown on hover
- `compact?: boolean` - Compact display mode

**Features:**
- Color-coded confidence levels (green/yellow/orange)
- Overall confidence percentage
- Component-wise breakdown
- Reasoning explanation
- Low-confidence recommendations
- Accessible tooltip

**Confidence Levels:**
- **High (≥80%)**: Green - High reliability
- **Medium (60-79%)**: Yellow - Moderate reliability
- **Low (<60%)**: Orange - Low reliability, review recommendations

**Example:**
```tsx
import { ConfidenceBadge } from '@/components/nlq';

<ConfidenceBadge
  score={{
    overall: 0.92,
    components: {
      queryUnderstanding: 0.95,
      dataRelevance: 0.91,
      calculationAccuracy: 0.94,
      completeness: 0.88
    },
    reasoning: "High confidence based on complete data..."
  }}
  showBreakdown={true}
/>
```

### DataVisualization

Auto-detecting data visualization component supporting multiple chart types.

**Props:**
- `data: any[]` - Array of data objects
- `config?: VisualizationConfig` - Optional visualization configuration
- `height?: number` - Chart height in pixels (default: 300)
- `onVisualizationChange?: (type: VisualizationType) => void` - Type change handler

**Supported Types:**
- **Table**: Default view, shows all data in a table
- **Bar**: For comparisons and categorical data
- **Line**: For trends over time
- **Pie**: For distribution/proportions
- **Doughnut**: Alternative to pie chart

**Auto-Detection:**
- Automatically selects best visualization based on data structure
- 2 columns (label + value) → Bar chart
- Date/time column + numeric → Line chart
- Multiple numeric columns → Bar chart
- Fallback → Table view

**Example:**
```tsx
import { DataVisualization } from '@/components/nlq';

<DataVisualization
  data={[
    { program: 'Garden Initiative', hours: 1245 },
    { program: 'English Classes', hours: 1120 }
  ]}
  height={400}
/>
```

### LineageView

Expandable data lineage explorer showing data sources, transformations, and evidence.

**Props:**
- `lineage: AnswerLineage` - Lineage data structure
- `expanded?: boolean` - Initial expansion state
- `onEvidenceClick?: (evidenceId: string) => void` - Evidence click handler

**Features:**
- Data sources with metadata
- Transformation pipeline visualization
- Evidence snippets with relevance scores
- Expandable/collapsible sections
- Tabbed interface

**Example:**
```tsx
import { LineageView } from '@/components/nlq';

<LineageView
  lineage={{
    dataSources: [...],
    transformations: [...],
    evidenceSnippets: [...]
  }}
  onEvidenceClick={(id) => viewEvidence(id)}
/>
```

## Type Definitions

All types are defined in `/src/types/nlq.ts`:

```typescript
interface NLQAnswer {
  summary: string;
  data: any[];
  confidence: ConfidenceScore;
  lineage: AnswerLineage;
  visualization?: VisualizationConfig;
}

interface ConfidenceScore {
  overall: number; // 0-1
  components: {
    queryUnderstanding: number;
    dataRelevance: number;
    calculationAccuracy: number;
    completeness: number;
  };
  reasoning?: string;
  recommendations?: string[];
}

interface AnswerLineage {
  dataSources: DataSource[];
  transformations: TransformationStep[];
  evidenceSnippets: EvidenceSnippet[];
}

interface QueryMetadata {
  executionTimeMs: number;
  cached: boolean;
  timestamp: string;
  modelVersion?: string;
  tokensUsed?: number;
}
```

## Design System Integration

Components use the existing Tailwind CSS design system:

### Colors
- Primary: `var(--color-primary)`
- Secondary: `var(--color-secondary)`
- Background: `var(--color-background)`
- Foreground: `var(--color-foreground)`
- Border: `var(--color-border)`

### Dark Mode
All components support dark mode via `dark:` class modifiers.

### Accessibility
- WCAG 2.2 AA compliant
- Minimum 44px touch targets
- Keyboard navigation support
- ARIA labels and roles
- Focus management
- Screen reader friendly

## Usage in Astro Pages

```astro
---
// pages/nlq-demo.astro
import { AnswerCard } from '../components/nlq';
---

<html>
  <body>
    <AnswerCard
      client:load
      queryId="demo-001"
      question="Sample question"
      answer={{...}}
      metadata={{...}}
    />
  </body>
</html>
```

## Integration with Backend

Expected API response format:

```typescript
// POST /api/nlq/query
// Request:
{
  "question": "What are the top programs?",
  "context": {...}
}

// Response:
{
  "queryId": "q-123",
  "question": "What are the top programs?",
  "answer": {
    "summary": "Based on the data...",
    "data": [...],
    "confidence": {...},
    "lineage": {...},
    "visualization": {...}
  },
  "metadata": {
    "executionTimeMs": 145,
    "cached": false,
    "timestamp": "2024-01-15T10:30:00Z",
    "modelVersion": "nlq-v2.1"
  }
}
```

## Testing

Run the stories to see all component variations:

```bash
# Development server
pnpm -w dev

# Navigate to /nlq-demo or create a test page
```

## Dependencies

- React 18.2+
- Chart.js 4.5+
- react-chartjs-2 5.3+
- Tailwind CSS 3.4+
- TypeScript 5.9+

## Performance Considerations

1. **Memoization**: Chart data is memoized to prevent unnecessary re-renders
2. **Lazy Loading**: Charts only render when visible
3. **Data Limits**: Large datasets should be paginated or windowed
4. **Caching**: Support for cached results to reduce API calls

## Future Enhancements

- [ ] Mermaid diagram integration for lineage visualization
- [ ] Advanced filtering for data tables
- [ ] Export to PowerPoint/PDF
- [ ] Share answer card functionality
- [ ] Answer history/comparison
- [ ] Custom visualization templates
- [ ] Real-time answer updates
- [ ] Voice query support

## Contributing

Follow the existing component patterns:
1. Use TypeScript with strict types
2. Follow Tailwind CSS conventions
3. Ensure WCAG 2.2 AA compliance
4. Add stories for new features
5. Update type definitions
6. Document in README

## License

Part of the TEEI CSR Platform - Internal use only
