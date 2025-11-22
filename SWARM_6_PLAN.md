# SWARM 6: BENEFICIARY GROUPS, CAMPAIGNS & MONETIZATION HOOKS
## Comprehensive Multi-Agent Orchestration Plan

**Status**: 📋 PLANNING - AWAITING APPROVAL
**Created**: 2025-11-22
**Branch**: `claude/beneficiary-campaigns-monetization-01V4be5NasbpFxBD2A5TACCM`

---

## 🎯 Executive Summary

### Mission
Build a **Beneficiary & Campaign Layer** that transforms the TEEI CSR Platform from a general-purpose impact tracking system into a **sellable, campaign-centric product** that enables companies to purchase and execute targeted CSR initiatives like:

- "Mentors for Syrian Refugees in Berlin"
- "Language Connect for Afghan Women in Oslo"
- "Buddy Program for Migrants in Germany"
- "Tech Upskilling for Newcomers in Norway"

### Current State Analysis

**✅ What Exists** (Strong Foundation):
- **Billing System**: Stripe integration with subscriptions, usage metering, invoices
- **L2I Bundles**: License-to-Impact SKUs (L2I-250, L2I-500, L2I-EXPAND, L2I-LAUNCH)
- **Program Allocations**: Track learners served per program (language, mentorship, upskilling, weei)
- **Impact Metrics**: SROI & VIS calculators operational
- **Simple Programs Table**: company_id, program_type, budget, participant_count
- **Event-Driven Architecture**: NATS JetStream for cross-service communication
- **Corporate Cockpit**: Dashboard showing company-level metrics

**❌ What's Missing** (Critical Gaps):
- **No BeneficiaryGroup Model**: Can't define target populations (refugees, migrants, women-in-tech, etc.)
- **No Campaign Model**: Can't link Company + Template + Group + Period + Commercial Terms
- **No Program Templates**: Programs are flat; no template/instance pattern for reusability
- **No Campaign-Level Metrics**: SROI/VIS calculated per company, not per campaign
- **No Granular Monetization**: Can buy L2I bundles, but can't buy specific campaigns
- **No Beneficiary Demographics**: No privacy-safe way to categorize participants
- **No Capacity Management**: No seat/credit tracking per campaign
- **No Campaign APIs**: Can't create/manage campaigns programmatically

### Solution Overview

SWARM 6 will implement **3 core entities** and their surrounding infrastructure:

```
┌─────────────────────────────────────────────────────────────┐
│                    BENEFICIARY GROUPS                        │
│  (Reusable definitions of target populations)               │
│  - Type: refugees, migrants, women-in-tech, youth, etc.     │
│  - Geography: country, region, city                          │
│  - Language requirements, eligibility rules                  │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    PROGRAM TEMPLATES                         │
│  (Reusable program formats)                                  │
│  - Mentorship Template (1-on-1, duration, outcomes)         │
│  - Language Template (group size, frequency, levels)        │
│  - Buddy Template (matching criteria, lifecycle)            │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                        CAMPAIGNS                             │
│  (Sellable CSR products)                                     │
│  = Template + Group + Company + Period + Commercial Terms   │
│                                                              │
│  Example: "Mentors for Syrian Refugees"                     │
│  - Template: Mentorship (1-on-1, 6 months, career focus)   │
│  - Group: Syrian Refugees (Germany, Arabic/English)         │
│  - Company: Acme Corp                                        │
│  - Period: Q1 2025                                          │
│  - Commercial: 50 seats, €25k budget, IAAS pricing          │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                   PROGRAM INSTANCES                          │
│  (Runtime execution of campaigns)                            │
│  - Inherits template configuration                          │
│  - Enforces campaign capacity constraints                   │
│  - Links sessions/activities to campaign                    │
│  - Generates campaign-level impact metrics                  │
└─────────────────────────────────────────────────────────────┘
```

### Impact

**For Sales & Business**:
- ✅ **Sellable Products**: "Mentors for Syrian Refugees" becomes a SKU with pricing
- ✅ **Upsell Opportunities**: Usage tracking enables data-driven expansion
- ✅ **Pricing Flexibility**: Seats, credits, bundles, IAAS models all supported
- ✅ **Impact Storytelling**: Campaign-level metrics for donor/customer reports

**For Corporates (Customers)**:
- ✅ **Targeted Impact**: Choose specific beneficiary groups aligned with values
- ✅ **Transparent Reporting**: See SROI/VIS per campaign, not just company-wide
- ✅ **Budget Control**: Allocate budgets per campaign with capacity tracking
- ✅ **Multi-Campaign Management**: Run multiple campaigns in parallel

**For Platform (Technical)**:
- ✅ **Data Model Clarity**: Template → Instance pattern enforces consistency
- ✅ **Extensibility**: Easy to add new templates and beneficiary groups
- ✅ **Privacy-First**: Demographics stored at group level, not individual PII
- ✅ **Integration-Ready**: Campaigns map cleanly to Impact-In deliveries

---

## 🏗️ System Architecture Design

### Data Model

#### 1. **BeneficiaryGroups** Table

