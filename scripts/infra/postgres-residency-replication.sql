-- PostgreSQL Data Residency Replication Configuration
-- This script sets up row-level filtering for logical replication to ensure
-- GDPR compliance and data residency requirements.
--
-- PostgreSQL 15+ required for row filter support in publications
--
-- Data Residency Rules:
-- 1. EU companies' data MUST stay in EU region only (no replication to US)
-- 2. US companies' data can replicate to both US and EU (for DR purposes)
-- 3. Global companies can choose their primary region
--
-- Usage:
--   psql -U teei_user -d teei_platform -f postgres-residency-replication.sql

-- ==============================================================================
-- SECTION 1: Add region column to tables (if not exists)
-- ==============================================================================

DO $$
BEGIN
    -- Add region column to companies table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'companies' AND column_name = 'data_region'
    ) THEN
        ALTER TABLE companies ADD COLUMN data_region VARCHAR(20) DEFAULT 'us-east-1';
        CREATE INDEX idx_companies_data_region ON companies(data_region);
        RAISE NOTICE 'Added data_region column to companies table';
    END IF;

    -- Add region column to users table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'data_region'
    ) THEN
        ALTER TABLE users ADD COLUMN data_region VARCHAR(20);
        CREATE INDEX idx_users_data_region ON users(data_region);
        RAISE NOTICE 'Added data_region column to users table';
    END IF;

    -- Add region column to projects table
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'projects' AND column_name = 'data_region'
    ) THEN
        ALTER TABLE projects ADD COLUMN data_region VARCHAR(20);
        CREATE INDEX idx_projects_data_region ON projects(data_region);
        RAISE NOTICE 'Added data_region column to projects table';
    END IF;
END $$;

-- ==============================================================================
-- SECTION 2: Create region-specific publications with row filters
-- ==============================================================================

-- Drop existing publications (if recreating)
-- DROP PUBLICATION IF EXISTS teei_global;
-- DROP PUBLICATION IF EXISTS teei_us_only;
-- DROP PUBLICATION IF EXISTS teei_eu_to_us;

-- Publication for US-only data (replicate from US to EU for DR)
-- This includes US companies and their related data
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'teei_us_only') THEN
        CREATE PUBLICATION teei_us_only;
        RAISE NOTICE 'Created publication: teei_us_only';
    END IF;
END $$;

-- Add tables with row filters for US-only data
-- Companies: Only US region companies
ALTER PUBLICATION teei_us_only ADD TABLE companies
WHERE (data_region = 'us-east-1' OR data_region IS NULL);

-- Users: Only users from US companies
ALTER PUBLICATION teei_us_only ADD TABLE users
WHERE (data_region = 'us-east-1' OR data_region IS NULL);

-- Projects: Only projects from US companies
ALTER PUBLICATION teei_us_only ADD TABLE projects
WHERE (data_region = 'us-east-1' OR data_region IS NULL);

-- Other tables without regional filtering (reference data, etc.)
-- Add all non-sensitive tables that should replicate globally
DO $$
DECLARE
    tbl RECORD;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT IN ('companies', 'users', 'projects', 'audit_logs', 'personal_data')
    LOOP
        BEGIN
            EXECUTE format('ALTER PUBLICATION teei_us_only ADD TABLE %I', tbl.tablename);
            RAISE NOTICE 'Added table % to teei_us_only publication', tbl.tablename;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'Could not add table % to publication: %', tbl.tablename, SQLERRM;
        END;
    END LOOP;
END $$;

-- Publication for EU-to-US replication (if needed for bidirectional sync)
-- Note: In typical DR setup, this may not be needed
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'teei_eu_to_us') THEN
        CREATE PUBLICATION teei_eu_to_us;
        RAISE NOTICE 'Created publication: teei_eu_to_us';
    END IF;
END $$;

-- Add tables with row filters for EU data that can replicate back to US
-- This would typically be empty or very limited for GDPR compliance
-- EU data should NOT replicate to US
-- Only add if specifically needed for certain use cases
-- ALTER PUBLICATION teei_eu_to_us ADD TABLE companies WHERE (data_region = 'us-east-1');

-- ==============================================================================
-- SECTION 3: Create helper functions for data residency
-- ==============================================================================

-- Function to determine data region for a company
CREATE OR REPLACE FUNCTION get_company_data_region(company_id UUID)
RETURNS VARCHAR(20) AS $$
DECLARE
    region VARCHAR(20);
BEGIN
    SELECT data_region INTO region
    FROM companies
    WHERE id = company_id;

    RETURN COALESCE(region, 'us-east-1');
END;
$$ LANGUAGE plpgsql STABLE;

-- Function to enforce data residency on insert/update
CREATE OR REPLACE FUNCTION enforce_data_residency()
RETURNS TRIGGER AS $$
DECLARE
    company_region VARCHAR(20);
BEGIN
    -- Get company's data region
    IF TG_TABLE_NAME = 'companies' THEN
        NEW.data_region := COALESCE(NEW.data_region, 'us-east-1');
    ELSIF TG_TABLE_NAME IN ('users', 'projects', 'audit_logs') THEN
        -- Inherit region from company
        company_region := get_company_data_region(NEW.company_id);
        NEW.data_region := company_region;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- SECTION 4: Create triggers for automatic region assignment
