-- Migration: Cohorts and Materialized Views for Analytics
-- Created: 2025-11-13
-- Description: Add cohort definitions, user cohort membership, and materialized views for hot queries

-- ================================================
-- COHORTS TABLE
-- ================================================
CREATE TABLE IF NOT EXISTS cohorts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    filters JSONB NOT NULL DEFAULT '{}', -- Filter criteria: { "language": "uk", "program": "mentorship" }
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by UUID, -- User who created the cohort

    CONSTRAINT cohorts_name_company_unique UNIQUE (company_id, name)
);

CREATE INDEX idx_cohorts_company ON cohorts(company_id);
CREATE INDEX idx_cohorts_filters ON cohorts USING GIN(filters);

-- ================================================
-- USER COHORT MEMBERSHIP (Many-to-Many)
-- ================================================
CREATE TABLE IF NOT EXISTS user_cohorts (
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    cohort_id UUID NOT NULL REFERENCES cohorts(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    joined_by UUID, -- User who added them to the cohort

    PRIMARY KEY (user_id, cohort_id)
);

CREATE INDEX idx_user_cohorts_user ON user_cohorts(user_id);
CREATE INDEX idx_user_cohorts_cohort ON user_cohorts(cohort_id);
CREATE INDEX idx_user_cohorts_company ON user_cohorts(company_id);

-- ================================================
-- MATERIALIZED VIEW: Company Dashboard
-- ================================================
-- Aggregated metrics for company dashboard (refreshed every 5 min)
CREATE MATERIALIZED VIEW IF NOT EXISTS company_dashboard_mv AS
SELECT
    mcp.company_id,
    MAX(mcp.period_start) as last_period,
    SUM(mcp.participants_count) as total_participants,
    AVG(mcp.avg_integration_score) as overall_integration_score,
    AVG(mcp.avg_social_capital_score) as overall_social_capital_score,
    AVG(mcp.sroi_ratio) as overall_sroi,
    SUM(mcp.total_matches) as total_matches,
    SUM(mcp.active_matches) as active_matches,
    COUNT(DISTINCT mcp.period_start) as periods_tracked
FROM metrics_company_period mcp
GROUP BY mcp.company_id;

-- Create unique index for concurrent refresh
CREATE UNIQUE INDEX company_dashboard_mv_company_id_idx ON company_dashboard_mv (company_id);

-- ================================================
-- MATERIALIZED VIEW: Program Performance
-- ================================================
-- Aggregated metrics by program type
CREATE MATERIALIZED VIEW IF NOT EXISTS program_performance_mv AS
SELECT
    mpp.company_id,
    mpp.program_type,
    MAX(mpp.period_start) as last_period,
    SUM(mpp.total_participants) as total_participants,
    AVG(mpp.avg_match_quality) as avg_match_quality,
    AVG(mpp.avg_interaction_frequency) as avg_interaction_frequency,
    SUM(mpp.completed_milestones) as completed_milestones,
    COUNT(DISTINCT mpp.period_start) as periods_tracked
FROM metrics_program_period mpp
GROUP BY mpp.company_id, mpp.program_type;

CREATE UNIQUE INDEX program_performance_mv_company_program_idx
    ON program_performance_mv (company_id, program_type);

-- ================================================
-- MATERIALIZED VIEW: Language Group Performance
-- ================================================
-- Aggregated metrics by language group
CREATE MATERIALIZED VIEW IF NOT EXISTS language_group_performance_mv AS
SELECT
    mlp.company_id,
    mlp.language_group,
    MAX(mlp.period_start) as last_period,
    SUM(mlp.participants_count) as total_participants,
    AVG(mlp.avg_integration_score) as avg_integration_score,
    AVG(mlp.bridge_connections_avg) as avg_bridge_connections,
    AVG(mlp.cross_language_interaction_rate) as avg_cross_language_rate,
    COUNT(DISTINCT mlp.period_start) as periods_tracked
FROM metrics_language_period mlp
GROUP BY mlp.company_id, mlp.language_group;

CREATE UNIQUE INDEX language_group_performance_mv_company_lang_idx
    ON language_group_performance_mv (company_id, language_group);

-- ================================================
-- MATERIALIZED VIEW: Journey Stage Distribution
-- ================================================
-- Current distribution of users across journey stages
CREATE MATERIALIZED VIEW IF NOT EXISTS journey_stage_distribution_mv AS
SELECT
    company_id,
    current_stage,
    COUNT(*) as user_count,
    AVG(EXTRACT(EPOCH FROM (NOW() - stage_entered_at)) / 86400) as avg_days_in_stage
FROM user_journeys
WHERE current_stage IS NOT NULL
GROUP BY company_id, current_stage;

CREATE UNIQUE INDEX journey_stage_distribution_mv_company_stage_idx
    ON journey_stage_distribution_mv (company_id, current_stage);

-- ================================================
-- FUNCTION: Refresh All Materialized Views
-- ================================================
CREATE OR REPLACE FUNCTION refresh_analytics_materialized_views()
RETURNS void AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY company_dashboard_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY program_performance_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY language_group_performance_mv;
    REFRESH MATERIALIZED VIEW CONCURRENTLY journey_stage_distribution_mv;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- COMMENTS
-- ================================================
COMMENT ON TABLE cohorts IS 'User cohort definitions with filter criteria';
COMMENT ON TABLE user_cohorts IS 'Many-to-many mapping between users and cohorts';
COMMENT ON MATERIALIZED VIEW company_dashboard_mv IS 'Pre-aggregated company dashboard metrics (refresh every 5 min)';
COMMENT ON MATERIALIZED VIEW program_performance_mv IS 'Pre-aggregated program performance metrics';
COMMENT ON MATERIALIZED VIEW language_group_performance_mv IS 'Pre-aggregated language group metrics';
COMMENT ON MATERIALIZED VIEW journey_stage_distribution_mv IS 'Current distribution of users across journey stages';
COMMENT ON FUNCTION refresh_analytics_materialized_views IS 'Refresh all analytics materialized views concurrently';

-- ================================================
-- NOTES
-- ================================================
-- To refresh materialized views, run:
-- SELECT refresh_analytics_materialized_views();
--
-- Or refresh individually:
-- REFRESH MATERIALIZED VIEW CONCURRENTLY company_dashboard_mv;
--
-- Consider setting up a cron job (using pg_cron extension) to refresh every 5 minutes:
-- SELECT cron.schedule('refresh-analytics-mvs', '*/5 * * * *', 'SELECT refresh_analytics_materialized_views();');
