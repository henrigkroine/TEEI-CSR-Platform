import { z } from 'zod';
import { ProgramTemplateConfigSchema } from './program-templates';

/**
 * Program Instances Types & Validation
 *
 * SWARM 6: Beneficiary Groups, Campaigns & Monetization
 * Runtime execution of campaigns with inherited configuration
 *
 * @see /packages/shared-schema/src/schema/program-instances.ts
 * @see /docs/INSTANCE_LIFECYCLE.md
 */

// ============================================================================
// ENUMS (matching database enums)
// ============================================================================

export const ProgramInstanceStatusEnum = z.enum([
  'planned',
  'active',
  'paused',
  'completed'
]);

export type ProgramInstanceStatus = z.infer<typeof ProgramInstanceStatusEnum>;

// ============================================================================
// COMPLEX TYPES (JSONB fields)
// ============================================================================

/**
 * Outcome scores by dimension
 */
export const OutcomeScoresSchema = z.record(z.string(), z.number().min(0).max(1));

export type OutcomeScores = z.infer<typeof OutcomeScoresSchema>;

// ============================================================================
// API SCHEMAS (for requests/responses)
// ============================================================================

/**
 * Create program instance request
 */
export const CreateProgramInstanceSchema = z.object({
  // Required fields
  name: z.string()
    .min(1, "Instance name is required")
    .max(255, "Instance name must be 255 characters or less"),

  campaignId: z.string().uuid("Invalid campaign ID"),

  // Denormalized relationships (can be auto-filled from campaign)
  programTemplateId: z.string().uuid("Invalid program template ID").optional(),
  companyId: z.string().uuid("Invalid company ID").optional(),
  beneficiaryGroupId: z.string().uuid("Invalid beneficiary group ID").optional(),

  startDate: z.string().date("Invalid start date (use YYYY-MM-DD)"),
  endDate: z.string().date("Invalid end date (use YYYY-MM-DD)"),

  // Configuration (merged from template + campaign overrides)
  config: ProgramTemplateConfigSchema.optional(),

  // Optional fields
  status: ProgramInstanceStatusEnum.optional(),

  enrolledVolunteers: z.number().int().min(0).default(0),
  enrolledBeneficiaries: z.number().int().min(0).default(0),

  activePairs: z.number().int().min(0).optional(),
  activeGroups: z.number().int().min(0).optional(),
}).refine(
  (data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start < end;
  },
  {
    message: "Start date must be before end date",
    path: ["endDate"],
  }
);

export type CreateProgramInstanceInput = z.infer<typeof CreateProgramInstanceSchema>;

/**
 * Update program instance request
 */
export const UpdateProgramInstanceSchema = z.object({
  name: z.string().min(1).max(255).optional(),

  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),

  status: ProgramInstanceStatusEnum.optional(),

  config: ProgramTemplateConfigSchema.optional(),

  enrolledVolunteers: z.number().int().min(0).optional(),
  enrolledBeneficiaries: z.number().int().min(0).optional(),

  activePairs: z.number().int().min(0).optional(),
  activeGroups: z.number().int().min(0).optional(),

  totalSessionsHeld: z.number().int().min(0).optional(),
  totalHoursLogged: z.number().min(0).optional(),

  sroiScore: z.number().optional(),
  averageVISScore: z.number().optional(),

  outcomeScores: OutcomeScoresSchema.optional(),

  volunteersConsumed: z.number().int().min(0).optional(),
  creditsConsumed: z.number().min(0).optional(),
  learnersServed: z.number().int().min(0).optional(),
}).refine(
  (data) => {
    if (data.startDate && data.endDate) {
      const start = new Date(data.startDate);
      const end = new Date(data.endDate);
      return start < end;
    }
    return true;
  },
  {
    message: "Start date must be before end date",
    path: ["endDate"],
  }
);

export type UpdateProgramInstanceInput = z.infer<typeof UpdateProgramInstanceSchema>;

/**
 * Filter/search program instances
 */
