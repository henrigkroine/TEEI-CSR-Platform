# Campaign Pricing Models

**SWARM 6: Beneficiary Groups, Campaigns & Monetization**  
**Agent 1.5: monetization-metadata-modeler**  
**Created**: 2025-11-22

---

## Overview

The TEEI CSR Platform supports **5 distinct pricing models** for campaigns, enabling flexible monetization strategies that align with different customer needs and use cases.

Each campaign must select **exactly one** pricing model via the `pricingModel` field. The model determines how capacity is tracked, how usage is billed, and what upsell triggers are activated.

---

## Pricing Model Matrix

| Model | Use Case | Billing Unit | Capacity Metric | Typical Customer |
|-------|----------|-------------|----------------|------------------|
| **SEATS** | Fixed volunteer capacity | Per seat/month | committedSeats | Large corporates with predictable programs |
| **CREDITS** | Pay-as-you-go impact | Per credit consumed | creditsRemaining | SMBs testing CSR initiatives |
| **BUNDLE** | Part of L2I subscription | % of bundle | bundleAllocationPercentage | Existing L2I customers |
| **IAAS** | Outcome-based pricing | Per learner served | learnersCommitted | Impact-focused enterprises |
| **CUSTOM** | Bespoke contracts | Negotiated terms | customPricingTerms | Strategic partnerships |

---

## 1. SEATS Model

### Concept
Pay a **fixed monthly fee per volunteer seat**, regardless of utilization. Similar to SaaS seat-based pricing.

### Example
- **Campaign**: "Mentors for Syrian Refugees"
- **committedSeats**: 50
- **seatPricePerMonth**: €500
- **Monthly Cost**: 50 × €500 = €25,000/month
- **Annual Cost**: €300,000

### Schema Fields

```typescript
pricingModel: 'seats'
committedSeats: 50           // Purchased volunteer slots
seatPricePerMonth: 500.00    // Price per seat (EUR)
```

### Capacity Tracking

```typescript
// Utilization = currentVolunteers / committedSeats
capacityUtilization: 0.85    // 85% utilized (42.5/50 seats used)
isNearCapacity: true         // Triggers upsell at 80%+
isOverCapacity: false        // Triggers expansion at 100%+
```

### Billing Integration

```typescript
// Monthly usage record sent to Stripe
{
  eventType: 'active_seats',
  quantity: 50,
  companyId: 'acme-corp',
  metadata: {
    campaignId: 'campaign-xyz',
    campaignName: 'Mentors for Syrian Refugees'
  }
}
```

### Upsell Triggers

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Near capacity | ≥80% seats used | Sales outreach: "Add 10 more seats?" |
| Over capacity | ≥100% seats used | CS alert: "Campaign at capacity, expansion needed" |
| High SROI | SROI > 5.0 | Sales: "Double your impact, add 50 seats" |

### When to Use
- Predictable volunteer programs (e.g., mentorship, buddy programs)
- Large corporates with budget certainty
- Long-term campaigns (6+ months)
- Programs with fixed volunteer cohorts

---

## 2. CREDITS Model

### Concept
Pre-purchase **impact credits**, then consume them per activity (hours, sessions, outcomes). Pay-as-you-go model.

### Example
- **Campaign**: "Language Connect for Newcomers"
- **creditAllocation**: 10,000 credits
- **creditConsumptionRate**: 5 credits/session-hour
- **Total Capacity**: 2,000 session-hours
- **Cost**: 10,000 credits × €0.50 = €5,000

### Schema Fields

```typescript
pricingModel: 'credits'
creditAllocation: 10000          // Total credits purchased
creditConsumptionRate: 5.0       // Credits per session-hour
creditsRemaining: 7500           // Credits left (updated in real-time)
```

### Capacity Tracking

```typescript
// Utilization = (creditAllocation - creditsRemaining) / creditAllocation
capacityUtilization: 0.25        // 25% consumed (2,500/10,000)
isNearCapacity: false            // Triggers at 80% credit depletion
isOverCapacity: false            // Triggers if credits go negative
```

