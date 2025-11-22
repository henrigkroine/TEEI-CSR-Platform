# Program Instance Lifecycle

**Status**: Phase 1A Complete (Agent 1.4)
**Created**: 2025-11-22
**Owner**: SWARM 6 - Agent 1.4 (program-instance-modeler)

---

## Overview

This document describes the complete lifecycle of **ProgramInstances** in the TEEI CSR Platform, covering:

1. **Instance Creation Flow** - How instances are created from campaigns
2. **Configuration Merging** - How template defaults and campaign overrides combine
3. **Capacity Consumption** - How instances consume campaign quotas
4. **Activity Association** - How sessions/events link to instances
5. **Metrics Aggregation** - How instance metrics roll up to campaigns

---

## 1. Instance Creation Flow

### Trigger Points

ProgramInstances are created in three scenarios:

#### **A. Campaign Activation**
When a campaign transitions to `active` status, an initial ProgramInstance is auto-created:

```typescript
// Pseudo-code for campaign activation
async function activateCampaign(campaignId: string) {
  const campaign = await getCampaign(campaignId);
  const template = await getTemplate(campaign.programTemplateId);

  // Create initial instance
  const instance = await createProgramInstance({
    name: `${campaign.name} - Cohort 1`,
    campaignId: campaign.id,
    programTemplateId: campaign.programTemplateId,
    companyId: campaign.companyId,
    beneficiaryGroupId: campaign.beneficiaryGroupId,
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    status: 'active',
    config: mergeConfig(template.defaultConfig, campaign.configOverrides),
  });

  // Update campaign status
  await updateCampaign(campaignId, { status: 'active' });
}
```

#### **B. Manual Instance Creation**
Company admins can create additional instances for cohorts/groups:

```typescript
// POST /api/campaigns/:campaignId/instances
{
  "name": "Mentors for Syrian Refugees - Cohort 2",
  "startDate": "2025-04-01",
  "endDate": "2025-09-30",
  "configOverrides": {
    "sessionDuration": 90  // Override from default 60 minutes
  }
}
```

#### **C. Automatic Cohort Splitting**
When campaign capacity is exceeded, auto-create new cohorts:

```typescript
// Triggered when enrolledBeneficiaries > config.classSizeMax
if (currentInstance.enrolledBeneficiaries >= config.classSizeMax) {
  await createProgramInstance({
    name: `${campaign.name} - Cohort ${nextCohortNumber}`,
    campaignId: campaign.id,
    // ... inherit from campaign
  });
}
```

### Validation Rules

Before creating an instance, validate:

✅ **Campaign is active or planned** (not completed/closed)
✅ **Campaign has available capacity** (not over quota)
✅ **Date range is within campaign period** (startDate >= campaign.startDate)
✅ **Template compatibility** (template.suitableForGroups matches beneficiaryGroup.tags)
✅ **Config schema validation** (configOverrides match template schema)

---

## 2. Configuration Merging Logic

Instances inherit configuration from templates with campaign-specific overrides.

### Merge Strategy

```typescript
/**
 * Merge Configuration
 *
 * Priority (highest to lowest):
 * 1. Instance-specific overrides (future feature)
 * 2. Campaign configOverrides
 * 3. Template defaultConfig
 */
function mergeConfig(
  templateConfig: Record<string, any>,
  campaignOverrides: Record<string, any>,
  instanceOverrides?: Record<string, any>
): Record<string, any> {
  return {
    ...templateConfig,       // Base defaults
    ...campaignOverrides,    // Campaign customizations
    ...instanceOverrides,    // Instance-specific (future)
  };
}
```

### Example: Mentorship Program

**Template Default Config:**
```json
{
  "sessionFormat": "1-on-1",
  "sessionDuration": 60,
  "sessionFrequency": "weekly",
  "totalDuration": 24,
  "matchingCriteria": ["skills", "industry"]
}
```

**Campaign Override:**
```json
{
  "sessionDuration": 90,
  "matchingCriteria": ["skills", "language", "industry"]
}
```

**Resulting Instance Config:**
```json
{
  "sessionFormat": "1-on-1",          // From template (not overridden)
  "sessionDuration": 90,              // From campaign (overridden)
  "sessionFrequency": "weekly",       // From template
  "totalDuration": 24,                // From template
  "matchingCriteria": ["skills", "language", "industry"]  // From campaign
}
```

### Config Schema by Program Type

