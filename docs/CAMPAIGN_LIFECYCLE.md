# Campaign Lifecycle & State Machine

## Overview

This document defines the **Campaign Lifecycle State Machine** that governs how campaigns transition through different states from creation to completion. Each state has specific rules, allowed transitions, and side effects.

## State Machine Diagram

```
┌──────────────────────────────────────────────────────────────────────────┐
│                         CAMPAIGN LIFECYCLE                                │
└──────────────────────────────────────────────────────────────────────────┘

     [CREATE]
        │
        ▼
   ┌─────────┐
   │  DRAFT  │ ◄──────────────────┐
   └─────────┘                     │
        │                          │
        │ (lock config)            │ (unlock for edits)
        ▼                          │
   ┌──────────┐                    │
   │ PLANNED  │────────────────────┘
   └──────────┘
        │
        │ (start recruiting)
        ▼
   ┌─────────────┐
   │ RECRUITING  │
   └─────────────┘
        │
        │ (reach start date OR manually activate)
        ▼
   ┌─────────┐
   │ ACTIVE  │ ◄────────────────┐
   └─────────┘                  │
        │ │                     │
        │ └─(pause)──┐          │
        │            ▼          │
        │       ┌────────┐      │
        │       │ PAUSED │──────┘
        │       └────────┘
        │           (resume)
        │
        │ (reach end date OR complete manually)
        ▼
   ┌───────────┐
   │ COMPLETED │
   └───────────┘
        │
        │ (archive)
        ▼
   ┌─────────┐
   │ CLOSED  │ (TERMINAL STATE)
   └─────────┘
```

---

## State Definitions

### 1. `draft`

**Purpose**: Initial creation state. Campaign is editable and not yet committed.

**Characteristics**:
- All fields are editable
- No participants enrolled
- No budget consumed
- No impact metrics calculated
- Not visible to volunteers (internal only)

**Allowed Actions**:
- ✅ Edit all campaign fields (name, dates, capacity, budget, pricing)
- ✅ Change program template
- ✅ Change beneficiary group
- ✅ Delete campaign
- ✅ Lock configuration (→ `planned`)

**Restrictions**:
- ❌ Cannot enroll participants
- ❌ Cannot log sessions/activities
- ❌ Cannot generate impact reports

**Example**:
```json
{
  "id": "camp_123",
  "name": "Mentors for Syrian Refugees - Q1 2025",
  "status": "draft",
  "companyId": "acme_corp",
  "programTemplateId": "mentorship_1on1",
  "beneficiaryGroupId": "syrian_refugees_berlin",
  "startDate": "2025-01-15",
  "endDate": "2025-03-31",
  "targetVolunteers": 50,
  "currentVolunteers": 0,
  "budgetAllocated": 25000.00,
  "budgetSpent": 0.00
}
```

---

### 2. `planned`

**Purpose**: Configuration locked, awaiting start date or recruiting phase.

**Characteristics**:
- Configuration frozen (template, group, dates, capacity)
- Commercial terms finalized
- Ready for volunteer recruitment
- Billing integration active (usage tracking begins)

**Allowed Actions**:
- ✅ Start recruiting (→ `recruiting`)
- ✅ Unlock for edits (→ `draft`) *with approval*
- ✅ View campaign details
- ✅ Generate pricing proposals
- ✅ Set up integrations (connectors, notifications)

**Restrictions**:
- ❌ Cannot change program template, beneficiary group, or dates
- ❌ Cannot enroll participants yet (unless recruiting starts)
- ❌ Limited budget changes (require approval)

**Side Effects on Transition**:
- **From `draft`**:
  - Validate all required fields (template, group, dates, budget)
  - Lock configuration fields
  - Create initial `statusHistory` entry
  - Notify sales/CS team of new planned campaign
  - Initialize billing integration (if L2I bundle, allocate credits/seats)

**Example**:
```json
{
  "status": "planned",
  "statusHistory": [
    {
      "status": "draft",
      "transitionedAt": "2024-12-01T10:00:00Z",
      "transitionedBy": "user_456"
    },
    {
      "status": "planned",
      "transitionedAt": "2024-12-05T14:30:00Z",
      "transitionedBy": "user_456",
      "reason": "Configuration finalized"
    }
  ],
  "configOverrides": {}, // Frozen
  "isActive": true
}
```

---

### 3. `recruiting`

**Purpose**: Actively seeking volunteers and beneficiaries.

**Characteristics**:
- Campaign visible to volunteers
- Enrollment open
- Pre-start date (typically)
- Capacity tracking begins

