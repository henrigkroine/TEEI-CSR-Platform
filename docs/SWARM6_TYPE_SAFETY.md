# SWARM 6: Type Safety Guide

**Status**: ✅ Complete
**Created**: 2025-11-22
**Agent**: Agent 2.4 (type-definitions-engineer)

---

## Overview

This document provides comprehensive guidance on using TypeScript types and Zod validation schemas for SWARM 6 entities (Beneficiary Groups, Campaigns, Program Templates, Program Instances, and Campaign Metrics).

All types are exported from the `@teei/shared-types` package and provide:
- **Type safety**: Full TypeScript support with proper type inference
- **Runtime validation**: Zod schemas for API input validation
- **Type guards**: Helper functions for type narrowing
- **Helper types**: Utility types for common operations

---

## Package Structure

```
packages/shared-types/src/
├── beneficiary-groups.ts    # Beneficiary group types & validation
├── campaigns.ts             # Campaign types & validation
├── program-templates.ts     # Template types & validation
├── program-instances.ts     # Instance types & validation
├── campaign-metrics.ts      # Metrics snapshot types & validation
└── index.ts                 # Exports all SWARM 6 types
```

---

## Beneficiary Groups

### Import

```typescript
import {
  // Types
  BeneficiaryGroup,
  BeneficiaryGroupType,
  AgeRange,
  EligibilityRules,

  // Schemas
  BeneficiaryGroupSchema,
  CreateBeneficiaryGroupSchema,
  UpdateBeneficiaryGroupSchema,
  FilterBeneficiaryGroupsSchema,

  // Type Guards
  isRefugeeGroup,
  isCompatibleWithProgram,
  hasAgeRestrictions,
} from '@teei/shared-types';
```

### Basic Usage

```typescript
// Validate API input
const createInput = CreateBeneficiaryGroupSchema.parse({
  name: "Syrian Refugees in Berlin",
  groupType: "refugees",
  countryCode: "DE",
  region: "Berlin",
  primaryLanguages: ["ar", "en"],
  eligibleProgramTypes: ["mentorship", "language"],
  ageRange: { min: 18, max: 45 },
  tags: ["integration", "employment", "refugees"],
});

// Type is inferred: CreateBeneficiaryGroupInput
```

### Type Guards

```typescript
const group: BeneficiaryGroup = await db.getBeneficiaryGroup(id);

// Check if refugee-related
if (isRefugeeGroup(group.groupType)) {
  // Handle refugee-specific logic
}

// Check program compatibility
if (isCompatibleWithProgram(group, "mentorship")) {
  // Create mentorship campaign
}

// Check age restrictions
if (hasAgeRestrictions(group)) {
  console.log(`Age range: ${group.ageRange.min}-${group.ageRange.max}`);
}
```

### Privacy Safeguards

The schemas enforce GDPR compliance:

```typescript
// ❌ FAILS - Email detected
CreateBeneficiaryGroupSchema.parse({
  name: "Contact john@example.com",
  // ... other fields
}); // Throws: "Group name must not contain email addresses"

// ❌ FAILS - Email in description
CreateBeneficiaryGroupSchema.parse({
  description: "Lead: jane@ngo.org",
  // ... other fields
}); // Throws: "Description must not contain email addresses"

// ✅ PASSES - No PII
CreateBeneficiaryGroupSchema.parse({
  name: "Syrian Refugees in Berlin",
  description: "Recent arrivals seeking employment support",
  // ... other fields
});
```

### Helper Types

```typescript
// Summary for list views
type Summary = BeneficiaryGroupSummary;
// = Pick<BeneficiaryGroup, 'id' | 'name' | 'groupType' | 'countryCode' | ...>

// Create with defaults
const defaults: BeneficiaryGroupCreateDefaults = {
  name: "Tech Women in Oslo",
  groupType: "women_in_tech",
  countryCode: "NO",
  primaryLanguages: ["no", "en"],
  eligibleProgramTypes: ["mentorship", "upskilling"],
  tags: ["tech", "women", "careers"],
};
```

---

## Campaigns

### Import

```typescript
import {
  // Types
  Campaign,
  CampaignStatus,
  PricingModel,
  IAASMetrics,

  // Schemas
  CampaignSchema,
  CreateCampaignSchema,
  UpdateCampaignSchema,
  FilterCampaignsSchema,

  // Type Guards
  isSeatsPricing,
  isCampaignActive,
  isCampaignNearCapacity,
  hasBudgetRemaining,
} from '@teei/shared-types';
```

