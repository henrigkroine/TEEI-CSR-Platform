-- GDPR Compliance Tables Migration
-- Implements GDPR Article 7 (Consent), Article 17 (Erasure), Article 20 (Portability), Article 30 (Processing Records)
-- Created: 2025-11-14

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- User Consents Table
CREATE TABLE IF NOT EXISTS user_consents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Consent details
    purpose VARCHAR(100) NOT NULL,
    consent_given BOOLEAN NOT NULL,
    consent_text TEXT NOT NULL,
    consent_version VARCHAR(50) NOT NULL,

    -- Consent metadata
    consent_date TIMESTAMPTZ NOT NULL,
    consent_method VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,

    -- Withdrawal
    withdrawn_at TIMESTAMPTZ,
    withdrawal_reason TEXT,

    -- Expiry
    expires_at TIMESTAMPTZ,

    -- Audit
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_consents_user_id ON user_consents(user_id);
CREATE INDEX idx_user_consents_purpose ON user_consents(purpose);
CREATE INDEX idx_user_consents_user_purpose ON user_consents(user_id, purpose);
CREATE INDEX idx_user_consents_consent_given ON user_consents(consent_given);

-- Data Subject Access Requests (DSAR)
CREATE TABLE IF NOT EXISTS data_subject_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Request details
    request_type VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending',

    -- Request metadata
    requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    requested_by UUID NOT NULL,
    request_reason TEXT,
    ip_address VARCHAR(45),

    -- Processing
    assigned_to UUID,
    processing_started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,

    -- Response
    response_data JSONB,
    response_file_url TEXT,
    rejection_reason TEXT,

    -- For erasure requests
    deletion_scheduled_for TIMESTAMPTZ,
    deletion_completed_at TIMESTAMPTZ,
    systems_deleted JSONB,
    verification_hash VARCHAR(64),

    -- Audit
    notes TEXT,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_dsar_user_id ON data_subject_requests(user_id);
CREATE INDEX idx_dsar_status ON data_subject_requests(status);
CREATE INDEX idx_dsar_request_type ON data_subject_requests(request_type);
CREATE INDEX idx_dsar_requested_at ON data_subject_requests(requested_at);

-- Data Processing Records (Article 30)
CREATE TABLE IF NOT EXISTS data_processing_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,

    -- Processing activity
    activity VARCHAR(100) NOT NULL,
    purpose VARCHAR(100) NOT NULL,
    legal_basis VARCHAR(50) NOT NULL,

    -- Data categories
    data_categories JSONB NOT NULL,
    recipient_categories JSONB,

    -- Processing metadata
    processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    processed_by UUID,
    system_component VARCHAR(100),

    -- Retention
    retention_period VARCHAR(100),
    scheduled_deletion_date TIMESTAMPTZ,

    -- Additional context
    metadata JSONB
);

CREATE INDEX idx_dpr_user_id ON data_processing_records(user_id);
CREATE INDEX idx_dpr_activity ON data_processing_records(activity);
CREATE INDEX idx_dpr_processed_at ON data_processing_records(processed_at);

-- Data Breach Incidents (Article 33)
CREATE TABLE IF NOT EXISTS data_breach_incidents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Incident details
    incident_type VARCHAR(100) NOT NULL,
    severity VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'investigating',

    -- Discovery
    discovered_at TIMESTAMPTZ NOT NULL,
    discovered_by UUID NOT NULL,
    reported_to_authority_at TIMESTAMPTZ,

    -- Impact
    affected_user_count VARCHAR(20),
    affected_data_categories JSONB,
    risk_to_rights TEXT,

    -- Response
    containment_measures TEXT,
    notification_plan TEXT,
    users_notified_at TIMESTAMPTZ,

    -- Resolution
    root_cause TEXT,
    remedial_actions TEXT,
    resolved_at TIMESTAMPTZ,

    -- Audit
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_breach_status ON data_breach_incidents(status);
CREATE INDEX idx_breach_severity ON data_breach_incidents(severity);
CREATE INDEX idx_breach_discovered_at ON data_breach_incidents(discovered_at);

-- Consent Text Versions
CREATE TABLE IF NOT EXISTS consent_text_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Version info
    purpose VARCHAR(100) NOT NULL,
    version VARCHAR(50) NOT NULL,
    language VARCHAR(10) NOT NULL DEFAULT 'en',

    -- Content
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    summary TEXT,

    -- Validity
    effective_from TIMESTAMPTZ NOT NULL,
    effective_until TIMESTAMPTZ,

    -- Metadata
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(purpose, version, language)
);

