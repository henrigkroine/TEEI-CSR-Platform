-- SWARM 6 Seed Data: Campaigns
-- Purpose: Create sellable CSR campaigns linking templates, beneficiary groups, and commercial terms
-- Date: 2025-11-22
-- Agent: 2.3 (seed-data-engineer)
-- Dependencies: companies, program_templates, beneficiary_groups

-- =============================================================================
-- CAMPAIGNS SEED DATA
-- =============================================================================
-- Demonstrates all pricing models, statuses, and capacity scenarios
-- Links to existing companies (Acme, TechCo, GlobalCare)
-- =============================================================================

INSERT INTO campaigns (
  id,
  name,
  description,
  company_id,
  program_template_id,
  beneficiary_group_id,
  start_date,
  end_date,
  quarter,
  status,
  priority,
  target_volunteers,
  current_volunteers,
  target_beneficiaries,
  current_beneficiaries,
  max_sessions,
  current_sessions,
  budget_allocated,
  budget_spent,
  currency,
  pricing_model,
  -- Pricing model specific fields
  committed_seats,
  seat_price_per_month,
  credit_allocation,
  credit_consumption_rate,
  credits_remaining,
  iaas_metrics,
  custom_pricing_terms,
  -- Config overrides
  config_overrides,
  -- Impact metrics
  cumulative_sroi,
  average_vis,
  total_hours_logged,
  total_sessions_completed,
  -- Upsell indicators
  capacity_utilization,
  is_near_capacity,
  is_over_capacity,
  is_high_value,
  upsell_opportunity_score,
  -- Metadata
  tags,
  internal_notes,
  is_active,
  created_at,
  updated_at,
  last_metrics_update_at
) VALUES

-- =============================================================================
-- CAMPAIGN 1: Acme - Mentors for Syrian Refugees (ACTIVE, SEATS MODEL, 85% capacity)
-- =============================================================================
(
  'camp-acme-syrian-mentors-q1-001',
  'Mentors for Syrian Refugees - Q1 2025',
  'Career mentorship program connecting Acme engineers with Syrian refugees in Berlin. 1-on-1 mentorship over 6 months focused on technical skills and career development.',
  'acme0001-0001-0001-0001-000000000001', -- Acme Corp
  'tmpl-mentor-1on1-000000000001', -- Mentorship 1-on-1 (6 months)
  'bg-syrian-refugees-berlin-001', -- Syrian Refugees - Berlin
  '2025-01-01',
  '2025-06-30',
  '2025-Q1',
  'active',
  'high',
  50, -- target_volunteers
  43, -- current_volunteers (85% utilization)
  50, -- target_beneficiaries
  43, -- current_beneficiaries
  600, -- max_sessions (50 volunteers * 12 sessions)
  387, -- current_sessions (75% of max)
  25000.00,
  17800.00,
  'EUR',
  'seats',
  50, -- committed_seats
  85.00, -- seat_price_per_month (50 seats * €85 * 6 months = €25,500)
  NULL, NULL, NULL, NULL, NULL,
  '{"sessionFrequency": "bi-weekly", "focusAreas": ["technical_skills", "career_development", "integration"]}'::jsonb,
  4.2, -- cumulative_sroi
  78.5, -- average_vis
  516.0, -- total_hours_logged (43 volunteers * 12 hours)
  387,
  0.86, -- capacity_utilization (86%)
  true, -- is_near_capacity
  false,
  true, -- is_high_value (high SROI)
  85,
  '["mentorship", "refugees", "tech", "berlin", "integration"]'::jsonb,
  'High engagement campaign. Potential for Q2 expansion. Sales note: Client very satisfied.',
  true,
  NOW() - INTERVAL '5 months',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),