```typescript
interface BeneficiaryGroup {
  id: uuid;
  name: string; // "Syrian Refugees", "Afghan Women", "Migrants in Germany"
  description: text;

  // Classification
  groupType: 'refugees' | 'migrants' | 'asylum_seekers' | 'women_in_tech'
            | 'youth' | 'seniors' | 'displaced_persons' | 'newcomers' | 'other';

  // Geography (broad categories, not individual PII)
  countryCode: string; // ISO 3166-1 alpha-2
  region?: string; // State/province/region
  city?: string; // Optional city targeting

  // Demographics (aggregated, not individual)
  ageRange?: { min: number; max: number }; // e.g., 18-35
  genderFocus?: 'all' | 'women' | 'men' | 'non_binary' | 'mixed';

  // Language & Eligibility
  primaryLanguages: string[]; // ['ar', 'en'] for Arabic/English
  languageRequirement: 'fluent' | 'conversational' | 'beginner' | 'any';

  // Legal/Status (broad categories only)
  legalStatusCategories?: ('refugee' | 'asylum_seeker' | 'migrant' | 'citizen' | 'other')[];

  // Program Eligibility
  eligibleProgramTypes: ('mentorship' | 'language' | 'buddy' | 'upskilling' | 'weei')[];

  // Constraints
  minGroupSize?: number; // Minimum participants for viability
  maxGroupSize?: number; // Maximum capacity

  // Metadata
  tags: string[]; // ['integration', 'employment', 'women', 'tech']
  partnerOrganizations?: string[]; // ['UNHCR', 'Red Cross']

  isActive: boolean;
  createdAt: timestamp;
  updatedAt: timestamp;
  createdBy: uuid; // Admin user
}
```

**Privacy Safeguards**:
- ❌ NO individual PII stored (no names, emails, addresses)
- ✅ Aggregated demographics only (age ranges, not birthdates)
- ✅ Broad legal status categories (not visa details)
- ✅ GDPR-compliant (group-level data, not individual tracking)

#### 2. **ProgramTemplates** Table

```typescript
interface ProgramTemplate {
  id: uuid;
  name: string; // "Mentorship 1-on-1", "Language Group Sessions", "Buddy Matching"
  description: text;

  // Template Classification
  programType: 'mentorship' | 'language' | 'buddy' | 'upskilling' | 'weei';
  version: string; // "1.0.0" for versioning

  // Configuration Schema (JSONB - flexible structure)
  defaultConfig: {
    // Mentorship Template
    sessionFormat?: '1-on-1' | 'group' | 'hybrid';
    sessionDuration?: number; // minutes
    sessionFrequency?: 'weekly' | 'bi-weekly' | 'monthly';
    totalDuration?: number; // weeks or months
    matchingCriteria?: string[]; // ['skills', 'industry', 'language']

    // Language Template
    classSizeMin?: number;
    classSizeMax?: number;
    proficiencyLevels?: ('A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2')[];
    targetLanguages?: string[]; // ['en', 'no', 'de']

    // Buddy Template
    matchMethod?: 'skill_based' | 'random' | 'interest_based';
    pairDuration?: number; // weeks
    checkInFrequency?: 'weekly' | 'bi-weekly';

    // Upskilling Template
    coursePlatforms?: ('linkedin_learning' | 'coursera' | 'udemy' | 'custom')[];
    certificationRequired?: boolean;
    skillTracks?: string[]; // ['data_analytics', 'cloud', 'web_dev']
  };

  // Capacity Defaults
  defaultMinParticipants: number;
  defaultMaxParticipants: number;
  defaultVolunteersNeeded: number;

  // Outcomes Tracked
  outcomeMetrics: string[]; // ['integration', 'language', 'job_readiness']

  // Eligibility
  suitableForGroups: string[]; // Tags matching BeneficiaryGroup.tags

  // Monetization Hints (for pricing guidance)
  estimatedCostPerParticipant?: number; // USD/EUR
  estimatedHoursPerVolunteer?: number;

  isActive: boolean;
  isPublic: boolean; // Can all companies use this template?
  createdAt: timestamp;
  updatedAt: timestamp;
  createdBy: uuid;
}
```

#### 3. **Campaigns** Table (Core Entity)

```typescript
interface Campaign {
  id: uuid;
  name: string; // "Mentors for Syrian Refugees - Q1 2025"
  description: text;

  // Relationships
  companyId: uuid; // FK to companies
  programTemplateId: uuid; // FK to program_templates
  beneficiaryGroupId: uuid; // FK to beneficiary_groups

  // Period
  startDate: date;
  endDate: date;
  quarter?: string; // "2025-Q1" for reporting alignment

  // Lifecycle State
  status: 'draft' | 'planned' | 'recruiting' | 'active' | 'paused' | 'completed' | 'closed';

  // Capacity & Quotas
  targetVolunteers: number; // Committed seats
  currentVolunteers: number; // Actual enrolled
  targetBeneficiaries: number;
  currentBeneficiaries: number;
  maxSessions?: number;
  currentSessions: number;

  // Budget
  budgetAllocated: decimal; // Total budget (EUR/USD)
  budgetSpent: decimal; // Current spend
  currency: string; // 'EUR', 'USD'

  // Commercial Terms (Monetization)
  pricingModel: 'seats' | 'credits' | 'bundle' | 'iaas' | 'custom';

  // Seats Model
  committedSeats?: number; // Purchased volunteer slots
  seatPricePerMonth?: decimal;

  // Credits Model
  creditAllocation?: number; // Impact credits allocated
  creditConsumptionRate?: decimal; // Credits per session/hour
  creditsRemaining?: number;

  // IAAS Model
  iaasMetrics?: {
    learnersCommitted: number;
    pricePerLearner: decimal;
    outcomesGuaranteed: string[]; // ['job_readiness > 0.7']
  };

  // Bundle Model (if part of L2I bundle)
  l2iSubscriptionId?: uuid; // FK to l2i_subscriptions
  bundleAllocationPercentage?: decimal; // 0.25 = 25% of bundle

  // Configuration Overrides (from template)
  configOverrides: jsonb; // Company-specific tweaks to template

  // Impact Metrics (Aggregated from ProgramInstances)
  cumulativeSROI?: decimal;
  averageVIS?: decimal;
  totalHoursLogged: decimal;
  totalSessionsCompleted: number;

  // Upsell Indicators
  capacityUtilization: decimal; // current / target (0-1+)
  isNearCapacity: boolean; // Trigger for upsell
  isOverCapacity: boolean; // Needs expansion

  // Lineage & Evidence
  evidenceSnippetIds: uuid[]; // Top evidence for this campaign

  // Metadata
  tags: string[];
  internalNotes: text; // For sales/CS notes

  isActive: boolean;
  createdAt: timestamp;
  updatedAt: timestamp;
  lastMetricsUpdateAt: timestamp;
  createdBy: uuid;
}
```

