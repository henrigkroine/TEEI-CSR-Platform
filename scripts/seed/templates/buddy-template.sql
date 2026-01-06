-- Buddy Program Template Seed Data
-- Purpose: Create default buddy matching program templates
-- Date: 2025-11-22
-- Environment: ALL
-- Dependencies: Requires program_templates table to exist

-- =============================================================================
-- BUDDY TEMPLATES
-- =============================================================================

-- Standard 1-on-1 Buddy Program
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
  'tmpl-buddy-1on1-000000000001',
  'Buddy 1-on-1 Matching (6 months)',
  'Standard 1-on-1 buddy program pairing newcomers with local volunteers for social integration and cultural exchange. Buddies meet regularly for casual activities, language practice, and community exploration. Emphasizes friendship, cultural understanding, and practical support.',
  'buddy',
  '1.0.0',
  '{
    "matchMethod": "interest_based",
    "pairDuration": 24,
    "allowGroupBuddies": false,
    "checkInFrequency": "bi-weekly",
    "checkInFormat": "survey",
    "requiredCheckIns": 12,
    "suggestedActivities": [
      "coffee_chat",
      "city_tour",
      "cultural_event",
      "sports",
      "cooking",
      "museum_visit",
      "hiking"
    ],
    "mandatoryActivities": ["initial_meeting", "mid_program_checkin"],
    "activityTracking": true,
    "primaryGoals": ["integration", "cultural_exchange", "language_practice", "friendship"],
    "buddyTrainingRequired": true,
    "buddyTrainingUrl": "/resources/buddy/training",
    "ongoingSupportUrl": "/resources/buddy/support"
  }'::jsonb,
  1,
  100,
  1,
  '["integration", "social_connection", "cultural_competence", "language_practice", "wellbeing"]'::jsonb,
  '["refugees", "migrants", "asylum_seekers", "newcomers", "integration", "youth"]'::jsonb,
  50.00,
  12.00,
  true,
  true,
  '["buddy", "1-on-1", "integration", "cultural_exchange", "friendship"]'::jsonb,
  NOW(),
  NOW()
),

-- Group Buddy Program
(
  'tmpl-buddy-group-000000000002',
  'Buddy Group Activities (3 months)',
  'Group-based buddy program where volunteers facilitate activities for small groups of newcomers (4-6 people). Focus on community building, shared experiences, and collective integration. Includes monthly group outings and bi-weekly casual meetups.',
  'buddy',
  '1.0.0',
  '{
    "matchMethod": "manual",
    "pairDuration": 12,
    "allowGroupBuddies": true,
    "maxBuddiesPerVolunteer": 6,
    "checkInFrequency": "bi-weekly",
    "checkInFormat": "meeting",
    "requiredCheckIns": 6,
    "suggestedActivities": [
      "group_outing",
      "workshop",
      "cultural_event",
      "sports_tournament",
      "potluck_dinner",
      "skill_sharing",
      "board_games"
    ],
    "mandatoryActivities": ["kickoff_event", "mid_program_gathering", "farewell_event"],
    "activityTracking": true,
    "primaryGoals": ["community", "integration", "peer_support", "cultural_exchange"],
    "buddyTrainingRequired": true,
    "buddyTrainingUrl": "/resources/buddy/group-training",
    "ongoingSupportUrl": "/resources/buddy/group-support"
  }'::jsonb,
  4,
  6,
  1,
  '["community", "integration", "peer_support", "cultural_competence", "social_connection"]'::jsonb,
  '["refugees", "migrants", "asylum_seekers", "newcomers", "integration", "youth", "women"]'::jsonb,
  30.00,
  18.00,
  true,
  true,
  '["buddy", "group", "community", "integration", "activities"]'::jsonb,
  NOW(),
  NOW()
),

-- Professional Networking Buddy
(
  'tmpl-buddy-professional-000000000003',
  'Professional Networking Buddy (4 months)',
  'Career-focused buddy program connecting newcomers with professionals in their field. Emphasizes networking, industry insights, job market navigation, and professional culture. Combines 1-on-1 meetings with attendance at professional events.',
  'buddy',
  '1.0.0',
  '{
    "matchMethod": "skill_based",
    "pairDuration": 16,
    "allowGroupBuddies": false,
    "checkInFrequency": "bi-weekly",
    "checkInFormat": "call",
    "requiredCheckIns": 8,
    "suggestedActivities": [
      "coffee_chat",
      "industry_event",
      "networking_event",
      "workplace_tour",
      "cv_review",
      "mock_interview",
      "linkedin_coaching"
    ],
    "mandatoryActivities": ["cv_review", "networking_event"],
    "activityTracking": true,
    "primaryGoals": ["networking", "career_guidance", "job_market_navigation", "professional_culture"],
    "buddyTrainingRequired": true,
    "buddyTrainingUrl": "/resources/buddy/professional-training",
    "ongoingSupportUrl": "/resources/buddy/professional-support"
  }'::jsonb,
  1,
  50,
  1,
  '["career_progression", "network_building", "job_readiness", "professional_culture", "confidence"]'::jsonb,
  '["refugees", "migrants", "professionals", "employment", "career_switchers"]'::jsonb,
  100.00,
  16.00,
  true,
  true,
  '["buddy", "professional", "networking", "career", "employment"]'::jsonb,
  NOW(),
  NOW()
),

-- Family Integration Buddy
(
  'tmpl-buddy-family-000000000004',
  'Family Integration Buddy (12 months)',
  'Long-term buddy program supporting refugee and migrant families. Volunteers assist with practical integration tasks, school navigation, healthcare access, and community connection. Flexible meeting schedule tailored to family needs.',
  'buddy',
  '1.0.0',
  '{
    "matchMethod": "manual",
    "pairDuration": 52,
    "allowGroupBuddies": true,
    "maxBuddiesPerVolunteer": 2,
    "checkInFrequency": "monthly",
    "checkInFormat": "flexible",
    "requiredCheckIns": 12,
    "suggestedActivities": [
      "school_tour",
      "healthcare_navigation",
      "grocery_shopping",
      "community_exploration",
      "family_outing",
      "cultural_event",
      "skill_sharing",
      "administrative_support"
    ],
    "mandatoryActivities": ["initial_home_visit", "quarterly_checkin"],
    "activityTracking": true,
    "primaryGoals": ["integration", "practical_support", "community_connection", "family_wellbeing"],
    "buddyTrainingRequired": true,
    "buddyTrainingUrl": "/resources/buddy/family-training",
    "ongoingSupportUrl": "/resources/buddy/family-support"
  }'::jsonb,
  1,
  30,
  1,
  '["integration", "family_wellbeing", "practical_support", "community_connection", "stability"]'::jsonb,
  '["refugees", "migrants", "asylum_seekers", "families", "integration"]'::jsonb,
  200.00,
  52.00,
  true,
  true,
  '["buddy", "family", "integration", "long_term", "practical_support"]'::jsonb,
  NOW(),
  NOW()
);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify buddy templates were created
-- SELECT id, name, program_type, version, is_active FROM program_templates WHERE program_type = 'buddy';

-- Check config for standard buddy template
-- SELECT name, default_config FROM program_templates WHERE id = 'tmpl-buddy-1on1-000000000001';
