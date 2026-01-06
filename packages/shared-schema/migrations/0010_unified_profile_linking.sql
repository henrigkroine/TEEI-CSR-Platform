-- Migration: Unified Profile Linking (Buddy ↔ CSR)
-- Created: 2025-11-14
-- Description: Add user_external_ids table for cross-system identity mapping and journey flags
-- Task: TASK-A-05

-- ================================================
-- USER EXTERNAL IDS TABLE
-- ================================================
-- Maps CSR Platform users to external system identities
-- Supports multiple identity providers: buddy, discord, kintell, upskilling
CREATE TABLE IF NOT EXISTS user_external_ids (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    provider VARCHAR(50) NOT NULL, -- 'buddy', 'discord', 'kintell', 'upskilling', etc.
    external_id VARCHAR(255) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}', -- Optional provider-specific metadata

    -- Ensure uniqueness: one external ID per provider
    CONSTRAINT user_external_ids_provider_external_unique UNIQUE (provider, external_id)
);

-- Indexes for efficient lookups
CREATE INDEX idx_user_external_ids_profile ON user_external_ids(profile_id);
CREATE INDEX idx_user_external_ids_provider_external ON user_external_ids(provider, external_id);
CREATE INDEX idx_user_external_ids_provider ON user_external_ids(provider);

-- ================================================
-- JOURNEY FLAGS COLUMN
-- ================================================
-- Add JSONB column to users table for journey tracking flags
-- Example flags: {"is_buddy_participant": true, "buddy_match_count": 5, "buddy_events_attended": 12}
ALTER TABLE users ADD COLUMN IF NOT EXISTS journey_flags JSONB DEFAULT '{}';

-- Index for querying by journey flags
CREATE INDEX idx_users_journey_flags ON users USING GIN(journey_flags);

-- ================================================
-- HELPER FUNCTIONS
-- ================================================

