# Program Instance Modeling
## Kintell CSV Ingestion - Program Context Resolution

**Date**: 2025-11-22
**Agent**: program-instance-modeler
**Status**: ✅ Complete

---

## Overview

**Problem**: CSV exports from Kintell don't explicitly specify which program instance they belong to (e.g., "Mentors for Ukraine Q4 2024" vs "Mentors for Ukraine Q1 2025").

**Solution**: Auto-detect or explicitly specify program instance during import, then link all sessions to that instance.

---

## Program Instance Concept

### **What is a Program Instance?**

A **program instance** is a specific run of a program with:
- **Program Type**: `mentors_ukraine`, `language_ukraine`, `buddy`, `upskilling`
- **Time Boundaries**: Start date, end date (or ongoing)
- **Ownership**: Company-specific or TEEI-run
- **Unique Identity**: Slug (e.g., `mentors-ukraine-2024-q4`)

### **Why Program Instances Matter**

1. **SROI Calculations**: Calculate SROI per cohort (Q4 2024 vs Q1 2025)
2. **Reporting**: Generate program-specific impact reports
3. **User Experience**: "Show me my Mentors Q4 2024 sessions"
4. **Analytics**: Compare outcomes between program iterations

---

## Auto-Detection Strategies

### **Strategy 1: Filename-Based Detection**

**Pattern Matching**:

```typescript
interface FilenamePattern {
  regex: RegExp;
  programType: string;
  extractMetadata: (match: RegExpMatchArray) => { year?: number; quarter?: string; month?: string };
}

const FILENAME_PATTERNS: FilenamePattern[] = [
  // Mentors for Ukraine
  {
    regex: /mentors[-_]for[-_]ukraine[-_](\d{4})[-_](q[1-4]|Q[1-4])/i,
    programType: 'mentors_ukraine',
    extractMetadata: (match) => ({ year: parseInt(match[1], 10), quarter: match[2].toUpperCase() }),
  },
  {
    regex: /mentors[-_]ukraine[-_](\d{4})[-_](\d{2})/i,
    programType: 'mentors_ukraine',
    extractMetadata: (match) => ({ year: parseInt(match[1], 10), month: match[2] }),
  },

  // Language for Ukraine
  {
    regex: /language[-_]for[-_]ukraine[-_](\d{4})[-_](q[1-4]|Q[1-4])/i,
    programType: 'language_ukraine',
    extractMetadata: (match) => ({ year: parseInt(match[1], 10), quarter: match[2].toUpperCase() }),
  },
  {
    regex: /language[-_]ukraine[-_](\d{4})[-_](\d{2})/i,
    programType: 'language_ukraine',
    extractMetadata: (match) => ({ year: parseInt(match[1], 10), month: match[2] }),
  },

  // Generic patterns
  {
    regex: /kintell[-_](mentor|mentorship)[-_](\d{4})/i,
    programType: 'mentors_ukraine',
    extractMetadata: (match) => ({ year: parseInt(match[2], 10) }),
  },
  {
    regex: /kintell[-_](language|lang)[-_](\d{4})/i,
    programType: 'language_ukraine',
    extractMetadata: (match) => ({ year: parseInt(match[2], 10) }),
  },
];
```

**Example Filenames**:
- `mentors-for-ukraine-2024-Q4.csv` → `mentors_ukraine`, 2024, Q4
- `language_for_ukraine_2024_11.csv` → `language_ukraine`, 2024, month 11
- `kintell-mentorship-2024.csv` → `mentors_ukraine`, 2024

**Limitations**:
- ❌ Fails if filename doesn't follow convention
- ❌ Cannot distinguish between companies (assumes TEEI-run)

---

### **Strategy 2: CSV Metadata Column Detection**

**Enhanced CSV Format** (optional column):

```csv
session_id,program_ref,participant_email,volunteer_email,...
MS-001,mentors-ukraine-2024-q4,anna@example.com,john@acme.com,...
MS-002,mentors-ukraine-2024-q4,bob@example.com,jane@acme.com,...
```

**Parsing**:

```typescript
function extractProgramRefFromRow(row: Record<string, string>): string | null {
  return row.program_ref || row.program_instance || row.cohort_ref || null;
}
```

**Benefits**:
- ✅ Explicit program reference (no guessing)
- ✅ Works even with generic filenames

