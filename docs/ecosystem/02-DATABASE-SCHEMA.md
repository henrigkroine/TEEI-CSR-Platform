# TEEI Database Schema

**Last Updated**: 2025-01-27  
**Database**: PostgreSQL 16 (Primary), ClickHouse 24.x (Analytics)

---

## Database Overview

| Database | Type | Purpose | Tables | Location |
|----------|------|---------|--------|----------|
| **PostgreSQL** | Primary | Main data store | 50+ | `packages/shared-schema/` |
| **ClickHouse** | Analytics | Time-series analytics | 6+ views | `services/analytics/` |

**Connection**: All services use `DATABASE_URL` environment variable  
**ORM**: Drizzle ORM  
**Migrations**: Located in `packages/shared-schema/src/migrations/`

---

## PostgreSQL Tables (50+)

### Core Identity & Users (10 tables)

#### `users`
- **Purpose**: Core user records with journey flags
- **Columns**:
  - `id` (UUID, PK)
  - `email` (VARCHAR(255), UNIQUE)
  - `role` (VARCHAR(50)) - admin, company_user, participant, volunteer
  - `first_name`, `last_name` (VARCHAR(100))
  - `journey_flags` (JSONB) - User journey state
  - `created_at`, `updated_at` (TIMESTAMPTZ)
- **Indexes**: email, role, journey_flags (GIN)
- **Relationships**: Referenced by all user-related tables

#### `companies`
- **Purpose**: Company/tenant records
- **Columns**:
  - `id` (UUID, PK)
  - `name` (VARCHAR(255))
  - `industry`, `country` (VARCHAR(100))
  - `features` (JSONB)
  - `ai_budget_monthly`, `ai_spend_current_month` (DECIMAL)
  - `created_at` (TIMESTAMPTZ)
- **Indexes**: name

#### `company_users`
- **Purpose**: User-company associations
- **Columns**: `id`, `company_id` (FK), `user_id` (FK), `joined_at`
- **Unique**: (company_id, user_id)

#### `program_enrollments`
- **Purpose**: Program participation tracking
- **Columns**:
  - `id`, `user_id` (FK), `program_type`, `program_instance_id` (FK)
  - `enrolled_at`, `status`, `completed_at`
- **Indexes**: user_id, program_type, status

#### `external_id_mappings` (Legacy)
- **Purpose**: External system ID mapping
- **Columns**: `id`, `user_id` (FK), `external_system`, `external_id`, `created_at`
- **Unique**: (external_system, external_id)

#### `user_external_ids`
- **Purpose**: External identity links (replaces external_id_mappings)
- **Columns**:
  - `id`, `profile_id` (FK), `provider`, `external_id`
  - `created_at`, `updated_at`, `metadata` (JSONB)
- **Unique**: (provider, external_id)

#### `identity_linking_audit`
- **Purpose**: Identity operation audit log
- **Columns**: `id`, `profile_id` (FK), `provider`, `external_id`, `operation`, `performed_by`, `performed_at`, `metadata` (JSONB)

#### `privacy_requests`
- **Purpose**: GDPR request tracking
- **Columns**:
  - `id`, `user_id` (FK), `request_type` (ENUM), `status` (ENUM)
  - `progress`, `result_path`, `error_message`
  - `requested_at`, `completed_at`
- **Indexes**: user_id, status

#### `privacy_audit_log`
- **Purpose**: Privacy operation audit
- **Columns**: `id`, `request_id` (FK), `action`, `details` (JSONB), `performed_by`, `performed_at`

---

### Buddy System (5 tables)

#### `buddy_matches`
- **Purpose**: Buddy pair records
- **Columns**:
  - `id`, `participant_id` (FK), `buddy_id` (FK)
  - `matched_at`, `status`, `ended_at`
  - `program_instance_id` (FK)
- **Indexes**: participant_id, buddy_id, status, program_instance_id

#### `buddy_events`
- **Purpose**: Buddy activities (hangouts, workshops, etc.)
- **Columns**: `id`, `match_id` (FK), `event_type`, `event_date`, `description`, `location`, `created_at`

#### `buddy_checkins`
- **Purpose**: Check-in submissions
- **Columns**: `id`, `match_id` (FK), `checkin_date`, `mood`, `notes`

#### `buddy_feedback`
- **Purpose**: Qualitative feedback
- **Columns**: `id`, `match_id` (FK), `from_role`, `rating`, `feedback_text`, `submitted_at`

