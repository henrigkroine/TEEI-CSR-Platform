# Buddy Program Export Specification

**Agent**: Agent 7 (buddy-export-spec-writer)
**Generated**: 2025-11-22
**Dependencies**: Agent 1 (buddy-schema-analysis.md), Agent 3 (buddy-csr-mapping.md)
**Status**: ✅ Complete
**Version**: 1.0.0

---

## Executive Summary

This document defines the **canonical export formats** for Buddy Program data, supporting CSV, JSON, and XLSX formats.

**Supported Formats**:
- ✅ **CSV** - One file per entity type (recommended for large exports)
- ✅ **JSON** - Single file with nested structure (recommended for API exports)
- ✅ **XLSX** - Multiple sheets in one workbook (recommended for Excel users)

**Export Entities**:
1. Users
2. Buddy Matches
3. Events (Informal)
4. Event Attendance (Formal)
5. Skill Sessions
6. Check-ins
7. Feedback
8. Milestones

---

## Export Metadata

All exports must include metadata header/section:

### CSV Metadata (comment header)
```csv
# Buddy Program Export
# Export ID: 550e8400-e29b-41d4-a716-446655440000
# Export Date: 2025-11-22T10:30:00Z
# Date Range: 2024-01-01 to 2025-11-22
# Program Name: Buddy Program
# Total Records: 1500
# Version: 1.0.0
```

### JSON Metadata
```json
{
  "export_metadata": {
    "export_id": "550e8400-e29b-41d4-a716-446655440000",
    "export_date": "2025-11-22T10:30:00Z",
    "date_range": {
      "start": "2024-01-01",
      "end": "2025-11-22"
    },
    "program_name": "Buddy Program",
    "version": "1.0.0",
    "record_counts": {
      "users": 200,
      "matches": 150,
      "events": 500,
      "event_attendance": 300,
      "skill_sessions": 100,
      "checkins": 400,
      "feedback": 200,
      "milestones": 50
    }
  },
  "users": [...],
  "matches": [...],
  ...
}
```

---

## 1. Users Export

### CSV Schema (`users.csv`)

**Filename**: `buddy_users_YYYY-MM-DD.csv`

**Columns**:
```csv
id,email,first_name,last_name,role,joined_at,language_preference,interests,location
```

**Field Specifications**:
| Column | Type | Required | Format | Example | Notes |
|--------|------|----------|--------|---------|-------|
| `id` | UUID | ✅ | UUID v4 | `550e8400-e29b-41d4-a716-446655440000` | Buddy user ID |
| `email` | String | ✅ | Email | `alice@example.com` | Lowercase, unique |
| `first_name` | String | ✅ | Text | `Alice` | Max 100 chars |
| `last_name` | String | ✅ | Text | `Smith` | Max 100 chars |
| `role` | Enum | ✅ | `participant` \| `buddy` | `participant` | User role |
| `joined_at` | Timestamp | ✅ | ISO 8601 | `2024-01-15T10:00:00Z` | Program enrollment |
| `language_preference` | String | ❌ | Text | `English` | Optional |
| `interests` | Array | ❌ | JSON array string | `["hiking","cooking"]` | Optional, JSON format |
| `location` | String | ❌ | Text | `Oslo, Norway` | Optional |

**Example Row**:
```csv
550e8400-e29b-41d4-a716-446655440000,alice@example.com,Alice,Smith,participant,2024-01-15T10:00:00Z,English,"[""hiking"",""cooking""]","Oslo, Norway"
```

### JSON Schema
```typescript
interface BuddyUserExport {
  id: string;                      // UUID
  email: string;
  first_name: string;
  last_name: string;
  role: 'participant' | 'buddy';
  joined_at: string;               // ISO 8601
  language_preference?: string;
  interests?: string[];            // Array of strings
  location?: string;
}
```

