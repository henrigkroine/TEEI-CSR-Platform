-- Migration 0020: Benchmarking Opt-In and Cohort Management
--
-- Adds tables for privacy-preserving cohort benchmarking:
-- 1. Cohort opt-in consent tracking (GDPR-compliant)
-- 2. Saved cohort definitions (custom benchmark groups)
-- 3. Audit trails for data sharing

-- ============================================================================
-- Cohort Opt-In Consent Tracking
-- ============================================================================

-- Track company consent for sharing data in benchmarks
-- Companies must explicitly opt-in to participate in cohort comparisons
CREATE TABLE IF NOT EXISTS cohort_opt_ins (
  company_id UUID PRIMARY KEY REFERENCES companies(id) ON DELETE CASCADE,

  -- Consent status
  data_sharing_consent BOOLEAN NOT NULL DEFAULT false,
  consent_date TIMESTAMPTZ,

  -- Consent scope (granular control)
  consent_scope VARCHAR(50) NOT NULL DEFAULT 'none',
  -- Values: 'none', 'all', 'industry_only', 'region_only', 'size_only', 'custom'

  -- Custom scope (JSONB for flexible consent)
  custom_scope JSONB,
  -- Example: {"dimensions": ["industry", "region"], "metrics": ["sroi_ratio", "vis_score"]}

  -- Opt-out reason (for analytics)
  opt_out_reason TEXT,

  -- Timestamps
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Ensure consent_date is set when consent is given
  CONSTRAINT consent_date_required CHECK (
    (data_sharing_consent = false) OR
    (data_sharing_consent = true AND consent_date IS NOT NULL)
  ),

  -- Ensure consent_scope is valid
  CONSTRAINT valid_consent_scope CHECK (
    consent_scope IN ('none', 'all', 'industry_only', 'region_only', 'size_only', 'custom')
  ),

  -- Custom scope required when consent_scope is 'custom'
  CONSTRAINT custom_scope_required CHECK (
    (consent_scope != 'custom') OR
    (consent_scope = 'custom' AND custom_scope IS NOT NULL)
  )
);

-- Index for fast consent lookups (most common query)
CREATE INDEX idx_cohort_opt_ins_consent
ON cohort_opt_ins(data_sharing_consent)
WHERE data_sharing_consent = true;

-- Index for scope-based queries
CREATE INDEX idx_cohort_opt_ins_scope
ON cohort_opt_ins(consent_scope)
WHERE data_sharing_consent = true;

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cohort_opt_ins_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cohort_opt_ins_timestamp
BEFORE UPDATE ON cohort_opt_ins
FOR EACH ROW
EXECUTE FUNCTION update_cohort_opt_ins_timestamp();

-- ============================================================================
-- Saved Cohort Definitions
-- ============================================================================

-- Store custom cohort definitions for reusable benchmark groups
-- Allows companies to create and share custom comparison groups
CREATE TABLE IF NOT EXISTS saved_cohorts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Ownership
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Cohort metadata
  name VARCHAR(255) NOT NULL,
  description TEXT,

  -- Cohort dimensions (JSONB for flexibility)
  dimensions JSONB NOT NULL,
  -- Example: {
  --   "industry": ["technology", "finance"],
  --   "region": ["uk", "no"],
  --   "employeeRange": "50-200",
  --   "programTypes": ["buddy", "mentorship"]
  -- }

  -- Sharing settings
  is_public BOOLEAN NOT NULL DEFAULT false,
  shared_with_company_ids UUID[], -- Array of company IDs with access

  -- Privacy settings
  min_cohort_size INT NOT NULL DEFAULT 5, -- k-anonymity threshold
  apply_dp_noise BOOLEAN NOT NULL DEFAULT true, -- Differential privacy

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_accessed_at TIMESTAMPTZ,

  -- Soft delete
  deleted_at TIMESTAMPTZ,

  -- Ensure dimensions is valid JSON object
  CONSTRAINT valid_dimensions CHECK (jsonb_typeof(dimensions) = 'object'),

  -- Ensure min_cohort_size is reasonable
  CONSTRAINT valid_min_cohort_size CHECK (min_cohort_size >= 3 AND min_cohort_size <= 100)
);

-- Index for company's cohorts
CREATE INDEX idx_saved_cohorts_company
ON saved_cohorts(company_id)
WHERE deleted_at IS NULL;

-- Index for public cohorts
CREATE INDEX idx_saved_cohorts_public
ON saved_cohorts(is_public)
WHERE is_public = true AND deleted_at IS NULL;

-- GIN index for dimension queries (fast JSONB lookups)
CREATE INDEX idx_saved_cohorts_dimensions
ON saved_cohorts USING GIN(dimensions);

-- Index for shared cohorts
CREATE INDEX idx_saved_cohorts_shared
ON saved_cohorts USING GIN(shared_with_company_ids)
WHERE shared_with_company_ids IS NOT NULL AND deleted_at IS NULL;

-- Trigger to update updated_at timestamp
CREATE TRIGGER trigger_update_saved_cohorts_timestamp
BEFORE UPDATE ON saved_cohorts
FOR EACH ROW
EXECUTE FUNCTION update_cohort_opt_ins_timestamp(); -- Reuse function

-- ============================================================================
-- Cohort Access Audit Log
-- ============================================================================

