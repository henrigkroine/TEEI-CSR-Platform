/**
 * Mentorship Template Schema
 * Based on "Mentors for Ukraine" program
 *
 * Agent: mentor-template-designer (Agent 3)
 */

import { z } from 'zod';

/**
 * Mentorship Template Configuration Schema
 * Defines all configurable parameters for mentorship programs
 */
export const MentorshipTemplateConfigSchema = z.object({
  // Session Configuration
  session: z.object({
    defaultDurationMinutes: z
      .number()
      .int()
      .min(15)
      .max(180)
      .default(60)
      .describe('Default session length in minutes'),

    recommendedFrequency: z
      .enum(['weekly', 'biweekly', 'monthly'])
      .default('weekly')
      .describe('Recommended cadence for sessions'),

    minSessionsForCompletion: z
      .number()
      .int()
      .min(1)
      .default(10)
      .describe('Minimum sessions required to complete program'),

    maxSessionsPerMonth: z
      .number()
      .int()
      .min(1)
      .max(20)
      .default(8)
      .describe('Maximum sessions allowed per month'),

    allowVirtualSessions: z
      .boolean()
      .default(true)
      .describe('Allow video call sessions'),

    allowInPersonSessions: z
      .boolean()
      .default(false)
      .describe('Allow face-to-face sessions'),
  }),

  // Matching Configuration
  matching: z.object({
    autoMatch: z
      .boolean()
      .default(false)
      .describe('Automatically match mentors with mentees'),

    matchingAlgorithm: z
      .enum(['manual', 'skill_based', 'interest_based', 'hybrid'])
      .default('hybrid')
      .describe('Algorithm for matching mentors to mentees'),

    criteria: z.object({
      skills: z
        .array(z.string())
        .default([])
        .describe('Required or preferred skills'),

      interests: z
        .array(z.string())
        .default([])
        .describe('Shared interests for matching'),

      languages: z
        .array(z.string())
        .default([])
        .describe('Languages spoken (ISO 639-1 codes)'),

      location: z
        .string()
        .optional()
        .describe('Geographic location for in-person matches'),

      industry: z
        .array(z.string())
        .default([])
        .describe('Industry experience'),

      careerStage: z
        .enum(['student', 'early', 'mid', 'senior', 'executive'])
        .optional()
        .describe('Career stage of mentee'),
    }),

    maxMenteesPerMentor: z
      .number()
      .int()
      .min(1)
      .max(10)
      .default(3)
      .describe('Maximum mentees a mentor can have concurrently'),
  }),

  // Progression & Milestones
  progression: z.object({
    trackCEFR: z
      .boolean()
      .default(false)
      .describe('Track language proficiency (CEFR) if language mentoring'),

    milestones: z
      .array(
        z.object({
          key: z.string().describe('Unique milestone identifier'),
          name: z.string().describe('Display name'),
          sessionCount: z.number().int().min(1).describe('Sessions required to reach this milestone'),
          description: z.string().optional(),
        })
      )
      .default([
        { key: 'first_session', name: 'First Session', sessionCount: 1 },
        { key: 'established', name: 'Relationship Established', sessionCount: 5 },
        { key: 'progressing', name: 'Progressing Well', sessionCount: 10 },
        { key: 'completed', name: 'Program Completed', sessionCount: 15 },
      ])
      .describe('Milestone definitions'),

    requireGoalSetting: z
      .boolean()
      .default(true)
      .describe('Require mentee to set goals'),

    requireFeedbackAfterSessions: z
      .boolean()
      .default(true)
      .describe('Require feedback after each session'),
  }),

  // Impact Configuration
  impact: z.object({
    sroiWeights: z
      .record(z.string(), z.number().nonnegative())
      .default({
        session_completed: 10.0,
        milestone_reached: 25.0,
        goal_achieved: 50.0,
        program_completed: 100.0,
        mentee_employed: 500.0,
        mentor_referral: 15.0,
      })
      .describe('SROI value points per activity type'),

    visMultipliers: z
      .record(z.string(), z.number().nonnegative())
      .default({
        session_completed: 5.0,
        feedback_positive: 2.0,
        feedback_exceptional: 5.0,
        milestone_reached: 10.0,
        goal_achieved: 20.0,
      })
      .describe('VIS point multipliers per activity type'),

    decayFactorMonthly: z
      .number()
      .min(0)
      .max(1)
      .default(0.95)
      .describe('VIS decay factor per month (0.95 = 5% monthly decay)'),
  }),

  // SDG Alignment
  sdgGoals: z
    .array(z.number().int().min(1).max(17))
    .default([4, 8, 10])
    .describe('UN Sustainable Development Goals (4: Quality Education, 8: Decent Work, 10: Reduced Inequalities)'),

  // Communication
  communication: z.object({
    allowDirectMessaging: z
      .boolean()
      .default(true)
      .describe('Allow mentor-mentee direct messages'),

    requirePlatformCommunication: z
      .boolean()
      .default(false)
      .describe('Require all communication through platform (safety)'),

    enableSessionNotes: z
      .boolean()
      .default(true)
      .describe('Enable session notes/summaries'),
  }),

  // Safety & Compliance
  safety: z.object({
    requireBackgroundCheck: z
      .boolean()
      .default(false)
      .describe('Require mentor background checks'),

    requireCodeOfConduct: z
      .boolean()
      .default(true)
      .describe('Require acceptance of code of conduct'),

    enableReporting: z
      .boolean()
      .default(true)
      .describe('Enable incident reporting'),

    minAge: z
      .number()
      .int()
      .min(13)
      .max(100)
      .default(18)
      .describe('Minimum age for participants'),
  }),
});

