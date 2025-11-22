# Program Templates Guide

**Version**: 1.0.0
**Last Updated**: 2025-11-22
**Status**: Foundation for SWARM 6 (Beneficiary Groups, Campaigns & Monetization)

## Overview

Program Templates are reusable blueprints for creating CSR programs within the TEEI Platform. They define the structure, configuration, capacity, and outcomes for different program types (mentorship, language, buddy, upskilling, weei).

### Purpose

- **Reusability**: Create once, instantiate many times across different campaigns
- **Consistency**: Ensure programs follow proven formats and best practices
- **Flexibility**: Support program-specific configurations via typed JSONB fields
- **Scalability**: Enable rapid deployment of new campaigns with pre-tested templates
- **Monetization**: Provide cost estimates and capacity guidelines for pricing

### Architecture Position

```
Program Templates (Blueprints)
       ↓
Campaigns (Template + Beneficiary Group + Company + Commercial Terms)
       ↓
Program Instances (Runtime execution of campaigns)
       ↓
Sessions/Activities (Kintell, Buddy, Upskilling events)
```

---

## Schema Overview

### Table: `program_templates`

**Location**: `/packages/shared-schema/src/schema/program-templates.ts`

#### Key Fields

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `name` | VARCHAR(255) | Human-readable template name |
| `description` | TEXT | Detailed template description |
| `programType` | ENUM | One of: mentorship, language, buddy, upskilling, weei |
| `version` | VARCHAR(20) | Semantic version (e.g., "1.0.0") |
| `defaultConfig` | JSONB | Program-specific configuration (typed) |
| `defaultMinParticipants` | INTEGER | Minimum viable participants |
| `defaultMaxParticipants` | INTEGER | Maximum capacity |
| `defaultVolunteersNeeded` | INTEGER | Volunteers required per instance |
| `outcomeMetrics` | JSONB (string[]) | Outcome metrics tracked |
| `suitableForGroups` | JSONB (string[]) | Compatible beneficiary group tags |
| `estimatedCostPerParticipant` | DECIMAL | Cost estimate (USD/EUR) |
| `estimatedHoursPerVolunteer` | DECIMAL | Volunteer time commitment |
| `isActive` | BOOLEAN | Can be used for new campaigns |
| `isPublic` | BOOLEAN | Available to all companies |
| `tags` | JSONB (string[]) | Searchable tags |
| `createdBy` | UUID | Admin who created template |
| `deprecatedAt` | TIMESTAMP | When marked as deprecated |
| `supersededBy` | UUID | Link to newer version |

---

## Program Types & Config Schemas

### 1. Mentorship Programs

**Type**: `mentorship`

**Use Cases**: 1-on-1 career mentorship, group mentorship, technical skills mentoring

#### Config Schema (`MentorshipConfig`)

```typescript
interface MentorshipConfig {
  sessionFormat: '1-on-1' | 'group' | 'hybrid';
  sessionDuration: number; // minutes
  sessionFrequency: 'weekly' | 'bi-weekly' | 'monthly' | 'flexible';
  totalDuration: number; // weeks
  totalSessionsRecommended?: number;

  // Matching
  matchingCriteria: string[]; // ['skills', 'industry', 'language', 'career_goals']
  autoMatching: boolean;

  // Focus areas
  focusAreas: string[]; // ['career', 'integration', 'technical_skills', 'language']

  // Outcomes tracked
  outcomesTracked: string[]; // ['job_readiness', 'confidence', 'network_building']

  // Requirements
  mentorRequirements?: {
    minExperience?: number; // years
    industries?: string[];
    languages?: string[];
    certifications?: string[];
  };

  // Support materials
  onboardingMaterialsUrl?: string;
  sessionGuidelinesUrl?: string;
}
```

#### Example Templates

1. **Mentorship 1-on-1 (6 months)** - Standard career mentorship
2. **Mentorship Group Sessions (3 months)** - Group mentorship for shared learning
3. **Technical Skills Mentorship (4 months)** - Specialized technical mentoring

**Seed File**: `/scripts/seed/templates/mentorship-template.sql`

---

### 2. Language Programs

**Type**: `language`

**Use Cases**: Group language classes, 1-on-1 tutoring, intensive programs, business language

#### Config Schema (`LanguageConfig`)