#### **Mentorship Config**
```typescript
{
  sessionFormat: '1-on-1' | 'group' | 'hybrid';
  sessionDuration: number;           // minutes (default: 60)
  sessionFrequency: 'weekly' | 'bi-weekly' | 'monthly';
  totalDuration: number;             // weeks (default: 24)
  matchingCriteria: string[];        // ['skills', 'industry', 'language']
}
```

#### **Language Config**
```typescript
{
  classSizeMin: number;              // default: 3
  classSizeMax: number;              // default: 12
  proficiencyLevels: ('A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2')[];
  targetLanguages: string[];         // ISO 639-1 codes
  sessionDuration: number;           // minutes (default: 90)
}
```

#### **Buddy Config**
```typescript
{
  matchMethod: 'skill_based' | 'random' | 'interest_based';
  pairDuration: number;              // weeks (default: 12)
  checkInFrequency: 'weekly' | 'bi-weekly';
}
```

#### **Upskilling Config**
```typescript
{
  coursePlatforms: ('linkedin_learning' | 'coursera' | 'udemy' | 'custom')[];
  certificationRequired: boolean;    // default: false
  skillTracks: string[];             // ['data_analytics', 'cloud', 'web_dev']
}
```

---

## 3. Capacity Consumption Rules

Instances consume capacity from their parent campaign in three dimensions:

### A. Seat Consumption (Volunteer Capacity)

**Rule**: Each enrolled volunteer consumes 1 seat from campaign quota.

```sql
-- Campaign capacity check
SELECT
  c.targetVolunteers AS quota,
  SUM(pi.volunteersConsumed) AS consumed,
  c.targetVolunteers - SUM(pi.volunteersConsumed) AS remaining
FROM campaigns c
LEFT JOIN program_instances pi ON pi.campaignId = c.id
WHERE c.id = :campaignId
GROUP BY c.id;
```

**Enforcement**:
- Before enrolling a volunteer, check: `consumed < campaign.committedSeats`
- If at capacity: Trigger alert for upsell opportunity
- If over capacity (110%): Block new enrollments until expanded

### B. Credit Consumption (Activity-Based)

**Rule**: Credits consumed based on activity (configurable per campaign).

**Common Credit Rates**:
- Mentorship: 10 credits per 1-hour session
- Language: 15 credits per group session
- Buddy: 5 credits per check-in event

```typescript
// Calculate credit consumption
function calculateCreditsForSession(
  programType: string,
  durationMinutes: number
): number {
  const rates = {
    mentorship: 10,   // per hour
    language: 15,     // per session
    buddy: 5,         // per event
    upskilling: 2,    // per course completion
  };

  const baseRate = rates[programType] || 10;
  return (durationMinutes / 60) * baseRate;
}

// Update instance after session
async function recordSession(instanceId: string, session: Session) {
  const instance = await getInstance(instanceId);
  const campaign = await getCampaign(instance.campaignId);

  if (campaign.pricingModel === 'credits') {
    const creditsUsed = calculateCreditsForSession(
      campaign.programType,
      session.durationMinutes
    );

    await updateInstance(instanceId, {
      totalSessionsHeld: instance.totalSessionsHeld + 1,
      totalHoursLogged: instance.totalHoursLogged + (session.durationMinutes / 60),
      creditsConsumed: instance.creditsConsumed + creditsUsed,
    });

    // Check campaign-level capacity
    const totalCreditsConsumed = await sumCreditsForCampaign(campaign.id);
    if (totalCreditsConsumed > campaign.creditAllocation) {
      await triggerCapacityAlert(campaign.id, 'credits_exceeded');
    }
  }
}
```

### C. Learner Consumption (IAAS Model)

**Rule**: Each unique beneficiary served counts toward IAAS commitments.

```sql
-- IAAS capacity tracking
SELECT
  c.id,
  c.iaasMetrics->>'learnersCommitted' AS committed,
  SUM(pi.learnersServed) AS served,
  (c.iaasMetrics->>'learnersCommitted')::int - SUM(pi.learnersServed) AS remaining
FROM campaigns c
LEFT JOIN program_instances pi ON pi.campaignId = c.id
WHERE c.pricingModel = 'iaas'
  AND c.id = :campaignId
GROUP BY c.id;
```

**IAAS Billing Trigger**:
When `learnersServed >= iaasMetrics.learnersCommitted`, trigger invoice generation.

---

## 4. Activity Association Logic