-- =============================================================================
-- CAMPAIGN 2: GlobalCare - Language Connect for Afghan Women (ACTIVE, IAAS MODEL, 95% capacity)
-- =============================================================================
(
  'camp-globalcare-afghan-lang-q1-002',
  'Language Connect for Afghan Women - Q1 2025',
  'Norwegian language program for Afghan women in Oslo. Group sessions (B1-B2 level) with focus on workplace language and professional integration.',
  'globa001-0001-0001-0001-000000000001', -- GlobalCare
  'tmpl-lang-nor-inter-000000000002', -- Norwegian Group Sessions (B1-B2)
  'bg-afghan-women-oslo-002', -- Afghan Women - Oslo
  '2025-01-15',
  '2025-05-15',
  '2025-Q1',
  'active',
  'high',
  8, -- target_volunteers (language teachers)
  8, -- current_volunteers (100%)
  40, -- target_beneficiaries
  38, -- current_beneficiaries (95%)
  64, -- max_sessions (16 weeks * 4 sessions/week)
  52, -- current_sessions
  18000.00,
  14200.00,
  'EUR',
  'iaas',
  NULL, NULL, NULL, NULL, NULL,
  '{
    "learnersCommitted": 40,
    "pricePerLearner": 450,
    "outcomesGuaranteed": ["language_proficiency_B1", "workplace_readiness"],
    "outcomeThresholds": {"language_improvement": 0.7, "completion_rate": 0.8}
  }'::jsonb,
  NULL,
  '{"sessionsPerWeek": 4, "deliveryMode": "hybrid", "assessmentFrequency": "bi-weekly"}'::jsonb,
  5.8, -- cumulative_sroi
  82.3, -- average_vis
  416.0, -- total_hours_logged (8 volunteers * 52 hours)
  52,
  0.95, -- capacity_utilization (95%)
  true, -- is_near_capacity
  false,
  true, -- is_high_value
  92,
  '["language", "norwegian", "women", "oslo", "workplace", "integration"]'::jsonb,
  'Excellent outcomes. Outcome SLA on track. Expand to 60 learners in Q2.',
  true,
  NOW() - INTERVAL '4 months',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day'
),

-- =============================================================================
-- CAMPAIGN 3: TechCo - Tech Upskilling for Migrants (ACTIVE, BUNDLE MODEL, 70% capacity)
-- =============================================================================
(
  'camp-techco-migrants-upskill-q1-003',
  'Tech Upskilling for Migrants - Q1 2025',
  'Tech skills bootcamp for migrants in Germany. 12-week program covering web development, cloud, and data analytics.',
  'techc001-0001-0001-0001-000000000001', -- TechCo
  'tmpl-upskill-tech-000000000001', -- Tech Skills Bootcamp (12 weeks)
  'bg-migrants-germany-employment-003', -- Migrants Seeking Employment - Germany
  '2025-02-01',
  '2025-04-30',
  '2025-Q1',
  'active',
  'medium',
  4, -- target_volunteers (mentors/coaches)
  3, -- current_volunteers
  30, -- target_beneficiaries
  21, -- current_beneficiaries (70%)
  48, -- max_sessions (12 weeks * 4 sessions/week)
  32, -- current_sessions
  15000.00,
  9800.00,
  'EUR',
  'bundle',
  NULL, NULL, NULL, NULL, NULL, NULL,
  '{
    "description": "Part of L2I-500 bundle allocation",
    "fixedFee": 15000,
    "variableComponents": []
  }'::jsonb,
  '{"skillTracks": ["web_dev", "cloud", "data_analytics"], "mentorSupport": true}'::jsonb,
  3.6,
  75.2,
  252.0, -- 3 volunteers * 84 hours
  32,
  0.70, -- capacity_utilization (70%)
  false,
  false,
  false,
  42,
  '["upskilling", "tech", "migrants", "bootcamp", "germany"]'::jsonb,
  'Room for more participants. Consider marketing push.',
  true,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '2 days'
),