### Consumption Logic

```typescript
// After each session
const sessionHours = 1.5;
const creditsConsumed = sessionHours * creditConsumptionRate; // 7.5 credits
creditsRemaining -= creditsConsumed; // 7,500 - 7.5 = 7,492.5

// Update campaign
UPDATE campaigns
SET creditsRemaining = 7492.5,
    capacityUtilization = (10000 - 7492.5) / 10000
WHERE id = 'campaign-xyz';
```

### Billing Integration

```typescript
// Usage record sent to Stripe after credits consumed
{
  eventType: 'impact_credits',
  quantity: 2500,  // Credits consumed this period
  companyId: 'startup-inc',
  metadata: {
    campaignId: 'campaign-xyz',
    creditsRemaining: 7500
  }
}
```

### Upsell Triggers

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Credits low | ≤20% remaining | CS: "Running low! Top up 5,000 credits?" |
| High engagement | >500 hours/month | Sales: "Upgrade to SEATS model for savings" |
| Overage | creditsRemaining < 0 | Pause campaign or auto-top-up |

### When to Use
- Variable-volume programs (e.g., language classes, upskilling)
- Startups testing CSR with limited budget
- Seasonal campaigns (3-6 months)
- Programs with unpredictable participation

---

## 3. BUNDLE Model

### Concept
Campaign is **part of a larger L2I subscription bundle**. Budget allocated as percentage of total bundle spend.

### Example
- **L2I Subscription**: L2I-500 (€50,000/year, 500 learners)
- **Campaign**: "Buddy Program for Migrants"
- **bundleAllocationPercentage**: 0.25 (25% of bundle)
- **Campaign Budget**: €12,500
- **Learner Allocation**: 125 learners

### Schema Fields

```typescript
pricingModel: 'bundle'
l2iSubscriptionId: 'l2i-sub-abc'           // FK to l2i_subscriptions
bundleAllocationPercentage: 0.25           // 25% of bundle
budgetAllocated: 12500.00                  // Auto-calculated from bundle
```

### Capacity Tracking

```typescript
// Derive from L2I subscription
const l2iBundle = await db.l2iSubscriptions.findUnique({
  where: { id: campaign.l2iSubscriptionId }
});

const bundleLearnersTotal = l2iBundle.learnersSupported; // 500
const campaignLearnersAllocation = bundleLearnersTotal * 0.25; // 125

// Utilization
capacityUtilization = currentBeneficiaries / campaignLearnersAllocation;
```

### Billing Integration

```typescript
// No separate billing - already billed via L2I subscription
// Track consumption for reporting only
{
  eventType: 'bundle_allocation_consumed',
  quantity: 0.25,  // 25% of bundle
  companyId: 'enterprise-co',
  metadata: {
    l2iSubscriptionId: 'l2i-sub-abc',
    campaignId: 'campaign-xyz',
    bundleUtilization: 0.65  // 65% of allocated budget spent
  }
}
```

### Upsell Triggers

| Condition | Threshold | Action |
|-----------|-----------|--------|
| High bundle usage | ≥80% across all campaigns | Sales: "Upgrade to L2I-EXPAND?" |
| Low campaign usage | ≤20% of allocation | CS: "Reallocate budget to high-performers?" |
| Bundle expiring | <30 days to renewal | Sales: "Renew + add new campaign?" |

### When to Use
- Existing L2I subscription customers
- Multi-campaign companies spreading budget
- Annual commitments with flexible allocation
- Customers wanting portfolio management

---

## 4. IAAS Model (Impact-as-a-Service)

### Concept
Pay **per learner served** with **guaranteed outcomes**. Performance-based pricing with SLA guarantees.

### Example
- **Campaign**: "Tech Upskilling for Refugees"
- **learnersCommitted**: 100
- **pricePerLearner**: €1,200
- **Total Cost**: €120,000
- **Guaranteed Outcomes**:
  - Job readiness score ≥ 0.7 (70%)
  - Language proficiency ≥ B1
  - SROI ≥ 3.0

