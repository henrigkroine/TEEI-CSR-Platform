# Campaigns Service

Campaign creation and management service for TEEI CSR Platform.

## Overview

This service handles the creation and lifecycle management of campaigns, which are sellable CSR products linking program templates, beneficiary groups, companies, and commercial terms.

**Created by**: Agent 3.1 (campaign-instantiator) for SWARM 6

## Features

### Core Functions

1. **Campaign Creation** (`createCampaign`)
   - Validates input data with Zod schemas
   - Validates company existence
   - Validates template + beneficiary group compatibility
   - Validates config overrides
   - Creates campaign record in database
   - Auto-creates initial ProgramInstance (optional)

2. **Template-Group Compatibility** (`validateTemplateGroupCompatibility`)
   - Checks if template's program type is in group's eligible types
   - Verifies tag matching between template and group
   - Returns detailed compatibility report

3. **Config Merging** (`mergeConfigs`)
   - Deep merges template default config with campaign overrides
   - Tracks which fields were overridden
   - Validates type compatibility

4. **Instance Auto-Creation** (`createInitialInstance`)
   - Auto-creates ProgramInstance when campaign starts
   - Inherits merged config from template + campaign
   - Links to campaign with denormalized relationships

5. **Capacity Tracking** (`CapacityTracker`) - **Agent 3.3**
   - Tracks seat/credit/quota consumption per campaign
   - Enforces capacity limits (max 110% overage)
   - Calculates utilization percentages
   - Triggers alerts at thresholds (80%, 90%, 100%, 110%)
   - Supports all pricing models (seats, credits, IAAS, bundle)

6. **Capacity Alerts** (`CapacityAlertsManager`) - **Agent 3.3**
   - Sends capacity alerts to appropriate recipients
   - Smart throttling to avoid alert spam
   - Integrates with notifications service
   - Audit trail in database

## API

### Campaign Creation

```typescript
import { createCampaign } from './lib/campaign-instantiator.js';

const result = await createCampaign({
  name: 'Mentors for Syrian Refugees - Q1 2025',
  companyId: 'uuid',
  programTemplateId: 'uuid',
  beneficiaryGroupId: 'uuid',
  startDate: '2025-01-01',
  endDate: '2025-03-31',
  targetVolunteers: 50,
  targetBeneficiaries: 100,
  budgetAllocated: 25000,
  currency: 'EUR',
  pricingModel: 'seats',
  committedSeats: 50,
  seatPricePerMonth: 500,
  configOverrides: {
    sessionDuration: 90, // Override template default
  },
  tags: ['integration', 'employment'],
});

console.log('Campaign created:', result.campaign.id);
console.log('Instance created:', result.instance?.id);
```

### Validation

```typescript
import { validateTemplateGroupCompatibility } from './lib/campaign-validator.js';

const compatibility = await validateTemplateGroupCompatibility(
  templateId,
  groupId
);

if (!compatibility.isCompatible) {
  console.error('Incompatible:', compatibility.reasons);
}
```

### Config Merging

```typescript
import { mergeConfigs } from './lib/config-merger.js';

const { merged, overrides } = mergeConfigs(
  template.defaultConfig,
  campaign.configOverrides
);

console.log('Merged config:', merged);
console.log('Overridden fields:', overrides);
```

## Validation Rules

### Campaign Data Validation

- ✅ Name: 1-255 characters
- ✅ Start date < End date
- ✅ Target volunteers ≥ 1
- ✅ Target beneficiaries ≥ 1
- ✅ Budget allocated ≥ 0
- ✅ Currency: 3-letter ISO code

### Pricing Model Validation

- **Seats**: Requires `committedSeats` and `seatPricePerMonth`
- **Credits**: Requires `creditAllocation` and `creditConsumptionRate`
- **IAAS**: Requires `iaasMetrics` object
- **Bundle**: Requires `l2iSubscriptionId`
- **Custom**: Accepts any `customPricingTerms`

### Template-Group Compatibility

1. Template's `programType` must be in group's `eligibleProgramTypes`
2. Template's `suitableForGroups` tags must overlap with group's `tags` (if specified)
3. Both template and group must be active

## Testing

