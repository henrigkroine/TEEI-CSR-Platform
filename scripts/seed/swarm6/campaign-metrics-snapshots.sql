-- SWARM 6 Seed Data: Campaign Metrics Snapshots
-- Purpose: Time-series snapshots for campaign performance tracking and trend visualization
-- Date: 2025-11-22
-- Agent: 2.3 (seed-data-engineer)
-- Dependencies: campaigns

-- =============================================================================
-- CAMPAIGN METRICS SNAPSHOTS SEED DATA
-- =============================================================================
-- Weekly snapshots for active campaigns over last 3 months
-- Shows capacity growth, budget spend, metric improvements
-- Demonstrates time-series data for dashboards
-- =============================================================================

INSERT INTO campaign_metrics_snapshots (
  id,
  campaign_id,
  snapshot_date,
  volunteers_target,
  volunteers_current,
  volunteers_utilization,
  beneficiaries_target,
  beneficiaries_current,
  beneficiaries_utilization,
  sessions_target,
  sessions_current,
  sessions_utilization,
  budget_allocated,
  budget_spent,
  budget_remaining,
  budget_utilization,
  sroi_score,
  average_vis_score,
  total_hours_logged,
  total_sessions_completed,
  seats_used,
  seats_committed,
  credits_consumed,
  credits_allocated,
  learners_served,
  learners_committed,
  full_snapshot,
  created_at
) VALUES

-- =============================================================================
-- CAMPAIGN 1: Acme - Syrian Refugees Mentorship
-- Weekly snapshots showing growth from 60% to 86% capacity
-- =============================================================================
-- Week 1 (5 months ago)
(
  gen_random_uuid(),
  'camp-acme-syrian-mentors-q1-001',
  NOW() - INTERVAL '20 weeks',
  50, 30, 0.60,
  50, 30, 0.60,
  600, 90, 0.15,
  25000.00, 2500.00, 22500.00, 0.10,
  NULL, NULL,
  120.0, 90,
  30, 50, NULL, NULL, 30, NULL,
  '{"engagement": "early", "alerts": [], "growth_rate": "high"}'::jsonb,
  NOW() - INTERVAL '20 weeks'
),

-- Week 4 (4.5 months ago)
(
  gen_random_uuid(),
  'camp-acme-syrian-mentors-q1-001',
  NOW() - INTERVAL '17 weeks',
  50, 35, 0.70,
  50, 35, 0.70,
  600, 175, 0.29,
  25000.00, 5600.00, 19400.00, 0.22,
  2.8, 68.0,
  210.0, 175,
  35, 50, NULL, NULL, 35, NULL,
  '{"engagement": "growing", "alerts": [], "growth_rate": "high"}'::jsonb,
  NOW() - INTERVAL '17 weeks'
),

-- Week 8 (4 months ago)
(
  gen_random_uuid(),
  'camp-acme-syrian-mentors-q1-001',
  NOW() - INTERVAL '13 weeks',
  50, 40, 0.80,
  50, 40, 0.80,
  600, 280, 0.47,
  25000.00, 10200.00, 14800.00, 0.41,
  3.6, 74.0,
  320.0, 280,
  40, 50, NULL, NULL, 40, NULL,
  '{"engagement": "strong", "alerts": ["near_capacity"], "growth_rate": "steady"}'::jsonb,
  NOW() - INTERVAL '13 weeks'
),

-- Week 12 (3 months ago)
(
  gen_random_uuid(),
  'camp-acme-syrian-mentors-q1-001',
  NOW() - INTERVAL '9 weeks',
  50, 43, 0.86,
  50, 43, 0.86,
  600, 340, 0.57,
  25000.00, 14500.00, 10500.00, 0.58,
  4.0, 77.0,
  430.0, 340,
  43, 50, NULL, NULL, 43, NULL,
  '{"engagement": "strong", "alerts": ["near_capacity"], "growth_rate": "slowing"}'::jsonb,
  NOW() - INTERVAL '9 weeks'
),

-- Week 16 (2 months ago)
(
  gen_random_uuid(),
  'camp-acme-syrian-mentors-q1-001',
  NOW() - INTERVAL '5 weeks',
  50, 43, 0.86,
  50, 43, 0.86,
  600, 370, 0.62,
  25000.00, 16800.00, 8200.00, 0.67,
  4.1, 78.0,
  488.0, 370,
  43, 50, NULL, NULL, 43, NULL,
  '{"engagement": "mature", "alerts": ["near_capacity"], "growth_rate": "stable"}'::jsonb,
  NOW() - INTERVAL '5 weeks'
),

