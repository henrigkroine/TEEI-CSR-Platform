# Program Template System - Architecture Design
## SWARM 3: Multi-Agent Orchestration Plan

**Status**: 🔍 AWAITING APPROVAL
**Created**: 2025-11-22
**Branch**: `claude/program-template-system-01FDQRZk75bdeHEHrt3ASCm7`

---

## Executive Summary

This document defines the **Program Template System** for the TEEI CSR Platform, enabling:

1. **Reusable Program Templates** - Convert existing programs (Mentors for Ukraine, Language for Ukraine, TEEI Buddy) into parameterized templates
2. **Multi-Beneficiary Scaling** - Instantiate templates for any beneficiary group (Syrians, Afghans, migrants, etc.)
3. **Monetization Integration** - Connect templates to L2I bundles, campaigns, and seat-based pricing
4. **Impact Attribution** - Link program instances to SROI/VIS calculations and evidence lineage
5. **Future-Proof Extensibility** - Support new program types without code changes

---

## 1. Current State Analysis

### 1.1 What Exists Today

**Programs as Strings, Not Entities**:
```typescript
// packages/shared-schema/src/schema/users.ts
programType: varchar('program_type', { length: 50 }).notNull()
// Values: 'buddy', 'language', 'mentorship', 'upskilling'
```

**Hardcoded in Multiple Places**:
- `program_enrollments.programType` (varchar)
- `sroi_calculations.programType` (varchar)
- `vis_calculations.programType` (varchar)
- `l2i_allocations.program` (enum: language, mentorship, upskilling, weei)
- Event contracts (enrollment-event.ts: programType enum)

**Existing Infrastructure We Can Leverage**:
- ✅ L2I bundles with program allocations (billing.ts)
- ✅ Event-driven architecture with contracts
- ✅ Drizzle ORM with JSONB flexibility
- ✅ Journey engine with rules and flags
- ✅ Import/mapping infrastructure (shared-types/imports.ts)
- ✅ Feature flags pattern (companies.features JSONB)

### 1.2 Gaps to Fill

❌ **No `programs` table** - Programs are not first-class entities
❌ **No `program_templates` table** - No reusable program definitions
❌ **No program catalog** - No discovery or browsing
❌ **No configuration schema** - Hardcoded program types
❌ **No versioning** - Cannot evolve program definitions
❌ **No beneficiary group model** - Cannot target specific demographics
❌ **No company-program instances** - Cannot track company-specific campaigns

---

## 2. Program Template Architecture

### 2.1 Core Concepts

**Template vs. Instance vs. Campaign**:

```
TEMPLATE (Reusable Blueprint)
  ↓
PROGRAM (Global Instance)
  ↓
CAMPAIGN (Company-Specific Instance)
  ↓
ENROLLMENT (User Participation)
```

**Example Flow**:
```
Template: "Language Practice A1-B2"
  → Program: "Language for Ukrainian Refugees"
  → Campaign: "Acme Corp - Language for Ukrainians Q1 2025"
    → Enrollments: 250 learners from Acme employees
```

### 2.2 Three Master Templates

#### Template 1: Mentorship Template
**Based on**: Mentors for Ukraine
**Category**: `mentorship`
**Key Features**:
- 1:1 mentor-mentee matching
- Scheduled sessions (30/60/90 min)
- Session feedback and ratings
- CEFR-based skill tracking (for language mentoring)
- Milestone tracking (first session, 10 sessions, completion)
- Evidence: session notes, progress reports, testimonials

**Configurable Parameters**:
- Session duration defaults
- Matching criteria (skills, interests, location, language)
- Minimum session count for completion
- SDG goal alignment
- Impact multipliers (valuation weights)

#### Template 2: Language Practice Template
**Based on**: Language for Ukraine
**Category**: `language`
**Key Features**:
- Peer-to-peer language exchange
- CEFR level tracking (A1 → C2 progression)
- Session scheduling and attendance
- Conversation topics library
- Progress assessments
- Evidence: session logs, level advancement, proficiency tests

