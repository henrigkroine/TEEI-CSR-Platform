# Program Domain Analysis
## SWARM 3 - Agent 1: program-domain-analyst

**Date**: 2025-11-22
**Agent**: program-domain-analyst
**Status**: ✅ Complete

---

## Executive Summary

Programs in the TEEI CSR Platform currently exist as **hardcoded string enums**, not as first-class entities. The `programType` field appears in 20+ locations across the codebase, representing 4 core program types: `buddy`, `language`, `mentorship`, and `upskilling`.

**Key Finding**: No formal `programs` table exists. All program logic is type-based, preventing:
- Reusable program templates
- Multi-beneficiary scaling
- Company-specific campaigns
- Granular impact attribution

---

## 1. Current Program Representations

### 1.1 Database Tables (PostgreSQL + Drizzle)

**Tables with `programType` or `program_type` field**:

| Table | Column | Type | Usage |
|-------|--------|------|-------|
| `program_enrollments` | `program_type` | VARCHAR(50) | User enrollment tracking |
| `sroi_calculations` | `program_type` | VARCHAR(50) | SROI aggregation |
| `vis_calculations` | `program_type` | VARCHAR(50) | VIS scoring |
| `l2i_allocations` | `program` | ENUM | L2I bundle allocation |

**Enums Defined**:
```typescript
// packages/shared-schema/src/schema/billing.ts
export const l2iProgramEnum = pgEnum('l2i_program', [
  'language',
  'mentorship',
  'upskilling',
  'weei'
]);
```

**No Tables For**:
- ❌ `programs` - Program instances
- ❌ `program_templates` - Reusable templates
- ❌ `beneficiary_groups` - Target demographics
- ❌ `program_campaigns` - Company campaigns

### 1.2 TypeScript Types

**Location**: `packages/shared-types/src/scenarios.ts`
```typescript
export const ProgramTypeSchema = z.enum([
  'buddy',
  'language',
  'mentorship',
  'upskilling'
]);

export type ProgramType = z.infer<typeof ProgramTypeSchema>;
```

**Also appears in**:
- `packages/event-contracts/src/ingest/enrollment-event.ts` - Extended enum with `certification_program`, `other`
- `packages/shared-types/src/evidence.ts` - Evidence metadata
- `packages/shared-types/src/tiles.ts` - Dashboard tiles

### 1.3 Event Contracts

**Enrollment Event** (`packages/event-contracts/src/ingest/enrollment-event.ts`):
```typescript
programType: z.enum([
  'language_course',
  'upskilling_course',
  'mentorship_program',
  'buddy_program',
  'certification_program',
  'other'
])
```

**Note**: Inconsistency between database enums (`language`) and event contracts (`language_course`)

### 1.4 Service Usage

**Files using `programType`**:

1. **Analytics Service** (`services/analytics/src/`):
   - `calculators/sroi-calculator.ts` - Aggregates SROI per programType
   - `loaders/ingestion.ts` - Filters data by programType
   - `routes/sroi.ts` - Exposes SROI per programType
   - `tiles/base-aggregator.ts` - Dashboard tiles per programType

2. **Impact-In Service** (`services/impact-in/src/`):
   - `connectors/internal/kintell-ingest-client.ts` - Maps Kintell to programType
   - `connectors/internal/upskilling-ingest-client.ts` - Maps upskilling to programType
   - `demo/generators/enrollment-generator.ts` - Generates test enrollments
   - `importers/validator.ts` - Validates programType in imports

3. **Journey Engine** (`services/journey-engine/src/`):
   - `rules/engine.ts` - Evaluates rules per programType
   - `__tests__/engine.test.ts` - Tests journey flags

4. **Insights NLQ** (`services/insights-nlq/src/`):
   - `ontology/metrics.ts` - Semantic layer per programType
   - `planner/semantic.ts` - Query planning

---

## 2. Current Program Types

### 2.1 Four Core Types