#### 4. **ProgramInstances** Table (Runtime Execution)

```typescript
interface ProgramInstance {
  id: uuid;
  name: string; // "Mentors for Syrian Refugees - Cohort 1"

  // Relationships
  campaignId: uuid; // FK to campaigns
  programTemplateId: uuid; // FK to program_templates (denormalized from campaign)
  companyId: uuid; // FK to companies (denormalized from campaign)
  beneficiaryGroupId: uuid; // FK (denormalized from campaign)

  // Execution Period
  startDate: date;
  endDate: date;

  // Status
  status: 'planned' | 'active' | 'paused' | 'completed';

  // Configuration (inherited from template + campaign overrides)
  config: jsonb; // Merged template.defaultConfig + campaign.configOverrides

  // Participants (Counts only, no PII)
  enrolledVolunteers: number;
  enrolledBeneficiaries: number;
  activePairs?: number; // For buddy/mentorship
  activeGroups?: number; // For language

  // Activity Tracking
  totalSessionsHeld: number;
  totalHoursLogged: decimal;

  // Impact Metrics (Instance-specific)
  sroiScore?: decimal;
  averageVISScore?: decimal;
  outcomeScores: jsonb; // { integration: 0.65, language: 0.78, job_readiness: 0.82 }

  // Capacity Consumed (for campaign quota tracking)
  volunteersConsumed: number; // Counts toward campaign.committedSeats
  creditsConsumed?: decimal; // Counts toward campaign.creditAllocation
  learnersServed: number; // Counts toward IAAS commitments

  // Timestamps
  createdAt: timestamp;
  updatedAt: timestamp;
  lastActivityAt: timestamp;
}
```

**Key Design Decisions**:
1. **Denormalization**: ProgramInstance duplicates companyId, templateId, groupId for query performance
2. **Immutability**: Once created, template links are frozen (use versioning for changes)
3. **Aggregation**: Campaign metrics are aggregated from all ProgramInstances
4. **Privacy**: No individual PII; all tracking at aggregate level

#### 5. **CampaignMetricsSnapshots** Table (Time-Series)

```typescript
interface CampaignMetricsSnapshot {
  id: uuid;
  campaignId: uuid;
  snapshotDate: timestamp;

  // Capacity Metrics
  volunteers: { target: number; current: number; utilization: number };
  beneficiaries: { target: number; current: number; utilization: number };
  sessions: { target: number; current: number; utilization: number };

  // Financial Metrics
  budget: { allocated: decimal; spent: decimal; remaining: decimal };

  // Impact Metrics
  sroi: decimal;
  averageVIS: decimal;
  totalHours: decimal;

  // Credits/Seats (if applicable)
  seatsUsed?: number;
  creditsConsumed?: decimal;
  learnersServed?: number;

  // Stored as JSONB for dashboarding
  fullSnapshot: jsonb;

  createdAt: timestamp;
}
```

### Relationships Diagram

```
companies (1) ──── (N) campaigns
beneficiary_groups (1) ──── (N) campaigns
program_templates (1) ──── (N) campaigns

campaigns (1) ──── (N) program_instances
campaigns (1) ──── (N) campaign_metrics_snapshots

program_instances (1) ──── (N) kintell_sessions
program_instances (1) ──── (N) buddy_matches
program_instances (1) ──── (N) upskilling_completions

l2i_subscriptions (1) ──── (N) campaigns (optional)

billingUsageRecords ────→ campaigns (via metadata.campaignId)
```

### Integration Points

#### With Existing Systems:

**1. Billing System** (`packages/shared-schema/src/schema/billing.ts`):
- **Link**: `campaigns.l2iSubscriptionId` → `l2iSubscriptions.id`
- **Flow**: L2I Bundle purchase → Create campaigns with allocations
- **Usage Metering**: Track seats/credits per campaign → `billingUsageRecords`

**2. Impact Calculators** (`services/reporting/src/calculators/`):
- **Enhancement**: Extend `getSROIForCompany()` to accept `campaignId`
- **New Functions**:  - `getSROIForCampaign(campaignId, period)`
  - `getVISForCampaign(campaignId)`
  - `aggregateCampaignMetrics(campaignId)`

**3. Ingestion Services** (`services/kintell-connector`, `services/buddy-service`):
- **Enhancement**: Add `programInstanceId` to session events
- **Association Logic**: Match session → instance → campaign based on:
  - userId → beneficiaryGroup (via tags/matching)
  - companyId
  - sessionDate within campaign period

**4. Corporate Cockpit** (`apps/corp-cockpit-astro`):
- **New Pages**:
  - `/cockpit/[companyId]/campaigns` - List all campaigns
  - `/cockpit/[companyId]/campaigns/[campaignId]` - Campaign detail dashboard
  - `/cockpit/[companyId]/campaigns/new` - Create campaign wizard
- **Widgets**:
  - Campaign capacity gauge (volunteers, beneficiaries, budget)
  - Campaign impact tiles (SROI, VIS per campaign)
  - Campaign timeline & milestones

**5. Evidence Explorer** (`apps/corp-cockpit-astro/src/components/evidence`):
- **Filter**: Add campaign filter to evidence queries
- **Lineage**: Show metric → campaign → evidence chain

---

## 👥 30-Agent Task Breakdown

### **Team 1: Domain & Data Model** (6 Agents)