### Basic Usage

```typescript
// Create campaign with seats pricing
const campaignInput = CreateCampaignSchema.parse({
  name: "Mentors for Syrian Refugees - Q1 2025",
  companyId: "uuid-here",
  programTemplateId: "template-uuid",
  beneficiaryGroupId: "group-uuid",

  startDate: "2025-01-01",
  endDate: "2025-03-31",
  quarter: "2025-Q1",

  targetVolunteers: 50,
  targetBeneficiaries: 100,

  budgetAllocated: 25000,
  currency: "EUR",

  pricingModel: "seats",
  committedSeats: 50,
  seatPricePerMonth: 500,

  tags: ["mentorship", "refugees", "employment"],
});
```

### Pricing Model Validation

Zod schemas enforce pricing model requirements:

```typescript
// ❌ FAILS - Seats pricing requires committedSeats and seatPricePerMonth
CreateCampaignSchema.parse({
  pricingModel: "seats",
  // Missing committedSeats and seatPricePerMonth
}); // Throws validation error

// ✅ PASSES - All required fields present
CreateCampaignSchema.parse({
  pricingModel: "seats",
  committedSeats: 50,
  seatPricePerMonth: 500,
  // ... other fields
});

// ❌ FAILS - IAAS pricing requires iaasMetrics
CreateCampaignSchema.parse({
  pricingModel: "iaas",
  // Missing iaasMetrics
}); // Throws validation error

// ✅ PASSES - IAAS with metrics
CreateCampaignSchema.parse({
  pricingModel: "iaas",
  iaasMetrics: {
    learnersCommitted: 100,
    pricePerLearner: 250,
    outcomesGuaranteed: ["job_readiness > 0.7"],
  },
  // ... other fields
});
```

### Type Guards & State Management

```typescript
const campaign: Campaign = await db.getCampaign(id);

// Check pricing model
if (isSeatsPricing(campaign)) {
  console.log(`Seats: ${campaign.currentVolunteers}/${campaign.committedSeats}`);
}

// Check status
if (isCampaignActive(campaign)) {
  // Campaign is running
}

// Check capacity
if (isCampaignNearCapacity(campaign, 0.8)) {
  // Send upsell notification
  await sendUpsellEmail(campaign.companyId, campaign.id);
}

// Check budget
if (!hasBudgetRemaining(campaign)) {
  // Alert: budget exhausted
}

// State transitions
if (canStartCampaign(campaign)) {
  await updateCampaignStatus(campaign.id, "active");
}

if (canPauseCampaign(campaign)) {
  await updateCampaignStatus(campaign.id, "paused");
}
```

### Helper Types

```typescript
// Summary for list views
const summary: CampaignSummary = {
  id: campaign.id,
  name: campaign.name,
  status: campaign.status,
  priority: campaign.priority,
  pricingModel: campaign.pricingModel,
  startDate: campaign.startDate,
  endDate: campaign.endDate,
  capacityUtilization: campaign.capacityUtilization,
  isNearCapacity: campaign.isNearCapacity,
  isOverCapacity: campaign.isOverCapacity,
  tags: campaign.tags,
  companyId: campaign.companyId,
};

// Capacity metrics
const capacity: CampaignCapacityMetrics = {
  volunteers: {
    target: campaign.targetVolunteers,
    current: campaign.currentVolunteers,
    utilization: parseFloat(campaign.capacityUtilization),
  },
  beneficiaries: {
    target: campaign.targetBeneficiaries,
    current: campaign.currentBeneficiaries,
    utilization: campaign.currentBeneficiaries / campaign.targetBeneficiaries,
  },
  sessions: {
    target: campaign.maxSessions,
    current: campaign.currentSessions,
    utilization: campaign.maxSessions
      ? campaign.currentSessions / campaign.maxSessions
      : null,
  },
  budget: {
    allocated: parseFloat(campaign.budgetAllocated),
    spent: parseFloat(campaign.budgetSpent),
    remaining: parseFloat(campaign.budgetAllocated) - parseFloat(campaign.budgetSpent),
    utilization: parseFloat(campaign.budgetSpent) / parseFloat(campaign.budgetAllocated),
  },
};
```

---

## Program Templates

### Import