### Schema Fields

```typescript
pricingModel: 'iaas'
iaasMetrics: {
  learnersCommitted: 100,
  pricePerLearner: 1200.00,
  outcomesGuaranteed: [
    'job_readiness >= 0.7',
    'language_proficiency >= B1',
    'sroi >= 3.0'
  ],
  outcomeThresholds: {
    sroi: 3.0,
    vis: 70,
    jobReadiness: 0.7
  }
}
```

### Capacity Tracking

```typescript
// Utilization = currentBeneficiaries / learnersCommitted
capacityUtilization = 85 / 100; // 0.85 (85%)

// Outcome validation
const actualSROI = campaign.cumulativeSROI; // 4.2
const guaranteedSROI = campaign.iaasMetrics.outcomeThresholds.sroi; // 3.0

const isSLAMet = actualSROI >= guaranteedSROI; // true
```

### Billing Integration

```typescript
// Milestone-based billing
// Invoice after each cohort completes + outcomes validated

{
  eventType: 'iaas_learners_completed',
  quantity: 25,  // Learners who completed program
  companyId: 'impact-corp',
  metadata: {
    campaignId: 'campaign-xyz',
    slaStatus: 'met',  // Outcomes met
    actualSROI: 4.2,
    guaranteedSROI: 3.0,
    invoiceAmount: 30000  // 25 × €1,200
  }
}
```

### SLA Enforcement

```typescript
// Post-campaign outcome validation
if (actualOutcomes < guaranteedOutcomes) {
  // Refund or credit
  const refundPercentage = calculateRefund(actualOutcomes, guaranteedOutcomes);
  // e.g., 10% refund if outcomes 90% met
}
```

### Upsell Triggers

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Exceeded outcomes | Actual SROI > 2× guaranteed | Sales: "Scale to 200 learners?" |
| High demand | Waitlist > 50 learners | CS: "Expand capacity mid-campaign?" |
| Multi-program fit | High engagement in one area | Sales: "Add mentorship IAAS?" |

### When to Use
- Outcome-focused enterprises (ESG mandates)
- Government/foundation grants with KPIs
- Pilot programs proving ROI
- High-stakes CSR initiatives (brand reputation)

---

## 5. CUSTOM Model

### Concept
**Bespoke pricing** for strategic partnerships, non-standard terms, or complex arrangements.

### Example Scenarios

#### Scenario A: Milestone Payments
```typescript
pricingModel: 'custom'
customPricingTerms: {
  description: 'Strategic partnership with phased payments',
  milestonePayments: [
    {
      milestone: 'Campaign launch',
      amount: 50000,
      dueDate: '2025-01-15'
    },
    {
      milestone: '50 volunteers enrolled',
      amount: 50000,
      dueDate: '2025-03-01'
    },
    {
      milestone: 'Campaign completion',
      amount: 100000,
      dueDate: '2025-06-30'
    }
  ]
}
```

#### Scenario B: Hybrid Variable Pricing
```typescript
customPricingTerms: {
  description: 'Base fee + variable per learner + outcome bonus',
  fixedFee: 25000,  // Quarterly base
  variableComponents: [
    {
      name: 'Per-learner fee',
      unit: 'learner',
      rate: 500,
      cap: 100  // Max 100 learners
    },
    {
      name: 'Outcome bonus',
      unit: 'sroi_point',
      rate: 1000,  // €1,000 per SROI point above 3.0
      cap: null
    }
  ]
}
```

### Billing Integration

```typescript
// Manual invoicing or custom Stripe setup
// No automated usage tracking
{
  eventType: 'custom_billing_milestone',
  companyId: 'partner-corp',
  metadata: {
    campaignId: 'campaign-xyz',
    milestone: 'Campaign launch',
    invoiceAmount: 50000,
    customTerms: {...}
  }
}
```

### When to Use
- Strategic partnerships (co-branded campaigns)
- Government contracts with complex terms
- Multi-year commitments with escalators
- Non-profit discounts or grant-funded programs

