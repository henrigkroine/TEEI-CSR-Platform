-- SWARM 6 Seed Data: Beneficiary Groups
-- Purpose: Create realistic beneficiary group definitions for campaign targeting
-- Date: 2025-11-22
-- Agent: 2.3 (seed-data-engineer)
-- Dependencies: users table (for created_by FK)

-- =============================================================================
-- BENEFICIARY GROUPS SEED DATA
-- =============================================================================
-- Privacy-first group definitions:
-- - NO individual PII (names, emails, addresses)
-- - Aggregated demographics only (age ranges, not birthdates)
-- - Broad legal status categories
-- - GDPR-compliant group-level data
-- =============================================================================

INSERT INTO beneficiary_groups (
  id,
  name,
  description,
  group_type,
  country_code,
  region,
  city,
  age_range,
  gender_focus,
  primary_languages,
  language_requirement,
  legal_status_categories,
  eligible_program_types,
  eligibility_rules,
  min_group_size,
  max_group_size,
  tags,
  partner_organizations,
  is_active,
  is_public,
  created_at
) VALUES

-- =============================================================================
-- GROUP 1: Syrian Refugees in Berlin
-- =============================================================================
(
  'bg-syrian-refugees-berlin-001',
  'Syrian Refugees - Berlin',
  'Syrian refugees living in Berlin seeking integration support, language skills, and employment opportunities. Focus on language learning, professional networking, and cultural integration.',
  'refugees',
  'DE',
  'Berlin',
  'Berlin',
  '{"min": 18, "max": 55}'::jsonb,
  'all',
  '["ar", "en", "de"]'::jsonb,
  'beginner',
  '["refugee", "asylum_seeker"]'::jsonb,
  '["mentorship", "language", "buddy", "upskilling"]'::jsonb,
  '{
    "residency": "Germany",
    "integration_stage": ["early", "mid"],
    "support_needs": ["language", "employment", "cultural_integration"]
  }'::jsonb,
  10,
  100,
  '["refugees", "syrian", "integration", "berlin", "language_support", "employment"]'::jsonb,
  '["UNHCR", "Red Cross Germany", "Berlin Integration Office"]'::jsonb,
  true,
  true,
  NOW() - INTERVAL '6 months'
),

-- =============================================================================
-- GROUP 2: Afghan Women in Oslo
-- =============================================================================
(
  'bg-afghan-women-oslo-002',
  'Afghan Women - Oslo',
  'Afghan women in Oslo region seeking professional development, language skills, and community support. Gender-focused programming with emphasis on career development and social integration.',
  'refugees',
  'NO',
  'Oslo',
  'Oslo',
  '{"min": 20, "max": 45}'::jsonb,
  'women',
  '["ps", "fa", "en", "no"]'::jsonb,
  'conversational',
  '["refugee", "asylum_seeker"]'::jsonb,
  '["mentorship", "language", "buddy", "upskilling", "weei"]'::jsonb,
  '{
    "residency": "Norway",
    "gender_focus": "women",
    "integration_stage": ["early", "mid"],
    "support_needs": ["language", "employment", "professional_development", "community"]
  }'::jsonb,
  8,
  60,
  '["refugees", "afghan", "women", "oslo", "language_support", "professional_development", "integration"]'::jsonb,
  '["UNHCR Norway", "Norwegian Red Cross", "Oslo Women\'s Integration Center"]'::jsonb,
  true,
  true,
  NOW() - INTERVAL '5 months'
),

-- =============================================================================
-- GROUP 3: Migrants in Germany (Employment Focus)
-- =============================================================================
(
  'bg-migrants-germany-employment-003',
  'Migrants Seeking Employment - Germany',
  'Migrants across Germany seeking employment opportunities and professional upskilling. Focus on job readiness, technical skills, and workplace language proficiency.',
  'migrants',
  'DE',
  NULL,
  NULL,
  '{"min": 22, "max": 50}'::jsonb,
  'all',
  '["en", "de", "tr", "ar"]'::jsonb,
  'conversational',
  '["migrant", "citizen"]'::jsonb,
  '["mentorship", "upskilling", "weei"]'::jsonb,
  '{
    "residency": "Germany",
    "employment_status": ["seeking", "underemployed"],
    "support_needs": ["job_search", "upskilling", "workplace_integration"]
  }'::jsonb,
  15,
  200,
  '["migrants", "germany", "employment", "upskilling", "job_readiness", "professional"]'::jsonb,
  '["German Federal Employment Agency", "IOM Germany"]'::jsonb,
  true,
  true,
  NOW() - INTERVAL '4 months'
),

