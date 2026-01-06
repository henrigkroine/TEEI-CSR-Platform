# Journey Engine: Default Rules Documentation

## Overview

This document provides comprehensive documentation of all default rules included in the Journey Orchestration Engine. Each rule is designed to automatically detect participant journey states and trigger appropriate actions.

## Rule Evaluation Process

Rules are evaluated in **priority order** (highest first) whenever:
- A relevant event is received (buddy.*, kintell.*, upskilling.*)
- Manual evaluation is triggered via API

All conditions in a rule must be **TRUE** for the rule to trigger.

## Default Rules

### 1. Mentor Ready (`mentor_ready_001`)

#### Purpose
Identifies participants who have demonstrated proficiency in language sessions and are ready to become mentors to other participants.

#### Rule Configuration

```yaml
id: mentor_ready_001
name: Mentor Ready
description: Participant has completed 3+ language sessions with high ratings
flag: mentor_ready
priority: 10
active: true
```

#### Conditions

1. **Language Session Count**: Participant must have completed at least 3 language sessions
   ```yaml
   type: count
   entity: kintell_sessions
   field: session_type
   value: language
   count: '>='
   count_value: 3
   ```

2. **Average Rating**: Average Kintell session rating must be 4.0 or higher (out of 5.0)
   ```yaml
   type: value
   entity: kintell_sessions
   field: avg_rating
   operator: '>='
   value: 4.0
   ```

#### Actions

1. **Set Flag**: Sets `mentor_ready` flag to `true`
   ```yaml
   type: set_flag
   flag: mentor_ready
   value: true
   ```

2. **Emit Event**: Publishes `orchestration.milestone.reached` event
   ```yaml
   type: emit_event
   event: orchestration.milestone.reached
   payload:
     milestone: mentor_ready
     reason: Completed 3+ language sessions with avg rating >= 4.0
   ```

#### Evaluation Examples

**Example 1: Rule Triggers**
```javascript
{
  userId: "user-123",
  counts: {
    kintell_sessions: 5,
    kintell_sessions_by_type: {
      language: 4,  // >= 3 ✓
      cultural: 1
    }
  },
  aggregates: {
    avg_kintell_rating: 4.5  // >= 4.0 ✓
  }
}
// Result: mentor_ready flag set to TRUE
```

**Example 2: Rule Does Not Trigger (Insufficient Sessions)**
```javascript
{
  userId: "user-456",
  counts: {
    kintell_sessions: 2,
    kintell_sessions_by_type: {
      language: 2  // < 3 ✗
    }
  },
  aggregates: {
    avg_kintell_rating: 4.8
  }
}
// Result: mentor_ready flag NOT set (only 2 language sessions)
```

**Example 3: Rule Does Not Trigger (Low Rating)**
```javascript
{
  userId: "user-789",
  counts: {
    kintell_sessions: 8,
    kintell_sessions_by_type: {
      language: 5  // >= 3 ✓
    }
  },
  aggregates: {
    avg_kintell_rating: 3.2  // < 4.0 ✗
  }
}
// Result: mentor_ready flag NOT set (rating too low)
```

#### Business Impact

- **Participant Experience**: Recognizes achievement and unlocks mentorship opportunities
- **Program Efficiency**: Automatically identifies qualified mentors without manual review
- **Quality Assurance**: Ensures mentors have proven language proficiency

#### Testing Locally

```bash
# Create test participant with qualifying data
curl -X POST http://localhost:3009/journey/flags/USER_ID/evaluate

# Verify flag was set
curl http://localhost:3009/journey/flags/USER_ID
```

---

### 2. Followup Needed (`followup_needed_001`)

#### Purpose
Identifies participants who have been inactive for an extended period despite having active program enrollments, signaling the need for outreach.

#### Rule Configuration

```yaml
id: followup_needed_001
name: Followup Needed
description: No activity in last 14 days despite active enrollment
flag: followup_needed
priority: 20
active: true
```

#### Conditions

1. **Inactivity Duration**: No activity in the last 14 days
   ```yaml
   type: time_since
   entity: buddy_events
   field: last_activity
   duration: 14 days
   ```

2. **Active Enrollment**: Participant must have an active program enrollment
   ```yaml
   type: exists
   entity: program_enrollments
   field: status
   operator: '='
   value: active
   ```

#### Actions

1. **Set Flag**: Sets `followup_needed` flag to `true`
   ```yaml
   type: set_flag
   flag: followup_needed
   value: true
   ```

2. **Emit Event**: Publishes `orchestration.flag.updated` event
   ```yaml
   type: emit_event
   event: orchestration.flag.updated
   payload:
     flag: followup_needed
     value: true
     reason: No activity in 14 days
   ```

#### Evaluation Examples

