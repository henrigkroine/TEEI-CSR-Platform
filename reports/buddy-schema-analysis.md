# Buddy Program Schema Analysis

**Agent**: Agent 1 (buddy-schema-analyst)
**Generated**: 2025-11-22
**Source**: Reverse-engineered from `buddy-connector` event contracts
**Status**: ✅ Complete

---

## Executive Summary

The Buddy Program is a peer support system that connects **participants** (beneficiaries seeking integration support) with **buddies** (volunteers providing mentorship, social connection, and skill sharing). The program captures rich interaction data across 8 core entity types and 8 webhook event types.

**Key Characteristics**:
- **1:1 Matching**: Participants paired with buddies based on language, interests, location
- **Multi-dimensional Engagement**: Events, skill exchanges, check-ins, feedback
- **Gamification**: Milestones, badges, points system
- **Impact Tracking**: SDG mapping, valuation points, satisfaction ratings

---

## Data Entities

### 1. User

**Description**: Participants and buddies in the Buddy Program

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | UUID | ✅ | Unique user identifier |
| `email` | String | ✅ | Email address (PII) |
| `first_name` | String | ✅ | First name (PII) |
| `last_name` | String | ✅ | Last name (PII) |
| `role` | Enum | ✅ | `participant` or `buddy` |
| `joined_at` | DateTime | ✅ | Program enrollment date |
| `language_preference` | String | ❌ | Preferred language (for matching) |
| `interests` | Array<String> | ❌ | Hobbies, interests (for matching) |
| `location` | String | ❌ | City/region (for matching) |

**CSR Mapping**: → `users` table (role: `volunteer` for buddies, `beneficiary` for participants)

**Volume Estimate**: ~500-1000 users/month (typical buddy program)

---

### 2. Buddy Match

**Description**: 1:1 pairing between participant and buddy

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `match_id` | UUID | ✅ | Unique match identifier |
| `participant_id` | UUID | ✅ | FK to User (participant) |
| `buddy_id` | UUID | ✅ | FK to User (buddy) |
| `matched_at` | DateTime | ✅ | When match was created |
| `status` | Enum | ✅ | `active`, `inactive`, `ended` |
| `ended_at` | DateTime | ❌ | When match ended (if applicable) |
| `matching_criteria` | Object | ❌ | `{ language, interests, location }` |
| `duration_days` | Integer | ❌ | Match duration (calculated on end) |
| `end_reason` | Enum | ❌ | `completed`, `participant_request`, `buddy_request`, `mutual_agreement`, `inactivity`, `violation`, `program_ended`, `other` |
| `sessions_completed` | Integer | ❌ | Number of sessions during match |
| `events_attended` | Integer | ❌ | Events attended together |

**CSR Mapping**: → `buddy_matches` table (direct mapping)

**Volume Estimate**: ~300-500 matches/month

**Lifecycle Events**:
1. **Created**: `buddy.match.created`
2. **Ended**: `buddy.match.ended`

---

### 3. Buddy Event (Social Activity)