#### **Agent 1.1: beneficiary-domain-analyst**
**Role**: Privacy-First Beneficiary Group Design
**Responsibilities**:
- Define BeneficiaryGroup schema with GDPR compliance
- Balance descriptive power with privacy (no individual PII)
- Design eligibility rules framework
- Document sensitivity analysis (what CAN vs CANNOT be stored)

**Deliverables**:
- `packages/shared-schema/src/schema/beneficiary-groups.ts`
- `docs/BENEFICIARY_GROUPS_PRIVACY.md`
- Zod validation schemas

**Dependencies**: None (foundational)
**Tools**: Read, Write, Grep
**Model**: Sonnet

---

#### **Agent 1.2: campaign-domain-analyst**
**Role**: Campaign Entity Design
**Responsibilities**:
- Define Campaign schema linking templates, groups, companies
- Design lifecycle state machine (draft → active → completed)
- Define capacity/quota management fields
- Design monetization metadata fields

**Deliverables**:
- `packages/shared-schema/src/schema/campaigns.ts`
- `docs/CAMPAIGN_LIFECYCLE.md`
- State transition diagrams

**Dependencies**: Agent 1.1 (beneficiary schema)
**Tools**: Read, Write, Edit
**Model**: Sonnet

---

#### **Agent 1.3: program-template-modeler**
**Role**: Program Template Framework
**Responsibilities**:
- Design ProgramTemplate schema for reusability
- Define config schemas for each program type (mentorship, language, buddy, upskilling)
- Design template versioning strategy
- Create default templates for 4 program types

**Deliverables**:
- `packages/shared-schema/src/schema/program-templates.ts`
- `scripts/seed/templates/mentorship-template.sql`
- `scripts/seed/templates/language-template.sql`
- `scripts/seed/templates/buddy-template.sql`
- `scripts/seed/templates/upskilling-template.sql`
- `docs/PROGRAM_TEMPLATES_GUIDE.md`

**Dependencies**: None (parallel to 1.1/1.2)
**Tools**: Read, Write
**Model**: Sonnet

---

#### **Agent 1.4: program-instance-modeler**
**Role**: Runtime Execution Model
**Responsibilities**:
- Design ProgramInstance schema (inherits from template + campaign)
- Define how instances consume campaign capacity
- Design activity association logic (sessions → instances)
- Define metrics aggregation rules (instance → campaign)

**Deliverables**:
- `packages/shared-schema/src/schema/program-instances.ts`
- `docs/INSTANCE_LIFECYCLE.md`
- Aggregation query examples

**Dependencies**: Agents 1.2, 1.3 (campaign + template schemas)
**Tools**: Read, Write
**Model**: Sonnet

---

#### **Agent 1.5: monetization-metadata-modeler**
**Role**: Commercial Terms Design
**Responsibilities**:
- Extend Campaign schema with pricing fields (seats, credits, IAAS, bundles)
- Design seat/credit consumption tracking
- Define upsell trigger indicators (capacity utilization, overages)
- Link campaigns to L2I subscriptions

**Deliverables**:
- Enhanced `campaigns` schema with pricing fields
- `docs/CAMPAIGN_PRICING_MODELS.md`
- Upsell logic specifications

**Dependencies**: Agent 1.2 (campaign schema)
**Tools**: Read, Edit
**Model**: Sonnet

---

#### **Agent 1.6: metrics-snapshot-designer**
**Role**: Time-Series Campaign Metrics
**Responsibilities**:
- Design CampaignMetricsSnapshot schema for historical tracking
- Define snapshot frequency (daily, weekly, monthly)
- Design aggregation queries for dashboard time-series charts
- Design retention policies (how long to keep snapshots)

**Deliverables**:
- `packages/shared-schema/src/schema/campaign-metrics-snapshots.ts`
- `docs/METRICS_RETENTION_POLICY.md`
- Grafana dashboard query examples

**Dependencies**: Agent 1.2 (campaign schema)
**Tools**: Read, Write
**Model**: Sonnet

---

### **Team 2: Schema Implementation & Migration** (4 Agents)

#### **Agent 2.1: drizzle-schema-engineer**
**Role**: Implement Drizzle Schemas
**Responsibilities**:
- Translate design specs to Drizzle ORM schemas
- Define indexes for query performance
- Add foreign key constraints
- Implement JSONB field types with proper typings

**Deliverables**:
- `packages/shared-schema/src/schema/beneficiary-groups.ts` (Drizzle)
- `packages/shared-schema/src/schema/campaigns.ts` (Drizzle)
- `packages/shared-schema/src/schema/program-templates.ts` (Drizzle)
- `packages/shared-schema/src/schema/program-instances.ts` (Drizzle)
- `packages/shared-schema/src/schema/campaign-metrics-snapshots.ts` (Drizzle)

**Dependencies**: Team 1 (all design specs)
**Tools**: Read, Write, Edit
**Model**: Sonnet

---

#### **Agent 2.2: migration-engineer**
**Role**: Create Database Migrations
**Responsibilities**:
- Write SQL migration scripts for 5 new tables
- Ensure migration idempotency
- Write rollback scripts
- Test migrations on seed data

**Deliverables**:
- `packages/shared-schema/migrations/XXX_create_beneficiary_groups.sql`
- `packages/shared-schema/migrations/XXX_create_campaigns.sql`
- `packages/shared-schema/migrations/XXX_create_program_templates.sql`
- `packages/shared-schema/migrations/XXX_create_program_instances.sql`
- `packages/shared-schema/migrations/XXX_create_campaign_metrics_snapshots.sql`
- Rollback scripts

**Dependencies**: Agent 2.1 (schemas)
**Tools**: Write, Bash
**Model**: Sonnet

---

#### **Agent 2.3: seed-data-engineer**
**Role**: Create Realistic Seed Data
**Responsibilities**:
- Create 5+ beneficiary groups (Syrian Refugees, Afghan Women, Migrants, etc.)
- Create 4 program templates (mentorship, language, buddy, upskilling)
- Create 10+ campaigns linking companies, templates, groups
- Create program instances for each campaign
- Ensure data integrity and realistic relationships

