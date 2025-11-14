# TEEI Platform TypeScript SDK

Official TypeScript SDK for the TEEI Platform API. Auto-generated from OpenAPI v1 specifications.

## Features

- ✅ **Fully Typed**: Complete TypeScript types for all requests and responses
- ✅ **Promise-based**: Modern async/await API
- ✅ **Auto-retry**: Built-in error handling and retry logic
- ✅ **Authentication**: JWT Bearer token support
- ✅ **Comprehensive**: Covers all TEEI Platform services

## Services

- **Reporting**: Gen-AI powered report generation with citations
- **Analytics**: ClickHouse-powered analytics (trends, cohorts, funnels, benchmarks)
- **Impact-In**: External platform integrations with delivery tracking
- **Notifications**: Multi-channel notifications (email, SMS, push)

## Installation

```bash
pnpm add @teei/sdk
# or
npm install @teei/sdk
# or
yarn add @teei/sdk
```

## Quick Start

```typescript
import { TEEISDK } from '@teei/sdk';

// Initialize SDK
const sdk = new TEEISDK({
  baseURL: 'https://api.teei.io/v1',
  token: 'your-jwt-token',
  timeout: 30000, // Optional: request timeout in ms
  debug: false, // Optional: enable debug logging
});

// Generate AI report
const report = await sdk.reporting.generateReport({
  companyId: '550e8400-e29b-41d4-a716-446655440000',
  period: {
    start: '2024-01-01',
    end: '2024-12-31',
  },
  locale: 'en',
  sections: ['impact-summary', 'sroi-narrative'],
  deterministic: false,
  temperature: 0.7,
});

console.log(`Report ID: ${report.reportId}`);
console.log(`Cost: $${report.lineage.estimatedCostUsd}`);
```

## Usage Examples

### Reporting Service

#### Generate AI Report

```typescript
const report = await sdk.reporting.generateReport({
  companyId: '550e8400-e29b-41d4-a716-446655440000',
  period: { start: '2024-01-01', end: '2024-12-31' },
  locale: 'en',
  sections: ['impact-summary', 'sroi-narrative', 'outcome-trends'],
  deterministic: false,
  temperature: 0.7,
  maxTokens: 2000,
});

// Access sections and citations
report.sections.forEach((section) => {
  console.log(`\n${section.type}:`);
  console.log(section.content);
  console.log(`Citations: ${section.citations.length}`);
});

// Check lineage
console.log(`Model: ${report.lineage.modelName}`);
console.log(`Tokens used: ${report.lineage.tokensUsed}`);
console.log(`Cost: $${report.lineage.estimatedCostUsd}`);
```

#### Get Cost Summary

```typescript
const summary = await sdk.reporting.getCostSummary();
console.log(`Total cost: $${summary.totalCostUsd}`);
console.log(`Total requests: ${summary.requestsCount}`);
console.log(`Average cost per request: $${summary.avgCostPerRequest}`);

summary.byModel.forEach((model) => {
  console.log(`${model.modelName}: $${model.totalCostUsd} (${model.requestsCount} requests)`);
});
```

### Analytics Service

#### Query Trends

```typescript
const trends = await sdk.analytics.getTrends({
  companyId: '550e8400-e29b-41d4-a716-446655440000',
  metrics: 'participants,sessions,avg_confidence,avg_belonging',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
  interval: 'month',
  groupBy: 'program',
  page: 1,
  limit: 100,
});

console.log(`Query time: ${trends.metadata.queryDurationMs}ms`);
console.log(`Cache hit: ${trends.metadata.cacheHit}`);

trends.data.forEach((period) => {
  console.log(`${period.period}: ${period.participants} participants`);
});
```

#### Compare Cohorts

```typescript
const cohorts = await sdk.analytics.getCohorts({
  companyId: '550e8400-e29b-41d4-a716-446655440000',
  metrics: 'avg_confidence,avg_belonging,avg_job_readiness',
  cohortDimension: 'program',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});

cohorts.data.forEach((cohort) => {
  console.log(`${cohort.cohort}:`);
  console.log(`  Participants: ${cohort.participantsCount}`);
  console.log(`  Confidence: ${cohort.avg_confidence}`);
  console.log(`  Belonging: ${cohort.avg_belonging}`);
});
```

#### Analyze Funnels

```typescript
const funnel = await sdk.analytics.getFunnels({
  companyId: '550e8400-e29b-41d4-a716-446655440000',
  funnelType: 'enrollment',
  startDate: '2024-01-01',
  endDate: '2024-12-31',
});

console.log(`Overall conversion: ${funnel.data.overallConversionRate}%`);

funnel.data.stages.forEach((stage) => {
  console.log(`${stage.stage}:`);
  console.log(`  Count: ${stage.count}`);
  console.log(`  Percentage: ${stage.percentage}%`);
  console.log(`  Drop-off: ${stage.dropoffRate}%`);
});
```

#### Get Benchmarks

```typescript
const benchmarks = await sdk.analytics.getBenchmarks({
  companyId: '550e8400-e29b-41d4-a716-446655440000',
  metrics: 'avg_confidence,avg_belonging,sroi_ratio',
  peerGroup: 'industry',
  period: 'current_quarter',
});

benchmarks.data.benchmarks.forEach((metric) => {
  console.log(`${metric.metric}:`);
  console.log(`  Your value: ${metric.companyValue}`);
  console.log(`  Peer median: ${metric.peerMedian}`);
  console.log(`  Your percentile: ${metric.percentile}th`);
  console.log(`  Performance: ${metric.performance}`);
});
```

### Impact-In Service

#### List Deliveries