-- Week 19 (current)
(
  gen_random_uuid(),
  'camp-acme-syrian-mentors-q1-001',
  NOW() - INTERVAL '1 week',
  50, 43, 0.86,
  50, 43, 0.86,
  600, 387, 0.65,
  25000.00, 17800.00, 7200.00, 0.71,
  4.2, 78.5,
  516.0, 387,
  43, 50, NULL, NULL, 43, NULL,
  '{"engagement": "mature", "alerts": ["near_capacity", "upsell_opportunity"], "growth_rate": "stable"}'::jsonb,
  NOW() - INTERVAL '1 week'
),

-- =============================================================================
-- CAMPAIGN 2: GlobalCare - Afghan Women Language
-- Weekly snapshots showing 95% capacity achievement
-- =============================================================================
-- Week 1 (4 months ago)
(
  gen_random_uuid(),
  'camp-globalcare-afghan-lang-q1-002',
  NOW() - INTERVAL '16 weeks',
  8, 6, 0.75,
  40, 24, 0.60,
  64, 16, 0.25,
  18000.00, 3200.00, 14800.00, 0.18,
  NULL, NULL,
  96.0, 16,
  NULL, NULL, NULL, NULL, 24, 40,
  '{"language_progression": {"B1": 0.45}, "engagement": "early"}'::jsonb,
  NOW() - INTERVAL '16 weeks'
),

-- Week 4
(
  gen_random_uuid(),
  'camp-globalcare-afghan-lang-q1-002',
  NOW() - INTERVAL '13 weeks',
  8, 7, 0.875,
  40, 32, 0.80,
  64, 28, 0.44,
  18000.00, 7200.00, 10800.00, 0.40,
  4.5, 76.0,
  224.0, 28,
  NULL, NULL, NULL, NULL, 32, 40,
  '{"language_progression": {"B1": 0.58, "B2": 0.42}, "engagement": "growing", "alerts": ["near_capacity"]}'::jsonb,
  NOW() - INTERVAL '13 weeks'
),

-- Week 8
(
  gen_random_uuid(),
  'camp-globalcare-afghan-lang-q1-002',
  NOW() - INTERVAL '9 weeks',
  8, 8, 1.00,
  40, 36, 0.90,
  64, 40, 0.625,
  18000.00, 11000.00, 7000.00, 0.61,
  5.2, 80.0,
  336.0, 40,
  NULL, NULL, NULL, NULL, 36, 40,
  '{"language_progression": {"B1": 0.68, "B2": 0.55}, "engagement": "strong", "alerts": ["near_capacity"]}'::jsonb,
  NOW() - INTERVAL '9 weeks'
),

-- Week 12 (current)
(
  gen_random_uuid(),
  'camp-globalcare-afghan-lang-q1-002',
  NOW() - INTERVAL '1 week',
  8, 8, 1.00,
  40, 38, 0.95,
  64, 52, 0.8125,
  18000.00, 14200.00, 3800.00, 0.79,
  5.8, 82.3,
  416.0, 52,
  NULL, NULL, NULL, NULL, 38, 40,
  '{"language_progression": {"B1": 0.78, "B2": 0.72}, "engagement": "mature", "alerts": ["near_capacity", "high_value"]}'::jsonb,
  NOW() - INTERVAL '1 week'
),

-- =============================================================================
-- CAMPAIGN 5: GlobalCare - Women in Tech (OVER-CAPACITY GROWTH)
-- Shows going from 80% to 110%
-- =============================================================================
-- Week 1
(
  gen_random_uuid(),
  'camp-globalcare-women-tech-q1-005',
  NOW() - INTERVAL '16 weeks',
  30, 24, 0.80,
  30, 24, 0.80,
  120, 48, 0.40,
  9000.00, 2400.00, 6600.00, 0.27,
  4.8, 82.0,
  192.0, 48,
  24, 30, NULL, NULL, 24, NULL,
  '{"engagement": "early", "alerts": ["near_capacity"]}'::jsonb,
  NOW() - INTERVAL '16 weeks'
),