**Allowed Actions**:
- ✅ Enroll volunteers
- ✅ Enroll beneficiaries
- ✅ Send recruitment notifications
- ✅ View enrollment progress
- ✅ Activate campaign early (→ `active`) if ready
- ✅ Pause recruitment (→ `paused`)
- ✅ Cancel campaign (→ `closed`) with reason

**Restrictions**:
- ❌ Cannot edit core configuration (template, group, dates)
- ❌ Cannot log sessions/activities until `active`
- ❌ Cannot complete campaign

**Side Effects on Transition**:
- **From `planned`**:
  - Make campaign visible to volunteer portal
  - Send recruitment emails/notifications
  - Create volunteer signup links
  - Initialize capacity alerts (trigger at 80%, 100%)

**Capacity Tracking**:
- Update `currentVolunteers` as volunteers enroll
- Update `currentBeneficiaries` as beneficiaries enroll
- Calculate `capacityUtilization = max(currentVolunteers/targetVolunteers, currentBeneficiaries/targetBeneficiaries)`
- Trigger alerts:
  - **80% capacity**: Set `isNearCapacity = true` → Notify CS team (upsell opportunity)
  - **100% capacity**: Set `isOverCapacity = true` → Notify admin (expansion needed)

**Example**:
```json
{
  "status": "recruiting",
  "currentVolunteers": 35,
  "targetVolunteers": 50,
  "currentBeneficiaries": 42,
  "targetBeneficiaries": 50,
  "capacityUtilization": 0.84, // max(35/50, 42/50) = 0.84
  "isNearCapacity": true, // ≥80%
  "isOverCapacity": false
}
```

---

### 4. `active`

**Purpose**: Campaign is running with participants logging activities.

**Characteristics**:
- Sessions/activities logged
- Impact metrics calculated
- Budget consumed
- Full operational state

**Allowed Actions**:
- ✅ Log sessions/activities
- ✅ Enroll additional participants (if under capacity)
- ✅ Update progress/metrics
- ✅ Generate impact reports
- ✅ Pause campaign (→ `paused`)
- ✅ Complete campaign (→ `completed`) when end date reached or manually
- ✅ Extend end date (with approval)

**Restrictions**:
- ❌ Cannot change program template or beneficiary group
- ❌ Cannot change start date (already started)
- ❌ Limited budget changes (require CS approval)

**Side Effects on Transition**:
- **From `recruiting` or `planned`**:
  - Activate all integrations (Kintell, Buddy, Upskilling connectors)
  - Start session tracking
  - Begin metrics aggregation (hourly/daily jobs)
  - Start billing usage metering (track seats/credits consumed)
  - Enable real-time dashboards

- **From `paused`**:
  - Resume session tracking
  - Re-enable participant access
  - Send "campaign resumed" notifications

**Metrics Aggregation** (runs periodically):
1. Query all `ProgramInstances` linked to this campaign
2. Aggregate:
   - `totalHoursLogged` = SUM(instances.totalHoursLogged)
   - `totalSessionsCompleted` = SUM(instances.totalSessionsHeld)
   - `cumulativeSROI` = AVG(instances.sroiScore) weighted by participants
   - `averageVIS` = AVG(volunteer VIS scores)
   - `outcomeScores` = AVG(instances.outcomeScores)
3. Update `campaigns` table
4. Create `CampaignMetricsSnapshot` record
5. Update `lastMetricsUpdateAt`

**Example**:
```json
{
  "status": "active",
  "currentVolunteers": 50,
  "currentBeneficiaries": 50,
  "totalHoursLogged": 487.5,
  "totalSessionsCompleted": 142,
  "cumulativeSROI": 4.2,
  "averageVIS": 82.5,
  "outcomeScores": {
    "integration": 0.78,
    "language": 0.65,
    "jobReadiness": 0.81
  },
  "lastMetricsUpdateAt": "2025-02-15T08:00:00Z"
}
```

---

### 5. `paused`

**Purpose**: Temporarily suspended, but not completed.

**Characteristics**:
- All activities frozen
- Participants cannot log new sessions
- Metrics not updated (stale)
- Budget consumption paused

**Allowed Actions**:
- ✅ Resume campaign (→ `active`)
- ✅ View historical data
- ✅ Close campaign permanently (→ `closed`)
- ✅ Update internal notes

**Restrictions**:
- ❌ Cannot log new sessions/activities
- ❌ Cannot enroll new participants
- ❌ Cannot generate new impact reports (only historical)