**Description**: Informal hangouts, activities, workshops organized by buddy pairs or the community

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_id` | UUID | ✅ | Unique event identifier |
| `match_id` | UUID | ✅ | FK to Buddy Match |
| `event_type` | String | ✅ | `hangout`, `activity`, `workshop`, etc. |
| `event_date` | DateTime | ✅ | When event occurred |
| `description` | Text | ❌ | Event description |
| `location` | String | ❌ | Event location |
| `attendees` | Array<UUID> | ❌ | User IDs of attendees |

**CSR Mapping**: → `buddy_events` table (direct mapping)

**Volume Estimate**: ~1000-2000 events/month

**Lifecycle Events**:
1. **Logged**: `buddy.event.logged` (event created)

---

### 4. Formal Event Attendance

**Description**: Attendance at structured buddy program events (distinct from informal hangouts)

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `event_id` | UUID | ✅ | FK to Buddy Event |
| `user_id` | UUID | ✅ | FK to User (attendee) |
| `match_id` | UUID | ❌ | FK to Buddy Match (if applicable) |
| `event_title` | String | ✅ | Event title |
| `event_type` | Enum | ✅ | `cultural`, `educational`, `professional`, `social`, `support`, `recreational`, `language`, `other` |
| `event_format` | Enum | ✅ | `in-person`, `online`, `hybrid` |
| `attended_at` | DateTime | ✅ | Attendance timestamp |
| `location` | String | ❌ | Event location |
| `duration_minutes` | Integer | ❌ | Event duration |
| `attendee_count` | Integer | ❌ | Total attendees |
| `organizer` | String | ❌ | Event organizer name |
| `categories` | Array<String> | ❌ | Event tags/categories |
| `sdg_goals` | Array<Integer> | ❌ | UN SDG goals (1-17) |

**CSR Mapping**: → `buddy_events` (metadata) + VIS hours calculation

**Volume Estimate**: ~500-800 formal event attendances/month

**Lifecycle Events**:
1. **Attended**: `buddy.event.attended`

---

### 5. Skill Exchange Session

**Description**: Formal skill sharing sessions (language, tech, professional skills)

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `session_id` | UUID | ✅ | Unique session identifier |
| `skill_id` | Integer | ✅ | FK to Skills table |
| `skill_name` | String | ✅ | Name of skill (e.g., "JavaScript", "CV Writing") |
| `skill_category` | String | ❌ | `language`, `tech`, `professional`, etc. |
| `teacher_id` | UUID | ✅ | FK to User (teacher) |
| `learner_id` | UUID | ✅ | FK to User (learner) |
| `match_id` | UUID | ❌ | FK to Buddy Match (if applicable) |
| `completed_at` | DateTime | ✅ | Session completion timestamp |
| `scheduled_at` | DateTime | ❌ | When session was scheduled |
| `duration_minutes` | Integer | ❌ | Session duration |
| `format` | Enum | ❌ | `in-person`, `online`, `hybrid` |
| `proficiency_level` | Enum | ❌ | `beginner`, `intermediate`, `advanced` |
| `feedback` | Object | ❌ | See feedback structure below |
| `sdg_goals` | Array<Integer> | ❌ | UN SDG goals (typically 4, 8) |
| `valuation_points` | Integer | ❌ | Points for SROI calculation |

**Feedback Structure**:
```json
{
  "teacher_rating": 0.0-1.0,        // Normalized rating
  "learner_rating": 0.0-1.0,        // Normalized rating
  "teacher_comment": "string",      // PII
  "learner_comment": "string",      // PII
  "learner_progress": "no-progress" | "some-progress" | "good-progress" | "excellent-progress"
}
```

**CSR Mapping**: → `kintell_sessions` table (type: `skill_share`)

**Volume Estimate**: ~300-500 skill sessions/month

**Lifecycle Events**:
1. **Completed**: `buddy.skill_share.completed`

---

### 6. Buddy Check-in

**Description**: Regular wellness and progress check-ins between buddy pairs

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `checkin_id` | UUID | ✅ | Unique check-in identifier |
| `match_id` | UUID | ✅ | FK to Buddy Match |
| `checkin_date` | DateTime | ✅ | Check-in timestamp |
| `mood` | Enum | ❌ | `great`, `good`, `okay`, `struggling`, `difficult` |
| `notes` | Text | ❌ | Check-in notes (PII - Q2Q input) |
| `question_responses` | Object | ❌ | Structured check-in questions |

**CSR Mapping**: → `buddy_checkins` table (direct mapping)

**Volume Estimate**: ~800-1200 check-ins/month

**Q2Q Integration**: `notes` field → Q2Q outcome scoring (confidence, belonging, well-being)

**Lifecycle Events**:
1. **Completed**: `buddy.checkin.completed`

---

### 7. Feedback/Rating

**Description**: Participant and buddy feedback on their match relationship

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `feedback_id` | UUID | ✅ | Unique feedback identifier |
| `match_id` | UUID | ✅ | FK to Buddy Match |
| `from_role` | Enum | ✅ | `participant` or `buddy` |
| `rating` | Decimal | ✅ | Normalized 0.0-1.0 rating |
| `feedback_text` | Text | ❌ | Written feedback (PII - Q2Q input) |
| `submitted_at` | DateTime | ✅ | Submission timestamp |
| `categories` | Object | ❌ | See category ratings below |

**Category Ratings**:
```json
{
  "communication": 0.0-1.0,  // Communication quality
  "helpfulness": 0.0-1.0,    // How helpful the buddy was
  "engagement": 0.0-1.0      // Engagement level
}
```

**CSR Mapping**: → `buddy_feedback` table (direct mapping)

**Volume Estimate**: ~400-600 feedback submissions/month

**Q2Q Integration**: `feedback_text` → Q2Q outcome scoring

**Lifecycle Events**:
1. **Submitted**: `buddy.feedback.submitted`

---

### 8. Milestone/Achievement

**Description**: Gamification milestones reached by users (badges, achievements)

**Fields**:
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `milestone_id` | Integer | ✅ | FK to Milestones definition table |
| `user_id` | UUID | ✅ | FK to User |
| `milestone_title` | String | ✅ | Milestone name (e.g., "First Match") |
| `milestone_category` | Enum | ✅ | `onboarding`, `cultural`, `language`, `community`, `professional`, `skills`, `events`, `buddy-connection`, `impact`, `completion`, `other` |
| `reached_at` | DateTime | ✅ | Achievement timestamp |
| `points` | Integer | ✅ | Points awarded (for gamification) |
| `badge_icon` | String | ❌ | Badge icon identifier |
| `target_role` | Enum | ❌ | `participant`, `buddy`, `all` |
| `progress` | Object | ❌ | See progress structure below |
| `metadata` | Object | ❌ | See metadata structure below |

**Progress Structure**:
```json
{
  "current_step": 1,
  "total_steps": 5,
  "completed_steps": ["step-1", "step-2"]
}
```

**Metadata Structure**:
```json
{
  "is_first_time": true,               // First time reaching this milestone type
  "streak_count": 3,                   // Consecutive milestones in category
  "related_entities": [                // Related matches, events, sessions
    { "type": "match", "id": "uuid" },
    { "type": "event", "id": "uuid" }
  ]
}
```

**CSR Mapping**: → `program_enrollments` (metadata) or new `achievements` table

**Volume Estimate**: ~200-400 milestones/month

**Lifecycle Events**:
1. **Reached**: `buddy.milestone.reached`

---

## Event Types Summary

| Event Type | Description | Frequency | CSR Impact |
|------------|-------------|-----------|------------|
| `buddy.match.created` | New buddy match created | High | Program enrollments, VIS |
| `buddy.match.ended` | Buddy match ended | Medium | Program completion, VIS |
| `buddy.event.logged` | Informal social activity | High | buddy_events, VIS hours |
| `buddy.event.attended` | Formal event attendance | High | VIS hours, engagement |
| `buddy.skill_share.completed` | Skill exchange session | Medium | kintell_sessions, SROI, SDG 4 |
| `buddy.checkin.completed` | Wellness check-in | High | Q2Q input, well-being tracking |
| `buddy.feedback.submitted` | Match feedback/rating | Medium | Q2Q input, quality scoring, VIS |
| `buddy.milestone.reached` | Achievement unlocked | Medium | Gamification, engagement, outcome lift |

---

## PII Fields (GDPR Critical)

**High Sensitivity**:
- `users.email`
- `users.first_name`
- `users.last_name`
- `checkins.notes` (free-text - may contain PII)
- `feedback.feedback_text` (free-text - may contain PII)
- `skill_sessions.feedback.teacher_comment` (free-text - may contain PII)
- `skill_sessions.feedback.learner_comment` (free-text - may contain PII)

**Medium Sensitivity**:
- `users.location` (city/region)
- `users.interests` (behavioral data)
- `events.description` (may reference individuals)

**Recommendations**:
1. ✅ Redact PII from import logs
2. ✅ Hash email for identity matching
3. ✅ Never store raw chat transcripts (summarize only)
4. ✅ Q2Q text → evidence snippets (deidentified)

---

## Data Volume Estimates

**Assumptions**: Medium-sized buddy program (200 active matches)

| Entity | Monthly Volume | Annual Volume |
|--------|---------------|---------------|
| Users | 100-200 new | 1,200-2,400 |
| Matches | 300-500 | 3,600-6,000 |
| Informal Events | 1,000-2,000 | 12,000-24,000 |
| Formal Event Attendance | 500-800 | 6,000-9,600 |
| Skill Sessions | 300-500 | 3,600-6,000 |
| Check-ins | 800-1,200 | 9,600-14,400 |
| Feedback | 400-600 | 4,800-7,200 |
| Milestones | 200-400 | 2,400-4,800 |

**Total Events/Month**: ~3,600-6,200
**Total Events/Year**: ~43,000-75,000

**Storage Estimate**: ~50-100 MB/month (JSON payloads), ~600 MB - 1.2 GB/year

---

## Data Quality Considerations

### Completeness

**Complete Fields** (always present):
- User IDs, timestamps, match IDs, event IDs
- Status enums

**Partial Fields** (often missing):
- Feedback text (~40% completion rate)
- Event descriptions (~60% completion rate)
- Skill session feedback (~50% completion rate)
- Check-in notes (~70% completion rate)

**Implication**: Import pipeline must handle null/undefined gracefully

### Referential Integrity

**Strong References** (validated by Buddy System):
- `match.participant_id` → `users.id`
- `match.buddy_id` → `users.id`
- `event.match_id` → `matches.match_id`
- `feedback.match_id` → `matches.match_id`

**Weak References** (may be orphaned):
- `event.attendees[]` → `users.id` (attendees may have left program)
- `milestone.metadata.related_entities` → various IDs (cleanup needed)

**Implication**: Validate all FK references before insert; flag orphaned records

### Data Drift

**Expected Drift**:
- New `event_type` values added (currently: `hangout`, `activity`, `workshop`; future: `cultural_exchange`, `career_mentoring`, etc.)
- New `milestone_category` values
- New skill categories

**Mitigation**: Use `other` fallback for unknown enums; log warnings for unknown values

---

## Export Format Recommendations

Based on this schema analysis, the **Buddy Export Spec** (Agent 7) should define:

### CSV Export Structure

**Recommended Files** (one per entity):
1. `users.csv` - User profiles
2. `matches.csv` - Buddy matches
3. `events.csv` - Social events
4. `event_attendance.csv` - Formal event attendance
5. `skill_sessions.csv` - Skill exchanges
6. `checkins.csv` - Check-ins
7. `feedback.csv` - Feedback/ratings
8. `milestones.csv` - Achievements

**Alternative**: Single `buddy_export.json` with nested structure

### JSON Export Structure

```json
{
  "export_metadata": {
    "export_id": "uuid",
    "export_date": "2025-11-22T10:00:00Z",
    "program_name": "Buddy Program",
    "date_range": { "start": "2025-01-01", "end": "2025-11-22" },
    "record_counts": { "users": 100, "matches": 50, ... }
  },
  "users": [ ... ],
  "matches": [ ... ],
  "events": [ ... ],
  "event_attendance": [ ... ],
  "skill_sessions": [ ... ],
  "checkins": [ ... ],
  "feedback": [ ... ],
  "milestones": [ ... ]
}
```

---

## Integration Points

### VIS Calculator

**Inputs from Buddy Program**:
- **Weighted Hours**: `event_attendance.duration_minutes`, `skill_sessions.duration_minutes`, `events` (estimated hours)
- **Quality Score**: `feedback.rating`, `feedback.categories.*`, `skill_sessions.feedback.learner_rating`
- **Outcome Lift**: `milestones` (improvement proxy), `checkins.mood` (trend analysis)
- **Placement Impact**: Not directly tracked (requires external employment data)

**Mapping**:
- Buddy events → VIS hours (event support: 0.9x weight)
- Skill sessions → VIS hours (direct mentoring: 1.0x weight)
- Formal events → VIS hours (group facilitation: 1.2x weight if buddy is organizer)

### SROI Calculator

**Inputs from Buddy Program**:
- **Investment**: Volunteer hours × $29.95/hour
- **Social Value**:
  - Integration Score: `milestones.category = "community"` → +0.1 per milestone
  - Language Proficiency: `skill_sessions.skill_category = "language"` → +CEFR level proxy
  - Job Readiness: `skill_sessions.skill_category = "professional"` → +0.1 per session

**Mapping**:
- Skill sessions (language) → Language Proficiency dimension
- Skill sessions (professional) → Job Readiness dimension
- Milestones (community, cultural) → Integration Score dimension

### Q2Q AI

**Text Inputs** (for outcome scoring):
- `checkins.notes`
- `feedback.feedback_text`
- `skill_sessions.feedback.teacher_comment`
- `skill_sessions.feedback.learner_comment`

**Output Dimensions**:
- `confidence`, `belonging`, `well_being`, `job_readiness`, `language_comfort`

**Mapping**:
- Checkin notes → Q2Q (well-being, belonging focus)
- Feedback text → Q2Q (confidence, belonging focus)
- Skill feedback → Q2Q (confidence, job-readiness focus)

---

## Recommended Validations

### Pre-Import Validations

1. **User Email Uniqueness**: Detect duplicate emails → merge profiles
2. **Match Integrity**: Both `participant_id` and `buddy_id` must exist
3. **Event Date Sanity**: `event_date` not in future, not before program start
4. **Rating Bounds**: All ratings 0.0-1.0
5. **Mood Enum**: Only valid values (`great`, `good`, `okay`, `struggling`, `difficult`)

### Post-Import Validations

1. **Orphaned Events**: Events with invalid `match_id` → flag for review
2. **Zero-Duration Matches**: Matches where `matched_at = ended_at` → flag
3. **Missing Feedback**: Matches >90 days with no feedback → engagement issue
4. **Negative Feedback Spike**: >30% feedback with rating <0.5 → investigate

---

## Next Steps

**For Agent 2** (db-introspector):
- Document CSR tables: `users`, `buddy_matches`, `buddy_events`, `buddy_checkins`, `buddy_feedback`, `kintell_sessions`, `program_enrollments`

**For Agent 3** (csr-model-mapper):
- Map Buddy entities → CSR tables (detailed field-level mapping)

**For Agent 7** (buddy-export-spec-writer):
- Define canonical CSV/JSON schemas for each entity type
- Include all fields documented here
- Add export metadata (export_id, date range, record counts)

---

**Document Status**: ✅ Complete
**Next Agent**: Agent 2 (db-introspector)
