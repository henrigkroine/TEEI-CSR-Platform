# Campaign Pricing Models - Quick Reference

**5 Pricing Models | 11 Indexes | 50+ Fields**

---

## Pricing Model Decision Tree

```
START: Choose your pricing model
│
├─ Fixed volunteer capacity, predictable budget?
│  └─ YES → SEATS (€500/seat/month × 50 seats = €25k/mo)
│
├─ Variable usage, testing CSR programs?
│  └─ YES → CREDITS (10,000 credits @ €0.50 = €5k, pay-as-you-go)
│
├─ Already have L2I subscription?
│  └─ YES → BUNDLE (25% of L2I-500 = €12.5k + 125 learners)
│
├─ Outcome-focused, SLA guarantees needed?
│  └─ YES → IAAS (€1,200/learner × 100 = €120k, SROI ≥ 3.0 guaranteed)
│
└─ Strategic partnership, complex terms?
   └─ YES → CUSTOM (milestone payments, hybrid pricing)
```

---

## Field Requirements by Pricing Model

| Field | SEATS | CREDITS | BUNDLE | IAAS | CUSTOM |
|-------|-------|---------|--------|------|--------|
| `pricingModel` | ✅ 'seats' | ✅ 'credits' | ✅ 'bundle' | ✅ 'iaas' | ✅ 'custom' |
| `committedSeats` | ✅ Required | ❌ | ❌ | ❌ | ❌ |
| `seatPricePerMonth` | ✅ Required | ❌ | ❌ | ❌ | ❌ |
| `creditAllocation` | ❌ | ✅ Required | ❌ | ❌ | ❌ |
| `creditConsumptionRate` | ❌ | ✅ Required | ❌ | ❌ | ❌ |
| `creditsRemaining` | ❌ | ✅ Tracked | ❌ | ❌ | ❌ |
| `l2iSubscriptionId` | ❌ | ❌ | ✅ Required | ❌ | ❌ |
| `bundleAllocationPercentage` | ❌ | ❌ | ✅ Required | ❌ | ❌ |
| `iaasMetrics` | ❌ | ❌ | ❌ | ✅ Required | ❌ |
| `customPricingTerms` | ❌ | ❌ | ❌ | ❌ | ✅ Required |

---

## Upsell Trigger Thresholds

```typescript
// Capacity-based triggers
capacityUtilization >= 0.80 && < 1.0  → isNearCapacity = true   (Sales: "Add capacity?")
capacityUtilization >= 1.0             → isOverCapacity = true   (CS: "Expansion needed!")

// Credits-based triggers
creditsRemaining <= (creditAllocation * 0.20) → Alert: "20% credits left"

// Value-based triggers
cumulativeSROI > 5.0 && isNearCapacity → isHighValue = true (Sales: "Scale your impact!")

// Composite upsell score (0-100)
score = capacityUtilization*40 + SROI*6 + sessionRate*2 + spendRate*10
score >= 80 → HOT LEAD  (immediate sales call)
score >= 60 → WARM LEAD (automated email)
score >= 40 → WATCH LIST (CS check-in)
```

---

## Example Records

### SEATS: "Mentors for Syrian Refugees"
```typescript
{
  pricingModel: 'seats',
  committedSeats: 50,
  seatPricePerMonth: 500.00,
  targetVolunteers: 50,
  currentVolunteers: 42,
  capacityUtilization: 0.84,  // 84% utilized
  isNearCapacity: true         // Trigger upsell!
}
// Revenue: 50 × €500 = €25,000/month
```

### CREDITS: "Language Connect"
```typescript
{
  pricingModel: 'credits',
  creditAllocation: 10000,
  creditConsumptionRate: 5.0,  // 5 credits/session-hour
  creditsRemaining: 7500,
  capacityUtilization: 0.25    // 25% consumed
}
// Revenue: 10,000 credits × €0.50 = €5,000 (one-time)
// Capacity: 2,000 session-hours total
```

