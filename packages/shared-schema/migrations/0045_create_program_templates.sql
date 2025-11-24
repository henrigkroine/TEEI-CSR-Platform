-- Migration 0045: Create Program Templates Table
-- Purpose: Reusable program templates for mentorship, language, buddy, upskilling, weei
-- Date: 2025-11-22
-- Worker: SWARM 6 - Agent 2.2 (migration-engineer)
-- Dependencies: users table (for created_by FK)

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

-- Program types supported by the platform
CREATE TYPE program_type AS ENUM (
  'mentorship',
  'language',
  'buddy',
  'upskilling',
  'weei'
);

-- =============================================================================
-- 2. PROGRAM TEMPLATES TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS program_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identity
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Classification
  program_type program_type NOT NULL,
  version VARCHAR(20) NOT NULL DEFAULT '1.0.0', -- Semantic versioning

  -- Configuration (JSONB - flexible, type-safe via TypeScript)
  -- Structure depends on program_type (MentorshipConfig, LanguageConfig, etc.)
  default_config JSONB NOT NULL,

  -- Capacity Defaults (can be overridden in campaigns)
  default_min_participants INTEGER NOT NULL DEFAULT 1,
  default_max_participants INTEGER NOT NULL DEFAULT 50,
  default_volunteers_needed INTEGER NOT NULL DEFAULT 1,

  -- Outcomes Tracked
  -- Array of outcome metric keys: ['integration', 'language', 'job_readiness']
  outcome_metrics JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Eligibility & Compatibility
  -- Tags matching BeneficiaryGroup.tags to determine compatibility
  suitable_for_groups JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Monetization Hints (for pricing guidance)
  estimated_cost_per_participant DECIMAL(10, 2), -- USD/EUR
  estimated_hours_per_volunteer DECIMAL(8, 2), -- Total hours commitment

  -- Visibility & Permissions
  is_active BOOLEAN NOT NULL DEFAULT true, -- Can be used for new campaigns
  is_public BOOLEAN NOT NULL DEFAULT true, -- Available to all companies

  -- Ownership
  created_by UUID REFERENCES users(id),

  -- Template metadata
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Deprecation
  deprecated_at TIMESTAMP WITH TIME ZONE,
  superseded_by UUID REFERENCES program_templates(id)
);

-- =============================================================================
-- 3. INDEXES
-- =============================================================================

-- Indexes for performance
CREATE INDEX IF NOT EXISTS program_templates_type_idx
  ON program_templates(program_type);

CREATE INDEX IF NOT EXISTS program_templates_active_public_idx
  ON program_templates(is_active, is_public);

CREATE INDEX IF NOT EXISTS program_templates_version_idx
  ON program_templates(version);

CREATE INDEX IF NOT EXISTS program_templates_created_at_idx
  ON program_templates(created_at);

CREATE INDEX IF NOT EXISTS program_templates_created_by_idx
  ON program_templates(created_by);

-- GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS program_templates_tags_gin_idx
  ON program_templates USING GIN (tags jsonb_path_ops);

CREATE INDEX IF NOT EXISTS program_templates_suitable_for_groups_gin_idx
  ON program_templates USING GIN (suitable_for_groups jsonb_path_ops);

CREATE INDEX IF NOT EXISTS program_templates_outcome_metrics_gin_idx
  ON program_templates USING GIN (outcome_metrics jsonb_path_ops);

CREATE INDEX IF NOT EXISTS program_templates_default_config_gin_idx
  ON program_templates USING GIN (default_config jsonb_path_ops);

-- =============================================================================
-- 4. UPDATE TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION update_program_templates_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER program_templates_updated_at_trigger
  BEFORE UPDATE ON program_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_program_templates_timestamp();

-- =============================================================================
-- 5. TABLE COMMENTS
-- =============================================================================

COMMENT ON TABLE program_templates IS 'Reusable program templates for mentorship, language, buddy, upskilling, and weei programs. Templates serve as blueprints for campaigns.';
COMMENT ON COLUMN program_templates.program_type IS 'Type of program: mentorship, language, buddy, upskilling, or weei';
COMMENT ON COLUMN program_templates.version IS 'Semantic version (e.g., 1.0.0) for template evolution tracking';
COMMENT ON COLUMN program_templates.default_config IS 'JSONB configuration specific to program type (structure varies by program_type)';
COMMENT ON COLUMN program_templates.default_min_participants IS 'Recommended minimum participants for program viability';
COMMENT ON COLUMN program_templates.default_max_participants IS 'Recommended maximum participants for program capacity';
COMMENT ON COLUMN program_templates.default_volunteers_needed IS 'Recommended number of volunteers needed';
COMMENT ON COLUMN program_templates.outcome_metrics IS 'Array of outcome metrics tracked by this template';
COMMENT ON COLUMN program_templates.suitable_for_groups IS 'Tags matching beneficiary_groups.tags for compatibility checks';
COMMENT ON COLUMN program_templates.estimated_cost_per_participant IS 'Estimated cost per participant (USD/EUR) for pricing guidance';
COMMENT ON COLUMN program_templates.estimated_hours_per_volunteer IS 'Estimated total hours per volunteer for capacity planning';
COMMENT ON COLUMN program_templates.is_active IS 'Can be used for new campaigns';
COMMENT ON COLUMN program_templates.is_public IS 'Available to all companies (false = private/custom template)';
COMMENT ON COLUMN program_templates.deprecated_at IS 'When this template was marked as deprecated';
COMMENT ON COLUMN program_templates.superseded_by IS 'ID of newer template version that replaces this one';
