-- Rollback Migration: Remove program_instance_id from learning_progress table
-- SWARM 6: Agent 4.3 (ingestion-enhancer)
-- Date: 2025-11-22

-- Drop indexes first
DROP INDEX IF EXISTS learning_progress_instance_date_idx;
DROP INDEX IF EXISTS learning_progress_program_instance_id_idx;

-- Drop the column
ALTER TABLE learning_progress
DROP COLUMN IF EXISTS program_instance_id;
