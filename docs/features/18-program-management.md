---
id: 18
key: program-management
name: Program Management
category: User Management
status: production
lastReviewed: 2025-01-27
---

# Program Management

## 1. Summary

- Program template and instance management system for creating and managing CSR program instances.
- Features template system with configurable defaults, program instantiation with campaign association, capacity tracking, and participant enrollment.
- Supports multiple program types (Buddy, Language Connect, Upskilling, Mentorship) with flexible configuration.
- Used by program coordinators and company admins for program setup, configuration, and lifecycle management.

## 2. Current Status

- Overall status: `production`

- Fully implemented Program Service with 10 TypeScript files. Core features include template system with configurable defaults, program instantiation with campaign association, capacity tracking, participant enrollment, and template-group compatibility validation. Campaign Service (37 TypeScript files) includes campaign creation, lifecycle management, capacity tracking, pricing insights, and upsell detection. Template system exists in `packages/program-templates/` with 5 TypeScript files. Database schema includes `program-templates` and `program-instances` tables.

- Documentation includes `docs/PROGRAM_CONCEPTS.md` and `docs/PROGRAM_TEMPLATES_GUIDE.md` with comprehensive program concepts and template guide. Service includes config merging, instance auto-creation, and state transitions.

## 3. What's Next

- Add program template versioning for tracking template changes over time.
- Implement program instance cloning for quick setup of similar programs.
- Enhance capacity tracking with more granular quota management.
- Add program performance analytics and reporting.

## 4. Code & Files

Backend / services:
- `services/program-service/` - Program service (10 *.ts files)
- `services/campaigns/` - Campaign service (37 *.ts files)
- `packages/program-templates/` - Template system (5 *.ts files)
- `packages/shared-schema/src/schema/program-templates.ts` - Template schema
- `packages/shared-schema/src/schema/program-instances.ts` - Instance schema

Frontend / UI:
- `apps/corp-cockpit-astro/src/components/campaigns/` - Campaign UI (11 files)

Shared / schema / docs:
- `docs/PROGRAM_CONCEPTS.md` - Program concepts
- `docs/PROGRAM_TEMPLATES_GUIDE.md` - Template guide
- `docs/CAMPAIGN_LIFECYCLE.md` - Campaign lifecycle docs

## 5. Dependencies

Consumes:
- Template System for program templates
- Campaign Management for campaign associations
- Unified Profile for participant data

Provides:
- Program instances consumed by Campaign Management
- Program data used by Journey Tracking
- Program templates for campaign creation

## 6. Notes

- Template system allows configurable defaults with campaign-level overrides.
- Program instantiation automatically creates initial ProgramInstance when campaign starts.
- Template-group compatibility validation ensures valid program configurations.
- Config merging tracks which fields were overridden for audit purposes.
- Capacity tracking supports multiple pricing models (seats, credits, IAAS, bundle).



