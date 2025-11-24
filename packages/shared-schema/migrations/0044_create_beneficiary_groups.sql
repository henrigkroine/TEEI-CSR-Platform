-- Migration 0044: Create Beneficiary Groups Table
-- Purpose: Privacy-first beneficiary group definitions for campaign targeting
-- Date: 2025-11-22
-- Worker: SWARM 6 - Agent 2.2 (migration-engineer)
-- Dependencies: None (foundational table)

-- =============================================================================
-- 1. ENUMS
-- =============================================================================

-- Primary classification of beneficiary populations
CREATE TYPE beneficiary_group_type AS ENUM (
  'refugees',
  'migrants',
  'asylum_seekers',
  'women_in_tech',
  'youth',
  'seniors',
  'displaced_persons',
  'newcomers',
  'students',
  'job_seekers',
  'caregivers',
  'veterans',
  'other'
);

-- Gender focus for programs (aggregated, not individual tracking)
CREATE TYPE gender_focus AS ENUM (
  'all',
  'women',
  'men',
  'non_binary',
  'mixed'
);

-- Language proficiency requirements
CREATE TYPE language_requirement AS ENUM (
  'fluent',
  'conversational',
  'beginner',
  'any',
  'none_required'
);

-- Broad legal status categories (GDPR-safe)
CREATE TYPE legal_status_category AS ENUM (
  'refugee',
  'asylum_seeker',
  'migrant',
  'citizen',
  'student',
  'other'
);

-- Program types eligible for this group
CREATE TYPE eligible_program_type AS ENUM (
  'mentorship',
  'language',
  'buddy',
  'upskilling',
  'weei'
);

-- =============================================================================
-- 2. BENEFICIARY GROUPS TABLE
-- =============================================================================

CREATE TABLE IF NOT EXISTS beneficiary_groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Identification (Group-level only, no individual PII)
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Classification
  group_type beneficiary_group_type NOT NULL,

  -- Geography (Aggregated, not individual addresses)
  country_code VARCHAR(2) NOT NULL, -- ISO 3166-1 alpha-2
  region VARCHAR(100), -- State/province (e.g., "Berlin", "Oslo")
  city VARCHAR(100), -- City level only

  -- Demographics (Aggregated ranges, not individual data)
  age_range JSONB, -- { "min": 18, "max": 35 }
  gender_focus gender_focus DEFAULT 'all',

  -- Language & Communication
  primary_languages JSONB NOT NULL DEFAULT '[]'::jsonb, -- ISO 639-1 codes: ['ar', 'en']
  language_requirement language_requirement DEFAULT 'any',

  -- Legal Status (Broad categories only)
  legal_status_categories JSONB DEFAULT '[]'::jsonb, -- Array of legal_status_category values

  -- Program Eligibility
  eligible_program_types JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of eligible_program_type values
  eligibility_rules JSONB, -- Flexible eligibility criteria

  -- Capacity Constraints
  min_group_size INTEGER,
  max_group_size INTEGER,

  -- Metadata & Discovery
  tags JSONB NOT NULL DEFAULT '[]'::jsonb, -- ['integration', 'employment', 'women']
  partner_organizations JSONB DEFAULT '[]'::jsonb, -- ['UNHCR', 'Red Cross']
  internal_notes TEXT,

  -- Status & Lifecycle
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT true,

  -- Audit Trail
  created_by UUID REFERENCES users(id),
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- =============================================================================
-- 3. INDEXES
-- =============================================================================

-- Query performance indexes
CREATE INDEX IF NOT EXISTS beneficiary_groups_group_type_idx
  ON beneficiary_groups(group_type);

CREATE INDEX IF NOT EXISTS beneficiary_groups_country_code_idx
  ON beneficiary_groups(country_code);

CREATE INDEX IF NOT EXISTS beneficiary_groups_is_active_idx
  ON beneficiary_groups(is_active);

CREATE INDEX IF NOT EXISTS beneficiary_groups_is_public_idx
  ON beneficiary_groups(is_public);

CREATE INDEX IF NOT EXISTS beneficiary_groups_created_at_idx
  ON beneficiary_groups(created_at);

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS beneficiary_groups_country_type_idx
  ON beneficiary_groups(country_code, group_type);

CREATE INDEX IF NOT EXISTS beneficiary_groups_active_public_idx
  ON beneficiary_groups(is_active, is_public);

-- GIN indexes for JSONB fields
CREATE INDEX IF NOT EXISTS beneficiary_groups_tags_gin_idx
  ON beneficiary_groups USING GIN (tags jsonb_path_ops);

CREATE INDEX IF NOT EXISTS beneficiary_groups_eligible_program_types_gin_idx
  ON beneficiary_groups USING GIN (eligible_program_types jsonb_path_ops);

-- =============================================================================
-- 4. UPDATE TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION update_beneficiary_groups_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER beneficiary_groups_updated_at_trigger
  BEFORE UPDATE ON beneficiary_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_beneficiary_groups_timestamp();

-- =============================================================================
-- 5. TABLE COMMENTS
-- =============================================================================

COMMENT ON TABLE beneficiary_groups IS 'Privacy-first beneficiary group definitions for CSR campaign targeting. NO individual PII - only aggregated group-level data.';
COMMENT ON COLUMN beneficiary_groups.group_type IS 'Primary classification of beneficiary population';
COMMENT ON COLUMN beneficiary_groups.country_code IS 'ISO 3166-1 alpha-2 country code';
COMMENT ON COLUMN beneficiary_groups.age_range IS 'Age range ONLY (e.g., {"min": 18, "max": 35}), never specific ages or birthdates';
COMMENT ON COLUMN beneficiary_groups.gender_focus IS 'Program design focus, not individual gender tracking';
COMMENT ON COLUMN beneficiary_groups.primary_languages IS 'ISO 639-1 language codes (e.g., ["ar", "en"])';
COMMENT ON COLUMN beneficiary_groups.legal_status_categories IS 'Broad legal status categories ONLY, never visa numbers or permit details';
COMMENT ON COLUMN beneficiary_groups.eligible_program_types IS 'Which program types can serve this beneficiary group';
COMMENT ON COLUMN beneficiary_groups.eligibility_rules IS 'Flexible JSONB field for complex eligibility logic';
COMMENT ON COLUMN beneficiary_groups.tags IS 'Tags for search and filtering';
COMMENT ON COLUMN beneficiary_groups.partner_organizations IS 'Partner organization names (no contact details or agreements)';
COMMENT ON COLUMN beneficiary_groups.is_active IS 'Is this group active and available for new campaigns?';
COMMENT ON COLUMN beneficiary_groups.is_public IS 'Is this group publicly visible to all companies?';