**Example**:
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "email": "alice@example.com",
  "first_name": "Alice",
  "last_name": "Smith",
  "role": "participant",
  "joined_at": "2024-01-15T10:00:00Z",
  "language_preference": "English",
  "interests": ["hiking", "cooking"],
  "location": "Oslo, Norway"
}
```

---

## 2. Buddy Matches Export

### CSV Schema (`matches.csv`)

**Filename**: `buddy_matches_YYYY-MM-DD.csv`

**Columns**:
```csv
match_id,participant_id,buddy_id,matched_at,status,ended_at,end_reason,duration_days,sessions_completed,events_attended
```

**Field Specifications**:
| Column | Type | Required | Format | Example | Notes |
|--------|------|----------|--------|---------|-------|
| `match_id` | UUID | ✅ | UUID v4 | `550e8400-...` | Unique match ID |
| `participant_id` | UUID | ✅ | UUID v4 | `550e8400-...` | FK to users |
| `buddy_id` | UUID | ✅ | UUID v4 | `550e8400-...` | FK to users |
| `matched_at` | Timestamp | ✅ | ISO 8601 | `2024-01-20T14:00:00Z` | Match creation |
| `status` | Enum | ✅ | `active` \| `inactive` \| `ended` | `active` | Current status |
| `ended_at` | Timestamp | ❌ | ISO 8601 | `2024-06-20T14:00:00Z` | When ended (if applicable) |
| `end_reason` | Enum | ❌ | See below | `completed` | Why match ended |
| `duration_days` | Integer | ❌ | Positive int | `150` | Match duration (calculated) |
| `sessions_completed` | Integer | ❌ | Non-negative | `20` | Session count |
| `events_attended` | Integer | ❌ | Non-negative | `10` | Event count |

**End Reason Values**: `completed`, `participant_request`, `buddy_request`, `mutual_agreement`, `inactivity`, `violation`, `program_ended`, `other`

**Example Row**:
```csv
550e8400-e29b-41d4-a716-446655440000,660e8400-...,770e8400-...,2024-01-20T14:00:00Z,ended,2024-06-20T14:00:00Z,completed,152,20,10
```

### JSON Schema
```typescript
interface BuddyMatchExport {
  match_id: string;
  participant_id: string;
  buddy_id: string;
  matched_at: string;
  status: 'active' | 'inactive' | 'ended';
  ended_at?: string;
  end_reason?: 'completed' | 'participant_request' | 'buddy_request' | 'mutual_agreement' | 'inactivity' | 'violation' | 'program_ended' | 'other';
  duration_days?: number;
  sessions_completed?: number;
  events_attended?: number;
}
```

---

## 3. Events (Informal) Export

### CSV Schema (`events.csv`)

**Filename**: `buddy_events_YYYY-MM-DD.csv`

**Columns**:
```csv
event_id,match_id,event_type,event_date,description,location,attendees
```

**Field Specifications**:
| Column | Type | Required | Format | Example | Notes |
|--------|------|----------|--------|---------|-------|
| `event_id` | UUID | ✅ | UUID v4 | `550e8400-...` | Unique event ID |
| `match_id` | UUID | ✅ | UUID v4 | `550e8400-...` | FK to matches |
| `event_type` | String | ✅ | Text | `hangout` | Event type |
| `event_date` | Timestamp | ✅ | ISO 8601 | `2024-02-10T15:00:00Z` | When event occurred |
| `description` | Text | ❌ | Text | `Coffee meetup` | Optional description |
| `location` | String | ❌ | Text | `Cafe Downtown` | Optional location |
| `attendees` | Array | ❌ | JSON array string | `["user-1","user-2"]` | User IDs |

**Example Row**:
```csv
550e8400-e29b-41d4-a716-446655440000,660e8400-...,hangout,2024-02-10T15:00:00Z,"Coffee meetup","Cafe Downtown","[""660e8400-..."",""770e8400-...""]"
```

---

## 4. Event Attendance (Formal) Export

### CSV Schema (`event_attendance.csv`)

**Filename**: `buddy_event_attendance_YYYY-MM-DD.csv`

**Columns**:
```csv
event_id,user_id,match_id,event_title,event_type,event_format,attended_at,location,duration_minutes,attendee_count,organizer,categories,sdg_goals
```

**Field Specifications**:
| Column | Type | Required | Format | Example | Notes |
|--------|------|----------|--------|---------|-------|
| `event_id` | UUID | ✅ | UUID v4 | `550e8400-...` | Event ID |
| `user_id` | UUID | ✅ | UUID v4 | `660e8400-...` | Attendee user ID |
| `match_id` | UUID | ❌ | UUID v4 | `770e8400-...` | Associated match (optional) |
| `event_title` | String | ✅ | Text | `Workshop: CV Writing` | Event name |
| `event_type` | Enum | ✅ | See below | `educational` | Event category |
| `event_format` | Enum | ✅ | `in-person` \| `online` \| `hybrid` | `in-person` | Format |
| `attended_at` | Timestamp | ✅ | ISO 8601 | `2024-03-15T18:00:00Z` | Attendance time |
| `location` | String | ❌ | Text | `Community Center` | Optional |
| `duration_minutes` | Integer | ❌ | Positive | `120` | Event length |
| `attendee_count` | Integer | ❌ | Positive | `25` | Total attendees |
| `organizer` | String | ❌ | Text | `Jane Organizer` | Organizer name |
| `categories` | Array | ❌ | JSON array | `["career","skills"]` | Tags |
| `sdg_goals` | Array | ❌ | JSON array int | `[4,8]` | UN SDG goals (1-17) |

**Event Type Values**: `cultural`, `educational`, `professional`, `social`, `support`, `recreational`, `language`, `other`

**Example Row**:
```csv
550e8400-...,660e8400-...,770e8400-...,"Workshop: CV Writing",educational,in-person,2024-03-15T18:00:00Z,"Community Center",120,25,"Jane Organizer","[""career"",""skills""]","[4,8]"
```

---

## 5. Skill Sessions Export

### CSV Schema (`skill_sessions.csv`)

**Filename**: `buddy_skill_sessions_YYYY-MM-DD.csv`

**Columns**:
```csv
session_id,skill_id,skill_name,skill_category,teacher_id,learner_id,match_id,completed_at,scheduled_at,duration_minutes,format,proficiency_level,teacher_rating,learner_rating,teacher_comment,learner_comment,learner_progress,sdg_goals,valuation_points
```

**Field Specifications** (key fields):
| Column | Type | Required | Format | Example |
|--------|------|----------|--------|---------|
| `session_id` | UUID | ✅ | UUID v4 | `550e8400-...` |
| `skill_id` | Integer | ✅ | Positive int | `42` |
| `skill_name` | String | ✅ | Text | `JavaScript Basics` |
| `skill_category` | String | ❌ | Text | `tech` |
| `teacher_id` | UUID | ✅ | UUID v4 | `660e8400-...` |
| `learner_id` | UUID | ✅ | UUID v4 | `770e8400-...` |
| `completed_at` | Timestamp | ✅ | ISO 8601 | `2024-04-10T16:00:00Z` |
| `duration_minutes` | Integer | ❌ | Positive | `60` |
| `format` | Enum | ❌ | `in-person` \| `online` \| `hybrid` | `online` |
| `proficiency_level` | Enum | ❌ | `beginner` \| `intermediate` \| `advanced` | `beginner` |
| `teacher_rating` | Decimal | ❌ | 0.00-1.00 | `0.85` |
| `learner_rating` | Decimal | ❌ | 0.00-1.00 | `0.90` |
| `teacher_comment` | Text | ❌ | Text | `Great session!` |
| `learner_comment` | Text | ❌ | Text | `Learned a lot` |
| `learner_progress` | Enum | ❌ | See below | `good-progress` |
| `sdg_goals` | Array | ❌ | JSON array int | `[4,8]` |
| `valuation_points` | Integer | ❌ | Positive | `50` |

**Learner Progress Values**: `no-progress`, `some-progress`, `good-progress`, `excellent-progress`

---

## 6. Check-ins Export

### CSV Schema (`checkins.csv`)

**Filename**: `buddy_checkins_YYYY-MM-DD.csv`

**Columns**:
```csv
checkin_id,match_id,checkin_date,mood,notes,question_responses
```

**Field Specifications**:
| Column | Type | Required | Format | Example |
|--------|------|----------|--------|---------|
| `checkin_id` | UUID | ✅ | UUID v4 | `550e8400-...` |
| `match_id` | UUID | ✅ | UUID v4 | `660e8400-...` |
| `checkin_date` | Timestamp | ✅ | ISO 8601 | `2024-05-01T12:00:00Z` |
| `mood` | Enum | ❌ | See below | `good` |
| `notes` | Text | ❌ | Text | `Feeling positive this week` |
| `question_responses` | Object | ❌ | JSON object | `{"q1":"yes","q2":"no"}` |

**Mood Values**: `great`, `good`, `okay`, `struggling`, `difficult`

**Example Row**:
```csv
550e8400-...,660e8400-...,2024-05-01T12:00:00Z,good,"Feeling positive this week","{""q1"":""yes"",""q2"":""no""}"
```

---

## 7. Feedback Export

### CSV Schema (`feedback.csv`)

**Filename**: `buddy_feedback_YYYY-MM-DD.csv`

**Columns**:
```csv
feedback_id,match_id,from_role,rating,feedback_text,submitted_at,communication,helpfulness,engagement
```

**Field Specifications**:
| Column | Type | Required | Format | Example |
|--------|------|----------|--------|---------|
| `feedback_id` | UUID | ✅ | UUID v4 | `550e8400-...` |
| `match_id` | UUID | ✅ | UUID v4 | `660e8400-...` |
| `from_role` | Enum | ✅ | `participant` \| `buddy` | `participant` |
| `rating` | Decimal | ✅ | 0.00-1.00 | `0.85` |
| `feedback_text` | Text | ❌ | Text | `Very helpful buddy` |
| `submitted_at` | Timestamp | ✅ | ISO 8601 | `2024-06-01T10:00:00Z` |
| `communication` | Decimal | ❌ | 0.00-1.00 | `0.90` |
| `helpfulness` | Decimal | ❌ | 0.00-1.00 | `0.88` |
| `engagement` | Decimal | ❌ | 0.00-1.00 | `0.82` |

---

## 8. Milestones Export

### CSV Schema (`milestones.csv`)

**Filename**: `buddy_milestones_YYYY-MM-DD.csv`

**Columns**:
```csv
milestone_id,user_id,milestone_title,milestone_category,reached_at,points,badge_icon,target_role,progress,metadata
```

**Field Specifications**:
| Column | Type | Required | Format | Example |
|--------|------|----------|--------|---------|
| `milestone_id` | Integer | ✅ | Positive int | `42` |
| `user_id` | UUID | ✅ | UUID v4 | `660e8400-...` |
| `milestone_title` | String | ✅ | Text | `First Match` |
| `milestone_category` | Enum | ✅ | See below | `buddy-connection` |
| `reached_at` | Timestamp | ✅ | ISO 8601 | `2024-01-20T14:30:00Z` |
| `points` | Integer | ✅ | Non-negative | `100` |
| `badge_icon` | String | ❌ | Text | `trophy` |
| `target_role` | Enum | ❌ | `participant` \| `buddy` \| `all` | `participant` |
| `progress` | Object | ❌ | JSON object | `{"current":1,"total":5}` |
| `metadata` | Object | ❌ | JSON object | `{"is_first":true}` |

**Milestone Category Values**: `onboarding`, `cultural`, `language`, `community`, `professional`, `skills`, `events`, `buddy-connection`, `impact`, `completion`, `other`

---

## Export File Structure

### Option 1: Multiple CSV Files (Recommended for Large Exports)
```
buddy_export_2025-11-22/
├── metadata.json
├── users.csv
├── matches.csv
├── events.csv
├── event_attendance.csv
├── skill_sessions.csv
├── checkins.csv
├── feedback.csv
└── milestones.csv
```

### Option 2: Single JSON File (Recommended for API)
```
buddy_export_2025-11-22.json
```

### Option 3: XLSX Workbook (Recommended for Excel)
```
buddy_export_2025-11-22.xlsx
├── Sheet: Export Metadata
├── Sheet: Users
├── Sheet: Matches
├── Sheet: Events
├── Sheet: Event Attendance
├── Sheet: Skill Sessions
├── Sheet: Check-ins
├── Sheet: Feedback
└── Sheet: Milestones
```

---

## Validation Rules

### Cross-Entity Referential Integrity

1. **Users**: All `participant_id`, `buddy_id`, `user_id`, `teacher_id`, `learner_id` must exist in `users` export
2. **Matches**: All `match_id` references must exist in `matches` export
3. **Timestamps**: All timestamps must be valid ISO 8601 format
4. **Enums**: All enum values must match specified values (case-sensitive)
5. **UUIDs**: All UUIDs must be valid v4 format
6. **Ratings**: All ratings must be 0.00 ≤ rating ≤ 1.00

### Data Quality Checks

| Check | Rule | Severity |
|-------|------|----------|
| Missing required field | Reject row | Error |
| Invalid UUID format | Reject row | Error |
| Invalid timestamp | Reject row | Error |
| Invalid enum value | Reject row | Error |
| Rating out of range | Reject row | Error |
| Orphaned match_id | Log warning | Warning |
| Orphaned user_id | Reject row | Error |
| Future timestamp | Reject row | Error |

---

## Export Generation Guidelines

### For Buddy Program Administrators

1. **Date Range Selection**: Specify start/end dates for export
2. **Entity Selection**: Choose which entities to export (all recommended)
3. **Format Selection**: CSV for large exports, JSON for API integration
4. **Include Metadata**: Always include export metadata

### Export Frequency Recommendations

- **Full Export**: Monthly (complete historical data)
- **Incremental Export**: Weekly (new/changed records only)
- **On-Demand**: As needed for data migration

---

## Next Steps

**For Agent 8** (buddy-parser-engineer):
- Build CSV/JSON/XLSX parsers using these schemas
- Implement validation using these rules

**For Agent 9** (buddy-validator):
- Create Zod schemas matching these specifications
- Implement cross-entity validation

---

**Document Status**: ✅ Complete
**Next Agent**: Agent 8 (buddy-parser-engineer)
