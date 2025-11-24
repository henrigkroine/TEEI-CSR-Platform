import { z } from 'zod';
import { CampaignStatusEnum } from './campaigns';

/**
 * Campaign Metrics Types & Validation
 *
 * SWARM 6: Beneficiary Groups, Campaigns & Monetization
 * Time-series tracking for campaign performance over time
 *
 * @see /packages/shared-schema/src/schema/campaign-metrics-snapshots.ts
 * @see /docs/METRICS_RETENTION_POLICY.md
 */

// ============================================================================
// COMPLEX TYPES (JSONB fields)
// ============================================================================

/**
 * Alert triggered at snapshot time
 */
export const AlertSchema = z.object({
  type: z.enum(['capacity_warning', 'capacity_critical', 'budget_warning', 'performance_low']),
  threshold: z.number(),
  currentValue: z.number(),
  message: z.string(),
});

export type Alert = z.infer<typeof AlertSchema>;

/**
 * Program instances summary
 */
export const ProgramInstancesSummarySchema = z.object({
  activeCount: z.number().int().min(0),
  totalCount: z.number().int().min(0),
  avgOutcomeScores: z.record(z.string(), z.number()).optional(),
});

export type ProgramInstancesSummary = z.infer<typeof ProgramInstancesSummarySchema>;

/**
 * Engagement metrics
 */
export const EngagementMetricsSchema = z.object({
  volunteerRetentionRate: z.number().min(0).max(1).optional(),
  beneficiaryDropoutRate: z.number().min(0).max(1).optional(),
  avgSessionsPerVolunteer: z.number().min(0).optional(),
  avgSessionsPerBeneficiary: z.number().min(0).optional(),
});

export type EngagementMetrics = z.infer<typeof EngagementMetricsSchema>;

/**
 * Outcome scores by category
 */
export const OutcomeScoresSchema = z.object({
  integration: z.number().min(0).max(1).optional(),
  language: z.number().min(0).max(1).optional(),
  jobReadiness: z.number().min(0).max(1).optional(),
  wellbeing: z.number().min(0).max(1).optional(),
});

export type OutcomeScores = z.infer<typeof OutcomeScoresSchema>;

/**
 * Snapshot metadata
 */
export const SnapshotMetadataSchema = z.object({
  generatedBy: z.string(),
  dataSource: z.string(),
  calculationDurationMs: z.number().int().min(0).optional(),
});

export type SnapshotMetadata = z.infer<typeof SnapshotMetadataSchema>;

/**
 * Full snapshot JSONB structure
 */
export const FullSnapshotSchema = z.object({
  campaignName: z.string(),
  status: CampaignStatusEnum,
  programTemplateId: z.string().uuid(),
  beneficiaryGroupId: z.string().uuid(),
  companyId: z.string().uuid(),

  programInstances: ProgramInstancesSummarySchema.optional(),
  engagement: EngagementMetricsSchema.optional(),
  outcomeScores: OutcomeScoresSchema.optional(),

  topEvidenceIds: z.array(z.string().uuid()).optional(),
  alerts: z.array(AlertSchema).optional(),
  snapshotMetadata: SnapshotMetadataSchema.optional(),
});

export type FullSnapshot = z.infer<typeof FullSnapshotSchema>;

// ============================================================================
// API SCHEMAS (for requests/responses)
// ============================================================================

/**
 * Create snapshot request
 */
