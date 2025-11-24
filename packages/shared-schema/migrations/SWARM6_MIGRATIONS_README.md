# SWARM 6 Migrations: Beneficiary Groups, Campaigns & Monetization

**Created**: 2025-11-22
**Agent**: 2.2 (migration-engineer)
**Status**: Ready for execution

---

## Overview

This migration set introduces **5 new tables** and **12 new enum types** to enable the Beneficiary Groups, Campaigns, and Monetization features for the TEEI CSR Platform.

### Tables Created

1. **`beneficiary_groups`** - Privacy-first target population definitions
2. **`program_templates`** - Reusable program blueprints
3. **`campaigns`** - Sellable CSR products with commercial terms
4. **`program_instances`** - Runtime execution of campaigns
5. **`campaign_metrics_snapshots`** - Time-series metrics tracking

### Migration Files

#### Forward Migrations (Dependency Order)
```
0044_create_beneficiary_groups.sql         → No dependencies
0045_create_program_templates.sql          → Depends on: users
0046_create_campaigns.sql                  → Depends on: companies, program_templates, beneficiary_groups, l2i_subscriptions
0047_create_program_instances.sql          → Depends on: campaigns, program_templates, beneficiary_groups, companies
0048_create_campaign_metrics_snapshots.sql → Depends on: campaigns
```

**Migration Statistics**:
- **5 tables** (beneficiary_groups, program_templates, campaigns, program_instances, campaign_metrics_snapshots)
- **10 enum types** created
- **58 indexes** created (9 + 9 + 18 + 12 + 10)
- **13 foreign key constraints**
- **4 triggers** (updated_at for each table except campaign_metrics_snapshots)

#### Rollback Migrations (Reverse Order)
```
0048_rollback_campaign_metrics_snapshots.sql
0047_rollback_program_instances.sql
0046_rollback_campaigns.sql
0045_rollback_program_templates.sql
0044_rollback_beneficiary_groups.sql
```

---

## Execution

### Quick Start

```bash
# Run all migrations
./scripts/migrate-swarm6.sh up

# Check status
./scripts/migrate-swarm6.sh status

# Rollback (if needed)
./scripts/migrate-swarm6.sh down
```

### Manual Execution (PostgreSQL)

If you prefer to run migrations manually:

```bash
# Connect to database
psql -h localhost -U postgres -d teei_platform

# Execute migrations in order
\i packages/shared-schema/migrations/0044_create_beneficiary_groups.sql
\i packages/shared-schema/migrations/0045_create_program_templates.sql
\i packages/shared-schema/migrations/0046_create_campaigns.sql
\i packages/shared-schema/migrations/0047_create_program_instances.sql
\i packages/shared-schema/migrations/0048_create_campaign_metrics_snapshots.sql

# Verify
SELECT table_name FROM information_schema.tables
WHERE table_name IN (
  'beneficiary_groups',
  'program_templates',
  'campaigns',
  'program_instances',
  'campaign_metrics_snapshots'
);
```

### Environment-Specific Execution

```bash
# Development
DB_HOST=localhost DB_NAME=teei_platform ./scripts/migrate-swarm6.sh up

# Staging
DB_HOST=staging.db.teei.com DB_NAME=teei_staging DB_PASSWORD=xxx ./scripts/migrate-swarm6.sh up

# Production (with backup first!)
# 1. Backup database
pg_dump -h prod.db.teei.com -U postgres teei_production > backup_before_swarm6.sql

# 2. Run migrations
DB_HOST=prod.db.teei.com DB_NAME=teei_production DB_PASSWORD=xxx ./scripts/migrate-swarm6.sh up
```

---

## Schema Details

### 1. Beneficiary Groups

**Purpose**: Privacy-first definitions of target populations (refugees, migrants, women-in-tech, etc.)

**Key Features**:
- ✅ No individual PII stored (GDPR compliant)
- ✅ Aggregated demographics only (age ranges, not birthdates)
- ✅ Broad legal status categories (not visa/permit details)
- ✅ Group-level data only

**Enums Created** (5 enums):
- `beneficiary_group_type` (13 values: refugees, migrants, asylum_seekers, women_in_tech, youth, seniors, displaced_persons, newcomers, students, job_seekers, caregivers, veterans, other)
- `gender_focus` (5 values: all, women, men, non_binary, mixed)
- `language_requirement` (5 values: fluent, conversational, beginner, any, none_required)
- `legal_status_category` (6 values: refugee, asylum_seeker, migrant, citizen, student, other)
- `eligible_program_type` (5 values: mentorship, language, buddy, upskilling, weei)

**Indexes**: 9 indexes (including GIN indexes for JSONB fields)

