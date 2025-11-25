# Template Versioning Strategy
## Version Management, Deprecation, and Migration

**Date**: 2025-11-22
**Agent**: template-versioning-strategist (Agent 6)
**Status**: ✅ Complete

---

## 1. Versioning Model

### 1.1 Version Numbering

**Scheme**: Simple Integer Versioning
```
v1, v2, v3, v4, ...
```

**Not Using Semantic Versioning** because:
- Templates are not code libraries
- Breaking vs. non-breaking is context-dependent
- Simpler for non-technical users

### 1.2 Version Storage

```typescript
interface ProgramTemplate {
  id: UUID;
  templateKey: string;      // 'mentorship_standard_v1'
  version: number;           // 1, 2, 3, ...
  deprecatedBy?: UUID;       // Points to newer version
  status: 'draft' | 'active' | 'deprecated' | 'archived';
}
```

**Example**:
```
mentorship_standard_v1 (status: deprecated, deprecatedBy: v2_uuid)
  ↓
mentorship_standard_v2 (status: active)
  ↓
mentorship_standard_v3 (status: draft)
```

---

## 2. Lifecycle States

### 2.1 State Machine

```
draft → active → deprecated → archived
          ↓           ↓
      (forked)    (replaced)
```

### 2.2 State Definitions

#### Draft
- **Purpose**: Template being authored/tested
- **Allowed Actions**:
  - ✅ Edit config schema
  - ✅ Update default config
  - ✅ Delete
  - ❌ Instantiate programs
- **Visibility**: Admin/author only

#### Active
- **Purpose**: Production-ready, available for use
- **Allowed Actions**:
  - ✅ Instantiate programs
  - ✅ View/search
  - ✅ Fork (create new version)
  - ❌ Edit (must create new version)
- **Visibility**: Public or tenant-restricted

#### Deprecated
- **Purpose**: Superseded by newer version, but existing programs continue
- **Allowed Actions**:
  - ✅ View (read-only)
  - ❌ Instantiate new programs
  - ❌ Edit
- **Visibility**: Public (with deprecation warning)
- **Programs**: Existing programs continue unchanged

#### Archived
- **Purpose**: Soft-deleted, historical record
- **Allowed Actions**:
  - ✅ View (admin only)
  - ❌ All other actions
- **Visibility**: Admin only
- **Programs**: Existing programs frozen (cannot create new enrollments)

---

## 3. Version Creation

### 3.1 Creating a New Version

**Trigger**: Admin wants to update an active template

**Process**:
1. Clone existing template
2. Increment version number
3. Update `templateKey` with new version
4. Set status to 'draft'
5. Make changes
6. Publish when ready (status → 'active')

**Code Example**:
```typescript
async function createNewVersion(templateId: UUID): Promise<ProgramTemplate> {
  const currentTemplate = await db.query.programTemplates.findFirst({
    where: eq(programTemplates.id, templateId)
  });

  const newVersion = await db.insert(programTemplates).values({
    templateKey: `${currentTemplate.category}_${currentTemplate.name.toLowerCase()}_v${currentTemplate.version + 1}`,
    name: currentTemplate.name,
    category: currentTemplate.category,
    version: currentTemplate.version + 1,
    status: 'draft',
    configSchema: currentTemplate.configSchema, // Clone
    defaultConfig: currentTemplate.defaultConfig, // Clone
    // ... other fields
  });

  return newVersion;
}
```

### 3.2 Publishing a New Version

**Trigger**: Admin ready to release draft version

**Process**:
1. Validate config schema (Zod compilation)
2. Test instantiation with sample config
3. Set status to 'active'
4. Optionally deprecate previous version