---

## Capacity Tracking Per Model

### Seats Model
```sql
SELECT
  c.id,
  c.committedSeats AS capacity,
  c.currentVolunteers AS utilized,
  ROUND(c.currentVolunteers::decimal / c.committedSeats, 4) AS utilization,
  (c.committedSeats - c.currentVolunteers) AS available
FROM campaigns c
WHERE c.pricing_model = 'seats';
```

### Credits Model
```sql
SELECT
  c.id,
  c.creditAllocation AS capacity,
  (c.creditAllocation - c.creditsRemaining) AS consumed,
  c.creditsRemaining AS available,
  ROUND((c.creditAllocation - c.creditsRemaining)::decimal / c.creditAllocation, 4) AS utilization
FROM campaigns c
WHERE c.pricing_model = 'credits';
```

### Bundle Model
```sql
SELECT
  c.id,
  c.bundleAllocationPercentage AS allocation,
  l2i.learnersSupported * c.bundleAllocationPercentage AS learner_capacity,
  c.currentBeneficiaries AS learners_served,
  ROUND(c.currentBeneficiaries::decimal / (l2i.learnersSupported * c.bundleAllocationPercentage), 4) AS utilization
FROM campaigns c
JOIN l2i_subscriptions l2i ON c.l2i_subscription_id = l2i.id
WHERE c.pricing_model = 'bundle';
```

### IAAS Model
```sql
SELECT
  c.id,
  (c.iaas_metrics->>'learnersCommitted')::int AS capacity,
  c.currentBeneficiaries AS served,
  c.cumulativeSROI AS actual_sroi,
  (c.iaas_metrics->'outcomeThresholds'->>'sroi')::decimal AS guaranteed_sroi,
  CASE
    WHEN c.cumulativeSROI >= (c.iaas_metrics->'outcomeThresholds'->>'sroi')::decimal
    THEN 'SLA Met'
    ELSE 'SLA At Risk'
  END AS sla_status
FROM campaigns c
WHERE c.pricing_model = 'iaas';
```

---

## Upsell Trigger Logic

### Automated Upsell Score Calculation

```typescript
/**
 * Calculate composite upsell opportunity score (0-100)
 * Factors:
 * - Capacity utilization (40 points)
 * - SROI performance (30 points)
 * - Engagement rate (20 points)
 * - Budget spend rate (10 points)
 */
export function calculateUpsellScore(campaign: Campaign): number {
  let score = 0;

  // 1. Capacity utilization (40 points max)
  const utilizationScore = Math.min(campaign.capacityUtilization * 40, 40);
  score += utilizationScore;

  // 2. SROI performance (30 points max)
  const sroiScore = Math.min((campaign.cumulativeSROI || 0) * 6, 30);
  score += sroiScore;

  // 3. Engagement rate (20 points max)
  const sessionRate = campaign.totalSessionsCompleted / Math.max(campaign.currentVolunteers, 1);
  const engagementScore = Math.min(sessionRate * 2, 20);
  score += engagementScore;

  // 4. Budget spend rate (10 points max)
  const spendRate = parseFloat(campaign.budgetSpent) / parseFloat(campaign.budgetAllocated);
  const budgetScore = Math.min(spendRate * 10, 10);
  score += budgetScore;

  return Math.round(score);
}
```

### Upsell Segmentation

| Score | Priority | Action |
|-------|----------|--------|
| 80-100 | **Hot Lead** | Immediate sales call, expansion proposal ready |
| 60-79 | **Warm Lead** | Automated email: "You're crushing it! Scale up?" |
| 40-59 | **Watch List** | CS check-in: "How can we help you grow?" |
| 0-39 | **Nurture** | Monthly newsletter, success stories |

---

## Integration with Billing System

### Linking to Existing Billing Tables

```typescript
// campaigns.l2iSubscriptionId → l2iSubscriptions.id
// Enables bundle pricing model

// Example query: All bundle campaigns for a subscription
SELECT c.*
FROM campaigns c
WHERE c.l2i_subscription_id = 'l2i-sub-abc'
  AND c.pricing_model = 'bundle';
```

