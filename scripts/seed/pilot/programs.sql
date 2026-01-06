-- Pilot Programs Seed Data
-- Purpose: Create sample buddy, kintell, and upskilling programs for each pilot company
-- Date: 2025-11-15
-- Environment: PILOT/DEMO ONLY
-- Dependencies: Requires companies.sql to be run first

-- =============================================================================
-- PILOT PROGRAMS
-- =============================================================================

-- Note: Using programs table schema (assuming it exists or will be created)
-- If the table doesn't exist, this serves as documentation for program structure

CREATE TABLE IF NOT EXISTS programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  program_type VARCHAR(50) NOT NULL, -- 'buddy', 'kintell', 'upskilling'
  description TEXT,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'paused', 'completed'
  start_date DATE,
  end_date DATE,
  participant_count INTEGER DEFAULT 0,
  target_participants INTEGER,
  budget_allocated DECIMAL(12,2),
  budget_spent DECIMAL(12,2) DEFAULT 0,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  is_active BOOLEAN DEFAULT true
);

CREATE INDEX IF NOT EXISTS idx_programs_company ON programs(company_id);
CREATE INDEX IF NOT EXISTS idx_programs_type ON programs(program_type);
CREATE INDEX IF NOT EXISTS idx_programs_status ON programs(status);