-- =============================================================================
-- GROUP 4: Women in Tech - Norway
-- =============================================================================
(
  'bg-women-in-tech-norway-004',
  'Women in Tech - Norway',
  'Women pursuing tech careers in Norway. Focus on technical skills development, mentorship, and professional networking. Open to all backgrounds including refugees, migrants, and citizens.',
  'women_in_tech',
  'NO',
  NULL,
  NULL,
  '{"min": 18, "max": 40}'::jsonb,
  'women',
  '["en", "no"]'::jsonb,
  'conversational',
  '["citizen", "migrant", "refugee", "student"]'::jsonb,
  '["mentorship", "upskilling", "buddy"]'::jsonb,
  '{
    "gender_focus": "women",
    "career_focus": ["technology", "IT", "software"],
    "support_needs": ["technical_skills", "mentorship", "networking", "career_development"]
  }'::jsonb,
  10,
  150,
  '["women", "tech", "norway", "IT", "professional_development", "mentorship", "upskilling"]'::jsonb,
  '["Women in Tech Norway", "Ada Norway", "Oslo Tech Hub"]'::jsonb,
  true,
  true,
  NOW() - INTERVAL '3 months'
),

-- =============================================================================
-- GROUP 5: Youth (18-25) - Integration Seekers
-- =============================================================================
(
  'bg-youth-integration-multi-005',
  'Youth Integration Seekers',
  'Young adults (18-25) from refugee and migrant backgrounds seeking integration, education, and early career support across Germany and Norway.',
  'youth',
  'DE',
  NULL,
  NULL,
  '{"min": 18, "max": 25}'::jsonb,
  'all',
  '["en", "de", "ar", "fa", "so"]'::jsonb,
  'beginner',
  '["refugee", "asylum_seeker", "migrant", "student"]'::jsonb,
  '["mentorship", "language", "buddy", "upskilling"]'::jsonb,
  '{
    "age_group": "youth",
    "integration_stage": ["early"],
    "support_needs": ["education", "language", "social_integration", "career_guidance"]
  }'::jsonb,
  12,
  120,
  '["youth", "integration", "education", "newcomers", "language_support", "mentorship"]'::jsonb,
  '["Youth Integration Network", "German Youth Welfare", "Oslo Youth Services"]'::jsonb,
  true,
  true,
  NOW() - INTERVAL '3 months'
),

-- =============================================================================
-- GROUP 6: Ukrainian Displaced Persons - Germany
-- =============================================================================
(
  'bg-ukrainian-displaced-germany-006',
  'Ukrainian Displaced Persons - Germany',
  'Displaced Ukrainians in Germany seeking temporary support, language skills, and professional continuity. Focus on rapid integration and skills preservation.',
  'displaced_persons',
  'DE',
  NULL,
  NULL,
  '{"min": 20, "max": 60}'::jsonb,
  'all',
  '["uk", "ru", "en", "de"]'::jsonb,
  'beginner',
  '["refugee", "migrant"]'::jsonb,
  '["language", "buddy", "upskilling", "weei"]'::jsonb,
  '{
    "displacement_context": "Ukraine conflict",
    "integration_stage": ["early", "mid"],
    "support_needs": ["language", "professional_continuity", "community", "family_support"]
  }'::jsonb,
  10,
  150,
  '["displaced_persons", "ukrainian", "germany", "language_support", "professional", "integration"]'::jsonb,
  '["UNHCR", "German Ukrainian Association", "Red Cross"]'::jsonb,
  true,
  true,
  NOW() - INTERVAL '8 months'
),