#### `buddy_system_events`
- **Purpose**: Event log (matches, meetings, milestones)
- **Columns**:
  - `id`, `event_id` (UNIQUE), `event_type`, `user_id`, `timestamp`
  - `payload` (JSONB), `correlation_id`, `processed_at`, `derived_metrics` (JSONB)
- **Indexes**: user_id+timestamp, event_type, event_id

---

### Kintell Integration (2 tables)

#### `kintell_sessions`
- **Purpose**: Skills taxonomy sessions
- **Columns**:
  - `id`, `external_session_id`, `session_type` (language|mentorship)
  - `participant_id` (FK), `volunteer_id` (FK)
  - `batch_id`, `program_instance_id` (FK)
  - `scheduled_at`, `completed_at`, `duration_minutes`
  - `rating` (DECIMAL 0-1), `feedback_text`, `language_level` (CEFR)
  - `topics` (JSONB), `metadata` (JSONB), `created_at`
- **Indexes**: batch_id, program_instance_id, external_session_id, participant_id, volunteer_id, completed_at

#### `learning_progress` (Upskilling)
- **Purpose**: Course progress tracking
- **Columns**:
  - `id`, `user_id` (FK), `provider`, `course_id`, `course_name`
  - `status`, `progress_percent`, `started_at`, `completed_at`
  - `credential_ref`, `metadata` (JSONB), `program_instance_id` (FK)
  - `created_at`, `updated_at`
- **Indexes**: user_id, provider, status, program_instance_id

---

### GDPR Compliance (6 tables)

#### `user_consents`
- **Purpose**: GDPR Article 7 - Consent records
- **Columns**:
  - `id`, `user_id` (FK), `purpose`, `consent_given`, `consent_text`, `consent_version`
  - `consent_date`, `consent_method`, `ip_address`, `user_agent`
  - `withdrawn_at`, `withdrawal_reason`, `expires_at`
  - `created_at`, `updated_at`
- **Indexes**: user_id, purpose, consent_given

#### `data_subject_requests`
- **Purpose**: GDPR Articles 15-22 - DSAR tracking
- **Columns**:
  - `id`, `user_id` (FK), `request_type`, `status`
  - `requested_at`, `requested_by`, `request_reason`, `ip_address`
  - `assigned_to`, `processing_started_at`, `completed_at`
  - `response_data` (JSONB), `response_file_url`, `rejection_reason`
  - `deletion_scheduled_for`, `deletion_completed_at`, `systems_deleted` (JSONB)
  - `verification_hash`, `notes`, `updated_at`
- **Indexes**: user_id, status, request_type, requested_at

#### `data_processing_records`
- **Purpose**: GDPR Article 30 - Processing activities
- **Columns**:
  - `id`, `user_id` (FK), `activity`, `purpose`, `legal_basis`
  - `data_categories` (JSONB), `recipient_categories` (JSONB)
  - `processed_at`, `processed_by`, `system_component`
  - `retention_period`, `scheduled_deletion_date`, `metadata` (JSONB)
- **Indexes**: user_id, activity, processed_at

#### `data_breach_incidents`
- **Purpose**: GDPR Article 33 - Breach notifications
- **Columns**:
  - `id`, `incident_type`, `severity`, `status`
  - `discovered_at`, `discovered_by`, `reported_to_authority_at`
  - `affected_user_count`, `affected_data_categories` (JSONB), `risk_to_rights`
  - `containment_measures`, `notification_plan`, `users_notified_at`
  - `root_cause`, `remedial_actions`, `resolved_at`
  - `notes`, `created_at`, `updated_at`
- **Indexes**: status, severity, discovered_at

#### `consent_text_versions`
- **Purpose**: Versioned consent text for audit
- **Columns**: `id`, `purpose`, `version`, `language`, `title`, `body`, `summary`, `effective_from`, `effective_until`, `created_by`, `created_at`
- **Unique**: (purpose, version, language)

#### `data_retention_policies`
- **Purpose**: Data retention and deletion policies
- **Columns**: `id`, `data_category` (UNIQUE), `retention_period_days`, `legal_basis`, `deletion_method`, `dependent_categories` (JSONB), `active`, `effective_from`, `created_by`, `created_at`, `updated_at`
- **Indexes**: data_category, active

---

### Branding & White-Label (4 tables)

#### `branding_themes`
- **Purpose**: Per-tenant branding configurations
- **Columns**:
  - `id`, `tenant_id` (FK), `name`, `is_active`
  - `tokens_json` (JSONB) - Theme tokens (colors, typography, spacing, radii, charts)
  - `created_by`, `updated_by`, `created_at`, `updated_at`
