# NLQ E2E Test Suite

Comprehensive end-to-end testing for Natural Language Query (NLQ) functionality.

## Overview

This test suite provides complete coverage of the NLQ feature, including:
- 10 canonical questions
- Performance assertions
- Accessibility compliance
- Error handling
- Visual regression

## Files

### Test Specifications

- **`11-nlq-canonical-questions.spec.ts`** (598 lines)
  - 10 canonical question tests
  - Test flows (autocomplete, templates, history)
  - Error handling (rate limits, network failures)
  - Performance assertions
  - Visual regression checks

- **`12-nlq-accessibility.spec.ts`** (392 lines)
  - WCAG 2.2 AAA compliance
  - Keyboard navigation
  - Screen reader support
  - Focus management
  - Target size compliance
  - Text & font accessibility

### Helpers

- **`helpers/nlq-helpers.ts`** (238 lines)
  - Reusable page objects
  - Performance measurement utilities
  - Cache testing helpers
  - Error verification functions

### Fixtures

- **`fixtures/nlq/canonical-answers.json`**
  - Mock data for 10 canonical questions
  - Complete answer structures with metadata
  - Used for offline testing and snapshots

## Canonical Questions

### 1. SROI Current Quarter
**Question**: "What is our SROI for last quarter?"
- **Expected**: Metric display with value, trend
- **Visualization**: Metric card
- **Confidence**: High

### 2. SROI Trend
**Question**: "Show me SROI trend for the past year"
- **Expected**: Line chart with 4 quarters
- **Visualization**: Line chart
- **Confidence**: High

### 3. VIS Average Score
**Question**: "What is our average VIS score?"
- **Expected**: Metric display with volunteer count
- **Visualization**: Metric card + table
- **Confidence**: High

### 4. VIS Trend
**Question**: "Show VIS trend for last 3 months"
- **Expected**: Line chart with 3 data points
- **Visualization**: Line chart
- **Confidence**: High

### 5. Outcome Scores by Dimension
**Question**: "What are our outcome scores by dimension?"
- **Expected**: Table/bar chart with 5 dimensions
- **Visualization**: Bar chart or table
- **Confidence**: High

### 6. Active Participants
**Question**: "How many active participants do we have?"
- **Expected**: Count with percentage change
- **Visualization**: Metric card
- **Confidence**: High

### 7. Volunteer Activity
**Question**: "Show volunteer activity for last month"
- **Expected**: Table or chart with activity data
- **Visualization**: Table or bar chart
- **Confidence**: High

### 8. Average Language Level
**Question**: "What is our average language level?"
- **Expected**: Language level (A1-C2 or numeric)
- **Visualization**: Metric + distribution chart
- **Confidence**: High

### 9. SROI Benchmark Comparison
**Question**: "How does our SROI compare to industry peers?"
- **Expected**: Comparison table/chart with peer data
- **Visualization**: Bar chart or table
- **Confidence**: High/Medium (depends on peer data)

### 10. Monthly Outcome Trends
**Question**: "Show monthly outcome trends for last year"
- **Expected**: Line chart with 12 months
- **Visualization**: Line chart
- **Confidence**: High

## Test Coverage

### Functional Testing
- ✅ Question submission via search bar
- ✅ Answer card rendering
- ✅ Confidence badge display (green/yellow/red)
- ✅ Data visualization (table/chart)
- ✅ Lineage view expansion
- ✅ Export functionality (CSV/JSON)
- ✅ Feedback submission (thumbs up/down)
- ✅ Cached indicator on second run
- ✅ Query history re-run

### Test Flows
- ✅ Search autocomplete suggestions
- ✅ Template card click-to-populate
- ✅ Query history panel
- ✅ Re-run from history
- ✅ Feedback workflow

### Error Handling
- ✅ Rate limit errors
- ✅ Network failures
- ✅ Invalid queries
- ✅ Retry mechanisms

### Performance Assertions
- ✅ Cache miss: ≤3s (p95 target: 2.5s with buffer)
- ✅ Cache hit: ≤200ms
- ✅ Intent classification: ≤1s
- ✅ Cache verification (first run uncached, second run cached)

### Accessibility (WCAG 2.2 AAA)
- ✅ Axe automated scans
- ✅ Keyboard navigation (Tab, Enter, Arrows, Esc)
- ✅ Screen reader support (ARIA labels, live regions)
- ✅ Focus management (modal trapping, restoration)
- ✅ Target size compliance (24x24px minimum)
- ✅ Color contrast (AAA level)
- ✅ Text zoom support (up to 200%)
- ✅ Heading hierarchy
- ✅ Skip links

### Visual Regression
- ✅ Answer card layout
- ✅ Confidence badge styling
- ✅ Chart rendering

## Running Tests

### Run All NLQ Tests
```bash
pnpm test:e2e -- nlq
```

### Run Canonical Questions Only
```bash
pnpm test:e2e -- 11-nlq-canonical-questions
```

### Run Accessibility Tests Only
```bash
pnpm test:e2e -- 12-nlq-accessibility
```

### Run Specific Test
```bash
pnpm test:e2e -- 11-nlq-canonical-questions -g "SROI current quarter"
```

