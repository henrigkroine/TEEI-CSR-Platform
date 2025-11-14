-- Company themes table for white-label branding
CREATE TABLE IF NOT EXISTS company_themes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,

  -- Logo storage
  logo_url VARCHAR(500),
  logo_mime_type VARCHAR(50), -- 'image/png' or 'image/svg+xml'
  logo_size_bytes INTEGER,

  -- Brand colors (hex format)
  primary_color VARCHAR(7) NOT NULL DEFAULT '#0066CC',
  secondary_color VARCHAR(7) NOT NULL DEFAULT '#1E40AF',
  accent_color VARCHAR(7) NOT NULL DEFAULT '#10B981',

  -- Dark mode colors (optional overrides)
  primary_color_dark VARCHAR(7),
  secondary_color_dark VARCHAR(7),
  accent_color_dark VARCHAR(7),

  -- Text colors for contrast
  text_on_primary VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  text_on_secondary VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',
  text_on_accent VARCHAR(7) NOT NULL DEFAULT '#FFFFFF',

  -- Contrast validation metadata
  contrast_ratios JSONB DEFAULT '{}', -- Stores computed ratios for audit
  is_wcag_aa_compliant BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  CONSTRAINT valid_logo_mime CHECK (
    logo_mime_type IS NULL OR
    logo_mime_type IN ('image/png', 'image/svg+xml')
  ),
  CONSTRAINT valid_logo_size CHECK (
    logo_size_bytes IS NULL OR
    logo_size_bytes <= 2097152 -- 2MB max
  ),
  CONSTRAINT valid_hex_colors CHECK (
    primary_color ~* '^#[0-9A-F]{6}$' AND
    secondary_color ~* '^#[0-9A-F]{6}$' AND
    accent_color ~* '^#[0-9A-F]{6}$' AND
    text_on_primary ~* '^#[0-9A-F]{6}$' AND
    text_on_secondary ~* '^#[0-9A-F]{6}$' AND
    text_on_accent ~* '^#[0-9A-F]{6}$' AND
    (primary_color_dark IS NULL OR primary_color_dark ~* '^#[0-9A-F]{6}$') AND
    (secondary_color_dark IS NULL OR secondary_color_dark ~* '^#[0-9A-F]{6}$') AND
    (accent_color_dark IS NULL OR accent_color_dark ~* '^#[0-9A-F]{6}$')
  )
);

CREATE INDEX IF NOT EXISTS idx_company_themes_company ON company_themes(company_id);
CREATE INDEX IF NOT EXISTS idx_company_themes_compliant ON company_themes(is_wcag_aa_compliant);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_company_themes_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_company_themes_updated_at
  BEFORE UPDATE ON company_themes
  FOR EACH ROW
  EXECUTE FUNCTION update_company_themes_updated_at();

-- Insert default themes for existing companies
INSERT INTO company_themes (company_id)
SELECT id FROM companies
ON CONFLICT (company_id) DO NOTHING;