Activities (sessions, events, check-ins) must be associated with the correct ProgramInstance.

### Association Strategy

**Method 1: Direct Association (Preferred)**
When creating activities, explicitly provide `programInstanceId`:

```typescript
// POST /api/kintell/sessions
{
  "participantId": "uuid",
  "volunteerId": "uuid",
  "sessionType": "language",
  "durationMinutes": 90,
  "programInstanceId": "uuid-of-instance"  // Explicit link
}
```

**Method 2: Fuzzy Matching (Backfill)**
For historical data without `programInstanceId`, match based on:

```sql
-- Match session to instance
SELECT pi.id
FROM program_instances pi
JOIN campaigns c ON c.id = pi.campaignId
JOIN users u ON u.companyId = pi.companyId
WHERE u.id = :participantId
  AND pi.status = 'active'
  AND :sessionDate BETWEEN pi.startDate AND pi.endDate
  -- Match based on beneficiary group tags (if available)
  AND (
    :userTags && (SELECT tags FROM beneficiary_groups WHERE id = pi.beneficiaryGroupId)
  )
LIMIT 1;
```

**Confidence Scoring**:
- **High Confidence (90%+)**: Exact date match + single active instance for user
- **Medium Confidence (70-89%)**: Date match + group tag overlap
- **Low Confidence (<70%)**: Multiple possible instances → flag for manual review

### Ambiguity Handling

If multiple instances match:

1. **Prefer most recently created instance** (likely current cohort)
2. **Prefer instance with lower capacity utilization** (balance load)
3. **Flag for manual review** if confidence < 70%

```typescript
interface AssociationResult {
  programInstanceId: string;
  confidence: number;  // 0.0 - 1.0
  needsReview: boolean;
  reason: string;
}
```

---

## 5. Metrics Aggregation to Campaign

Campaign-level metrics are **aggregated from all ProgramInstances**.

### Aggregation Frequency

- **Real-time**: Capacity metrics (volunteers, sessions, hours)
- **Hourly**: Impact metrics (SROI, VIS) via cron job
- **Daily**: Snapshot for time-series (campaign_metrics_snapshots)

### Aggregation Queries

#### **A. Capacity Metrics**

```sql
-- Aggregate volunteer capacity
UPDATE campaigns c
SET
  currentVolunteers = (
    SELECT COALESCE(SUM(enrolledVolunteers), 0)
    FROM program_instances
    WHERE campaignId = c.id AND status IN ('active', 'planned')
  ),
  currentBeneficiaries = (
    SELECT COALESCE(SUM(enrolledBeneficiaries), 0)
    FROM program_instances
    WHERE campaignId = c.id AND status IN ('active', 'planned')
  ),
  currentSessions = (
    SELECT COALESCE(SUM(totalSessionsHeld), 0)
    FROM program_instances
    WHERE campaignId = c.id
  ),
  totalHoursLogged = (
    SELECT COALESCE(SUM(totalHoursLogged), 0)
    FROM program_instances
    WHERE campaignId = c.id
  ),
  capacityUtilization = (
    CASE
      WHEN c.targetVolunteers > 0
      THEN (
        SELECT COALESCE(SUM(enrolledVolunteers), 0)::decimal / c.targetVolunteers
        FROM program_instances
        WHERE campaignId = c.id AND status = 'active'
      )
      ELSE 0
    END
  ),
  lastMetricsUpdateAt = NOW()
WHERE c.id = :campaignId;

-- Set capacity alerts
UPDATE campaigns c
SET
  isNearCapacity = (c.capacityUtilization >= 0.8 AND c.capacityUtilization < 1.0),
  isOverCapacity = (c.capacityUtilization >= 1.0)
WHERE c.id = :campaignId;
```

#### **B. Impact Metrics (SROI, VIS)**

```sql
-- Aggregate SROI across instances
UPDATE campaigns c
SET
  cumulativeSROI = (
    SELECT COALESCE(AVG(sroiScore), 0)
    FROM program_instances
    WHERE campaignId = c.id
      AND sroiScore IS NOT NULL
      AND status IN ('active', 'completed')
  ),
  averageVIS = (
    SELECT COALESCE(AVG(averageVISScore), 0)
    FROM program_instances
    WHERE campaignId = c.id
      AND averageVISScore IS NOT NULL
      AND status IN ('active', 'completed')
  ),
  totalSessionsCompleted = (
    SELECT COALESCE(SUM(totalSessionsHeld), 0)
    FROM program_instances
    WHERE campaignId = c.id
  ),
  lastMetricsUpdateAt = NOW()
WHERE c.id = :campaignId;
```

