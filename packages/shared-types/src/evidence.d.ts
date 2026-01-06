import { z } from 'zod';
/**
 * Q2Q Evidence Types
 * For Phase C Evidence Explorer and lineage traceability
 */
export declare const OutcomeDimensionSchema: z.ZodEnum<["confidence", "belonging", "lang_level_proxy", "job_readiness", "well_being"]>;
export type OutcomeDimension = z.infer<typeof OutcomeDimensionSchema>;
export declare const EvidenceSnippetSchema: z.ZodObject<{
    id: z.ZodString;
    snippetText: z.ZodString;
    snippetHash: z.ZodString;
    source: z.ZodString;
    sourceType: z.ZodEnum<["buddy_feedback", "kintell_feedback", "checkin", "survey"]>;
    programType: z.ZodEnum<["buddy", "language", "mentorship", "upskilling"]>;
    cohort: z.ZodOptional<z.ZodString>;
    submittedAt: z.ZodString;
    participantId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    programType: "language" | "mentorship" | "buddy" | "upskilling";
    source: string;
    snippetText: string;
    snippetHash: string;
    sourceType: "survey" | "buddy_feedback" | "kintell_feedback" | "checkin";
    submittedAt: string;
    metadata?: Record<string, any> | undefined;
    cohort?: string | undefined;
    participantId?: string | undefined;
}, {
    id: string;
    programType: "language" | "mentorship" | "buddy" | "upskilling";
    source: string;
    snippetText: string;
    snippetHash: string;
    sourceType: "survey" | "buddy_feedback" | "kintell_feedback" | "checkin";
    submittedAt: string;
    metadata?: Record<string, any> | undefined;
    cohort?: string | undefined;
    participantId?: string | undefined;
}>;
export type EvidenceSnippet = z.infer<typeof EvidenceSnippetSchema>;
export declare const OutcomeScoreSchema: z.ZodObject<{
    id: z.ZodString;
    evidenceSnippetId: z.ZodString;
    dimension: z.ZodEnum<["confidence", "belonging", "lang_level_proxy", "job_readiness", "well_being"]>;
    score: z.ZodNumber;
    confidence: z.ZodNumber;
    modelVersion: z.ZodString;
    createdAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    createdAt: string;
    id: string;
    dimension: "confidence" | "belonging" | "lang_level_proxy" | "job_readiness" | "well_being";
    confidence: number;
    modelVersion: string;
    score: number;
    evidenceSnippetId: string;
}, {
    createdAt: string;
    id: string;
    dimension: "confidence" | "belonging" | "lang_level_proxy" | "job_readiness" | "well_being";
    confidence: number;
    modelVersion: string;
    score: number;
    evidenceSnippetId: string;
}>;
export type OutcomeScore = z.infer<typeof OutcomeScoreSchema>;
export declare const EvidenceLineageSchema: z.ZodObject<{
    metricId: z.ZodString;
    metricName: z.ZodString;
    metricValue: z.ZodNumber;
    aggregationMethod: z.ZodString;
    evidenceChain: z.ZodArray<z.ZodObject<{
        level: z.ZodNumber;
        type: z.ZodString;
        id: z.ZodString;
        description: z.ZodString;
        contributionWeight: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        type: string;
        id: string;
        description: string;
        level: number;
        contributionWeight?: number | undefined;
    }, {
        type: string;
        id: string;
        description: string;
        level: number;
        contributionWeight?: number | undefined;
    }>, "many">;
    totalEvidenceCount: z.ZodNumber;
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
}, "strip", z.ZodTypeAny, {
    period: {
        start: string;
        end: string;
    };
    metricId: string;
    metricName: string;
    metricValue: number;
    aggregationMethod: string;
    evidenceChain: {
        type: string;
        id: string;
        description: string;
        level: number;
        contributionWeight?: number | undefined;
    }[];
    totalEvidenceCount: number;
}, {
    period: {
        start: string;
        end: string;
    };
    metricId: string;
    metricName: string;
    metricValue: number;
    aggregationMethod: string;
    evidenceChain: {
        type: string;
        id: string;
        description: string;
        level: number;
        contributionWeight?: number | undefined;
    }[];
    totalEvidenceCount: number;
}>;
export type EvidenceLineage = z.infer<typeof EvidenceLineageSchema>;
export declare const EvidenceFiltersSchema: z.ZodObject<{
    startDate: z.ZodOptional<z.ZodString>;
    endDate: z.ZodOptional<z.ZodString>;
    programType: z.ZodOptional<z.ZodEnum<["buddy", "language", "mentorship", "upskilling"]>>;
    cohort: z.ZodOptional<z.ZodString>;
    dimension: z.ZodOptional<z.ZodEnum<["confidence", "belonging", "lang_level_proxy", "job_readiness", "well_being"]>>;
    search: z.ZodOptional<z.ZodString>;
    limit: z.ZodDefault<z.ZodNumber>;
    offset: z.ZodDefault<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    limit: number;
    offset: number;
    startDate?: string | undefined;
    endDate?: string | undefined;
    programType?: "language" | "mentorship" | "buddy" | "upskilling" | undefined;
    search?: string | undefined;
    dimension?: "confidence" | "belonging" | "lang_level_proxy" | "job_readiness" | "well_being" | undefined;
    cohort?: string | undefined;
}, {
    limit?: number | undefined;
    offset?: number | undefined;
    startDate?: string | undefined;
    endDate?: string | undefined;
    programType?: "language" | "mentorship" | "buddy" | "upskilling" | undefined;
    search?: string | undefined;
    dimension?: "confidence" | "belonging" | "lang_level_proxy" | "job_readiness" | "well_being" | undefined;
    cohort?: string | undefined;
}>;
export type EvidenceFilters = z.infer<typeof EvidenceFiltersSchema>;
export declare const EvidenceResponseSchema: z.ZodObject<{
    evidence: z.ZodArray<z.ZodObject<{
        snippet: z.ZodObject<{
            id: z.ZodString;
            snippetText: z.ZodString;
            snippetHash: z.ZodString;
            source: z.ZodString;
            sourceType: z.ZodEnum<["buddy_feedback", "kintell_feedback", "checkin", "survey"]>;
            programType: z.ZodEnum<["buddy", "language", "mentorship", "upskilling"]>;
            cohort: z.ZodOptional<z.ZodString>;
            submittedAt: z.ZodString;
            participantId: z.ZodOptional<z.ZodString>;
            metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
        }, "strip", z.ZodTypeAny, {
            id: string;
            programType: "language" | "mentorship" | "buddy" | "upskilling";
            source: string;
            snippetText: string;
            snippetHash: string;
            sourceType: "survey" | "buddy_feedback" | "kintell_feedback" | "checkin";
            submittedAt: string;
            metadata?: Record<string, any> | undefined;
            cohort?: string | undefined;
            participantId?: string | undefined;
        }, {
            id: string;
            programType: "language" | "mentorship" | "buddy" | "upskilling";
            source: string;
            snippetText: string;
            snippetHash: string;
            sourceType: "survey" | "buddy_feedback" | "kintell_feedback" | "checkin";
            submittedAt: string;
            metadata?: Record<string, any> | undefined;
            cohort?: string | undefined;
            participantId?: string | undefined;
        }>;
        outcomeScores: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            evidenceSnippetId: z.ZodString;
            dimension: z.ZodEnum<["confidence", "belonging", "lang_level_proxy", "job_readiness", "well_being"]>;
            score: z.ZodNumber;
            confidence: z.ZodNumber;
            modelVersion: z.ZodString;
            createdAt: z.ZodString;
        }, "strip", z.ZodTypeAny, {
            createdAt: string;
            id: string;
            dimension: "confidence" | "belonging" | "lang_level_proxy" | "job_readiness" | "well_being";
            confidence: number;
            modelVersion: string;
            score: number;
            evidenceSnippetId: string;
        }, {
            createdAt: string;
            id: string;
            dimension: "confidence" | "belonging" | "lang_level_proxy" | "job_readiness" | "well_being";
            confidence: number;
            modelVersion: string;
            score: number;
            evidenceSnippetId: string;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        outcomeScores: {
            createdAt: string;
            id: string;
            dimension: "confidence" | "belonging" | "lang_level_proxy" | "job_readiness" | "well_being";
            confidence: number;
            modelVersion: string;
            score: number;
            evidenceSnippetId: string;
        }[];
        snippet: {
            id: string;
            programType: "language" | "mentorship" | "buddy" | "upskilling";
            source: string;
            snippetText: string;
            snippetHash: string;
            sourceType: "survey" | "buddy_feedback" | "kintell_feedback" | "checkin";
            submittedAt: string;
            metadata?: Record<string, any> | undefined;
            cohort?: string | undefined;
            participantId?: string | undefined;
        };
    }, {
        outcomeScores: {
            createdAt: string;
            id: string;
            dimension: "confidence" | "belonging" | "lang_level_proxy" | "job_readiness" | "well_being";
            confidence: number;
            modelVersion: string;
            score: number;
            evidenceSnippetId: string;
        }[];
        snippet: {
            id: string;
            programType: "language" | "mentorship" | "buddy" | "upskilling";
            source: string;
            snippetText: string;
            snippetHash: string;
            sourceType: "survey" | "buddy_feedback" | "kintell_feedback" | "checkin";
            submittedAt: string;
            metadata?: Record<string, any> | undefined;
            cohort?: string | undefined;
            participantId?: string | undefined;
        };
    }>, "many">;
    pagination: z.ZodObject<{
        total: z.ZodNumber;
        limit: z.ZodNumber;
        offset: z.ZodNumber;
        hasMore: z.ZodBoolean;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    }, {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    }>;
    filters: z.ZodObject<{
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        programType: z.ZodOptional<z.ZodEnum<["buddy", "language", "mentorship", "upskilling"]>>;
        cohort: z.ZodOptional<z.ZodString>;
        dimension: z.ZodOptional<z.ZodEnum<["confidence", "belonging", "lang_level_proxy", "job_readiness", "well_being"]>>;
        search: z.ZodOptional<z.ZodString>;
        limit: z.ZodDefault<z.ZodNumber>;
        offset: z.ZodDefault<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        offset: number;
        startDate?: string | undefined;
        endDate?: string | undefined;
        programType?: "language" | "mentorship" | "buddy" | "upskilling" | undefined;
        search?: string | undefined;
        dimension?: "confidence" | "belonging" | "lang_level_proxy" | "job_readiness" | "well_being" | undefined;
        cohort?: string | undefined;
    }, {
        limit?: number | undefined;
        offset?: number | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        programType?: "language" | "mentorship" | "buddy" | "upskilling" | undefined;
        search?: string | undefined;
        dimension?: "confidence" | "belonging" | "lang_level_proxy" | "job_readiness" | "well_being" | undefined;
        cohort?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
    evidence: {
        outcomeScores: {
            createdAt: string;
            id: string;
            dimension: "confidence" | "belonging" | "lang_level_proxy" | "job_readiness" | "well_being";
            confidence: number;
            modelVersion: string;
            score: number;
            evidenceSnippetId: string;
        }[];
        snippet: {
            id: string;
            programType: "language" | "mentorship" | "buddy" | "upskilling";
            source: string;
            snippetText: string;
            snippetHash: string;
            sourceType: "survey" | "buddy_feedback" | "kintell_feedback" | "checkin";
            submittedAt: string;
            metadata?: Record<string, any> | undefined;
            cohort?: string | undefined;
            participantId?: string | undefined;
        };
    }[];
    filters: {
        limit: number;
        offset: number;
        startDate?: string | undefined;
        endDate?: string | undefined;
        programType?: "language" | "mentorship" | "buddy" | "upskilling" | undefined;
        search?: string | undefined;
        dimension?: "confidence" | "belonging" | "lang_level_proxy" | "job_readiness" | "well_being" | undefined;
        cohort?: string | undefined;
    };
}, {
    pagination: {
        limit: number;
        offset: number;
        total: number;
        hasMore: boolean;
    };
    evidence: {
        outcomeScores: {
            createdAt: string;
            id: string;
            dimension: "confidence" | "belonging" | "lang_level_proxy" | "job_readiness" | "well_being";
            confidence: number;
            modelVersion: string;
            score: number;
            evidenceSnippetId: string;
        }[];
        snippet: {
            id: string;
            programType: "language" | "mentorship" | "buddy" | "upskilling";
            source: string;
            snippetText: string;
            snippetHash: string;
            sourceType: "survey" | "buddy_feedback" | "kintell_feedback" | "checkin";
            submittedAt: string;
            metadata?: Record<string, any> | undefined;
            cohort?: string | undefined;
            participantId?: string | undefined;
        };
    }[];
    filters: {
        limit?: number | undefined;
        offset?: number | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        programType?: "language" | "mentorship" | "buddy" | "upskilling" | undefined;
        search?: string | undefined;
        dimension?: "confidence" | "belonging" | "lang_level_proxy" | "job_readiness" | "well_being" | undefined;
        cohort?: string | undefined;
    };
}>;
export type EvidenceResponse = z.infer<typeof EvidenceResponseSchema>;
export declare const CSRDExportSchema: z.ZodObject<{
    companyId: z.ZodString;
    companyName: z.ZodString;
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
    evidenceCount: z.ZodNumber;
    snippets: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        source: z.ZodString;
        date: z.ZodString;
        program: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        date: string;
        id: string;
        text: string;
        source: string;
        program: string;
    }, {
        date: string;
        id: string;
        text: string;
        source: string;
        program: string;
    }>, "many">;
    generatedAt: z.ZodString;
    disclaimer: z.ZodString;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    period: {
        start: string;
        end: string;
    };
    generatedAt: string;
    evidenceCount: number;
    companyName: string;
    snippets: {
        date: string;
        id: string;
        text: string;
        source: string;
        program: string;
    }[];
    disclaimer: string;
}, {
    companyId: string;
    period: {
        start: string;
        end: string;
    };
    generatedAt: string;
    evidenceCount: number;
    companyName: string;
    snippets: {
        date: string;
        id: string;
        text: string;
        source: string;
        program: string;
    }[];
    disclaimer: string;
}>;
export type CSRDExport = z.infer<typeof CSRDExportSchema>;
//# sourceMappingURL=evidence.d.ts.map