**Configurable Parameters**:
- Target CEFR levels
- Session frequency recommendations
- Assessment intervals
- Language pair support
- Cultural integration modules

#### Template 3: Buddy Integration Template
**Based on**: TEEI Buddy Program
**Category**: `buddy`
**Key Features**:
- Social integration buddy matching
- Event attendance tracking
- Skill sharing sessions
- Regular check-ins (mood, progress)
- Feedback and ratings
- Milestone achievements
- Evidence: event logs, check-in notes, skill exchanges

**Configurable Parameters**:
- Matching algorithms (interests, location, demographics)
- Check-in cadence
- Event types and categories
- Skill exchange topics
- Integration milestones

### 2.3 Data Model

#### Core Tables

**program_templates**:
```sql
CREATE TABLE program_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key VARCHAR(100) UNIQUE NOT NULL, -- 'mentorship_standard_v1'
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL, -- 'mentorship', 'language', 'buddy', 'upskilling'

  -- Template Definition
  config_schema JSONB NOT NULL, -- Zod schema as JSON
  default_config JSONB NOT NULL, -- Default configuration values
  ui_schema JSONB, -- Form rendering hints for admin UI

  -- Lifecycle Management
  version INTEGER DEFAULT 1,
  status VARCHAR(20) DEFAULT 'active', -- draft, active, deprecated, archived
  deprecated_by UUID REFERENCES program_templates(id), -- Points to newer version

  -- Metadata
  tags TEXT[],
  sdg_goals INTEGER[], -- UN SDG alignment (1-17)
  owner_id UUID REFERENCES users(id),
  tenant_id UUID, -- NULL for platform templates, company ID for custom

  -- Impact Configuration
  default_sroi_weights JSONB, -- Activity valuations
  default_vis_multipliers JSONB, -- VIS point calculations

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_program_templates_category ON program_templates(category);
CREATE INDEX idx_program_templates_status ON program_templates(status);
CREATE INDEX idx_program_templates_tenant ON program_templates(tenant_id);
```

**programs**:
```sql
CREATE TABLE programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_key VARCHAR(100) UNIQUE NOT NULL, -- 'language-ukrainian-2024'
  template_id UUID NOT NULL REFERENCES program_templates(id),

  -- Program Identity
  name VARCHAR(255) NOT NULL, -- "Language for Ukrainian Refugees"
  description TEXT,
  program_type VARCHAR(50) NOT NULL, -- Denormalized from template.category

  -- Configuration (Template + Overrides)
  config JSONB NOT NULL, -- Instance-specific config
  config_overrides JSONB, -- Explicitly overridden fields

  -- Beneficiary Group
  beneficiary_group_id UUID REFERENCES beneficiary_groups(id),

  -- Lifecycle
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, paused, completed, archived
  start_date DATE,
  end_date DATE,

  -- Ownership
  owner_id UUID REFERENCES users(id),
  visibility VARCHAR(20) DEFAULT 'public', -- public, private, restricted

  -- Metrics (Cached Aggregates)
  enrollment_count INTEGER DEFAULT 0,
  active_enrollment_count INTEGER DEFAULT 0,
  completion_count INTEGER DEFAULT 0,
  average_completion_rate DECIMAL(5,4),

  -- Metadata
  tags TEXT[],
  sdg_goals INTEGER[],
  external_id VARCHAR(255), -- For third-party integrations

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_programs_template ON programs(template_id);
CREATE INDEX idx_programs_status ON programs(status);
CREATE INDEX idx_programs_beneficiary_group ON programs(beneficiary_group_id);
CREATE INDEX idx_programs_type ON programs(program_type);
```

