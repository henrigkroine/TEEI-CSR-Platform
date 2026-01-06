# CSR Platform Database Schema

**Agent**: Agent 2 (db-introspector)
**Generated**: 2025-11-22
**Source**: `packages/shared-schema/src/schema/`
**Status**: ✅ Complete

---

## Executive Summary

The CSR Platform database is built on PostgreSQL 14+ with Drizzle ORM. The schema supports **multi-tenant CSR program management** with integration across Kintell (language/mentorship), Buddy (peer support), and Upskilling (learning platforms) systems.

**Key Design Principles**:
- **Surrogate Keys**: All tables use UUIDs to prevent PII exposure
- **Multi-Tenancy**: Company-scoped isolation via `company_id` foreign keys
- **Event Sourcing**: Idempotency tracking for webhooks and API requests
- **Q2Q Integration**: Text fields feed AI outcome scoring pipeline
- **GDPR Compliance**: Privacy request tracking and audit logs

---

## Tables Relevant to Buddy Program Ingestion

### 1. users

**Description**: Central user table for all platform users (participants, volunteers, company admins)

**Schema** (`packages/shared-schema/src/schema/users.ts`):

```typescript
users {
  id: UUID (PK),
  email: VARCHAR(255) UNIQUE NOT NULL,           // PII - email address
  role: VARCHAR(50) NOT NULL,                    // admin | company_user | participant | volunteer
  firstName: VARCHAR(100),                       // PII - first name
  lastName: VARCHAR(100),                        // PII - last name
  journeyFlags: JSONB DEFAULT {},                // Journey tracking: { is_buddy_participant, buddy_match_count, ... }
  createdAt: TIMESTAMP NOT NULL,
  updatedAt: TIMESTAMP NOT NULL
}
```

**Indexes**:
- `idx_users_journey_flags` on `journey_flags` (GIN index for JSONB queries)

**Buddy Mapping**:
- **Buddy Users** → `users` table
  - `role = 'volunteer'` for buddies
  - `role = 'beneficiary'` for participants (or use custom role value)
- **Journey Flags** → `journeyFlags` JSONB:
  ```json
  {
    "is_buddy_participant": true,
    "is_buddy_volunteer": true,
    "buddy_match_count": 3,
    "last_buddy_activity": "2025-11-22T10:00:00Z"
  }
  ```

**Volume**: ~10,000-50,000 users (typical enterprise deployment)

**PII Fields**: `email`, `firstName`, `lastName`

---

### 2. program_enrollments

**Description**: Tracks user participation across all programs

**Schema** (`packages/shared-schema/src/schema/users.ts`):

```typescript
program_enrollments {
  id: UUID (PK),
  userId: UUID (FK → users.id) NOT NULL,
  programType: VARCHAR(50) NOT NULL,             // buddy | language | mentorship | upskilling
  enrolledAt: TIMESTAMP NOT NULL,
  status: VARCHAR(50) NOT NULL DEFAULT 'active', // active | completed | dropped
  completedAt: TIMESTAMP
}
```

**Buddy Mapping**:
- **Buddy Program Enrollment** → `program_enrollments`
  - `programType = 'buddy'`
  - `status = 'active'` when user has active match
  - `status = 'completed'` when user completes program
  - `completedAt` set when match ends with reason `completed`

**Volume**: ~20,000-100,000 enrollments

---

### 3. buddy_matches

**Description**: 1:1 buddy matches between participants and buddies

**Schema** (`packages/shared-schema/src/schema/buddy.ts`):

```typescript
buddy_matches {
  id: UUID (PK),
  participantId: UUID (FK → users.id) NOT NULL,
  buddyId: UUID (FK → users.id) NOT NULL,
  matchedAt: TIMESTAMP NOT NULL,
  status: VARCHAR(50) NOT NULL DEFAULT 'active', // active | inactive | ended
  endedAt: TIMESTAMP
}
```

**Buddy Mapping**:
- **Direct mapping** from Buddy Program `matches` export
- `participantId` → participant user UUID
- `buddyId` → buddy user UUID
- `status` transitions: `active` → `ended`

**Volume**: ~5,000-20,000 matches

---

### 4. buddy_events

**Description**: Social activities and formal events (hangouts, workshops, etc.)