#### **C. Budget & Credits**

```sql
-- Aggregate credit consumption
UPDATE campaigns c
SET
  creditsRemaining = (
    c.creditAllocation - (
      SELECT COALESCE(SUM(creditsConsumed), 0)
      FROM program_instances
      WHERE campaignId = c.id
    )
  )
WHERE c.pricingModel = 'credits'
  AND c.id = :campaignId;

-- Trigger billing event if credits exhausted
SELECT c.id, c.companyId, c.creditsRemaining
FROM campaigns c
WHERE c.pricingModel = 'credits'
  AND c.creditsRemaining <= 0
  AND c.status = 'active';
-- → Send to billing service for invoice/upsell
```

### Campaign Metrics Snapshot (Daily)

For time-series dashboards, create daily snapshots:

```sql
-- Create daily snapshot
INSERT INTO campaign_metrics_snapshots (
  campaignId,
  snapshotDate,
  volunteers,
  beneficiaries,
  sessions,
  budget,
  sroi,
  averageVIS,
  totalHours,
  seatsUsed,
  creditsConsumed,
  learnersServed,
  fullSnapshot
)
SELECT
  c.id AS campaignId,
  CURRENT_DATE AS snapshotDate,
  jsonb_build_object(
    'target', c.targetVolunteers,
    'current', c.currentVolunteers,
    'utilization', c.capacityUtilization
  ) AS volunteers,
  jsonb_build_object(
    'target', c.targetBeneficiaries,
    'current', c.currentBeneficiaries,
    'utilization',
      CASE WHEN c.targetBeneficiaries > 0
      THEN c.currentBeneficiaries::decimal / c.targetBeneficiaries
      ELSE 0 END
  ) AS beneficiaries,
  jsonb_build_object(
    'target', c.maxSessions,
    'current', c.currentSessions,
    'utilization',
      CASE WHEN c.maxSessions > 0
      THEN c.currentSessions::decimal / c.maxSessions
      ELSE 0 END
  ) AS sessions,
  jsonb_build_object(
    'allocated', c.budgetAllocated,
    'spent', c.budgetSpent,
    'remaining', c.budgetAllocated - c.budgetSpent
  ) AS budget,
  c.cumulativeSROI AS sroi,
  c.averageVIS,
  c.totalHoursLogged AS totalHours,
  (SELECT SUM(volunteersConsumed) FROM program_instances WHERE campaignId = c.id) AS seatsUsed,
  (SELECT SUM(creditsConsumed) FROM program_instances WHERE campaignId = c.id) AS creditsConsumed,
  (SELECT SUM(learnersServed) FROM program_instances WHERE campaignId = c.id) AS learnersServed,
  row_to_json(c.*) AS fullSnapshot
FROM campaigns c
WHERE c.status IN ('active', 'paused')
ON CONFLICT (campaignId, snapshotDate) DO UPDATE
SET
  volunteers = EXCLUDED.volunteers,
  beneficiaries = EXCLUDED.beneficiaries,
  sessions = EXCLUDED.sessions,
  budget = EXCLUDED.budget,
  sroi = EXCLUDED.sroi,
  averageVIS = EXCLUDED.averageVIS,
  totalHours = EXCLUDED.totalHours,
  seatsUsed = EXCLUDED.seatsUsed,
  creditsConsumed = EXCLUDED.creditsConsumed,
  learnersServed = EXCLUDED.learnersServed,
  fullSnapshot = EXCLUDED.fullSnapshot;
```

---

## 6. Example Use Cases

### Use Case 1: Dashboard - Campaign Overview

**Goal**: Show campaign metrics dashboard with real-time capacity and impact.