export const CreateCampaignMetricsSnapshotSchema = z.object({
  campaignId: z.string().uuid("Invalid campaign ID"),
  snapshotDate: z.string().datetime("Invalid snapshot date"),

  // Capacity metrics
  volunteersTarget: z.number().int().min(0),
  volunteersCurrent: z.number().int().min(0),
  volunteersUtilization: z.number().min(0),

  beneficiariesTarget: z.number().int().min(0),
  beneficiariesCurrent: z.number().int().min(0),
  beneficiariesUtilization: z.number().min(0),

  sessionsTarget: z.number().int().min(0).optional(),
  sessionsCurrent: z.number().int().min(0),
  sessionsUtilization: z.number().min(0).optional(),

  // Financial metrics
  budgetAllocated: z.number().min(0),
  budgetSpent: z.number().min(0),
  budgetRemaining: z.number(),
  budgetUtilization: z.number().min(0),

  // Impact metrics
  sroiScore: z.number().optional(),
  averageVISScore: z.number().optional(),
  totalHoursLogged: z.number().min(0).default(0),
  totalSessionsCompleted: z.number().int().min(0).default(0),

  // Monetization metrics (optional)
  seatsUsed: z.number().int().min(0).optional(),
  seatsCommitted: z.number().int().min(0).optional(),
  creditsConsumed: z.number().min(0).optional(),
  creditsAllocated: z.number().min(0).optional(),
  learnersServed: z.number().int().min(0).optional(),
  learnersCommitted: z.number().int().min(0).optional(),

  // Full snapshot
  fullSnapshot: FullSnapshotSchema,
}).refine(
  (data) => data.budgetSpent <= data.budgetAllocated,
  {
    message: "Budget spent cannot exceed budget allocated",
    path: ["budgetSpent"],
  }
).refine(
  (data) => data.volunteersCurrent <= data.volunteersTarget || data.volunteersTarget === 0,
  {
    message: "Current volunteers should not greatly exceed target (check data)",
    path: ["volunteersCurrent"],
  }
);

export type CreateCampaignMetricsSnapshotInput = z.infer<typeof CreateCampaignMetricsSnapshotSchema>;

/**
 * Filter/query snapshots
 */
export const FilterCampaignMetricsSnapshotsSchema = z.object({
  campaignId: z.string().uuid().optional(),
  campaignIds: z.array(z.string().uuid()).optional(),

  // Date range
  snapshotDateFrom: z.string().datetime().optional(),
  snapshotDateTo: z.string().datetime().optional(),

  // Capacity filters
  minVolunteersUtilization: z.number().min(0).max(1).optional(),
  maxVolunteersUtilization: z.number().min(0).max(2).optional(),
  minBudgetUtilization: z.number().min(0).max(1).optional(),

  // Impact filters
  minSROI: z.number().optional(),
  minVIS: z.number().optional(),

  // Pagination
  limit: z.number().int().min(1).max(1000).default(100),
  offset: z.number().int().min(0).default(0),
  sortBy: z.enum(['snapshotDate', 'volunteersUtilization', 'sroiScore', 'createdAt']).default('snapshotDate'),
  sortOrder: z.enum(['asc', 'desc']).default('asc'),
});

export type FilterCampaignMetricsSnapshotsInput = z.infer<typeof FilterCampaignMetricsSnapshotsSchema>;

/**
 * Campaign metrics snapshot response (from database)
 */
export const CampaignMetricsSnapshotSchema = z.object({
  id: z.string().uuid(),
  campaignId: z.string().uuid(),
  snapshotDate: z.string().datetime(),

  // Capacity metrics
  volunteersTarget: z.number().int(),
  volunteersCurrent: z.number().int(),
  volunteersUtilization: z.string(), // Decimal as string

  beneficiariesTarget: z.number().int(),
  beneficiariesCurrent: z.number().int(),
  beneficiariesUtilization: z.string(),

  sessionsTarget: z.number().int().nullable(),
  sessionsCurrent: z.number().int(),
  sessionsUtilization: z.string().nullable(),

  // Financial metrics
  budgetAllocated: z.string(), // Decimal as string
  budgetSpent: z.string(),
  budgetRemaining: z.string(),
  budgetUtilization: z.string(),

  // Impact metrics
  sroiScore: z.string().nullable(),
  averageVISScore: z.string().nullable(),
  totalHoursLogged: z.string(),
  totalSessionsCompleted: z.number().int(),

  // Monetization metrics
  seatsUsed: z.number().int().nullable(),
  seatsCommitted: z.number().int().nullable(),
  creditsConsumed: z.string().nullable(),
  creditsAllocated: z.string().nullable(),
  learnersServed: z.number().int().nullable(),
  learnersCommitted: z.number().int().nullable(),

  // Full snapshot
  fullSnapshot: FullSnapshotSchema,

  // Audit
  createdAt: z.string().datetime(),
});