**Example 1: Rule Triggers**
```javascript
{
  userId: "user-123",
  aggregates: {
    last_activity: new Date("2025-01-01")  // 20 days ago ✓
  },
  program_enrollments: [
    {
      programType: "buddy",
      status: "active"  // Active enrollment ✓
    }
  ]
}
// Today: 2025-01-21
// Result: followup_needed flag set to TRUE
```

**Example 2: Rule Does Not Trigger (Recent Activity)**
```javascript
{
  userId: "user-456",
  aggregates: {
    last_activity: new Date("2025-01-18")  // 3 days ago ✗
  },
  program_enrollments: [
    {
      programType: "buddy",
      status: "active"
    }
  ]
}
// Today: 2025-01-21
// Result: followup_needed flag NOT set (recent activity)
```

**Example 3: Rule Does Not Trigger (No Active Enrollment)**
```javascript
{
  userId: "user-789",
  aggregates: {
    last_activity: new Date("2025-01-01")  // 20 days ago ✓
  },
  program_enrollments: [
    {
      programType: "buddy",
      status: "completed"  // Not active ✗
    }
  ]
}
// Result: followup_needed flag NOT set (no active enrollment)
```

#### Business Impact

- **Participant Retention**: Proactively identifies at-risk participants
- **Automated Outreach**: Triggers automated follow-up workflows
- **Program Effectiveness**: Measures engagement and identifies gaps

#### Testing Locally

```bash
# Manually set last_activity to 20 days ago in test database
# Then trigger evaluation
curl -X POST http://localhost:3009/journey/flags/USER_ID/evaluate

# Check if followup_needed flag is set
curl http://localhost:3009/journey/flags/USER_ID
```

---

### 3. Language Support Needed (`language_support_needed_001`)

#### Purpose
Identifies participants with low language comfort based on Q2Q AI outcome scoring, enabling targeted language support interventions.

#### Rule Configuration

```yaml
id: language_support_needed_001
name: Language Support Needed
description: Low language comfort detected by Q2Q
flag: language_support_needed
priority: 15
active: true
```

#### Conditions

1. **Language Comfort Dimension**: Outcome score must be for language comfort
   ```yaml
   type: value
   entity: outcome_scores
   field: dimension
   operator: '='
   value: language_comfort
   ```

2. **Low Score**: Language comfort score must be below 0.5 (on a 0-1 scale)
   ```yaml
   type: value
   entity: outcome_scores
   field: score
   operator: '<'
   value: 0.5
   ```

#### Actions

1. **Set Flag**: Sets `language_support_needed` flag to `true`
   ```yaml
   type: set_flag
   flag: language_support_needed
   value: true
   ```

2. **Emit Event**: Publishes `orchestration.flag.updated` event
   ```yaml
   type: emit_event
   event: orchestration.flag.updated
   payload:
     flag: language_support_needed
     value: true
     reason: Q2Q detected low language comfort
   ```

#### Evaluation Examples

**Example 1: Rule Triggers**
```javascript
{
  userId: "user-123",
  outcome_scores: [
    {
      dimension: "language_comfort",  // Correct dimension ✓
      score: 0.3,  // < 0.5 ✓
      timestamp: new Date("2025-01-21")
    },
    {
      dimension: "cultural_integration",
      score: 0.7
    }
  ]
}
// Result: language_support_needed flag set to TRUE
```

**Example 2: Rule Does Not Trigger (High Score)**
```javascript
{
  userId: "user-456",
  outcome_scores: [
    {
      dimension: "language_comfort",
      score: 0.8,  // >= 0.5 ✗
      timestamp: new Date("2025-01-21")
    }
  ]
}
// Result: language_support_needed flag NOT set (high language comfort)
```

**Example 3: Rule Does Not Trigger (No Language Score)**
```javascript
{
  userId: "user-789",
  outcome_scores: [
    {
      dimension: "cultural_integration",  // Wrong dimension ✗
      score: 0.2
    }
  ]
}
// Result: language_support_needed flag NOT set (no language_comfort score)
```

#### Business Impact

- **Targeted Support**: Automatically routes participants to language resources
- **AI-Driven Insights**: Leverages Q2Q AI to detect language barriers
- **Participant Success**: Proactive intervention improves outcomes

#### Testing Locally

```bash
# Create Q2Q outcome score with low language comfort
curl -X POST http://localhost:3008/q2q/score \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "USER_ID",
    "dimension": "language_comfort",
    "score": 0.3
  }'

# Trigger evaluation
curl -X POST http://localhost:3009/journey/flags/USER_ID/evaluate

# Verify flag
curl http://localhost:3009/journey/flags/USER_ID
```

---

## Common Patterns

### Pattern 1: Progressive Milestones

Create rules with increasing requirements:

```yaml
# Bronze Tier
id: engagement_bronze_001
conditions:
  - type: count
    entity: buddy_events
    count: '>='
    count_value: 5
priority: 5

# Silver Tier
id: engagement_silver_001
conditions:
  - type: count
    entity: buddy_events
    count: '>='
    count_value: 15
priority: 10

# Gold Tier
id: engagement_gold_001
conditions:
  - type: count
    entity: buddy_events
    count: '>='
    count_value: 30
priority: 15
```

### Pattern 2: Multi-Program Engagement

Combine conditions across programs:

```yaml
id: cross_program_star_001
conditions:
  - type: all_of
    conditions:
      - type: count
        entity: buddy_matches
        count: '>='
        count_value: 3
      - type: count
        entity: kintell_sessions
        count: '>='
        count_value: 5
      - type: count
        entity: learning_progress
        count: '>='
        count_value: 2
```

### Pattern 3: Time-Based Interventions

Trigger actions based on duration:

```yaml
id: early_dropout_risk_001
conditions:
  - type: time_since
    entity: buddy_events
    field: last_activity
    duration: 7 days
  - type: count
    entity: buddy_events
    count: '<'
    count_value: 3
```

## Best Practices

### 1. Rule Design

- **Single Responsibility**: Each rule should manage one flag
- **Clear Naming**: Use descriptive IDs with version numbers
- **Appropriate Priority**: Critical flags = higher priority
- **Documentation**: Always include clear descriptions

### 2. Condition Logic

- **Avoid Redundancy**: Don't duplicate conditions across rules
- **Performance**: Use count conditions when possible (faster than complex queries)
- **Maintainability**: Keep condition logic simple and readable

### 3. Testing

```bash
# Test rule with mock data
1. Create test participant
2. Set up qualifying conditions
3. Trigger evaluation: POST /journey/flags/:userId/evaluate
4. Verify flag: GET /journey/flags/:userId
5. Check events: Monitor event bus for emitted events
```

### 4. Monitoring

- **Track Trigger Rates**: How often does each rule trigger?
- **Performance Metrics**: How long does evaluation take?
- **False Positives**: Are flags being set incorrectly?
- **Business Outcomes**: Are flagged participants receiving appropriate interventions?

## Rule Performance Analysis

### Expected Trigger Frequencies

| Rule | Expected Frequency | Typical Participant % |
|------|-------------------|---------------------|
| mentor_ready | 2-3 weeks after enrollment | 20-30% |
| followup_needed | Varies (inactive users) | 10-15% |
| language_support_needed | 1-2 weeks after Q2Q scoring | 15-25% |

### Optimization Tips

1. **Cache Aggressively**: Context is cached for 5 minutes
2. **Batch Evaluations**: Process multiple events together when possible
3. **Rule Prioritization**: Disable low-value rules
4. **Index Database**: Ensure proper indexes on user_id, flag, timestamp

## Troubleshooting Guide

### Issue: Rule Not Triggering

**Diagnosis Steps**:
1. Check if rule is active: `GET /journey/rules/:id`
2. Manually evaluate: `POST /journey/flags/:userId/evaluate`
3. Inspect participant context (check database directly)
4. Review condition logic (are all conditions met?)
5. Check logs for evaluation errors

**Common Causes**:
- Rule is inactive
- One condition fails (all must be true)
- Context cache is stale (clear cache)
- Database query returns no results

### Issue: Flag Set Incorrectly

**Diagnosis Steps**:
1. Check rule priority (higher priority may override)
2. Review condition operators (>= vs >)
3. Verify data types (string vs number comparison)
4. Check for multiple rules setting same flag

**Common Causes**:
- Rule priority conflict
- Incorrect operator
- Data type mismatch
- Conflicting rules

### Issue: Performance Degradation

**Diagnosis Steps**:
1. Check rule count (too many active rules?)
2. Review condition complexity (avoid nested all_of/any_of)
3. Monitor database query performance
4. Check cache hit rates

**Common Causes**:
- Too many active rules
- Complex nested conditions
- Database not indexed properly
- Cache misses

## Future Enhancements

### Planned Features

1. **Conditional Actions**: Execute actions only if additional criteria are met
2. **Rule Versioning**: Track rule changes over time
3. **A/B Testing**: Test different rule configurations
4. **ML Integration**: Use ML models for more sophisticated condition evaluation
5. **Rule Templates**: Pre-built rule templates for common patterns
6. **Batch Processing**: Evaluate rules for multiple users at once

### Custom Rule Requests

To request a new default rule:
1. Document the business need
2. Define conditions and actions
3. Estimate trigger frequency
4. Test with sample data
5. Submit PR with rule YAML and tests

## Conclusion

The Journey Engine's declarative rule system enables flexible, maintainable orchestration of participant journeys. By understanding these default rules and patterns, you can create custom rules tailored to your program's specific needs.

For additional support, consult the main [Journey Engine documentation](../docs/Journey_Engine.md).