**Code Example**:
```typescript
async function publishVersion(templateId: UUID, deprecatePrevious: boolean = false) {
  const template = await db.query.programTemplates.findFirst({
    where: eq(programTemplates.id, templateId)
  });

  if (template.status !== 'draft') {
    throw new Error('Only draft templates can be published');
  }

  // Validate schema compiles
  zodFromJson(template.configSchema);

  // Update status
  await db.update(programTemplates)
    .set({ status: 'active' })
    .where(eq(programTemplates.id, templateId));

  // Deprecate previous version if requested
  if (deprecatePrevious) {
    const previousVersion = await db.query.programTemplates.findFirst({
      where: and(
        eq(programTemplates.category, template.category),
        eq(programTemplates.version, template.version - 1),
        eq(programTemplates.status, 'active')
      )
    });

    if (previousVersion) {
      await deprecateTemplate(previousVersion.id, templateId);
    }
  }
}
```

---

## 4. Deprecation Process

### 4.1 When to Deprecate

**Scenarios**:
- New version fixes critical issues
- Schema has breaking changes
- Better approach discovered
- Platform evolution requires update

### 4.2 Deprecation Workflow

**Process**:
1. Publish new version (v2)
2. Mark old version (v1) as deprecated
3. Set `deprecatedBy` pointer to v2
4. Notify program owners of deprecation
5. Provide migration guide

**Code Example**:
```typescript
async function deprecateTemplate(oldTemplateId: UUID, newTemplateId: UUID) {
  // Update old template
  await db.update(programTemplates)
    .set({
      status: 'deprecated',
      deprecatedBy: newTemplateId
    })
    .where(eq(programTemplates.id, oldTemplateId));

  // Notify affected program owners
  const affectedPrograms = await db.query.programs.findMany({
    where: eq(programs.templateId, oldTemplateId)
  });

  for (const program of affectedPrograms) {
    await notifyProgramOwner(program.ownerId, {
      type: 'template_deprecated',
      oldTemplateId,
      newTemplateId,
      programId: program.id,
      migrationGuideUrl: `/docs/migrations/${oldTemplateId}-to-${newTemplateId}`
    });
  }
}
```

### 4.3 Impact on Existing Programs

**Important**: Deprecation does NOT affect existing programs

- ✅ Programs continue with deprecated template
- ✅ Enrollments continue normally
- ✅ Config remains unchanged
- ✅ SROI/VIS calculations unchanged
- ⚠️ Warning shown in admin UI
- ⚠️ Cannot create NEW programs from deprecated template

---

## 5. Migration Strategy

### 5.1 Opt-In Migration

**Philosophy**: Programs migrate when owners choose to, not automatically

**Process**:
1. Deprecated template shows "Upgrade Available" banner
2. Program owner reviews migration guide
3. Owner initiates migration (manual action)
4. System validates new config against new schema
5. Preview changes before committing
6. Migrate and update program

### 5.2 Migration Wizard

**UI Flow**:
```
Step 1: Review Changes
  - Show schema differences
  - Highlight breaking changes
  - Show impact on existing config

Step 2: Resolve Conflicts
  - Highlight config fields that no longer exist
  - Suggest mappings to new fields
  - Allow manual overrides

Step 3: Preview
  - Show old config vs new config (diff view)
  - Show effective config after migration
  - Validate against new schema

Step 4: Confirm & Migrate
  - Final confirmation
  - Update program.templateId
  - Update program.config
  - Log migration in audit trail
```

### 5.3 Automated Migration Helper