### Debug Mode
```bash
pnpm test:e2e -- nlq --debug --headed
```

### Update Visual Snapshots
```bash
pnpm test:e2e -- nlq --update-snapshots
```

## Performance Targets

### Response Times
- **Intent Classification**: ≤1s
- **Cache Miss (Full Query)**: ≤3s (p95 target: 2.5s)
- **Cache Hit**: ≤200ms

### Confidence Levels
- **High**: 0.80-1.00 (Green badge)
- **Medium**: 0.50-0.79 (Yellow badge)
- **Low**: 0.00-0.49 (Red badge)

## Data Test IDs

### Search & Input
- `nlq-search-bar` - Main search container
- `nlq-search-input` - Question input field
- `autocomplete-suggestion` - Autocomplete items

### Answer Card
- `answer-card` - Main answer container
- `answer-question` - Original question text
- `answer-summary` - Natural language summary
- `confidence-badge` - Confidence indicator
- `answer-metadata` - Execution time, cache status

### Data Display
- `data-table` - Table visualization
- `data-chart` - Chart visualization
- `chart-data-point` - Chart data points
- `chart-x-axis-label` - Chart X-axis labels
- `metric-value` - Single metric display

### Lineage
- `lineage-toggle-button` - Button to expand lineage
- `lineage-panel` - Lineage details panel
- `data-source` - Individual data source

### Actions
- `export-csv-button` - Export to CSV
- `export-json-button` - Export to JSON
- `feedback-positive` - Thumbs up button
- `feedback-negative` - Thumbs down button
- `feedback-submitted` - Feedback confirmation

### History
- `query-history-button` - Open history panel
- `query-history-panel` - History container
- `history-item` - Individual history entry
- `rerun-query-button` - Re-run from history

### Error States
- `error-message` - Error message container
- `retry-button` - Retry failed query
- `retry-after` - Rate limit retry info

### Loading States
- `loading-spinner` - Loading indicator
- `query-status-announcer` - Screen reader announcements

## Mock Data Structure

Each canonical answer includes:
```json
{
  "queryId": "unique-id",
  "question": "Original question text",
  "answer": {
    "summary": "Natural language answer",
    "data": [...],
    "confidence": {
      "overall": 0.92,
      "level": "high",
      "components": {...},
      "recommendations": [...]
    },
    "lineage": {
      "sources": [...],
      "transformations": [...],
      "calculationSteps": [...]
    },
    "visualization": {
      "type": "chart|metric|table",
      "chartType": "line|bar|pie",
      "config": {...}
    }
  },
  "metadata": {
    "executionTimeMs": 1847,
    "cached": false,
    "safetyPassed": true,
    "intent": "metric_query",
    "templateId": "template-id",
    "tokensUsed": 1523,
    "estimatedCostUSD": "0.0034"
  }
}
```

## Accessibility Checklist

### Keyboard Navigation
- [ ] Tab through all interactive elements
- [ ] Enter/Space activate buttons
- [ ] Arrow keys navigate autocomplete
- [ ] Escape closes modals
- [ ] Skip links functional

### Screen Reader
- [ ] All images have alt text
- [ ] Form inputs have labels
- [ ] Buttons have accessible names
- [ ] Live regions announce updates
- [ ] Charts have text alternatives

### Focus Management
- [ ] Focus visible on all elements
- [ ] Focus trapped in modals
- [ ] Focus restored after modal close
- [ ] Logical tab order

### Visual
- [ ] Color contrast AAA (7:1)
- [ ] Target size ≥24x24px
- [ ] Text zoom 200% works
- [ ] No text in images
- [ ] Line height ≥1.5

## Troubleshooting

### Tests Failing Due to Slow Performance
- Check if services are running locally
- Increase timeout values for slower environments
- Verify cache is working (second run should be faster)

### Visual Regression Failures
- Update snapshots if intentional UI changes
- Check for animation timing issues
- Verify chart rendering is complete before snapshot

### Accessibility Violations
- Run axe DevTools in browser for details
- Check ARIA attributes are correct
- Verify focus indicators are visible

### Rate Limit Errors in Tests
- Add delays between rapid queries
- Use unique questions to avoid triggering limits
- Mock rate limiter in test environment

## Contributing

When adding new NLQ tests:
1. Follow existing patterns in helper functions
2. Use semantic data-testid attributes
3. Include accessibility checks
4. Add performance assertions
5. Update this README with new coverage
6. Add mock data to fixtures if needed

## CI/CD Integration

Tests run automatically on:
- Pull requests to `main`
- Commits to NLQ-related branches
- Nightly regression runs

### CI Environment Variables
```bash
E2E_BASE_URL=https://staging.teei.example
E2E_TIMEOUT=60000
E2E_RETRIES=2
E2E_WORKERS=4
```

## Related Documentation

- [NLQ Component Documentation](../../apps/corp-cockpit-astro/src/components/nlq/README.md)
- [NLQ API Documentation](../../services/insights-nlq/README.md)
- [E2E Test Guide](./README.md)
- [Accessibility Guidelines](../../docs/ACCESSIBILITY.md)
