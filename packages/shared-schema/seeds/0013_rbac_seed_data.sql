-- Seed Data for Migration 0013: RBAC and Privacy Tables
-- Purpose: Populate staging/development environments with test data
-- Date: 2025-11-14
-- Environment: DEV/STAGING ONLY - DO NOT RUN IN PRODUCTION

-- =============================================================================
-- PREREQUISITES: Ensure users and companies tables have baseline data
-- =============================================================================

-- Insert test companies if they don't exist
INSERT INTO companies (id, name, industry, country, created_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'Acme Corporation', 'technology', 'US', NOW()),
  ('22222222-2222-2222-2222-222222222222', 'GlobalTech Industries', 'manufacturing', 'UK', NOW()),
  ('33333333-3333-3333-3333-333333333333', 'EcoSolutions Ltd', 'sustainability', 'NO', NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert test users if they don't exist
INSERT INTO users (id, email, name, created_at)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin@acme.com', 'Alice Admin', NOW()),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'manager@acme.com', 'Bob Manager', NOW()),
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'user@acme.com', 'Carol User', NOW()),
  ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'participant@acme.com', 'David Participant', NOW()),
  ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 'admin@globaltech.com', 'Emma Admin', NOW()),
  ('ffffffff-ffff-ffff-ffff-ffffffffffff', 'user@globaltech.com', 'Frank User', NOW()),
  ('a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0', 'admin@ecosolutions.com', 'Grace Admin', NOW()),
  ('b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', 'volunteer@ecosolutions.com', 'Henry Volunteer', NOW()),
  ('c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2', 'system@teei.platform', 'System Admin', NOW()),
  ('d3d3d3d3-d3d3-d3d3-d3d3-d3d3d3d3d3d3', 'api@acme.com', 'API Client', NOW())
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 1. COMPANY USERS SEED DATA
-- =============================================================================

