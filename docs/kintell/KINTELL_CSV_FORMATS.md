# Kintell CSV Export Formats
## Mentors for Ukraine & Language for Ukraine

**Date**: 2025-11-22
**Agent**: kintell-data-reverse-engineer
**Status**: ✅ Complete

---

## Overview

This document specifies the CSV export formats for Kintell-based programs:
1. **Mentors for Ukraine** (Mentorship sessions)
2. **Language for Ukraine** (Language practice sessions)

Both formats are based on existing Zod schemas in `services/kintell-connector/src/validation/csv-schema.ts`.

---

## Common Format Specifications

### **File Encoding**
- UTF-8 (required)
- BOM optional but supported

### **Delimiter**
- Comma (`,`) - default
- Semicolon (`;`) - supported via parser configuration

### **Line Endings**
- LF (`\n`) or CRLF (`\r\n`) - both supported

### **Header Row**
- First row MUST contain column names (case-insensitive)
- Column order does not matter (mapped by name)

### **Empty Lines**
- Skipped automatically by parser

### **Quoting**
- Text fields with commas MUST be quoted: `"Hello, world"`
- Double quotes escaped as: `"He said ""Hello"""`

---

## Format 1: Mentors for Ukraine (Mentorship Sessions)

### **Schema Version**: 1.0
**Effective Date**: 2025-01-01
**Current Status**: Active

### **CSV Columns**

| Column Name | Type | Required | Format | Example | Notes |
|-------------|------|----------|--------|---------|-------|
| `session_id` | string | ✅ Yes | 1-255 chars | `MS-2024-001` | Kintell's unique session ID |
| `participant_email` | email | ✅ Yes | Valid email | `anna@example.com` | Participant (mentee) email |
| `mentor_email` | email | ✅ Yes | Valid email | `john@corp.com` | Mentor (volunteer) email |
| `scheduled_at` | datetime | ✅ Yes | ISO 8601 or YYYY-MM-DD | `2025-11-13T10:00:00Z` | Session scheduled time |
| `completed_at` | datetime | ⚪ Optional | ISO 8601 or YYYY-MM-DD | `2025-11-13T11:00:00Z` | Actual completion time |
| `duration_minutes` | integer | ⚪ Optional | 1-480 | `60` | Session duration (max 8 hours) |
| `rating` | decimal | ⚪ Optional | 0.0-1.0 or 1-5 | `0.95` or `5` | Session rating (normalized to 0-1) |
| `feedback_text` | text | ⚪ Optional | 0-5000 chars | `"Great mentoring session on CV writing"` | Qualitative feedback |
| `focus_area` | string | ⚪ Optional | 0-255 chars | `career` | Primary focus: career, education, integration |
| `goals_discussed` | string | ⚪ Optional | 0-1000 chars | `CV,interview,LinkedIn` | Comma-separated list |

### **Validation Rules**

1. **Email Validation**: Both emails must be valid format (`[user]@[domain].[tld]`)
2. **Date Validation**:
   - `scheduled_at` cannot be more than 10 years in the past
   - `completed_at` >= `scheduled_at` (if both provided)
   - Future dates allowed (for scheduled sessions)
3. **Duration Validation**:
   - Must be positive integer
   - Max 480 minutes (8 hours) per session
4. **Rating Normalization**:
   - If 1-5 scale: normalize to 0-1 via `(rating - 1) / 4`
   - If 0-1 scale: use as-is
   - Values outside range: reject row

### **Sample CSV**

```csv
session_id,participant_email,mentor_email,scheduled_at,completed_at,duration_minutes,rating,feedback_text,focus_area,goals_discussed
MS-2024-001,anna.k@example.com,john.doe@acme.com,2024-11-01T10:00:00Z,2024-11-01T11:00:00Z,60,5,"Excellent session on career planning",career,"CV,interview,networking"
MS-2024-002,olga.m@example.com,jane.smith@acme.com,2024-11-08T14:00:00Z,2024-11-08T14:45:00Z,45,4,"Discussed education opportunities",education,"university,scholarships"
MS-2024-003,ivan.p@example.com,bob.jones@acme.com,2024-11-15T16:00:00Z,,60,,"Session scheduled, not yet completed",integration,
```

---

## Format 2: Language for Ukraine (Language Practice Sessions)

### **Schema Version**: 1.1
**Effective Date**: 2025-06-01
**Current Status**: Active
**Previous Version**: 1.0 (2025-01-01) - without `metadata` field

### **CSV Columns**

