# Agent 1.5: Monetization Metadata Modeler - Delivery Report

**SWARM 6: Beneficiary Groups, Campaigns & Monetization**  
**Agent**: 1.5 (monetization-metadata-modeler)  
**Status**: ✅ COMPLETE  
**Date**: 2025-11-22

---

## Mission Accomplished

Extended the Campaign schema with comprehensive commercial pricing fields to support seats, credits, IAAS, bundle, and custom pricing models.

---

## Deliverables

### 1. Enhanced Campaigns Schema ✅

**File**: `/home/user/TEEI-CSR-Platform/packages/shared-schema/src/schema/campaigns.ts`

**Size**: 14KB (414 lines)

**Contents**:
- 3 enums: `campaignStatusEnum`, `pricingModelEnum`, `campaignPriorityEnum`
- 1 table: `campaigns` with 50+ fields
- Type exports: `Campaign`, `NewCampaign`
- Helper functions: pricing model type guards, capacity calculation utilities

#### Pricing Model Fields by Type

**SEATS Model** (Fixed monthly per volunteer seat):
```typescript
pricingModel: 'seats'
committedSeats: integer           // Purchased volunteer slots
seatPricePerMonth: decimal(10,2)  // Price per seat
```

**CREDITS Model** (Pay-as-you-go impact credits):
```typescript
pricingModel: 'credits'
creditAllocation: integer                    // Total credits
creditConsumptionRate: decimal(10,4)         // Credits per hour/session
creditsRemaining: integer                    // Available credits
```

**IAAS Model** (Impact-as-a-Service, outcome-based):
```typescript
pricingModel: 'iaas'
iaasMetrics: jsonb {
  learnersCommitted: number
  pricePerLearner: number
  outcomesGuaranteed: string[]
  outcomeThresholds: { sroi: number, vis: number, ... }
}
```

**BUNDLE Model** (L2I subscription allocation):
```typescript
pricingModel: 'bundle'
l2iSubscriptionId: uuid                              // FK to l2i_subscriptions
bundleAllocationPercentage: decimal(5,4)             // 0.25 = 25%
```

**CUSTOM Model** (Bespoke pricing):
```typescript
pricingModel: 'custom'
customPricingTerms: jsonb {
  description: string
  fixedFee: number
  variableComponents: Array<{ name, unit, rate, cap }>
  milestonePayments: Array<{ milestone, amount, dueDate }>
}
```

#### Upsell Indicator Fields

```typescript
// Calculated fields for sales intelligence
capacityUtilization: decimal(5,4)      // 0.85 = 85% utilized
isNearCapacity: boolean                // Trigger at 80%+
isOverCapacity: boolean                // Trigger at 100%+
isHighValue: boolean                   // High SROI/VIS/engagement
upsellOpportunityScore: integer        // 0-100 composite score
```

#### Foreign Keys & Integration Points

```typescript
// Existing tables
companyId: uuid → companies.id
l2iSubscriptionId: uuid → l2iSubscriptions.id

// Future tables (created by other agents)
programTemplateId: uuid  // → program_templates.id (Agent 1.3)
beneficiaryGroupId: uuid // → beneficiary_groups.id (Agent 1.1)
```

#### Indexes for Performance

- `campaigns_company_id_idx` - Company-level queries
- `campaigns_pricing_model_idx` - Filter by pricing model
- `campaigns_l2i_subscription_id_idx` - Bundle allocations
- `campaigns_capacity_utilization_idx` - Upsell queries
- `campaigns_upsell_score_idx` - Sales prioritization
- `campaigns_quarter_idx` - Reporting by quarter
- 5 additional indexes for status, dates, templates, groups

**Total Indexes**: 11

---

### 2. Pricing Models Documentation ✅

**File**: `/home/user/TEEI-CSR-Platform/docs/CAMPAIGN_PRICING_MODELS.md`

**Size**: 21KB (964 lines)

**Contents**:

#### Comprehensive Guides for Each Model
- **SEATS**: Fixed monthly pricing per volunteer slot (e.g., 50 seats × €500/mo)
- **CREDITS**: Pay-as-you-go with consumption tracking (e.g., 10,000 credits @ €0.50 each)
- **BUNDLE**: Portion of L2I subscription (e.g., 25% of L2I-500)
- **IAAS**: Per-learner with outcome guarantees (e.g., €1,200/learner with SROI ≥ 3.0)
- **CUSTOM**: Bespoke contracts with milestone payments

#### Capacity Tracking Examples
- SQL queries for each pricing model
- Utilization calculation formulas
- Capacity threshold logic

