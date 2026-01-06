# Journey Engine Service

Declarative rules-based orchestration for participant journeys across Buddy, Kintell, and Upskilling programs.

## Overview

The Journey Engine automatically computes participant journey flags and triggers milestone events based on declarative YAML rules. It listens to events from all programs and evaluates configurable rules to determine journey states like:

- `mentor_ready` - Participant ready to become a mentor
- `followup_needed` - Inactive participant needing outreach
- `language_support_needed` - Low language comfort detected by Q2Q

## Features

- **Declarative Rules**: YAML-based rules editable without code changes
- **Event-Driven**: Automatic evaluation on program events
- **Flexible Conditions**: Support for count, exists, value, time-based, and logical conditions
- **Priority-Based**: Rules evaluated in priority order (higher first)
- **Idempotent**: Same inputs always produce same outputs
- **Cached Performance**: Context and rules cached for optimal performance

## Quick Start

```bash
# Install dependencies
pnpm install

# Run in development mode
pnpm dev

# Run tests
pnpm test

# Build for production
pnpm build
pnpm start
```

## Default Rules

1. **mentor_ready_001**: 3+ language sessions with avg rating >= 4.0
2. **followup_needed_001**: No activity in 14 days despite active enrollment
3. **language_support_needed_001**: Q2Q detected low language comfort (< 0.5)

## API Endpoints

### Journey Flags

- `GET /journey/flags/:userId` - Get all journey flags
- `POST /journey/flags/:userId/evaluate` - Manual rule evaluation
- `GET /journey/flags/:userId/history` - Flag change history

### Journey Milestones

- `GET /journey/milestones/:userId` - Get reached milestones
- `POST /journey/milestones/:userId/:milestone` - Trigger milestone

### Rules Management (Admin)

- `GET /journey/rules` - List all rules
- `GET /journey/rules/:id` - Get specific rule
- `POST /journey/rules` - Create new rule
- `PUT /journey/rules/:id` - Update rule
- `DELETE /journey/rules/:id` - Delete rule
- `POST /journey/rules/:id/activate` - Activate rule
- `POST /journey/rules/:id/deactivate` - Deactivate rule

## Event Subscriptions

The Journey Engine automatically subscribes to:

- `buddy.match.created`
- `buddy.event.logged`
- `buddy.checkin.completed`
- `buddy.feedback.submitted`
- `kintell.session.completed`
- `kintell.rating.created`
- `upskilling.course.completed`
- `upskilling.credential.issued`

## Event Emissions

- `orchestration.milestone.reached` - When a milestone is achieved
- `orchestration.flag.updated` - When a flag value changes

## Creating Custom Rules

See [Journey Engine Guide](../../docs/Journey_Engine.md) for comprehensive documentation on creating custom rules.

Example rule:

```yaml
id: custom_rule_001
name: High Engagement
description: User has high activity across all programs
flag: high_engagement
priority: 25
active: true
conditions:
  - type: all_of
    conditions:
      - type: count
        entity: buddy_events
        count: '>='
        count_value: 10
      - type: count
        entity: kintell_sessions
        count: '>='
        count_value: 5
actions:
  - type: set_flag
    flag: high_engagement
    value: true
  - type: emit_event
    event: orchestration.milestone.reached
    payload:
      milestone: high_engagement
```

## Documentation

- [Journey Engine Guide](../../docs/Journey_Engine.md) - Complete feature documentation
- [Default Rules Reference](../../reports/journey_engine_rules.md) - Detailed rule documentation
- [Platform Architecture](../../docs/Platform_Architecture.md) - Overall platform documentation

## Testing

```bash
# Run all tests
pnpm test

# Test a specific rule
curl -X POST http://localhost:3009/journey/flags/USER_ID/evaluate

# Check flags
curl http://localhost:3009/journey/flags/USER_ID

# View all rules
curl http://localhost:3009/journey/rules
```

## Environment Variables

- `PORT_JOURNEY_ENGINE` - Service port (default: 3009)
- `DATABASE_URL` - PostgreSQL connection string
- `NATS_URL` - NATS event bus URL (default: nats://localhost:4222)
- `LOG_LEVEL` - Logging level (default: info)

## Architecture

```
services/journey-engine/
  src/
    index.ts                 # Main server
    routes/
      flags.ts              # Journey flags API
      milestones.ts         # Milestones API
      rules.ts              # Rules management API
    rules/
      schema.ts             # Rule schema and validation
      engine.ts             # Rule evaluation logic
      defaults/             # Default YAML rules
        mentor_ready.yaml
        followup_needed.yaml
        language_support_needed.yaml
    subscribers/
      buddy.ts              # Buddy events subscriber
      kintell.ts            # Kintell events subscriber
      upskilling.ts         # Upskilling events subscriber
      rules-loader.ts       # Rules loading and caching
      index.ts              # Setup all subscribers
    utils/
      profile.ts            # Participant context fetching
  __tests__/
    rules.test.ts           # Rule schema tests
    engine.test.ts          # Rule engine tests
```

## License

Proprietary - TEEI Platform
