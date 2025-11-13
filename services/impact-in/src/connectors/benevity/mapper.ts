import { z } from 'zod';

// Input schema - TEEI metrics
export const TEEIMetricsSchema = z.object({
  companyId: z.string().uuid(),
  periodStart: z.string().datetime(),
  periodEnd: z.string().datetime(),
  participantsCount: z.number().int().min(0),
  volunteersCount: z.number().int().min(0),
  volunteerHours: z.number().min(0),
  sessionsCount: z.number().int().min(0),
  avgIntegrationScore: z.number().min(0).max(1).optional(),
  avgLanguageLevel: z.number().min(0).max(10).optional(),
  avgJobReadiness: z.number().min(0).max(1).optional(),
  outcomes: z.array(z.object({
    category: z.string(),
    score: z.number(),
    participantCount: z.number().int(),
  })).optional(),
});

export type TEEIMetrics = z.infer<typeof TEEIMetricsSchema>;

// Benevity Impact API schema
export const BenevityImpactPayloadSchema = z.object({
  organizationId: z.string(),
  programId: z.string(),
  reportingPeriod: z.object({
    startDate: z.string(), // ISO 8601 date
    endDate: z.string(),
  }),
  metrics: z.array(z.object({
    metricType: z.enum(['volunteer_hours', 'participant_count', 'program_participation', 'outcome_score']),
    metricValue: z.number(),
    metricUnit: z.string(),
    category: z.string().optional(),
    description: z.string().optional(),
  })),
  programName: z.string(),
  programDescription: z.string().optional(),
  timestamp: z.string().datetime(),
});

export type BenevityImpactPayload = z.infer<typeof BenevityImpactPayloadSchema>;

/**
 * Maps TEEI metrics to Benevity Impact API format
 */
export function mapToBenevity(
  metrics: TEEIMetrics,
  organizationId: string,
  programId: string = 'teei-integration',
  programName: string = 'TEEI Integration Program'
): BenevityImpactPayload {
  const payload: BenevityImpactPayload = {
    organizationId,
    programId,
    reportingPeriod: {
      startDate: metrics.periodStart.split('T')[0], // Extract date only
      endDate: metrics.periodEnd.split('T')[0],
    },
    metrics: [
      {
        metricType: 'volunteer_hours',
        metricValue: metrics.volunteerHours,
        metricUnit: 'hours',
        description: 'Total volunteer hours contributed',
      },
      {
        metricType: 'participant_count',
        metricValue: metrics.participantsCount,
        metricUnit: 'count',
        description: 'Number of program participants',
      },
      {
        metricType: 'program_participation',
        metricValue: metrics.volunteersCount,
        metricUnit: 'count',
        description: 'Number of volunteers engaged',
      },
    ],
    programName,
    programDescription: 'Technology-Enhanced Employment Integration Program',
    timestamp: new Date().toISOString(),
  };

  // Add outcome scores if available
  if (metrics.avgIntegrationScore !== undefined) {
    payload.metrics.push({
      metricType: 'outcome_score',
      metricValue: metrics.avgIntegrationScore,
      metricUnit: 'score',
      category: 'integration',
      description: 'Average integration score (0-1 scale)',
    });
  }

  if (metrics.avgLanguageLevel !== undefined) {
    payload.metrics.push({
      metricType: 'outcome_score',
      metricValue: metrics.avgLanguageLevel,
      metricUnit: 'level',
      category: 'language',
      description: 'Average language level (0-10 scale)',
    });
  }

  if (metrics.avgJobReadiness !== undefined) {
    payload.metrics.push({
      metricType: 'outcome_score',
      metricValue: metrics.avgJobReadiness,
      metricUnit: 'score',
      category: 'job_readiness',
      description: 'Average job readiness score (0-1 scale)',
    });
  }

  // Add custom outcome metrics
  if (metrics.outcomes) {
    metrics.outcomes.forEach((outcome) => {
      payload.metrics.push({
        metricType: 'outcome_score',
        metricValue: outcome.score,
        metricUnit: 'score',
        category: outcome.category,
        description: `Outcome score for ${outcome.category} (${outcome.participantCount} participants)`,
      });
    });
  }

  return payload;
}
