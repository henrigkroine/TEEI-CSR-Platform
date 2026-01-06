# Buddy Program → CSR Platform Entity Mapping

**Agent**: Agent 3 (csr-model-mapper)
**Generated**: 2025-11-22
**Dependencies**: Agent 1 (buddy-schema-analysis.md), Agent 2 (csr-db-schema.md)
**Status**: ✅ Complete

---

## Executive Summary

This document provides **field-level mapping** from Buddy Program entities to CSR Platform database tables, including transformation rules, data type conversions, and validation requirements.

**Mapping Approach**:
- **Direct Mapping**: Fields map 1:1 with no transformation
- **Transformation**: Fields require conversion (type, format, normalization)
- **Derivation**: Fields computed from multiple sources
- **Extension**: New CSR fields populated from Buddy metadata

---

## Entity Mapping Overview

| Buddy Entity | CSR Target Table(s) | Mapping Type | Complexity |
|-------------|---------------------|--------------|------------|
| User | `users`, `program_enrollments`, `user_external_ids` | Direct + Derivation | Medium |
| Buddy Match | `buddy_matches` | Direct | Low |
| Buddy Event (Informal) | `buddy_events` | Direct | Low |
| Formal Event Attendance | `buddy_events` (metadata) | Transformation | Medium |
| Skill Exchange Session | `kintell_sessions` (type: skill_share) | Transformation | High |
| Buddy Check-in | `buddy_checkins` | Direct | Low |
| Feedback/Rating | `buddy_feedback` | Direct | Low |
| Milestone/Achievement | `journey_milestones`, `program_enrollments` (metadata) | Transformation | Medium |

---

## 1. User Mapping

**Source**: Buddy Program `users` export
**Target**: CSR `users`, `program_enrollments`, `user_external_ids`

### Field-Level Mapping

| Buddy Field | CSR Field | Transformation | Validation |
|------------|-----------|----------------|------------|
| `id` (UUID) | `user_external_ids.externalId` | Store as external reference | Valid UUID |
| `email` | `users.email` | Lowercase, trim | Valid email format, unique |
| `first_name` | `users.firstName` | Trim | Max 100 chars |
| `last_name` | `users.lastName` | Trim | Max 100 chars |
| `role` | `users.role` | Map: `participant` → `beneficiary`, `buddy` → `volunteer` | Enum validation |
| `joined_at` | `program_enrollments.enrolledAt` | ISO 8601 → Timestamp | Valid timestamp |
| `language_preference` | `user_external_ids.metadata.buddy_language_preference` | Direct | Optional |
| `interests` | `user_external_ids.metadata.buddy_interests` | Array → JSONB | Optional |
| `location` | `user_external_ids.metadata.buddy_location` | Direct | Optional |

### Transformation Rules

#### Role Mapping
```typescript
function mapBuddyRoleToCsrRole(buddyRole: string): string {
  const roleMap = {
    'participant': 'beneficiary',
    'buddy': 'volunteer',
  };
  return roleMap[buddyRole] || 'volunteer'; // Default to volunteer
}
```

#### Email Normalization
```typescript
function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}
```

### Derivation Logic

**Program Enrollment** (always created for Buddy users):
```typescript
{
  userId: <csr_user_id>,
  programType: 'buddy',
  enrolledAt: <buddy_user.joined_at>,
  status: 'active',  // or 'completed' if user has ended matches
  completedAt: null  // or <last_match.ended_at> if all matches ended
}
```

**External ID Mapping**:
```typescript
{
  profileId: <csr_user_id>,
  provider: 'buddy',
  externalId: <buddy_user.id>,
  metadata: {
    buddy_joined_at: <buddy_user.joined_at>,
    buddy_language_preference: <buddy_user.language_preference>,
    buddy_interests: <buddy_user.interests>,
    buddy_location: <buddy_user.location>
  }
}
```

### Identity Unification

**Algorithm** (email-based deduplication):
1. Normalize email: `normalizeEmail(buddy_user.email)`
2. Lookup existing user: `SELECT id FROM users WHERE email = $1`
3. **If Found**:
   - Use existing `users.id`
   - Insert into `user_external_ids` (link Buddy ID to CSR user)
   - Update `program_enrollments` (add 'buddy' enrollment if missing)