-- =============================================================================
-- CAMPAIGN 4: Acme - Buddy Program for Youth Integration (RECRUITING, CREDITS MODEL)
-- =============================================================================
(
  'camp-acme-youth-buddy-q2-004',
  'Buddy Program for Youth Integration - Q2 2025',
  'Buddy matching program for young refugees and migrants (18-25) in Germany. 6-month commitment with monthly check-ins.',
  'acme0001-0001-0001-0001-000000000001', -- Acme Corp
  'tmpl-buddy-1on1-000000000001', -- Buddy 1-on-1 Matching (6 months)
  'bg-youth-integration-multi-005', -- Youth Integration Seekers
  '2025-04-01',
  '2025-09-30',
  '2025-Q2',
  'recruiting',
  'medium',
  80, -- target_volunteers
  12, -- current_volunteers (15% - still recruiting)
  80, -- target_beneficiaries
  12, -- current_beneficiaries
  NULL,
  8, -- current_sessions
  12000.00,
  1200.00,
  'EUR',
  'credits',
  NULL, NULL,
  10000, -- credit_allocation (total credits)
  1.25, -- credit_consumption_rate (credits per hour)
  9990, -- credits_remaining
  NULL, NULL,
  '{"checkInFrequency": "monthly", "primaryGoals": ["integration", "social_support", "education"]}'::jsonb,
  NULL, -- No metrics yet (recruiting)
  NULL,
  16.0, -- small amount of hours from early matches
  8,
  0.15, -- capacity_utilization (15%)
  false,
  false,
  false,
  10,
  '["buddy", "youth", "integration", "germany", "recruitment"]'::jsonb,
  'Recruitment phase. Launch event scheduled for March 15.',
  true,
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),

-- =============================================================================
-- CAMPAIGN 5: GlobalCare - Professional Networking for Women in Tech (ACTIVE, SEATS, 110% OVER-CAPACITY)
-- =============================================================================
(
  'camp-globalcare-women-tech-q1-005',
  'Professional Networking for Women in Tech - Q1 2025',
  'Mentorship and networking program for women pursuing tech careers in Norway. Exceeded capacity due to high demand.',
  'globa001-0001-0001-0001-000000000001', -- GlobalCare
  'tmpl-buddy-professional-000000000003', -- Professional Networking Buddy (4 months)
  'bg-women-in-tech-norway-004', -- Women in Tech - Norway
  '2025-01-01',
  '2025-04-30',
  '2025-Q1',
  'active',
  'critical', -- Critical due to over-capacity
  30, -- target_volunteers
  33, -- current_volunteers (110%)
  30, -- target_beneficiaries
  33, -- current_beneficiaries (110%)
  120, -- max_sessions
  108, -- current_sessions
  9000.00,
  7850.00,
  'EUR',
  'seats',
  30, -- committed_seats
  50.00, -- seat_price_per_month
  NULL, NULL, NULL, NULL, NULL,
  '{"matchingCriteria": ["tech_role", "career_stage"], "primaryGoals": ["networking", "career_advancement"]}'::jsonb,
  6.2, -- High SROI
  88.5, -- High VIS
  528.0, -- 33 volunteers * 16 hours
  108,
  1.10, -- capacity_utilization (110% - over capacity)
  true,
  true, -- is_over_capacity
  true, -- is_high_value
  95,
  '["women", "tech", "norway", "networking", "mentorship", "professional"]'::jsonb,
  'URGENT: Over capacity. Upsell opportunity - expand to 50 seats for Q2.',
  true,
  NOW() - INTERVAL '4 months',
  NOW() - INTERVAL '6 hours',
  NOW() - INTERVAL '6 hours'
),

-- =============================================================================
-- CAMPAIGN 6: TechCo - Digital Literacy for Seniors (ACTIVE, CUSTOM PRICING, 55% capacity)
-- =============================================================================
(
  'camp-techco-seniors-digital-q1-006',
  'Digital Literacy for Seniors - Q1 2025',
  'Digital skills training for seniors (55+) in Norway. Focus on technology access, online safety, and digital tools.',
  'techc001-0001-0001-0001-000000000001', -- TechCo
  'tmpl-upskill-digital-basics-000000000003', -- Digital Literacy Fundamentals (8 weeks)
  'bg-seniors-digital-inclusion-007', -- Seniors Digital Inclusion
  '2025-02-15',
  '2025-04-15',
  '2025-Q1',
  'active',
  'low',
  6, -- target_volunteers
  4, -- current_volunteers
  25, -- target_beneficiaries
  14, -- current_beneficiaries (56%)
  32, -- max_sessions (8 weeks * 4 sessions/week)
  18, -- current_sessions
  5000.00,
  2100.00,
  'EUR',
  'custom',
  NULL, NULL, NULL, NULL, NULL, NULL,
  '{
    "description": "CSR community grant - subsidized program",
    "fixedFee": 2500,
    "variableComponents": [{"type": "materials", "cost": 2500}],
    "milestonePayments": [{"milestone": "program_start", "amount": 1250}, {"milestone": "program_end", "amount": 1250}]
  }'::jsonb,
  '{"coursePlatforms": ["custom"], "difficultyLevels": ["beginner"], "peerGroupsEnabled": true}'::jsonb,
  2.8,
  65.0,
  112.0,
  18,
  0.56, -- capacity_utilization (56%)
  false,
  false,
  false,
  25,
  '["seniors", "digital_literacy", "norway", "community", "csr"]'::jsonb,
  'Community CSR project. Lower priority but good brand visibility.',
  true,
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '1 week',
  NOW() - INTERVAL '1 week'
),