export type MentorshipTemplateConfig = z.infer<typeof MentorshipTemplateConfigSchema>;

/**
 * Default configuration for mentorship template
 */
export const MENTORSHIP_DEFAULT_CONFIG: MentorshipTemplateConfig = {
  session: {
    defaultDurationMinutes: 60,
    recommendedFrequency: 'weekly',
    minSessionsForCompletion: 10,
    maxSessionsPerMonth: 8,
    allowVirtualSessions: true,
    allowInPersonSessions: false,
  },
  matching: {
    autoMatch: false,
    matchingAlgorithm: 'hybrid',
    criteria: {
      skills: [],
      interests: [],
      languages: [],
      industry: [],
    },
    maxMenteesPerMentor: 3,
  },
  progression: {
    trackCEFR: false,
    milestones: [
      { key: 'first_session', name: 'First Session', sessionCount: 1 },
      { key: 'established', name: 'Relationship Established', sessionCount: 5 },
      { key: 'progressing', name: 'Progressing Well', sessionCount: 10 },
      { key: 'completed', name: 'Program Completed', sessionCount: 15 },
    ],
    requireGoalSetting: true,
    requireFeedbackAfterSessions: true,
  },
  impact: {
    sroiWeights: {
      session_completed: 10.0,
      milestone_reached: 25.0,
      goal_achieved: 50.0,
      program_completed: 100.0,
      mentee_employed: 500.0,
      mentor_referral: 15.0,
    },
    visMultipliers: {
      session_completed: 5.0,
      feedback_positive: 2.0,
      feedback_exceptional: 5.0,
      milestone_reached: 10.0,
      goal_achieved: 20.0,
    },
    decayFactorMonthly: 0.95,
  },
  sdgGoals: [4, 8, 10],
  communication: {
    allowDirectMessaging: true,
    requirePlatformCommunication: false,
    enableSessionNotes: true,
  },
  safety: {
    requireBackgroundCheck: false,
    requireCodeOfConduct: true,
    enableReporting: true,
    minAge: 18,
  },
};

/**
 * Activity types for SROI/VIS calculations
 */
export const MENTORSHIP_ACTIVITY_TYPES = [
  'session_completed',
  'milestone_reached',
  'goal_achieved',
  'program_completed',
  'mentee_employed',
  'mentor_referral',
  'feedback_positive',
  'feedback_exceptional',
] as const;

export type MentorshipActivityType = (typeof MENTORSHIP_ACTIVITY_TYPES)[number];