4. **If Not Found**:
   - Insert new `users` record
   - Insert into `program_enrollments`
   - Insert into `user_external_ids`

### Validation Rules

| Rule | Check | Action on Failure |
|------|-------|-------------------|
| Email format | Regex: `^[^\s@]+@[^\s@]+\.[^\s@]+$` | Reject row, log error |
| Email uniqueness | Check `users.email` | Use existing user if found |
| UUID validity | Valid UUID v4 format | Reject row, log error |
| Role enum | `participant` or `buddy` | Reject row, log error |

---

## 2. Buddy Match Mapping

**Source**: Buddy Program `matches` export
**Target**: CSR `buddy_matches`

### Field-Level Mapping

| Buddy Field | CSR Field | Transformation | Validation |
|------------|-----------|----------------|------------|
| `match_id` | `buddy_matches.id` | Direct (UUID) | Valid UUID, unique |
| `participant_id` | `buddy_matches.participantId` | FK lookup via `user_external_ids` | FK exists |
| `buddy_id` | `buddy_matches.buddyId` | FK lookup via `user_external_ids` | FK exists |
| `matched_at` | `buddy_matches.matchedAt` | ISO 8601 → Timestamp | Valid timestamp |
| `status` | `buddy_matches.status` | Map: `active` → `active`, `ended` → `ended`, `inactive` → `inactive` | Enum validation |
| `ended_at` | `buddy_matches.endedAt` | ISO 8601 → Timestamp (if present) | Valid timestamp, > matched_at |

### Transformation Rules

#### User ID Lookup
```typescript
async function getBuddyCsrUserId(buddyUserId: string): Promise<string> {
  const result = await db
    .select({ profileId: userExternalIds.profileId })
    .from(userExternalIds)
    .where(eq(userExternalIds.provider, 'buddy'))
    .where(eq(userExternalIds.externalId, buddyUserId))
    .limit(1);

  if (!result[0]) {
    throw new Error(`Buddy user not found: ${buddyUserId}`);
  }
  return result[0].profileId;
}
```

### Validation Rules

| Rule | Check | Action on Failure |
|------|-------|-------------------|
| Match ID uniqueness | Check `buddy_matches.id` | Skip if exists (idempotency) |
| Participant exists | FK to `users.id` | Reject row, log error |
| Buddy exists | FK to `users.id` | Reject row, log error |
| End date logic | `ended_at > matched_at` (if present) | Reject row, log error |

---

## 3. Buddy Event (Informal) Mapping

**Source**: Buddy Program `events` export (type: `buddy.event.logged`)
**Target**: CSR `buddy_events`

### Field-Level Mapping

| Buddy Field | CSR Field | Transformation | Validation |
|------------|-----------|----------------|------------|
| `event_id` | `buddy_events.id` | Direct (UUID) | Valid UUID, unique |
| `match_id` | `buddy_events.matchId` | FK lookup via `buddy_matches.id` | FK exists |
| `event_type` | `buddy_events.eventType` | Direct | Optional |
| `event_date` | `buddy_events.eventDate` | ISO 8601 → Timestamp | Valid timestamp |
| `description` | `buddy_events.description` | Direct | Optional, max length |
| `location` | `buddy_events.location` | Direct | Optional, max 255 chars |
| `attendees` | *(not stored)* | Count for metrics | Optional |

### Transformation Rules

#### Event Type Normalization
```typescript
function normalizeEventType(eventType: string): string {
  return eventType.toLowerCase().replace(/\s+/g, '_');
}
```

### Validation Rules

| Rule | Check | Action on Failure |
|------|-------|-------------------|
| Event ID uniqueness | Check `buddy_events.id` | Skip if exists (idempotency) |
| Match exists | FK to `buddy_matches.id` | Warn + allow (orphaned event) |

---

## 4. Formal Event Attendance Mapping

**Source**: Buddy Program `event_attendance` export (type: `buddy.event.attended`)
**Target**: CSR `buddy_events` (with metadata extension)

### Field-Level Mapping