-- Track when companies access cohort benchmarks (GDPR audit trail)
CREATE TABLE IF NOT EXISTS cohort_access_audit (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Who accessed what
  requesting_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cohort_id UUID REFERENCES saved_cohorts(id) ON DELETE SET NULL,
  cohort_type VARCHAR(50) NOT NULL, -- 'saved', 'industry', 'region', 'size', 'custom'

  -- Query details (hashed for deduplication, no PII)
  query_hash VARCHAR(64) NOT NULL, -- SHA-256 of query parameters
  query_params_summary JSONB, -- Non-PII summary: {"dimension": "sroi_ratio", "dateRange": "2025-Q1"}

  -- Privacy enforcement details
  k_anonymity_threshold INT NOT NULL,
  k_anonymity_passed BOOLEAN NOT NULL,
  dp_noise_applied BOOLEAN NOT NULL,
  epsilon_used NUMERIC(5, 3), -- Privacy budget consumed (e.g., 0.100)

  -- Result details
  cohort_size INT, -- Number of companies in cohort
  suppressed BOOLEAN NOT NULL, -- True if data was suppressed
  records_returned INT NOT NULL DEFAULT 0,

  -- Access metadata
  accessed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  access_method VARCHAR(50) NOT NULL DEFAULT 'api', -- 'api', 'ui', 'export', 'scheduled'
  user_agent TEXT,
  ip_address INET,

  -- Performance
  query_duration_ms INT,

  -- Constraints
  CONSTRAINT valid_cohort_type CHECK (
    cohort_type IN ('saved', 'industry', 'region', 'size', 'custom', 'multi_dimension')
  ),
  CONSTRAINT valid_access_method CHECK (
    access_method IN ('api', 'ui', 'export', 'scheduled', 'system')
  ),
  CONSTRAINT valid_epsilon CHECK (
    epsilon_used IS NULL OR (epsilon_used > 0 AND epsilon_used <= 1)
  )
);

-- Index for company audit trail
CREATE INDEX idx_cohort_access_company
ON cohort_access_audit(requesting_company_id, accessed_at DESC);

-- Index for cohort-specific audit
CREATE INDEX idx_cohort_access_cohort
ON cohort_access_audit(cohort_id, accessed_at DESC)
WHERE cohort_id IS NOT NULL;

-- Index for privacy analysis (suppressed queries)
CREATE INDEX idx_cohort_access_suppressed
ON cohort_access_audit(suppressed, accessed_at DESC)
WHERE suppressed = true;

-- Index for query hash (deduplication)
CREATE INDEX idx_cohort_access_query_hash
ON cohort_access_audit(query_hash, accessed_at DESC);

-- Partitioning for performance (by month)
-- Note: Manual partitioning strategy for large-scale deployments
-- PARTITION BY RANGE (accessed_at);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to check if company has consented to data sharing
CREATE OR REPLACE FUNCTION has_benchmarking_consent(p_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN (
    SELECT COALESCE(data_sharing_consent, false)
    FROM cohort_opt_ins
    WHERE company_id = p_company_id
  );
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to get companies in a cohort (respecting consent)
CREATE OR REPLACE FUNCTION get_cohort_companies(
  p_dimensions JSONB,
  p_min_size INT DEFAULT 5
)
RETURNS TABLE(company_id UUID, consented_at TIMESTAMPTZ) AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id AS company_id,
    co.consent_date AS consented_at
  FROM companies c
  INNER JOIN cohort_opt_ins co ON c.id = co.company_id
  WHERE co.data_sharing_consent = true
    -- Add dimension matching logic here based on p_dimensions
    -- (Implementation depends on company metadata schema)
  LIMIT 1000; -- Safety limit
END;
$$ LANGUAGE plpgsql STABLE;

-- ============================================================================
-- Data Seeding (Development/Testing)
-- ============================================================================

-- Insert default opt-in records for existing companies (all opt-out by default)
INSERT INTO cohort_opt_ins (company_id, data_sharing_consent, consent_scope)
SELECT
  id,
  false,
  'none'
FROM companies
ON CONFLICT (company_id) DO NOTHING;

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE cohort_opt_ins IS 'GDPR-compliant consent tracking for cohort benchmarking data sharing';
COMMENT ON TABLE saved_cohorts IS 'Custom cohort definitions for reusable benchmark comparisons';
COMMENT ON TABLE cohort_access_audit IS 'Audit trail for cohort data access (privacy compliance)';

COMMENT ON COLUMN cohort_opt_ins.consent_scope IS 'Granular consent: none, all, industry_only, region_only, size_only, custom';
COMMENT ON COLUMN cohort_opt_ins.custom_scope IS 'Custom consent dimensions and metrics (JSONB)';
COMMENT ON COLUMN saved_cohorts.dimensions IS 'Cohort filter criteria (JSONB): industry, region, size, program types';
COMMENT ON COLUMN saved_cohorts.min_cohort_size IS 'k-anonymity threshold for this cohort (default: 5)';
COMMENT ON COLUMN cohort_access_audit.query_hash IS 'SHA-256 hash of query parameters for deduplication';
COMMENT ON COLUMN cohort_access_audit.epsilon_used IS 'Differential privacy budget consumed (0-1)';
