---
id: 20
key: unified-profile
name: Unified Profile
category: User Management
status: production
lastReviewed: 2025-01-27
---

# Unified Profile

## 1. Summary

- Aggregated user profile service that consolidates employee and refugee profiles across multiple programs (Kintell, Buddy, Upskilling).
- Features real-time profile synchronization, multi-source data reconciliation, consent-based data sharing, profile completeness scoring, and event emission for profile changes.
- Provides single source of truth for user identity with external ID mapping and journey flag management.
- Used by all services for user identity resolution and profile data access.

## 2. Current Status

- Overall status: `production`

- Fully implemented Unified Profile Service (port 3001) with ~6,200 lines of code and 90% completion. Core features include single source of truth for user identity, external ID mapping (Kintell, Discord, Buddy, Upskilling), journey flag management (11 flags), event subscriptions (3 event types), real-time profile synchronization, multi-source data reconciliation, consent-based data sharing, profile completeness scoring, PII encryption at rest, and profile search & filtering. Database tables include `profiles` (master profile data), `profile_sources` (source attribution), and `profile_privacy_settings` (consent tracking).

- Recent enhancements include enhanced PII redaction in `packages/shared-utils/src/pii-redaction.ts` and Vault integration for secret storage. Service includes 12 TypeScript files with routes, profile aggregation logic, and NATS event subscribers.

## 3. What's Next

- Add profile merge conflict resolution UI for handling data conflicts.
- Implement bulk profile import (CSV) for large-scale onboarding.
- Enhance profile completeness scoring with more granular metrics.
- Add profile photo storage with S3/MinIO integration.

## 4. Code & Files

Backend / services:
- `services/unified-profile/` - Profile service (12 *.ts files)
- `services/unified-profile/src/routes/` - Profile API routes
- `services/unified-profile/src/lib/` - Profile aggregation logic
- `services/unified-profile/src/subscribers/` - NATS event subscribers
- `packages/shared-schema/src/schema/users.ts` - User schema

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/profile/` - Profile UI (if exists)

Shared / schema / docs:
- User profile schema in shared-schema package

## 5. Dependencies

Consumes:
- Kintell Connector for language/mentorship data
- Buddy Service for buddy match data
- Upskilling Connector for course completion data
- NATS for event-driven updates

Provides:
- Profile data consumed by all services
- User identity used by Journey Tracking
- Profile flags for program workflows

## 6. Notes

- Single source of truth ensures consistent user identity across all programs.
- External ID mapping links user identities from different systems.
- Journey flags track participant progress across programs (11 flags).
- PII encryption at rest protects sensitive user data.
- Profile completeness scoring helps identify data gaps.
- Consent-based data sharing ensures GDPR compliance.



