-- SWARM 6 Seed Data: Program Instances
-- Purpose: Runtime execution of campaigns with participant tracking and impact metrics
-- Date: 2025-11-22
-- Agent: 2.3 (seed-data-engineer)
-- Dependencies: campaigns, program_templates, beneficiary_groups, companies

-- =============================================================================
-- PROGRAM INSTANCES SEED DATA
-- =============================================================================
-- Runtime execution of campaigns
-- Demonstrates config merging (template + campaign overrides)
-- Realistic participant counts and activity levels
-- SROI/VIS scores based on program type and maturity
-- =============================================================================

INSERT INTO program_instances (
  id,
  name,
  campaign_id,
  program_template_id,
  company_id,
  beneficiary_group_id,
  start_date,
  end_date,
  status,
  config,
  enrolled_volunteers,
  enrolled_beneficiaries,
  active_pairs,
  active_groups,
  total_sessions_held,
  total_hours_logged,
  sroi_score,
  average_vis_score,
  outcome_scores,
  volunteers_consumed,
  credits_consumed,
  learners_served,
  created_at,
  updated_at,
  last_activity_at
) VALUES

-- =============================================================================
-- INSTANCES FOR CAMPAIGN 1: Acme - Syrian Refugees Mentorship
-- 3 cohorts running in parallel
-- =============================================================================
(
  'inst-syrian-mentors-cohort1-001',
  'Syrian Refugees Mentorship - Cohort 1',
  'camp-acme-syrian-mentors-q1-001',
  'tmpl-mentor-1on1-000000000001',
  'acme0001-0001-0001-0001-000000000001',
  'bg-syrian-refugees-berlin-001',
  '2025-01-01',
  '2025-06-30',
  'active',
  '{"sessionFormat": "1-on-1", "sessionDuration": 60, "sessionFrequency": "bi-weekly", "totalDuration": 24, "focusAreas": ["technical_skills", "career_development", "integration"]}'::jsonb,
  18, -- enrolled_volunteers
  18, -- enrolled_beneficiaries
  18, -- active_pairs
  NULL,
  162, -- total_sessions_held (18 pairs * 9 sessions avg)
  216.0, -- total_hours_logged (18 pairs * 12 hours)
  4.5, -- sroi_score
  79.0, -- average_vis_score
  '{"integration": 0.72, "career_readiness": 0.68, "confidence": 0.81}'::jsonb,
  18, -- volunteers_consumed
  NULL,
  18, -- learners_served
  NOW() - INTERVAL '5 months',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '3 days'
),

(
  'inst-syrian-mentors-cohort2-002',
  'Syrian Refugees Mentorship - Cohort 2',
  'camp-acme-syrian-mentors-q1-001',
  'tmpl-mentor-1on1-000000000001',
  'acme0001-0001-0001-0001-000000000001',
  'bg-syrian-refugees-berlin-001',
  '2025-01-15',
  '2025-07-15',
  'active',
  '{"sessionFormat": "1-on-1", "sessionDuration": 60, "sessionFrequency": "bi-weekly", "totalDuration": 24, "focusAreas": ["technical_skills", "career_development", "integration"]}'::jsonb,
  15, -- enrolled_volunteers
  15, -- enrolled_beneficiaries
  15, -- active_pairs
  NULL,
  135, -- total_sessions_held
  180.0, -- total_hours_logged
  4.0, -- sroi_score (slightly lower, earlier in program)
  77.5, -- average_vis_score
  '{"integration": 0.68, "career_readiness": 0.64, "confidence": 0.76}'::jsonb,
  15,
  NULL,
  15,
  NOW() - INTERVAL '4 months 15 days',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '2 days'
),