-- ==============================================================================

-- Trigger for companies table
DROP TRIGGER IF EXISTS enforce_company_region ON companies;
CREATE TRIGGER enforce_company_region
    BEFORE INSERT OR UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION enforce_data_residency();

-- Trigger for users table
DROP TRIGGER IF EXISTS enforce_user_region ON users;
CREATE TRIGGER enforce_user_region
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION enforce_data_residency();

-- Trigger for projects table
DROP TRIGGER IF EXISTS enforce_project_region ON projects;
CREATE TRIGGER enforce_project_region
    BEFORE INSERT OR UPDATE ON projects
    FOR EACH ROW
    EXECUTE FUNCTION enforce_data_residency();

-- ==============================================================================
-- SECTION 5: Row-Level Security (RLS) for additional protection
-- ==============================================================================

-- Enable RLS on sensitive tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access data in their region
CREATE POLICY company_region_isolation ON companies
    FOR ALL
    USING (
        data_region = current_setting('app.current_region', true)
        OR current_setting('app.current_region', true) IS NULL
        OR current_user IN ('teei_user', 'replicator')  -- Allow replication and admin access
    );

CREATE POLICY user_region_isolation ON users
    FOR ALL
    USING (
        data_region = current_setting('app.current_region', true)
        OR current_setting('app.current_region', true) IS NULL
        OR current_user IN ('teei_user', 'replicator')
    );

CREATE POLICY project_region_isolation ON projects
    FOR ALL
    USING (
        data_region = current_setting('app.current_region', true)
        OR current_setting('app.current_region', true) IS NULL
        OR current_user IN ('teei_user', 'replicator')
    );

-- ==============================================================================
-- SECTION 6: Create views for region-specific data access
-- ==============================================================================

-- View for US region data only
CREATE OR REPLACE VIEW companies_us AS
SELECT * FROM companies
WHERE data_region = 'us-east-1' OR data_region IS NULL;

-- View for EU region data only
CREATE OR REPLACE VIEW companies_eu AS
SELECT * FROM companies
WHERE data_region = 'eu-central-1';

-- View for global reference data (non-regional)
CREATE OR REPLACE VIEW global_reference_data AS
SELECT
    'companies' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE data_region = 'us-east-1') AS us_rows,
    COUNT(*) FILTER (WHERE data_region = 'eu-central-1') AS eu_rows,
    COUNT(*) FILTER (WHERE data_region IS NULL) AS unknown_region
FROM companies
UNION ALL
SELECT
    'users' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE data_region = 'us-east-1') AS us_rows,
    COUNT(*) FILTER (WHERE data_region = 'eu-central-1') AS eu_rows,
    COUNT(*) FILTER (WHERE data_region IS NULL) AS unknown_region
FROM users
UNION ALL
SELECT
    'projects' AS table_name,
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE data_region = 'us-east-1') AS us_rows,
    COUNT(*) FILTER (WHERE data_region = 'eu-central-1') AS eu_rows,
    COUNT(*) FILTER (WHERE data_region IS NULL) AS unknown_region
FROM projects;

-- ==============================================================================
-- SECTION 7: Monitoring queries
-- ==============================================================================

-- Query to check publication configuration
CREATE OR REPLACE VIEW replication_publications AS
SELECT
    p.pubname,
    p.puballtables,
    p.pubinsert,
    p.pubupdate,
    p.pubdelete,
    p.pubtruncate,
    array_agg(c.relname) AS tables
FROM pg_publication p
LEFT JOIN pg_publication_tables pt ON p.pubname = pt.pubname
LEFT JOIN pg_class c ON pt.schemaname || '.' || pt.tablename = c.oid::regclass::text
GROUP BY p.pubname, p.puballtables, p.pubinsert, p.pubupdate, p.pubdelete, p.pubtruncate;

-- Query to check data distribution by region
CREATE OR REPLACE VIEW data_residency_summary AS
SELECT
    data_region,
    COUNT(*) AS company_count,
    COUNT(DISTINCT id) AS unique_companies
FROM companies
GROUP BY data_region
ORDER BY data_region;

-- ==============================================================================
-- SECTION 8: Validation and testing
-- ==============================================================================

-- Insert test companies in different regions
INSERT INTO companies (id, name, data_region)
VALUES
    (gen_random_uuid(), 'US Test Company', 'us-east-1'),
    (gen_random_uuid(), 'EU Test Company', 'eu-central-1')
ON CONFLICT (id) DO NOTHING;

-- Verify publications
SELECT 'Publications:' AS info;
SELECT * FROM replication_publications;

-- Verify data distribution
SELECT 'Data Distribution:' AS info;
SELECT * FROM data_residency_summary;

-- Verify triggers are active
SELECT 'Active Triggers:' AS info;
SELECT
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name LIKE 'enforce_%_region';

-- Verify RLS policies
SELECT 'RLS Policies:' AS info;
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    qual
FROM pg_policies
WHERE policyname LIKE '%region_isolation%';

RAISE NOTICE 'Data residency configuration complete!';
RAISE NOTICE 'Publications created with row-level filtering';
RAISE NOTICE 'Triggers configured for automatic region assignment';
RAISE NOTICE 'RLS policies enabled for region isolation';
