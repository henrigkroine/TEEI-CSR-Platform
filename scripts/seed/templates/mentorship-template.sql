-- Mentorship Program Template Seed Data
-- Purpose: Create default mentorship program template
-- Date: 2025-11-22
-- Environment: ALL
-- Dependencies: Requires program_templates table to exist

-- =============================================================================
-- MENTORSHIP TEMPLATE
-- =============================================================================

-- Standard 1-on-1 Mentorship Template
INSERT INTO program_templates (
  id,
  name,
  description,
  program_type,
  version,
  default_config,
  default_min_participants,
  default_max_participants,
  default_volunteers_needed,
  outcome_metrics,
  suitable_for_groups,
  estimated_cost_per_participant,
  estimated_hours_per_volunteer,
  is_active,
  is_public,
  tags,
  created_at,
  updated_at
) VALUES (
  'tmpl-mentor-1on1-000000000001',
  'Mentorship 1-on-1 (6 months)',
  'Standard 1-on-1 mentorship program focused on career development and integration. Mentor and mentee meet weekly or bi-weekly for structured sessions over 6 months. Suitable for refugees, migrants, and newcomers seeking career guidance, skill development, and professional network building.',
  'mentorship',
  '1.0.0',
  '{
    "sessionFormat": "1-on-1",
    "sessionDuration": 60,
    "sessionFrequency": "bi-weekly",
    "totalDuration": 24,
    "totalSessionsRecommended": 12,
    "matchingCriteria": ["skills", "industry", "language", "career_goals"],
    "autoMatching": false,
    "focusAreas": ["career", "integration", "technical_skills", "networking"],
    "outcomesTracked": ["job_readiness", "confidence", "network_building", "skill_acquisition"],
    "mentorRequirements": {
      "minExperience": 3,
      "industries": ["any"],
      "languages": ["en"],
      "certifications": []
    },
    "onboardingMaterialsUrl": "/resources/mentorship/onboarding",
    "sessionGuidelinesUrl": "/resources/mentorship/session-guidelines"
  }'::jsonb,
  1,
  100,
  1,
  '["job_readiness", "confidence", "network_building", "career_progression", "skill_acquisition"]'::jsonb,
  '["refugees", "migrants", "asylum_seekers", "newcomers", "integration", "employment"]'::jsonb,
  150.00,
  12.00,
  true,
  true,
  '["career", "1-on-1", "professional_development", "networking", "integration"]'::jsonb,
  NOW(),
  NOW()
),

-- Group Mentorship Template
(
  'tmpl-mentor-group-000000000002',
  'Mentorship Group Sessions (3 months)',
  'Group mentorship program where one mentor works with 4-8 mentees in structured group sessions. Focuses on shared learning, peer support, and collective skill building. Ideal for language practice, industry insights, and building community.',
  'mentorship',
  '1.0.0',
  '{
    "sessionFormat": "group",
    "sessionDuration": 90,
    "sessionFrequency": "weekly",
    "totalDuration": 12,
    "totalSessionsRecommended": 12,
    "matchingCriteria": ["skills", "industry", "career_goals"],
    "autoMatching": false,
    "focusAreas": ["career", "integration", "language", "peer_support"],
    "outcomesTracked": ["confidence", "network_building", "peer_learning", "job_readiness"],
    "mentorRequirements": {
      "minExperience": 5,
      "industries": ["any"],
      "languages": ["en"],
      "certifications": ["group_facilitation"]
    },
    "onboardingMaterialsUrl": "/resources/mentorship/group-onboarding",
    "sessionGuidelinesUrl": "/resources/mentorship/group-guidelines"
  }'::jsonb,
  4,
  8,
  1,
  '["confidence", "network_building", "peer_learning", "job_readiness", "community"]'::jsonb,
  '["refugees", "migrants", "asylum_seekers", "newcomers", "women", "youth", "integration"]'::jsonb,
  75.00,
  18.00,
  true,
  true,
  '["career", "group", "peer_support", "community", "integration"]'::jsonb,
  NOW(),
  NOW()
),

-- Technical Skills Mentorship Template
(
  'tmpl-mentor-tech-000000000003',
  'Technical Skills Mentorship (4 months)',
  'Specialized mentorship program focused on technical skill development (software engineering, data analysis, cloud, etc.). Combines 1-on-1 sessions with project-based learning. Mentors guide mentees through real-world technical challenges.',
  'mentorship',
  '1.0.0',
  '{
    "sessionFormat": "1-on-1",
    "sessionDuration": 90,
    "sessionFrequency": "weekly",
    "totalDuration": 16,
    "totalSessionsRecommended": 16,
    "matchingCriteria": ["technical_skills", "industry", "language"],
    "autoMatching": false,
    "focusAreas": ["technical_skills", "career", "project_work"],
    "outcomesTracked": ["skill_acquisition", "job_readiness", "portfolio_building", "confidence"],
    "mentorRequirements": {
      "minExperience": 5,
      "industries": ["technology", "software", "data"],
      "languages": ["en"],
      "certifications": []
    },
    "onboardingMaterialsUrl": "/resources/mentorship/tech-onboarding",
    "sessionGuidelinesUrl": "/resources/mentorship/tech-guidelines"
  }'::jsonb,
  1,
  50,
  1,
  '["skill_acquisition", "job_readiness", "portfolio_building", "confidence", "technical_growth"]'::jsonb,
  '["refugees", "migrants", "women-in-tech", "career_switchers", "upskilling"]'::jsonb,
  200.00,
  24.00,
  true,
  true,
  '["technical", "1-on-1", "skills", "career_development", "project_based"]'::jsonb,
  NOW(),
  NOW()
);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify mentorship templates were created
-- SELECT id, name, program_type, version, is_active FROM program_templates WHERE program_type = 'mentorship';

-- Check config structure for 1-on-1 template
-- SELECT name, default_config FROM program_templates WHERE id = 'tmpl-mentor-1on1-000000000001';