-- Week 4
(
  gen_random_uuid(),
  'camp-globalcare-women-tech-q1-005',
  NOW() - INTERVAL '13 weeks',
  30, 28, 0.933,
  30, 28, 0.933,
  120, 72, 0.60,
  9000.00, 4500.00, 4500.00, 0.50,
  5.5, 85.0,
  336.0, 72,
  28, 30, NULL, NULL, 28, NULL,
  '{"engagement": "growing", "alerts": ["near_capacity"]}'::jsonb,
  NOW() - INTERVAL '13 weeks'
),

-- Week 8 (AT CAPACITY)
(
  gen_random_uuid(),
  'camp-globalcare-women-tech-q1-005',
  NOW() - INTERVAL '9 weeks',
  30, 30, 1.00,
  30, 30, 1.00,
  120, 88, 0.73,
  9000.00, 6200.00, 2800.00, 0.69,
  6.0, 87.0,
  448.0, 88,
  30, 30, NULL, NULL, 30, NULL,
  '{"engagement": "strong", "alerts": ["at_capacity", "upsell_opportunity"]}'::jsonb,
  NOW() - INTERVAL '9 weeks'
),

-- Week 12 (OVER CAPACITY!)
(
  gen_random_uuid(),
  'camp-globalcare-women-tech-q1-005',
  NOW() - INTERVAL '1 week',
  30, 33, 1.10,
  30, 33, 1.10,
  120, 108, 0.90,
  9000.00, 7850.00, 1150.00, 0.87,
  6.2, 88.5,
  528.0, 108,
  33, 30, NULL, NULL, 33, NULL,
  '{"engagement": "mature", "alerts": ["over_capacity", "expansion_needed", "high_value"]}'::jsonb,
  NOW() - INTERVAL '1 week'
),

-- =============================================================================
-- CAMPAIGN 7: Acme - English for Asylum Seekers
-- Snapshots showing steady growth
-- =============================================================================
-- Week 1
(
  gen_random_uuid(),
  'camp-acme-asylum-english-q1-007',
  NOW() - INTERVAL '12 weeks',
  6, 5, 0.833,
  50, 28, 0.56,
  48, 12, 0.25,
  12000.00, 2200.00, 9800.00, 0.18,
  NULL, NULL,
  90.0, 12,
  NULL, NULL, NULL, NULL, 28, 50,
  '{"language_level": "A1", "engagement": "early"}'::jsonb,
  NOW() - INTERVAL '12 weeks'
),

-- Week 4
(
  gen_random_uuid(),
  'camp-acme-asylum-english-q1-007',
  NOW() - INTERVAL '9 weeks',
  6, 6, 1.00,
  50, 35, 0.70,
  48, 24, 0.50,
  12000.00, 5400.00, 6600.00, 0.45,
  3.5, 68.0,
  180.0, 24,
  NULL, NULL, NULL, NULL, 35, 50,
  '{"language_level": "A1-A2", "engagement": "growing"}'::jsonb,
  NOW() - INTERVAL '9 weeks'
),

-- Week 8
(
  gen_random_uuid(),
  'camp-acme-asylum-english-q1-007',
  NOW() - INTERVAL '5 weeks',
  6, 6, 1.00,
  50, 38, 0.76,
  48, 32, 0.67,
  12000.00, 7800.00, 4200.00, 0.65,
  4.2, 71.0,
  256.0, 32,
  NULL, NULL, NULL, NULL, 38, 50,
  '{"language_level": "A2", "engagement": "strong"}'::jsonb,
  NOW() - INTERVAL '5 weeks'
),

-- Week 11 (current)
(
  gen_random_uuid(),
  'camp-acme-asylum-english-q1-007',
  NOW() - INTERVAL '1 week',
  6, 6, 1.00,
  50, 40, 0.80,
  48, 38, 0.79,
  12000.00, 9200.00, 2800.00, 0.77,
  4.5, 72.0,
  304.0, 38,
  NULL, NULL, NULL, NULL, 40, 50,
  '{"language_level": "A2", "engagement": "mature", "alerts": ["near_capacity"]}'::jsonb,
  NOW() - INTERVAL '1 week'
),