```typescript
import {
  // Types
  ProgramTemplate,
  ProgramType,
  MentorshipConfig,
  LanguageConfig,
  BuddyConfig,

  // Schemas
  ProgramTemplateSchema,
  CreateProgramTemplateSchema,
  MentorshipConfigSchema,
  LanguageConfigSchema,

  // Type Guards
  isMentorshipConfig,
  isLanguageConfig,
  isTemplateAvailable,
  isTemplateSuitableForGroup,
} from '@teei/shared-types';
```

### Creating Templates

```typescript
// Mentorship template
const mentorshipTemplate = CreateProgramTemplateSchema.parse({
  name: "Mentorship 1-on-1 - Career Focus",
  programType: "mentorship",
  defaultConfig: {
    sessionFormat: "1-on-1",
    sessionDuration: 60,
    sessionFrequency: "weekly",
    totalDuration: 24,
    matchingCriteria: ["skills", "industry", "language"],
    autoMatching: false,
    focusAreas: ["career", "integration", "networking"],
    outcomesTracked: ["job_readiness", "confidence", "network_building"],
  } satisfies MentorshipConfig,
  outcomeMetrics: ["job_readiness", "confidence", "network_building"],
  suitableForGroups: ["refugees", "migrants", "newcomers"],
  defaultMinParticipants: 5,
  defaultMaxParticipants: 50,
  estimatedCostPerParticipant: 500,
  estimatedHoursPerVolunteer: 24,
});

// Language template
const languageTemplate = CreateProgramTemplateSchema.parse({
  name: "Language Learning - Group Sessions",
  programType: "language",
  defaultConfig: {
    classSizeMin: 3,
    classSizeMax: 12,
    sessionDuration: 90,
    sessionsPerWeek: 2,
    totalWeeks: 12,
    proficiencyLevels: ["A1", "A2", "B1"],
    targetLanguages: ["en", "no", "de"],
    deliveryMode: "hybrid",
    curriculumFocus: ["conversational", "business"],
    assessmentFrequency: "monthly",
    certificationOffered: true,
    textbookRequired: false,
  } satisfies LanguageConfig,
  outcomeMetrics: ["language", "integration", "confidence"],
  suitableForGroups: ["refugees", "migrants", "asylum_seekers"],
  defaultMinParticipants: 3,
  defaultMaxParticipants: 12,
});
```

### Type Guards

```typescript
const template: ProgramTemplate = await db.getTemplate(id);

// Check config type
if (isMentorshipConfig(template.defaultConfig)) {
  // TypeScript now knows this is MentorshipConfig
  console.log(`Session format: ${template.defaultConfig.sessionFormat}`);
  console.log(`Matching criteria: ${template.defaultConfig.matchingCriteria.join(', ')}`);
}

if (isLanguageConfig(template.defaultConfig)) {
  // TypeScript now knows this is LanguageConfig
  console.log(`Class size: ${template.defaultConfig.classSizeMin}-${template.defaultConfig.classSizeMax}`);
  console.log(`Levels: ${template.defaultConfig.proficiencyLevels.join(', ')}`);
}

// Check availability
if (isTemplateAvailable(template)) {
  // Template is active and not deprecated
}

// Check suitability
const groupTags = ["refugees", "employment", "integration"];
if (isTemplateSuitableForGroup(template, groupTags)) {
  // Template can be used for this group
}
```

---

## Program Instances

### Import

```typescript
import {
  // Types
  ProgramInstance,
  ProgramInstanceStatus,
  OutcomeScores,

  // Schemas
  ProgramInstanceSchema,
  CreateProgramInstanceSchema,
  UpdateInstanceMetricsSchema,

  // Type Guards
  isInstanceActive,
  canStartInstance,
  hasActivity,
  hasImpactMetrics,
} from '@teei/shared-types';
```

### Creating Instances

```typescript
const instanceInput = CreateProgramInstanceSchema.parse({
  name: "Mentors for Syrian Refugees - Cohort 1",
  campaignId: "campaign-uuid",

  startDate: "2025-01-15",
  endDate: "2025-07-15",

  config: {
    // Merged config from template + campaign overrides
    sessionFormat: "1-on-1",
    sessionDuration: 60,
    sessionFrequency: "weekly",
    totalDuration: 24,
    // ... other config fields
  },

  enrolledVolunteers: 25,
  enrolledBeneficiaries: 50,
});
```

### Type Guards & Lifecycle