```sql
-- Single query for campaign dashboard
SELECT
  c.id,
  c.name,
  c.status,
  c.startDate,
  c.endDate,

  -- Capacity metrics
  c.targetVolunteers,
  c.currentVolunteers,
  c.capacityUtilization,
  c.isNearCapacity,
  c.isOverCapacity,

  -- Impact metrics
  c.cumulativeSROI,
  c.averageVIS,
  c.totalHoursLogged,
  c.totalSessionsCompleted,

  -- Budget metrics
  c.budgetAllocated,
  c.budgetSpent,
  (c.budgetAllocated - c.budgetSpent) AS budgetRemaining,

  -- Instance breakdown
  (SELECT COUNT(*) FROM program_instances WHERE campaignId = c.id) AS totalInstances,
  (SELECT COUNT(*) FROM program_instances WHERE campaignId = c.id AND status = 'active') AS activeInstances,

  -- Top performing instance
  (
    SELECT jsonb_build_object(
      'id', pi.id,
      'name', pi.name,
      'sroi', pi.sroiScore,
      'vis', pi.averageVISScore,
      'beneficiaries', pi.enrolledBeneficiaries
    )
    FROM program_instances pi
    WHERE pi.campaignId = c.id
      AND pi.sroiScore IS NOT NULL
    ORDER BY pi.sroiScore DESC
    LIMIT 1
  ) AS topInstance

FROM campaigns c
WHERE c.id = :campaignId;
```

### Use Case 2: Upsell Detection

**Goal**: Identify campaigns at >80% capacity for upsell opportunities.

```sql
-- Find high-performing, near-capacity campaigns
SELECT
  c.id,
  c.name,
  c.companyId,
  co.name AS companyName,
  c.capacityUtilization,
  c.cumulativeSROI,
  c.averageVIS,
  c.targetVolunteers,
  c.currentVolunteers,
  (c.targetVolunteers - c.currentVolunteers) AS remainingSeats,

  -- Upsell signals
  CASE
    WHEN c.capacityUtilization >= 1.0 THEN 'URGENT - Over capacity'
    WHEN c.capacityUtilization >= 0.9 THEN 'HIGH - 90% utilization'
    WHEN c.capacityUtilization >= 0.8 THEN 'MEDIUM - 80% utilization'
  END AS upsellPriority,

  -- Estimated expansion value
  (c.seatPricePerMonth * (c.targetVolunteers * 0.5))::decimal AS estimatedExpansionRevenue

FROM campaigns c
JOIN companies co ON co.id = c.companyId
WHERE c.status = 'active'
  AND c.capacityUtilization >= 0.8
  AND c.cumulativeSROI >= 3.0  -- High-performing campaigns only
ORDER BY c.capacityUtilization DESC, c.cumulativeSROI DESC;
```

### Use Case 3: Impact Report by Beneficiary Group

**Goal**: Aggregate impact metrics across all campaigns for a specific beneficiary group.

```sql
-- Group-level impact analysis
SELECT
  bg.id AS groupId,
  bg.name AS groupName,
  bg.groupType,
  bg.countryCode,

  -- Campaign count
  COUNT(DISTINCT c.id) AS totalCampaigns,
  COUNT(DISTINCT c.companyId) AS companiesServing,

  -- Aggregate impact
  SUM(pi.learnersServed) AS totalBeneficiariesServed,
  SUM(pi.totalHoursLogged) AS totalVolunteerHours,
  SUM(pi.totalSessionsHeld) AS totalSessions,

  -- Average impact scores
  AVG(pi.sroiScore) AS avgSROI,
  AVG(pi.averageVISScore) AS avgVIS,

  -- Outcome scores (aggregate across all instances)
  jsonb_object_agg(
    outcome_key,
    AVG(outcome_value)
  ) AS avgOutcomeScores

FROM beneficiary_groups bg
JOIN campaigns c ON c.beneficiaryGroupId = bg.id
JOIN program_instances pi ON pi.campaignId = c.id
CROSS JOIN LATERAL jsonb_each_text(pi.outcomeScores) AS outcomes(outcome_key, outcome_value)
WHERE bg.id = :beneficiaryGroupId
  AND pi.status IN ('active', 'completed')
GROUP BY bg.id, bg.name, bg.groupType, bg.countryCode;
```

---

## 7. Cron Jobs & Automation

### Recommended Cron Schedule

| Job | Frequency | Description |
|-----|-----------|-------------|
| **aggregate-campaign-metrics** | Hourly | Update campaign metrics from instances |
| **create-daily-snapshots** | Daily (2am UTC) | Create campaign_metrics_snapshots |
| **check-capacity-alerts** | Hourly | Trigger alerts for >80% utilization |
| **auto-transition-instances** | Daily | Move instances to 'completed' when endDate passed |
| **calculate-sroi-vis** | Hourly | Compute SROI/VIS for instances with new activity |

### Example Cron Job: Aggregate Campaign Metrics