**Side Effects on Transition**:
- **From `active`**:
  - Freeze all session tracking
  - Disable participant access
  - Send "campaign paused" notifications
  - Pause billing usage metering
  - Mark in dashboards as paused

**Common Reasons for Pausing**:
- Holiday break
- Waiting for new volunteers
- Budget exhausted (pending approval for expansion)
- Issues requiring investigation

**Example**:
```json
{
  "status": "paused",
  "statusHistory": [
    // ... previous transitions
    {
      "status": "paused",
      "transitionedAt": "2025-02-20T16:00:00Z",
      "transitionedBy": "admin_789",
      "reason": "Holiday break - resuming March 1st"
    }
  ],
  "internalNotes": "Paused for winter holidays. Resume after volunteers return from break."
}
```

---

### 6. `completed`

**Purpose**: Campaign reached end date, impact finalized.

**Characteristics**:
- All activities concluded
- Final metrics calculated
- Impact reports generated
- Budget reconciliation complete
- Still visible for reporting

**Allowed Actions**:
- ✅ Generate final impact reports
- ✅ Export data
- ✅ View all historical data
- ✅ Archive campaign (→ `closed`)
- ✅ Use metrics for benchmarking

**Restrictions**:
- ❌ Cannot log new activities
- ❌ Cannot enroll participants
- ❌ Cannot edit any configuration
- ❌ Cannot reactivate (would require creating new campaign)

**Side Effects on Transition**:
- **From `active`**:
  - Run final metrics aggregation
  - Generate final impact report
  - Reconcile budget (compare allocated vs. spent)
  - Create final `CampaignMetricsSnapshot`
  - Update billing system with final usage
  - Send completion notifications to company admins
  - Generate "Campaign Impact Summary" document
  - Flag for upsell analysis (if successful, suggest renewal/expansion)

**Final Metrics Calculation**:
```typescript
{
  "status": "completed",
  "endDate": "2025-03-31",
  "currentVolunteers": 50,
  "currentBeneficiaries": 48, // Some attrition
  "totalHoursLogged": 1847.5,
  "totalSessionsCompleted": 542,
  "cumulativeSROI": 5.3,
  "averageVIS": 87.2,
  "budgetAllocated": 25000.00,
  "budgetSpent": 24350.75,
  "capacityUtilization": 1.0, // 100%
  "outcomeScores": {
    "integration": 0.84,
    "language": 0.72,
    "jobReadiness": 0.89
  },
  "evidenceSnippetIds": [
    "ev_001", "ev_042", "ev_089" // Top evidence
  ],
  "lastMetricsUpdateAt": "2025-03-31T23:59:59Z"
}
```

---

### 7. `closed`

**Purpose**: Archived, no longer active. Terminal state.

**Characteristics**:
- Read-only archive
- No further changes
- Removed from active lists
- Historical data preserved

**Allowed Actions**:
- ✅ View historical data
- ✅ Export data
- ✅ Use for benchmarking

**Restrictions**:
- ❌ Cannot edit anything
- ❌ Cannot transition to any other state
- ❌ Cannot reactivate

**Side Effects on Transition**:
- **From `completed`, `paused`, or `recruiting`**:
  - Set `isActive = false`
  - Remove from active campaign lists
  - Notify company admins
  - Archive in data warehouse
  - Preserve all historical data (GDPR-compliant)

**Example**:
```json
{
  "status": "closed",
  "isActive": false,
  "statusHistory": [
    // ... all transitions
    {
      "status": "closed",
      "transitionedAt": "2025-04-15T10:00:00Z",
      "transitionedBy": "admin_789",
      "reason": "Campaign archived after final reporting"
    }
  ]
}
```

---

## State Transition Rules

### Valid Transitions Matrix

| From ↓ / To → | `draft` | `planned` | `recruiting` | `active` | `paused` | `completed` | `closed` |
|---------------|---------|-----------|--------------|----------|----------|-------------|----------|
| `draft`       | -       | ✅        | ❌           | ❌       | ❌       | ❌          | ✅ (cancel) |
| `planned`     | ✅*     | -         | ✅           | ✅**     | ❌       | ❌          | ✅ (cancel) |
| `recruiting`  | ❌      | ❌        | -            | ✅       | ✅       | ❌          | ✅ (cancel) |
| `active`      | ❌      | ❌        | ❌           | -        | ✅       | ✅          | ❌       |
| `paused`      | ❌      | ❌        | ❌           | ✅       | -        | ✅          | ✅       |
| `completed`   | ❌      | ❌        | ❌           | ❌       | ❌       | -           | ✅       |
| `closed`      | ❌      | ❌        | ❌           | ❌       | ❌       | ❌          | -        |

