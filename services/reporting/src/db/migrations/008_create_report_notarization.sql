-- Migration: Create report_notarization table
-- Description: Store cryptographic signatures for report integrity verification
-- Author: Worker 8 - Team 1 (notarization-storage-engineer)
-- Date: 2025-11-17

CREATE TABLE IF NOT EXISTS report_notarization (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL,
  company_id UUID NOT NULL,

  -- Signature data
  sections JSONB NOT NULL, -- Array of { sectionId, sectionType, digest, algorithm, timestamp }
  signature TEXT NOT NULL, -- Hex-encoded Ed25519 signature
  public_key TEXT NOT NULL, -- Hex-encoded Ed25519 public key
  algorithm VARCHAR(20) NOT NULL DEFAULT 'ed25519',

  -- Metadata
  signer_identity VARCHAR(255) NOT NULL DEFAULT 'TEEI-CSR-Platform/v1.0',
  signed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Audit trail
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT fk_report_notarization_report_id FOREIGN KEY (report_id)
    REFERENCES reports(id) ON DELETE CASCADE,
  CONSTRAINT fk_report_notarization_company_id FOREIGN KEY (company_id)
    REFERENCES companies(id) ON DELETE CASCADE,

  -- Ensure one notarization per report (can be updated for re-signing)
  CONSTRAINT uq_report_notarization_report_id UNIQUE (report_id)
);

-- Indexes for performance
CREATE INDEX idx_report_notarization_report_id ON report_notarization(report_id);
CREATE INDEX idx_report_notarization_company_id ON report_notarization(company_id);
CREATE INDEX idx_report_notarization_signed_at ON report_notarization(signed_at);

-- GIN index for JSONB sections (for querying section digests)
CREATE INDEX idx_report_notarization_sections ON report_notarization USING GIN (sections);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_report_notarization_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_report_notarization_updated_at
BEFORE UPDATE ON report_notarization
FOR EACH ROW
EXECUTE FUNCTION update_report_notarization_updated_at();

-- Comments for documentation
COMMENT ON TABLE report_notarization IS 'Cryptographic signatures for report integrity verification (Impact Notarization)';
COMMENT ON COLUMN report_notarization.sections IS 'Array of section digests (SHA-256 hashes) included in signature';
COMMENT ON COLUMN report_notarization.signature IS 'Ed25519 digital signature (hex-encoded)';
COMMENT ON COLUMN report_notarization.public_key IS 'Ed25519 public key for signature verification (hex-encoded)';
COMMENT ON COLUMN report_notarization.algorithm IS 'Signature algorithm used (ed25519)';
COMMENT ON COLUMN report_notarization.signer_identity IS 'Identity of signing service (e.g., TEEI-CSR-Platform/v1.0)';
COMMENT ON COLUMN report_notarization.signed_at IS 'Timestamp when report was signed';

-- Sample query examples
-- Find notarization for a specific report:
-- SELECT * FROM report_notarization WHERE report_id = 'abc-123';
--
-- Verify report signature:
-- SELECT signature, public_key, sections FROM report_notarization WHERE report_id = 'abc-123';
--
-- Find all notarized reports for a company:
-- SELECT r.id, r.title, rn.signed_at, rn.signer_identity
-- FROM reports r
-- JOIN report_notarization rn ON r.id = rn.report_id
-- WHERE r.company_id = 'company-456'
-- ORDER BY rn.signed_at DESC;
