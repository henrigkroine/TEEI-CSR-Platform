# Buddy Program Activity Taxonomy for VIS Integration

**Agent**: Agent 5 (activity-taxonomist)
**Generated**: 2025-11-22
**Dependencies**: Agent 1 (buddy-schema-analysis.md), docs/VIS_Model.md
**Status**: ✅ Complete

---

## Executive Summary

This document defines the **activity taxonomy** for mapping Buddy Program activities to **VIS (Volunteer Impact Score)** components.

**VIS Components** (from `docs/VIS_Model.md`):
1. **Weighted Hours** (30% weight) - Quantity with diminishing returns
2. **Quality Score** (30% weight) - Participant satisfaction (Q2Q-derived)
3. **Outcome Lift** (25% weight) - % participants with measurable improvement
4. **Placement Impact** (15% weight) - Employment success rate

**Buddy Program Contribution**:
- ✅ **Weighted Hours**: Events, skill sessions, check-ins → VIS hours
- ✅ **Quality Score**: Feedback ratings → VIS quality input
- ✅ **Outcome Lift**: Milestones, mood improvements → outcome indicators
- ❌ **Placement Impact**: Not directly tracked (requires external employment data)

---

## Activity → VIS Hour Type Mapping

### VIS Hour Types & Weights

| VIS Hour Type | Weight Multiplier | Description | Examples |
|--------------|-------------------|-------------|----------|
| **Direct Mentoring** | 1.0x | 1-on-1 buddy sessions, check-ins | Buddy match sessions, video calls, support meetings |
| **Group Facilitation** | 1.2x | Leading workshops, group events (higher skill) | Educational workshops, skills training (as organizer) |
| **Event Support** | 0.9x | Event logistics, participation (non-leadership) | Cultural events, social gatherings, recreational activities |
| **Skill Exchange** | 1.0x | Teaching/learning skills 1-on-1 | Language tutoring, tech training, career coaching |
| **Administrative** | 0.8x | Coordination, planning | Program coordination (not applicable to most Buddy activities) |
| **Other** | 1.0x | Unclassified activities | Default fallback |

---

## Buddy Activity Type Mappings

### 1. Formal Events (buddy.event.attended)

| Buddy Event Type | VIS Hour Type | Weight | Rationale |
|-----------------|---------------|--------|-----------|
| `cultural` | Event Support | 0.9x | Participation in cultural exchange events |
| `educational` | **Group Facilitation** | **1.2x** | Workshop/training leadership |
| `professional` | Direct Mentoring | 1.0x | Career mentoring, networking support |
| `social` | Event Support | 0.9x | Community gatherings, social integration |
| `support` | Direct Mentoring | 1.0x | Support group meetings, check-ins |
| `recreational` | Event Support | 0.9x | Sports, hobbies, recreational activities |
| `language` | Direct Mentoring | 1.0x | Language practice sessions |
| `other` | Other | 1.0x | Unclassified events |

**Organizer Override**: If buddy is event organizer → upgrade to **Group Facilitation** (1.2x)

---

### 2. Informal Events (buddy.event.logged)

| Buddy Event Type | VIS Hour Type | Weight | Rationale |
|-----------------|---------------|--------|-----------|
| `hangout` | Event Support | 0.9x | Casual social meetups |
| `activity` | Event Support | 0.9x | Informal activities |
| `workshop` | **Group Facilitation** | **1.2x** | Structured workshops |
| `video_call` | Direct Mentoring | 1.0x | 1-on-1 virtual sessions |
| `call` | Direct Mentoring | 1.0x | Phone calls |

---

### 3. Skill Exchange Sessions (buddy.skill_share.completed)

| Skill Category | VIS Hour Type | Weight | Rationale |
|---------------|---------------|--------|-----------|
| `language` | Skill Exchange | 1.0x | Language tutoring (1-on-1) |
| `tech` | Skill Exchange | 1.0x | Tech skills training |
| `professional` | Skill Exchange | 1.0x | Professional development |
| `career` | Direct Mentoring | 1.0x | Career coaching |
| `personal_development` | Direct Mentoring | 1.0x | Personal growth support |

---

### 4. Check-ins (buddy.checkin.completed)

| Activity | VIS Hour Type | Weight | Rationale |
|---------|---------------|--------|-----------|
| Buddy Check-in | Direct Mentoring | 1.0x | 1-on-1 wellness check-ins |

**Default Duration**: 15 minutes (0.25 hours) if not provided

---

## Duration Estimation

When `duration_minutes` is not provided, use these defaults:

| Activity Type | Default Duration | Default Hours |
|--------------|------------------|---------------|
| Skill Session | 60 minutes | 1.0 hours |
| Formal Event | 90 minutes | 1.5 hours |
| Informal Event | 90 minutes | 1.5 hours |
| Check-in | 15 minutes | 0.25 hours |
| Video Call | 45 minutes | 0.75 hours |

---

## VIS Hour Calculation Examples

### Example 1: Buddy Match (1-on-1 Sessions)

**Activity**:
- Type: Informal event (`hangout`)
- Duration: Not provided
- Buddy is participant (not organizer)

**Calculation**:
```
Hour Type: Event Support
Raw Hours: 1.5 (default for informal event)
Weight: 0.9x
Weighted Hours: 1.5 × 0.9 = 1.35 hours
```

**VIS Contribution**: 1.35 weighted hours

---

### Example 2: Educational Workshop (Buddy as Organizer)

**Activity**:
- Type: Formal event (`educational`)
- Duration: 120 minutes
- Buddy is organizer: `true`

**Calculation**:
```
Hour Type: Group Facilitation (upgraded from educational + organizer)
Raw Hours: 120 / 60 = 2.0 hours
Weight: 1.2x
Weighted Hours: 2.0 × 1.2 = 2.4 hours
```

**VIS Contribution**: 2.4 weighted hours

---

### Example 3: Language Skill Session

**Activity**:
- Type: Skill session
- Skill Category: `language`
- Duration: 60 minutes

**Calculation**:
```
Hour Type: Skill Exchange
Raw Hours: 60 / 60 = 1.0 hours
Weight: 1.0x
Weighted Hours: 1.0 × 1.0 = 1.0 hours
```

**VIS Contribution**: 1.0 weighted hours

---

### Example 4: Buddy Check-in

**Activity**:
- Type: Check-in
- Duration: Not provided

**Calculation**:
```
Hour Type: Direct Mentoring
Raw Hours: 0.25 (default for check-in)
Weight: 1.0x
Weighted Hours: 0.25 × 1.0 = 0.25 hours
```

**VIS Contribution**: 0.25 weighted hours

---

## VIS Quality Score Integration

### Quality Score Sources (Buddy Program)

| Buddy Source | VIS Quality Input | Rating Range | Mapping |
|-------------|------------------|--------------|---------|
| `buddy_feedback.rating` | General quality | 0.0-1.0 | Direct (already normalized) |
| `skill_session.feedback.teacher_rating` | Skill quality | 0.0-1.0 | Direct |
| `skill_session.feedback.learner_rating` | Skill quality | 0.0-1.0 | Direct |
| `buddy_feedback.categories.communication` | Communication quality | 0.0-1.0 | Average with overall rating |
| `buddy_feedback.categories.helpfulness` | Helpfulness quality | 0.0-1.0 | Average with overall rating |
| `buddy_feedback.categories.engagement` | Engagement quality | 0.0-1.0 | Average with overall rating |

### Quality Score Calculation

**Aggregation**:
```typescript
quality_score = (
  avg(buddy_feedback.rating) +
  avg(skill_feedback.teacher_rating) +
  avg(skill_feedback.learner_rating)
) / 3 × 100
```

**Result**: 0-100 scale (VIS quality component)

**Q2Q Enhancement** (if available):
```typescript
// If Q2Q outcome scores exist for feedback text
quality_score = avg(
  outcome_scores.score WHERE dimension IN (
    'confidence', 'belonging', 'job_readiness', 'well_being'
  )
) × 100
```

---

## VIS Outcome Lift Integration

### Improvement Indicators (Buddy Program)

| Buddy Data | Outcome Lift Indicator | Measurement |
|-----------|----------------------|-------------|
| **Milestones Reached** | Milestone completion | Count of `buddy.milestone.reached` events |
| **Check-in Mood Trend** | Well-being improvement | Mood progression: `struggling` → `good` → `great` |
| **Skill Progress** | Skill advancement | `skill_session.feedback.learner_progress = 'good-progress'` or `'excellent-progress'` |
| **Event Participation** | Engagement increase | Increase in events attended over time |
| **Feedback Sentiment** | Satisfaction improvement | Rating trend: increasing over time |

### Outcome Lift Calculation

**Definition** (VIS Model):
```
outcome_lift = (participants_with_improvement / total_participants) × 100
```

**Buddy Program Criteria** (participant shows improvement if ANY of):
1. ✅ Reached ≥1 milestone in last 3 months
2. ✅ Mood improved by ≥1 level (e.g., `okay` → `good`)
3. ✅ Skill session with `learner_progress = 'good-progress'` or `'excellent-progress'`
4. ✅ Event participation increased by ≥50% (quarter-over-quarter)
5. ✅ Feedback rating increased by ≥0.15 (3-month trend)