```typescript
const instance: ProgramInstance = await db.getInstance(id);

// Check status
if (isInstanceActive(instance)) {
  // Instance is running
}

// State transitions
if (canStartInstance(instance)) {
  await startInstance(instance.id);
}

if (canPauseInstance(instance)) {
  await pauseInstance(instance.id);
}

if (canCompleteInstance(instance)) {
  await completeInstance(instance.id);
}

// Activity checks
if (hasActivity(instance)) {
  console.log(`Sessions: ${instance.totalSessionsHeld}`);
  console.log(`Hours: ${instance.totalHoursLogged}`);
}

if (hasImpactMetrics(instance)) {
  console.log(`SROI: ${instance.sroiScore}`);
  console.log(`VIS: ${instance.averageVISScore}`);
}
```

### Updating Metrics

```typescript
// Update instance metrics (from aggregation job)
const metricsUpdate = UpdateInstanceMetricsSchema.parse({
  totalSessionsHeld: 48,
  totalHoursLogged: 72.5,
  sroiScore: 4.2,
  averageVISScore: 78.5,
  outcomeScores: {
    integration: 0.72,
    job_readiness: 0.85,
    confidence: 0.81,
  },
  volunteersConsumed: 25,
  learnersServed: 50,
  lastActivityAt: new Date().toISOString(),
});

await db.updateInstanceMetrics(instanceId, metricsUpdate);
```

---

## Campaign Metrics (Time-Series)

### Import

```typescript
import {
  // Types
  CampaignMetricsSnapshot,
  TimeSeriesQuery,
  TimeSeriesResponse,
  CapacityAlert,

  // Schemas
  CampaignMetricsSnapshotSchema,
  CreateCampaignMetricsSnapshotSchema,
  TimeSeriesQuerySchema,

  // Type Guards
  isSnapshotNearCapacity,
  hasSnapshotAlerts,
  getCriticalAlerts,
} from '@teei/shared-types';
```

### Creating Snapshots

```typescript
const snapshotInput = CreateCampaignMetricsSnapshotSchema.parse({
  campaignId: "campaign-uuid",
  snapshotDate: new Date().toISOString(),

  // Capacity metrics
  volunteersTarget: 50,
  volunteersCurrent: 42,
  volunteersUtilization: 0.84,

  beneficiariesTarget: 100,
  beneficiariesCurrent: 87,
  beneficiariesUtilization: 0.87,

  sessionsTarget: 200,
  sessionsCurrent: 156,
  sessionsUtilization: 0.78,

  // Financial metrics
  budgetAllocated: 25000,
  budgetSpent: 18500,
  budgetRemaining: 6500,
  budgetUtilization: 0.74,

  // Impact metrics
  sroiScore: 4.2,
  averageVISScore: 78.5,
  totalHoursLogged: 1248.5,
  totalSessionsCompleted: 156,

  // Full snapshot
  fullSnapshot: {
    campaignName: "Mentors for Syrian Refugees - Q1 2025",
    status: "active",
    programTemplateId: "template-uuid",
    beneficiaryGroupId: "group-uuid",
    companyId: "company-uuid",

    alerts: [
      {
        type: "capacity_warning",
        threshold: 0.8,
        currentValue: 0.84,
        message: "Campaign approaching volunteer capacity (84%)",
      },
    ],
  },
});
```

### Type Guards

```typescript
const snapshot: CampaignMetricsSnapshot = await db.getLatestSnapshot(campaignId);

// Check capacity
if (isSnapshotNearCapacity(snapshot, 0.8)) {
  // Send upsell notification
}

if (isSnapshotOverCapacity(snapshot)) {
  // Critical alert
}

// Check budget
if (hasSnapshotBudgetWarning(snapshot, 0.9)) {
  // Budget running low
}

// Check alerts
if (hasSnapshotAlerts(snapshot)) {
  const criticalAlerts = getCriticalAlerts(snapshot);
  for (const alert of criticalAlerts) {
    await sendAlert(alert);
  }
}
```

### Time-Series Queries

```typescript
// Query time-series data
const query = TimeSeriesQuerySchema.parse({
  campaignId: "campaign-uuid",
  metrics: [
    "volunteersUtilization",
    "sroiScore",
    "totalHoursLogged",
  ],
  startDate: "2025-01-01T00:00:00Z",
  endDate: "2025-03-31T23:59:59Z",
  interval: "day",
  aggregation: "avg",
});

const response: TimeSeriesResponse = await api.queryTimeSeries(query);

// Plot data
for (const dataset of response.datasets) {
  console.log(`Metric: ${dataset.metric}`);
  for (const point of dataset.points) {
    console.log(`  ${point.timestamp}: ${point.value}`);
  }
}
```

---

## Common Patterns

### 1. API Validation Middleware