| Buddy Field | CSR Field | Transformation | Validation |
|------------|-----------|----------------|------------|
| `event_id` | `buddy_events.id` | Direct (UUID) | Valid UUID, unique |
| `user_id` | *(stored in description metadata)* | FK lookup | FK exists |
| `match_id` | `buddy_events.matchId` | FK lookup (optional) | FK exists if present |
| `event_title` | `buddy_events.description` | Prepend to description | Required |
| `event_type` | `buddy_events.eventType` | Map enum | Enum validation |
| `event_format` | *(metadata)* | Store in description JSON | Enum validation |
| `attended_at` | `buddy_events.eventDate` | ISO 8601 → Timestamp | Valid timestamp |
| `location` | `buddy_events.location` | Direct | Optional, max 255 chars |
| `duration_minutes` | *(metadata)* | Store in description JSON | Positive integer |
| `attendee_count` | *(metadata)* | Store in description JSON | Positive integer |
| `organizer` | *(metadata)* | Store in description JSON | Optional |
| `categories` | *(metadata)* | Store in description JSON | Array |
| `sdg_goals` | *(metadata)* | Store in description JSON | Array of 1-17 |

### Transformation Rules

#### Event Type Mapping (Buddy → CSR)
```typescript
const eventTypeMap = {
  'cultural': 'cultural_event',
  'educational': 'workshop',
  'professional': 'networking',
  'social': 'hangout',
  'support': 'support_group',
  'recreational': 'activity',
  'language': 'language_practice',
  'other': 'other'
};
```

#### Description Metadata Format
```typescript
interface EventMetadata {
  event_title: string;
  event_format: 'in-person' | 'online' | 'hybrid';
  duration_minutes?: number;
  attendee_count?: number;
  organizer?: string;
  categories?: string[];
  sdg_goals?: number[];
  attendee_user_id: string;  // CSR user ID
}

function createEventDescription(title: string, metadata: EventMetadata): string {
  return `${title}\n\nMetadata: ${JSON.stringify(metadata)}`;
}
```

### VIS Integration

**Hours Calculation**:
```typescript
function calculateVISHours(durationMinutes: number | null): number {
  if (!durationMinutes) return 0;
  return durationMinutes / 60; // Convert to hours
}
```

**Hour Weight** (based on event type):
| Event Type | VIS Weight Multiplier |
|-----------|----------------------|
| `educational` (workshop) | 1.2x (group facilitation) |
| `social`, `cultural`, `recreational` | 0.9x (event support) |
| `language`, `professional` | 1.0x (direct mentoring) |

---

## 5. Skill Exchange Session Mapping

**Source**: Buddy Program `skill_sessions` export (type: `buddy.skill_share.completed`)
**Target**: CSR `kintell_sessions` (session_type: `skill_share`)

### Field-Level Mapping

| Buddy Field | CSR Field | Transformation | Validation |
|------------|-----------|----------------|------------|
| `session_id` | `kintell_sessions.id` | Direct (UUID) | Valid UUID, unique |
| `skill_id` | `kintell_sessions.metadata.skill_id` | Direct | Positive integer |
| `skill_name` | `kintell_sessions.topics[0]` | Store as first topic | Required |
| `skill_category` | `kintell_sessions.metadata.skill_category` | Direct | Optional |
| `teacher_id` | `kintell_sessions.volunteerId` | FK lookup via `user_external_ids` | FK exists |
| `learner_id` | `kintell_sessions.participantId` | FK lookup via `user_external_ids` | FK exists |
| `match_id` | `kintell_sessions.metadata.match_id` | FK lookup (optional) | FK exists if present |
| `completed_at` | `kintell_sessions.completedAt` | ISO 8601 → Timestamp | Valid timestamp |
| `scheduled_at` | `kintell_sessions.scheduledAt` | ISO 8601 → Timestamp | Valid timestamp |
| `duration_minutes` | `kintell_sessions.durationMinutes` | Direct | Positive integer |
| `format` | `kintell_sessions.metadata.format` | Direct | Enum validation |
| `proficiency_level` | `kintell_sessions.metadata.proficiency_level` | Direct | Enum validation |
| `feedback.teacher_rating` | `kintell_sessions.rating` | Use teacher rating if available | 0.0-1.0 |
| `feedback.learner_rating` | `kintell_sessions.metadata.learner_rating` | Store separately | 0.0-1.0 |
| `feedback.teacher_comment` | `kintell_sessions.feedbackText` | Concatenate comments | PII field |
| `feedback.learner_comment` | `kintell_sessions.feedbackText` | Concatenate comments | PII field |
| `feedback.learner_progress` | `kintell_sessions.metadata.learner_progress` | Direct | Enum validation |
| `sdg_goals` | `kintell_sessions.metadata.sdg_goals` | Array → JSONB | Array of 1-17 |
| `valuation_points` | `kintell_sessions.metadata.valuation_points` | Direct | Positive integer |