**beneficiary_groups**:
```sql
CREATE TABLE beneficiary_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_key VARCHAR(100) UNIQUE NOT NULL, -- 'ukrainian-refugees-2024'
  name VARCHAR(255) NOT NULL, -- "Ukrainian Refugees in Europe"
  description TEXT,

  -- Demographics
  demographics JSONB, -- { region: 'EU', languages: ['uk', 'ru'], age_range: '18-65' }

  -- Location
  primary_region VARCHAR(100), -- 'EU', 'US', 'UK', 'NO'
  countries TEXT[], -- ['PL', 'DE', 'NO', 'UK']
  cities TEXT[], -- ['Oslo', 'Berlin', 'Warsaw']

  -- Constraints
  eligibility_criteria JSONB, -- { min_age: 18, max_age: null, languages: ['uk'] }

  -- Status
  status VARCHAR(20) DEFAULT 'active', -- active, inactive, archived
  active_from DATE,
  active_until DATE,

  -- Metadata
  tags TEXT[],
  external_id VARCHAR(255),

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_beneficiary_groups_status ON beneficiary_groups(status);
CREATE INDEX idx_beneficiary_groups_region ON beneficiary_groups(primary_region);
```

**program_campaigns** (Company-Specific Instances):
```sql
CREATE TABLE program_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_key VARCHAR(100) UNIQUE NOT NULL, -- 'acme-language-ukrainian-q1-2025'
  program_id UUID NOT NULL REFERENCES programs(id),
  company_id UUID NOT NULL REFERENCES companies(id),

  -- Campaign Details
  name VARCHAR(255) NOT NULL, -- "Acme Corp - Language for Ukrainians Q1 2025"
  description TEXT,

  -- Configuration Overrides (on top of program config)
  config_overrides JSONB,

  -- Lifecycle
  status VARCHAR(20) DEFAULT 'draft', -- draft, active, paused, completed, archived
  start_date DATE NOT NULL,
  end_date DATE,

  -- Capacity Management
  target_enrollment INTEGER, -- Goal
  max_enrollment INTEGER, -- Hard cap
  current_enrollment INTEGER DEFAULT 0,

  -- Billing Integration
  l2i_subscription_id UUID REFERENCES l2i_subscriptions(id),
  budget_allocated INTEGER, -- cents
  budget_spent INTEGER DEFAULT 0,

  -- Metrics (Cached Aggregates)
  completion_count INTEGER DEFAULT 0,
  average_sroi DECIMAL(10,2),
  average_vis DECIMAL(10,2),

  -- Metadata
  tags TEXT[],
  internal_code VARCHAR(100), -- Company's internal project code

  -- Audit
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  created_by UUID REFERENCES users(id)
);

CREATE INDEX idx_campaigns_program ON program_campaigns(program_id);
CREATE INDEX idx_campaigns_company ON program_campaigns(company_id);
CREATE INDEX idx_campaigns_status ON program_campaigns(status);
CREATE INDEX idx_campaigns_l2i_subscription ON program_campaigns(l2i_subscription_id);
```

**program_enrollments** (UPDATED):
```sql
-- Add new columns to existing table
ALTER TABLE program_enrollments
  ADD COLUMN program_id UUID REFERENCES programs(id),
  ADD COLUMN campaign_id UUID REFERENCES program_campaigns(id),
  ADD COLUMN beneficiary_group_id UUID REFERENCES beneficiary_groups(id),
  ADD COLUMN enrollment_metadata JSONB DEFAULT '{}',
  ADD COLUMN source_system VARCHAR(50), -- 'kintell', 'buddy', 'upskilling', 'manual'
  ADD COLUMN source_id VARCHAR(255); -- External ID in source system

-- Backfill migration will populate program_id based on programType
-- programType column kept for backward compatibility (denormalized)

CREATE INDEX idx_program_enrollments_program ON program_enrollments(program_id);
CREATE INDEX idx_program_enrollments_campaign ON program_enrollments(campaign_id);
CREATE INDEX idx_program_enrollments_beneficiary_group ON program_enrollments(beneficiary_group_id);
```

---

## 3. Configuration Schema System

### 3.1 Zod-Based Validation

Each template defines its configuration schema using Zod (stored as JSON):