```typescript
const deliveries = await sdk.impactIn.listDeliveries({
  companyId: '550e8400-e29b-41d4-a716-446655440000',
  provider: 'benevity',
  status: 'success',
  page: 1,
  limit: 20,
});

console.log(`Total: ${deliveries.pagination.total}`);

deliveries.data.forEach((delivery) => {
  console.log(`${delivery.provider}: ${delivery.status} (${delivery.attemptCount} attempts)`);
});
```

#### Replay Failed Delivery

```typescript
const result = await sdk.impactIn.replayDelivery('650e8400-e29b-41d4-a716-446655440000');

if (result.success) {
  console.log(`Delivery replayed successfully: ${result.newStatus}`);
} else {
  console.error(`Replay failed: ${result.error}`);
}
```

#### Bulk Replay

```typescript
const result = await sdk.impactIn.bulkReplay({
  ids: [
    '650e8400-e29b-41d4-a716-446655440001',
    '650e8400-e29b-41d4-a716-446655440002',
    '650e8400-e29b-41d4-a716-446655440003',
  ],
});

console.log(`Successful: ${result.summary.successful}/${result.summary.total}`);
```

#### Get Delivery Statistics

```typescript
const stats = await sdk.impactIn.getStats('550e8400-e29b-41d4-a716-446655440000');

console.log(`Total deliveries: ${stats.data.overall.total}`);
console.log(`Success rate: ${(stats.data.overall.successful / stats.data.overall.total * 100).toFixed(1)}%`);

stats.data.byProvider.forEach((p) => {
  console.log(`${p.provider} (${p.status}): ${p.count} (avg attempts: ${p.avgAttempts})`);
});
```

### Notifications Service

#### Send Notification

```typescript
const result = await sdk.notifications.send({
  companyId: '550e8400-e29b-41d4-a716-446655440000',
  type: 'email',
  templateId: 'report-ready',
  recipient: 'user@example.com',
  subject: 'Your Q4 Impact Report is Ready',
  payload: {
    userName: 'John Doe',
    reportUrl: 'https://app.teei.io/reports/rpt_123',
    companyName: 'Sample Company',
  },
});

console.log(`Notification queued: ${result.notificationId}`);
```

#### Schedule Notification

```typescript
const result = await sdk.notifications.schedule({
  companyId: '550e8400-e29b-41d4-a716-446655440000',
  type: 'email',
  templateId: 'weekly-digest',
  recipient: 'admin@example.com',
  subject: 'Weekly Impact Digest',
  payload: {
    weekStart: '2024-11-11',
    weekEnd: '2024-11-17',
  },
  scheduledAt: '2024-11-18T09:00:00Z',
});

console.log(`Notification scheduled for: ${result.scheduledAt}`);
```

#### Check Quota

```typescript
const quota = await sdk.notifications.getQuota('550e8400-e29b-41d4-a716-446655440000');

console.log(`Email: ${quota.quotas.email.remaining}/${quota.quotas.email.limit} remaining`);
console.log(`SMS: ${quota.quotas.sms.remaining}/${quota.quotas.sms.limit} remaining`);
console.log(`Push: ${quota.quotas.push.remaining}/${quota.quotas.push.limit} remaining`);
console.log(`Resets at: ${quota.quotas.email.resetAt}`);
```

## Error Handling

```typescript
import { TEEIAPIError } from '@teei/sdk';

try {
  const report = await sdk.reporting.generateReport({
    // ... request params
  });
} catch (error) {
  if (error instanceof TEEIAPIError) {
    console.error(`API Error (${error.statusCode}): ${error.message}`);
    console.error('Details:', error.apiError.details);

    // Check specific error types
    if (error.isUnauthorized()) {
      console.log('Token expired, refreshing...');
    } else if (error.isRateLimited()) {
      console.log('Rate limited, backing off...');
    } else if (error.isBadRequest()) {
      console.log('Invalid request:', error.apiError.details);
    }
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Configuration

### Environment-based Configuration

```typescript
const sdk = new TEEISDK({
  baseURL: process.env.TEEI_API_URL || 'https://api.teei.io/v1',
  token: process.env.TEEI_API_TOKEN,
  timeout: parseInt(process.env.TEEI_API_TIMEOUT || '30000'),
  debug: process.env.NODE_ENV === 'development',
});
```

### Token Management

```typescript
// Update token
sdk.setToken('new-jwt-token');

// Clear token
sdk.clearToken();

// Use with token refresh
async function refreshTokenIfNeeded() {
  try {
    const report = await sdk.reporting.generateReport({...});
    return report;
  } catch (error) {
    if (error instanceof TEEIAPIError && error.isUnauthorized()) {
      const newToken = await getNewToken();
      sdk.setToken(newToken);
      return sdk.reporting.generateReport({...}); // Retry
    }
    throw error;
  }
}
```

## TypeScript Support

The SDK is written in TypeScript and provides full type safety:

```typescript
import type {
  GenerateReportRequest,
  GenerateReportResponse,
  TrendsQuery,
  TrendsResponse,
  DeliveryStatus,
  NotificationType,
} from '@teei/sdk';

// Full IntelliSense support
const request: GenerateReportRequest = {
  companyId: '550e8400-e29b-41d4-a716-446655440000',
  period: { start: '2024-01-01', end: '2024-12-31' },
  sections: ['impact-summary'], // Type-checked enum values
  locale: 'en', // Type-checked: 'en' | 'es' | 'fr'
};

const response: GenerateReportResponse = await sdk.reporting.generateReport(request);
```

## Development

```bash
# Install dependencies
pnpm install

# Build the SDK
pnpm run build

# Clean build artifacts
pnpm run clean

# Generate client from OpenAPI spec (if needed)
pnpm run generate
```

## License

Proprietary - TEEI Platform Team

## Support

For questions or issues, contact platform@teei.io