(
  'inst-syrian-mentors-cohort3-003',
  'Syrian Refugees Mentorship - Cohort 3',
  'camp-acme-syrian-mentors-q1-001',
  'tmpl-mentor-1on1-000000000001',
  'acme0001-0001-0001-0001-000000000001',
  'bg-syrian-refugees-berlin-001',
  '2025-02-01',
  '2025-08-01',
  'active',
  '{"sessionFormat": "1-on-1", "sessionDuration": 60, "sessionFrequency": "bi-weekly", "totalDuration": 24, "focusAreas": ["technical_skills", "career_development", "integration"]}'::jsonb,
  10, -- enrolled_volunteers
  10, -- enrolled_beneficiaries
  10, -- active_pairs
  NULL,
  90, -- total_sessions_held
  120.0, -- total_hours_logged
  3.8, -- sroi_score (newer cohort)
  78.0, -- average_vis_score
  '{"integration": 0.65, "career_readiness": 0.60, "confidence": 0.73}'::jsonb,
  10,
  NULL,
  10,
  NOW() - INTERVAL '4 months',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),

-- =============================================================================
-- INSTANCES FOR CAMPAIGN 2: GlobalCare - Afghan Women Language
-- 2 groups (different proficiency levels)
-- =============================================================================
(
  'inst-afghan-lang-groupA-004',
  'Afghan Women Norwegian - Group A (B1)',
  'camp-globalcare-afghan-lang-q1-002',
  'tmpl-lang-nor-inter-000000000002',
  'globa001-0001-0001-0001-000000000001',
  'bg-afghan-women-oslo-002',
  '2025-01-15',
  '2025-05-15',
  'active',
  '{"classSizeMin": 5, "classSizeMax": 8, "sessionDuration": 90, "sessionsPerWeek": 4, "totalWeeks": 16, "proficiencyLevels": ["B1"], "targetLanguages": ["no"], "deliveryMode": "hybrid"}'::jsonb,
  4, -- enrolled_volunteers (teachers/facilitators)
  20, -- enrolled_beneficiaries
  NULL,
  3, -- active_groups (20 students / ~7 per group)
  28, -- total_sessions_held
  210.0, -- total_hours_logged (4 volunteers * 52.5 hours)
  6.2, -- sroi_score (high for language)
  83.0, -- average_vis_score
  '{"language_proficiency": 0.78, "workplace_readiness": 0.72, "confidence": 0.85}'::jsonb,
  4,
  NULL,
  20,
  NOW() - INTERVAL '4 months',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),

(
  'inst-afghan-lang-groupB-005',
  'Afghan Women Norwegian - Group B (B2)',
  'camp-globalcare-afghan-lang-q1-002',
  'tmpl-lang-nor-inter-000000000002',
  'globa001-0001-0001-0001-000000000001',
  'bg-afghan-women-oslo-002',
  '2025-01-15',
  '2025-05-15',
  'active',
  '{"classSizeMin": 5, "classSizeMax": 8, "sessionDuration": 90, "sessionsPerWeek": 4, "totalWeeks": 16, "proficiencyLevels": ["B2"], "targetLanguages": ["no"], "deliveryMode": "hybrid"}'::jsonb,
  4, -- enrolled_volunteers
  18, -- enrolled_beneficiaries
  NULL,
  3, -- active_groups
  24, -- total_sessions_held
  206.0, -- total_hours_logged
  5.5, -- sroi_score
  81.5, -- average_vis_score
  '{"language_proficiency": 0.82, "workplace_readiness": 0.76, "confidence": 0.88}'::jsonb,
  4,
  NULL,
  18,
  NOW() - INTERVAL '4 months',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),

-- =============================================================================
-- INSTANCES FOR CAMPAIGN 3: TechCo - Tech Upskilling for Migrants
-- 2 tracks (Web Dev & Cloud)
-- =============================================================================
(
  'inst-migrants-tech-webdev-006',
  'Migrants Tech Bootcamp - Web Dev Track',
  'camp-techco-migrants-upskill-q1-003',
  'tmpl-upskill-tech-000000000001',
  'techc001-0001-0001-0001-000000000001',
  'bg-migrants-germany-employment-003',
  '2025-02-01',
  '2025-04-30',
  'active',
  '{"sessionFormat": "bootcamp", "sessionDuration": 180, "skillTracks": ["web_dev"], "mentorSupport": true, "certificationRequired": false, "difficultyLevels": ["beginner", "intermediate"]}'::jsonb,
  2, -- enrolled_volunteers
  12, -- enrolled_beneficiaries
  NULL,
  2, -- active_groups (2 cohorts)
  18, -- total_sessions_held
  144.0, -- total_hours_logged
  3.8, -- sroi_score
  76.0, -- average_vis_score
  '{"technical_skills": 0.70, "job_readiness": 0.62, "confidence": 0.74}'::jsonb,
  2,
  NULL,
  12,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '4 days'
),