-- =============================================================================
-- CAMPAIGN 10: Acme - Ukrainian Professionals
-- Snapshots showing high engagement from start
-- =============================================================================
-- Week 1
(
  gen_random_uuid(),
  'camp-acme-ukrainian-prof-q1-010',
  NOW() - INTERVAL '8 weeks',
  40, 28, 0.70,
  40, 28, 0.70,
  160, 42, 0.2625,
  14000.00, 3200.00, 10800.00, 0.23,
  NULL, NULL,
  168.0, 42,
  28, 40, NULL, NULL, 28, NULL,
  '{"industry_mix": {"tech": 0.65, "business": 0.35}, "engagement": "early"}'::jsonb,
  NOW() - INTERVAL '8 weeks'
),

-- Week 3
(
  gen_random_uuid(),
  'camp-acme-ukrainian-prof-q1-010',
  NOW() - INTERVAL '6 weeks',
  40, 32, 0.80,
  40, 32, 0.80,
  160, 70, 0.4375,
  14000.00, 6400.00, 7600.00, 0.46,
  4.2, 76.0,
  256.0, 70,
  32, 40, NULL, NULL, 32, NULL,
  '{"industry_mix": {"tech": 0.625, "business": 0.375}, "engagement": "growing", "alerts": ["near_capacity"]}'::jsonb,
  NOW() - INTERVAL '6 weeks'
),

-- Week 6
(
  gen_random_uuid(),
  'camp-acme-ukrainian-prof-q1-010',
  NOW() - INTERVAL '3 weeks',
  40, 35, 0.875,
  40, 35, 0.875,
  160, 105, 0.65625,
  14000.00, 9800.00, 4200.00, 0.70,
  4.9, 79.0,
  448.0, 105,
  35, 40, NULL, NULL, 35, NULL,
  '{"industry_mix": {"tech": 0.60, "business": 0.40}, "engagement": "strong", "alerts": ["near_capacity"]}'::jsonb,
  NOW() - INTERVAL '3 weeks'
),

-- Week 8 (current)
(
  gen_random_uuid(),
  'camp-acme-ukrainian-prof-q1-010',
  NOW() - INTERVAL '1 week',
  40, 36, 0.90,
  40, 36, 0.90,
  160, 126, 0.7875,
  14000.00, 11800.00, 2200.00, 0.84,
  5.2, 81.0,
  576.0, 126,
  36, 40, NULL, NULL, 36, NULL,
  '{"industry_mix": {"tech": 0.58, "business": 0.42}, "engagement": "mature", "alerts": ["near_capacity", "high_value"]}'::jsonb,
  NOW() - INTERVAL '1 week'
),

-- =============================================================================
-- CAMPAIGN 13: Acme - Berlin Tech Newcomers (AT CAPACITY GROWTH)
-- =============================================================================
-- Week 1
(
  gen_random_uuid(),
  'camp-acme-berlin-tech-network-q1-013',
  NOW() - INTERVAL '12 weeks',
  35, 22, 0.629,
  35, 22, 0.629,
  140, 44, 0.314,
  10500.00, 2800.00, 7700.00, 0.27,
  NULL, NULL,
  176.0, 44,
  NULL, NULL, NULL, NULL, 22, NULL,
  '{"tech_sectors": ["software", "fintech", "startups"], "engagement": "early"}'::jsonb,
  NOW() - INTERVAL '12 weeks'
),

-- Week 4
(
  gen_random_uuid(),
  'camp-acme-berlin-tech-network-q1-013',
  NOW() - INTERVAL '9 weeks',
  35, 28, 0.80,
  35, 28, 0.80,
  140, 72, 0.514,
  10500.00, 5200.00, 5300.00, 0.50,
  3.8, 74.0,
  320.0, 72,
  NULL, NULL, NULL, NULL, 28, NULL,
  '{"tech_sectors": {"software": 0.50, "fintech": 0.30, "startups": 0.20}, "engagement": "growing", "alerts": ["near_capacity"]}'::jsonb,
  NOW() - INTERVAL '9 weeks'
),

-- Week 8
(
  gen_random_uuid(),
  'camp-acme-berlin-tech-network-q1-013',
  NOW() - INTERVAL '5 weeks',
  35, 33, 0.943,
  35, 33, 0.943,
  140, 102, 0.729,
  10500.00, 7400.00, 3100.00, 0.70,
  4.5, 77.5,
  464.0, 102,
  NULL, NULL, NULL, NULL, 33, NULL,
  '{"tech_sectors": {"software": 0.48, "fintech": 0.32, "startups": 0.20}, "engagement": "strong", "alerts": ["near_capacity"]}'::jsonb,
  NOW() - INTERVAL '5 weeks'
),

