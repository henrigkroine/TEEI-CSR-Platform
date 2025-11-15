-- Pilot Reports Seed Data
-- Purpose: Create sample SROI/VIS data and Q2Q evidence for demo purposes
-- Date: 2025-11-15
-- Environment: PILOT/DEMO ONLY
-- Dependencies: Requires companies.sql and programs.sql to be run first

-- =============================================================================
-- SROI DATA (Social Return on Investment)
-- =============================================================================

CREATE TABLE IF NOT EXISTS sroi_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  calculation_period VARCHAR(50), -- 'monthly', 'quarterly', 'annual'
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_investment DECIMAL(12,2) NOT NULL,
  total_social_value DECIMAL(12,2) NOT NULL,
  sroi_ratio DECIMAL(10,2) NOT NULL,
  confidence_level DECIMAL(5,2), -- 0-100%
  outcome_categories JSONB,
  assumptions JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID,
  evidence_ids UUID[]
);

CREATE INDEX IF NOT EXISTS idx_sroi_company ON sroi_calculations(company_id);
CREATE INDEX IF NOT EXISTS idx_sroi_program ON sroi_calculations(program_id);
CREATE INDEX IF NOT EXISTS idx_sroi_period ON sroi_calculations(period_start, period_end);

INSERT INTO sroi_calculations (
  id, company_id, program_id, calculation_period,
  period_start, period_end, total_investment, total_social_value, sroi_ratio,
  confidence_level, outcome_categories, assumptions, created_by, created_at
) VALUES
  -- Acme Corp SROI calculations
  (
    'sroi-acme-001-0001-0001-000000000001',
    'acme0001-0001-0001-0001-000000000001',
    'prog-acme-buddy-0001-000000000001',
    'quarterly',
    NOW() - INTERVAL '3 months',
    NOW(),
    42500.00,
    106250.00,
    2.50,
    85.5,
    '{
      "employee_retention": 45000.00,
      "productivity_gains": 35000.00,
      "skill_development": 18750.00,
      "cultural_improvement": 7500.00
    }'::jsonb,
    '{
      "retention_rate_improvement": "15%",
      "productivity_increase": "8%",
      "average_salary": 85000,
      "discount_rate": 0.035
    }'::jsonb,
    'pilot001-user-0001-0001-000000000001',
    NOW() - INTERVAL '1 day'
  ),
  (
    'sroi-acme-002-0001-0001-000000000001',
    'acme0001-0001-0001-0001-000000000001',
    'prog-acme-kintell-0001-00000000001',
    'quarterly',
    NOW() - INTERVAL '3 months',
    NOW(),
    62500.00,
    218750.00,
    3.50,
    78.0,
    '{
      "educational_impact": 112500.00,
      "community_value": 62500.00,
      "career_opportunities": 31250.00,
      "social_mobility": 12500.00
    }'::jsonb,
    '{
      "participant_graduation_rate": "85%",
      "employment_rate_increase": "12%",
      "average_wage_lift": 15000,
      "community_multiplier": 1.8
    }'::jsonb,
    'pilot001-user-0001-0001-000000000002',
    NOW() - INTERVAL '2 days'
  ),
  (
    'sroi-acme-003-0001-0001-000000000001',
    'acme0001-0001-0001-0001-000000000001',
    'prog-acme-upskill-001-00000000001',
    'quarterly',
    NOW() - INTERVAL '3 months',
    NOW(),
    90000.00,
    270000.00,
    3.00,
    92.0,
    '{
      "skill_enhancement": 135000.00,
      "certification_value": 90000.00,
      "career_progression": 33750.00,
      "organizational_capability": 11250.00
    }'::jsonb,
    '{
      "certification_success_rate": "88%",
      "promotion_rate_increase": "25%",
      "salary_increase_average": 12000,
      "knowledge_transfer_multiplier": 1.5
    }'::jsonb,
    'pilot001-user-0001-0001-000000000001',
    NOW() - INTERVAL '3 hours'
  ),

  -- TechCo SROI calculations
  (
    'sroi-techco-001-001-0001-000000000001',
    'techc001-0001-0001-0001-000000000001',
    'prog-techco-buddy-001-00000000001',
    'quarterly',
    NOW() - INTERVAL '3 months',
    NOW(),
    32000.00,
    64000.00,
    2.00,
    81.0,
    '{
      "employee_retention": 32000.00,
      "productivity_gains": 19200.00,
      "skill_development": 9600.00,
      "engagement_improvement": 3200.00
    }'::jsonb,
    '{
      "retention_rate_improvement": "12%",
      "productivity_increase": "6%",
      "average_salary": 95000,
      "discount_rate": 0.04
    }'::jsonb,
    'pilot002-user-0001-0001-000000000001',
    NOW() - INTERVAL '4 days'
  ),
  (
    'sroi-techco-002-001-0001-000000000001',
    'techc001-0001-0001-0001-000000000001',
    'prog-techco-kintell-001-0000000001',
    'quarterly',
    NOW() - INTERVAL '3 months',
    NOW(),
    45000.00,
    135000.00,
    3.00,
    75.5,
    '{
      "financial_literacy_impact": 67500.00,
      "behavioral_change": 40500.00,
      "community_economic_benefit": 18000.00,
      "long_term_stability": 9000.00
    }'::jsonb,
    '{
      "savings_rate_improvement": "20%",
      "debt_reduction_average": 3500,
      "investment_participation_increase": "15%",
      "community_multiplier": 1.6
    }'::jsonb,
    'pilot002-user-0001-0001-000000000002',
    NOW() - INTERVAL '1 week'
  ),

  -- GlobalCare SROI calculations
  (
    'sroi-global-001-001-0001-00000000001',
    'globa001-0001-0001-0001-000000000001',
    'prog-global-buddy-001-00000000001',
    'quarterly',
    NOW() - INTERVAL '3 months',
    NOW(),
    41250.00,
    123750.00,
    3.00,
    88.0,
    '{
      "patient_care_quality": 61875.00,
      "staff_retention": 37125.00,
      "professional_development": 16500.00,
      "workplace_wellbeing": 8250.00
    }'::jsonb,
    '{
      "retention_rate_improvement": "18%",
      "patient_satisfaction_increase": "12%",
      "error_reduction": "8%",
      "recruitment_cost_savings": 25000
    }'::jsonb,
    'pilot003-user-0001-0001-000000000001',
    NOW() - INTERVAL '2 days'
  ),
  (
    'sroi-global-002-001-0001-00000000001',
    'globa001-0001-0001-0001-000000000001',
    'prog-global-kintell-001-000000001',
    'quarterly',
    NOW() - INTERVAL '3 months',
    NOW(),
    70833.00,
    283332.00,
    4.00,
    82.5,
    '{
      "preventive_health_value": 141666.00,
      "emergency_cost_reduction": 84999.60,
      "community_health_improvement": 42499.80,
      "health_education_impact": 14166.60
    }'::jsonb,
    '{
      "screening_detection_rate": "22%",
      "er_visit_reduction": "30%",
      "chronic_disease_prevention": "15%",
      "healthcare_cost_multiplier": 2.8
    }'::jsonb,
    'pilot003-user-0001-0001-000000000002',
    NOW() - INTERVAL '5 hours'
  );

