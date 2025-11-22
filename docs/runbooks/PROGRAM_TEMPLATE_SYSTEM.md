# Program Template System Operational Runbook

**Agent 29: runbook-author**

Last Updated: 2024-11-22
Owner: Engineering Team

## Table of Contents

1. [Overview](#overview)
2. [Architecture Quick Reference](#architecture-quick-reference)
3. [Common Operations](#common-operations)
4. [Troubleshooting](#troubleshooting)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Emergency Procedures](#emergency-procedures)

## Overview

The Program Template System enables multi-beneficiary program scaling by introducing a 4-layer architecture:

- **Templates**: Reusable program definitions with config schemas
- **Programs**: Global instances from templates for specific beneficiary groups
- **Campaigns**: Company-specific program deployments
- **Enrollments**: User participation records with program context

### Key Features

- **Configuration Inheritance**: Template → Program → Campaign (deep merge)
- **Backward Compatibility**: Dual-write pattern (programType + programId)
- **Version Management**: Integer versioning with opt-in migration
- **Multi-Beneficiary**: Same template for different demographic groups

## Architecture Quick Reference

```
┌─────────────────┐
│  Template       │  (Reusable definition)
│  - Category     │
│  - Config Schema│
└────────┬────────┘
         │ instantiate
         ↓
┌─────────────────┐
│  Program        │  (Global instance)
│  - Beneficiary  │
│  - Config       │
└────────┬────────┘
         │ deploy
         ↓
┌─────────────────┐
│  Campaign       │  (Company-specific)
│  - Company      │
│  - Budget       │
└────────┬────────┘
         │ enroll
         ↓
┌─────────────────┐
│  Enrollment     │  (User participation)
│  - User         │
│  - Status       │
└─────────────────┘
```

### Service Endpoints

| Service | Port | Purpose |
|---------|------|---------|
| program-service | 3021 | Template & program management |
| unified-profile | 3004 | Enrollment management |
| kintell-connector | 3010 | Kintell session integration |
| buddy-service | 3011 | Buddy match integration |

### Database Tables

- `program_templates` - Template definitions
- `programs` - Program instances
- `program_campaigns` - Company campaigns
- `beneficiary_groups` - Demographic targeting
- `program_enrollments` - User enrollments (UPDATED with programId)

## Common Operations

### 1. Creating a New Template

**Use Case**: Add a new program category or create a specialized template

```bash
# Step 1: Define template configuration
curl -X POST http://localhost:3021/templates \
  -H "Content-Type: application/json" \
  -d '{
    "templateKey": "mentorship-tech-workers",
    "name": "Tech Worker Mentorship",
    "category": "mentorship",
    "defaultConfig": {
      "session": {
        "defaultDurationMinutes": 60,
        "recommendedFrequency": "weekly"
      }
    },
    "configSchema": {}
  }'

# Step 2: Publish template
curl -X POST http://localhost:3021/templates/{id}/publish \
  -H "Content-Type: application/json" \
  -d '{"deprecatePrevious": false}'
```

**Validation**:
- Template status changed to 'active'
- Template appears in GET /templates?status=active
- configSchema is valid JSON Schema

### 2. Instantiating a Program

**Use Case**: Create a program for a specific beneficiary group

```bash
# Step 1: Find active template
curl http://localhost:3021/templates?category=mentorship&status=active

# Step 2: Create program instance
curl -X POST http://localhost:3021/programs \
  -H "Content-Type: application/json" \
  -d '{
    "templateId": "template-uuid",
    "name": "Mentorship for Syrian Refugees 2024",
    "beneficiaryGroupId": "syrian-group-uuid",
    "configOverrides": {
      "session": {
        "defaultDurationMinutes": 90
      }
    },
    "tags": ["syrian", "mentorship", "2024"],
    "sdgGoals": [4, 8, 10]
  }'

# Step 3: Activate program
curl -X PUT http://localhost:3021/programs/{id}/status \
  -H "Content-Type: application/json" \
  -d '{"status": "active"}'
```

**Validation**:
- Program has unique programKey
- programType matches template.category
- config is validated against template.configSchema
- beneficiaryGroup exists

### 3. Creating a Company Campaign

**Use Case**: Deploy a program for a specific company

```bash
# Create campaign (currently placeholder)
curl -X POST http://localhost:3021/campaigns \
  -H "Content-Type: application/json" \
  -d '{
    "programId": "program-uuid",
    "companyId": "company-uuid",
    "name": "Acme Corp Mentorship Campaign",
    "targetEnrollment": 100,
    "maxEnrollment": 150,
    "configOverrides": {
      "session": {
        "defaultDurationMinutes": 45
      }
    }
  }'
```

### 4. Checking Program Enrollments

**Use Case**: Verify enrollments are linked to correct program

```sql
-- Check enrollments with program context
SELECT
  pe.id,
  pe.user_id,
  pe.program_type,  -- LEGACY
  pe.program_id,    -- NEW
  pe.campaign_id,
  pe.beneficiary_group_id,
  pe.source_system,
  pe.status,
  p.name AS program_name,
  pt.name AS template_name
FROM program_enrollments pe
LEFT JOIN programs p ON p.id = pe.program_id
LEFT JOIN program_templates pt ON pt.id = p.template_id
WHERE pe.user_id = 'user-uuid';
```

**Expected**:
- `program_type` matches `p.program_type` (dual-write validation)
- `program_id` is not null for recent enrollments
- `source_system` is 'kintell', 'buddy', or 'upskilling'

### 5. Template Versioning

**Use Case**: Evolve a template without breaking existing programs

```bash
# Step 1: Create new version
curl -X POST http://localhost:3021/templates/{id}/versions

# Step 2: Update new version (returns new draft template)
curl -X PUT http://localhost:3021/templates/{new-id} \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Updated Template v2",
    "defaultConfig": {
      "newField": "newValue"
    }
  }'

# Step 3: Publish new version
curl -X POST http://localhost:3021/templates/{new-id}/publish \
  -H "Content-Type: application/json" \
  -d '{"deprecatePrevious": true}'
```

**Result**:
- Old version status: 'deprecated'
- Old version `deprecated_by` points to new version
- Existing programs continue using old version
- New programs use new version

## Troubleshooting

### Issue: Enrollment Creation Fails

**Symptoms**:
- Kintell/Buddy events processed but no enrollment created
- Error: "Program not found for programType X"

**Investigation**:
```sql
-- Check if program exists for programType
SELECT id, name, status
FROM programs
WHERE program_type = 'mentorship'
  AND status = 'active';

-- Check event logs
SELECT *
FROM event_bus_logs
WHERE event_type IN (
  'kintell.session.completed',
  'buddy.match.created'
)
ORDER BY timestamp DESC
LIMIT 10;
```

**Resolution**:
1. Verify active program exists for programType
2. Check program lookup logic in unified-profile subscriber
3. Validate user has `companyId` (required for campaign lookup)

### Issue: Config Validation Fails

**Symptoms**:
- POST /programs returns 400: "Config validation failed"

**Investigation**:
```bash
# Get template schema
curl http://localhost:3021/templates/{template-id}

# Validate config manually
# Check configSchema and compare with configOverrides
```

**Resolution**:
1. Ensure `configOverrides` match template's `configSchema`
2. Check for required fields, data types, and ranges
3. Validate nested structure matches schema

### Issue: Dual-Write Inconsistency

**Symptoms**:
- `programType` doesn't match `programs.program_type`

**Investigation**:
```sql
-- Find mismatches
SELECT
  pe.id,
  pe.program_type AS enrollment_type,
  p.program_type AS program_type
FROM program_enrollments pe
LEFT JOIN programs p ON p.id = pe.program_id
WHERE pe.program_type != p.program_type;
```

**Resolution**:
1. Run data integrity check script
2. Fix mismatches:
```sql
UPDATE program_enrollments pe
SET program_type = p.program_type
FROM programs p
WHERE pe.program_id = p.id
  AND pe.program_type != p.program_type;
```

### Issue: Template Cannot Be Published

**Symptoms**:
- POST /templates/{id}/publish returns 400: "Only draft templates can be published"

**Investigation**:
```sql
SELECT id, template_key, status
FROM program_templates
WHERE id = 'template-uuid';
```

**Resolution**:
- If status is 'active': Already published
- If status is 'deprecated': Create new version instead
- If status is 'archived': Restore from backup or recreate

## Monitoring & Alerts

### Key Metrics

| Metric | Threshold | Action |
|--------|-----------|--------|
| Enrollment creation rate | < 10/min | Investigate event processing |
| Program lookup failures | > 5% | Check campaign/program availability |
| Config validation failures | > 10% | Review template schemas |
| Dual-write mismatches | > 0 | Run integrity check |

### Health Checks

```bash
# program-service health
curl http://localhost:3021/health

# Check active templates
curl http://localhost:3021/templates?status=active | jq 'length'

# Check active programs
SELECT COUNT(*)
FROM programs
WHERE status = 'active';

# Check enrollments with program context
SELECT
  COUNT(*) AS total,
  COUNT(program_id) AS with_program_id,
  COUNT(program_id) * 100.0 / COUNT(*) AS coverage_pct
FROM program_enrollments
WHERE created_at > NOW() - INTERVAL '7 days';
```

### Logging

**Important Log Patterns**:
- `"Found program context for enrollment"` - Successful lookup
- `"No matching program found"` - Fallback to legacy behavior
- `"Config validation failed"` - Invalid config override
- `"Created enrollment with program context"` - Successful dual-write

**Log Queries** (if using structured logging):
```bash
# Grep for program lookup issues
grep "No matching program found" /var/log/unified-profile/*.log

# Check enrollment creation success rate
grep -c "Created enrollment with program context" /var/log/unified-profile/*.log
```

## Emergency Procedures

### Rollback Dual-Write Pattern

**Scenario**: Critical bug in program lookup logic

```sql
-- Emergency: Revert to programType-only enrollments
-- (Stop unified-profile service first)

-- Remove programId foreign key constraint (if needed)
ALTER TABLE program_enrollments
DROP CONSTRAINT IF EXISTS program_enrollments_program_id_fkey;

-- Allow enrollments without programId
-- (This is already the case, as programId is nullable)
```

### Disable Program Template System

**Scenario**: Severe issues, need to fall back to legacy behavior

```bash
# 1. Stop program-service
systemctl stop program-service

# 2. Update unified-profile to skip program lookup
# Set environment variable:
DISABLE_PROGRAM_LOOKUP=true

# 3. Restart unified-profile
systemctl restart unified-profile
```

**Note**: Enrollments will still use programType field (backward compatible)

### Data Integrity Repair

**Scenario**: Discovered data inconsistencies

```typescript
// Run integrity check script
// services/program-service/scripts/integrity-check.ts

import { db } from '@teei/shared-schema';
import { programEnrollments, programs } from '@teei/shared-schema/schema';

async function checkIntegrity() {
  // Check 1: Dual-write consistency
  const mismatches = await db
    .select()
    .from(programEnrollments)
    .leftJoin(programs, eq(programEnrollments.programId, programs.id))
    .where(ne(programEnrollments.programType, programs.programType));

  console.log(`Found ${mismatches.length} dual-write mismatches`);

  // Check 2: Orphaned enrollments
  const orphaned = await db
    .select()
    .from(programEnrollments)
    .leftJoin(programs, eq(programEnrollments.programId, programs.id))
    .where(isNull(programs.id))
    .where(isNotNull(programEnrollments.programId));

  console.log(`Found ${orphaned.length} orphaned enrollments`);
}
```

## Contact & Escalation

| Issue Type | Contact | SLA |
|------------|---------|-----|
| Service Down | #eng-oncall | Immediate |
| Data Inconsistency | #eng-platform | 1 hour |
| Config Issues | #eng-backend | 4 hours |
| Feature Questions | #product | 1 business day |

## Change Log

| Date | Author | Change |
|------|--------|--------|
| 2024-11-22 | Agent 29 | Initial runbook creation |

## References

- [Program Template System Design](/docs/PROGRAM_TEMPLATE_SYSTEM_DESIGN.md)
- [Agent Orchestration Plan](/docs/SWARM_3_AGENT_ORCHESTRATION.md)
- [OpenAPI Spec](/services/program-service/openapi.yaml)
- [Migration Script](/services/program-service/migrations/001_backfill_programs.ts)