-- =============================================================================
-- CAMPAIGN 7: Acme - English for Asylum Seekers (ACTIVE, IAAS, 80% capacity)
-- =============================================================================
(
  'camp-acme-asylum-english-q1-007',
  'English for Asylum Seekers - Q1 2025',
  'Basic English language program for asylum seekers in Norway. A1-A2 level group sessions.',
  'acme0001-0001-0001-0001-000000000001', -- Acme Corp
  'tmpl-lang-eng-basic-000000000001', -- English Group Sessions (A1-A2)
  'bg-asylum-seekers-norway-008', -- Asylum Seekers - Norway
  '2025-01-15',
  '2025-04-15',
  '2025-Q1',
  'active',
  'high',
  6, -- target_volunteers (teachers)
  6, -- current_volunteers
  50, -- target_beneficiaries
  40, -- current_beneficiaries (80%)
  48, -- max_sessions (12 weeks * 4/week)
  38, -- current_sessions
  12000.00,
  9200.00,
  'EUR',
  'iaas',
  NULL, NULL, NULL, NULL, NULL,
  '{
    "learnersCommitted": 50,
    "pricePerLearner": 240,
    "outcomesGuaranteed": ["basic_english_A1", "survival_english"],
    "outcomeThresholds": {"language_improvement": 0.6, "attendance_rate": 0.75}
  }'::jsonb,
  NULL,
  '{"classSizeMin": 6, "classSizeMax": 10, "sessionsPerWeek": 4, "deliveryMode": "in-person"}'::jsonb,
  4.5,
  72.0,
  304.0, -- 6 volunteers * 50.67 hours
  38,
  0.80, -- capacity_utilization (80%)
  true,
  false,
  false,
  68,
  '["language", "english", "asylum_seekers", "norway", "basic"]'::jsonb,
  'On track for outcome SLA. Good progression.',
  true,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day'
),

-- =============================================================================
-- CAMPAIGN 8: GlobalCare - Family Integration Buddy (PLANNED, SEATS MODEL)
-- =============================================================================
(
  'camp-globalcare-family-buddy-q2-008',
  'Family Integration Buddy - Q2 2025',
  'Long-term (12 months) buddy support for refugee families in Norway. Focus on practical integration support.',
  'globa001-0001-0001-0001-000000000001', -- GlobalCare
  'tmpl-buddy-family-000000000004', -- Family Integration Buddy (12 months)
  'bg-family-caregivers-norway-011', -- Family Caregivers - Norway
  '2025-04-01',
  '2026-03-31',
  '2025-Q2',
  'planned',
  'medium',
  20, -- target_volunteers
  0, -- current_volunteers (not started)
  20, -- target_beneficiaries
  0, -- current_beneficiaries
  NULL,
  0,
  16000.00,
  0.00,
  'EUR',
  'seats',
  20, -- committed_seats
  67.00, -- seat_price_per_month (20 seats * €67 * 12 months = €16,080)
  NULL, NULL, NULL, NULL, NULL,
  '{"pairDuration": 52, "checkInFrequency": "weekly", "activityTracking": true}'::jsonb,
  NULL, NULL, 0.0, 0,
  0.00, -- capacity_utilization (0% - planned)
  false,
  false,
  false,
  0,
  '["buddy", "family", "integration", "norway", "long_term"]'::jsonb,
  'Planned for Q2. Volunteer recruitment starting in March.',
  true,
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '3 days',
  NULL
),