| Type | Description | Source System | Tables Used |
|------|-------------|---------------|-------------|
| **buddy** | Social integration buddy matching | Buddy System | `buddy_matches`, `buddy_events`, `buddy_checkins`, `buddy_feedback` |
| **language** | Language practice sessions | Kintell | `kintell_sessions` (sessionType='language') |
| **mentorship** | 1:1 mentorship sessions | Kintell | `kintell_sessions` (sessionType='mentorship') |
| **upskilling** | Course/certification programs | Upskilling Platform | `learning_progress` |

### 2.2 L2I Program Categories

**From billing schema** (`l2iProgramEnum`):
- `language` - 40% default allocation
- `mentorship` - 25% default allocation
- `upskilling` - 25% default allocation
- `weei` - 10% default allocation (Women's Economic Empowerment Initiative)

**Note**: `weei` is an L2I category but not a programType in enrollments

---

## 3. Data Flow Analysis

### 3.1 Enrollment Creation Flow

**Kintell Sessions** → `program_enrollments`:
```typescript
// When Kintell session completed
await db.insert(programEnrollments).values({
  userId: participantId,
  programType: session.sessionType === 'language' ? 'language' : 'mentorship',
  enrolledAt: session.scheduledAt,
  status: 'active'
});
```

**Buddy Matches** → `program_enrollments`:
```typescript
// When buddy match created
await db.insert(programEnrollments).values({
  userId: participantId,
  programType: 'buddy',
  enrolledAt: match.matchedAt,
  status: 'active'
});
```

**Upskilling Progress** → `program_enrollments`:
```typescript
// When course enrollment detected
await db.insert(programEnrollments).values({
  userId: learnerId,
  programType: 'upskilling',
  enrolledAt: enrollment.startDate,
  status: 'in_progress'
});
```

### 3.2 Impact Calculation Flow

**SROI Calculation**:
```sql
-- Aggregate social value by program type
SELECT
  program_type,
  SUM(social_value) / SUM(investment) as sroi_ratio
FROM activity_valuations
GROUP BY program_type;
```

**VIS Calculation**:
```sql
-- Calculate user impact score per program
SELECT
  user_id,
  program_type,
  SUM(points_awarded * decay_factor) as current_score
FROM vis_activity_log
GROUP BY user_id, program_type;
```

### 3.3 L2I Allocation Flow

**Company L2I Subscription** → **Allocations**:
```typescript
// When L2I subscription created
const allocations = [
  { program: 'language', percentage: 0.40, amount: $200 },
  { program: 'mentorship', percentage: 0.25, amount: $125 },
  { program: 'upskilling', percentage: 0.25, amount: $125 },
  { program: 'weei', percentage: 0.10, amount: $50 }
];

// Track learners served per program
UPDATE l2i_allocations
SET learners_served = learners_served + 1
WHERE program = 'language';
```

---

## 4. Gaps & Limitations

### 4.1 No Program Entity

**Current**: Programs are strings
```typescript
programType: 'language' // Just a string
```

**Needed**: Programs as first-class entities
```typescript
programId: 'uuid-of-language-for-ukraine'
program: {
  id: 'uuid',
  name: 'Language for Ukrainian Refugees',
  templateId: 'uuid-of-language-template',
  beneficiaryGroupId: 'uuid-of-ukrainian-group',
  config: { ... }
}
```

### 4.2 Cannot Scale to New Beneficiary Groups

**Current**: "Language for Ukraine" hardcoded as `programType='language'`

**Cannot Distinguish**:
- Language for Ukrainian Refugees
- Language for Syrian Refugees
- Language for Afghan Refugees

All are just `programType='language'` with no way to:
- Target different beneficiary groups
- Apply different configurations
- Track separate metrics
- Create company-specific campaigns

### 4.3 No Configuration Management

**Current**: Program parameters hardcoded in code
```typescript
// Hardcoded in service
const SESSION_DURATION = 60; // minutes
const MIN_SESSIONS_FOR_COMPLETION = 10;
```

**Needed**: Template-based configuration
```typescript
template.default_config = {
  session: { defaultDurationMinutes: 60 },
  progression: { minSessionsForCompletion: 10 }
};

program.config = {
  ...template.default_config,
  session: { defaultDurationMinutes: 45 } // Override
};
```

### 4.4 No Company Campaigns

**Current**: Cannot track company-specific program instances

**Needed**:
- Acme Corp creates "Language for Ukrainians Q1 2025" campaign
- Budget tracking per campaign
- Enrollment caps per campaign
- Campaign-level metrics

### 4.5 Coarse Impact Attribution

**Current**: SROI/VIS aggregated only by `programType`

**Cannot Answer**:
- What's the SROI of "Language for Syrians" specifically?
- How does Acme's campaign perform vs. TechCo's campaign?
- Which program template drives best outcomes?

**Needed**: Multi-level rollups
```
Campaign SROI → Program SROI → Template SROI → Global SROI
```

### 4.6 No Template Reusability

**Current**: Each program type implemented from scratch

**If adding "Job Readiness Program"**:
1. Add new `programType` enum value
2. Create new database tables
3. Implement new calculators
4. Update all queries
5. Hard to reuse patterns

**Needed**: Template system
1. Create template from existing template
2. Configure for new use case
3. Instantiate program
4. Inherits all infrastructure

---

## 5. Entity Relationship Analysis

### 5.1 Current Relationships

```
users (1) ─→ (M) program_enrollments [programType: string]
                        ↓
                   (no formal program entity)
                        ↓
                   Hardcoded logic per type:
                   - buddy → buddy_matches
                   - language → kintell_sessions (language)
                   - mentorship → kintell_sessions (mentorship)
                   - upskilling → learning_progress
```

### 5.2 Needed Relationships

```
program_templates (1) ─→ (M) programs
                                ↓
                         beneficiary_groups
                                ↓
companies (1) ─→ (M) program_campaigns ─→ (1) programs
                        ↓
users (1) ─→ (M) program_enrollments ─→ (1) programs
                                      └→ (1) campaigns [optional]
```

---

## 6. Breaking Change Risk Assessment

### 6.1 High-Risk Areas

**Tables with FK to non-existent programs**:
- ❌ `program_enrollments.program_type` - VARCHAR (no FK possible)
- ❌ `sroi_calculations.program_type` - VARCHAR (no FK possible)
- ❌ `vis_calculations.program_type` - VARCHAR (no FK possible)

**Queries assuming programType is sufficient**:
```sql
-- This query works today but loses granularity
SELECT program_type, COUNT(*)
FROM program_enrollments
GROUP BY program_type;

-- Need to support both patterns during migration
SELECT program_type, program_id, COUNT(*)
FROM program_enrollments
GROUP BY program_type, program_id;
```

### 6.2 Migration Strategy

**Phase 1**: Add new columns (non-breaking)
```sql
ALTER TABLE program_enrollments
  ADD COLUMN program_id UUID REFERENCES programs(id),
  ADD COLUMN campaign_id UUID REFERENCES program_campaigns(id);
```

**Phase 2**: Dual-write (compatibility mode)
```typescript
// Write to both old and new columns
await db.insert(programEnrollments).values({
  programType: 'language', // OLD (kept for backward compat)
  programId: programUuid,  // NEW
  campaignId: campaignUuid // NEW
});
```

**Phase 3**: Backfill historical data
```sql
-- Create programs for existing types
INSERT INTO programs (program_key, name, program_type, ...) VALUES
  ('language-ukrainian-2024', 'Language for Ukrainian Refugees', 'language', ...),
  ('mentorship-ukrainian-2024', 'Mentors for Ukrainian Refugees', 'mentorship', ...),
  ('buddy-ukrainian-2024', 'Buddy for Ukrainian Refugees', 'buddy', ...);

-- Backfill enrollments
UPDATE program_enrollments pe
SET program_id = p.id
FROM programs p
WHERE pe.program_type = p.program_type
  AND pe.program_id IS NULL;
```

**Phase 4**: Deprecate (no removal yet)
```typescript
// Mark programType as deprecated in types
/** @deprecated Use programId instead */
programType: string;
```

### 6.3 Services Requiring Updates

**Must Update** (direct programType usage):
1. ✅ analytics (SROI/VIS calculators)
2. ✅ impact-in (enrollment creation)
3. ✅ journey-engine (rule evaluation)
4. ✅ insights-nlq (semantic layer)
5. ✅ kintell-connector (session processing)
6. ✅ buddy-connector (match processing)
7. ✅ reporting (dashboard queries)

**May Need Updates** (indirect usage):
8. ⚠️ billing (L2I allocation tracking)
9. ⚠️ forecast (projection models)
10. ⚠️ api-gateway (routing/auth)

---

## 7. Event Contract Impact

### 7.1 Events to Extend

**Add optional `programId`, `campaignId`, `templateId` fields**:

```typescript
// packages/event-contracts/src/buddy/match-created.ts
export const BuddyMatchCreatedSchema = BaseEventSchema.extend({
  type: z.literal('buddy.match.created'),
  data: z.object({
    matchId: z.string().uuid(),
    participantId: z.string().uuid(),
    buddyId: z.string().uuid(),
    matchedAt: z.string().datetime(),
    // NEW (optional for backward compat)
    programId: z.string().uuid().optional(),
    campaignId: z.string().uuid().optional(),
    templateId: z.string().uuid().optional(),
  }),
});
```

**Events to update**:
- ✅ `buddy.match.created`
- ✅ `buddy.event.attended`
- ✅ `buddy.checkin.completed`
- ✅ `buddy.feedback.submitted`
- ✅ `kintell.session.completed`
- ✅ `kintell.rating.created`
- ✅ `upskilling.course.completed`
- ✅ `upskilling.progress.updated`

### 7.2 New Events to Create

**Program lifecycle events**:
- `program.template.created`
- `program.template.updated`
- `program.created`
- `program.updated`
- `program.campaign.created`
- `program.enrollment.created` (distinct from ingest.enrollment.created)

---

## 8. Recommendations

### 8.1 Critical Path

1. **Create program entity tables** (program_templates, programs, beneficiary_groups, program_campaigns)
2. **Extend program_enrollments** with program_id FK
3. **Seed initial programs** for existing Ukrainian beneficiary group
4. **Backfill historical enrollments** with program_id
5. **Update connectors** (Kintell, Buddy) to populate program_id
6. **Update calculators** (SROI, VIS) to support program-level aggregation
7. **Update event contracts** with program context
8. **Keep programType** for backward compatibility (denormalized)

### 8.2 Non-Breaking Approach

**DO**:
- ✅ Add new columns to existing tables
- ✅ Create new tables for templates/programs/campaigns
- ✅ Dual-write to both programType and program_id
- ✅ Make program_id optional initially
- ✅ Backfill in background job
- ✅ Deprecate programType in docs

**DON'T**:
- ❌ Remove programType column
- ❌ Make program_id required immediately
- ❌ Change existing query patterns until backfill complete
- ❌ Break existing event consumers

### 8.3 Success Criteria

**Schema**:
- [ ] All new tables deployed
- [ ] All indexes created
- [ ] FK constraints validated
- [ ] program_enrollments extended

**Data**:
- [ ] 3 beneficiary groups created
- [ ] 3-5 programs seeded
- [ ] 100% historical enrollments backfilled
- [ ] No orphaned enrollments

**Code**:
- [ ] All connectors populate program_id
- [ ] All calculators support program-level aggregation
- [ ] All events enriched with program context
- [ ] Backward compatibility maintained

**Tests**:
- [ ] Migration tested on staging data
- [ ] Rollback script validated
- [ ] Integration tests passing
- [ ] E2E enrollment flow works

---

## 9. Data Migration Plan

### 9.1 Beneficiary Groups (Seed)

```sql
INSERT INTO beneficiary_groups (group_key, name, primary_region, countries, status) VALUES
  ('ukrainian-refugees-2024', 'Ukrainian Refugees in Europe', 'EU', ARRAY['PL','DE','NO','UK','FR'], 'active'),
  ('syrian-refugees-global', 'Syrian Refugees Worldwide', 'GLOBAL', ARRAY['TR','JO','LB','DE'], 'active'),
  ('afghan-refugees-us', 'Afghan Refugees in United States', 'US', ARRAY['US'], 'active');
```

### 9.2 Programs (Seed from existing data)

```sql
-- Get reference to beneficiary group
SELECT id INTO @ukrainian_group_id FROM beneficiary_groups WHERE group_key = 'ukrainian-refugees-2024';

-- Create programs for Ukrainian cohort
INSERT INTO programs (program_key, template_id, name, program_type, beneficiary_group_id, status) VALUES
  ('language-ukrainian-2024', @language_template_id, 'Language for Ukrainian Refugees', 'language', @ukrainian_group_id, 'active'),
  ('mentorship-ukrainian-2024', @mentorship_template_id, 'Mentors for Ukrainian Refugees', 'mentorship', @ukrainian_group_id, 'active'),
  ('buddy-ukrainian-2024', @buddy_template_id, 'Buddy for Ukrainian Refugees', 'buddy', @ukrainian_group_id, 'active');
```

### 9.3 Backfill Enrollments

```sql
-- Count current enrollments per type
SELECT program_type, COUNT(*) FROM program_enrollments GROUP BY program_type;
-- language: 1,234
-- mentorship: 892
-- buddy: 2,156
-- upskilling: 567

-- Backfill program_id (assume all historical data is Ukrainian cohort)
UPDATE program_enrollments pe
SET
  program_id = p.id,
  beneficiary_group_id = p.beneficiary_group_id
FROM programs p
WHERE pe.program_type = p.program_type
  AND p.beneficiary_group_id = @ukrainian_group_id
  AND pe.program_id IS NULL;

-- Verify no orphans
SELECT COUNT(*) FROM program_enrollments WHERE program_id IS NULL;
-- Should be 0
```

### 9.4 Rollback (if needed)

```sql
-- Remove new columns
ALTER TABLE program_enrollments
  DROP COLUMN IF EXISTS program_id,
  DROP COLUMN IF EXISTS campaign_id,
  DROP COLUMN IF EXISTS beneficiary_group_id;

-- Drop new tables (reverse dependency order)
DROP TABLE IF EXISTS program_campaigns CASCADE;
DROP TABLE IF EXISTS programs CASCADE;
DROP TABLE IF EXISTS beneficiary_groups CASCADE;
DROP TABLE IF EXISTS program_templates CASCADE;
```

---

## 10. Conclusion

### Current State
Programs exist as **hardcoded string enums** in 20+ locations. No formal program entity, preventing:
- Multi-beneficiary scaling
- Company campaigns
- Granular impact attribution
- Template reusability

### Required Changes
1. Create 4 new tables (templates, programs, groups, campaigns)
2. Extend program_enrollments with program_id FK
3. Update 7 services to populate program_id
4. Backfill ~5,000 historical enrollments
5. Enrich 8+ event contracts with program context
6. Maintain backward compatibility via dual-write

### Risk Level
**MEDIUM** - Requires careful migration but no breaking changes if dual-write strategy used.

### Estimated Impact
- **Database**: +4 tables, +6 columns, +12 indexes
- **Services**: 7 services updated, 1 new service (program-service)
- **Events**: 8 contracts extended, 6 new contracts
- **Tests**: ~50 new tests, ~20 updated tests
- **Docs**: 5 new documents, 3 updated

---

**Analysis Complete** ✅
**Next Agent**: template-conceptual-architect (Agent 2)
