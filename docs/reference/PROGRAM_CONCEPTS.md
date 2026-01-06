# Program Concepts
## Template, Program, Campaign, and Enrollment Model

**Date**: 2025-11-22
**Agent**: template-conceptual-architect (Agent 2)
**Status**: ✅ Complete

---

## 1. Core Concepts

### The Four-Layer Model

```
┌─────────────────────────────────────┐
│   TEMPLATE (Reusable Blueprint)    │  ← Platform-defined or custom
├─────────────────────────────────────┤
│   PROGRAM (Global Instance)         │  ← Beneficiary group specific
├─────────────────────────────────────┤
│   CAMPAIGN (Company Instance)       │  ← Company-specific, monetized
├─────────────────────────────────────┤
│   ENROLLMENT (User Participation)   │  ← Individual user tracking
└─────────────────────────────────────┘
```

---

## 2. Layer 1: Template

### Definition
A **Template** is a reusable blueprint that defines the structure, configuration schema, and behavior of a program type.

### Characteristics
- **Reusable**: One template → many programs
- **Versioned**: Templates evolve over time (v1, v2, v3...)
- **Schema-Driven**: Defines what configuration options are available
- **Platform or Custom**: Platform provides defaults, companies can create custom

### Properties
```typescript
interface ProgramTemplate {
  id: UUID;
  templateKey: string;          // 'mentorship_standard_v1'
  name: string;                 // 'Mentorship Standard Template'
  category: string;             // 'mentorship', 'language', 'buddy', 'upskilling'

  // Configuration Definition
  configSchema: ZodSchema;      // What can be configured?
  defaultConfig: object;        // Default values
  uiSchema: object;             // How to render config form

  // Lifecycle
  version: number;              // 1, 2, 3...
  status: 'draft' | 'active' | 'deprecated' | 'archived';
  deprecatedBy?: UUID;          // Points to newer version

  // Metadata
  tags: string[];
  sdgGoals: number[];           // UN SDG alignment
  ownerId?: UUID;               // Who created (null for platform)
  tenantId?: UUID;              // Company-specific (null for platform)

  // Impact Defaults
  defaultSroiWeights: object;   // Activity valuations
  defaultVisMultipliers: object; // VIS point calculations
}
```

### Example: Mentorship Template
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440001",
  "templateKey": "mentorship_standard_v1",
  "name": "Mentorship Standard Template",
  "category": "mentorship",
  "version": 1,
  "status": "active",
  "configSchema": {
    "type": "object",
    "properties": {
      "session": {
        "type": "object",
        "properties": {
          "defaultDurationMinutes": { "type": "number", "min": 15, "max": 180, "default": 60 },
          "recommendedFrequency": { "type": "string", "enum": ["weekly", "biweekly", "monthly"], "default": "weekly" },
          "minSessionsForCompletion": { "type": "number", "min": 1, "default": 10 }
        }
      },
      "matching": {
        "type": "object",
        "properties": {
          "autoMatch": { "type": "boolean", "default": false },
          "criteria": {
            "skills": { "type": "array", "items": { "type": "string" } },
            "interests": { "type": "array", "items": { "type": "string" } },
            "languages": { "type": "array", "items": { "type": "string" } }
          }
        }
      }
    }
  },
  "defaultConfig": {
    "session": {
      "defaultDurationMinutes": 60,
      "recommendedFrequency": "weekly",
      "minSessionsForCompletion": 10
    },
    "matching": {
      "autoMatch": false
    }
  },
  "defaultSroiWeights": {
    "session_completed": 10.0,
    "milestone_reached": 25.0,
    "program_completed": 100.0
  },
  "sdgGoals": [4, 8, 10]
}
```

---

## 3. Layer 2: Program

### Definition
A **Program** is a global instance of a template, typically targeted at a specific beneficiary group.

### Characteristics
- **Template-Based**: Inherits structure from template
- **Beneficiary-Targeted**: For a specific demographic (Ukrainians, Syrians, etc.)
- **Configurable**: Can override template defaults
- **Discoverable**: Listed in program catalog
- **Reusable**: One program → many company campaigns

### Properties
```typescript
interface Program {
  id: UUID;
  programKey: string;           // 'language-ukrainian-2024'
  templateId: UUID;             // Which template?

