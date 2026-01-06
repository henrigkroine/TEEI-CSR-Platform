-- Rollback migration for report lineage tables
-- Drops all report lineage, sections, and citations tables

DROP TABLE IF EXISTS report_citations CASCADE;
DROP TABLE IF EXISTS report_sections CASCADE;
DROP TABLE IF EXISTS report_lineage CASCADE;