### BUNDLE: "Buddy Program"
```typescript
{
  pricingModel: 'bundle',
  l2iSubscriptionId: 'l2i-sub-abc',
  bundleAllocationPercentage: 0.25,  // 25% of L2I-500
  budgetAllocated: 12500.00,         // Auto-calculated
  targetBeneficiaries: 125           // 500 learners × 25%
}
// Revenue: Part of €50,000/year L2I subscription
```

### IAAS: "Tech Upskilling"
```typescript
{
  pricingModel: 'iaas',
  iaasMetrics: {
    learnersCommitted: 100,
    pricePerLearner: 1200.00,
    outcomesGuaranteed: ['job_readiness >= 0.7', 'sroi >= 3.0'],
    outcomeThresholds: { sroi: 3.0, vis: 70 }
  },
  currentBeneficiaries: 85,
  cumulativeSROI: 4.2  // Exceeding guarantee! ✨
}
// Revenue: 100 × €1,200 = €120,000 (outcome-based billing)
```

---

## SQL Quick Queries

### Find campaigns near capacity
```sql
SELECT name, pricing_model, capacity_utilization
FROM campaigns
WHERE is_near_capacity = true
ORDER BY upsell_opportunity_score DESC;
```

### Credits running low
```sql
SELECT name, credit_allocation, credits_remaining,
       ROUND(credits_remaining::decimal / credit_allocation, 2) AS pct_remaining
FROM campaigns
WHERE pricing_model = 'credits'
  AND credits_remaining <= credit_allocation * 0.20;
```

### Bundle campaigns for a subscription
```sql
SELECT c.name, c.bundle_allocation_percentage,
       l2i.sku, l2i.learners_supported
FROM campaigns c
JOIN l2i_subscriptions l2i ON c.l2i_subscription_id = l2i.id
WHERE l2i.id = 'YOUR-L2I-SUB-ID';
```

### IAAS SLA compliance
```sql
SELECT name, cumulative_sroi,
       iaas_metrics->>'outcomesGuaranteed' AS guarantees,
       CASE
         WHEN cumulative_sroi >= (iaas_metrics->'outcomeThresholds'->>'sroi')::decimal
         THEN 'SLA Met ✅'
         ELSE 'SLA At Risk ⚠️'
       END AS status
FROM campaigns
WHERE pricing_model = 'iaas';
```

---

## TypeScript Type Guards

```typescript
import { isPricingModelSeats, isPricingModelCredits } from '@/shared-schema';

if (isPricingModelSeats(campaign)) {
  // TypeScript knows committedSeats exists
  const revenue = campaign.committedSeats * campaign.seatPricePerMonth;
}

if (isPricingModelCredits(campaign)) {
  // TypeScript knows creditsRemaining exists
  const remaining = campaign.creditsRemaining;
}
```

---

## Helper Functions

```typescript
import { calculateCapacityUtilization, isNearCapacity, isOverCapacity } from '@/shared-schema';

const utilization = calculateCapacityUtilization(42, 50); // 0.84
const needsUpsell = isNearCapacity(utilization);  // true
const needsExpansion = isOverCapacity(utilization); // false
```

---

## Pricing Model Comparison

| Aspect | SEATS | CREDITS | BUNDLE | IAAS | CUSTOM |
|--------|-------|---------|--------|------|--------|
| **Revenue Model** | Recurring | One-time | Recurring | Outcome-based | Varies |
| **Billing Unit** | Seat/month | Credit | % of bundle | Learner | Custom |
| **Capacity Type** | Volunteers | Credits | Beneficiaries | Learners | Varies |
| **Upsell Trigger** | 80% seats | 20% credits | 80% bundle | 2× outcomes | Manual |
| **Best For** | Enterprise | SMB | Existing L2I | ESG-focused | Strategic |
| **Risk** | Underutilization | Credits expire | Misallocation | SLA failure | Complexity |

---

**See full documentation**: `/docs/CAMPAIGN_PRICING_MODELS.md`
