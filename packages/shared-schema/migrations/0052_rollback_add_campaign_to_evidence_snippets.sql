-- Rollback Migration: Remove campaign linking from evidence_snippets
-- SWARM 6: Agent 4.4 (evidence-campaign-linker)

-- Drop indexes
DROP INDEX IF EXISTS evidence_snippets_campaign_created_idx;
DROP INDEX IF EXISTS evidence_snippets_campaign_id_idx;
DROP INDEX IF EXISTS evidence_snippets_program_instance_idx;

-- Drop columns
ALTER TABLE evidence_snippets
DROP COLUMN IF EXISTS campaign_id,
DROP COLUMN IF EXISTS program_instance_id;