(
  'inst-migrants-tech-cloud-007',
  'Migrants Tech Bootcamp - Cloud Track',
  'camp-techco-migrants-upskill-q1-003',
  'tmpl-upskill-tech-000000000001',
  'techc001-0001-0001-0001-000000000001',
  'bg-migrants-germany-employment-003',
  '2025-02-01',
  '2025-04-30',
  'active',
  '{"sessionFormat": "bootcamp", "sessionDuration": 180, "skillTracks": ["cloud"], "mentorSupport": true, "certificationRequired": false, "difficultyLevels": ["intermediate"]}'::jsonb,
  1, -- enrolled_volunteers
  9, -- enrolled_beneficiaries
  NULL,
  1, -- active_groups
  14, -- total_sessions_held
  108.0, -- total_hours_logged
  3.4, -- sroi_score
  74.5, -- average_vis_score
  '{"technical_skills": 0.68, "job_readiness": 0.60, "confidence": 0.71}'::jsonb,
  1,
  NULL,
  9,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '5 days'
),

-- =============================================================================
-- INSTANCES FOR CAMPAIGN 4: Acme - Youth Buddy (RECRUITING - minimal data)
-- =============================================================================
(
  'inst-youth-buddy-early-008',
  'Youth Integration Buddy - Early Matches',
  'camp-acme-youth-buddy-q2-004',
  'tmpl-buddy-1on1-000000000001',
  'acme0001-0001-0001-0001-000000000001',
  'bg-youth-integration-multi-005',
  '2025-03-01',
  '2025-09-01',
  'active',
  '{"matchMethod": "interest_based", "pairDuration": 24, "checkInFrequency": "monthly", "primaryGoals": ["integration", "social_support", "education"]}'::jsonb,
  12, -- enrolled_volunteers
  12, -- enrolled_beneficiaries
  12, -- active_pairs
  NULL,
  8, -- total_sessions_held (early stage)
  16.0, -- total_hours_logged
  NULL, -- Too early for SROI
  NULL, -- Too early for VIS
  '{}'::jsonb,
  12,
  10.0, -- credits_consumed (12 volunteers * ~0.83 credits)
  12,
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '2 days'
),

-- =============================================================================
-- INSTANCES FOR CAMPAIGN 5: GlobalCare - Women in Tech (OVER-CAPACITY)
-- 2 cohorts
-- =============================================================================
(
  'inst-women-tech-cohort1-009',
  'Women in Tech Networking - Cohort 1',
  'camp-globalcare-women-tech-q1-005',
  'tmpl-buddy-professional-000000000003',
  'globa001-0001-0001-0001-000000000001',
  'bg-women-in-tech-norway-004',
  '2025-01-01',
  '2025-04-30',
  'active',
  '{"matchMethod": "skill_based", "pairDuration": 16, "checkInFrequency": "bi-weekly", "primaryGoals": ["networking", "career_advancement"]}'::jsonb,
  17, -- enrolled_volunteers
  17, -- enrolled_beneficiaries
  17, -- active_pairs
  NULL,
  56, -- total_sessions_held
  272.0, -- total_hours_logged
  6.5, -- sroi_score
  89.0, -- average_vis_score
  '{"career_advancement": 0.82, "networking": 0.88, "confidence": 0.91}'::jsonb,
  17,
  NULL,
  17,
  NOW() - INTERVAL '4 months',
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '1 day'
),

