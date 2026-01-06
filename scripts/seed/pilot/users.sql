-- Pilot Users Seed Data
-- Purpose: Create 10 pilot users across 3 companies with different roles
-- Date: 2025-11-15
-- Environment: PILOT/DEMO ONLY
-- Dependencies: Requires companies.sql to be run first

-- =============================================================================
-- PILOT USERS
-- =============================================================================

-- Note: In production, these would be created via SSO/OIDC
-- For demo purposes, we're creating mock user records

INSERT INTO users (id, email, name, created_at)
VALUES
  -- Acme Corp users
  ('pilot001-user-0001-0001-000000000001', 'sarah.admin@acmecorp.example.com', 'Sarah Mitchell', NOW() - INTERVAL '6 months'),
  ('pilot001-user-0001-0001-000000000002', 'james.manager@acmecorp.example.com', 'James Chen', NOW() - INTERVAL '5 months'),
  ('pilot001-user-0001-0001-000000000003', 'emily.user@acmecorp.example.com', 'Emily Rodriguez', NOW() - INTERVAL '4 months'),
  ('pilot001-user-0001-0001-000000000004', 'michael.viewer@acmecorp.example.com', 'Michael Thompson', NOW() - INTERVAL '3 months'),

  -- TechCo users
  ('pilot002-user-0001-0001-000000000001', 'olivia.admin@techco.example.com', 'Olivia Barnes', NOW() - INTERVAL '5 months'),
  ('pilot002-user-0001-0001-000000000002', 'david.user@techco.example.com', 'David Wilson', NOW() - INTERVAL '4 months'),
  ('pilot002-user-0001-0001-000000000003', 'sophia.viewer@techco.example.com', 'Sophia Martinez', NOW() - INTERVAL '3 months'),

  -- GlobalCare users
  ('pilot003-user-0001-0001-000000000001', 'anders.admin@globalcare.example.com', 'Anders Nilsen', NOW() - INTERVAL '4 months'),
  ('pilot003-user-0001-0001-000000000002', 'ingrid.user@globalcare.example.com', 'Ingrid Hansen', NOW() - INTERVAL '3 months'),
  ('pilot003-user-0001-0001-000000000003', 'lars.viewer@globalcare.example.com', 'Lars Johansen', NOW() - INTERVAL '2 months')
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- COMPANY USERS MAPPING (Tenant Access Control)
-- =============================================================================

