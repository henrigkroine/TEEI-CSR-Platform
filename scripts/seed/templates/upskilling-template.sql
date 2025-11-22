-- Upskilling Program Template Seed Data
-- Purpose: Create default upskilling and certification program templates
-- Date: 2025-11-22
-- Environment: ALL
-- Dependencies: Requires program_templates table to exist

-- =============================================================================
-- UPSKILLING TEMPLATES
-- =============================================================================

-- Tech Skills Bootcamp
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
  'tmpl-upskill-tech-000000000001',
  'Tech Skills Bootcamp (12 weeks)',
  'Intensive technology skills program covering web development, data analytics, or cloud fundamentals. Delivered via LinkedIn Learning and Coursera with mentor support. Participants complete structured learning paths, build portfolios, and earn certifications. Ideal for career switchers and upskilling.',
  'upskilling',
  '1.0.0',
  '{
    "coursePlatforms": ["linkedin_learning", "coursera"],
    "platformUrls": {
      "linkedin_learning": "https://www.linkedin.com/learning/",
      "coursera": "https://www.coursera.org/"
    },
    "skillTracks": ["web_dev", "data_analytics", "cloud"],
    "difficultyLevels": ["beginner", "intermediate"],
    "certificationRequired": true,
    "certificationProvider": "LinkedIn Learning / Coursera",
    "minimumCompletionRate": 80,
    "timeToComplete": 12,
    "milestones": [
      "module_1_fundamentals",
      "module_2_intermediate",
      "module_3_advanced",
      "capstone_project",
      "certification_exam"
    ],
    "progressTrackingFrequency": "weekly",
    "mentorSupport": true,
    "peerGroupsEnabled": true,
    "officeHoursUrl": "/resources/upskilling/tech-office-hours",
    "maxCostPerParticipant": 500,
    "stipendProvided": false
  }'::jsonb,
  5,
  30,
  2,
  '["skill_acquisition", "certification", "job_readiness", "confidence", "career_progression"]'::jsonb,
  '["refugees", "migrants", "career_switchers", "women-in-tech", "upskilling", "employment"]'::jsonb,
  500.00,
  24.00,
  true,
  true,
  '["upskilling", "tech", "certification", "bootcamp", "career"]'::jsonb,
  NOW(),
  NOW()
),

-- Professional Certifications
(
  'tmpl-upskill-prof-cert-000000000002',
  'Professional Certifications (16 weeks)',
  'Self-paced professional certification programs (PMP, Scrum Master, Google Analytics, etc.) with structured study groups and mentor guidance. Participants choose certification paths aligned with career goals. Includes exam prep and study materials.',
  'upskilling',
  '1.0.0',
  '{
    "coursePlatforms": ["coursera", "udemy", "custom"],
    "platformUrls": {
      "coursera": "https://www.coursera.org/",
      "udemy": "https://www.udemy.com/"
    },
    "skillTracks": ["project_management", "agile", "analytics", "marketing", "hr"],
    "difficultyLevels": ["intermediate", "advanced"],
    "certificationRequired": true,
    "certificationProvider": "Various (PMI, Scrum.org, Google, etc.)",
    "minimumCompletionRate": 90,
    "timeToComplete": 16,
    "milestones": [
      "study_plan_created",
      "week_4_checkin",
      "week_8_checkin",
      "week_12_checkin",
      "practice_exam",
      "certification_exam"
    ],
    "progressTrackingFrequency": "bi-weekly",
    "mentorSupport": true,
    "peerGroupsEnabled": true,
    "officeHoursUrl": "/resources/upskilling/cert-office-hours",
    "maxCostPerParticipant": 800,
    "stipendProvided": true,
    "stipendAmount": 200
  }'::jsonb,
  3,
  20,
  1,
  '["certification", "career_progression", "skill_acquisition", "job_readiness", "confidence"]'::jsonb,
  '["refugees", "migrants", "professionals", "employment", "career_switchers"]'::jsonb,
  800.00,
  16.00,
  true,
  true,
  '["upskilling", "certification", "professional", "career", "self_paced"]'::jsonb,
  NOW(),
  NOW()
),