| Column Name | Type | Required | Format | Example | Notes |
|-------------|------|----------|--------|---------|-------|
| `session_id` | string | ✅ Yes | 1-255 chars | `LS-2024-001` | Kintell's unique session ID |
| `participant_email` | email | ✅ Yes | Valid email | `anna@example.com` | Learner email |
| `volunteer_email` | email | ✅ Yes | Valid email | `tutor@corp.com` | Tutor (volunteer) email |
| `scheduled_at` | datetime | ✅ Yes | ISO 8601 or YYYY-MM-DD | `2025-11-13T10:00:00Z` | Session scheduled time |
| `completed_at` | datetime | ⚪ Optional | ISO 8601 or YYYY-MM-DD | `2025-11-13T11:00:00Z` | Actual completion time |
| `duration_minutes` | integer | ⚪ Optional | 1-480 | `60` | Session duration |
| `rating` | decimal | ⚪ Optional | 0.0-1.0 or 1-5 | `0.95` or `5` | Session rating |
| `feedback_text` | text | ⚪ Optional | 0-5000 chars | `"Great progress on grammar"` | Qualitative feedback |
| `language_level` | CEFR | ⚪ Optional | A1/A2/B1/B2/C1/C2 | `B2` | Current CEFR level |
| `topics` | string | ⚪ Optional | 0-1000 chars | `grammar,conversation` | Comma-separated topics |
| `metadata` | JSON string | ⚪ Optional | 0-2000 chars | `{"focus":"pronunciation"}` | Additional context (v1.1+) |

### **Validation Rules**

1. **Email Validation**: Same as Mentors format
2. **Date Validation**: Same as Mentors format
3. **Duration Validation**: Same as Mentors format
4. **Rating Normalization**: Same as Mentors format
5. **Language Level Validation**:
   - Must be one of: `A1`, `A2`, `B1`, `B2`, `C1`, `C2` (case-insensitive)
   - Normalized to uppercase during import
6. **Metadata Validation**:
   - Must be valid JSON string (if provided)
   - Max 2000 characters
   - Empty strings treated as NULL

### **Sample CSV (v1.1)**

```csv
session_id,participant_email,volunteer_email,scheduled_at,completed_at,duration_minutes,rating,feedback_text,language_level,topics,metadata
LS-2024-001,anna.k@example.com,tutor1@acme.com,2024-11-01T10:00:00Z,2024-11-01T11:00:00Z,60,5,"Excellent grammar practice",B2,"grammar,writing","{""focus"":""past tense""}"
LS-2024-002,olga.m@example.com,tutor2@acme.com,2024-11-08T14:00:00Z,2024-11-08T15:00:00Z,60,4,"Good conversation session",B1,"conversation,vocabulary",
LS-2024-003,ivan.p@example.com,tutor3@acme.com,2024-11-15T16:00:00Z,,60,,"Upcoming session",A2,pronunciation,
```

### **Schema Version History**

#### **v1.0 (2025-01-01)**
- Initial schema
- 10 columns (without `metadata`)

#### **v1.1 (2025-06-01) - CURRENT**
- Added `metadata` field for extensibility
- Backward compatible (v1.0 files still parse correctly)

---

## Common Validation Errors

### **E001: Invalid Email Format**
```
Row 5: Invalid email format 'john.doe@' in field 'mentor_email'
```
**Fix**: Ensure email has format `user@domain.tld`

### **E002: Missing Required Field**
```
Row 12: Missing required field 'session_id'
```
**Fix**: Ensure all required columns are populated

### **E003: Date Format Error**
```
Row 7: Invalid date format '11/13/2024' in field 'scheduled_at'
```
**Fix**: Use ISO 8601 (`2024-11-13T10:00:00Z`) or `YYYY-MM-DD` format

### **E004: Duration Out of Range**
```
Row 9: Duration 500 exceeds maximum 480 minutes
```
**Fix**: Sessions longer than 8 hours are not supported

### **E005: Invalid CEFR Level**
```
Row 15: Invalid language level 'intermediate' (must be A1-C2)
```
**Fix**: Use standard CEFR levels: A1, A2, B1, B2, C1, C2

### **E006: Rating Out of Range**
```
Row 20: Rating 6 exceeds maximum (expected 0-1 or 1-5)
```
**Fix**: Use 0.0-1.0 scale or 1-5 scale

### **E007: Completed Before Scheduled**
```
Row 25: completed_at (2024-11-01T09:00:00Z) is before scheduled_at (2024-11-01T10:00:00Z)
```
**Fix**: Ensure completed_at >= scheduled_at

---

## Field Differences Between Programs

| Field | Mentors | Language | Notes |
|-------|---------|----------|-------|
| `email` columns | `participant_email`, `mentor_email` | `participant_email`, `volunteer_email` | Semantic difference only |
| `focus_area` | ✅ Yes | ❌ No | Mentorship-specific |
| `goals_discussed` | ✅ Yes | ❌ No | Mentorship-specific |
| `language_level` | ❌ No | ✅ Yes | Language-specific (CEFR) |
| `topics` | ✅ Yes (goals) | ✅ Yes (language topics) | Different semantics |
| `metadata` | ❌ No (v1.0) | ✅ Yes (v1.1+) | Language-specific extensibility |

