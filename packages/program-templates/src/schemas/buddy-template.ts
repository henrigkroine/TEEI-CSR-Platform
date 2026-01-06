/**
 * Buddy Integration Template Schema
 * Based on "TEEI Buddy Program"
 *
 * Agent: buddy-template-designer (Agent 5)
 */

import { z } from 'zod';

/**
 * Buddy Integration Template Configuration Schema
 * Defines all configurable parameters for buddy programs
 */
export const BuddyTemplateConfigSchema = z.object({
  // Matching Configuration
  matching: z.object({
    algorithm: z
      .enum(['manual', 'algorithmic', 'hybrid'])
      .default('hybrid')
      .describe('Matching approach'),

    criteria: z.object({
      interests: z
        .array(z.string())
        .default([])
        .describe('Shared interests for matching'),

      location: z
        .enum(['same_city', 'same_region', 'same_country', 'any'])
        .default('same_region')
        .describe('Geographic proximity preference'),

      demographics: z.object({
        considerAge: z.boolean().default(true),
        considerGender: z.boolean().default(false),
        considerLanguage: z.boolean().default(true),
      }),

      maxAgeDifference: z
        .number()
        .int()
        .min(0)
        .max(50)
        .default(15)
        .describe('Maximum age gap in years'),
    }),

    algorithmWeights: z
      .record(z.string(), z.number().min(0).max(1))
      .default({
        interests: 0.40,
        location: 0.30,
        language: 0.20,
        demographics: 0.10,
      })
      .describe('Weighting for matching algorithm'),

    allowSelfSelection: z
      .boolean()
      .default(false)
      .describe('Allow participants to browse and select buddies'),

    requireMutualAcceptance: z
      .boolean()
      .default(true)
      .describe('Require both parties to accept match'),
  }),

  // Check-in Configuration
  checkins: z.object({
    frequency: z
      .enum(['weekly', 'biweekly', 'monthly'])
      .default('weekly')
      .describe('Recommended check-in frequency'),

    moodTracking: z
      .boolean()
      .default(true)
      .describe('Track participant mood in check-ins'),

    moodOptions: z
      .array(z.string())
      .default(['great', 'good', 'okay', 'struggling', 'difficult'])
      .describe('Mood options for check-ins'),

    requireNotes: z
      .boolean()
      .default(false)
      .describe('Require notes on each check-in'),

    enableReminders: z
      .boolean()
      .default(true)
      .describe('Send check-in reminders'),
  }),

  // Event Configuration
  events: z.object({
    types: z
      .array(
        z.object({
          key: z.string(),
          name: z.string(),
          category: z.enum(['social', 'cultural', 'recreational', 'educational', 'professional']),
          impactWeight: z.number().nonnegative().default(1.0),
        })
      )
      .default([
        { key: 'hangout', name: 'Casual Hangout', category: 'social', impactWeight: 5.0 },
        { key: 'cultural_event', name: 'Cultural Event', category: 'cultural', impactWeight: 10.0 },
        { key: 'sports', name: 'Sports/Recreation', category: 'recreational', impactWeight: 7.0 },
        { key: 'workshop', name: 'Workshop/Class', category: 'educational', impactWeight: 12.0 },
        { key: 'networking', name: 'Professional Networking', category: 'professional', impactWeight: 15.0 },
      ])
      .describe('Types of events buddies can participate in'),

    categories: z
      .array(z.string())
      .default(['social', 'cultural', 'recreational', 'educational', 'professional'])
      .describe('Event categories'),

    allowUserCreatedEvents: z
      .boolean()
      .default(true)
      .describe('Allow buddies to create their own events'),

    requireEventApproval: z
      .boolean()
      .default(false)
      .describe('Require platform approval for events'),

    minEventsPerMonth: z
      .number()
      .int()
      .min(0)
      .max(20)
      .default(2)
      .describe('Minimum recommended events per month'),
  }),

  // Skill Sharing Configuration
  skillSharing: z.object({
    enable: z
      .boolean()
      .default(true)
      .describe('Enable skill exchange sessions'),

    topics: z
      .array(z.string())
      .default([
        'Job search strategies',
        'Resume writing',
        'Interview preparation',
        'Networking skills',
        'Digital literacy',
        'Financial literacy',
        'Cultural adaptation',
        'Language practice',
        'Professional skills',
      ])
      .describe('Skill-sharing topic suggestions'),

    requireDocumentation: z
      .boolean()
      .default(true)
      .describe('Require documentation of skills shared'),

    validationRules: z.object({
      minDurationMinutes: z.number().int().min(15).default(30),
      requireBothPartiesConfirm: z.boolean().default(true),
    }),
  }),

  // Milestone Configuration
  milestones: z.object({
    integrationStages: z
      .array(
        z.object({
          key: z.string(),
          name: z.string(),
          criteria: z.object({
            eventsAttended: z.number().int().min(0).optional(),
            checkinsCompleted: z.number().int().min(0).optional(),
            skillSharesCompleted: z.number().int().min(0).optional(),
            daysActive: z.number().int().min(0).optional(),
          }),
          impactPoints: z.number().nonnegative(),
        })
      )
      .default([
        {
          key: 'first_meeting',
          name: 'First Meeting',
          criteria: { eventsAttended: 1 },
          impactPoints: 20.0,
        },
        {
          key: 'connected',
          name: 'Connected',
          criteria: { eventsAttended: 3, checkinsCompleted: 4 },
          impactPoints: 50.0,
        },
        {
          key: 'integrated',
          name: 'Socially Integrated',
          criteria: { eventsAttended: 10, checkinsCompleted: 12, daysActive: 90 },
          impactPoints: 150.0,
        },
        {
          key: 'thriving',
          name: 'Thriving',
          criteria: { eventsAttended: 20, skillSharesCompleted: 3, daysActive: 180 },
          impactPoints: 300.0,
        },
      ])
      .describe('Social integration milestones'),

    enableCustomMilestones: z
      .boolean()
      .default(false)
      .describe('Allow programs to define custom milestones'),
  }),

  // Impact Configuration
  impact: z.object({
    sroiWeights: z
      .record(z.string(), z.number().nonnegative())
      .default({
        match_created: 15.0,
        event_attended: 8.0,
        checkin_completed: 3.0,
        skill_share_completed: 20.0,
        milestone_reached: 25.0,
        feedback_positive: 5.0,
        community_integration: 100.0,
      })
      .describe('SROI value points per activity type'),

    visMultipliers: z
      .record(z.string(), z.number().nonnegative())
      .default({
        event_attended: 5.0,
        event_cultural: 8.0,
        event_professional: 10.0,
        checkin_positive: 3.0,
        skill_share_completed: 12.0,
        milestone_reached: 15.0,
      })
      .describe('VIS point multipliers per activity type'),

    decayFactorMonthly: z
      .number()
      .min(0)
      .max(1)
      .default(0.90)
      .describe('VIS decay factor per month (0.90 = 10% monthly decay)'),
  }),

  // SDG Alignment
  sdgGoals: z
    .array(z.number().int().min(1).max(17))
    .default([1, 10, 16, 17])
    .describe('UN SDG (1: No Poverty, 10: Reduced Inequalities, 16: Peace & Justice, 17: Partnerships)'),

  // Communication
  communication: z.object({
    enableDirectMessaging: z
      .boolean()
      .default(true)
      .describe('Allow buddy-to-buddy direct messages'),

    enableGroupChats: z
      .boolean()
      .default(true)
      .describe('Allow group chats for events'),

    enableVideoIntroduction: z
      .boolean()
      .default(false)
      .describe('Require video introductions before first meeting'),

    translationSupport: z
      .boolean()
      .default(true)
      .describe('Enable message translation'),
  }),

  // Safety & Support
  safety: z.object({
    requireOrientation: z
      .boolean()
      .default(true)
      .describe('Require orientation session before matching'),

    backgroundCheckBuddy: z
      .boolean()
      .default(false)
      .describe('Require background check for buddies'),

    enableEmergencyContacts: z
      .boolean()
      .default(true)
      .describe('Collect emergency contact information'),

    safetyResources: z
      .boolean()
      .default(true)
      .describe('Provide safety guidelines and resources'),

    enableSupportHotline: z
      .boolean()
      .default(false)
      .describe('Provide 24/7 support hotline'),
  }),

  // Program Duration
  duration: z.object({
    programLengthMonths: z
      .number()
      .int()
      .min(1)
      .max(24)
      .default(6)
      .describe('Default program duration in months'),

    allowExtension: z
      .boolean()
      .default(true)
      .describe('Allow participants to extend beyond program duration'),

    requireExitInterview: z
      .boolean()
      .default(true)
      .describe('Require exit interview at program completion'),
  }),
});

