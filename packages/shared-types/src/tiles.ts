/**
 * Impact Tiles Type Definitions
 * Pre-wired to TEEI programs: Language, Mentorship, Upskilling, WEEI
 */

/**
 * Base tile interface - common properties for all tile types
 */
export interface BaseTile {
  /** Unique tile identifier */
  id: string;
  /** Tile type discriminator */
  type: 'language' | 'mentorship' | 'upskilling' | 'weei';
  /** Company this tile belongs to */
  companyId: string;
  /** Period start date (ISO format) */
  periodStart: string;
  /** Period end date (ISO format) */
  periodEnd: string;
  /** When this tile data was last updated */
  lastUpdated: string;
  /** VIS score if applicable */
  visScore?: number;
  /** SROI ratio if applicable */
  sroiRatio?: number;
}

/**
 * Language Program Tile
 * Tracks class sessions, cohort duration, volunteer hours, and retention
 */
export interface LanguageTile extends BaseTile {
  type: 'language';
  metrics: {
    /** Average class sessions per week */
    sessionsPerWeek: number;
    /** Cohort duration in months */
    cohortDurationMonths: number;
    /** Total volunteer hours contributed */
    volunteerHours: number;
    /** Retention rate as percentage (0-100) */
    retentionRate: number;
    /** Total number of participants */
    participantsCount: number;
    /** Total number of sessions held */
    totalSessions: number;
    /** Average attendance rate as percentage (0-100) */
    avgAttendanceRate: number;
    /** Number of active cohorts */
    activeCohorts: number;
  };
  /** Breakdown by frequency pattern */
  frequencyBreakdown?: {
    /** Number of cohorts meeting 2x/week */
    twicePerWeek: number;
    /** Number of cohorts meeting 3x/week */
    thricePerWeek: number;
  };
  /** Breakdown by duration */
  durationBreakdown?: {
    /** Number of cohorts with 2-month duration */
    twoMonths: number;
    /** Number of cohorts with 3-month duration */
    threeMonths: number;
  };
}

/**
 * Mentorship Program Tile
 * Tracks bookings, attendance, no-show rate, and repeat mentoring
 */
export interface MentorshipTile extends BaseTile {
  type: 'mentorship';
  metrics: {
    /** Total bookings made */
    bookingsCount: number;
    /** Number of sessions attended */
    attendedCount: number;
    /** Attendance rate as percentage (0-100) */
    attendanceRate: number;
    /** No-show rate as percentage (0-100) */
    noShowRate: number;
    /** Number of repeat mentoring relationships */
    repeatMentoringCount: number;
    /** Average sessions per mentee */
    avgSessionsPerMentee: number;
    /** Total unique mentees */
    uniqueMentees: number;
    /** Total unique mentors */
    uniqueMentors: number;
    /** Average mentor rating (0-5) */
    avgMentorRating?: number;
  };
  /** Repeat mentoring breakdown */
  repeatMentoringBreakdown?: {
    /** Mentees with 2-3 sessions */
    moderate: number;
    /** Mentees with 4+ sessions */
    high: number;
  };
}

/**
 * Upskilling Program Tile
 * Tracks enrollment → completion → placement funnel with locale support
 */
export interface UpskillingTile extends BaseTile {
  type: 'upskilling';
  metrics: {
    /** Total enrollments */
    enrollmentsCount: number;
    /** Total completions */
    completionsCount: number;
    /** Total placements (job/internship) */
    placementsCount: number;
    /** Completion rate as percentage (0-100) */
    completionRate: number;
    /** Placement rate as percentage (0-100) */
    placementRate: number;
    /** Average course duration in weeks */
    avgCourseDurationWeeks: number;
    /** Total active courses */
    activeCoursesCount: number;
  };
  /** Breakdown by course locale */
  localeBreakdown: {
    /** Ukrainian locale courses */
    UA: number;
    /** English locale courses */
    EN: number;
    /** German locale courses */
    DE: number;
    /** Norwegian locale courses */
    NO: number;
  };
  /** Funnel conversion metrics */
  funnelMetrics: {
    /** Enrollment → Completion conversion % */
    enrollmentToCompletion: number;
    /** Completion → Placement conversion % */
    completionToPlacement: number;
    /** Overall Enrollment → Placement conversion % */
    enrollmentToPlacement: number;
  };
}

/**
 * WEEI Program Tile (Women's Economic Empowerment Initiative)
 * Tracks U:LEARN/U:START/U:GROW/U:LEAD throughput and demo-day count
 */
export interface WEEITile extends BaseTile {
  type: 'weei';
  metrics: {
    /** Total participants across all stages */
    totalParticipants: number;
    /** Total demo days held */
    demoDaysCount: number;
    /** Average participants per demo day */
    avgParticipantsPerDemoDay: number;
    /** Overall program completion rate % */
    overallCompletionRate: number;
  };
  /** Throughput by stage */
  stageMetrics: {
    /** U:LEARN stage - foundational learning */
    uLearn: {
      enrolled: number;
      active: number;
      completed: number;
      completionRate: number;
    };
    /** U:START stage - entrepreneurship basics */
    uStart: {
      enrolled: number;
      active: number;
      completed: number;
      completionRate: number;
    };
    /** U:GROW stage - business growth */
    uGrow: {
      enrolled: number;
      active: number;
      completed: number;
      completionRate: number;
    };
    /** U:LEAD stage - leadership development */
    uLead: {
      enrolled: number;
      active: number;
      completed: number;
      completionRate: number;
    };
  };
  /** Stage progression funnel */
  progressionMetrics: {
    /** LEARN → START progression rate % */
    learnToStart: number;
    /** START → GROW progression rate % */
    startToGrow: number;
    /** GROW → LEAD progression rate % */
    growToLead: number;
  };
}

/**
 * Union type for all tile types
 */
export type ImpactTile = LanguageTile | MentorshipTile | UpskillingTile | WEEITile;

/**
 * Tile query parameters
 */
export interface TileQueryParams {
  /** Company identifier */
  companyId: string;
  /** Tile type to query */
  tileType: 'language' | 'mentorship' | 'upskilling' | 'weei';
  /** Optional start date for custom period (ISO format) */
  startDate?: string;
  /** Optional end date for custom period (ISO format) */
  endDate?: string;
  /** Period preset (overrides startDate/endDate) */
  period?: 'week' | 'month' | 'quarter' | 'year';
}

/**
 * Tile API response wrapper
 */
export interface TileResponse<T extends ImpactTile = ImpactTile> {
  tile: T;
  metadata: {
    companyId: string;
    generatedAt: string;
    cacheHit: boolean;
    queryDurationMs: number;
  };
}

/**
 * Tile list response
 */
export interface TileListResponse {
  tiles: ImpactTile[];
  metadata: {
    companyId: string;
    count: number;
    generatedAt: string;
  };
}

/**
 * Feature flag check for tile entitlements
 */
export interface TileEntitlement {
  companyId: string;
  tileType: 'language' | 'mentorship' | 'upskilling' | 'weei';
  enabled: boolean;
  tier: 'basic' | 'premium' | 'enterprise';
}