-- =============================================================================
-- VIS SCORES (Volunteer Impact Scores)
-- =============================================================================

CREATE TABLE IF NOT EXISTS vis_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  volunteer_id UUID, -- References user who volunteered
  calculation_period VARCHAR(50),
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  vis_score DECIMAL(10,2) NOT NULL, -- 0-100 score
  hours_contributed DECIMAL(10,2),
  activities_completed INTEGER,
  impact_multiplier DECIMAL(5,2),
  skill_level VARCHAR(50), -- 'beginner', 'intermediate', 'advanced', 'expert'
  consistency_score DECIMAL(5,2), -- 0-100
  quality_rating DECIMAL(5,2), -- 0-100
  beneficiary_feedback JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vis_company ON vis_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_vis_program ON vis_scores(program_id);
CREATE INDEX IF NOT EXISTS idx_vis_volunteer ON vis_scores(volunteer_id);

INSERT INTO vis_scores (
  id, company_id, program_id, volunteer_id, calculation_period,
  period_start, period_end, vis_score, hours_contributed, activities_completed,
  impact_multiplier, skill_level, consistency_score, quality_rating, beneficiary_feedback, created_at
) VALUES
  -- Acme Corp VIS scores
  (
    'vis-acme-001-0001-0001-000000000001',
    'acme0001-0001-0001-0001-000000000001',
    'prog-acme-buddy-0001-000000000001',
    'pilot001-user-0001-0001-000000000002',
    'monthly',
    NOW() - INTERVAL '1 month',
    NOW(),
    87.5,
    24.0,
    8,
    1.45,
    'advanced',
    92.0,
    88.0,
    '{"positive_feedback_count": 7, "improvement_suggestions": 1, "average_rating": 4.6}'::jsonb,
    NOW() - INTERVAL '2 days'
  ),
  (
    'vis-acme-002-0001-0001-000000000001',
    'acme0001-0001-0001-0001-000000000001',
    'prog-acme-kintell-0001-00000000001',
    'pilot001-user-0001-0001-000000000003',
    'monthly',
    NOW() - INTERVAL '1 month',
    NOW(),
    92.0,
    16.0,
    4,
    1.65,
    'expert',
    95.0,
    94.0,
    '{"positive_feedback_count": 4, "improvement_suggestions": 0, "average_rating": 4.8}'::jsonb,
    NOW() - INTERVAL '3 days'
  ),

  -- TechCo VIS scores
  (
    'vis-techco-001-001-0001-00000000001',
    'techc001-0001-0001-0001-000000000001',
    'prog-techco-kintell-001-0000000001',
    'pilot002-user-0001-0001-000000000002',
    'monthly',
    NOW() - INTERVAL '1 month',
    NOW(),
    78.5,
    12.0,
    6,
    1.25,
    'intermediate',
    82.0,
    85.0,
    '{"positive_feedback_count": 5, "improvement_suggestions": 1, "average_rating": 4.3}'::jsonb,
    NOW() - INTERVAL '1 week'
  ),

  -- GlobalCare VIS scores
  (
    'vis-global-001-001-0001-000000000001',
    'globa001-0001-0001-0001-000000000001',
    'prog-global-kintell-001-000000001',
    'pilot003-user-0001-0001-000000000002',
    'monthly',
    NOW() - INTERVAL '1 month',
    NOW(),
    95.5,
    32.0,
    8,
    1.80,
    'expert',
    98.0,
    96.0,
    '{"positive_feedback_count": 8, "improvement_suggestions": 0, "average_rating": 4.9}'::jsonb,
    NOW() - INTERVAL '1 day'
  );