export type BuddyTemplateConfig = z.infer<typeof BuddyTemplateConfigSchema>;

/**
 * Default configuration for buddy integration template
 */
export const BUDDY_DEFAULT_CONFIG: BuddyTemplateConfig = {
  matching: {
    algorithm: 'hybrid',
    criteria: {
      interests: [],
      location: 'same_region',
      demographics: {
        considerAge: true,
        considerGender: false,
        considerLanguage: true,
      },
      maxAgeDifference: 15,
    },
    algorithmWeights: {
      interests: 0.4,
      location: 0.3,
      language: 0.2,
      demographics: 0.1,
    },
    allowSelfSelection: false,
    requireMutualAcceptance: true,
  },
  checkins: {
    frequency: 'weekly',
    moodTracking: true,
    moodOptions: ['great', 'good', 'okay', 'struggling', 'difficult'],
    requireNotes: false,
    enableReminders: true,
  },
  events: {
    types: [
      { key: 'hangout', name: 'Casual Hangout', category: 'social', impactWeight: 5.0 },
      { key: 'cultural_event', name: 'Cultural Event', category: 'cultural', impactWeight: 10.0 },
      { key: 'sports', name: 'Sports/Recreation', category: 'recreational', impactWeight: 7.0 },
      { key: 'workshop', name: 'Workshop/Class', category: 'educational', impactWeight: 12.0 },
      { key: 'networking', name: 'Professional Networking', category: 'professional', impactWeight: 15.0 },
    ],
    categories: ['social', 'cultural', 'recreational', 'educational', 'professional'],
    allowUserCreatedEvents: true,
    requireEventApproval: false,
    minEventsPerMonth: 2,
  },
  skillSharing: {
    enable: true,
    topics: [
      'Job search strategies',
      'Resume writing',
      'Interview preparation',
      'Networking skills',
      'Digital literacy',
      'Financial literacy',
      'Cultural adaptation',
      'Language practice',
      'Professional skills',
    ],
    requireDocumentation: true,
    validationRules: {
      minDurationMinutes: 30,
      requireBothPartiesConfirm: true,
    },
  },
  milestones: {
    integrationStages: [
      {
        key: 'first_meeting',
        name: 'First Meeting',
        criteria: { eventsAttended: 1 },
        impactPoints: 20.0,
      },
      {
        key: 'connected',
        name: 'Connected',
        criteria: { eventsAttended: 3, checkinsCompleted: 4 },
        impactPoints: 50.0,
      },
      {
        key: 'integrated',
        name: 'Socially Integrated',
        criteria: { eventsAttended: 10, checkinsCompleted: 12, daysActive: 90 },
        impactPoints: 150.0,
      },
      {
        key: 'thriving',
        name: 'Thriving',
        criteria: { eventsAttended: 20, skillSharesCompleted: 3, daysActive: 180 },
        impactPoints: 300.0,
      },
    ],
    enableCustomMilestones: false,
  },
  impact: {
    sroiWeights: {
      match_created: 15.0,
      event_attended: 8.0,
      checkin_completed: 3.0,
      skill_share_completed: 20.0,
      milestone_reached: 25.0,
      feedback_positive: 5.0,
      community_integration: 100.0,
    },
    visMultipliers: {
      event_attended: 5.0,
      event_cultural: 8.0,
      event_professional: 10.0,
      checkin_positive: 3.0,
      skill_share_completed: 12.0,
      milestone_reached: 15.0,
    },
    decayFactorMonthly: 0.9,
  },
  sdgGoals: [1, 10, 16, 17],
  communication: {
    enableDirectMessaging: true,
    enableGroupChats: true,
    enableVideoIntroduction: false,
    translationSupport: true,
  },
  safety: {
    requireOrientation: true,
    backgroundCheckBuddy: false,
    enableEmergencyContacts: true,
    safetyResources: true,
    enableSupportHotline: false,
  },
  duration: {
    programLengthMonths: 6,
    allowExtension: true,
    requireExitInterview: true,
  },
};

/**
 * Activity types for SROI/VIS calculations
 */
export const BUDDY_ACTIVITY_TYPES = [
  'match_created',
  'event_attended',
  'event_cultural',
  'event_professional',
  'checkin_completed',
  'checkin_positive',
  'skill_share_completed',
  'milestone_reached',
  'feedback_positive',
  'community_integration',
] as const;

export type BuddyActivityType = (typeof BUDDY_ACTIVITY_TYPES)[number];