#### Upsell Trigger Logic
- Automated upsell score calculation (0-100)
- Segmentation by score: Hot (80-100), Warm (60-79), Watch (40-59), Nurture (0-39)
- Threshold-based triggers (80% capacity, 20% credits remaining)

#### Integration Specifications
- Linking to `l2iSubscriptions` table
- Usage metering to `billingUsageRecords`
- Invoice line item generation
- Stripe integration patterns

#### TypeScript Type Definitions
```typescript
interface IAASMetrics {
  learnersCommitted: number;
  pricePerLearner: number;
  outcomesGuaranteed: string[];
  outcomeThresholds?: { [key: string]: number };
}

interface CustomPricingTerms {
  description?: string;
  fixedFee?: number;
  variableComponents?: Array<{...}>;
  milestonePayments?: Array<{...}>;
}
```

#### Complete Examples
- 3 full campaign records (Seats, Credits, IAAS models)
- Migration path: Credits → Seats upgrade scenario
- SLA enforcement logic for IAAS model

---

### 3. Schema Index Update ✅

**File**: `/home/user/TEEI-CSR-Platform/packages/shared-schema/src/schema/index.ts`

**Change**: Added export for campaigns schema
```typescript
export * from './campaigns.js';
```

---

## Quality Checklist

### All 4 Pricing Models Supported ✅
- ✅ **SEATS**: committedSeats, seatPricePerMonth
- ✅ **CREDITS**: creditAllocation, creditConsumptionRate, creditsRemaining
- ✅ **BUNDLE**: l2iSubscriptionId, bundleAllocationPercentage
- ✅ **IAAS**: iaasMetrics (learners, price, outcomes, thresholds)
- ✅ **CUSTOM**: customPricingTerms (flexible JSONB)

### Upsell Triggers Clearly Defined ✅
- ✅ capacityUtilization field (decimal 0-1+)
- ✅ isNearCapacity boolean (≥80%)
- ✅ isOverCapacity boolean (≥100%)
- ✅ upsellOpportunityScore (0-100 composite)
- ✅ Documentation with scoring algorithm

### Integration with Billing Schema Documented ✅
- ✅ Foreign key to l2iSubscriptions (bundle model)
- ✅ Usage metering patterns documented
- ✅ Invoice line item generation logic
- ✅ No breaking changes to existing billing tables

### No Breaking Changes to Existing Billing Tables ✅
- ✅ Only reads from l2iSubscriptions (FK reference)
- ✅ Optional writes to billingUsageRecords (existing table)
- ✅ No schema modifications to billing.ts
- ✅ Backward compatible with existing L2I bundles

### TypeScript Types for JSONB Fields ✅
- ✅ IAASMetrics type defined with full structure
- ✅ CustomPricingTerms type with nested arrays
- ✅ configOverrides type for template tweaks
- ✅ All JSONB fields have .$type<T>() annotations

---

## Technical Highlights

### 1. Flexible JSONB Design
The use of JSONB for IAAS metrics and custom pricing allows:
- **Extensibility**: Add new outcome metrics without migrations
- **Validation**: Can implement runtime validation with Zod
- **Querying**: PostgreSQL JSONB operators for filtering
- **Type Safety**: TypeScript types ensure compile-time checks

### 2. Composite Upsell Score
The `upsellOpportunityScore` aggregates:
- 40 points: Capacity utilization
- 30 points: SROI performance
- 20 points: Engagement rate
- 10 points: Budget spend rate

This enables data-driven sales prioritization.

### 3. Multi-Model Capacity Tracking
Each pricing model has unique capacity semantics:
- **SEATS**: currentVolunteers / committedSeats
- **CREDITS**: (allocated - remaining) / allocated
- **BUNDLE**: beneficiaries / (bundle × allocation%)
- **IAAS**: beneficiaries / learnersCommitted

Unified in `capacityUtilization` field for cross-model analytics.

### 4. Foreign Key to L2I Subscriptions
The `l2iSubscriptionId` field enables:
- Bundle campaigns automatically inherit subscription period
- Portfolio view of all campaigns under one L2I bundle
- Allocation tracking across multiple campaigns
- Automatic rollover on subscription renewal

---

## Integration Points

### Ready for Agent 2.1 (Drizzle Schema Engineer)
- ✅ Drizzle schema complete with all field definitions
- ✅ Indexes specified for query optimization
- ✅ Foreign keys ready for constraint addition
- ⚠️ Note: programTemplateId and beneficiaryGroupId FKs need constraint when those tables exist

