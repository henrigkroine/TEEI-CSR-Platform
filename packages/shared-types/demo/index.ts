/**
 * Demo Factory Types
 * Contracts for demo tenant creation, seeding, and lifecycle management
 */

import { z } from 'zod';

/**
 * Demo tenant size presets
 */
export const DemoSizeSchema = z.enum(['small', 'medium', 'large']);
export type DemoSize = z.infer<typeof DemoSizeSchema>;

/**
 * Supported regions for demo data
 */
export const DemoRegionSchema = z.enum([
  'US',
  'UK',
  'EU',
  'APAC',
  'LATAM',
  'MULTI',
]);
export type DemoRegion = z.infer<typeof DemoRegionSchema>;

/**
 * Industry vertical hints for realistic data
 */
export const IndustryVerticalSchema = z.enum([
  'technology',
  'finance',
  'healthcare',
  'retail',
  'manufacturing',
  'nonprofit',
  'education',
  'consulting',
]);
export type IndustryVertical = z.infer<typeof IndustryVerticalSchema>;

/**
 * Demo tenant creation request
 */
export const CreateDemoTenantRequestSchema = z.object({
  /**
   * Desired tenant name (will be prefixed with 'demo-')
   */
  tenantName: z
    .string()
    .min(3)
    .max(50)
    .regex(/^[a-z0-9-]+$/),

  /**
   * Data volume size
   */
  size: DemoSizeSchema,

  /**
   * Primary regions for data distribution
   */
  regions: z.array(DemoRegionSchema).min(1).max(3),

  /**
   * Industry vertical for contextual data
   */
  vertical: IndustryVerticalSchema.optional(),

  /**
   * Time range for historical data (months)
   * @default 12
   */
  timeRangeMonths: z.number().int().min(1).max(36).default(12),

  /**
   * Whether to include seasonality patterns
   * @default true
   */
  includeSeasonality: z.boolean().default(true),

  /**
   * Locale for generated data
   * @default 'en'
   */
  locale: z.enum(['en', 'es', 'fr', 'uk', 'no']).default('en'),

  /**
   * Admin user email for access
   */
  adminEmail: z.string().email(),

  /**
   * Optional metadata
   */
  metadata: z.record(z.string()).optional(),
});

export type CreateDemoTenantRequest = z.infer<
  typeof CreateDemoTenantRequestSchema
>;

/**
 * Size-based data volume configurations
 */
export interface SizeConfig {
  /**
   * Number of users to generate
   */
  users: number;

  /**
   * Number of volunteer events
   */
  volunteerEvents: number;

  /**
   * Number of donation events
   */
  donationEvents: number;

  /**
   * Number of learning sessions (Kintell)
   */
  learningSessions: number;

  /**
   * Number of program enrollments
   */
  programEnrollments: number;

  /**
   * Number of buddy matches
   */
  buddyMatches: number;

  /**
   * Expected seed time (minutes)
   */
  estimatedSeedTimeMinutes: number;
}

/**
 * Default size configurations
 */
export const SIZE_CONFIGS: Record<DemoSize, SizeConfig> = {
  small: {
    users: 50,
    volunteerEvents: 500,
    donationEvents: 200,
    learningSessions: 300,
    programEnrollments: 100,
    buddyMatches: 25,
    estimatedSeedTimeMinutes: 1,
  },
  medium: {
    users: 500,
    volunteerEvents: 10000,
    donationEvents: 5000,
    learningSessions: 8000,
    programEnrollments: 2000,
    buddyMatches: 250,
    estimatedSeedTimeMinutes: 4,
  },
  large: {
    users: 2000,
    volunteerEvents: 50000,
    donationEvents: 25000,
    learningSessions: 40000,
    programEnrollments: 10000,
    buddyMatches: 1000,
    estimatedSeedTimeMinutes: 15,
  },
};

/**
 * Demo tenant status
 */
export const DemoTenantStatusSchema = z.enum([
  'creating',
  'seeding',
  'warming',
  'ready',
  'error',
  'deleting',
  'deleted',
]);

export type DemoTenantStatus = z.infer<typeof DemoTenantStatusSchema>;

/**
 * Demo tenant metadata
 */
export const DemoTenantSchema = z.object({
  /**
   * Tenant ID (with demo- prefix)
   */
  tenantId: z.string(),

  /**
   * Display name
   */
  name: z.string(),

  /**
   * Current status
   */
  status: DemoTenantStatusSchema,

  /**
   * Size configuration
   */
  size: DemoSizeSchema,

  /**
   * Regions
   */
  regions: z.array(DemoRegionSchema),

  /**
   * Industry vertical
   */
  vertical: IndustryVerticalSchema.optional(),

  /**
   * Created timestamp
   */
  createdAt: z.string().datetime(),

  /**
   * Last refreshed timestamp
   */
  lastRefreshedAt: z.string().datetime().optional(),

  /**
   * TTL expiration timestamp
   */
  expiresAt: z.string().datetime(),

  /**
   * Seed progress (0-100)
   */
  seedProgress: z.number().int().min(0).max(100),

  /**
   * Seed statistics
   */
  seedStats: z
    .object({
      usersCreated: z.number().int(),
      eventsCreated: z.number().int(),
      tilesWarmed: z.number().int(),
      reportsGenerated: z.number().int(),
    })
    .optional(),

  /**
   * Error message if status is 'error'
   */
  errorMessage: z.string().optional(),

  /**
   * Admin user email
   */
  adminEmail: z.string().email(),

  /**
   * Custom metadata
   */
  metadata: z.record(z.string()).optional(),
});