CREATE INDEX idx_consent_versions_purpose_version ON consent_text_versions(purpose, version);
CREATE INDEX idx_consent_versions_effective_from ON consent_text_versions(effective_from);

-- Data Retention Policies
CREATE TABLE IF NOT EXISTS data_retention_policies (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

    -- Policy details
    data_category VARCHAR(100) NOT NULL UNIQUE,
    retention_period_days VARCHAR(20) NOT NULL,
    legal_basis TEXT NOT NULL,

    -- Deletion behavior
    deletion_method VARCHAR(50) NOT NULL,
    dependent_categories JSONB,

    -- Policy metadata
    active BOOLEAN NOT NULL DEFAULT true,
    effective_from TIMESTAMPTZ NOT NULL,
    created_by UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_retention_data_category ON data_retention_policies(data_category);
CREATE INDEX idx_retention_active ON data_retention_policies(active);

-- Insert default consent text versions
INSERT INTO consent_text_versions (purpose, version, language, title, body, summary, effective_from, created_by)
VALUES
    ('marketing', 'v1', 'en',
     'Marketing Communications Consent',
     'I consent to receive marketing communications from TEEI about events, programs, and opportunities that may be relevant to me. I understand I can withdraw this consent at any time.',
     'Receive marketing emails and notifications',
     NOW(),
     '00000000-0000-0000-0000-000000000000'
    ),
    ('analytics', 'v1', 'en',
     'Analytics and Improvement Consent',
     'I consent to TEEI collecting and analyzing my usage data to improve the platform and services. This data will be anonymized and used only for service improvement.',
     'Help us improve by sharing usage data',
     NOW(),
     '00000000-0000-0000-0000-000000000000'
    ),
    ('buddy_program', 'v1', 'en',
     'Buddy Program Participation Consent',
     'I consent to participate in the TEEI Buddy Program and share my profile information with potential buddy matches. I understand this data will be used solely for matching and program coordination.',
     'Participate in buddy matching and events',
     NOW(),
     '00000000-0000-0000-0000-000000000000'
    ),
    ('data_sharing', 'v1', 'en',
     'Data Sharing with Partners Consent',
     'I consent to TEEI sharing anonymized data with partner organizations for research and impact reporting purposes. No personally identifiable information will be shared without explicit additional consent.',
     'Share anonymized data with partners',
     NOW(),
     '00000000-0000-0000-0000-000000000000'
    )
ON CONFLICT (purpose, version, language) DO NOTHING;

-- Insert default retention policies
INSERT INTO data_retention_policies (data_category, retention_period_days, legal_basis, deletion_method, active, effective_from, created_by)
VALUES
    ('user_profiles', '730', 'Legitimate interest for service delivery', 'anonymize', true, NOW(), '00000000-0000-0000-0000-000000000000'),
    ('buddy_matches', '1095', 'Legitimate interest for program impact measurement', 'anonymize', true, NOW(), '00000000-0000-0000-0000-000000000000'),
    ('event_attendance', '1095', 'Legitimate interest for program reporting', 'anonymize', true, NOW(), '00000000-0000-0000-0000-000000000000'),
    ('consent_records', '-1', 'Legal obligation (GDPR compliance)', 'archive', true, NOW(), '00000000-0000-0000-0000-000000000000'),
    ('processing_records', '2555', 'Legal obligation (GDPR Article 30)', 'archive', true, NOW(), '00000000-0000-0000-0000-000000000000')
ON CONFLICT (data_category) DO NOTHING;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_consents_updated_at
    BEFORE UPDATE ON user_consents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_dsar_updated_at
    BEFORE UPDATE ON data_subject_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_breach_updated_at
    BEFORE UPDATE ON data_breach_incidents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_retention_policies_updated_at
    BEFORE UPDATE ON data_retention_policies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE user_consents IS 'GDPR Article 7: Records of user consent for various processing purposes';
COMMENT ON TABLE data_subject_requests IS 'GDPR Articles 15-22: Data subject access, erasure, and portability requests';
COMMENT ON TABLE data_processing_records IS 'GDPR Article 30: Record of processing activities';
COMMENT ON TABLE data_breach_incidents IS 'GDPR Article 33: Personal data breach notification';
COMMENT ON TABLE consent_text_versions IS 'Versioned consent text for audit trail and compliance';
COMMENT ON TABLE data_retention_policies IS 'Data retention and deletion policies per category';
