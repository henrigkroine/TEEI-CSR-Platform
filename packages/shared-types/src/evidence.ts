import { z } from 'zod';

/**
 * Q2Q Evidence Types
 * For Phase C Evidence Explorer and lineage traceability
 */

// Outcome dimensions from Q2Q AI
export const OutcomeDimensionSchema = z.enum([
  'confidence',
  'belonging',
  'lang_level_proxy',
  'job_readiness',
  'well_being',
]);

export type OutcomeDimension = z.infer<typeof OutcomeDimensionSchema>;

// Evidence snippet (anonymized)
export const EvidenceSnippetSchema = z.object({
  id: z.string().uuid(),
  snippetText: z.string(), // Anonymized, PII-redacted
  snippetHash: z.string(), // SHA-256 for deduplication
  source: z.string(), // e.g., "Buddy feedback, Q1 2024"
  sourceType: z.enum(['buddy_feedback', 'kintell_feedback', 'checkin', 'survey']),
  programType: z.enum(['buddy', 'language', 'mentorship', 'upskilling']),
  cohort: z.string().optional(), // e.g., "2024-Q1"
  submittedAt: z.string().datetime(), // ISO 8601
  participantId: z.string().uuid().optional(), // Internal ID only, no PII
  metadata: z.record(z.any()).optional(),
});

export type EvidenceSnippet = z.infer<typeof EvidenceSnippetSchema>;

// Outcome score (Q2Q AI output)
export const OutcomeScoreSchema = z.object({
  id: z.string().uuid(),
  evidenceSnippetId: z.string().uuid(),
  dimension: OutcomeDimensionSchema,
  score: z.number().min(0).max(1), // 0-1 normalized score
  confidence: z.number().min(0).max(1), // Model confidence
  modelVersion: z.string(), // e.g., "q2q-v2.1"
  createdAt: z.string().datetime(),
});

export type OutcomeScore = z.infer<typeof OutcomeScoreSchema>;

// Evidence lineage (traceability chain)
export const EvidenceLineageSchema = z.object({
  metricId: z.string(), // e.g., "sroi", "vis", "integration_score"
  metricName: z.string(),
  metricValue: z.number(),
  aggregationMethod: z.string(), // e.g., "weighted_average", "sum"
  evidenceChain: z.array(
    z.object({
      level: z.number(), // 1 = raw evidence, 2 = outcome score, 3 = aggregated metric
      type: z.string(), // "evidence_snippet", "outcome_score", "metric"
      id: z.string().uuid(),
      description: z.string(),
      contributionWeight: z.number().optional(), // How much this contributed to parent
    })
  ),
  totalEvidenceCount: z.number(),
  period: z.object({
    start: z.string().date(),
    end: z.string().date(),
  }),
});

export type EvidenceLineage = z.infer<typeof EvidenceLineageSchema>;

// Evidence filters (for GET /evidence)
export const EvidenceFiltersSchema = z.object({
  startDate: z.string().date().optional(),
  endDate: z.string().date().optional(),
  programType: z.enum(['buddy', 'language', 'mentorship', 'upskilling']).optional(),
  cohort: z.string().optional(),
  dimension: OutcomeDimensionSchema.optional(),
  search: z.string().optional(), // Full-text search in snippets
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

export type EvidenceFilters = z.infer<typeof EvidenceFiltersSchema>;

// Evidence response (paginated)
export const EvidenceResponseSchema = z.object({
  evidence: z.array(
    z.object({
      snippet: EvidenceSnippetSchema,
      outcomeScores: z.array(OutcomeScoreSchema),
    })
  ),
  pagination: z.object({
    total: z.number(),
    limit: z.number(),
    offset: z.number(),
    hasMore: z.boolean(),
  }),
  filters: EvidenceFiltersSchema,
});

export type EvidenceResponse = z.infer<typeof EvidenceResponseSchema>;

// CSRD export (redacted text for regulatory reporting)
export const CSRDExportSchema = z.object({
  companyId: z.string().uuid(),
  companyName: z.string(),
  period: z.object({
    start: z.string().date(),
    end: z.string().date(),
  }),
  evidenceCount: z.number(),
  snippets: z.array(
    z.object({
      id: z.string().uuid(),
      text: z.string(), // Redacted text
      source: z.string(),
      date: z.string().date(),
      program: z.string(),
    })
  ),
  generatedAt: z.string().datetime(),
  disclaimer: z.string(),
});

export type CSRDExport = z.infer<typeof CSRDExportSchema>;