```typescript
// packages/program-templates/src/schemas/mentorship-template.ts
import { z } from 'zod';

export const MentorshipTemplateConfigSchema = z.object({
  // Session Settings
  session: z.object({
    defaultDurationMinutes: z.number().int().min(15).max(180).default(60),
    recommendedFrequency: z.enum(['weekly', 'biweekly', 'monthly']).default('weekly'),
    minSessionsForCompletion: z.number().int().min(1).default(10),
  }),

  // Matching Criteria
  matching: z.object({
    autoMatch: z.boolean().default(false),
    criteria: z.object({
      skills: z.array(z.string()).optional(),
      interests: z.array(z.string()).optional(),
      languages: z.array(z.string()).optional(),
      location: z.string().optional(),
    }),
  }),

  // Progression & Milestones
  progression: z.object({
    trackCEFR: z.boolean().default(false),
    milestones: z.array(z.object({
      key: z.string(),
      name: z.string(),
      sessionCount: z.number().int().min(1),
    })).default([]),
  }),

  // Impact Configuration
  impact: z.object({
    sroiWeights: z.record(z.string(), z.number()).default({
      'session_completed': 10.0,
      'milestone_reached': 25.0,
      'program_completed': 100.0,
    }),
    visMultipliers: z.record(z.string(), z.number()).default({
      'session_completed': 5.0,
      'feedback_positive': 2.0,
    }),
  }),

  // SDG Alignment
  sdgGoals: z.array(z.number().int().min(1).max(17)).default([4, 8, 10]), // Quality Education, Decent Work, Reduced Inequalities
});

export type MentorshipTemplateConfig = z.infer<typeof MentorshipTemplateConfigSchema>;
```

### 3.2 Configuration Inheritance

```
TEMPLATE default_config
  ↓ (override)
PROGRAM config
  ↓ (override)
CAMPAIGN config_overrides
  ↓ (final)
Effective Configuration
```

**Resolution Logic**:
```typescript
function resolveConfig(
  templateDefaults: object,
  programConfig: object,
  campaignOverrides: object
): object {
  return deepMerge(templateDefaults, programConfig, campaignOverrides);
}
```

---

## 4. Event Contracts

### 4.1 New Event Types

```typescript
// packages/event-contracts/src/programs/

// Template Lifecycle
'program.template.created'
'program.template.updated'
'program.template.deprecated'
'program.template.deleted'

// Program Lifecycle
'program.created'
'program.updated'
'program.started'
'program.paused'
'program.completed'
'program.archived'

// Campaign Lifecycle
'program.campaign.created'
'program.campaign.updated'
'program.campaign.started'
'program.campaign.paused'
'program.campaign.completed'
'program.campaign.capacity_reached'

// Enrollment
'program.enrollment.created'
'program.enrollment.updated'
'program.enrollment.completed'
'program.enrollment.dropped'
```

### 4.2 Example Event Schema

```typescript
// packages/event-contracts/src/programs/program-created.ts
import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

export const ProgramCreatedSchema = BaseEventSchema.extend({
  type: z.literal('program.created'),
  data: z.object({
    programId: z.string().uuid(),
    programKey: z.string(),
    templateId: z.string().uuid(),
    name: z.string(),
    programType: z.string(),
    beneficiaryGroupId: z.string().uuid().optional(),
    status: z.enum(['draft', 'active']),
    config: z.record(z.unknown()),
    createdBy: z.string().uuid(),
  }),
});

export type ProgramCreated = z.infer<typeof ProgramCreatedSchema>;
```

---

## 5. Service Architecture

### 5.1 New Service: `program-service`

**Port**: 3021
**Responsibilities**:
1. CRUD operations for templates, programs, campaigns
2. Configuration validation and resolution
3. Template instantiation workflow
4. Program catalog and discovery
5. Lifecycle state management
6. Event emission

**Tech Stack**:
- Fastify (following existing service patterns)
- Drizzle ORM
- Zod validation
- Pino logging
- NATS for event publishing

**API Endpoints**:

```typescript
// Templates
POST   /templates                    // Create template
GET    /templates                    // List templates (with filters)
GET    /templates/:id                // Get template by ID
PUT    /templates/:id                // Update template
POST   /templates/:id/deprecate      // Deprecate template
DELETE /templates/:id                // Soft delete template

// Programs
POST   /programs                     // Create program from template
GET    /programs                     // List programs (with filters)
GET    /programs/:id                 // Get program
PUT    /programs/:id                 // Update program
PUT    /programs/:id/status          // Change status (start, pause, complete)
GET    /programs/:id/config          // Get effective config
PUT    /programs/:id/config          // Update config overrides

// Campaigns
POST   /programs/:programId/campaigns         // Create campaign
GET    /programs/:programId/campaigns         // List campaigns for program
GET    /campaigns/:id                         // Get campaign
PUT    /campaigns/:id                         // Update campaign
PUT    /campaigns/:id/status                  // Change status
GET    /campaigns/:id/enrollments             // List enrollments
POST   /campaigns/:id/enrollments             // Create enrollment

// Catalog & Discovery
GET    /catalog                      // Browse available programs
GET    /catalog/search               // Search programs by criteria
GET    /catalog/:programId           // Program details for catalog

// Beneficiary Groups
POST   /beneficiary-groups           // Create group
GET    /beneficiary-groups           // List groups
GET    /beneficiary-groups/:id       // Get group
PUT    /beneficiary-groups/:id       // Update group
```

### 5.2 Integration with Existing Services

**analytics** (port 3008):
- Update SROI/VIS calculators to read `program_id` instead of just `programType`
- Aggregate metrics per program instance
- Support multi-level rollups (campaign → program → template → global)

**reporting** (port 3013):
- Program-level dashboards
- Campaign performance reports
- Template usage analytics
- Beneficiary group impact reports

**billing** (port 3018):
- Link L2I allocations to specific program_campaigns
- Track budget consumption per campaign
- Program-based entitlements

**journey-engine** (port 3016):
- Program-specific rules (e.g., "auto-enroll to mentorship if completed language A2")
- Campaign-specific milestones
- Cross-program journey orchestration

**impact-in** (port 3007):
- Include program_id and campaign_id in outbound payloads
- Map external program IDs to internal programs

---

## 6. Migration Strategy

### 6.1 Data Migration Plan

**Phase 1: Schema Deployment**
1. Deploy new tables (program_templates, programs, beneficiary_groups, program_campaigns)
2. Add new columns to program_enrollments
3. No breaking changes to existing code

**Phase 2: Seed Templates**
1. Create 3 master templates (mentorship, language, buddy)
2. Define default configurations
3. Test template instantiation

**Phase 3: Backfill Programs**
1. Create beneficiary_groups for existing cohorts (Ukrainian refugees)
2. Create programs from historical data:
   - "Mentors for Ukraine" → program_id
   - "Language for Ukraine" → program_id
   - "Buddy for Ukraine" → program_id
3. Map existing enrollments to programs

**Phase 4: Update Existing Code**
1. Update analytics service to use program_id
2. Update reporting service to query by program_id
3. Update event consumers to associate events with programs
4. Update enrollmentgateway to create program enrollments

**Phase 5: Deprecation**
1. Mark programType as deprecated (keep for backward compatibility)
2. All new code uses program_id
3. Monitor usage of legacy fields

### 6.2 Backward Compatibility

**Dual Write Strategy**:
```typescript
// When creating enrollment, write to both old and new fields
await db.insert(programEnrollments).values({
  userId,
  programType: 'language', // LEGACY
  programId: languageProgram.id, // NEW
  campaignId: acmeCampaign.id, // NEW
  // ...
});
```

**Denormalized programType**:
- Keep `program_enrollments.programType` populated
- Derive from `programs.program_type` on write
- Allows existing queries to work unchanged

---

## 7. Template Instantiation Workflow

### 7.1 Template → Program

