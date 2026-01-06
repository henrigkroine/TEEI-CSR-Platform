-- Base Schema Migration
-- Creates core tables: users, companies, and related tables
-- This must run before other migrations that reference these tables

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create enums first
DO $$ BEGIN
    CREATE TYPE privacy_request_type AS ENUM ('export', 'delete');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE privacy_request_status AS ENUM ('pending', 'processing', 'completed', 'failed');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    role VARCHAR(50) NOT NULL, -- admin, company_user, participant, volunteer
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    journey_flags JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_journey_flags ON users USING GIN (journey_flags);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- Companies table
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    country VARCHAR(100),
    features JSONB,
    ai_budget_monthly DECIMAL(10, 2) DEFAULT 1000.00,
    ai_spend_current_month DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- Company Users junction table
CREATE TABLE IF NOT EXISTS company_users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_users_company_id ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_user_id ON company_users(user_id);

-- Program Enrollments
CREATE TABLE IF NOT EXISTS program_enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    program_type VARCHAR(50) NOT NULL, -- buddy, language, mentorship, upskilling
    program_instance_id UUID, -- Will add FK after program_instances table created
    enrolled_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL DEFAULT 'active', -- active, completed, dropped
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_program_enrollments_user_id ON program_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_program_type ON program_enrollments(program_type);
CREATE INDEX IF NOT EXISTS idx_program_enrollments_status ON program_enrollments(status);

-- External ID Mappings
CREATE TABLE IF NOT EXISTS external_id_mappings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    external_system VARCHAR(50) NOT NULL, -- kintell, discord, buddy, etc.
    external_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(external_system, external_id)
);

CREATE INDEX IF NOT EXISTS idx_external_id_mappings_user_id ON external_id_mappings(user_id);
CREATE INDEX IF NOT EXISTS idx_external_id_mappings_external ON external_id_mappings(external_system, external_id);

-- Privacy Requests
CREATE TABLE IF NOT EXISTS privacy_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_type privacy_request_type NOT NULL,
    status privacy_request_status NOT NULL DEFAULT 'pending',
    progress INTEGER NOT NULL DEFAULT 0, -- 0-100
    result_path VARCHAR(500),
    error_message TEXT,
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS privacy_requests_user_id_idx ON privacy_requests(user_id);
CREATE INDEX IF NOT EXISTS privacy_requests_status_idx ON privacy_requests(status);

-- Privacy Audit Log
CREATE TABLE IF NOT EXISTS privacy_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    request_id UUID NOT NULL REFERENCES privacy_requests(id) ON DELETE CASCADE,
    action VARCHAR(100) NOT NULL, -- 'data_exported', 'user_deleted', 'anonymized'
    details JSONB,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS privacy_audit_log_request_id_idx ON privacy_audit_log(request_id);

-- User External IDs
CREATE TABLE IF NOT EXISTS user_external_ids (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- buddy, discord, kintell, upskilling
    external_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}',
    UNIQUE(provider, external_id)
);

CREATE INDEX IF NOT EXISTS idx_user_external_ids_profile ON user_external_ids(profile_id);
CREATE INDEX IF NOT EXISTS idx_user_external_ids_provider_external ON user_external_ids(provider, external_id);
CREATE INDEX IF NOT EXISTS idx_user_external_ids_provider ON user_external_ids(provider);

-- Identity Linking Audit
CREATE TABLE IF NOT EXISTS identity_linking_audit (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- created, updated, deleted
    performed_by VARCHAR(100),
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS idx_identity_linking_audit_profile ON identity_linking_audit(profile_id);
CREATE INDEX IF NOT EXISTS idx_identity_linking_audit_provider ON identity_linking_audit(provider, external_id);
CREATE INDEX IF NOT EXISTS idx_identity_linking_audit_performed_at ON identity_linking_audit(performed_at);