**Schema** (`packages/shared-schema/src/schema/buddy.ts`):

```typescript
buddy_events {
  id: UUID (PK),
  matchId: UUID (FK → buddy_matches.id) NOT NULL,
  eventType: VARCHAR(100),                       // hangout | activity | workshop | call | ...
  eventDate: TIMESTAMP,
  description: TEXT,
  location: VARCHAR(255),
  createdAt: TIMESTAMP NOT NULL
}
```

**Buddy Mapping**:
- **Informal Events** (`buddy.event.logged`) → `buddy_events`
  - `eventType` → event type string
- **Formal Events** (`buddy.event.attended`) → `buddy_events` with metadata
  - Store `sdg_goals`, `duration_minutes`, `attendee_count` in description or metadata field (needs extension)
- **Video Calls** (`skill_share.completed` with format: online) → `buddy_events`
  - `eventType = 'video_call'`

**Volume**: ~50,000-200,000 events/year

---

### 5. buddy_checkins

**Description**: Regular wellness and progress check-ins

**Schema** (`packages/shared-schema/src/schema/buddy.ts`):

```typescript
buddy_checkins {
  id: UUID (PK),
  matchId: UUID (FK → buddy_matches.id) NOT NULL,
  checkinDate: TIMESTAMP NOT NULL,
  mood: VARCHAR(50),                             // great | good | okay | struggling | difficult
  notes: TEXT                                    // PII - Q2Q input
}
```

**Buddy Mapping**:
- **Direct mapping** from Buddy Program `checkins` export
- `mood` → enum value
- `notes` → free-text field (PII - feed to Q2Q)

**Q2Q Integration**:
- `notes` → Q2Q classifier → `outcome_scores` (dimensions: `well_being`, `belonging`)

**Volume**: ~30,000-100,000 check-ins/year

**PII Fields**: `notes`

---

### 6. buddy_feedback

**Description**: Feedback and ratings from participants and buddies

**Schema** (`packages/shared-schema/src/schema/buddy.ts`):

```typescript
buddy_feedback {
  id: UUID (PK),
  matchId: UUID (FK → buddy_matches.id) NOT NULL,
  fromRole: VARCHAR(50) NOT NULL,                // participant | buddy
  rating: DECIMAL(3,2) NOT NULL,                 // 0.00 - 1.00
  feedbackText: TEXT,                            // PII - Q2Q input
  submittedAt: TIMESTAMP NOT NULL
}
```

**Buddy Mapping**:
- **Direct mapping** from Buddy Program `feedback` export
- `rating` → normalized 0.0-1.0 rating
- `feedbackText` → free-text field (PII - feed to Q2Q)

**Q2Q Integration**:
- `feedbackText` → Q2Q classifier → `outcome_scores` (dimensions: `confidence`, `belonging`, `job_readiness`)

**Volume**: ~15,000-50,000 feedback submissions/year

**PII Fields**: `feedbackText`

---

### 7. buddy_system_events

**Description**: Raw event storage for all Buddy System webhook events

**Schema** (`packages/shared-schema/src/schema/buddy.ts`):

```typescript
buddy_system_events {
  id: UUID (PK),
  eventId: UUID UNIQUE NOT NULL,                 // From event payload (BaseEvent.id)
  eventType: VARCHAR(100) NOT NULL,              // buddy.match.created, buddy.skill_share.completed, ...
  userId: VARCHAR(100),                          // Primary user ID (participantId, volunteerId, etc.)
  timestamp: TIMESTAMP NOT NULL,                 // Event timestamp
  payload: JSONB NOT NULL,                       // Full event payload
  correlationId: UUID,                           // For event tracing
  processedAt: TIMESTAMP,                        // When processed to domain tables
  derivedMetrics: JSONB DEFAULT '[]',            // Tracks which metrics derived from this event
  createdAt: TIMESTAMP NOT NULL
}
```

**Indexes**:
- `buddy_events_user_timestamp_idx` on `userId`, `timestamp`
- `buddy_events_event_type_idx` on `eventType`
- `buddy_events_event_id_idx` on `eventId`

**Buddy Mapping**:
- **Event Sourcing**: All Buddy Program webhook events stored here
- **Idempotency**: `eventId` unique constraint prevents duplicates
- **Audit Trail**: Full payload preserved for replay/debugging

