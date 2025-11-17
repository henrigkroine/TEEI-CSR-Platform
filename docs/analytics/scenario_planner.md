# Scenario Planner Documentation

## Overview

The **Scenario Planner** is a what-if analysis engine that allows executives and program managers to model different program configurations and see projected impacts on key metrics:

- **SROI** (Social Return on Investment)
- **VIS** (Volunteer Impact Score)
- **SDG Coverage** (Sustainable Development Goals alignment)

## Key Features

### 1. Parameterized Modeling

Adjust key program variables:
- **Cohort Size**: Scale participant numbers up or down
- **Duration**: Extend or shorten program cohorts
- **Investment**: Model budget changes (grants, platform costs)
- **Program Mix**: Reallocate between Buddy System, Skill Share, Mentorship, Community Events
- **Activity Rates**: Override default engagement frequencies

### 2. Deterministic Engine

- Same inputs **always** produce same outputs
- Calculation performance: **p95 ≤ 800ms**
- No randomness or external dependencies

### 3. Scenario Persistence

- **Save** scenarios for later re-use
- **Compare** multiple scenarios side-by-side
- **Version history**: Track execution results over time
- **Favorites**: Mark high-priority scenarios

### 4. Export Capabilities

- Export to **PowerPoint** deck (PPTX)
- Export to **PDF** report
- Export raw JSON for custom analysis

---

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                     Scenario Planner                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────────┐      ┌─────────────────────────┐    │
│  │  Scenario Engine │──────│ Baseline Metrics Fetch  │    │
│  │  (Calculations)  │      │ (Analytics Service)     │    │
│  └──────────────────┘      └─────────────────────────┘    │
│           │                                                 │
│           ▼                                                 │
│  ┌──────────────────┐      ┌─────────────────────────┐    │
│  │  Scenario DB     │◄─────│ API Routes (Fastify)    │    │
│  │  (PostgreSQL)    │      │ /v1/analytics/scenarios │    │
│  └──────────────────┘      └─────────────────────────┘    │
│                                      ▲                      │
│                                      │                      │
│  ┌─────────────────────────────────────────────────────┐  │
│  │          Cockpit UI (Astro + React)                 │  │
│  │  - Scenario Builder (Sliders/Inputs)                │  │
│  │  - Comparison View (Side-by-side charts)           │  │
│  │  - Export to Deck                                   │  │
│  └─────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Services

1. **Forecast Service** (`services/forecast`)
   - Hosts scenario engine and API routes
   - Port: `3007`
   - Endpoints: `/v1/analytics/scenarios/*`

2. **Analytics Service** (stub integration)
   - Provides baseline metrics (current SROI/VIS/SDG)
   - Future integration point

3. **Corporate Cockpit** (`apps/corp-cockpit-astro`)
   - UI for scenario creation and visualization
   - Export to deck integration

---

## API Endpoints

### Base URL
```
http://localhost:3007/v1/analytics/scenarios
```

### Create Scenario

**POST** `/scenarios`

```json
{
  "tenantId": "tenant_abc123",
  "companyId": "uuid-here",
  "name": "Q4 Growth Plan",
  "description": "Model 50% cohort increase",
  "parameters": {
    "cohortSizeMultiplier": 1.5,
    "investmentMultiplier": 1.2,
    "programMix": {
      "buddySystem": 50,
      "skillShare": 30,
      "mentorship": 15,
      "communityEvents": 5
    }
  },
  "tags": ["growth", "q4-2025"]
}
```

**Response** (201 Created):
```json
{
  "id": "scenario-uuid",
  "name": "Q4 Growth Plan",
  "parameters": { ... },
  "latestResult": null,
  "createdAt": "2025-11-17T12:00:00Z",
  ...
}
```

### Run Scenario

**POST** `/scenarios/:id/run`

```json
{
  "baselinePeriod": {
    "start": "2025-01-01",
    "end": "2025-03-31"
  }
}
```

**Response** (200 OK):
```json
{
  "scenarioId": "scenario-uuid",
  "baseline": {
    "sroi": 3.5,
    "vis": 75.0,
    "socialValue": 5250.0,
    "investment": 1500.0,
    ...
  },
  "projected": {
    "sroi": 4.38,
    "sroiDelta": 0.88,
    "sroiPercentChange": 25.14,
    "vis": 112.5,
    "visDelta": 37.5,
    "visPercentChange": 50.0,
    ...
  },
  "parameters": { ... },
  "confidence": 0.85,
  "calculationDurationMs": 142,
  "warnings": []
}
```

### List Scenarios

**GET** `/scenarios?companyId=uuid&limit=50`

### Get Scenario

**GET** `/scenarios/:id`

### Update Scenario

**PATCH** `/scenarios/:id`

```json
{
  "name": "Updated Name",
  "isFavorite": true
}
```

### Delete Scenario

**DELETE** `/scenarios/:id`

### Get Results History