-- =============================================================================
-- GROUP 7: Seniors (55+) - Digital Inclusion
-- =============================================================================
(
  'bg-seniors-digital-inclusion-007',
  'Seniors Digital Inclusion',
  'Adults 55+ from diverse backgrounds seeking digital literacy and skills. Focus on technology access, digital tools, and online safety.',
  'seniors',
  'NO',
  NULL,
  NULL,
  '{"min": 55, "max": 75}'::jsonb,
  'all',
  '["no", "en"]'::jsonb,
  'any',
  '["citizen", "migrant", "refugee"]'::jsonb,
  '["buddy", "upskilling"]'::jsonb,
  '{
    "age_group": "seniors",
    "focus_area": "digital_literacy",
    "support_needs": ["technology_skills", "digital_safety", "social_connection"]
  }'::jsonb,
  6,
  40,
  '["seniors", "digital_inclusion", "norway", "technology", "community"]'::jsonb,
  '["Oslo Senior Center", "Digital Norway", "Red Cross"]'::jsonb,
  true,
  true,
  NOW() - INTERVAL '2 months'
),

-- =============================================================================
-- GROUP 8: Asylum Seekers - Multi-region Norway
-- =============================================================================
(
  'bg-asylum-seekers-norway-008',
  'Asylum Seekers - Norway',
  'Asylum seekers across Norway in various stages of application process. Focus on immediate integration support, basic language, and orientation.',
  'asylum_seekers',
  'NO',
  NULL,
  NULL,
  '{"min": 18, "max": 50}'::jsonb,
  'all',
  '["ar", "so", "ti", "en", "no"]'::jsonb,
  'beginner',
  '["asylum_seeker"]'::jsonb,
  '["language", "buddy"]'::jsonb,
  '{
    "residency": "Norway",
    "legal_status": "asylum_application_pending",
    "integration_stage": ["early"],
    "support_needs": ["language", "orientation", "community", "basic_integration"]
  }'::jsonb,
  8,
  80,
  '["asylum_seekers", "norway", "integration", "language_support", "orientation"]'::jsonb,
  '["Norwegian Directorate of Immigration", "UNHCR", "Norwegian Red Cross"]'::jsonb,
  true,
  true,
  NOW() - INTERVAL '4 months'
),

-- =============================================================================
-- GROUP 9: Professional Newcomers - Berlin Tech Sector
-- =============================================================================
(
  'bg-professional-newcomers-berlin-009',
  'Professional Newcomers - Berlin Tech',
  'Skilled professionals new to Berlin tech sector. Focus on professional networking, industry integration, and career advancement.',
  'newcomers',
  'DE',
  'Berlin',
  'Berlin',
  '{"min": 25, "max": 45}'::jsonb,
  'all',
  '["en", "de"]'::jsonb,
  'conversational',
  '["migrant", "citizen", "student"]'::jsonb,
  '["mentorship", "buddy", "upskilling"]'::jsonb,
  '{
    "professional_level": ["mid", "senior"],
    "industry_focus": ["technology", "IT", "software"],
    "support_needs": ["networking", "career_advancement", "cultural_integration"]
  }'::jsonb,
  8,
  100,
  '["newcomers", "professionals", "berlin", "tech", "networking", "integration"]'::jsonb,
  '["Berlin Tech Hub", "Expat Berlin", "Tech in Berlin"]'::jsonb,
  true,
  true,
  NOW() - INTERVAL '2 months'
),

-- =============================================================================
-- GROUP 10: Job Seekers - Multi-sector Germany
-- =============================================================================
(
  'bg-job-seekers-germany-multi-010',
  'Job Seekers - Germany Multi-sector',
  'Active job seekers from refugee, migrant, and citizen backgrounds across Germany. Focus on employment readiness, skills development, and job placement.',
  'job_seekers',
  'DE',
  NULL,
  NULL,
  '{"min": 20, "max": 55}'::jsonb,
  'all',
  '["de", "en", "tr", "ar", "fa"]'::jsonb,
  'conversational',
  '["citizen", "migrant", "refugee"]'::jsonb,
  '["mentorship", "upskilling", "weei"]'::jsonb,
  '{
    "employment_status": ["unemployed", "seeking_career_change"],
    "industries": ["hospitality", "healthcare", "IT", "manufacturing", "services"],
    "support_needs": ["job_search", "cv_improvement", "interview_skills", "upskilling"]
  }'::jsonb,
  12,
  200,
  '["job_seekers", "germany", "employment", "upskilling", "career_development", "multi_sector"]'::jsonb,
  '["German Federal Employment Agency", "Job Center", "IOM"]'::jsonb,
  true,
  true,
  NOW() - INTERVAL '5 months'
),