export const FilterProgramInstancesSchema = z.object({
  campaignId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  programTemplateId: z.string().uuid().optional(),
  beneficiaryGroupId: z.string().uuid().optional(),

  status: ProgramInstanceStatusEnum.optional(),
  statuses: z.array(ProgramInstanceStatusEnum).optional(),

  // Date filters
  startDateFrom: z.string().date().optional(),
  startDateTo: z.string().date().optional(),
  endDateFrom: z.string().date().optional(),
  endDateTo: z.string().date().optional(),

  // Activity filters
  hasActivity: z.boolean().optional(), // Has sessions or hours logged
  minSessions: z.number().int().min(0).optional(),
  minHours: z.number().min(0).optional(),

  // Impact filters
  minSROI: z.number().optional(),
  minVIS: z.number().optional(),

  // Search
  search: z.string().max(255).optional(),

  // Pagination
  limit: z.number().int().min(1).max(100).default(20),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['name', 'startDate', 'endDate', 'status', 'totalHoursLogged', 'sroiScore', 'createdAt']).optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type FilterProgramInstancesInput = z.infer<typeof FilterProgramInstancesSchema>;

/**
 * Program instance response (from database)
 */
export const ProgramInstanceSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),

  // Relationships
  campaignId: z.string().uuid(),
  programTemplateId: z.string().uuid(),
  companyId: z.string().uuid(),
  beneficiaryGroupId: z.string().uuid(),

  // Period
  startDate: z.string(),
  endDate: z.string(),

  // Status
  status: ProgramInstanceStatusEnum,

  // Configuration
  config: z.any(), // Typed as any, use type guards to narrow

  // Participant counts
  enrolledVolunteers: z.number().int(),
  enrolledBeneficiaries: z.number().int(),
  activePairs: z.number().int().nullable(),
  activeGroups: z.number().int().nullable(),

  // Activity tracking
  totalSessionsHeld: z.number().int(),
  totalHoursLogged: z.string(), // Decimal as string

  // Impact metrics
  sroiScore: z.string().nullable(), // Decimal as string
  averageVISScore: z.string().nullable(), // Decimal as string
  outcomeScores: OutcomeScoresSchema,

  // Capacity consumption
  volunteersConsumed: z.number().int(),
  creditsConsumed: z.string().nullable(), // Decimal as string
  learnersServed: z.number().int(),

  // Audit
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastActivityAt: z.string().datetime().nullable(),
});

export type ProgramInstance = z.infer<typeof ProgramInstanceSchema>;

/**
 * Paginated response
 */
export const ProgramInstancesResponseSchema = z.object({
  instances: z.array(ProgramInstanceSchema),
  pagination: z.object({
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
    hasMore: z.boolean(),
  }),
});

export type ProgramInstancesResponse = z.infer<typeof ProgramInstancesResponseSchema>;

/**
 * Activity log entry (for tracking sessions/events)
 */
export const InstanceActivityLogSchema = z.object({
  id: z.string().uuid(),
  programInstanceId: z.string().uuid(),
  activityType: z.enum(['session', 'check-in', 'milestone', 'completion', 'other']),
  activityDate: z.string().datetime(),
  duration: z.number().min(0).optional(), // minutes
  participantCount: z.number().int().min(0).optional(),
  description: z.string().max(500).optional(),
  metadata: z.record(z.string(), z.any()).optional(),
  createdAt: z.string().datetime(),
});

export type InstanceActivityLog = z.infer<typeof InstanceActivityLogSchema>;

/**
 * Metrics update request (for aggregation jobs)
 */
export const UpdateInstanceMetricsSchema = z.object({
  totalSessionsHeld: z.number().int().min(0),
  totalHoursLogged: z.number().min(0),
  sroiScore: z.number().optional(),
  averageVISScore: z.number().optional(),
  outcomeScores: OutcomeScoresSchema.optional(),
  volunteersConsumed: z.number().int().min(0),
  creditsConsumed: z.number().min(0).optional(),
  learnersServed: z.number().int().min(0),
  lastActivityAt: z.string().datetime().optional(),
});

export type UpdateInstanceMetrics = z.infer<typeof UpdateInstanceMetricsSchema>;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if instance is active
 */