### Usage Metering to billingUsageRecords

```typescript
// Example: Report seats usage monthly
await db.billingUsageRecords.create({
  data: {
    companyId: campaign.companyId,
    eventType: 'active_seats',
    quantity: campaign.committedSeats,
    eventTimestamp: new Date(),
    metadata: {
      campaignId: campaign.id,
      campaignName: campaign.name,
      pricingModel: 'seats'
    }
  }
});
```

### Invoice Line Items

```typescript
// Generate invoice line item for campaign
const lineItem = {
  description: `Campaign: ${campaign.name} (${campaign.pricingModel})`,
  quantity: getQuantity(campaign), // Depends on pricing model
  unitPrice: getUnitPrice(campaign),
  amount: calculateAmount(campaign),
  period: {
    start: campaign.startDate,
    end: campaign.endDate
  }
};

function getQuantity(campaign: Campaign): number {
  switch (campaign.pricingModel) {
    case 'seats': return campaign.committedSeats;
    case 'credits': return campaign.creditAllocation - campaign.creditsRemaining;
    case 'iaas': return campaign.currentBeneficiaries;
    default: return 1;
  }
}
```

---

## TypeScript Types for JSONB Fields

### IAAS Metrics Type

```typescript
export interface IAASMetrics {
  learnersCommitted: number;
  pricePerLearner: number;
  outcomesGuaranteed: string[]; // Human-readable conditions
  outcomeThresholds?: {
    sroi?: number;
    vis?: number;
    jobReadiness?: number;
    languageProficiency?: string; // 'A1', 'B1', etc.
    [key: string]: number | string | undefined;
  };
}
```

### Custom Pricing Terms Type

```typescript
export interface CustomPricingTerms {
  description?: string;
  fixedFee?: number;
  variableComponents?: Array<{
    name: string;
    unit: 'hour' | 'session' | 'learner' | 'outcome' | string;
    rate: number;
    cap?: number;
  }>;
  milestonePayments?: Array<{
    milestone: string;
    amount: number;
    dueDate?: string; // ISO date
  }>;
}
```

---

## Database Constraints & Validation

### Check Constraints (Future Migration)

```sql
-- Seats model requires committedSeats and seatPricePerMonth
ALTER TABLE campaigns
ADD CONSTRAINT chk_seats_pricing
CHECK (
  pricing_model != 'seats' OR
  (committed_seats IS NOT NULL AND seat_price_per_month IS NOT NULL)
);

-- Credits model requires allocation and consumption rate
ALTER TABLE campaigns
ADD CONSTRAINT chk_credits_pricing
CHECK (
  pricing_model != 'credits' OR
  (credit_allocation IS NOT NULL AND credit_consumption_rate IS NOT NULL)
);

-- Bundle model requires L2I subscription
ALTER TABLE campaigns
ADD CONSTRAINT chk_bundle_pricing
CHECK (
  pricing_model != 'bundle' OR
  (l2i_subscription_id IS NOT NULL AND bundle_allocation_percentage IS NOT NULL)
);

-- IAAS model requires metrics
ALTER TABLE campaigns
ADD CONSTRAINT chk_iaas_pricing
CHECK (
  pricing_model != 'iaas' OR
  iaas_metrics IS NOT NULL
);
```

---

## Examples: Complete Campaign Records

### Example 1: Seats Model
```typescript
{
  name: "Mentors for Syrian Refugees - Q1 2025",
  companyId: "acme-corp",
  programTemplateId: "mentorship-1on1",
  beneficiaryGroupId: "syrian-refugees-de",
  startDate: "2025-01-01",
  endDate: "2025-03-31",
  quarter: "2025-Q1",
  status: "active",
  targetVolunteers: 50,
  targetBeneficiaries: 50,
  budgetAllocated: 75000.00,
  currency: "EUR",
  pricingModel: "seats",
  committedSeats: 50,
  seatPricePerMonth: 500.00,
  // Auto-calculated fields
  currentVolunteers: 42,
  capacityUtilization: 0.84,
  isNearCapacity: true
}
```