### Run Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Coverage report
pnpm test:coverage
```

### Test Coverage

The test suite includes:

- ✅ Config merger (simple, nested, type validation)
- ✅ Template-group compatibility validation
- ✅ Campaign creation with valid data
- ✅ Campaign creation with invalid data (dates, pricing, company)
- ✅ Config override application
- ✅ Program instance creation
- ✅ Instance config merging
- ✅ Existing instances check

**Target Coverage**: ≥90% (lines, branches, functions)

## Database Schema

### Campaigns Table

Key fields:
- `id`: UUID primary key
- `company_id`: FK to companies
- `program_template_id`: FK to program_templates
- `beneficiary_group_id`: FK to beneficiary_groups
- `start_date`, `end_date`: Campaign period
- `target_volunteers`, `current_volunteers`: Capacity tracking
- `target_beneficiaries`, `current_beneficiaries`: Beneficiary tracking
- `budget_allocated`, `budget_spent`: Financial tracking
- `pricing_model`: 'seats' | 'credits' | 'bundle' | 'iaas' | 'custom'
- `config_overrides`: JSONB - Campaign-specific config tweaks

### Program Instances Table

Key fields:
- `id`: UUID primary key
- `campaign_id`: FK to campaigns
- `program_template_id`, `company_id`, `beneficiary_group_id`: Denormalized
- `config`: JSONB - Merged template + campaign config
- `enrolled_volunteers`, `enrolled_beneficiaries`: Participant counts
- `total_sessions_held`, `total_hours_logged`: Activity tracking

## Architecture

```
┌─────────────────────────────────────────────┐
│         Campaign Creation Flow              │
└─────────────────────────────────────────────┘

1. Input Validation (Zod)
   ↓
2. Company Existence Check
   ↓
3. Template-Group Compatibility
   ↓
4. Config Override Validation
   ↓
5. Create Campaign Record
   ↓
6. Auto-Create ProgramInstance (optional)
   ↓
7. Return Result + Warnings
```

## Error Handling

The service throws `ValidationError` for:
- Invalid input data (Zod validation failures)
- Non-existent company
- Incompatible template-group pairing
- Invalid config overrides (type mismatches)

Example:
```typescript
try {
  const result = await createCampaign(input);
} catch (error) {
  if (error instanceof ValidationError) {
    console.error('Validation failed:', error.message);
    console.error('Field:', error.field);
    console.error('Code:', error.code);
  }
}
```

## Integration Points

### Dependencies

- `@teei/shared-schema`: Campaign, BeneficiaryGroup, ProgramTemplate schemas
- `@teei/shared-utils`: Logging utilities
- `drizzle-orm`: Database ORM
- `zod`: Input validation
- `postgres`: Database connection

### For Agent 3.6 (campaign-service-api)

This service provides the core business logic. Agent 3.6 will:
- Create REST/tRPC endpoints wrapping these functions
- Add authorization middleware
- Implement OpenAPI documentation
- Add rate limiting and security

Example endpoint:
```typescript
// POST /campaigns
app.post('/campaigns', async (req, reply) => {
  const result = await createCampaign(req.body);
  return result.campaign;
});
```

## Environment Variables

```bash
# Database
DATABASE_URL=postgresql://localhost:5432/teei_dev
DB_POOL_MIN=2
DB_POOL_MAX=10

# Service
PORT_CAMPAIGNS=3020

# Validation thresholds
NEAR_CAPACITY_THRESHOLD=0.8
OVER_CAPACITY_THRESHOLD=1.0
```

## Development

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Build
pnpm build

# Run production build
pnpm start
```

## Quality Checklist

- ✅ Template + group compatibility validated
- ✅ Config merging preserves type safety
- ✅ Auto-creates instance on campaign activation
- ✅ Unit tests ≥90% coverage
- ✅ Zod validation for inputs
- ✅ Detailed error messages
- ✅ Type-safe throughout (TypeScript strict mode)
- ✅ Database transactions for atomicity
- ✅ Logging for observability

## Next Steps

**Ready for Agent 3.6** to implement:
- REST/tRPC API endpoints
- Authorization (company admins only)
- Rate limiting
- OpenAPI documentation
- API tests (E2E)

## License

Private - TEEI CSR Platform

---

## Metrics Aggregator (Agent 3.5)

### Overview

The Metrics Aggregator aggregates SROI/VIS and other metrics from ProgramInstances to Campaigns, and creates time-series snapshots for dashboard charts.

### Core Functions

#### `aggregateCampaignMetrics(campaignId: string)`
Aggregates all metrics from ProgramInstances. Returns current volunteers, beneficiaries, sessions, hours, SROI, VIS, and capacity utilization.

#### `calculateCumulativeSROI(campaignId: string)`
Weighted average SROI: `Σ(instance.sroi × instance.beneficiaries) / Σ(beneficiaries)`

#### `calculateAverageVIS(campaignId: string)`
Simple average VIS across all volunteers in all instances.

#### `updateCampaignMetrics(campaignId: string)`
Updates campaigns table with aggregated metrics.

#### `createMetricsSnapshot(campaignId: string)`
Creates point-in-time snapshot for time-series dashboards.

#### `determineSnapshotFrequency(campaign: Campaign)`
Returns snapshot frequency: 1h (high activity >100 sessions/week), 6h (medium 25-100), 24h (low <25), or 0 (completed/draft).

### Cron Job

**File:** `src/jobs/aggregate-campaign-metrics.ts`  
**Schedule:** Hourly (0 * * * *)  
**Target:** <5 minutes for 500 campaigns  
**Concurrency:** 10 campaigns in parallel

