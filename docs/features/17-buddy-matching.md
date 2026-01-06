---
id: 17
key: buddy-matching
name: Buddy Matching
category: User Management
status: production
lastReviewed: 2025-01-27
---

# Buddy Matching

## 1. Summary

- Buddy matching and management system for 1-on-1 matching between employees and refugees.
- Features match lifecycle management, event publishing (match.created, match.ended), and integration with Unified Profile for user identity.
- Tracks buddy matches, events, and feedback with comprehensive event system.
- Used by program coordinators and participants for buddy program management and engagement tracking.

## 2. Current Status

- Overall status: `production`

- Fully implemented Buddy Service (port 3003) with ~9,300 lines of code and 92% completion. Core features include match lifecycle management, event publishing (match.created, match.ended), health endpoints, and integration with Unified Profile. Buddy Connector (port 3012) exists with 35 files but is partial/stub implementation with webhook endpoint and event schemas defined. Database schema includes `buddy_matches`, `buddy_events`, and `buddy_feedback` tables. Integration tests exist in `tests/integration/buddy-system/` covering calculation accuracy, data validation, event flow, failure injection, and webhook delivery.

- Service includes matching algorithms in `services/buddy-service/src/lib/`, routes in `services/buddy-service/src/routes/`, and schema in `packages/shared-schema/src/schema/buddy.ts`. Documentation includes `docs/ingestion/BUDDY_EXPORT_SPEC.md` and `services/buddy-connector/README.md`.

## 3. What's Next

- Implement match recommendation algorithm for automated matching suggestions.
- Add conflict resolution for buddy disputes and match issues.
- Complete external Buddy platform API integration in Buddy Connector.
- Add match quality scoring and feedback analysis.

## 4. Code & Files

Backend / services:
- `services/buddy-service/` - Buddy service (6 files: 5 *.ts, 1 *.csv)
- `services/buddy-connector/` - Buddy connector (35 files: 28 *.ts, 4 *.map, 2 *.js, 1 *.json)
- `packages/ingestion-buddy/` - Buddy ingestion utilities (17 *.ts files)
- `packages/shared-schema/src/schema/buddy.ts` - Buddy matching schema

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/buddy/` - Buddy UI (if exists)

Shared / schema / docs:
- `docs/ingestion/BUDDY_EXPORT_SPEC.md` - Buddy export specification
- `services/buddy-connector/README.md` - Buddy connector README

## 5. Dependencies

Consumes:
- Unified Profile for user identity
- Program Management for program context
- NATS for event publishing

Provides:
- Match data consumed by Corporate Cockpit Dashboard
- Match events used by Journey Tracking
- Buddy feedback data for Q2Q AI analysis

## 6. Notes

- Match lifecycle includes creation, acceptance, active, and ended states.
- Event publishing enables event-driven workflows across the platform.
- Integration with Unified Profile ensures consistent user identity.
- Buddy Connector is partial and needs completion for external platform integration.
- Match recommendation algorithm is missing and needs implementation.