### Transformation Rules

#### Session Type
```typescript
const sessionType = 'skill_share'; // New type (requires schema extension)
```

#### Rating Aggregation
```typescript
function aggregateRating(
  teacherRating?: number,
  learnerRating?: number
): number | null {
  if (teacherRating !== undefined && learnerRating !== undefined) {
    return (teacherRating + learnerRating) / 2;
  }
  return teacherRating ?? learnerRating ?? null;
}
```

#### Feedback Text Concatenation
```typescript
function concatenateFeedback(
  teacherComment?: string,
  learnerComment?: string
): string | null {
  const parts = [];
  if (teacherComment) parts.push(`Teacher: ${teacherComment}`);
  if (learnerComment) parts.push(`Learner: ${learnerComment}`);
  return parts.length > 0 ? parts.join('\n\n') : null;
}
```

#### Metadata Structure
```typescript
interface SkillSessionMetadata {
  skill_id: number;
  skill_name: string;
  skill_category?: string;
  match_id?: string;
  format?: 'in-person' | 'online' | 'hybrid';
  proficiency_level?: 'beginner' | 'intermediate' | 'advanced';
  learner_rating?: number;
  learner_progress?: 'no-progress' | 'some-progress' | 'good-progress' | 'excellent-progress';
  sdg_goals?: number[];
  valuation_points?: number;
}
```

### Q2Q Integration

**Trigger Q2Q Job** if `feedbackText` is not null:
```typescript
if (feedbackText) {
  await queueQ2QJob({
    textId: sessionId,
    textType: 'skill_feedback',
    text: feedbackText,
    expectedDimensions: ['confidence', 'job_readiness']
  });
}
```

### SROI Integration

**Job Readiness Contribution**:
- Skill category = `'professional'` → +0.1 job readiness
- Skill category = `'tech'` → +0.1 job readiness
- Skill category = `'language'` → +0.05 language proficiency

**Valuation Points**:
- Use `valuation_points` for SROI calculation (if provided)
- Default: 50 points per skill session

---

## 6. Buddy Check-in Mapping

**Source**: Buddy Program `checkins` export (type: `buddy.checkin.completed`)
**Target**: CSR `buddy_checkins`

### Field-Level Mapping

| Buddy Field | CSR Field | Transformation | Validation |
|------------|-----------|----------------|------------|
| `checkin_id` | `buddy_checkins.id` | Direct (UUID) | Valid UUID, unique |
| `match_id` | `buddy_checkins.matchId` | FK lookup via `buddy_matches.id` | FK exists |
| `checkin_date` | `buddy_checkins.checkinDate` | ISO 8601 → Timestamp | Valid timestamp |
| `mood` | `buddy_checkins.mood` | Direct | Enum validation |
| `notes` | `buddy_checkins.notes` | Direct | PII field, optional |
| `question_responses` | *(not stored)* | Discard (or extend schema) | Optional |

### Transformation Rules

#### Mood Validation
```typescript
const validMoods = ['great', 'good', 'okay', 'struggling', 'difficult'];

function validateMood(mood: string | null): boolean {
  return mood === null || validMoods.includes(mood);
}
```

### Q2Q Integration

**Trigger Q2Q Job** if `notes` is not null:
```typescript
if (notes) {
  await queueQ2QJob({
    textId: checkinId,
    textType: 'checkin_note',
    text: notes,
    expectedDimensions: ['well_being', 'belonging']
  });
}
```

### Validation Rules

| Rule | Check | Action on Failure |
|------|-------|-------------------|
| Check-in ID uniqueness | Check `buddy_checkins.id` | Skip if exists (idempotency) |
| Match exists | FK to `buddy_matches.id` | Reject row, log error |
| Mood enum | One of valid moods or null | Reject row, log error |

---

## 7. Feedback/Rating Mapping