export type DemoTenant = z.infer<typeof DemoTenantSchema>;

/**
 * Demo tenant refresh request
 */
export const RefreshDemoTenantRequestSchema = z.object({
  /**
   * Whether to regenerate all data
   * @default false
   */
  fullRefresh: z.boolean().default(false),

  /**
   * Whether to warm analytics tiles
   * @default true
   */
  warmTiles: z.boolean().default(true),
});

export type RefreshDemoTenantRequest = z.infer<
  typeof RefreshDemoTenantRequestSchema
>;

/**
 * Demo tenant export format
 */
export const ExportFormatSchema = z.enum(['json', 'jsonl', 'sql']);
export type ExportFormat = z.infer<typeof ExportFormatSchema>;

/**
 * Demo tenant export request
 */
export const ExportDemoTenantRequestSchema = z.object({
  /**
   * Export format
   */
  format: ExportFormatSchema,

  /**
   * Whether to include raw events
   * @default false
   */
  includeEvents: z.boolean().default(false),

  /**
   * Whether to include aggregated tiles
   * @default true
   */
  includeTiles: z.boolean().default(true),

  /**
   * Whether to include sample reports
   * @default true
   */
  includeReports: z.boolean().default(true),
});

export type ExportDemoTenantRequest = z.infer<
  typeof ExportDemoTenantRequestSchema
>;

/**
 * Seed event result
 */
export const SeedEventResultSchema = z.object({
  /**
   * Event type that was seeded
   */
  eventType: z.string(),

  /**
   * Number of events created
   */
  count: z.number().int(),

  /**
   * Unique subjects (users, companies, etc.)
   */
  uniqueSubjects: z.number().int(),

  /**
   * Date range of seeded events
   */
  dateRange: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),

  /**
   * Duration to seed (milliseconds)
   */
  durationMs: z.number().int(),
});

export type SeedEventResult = z.infer<typeof SeedEventResultSchema>;

/**
 * Complete seed result
 */
export const SeedResultSchema = z.object({
  /**
   * Tenant ID
   */
  tenantId: z.string(),

  /**
   * Overall status
   */
  status: z.enum(['success', 'partial', 'failed']),

  /**
   * Results by event type
   */
  results: z.array(SeedEventResultSchema),

  /**
   * Total events created
   */
  totalEvents: z.number().int(),

  /**
   * Total duration (milliseconds)
   */
  totalDurationMs: z.number().int(),

  /**
   * Warnings encountered
   */
  warnings: z.array(z.string()).optional(),

  /**
   * Errors encountered
   */
  errors: z.array(z.string()).optional(),
});

export type SeedResult = z.infer<typeof SeedResultSchema>;

/**
 * Warm tiles request
 */
export const WarmTilesRequestSchema = z.object({
  /**
   * Tenant ID to warm
   */
  tenantId: z.string(),

  /**
   * Specific tile types to warm (optional, defaults to all)
   */
  tileTypes: z.array(z.string()).optional(),

  /**
   * Force re-computation even if cached
   * @default false
   */
  force: z.boolean().default(false),
});

export type WarmTilesRequest = z.infer<typeof WarmTilesRequestSchema>;

/**
 * Warm tiles result
 */
export const WarmTilesResultSchema = z.object({
  /**
   * Tenant ID
   */
  tenantId: z.string(),

  /**
   * Tiles warmed successfully
   */
  tilesWarmed: z.array(z.string()),

  /**
   * Tiles failed to warm
   */
  tilesFailed: z.array(z.string()).optional(),

  /**
   * Duration (milliseconds)
   */
  durationMs: z.number().int(),
});

export type WarmTilesResult = z.infer<typeof WarmTilesResultSchema>;

/**
 * Demo tenant deletion result
 */
export const DeleteDemoTenantResultSchema = z.object({
  /**
   * Tenant ID that was deleted
   */
  tenantId: z.string(),

  /**
   * Whether deletion was successful
   */
  success: z.boolean(),

  /**
   * Resources deleted
   */
  resourcesDeleted: z.object({
    users: z.number().int(),
    events: z.number().int(),
    tiles: z.number().int(),
    reports: z.number().int(),
    other: z.number().int(),
  }),

  /**
   * Duration (milliseconds)
   */
  durationMs: z.number().int(),

  /**
   * Error message if failed
   */
  errorMessage: z.string().optional(),
});

export type DeleteDemoTenantResult = z.infer<
  typeof DeleteDemoTenantResultSchema
>;