### Example 2: Credits Model
```typescript
{
  name: "Language Connect for Newcomers",
  companyId: "startup-inc",
  programTemplateId: "language-group",
  beneficiaryGroupId: "migrants-no",
  startDate: "2025-02-01",
  endDate: "2025-04-30",
  status: "active",
  targetVolunteers: 20,
  targetBeneficiaries: 100,
  budgetAllocated: 5000.00,
  currency: "EUR",
  pricingModel: "credits",
  creditAllocation: 10000,
  creditConsumptionRate: 5.0,
  creditsRemaining: 7500,
  // Calculation: 2500 credits used = 500 session-hours
  capacityUtilization: 0.25
}
```

### Example 3: IAAS Model
```typescript
{
  name: "Tech Upskilling for Refugees",
  companyId: "impact-corp",
  programTemplateId: "upskilling-tech",
  beneficiaryGroupId: "refugees-eu",
  startDate: "2025-01-01",
  endDate: "2025-12-31",
  status: "active",
  targetVolunteers: 30,
  targetBeneficiaries: 100,
  budgetAllocated: 120000.00,
  currency: "EUR",
  pricingModel: "iaas",
  iaasMetrics: {
    learnersCommitted: 100,
    pricePerLearner: 1200.00,
    outcomesGuaranteed: [
      "job_readiness >= 0.7",
      "sroi >= 3.0",
      "certification_rate >= 0.8"
    ],
    outcomeThresholds: {
      sroi: 3.0,
      vis: 70,
      jobReadiness: 0.7,
      certificationRate: 0.8
    }
  },
  currentBeneficiaries: 85,
  cumulativeSROI: 4.2, // Exceeding guarantee!
  capacityUtilization: 0.85
}
```

---

## Migration Path: Changing Pricing Models

### Scenario: Startup graduates from Credits → Seats

```typescript
// Original campaign (credits)
{
  pricingModel: 'credits',
  creditAllocation: 10000,
  creditsRemaining: 2500
}

// New campaign (seats) - close old, create new
await db.campaigns.update({
  where: { id: 'old-campaign' },
  data: { status: 'closed', endDate: today }
});

await db.campaigns.create({
  data: {
    name: 'Mentors for Newcomers - Seats V2',
    companyId: sameCompany,
    programTemplateId: sameTemplate,
    beneficiaryGroupId: sameGroup,
    startDate: today,
    endDate: nextQuarter,
    pricingModel: 'seats',
    committedSeats: 50,
    seatPricePerMonth: 500,
    // Carry over learners
    currentVolunteers: oldCampaign.currentVolunteers,
    currentBeneficiaries: oldCampaign.currentBeneficiaries
  }
});
```

---

## Summary

### All 4 Pricing Models Supported
✅ **SEATS**: Fixed monthly pricing per volunteer slot  
✅ **CREDITS**: Pay-as-you-go impact credits  
✅ **BUNDLE**: Allocation from L2I subscription  
✅ **IAAS**: Outcome-based per-learner pricing  
✅ **CUSTOM**: Bespoke negotiated terms

### Upsell Triggers Defined
✅ Capacity utilization thresholds (80%, 100%)  
✅ High-value campaign indicators (SROI, VIS)  
✅ Automated upsell scoring (0-100)  
✅ Credits depletion alerts

### Integration with Billing Schema
✅ Foreign key to `l2iSubscriptions` for bundle model  
✅ Usage events map to `billingUsageRecords`  
✅ Invoice line items generation logic  
✅ No breaking changes to existing billing tables

### TypeScript Types for JSONB
✅ IAASMetrics interface  
✅ CustomPricingTerms interface  
✅ Type-safe JSONB field access

---

**Ready for**: Agent 2.1 (Drizzle schemas), Agent 5.1 (billing integration), Agent 5.2 (usage tracking)