- **Unique**: One active theme per tenant
- **Indexes**: tenant_id, is_active, name

#### `branding_assets`
- **Purpose**: Brand assets (logos, favicons, watermarks)
- **Columns**:
  - `id`, `theme_id` (FK), `kind` (ENUM: logo, favicon, watermark, hero_image)
  - `url`, `hash` (SHA-256), `mime_type`, `size`, `width`, `height`
  - `metadata` (JSONB), `uploaded_by`, `created_at`, `updated_at`
- **Unique**: One asset per kind per theme
- **Indexes**: theme_id, kind

#### `branding_domains`
- **Purpose**: Custom subdomain mapping for white-label routing
- **Columns**: `id`, `tenant_id` (FK), `domain` (UNIQUE), `is_verified`, `verification_token`, `verified_at`, `created_by`, `created_at`, `updated_at`
- **Indexes**: tenant_id, domain, is_verified

#### `branding_audit_log`
- **Purpose**: Audit trail for branding changes
- **Columns**: `id`, `tenant_id` (FK), `resource_type`, `resource_id`, `action`, `changes` (JSONB), `performed_by`, `ip_address`, `user_agent`, `performed_at`
- **Indexes**: tenant_id, resource_type+resource_id, performed_at, performed_by

---

### Program Management (4 tables)

#### `program_templates`
- **Purpose**: Reusable program templates
- **Columns**:
  - `id`, `name`, `type` (ENUM), `version`, `description`
  - `is_active`, `is_public`, `tags` (JSONB)
  - `suitable_for_groups` (JSONB), `outcome_metrics` (JSONB)
  - `default_config` (JSONB), `created_by`, `created_at`, `updated_at`
- **Indexes**: type, is_active+is_public, version, created_at, created_by, tags (GIN), suitable_for_groups (GIN), outcome_metrics (GIN), default_config (GIN)

#### `program_instances`
- **Purpose**: Active program instances
- **Columns**:
  - `id`, `campaign_id` (FK), `company_id` (FK), `template_id` (FK)
  - `beneficiary_group_id` (FK), `status` (ENUM), `name`
  - `start_date`, `end_date`, `config` (JSONB)
  - `outcome_scores` (JSONB), `last_activity_at`, `created_at`, `updated_at`
- **Indexes**: campaign_id, company_id, status, date_range, template_id, beneficiary_group_id, is_active, company+status+date, campaign+status, last_activity, config (GIN), outcome_scores (GIN)

#### `beneficiary_groups`
- **Purpose**: Beneficiary group definitions
- **Columns**:
  - `id`, `name`, `group_type` (ENUM), `country_code`
  - `is_active`, `is_public`, `description`
  - `tags` (JSONB), `eligible_program_types` (JSONB)
  - `created_at`, `updated_at`
- **Indexes**: group_type, country_code, is_active, is_public, created_at, country+type, active+public, tags (GIN), eligible_program_types (GIN)

#### `campaigns`
- **Purpose**: Campaign lifecycle management
- **Columns**:
  - `id`, `company_id` (FK), `template_id` (FK), `beneficiary_group_id` (FK)
  - `status` (ENUM), `pricing_model` (ENUM), `priority` (ENUM)
  - `name`, `description`, `start_date`, `end_date`
  - `volunteer_capacity`, `beneficiary_capacity`, `budget_cents`
  - `volunteers_enrolled`, `beneficiaries_enrolled`, `budget_spent_cents`
  - `capacity_utilization`, `upsell_score`, `is_high_value`
  - `quarter`, `tags` (JSONB), `evidence_snippet_ids` (JSONB)
  - `config_overrides` (JSONB), `created_at`, `updated_at`
- **Indexes**: company_id, status, template_id, beneficiary_group_id, dates, pricing_model, capacity_utilization, upsell_score, is_high_value, quarter, tags (GIN), evidence_snippet_ids (GIN), config_overrides (GIN)

#### `campaign_metrics_snapshots`
- **Purpose**: Time-series campaign metrics
- **Columns**:
  - `id`, `campaign_id` (FK), `snapshot_date`
  - `volunteers_enrolled`, `beneficiaries_enrolled`, `budget_spent_cents`
  - `volunteers_utilization`, `beneficiaries_utilization`, `budget_utilization`
  - `sroi_ratio`, `vis_score`, `full_snapshot` (JSONB)
  - `created_at`