**Deliverables**:
- `scripts/seed/beneficiary-groups.sql`
- `scripts/seed/program-templates.sql`
- `scripts/seed/campaigns.sql`
- `scripts/seed/program-instances.sql`

**Dependencies**: Agent 2.2 (migrations)
**Tools**: Write
**Model**: Sonnet

---

#### **Agent 2.4: type-definitions-engineer**
**Role**: TypeScript Type Definitions
**Responsibilities**:
- Export TypeScript types from Drizzle schemas
- Create Zod validation schemas for API inputs
- Create shared types package exports
- Ensure type safety across services

**Deliverables**:
- `packages/shared-types/src/campaigns.ts`
- `packages/shared-types/src/beneficiary-groups.ts`
- `packages/shared-types/src/program-templates.ts`
- Updated `packages/shared-types/src/index.ts`

**Dependencies**: Agent 2.1 (Drizzle schemas)
**Tools**: Read, Write
**Model**: Sonnet

---

### **Team 3: Campaign Engine & Association** (6 Agents)

#### **Agent 3.1: campaign-instantiator**
**Role**: Campaign Creation Logic
**Responsibilities**:
- Implement campaign creation service
- Validate template + group compatibility
- Auto-create initial ProgramInstance when campaign starts
- Handle config merging (template defaults + company overrides)

**Deliverables**:
- `services/campaigns/src/lib/campaign-instantiator.ts`
- `services/campaigns/src/lib/campaign-validator.ts`
- Unit tests

**Dependencies**: Team 2 (schemas, types)
**Tools**: Write, Bash
**Model**: Sonnet

---

#### **Agent 3.2: activity-associator**
**Role**: Link Sessions/Events to Campaigns
**Responsibilities**:
- Implement logic to associate ingested activities to campaigns
- Match based on: userId → group tags, companyId, date within period
- Handle ambiguous cases (user eligible for multiple campaigns)
- Backfill historical data association

**Deliverables**:
- `services/campaigns/src/lib/activity-associator.ts`
- `services/campaigns/src/lib/backfill-associations.ts`
- Association tests

**Dependencies**: Agent 3.1 (campaign creation)
**Tools**: Write, Read, Grep
**Model**: Sonnet

---

#### **Agent 3.3: capacity-tracker**
**Role**: Campaign Capacity & Quota Management
**Responsibilities**:
- Implement seat/credit consumption tracking
- Enforce capacity limits (reject enrollments if at capacity)
- Calculate utilization percentages
- Trigger alerts when near capacity (80%, 100%, 110%)

**Deliverables**:
- `services/campaigns/src/lib/capacity-tracker.ts`
- `services/campaigns/src/lib/capacity-alerts.ts`
- Capacity enforcement middleware

**Dependencies**: Agent 3.1
**Tools**: Write
**Model**: Sonnet

---

#### **Agent 3.4: campaign-lifecycle-manager**
**Role**: State Machine & Transitions
**Responsibilities**:
- Implement campaign state transitions (draft → planned → active → completed)
- Auto-transition based on dates (active on startDate, completed on endDate)
- Handle manual transitions (pause, resume, close early)
- Trigger side effects on state changes (send notifications, update metrics)

**Deliverables**:
- `services/campaigns/src/lib/lifecycle-manager.ts`
- `services/campaigns/src/lib/state-transitions.ts`
- Lifecycle tests

**Dependencies**: Agent 3.1
**Tools**: Write
**Model**: Sonnet

---

#### **Agent 3.5: metrics-aggregator**
**Role**: Campaign-Level Metrics Calculation
**Responsibilities**:
- Aggregate SROI/VIS from all ProgramInstances → Campaign
- Calculate cumulative totals (hours, sessions, beneficiaries served)
- Update Campaign metrics fields on schedule (hourly, daily)
- Create CampaignMetricsSnapshots for time-series

**Deliverables**:
- `services/campaigns/src/lib/metrics-aggregator.ts`
- `services/campaigns/src/jobs/aggregate-campaign-metrics.ts` (cron job)
- Aggregation tests

**Dependencies**: Team 2 (schemas), Agent 3.1
**Tools**: Write, Read
**Model**: Sonnet

---

#### **Agent 3.6: campaign-service-api**
**Role**: Campaign Management API
**Responsibilities**:
- Implement REST/tRPC endpoints:
  - `POST /campaigns` - Create campaign
  - `GET /campaigns/:id` - Get campaign details
  - `PATCH /campaigns/:id` - Update campaign
  - `GET /campaigns` - List campaigns (filters: companyId, status, groupId, templateId)
  - `GET /campaigns/:id/metrics` - Get campaign metrics
  - `GET /campaigns/:id/instances` - List program instances
- Input validation with Zod
- Authorization (company admins only)

**Deliverables**:
- `services/campaigns/src/routes/campaigns.ts`
- OpenAPI spec
- API tests

**Dependencies**: Agents 3.1-3.5 (all campaign logic)
**Tools**: Write, Bash
**Model**: Sonnet

---

### **Team 4: Integration & Impact Calculation** (5 Agents)

#### **Agent 4.1: sroi-campaign-integrator**
**Role**: Extend SROI Calculator for Campaigns
**Responsibilities**:
- Extend `services/reporting/src/calculators/sroi.ts`
- Add `getSROIForCampaign(campaignId, period?)`
- Filter volunteer hours, outcome scores by campaign
- Update SROI calculation queries to support campaign filtering

**Deliverables**:
- Enhanced `sroi.ts` with campaign support
- `getSROIForCampaign()` function
- Campaign SROI tests

**Dependencies**: Team 2 (schemas), Team 3 (campaign service)
**Tools**: Read, Edit
**Model**: Sonnet

