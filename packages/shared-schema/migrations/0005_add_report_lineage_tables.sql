-- Migration: Add report lineage and citation tracking tables
-- Created: 2024-11-14
-- Description: Adds tables for tracking AI-generated report provenance, citations, and audit trail

-- Report lineage table for audit trail and provenance tracking
CREATE TABLE IF NOT EXISTS report_lineage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL UNIQUE,
  company_id UUID NOT NULL REFERENCES companies(id),
  period_start TIMESTAMP WITH TIME ZONE NOT NULL,
  period_end TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Model information
  model_name VARCHAR(100) NOT NULL,
  model_version VARCHAR(50),
  provider_name VARCHAR(50) NOT NULL,

  -- Prompt information
  prompt_version VARCHAR(100) NOT NULL,
  prompt_template TEXT,
  locale VARCHAR(10) DEFAULT 'en',

  -- Token usage and cost tracking
  tokens_input INTEGER NOT NULL,
  tokens_output INTEGER NOT NULL,
  tokens_total INTEGER NOT NULL,
  estimated_cost_usd VARCHAR(20),

  -- Request metadata
  deterministic JSONB DEFAULT 'false',
  temperature VARCHAR(10),
  sections JSONB NOT NULL,

  -- Citation metadata
  citation_count INTEGER DEFAULT 0,
  evidence_snippet_ids JSONB,

  -- Request tracking
  request_id VARCHAR(100),
  duration_ms INTEGER,

  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  created_by UUID
);

-- Report sections table - stores individual sections of generated reports
CREATE TABLE IF NOT EXISTS report_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lineage_id UUID NOT NULL REFERENCES report_lineage(id),
  section_type VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  citation_ids JSONB,
  word_count INTEGER,
  character_count INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Report citations table - stores individual citations used in reports
CREATE TABLE IF NOT EXISTS report_citations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lineage_id UUID NOT NULL REFERENCES report_lineage(id),
  section_id UUID REFERENCES report_sections(id),
  citation_number INTEGER NOT NULL,
  snippet_id UUID NOT NULL,
  snippet_text TEXT,
  relevance_score VARCHAR(10),
  position_in_text INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_report_lineage_company ON report_lineage(company_id);
CREATE INDEX IF NOT EXISTS idx_report_lineage_period ON report_lineage(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_report_lineage_created ON report_lineage(created_at);
CREATE INDEX IF NOT EXISTS idx_report_sections_lineage ON report_sections(lineage_id);
CREATE INDEX IF NOT EXISTS idx_report_citations_lineage ON report_citations(lineage_id);
CREATE INDEX IF NOT EXISTS idx_report_citations_snippet ON report_citations(snippet_id);

-- Add comments for documentation
COMMENT ON TABLE report_lineage IS 'Tracks provenance and metadata for AI-generated reports';
COMMENT ON TABLE report_sections IS 'Stores individual sections of generated reports with citations';
COMMENT ON TABLE report_citations IS 'Links generated content back to evidence snippets for auditability';
COMMENT ON COLUMN report_lineage.report_id IS 'External identifier for the generated report';
COMMENT ON COLUMN report_lineage.model_name IS 'Name of AI model used (e.g., gpt-4-turbo, claude-3-opus)';
COMMENT ON COLUMN report_lineage.tokens_total IS 'Total tokens used in generation (input + output)';
COMMENT ON COLUMN report_citations.snippet_id IS 'References evidence_snippets.id for full audit trail';