-- Function: Link external ID to profile
CREATE OR REPLACE FUNCTION link_external_id(
    p_profile_id UUID,
    p_provider VARCHAR(50),
    p_external_id VARCHAR(255),
    p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
    v_mapping_id UUID;
BEGIN
    -- Insert or update external ID mapping
    INSERT INTO user_external_ids (profile_id, provider, external_id, metadata, updated_at)
    VALUES (p_profile_id, p_provider, p_external_id, p_metadata, NOW())
    ON CONFLICT (provider, external_id)
    DO UPDATE SET
        profile_id = EXCLUDED.profile_id,
        metadata = EXCLUDED.metadata,
        updated_at = NOW()
    RETURNING id INTO v_mapping_id;

    RETURN v_mapping_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Update journey flag
CREATE OR REPLACE FUNCTION update_journey_flag(
    p_user_id UUID,
    p_flag_key VARCHAR(100),
    p_flag_value JSONB
) RETURNS VOID AS $$
BEGIN
    UPDATE users
    SET
        journey_flags = jsonb_set(
            COALESCE(journey_flags, '{}'::jsonb),
            ARRAY[p_flag_key],
            p_flag_value,
            true
        ),
        updated_at = NOW()
    WHERE id = p_user_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Increment journey counter
CREATE OR REPLACE FUNCTION increment_journey_counter(
    p_user_id UUID,
    p_counter_key VARCHAR(100),
    p_increment INTEGER DEFAULT 1
) RETURNS INTEGER AS $$
DECLARE
    v_current_value INTEGER;
    v_new_value INTEGER;
BEGIN
    -- Get current value (default to 0 if not exists)
    SELECT COALESCE((journey_flags->>p_counter_key)::INTEGER, 0)
    INTO v_current_value
    FROM users
    WHERE id = p_user_id;

    -- Calculate new value
    v_new_value := v_current_value + p_increment;

    -- Update the counter
    UPDATE users
    SET
        journey_flags = jsonb_set(
            COALESCE(journey_flags, '{}'::jsonb),
            ARRAY[p_counter_key],
            to_jsonb(v_new_value),
            true
        ),
        updated_at = NOW()
    WHERE id = p_user_id;

    RETURN v_new_value;
END;
$$ LANGUAGE plpgsql;

-- Function: Get profile by external ID
CREATE OR REPLACE FUNCTION get_profile_by_external_id(
    p_provider VARCHAR(50),
    p_external_id VARCHAR(255)
) RETURNS UUID AS $$
DECLARE
    v_profile_id UUID;
BEGIN
    SELECT profile_id INTO v_profile_id
    FROM user_external_ids
    WHERE provider = p_provider AND external_id = p_external_id;

    RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql;

-- ================================================
-- AUDIT TABLE FOR IDENTITY LINKING
-- ================================================
CREATE TABLE IF NOT EXISTS identity_linking_audit (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    profile_id UUID NOT NULL REFERENCES users(id),
    provider VARCHAR(50) NOT NULL,
    external_id VARCHAR(255) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- 'created', 'updated', 'deleted'
    performed_by VARCHAR(100), -- Service or user that performed the operation
    performed_at TIMESTAMP NOT NULL DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_identity_linking_audit_profile ON identity_linking_audit(profile_id);
CREATE INDEX idx_identity_linking_audit_provider ON identity_linking_audit(provider, external_id);
CREATE INDEX idx_identity_linking_audit_performed_at ON identity_linking_audit(performed_at);

-- ================================================
-- TRIGGER: Audit identity linking operations
-- ================================================
CREATE OR REPLACE FUNCTION audit_identity_linking()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        INSERT INTO identity_linking_audit (profile_id, provider, external_id, operation, performed_by)
        VALUES (NEW.profile_id, NEW.provider, NEW.external_id, 'created', 'system');
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO identity_linking_audit (profile_id, provider, external_id, operation, performed_by)
        VALUES (NEW.profile_id, NEW.provider, NEW.external_id, 'updated', 'system');
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO identity_linking_audit (profile_id, provider, external_id, operation, performed_by)
        VALUES (OLD.profile_id, OLD.provider, OLD.external_id, 'deleted', 'system');
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_identity_linking_trigger
AFTER INSERT OR UPDATE OR DELETE ON user_external_ids
FOR EACH ROW EXECUTE FUNCTION audit_identity_linking();

-- ================================================
-- COMMENTS
-- ================================================
COMMENT ON TABLE user_external_ids IS 'Maps CSR Platform users to external system identities (buddy, discord, kintell, upskilling)';
COMMENT ON COLUMN user_external_ids.profile_id IS 'Reference to CSR Platform user';
COMMENT ON COLUMN user_external_ids.provider IS 'External system identifier (buddy, discord, kintell, upskilling)';
COMMENT ON COLUMN user_external_ids.external_id IS 'User ID in the external system';
COMMENT ON COLUMN user_external_ids.metadata IS 'Optional provider-specific metadata';

COMMENT ON COLUMN users.journey_flags IS 'JSONB tracking journey progress (is_buddy_participant, buddy_match_count, etc.)';

COMMENT ON FUNCTION link_external_id IS 'Link or update external ID mapping for a user';
COMMENT ON FUNCTION update_journey_flag IS 'Update a specific journey flag value';
COMMENT ON FUNCTION increment_journey_counter IS 'Increment a journey counter (e.g., buddy_match_count)';
COMMENT ON FUNCTION get_profile_by_external_id IS 'Find CSR profile ID by external system ID';

COMMENT ON TABLE identity_linking_audit IS 'Audit log for all identity linking operations';
COMMENT ON TRIGGER audit_identity_linking_trigger ON user_external_ids IS 'Automatically log all identity linking operations';

-- ================================================
-- SAMPLE QUERIES
-- ================================================
-- Find all external identities for a user:
-- SELECT * FROM user_external_ids WHERE profile_id = 'user-uuid';
--
-- Find CSR profile by Buddy System user ID:
-- SELECT get_profile_by_external_id('buddy', 'buddy-user-id-123');
--
-- Link Buddy System user to CSR profile:
-- SELECT link_external_id('csr-user-uuid', 'buddy', 'buddy-user-id-123');
--
-- Update buddy match count:
-- SELECT increment_journey_counter('user-uuid', 'buddy_match_count');
--
-- Set buddy participant flag:
-- SELECT update_journey_flag('user-uuid', 'is_buddy_participant', 'true'::jsonb);
--
-- Get users with buddy participation:
-- SELECT * FROM users WHERE journey_flags->>'is_buddy_participant' = 'true';