---

#### **Agent 4.2: vis-campaign-integrator**
**Role**: Extend VIS Calculator for Campaigns
**Responsibilities**:
- Extend `services/reporting/src/calculators/vis.ts`
- Add `getVISForCampaign(campaignId)`
- Calculate average VIS across campaign volunteers
- Add campaign-level VIS bands

**Deliverables**:
- Enhanced `vis.ts` with campaign support
- `getVISForCampaign()` function
- Campaign VIS tests

**Dependencies**: Team 2, Team 3
**Tools**: Read, Edit
**Model**: Sonnet

---

#### **Agent 4.3: ingestion-enhancer**
**Role**: Link Ingested Data to Campaigns
**Responsibilities**:
- Update `services/kintell-connector` to tag sessions with `programInstanceId`
- Update `services/buddy-service` to link matches to campaigns
- Update `services/upskilling-connector` to link completions to campaigns
- Implement fallback logic if campaign unknown

**Deliverables**:
- Enhanced ingestion services with campaign linking
- Migration scripts for historical data
- Ingestion tests

**Dependencies**: Agent 3.2 (activity associator)
**Tools**: Read, Edit, Grep
**Model**: Sonnet

---

#### **Agent 4.4: evidence-campaign-linker**
**Role**: Campaign Evidence Lineage
**Responsibilities**:
- Link evidence snippets to campaigns
- Extend Evidence Explorer to filter by campaign
- Update lineage queries to show: metric → campaign → evidence
- Populate `campaigns.evidenceSnippetIds` with top evidence

**Deliverables**:
- Enhanced evidence lineage queries
- Campaign evidence API endpoints
- Evidence Explorer campaign filter

**Dependencies**: Team 3 (campaigns)
**Tools**: Read, Edit
**Model**: Sonnet

---

#### **Agent 4.5: dashboard-data-provider**
**Role**: Campaign Dashboard Data APIs
**Responsibilities**:
- Implement dashboard data endpoints:
  - `GET /api/campaigns/:id/dashboard` - All metrics for dashboard
  - `GET /api/campaigns/:id/time-series` - Metrics over time
  - `GET /api/campaigns/:id/capacity` - Capacity utilization
  - `GET /api/campaigns/:id/financials` - Budget spend tracking
- Optimize queries for dashboard performance
- Add caching layer (Redis)

**Deliverables**:
- `services/reporting/src/routes/campaign-dashboard.ts`
- Cached query layer
- Dashboard API tests

**Dependencies**: Agent 3.5 (metrics aggregator)
**Tools**: Write, Read
**Model**: Sonnet

---

### **Team 5: Monetization Hooks** (5 Agents)

#### **Agent 5.1: billing-integrator**
**Role**: Link Campaigns to Billing System
**Responsibilities**:
- Link campaigns to L2I subscriptions
- Track seat/credit usage per campaign → `billingUsageRecords`
- Implement campaign usage reporting for invoicing
- Handle bundle allocations (split L2I bundle across campaigns)

**Deliverables**:
- `services/campaigns/src/lib/billing-integrator.ts`
- Usage tracking cron jobs
- Billing integration tests

**Dependencies**: Team 2 (schemas), Agent 5.2
**Tools**: Read, Edit
**Model**: Sonnet

---

#### **Agent 5.2: seat-credit-tracker**
**Role**: Seat & Credit Usage Tracking
**Responsibilities**:
- Track volunteer seats used per campaign
- Track impact credits consumed per campaign
- Calculate remaining capacity (seats, credits)
- Generate usage reports for billing

**Deliverables**:
- `services/campaigns/src/lib/seat-tracker.ts`
- `services/campaigns/src/lib/credit-tracker.ts`
- Usage dashboards

**Dependencies**: Agent 3.3 (capacity tracker)
**Tools**: Write
**Model**: Sonnet

---

#### **Agent 5.3: pricing-signal-exporter**
**Role**: Generate Pricing Signals for Sales
**Responsibilities**:
- Calculate cost-per-learner for each campaign
- Compare actual vs contracted usage
- Flag high-value campaigns (high SROI, high engagement)
- Export pricing signals for CRM/sales tools

**Deliverables**:
- `services/campaigns/src/lib/pricing-signals.ts`
- `services/campaigns/src/routes/pricing-insights.ts` (API)
- Pricing signal exports (CSV, JSON)

**Dependencies**: Agent 3.5 (metrics), Agent 5.2 (usage tracking)
**Tools**: Write
**Model**: Sonnet

---

#### **Agent 5.4: upsell-opportunity-analyzer**
**Role**: Identify Upsell Opportunities
**Responsibilities**:
- Identify campaigns at >80% capacity (expansion candidates)
- Identify high-performing campaigns (SROI > 5, VIS > 80)
- Identify companies running multiple successful campaigns (bundle upsell)
- Generate upsell recommendations with data backing

**Deliverables**:
- `services/campaigns/src/lib/upsell-analyzer.ts`
- `services/campaigns/src/routes/upsell-opportunities.ts` (API)
- Upsell email templates

**Dependencies**: Agent 5.3 (pricing signals)
**Tools**: Write
**Model**: Sonnet

---

#### **Agent 5.5: commercial-terms-manager**
**Role**: Manage Campaign Pricing Terms
**Responsibilities**:
- Implement UI/API for setting campaign pricing (seats, credits, IAAS)
- Validate commercial terms against company subscriptions
- Handle pricing tier changes mid-campaign
- Generate pricing proposals for new campaigns

**Deliverables**:
- `services/campaigns/src/lib/commercial-terms.ts`
- Admin UI for setting pricing
- Pricing proposal templates

**Dependencies**: Agent 5.1 (billing integrator)
**Tools**: Write, Read
**Model**: Sonnet

---