-- =============================================================================
-- CAMPAIGN 9: TechCo - Professional Certifications for Job Seekers (ACTIVE, BUNDLE, 65%)
-- =============================================================================
(
  'camp-techco-jobseekers-cert-q1-009',
  'Professional Certifications for Job Seekers - Q1 2025',
  '16-week certification program (PMP, Scrum, Google Analytics) for job seekers across Germany.',
  'techc001-0001-0001-0001-000000000001', -- TechCo
  'tmpl-upskill-prof-cert-000000000002', -- Professional Certifications (16 weeks)
  'bg-job-seekers-germany-multi-010', -- Job Seekers - Germany Multi-sector
  '2025-01-15',
  '2025-05-15',
  '2025-Q1',
  'active',
  'medium',
  3, -- target_volunteers (coaches)
  2, -- current_volunteers
  20, -- target_beneficiaries
  13, -- current_beneficiaries (65%)
  64, -- max_sessions (16 weeks * 4/week)
  36, -- current_sessions
  16000.00,
  10200.00,
  'EUR',
  'bundle',
  NULL, NULL, NULL, NULL, NULL, NULL,
  '{
    "description": "Part of L2I-500 bundle",
    "fixedFee": 16000,
    "bundlePercent": 0.30
  }'::jsonb,
  '{"certificationRequired": true, "platforms": ["coursera", "udemy"], "mentorSupport": true}'::jsonb,
  4.1,
  71.5,
  208.0, -- 2 volunteers * 104 hours
  36,
  0.65, -- capacity_utilization (65%)
  false,
  false,
  false,
  48,
  '["upskilling", "certification", "job_seekers", "germany", "professional"]'::jsonb,
  'Moderate performance. Could improve marketing.',
  true,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '4 days',
  NOW() - INTERVAL '2 days'
),

-- =============================================================================
-- CAMPAIGN 10: Acme - Ukrainian Professionals Integration (ACTIVE, SEATS, 90%)
-- =============================================================================
(
  'camp-acme-ukrainian-prof-q1-010',
  'Ukrainian Professional Integration - Q1 2025',
  'Professional networking and language support for displaced Ukrainian professionals in Germany.',
  'acme0001-0001-0001-0001-000000000001', -- Acme Corp
  'tmpl-buddy-professional-000000000003', -- Professional Networking Buddy
  'bg-ukrainian-displaced-germany-006', -- Ukrainian Displaced Persons - Germany
  '2025-02-01',
  '2025-05-31',
  '2025-Q1',
  'active',
  'high',
  40, -- target_volunteers
  36, -- current_volunteers (90%)
  40, -- target_beneficiaries
  36, -- current_beneficiaries
  160, -- max_sessions
  126, -- current_sessions
  14000.00,
  11800.00,
  'EUR',
  'seats',
  40, -- committed_seats
  88.00, -- seat_price_per_month
  NULL, NULL, NULL, NULL, NULL,
  '{"matchingCriteria": ["professional_background", "industry"], "primaryGoals": ["professional_continuity", "integration"]}'::jsonb,
  5.2,
  81.0,
  576.0, -- 36 volunteers * 16 hours
  126,
  0.90, -- capacity_utilization (90%)
  true,
  false,
  true, -- is_high_value
  88,
  '["ukrainian", "professionals", "networking", "germany", "displaced_persons"]'::jsonb,
  'High satisfaction. Consider expansion for Q2.',
  true,
  NOW() - INTERVAL '2 months',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),