-- =============================================================================
-- Q2Q EVIDENCE (Qualitative to Quantitative Evidence)
-- =============================================================================

CREATE TABLE IF NOT EXISTS q2q_evidence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  program_id UUID REFERENCES programs(id) ON DELETE CASCADE,
  evidence_type VARCHAR(50), -- 'feedback', 'testimonial', 'survey', 'observation'
  source VARCHAR(100), -- Who provided the evidence
  content TEXT NOT NULL,
  sentiment VARCHAR(20), -- 'positive', 'neutral', 'negative', 'mixed'
  confidence_score DECIMAL(5,2), -- 0-100
  themes JSONB, -- Extracted themes/tags
  linked_outcomes UUID[], -- Links to SROI outcomes
  anonymized BOOLEAN DEFAULT true,
  collected_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_q2q_company ON q2q_evidence(company_id);
CREATE INDEX IF NOT EXISTS idx_q2q_program ON q2q_evidence(program_id);
CREATE INDEX IF NOT EXISTS idx_q2q_sentiment ON q2q_evidence(sentiment);

-- Helper function to generate realistic timestamps over last 6 months
CREATE OR REPLACE FUNCTION random_timestamp_last_6m() RETURNS TIMESTAMP AS $$
BEGIN
  RETURN NOW() - (RANDOM() * INTERVAL '180 days');
END;
$$ LANGUAGE plpgsql;