**Volume**: ~100,000-300,000 events/year

**Use Case**: Historical batch import → create synthetic events with `eventType = 'buddy.import.batch'`

---

### 8. kintell_sessions

**Description**: Language and mentorship sessions (used for skill exchange sessions)

**Schema** (`packages/shared-schema/src/schema/kintell.ts`):

```typescript
kintell_sessions {
  id: UUID (PK),
  externalSessionId: VARCHAR(255),
  sessionType: VARCHAR(50) NOT NULL,             // language | mentorship | skill_share (NEW)
  participantId: UUID (FK → users.id) NOT NULL,
  volunteerId: UUID (FK → users.id) NOT NULL,
  scheduledAt: TIMESTAMP,
  completedAt: TIMESTAMP,
  durationMinutes: INTEGER,
  rating: DECIMAL(3,2),                          // 0.00 - 1.00
  feedbackText: TEXT,                            // PII - Q2Q input
  languageLevel: VARCHAR(10),                    // CEFR: A1, A2, B1, B2, C1, C2
  topics: JSONB,                                 // Array of topics
  metadata: JSONB,
  createdAt: TIMESTAMP NOT NULL
}
```

**Buddy Mapping**:
- **Skill Exchange Sessions** → `kintell_sessions`
  - `sessionType = 'skill_share'` (new type - needs schema extension)
  - `participantId` → learner user UUID
  - `volunteerId` → teacher user UUID
  - `metadata` → store skill details:
    ```json
    {
      "skill_id": 123,
      "skill_name": "JavaScript",
      "skill_category": "tech",
      "proficiency_level": "intermediate",
      "sdg_goals": [4, 8],
      "valuation_points": 50
    }
    ```

**Q2Q Integration**:
- `feedbackText` → Q2Q classifier → `outcome_scores` (dimensions: `confidence`, `job_readiness`)

**Volume**: ~10,000-40,000 sessions/year

**PII Fields**: `feedbackText`

---

### 9. outcome_scores

**Description**: AI-generated outcome dimensions from Q2Q classifier

**Schema** (`packages/shared-schema/src/schema/q2q.ts`):

```typescript
outcome_scores {
  id: UUID (PK),
  textId: UUID NOT NULL,                         // FK to feedback_id, checkin_id, etc.
  textType: VARCHAR(50),                         // buddy_feedback | kintell_feedback | checkin_note | ...
  dimension: VARCHAR(50) NOT NULL,               // confidence | belonging | lang_level_proxy | job_readiness | well_being
  score: DECIMAL(4,3) NOT NULL,                  // 0.000 - 1.000
  confidence: DECIMAL(4,3),                      // Model confidence
  modelVersion: VARCHAR(50),
  method: ENUM DEFAULT 'ai_classifier',          // ai_classifier | rule_based | manual
  providerUsed: VARCHAR(50),                     // claude | openai | gemini
  language: ENUM DEFAULT 'en',                   // en | uk | no | unknown
  topics: JSONB,                                 // Array of detected topics
  createdAt: TIMESTAMP NOT NULL
}
```

**Indexes**:
- `outcome_scores_text_id_idx` on `textId`
- `outcome_scores_dimension_idx` on `dimension`
- `outcome_scores_language_idx` on `language`

**Buddy Mapping**:
- **Automatic Q2Q Processing**:
  1. Import `buddy_feedback` → trigger Q2Q job
  2. Import `buddy_checkins` → trigger Q2Q job
  3. Import `kintell_sessions` (skill feedback) → trigger Q2Q job
  4. Q2Q creates `outcome_scores` records:
     - `textId` → `buddy_feedback.id` or `buddy_checkins.id`
     - `textType` → `buddy_feedback` or `checkin_note`
     - `dimension` → detected dimensions
     - `score` → 0.0-1.0 score per dimension

**Volume**: ~50,000-200,000 outcome scores/year (multiple dimensions per text)

---

### 10. evidence_snippets

**Description**: Text snippets supporting outcome scores (deidentified)

**Schema** (`packages/shared-schema/src/schema/q2q.ts`):

