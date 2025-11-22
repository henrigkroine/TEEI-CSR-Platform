-- Language Program Template Seed Data
-- Purpose: Create default language learning program templates
-- Date: 2025-11-22
-- Environment: ALL
-- Dependencies: Requires program_templates table to exist

-- =============================================================================
-- LANGUAGE TEMPLATES
-- =============================================================================

-- Basic English Group Sessions
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
  'tmpl-lang-eng-basic-000000000001',
  'English Group Sessions (A1-A2)',
  'Beginner-level English language program for newcomers. Small group sessions (6-10 participants) focused on conversational English, survival vocabulary, and basic grammar. Twice weekly sessions over 12 weeks. Ideal for refugees and migrants with little to no English proficiency.',
  'language',
  '1.0.0',
  '{
    "classSizeMin": 6,
    "classSizeMax": 10,
    "sessionDuration": 90,
    "sessionsPerWeek": 2,
    "totalWeeks": 12,
    "proficiencyLevels": ["A1", "A2"],
    "targetLanguages": ["en"],
    "deliveryMode": "hybrid",
    "platform": "zoom",
    "curriculumFocus": ["conversational", "survival", "integration"],
    "assessmentFrequency": "bi-weekly",
    "certificationOffered": false,
    "textbookRequired": false,
    "materialsUrl": "/resources/language/english-a1-a2"
  }'::jsonb,
  6,
  10,
  1,
  '["language_proficiency", "confidence", "integration", "communication"]'::jsonb,
  '["refugees", "migrants", "asylum_seekers", "newcomers", "integration"]'::jsonb,
  120.00,
  24.00,
  true,
  true,
  '["language", "english", "beginner", "group", "integration"]'::jsonb,
  NOW(),
  NOW()
),

-- Intermediate Norwegian Sessions
(
  'tmpl-lang-nor-inter-000000000002',
  'Norwegian Group Sessions (B1-B2)',
  'Intermediate Norwegian language program for participants with basic proficiency. Focus on workplace vocabulary, cultural integration, and advanced conversational skills. Three sessions per week over 16 weeks with online platform support.',
  'language',
  '1.0.0',
  '{
    "classSizeMin": 5,
    "classSizeMax": 8,
    "sessionDuration": 90,
    "sessionsPerWeek": 3,
    "totalWeeks": 16,
    "proficiencyLevels": ["B1", "B2"],
    "targetLanguages": ["no"],
    "deliveryMode": "online",
    "platform": "kintell",
    "curriculumFocus": ["business", "conversational", "academic"],
    "assessmentFrequency": "monthly",
    "certificationOffered": true,
    "textbookRequired": true,
    "textbookTitle": "På vei (Cappelen Damm)",
    "materialsUrl": "/resources/language/norwegian-b1-b2"
  }'::jsonb,
  5,
  8,
  1,
  '["language_proficiency", "workplace_readiness", "cultural_integration", "confidence"]'::jsonb,
  '["refugees", "migrants", "asylum_seekers", "employment", "integration"]'::jsonb,
  180.00,
  48.00,
  true,
  true,
  '["language", "norwegian", "intermediate", "workplace", "integration"]'::jsonb,
  NOW(),
  NOW()
),

-- Business English 1-on-1
(
  'tmpl-lang-eng-business-000000000003',
  'Business English 1-on-1 (B2-C1)',
  'Advanced business English program delivered through 1-on-1 sessions. Tailored to individual professional needs, focusing on presentations, negotiations, email writing, and industry-specific vocabulary. Ideal for professionals seeking to advance their careers.',
  'language',
  '1.0.0',
  '{
    "classSizeMin": 1,
    "classSizeMax": 1,
    "sessionDuration": 60,
    "sessionsPerWeek": 2,
    "totalWeeks": 12,
    "proficiencyLevels": ["B2", "C1"],
    "targetLanguages": ["en"],
    "deliveryMode": "online",
    "platform": "zoom",
    "curriculumFocus": ["business", "academic"],
    "assessmentFrequency": "weekly",
    "certificationOffered": true,
    "textbookRequired": false,
    "materialsUrl": "/resources/language/business-english"
  }'::jsonb,
  1,
  1,
  1,
  '["language_proficiency", "workplace_readiness", "career_progression", "confidence"]'::jsonb,
  '["refugees", "migrants", "women-in-tech", "employment", "professionals"]'::jsonb,
  250.00,
  24.00,
  true,
  true,
  '["language", "english", "business", "1-on-1", "advanced", "career"]'::jsonb,
  NOW(),
  NOW()
),

-- German Intensive Program
(
  'tmpl-lang-ger-intensive-000000000004',
  'German Intensive (A1-B1)',
  'Intensive German language program covering A1 to B1 levels. Five sessions per week over 20 weeks, combining classroom instruction with cultural immersion activities. Includes certification exam preparation. Designed for integration and employment readiness in German-speaking regions.',
  'language',
  '1.0.0',
  '{
    "classSizeMin": 8,
    "classSizeMax": 12,
    "sessionDuration": 120,
    "sessionsPerWeek": 5,
    "totalWeeks": 20,
    "proficiencyLevels": ["A1", "A2", "B1"],
    "targetLanguages": ["de"],
    "deliveryMode": "in-person",
    "curriculumFocus": ["conversational", "business", "integration"],
    "assessmentFrequency": "weekly",
    "certificationOffered": true,
    "textbookRequired": true,
    "textbookTitle": "Menschen (Hueber Verlag)",
    "materialsUrl": "/resources/language/german-intensive"
  }'::jsonb,
  8,
  12,
  2,
  '["language_proficiency", "integration", "workplace_readiness", "cultural_competence"]'::jsonb,
  '["refugees", "migrants", "asylum_seekers", "integration", "employment"]'::jsonb,
  300.00,
  100.00,
  true,
  true,
  '["language", "german", "intensive", "integration", "certification"]'::jsonb,
  NOW(),
  NOW()
);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify language templates were created
-- SELECT id, name, program_type, version, is_active FROM program_templates WHERE program_type = 'language';

-- Check config for English basic template
-- SELECT name, default_config FROM program_templates WHERE id = 'tmpl-lang-eng-basic-000000000001';