(
  'inst-women-tech-cohort2-010',
  'Women in Tech Networking - Cohort 2',
  'camp-globalcare-women-tech-q1-005',
  'tmpl-buddy-professional-000000000003',
  'globa001-0001-0001-0001-000000000001',
  'bg-women-in-tech-norway-004',
  '2025-01-15',
  '2025-05-15',
  'active',
  '{"matchMethod": "skill_based", "pairDuration": 16, "checkInFrequency": "bi-weekly", "primaryGoals": ["networking", "career_advancement"]}'::jsonb,
  16, -- enrolled_volunteers
  16, -- enrolled_beneficiaries
  16, -- active_pairs
  NULL,
  52, -- total_sessions_held
  256.0, -- total_hours_logged
  6.0, -- sroi_score
  88.0, -- average_vis_score
  '{"career_advancement": 0.80, "networking": 0.86, "confidence": 0.89}'::jsonb,
  16,
  NULL,
  16,
  NOW() - INTERVAL '3 months 15 days',
  NOW() - INTERVAL '12 hours',
  NOW() - INTERVAL '2 days'
),

-- =============================================================================
-- INSTANCES FOR CAMPAIGN 6: TechCo - Seniors Digital
-- =============================================================================
(
  'inst-seniors-digital-group1-011',
  'Seniors Digital Literacy - Group 1',
  'camp-techco-seniors-digital-q1-006',
  'tmpl-upskill-digital-basics-000000000003',
  'techc001-0001-0001-0001-000000000001',
  'bg-seniors-digital-inclusion-007',
  '2025-02-15',
  '2025-04-15',
  'active',
  '{"coursePlatforms": ["custom"], "difficultyLevels": ["beginner"], "peerGroupsEnabled": true, "sessionDuration": 120}'::jsonb,
  4, -- enrolled_volunteers
  14, -- enrolled_beneficiaries
  NULL,
  2, -- active_groups (7 per group)
  18, -- total_sessions_held
  112.0, -- total_hours_logged
  2.8, -- sroi_score
  65.0, -- average_vis_score
  '{"digital_literacy": 0.68, "confidence": 0.71, "independence": 0.65}'::jsonb,
  4,
  NULL,
  14,
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '1 week',
  NOW() - INTERVAL '1 week'
),

-- =============================================================================
-- INSTANCES FOR CAMPAIGN 7: Acme - English for Asylum Seekers
-- 2 levels (A1 & A2)
-- =============================================================================
(
  'inst-asylum-english-a1-012',
  'Asylum Seekers English - A1 Level',
  'camp-acme-asylum-english-q1-007',
  'tmpl-lang-eng-basic-000000000001',
  'acme0001-0001-0001-0001-000000000001',
  'bg-asylum-seekers-norway-008',
  '2025-01-15',
  '2025-04-15',
  'active',
  '{"classSizeMin": 6, "classSizeMax": 10, "sessionDuration": 90, "sessionsPerWeek": 4, "totalWeeks": 12, "proficiencyLevels": ["A1"], "targetLanguages": ["en"], "deliveryMode": "in-person"}'::jsonb,
  3, -- enrolled_volunteers
  22, -- enrolled_beneficiaries
  NULL,
  3, -- active_groups
  21, -- total_sessions_held
  165.0, -- total_hours_logged
  4.8, -- sroi_score
  73.0, -- average_vis_score
  '{"language_proficiency": 0.72, "basic_communication": 0.78, "confidence": 0.75}'::jsonb,
  3,
  NULL,
  22,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '2 days'
),

(
  'inst-asylum-english-a2-013',
  'Asylum Seekers English - A2 Level',
  'camp-acme-asylum-english-q1-007',
  'tmpl-lang-eng-basic-000000000001',
  'acme0001-0001-0001-0001-000000000001',
  'bg-asylum-seekers-norway-008',
  '2025-01-15',
  '2025-04-15',
  'active',
  '{"classSizeMin": 6, "classSizeMax": 10, "sessionDuration": 90, "sessionsPerWeek": 4, "totalWeeks": 12, "proficiencyLevels": ["A2"], "targetLanguages": ["en"], "deliveryMode": "in-person"}'::jsonb,
  3, -- enrolled_volunteers
  18, -- enrolled_beneficiaries
  NULL,
  2, -- active_groups
  17, -- total_sessions_held
  139.0, -- total_hours_logged
  4.2, -- sroi_score
  71.0, -- average_vis_score
  '{"language_proficiency": 0.75, "basic_communication": 0.80, "confidence": 0.78}'::jsonb,
  3,
  NULL,
  18,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '3 days'
),