-- Week 11 (AT CAPACITY)
(
  gen_random_uuid(),
  'camp-acme-berlin-tech-network-q1-013',
  NOW() - INTERVAL '1 week',
  35, 35, 1.00,
  35, 35, 1.00,
  140, 126, 0.90,
  10500.00, 8900.00, 1600.00, 0.85,
  4.8, 79.0,
  560.0, 126,
  NULL, NULL, NULL, NULL, 35, NULL,
  '{"tech_sectors": {"software": 0.46, "fintech": 0.34, "startups": 0.20}, "engagement": "mature", "alerts": ["at_capacity", "upsell_opportunity"]}'::jsonb,
  NOW() - INTERVAL '1 week'
),

-- =============================================================================
-- CAMPAIGN 3: TechCo - Tech Upskilling (MODERATE GROWTH)
-- =============================================================================
-- Week 1
(
  gen_random_uuid(),
  'camp-techco-migrants-upskill-q1-003',
  NOW() - INTERVAL '12 weeks',
  4, 2, 0.50,
  30, 12, 0.40,
  48, 8, 0.167,
  15000.00, 1800.00, 13200.00, 0.12,
  NULL, NULL,
  48.0, 8,
  NULL, NULL, NULL, NULL, 12, NULL,
  '{"tracks": {"web_dev": 0.75, "cloud": 0.25}, "engagement": "early"}'::jsonb,
  NOW() - INTERVAL '12 weeks'
),

-- Week 4
(
  gen_random_uuid(),
  'camp-techco-migrants-upskill-q1-003',
  NOW() - INTERVAL '9 weeks',
  4, 2, 0.50,
  30, 15, 0.50,
  48, 16, 0.333,
  15000.00, 4200.00, 10800.00, 0.28,
  2.4, 68.0,
  96.0, 16,
  NULL, NULL, NULL, NULL, 15, NULL,
  '{"tracks": {"web_dev": 0.67, "cloud": 0.33}, "engagement": "slow"}'::jsonb,
  NOW() - INTERVAL '9 weeks'
),

-- Week 8
(
  gen_random_uuid(),
  'camp-techco-migrants-upskill-q1-003',
  NOW() - INTERVAL '5 weeks',
  4, 3, 0.75,
  30, 19, 0.633,
  48, 24, 0.50,
  15000.00, 7200.00, 7800.00, 0.48,
  3.2, 73.0,
  192.0, 24,
  NULL, NULL, NULL, NULL, 19, NULL,
  '{"tracks": {"web_dev": 0.63, "cloud": 0.37}, "engagement": "moderate"}'::jsonb,
  NOW() - INTERVAL '5 weeks'
),

-- Week 11 (current)
(
  gen_random_uuid(),
  'camp-techco-migrants-upskill-q1-003',
  NOW() - INTERVAL '1 week',
  4, 3, 0.75,
  30, 21, 0.70,
  48, 32, 0.667,
  15000.00, 9800.00, 5200.00, 0.65,
  3.6, 75.2,
  252.0, 32,
  NULL, NULL, NULL, NULL, 21, NULL,
  '{"tracks": {"web_dev": 0.57, "cloud": 0.43}, "engagement": "moderate"}'::jsonb,
  NOW() - INTERVAL '1 week'
),

-- =============================================================================
-- CAMPAIGN 6: TechCo - Seniors Digital (LOW CAPACITY)
-- =============================================================================
-- Week 1
(
  gen_random_uuid(),
  'camp-techco-seniors-digital-q1-006',
  NOW() - INTERVAL '8 weeks',
  6, 3, 0.50,
  25, 10, 0.40,
  32, 6, 0.1875,
  5000.00, 600.00, 4400.00, 0.12,
  NULL, NULL,
  36.0, 6,
  NULL, NULL, NULL, NULL, 10, NULL,
  '{"proficiency": "beginner", "engagement": "early"}'::jsonb,
  NOW() - INTERVAL '8 weeks'
),

-- Week 4
(
  gen_random_uuid(),
  'camp-techco-seniors-digital-q1-006',
  NOW() - INTERVAL '5 weeks',
  6, 4, 0.667,
  25, 12, 0.48,
  32, 12, 0.375,
  5000.00, 1400.00, 3600.00, 0.28,
  1.8, 60.0,
  72.0, 12,
  NULL, NULL, NULL, NULL, 12, NULL,
  '{"proficiency": "beginner", "engagement": "slow"}'::jsonb,
  NOW() - INTERVAL '5 weeks'
),