**Notes**:
- `*` Requires approval (unlocking a planned campaign)
- `**` Skip recruiting if ready to launch immediately

---

## Automatic State Transitions

Some transitions happen automatically based on dates or conditions:

### Time-Based Transitions

**Scheduler**: Run daily at midnight (cron: `0 0 * * *`)

```typescript
// Pseudo-code for automatic transitions
async function autoTransitionCampaigns() {
  const today = new Date();

  // planned/recruiting → active (when start date reached)
  await db.update(campaigns)
    .set({ status: 'active' })
    .where(
      and(
        or(eq(campaigns.status, 'planned'), eq(campaigns.status, 'recruiting')),
        lte(campaigns.startDate, today)
      )
    );

  // active → completed (when end date reached)
  await db.update(campaigns)
    .set({ status: 'completed' })
    .where(
      and(
        eq(campaigns.status, 'active'),
        lte(campaigns.endDate, today)
      )
    );
}
```

### Capacity-Based Alerts (not transitions, but triggers)

**Scheduler**: Run hourly during recruiting/active states

```typescript
async function checkCapacityAlerts() {
  const campaigns = await db.select()
    .from(campaigns)
    .where(
      or(
        eq(campaigns.status, 'recruiting'),
        eq(campaigns.status, 'active')
      )
    );

  for (const campaign of campaigns) {
    const utilization = Math.max(
      campaign.currentVolunteers / campaign.targetVolunteers,
      campaign.currentBeneficiaries / campaign.targetBeneficiaries
    );

    const updates: any = { capacityUtilization: utilization };

    if (utilization >= 0.8 && !campaign.isNearCapacity) {
      updates.isNearCapacity = true;
      // Trigger alert: "Campaign 80% full - upsell opportunity"
      await sendCapacityAlert(campaign.id, 'near_capacity');
    }

    if (utilization > 1.0 && !campaign.isOverCapacity) {
      updates.isOverCapacity = true;
      // Trigger alert: "Campaign over capacity - expansion needed"
      await sendCapacityAlert(campaign.id, 'over_capacity');
    }

    await db.update(campaigns)
      .set(updates)
      .where(eq(campaigns.id, campaign.id));
  }
}
```

---

## Side Effects Summary

### On State Change

Every state transition MUST:
1. **Update `statusHistory`** with transition metadata
2. **Update `updatedAt`** timestamp
3. **Log to audit trail** (who, when, why)
4. **Send notifications** to relevant stakeholders

### Additional Side Effects by Transition

| Transition | Side Effects |
|------------|--------------|
| `draft` → `planned` | Validate config, lock fields, initialize billing integration |
| `planned` → `recruiting` | Enable volunteer signup, send recruitment emails, start capacity tracking |
| `recruiting` → `active` | Activate connectors, start metrics aggregation, begin billing usage |
| `active` → `paused` | Freeze activities, disable participant access, pause billing |
| `paused` → `active` | Resume activities, re-enable access, restart billing |
| `active` → `completed` | Final metrics calculation, generate final report, budget reconciliation |
| `completed` → `closed` | Archive data, remove from active lists, set `isActive = false` |

---

## Validation Rules

### Required Fields by State

| Field | `draft` | `planned` | `recruiting` | `active` | `paused` | `completed` | `closed` |
|-------|---------|-----------|--------------|----------|----------|-------------|----------|
| `name` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `companyId` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `programTemplateId` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `beneficiaryGroupId` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `startDate` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `endDate` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `targetVolunteers` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `targetBeneficiaries` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `budgetAllocated` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `pricingModel` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Pricing model fields | Optional | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

### Business Rules

1. **Date Validation**:
   - `startDate` must be < `endDate`
   - `startDate` cannot be in the past (for new campaigns)
   - `endDate` can be extended but not shortened (after `recruiting`)

2. **Capacity Validation**:
   - `targetVolunteers` > 0
   - `targetBeneficiaries` > 0
   - `currentVolunteers` ≤ `targetVolunteers` (unless overage allowed)

3. **Budget Validation**:
   - `budgetAllocated` > 0
   - `budgetSpent` ≤ `budgetAllocated` (alerts if exceeded)

4. **Pricing Model Validation**:
   - If `pricingModel = 'seats'`: `committedSeats` and `seatPricePerMonth` required
   - If `pricingModel = 'credits'`: `creditAllocation` required
   - If `pricingModel = 'bundle'`: `l2iSubscriptionId` required
   - If `pricingModel = 'iaas'`: `iaasMetrics` required

