-- Migration: Add campaign linking to evidence_snippets
-- SWARM 6: Agent 4.4 (evidence-campaign-linker)
-- Purpose: Link evidence snippets to campaigns for campaign-level impact tracking

-- Add campaign linking columns to evidence_snippets
ALTER TABLE evidence_snippets
ADD COLUMN program_instance_id UUID REFERENCES program_instances(id) ON DELETE SET NULL,
ADD COLUMN campaign_id UUID REFERENCES campaigns(id) ON DELETE SET NULL;

-- Add indexes for campaign filtering (performance optimization)
CREATE INDEX IF NOT EXISTS evidence_snippets_program_instance_idx
ON evidence_snippets(program_instance_id)
WHERE program_instance_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS evidence_snippets_campaign_id_idx
ON evidence_snippets(campaign_id)
WHERE campaign_id IS NOT NULL;

-- Add composite index for campaign evidence queries
CREATE INDEX IF NOT EXISTS evidence_snippets_campaign_created_idx
ON evidence_snippets(campaign_id, created_at DESC)
WHERE campaign_id IS NOT NULL;

-- Comment on columns
COMMENT ON COLUMN evidence_snippets.program_instance_id IS 'Link to program instance (optional, may not always be associated)';
COMMENT ON COLUMN evidence_snippets.campaign_id IS 'Link to campaign (denormalized from program_instance for query performance)';
