import { z } from 'zod';

/**
 * Impact Tiles Types
 * For Worker 3: Corporate Cockpit & Metrics Team
 * Pre-wired tiles for TEEI programs: Language, Mentorship, Upskilling, WEEI
 */

// Base tile metadata
export const TileMetadataSchema = z.object({
  tileId: z.string().uuid(),
  companyId: z.string().uuid(),
  programType: z.enum(['language', 'mentorship', 'upskilling', 'weei']),
  period: z.object({
    start: z.string().date(), // ISO 8601 date (YYYY-MM-DD)
    end: z.string().date(),
  }),
  calculatedAt: z.string().datetime(),
  dataFreshness: z.enum(['realtime', 'cached_5m', 'cached_1h', 'cached_24h']),
});

export type TileMetadata = z.infer<typeof TileMetadataSchema>;

// Language Tile
export const LanguageTileDataSchema = z.object({
  // Class sessions per week
  sessionsPerWeek: z.number().min(0),
  targetSessionsPerWeek: z.number().min(2).max(3).default(2.5), // 2-3×/week target

  // Cohort duration (in weeks)
  cohortDurationWeeks: z.number().min(0),
  targetDurationWeeks: z.number().min(8).max(12).default(10), // 2-3 months target

  // Volunteer hours
  volunteerHours: z.object({
    total: z.number().min(0),
    perSession: z.number().min(0),
    uniqueVolunteers: z.number().int().min(0),
  }),

  // Retention metrics
  retention: z.object({
    enrollments: z.number().int().min(0),
    activeParticipants: z.number().int().min(0),
    completions: z.number().int().min(0),
    dropoutRate: z.number().min(0).max(1), // 0-1 (percentage/100)
    retentionRate: z.number().min(0).max(1), // 1 - dropoutRate
  }),

  // Language level progression
  languageLevels: z.object({
    averageStartLevel: z.string().optional(), // e.g., "A1", "A2"
    averageCurrentLevel: z.string().optional(),
    progressionRate: z.number().min(0).max(1).optional(), // % who advanced
  }).optional(),

  // VIS and SROI scores (if applicable)
  vis: z.number().min(0).optional(),
  sroi: z.number().min(0).optional(),
});

export type LanguageTileData = z.infer<typeof LanguageTileDataSchema>;

export const LanguageTileSchema = z.object({
  metadata: TileMetadataSchema,
  data: LanguageTileDataSchema,
});

export type LanguageTile = z.infer<typeof LanguageTileSchema>;

// Mentorship Tile
export const MentorshipTileDataSchema = z.object({
  // Bookings
  bookings: z.object({
    total: z.number().int().min(0),
    scheduled: z.number().int().min(0),
    completed: z.number().int().min(0),
    cancelled: z.number().int().min(0),
  }),

  // Attendance
  attendance: z.object({
    attendanceRate: z.number().min(0).max(1), // completed / scheduled
    avgSessionDuration: z.number().min(0), // in minutes
    totalSessions: z.number().int().min(0),
  }),

  // No-show metrics
  noShowRate: z.number().min(0).max(1), // (scheduled - completed - cancelled) / scheduled

  // Repeat mentoring
  repeatMentoring: z.object({
    uniqueMentors: z.number().int().min(0),
    uniqueMentees: z.number().int().min(0),
    avgSessionsPerMentee: z.number().min(0),
    mentorsWithMultipleSessions: z.number().int().min(0), // Mentors who had 2+ sessions
    repeatRate: z.number().min(0).max(1), // % of mentees who had 2+ sessions
  }),

  // Feedback scores
  feedback: z.object({
    avgMentorRating: z.number().min(0).max(5).optional(), // 0-5 stars
    avgMenteeRating: z.number().min(0).max(5).optional(),
    feedbackCount: z.number().int().min(0),
  }).optional(),

  // VIS and SROI scores (if applicable)
  vis: z.number().min(0).optional(),
  sroi: z.number().min(0).optional(),
});

export type MentorshipTileData = z.infer<typeof MentorshipTileDataSchema>;

export const MentorshipTileSchema = z.object({
  metadata: TileMetadataSchema,
  data: MentorshipTileDataSchema,
});

export type MentorshipTile = z.infer<typeof MentorshipTileSchema>;

// Upskilling Tile
export const UpskillingTileDataSchema = z.object({
  // Funnel: enrollments → completions → placements
  funnel: z.object({
    enrollments: z.number().int().min(0),
    inProgress: z.number().int().min(0),
    completions: z.number().int().min(0),
    placements: z.number().int().min(0), // Job placements after course
    completionRate: z.number().min(0).max(1), // completions / enrollments
    placementRate: z.number().min(0).max(1), // placements / completions
  }),

  // Course locales
  locales: z.object({
    UA: z.number().int().min(0).optional(), // Ukrainian
    EN: z.number().int().min(0).optional(), // English
    DE: z.number().int().min(0).optional(), // German
    NO: z.number().int().min(0).optional(), // Norwegian
  }),

  // Course details
  courses: z.object({
    totalCourses: z.number().int().min(0),
    activeCourses: z.number().int().min(0),
    avgCourseDuration: z.number().min(0), // in weeks
    topCourses: z.array(
      z.object({
        courseName: z.string(),
        enrollments: z.number().int().min(0),
        completionRate: z.number().min(0).max(1),
      })
    ).max(5).optional(), // Top 5 courses
  }),

  // Skills acquired
  skills: z.object({
    totalSkillsAcquired: z.number().int().min(0),
    avgSkillsPerLearner: z.number().min(0),
    topSkills: z.array(z.string()).max(5).optional(), // Top 5 skills
  }).optional(),

  // VIS and SROI scores (if applicable)
  vis: z.number().min(0).optional(),
  sroi: z.number().min(0).optional(),
});