**GET** `/scenarios/:id/results?limit=10`

---

## Scenario Parameters

### Cohort Size Multiplier

**Type**: `number` (0.1 - 10.0)

Scales all activity counts proportionally.

**Example**:
- `1.5` = 50% increase in cohort size
- `0.8` = 20% decrease in cohort size

**Impact**:
- Increases/decreases activity counts (matches, events, skill shares, etc.)
- Affects VIS and social value linearly
- Does NOT directly affect investment (use `investmentMultiplier` separately)

### Investment Multiplier

**Type**: `number` (0.1 - 10.0)

Scales total investment costs.

**Example**:
- `1.2` = 20% increase in costs (platform fees, staff time, etc.)
- `0.9` = 10% cost reduction (efficiency gains)

**Impact**:
- Directly affects SROI denominator
- Combined with activity changes to model efficiency scenarios

### Grant Amount Delta

**Type**: `number` (USD)

Adds/subtracts a fixed amount to investment.

**Example**:
- `+5000` = New $5K grant received
- `-1000` = Budget cut

**Impact**:
- Affects investment baseline
- Can be combined with `investmentMultiplier`

### Cohort Duration (Months)

**Type**: `integer` (1 - 60)

Overrides baseline cohort duration.

**Example**:
- Baseline: 3 months
- Override: 6 months → activities roughly double

**Impact**:
- Duration factor applied to all activity counts
- Models extended programs

### Program Mix

**Type**: `object` (percentages must sum to 100)

Reallocates resources across programs.

**Example**:
```json
{
  "buddySystem": 50,
  "skillShare": 30,
  "mentorship": 15,
  "communityEvents": 5
}
```

**Impact**:
- Affects SDG coverage (different programs map to different SDGs)
- SDG 4 (Education) → Skill Share, Mentorship
- SDG 8 (Decent Work) → Buddy System, Skill Share
- SDG 10 (Inequalities) → Buddy System, Community Events
- SDG 17 (Partnerships) → Community Events

### Activity Rates

**Type**: `object` (per-month overrides)

Fine-tune engagement frequencies.

**Example**:
```json
{
  "matchesPerMonth": 10,
  "eventsPerMonth": 15,
  "skillSharesPerMonth": 5
}
```

**Impact**:
- Overrides default activity assumptions
- Advanced parameter for modeling behavioral changes

---

## Calculation Formulas

### VIS (Volunteer Impact Score)

```
VIS = Σ (activity_count × points × decay_weight)
```

**Points**:
- Match Created: 10
- Event Attended: 5
- Skill Share Completed: 15
- Feedback Submitted: 8
- Milestone Reached: 20
- Check-in Completed: 3

### SROI (Social Return on Investment)

```
SROI = Social Value / Investment
```

**Social Value**:
```
Social Value = Σ (activity_count × valuation_weight)
```

**Valuation Weights** (same as VIS points for simplicity in Phase 1):
- Buddy Match: 10
- Event Attended: 5
- Skill Share: 15
- Feedback: 8
- Milestone: 20
- Check-in: 3

### SDG Coverage

```
Coverage_Delta = Base_Coverage × (1 + Impact_Factor × SDG_Weight)
```

**Impact Factor**: Calculated from program mix alignment

**SDG Weights**:
- SDG 4: 0.8 (Education)
- SDG 8: 0.7 (Decent Work)
- SDG 10: 0.6 (Inequalities)
- SDG 17: 0.5 (Partnerships)

### Confidence Score

```
Confidence = 1.0
  - (0.2 if cohort multiplier > 2x or < 0.5x)
  - (0.15 if investment multiplier > 2x or < 0.5x)
  - (0.1 if total activities < 100)
```

**Range**: 0.1 - 1.0

---

## UI Walkthrough

### 1. Create Scenario

1. Navigate to `/cockpit/[companyId]/scenarios`
2. Click "New Scenario"
3. Enter name and description
4. Adjust sliders/inputs for parameters
5. Click "Save"

### 2. Run Scenario

1. Select scenario from list
2. Click "Run Scenario"
3. View baseline vs. projected metrics
4. Review warnings (if any)

### 3. Compare Scenarios

1. Select 2-3 scenarios using checkboxes
2. Click "Compare"
3. View side-by-side charts
4. See which scenario has best SROI/VIS/SDG coverage

### 4. Export to Deck

1. Select scenario
2. Click "Export to Deck"
3. Choose format (PPTX / PDF / JSON)
4. Select slides to include
5. Download

---

## Example Use Cases

### Use Case 1: Growth Planning

**Scenario**: Company wants to increase cohort size by 50% for Q4.

**Parameters**:
- `cohortSizeMultiplier`: 1.5
- `investmentMultiplier`: 1.2 (modest cost increase)

**Expected Outcome**:
- VIS increases ~50%
- Social value increases ~50%
- SROI increases ~25% (efficiency gains from scale)

