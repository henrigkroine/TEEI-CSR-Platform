-- Pilot Companies Seed Data
-- Purpose: Create 3 pilot companies with different industries for demo purposes
-- Date: 2025-11-15
-- Environment: PILOT/DEMO ONLY

-- =============================================================================
-- PILOT COMPANIES
-- =============================================================================

INSERT INTO companies (
  id,
  name,
  industry,
  size,
  country_code,
  employee_count,
  logo_url,
  website_url,
  contact_email,
  contact_phone,
  address_line1,
  city,
  state,
  postal_code,
  country,
  settings,
  is_active,
  created_at,
  updated_at
) VALUES
  -- Company 1: Acme Corp (Technology)
  (
    'acme0001-0001-0001-0001-000000000001',
    'Acme Corp',
    'technology',
    'enterprise',
    'USA',
    5000,
    '/logos/acme-corp-logo.svg',
    'https://acmecorp.example.com',
    'csr@acmecorp.example.com',
    '+1-555-0100',
    '123 Tech Boulevard',
    'San Francisco',
    'California',
    '94105',
    'United States',
    '{
      "branding": {
        "theme_preset": "corporate_blue",
        "primary_color": "#1E3A8A",
        "secondary_color": "#64748B",
        "accent_color": "#3B82F6"
      },
      "feature_flags": {
        "sroi_enabled": true,
        "vis_enabled": true,
        "q2q_enabled": true,
        "benchmarks_enabled": true,
        "partner_portal_enabled": true
      },
      "sroi_overrides": {
        "buddy_multiplier": 1.2,
        "kintell_multiplier": 1.5,
        "upskilling_multiplier": 2.0
      },
      "notification_settings": {
        "email_reports": true,
        "weekly_digest": true,
        "alerts_enabled": true
      }
    }'::jsonb,
    true,
    NOW() - INTERVAL '6 months',
    NOW() - INTERVAL '1 day'
  ),

  -- Company 2: TechCo (Finance/Fintech)
  (
    'techc001-0001-0001-0001-000000000001',
    'TechCo Financial Services',
    'finance',
    'large',
    'GBR',
    3200,
    '/logos/techco-logo.svg',
    'https://techcofinancial.example.com',
    'sustainability@techco.example.com',
    '+44-20-5555-0200',
    '45 Canary Wharf',
    'London',
    'England',
    'E14 5AB',
    'United Kingdom',
    '{
      "branding": {
        "theme_preset": "finance_gold",
        "primary_color": "#B45309",
        "secondary_color": "#1E3A8A",
        "accent_color": "#F59E0B"
      },
      "feature_flags": {
        "sroi_enabled": true,
        "vis_enabled": true,
        "q2q_enabled": true,
        "benchmarks_enabled": false,
        "partner_portal_enabled": false
      },
      "sroi_overrides": {
        "buddy_multiplier": 1.0,
        "kintell_multiplier": 1.3,
        "upskilling_multiplier": 1.8
      },
      "notification_settings": {
        "email_reports": true,
        "weekly_digest": false,
        "alerts_enabled": true
      }
    }'::jsonb,
    true,
    NOW() - INTERVAL '5 months',
    NOW() - INTERVAL '2 days'
  ),

  -- Company 3: GlobalCare (Healthcare)
  (
    'globa001-0001-0001-0001-000000000001',
    'GlobalCare Health',
    'healthcare',
    'medium',
    'NOR',
    1500,
    '/logos/globalcare-logo.svg',
    'https://globalcare.example.com',
    'impact@globalcare.example.com',
    '+47-22-55-0300',
    'Universitetsgata 12',
    'Oslo',
    'Oslo',
    '0164',
    'Norway',
    '{
      "branding": {
        "theme_preset": "healthcare_green",
        "primary_color": "#047857",
        "secondary_color": "#10B981",
        "accent_color": "#34D399"
      },
      "feature_flags": {
        "sroi_enabled": true,
        "vis_enabled": true,
        "q2q_enabled": true,
        "benchmarks_enabled": true,
        "partner_portal_enabled": true
      },
      "sroi_overrides": {
        "buddy_multiplier": 1.1,
        "kintell_multiplier": 1.4,
        "upskilling_multiplier": 1.9
      },
      "notification_settings": {
        "email_reports": true,
        "weekly_digest": true,
        "alerts_enabled": false
      }
    }'::jsonb,
    true,
    NOW() - INTERVAL '4 months',
    NOW() - INTERVAL '3 hours'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  settings = EXCLUDED.settings,
  updated_at = NOW();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  companies_count INT;
BEGIN
  SELECT COUNT(*) INTO companies_count FROM companies
  WHERE id IN (
    'acme0001-0001-0001-0001-000000000001',
    'techc001-0001-0001-0001-000000000001',
    'globa001-0001-0001-0001-000000000001'
  );

  RAISE NOTICE '✓ Pilot companies seed data loaded successfully';
  RAISE NOTICE '  - Companies created/updated: % of 3', companies_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Pilot Companies:';
  RAISE NOTICE '  1. Acme Corp (Technology) - San Francisco, USA';
  RAISE NOTICE '  2. TechCo Financial Services (Finance) - London, UK';
  RAISE NOTICE '  3. GlobalCare Health (Healthcare) - Oslo, Norway';
END $$;