export function isInstanceActive(instance: ProgramInstance): boolean {
  return instance.status === 'active';
}

/**
 * Check if instance is completed
 */
export function isInstanceCompleted(instance: ProgramInstance): boolean {
  return instance.status === 'completed';
}

/**
 * Check if instance can be started
 */
export function canStartInstance(instance: ProgramInstance): boolean {
  return instance.status === 'planned';
}

/**
 * Check if instance can be paused
 */
export function canPauseInstance(instance: ProgramInstance): boolean {
  return instance.status === 'active';
}

/**
 * Check if instance can be resumed
 */
export function canResumeInstance(instance: ProgramInstance): boolean {
  return instance.status === 'paused';
}

/**
 * Check if instance can be completed
 */
export function canCompleteInstance(instance: ProgramInstance): boolean {
  return instance.status === 'active' || instance.status === 'paused';
}

/**
 * Check if instance has activity
 */
export function hasActivity(instance: ProgramInstance): boolean {
  return instance.totalSessionsHeld > 0 || parseFloat(instance.totalHoursLogged) > 0;
}

/**
 * Check if instance has participants
 */
export function hasParticipants(instance: ProgramInstance): boolean {
  return instance.enrolledVolunteers > 0 || instance.enrolledBeneficiaries > 0;
}

/**
 * Check if instance has impact metrics
 */
export function hasImpactMetrics(instance: ProgramInstance): boolean {
  return instance.sroiScore !== null || instance.averageVISScore !== null;
}

/**
 * Check if instance is within date range
 */
export function isInstanceInDateRange(instance: ProgramInstance, date: Date = new Date()): boolean {
  const start = new Date(instance.startDate);
  const end = new Date(instance.endDate);
  return date >= start && date <= end;
}

/**
 * Check if instance is overdue
 */
export function isInstanceOverdue(instance: ProgramInstance): boolean {
  if (instance.status === 'completed') return false;
  const end = new Date(instance.endDate);
  return new Date() > end;
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Summary type for list views
 */
export type ProgramInstanceSummary = Pick<
  ProgramInstance,
  | 'id'
  | 'name'
  | 'status'
  | 'campaignId'
  | 'startDate'
  | 'endDate'
  | 'enrolledVolunteers'
  | 'enrolledBeneficiaries'
  | 'totalSessionsHeld'
  | 'totalHoursLogged'
>;

/**
 * Participant metrics
 */
export interface InstanceParticipantMetrics {
  volunteers: {
    enrolled: number;
    consumed: number;
    active: number;
  };
  beneficiaries: {
    enrolled: number;
    served: number;
    active: number;
  };
  pairs: number | null;
  groups: number | null;
}

/**
 * Activity metrics
 */
export interface InstanceActivityMetrics {
  sessions: {
    total: number;
    avgPerWeek: number;
    avgDuration: number;
  };
  hours: {
    total: number;
    avgPerVolunteer: number;
    avgPerBeneficiary: number;
  };
  lastActivity: string | null;
}

/**
 * Impact metrics
 */
export interface InstanceImpactMetrics {
  sroi: number | null;
  vis: number | null;
  outcomeScores: OutcomeScores;
  evidenceCount: number;
}

/**
 * Capacity consumption
 */
export interface InstanceCapacityConsumption {
  volunteers: number;
  credits: number | null;
  learners: number;
  percentage: number; // of campaign capacity
}

/**
 * State transition input
 */
export const InstanceStateTransitionSchema = z.object({
  targetStatus: ProgramInstanceStatusEnum,
  reason: z.string().max(500).optional(),
  effectiveDate: z.string().datetime().optional(),
});

export type InstanceStateTransition = z.infer<typeof InstanceStateTransitionSchema>;

/**
 * Aggregation result (for rolling up to campaign)
 */
export interface InstanceAggregation {
  totalInstances: number;
  activeInstances: number;
  completedInstances: number;
  totalVolunteers: number;
  totalBeneficiaries: number;
  totalSessions: number;
  totalHours: number;
  avgSROI: number | null;
  avgVIS: number | null;
  totalCreditsConsumed: number;
  totalLearnersServed: number;
}