export type UpskillingTileData = z.infer<typeof UpskillingTileDataSchema>;

export const UpskillingTileSchema = z.object({
  metadata: TileMetadataSchema,
  data: UpskillingTileDataSchema,
});

export type UpskillingTile = z.infer<typeof UpskillingTileSchema>;

// WEEI Tile (Women's Economic Empowerment Initiative)
export const WEEITileDataSchema = z.object({
  // U:LEARN/U:START/U:GROW/U:LEAD throughput
  stages: z.object({
    ULEARN: z.object({
      enrollments: z.number().int().min(0),
      completions: z.number().int().min(0),
      completionRate: z.number().min(0).max(1),
    }),
    USTART: z.object({
      enrollments: z.number().int().min(0),
      completions: z.number().int().min(0),
      completionRate: z.number().min(0).max(1),
    }),
    UGROW: z.object({
      enrollments: z.number().int().min(0),
      completions: z.number().int().min(0),
      completionRate: z.number().min(0).max(1),
    }),
    ULEAD: z.object({
      enrollments: z.number().int().min(0),
      completions: z.number().int().min(0),
      completionRate: z.number().min(0).max(1),
    }),
  }),

  // Overall throughput
  throughput: z.object({
    totalEnrollments: z.number().int().min(0),
    totalCompletions: z.number().int().min(0),
    overallCompletionRate: z.number().min(0).max(1),
    avgTimeToComplete: z.number().min(0), // in weeks
  }),

  // Demo day metrics
  demoDay: z.object({
    demoDayCount: z.number().int().min(0), // Number of demo days held
    totalPresentations: z.number().int().min(0),
    uniqueParticipants: z.number().int().min(0),
    avgPresentationsPerDemoDay: z.number().min(0),
  }),

  // Progression between stages
  progression: z.object({
    learnToStart: z.number().min(0).max(1), // % who progressed from U:LEARN to U:START
    startToGrow: z.number().min(0).max(1),
    growToLead: z.number().min(0).max(1),
  }),

  // Business outcomes
  businessOutcomes: z.object({
    businessesStarted: z.number().int().min(0),
    jobsCreated: z.number().int().min(0),
    revenueGenerated: z.number().min(0).optional(), // in USD
  }).optional(),

  // VIS and SROI scores (if applicable)
  vis: z.number().min(0).optional(),
  sroi: z.number().min(0).optional(),
});

export type WEEITileData = z.infer<typeof WEEITileDataSchema>;

export const WEEITileSchema = z.object({
  metadata: TileMetadataSchema,
  data: WEEITileDataSchema,
});

export type WEEITile = z.infer<typeof WEEITileSchema>;

// Union type for all tile types
export const TileResultSchema = z.discriminatedUnion('metadata.programType', [
  LanguageTileSchema.extend({
    metadata: TileMetadataSchema.extend({ programType: z.literal('language') }),
  }),
  MentorshipTileSchema.extend({
    metadata: TileMetadataSchema.extend({ programType: z.literal('mentorship') }),
  }),
  UpskillingTileSchema.extend({
    metadata: TileMetadataSchema.extend({ programType: z.literal('upskilling') }),
  }),
  WEEITileSchema.extend({
    metadata: TileMetadataSchema.extend({ programType: z.literal('weei') }),
  }),
]);

export type TileResult = z.infer<typeof TileResultSchema>;

// API request/response types
export const GetTileRequestSchema = z.object({
  companyId: z.string().uuid(),
  tileType: z.enum(['language', 'mentorship', 'upskilling', 'weei']),
  period: z.object({
    start: z.string().date(),
    end: z.string().date(),
  }).optional(), // Defaults to current quarter if not provided
  includeBreakdown: z.boolean().default(false), // Include detailed breakdown
});

export type GetTileRequest = z.infer<typeof GetTileRequestSchema>;

export const GetTileResponseSchema = z.object({
  tile: TileResultSchema,
  entitlements: z.object({
    canExport: z.boolean(),
    canViewDetails: z.boolean(),
    canViewBenchmarks: z.boolean(),
  }),
  cacheTTL: z.number().int().min(0), // Cache TTL in seconds
});

export type GetTileResponse = z.infer<typeof GetTileResponseSchema>;

// Tile list response
export const GetTilesListResponseSchema = z.object({
  companyId: z.string().uuid(),
  tiles: z.array(TileResultSchema),
  availableTileTypes: z.array(z.enum(['language', 'mentorship', 'upskilling', 'weei'])),
  period: z.object({
    start: z.string().date(),
    end: z.string().date(),
  }),
});

export type GetTilesListResponse = z.infer<typeof GetTilesListResponseSchema>;