**Limitations**:
- ❌ Requires Kintell to add this column (not currently present)

---

### **Strategy 3: CLI Flag (Manual Override)**

**Usage**:

```bash
pnpm --filter @teei/kintell-connector import:csv \
  --file mentors-for-ukraine-2024-Q4.csv \
  --program-instance mentors-ukraine-2024-q4
```

**Benefits**:
- ✅ Always works (user explicitly specifies)
- ✅ Can override auto-detection if wrong

**Limitations**:
- ❌ Requires user to know program instance slug
- ❌ Manual effort

---

### **Strategy 4: Date Range Heuristics**

**Logic**: Infer program instance from session dates.

```typescript
async function inferProgramInstanceFromDates(
  programType: string,
  sessions: Array<{ scheduledAt: Date }>
): Promise<ProgramInstance | null> {
  // Find min/max session dates
  const dates = sessions.map(s => s.scheduledAt);
  const minDate = new Date(Math.min(...dates.map(d => d.getTime())));
  const maxDate = new Date(Math.max(...dates.map(d => d.getTime())));

  // Find program instance that overlaps with session date range
  const [instance] = await db
    .select()
    .from(programInstances)
    .where(
      and(
        eq(programInstances.programType, programType),
        lte(programInstances.startDate, maxDate.toISOString().split('T')[0]),
        or(
          gte(programInstances.endDate, minDate.toISOString().split('T')[0]),
          isNull(programInstances.endDate) // Ongoing program
        )
      )
    )
    .orderBy(desc(programInstances.startDate)) // Prefer most recent
    .limit(1);

  return instance || null;
}
```

**Example**:
- Sessions: 2024-10-15 to 2024-12-20
- Matches: Mentors Q4 2024 (start: 2024-10-01, end: 2024-12-31)

**Benefits**:
- ✅ Works without filename or CLI flags
- ✅ Robust for ongoing programs

**Limitations**:
- ❌ Requires program instances pre-created in DB
- ❌ May match wrong instance if overlapping programs

---

## Recommended Detection Flow

### **Decision Tree**

```
1. Check CLI flag (--program-instance)
   ├─ If provided → use explicitly specified instance
   └─ If not provided → proceed to step 2

2. Check CSV for `program_ref` column
   ├─ If present → lookup by slug
   └─ If not present → proceed to step 3

3. Try filename pattern matching
   ├─ If match found → infer programType + metadata
   └─ If no match → proceed to step 4

4. Fall back to date range heuristics
   ├─ If match found → use inferred instance
   └─ If no match → ERROR: Cannot determine program instance

5. If still unresolved → prompt user for CLI flag
```

**Implementation**:

```typescript
async function resolveProgramInstance(
  fileName: string,
  sessions: Array<{ scheduledAt: Date }>,
  cliOverride?: string
): Promise<ProgramInstance> {
  // Step 1: CLI override
  if (cliOverride) {
    const instance = await findProgramInstanceBySlug(cliOverride);
    if (!instance) {
      throw new Error(`Program instance '${cliOverride}' not found`);
    }
    return instance;
  }

  // Step 2: Filename pattern
  const detected = detectProgramTypeFromFilename(fileName);
  if (detected) {
    const instance = await findOrCreateProgramInstance({
      programType: detected.programType,
      year: detected.year,
      quarter: detected.quarter,
    });
    return instance;
  }

  // Step 3: Date range heuristics (requires programType from user)
  throw new Error(
    `Cannot auto-detect program instance from filename '${fileName}'. ` +
    `Please specify --program-type and --program-instance CLI flags.`
  );
}
```

---

## Program Instance Creation Strategy

### **Find or Create Pattern**

```typescript
interface CreateProgramInstanceInput {
  programType: 'mentors_ukraine' | 'language_ukraine';
  year: number;
  quarter?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
  month?: string; // '01'-'12'
  companyId?: string; // NULL for TEEI-run
}

async function findOrCreateProgramInstance(
  input: CreateProgramInstanceInput
): Promise<ProgramInstance> {
  // Generate slug
  const slug = generateProgramSlug(input);

  // Try to find existing
  let [instance] = await db
    .select()
    .from(programInstances)
    .where(eq(programInstances.programSlug, slug))
    .limit(1);

  if (instance) {
    logger.info({ programInstanceId: instance.id, slug }, 'Reusing existing program instance');
    return instance;
  }

  // Create new instance
  const { startDate, endDate } = calculateDateBoundaries(input);

  [instance] = await db
    .insert(programInstances)
    .values({
      programType: input.programType,
      programName: generateProgramName(input),
      programSlug: slug,
      companyId: input.companyId || null,
      startDate,
      endDate,
      externalSystem: 'kintell',
      status: 'active',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    .returning();

  logger.info({ programInstanceId: instance.id, slug }, 'Created new program instance');

  return instance;
}
```