### **Team 6: Frontend & UX** (4 Agents)

#### **Agent 6.1: campaign-list-ui**
**Role**: Campaign List Page
**Responsibilities**:
- Build `/cockpit/[companyId]/campaigns` page
- Display campaigns table with filters (status, group, template, date)
- Show capacity indicators (volunteers, beneficiaries, budget %)
- Add create campaign button → wizard

**Deliverables**:
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/campaigns/index.astro`
- `apps/corp-cockpit-astro/src/components/campaigns/CampaignList.tsx`
- Campaign filters component

**Dependencies**: Team 3 (campaign API)
**Tools**: Write, Read
**Model**: Sonnet

---

#### **Agent 6.2: campaign-detail-dashboard**
**Role**: Campaign Detail Page
**Responsibilities**:
- Build `/cockpit/[companyId]/campaigns/[campaignId]` page
- Display campaign overview (name, dates, status, group, template)
- Show impact metrics (SROI, VIS, hours, sessions)
- Show capacity gauges (volunteers, beneficiaries, budget)
- Show time-series charts (metrics over time)
- Link to Evidence Explorer (filter by campaign)

**Deliverables**:
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/campaigns/[campaignId].astro`
- `apps/corp-cockpit-astro/src/components/campaigns/CampaignDashboard.tsx`
- Campaign widgets (metrics, capacity, timeline)

**Dependencies**: Agent 6.1, Agent 4.5 (dashboard API)
**Tools**: Write, Read
**Model**: Sonnet

---

#### **Agent 6.3: campaign-creation-wizard**
**Role**: Create Campaign Wizard
**Responsibilities**:
- Build multi-step campaign creation wizard:
  - Step 1: Select program template
  - Step 2: Select beneficiary group
  - Step 3: Set dates & capacity
  - Step 4: Set budget & pricing model
  - Step 5: Review & confirm
- Validate inputs at each step
- Show compatibility warnings (template ↔ group mismatch)

**Deliverables**:
- `apps/corp-cockpit-astro/src/pages/[lang]/cockpit/[companyId]/campaigns/new.astro`
- `apps/corp-cockpit-astro/src/components/campaigns/CampaignWizard.tsx`
- Wizard step components

**Dependencies**: Agent 6.1, Team 3 (campaign API)
**Tools**: Write
**Model**: Sonnet

---

#### **Agent 6.4: campaign-filters-evidence**
**Role**: Add Campaign Filter to Evidence Explorer
**Responsibilities**:
- Extend Evidence Explorer with campaign filter
- Show evidence linked to selected campaign
- Update lineage drill-through to show campaign context
- Add "View in Campaign Dashboard" link

**Deliverables**:
- Enhanced Evidence Explorer component
- Campaign filter dropdown
- Lineage updates

**Dependencies**: Agent 4.4 (evidence linker)
**Tools**: Read, Edit
**Model**: Sonnet

---

## 🚀 Execution Plan

### **Phase 1: Foundation** (Week 1)

**Batch 1A** (Parallel - 6 agents):
- Agent 1.1: beneficiary-domain-analyst
- Agent 1.2: campaign-domain-analyst
- Agent 1.3: program-template-modeler
- Agent 1.4: program-instance-modeler
- Agent 1.5: monetization-metadata-modeler
- Agent 1.6: metrics-snapshot-designer

**Output**: Complete data model design specs

---

### **Phase 2: Schema Implementation** (Week 1-2)

**Batch 2A** (Sequential - 4 agents):
1. Agent 2.1: drizzle-schema-engineer (depends on Phase 1)
2. Agent 2.2: migration-engineer (depends on 2.1)
3. Agent 2.3: seed-data-engineer (depends on 2.2)
4. Agent 2.4: type-definitions-engineer (depends on 2.1)

**Output**: Database schemas, migrations, seed data, TypeScript types

---

### **Phase 3: Campaign Engine** (Week 2)

**Batch 3A** (Parallel - 6 agents, depends on Phase 2):
- Agent 3.1: campaign-instantiator
- Agent 3.2: activity-associator
- Agent 3.3: capacity-tracker
- Agent 3.4: campaign-lifecycle-manager
- Agent 3.5: metrics-aggregator
- Agent 3.6: campaign-service-api

**Output**: Campaign service with full CRUD + lifecycle management

---

### **Phase 4: Integration & Metrics** (Week 3)

**Batch 4A** (Parallel - 5 agents, depends on Phase 3):
- Agent 4.1: sroi-campaign-integrator
- Agent 4.2: vis-campaign-integrator
- Agent 4.3: ingestion-enhancer
- Agent 4.4: evidence-campaign-linker
- Agent 4.5: dashboard-data-provider

**Output**: Campaign-level impact metrics + data APIs

---

### **Phase 5: Monetization** (Week 3-4)

**Batch 5A** (Sequential/Parallel - 5 agents):
1. Agent 5.2: seat-credit-tracker (parallel)
2. Agent 5.1: billing-integrator (depends on 5.2)
3. Agent 5.3: pricing-signal-exporter (parallel with 5.1)
4. Agent 5.4: upsell-opportunity-analyzer (depends on 5.3)
5. Agent 5.5: commercial-terms-manager (depends on 5.1)

**Output**: Billing integration + usage tracking + upsell signals

---

### **Phase 6: Frontend** (Week 4)

**Batch 6A** (Sequential - 4 agents, depends on Phases 3-5):
1. Agent 6.1: campaign-list-ui
2. Agent 6.2: campaign-detail-dashboard (depends on 6.1)
3. Agent 6.3: campaign-creation-wizard (depends on 6.1)
4. Agent 6.4: campaign-filters-evidence (parallel with 6.2/6.3)

**Output**: Campaign management UI in Corporate Cockpit

---

## 🧪 Testing & Quality Assurance

### Coverage Requirements

