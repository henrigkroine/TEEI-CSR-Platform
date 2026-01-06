import { z } from 'zod';
import type { TEEIMetrics } from '../benevity/mapper.js';

// Goodera Impact Dimension schema
export const GooderaImpactDimensionSchema = z.object({
  dimensionId: z.string(),
  dimensionName: z.string(),
  value: z.number(),
  unit: z.string(),
  beneficiaries: z.number().int().optional(),
});

export type GooderaImpactDimension = z.infer<typeof GooderaImpactDimensionSchema>;

// Goodera API payload schema (batch support)
export const GooderaPayloadSchema = z.object({
  projectId: z.string(),
  organizationId: z.string(),
  reportingPeriod: z.object({
    from: z.string(), // YYYY-MM-DD format
    to: z.string(),
  }),
  impactDimensions: z.array(GooderaImpactDimensionSchema),
  metadata: z.object({
    source: z.string(),
    timestamp: z.string().datetime(),
    version: z.string(),
  }),
});

export type GooderaPayload = z.infer<typeof GooderaPayloadSchema>;

// Batch payload (max 100 records per request)
export const GooderaBatchPayloadSchema = z.object({
  records: z.array(GooderaPayloadSchema).max(100),
});

export type GooderaBatchPayload = z.infer<typeof GooderaBatchPayloadSchema>;

/**
 * Maps TEEI metrics to Goodera API format
 */
export function mapToGoodera(
  metrics: TEEIMetrics,
  organizationId: string,
  projectId: string = 'teei-integration'
): GooderaPayload {
  const impactDimensions: GooderaImpactDimension[] = [
    {
      dimensionId: 'volunteer_engagement',
      dimensionName: 'Volunteer Engagement',
      value: metrics.volunteersCount,
      unit: 'volunteers',
      beneficiaries: metrics.participantsCount,
    },
    {
      dimensionId: 'volunteer_hours',
      dimensionName: 'Volunteer Hours',
      value: metrics.volunteerHours,
      unit: 'hours',
    },
    {
      dimensionId: 'program_reach',
      dimensionName: 'Program Reach',
      value: metrics.participantsCount,
      unit: 'participants',
    },
    {
      dimensionId: 'session_count',
      dimensionName: 'Session Count',
      value: metrics.sessionsCount,
      unit: 'sessions',
    },
  ];

  // Map TEEI outcome scores to Goodera impact dimensions
  if (metrics.avgIntegrationScore !== undefined) {
    impactDimensions.push({
      dimensionId: 'integration_outcome',
      dimensionName: 'Integration Outcome',
      value: metrics.avgIntegrationScore * 100, // Convert to percentage
      unit: 'percentage',
      beneficiaries: metrics.participantsCount,
    });
  }

  if (metrics.avgLanguageLevel !== undefined) {
    impactDimensions.push({
      dimensionId: 'language_proficiency',
      dimensionName: 'Language Proficiency',
      value: metrics.avgLanguageLevel,
      unit: 'level_0_10',
      beneficiaries: metrics.participantsCount,
    });
  }

  if (metrics.avgJobReadiness !== undefined) {
    impactDimensions.push({
      dimensionId: 'employability',
      dimensionName: 'Employability Readiness',
      value: metrics.avgJobReadiness * 100, // Convert to percentage
      unit: 'percentage',
      beneficiaries: metrics.participantsCount,
    });
  }

  // Add custom outcome dimensions
  if (metrics.outcomes) {
    metrics.outcomes.forEach((outcome) => {
      impactDimensions.push({
        dimensionId: outcome.category.toLowerCase().replace(/\s+/g, '_'),
        dimensionName: outcome.category,
        value: outcome.score,
        unit: 'score',
        beneficiaries: outcome.participantCount,
      });
    });
  }

  return {
    projectId,
    organizationId,
    reportingPeriod: {
      from: metrics.periodStart.split('T')[0],
      to: metrics.periodEnd.split('T')[0],
    },
    impactDimensions,
    metadata: {
      source: 'TEEI Platform',
      timestamp: new Date().toISOString(),
      version: '1.0',
    },
  };
}

/**
 * Create a batch payload from multiple metric records
 */
export function createBatchPayload(payloads: GooderaPayload[]): GooderaBatchPayload {
  // Limit to 100 records per batch
  const records = payloads.slice(0, 100);
  return { records };
}

/**
 * Split metrics into batches of max 100 records
 */
export function splitIntoBatches(payloads: GooderaPayload[]): GooderaBatchPayload[] {
  const batches: GooderaBatchPayload[] = [];
  for (let i = 0; i < payloads.length; i += 100) {
    const batch = payloads.slice(i, i + 100);
    batches.push({ records: batch });
  }
  return batches;
}
