---
status: canonical
last_verified: 2025-01-27
verified_against: "codebase-2025-01-27"
---

# CANONICAL DATABASE

> This is the ONLY authoritative document for database schema and operations.

## Overview

The TEEI CSR Platform uses PostgreSQL 15+ for OLTP and ClickHouse for OLAP analytics. Schema managed with Drizzle ORM.

## PostgreSQL Schema

### Core Tables

#### users
- `id` (UUID, PK)
- `email` (VARCHAR(255), UNIQUE, NOT NULL)
- `role` (VARCHAR(50)) - admin | company_user | participant | volunteer
- `first_name`, `last_name` (VARCHAR(100))
- `journey_flags` (JSONB) - Journey tracking flags
- `created_at`, `updated_at` (TIMESTAMP)

#### companies
- `id` (UUID, PK)
- `name` (VARCHAR(255))
- `industry`, `country_code` (VARCHAR)
- `settings` (JSONB) - Feature flags and configuration
- `is_active` (BOOLEAN)
- `created_at` (TIMESTAMP)

#### company_users (Junction)
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies.id)
- `user_id` (UUID, FK → users.id)
- `joined_at` (TIMESTAMP)

#### program_enrollments
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `program_id` (UUID, FK → programs.id)
- `campaign_id` (UUID, FK → program_campaigns.id, nullable)
- `program_type` (VARCHAR) - buddy | language | mentorship | upskilling
- `status` (VARCHAR) - active | completed | dropped
- `enrolled_at`, `completed_at` (TIMESTAMP)

### Program Tables

#### programs
- `id` (UUID, PK)
- `program_key` (VARCHAR, UNIQUE)
- `template_id` (UUID, FK → program_templates.id)
- `name`, `description` (TEXT)
- `program_type` (VARCHAR)
- `beneficiary_group_id` (UUID, FK → beneficiary_groups.id)
- `status` (VARCHAR) - draft | active | paused | completed | archived
- `config` (JSONB) - Effective configuration
- `config_overrides` (JSONB) - Overrides from template
- `start_date`, `end_date` (DATE)
- `created_at`, `updated_at` (TIMESTAMP)

#### program_campaigns
- `id` (UUID, PK)
- `campaign_key` (VARCHAR, UNIQUE)
- `program_id` (UUID, FK → programs.id)
- `company_id` (UUID, FK → companies.id)
- `name`, `description` (TEXT)
- `status` (VARCHAR) - draft | active | paused | completed | archived
- `start_date`, `end_date` (DATE)
- `target_enrollment`, `max_enrollment` (INTEGER)
- `current_enrollment` (INTEGER)
- `budget_allocated`, `budget_spent` (BIGINT) - Cents
- `config_overrides` (JSONB)
- `created_at`, `updated_at` (TIMESTAMP)

#### kintell_sessions
- `id` (UUID, PK)
- `session_type` (VARCHAR) - language | mentorship
- `participant_id` (UUID, FK → users.id)
- `volunteer_id` (UUID, FK → users.id)
- `duration_minutes` (INTEGER)
- `rating` (DECIMAL)
- `feedback_text` (TEXT)
- `language_level` (VARCHAR)
- `session_date` (TIMESTAMP)

#### buddy_matches
- `id` (UUID, PK)
- `participant_id` (UUID, FK → users.id)
- `buddy_id` (UUID, FK → users.id)
- `status` (VARCHAR) - active | completed | ended
- `matched_at` (TIMESTAMP)

#### buddy_events, buddy_checkins, buddy_feedback
- Relationship tracking and feedback for buddy matches

### Metrics & Evidence

#### outcome_scores
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `quarter` (VARCHAR) - YYYY-QN format
- `integration_score` (DECIMAL 0-1)
- `language_score` (DECIMAL 0-1)
- `job_readiness_score` (DECIMAL 0-1)
- `confidence` (DECIMAL 0-1)
- `evidence_lineage` (JSONB) - Source references
- `created_at` (TIMESTAMP)

#### evidence_ledger
- `id` (UUID, PK)
- `evidence_type` (VARCHAR) - session | feedback | milestone
- `source_system` (VARCHAR) - kintell | buddy | upskilling
- `source_id` (VARCHAR)
- `user_id` (UUID, FK → users.id)
- `company_id` (UUID, FK → companies.id, nullable)
- `campaign_id` (UUID, FK → program_campaigns.id, nullable)
- `evidence_data` (JSONB)
- `created_at` (TIMESTAMP)

#### metrics_company_period
- `id` (UUID, PK)
- `company_id` (UUID, FK → companies.id)
- `period` (VARCHAR) - YYYY-QN
- `sroi_ratio` (DECIMAL)
- `vis_score` (DECIMAL 0-100)
- `total_volunteer_hours` (INTEGER)
- `total_investment_cents` (BIGINT)
- `created_at`, `updated_at` (TIMESTAMP)

### Compliance & Privacy

#### consents
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `consent_type` (VARCHAR)
- `status` (VARCHAR) - granted | revoked | pending
- `granted_at`, `revoked_at` (TIMESTAMP)

#### audit_logs
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id, nullable)
- `action` (VARCHAR)
- `resource_type` (VARCHAR)
- `resource_id` (UUID)
- `metadata` (JSONB)
- `created_at` (TIMESTAMP)

#### dsar_requests
- `id` (UUID, PK)
- `user_id` (UUID, FK → users.id)
- `request_type` (VARCHAR) - access | deletion | portability
- `status` (VARCHAR) - pending | processing | completed
- `created_at`, `completed_at` (TIMESTAMP)

## ClickHouse Tables (Analytics)

### metrics_daily
- Daily rollups of SROI, VIS, volunteer hours
- Partitioned by date
- Aggregated by company, campaign, program

### metrics_monthly
- Monthly rollups for reporting
- Partitioned by year-month
- Includes trend calculations

### benchmarks
- Percentile data for cohort comparisons
- Industry benchmarks
- Historical comparisons

### events_raw
- All events from NATS streams
- Partitioned by date
- Used for real-time analytics

### events_aggregated
- Pre-aggregated event data for dashboards
- Reduces query latency

## Database Operations

### Migrations
- Managed by Drizzle ORM
- Location: `packages/shared-schema/src/migrations/`
- Generate: `pnpm --filter @teei/shared-schema db:generate`
- Apply: `pnpm db:migrate`

### Indexes
- Primary keys: UUID indexes on all tables
- Foreign keys: Indexed for join performance
- JSONB: GIN indexes on `journey_flags`, `config`, `evidence_data`
- Search: Full-text indexes on text fields

### Constraints
- Foreign key constraints enforce referential integrity
- Unique constraints on `email`, `program_key`, `campaign_key`
- Check constraints on score ranges (0-1, 0-100)