```typescript
evidence_snippets {
  id: UUID (PK),
  outcomeScoreId: UUID (FK → outcome_scores.id),
  snippetText: TEXT,
  snippetHash: VARCHAR(64) UNIQUE,               // SHA-256 hash for deduplication
  embeddingRef: VARCHAR(255),                    // Reference to vector DB
  embedding: TEXT,                               // JSON array of embedding vector
  sourceRef: VARCHAR(255),                       // Reference to original text position
  createdAt: TIMESTAMP NOT NULL
}
```

**Indexes**:
- `evidence_snippets_outcome_score_idx` on `outcomeScoreId`
- `evidence_snippets_hash_idx` on `snippetHash`

**Buddy Mapping**:
- **Automatic Q2Q Processing**:
  - Q2Q extracts relevant snippets from feedback/checkin text
  - Snippets are deidentified (PII removed)
  - Hash prevents duplicate snippets
  - Used for evidence lineage in reporting

**Volume**: ~100,000-400,000 snippets/year

---

### 11. metrics_company_period

**Description**: Aggregated company-level metrics by time period

**Schema** (`packages/shared-schema/src/schema/metrics.ts`):

```typescript
metrics_company_period {
  id: UUID (PK),
  companyId: UUID (FK → companies.id) NOT NULL,
  periodStart: DATE NOT NULL,
  periodEnd: DATE NOT NULL,
  participantsCount: INTEGER,
  volunteersCount: INTEGER,
  sessionsCount: INTEGER,
  avgIntegrationScore: DECIMAL(4,3),
  avgLanguageLevel: DECIMAL(4,3),
  avgJobReadiness: DECIMAL(4,3),
  sroiRatio: DECIMAL(6,2),                       // e.g., 5.23 = 5.23:1
  visScore: DECIMAL(6,2),
  createdAt: TIMESTAMP NOT NULL
}
```

**Indexes**:
- `metrics_company_period_idx` on `companyId`, `periodStart`
- `metrics_period_start_idx` on `periodStart`

**Buddy Mapping**:
- **Recalculation Trigger**: After Buddy import completes
- **Inputs from Buddy Program**:
  - `participantsCount` ← count of users with `role = 'beneficiary'` and `program_enrollments.programType = 'buddy'`
  - `volunteersCount` ← count of users with `role = 'volunteer'` and active buddy matches
  - `sessionsCount` ← count of `kintell_sessions` (type: skill_share) + buddy_events
  - `avgJobReadiness` ← avg of `outcome_scores` where `dimension = 'job_readiness'`
  - `sroiRatio` ← SROI calculator output
  - `visScore` ← VIS calculator output

**Volume**: ~500-2,000 period records (monthly/quarterly aggregation)

---

### 12. external_id_mappings

**Description**: Surrogate key mapping for external systems

**Schema** (`packages/shared-schema/src/schema/users.ts`):

```typescript
external_id_mappings {
  id: UUID (PK),
  userId: UUID (FK → users.id) NOT NULL,
  externalSystem: VARCHAR(50) NOT NULL,          // kintell | discord | buddy | upskilling
  externalId: VARCHAR(255) NOT NULL,
  createdAt: TIMESTAMP NOT NULL
}
```

**Buddy Mapping**:
- **Identity Unification**:
  - Buddy Program user IDs → `externalSystem = 'buddy'`
  - Map Buddy user to CSR `users.id` via `externalId`
  - Enables deduplication with Mentors/Language users

**Example**:
```sql
INSERT INTO external_id_mappings (user_id, external_system, external_id)
VALUES ('csr-uuid-123', 'buddy', 'buddy-user-456');
```

**Volume**: ~50,000-200,000 mappings (multiple systems per user)

---

### 13. user_external_ids

**Description**: Enhanced external ID mapping with metadata

**Schema** (`packages/shared-schema/src/schema/users.ts`):

```typescript
user_external_ids {
  id: UUID (PK),
  profileId: UUID (FK → users.id CASCADE) NOT NULL,
  provider: VARCHAR(50) NOT NULL,                // buddy | discord | kintell | upskilling
  externalId: VARCHAR(255) NOT NULL,
  createdAt: TIMESTAMP NOT NULL,
  updatedAt: TIMESTAMP NOT NULL,
  metadata: JSONB DEFAULT {}                     // Provider-specific metadata
}
```

**Indexes**:
- `idx_user_external_ids_profile` on `profileId`
- `idx_user_external_ids_provider_external` on `provider`, `externalId`
- `idx_user_external_ids_provider` on `provider`

