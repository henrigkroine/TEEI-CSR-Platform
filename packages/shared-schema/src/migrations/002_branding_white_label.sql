-- White-Label Branding Tables Migration
-- Implements per-tenant branding (logos, colors, fonts), branded exports, and subdomain routing
-- Created: 2025-11-17
-- Worker: Worker 17 - White-Label & Theming

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Branding Asset Kind Enum
CREATE TYPE branding_asset_kind AS ENUM ('logo', 'favicon', 'watermark', 'hero_image');

-- Branding Themes Table
-- Stores per-tenant branding configurations with theme tokens
CREATE TABLE IF NOT EXISTS branding_themes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    tokens_json JSONB NOT NULL, -- ThemeTokens: { colors, typography, spacing, radii, charts }
    created_by UUID, -- References users(id), nullable for system-created themes
    updated_by UUID, -- References users(id), nullable
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT branding_themes_name_check CHECK (char_length(name) > 0),
    CONSTRAINT branding_themes_tokens_check CHECK (jsonb_typeof(tokens_json) = 'object')
);

-- Indexes for branding_themes
CREATE INDEX idx_branding_themes_tenant_id ON branding_themes(tenant_id);
CREATE INDEX idx_branding_themes_tenant_id_active ON branding_themes(tenant_id, is_active);
CREATE INDEX idx_branding_themes_name ON branding_themes(name);

-- Unique constraint: Only one active theme per tenant
CREATE UNIQUE INDEX idx_branding_themes_tenant_active_unique
    ON branding_themes(tenant_id)
    WHERE is_active = true;

-- Branding Assets Table
-- Stores logos, favicons, watermarks, and other brand assets
CREATE TABLE IF NOT EXISTS branding_assets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    theme_id UUID NOT NULL REFERENCES branding_themes(id) ON DELETE CASCADE,
    kind branding_asset_kind NOT NULL,
    url TEXT NOT NULL,
    hash VARCHAR(64) NOT NULL, -- SHA-256 hash for integrity verification
    mime_type VARCHAR(100) NOT NULL,
    size VARCHAR(50), -- Human-readable size, e.g., "150KB"
    width VARCHAR(50), -- Image width in px
    height VARCHAR(50), -- Image height in px
    metadata JSONB DEFAULT '{}'::jsonb, -- Additional asset metadata
    uploaded_by UUID, -- References users(id), nullable
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT branding_assets_url_check CHECK (char_length(url) > 0),
    CONSTRAINT branding_assets_hash_check CHECK (char_length(hash) = 64),
    CONSTRAINT branding_assets_mime_type_check CHECK (mime_type ~ '^[a-z]+/[a-z0-9\+\-\.]+$')
);

-- Indexes for branding_assets
CREATE INDEX idx_branding_assets_theme_id ON branding_assets(theme_id);
CREATE INDEX idx_branding_assets_kind ON branding_assets(kind);
CREATE INDEX idx_branding_assets_theme_id_kind ON branding_assets(theme_id, kind);

-- Unique constraint: One asset per kind per theme
CREATE UNIQUE INDEX idx_branding_assets_theme_kind_unique
    ON branding_assets(theme_id, kind);

-- Branding Domains Table (optional)
-- Maps custom subdomains to tenants for white-label routing
CREATE TABLE IF NOT EXISTS branding_domains (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL UNIQUE,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verification_token VARCHAR(255), -- Token for domain verification
    verified_at TIMESTAMPTZ,
    created_by UUID, -- References users(id), nullable
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT branding_domains_domain_check CHECK (char_length(domain) > 0),
    CONSTRAINT branding_domains_domain_format_check CHECK (domain ~ '^[a-z0-9\-\.]+$')
);

-- Indexes for branding_domains
CREATE INDEX idx_branding_domains_tenant_id ON branding_domains(tenant_id);
CREATE INDEX idx_branding_domains_domain ON branding_domains(domain);
CREATE INDEX idx_branding_domains_verified ON branding_domains(is_verified);

-- Branding Audit Log Table
-- Tracks all changes to themes, assets, and domains
CREATE TABLE IF NOT EXISTS branding_audit_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    resource_type VARCHAR(50) NOT NULL, -- 'theme', 'asset', 'domain'
    resource_id UUID NOT NULL, -- ID of the affected resource
    action VARCHAR(50) NOT NULL, -- 'created', 'updated', 'deleted', 'activated', 'deactivated'
    changes JSONB, -- Diff of changes (before/after)
    performed_by UUID, -- References users(id), nullable for system actions
    ip_address VARCHAR(45), -- IPv4 or IPv6
    user_agent TEXT,
    performed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    -- Constraints
    CONSTRAINT branding_audit_log_resource_type_check
        CHECK (resource_type IN ('theme', 'asset', 'domain')),
    CONSTRAINT branding_audit_log_action_check
        CHECK (action IN ('created', 'updated', 'deleted', 'activated', 'deactivated', 'verified', 'uploaded'))
);

-- Indexes for branding_audit_log
CREATE INDEX idx_branding_audit_log_tenant_id ON branding_audit_log(tenant_id);
CREATE INDEX idx_branding_audit_log_resource ON branding_audit_log(resource_type, resource_id);
CREATE INDEX idx_branding_audit_log_performed_at ON branding_audit_log(performed_at);
CREATE INDEX idx_branding_audit_log_performed_by ON branding_audit_log(performed_by);

-- Trigger to update updated_at timestamps
CREATE OR REPLACE FUNCTION update_branding_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_branding_themes_updated_at
    BEFORE UPDATE ON branding_themes
    FOR EACH ROW
    EXECUTE FUNCTION update_branding_updated_at();

CREATE TRIGGER trigger_branding_assets_updated_at
    BEFORE UPDATE ON branding_assets
    FOR EACH ROW
    EXECUTE FUNCTION update_branding_updated_at();

CREATE TRIGGER trigger_branding_domains_updated_at
    BEFORE UPDATE ON branding_domains
    FOR EACH ROW
    EXECUTE FUNCTION update_branding_updated_at();

-- Comments for documentation
COMMENT ON TABLE branding_themes IS 'Stores per-tenant branding configurations with theme tokens (colors, typography, spacing, etc.)';
COMMENT ON TABLE branding_assets IS 'Stores brand assets (logos, favicons, watermarks) with integrity hashes';
COMMENT ON TABLE branding_domains IS 'Maps custom subdomains to tenants for white-label routing';
COMMENT ON TABLE branding_audit_log IS 'Audit trail for all branding changes (themes, assets, domains)';

COMMENT ON COLUMN branding_themes.tokens_json IS 'Theme tokens: { colors: {...}, typography: {...}, spacing: {...}, radii: {...}, charts: {...} }';
COMMENT ON COLUMN branding_assets.hash IS 'SHA-256 hash for Subresource Integrity (SRI) verification';
COMMENT ON COLUMN branding_domains.verification_token IS 'Token for DNS TXT record verification';