```typescript
// Manual execution
import { runJobManually } from './jobs/aggregate-campaign-metrics.js';
const stats = await runJobManually();
```

### Testing

```bash
pnpm test services/campaigns/tests/metrics-aggregator.test.ts
pnpm test services/campaigns/tests/snapshots.test.ts
```

Coverage target: ≥85%

### Related Docs

- SWARM 6 Plan: `/SWARM_6_PLAN.md`
- Instance Lifecycle: `/docs/INSTANCE_LIFECYCLE.md` (Section 5)
- Metrics Retention: `/docs/METRICS_RETENTION_POLICY.md`

---

## Activity Association (Agent 3.2)

### Overview

The **Activity Associator** intelligently links ingested activities (sessions, matches, completions) to appropriate campaigns and program instances based on multiple matching criteria.

### Core Functions

#### 1. `associateSessionToCampaign()`

Associates a single activity to a campaign with confidence scoring.

```typescript
import { associateSessionToCampaign } from './lib/activity-associator.js';

const result = await associateSessionToCampaign(
  'session-123',
  'user-456',
  'company-789',
  new Date('2025-06-15')
);

console.log(`Campaign: ${result.campaignId}`);
console.log(`Confidence: ${result.confidence}%`);
console.log(`Requires review: ${result.requiresReview}`);
```

#### 2. `findEligibleCampaigns()`

Finds all campaigns that could potentially match an activity.

```typescript
import { findEligibleCampaigns } from './lib/activity-associator.js';

const eligibleCampaigns = await findEligibleCampaigns(
  'user-123',
  'company-456',
  new Date('2025-06-15')
);

eligibleCampaigns.forEach(sc => {
  console.log(`${sc.campaign.name}: ${sc.score}% confidence`);
  console.log(`Reasons: ${sc.reasons.join(', ')}`);
});
```

#### 3. `selectBestCampaign()`

Disambiguates between multiple eligible campaigns to select the best match.

```typescript
import { selectBestCampaign } from './lib/activity-associator.js';

const best = selectBestCampaign(scoredCampaigns);
console.log(`Best match: ${best.campaign.name} (${best.score}%)`);
```

### Matching Strategy

| Criteria | Points | Notes |
|----------|--------|-------|
| **Company Match** | 30 | MUST match (pre-filtered) |
| **Date Within Period** | 30 | MUST match (pre-filtered) |
| **Exact Beneficiary Group Match** | 40 | All user tags match all group tags |
| **Partial Beneficiary Group Match** | 20 | Some user tags overlap with group tags |
| **Active Campaign Bonus** | 10 | Campaign status = 'active' |

### Confidence Thresholds

| Threshold | Confidence Range | Action |
|-----------|-----------------|--------|
| **Auto-Associate** | >= 80% | Automatic association |
| **Manual Review** | 40% - 79% | Flag for manual review |
| **Ignore** | < 40% | Do not associate |

### Historical Data Backfill

Backfill historical activities that existed before the campaign system was implemented.

```typescript
import {
  backfillHistoricalSessions,
  backfillHistoricalMatches,
  backfillHistoricalCompletions,
  backfillAllHistoricalData,
} from './lib/backfill-associations.js';

// Backfill all historical data
const result = await backfillAllHistoricalData({
  batchSize: 100,
  dryRun: false, // Set to true to preview without writing
  companyId: 'company-123', // Optional: limit to specific company
  startDate: new Date('2025-01-01'), // Optional: only backfill after this date
  endDate: new Date('2025-12-31'), // Optional: only backfill before this date
});

console.log(`Sessions: ${result.sessions}`);
console.log(`Matches: ${result.matches}`);
console.log(`Completions: ${result.completions}`);
console.log(`Total: ${result.total}`);
```

### Backfill Options

```typescript
interface BackfillOptions {
  batchSize?: number;        // Records per batch (default: 100)
  startFrom?: number;        // Offset for resuming (default: 0)
  dryRun?: boolean;          // Don't write, just report (default: false)
  companyId?: string;        // Limit to specific company
  startDate?: Date;          // Only backfill after this date
  endDate?: Date;            // Only backfill before this date
}
```

### Testing Activity Associator

```bash
# Run unit tests
pnpm test -- tests/activity-associator.test.ts

# Run integration tests
pnpm test -- tests/backfill.test.ts

# Coverage report
pnpm test:coverage
```

**Target Coverage**: ≥85% (lines, branches, functions)

### Quality Checklist - Activity Associator

- ✅ Fuzzy matching with confidence scores
- ✅ Manual review queue for ambiguous matches (40-80% confidence)
- ✅ Backfill script tested on seed data
- ✅ No breaking changes to existing ingestion services
- ✅ Unit tests ≥85% coverage
- ✅ Integration tests for backfill functionality
- ✅ Error handling and graceful degradation
- ✅ Privacy-safe user matching (no PII)
- ✅ Performance optimizations (batching, indexing)