**Buddy Mapping**:
- **Preferred over** `external_id_mappings` (newer table)
- Same use case: map Buddy users to CSR users
- `metadata` can store Buddy-specific fields:
  ```json
  {
    "buddy_joined_at": "2024-01-15T10:00:00Z",
    "buddy_language_preference": "English",
    "buddy_interests": ["hiking", "cooking"]
  }
  ```

**Volume**: ~50,000-200,000 mappings

---

### 14. journey_flags

**Description**: Computed journey readiness flags for participants

**Schema** (`packages/shared-schema/src/schema/journey.ts`):

```typescript
journey_flags {
  id: UUID (PK),
  userId: UUID (FK → users.id) NOT NULL,
  flag: VARCHAR(100) NOT NULL,                   // mentor_ready | followup_needed | buddy_active | ...
  value: BOOLEAN NOT NULL,
  setByRule: VARCHAR(100),                       // Rule ID that set this flag
  setAt: TIMESTAMP NOT NULL,
  expiresAt: TIMESTAMP                           // Optional expiration
}
```

**Buddy Mapping**:
- **Journey Orchestration**:
  - `flag = 'buddy_match_active'` → set when user has active buddy match
  - `flag = 'buddy_checkin_due'` → set when >7 days since last check-in
  - `flag = 'buddy_feedback_pending'` → set when feedback due

**Volume**: ~100,000-500,000 flags (multiple flags per user)

---

### 15. journey_milestones

**Description**: Tracks when participants reach significant milestones

**Schema** (`packages/shared-schema/src/schema/journey.ts`):

```typescript
journey_milestones {
  id: UUID (PK),
  userId: UUID (FK → users.id) NOT NULL,
  milestone: VARCHAR(100) NOT NULL,              // mentor_ready | first_match | 10_events | ...
  reachedAt: TIMESTAMP NOT NULL,
  triggeredByRule: VARCHAR(100),                 // Rule ID that triggered this
  metadata: JSONB                                // Additional context
}
```

**Buddy Mapping**:
- **Milestone Tracking**:
  - `milestone = 'first_buddy_match'` → triggered on first match created
  - `milestone = 'buddy_10_events'` → triggered after 10 events attended
  - `milestone = 'buddy_skill_share_completed'` → triggered after first skill session
  - Map from Buddy Program `milestones` export to `journey_milestones`

**Volume**: ~20,000-80,000 milestones/year

---

## Schema Extensions Needed

### Required for Full Buddy Program Support

1. **kintell_sessions.session_type** enum:
   - Add `'skill_share'` to valid values
   - Currently: `'language' | 'mentorship'`
   - Needed: `'language' | 'mentorship' | 'skill_share'`

2. **buddy_events metadata field**:
   - Consider adding `metadata: JSONB` to store:
     - `sdg_goals: Array<Integer>`
     - `duration_minutes: Integer`
     - `attendee_count: Integer`
     - `event_format: 'in-person' | 'online' | 'hybrid'`

3. **outcome_scores.text_type** values:
   - Add `'skill_feedback'` for skill session feedback

---

## Identity Unification Strategy

### Email-Based Deduplication

**Scenario**: Buddy Program user already exists in CSR Platform (from Mentors/Language program)

**Strategy**:
1. **On Import**: Check if `email` exists in `users` table
2. **If Exists**: Link to existing user:
   ```sql
   INSERT INTO user_external_ids (profile_id, provider, external_id)
   VALUES (existing_user_id, 'buddy', buddy_user_id);
   ```
3. **If Not Exists**: Create new user:
   ```sql
   INSERT INTO users (email, role, first_name, last_name)
   VALUES (...);
   INSERT INTO user_external_ids (profile_id, provider, external_id)
   VALUES (new_user_id, 'buddy', buddy_user_id);
   ```

**Edge Case**: User changed email
- Use `externalId` lookup first, then email fallback
- Log warning if email mismatch detected

---

## Data Quality Considerations

### Referential Integrity

