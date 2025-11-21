import { z } from 'zod';

/**
 * Scenario Planner Types
 * For "what-if" modeling of VIS/SROI/SDG metrics with parameter adjustments
 */

// Program type enum
export const ProgramTypeSchema = z.enum(['buddy', 'language', 'mentorship', 'upskilling']);
export type ProgramType = z.infer<typeof ProgramTypeSchema>;

// SDG target
export const SDGTargetSchema = z.object({
  goal: z.number().min(1).max(17), // SDG 1-17
  target: z.string(), // e.g., "4.4", "8.5"
  description: z.string(),
});
export type SDGTarget = z.infer<typeof SDGTargetSchema>;

// Scenario parameter adjustments
export const ScenarioParametersSchema = z.object({
  // Volunteer engagement parameters
  volunteerHours: z
    .object({
      adjustment: z.number(), // Multiplier (1.0 = baseline, 1.2 = +20%, 0.8 = -20%)
      absoluteValue: z.number().optional(), // Override with absolute hours
    })
    .optional(),

  // Grant funding parameters
  grantAmount: z
    .object({
      adjustment: z.number(), // Multiplier for grant amounts
      currency: z.string().default('EUR'),
      absoluteValue: z.number().optional(),
    })
    .optional(),

  // Cohort parameters
  cohortSize: z
    .object({
      adjustment: z.number(), // Multiplier for participant counts
      absoluteValue: z.number().int().optional(),
    })
    .optional(),

  cohortDuration: z
    .object({
      weeks: z.number().int().positive(),
    })
    .optional(),

  // Program mix adjustments (must sum to 1.0)
  programMix: z
    .object({
      buddy: z.number().min(0).max(1),
      language: z.number().min(0).max(1),
      mentorship: z.number().min(0).max(1),
      upskilling: z.number().min(0).max(1),
    })
    .refine((mix) => Math.abs(mix.buddy + mix.language + mix.mentorship + mix.upskilling - 1.0) < 0.01, {
      message: 'Program mix must sum to 1.0',
    })
    .optional(),

  // VIS calculation parameters
  visDecayLambda: z.number().min(0).max(1).optional(), // Exponential decay rate
  visEnableDecay: z.boolean().optional(),

  // SROI calculation parameters
  sroiDiscountRate: z.number().min(0).max(1).optional(), // Discount rate for NPV
  sroiTimeHorizon: z.number().int().positive().optional(), // Years to project impact
});

export type ScenarioParameters = z.infer<typeof ScenarioParametersSchema>;

// Metric delta (baseline vs scenario)
export const MetricDeltaSchema = z.object({
  metric: z.string(), // e.g., "vis", "sroi", "sdg_coverage"
  baseline: z.number(),
  scenario: z.number(),
  delta: z.number(), // scenario - baseline
  deltaPercent: z.number(), // (delta / baseline) * 100
  unit: z.string().optional(), // e.g., "points", "ratio", "percent"
});

export type MetricDelta = z.infer<typeof MetricDeltaSchema>;

// Scenario execution result
export const ScenarioResultSchema = z.object({
  scenarioId: z.string().uuid(),
  executedAt: z.string().datetime(),
  parameters: ScenarioParametersSchema,

  // Metric impacts
  metrics: z.object({
    vis: MetricDeltaSchema.optional(),
    sroi: MetricDeltaSchema.optional(),
    totalVolunteerHours: MetricDeltaSchema.optional(),
    totalParticipants: MetricDeltaSchema.optional(),
    totalGrantAmount: MetricDeltaSchema.optional(),
  }),

  // SDG coverage impact
  sdgCoverage: z
    .object({
      baseline: z.array(SDGTargetSchema),
      scenario: z.array(SDGTargetSchema),
      newTargets: z.array(SDGTargetSchema), // Targets covered in scenario but not baseline
      lostTargets: z.array(SDGTargetSchema), // Targets lost in scenario
    })
    .optional(),

  // Calculation metadata
  metadata: z.object({
    calculationDurationMs: z.number(),
    dataPointsAnalyzed: z.number(),
    warnings: z.array(z.string()).optional(),
  }),
});

export type ScenarioResult = z.infer<typeof ScenarioResultSchema>;

// Scenario (persisted)
export const ScenarioSchema = z.object({
  id: z.string().uuid(),
  companyId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  parameters: ScenarioParametersSchema,
  createdBy: z.string().uuid(), // User ID
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastExecutedAt: z.string().datetime().optional(),
  result: ScenarioResultSchema.optional(), // Cached last execution result
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().default(false),
});

export type Scenario = z.infer<typeof ScenarioSchema>;

// Create scenario request
export const CreateScenarioRequestSchema = z.object({
  companyId: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().optional(),
  parameters: ScenarioParametersSchema,
  tags: z.array(z.string()).optional(),
  executeImmediately: z.boolean().default(false), // Run scenario on creation
});

export type CreateScenarioRequest = z.infer<typeof CreateScenarioRequestSchema>;

// Update scenario request
export const UpdateScenarioRequestSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  parameters: ScenarioParametersSchema.optional(),
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
});

export type UpdateScenarioRequest = z.infer<typeof UpdateScenarioRequestSchema>;

// Execute scenario request
export const ExecuteScenarioRequestSchema = z.object({
  scenarioId: z.string().uuid(),
  companyId: z.string().uuid(),
  period: z
    .object({
      start: z.string().date(), // ISO date
      end: z.string().date(),
    })
    .optional(), // If omitted, uses latest available data
});

export type ExecuteScenarioRequest = z.infer<typeof ExecuteScenarioRequestSchema>;

// Execute scenario response
export const ExecuteScenarioResponseSchema = z.object({
  scenarioId: z.string().uuid(),
  result: ScenarioResultSchema,
});

export type ExecuteScenarioResponse = z.infer<typeof ExecuteScenarioResponseSchema>;

// List scenarios request
export const ListScenariosRequestSchema = z.object({
  companyId: z.string().uuid(),
  includeArchived: z.boolean().default(false),
  tags: z.array(z.string()).optional(),
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type ListScenariosRequest = z.infer<typeof ListScenariosRequestSchema>;

// List scenarios response
export const ListScenariosResponseSchema = z.object({
  scenarios: z.array(ScenarioSchema),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
});

export type ListScenariosResponse = z.infer<typeof ListScenariosResponseSchema>;

// Deck export payload
export const DeckExportPayloadSchema = z.object({
  scenarioId: z.string().uuid(),
  scenarioName: z.string(),
  companyId: z.string().uuid(),
  companyName: z.string(),
  executedAt: z.string().datetime(),

  // Slide data
  slides: z.array(
    z.object({
      type: z.enum(['summary', 'metrics', 'sdg', 'parameters']),
      title: z.string(),
      data: z.record(z.any()),
    })
  ),

  // Chart data (for PPTX export)
  charts: z
    .array(
      z.object({
        type: z.enum(['bar', 'line', 'pie', 'waterfall']),
        title: z.string(),
        series: z.array(
          z.object({
            name: z.string(),
            data: z.array(z.number()),
          })
        ),
        categories: z.array(z.string()).optional(),
      })
    )
    .optional(),

  // Metadata
  metadata: z.object({
    generatedAt: z.string().datetime(),
    generatedBy: z.string().uuid(),
    format: z.enum(['json', 'pptx', 'pdf']),
  }),
});

export type DeckExportPayload = z.infer<typeof DeckExportPayloadSchema>;