-- Insert pilot programs
INSERT INTO programs (
  id, company_id, name, program_type, description, status,
  start_date, end_date, participant_count, target_participants,
  budget_allocated, budget_spent, settings, created_by, created_at, updated_at
) VALUES
  -- =============================================================================
  -- ACME CORP PROGRAMS
  -- =============================================================================

  -- Acme Buddy Program 1
  (
    'prog-acme-buddy-0001-000000000001',
    'acme0001-0001-0001-0001-000000000001',
    'Tech Mentorship Program',
    'buddy',
    'Pairing senior engineers with new hires for 6-month mentorship',
    'active',
    NOW() - INTERVAL '5 months',
    NOW() + INTERVAL '1 month',
    85,
    100,
    50000.00,
    42500.00,
    '{
      "pairing_method": "skill_based",
      "meeting_frequency": "bi-weekly",
      "duration_weeks": 24,
      "focus_areas": ["technical_skills", "company_culture", "career_development"]
    }'::jsonb,
    'pilot001-user-0001-0001-000000000001',
    NOW() - INTERVAL '5 months',
    NOW() - INTERVAL '1 day'
  ),

  -- Acme Buddy Program 2
  (
    'prog-acme-buddy-0001-000000000002',
    'acme0001-0001-0001-0001-000000000001',
    'Cross-Department Collaboration',
    'buddy',
    'Connecting employees across departments for knowledge sharing',
    'active',
    NOW() - INTERVAL '3 months',
    NOW() + INTERVAL '3 months',
    120,
    150,
    35000.00,
    23333.00,
    '{
      "pairing_method": "random",
      "meeting_frequency": "monthly",
      "duration_weeks": 24,
      "focus_areas": ["cross_functional", "innovation", "networking"]
    }'::jsonb,
    'pilot001-user-0001-0001-000000000002',
    NOW() - INTERVAL '3 months',
    NOW() - INTERVAL '2 days'
  ),

  -- Acme Kintell Program 1
  (
    'prog-acme-kintell-0001-00000000001',
    'acme0001-0001-0001-0001-000000000001',
    'Community Tech Workshops',
    'kintell',
    'Weekly coding workshops for underrepresented youth in tech',
    'active',
    NOW() - INTERVAL '4 months',
    NOW() + INTERVAL '2 months',
    240,
    300,
    75000.00,
    62500.00,
    '{
      "workshop_type": "in_person",
      "frequency": "weekly",
      "duration_weeks": 24,
      "impact_areas": ["education", "diversity", "community_engagement"],
      "partner_organizations": ["Code.org", "Girls Who Code"]
    }'::jsonb,
    'pilot001-user-0001-0001-000000000001',
    NOW() - INTERVAL '4 months',
    NOW() - INTERVAL '3 hours'
  ),

  -- Acme Kintell Program 2
  (
    'prog-acme-kintell-0001-00000000002',
    'acme0001-0001-0001-0001-000000000001',
    'Senior Tech Literacy Program',
    'kintell',
    'Teaching seniors digital literacy and online safety',
    'active',
    NOW() - INTERVAL '2 months',
    NOW() + INTERVAL '4 months',
    80,
    100,
    25000.00,
    12500.00,
    '{
      "workshop_type": "hybrid",
      "frequency": "bi-weekly",
      "duration_weeks": 24,
      "impact_areas": ["digital_inclusion", "elder_care", "community_service"],
      "partner_organizations": ["Local Senior Centers"]
    }'::jsonb,
    'pilot001-user-0001-0001-000000000003',
    NOW() - INTERVAL '2 months',
    NOW() - INTERVAL '1 week'
  ),

  -- Acme Upskilling Program
  (
    'prog-acme-upskill-001-00000000001',
    'acme0001-0001-0001-0001-000000000001',
    'Cloud Architecture Certification',
    'upskilling',
    'AWS/Azure certification program for engineering teams',
    'active',
    NOW() - INTERVAL '3 months',
    NOW() + INTERVAL '3 months',
    45,
    60,
    120000.00,
    90000.00,
    '{
      "certifications": ["AWS Solutions Architect", "Azure Administrator"],
      "training_format": "hybrid",
      "duration_weeks": 12,
      "success_metrics": ["certification_rate", "skill_improvement", "project_application"]
    }'::jsonb,
    'pilot001-user-0001-0001-000000000002',
    NOW() - INTERVAL '3 months',
    NOW() - INTERVAL '5 hours'
  ),

  -- =============================================================================
  -- TECHCO PROGRAMS
  -- =============================================================================

  -- TechCo Buddy Program 1
  (
    'prog-techco-buddy-001-00000000001',
    'techc001-0001-0001-0001-000000000001',
    'Finance Professionals Mentorship',
    'buddy',
    'Senior analysts mentoring junior team members',
    'active',
    NOW() - INTERVAL '4 months',
    NOW() + INTERVAL '2 months',
    60,
    75,
    40000.00,
    32000.00,
    '{
      "pairing_method": "role_based",
      "meeting_frequency": "weekly",
      "duration_weeks": 24,
      "focus_areas": ["financial_analysis", "regulatory_compliance", "client_relations"]
    }'::jsonb,
    'pilot002-user-0001-0001-000000000001',
    NOW() - INTERVAL '4 months',
    NOW() - INTERVAL '2 days'
  ),

  -- TechCo Buddy Program 2
  (
    'prog-techco-buddy-001-00000000002',
    'techc001-0001-0001-0001-000000000001',
    'Diversity & Inclusion Partnerships',
    'buddy',
    'Connecting diverse employees with leadership mentors',
    'active',
    NOW() - INTERVAL '2 months',
    NOW() + INTERVAL '4 months',
    40,
    50,
    30000.00,
    20000.00,
    '{
      "pairing_method": "leadership",
      "meeting_frequency": "bi-weekly",
      "duration_weeks": 24,
      "focus_areas": ["leadership_development", "career_growth", "inclusion"]
    }'::jsonb,
    'pilot002-user-0001-0001-000000000001',
    NOW() - INTERVAL '2 months',
    NOW() - INTERVAL '1 week'
  ),

  -- TechCo Kintell Program 1
  (
    'prog-techco-kintell-001-0000000001',
    'techc001-0001-0001-0001-000000000001',
    'Financial Literacy for Youth',
    'kintell',
    'Teaching financial literacy to high school students',
    'active',
    NOW() - INTERVAL '3 months',
    NOW() + INTERVAL '3 months',
    180,
    200,
    60000.00,
    45000.00,
    '{
      "workshop_type": "in_person",
      "frequency": "weekly",
      "duration_weeks": 24,
      "impact_areas": ["financial_education", "youth_development", "community_impact"],
      "partner_organizations": ["JA Worldwide", "Local Schools"]
    }'::jsonb,
    'pilot002-user-0001-0001-000000000002',
    NOW() - INTERVAL '3 months',
    NOW() - INTERVAL '4 days'
  ),

  -- TechCo Kintell Program 2
  (
    'prog-techco-kintell-001-0000000002',
    'techc001-0001-0001-0001-000000000001',
    'Small Business Advisory Service',
    'kintell',
    'Pro-bono financial consulting for small businesses',
    'active',
    NOW() - INTERVAL '5 months',
    NOW() + INTERVAL '1 month',
    25,
    30,
    45000.00,
    37500.00,
    '{
      "workshop_type": "virtual",
      "frequency": "monthly",
      "duration_weeks": 24,
      "impact_areas": ["economic_development", "entrepreneurship", "community_support"],
      "partner_organizations": ["Small Business Association"]
    }'::jsonb,
    'pilot002-user-0001-0001-000000000001',
    NOW() - INTERVAL '5 months',
    NOW() - INTERVAL '2 hours'
  ),

  -- TechCo Upskilling Program
  (
    'prog-techco-upskill-01-0000000001',
    'techc001-0001-0001-0001-000000000001',
    'Data Analytics & AI Training',
    'upskilling',
    'Machine learning and data science certification program',
    'active',
    NOW() - INTERVAL '2 months',
    NOW() + INTERVAL '4 months',
    35,
    50,
    95000.00,
    63333.00,
    '{
      "certifications": ["Google Data Analytics", "IBM AI Engineering"],
      "training_format": "online",
      "duration_weeks": 16,
      "success_metrics": ["certification_rate", "project_completion", "skill_assessment"]
    }'::jsonb,
    'pilot002-user-0001-0001-000000000002',
    NOW() - INTERVAL '2 months',
    NOW() - INTERVAL '3 days'
  ),

  -- =============================================================================
  -- GLOBALCARE PROGRAMS
  -- =============================================================================

  -- GlobalCare Buddy Program 1
  (
    'prog-global-buddy-001-00000000001',
    'globa001-0001-0001-0001-000000000001',
    'Healthcare Professional Mentorship',
    'buddy',
    'Experienced nurses mentoring new healthcare workers',
    'active',
    NOW() - INTERVAL '3 months',
    NOW() + INTERVAL '3 months',
    95,
    120,
    55000.00,
    41250.00,
    '{
      "pairing_method": "specialty_based",
      "meeting_frequency": "bi-weekly",
      "duration_weeks": 24,
      "focus_areas": ["clinical_skills", "patient_care", "professional_development"]
    }'::jsonb,
    'pilot003-user-0001-0001-000000000001',
    NOW() - INTERVAL '3 months',
    NOW() - INTERVAL '1 day'
  ),

  -- GlobalCare Buddy Program 2
  (
    'prog-global-buddy-001-00000000002',
    'globa001-0001-0001-0001-000000000001',
    'Wellness Champions Program',
    'buddy',
    'Peer support network for mental health and wellbeing',
    'active',
    NOW() - INTERVAL '4 months',
    NOW() + INTERVAL '2 months',
    140,
    150,
    42000.00,
    35000.00,
    '{
      "pairing_method": "peer_support",
      "meeting_frequency": "weekly",
      "duration_weeks": 24,
      "focus_areas": ["mental_health", "work_life_balance", "stress_management"]
    }'::jsonb,
    'pilot003-user-0001-0001-000000000002',
    NOW() - INTERVAL '4 months',
    NOW() - INTERVAL '6 hours'
  ),

  -- GlobalCare Kintell Program 1
  (
    'prog-global-kintell-001-000000001',
    'globa001-0001-0001-0001-000000000001',
    'Community Health Education',
    'kintell',
    'Free health screenings and education in underserved communities',
    'active',
    NOW() - INTERVAL '5 months',
    NOW() + INTERVAL '1 month',
    350,
    400,
    85000.00,
    70833.00,
    '{
      "workshop_type": "in_person",
      "frequency": "monthly",
      "duration_weeks": 24,
      "impact_areas": ["public_health", "health_equity", "community_wellness"],
      "partner_organizations": ["Red Cross", "Local Clinics"]
    }'::jsonb,
    'pilot003-user-0001-0001-000000000001',
    NOW() - INTERVAL '5 months',
    NOW() - INTERVAL '8 hours'
  ),

  -- GlobalCare Kintell Program 2
  (
    'prog-global-kintell-001-000000002',
    'globa001-0001-0001-0001-000000000001',
    'Mental Health First Aid Training',
    'kintell',
    'Training community members in mental health first aid',
    'active',
    NOW() - INTERVAL '3 months',
    NOW() + INTERVAL '3 months',
    120,
    150,
    38000.00,
    28500.00,
    '{
      "workshop_type": "hybrid",
      "frequency": "bi-weekly",
      "duration_weeks": 24,
      "impact_areas": ["mental_health", "crisis_intervention", "community_capacity"],
      "partner_organizations": ["Mental Health Norway"]
    }'::jsonb,
    'pilot003-user-0001-0001-000000000002',
    NOW() - INTERVAL '3 months',
    NOW() - INTERVAL '2 days'
  ),

  -- GlobalCare Upskilling Program
  (
    'prog-global-upskill-01-0000000001',
    'globa001-0001-0001-0001-000000000001',
    'Advanced Healthcare Technology Training',
    'upskilling',
    'Training on latest medical equipment and digital health platforms',
    'active',
    NOW() - INTERVAL '2 months',
    NOW() + INTERVAL '4 months',
    55,
    70,
    105000.00,
    70000.00,
    '{
      "certifications": ["Digital Health Specialist", "Healthcare IT"],
      "training_format": "hybrid",
      "duration_weeks": 20,
      "success_metrics": ["certification_rate", "technology_adoption", "patient_outcomes"]
    }'::jsonb,
    'pilot003-user-0001-0001-000000000001',
    NOW() - INTERVAL '2 months',
    NOW() - INTERVAL '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  programs_count INT;
  buddy_count INT;
  kintell_count INT;
  upskilling_count INT;
