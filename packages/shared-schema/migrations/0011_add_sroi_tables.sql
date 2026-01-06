-- Migration: Add SROI calculation tables
-- Date: 2025-11-14
-- Description: Creates tables for SROI (Social Return on Investment) calculations,
--              valuation weights, and VIS (Value Impact Score) tracking

-- SROI Calculations Table
CREATE TABLE IF NOT EXISTS sroi_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  program_type VARCHAR(50) NOT NULL, -- 'buddy', 'upskilling', etc.
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  company_id UUID, -- NULL for global calculations
  total_social_value DECIMAL(10,2) NOT NULL,
  total_investment DECIMAL(10,2) NOT NULL,
  sroi_ratio DECIMAL(10,4) NOT NULL,
  activity_breakdown JSONB NOT NULL, -- Detailed activity counts and values
  confidence_score DECIMAL(3,2), -- 0.00 - 1.00
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for SROI calculations
CREATE INDEX IF NOT EXISTS sroi_program_period_idx
  ON sroi_calculations(program_type, period_start, period_end);
CREATE INDEX IF NOT EXISTS sroi_company_idx
  ON sroi_calculations(company_id);
CREATE INDEX IF NOT EXISTS sroi_calculated_at_idx
  ON sroi_calculations(calculated_at);

-- SROI Valuation Weights Table
CREATE TABLE IF NOT EXISTS sroi_valuation_weights (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID, -- NULL for global defaults
  activity_type VARCHAR(100) NOT NULL, -- 'buddy_match', 'event_attended', etc.
  value_points DECIMAL(10,2) NOT NULL, -- Point value for this activity
  effective_from DATE NOT NULL,
  effective_to DATE, -- NULL for currently active
  notes VARCHAR(500),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for valuation weights
CREATE INDEX IF NOT EXISTS weights_company_activity_idx
  ON sroi_valuation_weights(company_id, activity_type);
CREATE INDEX IF NOT EXISTS weights_effective_date_idx
  ON sroi_valuation_weights(effective_from, effective_to);

-- VIS Calculations Table (Value Impact Score)
CREATE TABLE IF NOT EXISTS vis_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  program_type VARCHAR(50) NOT NULL, -- 'buddy', 'upskilling', etc.
  current_score DECIMAL(10,2) NOT NULL,
  lifetime_score DECIMAL(10,2) NOT NULL, -- Total before decay
  last_activity_at TIMESTAMP WITH TIME ZONE,
  activity_counts JSONB NOT NULL, -- Breakdown by activity type
  calculated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for VIS calculations
CREATE INDEX IF NOT EXISTS vis_user_program_idx
  ON vis_calculations(user_id, program_type);
CREATE INDEX IF NOT EXISTS vis_calculated_at_idx
  ON vis_calculations(calculated_at);

-- VIS Activity Log Table (for detailed tracking)
CREATE TABLE IF NOT EXISTS vis_activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  event_id UUID NOT NULL, -- Links to buddy_system_events
  activity_type VARCHAR(100) NOT NULL,
  points_awarded DECIMAL(10,2) NOT NULL,
  decay_factor DECIMAL(3,2) NOT NULL DEFAULT 1.00, -- Multiplier for age-based decay
  effective_points DECIMAL(10,2) NOT NULL, -- points_awarded * decay_factor
  activity_date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Indexes for VIS activity log
CREATE INDEX IF NOT EXISTS vis_log_user_activity_idx
  ON vis_activity_log(user_id, activity_date);
CREATE INDEX IF NOT EXISTS vis_log_event_id_idx
  ON vis_activity_log(event_id);

-- Insert default valuation weights
INSERT INTO sroi_valuation_weights (company_id, activity_type, value_points, effective_from, notes)
VALUES
  (NULL, 'buddy_match', 10, '2025-01-01', 'Initial connection established, foundation for future engagement'),
  (NULL, 'event_attended', 5, '2025-01-01', 'Community participation, networking, cultural exchange per event'),
  (NULL, 'skill_share', 15, '2025-01-01', 'Direct skills transfer, educational value (⭐⭐⭐ high impact)'),
  (NULL, 'feedback', 8, '2025-01-01', 'Quality assurance, program improvement insights'),
  (NULL, 'milestone', 20, '2025-01-01', 'Significant achievement, program completion (⭐⭐⭐ high impact)'),
  (NULL, 'checkin', 3, '2025-01-01', 'Regular engagement signal, retention indicator')
ON CONFLICT DO NOTHING;

-- Add comments for documentation
COMMENT ON TABLE sroi_calculations IS 'Stores calculated SROI metrics for different program types over time periods';
COMMENT ON TABLE sroi_valuation_weights IS 'Configurable valuation weights for activity types, supports company-specific overrides';
COMMENT ON TABLE vis_calculations IS 'Tracks cumulative Value Impact Score for users with decay over time';
COMMENT ON TABLE vis_activity_log IS 'Detailed log of individual VIS contributions for impact attribution';

COMMENT ON COLUMN sroi_calculations.activity_breakdown IS 'JSON object containing counts and values per activity type';
COMMENT ON COLUMN sroi_calculations.confidence_score IS 'Data quality score (0-1) based on volume and diversity of events';
COMMENT ON COLUMN sroi_valuation_weights.effective_to IS 'NULL means currently active, otherwise specifies end date';
COMMENT ON COLUMN vis_activity_log.decay_factor IS 'Age-based decay multiplier applied to original points';