```typescript
interface LanguageConfig {
  // Class structure
  classSizeMin: number;
  classSizeMax: number;
  sessionDuration: number; // minutes
  sessionsPerWeek: number;
  totalWeeks: number;

  // Proficiency
  proficiencyLevels: ('A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2')[];
  targetLanguages: string[]; // ISO 639-1 codes: ['en', 'no', 'de']

  // Delivery
  deliveryMode: 'in-person' | 'online' | 'hybrid';
  platform?: string; // 'zoom', 'teams', 'kintell'

  // Curriculum
  curriculumFocus: string[]; // ['conversational', 'business', 'academic']
  assessmentFrequency: 'weekly' | 'bi-weekly' | 'monthly' | 'end-of-course';
  certificationOffered: boolean;

  // Materials
  textbookRequired: boolean;
  textbookTitle?: string;
  materialsUrl?: string;
}
```

#### Example Templates

1. **English Group Sessions (A1-A2)** - Beginner English
2. **Norwegian Group Sessions (B1-B2)** - Intermediate Norwegian
3. **Business English 1-on-1 (B2-C1)** - Advanced business English
4. **German Intensive (A1-B1)** - Intensive German program

**Seed File**: `/scripts/seed/templates/language-template.sql`

---

### 3. Buddy Programs

**Type**: `buddy`

**Use Cases**: 1-on-1 buddy matching, group activities, professional networking, family support

#### Config Schema (`BuddyConfig`)

```typescript
interface BuddyConfig {
  // Matching
  matchMethod: 'skill_based' | 'random' | 'interest_based' | 'manual';
  pairDuration: number; // weeks
  allowGroupBuddies: boolean;
  maxBuddiesPerVolunteer?: number;

  // Check-ins
  checkInFrequency: 'weekly' | 'bi-weekly' | 'monthly';
  checkInFormat: 'survey' | 'call' | 'meeting' | 'flexible';
  requiredCheckIns: number;

  // Activities
  suggestedActivities: string[]; // ['coffee_chat', 'city_tour', 'workshop']
  mandatoryActivities?: string[];
  activityTracking: boolean;

  // Goals
  primaryGoals: string[]; // ['integration', 'language_practice', 'cultural_exchange']

  // Support
  buddyTrainingRequired: boolean;
  buddyTrainingUrl?: string;
  ongoingSupportUrl?: string;
}
```

#### Example Templates

1. **Buddy 1-on-1 Matching (6 months)** - Standard buddy program
2. **Buddy Group Activities (3 months)** - Group-based activities
3. **Professional Networking Buddy (4 months)** - Career-focused buddy
4. **Family Integration Buddy (12 months)** - Long-term family support

**Seed File**: `/scripts/seed/templates/buddy-template.sql`

---

### 4. Upskilling Programs

**Type**: `upskilling`

**Use Cases**: Tech bootcamps, professional certifications, digital literacy, online courses

#### Config Schema (`UpskillingConfig`)

```typescript
interface UpskillingConfig {
  // Platforms
  coursePlatforms: ('linkedin_learning' | 'coursera' | 'udemy' | 'pluralsight' | 'custom')[];
  platformUrls?: Record<string, string>;

  // Tracks
  skillTracks: string[]; // ['data_analytics', 'cloud', 'web_dev']
  difficultyLevels: ('beginner' | 'intermediate' | 'advanced')[];

  // Requirements
  certificationRequired: boolean;
  certificationProvider?: string;
  minimumCompletionRate: number; // percentage
  timeToComplete: number; // weeks

  // Progress
  milestones: string[];
  progressTrackingFrequency: 'weekly' | 'bi-weekly' | 'monthly';

  // Support
  mentorSupport: boolean;
  peerGroupsEnabled: boolean;
  officeHoursUrl?: string;

  // Budget
  maxCostPerParticipant?: number;
  stipendProvided: boolean;
  stipendAmount?: number;
}
```

#### Example Templates

1. **Tech Skills Bootcamp (12 weeks)** - Web dev, data, cloud
2. **Professional Certifications (16 weeks)** - PMP, Scrum, Google Analytics
3. **Digital Literacy Fundamentals (8 weeks)** - Computer basics
4. **Language + Professional Skills (20 weeks)** - Integrated program
5. **Cloud Computing Certification (14 weeks)** - AWS/Azure/GCP