-- =============================================================================
-- INSTANCES FOR CAMPAIGN 10: Acme - Ukrainian Professionals
-- 2 industry-specific groups
-- =============================================================================
(
  'inst-ukrainian-prof-tech-014',
  'Ukrainian Professionals - Tech Sector',
  'camp-acme-ukrainian-prof-q1-010',
  'tmpl-buddy-professional-000000000003',
  'acme0001-0001-0001-0001-000000000001',
  'bg-ukrainian-displaced-germany-006',
  '2025-02-01',
  '2025-05-31',
  'active',
  '{"matchMethod": "professional_background", "pairDuration": 16, "checkInFrequency": "bi-weekly", "primaryGoals": ["professional_continuity", "integration", "networking"]}'::jsonb,
  18, -- enrolled_volunteers
  18, -- enrolled_beneficiaries
  18, -- active_pairs
  NULL,
  63, -- total_sessions_held
  288.0, -- total_hours_logged
  5.5, -- sroi_score
  82.0, -- average_vis_score
  '{"professional_continuity": 0.83, "integration": 0.75, "networking": 0.88}'::jsonb,
  18,
  NULL,
  18,
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),

(
  'inst-ukrainian-prof-business-015',
  'Ukrainian Professionals - Business Sector',
  'camp-acme-ukrainian-prof-q1-010',
  'tmpl-buddy-professional-000000000003',
  'acme0001-0001-0001-0001-000000000001',
  'bg-ukrainian-displaced-germany-006',
  '2025-02-01',
  '2025-05-31',
  'active',
  '{"matchMethod": "professional_background", "pairDuration": 16, "checkInFrequency": "bi-weekly", "primaryGoals": ["professional_continuity", "integration", "networking"]}'::jsonb,
  18, -- enrolled_volunteers
  18, -- enrolled_beneficiaries
  18, -- active_pairs
  NULL,
  63, -- total_sessions_held
  288.0, -- total_hours_logged
  4.9, -- sroi_score
  80.0, -- average_vis_score
  '{"professional_continuity": 0.80, "integration": 0.72, "networking": 0.84}'::jsonb,
  18,
  NULL,
  18,
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '2 days'
),

-- =============================================================================
-- INSTANCES FOR CAMPAIGN 12: TechCo - Student Career Preparation
-- 2 cohorts
-- =============================================================================
(
  'inst-students-career-cohort1-016',
  'Student Career Prep - Cohort 1',
  'camp-techco-students-career-q1-012',
  'tmpl-mentor-1on1-000000000001',
  'techc001-0001-0001-0001-000000000001',
  'bg-students-higher-ed-multi-012',
  '2025-01-10',
  '2025-06-30',
  'active',
  '{"sessionFormat": "1-on-1", "sessionDuration": 60, "sessionFrequency": "bi-weekly", "totalDuration": 24, "focusAreas": ["career", "networking", "interview_prep"]}'::jsonb,
  10, -- enrolled_volunteers
  10, -- enrolled_beneficiaries
  10, -- active_pairs
  NULL,
  100, -- total_sessions_held
  160.0, -- total_hours_logged
  4.0, -- sroi_score
  77.0, -- average_vis_score
  '{"career_readiness": 0.76, "interview_skills": 0.71, "networking": 0.80}'::jsonb,
  10,
  NULL,
  10,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '3 days'
),

(
  'inst-students-career-cohort2-017',
  'Student Career Prep - Cohort 2',
  'camp-techco-students-career-q1-012',
  'tmpl-mentor-1on1-000000000001',
  'techc001-0001-0001-0001-000000000001',
  'bg-students-higher-ed-multi-012',
  '2025-01-20',
  '2025-07-10',
  'active',
  '{"sessionFormat": "1-on-1", "sessionDuration": 60, "sessionFrequency": "bi-weekly", "totalDuration": 24, "focusAreas": ["career", "networking", "interview_prep"]}'::jsonb,
  9, -- enrolled_volunteers
  9, -- enrolled_beneficiaries
  9, -- active_pairs
  NULL,
  90, -- total_sessions_held
  144.0, -- total_hours_logged
  3.6, -- sroi_score
  76.0, -- average_vis_score
  '{"career_readiness": 0.74, "interview_skills": 0.68, "networking": 0.78}'::jsonb,
  9,
  NULL,
  9,
  NOW() - INTERVAL '2 months 25 days',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '4 days'
),