```typescript
// services/campaigns/src/jobs/aggregate-campaign-metrics.ts
import { db } from '@teei/shared-schema';
import { campaigns, programInstances } from '@teei/shared-schema/schema';
import { eq, inArray, sql } from 'drizzle-orm';

export async function aggregateCampaignMetrics() {
  const activeCampaigns = await db
    .select({ id: campaigns.id })
    .from(campaigns)
    .where(inArray(campaigns.status, ['active', 'paused']));

  for (const campaign of activeCampaigns) {
    await db.execute(sql`
      UPDATE campaigns c
      SET
        currentVolunteers = (
          SELECT COALESCE(SUM(enrolledVolunteers), 0)
          FROM program_instances
          WHERE campaignId = ${campaign.id} AND status IN ('active', 'planned')
        ),
        currentBeneficiaries = (
          SELECT COALESCE(SUM(enrolledBeneficiaries), 0)
          FROM program_instances
          WHERE campaignId = ${campaign.id} AND status IN ('active', 'planned')
        ),
        totalHoursLogged = (
          SELECT COALESCE(SUM(totalHoursLogged), 0)
          FROM program_instances
          WHERE campaignId = ${campaign.id}
        ),
        cumulativeSROI = (
          SELECT COALESCE(AVG(sroiScore), 0)
          FROM program_instances
          WHERE campaignId = ${campaign.id} AND sroiScore IS NOT NULL
        ),
        averageVIS = (
          SELECT COALESCE(AVG(averageVISScore), 0)
          FROM program_instances
          WHERE campaignId = ${campaign.id} AND averageVISScore IS NOT NULL
        ),
        capacityUtilization = (
          CASE
            WHEN c.targetVolunteers > 0
            THEN (
              SELECT COALESCE(SUM(enrolledVolunteers), 0)::decimal / c.targetVolunteers
              FROM program_instances
              WHERE campaignId = ${campaign.id} AND status = 'active'
            )
            ELSE 0
          END
        ),
        lastMetricsUpdateAt = NOW()
      WHERE c.id = ${campaign.id}
    `);
  }

  console.log(`Aggregated metrics for ${activeCampaigns.length} campaigns`);
}

// Schedule: Every hour
// Cron: 0 * * * *
```

---

## 8. Performance Considerations

### Denormalization Justification

**ProgramInstances denormalizes** `companyId`, `programTemplateId`, `beneficiaryGroupId` from campaigns because:

1. **Query Performance**: Dashboard queries need company-level filtering without joins
2. **Immutability**: Once created, these relationships never change
3. **Analytics**: ClickHouse/data warehouse queries benefit from flat structure
4. **Caching**: Simpler cache invalidation (no joins)

### Index Strategy

Primary query patterns optimized:
- `campaignId` - Fetch all instances for a campaign (most common)
- `companyId` - Company dashboard (show all instances)
- `status` - Filter active/completed instances
- `(companyId, status, startDate)` - Composite for dashboard queries
- `(campaignId, status)` - Campaign metrics aggregation

### Aggregation Performance

For large campaigns (100+ instances):
- Use **materialized views** for dashboard queries
- Cache aggregated metrics in Redis (TTL: 5 minutes)
- Run hourly cron job to pre-compute metrics

---

## 9. Future Enhancements

### Phase 2 Features (Post-Launch)

1. **Instance-Level Config Overrides**: Allow per-instance customization beyond campaign defaults
2. **Multi-Cohort Scheduling**: Auto-create instances based on demand forecasting
3. **Cross-Campaign Analytics**: Compare performance across campaigns for same beneficiary group
4. **Real-Time Capacity Alerts**: WebSocket notifications when capacity thresholds crossed
5. **IAAS Outcome Verification**: Link outcome scores to IAAS billing triggers

---

## Summary

ProgramInstances are the **execution layer** of the campaign system:

- ✅ **Inherit** config from templates + campaigns
- ✅ **Consume** capacity from campaign quotas
- ✅ **Track** activity at granular level (sessions, hours, participants)
- ✅ **Aggregate** impact metrics up to campaigns
- ✅ **Enable** campaign-level reporting without sacrificing detail

This design balances **flexibility** (JSONB config), **performance** (denormalization, indexes), and **privacy** (no individual PII).

---

**Next**: Agent 2.1 (drizzle-schema-engineer) will implement this schema with foreign key constraints once campaigns, program_templates, and beneficiary_groups tables are created.