5. **Template ↔ Group Compatibility**:
   - `programTemplate.suitableForGroups` must include `beneficiaryGroup.tags`
   - Example: Mentorship template requires groups tagged with `'mentorship'`

---

## Examples by Use Case

### Use Case 1: Standard Campaign Flow

**Scenario**: Company creates a mentorship campaign for Syrian refugees in Q1 2025.

**Flow**:
```
1. [CREATE] → draft
   - Admin creates campaign in UI wizard
   - Sets name, template, group, dates, capacity, budget

2. draft → planned
   - Admin locks configuration after review
   - System validates all fields
   - Billing integration initialized

3. planned → recruiting
   - Start recruiting 2 weeks before start date
   - Volunteer signup links sent
   - Enrollment begins

4. recruiting → active (automatic on start date)
   - Jan 15, 2025: Campaign auto-transitions to active
   - Sessions start logging
   - Metrics aggregation begins

5. active → completed (automatic on end date)
   - March 31, 2025: Campaign auto-transitions to completed
   - Final report generated
   - Budget reconciled

6. completed → closed (manual, after 30 days)
   - April 30, 2025: Admin archives campaign
   - Data preserved for historical reporting
```

### Use Case 2: Paused Campaign

**Scenario**: Campaign paused due to holiday break.

**Flow**:
```
1. active → paused (manual, Dec 20)
   - Reason: "Holiday break - volunteers on vacation"
   - Activities frozen
   - Notifications sent

2. paused → active (manual, Jan 6)
   - Volunteers return
   - Activities resume
   - Metrics aggregation restarts
```

### Use Case 3: Cancelled Campaign

**Scenario**: Campaign cancelled during recruiting due to lack of volunteer interest.

**Flow**:
```
1. recruiting → closed (manual)
   - Reason: "Insufficient volunteer signups (10/50)"
   - Campaign archived
   - Budget refunded (if applicable)
   - Company notified
```

### Use Case 4: Over-Capacity Campaign (Upsell)

**Scenario**: Campaign reaches 100% capacity mid-campaign, needs expansion.

**Flow**:
```
1. active (currentVolunteers = 50, targetVolunteers = 50)
   - isOverCapacity alert triggered
   - CS team notified

2. Admin expands capacity
   - Update targetVolunteers = 70 (add 20 seats)
   - Update budgetAllocated += $10,000
   - Update committedSeats += 20 (if seats model)

3. Campaign continues in active state
   - New volunteers enroll
   - Billing tracks additional seat usage
```

---

## API Integration Points

### Campaign Lifecycle Manager Service

**Endpoints**:

```typescript
// Transition campaign to new state
POST /campaigns/:id/transition
{
  "newStatus": "planned",
  "reason": "Configuration finalized",
  "userId": "user_456"
}

// Get allowed transitions for current state
GET /campaigns/:id/transitions
// Returns: ["planned", "closed"]

// Auto-transition campaigns (cron job)
POST /campaigns/auto-transition
// Runs scheduled state transitions

// Check capacity and trigger alerts
POST /campaigns/check-capacity
// Runs scheduled capacity checks
```

---

## Monitoring & Alerts

### Key Metrics to Monitor

1. **Campaign Distribution by State** (Dashboard)
   - Pie chart: % campaigns in each state
   - Alerts if too many `paused` or `closed` without new `active`

2. **Capacity Utilization** (Real-time)
   - Track campaigns approaching 80%, 100%, >100%
   - Trigger upsell workflows

3. **Budget Utilization** (Real-time)
   - Track `budgetSpent / budgetAllocated`
   - Alert if >90% (expansion needed)

4. **Impact Performance** (Weekly)
   - Track SROI trends across campaigns
   - Identify high-performing campaigns for case studies

---

## Conclusion

This state machine ensures **predictable, auditable campaign lifecycle management** with clear transitions, validations, and side effects. All transitions are logged in `statusHistory` for compliance and debugging.

**Key Takeaways**:
- ✅ 7 states, 3 operational (recruiting, active, paused)
- ✅ Automatic transitions based on dates
- ✅ Capacity-based alerts for upsell opportunities
- ✅ Complete audit trail via `statusHistory`
- ✅ Side effects documented and enforced

**Next Steps** (for implementing agents):
- Agent 3.4 (campaign-lifecycle-manager): Implement state transition logic
- Agent 3.3 (capacity-tracker): Implement capacity alerts
- Agent 3.5 (metrics-aggregator): Implement metrics calculation on state changes