-- =============================================================================
-- INSTANCES FOR CAMPAIGN 13: Acme - Berlin Tech Newcomers
-- 2 cohorts (at capacity)
-- =============================================================================
(
  'inst-berlin-tech-network-c1-018',
  'Berlin Tech Newcomers - Cohort 1',
  'camp-acme-berlin-tech-network-q1-013',
  'tmpl-buddy-professional-000000000003',
  'acme0001-0001-0001-0001-000000000001',
  'bg-professional-newcomers-berlin-009',
  '2025-01-15',
  '2025-05-15',
  'active',
  '{"matchMethod": "professional_background", "pairDuration": 16, "checkInFrequency": "bi-weekly", "primaryGoals": ["networking", "integration"]}'::jsonb,
  18, -- enrolled_volunteers
  18, -- enrolled_beneficiaries
  18, -- active_pairs
  NULL,
  65, -- total_sessions_held
  288.0, -- total_hours_logged
  5.0, -- sroi_score
  80.0, -- average_vis_score
  '{"networking": 0.85, "integration": 0.78, "career_development": 0.80}'::jsonb,
  18,
  NULL,
  18,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),

(
  'inst-berlin-tech-network-c2-019',
  'Berlin Tech Newcomers - Cohort 2',
  'camp-acme-berlin-tech-network-q1-013',
  'tmpl-buddy-professional-000000000003',
  'acme0001-0001-0001-0001-000000000001',
  'bg-professional-newcomers-berlin-009',
  '2025-01-15',
  '2025-05-15',
  'active',
  '{"matchMethod": "professional_background", "pairDuration": 16, "checkInFrequency": "bi-weekly", "primaryGoals": ["networking", "integration"]}'::jsonb,
  17, -- enrolled_volunteers
  17, -- enrolled_beneficiaries
  17, -- active_pairs
  NULL,
  61, -- total_sessions_held
  272.0, -- total_hours_logged
  4.6, -- sroi_score
  78.0, -- average_vis_score
  '{"networking": 0.83, "integration": 0.75, "career_development": 0.77}'::jsonb,
  17,
  NULL,
  17,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '2 days'
),

-- =============================================================================
-- INSTANCES FOR CAMPAIGN 14: GlobalCare - German Youth (PAUSED)
-- =============================================================================
(
  'inst-german-youth-paused-020',
  'German Intensive Youth - Paused Group',
  'camp-globalcare-german-youth-q1-014',
  'tmpl-lang-ger-intensive-000000000004',
  'globa001-0001-0001-0001-000000000001',
  'bg-youth-integration-multi-005',
  '2025-01-20',
  '2025-06-10',
  'paused',
  '{"classSizeMin": 8, "classSizeMax": 12, "sessionDuration": 120, "sessionsPerWeek": 5, "totalWeeks": 20, "proficiencyLevels": ["A1", "A2", "B1"], "targetLanguages": ["de"], "deliveryMode": "in-person", "intensive": true}'::jsonb,
  2, -- enrolled_volunteers (shortage!)
  12, -- enrolled_beneficiaries
  NULL,
  2, -- active_groups (undersized)
  18, -- total_sessions_held (before pause)
  90.0, -- total_hours_logged
  2.1, -- sroi_score (low due to pause)
  58.0, -- average_vis_score
  '{"language_proficiency": 0.42, "attendance": 0.68}'::jsonb,
  2,
  NULL,
  12,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '2 weeks',
  NOW() - INTERVAL '2 weeks'
),