-- Week 7 (current)
(
  gen_random_uuid(),
  'camp-techco-seniors-digital-q1-006',
  NOW() - INTERVAL '1 week',
  6, 4, 0.667,
  25, 14, 0.56,
  32, 18, 0.5625,
  5000.00, 2100.00, 2900.00, 0.42,
  2.8, 65.0,
  112.0, 18,
  NULL, NULL, NULL, NULL, 14, NULL,
  '{"proficiency": "beginner", "engagement": "moderate"}'::jsonb,
  NOW() - INTERVAL '1 week'
),

-- =============================================================================
-- CAMPAIGN 12: TechCo - Student Career Prep
-- =============================================================================
-- Week 1
(
  gen_random_uuid(),
  'camp-techco-students-career-q1-012',
  NOW() - INTERVAL '12 weeks',
  25, 14, 0.56,
  25, 14, 0.56,
  300, 70, 0.233,
  11000.00, 2200.00, 8800.00, 0.20,
  NULL, NULL,
  112.0, 70,
  NULL, NULL, NULL, NULL, 14, 25,
  '{"career_stage": "early", "engagement": "early"}'::jsonb,
  NOW() - INTERVAL '12 weeks'
),

-- Week 6
(
  gen_random_uuid(),
  'camp-techco-students-career-q1-012',
  NOW() - INTERVAL '7 weeks',
  25, 17, 0.68,
  25, 17, 0.68,
  300, 130, 0.433,
  11000.00, 5200.00, 5800.00, 0.47,
  3.2, 72.0,
  204.0, 130,
  NULL, NULL, NULL, NULL, 17, 25,
  '{"career_stage": "development", "engagement": "moderate"}'::jsonb,
  NOW() - INTERVAL '7 weeks'
),

-- Week 11 (current)
(
  gen_random_uuid(),
  'camp-techco-students-career-q1-012',
  NOW() - INTERVAL '1 week',
  25, 19, 0.76,
  25, 19, 0.76,
  300, 190, 0.633,
  11000.00, 8100.00, 2900.00, 0.74,
  3.8, 76.5,
  304.0, 190,
  NULL, NULL, NULL, NULL, 19, 25,
  '{"career_stage": "active_job_search", "engagement": "strong", "alerts": ["near_capacity"]}'::jsonb,
  NOW() - INTERVAL '1 week'
),

-- =============================================================================
-- CAMPAIGN 16: Acme - Women Tech Group Mentorship (NEW CAMPAIGN)
-- =============================================================================
-- Week 1
(
  gen_random_uuid(),
  'camp-acme-women-tech-group-q1-016',
  NOW() - INTERVAL '4 weeks',
  8, 3, 0.375,
  32, 12, 0.375,
  48, 6, 0.125,
  6000.00, 800.00, 5200.00, 0.13,
  NULL, NULL,
  36.0, 6,
  3, 8, NULL, NULL, 12, NULL,
  '{"group_formation": "early", "engagement": "recruiting"}'::jsonb,
  NOW() - INTERVAL '4 weeks'
),

-- Week 3 (current)
(
  gen_random_uuid(),
  'camp-acme-women-tech-group-q1-016',
  NOW() - INTERVAL '1 week',
  8, 5, 0.625,
  32, 20, 0.625,
  48, 24, 0.50,
  6000.00, 3200.00, 2800.00, 0.53,
  3.4, 69.0,
  120.0, 24,
  5, 8, NULL, NULL, 20, NULL,
  '{"group_formation": "forming", "engagement": "moderate"}'::jsonb,
  NOW() - INTERVAL '1 week'
),

-- =============================================================================
-- CAMPAIGN 9: TechCo - Job Seekers Certifications
-- =============================================================================
-- Week 1
(
  gen_random_uuid(),
  'camp-techco-jobseekers-cert-q1-009',
  NOW() - INTERVAL '12 weeks',
  3, 1, 0.333,
  20, 6, 0.30,
  64, 8, 0.125,
  16000.00, 1600.00, 14400.00, 0.10,
  NULL, NULL,
  48.0, 8,
  NULL, NULL, NULL, NULL, 6, NULL,
  '{"certifications": {"PMP": 0.50, "Scrum": 0.33, "Analytics": 0.17}, "engagement": "early"}'::jsonb,
  NOW() - INTERVAL '12 weeks'
),

