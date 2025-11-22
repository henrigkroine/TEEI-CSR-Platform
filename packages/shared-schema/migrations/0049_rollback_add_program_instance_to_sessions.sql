-- Rollback Migration: Remove program_instance_id from kintell_sessions table
-- SWARM 6: Agent 4.3 (ingestion-enhancer)
-- Date: 2025-11-22

-- Drop indexes first
DROP INDEX IF EXISTS kintell_sessions_instance_date_idx;
DROP INDEX IF EXISTS kintell_sessions_program_instance_id_idx;

-- Drop the column
ALTER TABLE kintell_sessions
DROP COLUMN IF EXISTS program_instance_id;