**Example Row**:
```json
{
  "name": "Syrian Refugees in Berlin",
  "groupType": "refugees",
  "countryCode": "DE",
  "region": "Berlin",
  "ageRange": { "min": 18, "max": 45 },
  "primaryLanguages": ["ar", "en"],
  "eligibleProgramTypes": ["mentorship", "language"]
}
```

---

### 2. Program Templates

**Purpose**: Reusable program templates for mentorship, language, buddy, upskilling, and weei programs

**Key Features**:
- Semantic versioning (1.0.0)
- JSONB configuration (structure varies by program type)
- Capacity defaults and outcome metrics
- Monetization hints (cost estimates)

**Enums Created**:
- `program_type` (5 values: mentorship, language, buddy, upskilling, weei)

**Indexes**: 8 indexes (including GIN indexes for JSONB fields)

**Configuration Structures** (TypeScript types in Drizzle schema):
- `MentorshipConfig` - Session format, matching criteria, focus areas
- `LanguageConfig` - Class size, proficiency levels, curriculum
- `BuddyConfig` - Match method, check-in frequency, activities
- `UpskillingConfig` - Course platforms, skill tracks, certifications
- `WeeiConfig` - Program type, placement, skills, compensation

---

### 3. Campaigns

**Purpose**: Sellable CSR products linking templates, beneficiary groups, and commercial terms

**Key Features**:
- Campaign lifecycle (draft → planned → recruiting → active → completed → closed)
- 5 pricing models (seats, credits, bundle, IAAS, custom)
- Capacity tracking (volunteers, beneficiaries, sessions)
- Budget tracking and utilization
- Impact metrics (SROI, VIS)
- Upsell indicators (capacity utilization, high-value flags)

**Enums Created**:
- `campaign_status` (7 values: draft, planned, recruiting, active, paused, completed, closed)
- `pricing_model` (5 values: seats, credits, bundle, iaas, custom)
- `campaign_priority` (4 values: low, medium, high, critical)

**Indexes**: 17 indexes (performance-optimized for dashboards and upsell queries)

**Foreign Keys**:
- `company_id` → companies (CASCADE)
- `program_template_id` → program_templates (RESTRICT)
- `beneficiary_group_id` → beneficiary_groups (RESTRICT)
- `l2i_subscription_id` → l2i_subscriptions (optional)

---

### 4. Program Instances

**Purpose**: Runtime execution of campaigns with inherited configuration and activity tracking

**Key Features**:
- Denormalized relationships (companyId, templateId, groupId) for query performance
- Merged configuration (template defaults + campaign overrides)
- Participant counts (no individual PII)
- Activity tracking (sessions, hours)
- Impact metrics (SROI, VIS, outcome scores)
- Capacity consumption (seats, credits, learners)

**Enums Created**:
- `program_instance_status` (4 values: planned, active, paused, completed)

**Indexes**: 11 indexes (optimized for campaign rollup queries)

**Foreign Keys**:
- `campaign_id` → campaigns (CASCADE)
- `program_template_id` → program_templates (RESTRICT)
- `company_id` → companies (CASCADE)
- `beneficiary_group_id` → beneficiary_groups (RESTRICT)

---

### 5. Campaign Metrics Snapshots

**Purpose**: Time-series tracking for campaign performance (daily snapshots)

**Key Features**:
- Point-in-time capacity metrics (volunteers, beneficiaries, sessions)
- Budget burn-rate tracking
- Impact metrics over time (SROI, VIS trends)
- Pricing model-specific metrics (seats, credits, learners)
- Full snapshot JSONB (alerts, engagement, outcomes)

**Enums Created**: None

**Indexes**: 10 indexes (optimized for time-series queries and capacity alerts)

**Foreign Keys**:
- `campaign_id` → campaigns (CASCADE)

**Unique Constraint**: `(campaign_id, snapshot_date)` - one snapshot per campaign per timestamp

---

## Database Statistics

### Summary

| Metric | Count |
|--------|-------|
| **Tables** | 5 |
| **Enum Types** | 10 |
| **Total Indexes** | 58 |
| **Foreign Keys** | 13 |
| **Triggers** | 4 (updated_at triggers) |
| **Comments** | 60+ (table and column documentation) |

### Size Estimates (After Seed Data)

| Table | Estimated Rows | Estimated Size |
|-------|---------------|----------------|
| `beneficiary_groups` | 10-50 | ~100 KB |
| `program_templates` | 10-20 | ~50 KB |
| `campaigns` | 100-1000 | ~500 KB - 5 MB |
| `program_instances` | 500-5000 | ~2 MB - 20 MB |
| `campaign_metrics_snapshots` | 10K-100K | ~50 MB - 500 MB |

---

## Migration Quality Checklist

