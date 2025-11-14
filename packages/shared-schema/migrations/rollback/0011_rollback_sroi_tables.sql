-- Rollback: Remove SROI calculation tables
-- Date: 2025-11-14
-- Description: Drops all SROI-related tables and indexes

-- Drop VIS tables (in reverse order due to potential foreign keys)
DROP TABLE IF EXISTS vis_activity_log;
DROP TABLE IF EXISTS vis_calculations;

-- Drop SROI tables
DROP TABLE IF EXISTS sroi_valuation_weights;
DROP TABLE IF EXISTS sroi_calculations;

-- Note: Indexes are automatically dropped with tables