**Source**: Buddy Program `feedback` export (type: `buddy.feedback.submitted`)
**Target**: CSR `buddy_feedback`

### Field-Level Mapping

| Buddy Field | CSR Field | Transformation | Validation |
|------------|-----------|----------------|------------|
| `feedback_id` | `buddy_feedback.id` | Direct (UUID) | Valid UUID, unique |
| `match_id` | `buddy_feedback.matchId` | FK lookup via `buddy_matches.id` | FK exists |
| `from_role` | `buddy_feedback.fromRole` | Direct | Enum validation |
| `rating` | `buddy_feedback.rating` | Normalize to 0.0-1.0 (if needed) | 0.0-1.0 range |
| `feedback_text` | `buddy_feedback.feedbackText` | Direct | PII field, optional |
| `submitted_at` | `buddy_feedback.submittedAt` | ISO 8601 → Timestamp | Valid timestamp |
| `categories.communication` | *(not stored)* | Discard (or extend schema) | Optional |
| `categories.helpfulness` | *(not stored)* | Discard (or extend schema) | Optional |
| `categories.engagement` | *(not stored)* | Discard (or extend schema) | Optional |

### Transformation Rules

#### Rating Normalization
**Assumption**: Buddy Program ratings are already 0.0-1.0
```typescript
function normalizeRating(rating: number): number {
  if (rating < 0 || rating > 1) {
    throw new Error(`Invalid rating: ${rating}`);
  }
  return rating;
}
```

**Alternative** (if Buddy uses 1-5 scale):
```typescript
function convertRatingScale(rating: number, maxScale: number = 5): number {
  return rating / maxScale;
}
```

### Q2Q Integration

**Trigger Q2Q Job** if `feedback_text` is not null:
```typescript
if (feedbackText) {
  await queueQ2QJob({
    textId: feedbackId,
    textType: 'buddy_feedback',
    text: feedbackText,
    expectedDimensions: ['confidence', 'belonging', 'job_readiness']
  });
}
```

### VIS Integration

**Quality Score Input**:
- Use `rating` for VIS quality score calculation
- Aggregate all feedback for a buddy → average rating

### Validation Rules

| Rule | Check | Action on Failure |
|------|-------|-------------------|
| Feedback ID uniqueness | Check `buddy_feedback.id` | Skip if exists (idempotency) |
| Match exists | FK to `buddy_matches.id` | Reject row, log error |
| From role enum | `participant` or `buddy` | Reject row, log error |
| Rating range | 0.0 ≤ rating ≤ 1.0 | Reject row, log error |

---

## 8. Milestone/Achievement Mapping

**Source**: Buddy Program `milestones` export (type: `buddy.milestone.reached`)
**Target**: CSR `journey_milestones`, `program_enrollments.metadata`

### Field-Level Mapping

| Buddy Field | CSR Field | Transformation | Validation |
|------------|-----------|----------------|------------|
| `milestone_id` | `journey_milestones.metadata.buddy_milestone_id` | Store as metadata | Positive integer |
| `user_id` | `journey_milestones.userId` | FK lookup via `user_external_ids` | FK exists |
| `milestone_title` | `journey_milestones.milestone` | Normalize to snake_case | Required |
| `milestone_category` | `journey_milestones.metadata.category` | Direct | Enum validation |
| `reached_at` | `journey_milestones.reachedAt` | ISO 8601 → Timestamp | Valid timestamp |
| `points` | `journey_milestones.metadata.points` | Direct | Non-negative integer |
| `badge_icon` | `journey_milestones.metadata.badge_icon` | Direct | Optional |
| `target_role` | `journey_milestones.metadata.target_role` | Direct | Enum validation |
| `progress` | `journey_milestones.metadata.progress` | JSONB → JSONB | Optional |
| `metadata` | `journey_milestones.metadata.buddy_metadata` | JSONB → JSONB | Optional |

### Transformation Rules

#### Milestone Name Normalization
```typescript
function normalizeMilestoneName(title: string): string {
  return title.toLowerCase().replace(/\s+/g, '_').substring(0, 100);
}
```

**Examples**:
- `"First Buddy Match"` → `"first_buddy_match"`
- `"10 Events Attended"` → `"10_events_attended"`
- `"Language Buddy Achievement"` → `"language_buddy_achievement"`

