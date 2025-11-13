import { z } from 'zod';

/**
 * Generative Reporting Types
 * For Phase C AI-powered report generation with evidence citations
 */

// Report generation request
export const GenerateReportRequestSchema = z.object({
  companyId: z.string().uuid(),
  period: z.object({
    start: z.string().date(), // ISO 8601 date (YYYY-MM-DD)
    end: z.string().date(),
  }),
  filters: z
    .object({
      programs: z.array(z.enum(['buddy', 'language', 'mentorship', 'upskilling'])).optional(),
      cohorts: z.array(z.string()).optional(),
      metrics: z.array(z.string()).optional(), // e.g., ['sroi', 'vis', 'integration_score']
    })
    .optional(),
  options: z
    .object({
      seed: z.number().optional(), // Deterministic seed for reproducibility
      maxTokens: z.number().min(100).max(8000).default(4000), // Token budget
      temperature: z.number().min(0).max(1).default(0.3), // Model creativity (lower = more deterministic)
      language: z.enum(['en', 'no', 'uk']).default('en'), // Report language
    })
    .optional(),
});

export type GenerateReportRequest = z.infer<typeof GenerateReportRequestSchema>;

// Report section
export const ReportSectionSchema = z.object({
  title: z.string(),
  content: z.string(), // Narrative text with [citation:ID] markers
  order: z.number(),
});

export type ReportSection = z.infer<typeof ReportSectionSchema>;

// Citation
export const CitationSchema = z.object({
  id: z.string(), // Citation ID (e.g., "cite-001")
  evidenceId: z.string().uuid(), // Q2Q evidence snippet ID
  snippetText: z.string(), // Anonymized snippet (redacted)
  source: z.string(), // e.g., "Buddy feedback, 2024-Q1"
  confidence: z.number().min(0).max(1), // Model confidence
});

export type Citation = z.infer<typeof CitationSchema>;

// Report metadata
export const ReportMetadataSchema = z.object({
  model: z.string(), // e.g., "gpt-4-turbo-2024-04-09"
  promptVersion: z.string(), // e.g., "v2.1"
  tokensUsed: z.number(),
  seed: z.number().optional(),
  generatedAt: z.string().datetime(),
});

export type ReportMetadata = z.infer<typeof ReportMetadataSchema>;

// Report generation response
export const GenerateReportResponseSchema = z.object({
  reportId: z.string().uuid(),
  generatedAt: z.string().datetime(),
  narrative: z.object({
    sections: z.array(ReportSectionSchema),
    citations: z.array(CitationSchema),
  }),
  metadata: ReportMetadataSchema,
});

export type GenerateReportResponse = z.infer<typeof GenerateReportResponseSchema>;

// Prompt template version
export const PromptVersionSchema = z.object({
  version: z.string(), // e.g., "v2.1"
  createdAt: z.string().datetime(),
  changes: z.string(), // Changelog
  deprecated: z.boolean().default(false),
});

export type PromptVersion = z.infer<typeof PromptVersionSchema>;

// Redaction result
export const RedactionResultSchema = z.object({
  original: z.string(),
  redacted: z.string(),
  redactionCount: z.number(),
  patterns: z.array(z.string()), // Patterns that matched (e.g., "email", "phone")
});

export type RedactionResult = z.infer<typeof RedactionResultSchema>;
