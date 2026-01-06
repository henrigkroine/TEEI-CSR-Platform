-- Migration: Add program_instance_id to buddy_matches table
-- SWARM 6: Agent 4.3 (ingestion-enhancer)
-- Purpose: Link buddy matches to campaigns via program instances for campaign-level reporting
-- Date: 2025-11-22

-- Add program_instance_id column to buddy_matches
ALTER TABLE buddy_matches
ADD COLUMN program_instance_id UUID REFERENCES program_instances(id) ON DELETE SET NULL;

-- Create index for efficient campaign-level queries
CREATE INDEX buddy_matches_program_instance_id_idx ON buddy_matches(program_instance_id);

-- Create composite index for common query pattern (instance + match date)
CREATE INDEX buddy_matches_instance_date_idx ON buddy_matches(program_instance_id, matched_at)
WHERE program_instance_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN buddy_matches.program_instance_id IS
'Links buddy match to a program instance (and transitively to a campaign). Allows campaign-level impact metrics aggregation. NULL if match predates campaign system or could not be auto-associated.';

-- Verification query (for testing)
-- SELECT COUNT(*) as total_matches,
--        COUNT(program_instance_id) as matches_with_instance,
--        ROUND(100.0 * COUNT(program_instance_id) / NULLIF(COUNT(*), 0), 2) as coverage_percent
-- FROM buddy_matches;