**API Call**:
```typescript
POST /programs
{
  "templateId": "uuid-of-mentorship-template",
  "name": "Mentors for Syrian Refugees",
  "description": "...",
  "beneficiaryGroupId": "uuid-of-syrian-refugees-group",
  "configOverrides": {
    "session": {
      "defaultDurationMinutes": 45 // Override default 60
    }
  },
  "startDate": "2025-02-01",
  "sdgGoals": [4, 8, 10, 16]
}
```

**Process**:
1. Validate `templateId` exists and is active
2. Validate `configOverrides` against template schema
3. Merge `template.default_config` + `configOverrides`
4. Generate unique `program_key`
5. Insert into `programs` table
6. Emit `program.created` event
7. Return program entity

### 7.2 Program → Campaign

**API Call**:
```typescript
POST /programs/:programId/campaigns
{
  "companyId": "uuid-of-acme-corp",
  "name": "Acme Corp - Mentors for Syrians Q2 2025",
  "description": "...",
  "startDate": "2025-04-01",
  "endDate": "2025-06-30",
  "targetEnrollment": 100,
  "maxEnrollment": 150,
  "l2iSubscriptionId": "uuid-of-acme-l2i-subscription",
  "budgetAllocated": 50000, // $500 in cents
  "configOverrides": {
    "matching": {
      "autoMatch": true // Enable auto-matching for this campaign
    }
  }
}
```

**Process**:
1. Validate program exists and is active
2. Validate company has entitlement to create campaigns
3. Validate L2I subscription exists and has capacity
4. Merge program config + campaign overrides
5. Generate unique `campaign_key`
6. Insert into `program_campaigns` table
7. Emit `program.campaign.created` event
8. Update L2I allocation tracking
9. Return campaign entity

### 7.3 Campaign → Enrollment

**API Call**:
```typescript
POST /campaigns/:campaignId/enrollments
{
  "userId": "uuid-of-participant",
  "enrollmentMetadata": {
    "referredBy": "employee-sponsor-id",
    "applicationAnswers": { ... }
  }
}
```

**Process**:
1. Validate campaign exists and is active
2. Check capacity (current < max_enrollment)
3. Check user eligibility (beneficiary_group criteria)
4. Create enrollment record
5. Increment campaign.current_enrollment
6. Increment program.enrollment_count
7. Emit `program.enrollment.created` event
8. Trigger journey rules (if any)
9. Return enrollment entity

---

## 8. Integration with Swarm 1 & 2

### 8.1 Kintell Connector (Swarm 1)

**Current Behavior**:
- Receives sessions from Kintell
- Inserts into `kintell_sessions`
- Creates `program_enrollments` with `programType='language'` or `'mentorship'`

**Updated Behavior**:
1. Lookup program by external mapping:
   ```sql
   SELECT id FROM programs
   WHERE program_type = 'language'
     AND external_id = :kintell_program_id
   ```
2. If company is known, lookup or create campaign
3. Create enrollment with `program_id` and optional `campaign_id`
4. Emit enriched events with program context

**Configuration**:
```typescript
// In program metadata
{
  "external_mappings": {
    "kintell": {
      "program_id": "kintell-123",
      "tenant_id": "kintell-tenant-456"
    }
  }
}
```

### 8.2 Buddy Connector (Swarm 2)

**Current Behavior**:
- Receives buddy events (match.created, event.logged, etc.)
- Inserts into buddy tables
- Creates `program_enrollments` with `programType='buddy'`

**Updated Behavior**:
1. Lookup program by beneficiary group:
   ```sql
   SELECT p.id FROM programs p
   JOIN beneficiary_groups bg ON p.beneficiary_group_id = bg.id
   WHERE p.program_type = 'buddy'
     AND bg.group_key = 'ukrainian-refugees-2024'
   ```
2. If participant is linked to a company, lookup campaign
3. Create enrollment with full program context
4. Emit enriched events

**Buddy Program Metadata**:
```typescript
// In buddyMatches or buddySystemEvents
{
  "program_id": "uuid",
  "campaign_id": "uuid", // if company-sponsored
  "beneficiary_group_id": "uuid"
}
```