**Seed File**: `/scripts/seed/templates/upskilling-template.sql`

---

### 5. WEEI Programs (Work Experience & Employment Integration)

**Type**: `weei`

**Use Cases**: Internships, apprenticeships, job placements, work experience programs

#### Config Schema (`WeeiConfig`)

```typescript
interface WeeiConfig {
  // Program type
  programType: 'internship' | 'apprenticeship' | 'job_placement' | 'work_experience' | 'mixed';
  duration: number; // weeks
  hoursPerWeek: number;

  // Placement
  placementType: 'internal' | 'external_partner' | 'mixed';
  partnerOrganizations?: string[];
  industries: string[];

  // Skills
  skillsRequired: string[];
  skillsDeveloped: string[];

  // Support
  jobCoachProvided: boolean;
  jobCoachHours?: number;
  cvReviewProvided: boolean;
  interviewPrepProvided: boolean;

  // Outcomes
  targetOutcomes: string[]; // ['job_offer', 'cv_improvement', 'interview_skills']
  successMetrics: string[]; // ['placement_rate', 'retention_rate']

  // Compensation
  compensated: boolean;
  compensationAmount?: number;
  compensationType?: 'hourly' | 'monthly' | 'stipend';
}
```

#### Example Templates

*(Templates to be created based on business requirements)*

---

## Template Versioning Strategy

### Semantic Versioning

Templates use semantic versioning: `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (incompatible with existing campaigns)
- **MINOR**: Backward-compatible additions (new optional fields)
- **PATCH**: Bug fixes, documentation updates

### Version Lifecycle

1. **Active**: Template is available for new campaigns (`isActive = true`)
2. **Deprecated**: Template marked as deprecated (`deprecatedAt` set)
   - Existing campaigns continue running
   - New campaigns cannot use this template
   - `supersededBy` points to replacement template
3. **Archived**: Template removed from active listings but preserved for historical campaigns

### Upgrading Templates

**When to create a new version:**

- Significant config schema changes
- Change in capacity defaults that affects pricing
- Major methodology changes

**How to create a new version:**

1. Create new template with incremented version
2. Mark old template as deprecated
3. Set `supersededBy` to new template ID
4. Migrate existing campaigns (optional, campaign-by-campaign)

**Example**:

```sql
-- Deprecate old version
UPDATE program_templates
SET
  deprecated_at = NOW(),
  superseded_by = 'tmpl-mentor-1on1-v2-000000000002',
  is_active = false
WHERE id = 'tmpl-mentor-1on1-000000000001';

-- Create new version
INSERT INTO program_templates (...) VALUES (..., version: '2.0.0', ...);
```

---

## Template-to-Campaign Compatibility

### Beneficiary Group Matching

Templates define `suitableForGroups` (array of tags) that must overlap with `BeneficiaryGroup.tags`.

**Example**:

```typescript
// Template
{
  suitableForGroups: ['refugees', 'migrants', 'integration', 'employment']
}

// Beneficiary Group
{
  tags: ['refugees', 'syrian', 'integration', 'berlin']
}

// Match: ✅ (shares 'refugees' and 'integration')
```

**Validation Logic** (to be implemented in Campaign Service):

```typescript
function isTemplateCompatible(template, beneficiaryGroup) {
  const sharedTags = template.suitableForGroups.filter(tag =>
    beneficiaryGroup.tags.includes(tag)
  );
  return sharedTags.length > 0; // At least 1 shared tag
}
```

### Campaign Config Overrides

When creating a campaign, companies can override template defaults:

```typescript
// Template default
{
  defaultMaxParticipants: 50,
  defaultConfig: { sessionFrequency: 'bi-weekly' }
}

// Campaign override
{
  targetBeneficiaries: 30, // Override capacity
  configOverrides: { sessionFrequency: 'weekly' } // Override frequency
}

