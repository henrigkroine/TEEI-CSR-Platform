/**
 * Language Practice Template Schema
 * Based on "Language for Ukraine" program
 *
 * Agent: language-template-designer (Agent 4)
 */

import { z } from 'zod';

/**
 * CEFR Language Levels (Common European Framework of Reference)
 */
export const CEFRLevelSchema = z.enum(['A1', 'A2', 'B1', 'B2', 'C1', 'C2']);
export type CEFRLevel = z.infer<typeof CEFRLevelSchema>;

/**
 * Language Practice Template Configuration Schema
 * Defines all configurable parameters for language practice programs
 */
export const LanguageTemplateConfigSchema = z.object({
  // CEFR Configuration
  cefr: z.object({
    targetLevels: z
      .array(CEFRLevelSchema)
      .default(['A1', 'A2', 'B1', 'B2'])
      .describe('CEFR levels supported by this program'),

    assessmentIntervals: z
      .number()
      .int()
      .min(1)
      .max(365)
      .default(90)
      .describe('Days between proficiency assessments'),

    progressionThresholds: z
      .record(CEFRLevelSchema, z.number().int().min(1))
      .default({
        A1: 20, // 20 sessions to progress from A1 to A2
        A2: 25,
        B1: 30,
        B2: 35,
        C1: 40,
        C2: 50,
      })
      .describe('Sessions required to progress to next CEFR level'),

    enableSelfAssessment: z
      .boolean()
      .default(true)
      .describe('Allow learners to self-assess their level'),

    requireFormalAssessment: z
      .boolean()
      .default(false)
      .describe('Require formal proficiency tests'),
  }),

  // Session Configuration
  session: z.object({
    defaultDurationMinutes: z
      .number()
      .int()
      .min(15)
      .max(120)
      .default(45)
      .describe('Default session length in minutes'),

    recommendedFrequency: z
      .enum(['daily', 'every_other_day', 'weekly', 'biweekly'])
      .default('every_other_day')
      .describe('Recommended practice frequency'),

    minSessionsPerWeek: z
      .number()
      .int()
      .min(1)
      .max(7)
      .default(2)
      .describe('Minimum sessions per week'),

    maxSessionsPerWeek: z
      .number()
      .int()
      .min(1)
      .max(14)
      .default(5)
      .describe('Maximum sessions per week'),

    topicLibrary: z
      .array(
        z.object({
          category: z.string(),
          topics: z.array(z.string()),
        })
      )
      .default([
        {
          category: 'Daily Life',
          topics: ['Introductions', 'Food & Dining', 'Transportation', 'Shopping', 'Weather'],
        },
        {
          category: 'Work & Career',
          topics: ['Job Interviews', 'Office Communication', 'Presentations', 'Emails'],
        },
        {
          category: 'Culture & Society',
          topics: ['Holidays', 'Traditions', 'Current Events', 'Arts'],
        },
      ])
      .describe('Conversation topic library'),

    allowTopicSelection: z
      .boolean()
      .default(true)
      .describe('Allow participants to choose conversation topics'),
  }),

  // Matching Configuration
  matching: z.object({
    languagePairs: z
      .array(
        z.object({
          nativeLanguage: z.string().describe('ISO 639-1 language code'),
          targetLanguage: z.string().describe('ISO 639-1 language code'),
        })
      )
      .default([])
      .describe('Supported language pairs'),

    matchByProficiencyGap: z
      .boolean()
      .default(true)
      .describe('Match learners with similar proficiency levels'),

    maxProficiencyGap: z
      .number()
      .int()
      .min(0)
      .max(6)
      .default(1)
      .describe('Max CEFR level difference (0 = same level, 1 = one level apart)'),

    preferNativeSpeakers: z
      .boolean()
      .default(true)
      .describe('Prefer native speakers as conversation partners'),

    enablePeerExchange: z
      .boolean()
      .default(true)
      .describe('Enable reciprocal language exchange (both learn)'),
  }),

  // Progression & Milestones
  progression: z.object({
    milestones: z
      .array(
        z.object({
          key: z.string(),
          name: z.string(),
          cefrLevel: CEFRLevelSchema.optional(),
          sessionCount: z.number().int().min(1),
          description: z.string().optional(),
        })
      )
      .default([
        { key: 'first_conversation', name: 'First Conversation', sessionCount: 1 },
        { key: 'reached_a2', name: 'Elementary Proficiency (A2)', cefrLevel: 'A2', sessionCount: 20 },
        { key: 'reached_b1', name: 'Intermediate Proficiency (B1)', cefrLevel: 'B1', sessionCount: 45 },
        { key: 'reached_b2', name: 'Upper Intermediate (B2)', cefrLevel: 'B2', sessionCount: 75 },
      ])
      .describe('Learning milestones'),

    trackVocabulary: z
      .boolean()
      .default(true)
      .describe('Track vocabulary acquisition'),

    trackPronunciation: z
      .boolean()
      .default(false)
      .describe('Track pronunciation improvement'),

    enableFlashcards: z
      .boolean()
      .default(true)
      .describe('Enable flashcard system for vocabulary'),
  }),

  // Impact Configuration
  impact: z.object({
    sroiWeights: z
      .record(z.string(), z.number().nonnegative())
      .default({
        session_completed: 8.0,
        cefr_level_advanced: 50.0,
        assessment_passed: 30.0,
        vocabulary_milestone: 5.0,
        program_completed: 100.0,
        cultural_integration_event: 20.0,
      })
      .describe('SROI value points per activity type'),

    visMultipliers: z
      .record(z.string(), z.number().nonnegative())
      .default({
        session_completed: 4.0,
        feedback_positive: 2.0,
        cefr_level_advanced: 15.0,
        vocabulary_milestone: 3.0,
        consistent_attendance: 5.0,
      })
      .describe('VIS point multipliers per activity type'),

    decayFactorMonthly: z
      .number()
      .min(0)
      .max(1)
      .default(0.93)
      .describe('VIS decay factor per month (0.93 = 7% monthly decay)'),
  }),

  // SDG Alignment
  sdgGoals: z
    .array(z.number().int().min(1).max(17))
    .default([4, 10, 16])
    .describe('UN Sustainable Development Goals (4: Quality Education, 10: Reduced Inequalities, 16: Peace & Justice)'),

  // Resources
  resources: z.object({
    provideLearningMaterials: z
      .boolean()
      .default(true)
      .describe('Provide downloadable learning materials'),

    enableRecording: z
      .boolean()
      .default(false)
      .describe('Allow session recording (with consent)'),

    vocabularyLists: z
      .boolean()
      .default(true)
      .describe('Provide vocabulary lists by CEFR level'),

    grammarGuides: z
      .boolean()
      .default(true)
      .describe('Provide grammar guides'),
  }),

  // Cultural Integration
  cultural: z.object({
    includeCulturalModules: z
      .boolean()
      .default(true)
      .describe('Include cultural awareness modules'),

    enableCulturalEvents: z
      .boolean()
      .default(true)
      .describe('Enable cultural exchange events'),

    pairWithLocalCommunity: z
      .boolean()
      .default(false)
      .describe('Connect learners with local community groups'),
  }),
});