### 8.3 Event Enrichment

**Before**:
```json
{
  "type": "kintell.session.completed",
  "data": {
    "sessionId": "...",
    "participantId": "...",
    "sessionType": "language"
  }
}
```

**After**:
```json
{
  "type": "kintell.session.completed",
  "data": {
    "sessionId": "...",
    "participantId": "...",
    "sessionType": "language",
    "programId": "uuid-of-language-program",
    "campaignId": "uuid-of-campaign-if-any",
    "templateId": "uuid-of-language-template"
  }
}
```

---

## 9. Monetization Integration

### 9.1 L2I Bundle → Program Allocation

**Current L2I Allocation**:
```typescript
// l2i_allocations table
{
  program: 'language', // enum
  allocationPercentage: 0.40,
  learnersServed: 120
}
```

**Enhanced Allocation**:
```typescript
// NEW: l2i_program_allocations table
{
  l2iSubscriptionId: "uuid",
  programId: "uuid", // Specific program instance
  campaignId: "uuid", // Company's campaign
  allocationPercentage: 0.40,
  allocationAmountUSD: 20000, // cents
  learnersServed: 120,
  averageSROI: 3.25,
  averageVIS: 45.3
}
```

**Benefits**:
- Track impact per specific program instance (not just type)
- Campaign-level budget tracking
- Roll up metrics: Campaign → Program → Template → Global

### 9.2 Seat-Based Pricing

**Future Enhancement**:
```typescript
// program_campaigns table
{
  seatsAllocated: 100, // Impact Seats purchased
  seatsUsed: 75, // Active enrollments
  seatPricePerMonth: 5000, // $50/seat in cents
}
```

**Entitlements**:
```typescript
// Check if company can enroll more learners
const canEnroll = campaign.seatsUsed < campaign.seatsAllocated;
```

---

## 10. Admin UI (Corporate Cockpit)

### 10.1 New Pages

**Template Management** (`/admin/templates`):
- List all templates (platform + custom)
- Create/edit templates
- Configure schema and defaults
- Deprecate old versions

**Program Catalog** (`/catalog`):
- Browse available programs
- Filter by category, SDG, beneficiary group
- Preview program details
- "Instantiate" button (creates campaign)

**Campaign Management** (`/campaigns`):
- List company's campaigns
- Create campaign from program
- Configure overrides
- Monitor enrollment progress
- View budget consumption
- Generate campaign reports

**Enrollment Management** (`/campaigns/:id/enrollments`):
- List enrollments
- Enroll new participants
- Track completion status
- View individual impact metrics

### 10.2 UI Components

**Template Configurator**:
- Dynamic form based on `config_schema`
- Validation against Zod schema
- Preview effective configuration
- Override warnings

**Program Instance Card**:
```
┌─────────────────────────────────────┐
│ Language for Ukrainian Refugees     │
│ 🏷️ Language • 🌍 Ukrainian          │
│ ──────────────────────────────────  │
│ 📊 1,234 enrolled • 892 active      │
│ 📈 SROI: 3.2 • VIS: 42.5           │
│ 🎯 SDG: 4, 8, 10                    │
│ ──────────────────────────────────  │
│ [View Details] [Create Campaign]    │
└─────────────────────────────────────┘
```

---

## 11. Testing Strategy

### 11.1 Unit Tests

**Template Validation**:
- Schema validation (Zod)
- Config merging logic
- Version comparison

**Program Instantiation**:
- Template → Program creation
- Config override merging
- Beneficiary group validation

**Campaign Management**:
- Capacity checks
- Budget tracking
- Enrollment limits

### 11.2 Integration Tests

**End-to-End Workflows**:
1. Create template → Create program → Create campaign → Enroll user
2. Kintell session → Lookup program → Update metrics
3. Buddy match → Associate campaign → Update L2I allocation

**Event Flow**:
- Event emission on lifecycle changes
- Event consumption by downstream services
- Idempotency guarantees