---

## Auto-Detection Strategy

### **By Filename Convention**
```
mentors-for-ukraine-2024-Q4.csv    → program_type: mentors_ukraine
language-for-ukraine-2024-11.csv   → program_type: language_ukraine
kintell-mentorship-export.csv      → program_type: mentors_ukraine (fuzzy match)
kintell-language-export.csv        → program_type: language_ukraine (fuzzy match)
```

### **By Column Presence**
If filename detection fails, inspect headers:
- Has `language_level` column → Language program
- Has `focus_area` column → Mentors program
- Has `metadata` column → Language program (v1.1+)
- Ambiguous → Prompt user for `--program-type` flag

### **By Session ID Prefix**
```
MS-* or MENTOR-* → Mentors program
LS-* or LANG-*   → Language program
```

---

## Mapping to Internal Domain Model

### **Common Fields** (Both Programs)
```typescript
{
  externalSessionId: row.session_id,
  participantEmail: row.participant_email.toLowerCase().trim(),
  volunteerEmail: row.volunteer_email.toLowerCase().trim() || row.mentor_email.toLowerCase().trim(),
  scheduledAt: new Date(row.scheduled_at),
  completedAt: row.completed_at ? new Date(row.completed_at) : null,
  durationMinutes: parseInt(row.duration_minutes, 10),
  rating: normalizeRating(row.rating), // (rating - 1) / 4 if 1-5 scale
  feedbackText: row.feedback_text?.trim(),
}
```

### **Mentors-Specific Mapping**
```typescript
{
  sessionType: 'mentorship',
  metadata: {
    focus_area: row.focus_area,
    goals_discussed: row.goals_discussed?.split(',').map(g => g.trim())
  },
  topics: row.goals_discussed?.split(',').map(g => g.trim())
}
```

### **Language-Specific Mapping**
```typescript
{
  sessionType: 'language',
  languageLevel: row.language_level?.toUpperCase(), // A1-C2
  topics: row.topics?.split(',').map(t => t.trim()),
  metadata: row.metadata ? JSON.parse(row.metadata) : null
}
```

---

## Export Frequency & Volume Estimates

### **Mentors for Ukraine**
- **Export Frequency**: Monthly (estimated)
- **Volume**: ~200-500 sessions/month (estimated)
- **File Size**: ~50-150 KB per export

### **Language for Ukraine**
- **Export Frequency**: Monthly (estimated)
- **Volume**: ~500-1500 sessions/month (estimated)
- **File Size**: ~100-300 KB per export

### **Combined Annual Volume**
- **Total Sessions**: ~8,000-24,000/year
- **Storage**: ~2-5 MB/year (raw CSV)

---

## Future Enhancements

### **Version 2.0 Considerations**
1. **Add `participant_kintell_id` and `mentor_kintell_id`** for robust identity linking
2. **Add `program_instance_ref`** to explicitly link to program instance
3. **Add `company_ref`** for multi-tenant exports
4. **Add `batch_id`** for Kintell-side batch tracking
5. **Add `language_pair`** (e.g., "uk-en") for Language program
6. **Add `session_mode`** (virtual, in-person, hybrid)

### **API-Based Ingestion (Future)**
Replace CSV with webhook payloads:
```json
{
  "event_type": "session.completed",
  "session_id": "MS-2024-001",
  "participant": { "email": "anna@example.com", "kintell_id": "K-12345" },
  "mentor": { "email": "john@acme.com", "kintell_id": "K-67890" },
  "scheduled_at": "2024-11-01T10:00:00Z",
  "completed_at": "2024-11-01T11:00:00Z",
  "duration_minutes": 60,
  "rating": 5,
  "feedback_text": "Great session",
  "program_ref": "mentors-ukraine-2024"
}
```

---

## References

- **Zod Schemas**: `/services/kintell-connector/src/validation/csv-schema.ts`
- **Session Mapper**: `/services/kintell-connector/src/mappers/session-mapper.ts`
- **Database Schema**: `/packages/shared-schema/src/schema/kintell.ts`

---

## Conclusion

✅ **Two distinct CSV formats** documented with clear validation rules
✅ **Version history** tracked for backward compatibility
✅ **Auto-detection strategies** defined for program type identification
✅ **Mapping specifications** provided for ingestion pipeline
✅ **Error codes** documented for troubleshooting

**Next Agent**: repo-cartographer (map monorepo structure and integration points)