```typescript
async function migrateProgram(programId: UUID, newTemplateId: UUID): Promise<MigrationResult> {
  const program = await db.query.programs.findFirst({
    where: eq(programs.id, programId)
  });

  const oldTemplate = await db.query.programTemplates.findFirst({
    where: eq(programTemplates.id, program.templateId)
  });

  const newTemplate = await db.query.programTemplates.findFirst({
    where: eq(programTemplates.id, newTemplateId)
  });

  // Validate templates are compatible
  if (oldTemplate.category !== newTemplate.category) {
    throw new Error('Cannot migrate to template of different category');
  }

  // Attempt to map old config to new schema
  const OldSchema = zodFromJson(oldTemplate.configSchema);
  const NewSchema = zodFromJson(newTemplate.configSchema);

  const oldConfig = program.config;
  const newDefaults = newTemplate.defaultConfig;

  // Smart merge: keep compatible fields, use new defaults for new fields
  const migratedConfig = smartMerge(oldConfig, newDefaults, NewSchema);

  // Validate migrated config
  try {
    NewSchema.parse(migratedConfig);
  } catch (validationError) {
    return {
      success: false,
      errors: validationError.errors,
      requiresManualIntervention: true
    };
  }

  // Preview mode: don't commit yet
  return {
    success: true,
    oldConfig,
    newConfig: migratedConfig,
    diff: computeDiff(oldConfig, migratedConfig),
    requiresManualIntervention: false
  };
}

async function commitMigration(programId: UUID, migratedConfig: object, newTemplateId: UUID) {
  await db.update(programs)
    .set({
      templateId: newTemplateId,
      config: migratedConfig,
      updatedAt: new Date()
    })
    .where(eq(programs.id, programId));

  // Log migration
  await db.insert(migrationAuditLog).values({
    programId,
    oldTemplateId: program.templateId,
    newTemplateId,
    oldConfig: program.config,
    newConfig: migratedConfig,
    migratedAt: new Date(),
    migratedBy: currentUser.id
  });
}
```

---

## 6. Breaking Changes

### 6.1 What Constitutes a Breaking Change?

**Breaking**:
- ❌ Remove required field
- ❌ Change field type (string → number)
- ❌ Remove enum value that programs use
- ❌ Change default behavior significantly

**Non-Breaking**:
- ✅ Add new optional field
- ✅ Add new enum value
- ✅ Change field description
- ✅ Relax validation (widen range)

### 6.2 Handling Breaking Changes

**Strategy**: Create New Version + Migration Guide

1. Increment version number
2. Document breaking changes
3. Provide migration script or manual steps
4. Test migration on sample programs
5. Publish new version
6. Deprecate old version
7. Notify program owners

**Migration Guide Template**:
```markdown
# Migration Guide: Mentorship v1 → v2

## Breaking Changes

### 1. Session Duration Units Changed
**Old**: `defaultDurationMinutes` (number)
**New**: `defaultDuration` (object with `value` and `unit`)

**Migration**:
```typescript
// Old config
{ session: { defaultDurationMinutes: 60 } }

// New config
{ session: { defaultDuration: { value: 60, unit: 'minutes' } } }
```

**Automated**: Yes (migration script available)

### 2. Removed Field: `requireCodeOfConduct`
**Reason**: Now global platform requirement
**Impact**: All programs implicitly require code of conduct
**Action**: Remove from config (no data loss)

## New Features in v2

### 1. Video Session Support
New field: `session.allowVideoRecording` (default: false)

### 2. Mentor Capacity Management
New field: `matching.maxMenteesPerMentor` (default: 3)
```

---

## 7. Rollback Capabilities

### 7.1 When Rollback is Needed

**Scenarios**:
- Migration introduces bugs
- New version has performance issues
- Config validation too strict
- Unforeseen compatibility issues

### 7.2 Rollback Process

**For Individual Programs**:
```typescript
async function rollbackMigration(programId: UUID) {
  const migrationLog = await db.query.migrationAuditLog.findFirst({
    where: eq(migrationAuditLog.programId, programId),
    orderBy: desc(migrationAuditLog.migratedAt),
    limit: 1
  });

  if (!migrationLog) {
    throw new Error('No migration found to rollback');
  }

  await db.update(programs)
    .set({
      templateId: migrationLog.oldTemplateId,
      config: migrationLog.oldConfig,
      updatedAt: new Date()
    })
    .where(eq(programs.id, programId));

  // Log rollback
  await db.insert(migrationAuditLog).values({
    programId,
    oldTemplateId: migrationLog.newTemplateId,
    newTemplateId: migrationLog.oldTemplateId,
    oldConfig: migrationLog.newConfig,
    newConfig: migrationLog.oldConfig,
    migratedAt: new Date(),
    migratedBy: currentUser.id,
    rollback: true
  });
}
```

