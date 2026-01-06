# NLQ Answer Card - Usage Guide

## Quick Start

### 1. Basic Usage

```tsx
import { AnswerCard } from '@/components/nlq';

function MyPage() {
  const answer = {
    queryId: 'q-001',
    question: 'What are the top programs?',
    answer: {
      summary: 'The top 5 programs by volunteer hours are...',
      data: [
        { program: 'Community Garden', hours: 1245 },
        { program: 'English Classes', hours: 1120 }
      ],
      confidence: {
        overall: 0.92,
        components: {
          queryUnderstanding: 0.95,
          dataRelevance: 0.91,
          calculationAccuracy: 0.94,
          completeness: 0.88
        }
      },
      lineage: {
        dataSources: [...],
        transformations: [...],
        evidenceSnippets: [...]
      }
    },
    metadata: {
      executionTimeMs: 145,
      cached: false,
      timestamp: new Date().toISOString()
    }
  };

  return (
    <AnswerCard
      {...answer}
      onFeedback={(rating) => console.log('User feedback:', rating)}
      onExport={(format) => exportData(format)}
    />
  );
}
```

### 2. Using Individual Components

#### Confidence Badge

```tsx
import { ConfidenceBadge } from '@/components/nlq';

<ConfidenceBadge
  score={{
    overall: 0.85,
    components: {
      queryUnderstanding: 0.9,
      dataRelevance: 0.85,
      calculationAccuracy: 0.88,
      completeness: 0.8
    },
    reasoning: 'High confidence based on complete data',
    recommendations: ['Review low completeness score']
  }}
  showBreakdown={true}
/>
```

#### Data Visualization

```tsx
import { DataVisualization } from '@/components/nlq';

<DataVisualization
  data={[
    { month: 'Jan', volunteers: 120, hours: 450 },
    { month: 'Feb', volunteers: 135, hours: 520 },
    { month: 'Mar', volunteers: 142, hours: 580 }
  ]}
  height={400}
/>
```

#### Lineage View

```tsx
import { LineageView } from '@/components/nlq';

<LineageView
  lineage={{
    dataSources: [
      {
        id: 'ds-001',
        name: 'Volunteer Hours Database',
        type: 'database',
        recordCount: 3420
      }
    ],
    transformations: [
      {
        step: 1,
        operation: 'Filter',
        description: 'Filter by date range',
        inputCount: 3420,
        outputCount: 892
      }
    ],
    evidenceSnippets: [
      {
        id: 'ev-001',
        evidenceId: 'evd-123',
        text: 'Evidence text...',
        source: 'Report',
        relevance: 0.95
      }
    ]
  }}
  onEvidenceClick={(id) => viewEvidence(id)}
/>
```

## Integration with Astro Pages

### Client-side Component

```astro
---
// pages/nlq-results.astro
import { AnswerCard } from '../components/nlq';

const props = {
  // ... your answer card props
};
---

<html>
  <head>
    <title>NLQ Results</title>
  </head>
  <body>
    <h1>Query Results</h1>
    <AnswerCard client:load {...props} />
  </body>
</html>
```

### With Server-Side Data Fetching

```astro
---
// pages/query/[id].astro
import { AnswerCard } from '../../components/nlq';

const { id } = Astro.params;

// Fetch answer from API
const response = await fetch(`http://localhost:3001/api/nlq/queries/${id}`);
const answerData = await response.json();
---

<html>
  <body>
    <AnswerCard client:load {...answerData} />
  </body>
</html>
```

## API Integration

### Expected Backend Response Format

```typescript
// GET /api/nlq/queries/:id
{
  "queryId": "q-123",
  "question": "What are the top programs?",
  "answer": {
    "summary": "Natural language summary of the answer",
    "data": [
      { "column1": "value1", "column2": 123 }
    ],
    "confidence": {
      "overall": 0.92,
      "components": {
        "queryUnderstanding": 0.95,
        "dataRelevance": 0.91,
        "calculationAccuracy": 0.94,
        "completeness": 0.88
      },
      "reasoning": "Explanation of confidence score",
      "recommendations": ["Suggestion 1", "Suggestion 2"]
    },
    "lineage": {
      "dataSources": [...],
      "transformations": [...],
      "evidenceSnippets": [...]
    },
    "visualization": {
      "type": "bar",
      "autoDetected": true
    }
  },
  "metadata": {
    "executionTimeMs": 145,
    "cached": false,
    "timestamp": "2024-01-15T10:30:00Z",
    "modelVersion": "nlq-v2.1",
    "tokensUsed": 2840
  }
}
```

### Submitting Feedback

```typescript
// POST /api/nlq/queries/:id/feedback
{
  "rating": "positive" | "negative",
  "comment": "Optional feedback comment"
}
```

### Exporting Data

```typescript
// GET /api/nlq/queries/:id/export?format=csv
// Returns CSV or JSON file download
```

## Styling and Theming

### Custom CSS Variables

The components use standard Tailwind CSS variables:

```css
:root {
  --color-primary: #6366f1;
  --color-secondary: #8b5cf6;
  --color-background: #ffffff;
  --color-foreground: #000000;
  --color-border: #e5e7eb;
}