**Example**:
- Buddy mentored 10 participants
- 3 reached milestones
- 2 showed mood improvement
- 1 had skill progress
- Total with improvement: 6
- **Outcome Lift**: 6/10 × 100 = **60%**

---

## SROI Integration

### Buddy Activity → SROI Dimensions

| Buddy Activity | SROI Dimension | Value Contribution | Calculation |
|---------------|----------------|-------------------|-------------|
| **Skill Session (language)** | Language Proficiency | +$500 per CEFR level proxy | Estimate +0.1 language level per 10 sessions |
| **Skill Session (professional)** | Job Readiness | +$300 per 0.1 improvement | +0.05 job readiness per professional skill session |
| **Milestones (community)** | Integration Score | +$150 per 0.1 improvement | +0.1 integration per community milestone |
| **Check-ins (positive mood)** | Well-being | Not in SROI (Q2Q only) | N/A (used for Outcome Lift) |

**SROI Formula** (from `docs/SROI_Calculation.md`):
```
SROI Ratio = Total Social Value Created / Total Investment

Investment = (Volunteer Hours × $29.95) + Program Costs
Social Value = (Integration × $150) + (Language × $500) + (Job Readiness × $300)
```

**Buddy Contribution Example**:
- 50 skill sessions (language): +0.5 language level → $250
- 5 professional skill sessions: +0.25 job readiness → $75
- 3 community milestones: +0.3 integration → $45
- **Total Social Value**: $370

---

## Taxonomy Implementation

### TypeScript Module

**Location**: `/packages/ingestion-buddy/src/utils/activity-taxonomy.ts`

**Key Functions**:
1. `classifyActivityType(activity)` → VIS hour type
2. `calculateVISHours(activity)` → Weighted hours
3. `aggregateVISHours(activities[])` → Total weighted hours by type
4. `calculateQualityScore(qualitySources[])` → Average quality score (0-100)

**Usage Example**:
```typescript
import { calculateVISHours } from '@teei/ingestion-buddy/utils/activity-taxonomy';

const activity = {
  activityType: 'event',
  eventType: 'educational',
  durationMinutes: 120,
  isOrganizer: true,
};

const result = calculateVISHours(activity);
// => {
//   hourType: 'group_facilitation',
//   rawHours: 2.0,
//   weightMultiplier: 1.2,
//   weightedHours: 2.4,
//   reasoning: 'Activity type: event | Event type: educational | Buddy is organizer | ...'
// }
```

---

## Cross-Program Consistency

### Alignment with Mentors for Ukraine & Language for Ukraine

| Activity Dimension | Buddy Program | Mentors Program | Language Program | Consistency |
|-------------------|--------------|----------------|-----------------|-------------|
| **1-on-1 Sessions** | Direct Mentoring (1.0x) | Direct Mentoring (1.0x) | Direct Mentoring (1.0x) | ✅ Aligned |
| **Group Workshops** | Group Facilitation (1.2x) | Group Facilitation (1.2x) | Group Facilitation (1.2x) | ✅ Aligned |
| **Event Participation** | Event Support (0.9x) | Event Support (0.9x) | Event Support (0.9x) | ✅ Aligned |
| **Skill Teaching** | Skill Exchange (1.0x) | Direct Mentoring (1.0x) | Skill Exchange (1.0x) | ✅ Aligned |
| **Quality Score Source** | Feedback ratings | Session ratings | Feedback ratings | ✅ Aligned |

**Result**: Buddy activities integrate seamlessly with existing VIS calculations.

---

## Success Metrics

**VIS Calculation Quality**:
- **Hour Type Accuracy**: >95% correct classification (manual review sample)
- **Weight Consistency**: 100% alignment with VIS Model specs
- **Quality Score Coverage**: >80% of activities have quality feedback

**Data Completeness**:
- **Duration Provided**: Target >70% (use defaults for rest)
- **Organizer Flag Populated**: Target >50% (formal events)
- **Feedback Rating Available**: Target >60% (for quality score)

---

## Next Steps

**For Agent 11** (buddy-transformer-activities):
- Use `activity-taxonomy.ts` to classify and weight all Buddy activities
- Calculate VIS hours during transformation

**For Agent 27** (csr-integration-coordinator):
- Connect Buddy activity hours → VIS calculator
- Trigger VIS recalculation after Buddy import

---

**Document Status**: ✅ Complete
**Code Artifact**: `/packages/ingestion-buddy/src/utils/activity-taxonomy.ts`
**Next Agent**: Agent 6 (program-instance-architect)