- **Indexes**: campaign_id+snapshot_date, snapshot_date, utilization indexes, sroi, vis, created_at, full_snapshot (GIN)

---

### Q2Q AI & Evidence (3+ tables)

#### `outcome_scores`
- **Purpose**: AI classification results
- **Columns**: `id`, `user_id` (FK), `evidence_snippet_id` (FK), `outcome_type`, `score`, `confidence`, `model_version`, `created_at`
- **Indexes**: user_id, evidence_snippet_id, outcome_type

#### `evidence_snippets`
- **Purpose**: Extracted evidence with embeddings
- **Columns**:
  - `id`, `company_id` (FK), `source_type`, `source_id`
  - `content`, `embedding` (vector), `metadata` (JSONB)
  - `program_instance_id` (FK), `campaign_id` (FK)
  - `created_at`
- **Indexes**: company_id, program_instance_id, campaign_id, created_at

#### `ai_prompt_audit`
- **Purpose**: AI prompt audit trail
- **Columns**:
  - `id`, `company_id` (FK), `request_id`, `operation`, `model_name`
  - `prompt_text`, `response_text`, `status`
  - `safety_check_passed`, `evidence_gate_passed`, `budget_check_passed`
  - `tokens_input`, `tokens_output`, `cost_usd`
  - `evidence_ids` (JSONB), `created_at`
- **Indexes**: company_id+created_at, request_id, status, operation, model_name, safety/evidence/budget failed, cost, evidence_ids (GIN)

---

### Reporting (6+ tables)

#### `report_lineage`
- **Purpose**: Report evidence citations
- **Columns**:
  - `id`, `company_id` (FK), `report_id`
  - `period_start`, `period_end`, `sections` (JSONB)
  - `model_name`, `tokens_total`, `estimated_cost_usd`
  - `locale`, `created_at`
- **Indexes**: company_id, report_id, period_start, period_end

#### `report_citations`
- **Purpose**: Citations linking reports to evidence
- **Columns**: `id`, `report_id` (FK), `evidence_snippet_id` (FK), `paragraph_index`, `created_at`

#### `scheduled_reports`
- **Purpose**: Report schedules
- **Columns**: `id`, `company_id` (FK), `template_id`, `schedule_cron`, `next_run_at`, `last_run_at`, `status`, `created_at`, `updated_at`

#### `saved_views`
- **Purpose**: Dashboard bookmarks
- **Columns**: `id`, `company_id` (FK), `user_id` (FK), `name`, `view_config` (JSONB), `created_at`, `updated_at`

#### `share_links`
- **Purpose**: Public/private sharing
- **Columns**: `id`, `view_id` (FK), `token_hash`, `expires_at`, `is_public`, `created_at`

#### `report_themes`
- **Purpose**: Custom report themes
- **Columns**: `id`, `company_id` (FK), `name`, `theme_config` (JSONB), `created_at`, `updated_at`

---

### Metrics & Analytics (4+ tables)

#### `sroi_calculations`
- **Purpose**: SROI calculation results
- **Columns**: `id`, `company_id` (FK), `period_start`, `period_end`, `sroi_ratio`, `total_investment_cents`, `total_value_cents`, `created_at`

#### `vis_calculations`
- **Purpose**: VIS score snapshots
- **Columns**: `id`, `user_id` (FK), `score`, `calculation_date`, `decay_factor`, `created_at`

#### `metrics_company_period`
- **Purpose**: Aggregated metrics per company/period
- **Columns**: `id`, `company_id` (FK), `period` (VARCHAR), `sroi_ratio`, `vis_score`, `total_volunteer_hours`, `total_investment_cents`, `created_at`, `updated_at`
- **Indexes**: company_id, period

#### `co2e_calculations`
- **Purpose**: Carbon footprint calculations
- **Columns**: `id`, `company_id` (FK), `activity_type`, `co2e_kg`, `calculation_date`, `created_at`

---

### Notifications (4 tables)

#### `notifications_queue`
- **Purpose**: Notification records
- **Columns**: `id`, `company_id` (FK), `user_id` (FK), `channel`, `template_id`, `status`, `scheduled_at`, `sent_at`, `delivery_status`, `metadata` (JSONB), `created_at`

#### `notifications_delivery_receipts`
- **Purpose**: Delivery tracking
- **Columns**: `id`, `notification_id` (FK), `provider`, `provider_message_id`, `delivered_at`, `created_at`

