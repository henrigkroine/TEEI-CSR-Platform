-- Initial database setup script
-- Executed automatically when Postgres container starts

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create test database for integration tests
CREATE DATABASE teei_test;

-- Connect to test database and enable extensions there too
\c teei_test;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Switch back to main database
\c teei_platform;

-- Set timezone
SET timezone = 'UTC';

-- Create initial schema version tracking table
CREATE TABLE IF NOT EXISTS schema_version (
  version INT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  description TEXT
);

INSERT INTO schema_version (version, description)
VALUES (0, 'Initial database setup')
ON CONFLICT (version) DO NOTHING;