**Strong FK Constraints** (enforced by DB):
- `buddy_matches.participant_id` → `users.id`
- `buddy_matches.buddy_id` → `users.id`
- `buddy_events.match_id` → `buddy_matches.id`
- `buddy_checkins.match_id` → `buddy_matches.id`
- `buddy_feedback.match_id` → `buddy_matches.id`
- `kintell_sessions.participant_id` → `users.id`
- `kintell_sessions.volunteer_id` → `users.id`

**Validation Requirements** (pre-import):
1. Verify all `participant_id` and `buddy_id` exist in `users` table
2. Verify all `match_id` references exist in `buddy_matches` table
3. Fail-fast if FK violations detected

### Null Handling

**Required Fields** (NOT NULL):
- All `*_id` fields (UUIDs)
- All timestamps (`*_at` fields)
- `users.email`, `users.role`
- `outcome_scores.score`, `outcome_scores.dimension`

**Optional Fields** (Nullable):
- `feedback_text`, `notes` (may be empty)
- `rating` (may be missing for some events)
- `mood` (check-ins may skip mood)
- `metadata` (always has default `{}`)

---

## GDPR & Privacy

### PII Fields (Critical)

| Table | Field | Sensitivity | GDPR Action |
|-------|-------|-------------|-------------|
| `users` | `email` | High | Export + Delete on DSAR |
| `users` | `firstName` | High | Export + Delete on DSAR |
| `users` | `lastName` | High | Export + Delete on DSAR |
| `buddy_checkins` | `notes` | High | Redact on Delete (Q2Q processed) |
| `buddy_feedback` | `feedbackText` | High | Redact on Delete (Q2Q processed) |
| `kintell_sessions` | `feedbackText` | High | Redact on Delete (Q2Q processed) |
| `evidence_snippets` | `snippetText` | Medium | Deidentified (keep on Delete) |

### Privacy Request Flow

**DSAR (Data Subject Access Request)**:
1. User requests data export
2. System collects all records where `user_id = <user>`
3. Export includes:
   - User profile
   - Buddy matches
   - Events attended
   - Check-ins (redacted PII)
   - Feedback (redacted PII)
   - Outcome scores (anonymized)

**Right to be Forgotten**:
1. User requests deletion
2. System:
   - Deletes `users` record (CASCADE deletes external IDs)
   - Redacts PII from `buddy_checkins.notes`, `buddy_feedback.feedbackText`
   - Preserves aggregate metrics (anonymized)
   - Preserves `outcome_scores` (no PII)

---

## Performance Considerations

### Indexing Strategy

**Critical Indexes** (already implemented):
- `users.email` (UNIQUE) - for identity lookups
- `buddy_matches (participant_id, status)` - for active match queries
- `buddy_events (match_id, event_date)` - for timeline queries
- `outcome_scores (text_id)` - for Q2Q lineage
- `outcome_scores (dimension, created_at)` - for metric aggregation

**Additional Indexes** (recommend adding):
- `buddy_events (event_type, event_date)` - for VIS hour calculation
- `buddy_feedback (submitted_at)` - for recent feedback queries
- `kintell_sessions (session_type, completed_at)` - for skill session queries

### Query Patterns

**Common Queries** (optimize for):
1. **Get active matches for user**:
   ```sql
   SELECT * FROM buddy_matches
   WHERE (participant_id = $1 OR buddy_id = $1)
   AND status = 'active';
   ```

2. **Get outcome scores for feedback**:
   ```sql
   SELECT * FROM outcome_scores
   WHERE text_id = $1 AND text_type = 'buddy_feedback';
   ```

3. **Calculate VIS for volunteer**:
   ```sql
   SELECT
     SUM(duration_minutes) as total_hours,
     AVG(rating) as avg_quality
   FROM kintell_sessions
   WHERE volunteer_id = $1
   AND completed_at >= $2;
   ```

---

## Next Steps

**For Agent 3** (csr-model-mapper):
- Create detailed field-level mapping: Buddy entities → CSR tables
- Define transformation rules (e.g., Buddy `rating` 0-5 → CSR `rating` 0.0-1.0)

**For Agent 4** (identity-unifier):
- Design email-based deduplication algorithm
- Handle edge cases (email changes, duplicate emails)

**For Agent 13** (buddy-persistor):
- Implement DB persistors for each table
- Handle FK validation and conflict resolution

---

**Document Status**: ✅ Complete
**Next Agent**: Agent 3 (csr-model-mapper)