#### `notifications_quotas`
- **Purpose**: Per-tenant limits
- **Columns**: `id`, `company_id` (FK), `channel`, `quota_limit`, `quota_used`, `quota_reset_at`, `created_at`, `updated_at`

#### `notification_templates`
- **Purpose**: Email templates
- **Columns**: `id`, `company_id` (FK), `name`, `subject`, `body_html`, `body_text`, `variables` (JSONB), `created_at`, `updated_at`

---

### Impact-In (2 tables)

#### `impact_deliveries`
- **Purpose**: External platform deliveries
- **Columns**: `id`, `company_id` (FK), `platform`, `delivery_status`, `payload` (JSONB), `response` (JSONB), `retry_count`, `created_at`, `updated_at`

#### `platform_mappings`
- **Purpose**: Field mapping configurations
- **Columns**: `id`, `platform`, `mapping_config` (JSONB), `created_at`, `updated_at`

---

### Infrastructure (5+ tables)

#### `idempotency_keys`
- **Purpose**: Request deduplication
- **Columns**: `id`, `key_hash` (UNIQUE), `request_body` (JSONB), `response_body` (JSONB), `expires_at`, `created_at`

#### `webhooks`
- **Purpose**: Webhook registrations
- **Columns**: `id`, `company_id` (FK), `url`, `events` (JSONB), `secret`, `status`, `created_at`, `updated_at`

#### `publications`
- **Purpose**: Public impact publications
- **Columns**:
  - `id`, `tenant_id` (FK), `slug` (UNIQUE), `title`, `status` (ENUM), `visibility` (ENUM)
  - `blocks` (JSONB), `metadata` (JSONB), `created_at`, `updated_at`
- **Indexes**: tenant_id, slug, status, visibility

#### `publication_blocks`
- **Purpose**: Publication content blocks
- **Columns**: `id`, `publication_id` (FK), `kind` (ENUM), `order`, `content` (JSONB), `created_at`

#### `publication_tokens`
- **Purpose**: Token-based access to publications
- **Columns**: `id`, `publication_id` (FK), `token_hash`, `expires_at`, `created_at`

#### `publication_views`
- **Purpose**: Publication view tracking
- **Columns**: `id`, `publication_id` (FK), `visitor_hash`, `viewed_at`, `metadata` (JSONB)

---

## ClickHouse Tables (Analytics)

### Materialized Views (6)

1. **`metrics_daily`** - Daily rollups of SROI, VIS, volunteer hours
2. **`metrics_weekly`** - Weekly aggregations
3. **`metrics_monthly`** - Monthly rollups for reporting
4. **`metrics_quarterly`** - Quarterly aggregations
5. **`cohort_analysis`** - Cohort tracking
6. **`benchmarks`** - Percentile data for cohort comparisons

### Raw Tables

- **`events_raw`** - All events from NATS streams (partitioned by date)
- **`events_aggregated`** - Pre-aggregated event data for dashboards

---

## Migration Files

**Location**: `packages/shared-schema/src/migrations/`

**Base Migrations**:
- `0000_base_schema.sql` - Core tables (users, companies, etc.)
- `0001_add_password_hash.sql` - Password hashing
- `0002_kintell_upskilling_tables.sql` - Kintell & upskilling
- `0003_buddy_tables.sql` - Buddy system
- `001_gdpr_compliance.sql` - GDPR tables
- `002_branding_white_label.sql` - Branding tables

**Feature Migrations** (50+ total):
- Campaign management (0044-0048)
- Program templates (0045)
- Evidence ledger (0043)
- AI prompt audit (0043)
- Scenario planner (0043)
- Publications (0022)
- RBAC (0013)
- And many more...

---

## Database Operations

### Migrations
```bash
# Generate migration
pnpm --filter @teei/shared-schema db:generate

# Apply migrations
pnpm db:migrate

# Reset database
pnpm db:reset

# Seed data
pnpm db:seed
```

### Indexes
- **Primary keys**: UUID indexes on all tables
- **Foreign keys**: Indexed for join performance
- **JSONB**: GIN indexes on `journey_flags`, `config`, `evidence_data`, `metadata`
- **Search**: Full-text indexes on text fields
- **Composite**: Multi-column indexes for common queries

### Constraints
- Foreign key constraints enforce referential integrity
- Unique constraints on `email`, `program_key`, `campaign_key`
- Check constraints on enums and data ranges

---

**Next**: See [03-API-ENDPOINTS.md](./03-API-ENDPOINTS.md) for API documentation.