```typescript
import { z } from 'zod';
import { CreateCampaignSchema } from '@teei/shared-types';

export function validateBody<T extends z.ZodType>(schema: T) {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      req.body = schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({
          error: "Validation failed",
          details: error.errors,
        });
      } else {
        next(error);
      }
    }
  };
}

// Usage
app.post(
  '/campaigns',
  validateBody(CreateCampaignSchema),
  async (req, res) => {
    // req.body is now typed as CreateCampaignInput
    const campaign = await db.createCampaign(req.body);
    res.json(campaign);
  }
);
```

### 2. Type-Safe Database Queries

```typescript
import { Campaign, FilterCampaignsInput } from '@teei/shared-types';

export async function getCampaigns(
  filters: FilterCampaignsInput
): Promise<Campaign[]> {
  // Build query with type-safe filters
  let query = db.select().from(campaigns);

  if (filters.companyId) {
    query = query.where(eq(campaigns.companyId, filters.companyId));
  }

  if (filters.status) {
    query = query.where(eq(campaigns.status, filters.status));
  }

  if (filters.isNearCapacity) {
    query = query.where(gte(campaigns.capacityUtilization, '0.8'));
  }

  return await query;
}
```

### 3. Type Guards for Business Logic

```typescript
import { Campaign, isSeatsPricing, isCreditsPricing } from '@teei/shared-types';

export async function calculateRemainingCapacity(campaign: Campaign): Promise<number> {
  if (isSeatsPricing(campaign)) {
    return campaign.committedSeats! - campaign.currentVolunteers;
  }

  if (isCreditsPricing(campaign)) {
    return campaign.creditsRemaining!;
  }

  // Default: volunteer capacity
  return campaign.targetVolunteers - campaign.currentVolunteers;
}
```

### 4. Frontend Form Validation

```typescript
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CreateCampaignSchema, type CreateCampaignInput } from '@teei/shared-types';

export function CampaignCreateForm() {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CreateCampaignInput>({
    resolver: zodResolver(CreateCampaignSchema),
  });

  const onSubmit = async (data: CreateCampaignInput) => {
    await api.createCampaign(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <input {...register("name")} />
      {errors.name && <span>{errors.name.message}</span>}

      <select {...register("pricingModel")}>
        <option value="seats">Seats</option>
        <option value="credits">Credits</option>
        <option value="iaas">IAAS</option>
      </select>

      {/* ... more fields */}

      <button type="submit">Create Campaign</button>
    </form>
  );
}
```

---

## Common Pitfalls

### 1. Decimal Fields

Database decimal fields are returned as strings. Always parse them:

```typescript
// ❌ WRONG - Type error
const utilization: number = campaign.capacityUtilization;

// ✅ CORRECT
const utilization: number = parseFloat(campaign.capacityUtilization);

// ✅ ALSO CORRECT - Helper
const utilization = Number(campaign.capacityUtilization);
```

### 2. Nullable Fields

Check for null before accessing:

```typescript
// ❌ WRONG - Potential null reference
console.log(campaign.maxSessions.toString());

// ✅ CORRECT
if (campaign.maxSessions !== null) {
  console.log(campaign.maxSessions.toString());
}

// ✅ ALSO CORRECT - Optional chaining
console.log(campaign.maxSessions?.toString() ?? 'No limit');
```

### 3. Date Strings

Database dates are returned as ISO strings:

```typescript
// ❌ WRONG - Comparing strings directly (works but not semantic)
if (campaign.startDate < campaign.endDate) { ... }

// ✅ CORRECT - Convert to Date objects
if (new Date(campaign.startDate) < new Date(campaign.endDate)) { ... }

// ✅ ALSO CORRECT - Use helper
import { isWithinDateRange } from '@teei/shared-types';
if (isWithinDateRange(campaign)) { ... }
```

### 4. JSONB Type Safety

Use type guards to narrow JSONB field types:

```typescript
const template: ProgramTemplate = await db.getTemplate(id);

// ❌ WRONG - TypeScript doesn't know the config type
const duration = template.defaultConfig.sessionDuration; // Type error

// ✅ CORRECT - Use type guard
if (isMentorshipConfig(template.defaultConfig)) {
  const duration = template.defaultConfig.sessionDuration; // OK!
}

// ✅ ALSO CORRECT - Type assertion (use with caution)
const config = template.defaultConfig as MentorshipConfig;
const duration = config.sessionDuration;
```

---

## Testing

### Unit Tests

