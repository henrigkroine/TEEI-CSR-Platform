---
id: 01
key: unified-journey-tracking
name: Unified Journey Tracking
category: Core
status: production
lastReviewed: 2025-01-27
---

# Unified Journey Tracking

## 1. Summary

- Declarative rules-based orchestration system that tracks participants across multiple programs (Buddy → Language Connect → Upskilling → Mentorship → Employment).
- Automatically computes journey flags (e.g., `mentor_ready`, `followup_needed`, `language_support_needed`) based on configurable YAML rules.
- Event-driven architecture that listens to program events and evaluates rules to determine participant journey states.
- Used by program coordinators and automated workflows to identify participants ready for next steps or needing intervention.

## 2. Current Status

- Overall status: `production`

- Fully implemented journey orchestration service (port 3009) with Fastify + TypeScript. Includes comprehensive rule schema with Zod validation, priority-based rule evaluation engine, and 3 default rules (mentor_ready, followup_needed, language_support_needed). Event subscribers automatically evaluate rules on program events from Buddy, Kintell, and Upskilling. REST API provides 11 endpoints for flags, milestones, and rules management. Database schema includes 3 tables (journey_flags, journey_rules, journey_milestones). Comprehensive test suite with 30+ test cases covering rule validation and engine logic.

- Service is production-ready with full documentation (60+ pages). Implementation report confirms completion status with all key deliverables in place.

## 3. What's Next

- Add integration tests for journey transitions across multiple programs in `services/journey-engine/__tests__/integration/`.
- Implement journey visualization API endpoint for timeline rendering in `services/journey-engine/src/routes/visualization.ts`.
- Add alerting/monitoring for journey flag changes that trigger automated workflows.
- Enhance rule editor UI in Corporate Cockpit for non-technical users to edit rules without code changes.

## 4. Code & Files

Backend / services:
- `services/journey-engine/` - Journey orchestration service (14 TypeScript files)
- `services/journey-engine/src/routes/flags.ts` - Journey flags API (3 endpoints)
- `services/journey-engine/src/routes/milestones.ts` - Milestones API (2 endpoints)
- `services/journey-engine/src/routes/rules.ts` - Rules management API (7 endpoints)
- `services/journey-engine/src/rules/schema.ts` - Rule schema & Zod validation
- `services/journey-engine/src/rules/engine.ts` - Rule evaluation engine
- `services/journey-engine/src/subscribers/` - Event subscribers (buddy, kintell, upskilling)
- `services/unified-profile/` - Profile aggregation service
- `packages/shared-schema/src/schema/programs.ts` - Program schema
- `packages/shared-schema/src/schema/program-instances.ts` - Instance tracking

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/journey/` - Journey UI components (if exists)

Shared / schema / docs:
- `docs/Journey_Engine.md` - Journey engine documentation
- `reports/journey_engine_implementation.md` - Implementation report

## 5. Dependencies

Consumes:
- Unified Profile service for participant identity linking
- Buddy Service events (match.created, match.ended)
- Kintell Connector events (session.completed)
- Upskilling Connector events (course.completed)
- Q2Q AI service for language comfort detection

Provides:
- Journey flags used by Corporate Cockpit Dashboard for participant management
- Milestone events consumed by reporting and analytics services
- Journey state data for Program Management workflows

## 6. Notes

- Rules are evaluated in priority order (higher priority first) and are idempotent (same inputs produce same outputs).
- Context and rules are cached for performance optimization.
- Default rules are production-ready but can be extended with custom rules via API.
- Journey transitions table exists but automated transitions may need additional work based on implementation report gaps.