  // Identity
  name: string;                 // 'Language for Ukrainian Refugees'
  description: string;
  programType: string;          // Denormalized from template.category

  // Configuration (Template + Overrides)
  config: object;               // Effective config (merged)
  configOverrides: object;      // What was overridden?

  // Target Audience
  beneficiaryGroupId?: UUID;    // Who is this for?

  // Lifecycle
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  startDate?: Date;
  endDate?: Date;

  // Ownership
  ownerId: UUID;                // Who manages this program?
  visibility: 'public' | 'private' | 'restricted';

  // Metrics (Cached Aggregates)
  enrollmentCount: number;
  activeEnrollmentCount: number;
  completionCount: number;
  averageCompletionRate: number;

  // Metadata
  tags: string[];
  sdgGoals: number[];
  externalId?: string;          // For third-party integrations
}
```

### Example: Language for Ukrainian Refugees
```json
{
  "id": "660e8400-e29b-41d4-a716-446655440002",
  "programKey": "language-ukrainian-2024",
  "templateId": "550e8400-e29b-41d4-a716-446655440003",
  "name": "Language for Ukrainian Refugees",
  "description": "Peer-to-peer language practice program for Ukrainian refugees in Europe",
  "programType": "language",
  "beneficiaryGroupId": "770e8400-e29b-41d4-a716-446655440004",
  "status": "active",
  "startDate": "2024-01-01",
  "config": {
    "cefr": {
      "targetLevels": ["A1", "A2", "B1", "B2"],
      "assessmentIntervals": 90
    },
    "session": {
      "defaultDurationMinutes": 45,  // OVERRIDDEN (template default: 60)
      "recommendedFrequency": "weekly"
    }
  },
  "configOverrides": {
    "session": {
      "defaultDurationMinutes": 45
    }
  },
  "enrollmentCount": 1234,
  "activeEnrollmentCount": 892,
  "completionCount": 342,
  "averageCompletionRate": 0.7532,
  "sdgGoals": [4, 10, 16]
}
```

---

## 4. Layer 3: Campaign

### Definition
A **Campaign** is a company-specific instance of a program, with budget tracking and capacity management.

### Characteristics
- **Program-Based**: Inherits from a global program
- **Company-Owned**: Managed and funded by a company
- **Budgeted**: Allocated funds from L2I subscriptions
- **Capacity-Managed**: Target and max enrollment limits
- **Time-Bounded**: Specific start and end dates
- **Configurable**: Can further override program config

### Properties
```typescript
interface ProgramCampaign {
  id: UUID;
  campaignKey: string;          // 'acme-language-ukrainian-q1-2025'
  programId: UUID;              // Which program?
  companyId: UUID;              // Which company?

  // Identity
  name: string;                 // 'Acme Corp - Language for Ukrainians Q1 2025'
  description: string;

  // Configuration (Program + Campaign Overrides)
  configOverrides: object;      // Additional overrides on top of program

  // Lifecycle
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  startDate: Date;
  endDate?: Date;

  // Capacity Management
  targetEnrollment?: number;    // Goal (e.g., 100 learners)
  maxEnrollment?: number;       // Hard cap (e.g., 150 learners)
  currentEnrollment: number;    // Actual count

  // Billing Integration
  l2iSubscriptionId?: UUID;     // Which L2I bundle?
  budgetAllocated?: number;     // Cents ($500 = 50000)
  budgetSpent: number;          // Running total

  // Metrics (Cached Aggregates)
  completionCount: number;
  averageSroi?: number;
  averageVis?: number;

