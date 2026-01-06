-- Migration: Add Impact Deliveries Tables
-- Purpose: Track delivery of impact data to external CSR platforms (Benevity, Goodera, Workday)
-- Date: 2025-11-14
-- Ref: MULTI_AGENT_PLAN.md § Worker 2/Integrations Lead

-- Impact Deliveries Table
CREATE TABLE IF NOT EXISTS impact_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  -- Provider identification
  provider VARCHAR(50) NOT NULL CHECK (provider IN ('benevity', 'goodera', 'workday')),

  -- Idempotency key to prevent duplicate sends
  delivery_id UUID NOT NULL UNIQUE,

  -- Payload sent to external provider
  payload JSONB NOT NULL,

  -- Delivery status tracking
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'retrying')),

  -- Retry tracking
  attempt_count INTEGER NOT NULL DEFAULT 0,

  -- Error tracking
  last_error TEXT,

  -- Response from external provider
  provider_response JSONB,

  -- Timestamps
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_impact_deliveries_company_id ON impact_deliveries(company_id);
CREATE INDEX idx_impact_deliveries_provider ON impact_deliveries(provider);
CREATE INDEX idx_impact_deliveries_status ON impact_deliveries(status);
CREATE INDEX idx_impact_deliveries_created_at ON impact_deliveries(created_at);
CREATE INDEX idx_impact_deliveries_delivery_id ON impact_deliveries(delivery_id);

-- OAuth Token Storage for Impact-In Providers
CREATE TABLE IF NOT EXISTS impact_provider_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  provider VARCHAR(50) NOT NULL,

  -- OAuth tokens
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_type VARCHAR(50) NOT NULL DEFAULT 'Bearer',
  expires_at TIMESTAMPTZ NOT NULL,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Ensure one token per company-provider pair
  UNIQUE(company_id, provider)
);

-- Indexes
CREATE INDEX idx_impact_provider_tokens_company_provider ON impact_provider_tokens(company_id, provider);
CREATE INDEX idx_impact_provider_tokens_expires_at ON impact_provider_tokens(expires_at);

-- Updated timestamp trigger function (if not already exists)
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_impact_deliveries_updated_at
  BEFORE UPDATE ON impact_deliveries
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_impact_provider_tokens_updated_at
  BEFORE UPDATE ON impact_provider_tokens
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE impact_deliveries IS 'Tracks delivery of impact data to external CSR platforms';
COMMENT ON COLUMN impact_deliveries.delivery_id IS 'Idempotency key to prevent duplicate sends';
COMMENT ON COLUMN impact_deliveries.provider IS 'External CSR platform: benevity, goodera, or workday';
COMMENT ON COLUMN impact_deliveries.status IS 'Delivery status: pending, success, failed, or retrying';
COMMENT ON COLUMN impact_deliveries.attempt_count IS 'Number of delivery attempts made';

COMMENT ON TABLE impact_provider_tokens IS 'OAuth tokens for external Impact-In providers';
COMMENT ON COLUMN impact_provider_tokens.expires_at IS 'Token expiration timestamp for automatic refresh';
