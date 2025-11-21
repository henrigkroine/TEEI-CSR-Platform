-- Migration: Add Publications Schema (Worker 19)
-- Created: 2025-11-17
-- Description: Create tables for public impact pages and embeds

-- Create enums
CREATE TYPE publication_status AS ENUM ('DRAFT', 'LIVE', 'ARCHIVED');
CREATE TYPE publication_visibility AS ENUM ('PUBLIC', 'TOKEN');
CREATE TYPE publication_block_kind AS ENUM ('TILE', 'TEXT', 'CHART', 'EVIDENCE', 'METRIC', 'HEADING');

-- Publications table
CREATE TABLE publications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(255) NOT NULL,
  slug VARCHAR(255) NOT NULL,
  title VARCHAR(500) NOT NULL,
  description TEXT,

  -- Publication state
  status publication_status NOT NULL DEFAULT 'DRAFT',
  visibility publication_visibility NOT NULL DEFAULT 'PUBLIC',

  -- Ownership
  created_by VARCHAR(255) NOT NULL,
  updated_by VARCHAR(255) NOT NULL,

  -- SEO metadata
  meta_title VARCHAR(500),
  meta_description VARCHAR(1000),
  og_image_url TEXT,
  og_title VARCHAR(500),
  og_description VARCHAR(1000),

  -- Configuration
  theme_config JSONB,

  -- Analytics
  view_count INTEGER NOT NULL DEFAULT 0,
  unique_visitors INTEGER NOT NULL DEFAULT 0,
  last_viewed_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  archived_at TIMESTAMPTZ,

  -- Constraints
  CONSTRAINT publications_tenant_slug_unique UNIQUE (tenant_id, slug)
);

-- Indexes
CREATE INDEX publications_tenant_id_idx ON publications(tenant_id);
CREATE INDEX publications_slug_idx ON publications(slug);
CREATE INDEX publications_tenant_slug_idx ON publications(tenant_id, slug);
CREATE INDEX publications_status_idx ON publications(status);
CREATE INDEX publications_visibility_idx ON publications(visibility);

-- Publication blocks table
CREATE TABLE publication_blocks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,

  -- Block metadata
  kind publication_block_kind NOT NULL,
  "order" INTEGER NOT NULL,

  -- Block content
  payload_json JSONB NOT NULL,

  -- Configuration
  width VARCHAR(50) DEFAULT 'full',
  styling JSONB,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT publication_blocks_order_check CHECK ("order" >= 0)
);

-- Indexes
CREATE INDEX publication_blocks_publication_id_idx ON publication_blocks(publication_id);
CREATE INDEX publication_blocks_order_idx ON publication_blocks(publication_id, "order");

-- Publication tokens table
CREATE TABLE publication_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,

  -- Token data
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  token_prefix VARCHAR(10) NOT NULL,

  -- Metadata
  label VARCHAR(255),
  created_by VARCHAR(255) NOT NULL,

  -- Expiration
  expires_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,

  -- Usage tracking
  last_used_at TIMESTAMPTZ,
  use_count INTEGER NOT NULL DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX publication_tokens_publication_id_idx ON publication_tokens(publication_id);
CREATE INDEX publication_tokens_token_hash_idx ON publication_tokens(token_hash);

-- Publication views table (analytics)
CREATE TABLE publication_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  publication_id UUID NOT NULL REFERENCES publications(id) ON DELETE CASCADE,

  -- Visitor tracking (anonymized)
  visitor_hash VARCHAR(64) NOT NULL,
  session_id VARCHAR(64),

  -- Context
  referer TEXT,
  user_agent TEXT,
  country_code VARCHAR(2),

  -- Embed context
  is_embed BOOLEAN NOT NULL DEFAULT FALSE,
  embed_domain VARCHAR(500),

  -- View metadata
  view_duration_seconds INTEGER,

  -- Timestamp
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX publication_views_publication_id_idx ON publication_views(publication_id);
CREATE INDEX publication_views_viewed_at_idx ON publication_views(viewed_at);
CREATE INDEX publication_views_visitor_hash_idx ON publication_views(visitor_hash);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_publications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER publications_updated_at_trigger
  BEFORE UPDATE ON publications
  FOR EACH ROW
  EXECUTE FUNCTION update_publications_updated_at();

CREATE TRIGGER publication_blocks_updated_at_trigger
  BEFORE UPDATE ON publication_blocks
  FOR EACH ROW
  EXECUTE FUNCTION update_publications_updated_at();

-- Comments for documentation
COMMENT ON TABLE publications IS 'Public impact pages and microsites';
COMMENT ON TABLE publication_blocks IS 'Content blocks that compose publications';
COMMENT ON TABLE publication_tokens IS 'Access tokens for private publications';
COMMENT ON TABLE publication_views IS 'Analytics tracking for publication views';

COMMENT ON COLUMN publications.slug IS 'URL slug (unique per tenant)';
COMMENT ON COLUMN publications.status IS 'Publication lifecycle: DRAFT → LIVE → ARCHIVED';
COMMENT ON COLUMN publications.visibility IS 'Access control: PUBLIC or TOKEN-required';
COMMENT ON COLUMN publications.theme_config IS 'Custom theme settings (colors, logo, CSS)';
COMMENT ON COLUMN publication_blocks.payload_json IS 'Polymorphic content (type depends on kind)';
COMMENT ON COLUMN publication_blocks.width IS 'Responsive width: full, half, third, quarter';
COMMENT ON COLUMN publication_tokens.token_hash IS 'SHA-256 hash of plaintext token';
COMMENT ON COLUMN publication_tokens.token_prefix IS 'First 8-12 chars for display';
COMMENT ON COLUMN publication_views.visitor_hash IS 'SHA-256 hash of IP + User-Agent (anonymized)';
COMMENT ON COLUMN publication_views.is_embed IS 'True if viewed via embed iframe';