// Merged for Program Instance
{
  maxParticipants: 30,
  config: { ...templateConfig, sessionFrequency: 'weekly' }
}
```

---

## Creating Custom Templates

### For Platform Admins

**Step 1: Define the config schema** (if new program type)

Edit `/packages/shared-schema/src/schema/program-templates.ts`:

```typescript
export interface MyNewProgramConfig {
  field1: string;
  field2: number;
  // ...
}
```

**Step 2: Create the template**

```sql
INSERT INTO program_templates (
  name, description, program_type, version, default_config,
  default_min_participants, default_max_participants, default_volunteers_needed,
  outcome_metrics, suitable_for_groups, is_active, is_public, tags
) VALUES (
  'My Custom Template',
  'Description...',
  'mentorship', -- or language, buddy, upskilling, weei
  '1.0.0',
  '{"field1": "value", "field2": 123}'::jsonb,
  5, 25, 1,
  '["outcome1", "outcome2"]'::jsonb,
  '["refugees", "integration"]'::jsonb,
  true, true,
  '["custom", "pilot"]'::jsonb
);
```

**Step 3: Test with a campaign**

Create a test campaign using the template and verify:
- Config merging works correctly
- Capacity constraints are enforced
- Outcome metrics are tracked

### For Companies (Future Feature)

**Private Templates** (`isPublic = false`):

Companies can request custom templates for their specific needs:

1. Contact platform admin with requirements
2. Admin creates template with `isPublic = false` and `createdBy = company_admin_id`
3. Template only visible to that company in campaign wizard

---

## Template Discovery & Filtering

### Query Examples

**Get all active public templates:**

```sql
SELECT * FROM program_templates
WHERE is_active = true AND is_public = true
ORDER BY created_at DESC;
```

**Filter by program type:**

```sql
SELECT * FROM program_templates
WHERE program_type = 'mentorship' AND is_active = true;
```

**Find templates compatible with a beneficiary group:**

```sql
SELECT * FROM program_templates
WHERE is_active = true
AND suitable_for_groups ?| ARRAY['refugees', 'integration'];
-- ?| checks for overlap between JSONB array and PostgreSQL array
```

**Search by tags:**

```sql
SELECT * FROM program_templates
WHERE tags @> '["career", "integration"]'::jsonb;
-- @> checks if tags contains all specified tags
```

### API Endpoints (Future)

- `GET /api/templates` - List templates (filters: programType, isActive, tags)
- `GET /api/templates/:id` - Get template details
- `POST /api/templates` - Create template (admin only)
- `PATCH /api/templates/:id` - Update template (admin only)
- `POST /api/templates/:id/deprecate` - Deprecate template (admin only)

---

## Monetization Integration

### Cost Estimation

Templates provide monetization hints:

```typescript
{
  estimatedCostPerParticipant: 150.00, // EUR/USD
  estimatedHoursPerVolunteer: 12.00 // Total hours
}
```

**Usage in Campaign Pricing**:

```typescript
// Seats Model
const totalCost = template.estimatedCostPerParticipant * campaign.targetBeneficiaries;

// IAAS Model (Impact-as-a-Service)
const pricePerLearner = template.estimatedCostPerParticipant * margin;

// Credits Model
const creditsPerSession = template.estimatedHoursPerVolunteer * creditRate;
```

### Capacity-Based Pricing

Templates define capacity defaults used in pricing calculators:

```typescript
// Template
{
  defaultMaxParticipants: 50,
  defaultVolunteersNeeded: 1
}

// Campaign
{
  targetBeneficiaries: 50,
  committedSeats: 1 (volunteer)
}

// Pricing
seatPrice = baseSeatPrice * volunteerHoursRequired
```

---

## Best Practices

### Template Design

1. **Start Simple**: Begin with minimal viable config, add fields as needed
2. **Document Thoroughly**: Description should explain format, duration, outcomes
3. **Set Realistic Defaults**: Defaults should work for 80% of use cases
4. **Tag Generously**: More tags = better discoverability
5. **Estimate Conservatively**: Cost/hours estimates should account for overhead

### Config Schema Evolution

1. **Backward Compatible**: Add new optional fields, don't remove existing ones
2. **Use Defaults**: New fields should have sensible defaults
3. **Version Bumps**: MINOR for new optional fields, MAJOR for breaking changes
4. **Migration Path**: Document how to migrate from old to new version

### Naming Conventions

- **Template Name**: `[Program Type] [Format] ([Duration])`
  - ✅ "Mentorship 1-on-1 (6 months)"
  - ✅ "English Group Sessions (A1-A2)"
  - ❌ "Program 1", "Template A"
- **IDs**: `tmpl-[type]-[variant]-[sequence]`
  - ✅ `tmpl-mentor-1on1-000000000001`
  - ✅ `tmpl-lang-eng-basic-000000000001`

### Testing Templates

Before marking a template as active:

1. Create a test campaign using the template
2. Create a test program instance
3. Simulate activities (sessions, check-ins, etc.)
4. Verify metrics aggregation works
5. Check capacity constraints are enforced
6. Validate config merging (template + campaign overrides)

---

## Migration & Seed Scripts

### Applying Templates

**Order of execution:**

1. Run schema migration (creates `program_templates` table)
2. Run template seed files in any order:
   - `mentorship-template.sql`
   - `language-template.sql`
   - `buddy-template.sql`
   - `upskilling-template.sql`

**Command** (example):

```bash
# Apply schema
psql -d teei_platform -f packages/shared-schema/migrations/XXX_create_program_templates.sql