-- =============================================================================
-- GROUP 11: Family Caregivers - Norway
-- =============================================================================
(
  'bg-family-caregivers-norway-011',
  'Family Caregivers - Norway',
  'Primary family caregivers (often women) supporting family integration. Focus on community building, practical support, and work-life balance.',
  'caregivers',
  'NO',
  NULL,
  NULL,
  '{"min": 25, "max": 55}'::jsonb,
  'mixed',
  '["ar", "so", "ti", "no", "en"]'::jsonb,
  'beginner',
  '["refugee", "asylum_seeker", "migrant"]'::jsonb,
  '["buddy", "language"]'::jsonb,
  '{
    "family_role": "primary_caregiver",
    "support_needs": ["community", "practical_support", "language", "social_integration"]
  }'::jsonb,
  6,
  50,
  '["caregivers", "family", "norway", "community", "integration", "support"]'::jsonb,
  '["Norwegian Red Cross", "Family Integration Norway", "Local Community Centers"]'::jsonb,
  true,
  true,
  NOW() - INTERVAL '3 months'
),

-- =============================================================================
-- GROUP 12: Students (Higher Education) - Multi-country
-- =============================================================================
(
  'bg-students-higher-ed-multi-012',
  'International Students - Higher Education',
  'International students in higher education seeking integration, career preparation, and professional networking across Germany and Norway.',
  'students',
  'DE',
  NULL,
  NULL,
  '{"min": 18, "max": 30}'::jsonb,
  'all',
  '["en", "de", "no"]'::jsonb,
  'conversational',
  '["student"]'::jsonb,
  '["mentorship", "buddy", "upskilling", "weei"]'::jsonb,
  '{
    "education_level": "higher_education",
    "support_needs": ["career_preparation", "networking", "cultural_integration", "professional_development"]
  }'::jsonb,
  10,
  150,
  '["students", "higher_education", "international", "career_preparation", "networking"]'::jsonb,
  '["DAAD Germany", "SIU Norway", "University Support Services"]'::jsonb,
  true,
  true,
  NOW() - INTERVAL '4 months'
)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  total_count INT;
  active_count INT;
  countries_count INT;
  group_types_count INT;
BEGIN
  SELECT COUNT(*) INTO total_count FROM beneficiary_groups WHERE id LIKE 'bg-%';
  SELECT COUNT(*) INTO active_count FROM beneficiary_groups WHERE is_active = true AND id LIKE 'bg-%';
  SELECT COUNT(DISTINCT country_code) INTO countries_count FROM beneficiary_groups WHERE id LIKE 'bg-%';
  SELECT COUNT(DISTINCT group_type) INTO group_types_count FROM beneficiary_groups WHERE id LIKE 'bg-%';

  RAISE NOTICE '';
  RAISE NOTICE '✓ Beneficiary Groups seed data loaded successfully';
  RAISE NOTICE '  - Total groups created: %', total_count;
  RAISE NOTICE '  - Active groups: %', active_count;
  RAISE NOTICE '  - Countries covered: % (DE, NO)', countries_count;
  RAISE NOTICE '  - Group types: %', group_types_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Group Summary:';
  RAISE NOTICE '  1. Syrian Refugees - Berlin (DE)';
  RAISE NOTICE '  2. Afghan Women - Oslo (NO)';
  RAISE NOTICE '  3. Migrants Seeking Employment - Germany (DE)';
  RAISE NOTICE '  4. Women in Tech - Norway (NO)';
  RAISE NOTICE '  5. Youth Integration Seekers (DE)';
  RAISE NOTICE '  6. Ukrainian Displaced Persons - Germany (DE)';
  RAISE NOTICE '  7. Seniors Digital Inclusion (NO)';
  RAISE NOTICE '  8. Asylum Seekers - Norway (NO)';
  RAISE NOTICE '  9. Professional Newcomers - Berlin Tech (DE)';
  RAISE NOTICE '  10. Job Seekers - Germany Multi-sector (DE)';
  RAISE NOTICE '  11. Family Caregivers - Norway (NO)';
  RAISE NOTICE '  12. International Students - Higher Education';
  RAISE NOTICE '';
END $$;