export type CampaignMetricsSnapshot = z.infer<typeof CampaignMetricsSnapshotSchema>;

/**
 * Paginated response
 */
export const CampaignMetricsSnapshotsResponseSchema = z.object({
  snapshots: z.array(CampaignMetricsSnapshotSchema),
  pagination: z.object({
    total: z.number().int(),
    limit: z.number().int(),
    offset: z.number().int(),
    hasMore: z.boolean(),
  }),
});

export type CampaignMetricsSnapshotsResponse = z.infer<typeof CampaignMetricsSnapshotsResponseSchema>;

// ============================================================================
// TIME-SERIES TYPES
// ============================================================================

/**
 * Time-series data point
 */
export const TimeSeriesPointSchema = z.object({
  timestamp: z.string().datetime(),
  value: z.number(),
  metadata: z.record(z.string(), z.any()).optional(),
});

export type TimeSeriesPoint = z.infer<typeof TimeSeriesPointSchema>;

/**
 * Time-series dataset
 */
export const TimeSeriesDatasetSchema = z.object({
  metric: z.string(),
  unit: z.string().optional(),
  points: z.array(TimeSeriesPointSchema),
  aggregation: z.enum(['sum', 'avg', 'min', 'max', 'last']).optional(),
});

export type TimeSeriesDataset = z.infer<typeof TimeSeriesDatasetSchema>;

/**
 * Time-series query request
 */
export const TimeSeriesQuerySchema = z.object({
  campaignId: z.string().uuid(),
  metrics: z.array(z.enum([
    'volunteersUtilization',
    'beneficiariesUtilization',
    'budgetUtilization',
    'sroiScore',
    'averageVISScore',
    'totalHoursLogged',
    'totalSessionsCompleted',
    'creditsConsumed',
    'learnersServed',
  ])),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  interval: z.enum(['hour', 'day', 'week', 'month']).default('day'),
  aggregation: z.enum(['sum', 'avg', 'min', 'max', 'last']).optional(),
});

export type TimeSeriesQuery = z.infer<typeof TimeSeriesQuerySchema>;

/**
 * Time-series response
 */
export const TimeSeriesResponseSchema = z.object({
  campaignId: z.string().uuid(),
  period: z.object({
    start: z.string().datetime(),
    end: z.string().datetime(),
  }),
  interval: z.string(),
  datasets: z.array(TimeSeriesDatasetSchema),
});

export type TimeSeriesResponse = z.infer<typeof TimeSeriesResponseSchema>;

// ============================================================================
// AGGREGATION TYPES
// ============================================================================

/**
 * Capacity alert
 */
export const CapacityAlertSchema = z.object({
  campaignId: z.string().uuid(),
  campaignName: z.string(),
  snapshotDate: z.string().datetime(),
  volunteersUtilization: z.number(),
  beneficiariesUtilization: z.number(),
  budgetUtilization: z.number(),
  status: z.string(),
  alerts: z.array(AlertSchema),
});

export type CapacityAlert = z.infer<typeof CapacityAlertSchema>;

/**
 * Capacity alerts response
 */
export const CapacityAlertsResponseSchema = z.object({
  alerts: z.array(CapacityAlertSchema),
  criticalCount: z.number().int(),
  warningCount: z.number().int(),
  totalCount: z.number().int(),
});

export type CapacityAlertsResponse = z.infer<typeof CapacityAlertsResponseSchema>;

/**
 * Campaign comparison (for benchmarking)
 */