  // Metadata
  tags: string[];
  internalCode?: string;        // Company's project code
}
```

### Example: Acme Corp Campaign
```json
{
  "id": "880e8400-e29b-41d4-a716-446655440005",
  "campaignKey": "acme-language-ukrainian-q1-2025",
  "programId": "660e8400-e29b-41d4-a716-446655440002",
  "companyId": "990e8400-e29b-41d4-a716-446655440006",
  "name": "Acme Corp - Language for Ukrainians Q1 2025",
  "description": "Acme's employee volunteer initiative for Q1 2025",
  "status": "active",
  "startDate": "2025-01-01",
  "endDate": "2025-03-31",
  "targetEnrollment": 100,
  "maxEnrollment": 150,
  "currentEnrollment": 75,
  "l2iSubscriptionId": "aa0e8400-e29b-41d4-a716-446655440007",
  "budgetAllocated": 50000,
  "budgetSpent": 28500,
  "configOverrides": {
    "matching": {
      "autoMatch": true  // OVERRIDDEN (program default: false)
    }
  },
  "completionCount": 18,
  "averageSroi": 3.25,
  "averageVis": 45.3,
  "internalCode": "CSR-2025-Q1-LANG"
}
```

---

## 5. Layer 4: Enrollment

### Definition
An **Enrollment** is an individual user's participation in a program or campaign.

### Characteristics
- **User-Specific**: Tracks one user's journey
- **Program or Campaign**: Can be global or company-specific
- **Lifecycle-Tracked**: Status from enrolled → completed/dropped
- **Source-Linked**: Connected to external system (Kintell, Buddy, etc.)

### Properties
```typescript
interface ProgramEnrollment {
  id: UUID;
  userId: UUID;                 // Who is enrolled?

  // NEW: Program Context
  programId: UUID;              // Which program?
  campaignId?: UUID;            // Which campaign (if company-sponsored)?
  beneficiaryGroupId?: UUID;    // Which beneficiary group?

  // LEGACY: Backward Compatibility
  programType: string;          // 'language' (denormalized from program.programType)

  // Lifecycle
  enrolledAt: Date;
  status: 'active' | 'completed' | 'dropped';
  completedAt?: Date;

  // Source Tracking
  sourceSystem?: string;        // 'kintell', 'buddy', 'upskilling', 'manual'
  sourceId?: string;            // External ID in source system

  // Metadata
  enrollmentMetadata: object;   // Custom fields
}
```

### Example: User Enrollment
```json
{
  "id": "bb0e8400-e29b-41d4-a716-446655440008",
  "userId": "cc0e8400-e29b-41d4-a716-446655440009",
  "programId": "660e8400-e29b-41d4-a716-446655440002",
  "campaignId": "880e8400-e29b-41d4-a716-446655440005",
  "beneficiaryGroupId": "770e8400-e29b-41d4-a716-446655440004",
  "programType": "language",
  "enrolledAt": "2025-01-15T10:30:00Z",
  "status": "active",
  "sourceSystem": "kintell",
  "sourceId": "kintell-session-12345",
  "enrollmentMetadata": {
    "referredBy": "employee-volunteer-uuid",
    "startingCEFR": "A1"
  }
}
```

---

## 6. Relationships

### Hierarchy
```
1 Template
  ├── Many Programs
        ├── Many Campaigns (company-specific)
        │     └── Many Enrollments
        └── Many Enrollments (direct, no campaign)
```

### Cardinality
- 1 Template → M Programs
- 1 Program → M Campaigns
- 1 Program → M Enrollments
- 1 Campaign → M Enrollments
- 1 Beneficiary Group → M Programs
- 1 Company → M Campaigns

### Foreign Keys
```sql
programs.template_id → program_templates.id
programs.beneficiary_group_id → beneficiary_groups.id
program_campaigns.program_id → programs.id
program_campaigns.company_id → companies.id
program_enrollments.program_id → programs.id
program_enrollments.campaign_id → program_campaigns.id (optional)
```

---

## 7. Configuration Inheritance

### Precedence Rules
```
Template Default Config
  ↓ (override)
Program Config Overrides
  ↓ (override)
Campaign Config Overrides
  ↓ (final)
