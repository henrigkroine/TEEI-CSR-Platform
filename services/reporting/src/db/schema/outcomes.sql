-- Outcome scores table (quantitative metrics)
CREATE TABLE IF NOT EXISTS outcome_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  dimension VARCHAR(50) NOT NULL, -- 'integration', 'language', 'job_readiness'
  score DECIMAL(5, 2) NOT NULL CHECK (score >= 0 AND score <= 1), -- normalized 0-1
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL,
  quarter VARCHAR(7) NOT NULL, -- format: YYYY-QN
  source VARCHAR(50), -- 'q2q', 'kintell', 'manual', 'survey'
  confidence DECIMAL(3, 2) CHECK (confidence >= 0 AND confidence <= 1),
  evidence_lineage JSONB DEFAULT '[]', -- array of source references
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_outcome_scores_participant ON outcome_scores(participant_id);
CREATE INDEX IF NOT EXISTS idx_outcome_scores_company ON outcome_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_outcome_scores_dimension ON outcome_scores(dimension);
CREATE INDEX IF NOT EXISTS idx_outcome_scores_quarter ON outcome_scores(quarter);
CREATE INDEX IF NOT EXISTS idx_outcome_scores_measured_at ON outcome_scores(measured_at);

-- Q2Q insights (qualitative to quantitative conversions)
CREATE TABLE IF NOT EXISTS q2q_insights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  participant_id UUID,
  insight_text TEXT NOT NULL,
  source_feedback_id UUID REFERENCES session_feedback(id),
  dimensions JSONB NOT NULL, -- {integration: 0.8, language: 0.5, ...}
  confidence DECIMAL(3, 2) NOT NULL CHECK (confidence >= 0 AND confidence <= 1),
  evidence_lineage JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_q2q_insights_company ON q2q_insights(company_id);
CREATE INDEX IF NOT EXISTS idx_q2q_insights_participant ON q2q_insights(participant_id);
CREATE INDEX IF NOT EXISTS idx_q2q_insights_created ON q2q_insights(created_at);