-- =============================================================================
-- INSTANCES FOR CAMPAIGN 15: TechCo - Hospitality LangProf (COMPLETED)
-- 2 cohorts
-- =============================================================================
(
  'inst-hosp-langprof-cohort1-021',
  'Hospitality Language+Prof - Cohort 1 (COMPLETED)',
  'camp-techco-hosp-langprof-q4-015',
  'tmpl-upskill-lang-prof-000000000004',
  'techc001-0001-0001-0001-000000000001',
  'bg-job-seekers-germany-multi-010',
  '2024-10-01',
  '2025-02-20',
  'completed',
  '{"skillTracks": ["hospitality", "language"], "difficultyLevels": ["beginner", "intermediate"], "sessionsPerWeek": 4, "totalWeeks": 20}'::jsonb,
  3, -- enrolled_volunteers
  12, -- enrolled_beneficiaries
  NULL,
  2, -- active_groups
  40, -- total_sessions_held
  480.0, -- total_hours_logged (3 volunteers * 160 hours)
  7.0, -- sroi_score (high - successful completion + job placements)
  85.0, -- average_vis_score
  '{"language_proficiency": 0.82, "job_readiness": 0.88, "employment": 0.75, "technical_skills": 0.78}'::jsonb,
  3,
  NULL,
  12,
  NOW() - INTERVAL '6 months',
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '1 month'
),

(
  'inst-hosp-langprof-cohort2-022',
  'Hospitality Language+Prof - Cohort 2 (COMPLETED)',
  'camp-techco-hosp-langprof-q4-015',
  'tmpl-upskill-lang-prof-000000000004',
  'techc001-0001-0001-0001-000000000001',
  'bg-job-seekers-germany-multi-010',
  '2024-10-01',
  '2025-02-20',
  'completed',
  '{"skillTracks": ["hospitality", "language"], "difficultyLevels": ["beginner", "intermediate"], "sessionsPerWeek": 4, "totalWeeks": 20}'::jsonb,
  3, -- enrolled_volunteers
  11, -- enrolled_beneficiaries
  NULL,
  2, -- active_groups
  36, -- total_sessions_held
  432.0, -- total_hours_logged
  6.0, -- sroi_score
  83.0, -- average_vis_score
  '{"language_proficiency": 0.80, "job_readiness": 0.84, "employment": 0.55, "technical_skills": 0.76}'::jsonb,
  3,
  NULL,
  11,
  NOW() - INTERVAL '6 months',
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '1 month'
),

-- =============================================================================
-- INSTANCES FOR CAMPAIGN 16: Acme - Women Tech Group Mentorship
-- 2 groups
-- =============================================================================
(
  'inst-women-tech-group-g1-023',
  'Women Tech Group Mentorship - Group 1',
  'camp-acme-women-tech-group-q1-016',
  'tmpl-mentor-group-000000000002',
  'acme0001-0001-0001-0001-000000000001',
  'bg-women-in-tech-norway-004',
  '2025-02-15',
  '2025-05-15',
  'active',
  '{"sessionFormat": "group", "sessionDuration": 90, "sessionFrequency": "weekly", "totalDuration": 12, "focusAreas": ["career", "peer_support", "community"], "groupSize": 8}'::jsonb,
  3, -- enrolled_volunteers (facilitators)
  12, -- enrolled_beneficiaries
  NULL,
  2, -- active_groups (6 per group)
  14, -- total_sessions_held
  70.0, -- total_hours_logged
  3.6, -- sroi_score
  70.0, -- average_vis_score
  '{"career_development": 0.68, "peer_support": 0.78, "confidence": 0.74}'::jsonb,
  3,
  NULL,
  12,
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),

(
  'inst-women-tech-group-g2-024',
  'Women Tech Group Mentorship - Group 2',
  'camp-acme-women-tech-group-q1-016',
  'tmpl-mentor-group-000000000002',
  'acme0001-0001-0001-0001-000000000001',
  'bg-women-in-tech-norway-004',
  '2025-02-15',
  '2025-05-15',
  'active',
  '{"sessionFormat": "group", "sessionDuration": 90, "sessionFrequency": "weekly", "totalDuration": 12, "focusAreas": ["career", "peer_support", "community"], "groupSize": 8}'::jsonb,
  2, -- enrolled_volunteers
  8, -- enrolled_beneficiaries
  NULL,
  1, -- active_groups
  10, -- total_sessions_held
  50.0, -- total_hours_logged
  3.2, -- sroi_score
  68.0, -- average_vis_score
  '{"career_development": 0.64, "peer_support": 0.76, "confidence": 0.70}'::jsonb,
  2,
  NULL,
  8,
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '3 days'
),

