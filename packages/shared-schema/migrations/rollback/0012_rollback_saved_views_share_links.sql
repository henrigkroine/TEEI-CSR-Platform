-- Rollback Migration: Remove saved views and share links tables
-- Date: 2025-11-14
-- Description: Drops tables and related objects for saved views and share links

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_increment_view_count ON share_link_access_log;
DROP TRIGGER IF EXISTS trigger_update_saved_views_timestamp ON saved_views;

-- Drop trigger functions
DROP FUNCTION IF EXISTS increment_view_count();
DROP FUNCTION IF EXISTS update_saved_views_timestamp();

-- Drop tables (cascade to remove foreign keys)
DROP TABLE IF EXISTS share_link_access_log CASCADE;
DROP TABLE IF EXISTS share_links CASCADE;
DROP TABLE IF EXISTS saved_views CASCADE;