**For Templates** (if new version is fundamentally broken):
```typescript
async function rollbackTemplateRelease(templateId: UUID) {
  const template = await db.query.programTemplates.findFirst({
    where: eq(programTemplates.id, templateId)
  });

  if (template.status !== 'active') {
    throw new Error('Only active templates can be rolled back');
  }

  // Mark new version as archived
  await db.update(programTemplates)
    .set({ status: 'archived' })
    .where(eq(programTemplates.id, templateId));

  // Reactivate previous version
  const previousVersion = await db.query.programTemplates.findFirst({
    where: eq(programTemplates.deprecatedBy, templateId)
  });

  if (previousVersion) {
    await db.update(programTemplates)
      .set({
        status: 'active',
        deprecatedBy: null
      })
      .where(eq(programTemplates.id, previousVersion.id));
  }
}
```

---

## 8. Version Comparison

### 8.1 Comparison Utility

```typescript
interface VersionComparison {
  addedFields: string[];
  removedFields: string[];
  modifiedFields: Array<{
    field: string;
    oldType: string;
    newType: string;
  }>;
  breakingChanges: string[];
}

function compareTemplateVersions(
  oldTemplate: ProgramTemplate,
  newTemplate: ProgramTemplate
): VersionComparison {
  const oldSchema = zodFromJson(oldTemplate.configSchema);
  const newSchema = zodFromJson(newTemplate.configSchema);

  const oldFields = extractSchemaFields(oldSchema);
  const newFields = extractSchemaFields(newSchema);

  const added = newFields.filter(f => !oldFields.includes(f));
  const removed = oldFields.filter(f => !newFields.includes(f));
  const modified = detectModifiedFields(oldSchema, newSchema);

  const breaking = [
    ...removed.map(f => `Removed field: ${f}`),
    ...modified
      .filter(m => isBreakingChange(m))
      .map(m => `Modified field: ${m.field} (${m.oldType} → ${m.newType})`)
  ];

  return { addedFields: added, removedFields: removed, modifiedFields: modified, breakingChanges: breaking };
}
```

### 8.2 UI Display

**Template Version Comparison View**:
```
┌─────────────────────────────────────────────────────────┐
│ Comparing: Mentorship v1 → Mentorship v2                │
├─────────────────────────────────────────────────────────┤
│ ✅ Added Fields (3):                                     │
│   • session.allowVideoRecording                         │
│   • matching.maxMenteesPerMentor                        │
│   • communication.enableVideoIntroduction               │
│                                                          │
│ ❌ Removed Fields (1):                                   │
│   • safety.requireCodeOfConduct (now global)            │
│                                                          │
│ ⚠️ Modified Fields (2):                                  │
│   • session.defaultDurationMinutes → session.defaultDuration│
│     (breaking: structure changed)                       │
│   • progression.milestones (non-breaking: defaults changed)│
│                                                          │
│ 🚨 Breaking Changes: 2                                   │
├─────────────────────────────────────────────────────────┤
│ [View Migration Guide] [Preview Config Changes]         │
└─────────────────────────────────────────────────────────┘
```

---

## 9. Governance & Policies

### 9.1 Who Can Create Versions?

**Platform Templates**:
- Only platform admins
- Requires PR review
- Must include migration guide

**Custom Templates** (Company-Specific):
- Company admins
- Self-service
- Platform reviews breaking changes

### 9.2 Deprecation Policies

**Mandatory Deprecation**:
- Security vulnerabilities
- GDPR compliance issues
- Critical bugs

**Recommended Deprecation Timeline**:
1. **T+0**: Publish new version
2. **T+30 days**: Deprecate old version
3. **T+90 days**: Notify programs to migrate
4. **T+180 days**: Archive old version (programs frozen)

**Grace Period**: 180 days before archival

### 9.3 Version Retention