#### Metadata Structure
```typescript
interface MilestoneMetadata {
  buddy_milestone_id: number;
  category: string;
  points: number;
  badge_icon?: string;
  target_role?: 'participant' | 'buddy' | 'all';
  progress?: {
    current_step?: number;
    total_steps?: number;
    completed_steps?: string[];
  };
  buddy_metadata?: {
    is_first_time?: boolean;
    streak_count?: number;
    related_entities?: Array<{ type: string; id: string }>;
  };
}
```

### Journey Flags Update

**Trigger Journey Flag Update** on milestone reached:
```typescript
// Example: Set flag when user completes 10 events
if (milestoneTitle.includes('10 events')) {
  await setJourneyFlag(userId, 'buddy_highly_engaged', true);
}
```

### Validation Rules

| Rule | Check | Action on Failure |
|------|-------|-------------------|
| User exists | FK to `users.id` | Reject row, log error |
| Points non-negative | points ≥ 0 | Reject row, log error |
| Reached at timestamp | Valid timestamp | Reject row, log error |

---

## Transformation Pipeline Summary

### Import Flow

```
1. Parse CSV/JSON export
   ↓
2. Validate schema (Zod)
   ↓
3. Transform fields
   ↓
4. Lookup FK references (users, matches)
   ↓
5. Persist to CSR DB
   ↓
6. Trigger downstream jobs (Q2Q, VIS, SROI)
   ↓
7. Generate import summary
```

### Transformation Order (Dependencies)

```
1. Users (no dependencies)
   ↓
2. Buddy Matches (depends on Users)
   ↓
3. Events + Check-ins + Feedback (depend on Matches)
   ↓
4. Skill Sessions (depend on Users)
   ↓
5. Milestones (depend on Users)
   ↓
6. Metrics Recalculation (depends on all)
```

---

## Data Type Conversion Reference

| Buddy Type | CSR Type | Conversion Function |
|-----------|----------|---------------------|
| UUID (string) | UUID | Direct (validate format) |
| DateTime (ISO 8601 string) | TIMESTAMP | `new Date(isoString)` |
| Integer | INTEGER | `parseInt(value, 10)` |
| Decimal (0.0-1.0) | DECIMAL(3,2) | `parseFloat(value)` |
| String | VARCHAR | `value.trim().substring(0, maxLength)` |
| String | TEXT | Direct (no length limit) |
| Array<String> | JSONB | `JSON.stringify(array)` |
| Object | JSONB | `JSON.stringify(object)` |
| Enum | VARCHAR | Validate against allowed values |

---

## Error Handling Strategy

### Validation Errors

| Error Type | Severity | Action |
|-----------|----------|--------|
| Invalid UUID | Error | Reject row, log error, continue |
| Invalid email format | Error | Reject row, log error, continue |
| FK violation (user not found) | Error | Reject row, log error, continue |
| FK violation (match not found) | Warning | Allow (orphaned event), log warning |
| Invalid timestamp | Error | Reject row, log error, continue |
| Invalid enum value | Error | Reject row, log error, continue |
| Rating out of range | Error | Reject row, log error, continue |
| Missing required field | Error | Reject row, log error, continue |
| Unknown field (forward compat) | Info | Log info, continue |

### Transformation Errors

| Error Type | Severity | Action |
|-----------|----------|--------|
| Type conversion failure | Error | Reject row, log error, continue |
| Lookup failure (external ID) | Error | Reject row, log error, continue |
| Metadata serialization failure | Warning | Use empty metadata `{}`, log warning |

---

## Next Steps

**For Agent 4** (identity-unifier):
- Implement email-based deduplication algorithm
- Handle edge cases (email changes, duplicate emails, missing emails)

**For Agent 10** (buddy-transformer-users):
- Implement user transformation logic using mappings defined here

**For Agent 11** (buddy-transformer-activities):
- Implement event, check-in, feedback, skill session transformers

**For Agent 12** (buddy-transformer-achievements):
- Implement milestone transformer

**For Agent 13** (buddy-persistor):
- Implement DB persistors using validation rules defined here

---

**Document Status**: ✅ Complete
**Next Agent**: Agent 4 (identity-unifier)