INSERT INTO company_users (
  id, user_id, company_id, role, permissions, is_active, invited_by, joined_at, last_access_at
) VALUES
  -- Acme Corporation (Company 1)
  (
    '10000001-0000-0000-0000-000000000001',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Alice Admin
    '11111111-1111-1111-1111-111111111111', -- Acme
    'company_admin',
    '["company:write", "user:write", "data:export", "report:create", "api_key:create", "audit_log:view"]'::jsonb,
    true,
    NULL, -- Self-invited (first admin)
    NOW() - INTERVAL '90 days',
    NOW() - INTERVAL '2 hours'
  ),
  (
    '10000001-0000-0000-0000-000000000002',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- Bob Manager
    '11111111-1111-1111-1111-111111111111',
    'company_user',
    '["data:read", "data:write", "report:view", "report:export"]'::jsonb,
    true,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', -- Invited by Alice
    NOW() - INTERVAL '60 days',
    NOW() - INTERVAL '4 hours'
  ),
  (
    '10000001-0000-0000-0000-000000000003',
    'cccccccc-cccc-cccc-cccc-cccccccccccc', -- Carol User
    '11111111-1111-1111-1111-111111111111',
    'company_user',
    '["data:read", "report:view"]'::jsonb,
    true,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NOW() - INTERVAL '45 days',
    NOW() - INTERVAL '1 day'
  ),
  (
    '10000001-0000-0000-0000-000000000004',
    'dddddddd-dddd-dddd-dddd-dddddddddddd', -- David Participant
    '11111111-1111-1111-1111-111111111111',
    'participant',
    '["data:read"]'::jsonb,
    true,
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', -- Invited by Bob
    NOW() - INTERVAL '30 days',
    NOW() - INTERVAL '3 days'
  ),

  -- GlobalTech Industries (Company 2)
  (
    '10000002-0000-0000-0000-000000000001',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', -- Emma Admin
    '22222222-2222-2222-2222-222222222222',
    'company_admin',
    '["company:write", "user:write", "data:export", "report:create", "api_key:create", "audit_log:view"]'::jsonb,
    true,
    NULL,
    NOW() - INTERVAL '120 days',
    NOW() - INTERVAL '1 hour'
  ),
  (
    '10000002-0000-0000-0000-000000000002',
    'ffffffff-ffff-ffff-ffff-ffffffffffff', -- Frank User
    '22222222-2222-2222-2222-222222222222',
    'company_user',
    '["data:read", "data:write", "report:view"]'::jsonb,
    true,
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    NOW() - INTERVAL '80 days',
    NOW() - INTERVAL '6 hours'
  ),

  -- EcoSolutions Ltd (Company 3)
  (
    '10000003-0000-0000-0000-000000000001',
    'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0', -- Grace Admin
    '33333333-3333-3333-3333-333333333333',
    'company_admin',
    '["company:write", "user:write", "data:export", "report:create", "api_key:create", "audit_log:view"]'::jsonb,
    true,
    NULL,
    NOW() - INTERVAL '150 days',
    NOW() - INTERVAL '30 minutes'
  ),
  (
    '10000003-0000-0000-0000-000000000002',
    'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1', -- Henry Volunteer
    '33333333-3333-3333-3333-333333333333',
    'volunteer',
    '["data:read", "report:view"]'::jsonb,
    true,
    'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0',
    NOW() - INTERVAL '20 days',
    NOW() - INTERVAL '2 days'
  ),

  -- System Admin (access to all companies)
  (
    '10000099-0000-0000-0000-000000000001',
    'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2', -- System Admin
    '11111111-1111-1111-1111-111111111111',
    'system_admin',
    '[]'::jsonb, -- System admins have all permissions
    true,
    NULL,
    NOW() - INTERVAL '365 days',
    NOW() - INTERVAL '15 minutes'
  ),

  -- Deactivated user (test case)
  (
    '10000001-0000-0000-0000-000000000099',
    'd3d3d3d3-d3d3-d3d3-d3d3-d3d3d3d3d3d3', -- API Client (deactivated)
    '11111111-1111-1111-1111-111111111111',
    'api_client',
    '["data:read"]'::jsonb,
    false, -- Deactivated
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    NOW() - INTERVAL '100 days',
    NOW() - INTERVAL '50 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- 2. COMPANY API KEYS SEED DATA
-- =============================================================================

-- Note: In production, key_hash would be SHA-256 of actual API key
-- For testing, using mock hashes

INSERT INTO company_api_keys (
  id, company_id, key_hash, key_prefix, name, description, scopes, rate_limit_per_minute,
  last_used_at, usage_count, expires_at, created_by
) VALUES
  (
    '20000001-0000-0000-0000-000000000001',
    '11111111-1111-1111-1111-111111111111', -- Acme
    'aabbccdd' || REPEAT('0', 56), -- Mock hash
    'teei_live_abc',
    'Production API Key',
    'Main API key for data ingestion and reporting',
    '["data:read", "data:write", "report:view"]'::jsonb,
    120, -- 120 requests/min
    NOW() - INTERVAL '1 hour',
    15789,
    NOW() + INTERVAL '1 year',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  ),
  (
    '20000001-0000-0000-0000-000000000002',
    '11111111-1111-1111-1111-111111111111',
    '11223344' || REPEAT('0', 56),
    'teei_test_xyz',
    'Testing API Key',
    'Sandbox key for development testing',
    '["data:read"]'::jsonb,
    60,
    NOW() - INTERVAL '2 days',
    234,
    NOW() + INTERVAL '6 months',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  ),
  (
    '20000002-0000-0000-0000-000000000001',
    '22222222-2222-2222-2222-222222222222', -- GlobalTech
    '55667788' || REPEAT('0', 56),
    'teei_live_def',
    'Integration API Key',
    'Key for third-party integrations (Benevity, Goodera)',
    '["data:read", "data:write", "report:export"]'::jsonb,
    200,
    NOW() - INTERVAL '30 minutes',
    45623,
    NOW() + INTERVAL '2 years',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee'
  ),
  (
    '20000003-0000-0000-0000-000000000001',
    '33333333-3333-3333-3333-333333333333', -- EcoSolutions
    '99aabbcc' || REPEAT('0', 56),
    'teei_live_ghi',
    'Analytics API Key',
    'Read-only key for analytics dashboard',
    '["data:read", "report:view", "analytics:view"]'::jsonb,
    60,
    NOW() - INTERVAL '5 days',
    1024,
    NULL, -- No expiration
    'a0a0a0a0-a0a0-a0a0-a0a0-a0a0a0a0a0a0'
  ),
  -- Revoked API key (test case)
  (
    '20000001-0000-0000-0000-000000000099',
    '11111111-1111-1111-1111-111111111111',
    'deadbeef' || REPEAT('0', 56),
    'teei_live_old',
    'Deprecated API Key',
    'Old key, replaced by new one',
    '["data:read"]'::jsonb,
    60,
    NOW() - INTERVAL '60 days',
    9876,
    NULL,
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
  )
ON CONFLICT (id) DO NOTHING;

-- Revoke the deprecated key
UPDATE company_api_keys
SET
  revoked_at = NOW() - INTERVAL '30 days',
  revoked_by = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  revocation_reason = 'Key rotation - replaced with new key'
WHERE id = '20000001-0000-0000-0000-000000000099';

-- =============================================================================
-- 3. AUDIT LOGS SEED DATA
-- =============================================================================

-- Sample audit events for testing
INSERT INTO audit_logs (
  company_id, user_id, action, resource_type, resource_id, ip_address, user_agent,
  request_method, request_path, success, duration_ms
) VALUES
  -- Successful access events
  (
    '11111111-1111-1111-1111-111111111111',
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    'USER_LOGIN',
    'session',
    NULL,
    '203.0.113.42',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    'POST',
    '/api/auth/login',
    true,
    145
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    'DATA_EXPORT',
    'report',
    '12345678-1234-1234-1234-123456789abc',
    '203.0.113.43',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'GET',
    '/api/reports/12345678-1234-1234-1234-123456789abc/export',
    true,
    2340
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    'API_KEY_CREATED',
    'api_key',
    '20000002-0000-0000-0000-000000000001',
    '203.0.113.44',
    'Mozilla/5.0 (X11; Linux x86_64)',
    'POST',
    '/api/admin/api-keys',
    true,
    89
  ),
  -- Failed access attempts
  (
    '11111111-1111-1111-1111-111111111111',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    'TENANT_ACCESS_DENIED',
    'company',
    '22222222-2222-2222-2222-222222222222',
    '203.0.113.45',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X)',
    'GET',
    '/api/companies/22222222-2222-2222-2222-222222222222/data',
    false,
    23
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    NULL, -- Anonymous attempt
    'UNAUTHORIZED_ACCESS',
    'report',
    NULL,
    '203.0.113.46',
    'curl/7.68.0',
    'GET',
    '/api/reports',
    false,
    12
  ),
  -- Permission denied
  (
    '11111111-1111-1111-1111-111111111111',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    'PERMISSION_DENIED',
    'user',
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '203.0.113.47',
    'Mozilla/5.0 (Android 11; Mobile)',
    'DELETE',
    '/api/users/bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    false,
    8
  );

