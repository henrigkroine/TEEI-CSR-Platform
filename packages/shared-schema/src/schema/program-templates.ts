/**
 * Program Templates Schema
 *
 * Purpose: Defines reusable program templates for mentorship, language, buddy, upskilling, and weei programs.
 * Templates serve as blueprints for creating campaigns and program instances.
 *
 * Design Principles:
 * - Reusability: Templates can be instantiated multiple times across different campaigns
 * - Versioning: Templates support semantic versioning for evolution over time
 * - Flexibility: JSONB config field supports program-type-specific configurations
 * - Type Safety: TypeScript types for all JSONB configurations
 */

import { pgTable, uuid, varchar, timestamp, text, jsonb, pgEnum, integer, decimal, boolean, index } from 'drizzle-orm/pg-core';
import { users } from './users.js';

// ============================================================================
// ENUMS
// ============================================================================

/**
 * Program Types supported by the platform
 * - mentorship: 1-on-1 or group mentorship programs
 * - language: Language learning sessions (group or individual)
 * - buddy: Buddy matching programs for integration/support
 * - upskilling: Online courses, certifications, skill development
 * - weei: Work Experience & Employment Integration
 */
export const programTypeEnum = pgEnum('program_type', [
  'mentorship',
  'language',
  'buddy',
  'upskilling',
  'weei'
]);

// ============================================================================
// TYPESCRIPT TYPES FOR JSONB CONFIGS
// ============================================================================

/**
 * Mentorship Program Configuration
 */
export interface MentorshipConfig {
  sessionFormat: '1-on-1' | 'group' | 'hybrid';
  sessionDuration: number; // minutes
  sessionFrequency: 'weekly' | 'bi-weekly' | 'monthly' | 'flexible';
  totalDuration: number; // weeks
  totalSessionsRecommended?: number;

  // Matching
  matchingCriteria: string[]; // ['skills', 'industry', 'language', 'career_goals']
  autoMatching: boolean; // Auto-match or manual assignment

  // Focus areas
  focusAreas: string[]; // ['career', 'integration', 'technical_skills', 'language']

  // Outcomes tracked
  outcomesTracked: string[]; // ['job_readiness', 'confidence', 'network_building']

  // Requirements
  mentorRequirements?: {
    minExperience?: number; // years
    industries?: string[];
    languages?: string[];
    certifications?: string[];
  };

  // Support materials
  onboardingMaterialsUrl?: string;
  sessionGuidelinesUrl?: string;
}

/**
 * Language Program Configuration
 */
export interface LanguageConfig {
  // Class structure
  classSizeMin: number;
  classSizeMax: number;
  sessionDuration: number; // minutes
  sessionsPerWeek: number;
  totalWeeks: number;

  // Proficiency
  proficiencyLevels: ('A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2')[]; // CEFR levels supported
  targetLanguages: string[]; // ISO 639-1 codes: ['en', 'no', 'de', 'fr']

  // Delivery
  deliveryMode: 'in-person' | 'online' | 'hybrid';
  platform?: string; // 'zoom', 'teams', 'kintell', 'custom'

  // Curriculum
  curriculumFocus: string[]; // ['conversational', 'business', 'academic', 'survival']
  assessmentFrequency: 'weekly' | 'bi-weekly' | 'monthly' | 'end-of-course';
  certificationOffered: boolean;

  // Materials
  textbookRequired: boolean;
  textbookTitle?: string;
  materialsUrl?: string;
}

/**
 * Buddy Program Configuration
 */
export interface BuddyConfig {
  // Matching
  matchMethod: 'skill_based' | 'random' | 'interest_based' | 'manual';
  pairDuration: number; // weeks
  allowGroupBuddies: boolean; // Allow 1-to-many or many-to-many
  maxBuddiesPerVolunteer?: number;

  // Check-ins
  checkInFrequency: 'weekly' | 'bi-weekly' | 'monthly';
  checkInFormat: 'survey' | 'call' | 'meeting' | 'flexible';
  requiredCheckIns: number; // Minimum check-ins during program

  // Activities
  suggestedActivities: string[]; // ['coffee_chat', 'city_tour', 'workshop', 'skill_sharing']
  mandatoryActivities?: string[];
  activityTracking: boolean;

  // Goals
  primaryGoals: string[]; // ['integration', 'language_practice', 'cultural_exchange', 'networking']

  // Support
  buddyTrainingRequired: boolean;
  buddyTrainingUrl?: string;
  ongoingSupportUrl?: string;
}

/**
 * Upskilling Program Configuration
 */
export interface UpskillingConfig {
  // Platforms
  coursePlatforms: ('linkedin_learning' | 'coursera' | 'udemy' | 'pluralsight' | 'custom')[];
  platformUrls?: Record<string, string>;

  // Tracks
  skillTracks: string[]; // ['data_analytics', 'cloud', 'web_dev', 'project_management']
  difficultyLevels: ('beginner' | 'intermediate' | 'advanced')[];

  // Requirements
  certificationRequired: boolean;
  certificationProvider?: string;
  minimumCompletionRate: number; // percentage (0-100)
  timeToComplete: number; // weeks

