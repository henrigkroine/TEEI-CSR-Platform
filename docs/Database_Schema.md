## TEEI CSR Platform - Database Schema

### Overview

The database schema supports corporate impact measurement, volunteer tracking, session management, and outcome quantification. Designed for GDPR compliance with privacy-by-design principles.

### Core Entities

#### Companies
- **Table**: `companies`
- **Purpose**: Corporate partners using the platform
- **Key Fields**:
  - `id`: UUID primary key
  - `name`: Company name
  - `industry`, `size`, `country_code`: Metadata
  - `settings`: JSONB for feature flags and configuration
  - `is_active`: Soft delete flag

#### Volunteers
- **Table**: `volunteers`
- **Purpose**: Corporate employees volunteering time
- **Key Fields**:
  - `company_id`: Foreign key to companies
  - `external_id`: ID from company's HR system
  - `email`, `first_name`, `last_name`: PII (field-level encryption in production)
  - `role`, `department`: For segmentation

#### Sessions
- **Table**: `sessions`
- **Purpose**: Track buddy, language, and mentorship sessions
- **Key Fields**:
  - `volunteer_id`: Foreign key to volunteers
  - `participant_id`: Anonymized participant reference
  - `session_type`: 'buddy', 'language', 'mentorship'
  - `duration_minutes`: Session length
  - `external_session_id`: Reference to Kintell or other platform

#### Outcome Scores
- **Table**: `outcome_scores`
- **Purpose**: Quantitative metrics (0-1 scale) for three dimensions
- **Dimensions**:
  - `integration`: Social integration score
  - `language`: Language proficiency (CEFR-based)
  - `job_readiness`: Employment readiness composite
- **Key Fields**:
  - `score`: Decimal (0-1)
  - `quarter`: Period (YYYY-QN format)
  - `confidence`: Model confidence (0-1)
  - `evidence_lineage`: JSONB array of source references

#### Q2Q Insights
- **Table**: `q2q_insights`
- **Purpose**: Qualitative to Quantitative AI conversions
- **Key Fields**:
  - `insight_text`: Generated insight from feedback
  - `dimensions`: JSONB map of dimension scores
  - `evidence_lineage`: Provenance chain

### Privacy & Security

- **PII Segmentation**: Email, names encrypted at rest (not implemented in schema, requires application-level encryption)
- **Participant Anonymization**: `participant_id` is a UUID with no direct PII
- **Company Isolation**: All queries enforce `company_id` filtering (tenant isolation)
- **Consent Tracking**: Stored in `settings` JSONB (expandable schema)

### Indexes

Optimized for:
- Company-scoped queries (most common access pattern)
- Time-series analysis (quarter, measured_at)
- Dimension filtering (outcome_scores.dimension)
- Volunteer lookups (external_id composite index)

### Migration Strategy

- **Version**: 001_initial.ts
- **Tool**: Custom TypeScript migration runner
- **Rollback**: Transaction-based, atomic migrations
- **Future**: Add migration versioning table

### Seed Data

Sample data includes:
- 1 company (ACME Corp)
- 5 volunteers
- 30 sessions over 6 months
- 15 outcome scores (3 dimensions × 5 participants)

Run with: `pnpm --filter @teei/reporting-service exec tsx src/db/seed.ts`

### Relationships

```
companies (1) ─── (N) volunteers
volunteers (1) ─── (N) sessions
volunteers (1) ─── (N) volunteer_hours
sessions (1) ─── (N) session_feedback
sessions (N) ─── (N) outcome_scores (via participant_id)
companies (1) ─── (N) outcome_scores
companies (1) ─── (N) q2q_insights
```

### Future Enhancements

- [ ] Add migration versioning table
- [ ] Implement soft deletes for audit trail
- [ ] Add full-text search on feedback
- [ ] Create materialized views for dashboard queries
- [ ] Add pgvector for semantic search on insights