# Seed templates
psql -d teei_platform -f scripts/seed/templates/mentorship-template.sql
psql -d teei_platform -f scripts/seed/templates/language-template.sql
psql -d teei_platform -f scripts/seed/templates/buddy-template.sql
psql -d teei_platform -f scripts/seed/templates/upskilling-template.sql
```

### Verification

After seeding:

```sql
-- Count templates by type
SELECT program_type, COUNT(*)
FROM program_templates
WHERE is_active = true
GROUP BY program_type;

-- Should show:
-- mentorship: 3
-- language: 4
-- buddy: 4
-- upskilling: 5
-- Total: 16 templates
```

---

## Troubleshooting

### Common Issues

**1. JSONB validation errors**

```
ERROR: invalid input syntax for type json
```

**Solution**: Ensure config JSON is valid. Use online JSON validators or:

```bash
echo '{"key": "value"}' | jq .
```

**2. Template not appearing in campaign wizard**

**Checklist**:
- `is_active = true`?
- `is_public = true`?
- `suitable_for_groups` overlaps with beneficiary group tags?
- Not deprecated (`deprecated_at IS NULL`)?

**3. Config override not applying**

**Check**: Campaign config override uses exact field names from template config schema.

```typescript
// ❌ Wrong
configOverrides: { frequency: 'weekly' }

// ✅ Correct
configOverrides: { sessionFrequency: 'weekly' }
```

---

## Future Enhancements

### Planned Features

1. **Template Cloning**: Clone and customize existing templates
2. **Template Analytics**: Track which templates are most used, highest SROI
3. **Template Recommendations**: Suggest templates based on company industry, goals
4. **Template Marketplace**: Community-contributed templates (vetted by admins)
5. **A/B Testing**: Compare outcomes between different template versions
6. **Auto-Versioning**: Automatically version templates when config schema changes

### Integration Roadmap

- **Phase 1** (SWARM 6): Schema, seed data, basic compatibility logic ✅
- **Phase 2**: Campaign creation wizard with template selector
- **Phase 3**: Program instance auto-creation from templates
- **Phase 4**: Template analytics and recommendations
- **Phase 5**: Custom templates for companies

---

## Related Documentation

- [SWARM_6_PLAN.md](/SWARM_6_PLAN.md) - Full SWARM 6 orchestration plan
- [CAMPAIGN_LIFECYCLE.md](/docs/CAMPAIGN_LIFECYCLE.md) - Campaign state machine (to be created)
- [BENEFICIARY_GROUPS_PRIVACY.md](/docs/BENEFICIARY_GROUPS_PRIVACY.md) - Beneficiary groups (to be created)
- [Database_Schema.md](/docs/Database_Schema.md) - Overall database architecture

---

## Support & Contributions

### Questions?

- Technical: Review schema file (`/packages/shared-schema/src/schema/program-templates.ts`)
- Business: Contact CSR program leads for template requirements
- Security: Ensure no PII in template configs (aggregate data only)

### Contributing Templates

To contribute a new template:

1. Document the use case and target beneficiary groups
2. Define the config schema (TypeScript interface)
3. Create seed SQL with realistic defaults
4. Test with a pilot campaign
5. Submit PR with template + documentation

---

**Document Version**: 1.0.0
**Maintained By**: Agent 1.3 (program-template-modeler)
**Last Review**: 2025-11-22