-- Week 6
(
  gen_random_uuid(),
  'camp-techco-jobseekers-cert-q1-009',
  NOW() - INTERVAL '7 weeks',
  3, 2, 0.667,
  20, 10, 0.50,
  64, 20, 0.3125,
  16000.00, 5600.00, 10400.00, 0.35,
  3.2, 68.0,
  120.0, 20,
  NULL, NULL, NULL, NULL, 10, NULL,
  '{"certifications": {"PMP": 0.40, "Scrum": 0.40, "Analytics": 0.20}, "engagement": "moderate"}'::jsonb,
  NOW() - INTERVAL '7 weeks'
),

-- Week 11 (current)
(
  gen_random_uuid(),
  'camp-techco-jobseekers-cert-q1-009',
  NOW() - INTERVAL '1 week',
  3, 2, 0.667,
  20, 13, 0.65,
  64, 36, 0.5625,
  16000.00, 10200.00, 5800.00, 0.64,
  4.1, 71.5,
  208.0, 36,
  NULL, NULL, NULL, NULL, 13, NULL,
  '{"certifications": {"PMP": 0.38, "Scrum": 0.38, "Analytics": 0.24}, "engagement": "moderate"}'::jsonb,
  NOW() - INTERVAL '1 week'
),

-- =============================================================================
-- CAMPAIGN 4: Acme - Youth Buddy (RECRUITING - minimal snapshots)
-- =============================================================================
-- Week 1
(
  gen_random_uuid(),
  'camp-acme-youth-buddy-q2-004',
  NOW() - INTERVAL '4 weeks',
  80, 5, 0.0625,
  80, 5, 0.0625,
  NULL, 2, NULL,
  12000.00, 200.00, 11800.00, 0.017,
  NULL, NULL,
  4.0, 2,
  NULL, NULL, 6.0, 10000, 5, NULL,
  '{"recruitment_phase": "launch", "engagement": "recruiting"}'::jsonb,
  NOW() - INTERVAL '4 weeks'
),

-- Week 3 (current)
(
  gen_random_uuid(),
  'camp-acme-youth-buddy-q2-004',
  NOW() - INTERVAL '1 week',
  80, 12, 0.15,
  80, 12, 0.15,
  NULL, 8, NULL,
  12000.00, 1200.00, 10800.00, 0.10,
  NULL, NULL,
  16.0, 8,
  NULL, NULL, 10.0, 10000, 12, NULL,
  '{"recruitment_phase": "active", "engagement": "recruiting"}'::jsonb,
  NOW() - INTERVAL '1 week'
)

ON CONFLICT (campaign_id, snapshot_date) DO NOTHING;

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  total_snapshots INT;
  campaigns_tracked INT;
  date_range_start TIMESTAMP;
  date_range_end TIMESTAMP;
BEGIN
  SELECT COUNT(*) INTO total_snapshots FROM campaign_metrics_snapshots;
  SELECT COUNT(DISTINCT campaign_id) INTO campaigns_tracked FROM campaign_metrics_snapshots;
  SELECT MIN(snapshot_date), MAX(snapshot_date)
  INTO date_range_start, date_range_end
  FROM campaign_metrics_snapshots;

  RAISE NOTICE '';
  RAISE NOTICE '✓ Campaign Metrics Snapshots seed data loaded successfully';
  RAISE NOTICE '  - Total snapshots created: %', total_snapshots;
  RAISE NOTICE '  - Campaigns tracked: %', campaigns_tracked;
  RAISE NOTICE '  - Date range: % to %',
    TO_CHAR(date_range_start, 'YYYY-MM-DD'),
    TO_CHAR(date_range_end, 'YYYY-MM-DD');
  RAISE NOTICE '';
  RAISE NOTICE 'Time-series coverage:';
  RAISE NOTICE '  - Demonstrates capacity growth trends';
  RAISE NOTICE '  - Shows budget spend progression';
  RAISE NOTICE '  - Tracks SROI/VIS improvement over time';
  RAISE NOTICE '  - Weekly snapshots for 10+ active campaigns';
  RAISE NOTICE '  - Includes over-capacity, at-capacity, and recruiting scenarios';
  RAISE NOTICE '';
END $$;