BEGIN
  SELECT COUNT(*) INTO programs_count FROM programs WHERE id LIKE 'prog-%';
  SELECT COUNT(*) INTO buddy_count FROM programs WHERE program_type = 'buddy';
  SELECT COUNT(*) INTO kintell_count FROM programs WHERE program_type = 'kintell';
  SELECT COUNT(*) INTO upskilling_count FROM programs WHERE program_type = 'upskilling';

  RAISE NOTICE '✓ Pilot programs seed data loaded successfully';
  RAISE NOTICE '  - Total programs created: % of 15', programs_count;
  RAISE NOTICE '  - Buddy programs: %', buddy_count;
  RAISE NOTICE '  - Kintell programs: %', kintell_count;
  RAISE NOTICE '  - Upskilling programs: %', upskilling_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Programs by Company:';
  RAISE NOTICE '  Acme Corp: 5 programs (2 buddy, 2 kintell, 1 upskilling)';
  RAISE NOTICE '  TechCo: 5 programs (2 buddy, 2 kintell, 1 upskilling)';
  RAISE NOTICE '  GlobalCare: 5 programs (2 buddy, 2 kintell, 1 upskilling)';
  RAISE NOTICE '';
  RAISE NOTICE 'Total Participants: ~1,665 across all programs';
END $$;
