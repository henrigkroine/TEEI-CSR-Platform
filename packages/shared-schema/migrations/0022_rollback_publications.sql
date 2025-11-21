-- Rollback: Remove Publications Schema (Worker 19)

-- Drop triggers
DROP TRIGGER IF EXISTS publication_blocks_updated_at_trigger ON publication_blocks;
DROP TRIGGER IF EXISTS publications_updated_at_trigger ON publications;

-- Drop function
DROP FUNCTION IF EXISTS update_publications_updated_at();

-- Drop tables (CASCADE will drop dependent objects)
DROP TABLE IF EXISTS publication_views CASCADE;
DROP TABLE IF EXISTS publication_tokens CASCADE;
DROP TABLE IF EXISTS publication_blocks CASCADE;
DROP TABLE IF EXISTS publications CASCADE;

-- Drop enums
DROP TYPE IF EXISTS publication_block_kind;
DROP TYPE IF EXISTS publication_visibility;
DROP TYPE IF EXISTS publication_status;