### Ready for Agent 5.1 (Billing Integrator)
- ✅ l2iSubscriptionId FK documented
- ✅ Usage tracking patterns defined
- ✅ Invoice line item generation logic
- ✅ Stripe integration examples

### Ready for Agent 5.2 (Seat/Credit Tracker)
- ✅ committedSeats, creditsRemaining fields
- ✅ Consumption tracking logic documented
- ✅ Utilization calculation helpers
- ✅ Alert thresholds specified

---

## Files Modified/Created

| File | Type | Lines | Status |
|------|------|-------|--------|
| `packages/shared-schema/src/schema/campaigns.ts` | Created | 414 | ✅ Complete |
| `docs/CAMPAIGN_PRICING_MODELS.md` | Created | 964 | ✅ Complete |
| `packages/shared-schema/src/schema/index.ts` | Modified | +1 | ✅ Updated |
| `reports/AGENT_1_5_MONETIZATION_DELIVERY.md` | Created | (this file) | ✅ Complete |

**Total**: 4 files, ~1,400 lines of code/documentation

---

## Next Steps for Other Agents

### Agent 2.1: Drizzle Schema Engineer
- Add FK constraints for programTemplateId → program_templates.id
- Add FK constraints for beneficiaryGroupId → beneficiary_groups.id
- Create migration file for campaigns table
- Add check constraints for pricing model validation (optional)

### Agent 5.1: Billing Integrator
- Implement `linkCampaignToL2ISubscription()` function
- Create usage tracking jobs for each pricing model
- Build invoice line item generator
- Test bundle allocation logic

### Agent 5.2: Seat/Credit Tracker
- Implement `trackSeatUsage()` function
- Implement `consumeCredits()` function
- Build capacity alert system (80%, 100% thresholds)
- Create usage dashboard queries

### Agent 5.4: Upsell Opportunity Analyzer
- Implement `calculateUpsellScore()` algorithm
- Build upsell segmentation queries
- Create sales outreach templates
- Generate pricing recommendations

---

## Validation & Testing Recommendations

### Schema Validation
```sql
-- Test all pricing models can be created
INSERT INTO campaigns (pricing_model, ...) VALUES ('seats', ...);
INSERT INTO campaigns (pricing_model, ...) VALUES ('credits', ...);
INSERT INTO campaigns (pricing_model, ...) VALUES ('bundle', ...);
INSERT INTO campaigns (pricing_model, ...) VALUES ('iaas', ...);
INSERT INTO campaigns (pricing_model, ...) VALUES ('custom', ...);
```

### JSONB Field Validation
```typescript
// Test IAAS metrics parsing
const iaasMetrics: IAASMetrics = campaign.iaasMetrics;
expect(iaasMetrics.learnersCommitted).toBe(100);

// Test custom pricing parsing
const customTerms: CustomPricingTerms = campaign.customPricingTerms;
expect(customTerms.milestonePayments).toHaveLength(3);
```

### Capacity Calculation Tests
```typescript
// Test seats utilization
expect(calculateCapacityUtilization(42, 50)).toBe(0.84);

// Test near capacity detection
expect(isNearCapacity(0.85)).toBe(true);
expect(isOverCapacity(1.05)).toBe(true);
```

### Foreign Key Tests
```sql
-- Test L2I subscription link
SELECT c.*, l2i.*
FROM campaigns c
JOIN l2i_subscriptions l2i ON c.l2i_subscription_id = l2i.id
WHERE c.pricing_model = 'bundle';
```

---

## Success Criteria Met

✅ **All 4 pricing models supported** (seats, credits, bundle, iaas, custom)  
✅ **Upsell triggers clearly defined** (capacity%, score, flags)  
✅ **Integration with billing schema documented** (FK, usage metering, invoicing)  
✅ **No breaking changes to existing billing tables** (read-only FK)  
✅ **TypeScript types for JSONB fields** (IAASMetrics, CustomPricingTerms)

---

## Agent 1.5 Output Format

```
AGENT 1.5 COMPLETE
Files Enhanced: campaigns.ts (created), index.ts (updated)
Documentation: CAMPAIGN_PRICING_MODELS.md (21KB)
Pricing Models: 4 types (SEATS, CREDITS, BUNDLE, IAAS, CUSTOM)
Upsell Fields: capacityUtilization, isNearCapacity, isOverCapacity, upsellOpportunityScore
Integration: Foreign key to l2iSubscriptions, usage metering patterns documented
Ready for: Agent 2.1 (migrations), Agent 5.1 (billing), Agent 5.2 (tracking)
```

---

**END OF DELIVERY REPORT**