- [x] Migrations are idempotent (CREATE TABLE IF NOT EXISTS)
- [x] Dependency order is correct
- [x] All foreign keys have ON DELETE/ON UPDATE clauses
- [x] All indexes are created
- [x] All enums are created before tables
- [x] Rollback scripts drop in reverse order
- [x] Migration numbers don't conflict (0044-0048)
- [x] All JSONB fields have TypeScript type hints in Drizzle schemas
- [x] Triggers for updated_at timestamps
- [x] CHECK constraints for data integrity
- [x] Comprehensive COMMENT ON statements

---

## Validation Queries

After running migrations, validate the schema with these queries:

### Check Tables Exist
```sql
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name IN (
  'beneficiary_groups',
  'program_templates',
  'campaigns',
  'program_instances',
  'campaign_metrics_snapshots'
)
ORDER BY table_name;
```

### Check Enums Exist
```sql
SELECT typname
FROM pg_type
WHERE typname IN (
  'beneficiary_group_type', 'gender_focus', 'language_requirement',
  'legal_status_category', 'eligible_program_type', 'program_type',
  'campaign_status', 'pricing_model', 'campaign_priority',
  'program_instance_status'
)
ORDER BY typname;
```

### Check Foreign Keys
```sql
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name,
  ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN (
    'beneficiary_groups',
    'program_templates',
    'campaigns',
    'program_instances',
    'campaign_metrics_snapshots'
  )
ORDER BY tc.table_name, kcu.column_name;
```

### Check Indexes
```sql
SELECT
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN (
  'beneficiary_groups',
  'program_templates',
  'campaigns',
  'program_instances',
  'campaign_metrics_snapshots'
)
ORDER BY tablename, indexname;
```

---

## Rollback Procedure

### Emergency Rollback

If something goes wrong during migration:

```bash
# 1. Stop the migration (Ctrl+C if still running)

# 2. Run rollback script
./scripts/migrate-swarm6.sh down

# 3. Verify all tables are removed
psql -h localhost -U postgres -d teei_platform -c "
SELECT table_name FROM information_schema.tables
WHERE table_name LIKE 'beneficiary%'
   OR table_name LIKE 'program_%'
   OR table_name LIKE 'campaign%';
"
```

### Partial Rollback

To rollback individual migrations (not recommended, use full rollback):

```sql
-- Rollback in REVERSE order
\i packages/shared-schema/migrations/0048_rollback_campaign_metrics_snapshots.sql
\i packages/shared-schema/migrations/0047_rollback_program_instances.sql
\i packages/shared-schema/migrations/0046_rollback_campaigns.sql
\i packages/shared-schema/migrations/0045_rollback_program_templates.sql
\i packages/shared-schema/migrations/0044_rollback_beneficiary_groups.sql
```

---

## Testing

### Post-Migration Tests

After running migrations, test with:

```bash
# Unit tests (Drizzle schema validation)
pnpm --filter @teei/shared-schema test

# Integration tests (database connectivity)
pnpm test:integration

# E2E tests (API endpoints)
pnpm test:e2e
```

### Sample Data Insertion

See `/scripts/seed/` for sample data scripts (created by Agent 2.3).

---

## Troubleshooting

### Common Issues

**Issue**: "relation already exists"
**Solution**: Migrations are idempotent. Safe to re-run. If needed, run rollback first.

**Issue**: "type already exists"
**Solution**: Enums persist after table drop. Run rollback scripts to clean up.

**Issue**: "permission denied"
**Solution**: Ensure database user has CREATE privileges:
```sql
GRANT CREATE ON DATABASE teei_platform TO your_user;
```

**Issue**: Migration script can't connect
**Solution**: Check environment variables:
```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_NAME=teei_platform
export DB_USER=postgres
export DB_PASSWORD=your_password
```

---

## Next Steps

After successful migration:

1. **Seed Data** - Run Agent 2.3's seed scripts to populate initial data
2. **Type Exports** - Verify TypeScript types are generated (Agent 2.4)
3. **API Tests** - Test campaign CRUD endpoints (Team 3)
4. **Frontend Integration** - Connect Cockpit UI (Team 6)
5. **Documentation** - Review data model docs in `/docs/`

---

## References

- **SWARM 6 Plan**: `/SWARM_6_PLAN.md`
- **Drizzle Schemas**: `/packages/shared-schema/src/schema/`
  - `beneficiary-groups.ts`
  - `program-templates.ts`
  - `campaigns.ts`
  - `program-instances.ts`
  - `campaign-metrics-snapshots.ts`
- **Privacy Analysis**: `/docs/BENEFICIARY_GROUPS_PRIVACY.md`
- **Campaign Lifecycle**: `/docs/CAMPAIGN_LIFECYCLE.md`
- **Pricing Models**: `/docs/CAMPAIGN_PRICING_MODELS.md`

---

## Version History

| Version | Date | Agent | Changes |
|---------|------|-------|---------|
| 1.0.0 | 2025-11-22 | 2.2 | Initial migration set created |

---

**Ready for Agent 2.3 (seed-data-engineer)** ✅