### 11.3 Golden Tests

**Config Resolution**:
```typescript
// Golden test: Ensure config merging is deterministic
describe('Config Resolution', () => {
  it('should merge template + program + campaign configs', () => {
    const result = resolveConfig(
      templateDefaults,
      programConfig,
      campaignOverrides
    );
    expect(result).toMatchSnapshot();
  });
});
```

---

## 12. Documentation Deliverables

1. **PROGRAM_TEMPLATES_OVERVIEW.md** - High-level architecture
2. **RUNBOOK_PROGRAM_TEMPLATES.md** - Operational guide
3. **API_REFERENCE_PROGRAM_SERVICE.md** - OpenAPI spec
4. **MIGRATION_GUIDE.md** - Backward compatibility and migration steps
5. **TEMPLATE_AUTHORING_GUIDE.md** - How to create new templates
6. **CONFIG_SCHEMA_GUIDE.md** - Zod schema authoring guide

---

## 13. Success Criteria

✅ **Three master templates** defined and validated
✅ **Database schema** deployed with migrations
✅ **program-service** operational with all CRUD endpoints
✅ **Template instantiation** workflow tested end-to-end
✅ **Backward compatibility** maintained (existing code works)
✅ **Event contracts** defined and published
✅ **Swarm 1/2 integration** hooks implemented
✅ **L2I monetization** linked to program campaigns
✅ **Admin UI** pages for template/program/campaign management
✅ **Documentation** complete and reviewed
✅ **Tests** passing (unit ≥80%, integration ≥60%)
✅ **No secrets** in repo
✅ **PR ready** with screenshots and demo data

---

## 14. Risk Analysis

### 14.1 Technical Risks

**Risk**: Breaking changes to existing enrollment logic
**Mitigation**: Dual-write strategy, keep programType denormalized, extensive testing

**Risk**: Config schema evolution breaks existing programs
**Mitigation**: Template versioning, schema validation, migration tools

**Risk**: Performance impact from deep config merging
**Mitigation**: Cache resolved configs, index on program_id, use materialized views

**Risk**: Event ordering issues in distributed system
**Mitigation**: Correlation IDs, idempotency keys, event versioning

### 14.2 Data Risks

**Risk**: Backfill migration errors
**Mitigation**: Dry-run migrations, rollback scripts, data validation checks

**Risk**: Orphaned enrollments after program archival
**Mitigation**: Soft deletes, cascade rules, data retention policies

**Risk**: Config conflicts between template versions
**Mitigation**: Deprecation warnings, migration guides, backward compatibility tests

### 14.3 Operational Risks

**Risk**: Complexity overwhelms users
**Mitigation**: Wizard-based UI, sensible defaults, guided workflows

**Risk**: Performance degradation on large datasets
**Mitigation**: Pagination, caching, database indexes, query optimization

**Risk**: Lack of adoption due to steep learning curve
**Mitigation**: Comprehensive docs, video tutorials, example templates, support runbooks

---

## 15. Future Enhancements (Out of Scope for SWARM 3)

**Marketplace**:
- Public template marketplace
- Community-contributed templates
- Template ratings and reviews

**Advanced Versioning**:
- A/B testing between template versions
- Gradual rollout of new configs
- Rollback capabilities

**Multi-Tenancy**:
- White-label templates per tenant
- Tenant-specific customizations
- Cross-tenant template sharing

**AI-Powered Recommendations**:
- Suggest programs for beneficiary groups
- Auto-generate config based on company profile
- Predict enrollment success rates

**Analytics Dashboards**:
- Template usage trends
- Cross-program comparisons
- ROI per template type

---

## Next Steps

1. **Review this design** for approval
2. **Finalize 30-agent breakdown** with dependencies
3. **Define parallel execution batches**
4. **Create agent configuration files**
5. **Begin implementation** in phases

---

**Document Version**: 1.0
**Last Updated**: 2025-11-22
**Status**: Awaiting Approval