Effective Configuration
```

### Example Walkthrough

**Template Default**:
```json
{
  "session": {
    "defaultDurationMinutes": 60,
    "recommendedFrequency": "weekly"
  },
  "matching": {
    "autoMatch": false
  }
}
```

**Program Override** (Language for Ukraine):
```json
{
  "session": {
    "defaultDurationMinutes": 45  // OVERRIDE: shorter sessions
  }
  // matching.autoMatch remains false (inherited)
}
```

**Campaign Override** (Acme Corp):
```json
{
  "matching": {
    "autoMatch": true  // OVERRIDE: enable auto-matching
  }
  // session.defaultDurationMinutes remains 45 (inherited from program)
}
```

**Effective Config** (for Acme Campaign):
```json
{
  "session": {
    "defaultDurationMinutes": 45,      // From program
    "recommendedFrequency": "weekly"   // From template
  },
  "matching": {
    "autoMatch": true                  // From campaign
  }
}
```

### Resolution Algorithm
```typescript
function resolveConfig(
  template: ProgramTemplate,
  program: Program,
  campaign?: ProgramCampaign
): EffectiveConfig {
  const merged = deepMerge(
    template.defaultConfig,
    program.configOverrides || {},
    campaign?.configOverrides || {}
  );

  // Validate against template schema
  const ConfigSchema = zodFromJson(template.configSchema);
  return ConfigSchema.parse(merged);
}
```

---

## 8. Lifecycle States

### Template Lifecycle
```
draft → active → deprecated → archived
```

- **draft**: Being authored, not available
- **active**: Available for program creation
- **deprecated**: Replaced by newer version, existing programs continue
- **archived**: Soft-deleted, no longer visible

### Program Lifecycle
```
draft → active ⇄ paused → completed → archived
```

- **draft**: Being configured, not accepting enrollments
- **active**: Live, accepting enrollments
- **paused**: Temporarily suspended
- **completed**: Ended successfully
- **archived**: Soft-deleted

### Campaign Lifecycle
```
draft → active ⇄ paused → completed → archived
```

- **draft**: Being configured, not accepting enrollments
- **active**: Live, accepting enrollments
- **paused**: Temporarily suspended (e.g., budget exhausted)
- **completed**: Campaign period ended
- **archived**: Soft-deleted

### Enrollment Lifecycle
```
active → completed
       ↘ dropped
```

- **active**: User is participating
- **completed**: User finished successfully
- **dropped**: User withdrew or was removed

---

## 9. Use Cases

### Use Case 1: Platform Admin Creates Template
```
1. Admin creates "Language Practice A1-C2" template
2. Defines config schema (CEFR levels, session duration, etc.)
3. Sets default SROI weights
4. Publishes template (status: active)
5. Template now available for program instantiation
```

### Use Case 2: NGO Creates Program for Beneficiary Group
```
1. NGO selects "Language Practice A1-C2" template
2. Creates "Language for Syrian Refugees" program
3. Links to "Syrian Refugees Global" beneficiary group
4. Overrides session duration to 30 minutes (not 60)
5. Publishes program (status: active)
6. Program appears in catalog for companies to browse
```

### Use Case 3: Company Creates Campaign
```
1. Acme Corp browses program catalog
2. Selects "Language for Syrian Refugees" program
3. Creates Q2 2025 campaign
4. Allocates $5,000 budget from L2I subscription
5. Sets target enrollment: 50 learners
6. Enables auto-matching (override program default)
7. Launches campaign (status: active)
8. Acme employees can now enroll as volunteers
```

### Use Case 4: User Enrolls in Campaign
```
1. Syrian refugee Maria registers in platform
2. Acme volunteer John enrolls in campaign
3. Auto-matching creates pairing (Maria + John)
4. Enrollment record created:
   - programId: "Language for Syrians"
   - campaignId: "Acme Q2 2025"
   - userId: Maria's ID