**Policy**:
- Active: Indefinite
- Deprecated: 180 days after deprecation
- Archived: Indefinite (historical record)

**Storage**:
- All versions stored permanently
- Archived versions read-only
- Audit log required for deletion

---

## 10. Testing Strategy

### 10.1 Version Compatibility Tests

```typescript
describe('Template Version Compatibility', () => {
  it('should migrate v1 config to v2 without data loss', () => {
    const v1Config = { /* ... */ };
    const v2Config = migrateConfig(v1Config, mentorshipV1, mentorshipV2);

    expect(v2Config).toMatchSnapshot();
    expect(validateConfig(v2Config, mentorshipV2.configSchema)).toBe(true);
  });

  it('should detect breaking changes between versions', () => {
    const comparison = compareTemplateVersions(mentorshipV1, mentorshipV2);
    expect(comparison.breakingChanges.length).toBeGreaterThan(0);
  });

  it('should allow rollback to previous version', async () => {
    const program = await createProgram(mentorshipV1);
    await migrateProgram(program.id, mentorshipV2.id);
    await rollbackMigration(program.id);

    const rolled = await getProgram(program.id);
    expect(rolled.templateId).toBe(mentorshipV1.id);
    expect(rolled.config).toEqual(program.config);
  });
});
```

### 10.2 Golden Tests

**Purpose**: Ensure config migration is deterministic

```typescript
it('should produce identical config for golden test case', () => {
  const goldenInput = loadFixture('mentorship-v1-golden.json');
  const expectedOutput = loadFixture('mentorship-v2-golden.json');

  const migrated = migrateConfig(goldenInput, mentorshipV1, mentorshipV2);

  expect(migrated).toEqual(expectedOutput);
});
```

---

## 11. Audit Trail

### 11.1 Migration Audit Log

**Table Schema**:
```sql
CREATE TABLE migration_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id UUID NOT NULL REFERENCES programs(id),
  old_template_id UUID NOT NULL REFERENCES program_templates(id),
  new_template_id UUID NOT NULL REFERENCES program_templates(id),
  old_config JSONB NOT NULL,
  new_config JSONB NOT NULL,
  migrated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  migrated_by UUID REFERENCES users(id),
  rollback BOOLEAN DEFAULT FALSE,
  notes TEXT
);

CREATE INDEX idx_migration_audit_program ON migration_audit_log(program_id);
CREATE INDEX idx_migration_audit_template ON migration_audit_log(old_template_id, new_template_id);
```

### 11.2 Template Version History

**Query**:
```sql
SELECT
  version,
  status,
  created_at,
  deprecated_by,
  (SELECT COUNT(*) FROM programs WHERE template_id = pt.id) as program_count
FROM program_templates pt
WHERE category = 'mentorship'
ORDER BY version DESC;
```

**Example Output**:
```
version | status     | created_at | deprecated_by | program_count
--------|------------|------------|---------------|---------------
3       | draft      | 2025-11-20 | NULL          | 0
2       | active     | 2025-06-15 | NULL          | 45
1       | deprecated | 2024-12-01 | uuid-of-v2    | 123
```

---

## 12. Summary

### Key Principles
1. **Opt-In Migration** - Programs choose when to upgrade
2. **Deprecation ≠ Breaking** - Existing programs unaffected
3. **Audit Everything** - Full migration history
4. **Rollback Ready** - Can revert if needed
5. **Test-Driven** - Golden tests for migrations

### Version Lifecycle
```
draft → active → deprecated → archived
```

### Migration Flow
```
1. New version published
2. Old version deprecated
3. Program owners notified
4. Migration guide provided
5. Owners migrate when ready
6. Rollback available if issues
```

### Governance
- Platform templates: Admin-only
- Custom templates: Self-service
- Breaking changes: Requires migration guide
- Deprecation: 180-day grace period

---

**Versioning Strategy Complete** ✅
**Batch 0 Complete** ✅
**Next**: Batch 1 - Schema Implementation (Agents 7-12)
