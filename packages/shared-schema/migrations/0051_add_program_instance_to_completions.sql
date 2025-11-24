-- Migration: Add program_instance_id to learning_progress table
-- SWARM 6: Agent 4.3 (ingestion-enhancer)
-- Purpose: Link upskilling completions to campaigns via program instances for campaign-level reporting
-- Date: 2025-11-22

-- Add program_instance_id column to learning_progress
ALTER TABLE learning_progress
ADD COLUMN program_instance_id UUID REFERENCES program_instances(id) ON DELETE SET NULL;

-- Create index for efficient campaign-level queries
CREATE INDEX learning_progress_program_instance_id_idx ON learning_progress(program_instance_id);

-- Create composite index for common query pattern (instance + completion date)
CREATE INDEX learning_progress_instance_date_idx ON learning_progress(program_instance_id, completed_at)
WHERE program_instance_id IS NOT NULL AND completed_at IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN learning_progress.program_instance_id IS
'Links course completion to a program instance (and transitively to a campaign). Allows campaign-level impact metrics aggregation. NULL if completion predates campaign system or could not be auto-associated.';

-- Verification query (for testing)
-- SELECT COUNT(*) as total_completions,
--        COUNT(program_instance_id) as completions_with_instance,
--        ROUND(100.0 * COUNT(program_instance_id) / NULLIF(COUNT(*), 0), 2) as coverage_percent
-- FROM learning_progress
-- WHERE status = 'completed';