-- Digital Literacy Basics
(
  'tmpl-upskill-digital-basics-000000000003',
  'Digital Literacy Fundamentals (8 weeks)',
  'Foundational digital skills program covering computer basics, internet safety, email, Microsoft Office, and online collaboration tools. Designed for participants with limited digital experience. Combines online modules with hands-on workshops.',
  'upskilling',
  '1.0.0',
  '{
    "coursePlatforms": ["custom"],
    "platformUrls": {
      "custom": "/resources/digital-literacy"
    },
    "skillTracks": ["computer_basics", "office_productivity", "internet_safety", "email"],
    "difficultyLevels": ["beginner"],
    "certificationRequired": false,
    "minimumCompletionRate": 70,
    "timeToComplete": 8,
    "milestones": [
      "computer_navigation",
      "email_setup",
      "word_basics",
      "excel_basics",
      "online_safety",
      "final_project"
    ],
    "progressTrackingFrequency": "weekly",
    "mentorSupport": true,
    "peerGroupsEnabled": true,
    "officeHoursUrl": "/resources/upskilling/digital-office-hours",
    "maxCostPerParticipant": 100,
    "stipendProvided": false
  }'::jsonb,
  8,
  15,
  2,
  '["digital_literacy", "confidence", "job_readiness", "skill_acquisition"]'::jsonb,
  '["refugees", "migrants", "asylum_seekers", "seniors", "digital_inclusion"]'::jsonb,
  100.00,
  16.00,
  true,
  true,
  '["upskilling", "digital_literacy", "basics", "beginner", "workshops"]'::jsonb,
  NOW(),
  NOW()
),

-- Language + Professional Skills Combo
(
  'tmpl-upskill-lang-prof-000000000004',
  'Language + Professional Skills (20 weeks)',
  'Integrated program combining language learning with professional skill development. Participants improve language proficiency while learning industry-specific skills (hospitality, healthcare, retail, etc.). Includes job placement support.',
  'upskilling',
  '1.0.0',
  '{
    "coursePlatforms": ["udemy", "custom"],
    "platformUrls": {
      "udemy": "https://www.udemy.com/",
      "custom": "/resources/language-professional"
    },
    "skillTracks": ["hospitality", "healthcare", "retail", "customer_service"],
    "difficultyLevels": ["beginner", "intermediate"],
    "certificationRequired": true,
    "certificationProvider": "Industry-specific certifications",
    "minimumCompletionRate": 75,
    "timeToComplete": 20,
    "milestones": [
      "language_assessment",
      "week_5_skills_intro",
      "week_10_integration",
      "week_15_practical",
      "job_shadow",
      "certification_exam"
    ],
    "progressTrackingFrequency": "bi-weekly",
    "mentorSupport": true,
    "peerGroupsEnabled": true,
    "officeHoursUrl": "/resources/upskilling/combo-office-hours",
    "maxCostPerParticipant": 400,
    "stipendProvided": true,
    "stipendAmount": 300
  }'::jsonb,
  10,
  25,
  3,
  '["language_proficiency", "skill_acquisition", "job_readiness", "certification", "career_progression"]'::jsonb,
  '["refugees", "migrants", "asylum_seekers", "integration", "employment"]'::jsonb,
  400.00,
  40.00,
  true,
  true,
  '["upskilling", "language", "professional", "integrated", "job_placement"]'::jsonb,
  NOW(),
  NOW()
),

-- Cloud Computing Certification
(
  'tmpl-upskill-cloud-000000000005',
  'Cloud Computing Certification (14 weeks)',
  'Advanced cloud computing program preparing participants for AWS, Azure, or Google Cloud certifications. Covers cloud fundamentals, architecture, deployment, and management. Includes hands-on labs and practice exams. For technically-inclined professionals.',
  'upskilling',
  '1.0.0',
  '{
    "coursePlatforms": ["pluralsight", "coursera"],
    "platformUrls": {
      "pluralsight": "https://www.pluralsight.com/",
      "coursera": "https://www.coursera.org/"
    },
    "skillTracks": ["cloud", "devops", "infrastructure"],
    "difficultyLevels": ["intermediate", "advanced"],
    "certificationRequired": true,
    "certificationProvider": "AWS/Azure/GCP",
    "minimumCompletionRate": 85,
    "timeToComplete": 14,
    "milestones": [
      "fundamentals_complete",
      "architecture_module",
      "hands_on_labs",
      "practice_exam_1",
      "practice_exam_2",
      "certification_exam"
    ],
    "progressTrackingFrequency": "weekly",
    "mentorSupport": true,
    "peerGroupsEnabled": true,
    "officeHoursUrl": "/resources/upskilling/cloud-office-hours",
    "maxCostPerParticipant": 600,
    "stipendProvided": true,
    "stipendAmount": 150
  }'::jsonb,
  3,
  15,
  1,
  '["certification", "skill_acquisition", "job_readiness", "career_progression", "technical_growth"]'::jsonb,
  '["refugees", "migrants", "women-in-tech", "career_switchers", "upskilling"]'::jsonb,
  600.00,
  20.00,
  true,
  true,
  '["upskilling", "cloud", "certification", "technical", "advanced"]'::jsonb,
  NOW(),
  NOW()
);

-- =============================================================================
-- VERIFICATION QUERIES
-- =============================================================================

-- Verify upskilling templates were created
-- SELECT id, name, program_type, version, is_active FROM program_templates WHERE program_type = 'upskilling';

-- Check config for tech bootcamp template
-- SELECT name, default_config FROM program_templates WHERE id = 'tmpl-upskill-tech-000000000001';
