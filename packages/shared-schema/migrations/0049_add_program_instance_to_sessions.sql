-- Migration: Add program_instance_id to kintell_sessions table
-- SWARM 6: Agent 4.3 (ingestion-enhancer)
-- Purpose: Link Kintell sessions to campaigns via program instances for campaign-level reporting
-- Date: 2025-11-22

-- Add program_instance_id column to kintell_sessions
ALTER TABLE kintell_sessions
ADD COLUMN program_instance_id UUID REFERENCES program_instances(id) ON DELETE SET NULL;

-- Create index for efficient campaign-level queries
CREATE INDEX kintell_sessions_program_instance_id_idx ON kintell_sessions(program_instance_id);

-- Create composite index for common query pattern (instance + date)
CREATE INDEX kintell_sessions_instance_date_idx ON kintell_sessions(program_instance_id, completed_at)
WHERE program_instance_id IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN kintell_sessions.program_instance_id IS
'Links session to a program instance (and transitively to a campaign). Allows campaign-level impact metrics aggregation. NULL if session predates campaign system or could not be auto-associated.';

-- Verification query (for testing)
-- SELECT COUNT(*) as total_sessions,
--        COUNT(program_instance_id) as sessions_with_instance,
--        ROUND(100.0 * COUNT(program_instance_id) / NULLIF(COUNT(*), 0), 2) as coverage_percent
-- FROM kintell_sessions;