INSERT INTO q2q_evidence (
  id, company_id, program_id, evidence_type, source, content, sentiment,
  confidence_score, themes, anonymized, collected_at
) VALUES
  -- Acme Corp evidence
  (
    gen_random_uuid(),
    'acme0001-0001-0001-0001-000000000001',
    'prog-acme-buddy-0001-000000000001',
    'feedback',
    'Program Participant',
    'My mentor helped me navigate complex technical challenges and gave me confidence to take on bigger projects. I feel much more integrated into the team now.',
    'positive',
    94.5,
    '["mentorship", "confidence", "integration", "technical_growth"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'acme0001-0001-0001-0001-000000000001',
    'prog-acme-buddy-0001-000000000001',
    'testimonial',
    'Program Mentor',
    'Being a mentor has been incredibly rewarding. It reminded me why I love this work and improved my own leadership skills.',
    'positive',
    91.0,
    '["leadership", "rewarding", "personal_growth", "satisfaction"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'acme0001-0001-0001-0001-000000000001',
    'prog-acme-buddy-0001-000000000001',
    'survey',
    'Program Participant',
    'The program is great but I wish there were more structured activities and clearer goals for each meeting.',
    'mixed',
    78.0,
    '["structure", "goals", "improvement_needed", "appreciation"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'acme0001-0001-0001-0001-000000000001',
    'prog-acme-kintell-0001-00000000001',
    'testimonial',
    'Workshop Participant',
    'This coding workshop changed my life. I never thought I could learn programming, but now I am building my own apps!',
    'positive',
    96.5,
    '["life_changing", "empowerment", "skill_development", "confidence"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'acme0001-0001-0001-0001-000000000001',
    'prog-acme-kintell-0001-00000000001',
    'feedback',
    'Workshop Volunteer',
    'Teaching these workshops is the highlight of my month. Seeing students have their aha moments is priceless.',
    'positive',
    93.0,
    '["fulfillment", "teaching", "impact", "volunteer_satisfaction"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'acme0001-0001-0001-0001-000000000001',
    'prog-acme-kintell-0001-00000000001',
    'observation',
    'Program Coordinator',
    'Attendance has been consistently high (90%+) and we have seen remarkable progress in participant confidence and technical abilities.',
    'positive',
    88.5,
    '["high_attendance", "progress", "confidence", "technical_skills"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'acme0001-0001-0001-0001-000000000001',
    'prog-acme-kintell-0001-00000000001',
    'feedback',
    'Parent of Participant',
    'My daughter talks about the workshop all week. Her enthusiasm for technology has grown so much thanks to this program.',
    'positive',
    95.5,
    '["family_impact", "enthusiasm", "career_interest", "appreciation"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),

  -- TechCo evidence
  (
    gen_random_uuid(),
    'techc001-0001-0001-0001-000000000001',
    'prog-techco-buddy-001-00000000001',
    'feedback',
    'Program Participant',
    'The mentorship program exceeded my expectations. My mentor opened doors and introduced me to key stakeholders.',
    'positive',
    92.0,
    '["networking", "career_growth", "expectations_exceeded", "mentorship"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'techc001-0001-0001-0001-000000000001',
    'prog-techco-buddy-001-00000000001',
    'survey',
    'Program Participant',
    'Great program overall. Would appreciate more guidance on how to make the most of mentorship sessions.',
    'positive',
    82.5,
    '["appreciation", "guidance_needed", "session_structure"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'techc001-0001-0001-0001-000000000001',
    'prog-techco-kintell-001-0000000001',
    'testimonial',
    'Workshop Participant',
    'I learned more about managing money in 8 weeks than I did in 12 years of school. This should be mandatory education!',
    'positive',
    97.0,
    '["educational_gap", "practical_skills", "money_management", "advocacy"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'techc001-0001-0001-0001-000000000001',
    'prog-techco-kintell-001-0000000001',
    'feedback',
    'Workshop Facilitator',
    'Students are highly engaged and asking sophisticated questions. We are making real impact on financial literacy.',
    'positive',
    90.0,
    '["engagement", "impact", "financial_literacy", "questions"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'techc001-0001-0001-0001-000000000001',
    'prog-techco-kintell-001-0000000002',
    'testimonial',
    'Small Business Owner',
    'The pro-bono consulting saved my business. I now have a solid financial plan and better cash flow management.',
    'positive',
    98.5,
    '["business_impact", "financial_planning", "cash_flow", "gratitude"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'techc001-0001-0001-0001-000000000001',
    'prog-techco-kintell-001-0000000002',
    'observation',
    'Program Manager',
    'Client satisfaction is at 95%. Businesses report average 30% improvement in financial management practices.',
    'positive',
    91.5,
    '["satisfaction", "measurable_improvement", "financial_management"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),

  -- GlobalCare evidence
  (
    gen_random_uuid(),
    'globa001-0001-0001-0001-000000000001',
    'prog-global-buddy-001-00000000001',
    'feedback',
    'New Nurse',
    'My mentor made my transition into healthcare so much smoother. I felt supported every step of the way.',
    'positive',
    94.0,
    '["support", "transition", "mentorship", "healthcare"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'globa001-0001-0001-0001-000000000001',
    'prog-global-buddy-001-00000000001',
    'testimonial',
    'Experienced Nurse Mentor',
    'Mentoring reminds me of the values that brought me into nursing. It has re-energized my own practice.',
    'positive',
    92.5,
    '["values", "re-energized", "purpose", "professional_development"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'globa001-0001-0001-0001-000000000001',
    'prog-global-buddy-001-00000000002',
    'feedback',
    'Program Participant',
    'The Wellness Champions program has been crucial for my mental health. Knowing I have peer support makes all the difference.',
    'positive',
    96.0,
    '["mental_health", "peer_support", "crucial", "wellbeing"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'globa001-0001-0001-0001-000000000001',
    'prog-global-kintell-001-000000001',
    'testimonial',
    'Community Member',
    'The free health screening detected my high blood pressure early. I am now on treatment and feeling much better.',
    'positive',
    99.0,
    '["preventive_care", "early_detection", "health_improvement", "gratitude"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'globa001-0001-0001-0001-000000000001',
    'prog-global-kintell-001-000000001',
    'observation',
    'Program Coordinator',
    'We have screened 350+ people and referred 78 to follow-up care. Community trust in our services is growing.',
    'positive',
    89.0,
    '["screening_numbers", "referrals", "community_trust", "impact"]'::jsonb,
    true,
    random_timestamp_last_6m()
  ),
  (
    gen_random_uuid(),
    'globa001-0001-0001-0001-000000000001',
    'prog-global-kintell-001-000000002',
    'feedback',
    'Training Participant',
    'Mental Health First Aid training gave me tools to help friends and family in crisis. I have already used these skills twice.',
    'positive',
    97.5,
    '["practical_skills", "crisis_intervention", "confidence", "real_world_application"]'::jsonb,
    true,
    random_timestamp_last_6m()
  );

-- Drop helper function
DROP FUNCTION IF EXISTS random_timestamp_last_6m();

-- =============================================================================
-- VERIFICATION
-- =============================================================================

DO $$
DECLARE
  sroi_count INT;
  vis_count INT;
  q2q_count INT;
  avg_sroi DECIMAL(10,2);
  avg_vis DECIMAL(10,2);
  positive_sentiment_pct DECIMAL(5,2);
BEGIN
  SELECT COUNT(*) INTO sroi_count FROM sroi_calculations;
  SELECT COUNT(*) INTO vis_count FROM vis_scores;
  SELECT COUNT(*) INTO q2q_count FROM q2q_evidence;
  SELECT AVG(sroi_ratio) INTO avg_sroi FROM sroi_calculations;
  SELECT AVG(vis_score) INTO avg_vis FROM vis_scores;

  SELECT
    (COUNT(*) FILTER (WHERE sentiment = 'positive') * 100.0 / COUNT(*))::DECIMAL(5,2)
  INTO positive_sentiment_pct
  FROM q2q_evidence;

  RAISE NOTICE '✓ Pilot reports seed data loaded successfully';
  RAISE NOTICE '';
  RAISE NOTICE 'SROI Calculations: % records', sroi_count;
  RAISE NOTICE '  - Average SROI Ratio: %:1', ROUND(avg_sroi, 2);
  RAISE NOTICE '  - Range: 2.00:1 to 4.00:1';
  RAISE NOTICE '';
  RAISE NOTICE 'VIS Scores: % records', vis_count;
  RAISE NOTICE '  - Average VIS Score: %/100', ROUND(avg_vis, 2);
  RAISE NOTICE '';
  RAISE NOTICE 'Q2Q Evidence: % records', q2q_count;
  RAISE NOTICE '  - Positive Sentiment: %%', ROUND(positive_sentiment_pct, 1);
  RAISE NOTICE '  - All evidence anonymized for privacy';
  RAISE NOTICE '';
  RAISE NOTICE 'Data covers last 6 months across all 3 pilot companies';
END $$;
