# @teei/clients

Typed TypeScript client SDKs for TEEI CSR Platform services.

## Installation

```bash
pnpm add @teei/clients
```

## Usage

### Reporting Client (Analytics Service)

```typescript
import { createReportingClient } from '@teei/clients/reporting';

const client = createReportingClient(
  'http://localhost:3004',
  'your-api-key'
);

// Get company metrics
const metrics = await client.getMetrics('company-id', {
  start: '2025-11-01',
  end: '2025-11-30',
});

console.log(`SROI: ${metrics.metrics.sroi}`);
console.log(`VIS: ${metrics.metrics.vis}`);

// Get cohort metrics
const cohortMetrics = await client.getCohortMetrics('company-id', 'engineering');
console.log(`Participants: ${cohortMetrics.metrics.participantCount}`);

// Stream real-time metrics
const eventSource = client.streamMetrics(
  'company-id',
  (data) => {
    console.log('New data point:', data);
  },
  (error) => {
    console.error('Stream error:', error);
  }
);

// Close stream when done
eventSource.close();
```

### Journey Client (Journey Engine)

```typescript
import { createJourneyClient } from '@teei/clients/journey';

const client = createJourneyClient(
  'http://localhost:3009',
  'your-api-key'
);

// Get journey flags
const { flags } = await client.getJourneyFlags('user-id');
console.log('Active flags:', flags.filter(f => f.triggered));

// Get milestones
const { milestones } = await client.getMilestones('user-id');
console.log('Achieved milestones:', milestones.filter(m => m.achieved));

// Evaluate rules
const { evaluations } = await client.evaluateRules('user-id', {
  sessionCount: 5,
  feedbackScore: 8.5,
});

console.log('Matched rules:', evaluations.filter(e => e.matched));
```

### Q2Q Client (AI Classification)

```typescript
import { createQ2QClient } from '@teei/clients/q2q';

const client = createQ2QClient(
  'http://localhost:3007',
  'your-api-key'
);

// Classify single text
const { result } = await client.classifyText(
  'This session helped me develop leadership skills',
  'company-id'
);

console.log('Outcomes:', result.outcomes);
console.log('Tags:', result.tags);

// Batch classify
const { results } = await client.classifyBatch([
  'Text 1',
  'Text 2',
  'Text 3',
], 'company-id');

console.log(`Classified ${results.length} texts`);

// Get model registry
const { models } = await client.getModelRegistry();
console.log('Available models:', models);
```

## API Reference

### ReportingClient

#### Methods

- `getMetrics(companyId, params?)` - Get company metrics
- `getSROI(companyId)` - Get Social Return on Investment
- `getVIS(companyId)` - Get Volunteer Impact Score
- `getCohortMetrics(companyId, cohort)` - Get cohort-specific metrics
- `streamMetrics(companyId, onData, onError?)` - Subscribe to real-time metrics

### JourneyClient

#### Methods

- `getJourneyFlags(userId)` - Get journey flags for user
- `getMilestones(userId)` - Get milestones for user
- `evaluateRules(userId, context)` - Evaluate journey rules

### Q2QClient

#### Methods

- `classifyText(text, companyId?)` - Classify single text
- `classifyBatch(texts, companyId?)` - Classify multiple texts
- `getEvalResults(evalId?)` - Get evaluation results
- `getModelRegistry()` - Get available models
- `getModel(modelId)` - Get specific model details

## Environment Variables

```bash
# Service URLs (defaults shown)
ANALYTICS_SERVICE_URL=http://localhost:3004
JOURNEY_SERVICE_URL=http://localhost:3009
Q2Q_SERVICE_URL=http://localhost:3007

# API Key (optional)
API_KEY=your-api-key
```

## Error Handling

All client methods throw errors on HTTP failures:

```typescript
try {
  const metrics = await client.getMetrics('invalid-id');
} catch (error) {
  console.error('Request failed:', error.message);
  // Error: HTTP 404: Not Found
}
```

## TypeScript Support

All clients are fully typed with TypeScript interfaces:

```typescript
import type { MetricsResponse } from '@teei/clients/reporting';

const metrics: MetricsResponse = await client.getMetrics('company-id');
// Full autocomplete and type checking
```

## Testing

```bash
pnpm test
```

## License

MIT