INSERT INTO company_users (
  id, user_id, company_id, role, permissions, is_active, invited_by, joined_at, last_access_at
) VALUES
  -- Acme Corp (Company 1)
  -- Sarah (Admin)
  (
    'pilot-cu-0001-0001-0001-000000000001',
    'pilot001-user-0001-0001-000000000001', -- Sarah
    'acme0001-0001-0001-0001-000000000001', -- Acme Corp
    'company_admin',
    '["company:write", "user:write", "data:export", "report:create", "api_key:create", "audit_log:view", "theme:edit"]'::jsonb,
    true,
    NULL, -- Self-invited (first admin)
    NOW() - INTERVAL '6 months',
    NOW() - INTERVAL '2 hours'
  ),
  -- James (Manager/Company User)
  (
    'pilot-cu-0001-0001-0001-000000000002',
    'pilot001-user-0001-0001-000000000002', -- James
    'acme0001-0001-0001-0001-000000000001',
    'company_user',
    '["data:read", "data:write", "report:view", "report:create", "report:export"]'::jsonb,
    true,
    'pilot001-user-0001-0001-000000000001', -- Invited by Sarah
    NOW() - INTERVAL '5 months',
    NOW() - INTERVAL '1 day'
  ),
  -- Emily (Company User)
  (
    'pilot-cu-0001-0001-0001-000000000003',
    'pilot001-user-0001-0001-000000000003', -- Emily
    'acme0001-0001-0001-0001-000000000001',
    'company_user',
    '["data:read", "data:write", "report:view", "report:export"]'::jsonb,
    true,
    'pilot001-user-0001-0001-000000000001',
    NOW() - INTERVAL '4 months',
    NOW() - INTERVAL '5 hours'
  ),
  -- Michael (Viewer)
  (
    'pilot-cu-0001-0001-0001-000000000004',
    'pilot001-user-0001-0001-000000000004', -- Michael
    'acme0001-0001-0001-0001-000000000001',
    'viewer',
    '["data:read", "report:view"]'::jsonb,
    true,
    'pilot001-user-0001-0001-000000000002', -- Invited by James
    NOW() - INTERVAL '3 months',
    NOW() - INTERVAL '1 week'
  ),

  -- TechCo Financial Services (Company 2)
  -- Olivia (Admin)
  (
    'pilot-cu-0002-0001-0001-000000000001',
    'pilot002-user-0001-0001-000000000001', -- Olivia
    'techc001-0001-0001-0001-000000000001', -- TechCo
    'company_admin',
    '["company:write", "user:write", "data:export", "report:create", "api_key:create", "audit_log:view", "theme:edit"]'::jsonb,
    true,
    NULL,
    NOW() - INTERVAL '5 months',
    NOW() - INTERVAL '3 hours'
  ),
  -- David (Company User)
  (
    'pilot-cu-0002-0001-0001-000000000002',
    'pilot002-user-0001-0001-000000000002', -- David
    'techc001-0001-0001-0001-000000000001',
    'company_user',
    '["data:read", "data:write", "report:view", "report:export"]'::jsonb,
    true,
    'pilot002-user-0001-0001-000000000001',
    NOW() - INTERVAL '4 months',
    NOW() - INTERVAL '2 days'
  ),
  -- Sophia (Viewer)
  (
    'pilot-cu-0002-0001-0001-000000000003',
    'pilot002-user-0001-0001-000000000003', -- Sophia
    'techc001-0001-0001-0001-000000000001',
    'viewer',
    '["data:read", "report:view"]'::jsonb,
    true,
    'pilot002-user-0001-0001-000000000001',
    NOW() - INTERVAL '3 months',
    NOW() - INTERVAL '4 days'
  ),

  -- GlobalCare Health (Company 3)
  -- Anders (Admin)
  (
    'pilot-cu-0003-0001-0001-000000000001',
    'pilot003-user-0001-0001-000000000001', -- Anders
    'globa001-0001-0001-0001-000000000001', -- GlobalCare
    'company_admin',
    '["company:write", "user:write", "data:export", "report:create", "api_key:create", "audit_log:view", "theme:edit"]'::jsonb,
    true,
    NULL,
    NOW() - INTERVAL '4 months',
    NOW() - INTERVAL '1 hour'
  ),
  -- Ingrid (Company User)
  (
    'pilot-cu-0003-0001-0001-000000000002',
    'pilot003-user-0001-0001-000000000002', -- Ingrid
    'globa001-0001-0001-0001-000000000001',
    'company_user',
    '["data:read", "data:write", "report:view", "report:export"]'::jsonb,
    true,
    'pilot003-user-0001-0001-000000000001',
    NOW() - INTERVAL '3 months',
    NOW() - INTERVAL '6 hours'
  ),
  -- Lars (Viewer)
  (
    'pilot-cu-0003-0001-0001-000000000003',
    'pilot003-user-0001-0001-000000000003', -- Lars
    'globa001-0001-0001-0001-000000000001',
    'viewer',
    '["data:read", "report:view"]'::jsonb,
    true,
    'pilot003-user-0001-0001-000000000001',
    NOW() - INTERVAL '2 months',
    NOW() - INTERVAL '3 days'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  users_count INT;
  company_users_count INT;
BEGIN
  SELECT COUNT(*) INTO users_count FROM users
  WHERE id LIKE 'pilot%';

  SELECT COUNT(*) INTO company_users_count FROM company_users
  WHERE id LIKE 'pilot-cu%';

  RAISE NOTICE '✓ Pilot users seed data loaded successfully';
  RAISE NOTICE '  - Users created: % of 10', users_count;
  RAISE NOTICE '  - Company user mappings created: % of 10', company_users_count;
  RAISE NOTICE '';
  RAISE NOTICE 'User Breakdown by Company:';
  RAISE NOTICE '  Acme Corp: 1 admin, 2 users, 1 viewer';
  RAISE NOTICE '  TechCo: 1 admin, 1 user, 1 viewer';
  RAISE NOTICE '  GlobalCare: 1 admin, 1 user, 1 viewer';
  RAISE NOTICE '';
  RAISE NOTICE 'Test Credentials (for demo login):';
  RAISE NOTICE '  Admin: sarah.admin@acmecorp.example.com';
  RAISE NOTICE '  User: james.manager@acmecorp.example.com';
  RAISE NOTICE '  Viewer: michael.viewer@acmecorp.example.com';
END $$;
