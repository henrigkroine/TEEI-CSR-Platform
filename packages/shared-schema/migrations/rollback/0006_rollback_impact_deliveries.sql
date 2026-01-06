-- Rollback: Remove Impact Deliveries Tables
-- Date: 2025-11-14
-- Ref: MULTI_AGENT_PLAN.md § Worker 2/Integrations Lead

-- Drop triggers
DROP TRIGGER IF EXISTS update_impact_deliveries_updated_at ON impact_deliveries;
DROP TRIGGER IF EXISTS update_impact_provider_tokens_updated_at ON impact_provider_tokens;

-- Drop tables (CASCADE to handle foreign key constraints)
DROP TABLE IF EXISTS impact_provider_tokens CASCADE;
DROP TABLE IF EXISTS impact_deliveries CASCADE;
