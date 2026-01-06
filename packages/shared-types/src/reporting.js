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
// Report section
export const ReportSectionSchema = z.object({
    title: z.string(),
    content: z.string(), // Narrative text with [citation:ID] markers
    order: z.number(),
});
// Citation
export const CitationSchema = z.object({
    id: z.string(), // Citation ID (e.g., "cite-001")
    evidenceId: z.string().uuid(), // Q2Q evidence snippet ID
    snippetText: z.string(), // Anonymized snippet (redacted)
    source: z.string(), // e.g., "Buddy feedback, 2024-Q1"
    confidence: z.number().min(0).max(1), // Model confidence
});
// API Citation (from backend responses)
export const APICitationSchema = z.object({
    id: z.string(), // Citation ID
    snippetId: z.string(), // For backward compatibility
    evidenceId: z.string(), // Q2Q evidence snippet ID
    text: z.string().optional(), // Snippet text (may be redacted)
    snippetText: z.string().optional(), // Alias for snippet text
    source: z.string().optional(),
    relevanceScore: z.number().min(0).max(1).optional(), // Alias for confidence
    confidence: z.number().min(0).max(1).optional(),
});
// Report metadata
export const ReportMetadataSchema = z.object({
    model: z.string(), // e.g., "gpt-4-turbo-2024-04-09"
    promptVersion: z.string(), // e.g., "v2.1"
    tokensUsed: z.number(),
    seed: z.number().optional(),
    generatedAt: z.string().datetime(),
});
// API Section with citations (different from ReportSection)
export const APISectionSchema = z.object({
    type: z.string(),
    content: z.string(),
    citations: z.array(APICitationSchema),
});
// Report generation response
export const GenerateReportResponseSchema = z.object({
    reportId: z.string().uuid(),
    generatedAt: z.string().datetime().optional(),
    sections: z.array(APISectionSchema),
    lineage: z.object({
        modelName: z.string(),
        promptVersion: z.string(),
        tokensUsed: z.number(),
        timestamp: z.string().datetime(),
    }),
});
// Prompt template version
export const PromptVersionSchema = z.object({
    version: z.string(), // e.g., "v2.1"
    createdAt: z.string().datetime(),
    changes: z.string(), // Changelog
    deprecated: z.boolean().default(false),
});
// Redaction result
export const RedactionResultSchema = z.object({
    original: z.string(),
    redacted: z.string(),
    redactionCount: z.number(),
    patterns: z.array(z.string()), // Patterns that matched (e.g., "email", "phone")
});
// Lineage metadata
export const LineageMetadataSchema = z.object({
    modelName: z.string(),
    promptVersion: z.string(),
    tokensUsed: z.number(),
    timestamp: z.string().datetime(),
});
// Cost summary response
export const ModelCostBreakdownSchema = z.object({
    modelName: z.string(),
    requestsCount: z.number(),
    totalCostUsd: z.string(),
    totalTokens: z.number(),
});
export const CostSummaryResponseSchema = z.object({
    totalCostUsd: z.string(),
    requestsCount: z.number(),
    totalTokens: z.number(),
    avgCostPerRequest: z.string(),
    byModel: z.array(ModelCostBreakdownSchema),
});
//# sourceMappingURL=reporting.js.map