-- =============================================================================
-- 4. CONSENT RECORDS SEED DATA
-- =============================================================================

INSERT INTO consent_records (
  user_id, company_id, consent_type, granted, version, consent_text, ip_address, granted_at
) VALUES
  -- Alice consents (all granted)
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'necessary',
    true,
    '2.0',
    'I agree to necessary data processing for platform operation.',
    '203.0.113.42',
    NOW() - INTERVAL '90 days'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'analytics',
    true,
    '2.0',
    'I agree to analytics and performance monitoring.',
    '203.0.113.42',
    NOW() - INTERVAL '90 days'
  ),
  (
    'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
    '11111111-1111-1111-1111-111111111111',
    'marketing',
    false,
    '2.0',
    'I agree to receive marketing communications.',
    '203.0.113.42',
    NOW() - INTERVAL '90 days'
  ),
  -- Bob consents (analytics withdrawn)
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'necessary',
    true,
    '2.0',
    'I agree to necessary data processing for platform operation.',
    '203.0.113.43',
    NOW() - INTERVAL '60 days'
  ),
  (
    'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
    '11111111-1111-1111-1111-111111111111',
    'analytics',
    false,
    '2.0',
    'I agree to analytics and performance monitoring.',
    '203.0.113.43',
    NOW() - INTERVAL '60 days'
  ),
  -- Emma consents (all granted)
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '22222222-2222-2222-2222-222222222222',
    'necessary',
    true,
    '2.1',
    'I agree to necessary data processing for platform operation (updated terms).',
    '203.0.113.44',
    NOW() - INTERVAL '120 days'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '22222222-2222-2222-2222-222222222222',
    'analytics',
    true,
    '2.1',
    'I agree to analytics and performance monitoring.',
    '203.0.113.44',
    NOW() - INTERVAL '120 days'
  ),
  (
    'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
    '22222222-2222-2222-2222-222222222222',
    'marketing',
    true,
    '2.1',
    'I agree to receive marketing communications.',
    '203.0.113.44',
    NOW() - INTERVAL '120 days'
  );