-- =============================================================================
-- INSTANCES FOR CAMPAIGN 9: TechCo - Job Seekers Certifications
-- =============================================================================
(
  'inst-jobseekers-cert-track1-025',
  'Job Seekers Certifications - PMP/Scrum Track',
  'camp-techco-jobseekers-cert-q1-009',
  'tmpl-upskill-prof-cert-000000000002',
  'techc001-0001-0001-0001-000000000001',
  'bg-job-seekers-germany-multi-010',
  '2025-01-15',
  '2025-05-15',
  'active',
  '{"certifications": ["PMP", "Scrum"], "certificationRequired": true, "platforms": ["coursera", "udemy"], "mentorSupport": true, "difficultyLevels": ["intermediate"]}'::jsonb,
  1, -- enrolled_volunteers
  8, -- enrolled_beneficiaries
  NULL,
  1, -- active_groups
  22, -- total_sessions_held
  128.0, -- total_hours_logged
  4.5, -- sroi_score
  73.0, -- average_vis_score
  '{"certification_progress": 0.70, "job_readiness": 0.65, "professional_skills": 0.72}'::jsonb,
  1,
  NULL,
  8,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '4 days'
),

(
  'inst-jobseekers-cert-track2-026',
  'Job Seekers Certifications - Google Analytics Track',
  'camp-techco-jobseekers-cert-q1-009',
  'tmpl-upskill-prof-cert-000000000002',
  'techc001-0001-0001-0001-000000000001',
  'bg-job-seekers-germany-multi-010',
  '2025-01-15',
  '2025-05-15',
  'active',
  '{"certifications": ["Google Analytics"], "certificationRequired": true, "platforms": ["coursera"], "mentorSupport": true, "difficultyLevels": ["beginner", "intermediate"]}'::jsonb,
  1, -- enrolled_volunteers
  5, -- enrolled_beneficiaries
  NULL,
  1, -- active_groups
  14, -- total_sessions_held
  80.0, -- total_hours_logged
  3.7, -- sroi_score
  70.0, -- average_vis_score
  '{"certification_progress": 0.64, "job_readiness": 0.60, "professional_skills": 0.68}'::jsonb,
  1,
  NULL,
  5,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '5 days'
)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  total_instances INT;
  by_status RECORD;
  participant_stats RECORD;
BEGIN
  SELECT COUNT(*) INTO total_instances FROM program_instances WHERE id LIKE 'inst-%';

  RAISE NOTICE '';
  RAISE NOTICE '✓ Program Instances seed data loaded successfully';
  RAISE NOTICE '  - Total instances created: %', total_instances;
  RAISE NOTICE '';

  RAISE NOTICE 'Instances by Status:';
  FOR by_status IN
    SELECT status, COUNT(*) as count
    FROM program_instances
    WHERE id LIKE 'inst-%'
    GROUP BY status
    ORDER BY status
  LOOP
    RAISE NOTICE '  - %: %', by_status.status, by_status.count;
  END LOOP;

  SELECT
    SUM(enrolled_volunteers) as total_volunteers,
    SUM(enrolled_beneficiaries) as total_beneficiaries,
    SUM(total_sessions_held) as total_sessions,
    ROUND(SUM(total_hours_logged)::numeric, 2) as total_hours,
    ROUND(AVG(sroi_score)::numeric, 2) as avg_sroi,
    ROUND(AVG(average_vis_score)::numeric, 2) as avg_vis
  INTO participant_stats
  FROM program_instances
  WHERE id LIKE 'inst-%';

  RAISE NOTICE '';
  RAISE NOTICE 'Aggregate Statistics:';
  RAISE NOTICE '  - Total volunteers enrolled: %', participant_stats.total_volunteers;
  RAISE NOTICE '  - Total beneficiaries served: %', participant_stats.total_beneficiaries;
  RAISE NOTICE '  - Total sessions held: %', participant_stats.total_sessions;
  RAISE NOTICE '  - Total hours logged: %', participant_stats.total_hours;
  RAISE NOTICE '  - Average SROI: %', participant_stats.avg_sroi;
  RAISE NOTICE '  - Average VIS: %', participant_stats.avg_vis;
  RAISE NOTICE '';
END $$;