```typescript
import { describe, it, expect } from 'vitest';
import { CreateCampaignSchema, isCampaignNearCapacity } from '@teei/shared-types';

describe('Campaign validation', () => {
  it('validates seats pricing requirements', () => {
    const input = {
      pricingModel: 'seats',
      committedSeats: 50,
      seatPricePerMonth: 500,
      // ... other required fields
    };

    expect(() => CreateCampaignSchema.parse(input)).not.toThrow();
  });

  it('rejects seats pricing without required fields', () => {
    const input = {
      pricingModel: 'seats',
      // Missing committedSeats and seatPricePerMonth
      // ... other fields
    };

    expect(() => CreateCampaignSchema.parse(input)).toThrow();
  });
});

describe('Campaign type guards', () => {
  it('detects near capacity campaigns', () => {
    const campaign = {
      capacityUtilization: '0.85',
      // ... other fields
    } as Campaign;

    expect(isCampaignNearCapacity(campaign, 0.8)).toBe(true);
    expect(isCampaignNearCapacity(campaign, 0.9)).toBe(false);
  });
});
```

---

## Best Practices

1. **Always validate external input** - Use Zod schemas for API requests, form submissions
2. **Use type guards** - Prefer type guards over type assertions for runtime type narrowing
3. **Export types from shared-types** - Never duplicate type definitions
4. **Parse decimals properly** - Database decimals are strings, always parse to numbers
5. **Check nullable fields** - Use optional chaining or explicit null checks
6. **Use helper types** - Leverage summary types, metrics interfaces for cleaner code
7. **Document custom validations** - Add JSDoc comments for complex refinements
8. **Test validation logic** - Write unit tests for all Zod schemas

---

## API Reference

### Complete Type Exports

```typescript
// Beneficiary Groups
export {
  BeneficiaryGroup,
  BeneficiaryGroupType,
  GenderFocus,
  LanguageRequirement,
  LegalStatusCategory,
  EligibleProgramType,
  AgeRange,
  EligibilityRules,
  CreateBeneficiaryGroupInput,
  UpdateBeneficiaryGroupInput,
  FilterBeneficiaryGroupsInput,
  BeneficiaryGroupSummary,
} from '@teei/shared-types';

// Campaigns
export {
  Campaign,
  CampaignStatus,
  PricingModel,
  CampaignPriority,
  IAASMetrics,
  CustomPricingTerms,
  ConfigOverrides,
  CreateCampaignInput,
  UpdateCampaignInput,
  FilterCampaignsInput,
  CampaignSummary,
  CampaignCapacityMetrics,
  CampaignImpactMetrics,
  CampaignStateTransition,
} from '@teei/shared-types';

// Program Templates
export {
  ProgramTemplate,
  ProgramType,
  MentorshipConfig,
  LanguageConfig,
  BuddyConfig,
  UpskillingConfig,
  WeeiConfig,
  ProgramTemplateConfig,
  CreateProgramTemplateInput,
  UpdateProgramTemplateInput,
  FilterProgramTemplatesInput,
  ProgramTemplateSummary,
} from '@teei/shared-types';

// Program Instances
export {
  ProgramInstance,
  ProgramInstanceStatus,
  OutcomeScores,
  CreateProgramInstanceInput,
  UpdateProgramInstanceInput,
  FilterProgramInstancesInput,
  UpdateInstanceMetrics,
  ProgramInstanceSummary,
  InstanceParticipantMetrics,
  InstanceActivityMetrics,
  InstanceImpactMetrics,
} from '@teei/shared-types';

// Campaign Metrics
export {
  CampaignMetricsSnapshot,
  CreateCampaignMetricsSnapshotInput,
  FilterCampaignMetricsSnapshotsInput,
  TimeSeriesQuery,
  TimeSeriesResponse,
  CapacityAlert,
  CampaignComparison,
  BenchmarkResponse,
} from '@teei/shared-types';
```

---

## Summary

**Total Types Exported**: 100+
**Total Zod Schemas**: 40+
**Total Type Guards**: 35+

All SWARM 6 entities now have:
- ✅ Full TypeScript type definitions
- ✅ Comprehensive Zod validation schemas
- ✅ Helper types for common operations
- ✅ Type guards for runtime validation
- ✅ Privacy-first validation (beneficiary groups)
- ✅ Business logic validation (pricing models, state transitions)
- ✅ Documentation with examples
- ✅ No circular dependencies

**Ready for**: Agent 3.1, Agent 3.6, and all service implementations.