-- =============================================================================
-- CAMPAIGN 11: GlobalCare - Cloud Computing for Migrants (RECRUITING, CREDITS)
-- =============================================================================
(
  'camp-globalcare-cloud-migrants-q2-011',
  'Cloud Computing for Migrants - Q2 2025',
  '14-week cloud certification program (AWS/Azure) for tech-interested migrants in Germany.',
  'globa001-0001-0001-0001-000000000001', -- GlobalCare
  'tmpl-upskill-cloud-000000000005', -- Cloud Computing Certification (14 weeks)
  'bg-migrants-germany-employment-003', -- Migrants Seeking Employment - Germany
  '2025-04-01',
  '2025-07-15',
  '2025-Q2',
  'recruiting',
  'medium',
  2, -- target_volunteers
  1, -- current_volunteers (recruiting)
  15, -- target_beneficiaries
  3, -- current_beneficiaries (early recruitment)
  56, -- max_sessions
  2, -- current_sessions
  9000.00,
  450.00,
  'EUR',
  'credits',
  NULL, NULL,
  7500, -- credit_allocation
  1.35, -- credit_consumption_rate
  7497, -- credits_remaining (barely started)
  NULL, NULL,
  '{"skillTracks": ["cloud"], "certificationRequired": true, "platforms": ["pluralsight"]}'::jsonb,
  NULL,
  NULL,
  14.0, -- minimal hours
  2,
  0.20, -- capacity_utilization (20%)
  false,
  false,
  false,
  12,
  '["upskilling", "cloud", "migrants", "germany", "recruitment"]'::jsonb,
  'Early recruitment. Program starts April 1.',
  true,
  NOW() - INTERVAL '3 weeks',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '2 days'
),

-- =============================================================================
-- CAMPAIGN 12: TechCo - Student Career Preparation (ACTIVE, IAAS, 75%)
-- =============================================================================
(
  'camp-techco-students-career-q1-012',
  'Student Career Preparation - Q1 2025',
  'Career mentorship and networking for international students in higher education.',
  'techc001-0001-0001-0001-000000000001', -- TechCo
  'tmpl-mentor-1on1-000000000001', -- Mentorship 1-on-1
  'bg-students-higher-ed-multi-012', -- International Students - Higher Education
  '2025-01-10',
  '2025-06-30',
  '2025-Q1',
  'active',
  'medium',
  25, -- target_volunteers
  19, -- current_volunteers (76%)
  25, -- target_beneficiaries
  19, -- current_beneficiaries
  300, -- max_sessions
  190, -- current_sessions
  11000.00,
  8100.00,
  'EUR',
  'iaas',
  NULL, NULL, NULL, NULL, NULL,
  '{
    "learnersCommitted": 25,
    "pricePerLearner": 440,
    "outcomesGuaranteed": ["career_readiness", "job_placement_support"],
    "outcomeThresholds": {"career_readiness": 0.75, "interview_rate": 0.60}
  }'::jsonb,
  NULL,
  '{"sessionFrequency": "bi-weekly", "focusAreas": ["career", "networking", "interview_prep"]}'::jsonb,
  3.8,
  76.5,
  304.0, -- 19 volunteers * 16 hours
  190,
  0.76, -- capacity_utilization (76%)
  false,
  false,
  false,
  55,
  '["mentorship", "students", "career", "international", "higher_education"]'::jsonb,
  'Good engagement. On track for outcome targets.',
  true,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '3 days',
  NOW() - INTERVAL '2 days'
),

-- =============================================================================
-- CAMPAIGN 13: Acme - Berlin Tech Newcomers Network (ACTIVE, BUNDLE, 100%)
-- =============================================================================
(
  'camp-acme-berlin-tech-network-q1-013',
  'Berlin Tech Newcomers Network - Q1 2025',
  'Buddy networking program for tech professionals new to Berlin. Focus on professional and social integration.',
  'acme0001-0001-0001-0001-000000000001', -- Acme Corp
  'tmpl-buddy-professional-000000000003', -- Professional Networking Buddy
  'bg-professional-newcomers-berlin-009', -- Professional Newcomers - Berlin Tech
  '2025-01-15',
  '2025-05-15',
  '2025-Q1',
  'active',
  'medium',
  35, -- target_volunteers
  35, -- current_volunteers (100% - at capacity)
  35, -- target_beneficiaries
  35, -- current_beneficiaries (100%)
  140, -- max_sessions
  126, -- current_sessions
  10500.00,
  8900.00,
  'EUR',
  'bundle',
  NULL, NULL, NULL, NULL, NULL, NULL,
  '{
    "description": "Part of L2I-EXPAND bundle",
    "fixedFee": 10500
  }'::jsonb,
  '{"matchingCriteria": ["tech_role", "company_size"], "primaryGoals": ["networking", "integration"]}'::jsonb,
  4.8,
  79.0,
  560.0, -- 35 volunteers * 16 hours
  126,
  1.00, -- capacity_utilization (100% - at capacity)
  true,
  false,
  true, -- is_high_value
  78,
  '["buddy", "professionals", "berlin", "tech", "networking"]'::jsonb,
  'At full capacity. High satisfaction. Upsell to 50 seats for Q2.',
  true,
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '1 day',
  NOW() - INTERVAL '1 day'
),

