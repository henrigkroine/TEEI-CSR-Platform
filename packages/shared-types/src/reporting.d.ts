import { z } from 'zod';
/**
 * Generative Reporting Types
 * For Phase C AI-powered report generation with evidence citations
 */
export declare const GenerateReportRequestSchema: z.ZodObject<{
    companyId: z.ZodString;
    period: z.ZodObject<{
        start: z.ZodString;
        end: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        start: string;
        end: string;
    }, {
        start: string;
        end: string;
    }>;
    filters: z.ZodOptional<z.ZodObject<{
        programs: z.ZodOptional<z.ZodArray<z.ZodEnum<["buddy", "language", "mentorship", "upskilling"]>, "many">>;
        cohorts: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        metrics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        metrics?: string[] | undefined;
        programs?: ("language" | "mentorship" | "buddy" | "upskilling")[] | undefined;
        cohorts?: string[] | undefined;
    }, {
        metrics?: string[] | undefined;
        programs?: ("language" | "mentorship" | "buddy" | "upskilling")[] | undefined;
        cohorts?: string[] | undefined;
    }>>;
    options: z.ZodOptional<z.ZodObject<{
        seed: z.ZodOptional<z.ZodNumber>;
        maxTokens: z.ZodDefault<z.ZodNumber>;
        temperature: z.ZodDefault<z.ZodNumber>;
        language: z.ZodDefault<z.ZodEnum<["en", "no", "uk"]>>;
    }, "strip", z.ZodTypeAny, {
        language: "en" | "uk" | "no";
        maxTokens: number;
        temperature: number;
        seed?: number | undefined;
    }, {
        language?: "en" | "uk" | "no" | undefined;
        seed?: number | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    period: {
        start: string;
        end: string;
    };
    options?: {
        language: "en" | "uk" | "no";
        maxTokens: number;
        temperature: number;
        seed?: number | undefined;
    } | undefined;
    filters?: {
        metrics?: string[] | undefined;
        programs?: ("language" | "mentorship" | "buddy" | "upskilling")[] | undefined;
        cohorts?: string[] | undefined;
    } | undefined;
}, {
    companyId: string;
    period: {
        start: string;
        end: string;
    };
    options?: {
        language?: "en" | "uk" | "no" | undefined;
        seed?: number | undefined;
        maxTokens?: number | undefined;
        temperature?: number | undefined;
    } | undefined;
    filters?: {
        metrics?: string[] | undefined;
        programs?: ("language" | "mentorship" | "buddy" | "upskilling")[] | undefined;
        cohorts?: string[] | undefined;
    } | undefined;
}>;
export type GenerateReportRequest = z.infer<typeof GenerateReportRequestSchema>;
export declare const ReportSectionSchema: z.ZodObject<{
    title: z.ZodString;
    content: z.ZodString;
    order: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    title: string;
    content: string;
    order: number;
}, {
    title: string;
    content: string;
    order: number;
}>;
export type ReportSection = z.infer<typeof ReportSectionSchema>;
export declare const CitationSchema: z.ZodObject<{
    id: z.ZodString;
    evidenceId: z.ZodString;
    snippetText: z.ZodString;
    source: z.ZodString;
    confidence: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    id: string;
    evidenceId: string;
    source: string;
    confidence: number;
    snippetText: string;
}, {
    id: string;
    evidenceId: string;
    source: string;
    confidence: number;
    snippetText: string;
}>;
export type Citation = z.infer<typeof CitationSchema>;
export declare const APICitationSchema: z.ZodObject<{
    id: z.ZodString;
    snippetId: z.ZodString;
    evidenceId: z.ZodString;
    text: z.ZodOptional<z.ZodString>;
    snippetText: z.ZodOptional<z.ZodString>;
    source: z.ZodOptional<z.ZodString>;
    relevanceScore: z.ZodOptional<z.ZodNumber>;
    confidence: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    id: string;
    evidenceId: string;
    snippetId: string;
    text?: string | undefined;
    source?: string | undefined;
    relevanceScore?: number | undefined;
    confidence?: number | undefined;
    snippetText?: string | undefined;
}, {
    id: string;
    evidenceId: string;
    snippetId: string;
    text?: string | undefined;
    source?: string | undefined;
    relevanceScore?: number | undefined;
    confidence?: number | undefined;
    snippetText?: string | undefined;
}>;
export type APICitation = z.infer<typeof APICitationSchema>;
export declare const ReportMetadataSchema: z.ZodObject<{
    model: z.ZodString;
    promptVersion: z.ZodString;
    tokensUsed: z.ZodNumber;
    seed: z.ZodOptional<z.ZodNumber>;
    generatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    generatedAt: string;
    model: string;
    tokensUsed: number;
    promptVersion: string;
    seed?: number | undefined;
}, {
    generatedAt: string;
    model: string;
    tokensUsed: number;
    promptVersion: string;
    seed?: number | undefined;
}>;
export type ReportMetadata = z.infer<typeof ReportMetadataSchema>;
export declare const APISectionSchema: z.ZodObject<{
    type: z.ZodString;
    content: z.ZodString;
    citations: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        snippetId: z.ZodString;
        evidenceId: z.ZodString;
        text: z.ZodOptional<z.ZodString>;
        snippetText: z.ZodOptional<z.ZodString>;
        source: z.ZodOptional<z.ZodString>;
        relevanceScore: z.ZodOptional<z.ZodNumber>;
        confidence: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        evidenceId: string;
        snippetId: string;
        text?: string | undefined;
        source?: string | undefined;
        relevanceScore?: number | undefined;
        confidence?: number | undefined;
        snippetText?: string | undefined;
    }, {
        id: string;
        evidenceId: string;
        snippetId: string;
        text?: string | undefined;
        source?: string | undefined;
        relevanceScore?: number | undefined;
        confidence?: number | undefined;
        snippetText?: string | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    type: string;
    content: string;
    citations: {
        id: string;
        evidenceId: string;
        snippetId: string;
        text?: string | undefined;
        source?: string | undefined;
        relevanceScore?: number | undefined;
        confidence?: number | undefined;
        snippetText?: string | undefined;
    }[];
}, {
    type: string;
    content: string;
    citations: {
        id: string;
        evidenceId: string;
        snippetId: string;
        text?: string | undefined;
        source?: string | undefined;
        relevanceScore?: number | undefined;
        confidence?: number | undefined;
        snippetText?: string | undefined;
    }[];
}>;
export type APISection = z.infer<typeof APISectionSchema>;
export declare const GenerateReportResponseSchema: z.ZodObject<{
    reportId: z.ZodString;
    generatedAt: z.ZodOptional<z.ZodString>;
    sections: z.ZodArray<z.ZodObject<{
        type: z.ZodString;
        content: z.ZodString;
        citations: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            snippetId: z.ZodString;
            evidenceId: z.ZodString;
            text: z.ZodOptional<z.ZodString>;
            snippetText: z.ZodOptional<z.ZodString>;
            source: z.ZodOptional<z.ZodString>;
            relevanceScore: z.ZodOptional<z.ZodNumber>;
            confidence: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            evidenceId: string;
            snippetId: string;
            text?: string | undefined;
            source?: string | undefined;
            relevanceScore?: number | undefined;
            confidence?: number | undefined;
            snippetText?: string | undefined;
        }, {
            id: string;
            evidenceId: string;
            snippetId: string;
            text?: string | undefined;
            source?: string | undefined;
            relevanceScore?: number | undefined;
            confidence?: number | undefined;
            snippetText?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        type: string;
        content: string;
        citations: {
            id: string;
            evidenceId: string;
            snippetId: string;
            text?: string | undefined;
            source?: string | undefined;
            relevanceScore?: number | undefined;
            confidence?: number | undefined;
            snippetText?: string | undefined;
        }[];
    }, {
        type: string;
        content: string;
        citations: {
            id: string;
            evidenceId: string;
            snippetId: string;
            text?: string | undefined;
            source?: string | undefined;
            relevanceScore?: number | undefined;
            confidence?: number | undefined;
            snippetText?: string | undefined;
        }[];
    }>, "many">;
    lineage: z.ZodObject<{
        modelName: z.ZodString;
        promptVersion: z.ZodString;
        tokensUsed: z.ZodNumber;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        tokensUsed: number;
        modelName: string;
        promptVersion: string;
    }, {
        timestamp: string;
        tokensUsed: number;
        modelName: string;
        promptVersion: string;
    }>;
}, "strip", z.ZodTypeAny, {
    sections: {
        type: string;
        content: string;
        citations: {
            id: string;
            evidenceId: string;
            snippetId: string;
            text?: string | undefined;
            source?: string | undefined;
            relevanceScore?: number | undefined;
            confidence?: number | undefined;
            snippetText?: string | undefined;
        }[];
    }[];
    reportId: string;
    lineage: {
        timestamp: string;
        tokensUsed: number;
        modelName: string;
        promptVersion: string;
    };
    generatedAt?: string | undefined;
}, {
    sections: {
        type: string;
        content: string;
        citations: {
            id: string;
            evidenceId: string;
            snippetId: string;
            text?: string | undefined;
            source?: string | undefined;
            relevanceScore?: number | undefined;
            confidence?: number | undefined;
            snippetText?: string | undefined;
        }[];
    }[];
    reportId: string;
    lineage: {
        timestamp: string;
        tokensUsed: number;
        modelName: string;
        promptVersion: string;
    };
    generatedAt?: string | undefined;
}>;
export type GenerateReportResponse = z.infer<typeof GenerateReportResponseSchema>;
export declare const PromptVersionSchema: z.ZodObject<{
    version: z.ZodString;
    createdAt: z.ZodString;
    changes: z.ZodString;
    deprecated: z.ZodDefault<z.ZodBoolean>;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    version: string;
    changes: string;
    deprecated: boolean;
}, {
    createdAt: string;
    version: string;
    changes: string;
    deprecated?: boolean | undefined;
}>;
export type PromptVersion = z.infer<typeof PromptVersionSchema>;
export declare const RedactionResultSchema: z.ZodObject<{
    original: z.ZodString;
    redacted: z.ZodString;
    redactionCount: z.ZodNumber;
    patterns: z.ZodArray<z.ZodString, "many">;
}, "strip", z.ZodTypeAny, {
    original: string;
    redacted: string;
    redactionCount: number;
    patterns: string[];
}, {
    original: string;
    redacted: string;
    redactionCount: number;
    patterns: string[];
}>;
export type RedactionResult = z.infer<typeof RedactionResultSchema>;
export declare const LineageMetadataSchema: z.ZodObject<{
    modelName: z.ZodString;
    promptVersion: z.ZodString;
    tokensUsed: z.ZodNumber;
    timestamp: z.ZodString;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    tokensUsed: number;
    modelName: string;
    promptVersion: string;
}, {
    timestamp: string;
    tokensUsed: number;
    modelName: string;
    promptVersion: string;
}>;
export type LineageMetadata = z.infer<typeof LineageMetadataSchema>;
export declare const ModelCostBreakdownSchema: z.ZodObject<{
    modelName: z.ZodString;
    requestsCount: z.ZodNumber;
    totalCostUsd: z.ZodString;
    totalTokens: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    totalTokens: number;
    totalCostUsd: string;
    modelName: string;
    requestsCount: number;
}, {
    totalTokens: number;
    totalCostUsd: string;
    modelName: string;
    requestsCount: number;
}>;
export type ModelCostBreakdown = z.infer<typeof ModelCostBreakdownSchema>;
export declare const CostSummaryResponseSchema: z.ZodObject<{
    totalCostUsd: z.ZodString;
    requestsCount: z.ZodNumber;
    totalTokens: z.ZodNumber;
    avgCostPerRequest: z.ZodString;
    byModel: z.ZodArray<z.ZodObject<{
        modelName: z.ZodString;
        requestsCount: z.ZodNumber;
        totalCostUsd: z.ZodString;
        totalTokens: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        totalTokens: number;
        totalCostUsd: string;
        modelName: string;
        requestsCount: number;
    }, {
        totalTokens: number;
        totalCostUsd: string;
        modelName: string;
        requestsCount: number;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    totalTokens: number;
    totalCostUsd: string;
    avgCostPerRequest: string;
    requestsCount: number;
    byModel: {
        totalTokens: number;
        totalCostUsd: string;
        modelName: string;
        requestsCount: number;
    }[];
}, {
    totalTokens: number;
    totalCostUsd: string;
    avgCostPerRequest: string;
    requestsCount: number;
    byModel: {
        totalTokens: number;
        totalCostUsd: string;
        modelName: string;
        requestsCount: number;
    }[];
}>;
export type CostSummaryResponse = z.infer<typeof CostSummaryResponseSchema>;
//# sourceMappingURL=reporting.d.ts.map