export const CampaignComparisonSchema = z.object({
  campaignId: z.string().uuid(),
  campaignName: z.string(),
  metrics: z.object({
    volunteersUtilization: z.number(),
    beneficiariesUtilization: z.number(),
    budgetUtilization: z.number(),
    sroiScore: z.number().nullable(),
    averageVISScore: z.number().nullable(),
    totalHoursLogged: z.number(),
    totalSessionsCompleted: z.number().int(),
  }),
  rank: z.number().int().optional(), // Rank among compared campaigns
  percentile: z.number().min(0).max(100).optional(),
});

export type CampaignComparison = z.infer<typeof CampaignComparisonSchema>;

/**
 * Benchmark response
 */
export const BenchmarkResponseSchema = z.object({
  targetCampaign: CampaignComparisonSchema,
  comparisons: z.array(CampaignComparisonSchema),
  averages: z.object({
    volunteersUtilization: z.number(),
    budgetUtilization: z.number(),
    sroiScore: z.number().nullable(),
    averageVISScore: z.number().nullable(),
  }),
  metadata: z.object({
    totalCampaigns: z.number().int(),
    period: z.object({
      start: z.string().datetime(),
      end: z.string().datetime(),
    }),
  }),
});

export type BenchmarkResponse = z.infer<typeof BenchmarkResponseSchema>;

// ============================================================================
// TYPE GUARDS
// ============================================================================

/**
 * Check if snapshot indicates near capacity
 */
export function isSnapshotNearCapacity(
  snapshot: CampaignMetricsSnapshot,
  threshold: number = 0.8
): boolean {
  const utilization = parseFloat(snapshot.volunteersUtilization);
  return utilization >= threshold && utilization < 1.0;
}

/**
 * Check if snapshot indicates over capacity
 */
export function isSnapshotOverCapacity(snapshot: CampaignMetricsSnapshot): boolean {
  const utilization = parseFloat(snapshot.volunteersUtilization);
  return utilization >= 1.0;
}

/**
 * Check if snapshot has budget warning
 */
export function hasSnapshotBudgetWarning(
  snapshot: CampaignMetricsSnapshot,
  threshold: number = 0.9
): boolean {
  const utilization = parseFloat(snapshot.budgetUtilization);
  return utilization >= threshold;
}

/**
 * Check if snapshot has impact metrics
 */
export function hasSnapshotImpactMetrics(snapshot: CampaignMetricsSnapshot): boolean {
  return snapshot.sroiScore !== null || snapshot.averageVISScore !== null;
}

/**
 * Check if snapshot has alerts
 */
export function hasSnapshotAlerts(snapshot: CampaignMetricsSnapshot): boolean {
  return snapshot.fullSnapshot.alerts !== undefined && snapshot.fullSnapshot.alerts.length > 0;
}

/**
 * Get critical alerts from snapshot
 */
export function getCriticalAlerts(snapshot: CampaignMetricsSnapshot): Alert[] {
  if (!snapshot.fullSnapshot.alerts) return [];
  return snapshot.fullSnapshot.alerts.filter(
    alert => alert.type === 'capacity_critical' || alert.type === 'performance_low'
  );
}

// ============================================================================
// HELPER TYPES
// ============================================================================

/**
 * Snapshot summary for dashboard cards
 */
export type SnapshotSummary = {
  campaignId: string;
  snapshotDate: string;
  capacityUtilization: {
    volunteers: number;
    beneficiaries: number;
    budget: number;
  };
  impact: {
    sroi: number | null;
    vis: number | null;
    hours: number;
    sessions: number;
  };
  hasAlerts: boolean;
  alertCount: number;
};

/**
 * Trend analysis result
 */
export interface TrendAnalysis {
  metric: string;
  direction: 'up' | 'down' | 'stable';
  change: number; // Absolute change
  changePercent: number; // Percentage change
  period: {
    start: string;
    end: string;
  };
  confidence: number; // 0-1
}

/**
 * Forecast data point
 */
export interface ForecastPoint {
  timestamp: string;
  predicted: number;
  lower: number; // Lower confidence bound
  upper: number; // Upper confidence bound
  confidence: number;
}