.dark {
  --color-background: #1f2937;
  --color-foreground: #f9fafb;
  --color-border: #374151;
}
```

### Override Component Styles

```tsx
<AnswerCard
  className="custom-answer-card"
  {...props}
/>
```

```css
.custom-answer-card {
  border-radius: 16px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}
```

## Accessibility Features

All components support:

- **Keyboard Navigation**: Full keyboard support with proper focus management
- **Screen Readers**: ARIA labels and roles for all interactive elements
- **Touch Targets**: Minimum 44x44px touch targets (WCAG 2.2 AAA)
- **Color Contrast**: WCAG 2.2 AA compliant color combinations
- **Focus Indicators**: Clear focus states for all interactive elements
- **Live Regions**: Screen reader announcements for dynamic content

## Performance Optimization

### Memoization

Charts are automatically memoized to prevent unnecessary re-renders:

```tsx
const chartData = useMemo(() => {
  return generateChartData(data, type);
}, [data, type]);
```

### Lazy Loading

For large datasets, consider lazy loading:

```tsx
import { lazy, Suspense } from 'react';

const AnswerCard = lazy(() => import('@/components/nlq/AnswerCard'));

<Suspense fallback={<LoadingSpinner />}>
  <AnswerCard {...props} />
</Suspense>
```

### Data Pagination

For tables with many rows:

```tsx
const paginatedData = data.slice(page * pageSize, (page + 1) * pageSize);

<DataVisualization data={paginatedData} />
```

## Error Handling

```tsx
import { AnswerCard } from '@/components/nlq';
import { ErrorBoundary } from '@/components/common';

<ErrorBoundary fallback={<ErrorMessage />}>
  <AnswerCard {...props} />
</ErrorBoundary>
```

## Testing

### Unit Tests

```tsx
import { render, screen } from '@testing-library/react';
import { AnswerCard } from '@/components/nlq';

test('renders question', () => {
  render(<AnswerCard {...mockProps} />);
  expect(screen.getByText('What are the top programs?')).toBeInTheDocument();
});

test('shows confidence badge', () => {
  render(<AnswerCard {...mockProps} />);
  expect(screen.getByLabelText(/confidence/i)).toBeInTheDocument();
});
```

### Integration Tests

```tsx
test('handles feedback submission', async () => {
  const onFeedback = jest.fn();
  render(<AnswerCard {...mockProps} onFeedback={onFeedback} />);

  const thumbsUp = screen.getByLabelText('Positive feedback');
  fireEvent.click(thumbsUp);

  expect(onFeedback).toHaveBeenCalledWith('positive');
});
```

## Common Patterns

### Multiple Answer Cards (History)

```tsx
<div className="space-y-6">
  {answers.map((answer) => (
    <AnswerCard key={answer.queryId} {...answer} />
  ))}
</div>
```

### Sticky Confidence Badge

```tsx
<div className="sticky top-0 z-10 bg-background p-4">
  <ConfidenceBadge score={answer.confidence} compact />
</div>
```

### Expandable Lineage

```tsx
const [lineageExpanded, setLineageExpanded] = useState(false);

<LineageView
  lineage={answer.lineage}
  expanded={lineageExpanded}
  onToggle={() => setLineageExpanded(!lineageExpanded)}
/>
```

## Troubleshooting

### Charts not rendering

Ensure Chart.js is properly registered:

```tsx
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);
```

### Dark mode not working

Ensure your root element has the `dark` class:

```tsx
<html class={isDark ? 'dark' : ''}>
```

### TypeScript errors

Import types from the barrel export:

```tsx
import type { AnswerCardProps } from '@/components/nlq';
```

## Best Practices

1. **Always provide confidence scores** - Users need to understand answer reliability
2. **Include lineage for transparency** - Show where data comes from
3. **Enable feedback** - Collect user ratings to improve the system
4. **Use auto-detection for visualizations** - Let the system choose the best chart type
5. **Cache results when possible** - Reduce API calls and improve performance
6. **Provide export options** - Let users download data for further analysis
7. **Show execution time** - Helps users understand system performance
8. **Use compact mode for space-constrained UIs** - Confidence badges support compact mode

## Support

For issues or questions:
- Check the README.md for component documentation
- Review the stories file for examples
- Consult the type definitions in `/src/types/nlq.ts`