  // Progress
  milestones: string[]; // ['module_1_complete', 'mid_term_assessment', 'final_project']
  progressTrackingFrequency: 'weekly' | 'bi-weekly' | 'monthly';

  // Support
  mentorSupport: boolean;
  peerGroupsEnabled: boolean;
  officeHoursUrl?: string;

  // Budget
  maxCostPerParticipant?: number;
  stipendProvided: boolean;
  stipendAmount?: number;
}

/**
 * WEEI (Work Experience & Employment Integration) Configuration
 */
export interface WeeiConfig {
  // Program type
  programType: 'internship' | 'apprenticeship' | 'job_placement' | 'work_experience' | 'mixed';
  duration: number; // weeks
  hoursPerWeek: number;

  // Placement
  placementType: 'internal' | 'external_partner' | 'mixed';
  partnerOrganizations?: string[];
  industries: string[];

  // Skills
  skillsRequired: string[];
  skillsDeveloped: string[];

  // Support
  jobCoachProvided: boolean;
  jobCoachHours?: number; // hours per participant
  cvReviewProvided: boolean;
  interviewPrepProvided: boolean;

  // Outcomes
  targetOutcomes: string[]; // ['job_offer', 'cv_improvement', 'interview_skills', 'work_experience']
  successMetrics: string[]; // ['placement_rate', 'retention_rate', 'skill_acquisition']

  // Compensation
  compensated: boolean;
  compensationAmount?: number;
  compensationType?: 'hourly' | 'monthly' | 'stipend';
}

/**
 * Union type for all config types
 */
export type ProgramTemplateConfig =
  | MentorshipConfig
  | LanguageConfig
  | BuddyConfig
  | UpskillingConfig
  | WeeiConfig;

// ============================================================================
// TABLES
// ============================================================================

/**
 * Program Templates Table
 *
 * Stores reusable program templates that can be instantiated as campaigns.
 * Each template defines:
 * - Program structure and format
 * - Default configurations
 * - Capacity guidelines
 * - Outcome metrics
 * - Monetization hints
 */
export const programTemplates = pgTable('program_templates', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Identity
  name: varchar('name', { length: 255 }).notNull(), // "Mentorship 1-on-1", "Language Group Sessions"
  description: text('description'),

  // Classification
  programType: programTypeEnum('program_type').notNull(),
  version: varchar('version', { length: 20 }).notNull().default('1.0.0'), // Semantic versioning

  // Configuration (JSONB - flexible, type-safe via TypeScript)
  // Structure depends on programType (see TypeScript interfaces above)
  defaultConfig: jsonb('default_config').notNull().$type<ProgramTemplateConfig>(),

  // Capacity Defaults (can be overridden in campaigns)
  defaultMinParticipants: integer('default_min_participants').notNull().default(1),
  defaultMaxParticipants: integer('default_max_participants').notNull().default(50),
  defaultVolunteersNeeded: integer('default_volunteers_needed').notNull().default(1),

  // Outcomes Tracked
  // Array of outcome metric keys that this template tracks
  // Examples: ['integration', 'language', 'job_readiness', 'confidence', 'network']
  outcomeMetrics: jsonb('outcome_metrics').notNull().default('[]').$type<string[]>(),

  // Eligibility & Compatibility
  // Tags matching BeneficiaryGroup.tags to determine compatibility
  // Examples: ['refugees', 'migrants', 'women-in-tech', 'youth', 'integration']
  suitableForGroups: jsonb('suitable_for_groups').notNull().default('[]').$type<string[]>(),

  // Monetization Hints (for pricing guidance)
  estimatedCostPerParticipant: decimal('estimated_cost_per_participant', { precision: 10, scale: 2 }), // USD/EUR
  estimatedHoursPerVolunteer: decimal('estimated_hours_per_volunteer', { precision: 8, scale: 2 }), // Total hours commitment

  // Visibility & Permissions
  isActive: boolean('is_active').notNull().default(true), // Can be used for new campaigns
  isPublic: boolean('is_public').notNull().default(true), // Available to all companies vs private/custom

  // Ownership
  createdBy: uuid('created_by').references(() => users.id), // Admin or template creator

  // Template metadata
  tags: jsonb('tags').notNull().default('[]').$type<string[]>(), // For filtering/search

  // Timestamps
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),

  // Deprecation
  deprecatedAt: timestamp('deprecated_at', { withTimezone: true }), // When marked as deprecated
  supersededBy: uuid('superseded_by').references((): any => programTemplates.id), // Link to newer version
}, (table) => ({
  // Indexes for performance
  programTypeIdx: index('program_templates_type_idx').on(table.programType),
  activePublicIdx: index('program_templates_active_public_idx').on(table.isActive, table.isPublic),
  versionIdx: index('program_templates_version_idx').on(table.version),
  createdAtIdx: index('program_templates_created_at_idx').on(table.createdAt),
}));

// ============================================================================
// TYPE EXPORTS
// ============================================================================

// Export inferred types for use in services
export type ProgramTemplate = typeof programTemplates.$inferSelect;
export type NewProgramTemplate = typeof programTemplates.$inferInsert;