### Use Case 2: Budget Constraints

**Scenario**: Budget cut of $500 but maintain same cohort size.

**Parameters**:
- `grantAmountDelta`: -500
- `cohortSizeMultiplier`: 1.0

**Expected Outcome**:
- VIS unchanged
- Social value unchanged
- SROI **decreases** (less efficient due to fixed costs)

### Use Case 3: Program Reallocation

**Scenario**: Shift focus to Skill Share to improve SDG 4 (Education) coverage.

**Parameters**:
- `programMix`: { buddySystem: 25, skillShare: 55, mentorship: 15, communityEvents: 5 }

**Expected Outcome**:
- SDG 4 coverage increases
- SDG 8 coverage increases (Skill Share also maps to Decent Work)
- SDG 10 coverage decreases (less Buddy System focus)

### Use Case 4: Extended Cohorts

**Scenario**: Extend cohort duration from 3 months to 6 months.

**Parameters**:
- `cohortDurationMonths`: 6
- `investmentMultiplier`: 1.3 (longer programs cost more)

**Expected Outcome**:
- Activity counts roughly double
- VIS and social value roughly double
- SROI increases moderately (longer engagement yields more value)

---

## Testing

### Unit Tests

Run scenario engine tests:

```bash
cd services/forecast
pnpm test src/__tests__/scenario-engine.test.ts
```

**Key Tests**:
- ✅ Determinism: Same inputs produce same outputs
- ✅ Performance: Execution < 800ms (p95)
- ✅ Scaling: Cohort multiplier correctly scales activities
- ✅ SROI: Calculations match expected formulas
- ✅ Validation: Invalid parameters are rejected
- ✅ Edge cases: Empty parameters, extreme values

### API Contract Tests

Run scenario API tests:

```bash
cd services/forecast
pnpm test src/__tests__/scenario-api.test.ts
```

**Key Tests**:
- ✅ Create scenario (POST /scenarios)
- ✅ List scenarios (GET /scenarios)
- ✅ Get scenario (GET /scenarios/:id)
- ✅ Run scenario (POST /scenarios/:id/run)
- ✅ Update scenario (PATCH /scenarios/:id)
- ✅ Delete scenario (DELETE /scenarios/:id)

### E2E Tests

Run end-to-end flow:

```bash
cd services/forecast
pnpm test:e2e
```

**Flow**:
1. Create scenario
2. Run scenario
3. Verify results
4. Export to deck (PPTX)
5. Validate file

---

## Performance Benchmarks

### Engine Performance

**Target**: p95 ≤ 800ms

**Measured** (on sample data):
- p50: ~140ms
- p95: ~250ms
- p99: ~350ms

**Optimization Techniques**:
- No external API calls during calculation
- Pure JavaScript calculations (no database queries)
- Cached baseline metrics (15-minute TTL)

### API Latency

**Target**: p95 ≤ 1000ms (including DB persistence)

**Measured**:
- POST /scenarios: ~180ms
- POST /scenarios/:id/run: ~400ms
- GET /scenarios: ~120ms

---

## Database Schema

### `scenarios` Table

```sql
CREATE TABLE scenarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(100) NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  parameters JSONB NOT NULL,
  tags JSONB,
  latest_result JSONB,
  created_by VARCHAR(100) NOT NULL,
  updated_by VARCHAR(100) NOT NULL,
  is_favorite BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX scenarios_company_idx ON scenarios(company_id);
CREATE INDEX scenarios_tenant_idx ON scenarios(tenant_id);
CREATE INDEX scenarios_favorite_idx ON scenarios(company_id, is_favorite);
```

### `scenario_executions` Table

```sql
CREATE TABLE scenario_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scenario_id UUID NOT NULL REFERENCES scenarios(id) ON DELETE CASCADE,
  result JSONB NOT NULL,
  executed_by VARCHAR(100) NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX scenario_executions_scenario_idx ON scenario_executions(scenario_id);
CREATE INDEX scenario_executions_executed_at_idx ON scenario_executions(executed_at);
```

---

## Future Enhancements

### Phase 2 Roadmap

1. **Advanced Modeling**
   - Monte Carlo simulations (probabilistic scenarios)
   - Sensitivity analysis (which parameters matter most?)
   - Multi-year projections

2. **Collaboration Features**
   - Shared scenarios across teams
   - Comments and annotations
   - Approval workflows

3. **Integration**
   - Live baseline metrics from Analytics Service (replace stub)
   - Impact-In API integration for real program data
   - Slack/Teams notifications for scenario runs

4. **Visualization**
   - Interactive charts (drill-down by SDG)
   - Heatmaps for parameter sensitivity
   - Animated scenario comparisons

---

## Support

**Issues**: https://github.com/henrigkroine/TEEI-CSR-Platform/issues

**Docs**: `/docs/analytics/scenario_planner.md` (this file)

**API Spec**: `/packages/openapi/scenario.yaml`
