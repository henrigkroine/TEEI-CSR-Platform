-- Migration: Add company_users table for tenant access control
-- Purpose: Map users to companies with roles for multi-tenancy support
-- Date: 2025-01-14

-- Company users table for tenant access mapping
CREATE TABLE IF NOT EXISTS company_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role VARCHAR(50) NOT NULL DEFAULT 'company_user',
  permissions JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true,

  -- Ensure unique user-company mapping
  UNIQUE(user_id, company_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_company_users_user ON company_users(user_id);
CREATE INDEX IF NOT EXISTS idx_company_users_company ON company_users(company_id);
CREATE INDEX IF NOT EXISTS idx_company_users_role ON company_users(role);
CREATE INDEX IF NOT EXISTS idx_company_users_active ON company_users(is_active);
CREATE INDEX IF NOT EXISTS idx_company_users_user_active ON company_users(user_id, is_active);

-- Add missing columns to companies table for tenant features
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS employee_count INTEGER,
  ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS website_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS contact_phone VARCHAR(50),
  ADD COLUMN IF NOT EXISTS address_line1 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS address_line2 VARCHAR(255),
  ADD COLUMN IF NOT EXISTS city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS state VARCHAR(100),
  ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS country VARCHAR(100);

-- Update companies settings to include tenant-specific configuration
COMMENT ON COLUMN companies.settings IS 'JSONB field for tenant configuration including:
- sroi_overrides: Custom SROI multipliers
- feature_flags: Enabled features per tenant
- branding: Custom colors, logos
- notification_settings: Email/webhook preferences
- integration_settings: API credentials, webhooks';

-- Create audit log table for tenant admin actions
CREATE TABLE IF NOT EXISTS tenant_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  action VARCHAR(100) NOT NULL,
  resource_type VARCHAR(50),
  resource_id UUID,
  changes JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes for audit logs
CREATE INDEX IF NOT EXISTS idx_audit_logs_company ON tenant_audit_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON tenant_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON tenant_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON tenant_audit_logs(created_at DESC);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for company_users
CREATE TRIGGER update_company_users_updated_at
  BEFORE UPDATE ON company_users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Trigger for companies
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert schema version
INSERT INTO schema_version (version, description)
VALUES (1, 'Add company_users table and tenant features')
ON CONFLICT (version) DO NOTHING;