-- Withdraw Bob's analytics consent
UPDATE consent_records
SET
  granted = false,
  withdrawn_at = NOW() - INTERVAL '30 days'
WHERE user_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb'
  AND consent_type = 'analytics';

-- =============================================================================
-- 5. DSAR REQUESTS SEED DATA
-- =============================================================================

INSERT INTO dsar_requests (
  id, user_id, company_id, request_type, status, requested_at, started_at, completed_at,
  export_url, export_size_bytes, export_expires_at, services_total, services_completed
) VALUES
  -- Completed export request
  (
    '30000001-0000-0000-0000-000000000001',
    'cccccccc-cccc-cccc-cccc-cccccccccccc',
    '11111111-1111-1111-1111-111111111111',
    'export',
    'completed',
    NOW() - INTERVAL '7 days',
    NOW() - INTERVAL '7 days' + INTERVAL '2 minutes',
    NOW() - INTERVAL '7 days' + INTERVAL '4 minutes',
    'https://s3.example.com/exports/30000001-0000-0000-0000-000000000001.zip.enc',
    5242880, -- 5 MB
    NOW() + INTERVAL '23 days', -- Expires in 23 days
    5,
    5
  ),
  -- Pending export request
  (
    '30000001-0000-0000-0000-000000000002',
    'ffffffff-ffff-ffff-ffff-ffffffffffff',
    '22222222-2222-2222-2222-222222222222',
    'export',
    'pending',
    NOW() - INTERVAL '1 hour',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    5,
    0
  ),
  -- Pending delete request (within cancellation window)
  (
    '30000001-0000-0000-0000-000000000003',
    'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1',
    '33333333-3333-3333-3333-333333333333',
    'delete',
    'pending',
    NOW() - INTERVAL '5 days',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    5,
    0
  ),
  -- Cancelled delete request
  (
    '30000001-0000-0000-0000-000000000004',
    'dddddddd-dddd-dddd-dddd-dddddddddddd',
    '11111111-1111-1111-1111-111111111111',
    'delete',
    'cancelled',
    NOW() - INTERVAL '20 days',
    NULL,
    NULL,
    NULL,
    NULL,
    NULL,
    5,
    0
  );

-- Set cancellation deadline for pending delete
UPDATE dsar_requests
SET cancellation_deadline = NOW() + INTERVAL '25 days'
WHERE id = '30000001-0000-0000-0000-000000000003';

-- =============================================================================
-- Verification
-- =============================================================================

DO $$
DECLARE
  company_users_count INT;
  api_keys_count INT;
  audit_logs_count INT;
  consent_records_count INT;
  dsar_requests_count INT;
BEGIN
  SELECT COUNT(*) INTO company_users_count FROM company_users;
  SELECT COUNT(*) INTO api_keys_count FROM company_api_keys;
  SELECT COUNT(*) INTO audit_logs_count FROM audit_logs;
  SELECT COUNT(*) INTO consent_records_count FROM consent_records;
  SELECT COUNT(*) INTO dsar_requests_count FROM dsar_requests;

  RAISE NOTICE 'Seed data inserted successfully:';
  RAISE NOTICE '  - Company Users: % rows', company_users_count;
  RAISE NOTICE '  - API Keys: % rows', api_keys_count;
  RAISE NOTICE '  - Audit Logs: % rows', audit_logs_count;
  RAISE NOTICE '  - Consent Records: % rows', consent_records_count;
  RAISE NOTICE '  - DSAR Requests: % rows', dsar_requests_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Test Users:';
  RAISE NOTICE '  - System Admin: system@teei.platform (access all companies)';
  RAISE NOTICE '  - Acme Admin: admin@acme.com';
  RAISE NOTICE '  - GlobalTech Admin: admin@globaltech.com';
  RAISE NOTICE '  - EcoSolutions Admin: admin@ecosolutions.com';
END $$;