export type LanguageTemplateConfig = z.infer<typeof LanguageTemplateConfigSchema>;

/**
 * Default configuration for language practice template
 */
export const LANGUAGE_DEFAULT_CONFIG: LanguageTemplateConfig = {
  cefr: {
    targetLevels: ['A1', 'A2', 'B1', 'B2'],
    assessmentIntervals: 90,
    progressionThresholds: {
      A1: 20,
      A2: 25,
      B1: 30,
      B2: 35,
      C1: 40,
      C2: 50,
    },
    enableSelfAssessment: true,
    requireFormalAssessment: false,
  },
  session: {
    defaultDurationMinutes: 45,
    recommendedFrequency: 'every_other_day',
    minSessionsPerWeek: 2,
    maxSessionsPerWeek: 5,
    topicLibrary: [
      {
        category: 'Daily Life',
        topics: ['Introductions', 'Food & Dining', 'Transportation', 'Shopping', 'Weather'],
      },
      {
        category: 'Work & Career',
        topics: ['Job Interviews', 'Office Communication', 'Presentations', 'Emails'],
      },
      {
        category: 'Culture & Society',
        topics: ['Holidays', 'Traditions', 'Current Events', 'Arts'],
      },
    ],
    allowTopicSelection: true,
  },
  matching: {
    languagePairs: [],
    matchByProficiencyGap: true,
    maxProficiencyGap: 1,
    preferNativeSpeakers: true,
    enablePeerExchange: true,
  },
  progression: {
    milestones: [
      { key: 'first_conversation', name: 'First Conversation', sessionCount: 1 },
      { key: 'reached_a2', name: 'Elementary Proficiency (A2)', cefrLevel: 'A2', sessionCount: 20 },
      { key: 'reached_b1', name: 'Intermediate Proficiency (B1)', cefrLevel: 'B1', sessionCount: 45 },
      { key: 'reached_b2', name: 'Upper Intermediate (B2)', cefrLevel: 'B2', sessionCount: 75 },
    ],
    trackVocabulary: true,
    trackPronunciation: false,
    enableFlashcards: true,
  },
  impact: {
    sroiWeights: {
      session_completed: 8.0,
      cefr_level_advanced: 50.0,
      assessment_passed: 30.0,
      vocabulary_milestone: 5.0,
      program_completed: 100.0,
      cultural_integration_event: 20.0,
    },
    visMultipliers: {
      session_completed: 4.0,
      feedback_positive: 2.0,
      cefr_level_advanced: 15.0,
      vocabulary_milestone: 3.0,
      consistent_attendance: 5.0,
    },
    decayFactorMonthly: 0.93,
  },
  sdgGoals: [4, 10, 16],
  resources: {
    provideLearningMaterials: true,
    enableRecording: false,
    vocabularyLists: true,
    grammarGuides: true,
  },
  cultural: {
    includeCulturalModules: true,
    enableCulturalEvents: true,
    pairWithLocalCommunity: false,
  },
};

/**
 * Activity types for SROI/VIS calculations
 */
export const LANGUAGE_ACTIVITY_TYPES = [
  'session_completed',
  'cefr_level_advanced',
  'assessment_passed',
  'vocabulary_milestone',
  'program_completed',
  'cultural_integration_event',
  'feedback_positive',
  'consistent_attendance',
] as const;

export type LanguageActivityType = (typeof LANGUAGE_ACTIVITY_TYPES)[number];