5. Kintell session scheduled
6. Session completed → SROI/VIS calculated
7. Campaign budget decremented
8. Impact metrics updated
```

### Use Case 5: Scaling to New Beneficiary Group
```
1. Admin wants "Language for Afghan Refugees"
2. Reuses existing "Language Practice A1-C2" template
3. Creates new program instance
4. Links to "Afghan Refugees" beneficiary group
5. No code changes needed
6. All infrastructure (sessions, SROI, events) works immediately
```

---

## 10. Benefits of This Model

### Reusability
- **1 template → ∞ programs** for different beneficiary groups
- **1 program → ∞ campaigns** for different companies
- Reduce code duplication, increase consistency

### Scalability
- Add new beneficiary groups without code changes
- Companies self-service campaign creation
- Platform grows without engineering bottlenecks

### Flexibility
- Configuration inheritance allows customization
- Companies can adapt programs to their needs
- Templates evolve independently of programs

### Monetization
- Campaigns link to L2I subscriptions
- Budget tracking per campaign
- Clear ROI measurement per company

### Impact Attribution
- Multi-level rollups: Campaign → Program → Template → Global
- Granular SROI/VIS tracking
- Evidence lineage preserved

### Compliance
- Template versioning ensures reproducibility
- Config changes audited
- Campaign-level data segmentation for privacy

---

## 11. Comparison with Current State

| Aspect | Current (programType) | New (Template System) |
|--------|------------------------|------------------------|
| **Program Identity** | String enum | First-class entity with UUID |
| **Beneficiary Groups** | Not supported | Explicit beneficiary_groups table |
| **Company Campaigns** | Not supported | program_campaigns with budgets |
| **Configuration** | Hardcoded in code | Schema-driven, overridable |
| **Reusability** | None (hardcoded per type) | Templates → Programs → Campaigns |
| **Impact Attribution** | Only by type | By campaign/program/template |
| **Scalability** | Requires code changes | Self-service, no code changes |
| **Versioning** | N/A | Template versioning |
| **Monetization** | Coarse (type-level) | Granular (campaign-level) |

---

## 12. Constraints & Governance

### What CAN Be Overridden
✅ Session duration
✅ Matching criteria
✅ Milestone thresholds
✅ UI labels and descriptions
✅ SROI/VIS multipliers (within bounds)

### What CANNOT Be Overridden
❌ Program category (mentorship, language, buddy)
❌ Core workflow (session scheduling, matching algorithm)
❌ Data residency rules
❌ Compliance requirements
❌ SDG goal alignment (can add, but not remove core goals)

### Validation Rules
- Config overrides must validate against template schema
- SROI weights must be non-negative
- Campaign budgets cannot exceed L2I subscription balance
- Enrollment caps enforced at campaign level
- Beneficiary group eligibility checked on enrollment

---

## 13. Migration Path

### Phase 1: Create Entities
```sql
-- Create template for existing "language" type
INSERT INTO program_templates (template_key, name, category, ...) VALUES
  ('language_practice_a1c2_v1', 'Language Practice A1-C2', 'language', ...);

-- Create program for Ukrainian cohort
INSERT INTO programs (program_key, template_id, name, program_type, ...) VALUES
  ('language-ukrainian-2024', @template_id, 'Language for Ukrainian Refugees', 'language', ...);
```

### Phase 2: Backfill Enrollments
```sql
-- Update existing enrollments to reference new program
UPDATE program_enrollments
SET program_id = @language_ukrainian_program_id
WHERE program_type = 'language';
```

### Phase 3: Update Connectors
```typescript
// Old: Create enrollment with just programType
await db.insert(programEnrollments).values({
  userId,
  programType: 'language',
  enrolledAt: new Date()
});

// New: Lookup program and create with program_id
const program = await lookupProgram('language', beneficiaryGroupId);
await db.insert(programEnrollments).values({
  userId,
  programType: 'language', // KEEP for backward compat
  programId: program.id,   // NEW
  enrolledAt: new Date()
});
```

### Phase 4: Deprecate programType
```typescript
/** @deprecated Use programId instead */
programType: string;
```

---

## 14. Summary

### Key Concepts
- **Template** = Reusable blueprint
- **Program** = Beneficiary-targeted instance
- **Campaign** = Company-funded instance
- **Enrollment** = User participation

### Configuration Precedence
Template → Program → Campaign (deep merge)

### Lifecycle States
draft → active → paused → completed → archived

### Benefits
- ✅ Reusability
- ✅ Scalability
- ✅ Flexibility
- ✅ Monetization
- ✅ Impact Attribution

---

**Concepts Defined** ✅
**Next Agent**: mentor-template-designer (Agent 3)