-- =============================================================================
-- CAMPAIGN 14: GlobalCare - German Intensive for Youth (PAUSED, SEATS)
-- =============================================================================
(
  'camp-globalcare-german-youth-q1-014',
  'German Intensive for Youth - Q1 2025',
  '20-week intensive German program for young refugees/migrants. PAUSED due to volunteer shortage.',
  'globa001-0001-0001-0001-000000000001', -- GlobalCare
  'tmpl-lang-ger-intensive-000000000004', -- German Intensive (A1-B1)
  'bg-youth-integration-multi-005', -- Youth Integration Seekers
  '2025-01-20',
  '2025-06-10',
  '2025-Q1',
  'paused',
  'low',
  4, -- target_volunteers (teachers)
  2, -- current_volunteers (only 2 available)
  30, -- target_beneficiaries
  12, -- current_beneficiaries (paused at 40%)
  80, -- max_sessions
  18, -- current_sessions (paused early)
  9000.00,
  1800.00,
  'EUR',
  'seats',
  4, -- committed_seats
  375.00, -- seat_price_per_month
  NULL, NULL, NULL, NULL, NULL,
  '{"sessionsPerWeek": 5, "deliveryMode": "in-person", "intensive": true}'::jsonb,
  2.1, -- Lower SROI due to pause
  58.0, -- Lower VIS
  90.0, -- Limited hours
  18,
  0.40, -- capacity_utilization (40% - paused)
  false,
  false,
  false,
  0,
  '["language", "german", "youth", "intensive", "paused"]'::jsonb,
  'PAUSED: Volunteer shortage. Recruitment in progress. Resume in Q2.',
  false, -- Not active
  NOW() - INTERVAL '3 months',
  NOW() - INTERVAL '2 weeks',
  NOW() - INTERVAL '2 weeks'
),

-- =============================================================================
-- CAMPAIGN 15: TechCo - Language+Professional for Hospitality (COMPLETED, CUSTOM)
-- =============================================================================
(
  'camp-techco-hosp-langprof-q4-015',
  'Language+Professional for Hospitality - Q4 2024',
  '20-week integrated program: Norwegian + hospitality skills for job seekers. Successfully completed.',
  'techc001-0001-0001-0001-000000000001', -- TechCo
  'tmpl-upskill-lang-prof-000000000004', -- Language + Professional Skills (20 weeks)
  'bg-job-seekers-germany-multi-010', -- Job Seekers - Germany Multi-sector
  '2024-10-01',
  '2025-02-20',
  '2024-Q4',
  'completed',
  'low',
  6, -- target_volunteers
  6, -- current_volunteers
  25, -- target_beneficiaries
  23, -- current_beneficiaries (92% completion)
  80, -- max_sessions
  76, -- current_sessions (95% held)
  10000.00,
  9800.00,
  'EUR',
  'custom',
  NULL, NULL, NULL, NULL, NULL, NULL,
  '{
    "description": "Pilot partnership with hospitality sector",
    "fixedFee": 7000,
    "variableComponents": [{"type": "materials", "cost": 3000}]
  }'::jsonb,
  '{"skillTracks": ["hospitality", "language"], "difficultyLevels": ["beginner", "intermediate"]}'::jsonb,
  6.5, -- High SROI (completed successfully)
  84.0, -- High VIS
  912.0, -- 6 volunteers * 152 hours
  76,
  0.92, -- capacity_utilization (92% completion)
  false,
  false,
  true, -- is_high_value (successful completion)
  0, -- No upsell (completed)
  '["upskilling", "language", "hospitality", "job_seekers", "completed"]'::jsonb,
  'COMPLETED: Successful pilot. 18/23 participants gained employment. Model for future campaigns.',
  false, -- Not active (completed)
  NOW() - INTERVAL '6 months',
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '1 month'
),

