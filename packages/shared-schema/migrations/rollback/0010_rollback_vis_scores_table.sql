-- Rollback Migration: Remove VIS scores table
-- Reverses: 0010_add_vis_scores_table.sql

-- Drop indexes first
DROP INDEX IF EXISTS idx_vis_scores_user_id;
DROP INDEX IF EXISTS idx_vis_scores_last_activity;
DROP INDEX IF EXISTS idx_vis_scores_percentile;
DROP INDEX IF EXISTS idx_vis_scores_profile_id;
DROP INDEX IF EXISTS idx_vis_scores_rank;

-- Drop table
DROP TABLE IF EXISTS vis_scores;