| Component | Unit Tests | Integration Tests | E2E Tests |
|-----------|-----------|------------------|-----------|
| Campaign CRUD | ≥90% | ✅ | ✅ |
| Capacity Tracking | ≥90% | ✅ | ✅ |
| Metrics Aggregation | ≥85% | ✅ | - |
| Billing Integration | ≥85% | ✅ | - |
| Frontend Wizard | ≥70% | ✅ | ✅ |
| Dashboard APIs | ≥80% | ✅ | - |

### Test Strategy

**Unit Tests**: Each agent writes unit tests for their deliverables
**Integration Tests**: Team leads write cross-service integration tests
**E2E Tests**: QA team writes Playwright tests for campaign workflows

---

## ⚠️ Risks & Mitigation

### Technical Risks

**Risk 1**: Historical Data Association Ambiguity
**Impact**: High
**Mitigation**:
- Agent 3.2 implements fuzzy matching with confidence scores
- Manual review UI for ambiguous matches
- Conservative approach: only auto-associate high-confidence matches

**Risk 2**: Performance Degradation with Large Campaign Counts
**Impact**: Medium
**Mitigation**:
- Aggressive indexing (companyId, status, dates)
- Caching layer for dashboard queries (Redis)
- Pagination + lazy loading in UI

**Risk 3**: GDPR Compliance in Beneficiary Groups
**Impact**: High
**Mitigation**:
- Agent 1.1 designs privacy-first schema (no individual PII)
- Legal review before launch
- Anonymization at group level only

**Risk 4**: Billing System Integration Complexity
**Impact**: Medium
**Mitigation**:
- Agent 5.1 starts with read-only integration
- Phased rollout: usage tracking → invoicing → automated billing
- Thorough testing with Stripe test mode

### Business Risks

**Risk 5**: Complexity Overwhelming Users
**Impact**: Medium
**Mitigation**:
- Agent 6.3 creates guided wizard with smart defaults
- Admin training materials
- "Quick Campaign" templates for common use cases

**Risk 6**: Pricing Model Confusion
**Impact**: Medium
**Mitigation**:
- Agent 5.5 creates clear pricing UI with examples
- Sales enablement materials
- Pricing calculator tool

---

## ✅ Success Criteria

### Technical Success

- ✅ All 5 new tables created with migrations
- ✅ 10+ campaigns created in seed data
- ✅ Campaign CRUD API functional with ≥90% test coverage
- ✅ Campaign-level SROI/VIS calculations working
- ✅ Historical data association >70% accuracy
- ✅ Billing integration tracking usage correctly

### Functional Success

- ✅ Users can create campaigns via wizard in <3 minutes
- ✅ Dashboard shows campaign metrics in real-time
- ✅ Capacity alerts trigger at 80% utilization
- ✅ Upsell opportunities identified automatically
- ✅ Evidence Explorer filters by campaign

### Business Success

- ✅ Sales team can demo "Mentors for Syrian Refugees" as sellable product
- ✅ 3 pricing models supported (seats, credits, IAAS)
- ✅ Pricing signals exported for CRM integration
- ✅ Campaign-level impact reports generated

---

## 📚 Documentation Requirements

Each agent must deliver:

1. **Code Documentation**: JSDoc comments, README in service folders
2. **API Documentation**: OpenAPI specs for all endpoints
3. **User Documentation**: How-to guides for campaign creation
4. **Technical Documentation**: Architecture decisions, data models

**Consolidated Docs**:
- `docs/CAMPAIGNS_AND_BENEFICIARY_GROUPS.md` (overview)
- `docs/MONETIZATION_MODEL_INTEGRATION.md` (pricing guide)
- `docs/CAMPAIGN_LIFECYCLE.md` (state machine)
- `docs/api/campaigns.yaml` (OpenAPI spec)

---

## 🎯 Next Steps

**1. Review & Approval**: Present this plan to stakeholders for feedback
**2. Refinement**: Adjust based on feedback (scope, timeline, priorities)
**3. Agent Spawn**: Launch Team 1 (Domain & Data Model) agents
**4. Iterative Execution**: Execute phases 1-6 with regular checkpoints
**5. Demo & Validation**: Show working campaign system with seed data
**6. Production Rollout**: Deploy to staging, then production

---

## 📊 Estimated Effort

| Phase | Agents | Estimated Time | Parallel? |
|-------|--------|---------------|-----------|
| Phase 1: Foundation | 6 | 3-5 days | ✅ Yes |
| Phase 2: Schema Implementation | 4 | 2-3 days | Partial |
| Phase 3: Campaign Engine | 6 | 4-6 days | ✅ Yes |
| Phase 4: Integration & Metrics | 5 | 3-5 days | ✅ Yes |
| Phase 5: Monetization | 5 | 3-4 days | Partial |
| Phase 6: Frontend | 4 | 4-5 days | Partial |
| **Total** | **30 agents** | **~4 weeks** | Mixed |

---

## 🔗 Integration Summary

### New Services

- `services/campaigns/` - Campaign management service

### Enhanced Services

- `services/reporting/` - Add campaign-level SROI/VIS
- `services/kintell-connector/` - Link sessions to campaigns
- `services/buddy-service/` - Link matches to campaigns
- `services/upskilling-connector/` - Link completions to campaigns

### New Frontend Pages

- `/cockpit/[companyId]/campaigns` - Campaign list
- `/cockpit/[companyId]/campaigns/[campaignId]` - Campaign dashboard
- `/cockpit/[companyId]/campaigns/new` - Create campaign wizard

### Database Changes

- 5 new tables (beneficiary_groups, program_templates, campaigns, program_instances, campaign_metrics_snapshots)
- 3 enhanced tables (kintell_sessions.programInstanceId, buddy_matches.programInstanceId, etc.)

---

**END OF PLAN - AWAITING APPROVAL**