---

### **Slug Generation**

```typescript
function generateProgramSlug(input: CreateProgramInstanceInput): string {
  const { programType, year, quarter, month } = input;

  let slug = programType.replace('_', '-'); // 'mentors_ukraine' → 'mentors-ukraine'
  slug += `-${year}`;

  if (quarter) {
    slug += `-${quarter.toLowerCase()}`; // 'Q4' → 'q4'
  } else if (month) {
    slug += `-${month}`; // '11'
  }

  return slug;
}

// Examples:
// mentors_ukraine, 2024, Q4 → mentors-ukraine-2024-q4
// language_ukraine, 2024, 11 → language-ukraine-2024-11
```

---

### **Program Name Generation**

```typescript
function generateProgramName(input: CreateProgramInstanceInput): string {
  const typeNames = {
    mentors_ukraine: 'Mentors for Ukraine',
    language_ukraine: 'Language for Ukraine',
  };

  let name = typeNames[input.programType] || input.programType;

  if (input.quarter) {
    name += ` - ${input.quarter} ${input.year}`;
  } else if (input.month) {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    name += ` - ${monthNames[parseInt(input.month, 10) - 1]} ${input.year}`;
  } else {
    name += ` - ${input.year}`;
  }

  return name;
}

// Examples:
// mentors_ukraine, 2024, Q4 → "Mentors for Ukraine - Q4 2024"
// language_ukraine, 2024, 11 → "Language for Ukraine - Nov 2024"
```

---

### **Date Boundary Calculation**

```typescript
function calculateDateBoundaries(input: CreateProgramInstanceInput): {
  startDate: string; // YYYY-MM-DD
  endDate: string | null;
} {
  const { year, quarter, month } = input;

  if (quarter) {
    const quarters = {
      Q1: { start: `${year}-01-01`, end: `${year}-03-31` },
      Q2: { start: `${year}-04-01`, end: `${year}-06-30` },
      Q3: { start: `${year}-07-01`, end: `${year}-09-30` },
      Q4: { start: `${year}-10-01`, end: `${year}-12-31` },
    };
    return { startDate: quarters[quarter].start, endDate: quarters[quarter].end };
  }

  if (month) {
    const startDate = `${year}-${month}-01`;
    const endDate = new Date(year, parseInt(month, 10), 0).toISOString().split('T')[0]; // Last day of month
    return { startDate, endDate };
  }

  // Full year
  return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
}
```

---

## Linking Sessions to Program Instances

### **During Import**

```typescript
async function importSession(
  row: Record<string, string>,
  programInstance: ProgramInstance,
  batch: IngestionBatch
): Promise<void> {
  const mapped = mapCSVRowToSession(row);

  // Upsert users
  const participant = await upsertUser({ email: mapped.participantEmail, role: 'participant', ... });
  const volunteer = await upsertUser({ email: mapped.volunteerEmail, role: 'volunteer', ... });

  // Insert session with program instance and batch linkage
  await db.insert(kintellSessions).values({
    externalSessionId: mapped.externalSessionId,
    sessionType: mapped.sessionType,
    participantId: participant.id,
    volunteerId: volunteer.id,
    programInstanceId: programInstance.id, // ← Link to program instance
    batchId: batch.id,                     // ← Link to batch
    scheduledAt: mapped.scheduledAt,
    completedAt: mapped.completedAt,
    durationMinutes: mapped.durationMinutes,
    rating: mapped.rating,
    feedbackText: mapped.feedbackText,
    languageLevel: mapped.languageLevel,
    topics: mapped.topics,
    metadata: mapped.metadata,
    createdAt: new Date(),
  });
}
```

---

## User Enrollment in Program Instances

### **Auto-Enroll Users**

When importing sessions, automatically enroll volunteers and participants in the program instance:

```typescript
async function enrollUserInProgram(
  userId: string,
  programInstanceId: string,
  programType: string
): Promise<void> {
  // Check if enrollment already exists
  const [existing] = await db
    .select()
    .from(programEnrollments)
    .where(
      and(
        eq(programEnrollments.userId, userId),
        eq(programEnrollments.programInstanceId, programInstanceId)
      )
    )
    .limit(1);

  if (existing) {
    logger.debug({ userId, programInstanceId }, 'User already enrolled, skipping');
    return;
  }

  // Create enrollment
  await db.insert(programEnrollments).values({
    userId,
    programType,
    programInstanceId,
    enrolledAt: new Date(),
    status: 'active',
    createdAt: new Date(),
  });

  logger.info({ userId, programInstanceId, programType }, 'User enrolled in program instance');
}
```

**Call during import**:

```typescript
await enrollUserInProgram(participant.id, programInstance.id, programInstance.programType);
await enrollUserInProgram(volunteer.id, programInstance.id, programInstance.programType);
```

---

## CLI Usage Examples

### **Example 1: Auto-detect from filename**

```bash
pnpm --filter @teei/kintell-connector import:csv \
  --file mentors-for-ukraine-2024-Q4.csv

# Auto-detects:
# - programType: mentors_ukraine
# - year: 2024
# - quarter: Q4
# - Creates/finds program instance: mentors-ukraine-2024-q4
```

### **Example 2: Explicit program instance**

```bash
pnpm --filter @teei/kintell-connector import:csv \
  --file kintell-export-nov-2024.csv \
  --program-instance mentors-ukraine-2024-q4

# Uses explicitly specified program instance
```

### **Example 3: Manual program type + period**

```bash
pnpm --filter @teei/kintell-connector import:csv \
  --file data.csv \
  --program-type mentors_ukraine \
  --year 2024 \
  --quarter Q4

# Creates/finds program instance from metadata
```

---

## HTTP API Usage

### **POST /v1/import/kintell-sessions**

**With multipart form data**:

```bash
curl -X POST http://localhost:3002/v1/import/kintell-sessions \
  -F "file=@mentors-for-ukraine-2024-Q4.csv" \
  -F "programInstance=mentors-ukraine-2024-q4"
```

**Response**:

```json
{
  "batchId": "uuid-123",
  "programInstanceId": "uuid-456",
  "processed": 500,
  "created": 480,
  "skipped": 15,
  "errors": 5,
  "errorFilePath": "/tmp/errors-uuid-123.csv"
}
```

---

## Testing Strategy

### **Unit Tests**

1. **Test slug generation**:
   - ✅ `mentors_ukraine, 2024, Q4` → `mentors-ukraine-2024-q4`
   - ✅ `language_ukraine, 2024, 11` → `language-ukraine-2024-11`

2. **Test program name generation**:
   - ✅ `mentors_ukraine, 2024, Q4` → `"Mentors for Ukraine - Q4 2024"`

3. **Test date boundary calculation**:
   - ✅ `2024, Q4` → `{ start: '2024-10-01', end: '2024-12-31' }`
   - ✅ `2024, 11` → `{ start: '2024-11-01', end: '2024-11-30' }`

4. **Test filename pattern detection**:
   - ✅ `mentors-for-ukraine-2024-Q4.csv` → `{ programType: 'mentors_ukraine', year: 2024, quarter: 'Q4' }`
   - ✅ `random-file.csv` → `null`

### **Integration Tests**

1. **Test find or create program instance**:
   - Import CSV → verify program instance created
   - Re-import CSV → verify same instance reused

2. **Test user enrollment**:
   - Import CSV → verify users enrolled in program instance
   - Re-import CSV → verify no duplicate enrollments

3. **Test session linkage**:
   - Import CSV → verify sessions linked to program instance
   - Query sessions by program instance → verify correct results

---

## Conclusion

✅ **Auto-detection strategies** defined (filename, CLI, date range)
✅ **Find or create pattern** for program instances
✅ **Slug + name generation** automated
✅ **Date boundary calculation** handles quarters and months
✅ **User enrollment** auto-created during import
✅ **Session linkage** to program instances implemented
✅ **CLI and API usage** documented with examples
✅ **Testing strategy** defined (unit + integration)

**Next Agent**: data-lineage-designer (design batch tracking and lineage)