-- =============================================================================
-- CAMPAIGN 16: Acme - Mentorship Group for Women Tech (ACTIVE, SEATS, 50%)
-- =============================================================================
(
  'camp-acme-women-tech-group-q1-016',
  'Mentorship Group for Women in Tech - Q1 2025',
  'Group mentorship sessions (4-8 participants) for women pursuing tech careers. 3-month program with peer support.',
  'acme0001-0001-0001-0001-000000000001', -- Acme Corp
  'tmpl-mentor-group-000000000002', -- Mentorship Group Sessions (3 months)
  'bg-women-in-tech-norway-004', -- Women in Tech - Norway
  '2025-02-15',
  '2025-05-15',
  '2025-Q1',
  'active',
  'medium',
  8, -- target_volunteers (group facilitators)
  5, -- current_volunteers (62.5%)
  32, -- target_beneficiaries (4 groups * 8 participants)
  20, -- current_beneficiaries (62.5%)
  48, -- max_sessions (12 weeks * 4/week)
  24, -- current_sessions
  6000.00,
  3200.00,
  'EUR',
  'seats',
  8, -- committed_seats
  125.00, -- seat_price_per_month
  NULL, NULL, NULL, NULL, NULL,
  '{"sessionFormat": "group", "focusAreas": ["career", "peer_support", "community"]}'::jsonb,
  3.4,
  69.0,
  120.0, -- 5 volunteers * 24 hours
  24,
  0.625, -- capacity_utilization (62.5%)
  false,
  false,
  false,
  35,
  '["mentorship", "women", "tech", "group", "norway"]'::jsonb,
  'Mid-campaign. Recruitment ongoing for remaining groups.',
  true,
  NOW() - INTERVAL '1 month',
  NOW() - INTERVAL '2 days',
  NOW() - INTERVAL '1 day'
)

ON CONFLICT (id) DO NOTHING;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  total_campaigns INT;
  by_status RECORD;
  by_pricing RECORD;
  capacity_stats RECORD;
BEGIN
  SELECT COUNT(*) INTO total_campaigns FROM campaigns WHERE id LIKE 'camp-%';

  RAISE NOTICE '';
  RAISE NOTICE '✓ Campaigns seed data loaded successfully';
  RAISE NOTICE '  - Total campaigns created: %', total_campaigns;
  RAISE NOTICE '';

  RAISE NOTICE 'Campaigns by Status:';
  FOR by_status IN
    SELECT status, COUNT(*) as count
    FROM campaigns
    WHERE id LIKE 'camp-%'
    GROUP BY status
    ORDER BY status
  LOOP
    RAISE NOTICE '  - %: %', by_status.status, by_status.count;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Campaigns by Pricing Model:';
  FOR by_pricing IN
    SELECT pricing_model, COUNT(*) as count
    FROM campaigns
    WHERE id LIKE 'camp-%'
    GROUP BY pricing_model
    ORDER BY pricing_model
  LOOP
    RAISE NOTICE '  - %: %', by_pricing.pricing_model, by_pricing.count;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Capacity Statistics:';
  SELECT
    COUNT(*) FILTER (WHERE capacity_utilization < 0.5) as low_util,
    COUNT(*) FILTER (WHERE capacity_utilization >= 0.5 AND capacity_utilization < 0.8) as med_util,
    COUNT(*) FILTER (WHERE capacity_utilization >= 0.8 AND capacity_utilization <= 1.0) as high_util,
    COUNT(*) FILTER (WHERE capacity_utilization > 1.0) as over_capacity
  INTO capacity_stats
  FROM campaigns
  WHERE id LIKE 'camp-%';

  RAISE NOTICE '  - Low (<50%%): %', capacity_stats.low_util;
  RAISE NOTICE '  - Medium (50-80%%): %', capacity_stats.med_util;
  RAISE NOTICE '  - High (80-100%%): %', capacity_stats.high_util;
  RAISE NOTICE '  - Over-capacity (>100%%): %', capacity_stats.over_capacity;
  RAISE NOTICE '';
END $$;
