import { z } from 'zod';
/**
 * Regulatory Packs Types
 * For CSRD/GRI/SDG annex generation with machine-readable artifacts
 */
export declare const FrameworkType: z.ZodEnum<["CSRD", "GRI", "SDG"]>;
export type FrameworkType = z.infer<typeof FrameworkType>;
export declare const DisclosureStatus: z.ZodEnum<["complete", "partial", "missing", "not_applicable"]>;
export type DisclosureStatus = z.infer<typeof DisclosureStatus>;
export declare const PackStatus: z.ZodEnum<["draft", "generating", "ready", "failed"]>;
export type PackStatus = z.infer<typeof PackStatus>;
/**
 * CSRD ESRS Topic
 * Based on European Sustainability Reporting Standards (ESRS)
 */
export declare const ESRSTopicSchema: z.ZodObject<{
    id: z.ZodString;
    name: z.ZodString;
    category: z.ZodEnum<["environmental", "social", "governance"]>;
    version: z.ZodString;
    disclosures: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        title: z.ZodString;
        description: z.ZodString;
        mandatory: z.ZodBoolean;
        dataPoints: z.ZodArray<z.ZodObject<{
            id: z.ZodString;
            name: z.ZodString;
            type: z.ZodEnum<["narrative", "quantitative", "qualitative"]>;
            unit: z.ZodOptional<z.ZodString>;
            required: z.ZodBoolean;
        }, "strip", z.ZodTypeAny, {
            type: "narrative" | "quantitative" | "qualitative";
            id: string;
            name: string;
            required: boolean;
            unit?: string | undefined;
        }, {
            type: "narrative" | "quantitative" | "qualitative";
            id: string;
            name: string;
            required: boolean;
            unit?: string | undefined;
        }>, "many">;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        title: string;
        mandatory: boolean;
        dataPoints: {
            type: "narrative" | "quantitative" | "qualitative";
            id: string;
            name: string;
            required: boolean;
            unit?: string | undefined;
        }[];
    }, {
        id: string;
        description: string;
        title: string;
        mandatory: boolean;
        dataPoints: {
            type: "narrative" | "quantitative" | "qualitative";
            id: string;
            name: string;
            required: boolean;
            unit?: string | undefined;
        }[];
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    id: string;
    name: string;
    version: string;
    category: "environmental" | "social" | "governance";
    disclosures: {
        id: string;
        description: string;
        title: string;
        mandatory: boolean;
        dataPoints: {
            type: "narrative" | "quantitative" | "qualitative";
            id: string;
            name: string;
            required: boolean;
            unit?: string | undefined;
        }[];
    }[];
}, {
    id: string;
    name: string;
    version: string;
    category: "environmental" | "social" | "governance";
    disclosures: {
        id: string;
        description: string;
        title: string;
        mandatory: boolean;
        dataPoints: {
            type: "narrative" | "quantitative" | "qualitative";
            id: string;
            name: string;
            required: boolean;
            unit?: string | undefined;
        }[];
    }[];
}>;
export type ESRSTopic = z.infer<typeof ESRSTopicSchema>;
/**
 * GRI Disclosure
 * Based on Global Reporting Initiative standards
 */
export declare const GRIDisclosureSchema: z.ZodObject<{
    id: z.ZodString;
    title: z.ZodString;
    description: z.ZodString;
    standard: z.ZodString;
    version: z.ZodString;
    category: z.ZodEnum<["universal", "topic-specific"]>;
    requirements: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        text: z.ZodString;
        type: z.ZodEnum<["narrative", "quantitative", "qualitative"]>;
        guidance: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        type: "narrative" | "quantitative" | "qualitative";
        id: string;
        text: string;
        guidance?: string | undefined;
    }, {
        type: "narrative" | "quantitative" | "qualitative";
        id: string;
        text: string;
        guidance?: string | undefined;
    }>, "many">;
    sdgMappings: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    id: string;
    description: string;
    version: string;
    category: "universal" | "topic-specific";
    title: string;
    standard: string;
    requirements: {
        type: "narrative" | "quantitative" | "qualitative";
        id: string;
        text: string;
        guidance?: string | undefined;
    }[];
    sdgMappings?: string[] | undefined;
}, {
    id: string;
    description: string;
    version: string;
    category: "universal" | "topic-specific";
    title: string;
    standard: string;
    requirements: {
        type: "narrative" | "quantitative" | "qualitative";
        id: string;
        text: string;
        guidance?: string | undefined;
    }[];
    sdgMappings?: string[] | undefined;
}>;
export type GRIDisclosure = z.infer<typeof GRIDisclosureSchema>;
/**
 * SDG Target
 * Based on UN Sustainable Development Goals
 */
export declare const SDGTargetSchema: z.ZodObject<{
    goal: z.ZodNumber;
    goalName: z.ZodString;
    target: z.ZodString;
    targetText: z.ZodString;
    indicators: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        description: z.ZodString;
        tier: z.ZodOptional<z.ZodEnum<["I", "II", "III"]>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        description: string;
        tier?: "I" | "II" | "III" | undefined;
    }, {
        id: string;
        description: string;
        tier?: "I" | "II" | "III" | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    goal: number;
    goalName: string;
    target: string;
    targetText: string;
    indicators: {
        id: string;
        description: string;
        tier?: "I" | "II" | "III" | undefined;
    }[];
}, {
    goal: number;
    goalName: string;
    target: string;
    targetText: string;
    indicators: {
        id: string;
        description: string;
        tier?: "I" | "II" | "III" | undefined;
    }[];
}>;
export type SDGTarget = z.infer<typeof SDGTargetSchema>;
/**
 * Evidence Reference
 * Links evidence to disclosure requirements
 */
export declare const EvidenceRefSchema: z.ZodObject<{
    evidenceId: z.ZodString;
    snippetId: z.ZodOptional<z.ZodString>;
    source: z.ZodString;
    timestamp: z.ZodString;
    relevanceScore: z.ZodNumber;
    excerpt: z.ZodString;
    metrics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    timestamp: string;
    evidenceId: string;
    source: string;
    relevanceScore: number;
    excerpt: string;
    metrics?: string[] | undefined;
    snippetId?: string | undefined;
}, {
    timestamp: string;
    evidenceId: string;
    source: string;
    relevanceScore: number;
    excerpt: string;
    metrics?: string[] | undefined;
    snippetId?: string | undefined;
}>;
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;
/**
 * Disclosure Mapping
 * Maps a disclosure requirement to available evidence
 */
export declare const DisclosureMappingSchema: z.ZodObject<{
    disclosureId: z.ZodString;
    frameworkType: z.ZodEnum<["CSRD", "GRI", "SDG"]>;
    status: z.ZodEnum<["complete", "partial", "missing", "not_applicable"]>;
    completenessScore: z.ZodNumber;
    evidence: z.ZodArray<z.ZodObject<{
        evidenceId: z.ZodString;
        snippetId: z.ZodOptional<z.ZodString>;
        source: z.ZodString;
        timestamp: z.ZodString;
        relevanceScore: z.ZodNumber;
        excerpt: z.ZodString;
        metrics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        evidenceId: string;
        source: string;
        relevanceScore: number;
        excerpt: string;
        metrics?: string[] | undefined;
        snippetId?: string | undefined;
    }, {
        timestamp: string;
        evidenceId: string;
        source: string;
        relevanceScore: number;
        excerpt: string;
        metrics?: string[] | undefined;
        snippetId?: string | undefined;
    }>, "many">;
    gaps: z.ZodArray<z.ZodObject<{
        requirementId: z.ZodString;
        description: z.ZodString;
        suggestedAction: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        description: string;
        requirementId: string;
        suggestedAction: string;
    }, {
        description: string;
        requirementId: string;
        suggestedAction: string;
    }>, "many">;
    lastUpdated: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "complete" | "partial" | "missing" | "not_applicable";
    disclosureId: string;
    frameworkType: "CSRD" | "GRI" | "SDG";
    completenessScore: number;
    evidence: {
        timestamp: string;
        evidenceId: string;
        source: string;
        relevanceScore: number;
        excerpt: string;
        metrics?: string[] | undefined;
        snippetId?: string | undefined;
    }[];
    gaps: {
        description: string;
        requirementId: string;
        suggestedAction: string;
    }[];
    lastUpdated: string;
}, {
    status: "complete" | "partial" | "missing" | "not_applicable";
    disclosureId: string;
    frameworkType: "CSRD" | "GRI" | "SDG";
    completenessScore: number;
    evidence: {
        timestamp: string;
        evidenceId: string;
        source: string;
        relevanceScore: number;
        excerpt: string;
        metrics?: string[] | undefined;
        snippetId?: string | undefined;
    }[];
    gaps: {
        description: string;
        requirementId: string;
        suggestedAction: string;
    }[];
    lastUpdated: string;
}>;
export type DisclosureMapping = z.infer<typeof DisclosureMappingSchema>;
/**
 * Regulatory Pack Request
 * Payload for generating a regulatory pack
 */
export declare const GeneratePackRequestSchema: z.ZodObject<{
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
    frameworks: z.ZodArray<z.ZodEnum<["CSRD", "GRI", "SDG"]>, "many">;
    entities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    evidenceScope: z.ZodOptional<z.ZodObject<{
        programs: z.ZodOptional<z.ZodArray<z.ZodEnum<["buddy", "language", "mentorship", "upskilling"]>, "many">>;
        metrics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        includeStale: z.ZodDefault<z.ZodBoolean>;
    }, "strip", z.ZodTypeAny, {
        includeStale: boolean;
        metrics?: string[] | undefined;
        programs?: ("language" | "mentorship" | "buddy" | "upskilling")[] | undefined;
    }, {
        metrics?: string[] | undefined;
        programs?: ("language" | "mentorship" | "buddy" | "upskilling")[] | undefined;
        includeStale?: boolean | undefined;
    }>>;
    options: z.ZodOptional<z.ZodObject<{
        language: z.ZodDefault<z.ZodEnum<["en", "es", "fr", "uk", "no"]>>;
        includeGaps: z.ZodDefault<z.ZodBoolean>;
        pdfOptions: z.ZodOptional<z.ZodObject<{
            includeTOC: z.ZodDefault<z.ZodBoolean>;
            includeFootnotes: z.ZodDefault<z.ZodBoolean>;
            watermark: z.ZodDefault<z.ZodBoolean>;
        }, "strip", z.ZodTypeAny, {
            includeTOC: boolean;
            includeFootnotes: boolean;
            watermark: boolean;
        }, {
            includeTOC?: boolean | undefined;
            includeFootnotes?: boolean | undefined;
            watermark?: boolean | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        language: "en" | "es" | "fr" | "uk" | "no";
        includeGaps: boolean;
        pdfOptions?: {
            includeTOC: boolean;
            includeFootnotes: boolean;
            watermark: boolean;
        } | undefined;
    }, {
        language?: "en" | "es" | "fr" | "uk" | "no" | undefined;
        includeGaps?: boolean | undefined;
        pdfOptions?: {
            includeTOC?: boolean | undefined;
            includeFootnotes?: boolean | undefined;
            watermark?: boolean | undefined;
        } | undefined;
    }>>;
}, "strip", z.ZodTypeAny, {
    companyId: string;
    period: {
        start: string;
        end: string;
    };
    frameworks: ("CSRD" | "GRI" | "SDG")[];
    options?: {
        language: "en" | "es" | "fr" | "uk" | "no";
        includeGaps: boolean;
        pdfOptions?: {
            includeTOC: boolean;
            includeFootnotes: boolean;
            watermark: boolean;
        } | undefined;
    } | undefined;
    entities?: string[] | undefined;
    evidenceScope?: {
        includeStale: boolean;
        metrics?: string[] | undefined;
        programs?: ("language" | "mentorship" | "buddy" | "upskilling")[] | undefined;
    } | undefined;
}, {
    companyId: string;
    period: {
        start: string;
        end: string;
    };
    frameworks: ("CSRD" | "GRI" | "SDG")[];
    options?: {
        language?: "en" | "es" | "fr" | "uk" | "no" | undefined;
        includeGaps?: boolean | undefined;
        pdfOptions?: {
            includeTOC?: boolean | undefined;
            includeFootnotes?: boolean | undefined;
            watermark?: boolean | undefined;
        } | undefined;
    } | undefined;
    entities?: string[] | undefined;
    evidenceScope?: {
        metrics?: string[] | undefined;
        programs?: ("language" | "mentorship" | "buddy" | "upskilling")[] | undefined;
        includeStale?: boolean | undefined;
    } | undefined;
}>;
export type GeneratePackRequest = z.infer<typeof GeneratePackRequestSchema>;
/**
 * Gap Item
 * Represents a data gap in regulatory compliance
 */
export declare const GapItemSchema: z.ZodObject<{
    disclosureId: z.ZodString;
    framework: z.ZodEnum<["CSRD", "GRI", "SDG"]>;
    requirementId: z.ZodString;
    title: z.ZodString;
    severity: z.ZodEnum<["critical", "high", "medium", "low"]>;
    description: z.ZodString;
    suggestedAction: z.ZodString;
    affectedMetrics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
}, "strip", z.ZodTypeAny, {
    description: string;
    title: string;
    disclosureId: string;
    requirementId: string;
    suggestedAction: string;
    framework: "CSRD" | "GRI" | "SDG";
    severity: "low" | "medium" | "high" | "critical";
    affectedMetrics?: string[] | undefined;
}, {
    description: string;
    title: string;
    disclosureId: string;
    requirementId: string;
    suggestedAction: string;
    framework: "CSRD" | "GRI" | "SDG";
    severity: "low" | "medium" | "high" | "critical";
    affectedMetrics?: string[] | undefined;
}>;
export type GapItem = z.infer<typeof GapItemSchema>;
/**
 * Pack Section
 * A section in the generated regulatory pack
 */
export declare const PackSectionSchema: z.ZodObject<{
    framework: z.ZodEnum<["CSRD", "GRI", "SDG"]>;
    disclosureId: z.ZodString;
    title: z.ZodString;
    status: z.ZodEnum<["complete", "partial", "missing", "not_applicable"]>;
    content: z.ZodObject<{
        narrative: z.ZodOptional<z.ZodString>;
        tables: z.ZodOptional<z.ZodArray<z.ZodObject<{
            title: z.ZodString;
            headers: z.ZodArray<z.ZodString, "many">;
            rows: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
        }, "strip", z.ZodTypeAny, {
            title: string;
            headers: string[];
            rows: string[][];
        }, {
            title: string;
            headers: string[];
            rows: string[][];
        }>, "many">>;
        metrics: z.ZodOptional<z.ZodArray<z.ZodObject<{
            name: z.ZodString;
            value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
            unit: z.ZodOptional<z.ZodString>;
            evidenceId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            value: string | number;
            name: string;
            unit?: string | undefined;
            evidenceId?: string | undefined;
        }, {
            value: string | number;
            name: string;
            unit?: string | undefined;
            evidenceId?: string | undefined;
        }>, "many">>;
    }, "strip", z.ZodTypeAny, {
        metrics?: {
            value: string | number;
            name: string;
            unit?: string | undefined;
            evidenceId?: string | undefined;
        }[] | undefined;
        narrative?: string | undefined;
        tables?: {
            title: string;
            headers: string[];
            rows: string[][];
        }[] | undefined;
    }, {
        metrics?: {
            value: string | number;
            name: string;
            unit?: string | undefined;
            evidenceId?: string | undefined;
        }[] | undefined;
        narrative?: string | undefined;
        tables?: {
            title: string;
            headers: string[];
            rows: string[][];
        }[] | undefined;
    }>;
    citations: z.ZodArray<z.ZodObject<{
        evidenceId: z.ZodString;
        snippetId: z.ZodOptional<z.ZodString>;
        source: z.ZodString;
        timestamp: z.ZodString;
        relevanceScore: z.ZodNumber;
        excerpt: z.ZodString;
        metrics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        evidenceId: string;
        source: string;
        relevanceScore: number;
        excerpt: string;
        metrics?: string[] | undefined;
        snippetId?: string | undefined;
    }, {
        timestamp: string;
        evidenceId: string;
        source: string;
        relevanceScore: number;
        excerpt: string;
        metrics?: string[] | undefined;
        snippetId?: string | undefined;
    }>, "many">;
    pageNumber: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "complete" | "partial" | "missing" | "not_applicable";
    title: string;
    disclosureId: string;
    framework: "CSRD" | "GRI" | "SDG";
    content: {
        metrics?: {
            value: string | number;
            name: string;
            unit?: string | undefined;
            evidenceId?: string | undefined;
        }[] | undefined;
        narrative?: string | undefined;
        tables?: {
            title: string;
            headers: string[];
            rows: string[][];
        }[] | undefined;
    };
    citations: {
        timestamp: string;
        evidenceId: string;
        source: string;
        relevanceScore: number;
        excerpt: string;
        metrics?: string[] | undefined;
        snippetId?: string | undefined;
    }[];
    pageNumber?: number | undefined;
}, {
    status: "complete" | "partial" | "missing" | "not_applicable";
    title: string;
    disclosureId: string;
    framework: "CSRD" | "GRI" | "SDG";
    content: {
        metrics?: {
            value: string | number;
            name: string;
            unit?: string | undefined;
            evidenceId?: string | undefined;
        }[] | undefined;
        narrative?: string | undefined;
        tables?: {
            title: string;
            headers: string[];
            rows: string[][];
        }[] | undefined;
    };
    citations: {
        timestamp: string;
        evidenceId: string;
        source: string;
        relevanceScore: number;
        excerpt: string;
        metrics?: string[] | undefined;
        snippetId?: string | undefined;
    }[];
    pageNumber?: number | undefined;
}>;
export type PackSection = z.infer<typeof PackSectionSchema>;
/**
 * Pack Summary
 * Overview of pack completeness and status
 */
export declare const PackSummarySchema: z.ZodObject<{
    totalDisclosures: z.ZodNumber;
    completedDisclosures: z.ZodNumber;
    partialDisclosures: z.ZodNumber;
    missingDisclosures: z.ZodNumber;
    overallCompleteness: z.ZodNumber;
    byFramework: z.ZodArray<z.ZodObject<{
        framework: z.ZodEnum<["CSRD", "GRI", "SDG"]>;
        completeness: z.ZodNumber;
        disclosureCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        framework: "CSRD" | "GRI" | "SDG";
        completeness: number;
        disclosureCount: number;
    }, {
        framework: "CSRD" | "GRI" | "SDG";
        completeness: number;
        disclosureCount: number;
    }>, "many">;
    criticalGaps: z.ZodNumber;
    lastUpdated: z.ZodString;
}, "strip", z.ZodTypeAny, {
    lastUpdated: string;
    totalDisclosures: number;
    completedDisclosures: number;
    partialDisclosures: number;
    missingDisclosures: number;
    overallCompleteness: number;
    byFramework: {
        framework: "CSRD" | "GRI" | "SDG";
        completeness: number;
        disclosureCount: number;
    }[];
    criticalGaps: number;
}, {
    lastUpdated: string;
    totalDisclosures: number;
    completedDisclosures: number;
    partialDisclosures: number;
    missingDisclosures: number;
    overallCompleteness: number;
    byFramework: {
        framework: "CSRD" | "GRI" | "SDG";
        completeness: number;
        disclosureCount: number;
    }[];
    criticalGaps: number;
}>;
export type PackSummary = z.infer<typeof PackSummarySchema>;
/**
 * Regulatory Pack (Full)
 * Complete pack with all sections and metadata
 */
export declare const RegulatoryPackSchema: z.ZodObject<{
    id: z.ZodString;
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
    frameworks: z.ZodArray<z.ZodEnum<["CSRD", "GRI", "SDG"]>, "many">;
    status: z.ZodEnum<["draft", "generating", "ready", "failed"]>;
    summary: z.ZodObject<{
        totalDisclosures: z.ZodNumber;
        completedDisclosures: z.ZodNumber;
        partialDisclosures: z.ZodNumber;
        missingDisclosures: z.ZodNumber;
        overallCompleteness: z.ZodNumber;
        byFramework: z.ZodArray<z.ZodObject<{
            framework: z.ZodEnum<["CSRD", "GRI", "SDG"]>;
            completeness: z.ZodNumber;
            disclosureCount: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            framework: "CSRD" | "GRI" | "SDG";
            completeness: number;
            disclosureCount: number;
        }, {
            framework: "CSRD" | "GRI" | "SDG";
            completeness: number;
            disclosureCount: number;
        }>, "many">;
        criticalGaps: z.ZodNumber;
        lastUpdated: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        lastUpdated: string;
        totalDisclosures: number;
        completedDisclosures: number;
        partialDisclosures: number;
        missingDisclosures: number;
        overallCompleteness: number;
        byFramework: {
            framework: "CSRD" | "GRI" | "SDG";
            completeness: number;
            disclosureCount: number;
        }[];
        criticalGaps: number;
    }, {
        lastUpdated: string;
        totalDisclosures: number;
        completedDisclosures: number;
        partialDisclosures: number;
        missingDisclosures: number;
        overallCompleteness: number;
        byFramework: {
            framework: "CSRD" | "GRI" | "SDG";
            completeness: number;
            disclosureCount: number;
        }[];
        criticalGaps: number;
    }>;
    sections: z.ZodArray<z.ZodObject<{
        framework: z.ZodEnum<["CSRD", "GRI", "SDG"]>;
        disclosureId: z.ZodString;
        title: z.ZodString;
        status: z.ZodEnum<["complete", "partial", "missing", "not_applicable"]>;
        content: z.ZodObject<{
            narrative: z.ZodOptional<z.ZodString>;
            tables: z.ZodOptional<z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                headers: z.ZodArray<z.ZodString, "many">;
                rows: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
            }, "strip", z.ZodTypeAny, {
                title: string;
                headers: string[];
                rows: string[][];
            }, {
                title: string;
                headers: string[];
                rows: string[][];
            }>, "many">>;
            metrics: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
                unit: z.ZodOptional<z.ZodString>;
                evidenceId: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }, {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            metrics?: {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }[] | undefined;
            narrative?: string | undefined;
            tables?: {
                title: string;
                headers: string[];
                rows: string[][];
            }[] | undefined;
        }, {
            metrics?: {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }[] | undefined;
            narrative?: string | undefined;
            tables?: {
                title: string;
                headers: string[];
                rows: string[][];
            }[] | undefined;
        }>;
        citations: z.ZodArray<z.ZodObject<{
            evidenceId: z.ZodString;
            snippetId: z.ZodOptional<z.ZodString>;
            source: z.ZodString;
            timestamp: z.ZodString;
            relevanceScore: z.ZodNumber;
            excerpt: z.ZodString;
            metrics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            timestamp: string;
            evidenceId: string;
            source: string;
            relevanceScore: number;
            excerpt: string;
            metrics?: string[] | undefined;
            snippetId?: string | undefined;
        }, {
            timestamp: string;
            evidenceId: string;
            source: string;
            relevanceScore: number;
            excerpt: string;
            metrics?: string[] | undefined;
            snippetId?: string | undefined;
        }>, "many">;
        pageNumber: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        status: "complete" | "partial" | "missing" | "not_applicable";
        title: string;
        disclosureId: string;
        framework: "CSRD" | "GRI" | "SDG";
        content: {
            metrics?: {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }[] | undefined;
            narrative?: string | undefined;
            tables?: {
                title: string;
                headers: string[];
                rows: string[][];
            }[] | undefined;
        };
        citations: {
            timestamp: string;
            evidenceId: string;
            source: string;
            relevanceScore: number;
            excerpt: string;
            metrics?: string[] | undefined;
            snippetId?: string | undefined;
        }[];
        pageNumber?: number | undefined;
    }, {
        status: "complete" | "partial" | "missing" | "not_applicable";
        title: string;
        disclosureId: string;
        framework: "CSRD" | "GRI" | "SDG";
        content: {
            metrics?: {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }[] | undefined;
            narrative?: string | undefined;
            tables?: {
                title: string;
                headers: string[];
                rows: string[][];
            }[] | undefined;
        };
        citations: {
            timestamp: string;
            evidenceId: string;
            source: string;
            relevanceScore: number;
            excerpt: string;
            metrics?: string[] | undefined;
            snippetId?: string | undefined;
        }[];
        pageNumber?: number | undefined;
    }>, "many">;
    gaps: z.ZodArray<z.ZodObject<{
        disclosureId: z.ZodString;
        framework: z.ZodEnum<["CSRD", "GRI", "SDG"]>;
        requirementId: z.ZodString;
        title: z.ZodString;
        severity: z.ZodEnum<["critical", "high", "medium", "low"]>;
        description: z.ZodString;
        suggestedAction: z.ZodString;
        affectedMetrics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        title: string;
        disclosureId: string;
        requirementId: string;
        suggestedAction: string;
        framework: "CSRD" | "GRI" | "SDG";
        severity: "low" | "medium" | "high" | "critical";
        affectedMetrics?: string[] | undefined;
    }, {
        description: string;
        title: string;
        disclosureId: string;
        requirementId: string;
        suggestedAction: string;
        framework: "CSRD" | "GRI" | "SDG";
        severity: "low" | "medium" | "high" | "critical";
        affectedMetrics?: string[] | undefined;
    }>, "many">;
    metadata: z.ZodObject<{
        generatedAt: z.ZodString;
        version: z.ZodString;
        language: z.ZodString;
        evidenceCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        language: string;
        version: string;
        generatedAt: string;
        evidenceCount: number;
    }, {
        language: string;
        version: string;
        generatedAt: string;
        evidenceCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "generating" | "ready" | "failed";
    companyId: string;
    id: string;
    metadata: {
        language: string;
        version: string;
        generatedAt: string;
        evidenceCount: number;
    };
    period: {
        start: string;
        end: string;
    };
    gaps: {
        description: string;
        title: string;
        disclosureId: string;
        requirementId: string;
        suggestedAction: string;
        framework: "CSRD" | "GRI" | "SDG";
        severity: "low" | "medium" | "high" | "critical";
        affectedMetrics?: string[] | undefined;
    }[];
    frameworks: ("CSRD" | "GRI" | "SDG")[];
    summary: {
        lastUpdated: string;
        totalDisclosures: number;
        completedDisclosures: number;
        partialDisclosures: number;
        missingDisclosures: number;
        overallCompleteness: number;
        byFramework: {
            framework: "CSRD" | "GRI" | "SDG";
            completeness: number;
            disclosureCount: number;
        }[];
        criticalGaps: number;
    };
    sections: {
        status: "complete" | "partial" | "missing" | "not_applicable";
        title: string;
        disclosureId: string;
        framework: "CSRD" | "GRI" | "SDG";
        content: {
            metrics?: {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }[] | undefined;
            narrative?: string | undefined;
            tables?: {
                title: string;
                headers: string[];
                rows: string[][];
            }[] | undefined;
        };
        citations: {
            timestamp: string;
            evidenceId: string;
            source: string;
            relevanceScore: number;
            excerpt: string;
            metrics?: string[] | undefined;
            snippetId?: string | undefined;
        }[];
        pageNumber?: number | undefined;
    }[];
}, {
    status: "draft" | "generating" | "ready" | "failed";
    companyId: string;
    id: string;
    metadata: {
        language: string;
        version: string;
        generatedAt: string;
        evidenceCount: number;
    };
    period: {
        start: string;
        end: string;
    };
    gaps: {
        description: string;
        title: string;
        disclosureId: string;
        requirementId: string;
        suggestedAction: string;
        framework: "CSRD" | "GRI" | "SDG";
        severity: "low" | "medium" | "high" | "critical";
        affectedMetrics?: string[] | undefined;
    }[];
    frameworks: ("CSRD" | "GRI" | "SDG")[];
    summary: {
        lastUpdated: string;
        totalDisclosures: number;
        completedDisclosures: number;
        partialDisclosures: number;
        missingDisclosures: number;
        overallCompleteness: number;
        byFramework: {
            framework: "CSRD" | "GRI" | "SDG";
            completeness: number;
            disclosureCount: number;
        }[];
        criticalGaps: number;
    };
    sections: {
        status: "complete" | "partial" | "missing" | "not_applicable";
        title: string;
        disclosureId: string;
        framework: "CSRD" | "GRI" | "SDG";
        content: {
            metrics?: {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }[] | undefined;
            narrative?: string | undefined;
            tables?: {
                title: string;
                headers: string[];
                rows: string[][];
            }[] | undefined;
        };
        citations: {
            timestamp: string;
            evidenceId: string;
            source: string;
            relevanceScore: number;
            excerpt: string;
            metrics?: string[] | undefined;
            snippetId?: string | undefined;
        }[];
        pageNumber?: number | undefined;
    }[];
}>;
export type RegulatoryPack = z.infer<typeof RegulatoryPackSchema>;
/**
 * Generate Pack Response
 * Response from POST /regulatory/packs
 */
export declare const GeneratePackResponseSchema: z.ZodObject<{
    packId: z.ZodString;
    status: z.ZodEnum<["draft", "generating", "ready", "failed"]>;
    message: z.ZodOptional<z.ZodString>;
    estimatedCompletionTime: z.ZodOptional<z.ZodNumber>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "generating" | "ready" | "failed";
    packId: string;
    message?: string | undefined;
    estimatedCompletionTime?: number | undefined;
}, {
    status: "draft" | "generating" | "ready" | "failed";
    packId: string;
    message?: string | undefined;
    estimatedCompletionTime?: number | undefined;
}>;
export type GeneratePackResponse = z.infer<typeof GeneratePackResponseSchema>;
/**
 * Get Pack Response
 * Response from GET /regulatory/packs/:id
 */
export declare const GetPackResponseSchema: z.ZodObject<{
    id: z.ZodString;
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
    frameworks: z.ZodArray<z.ZodEnum<["CSRD", "GRI", "SDG"]>, "many">;
    status: z.ZodEnum<["draft", "generating", "ready", "failed"]>;
    summary: z.ZodObject<{
        totalDisclosures: z.ZodNumber;
        completedDisclosures: z.ZodNumber;
        partialDisclosures: z.ZodNumber;
        missingDisclosures: z.ZodNumber;
        overallCompleteness: z.ZodNumber;
        byFramework: z.ZodArray<z.ZodObject<{
            framework: z.ZodEnum<["CSRD", "GRI", "SDG"]>;
            completeness: z.ZodNumber;
            disclosureCount: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            framework: "CSRD" | "GRI" | "SDG";
            completeness: number;
            disclosureCount: number;
        }, {
            framework: "CSRD" | "GRI" | "SDG";
            completeness: number;
            disclosureCount: number;
        }>, "many">;
        criticalGaps: z.ZodNumber;
        lastUpdated: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        lastUpdated: string;
        totalDisclosures: number;
        completedDisclosures: number;
        partialDisclosures: number;
        missingDisclosures: number;
        overallCompleteness: number;
        byFramework: {
            framework: "CSRD" | "GRI" | "SDG";
            completeness: number;
            disclosureCount: number;
        }[];
        criticalGaps: number;
    }, {
        lastUpdated: string;
        totalDisclosures: number;
        completedDisclosures: number;
        partialDisclosures: number;
        missingDisclosures: number;
        overallCompleteness: number;
        byFramework: {
            framework: "CSRD" | "GRI" | "SDG";
            completeness: number;
            disclosureCount: number;
        }[];
        criticalGaps: number;
    }>;
    sections: z.ZodArray<z.ZodObject<{
        framework: z.ZodEnum<["CSRD", "GRI", "SDG"]>;
        disclosureId: z.ZodString;
        title: z.ZodString;
        status: z.ZodEnum<["complete", "partial", "missing", "not_applicable"]>;
        content: z.ZodObject<{
            narrative: z.ZodOptional<z.ZodString>;
            tables: z.ZodOptional<z.ZodArray<z.ZodObject<{
                title: z.ZodString;
                headers: z.ZodArray<z.ZodString, "many">;
                rows: z.ZodArray<z.ZodArray<z.ZodString, "many">, "many">;
            }, "strip", z.ZodTypeAny, {
                title: string;
                headers: string[];
                rows: string[][];
            }, {
                title: string;
                headers: string[];
                rows: string[][];
            }>, "many">>;
            metrics: z.ZodOptional<z.ZodArray<z.ZodObject<{
                name: z.ZodString;
                value: z.ZodUnion<[z.ZodString, z.ZodNumber]>;
                unit: z.ZodOptional<z.ZodString>;
                evidenceId: z.ZodOptional<z.ZodString>;
            }, "strip", z.ZodTypeAny, {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }, {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }>, "many">>;
        }, "strip", z.ZodTypeAny, {
            metrics?: {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }[] | undefined;
            narrative?: string | undefined;
            tables?: {
                title: string;
                headers: string[];
                rows: string[][];
            }[] | undefined;
        }, {
            metrics?: {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }[] | undefined;
            narrative?: string | undefined;
            tables?: {
                title: string;
                headers: string[];
                rows: string[][];
            }[] | undefined;
        }>;
        citations: z.ZodArray<z.ZodObject<{
            evidenceId: z.ZodString;
            snippetId: z.ZodOptional<z.ZodString>;
            source: z.ZodString;
            timestamp: z.ZodString;
            relevanceScore: z.ZodNumber;
            excerpt: z.ZodString;
            metrics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            timestamp: string;
            evidenceId: string;
            source: string;
            relevanceScore: number;
            excerpt: string;
            metrics?: string[] | undefined;
            snippetId?: string | undefined;
        }, {
            timestamp: string;
            evidenceId: string;
            source: string;
            relevanceScore: number;
            excerpt: string;
            metrics?: string[] | undefined;
            snippetId?: string | undefined;
        }>, "many">;
        pageNumber: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        status: "complete" | "partial" | "missing" | "not_applicable";
        title: string;
        disclosureId: string;
        framework: "CSRD" | "GRI" | "SDG";
        content: {
            metrics?: {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }[] | undefined;
            narrative?: string | undefined;
            tables?: {
                title: string;
                headers: string[];
                rows: string[][];
            }[] | undefined;
        };
        citations: {
            timestamp: string;
            evidenceId: string;
            source: string;
            relevanceScore: number;
            excerpt: string;
            metrics?: string[] | undefined;
            snippetId?: string | undefined;
        }[];
        pageNumber?: number | undefined;
    }, {
        status: "complete" | "partial" | "missing" | "not_applicable";
        title: string;
        disclosureId: string;
        framework: "CSRD" | "GRI" | "SDG";
        content: {
            metrics?: {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }[] | undefined;
            narrative?: string | undefined;
            tables?: {
                title: string;
                headers: string[];
                rows: string[][];
            }[] | undefined;
        };
        citations: {
            timestamp: string;
            evidenceId: string;
            source: string;
            relevanceScore: number;
            excerpt: string;
            metrics?: string[] | undefined;
            snippetId?: string | undefined;
        }[];
        pageNumber?: number | undefined;
    }>, "many">;
    gaps: z.ZodArray<z.ZodObject<{
        disclosureId: z.ZodString;
        framework: z.ZodEnum<["CSRD", "GRI", "SDG"]>;
        requirementId: z.ZodString;
        title: z.ZodString;
        severity: z.ZodEnum<["critical", "high", "medium", "low"]>;
        description: z.ZodString;
        suggestedAction: z.ZodString;
        affectedMetrics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        description: string;
        title: string;
        disclosureId: string;
        requirementId: string;
        suggestedAction: string;
        framework: "CSRD" | "GRI" | "SDG";
        severity: "low" | "medium" | "high" | "critical";
        affectedMetrics?: string[] | undefined;
    }, {
        description: string;
        title: string;
        disclosureId: string;
        requirementId: string;
        suggestedAction: string;
        framework: "CSRD" | "GRI" | "SDG";
        severity: "low" | "medium" | "high" | "critical";
        affectedMetrics?: string[] | undefined;
    }>, "many">;
    metadata: z.ZodObject<{
        generatedAt: z.ZodString;
        version: z.ZodString;
        language: z.ZodString;
        evidenceCount: z.ZodNumber;
    }, "strip", z.ZodTypeAny, {
        language: string;
        version: string;
        generatedAt: string;
        evidenceCount: number;
    }, {
        language: string;
        version: string;
        generatedAt: string;
        evidenceCount: number;
    }>;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "generating" | "ready" | "failed";
    companyId: string;
    id: string;
    metadata: {
        language: string;
        version: string;
        generatedAt: string;
        evidenceCount: number;
    };
    period: {
        start: string;
        end: string;
    };
    gaps: {
        description: string;
        title: string;
        disclosureId: string;
        requirementId: string;
        suggestedAction: string;
        framework: "CSRD" | "GRI" | "SDG";
        severity: "low" | "medium" | "high" | "critical";
        affectedMetrics?: string[] | undefined;
    }[];
    frameworks: ("CSRD" | "GRI" | "SDG")[];
    summary: {
        lastUpdated: string;
        totalDisclosures: number;
        completedDisclosures: number;
        partialDisclosures: number;
        missingDisclosures: number;
        overallCompleteness: number;
        byFramework: {
            framework: "CSRD" | "GRI" | "SDG";
            completeness: number;
            disclosureCount: number;
        }[];
        criticalGaps: number;
    };
    sections: {
        status: "complete" | "partial" | "missing" | "not_applicable";
        title: string;
        disclosureId: string;
        framework: "CSRD" | "GRI" | "SDG";
        content: {
            metrics?: {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }[] | undefined;
            narrative?: string | undefined;
            tables?: {
                title: string;
                headers: string[];
                rows: string[][];
            }[] | undefined;
        };
        citations: {
            timestamp: string;
            evidenceId: string;
            source: string;
            relevanceScore: number;
            excerpt: string;
            metrics?: string[] | undefined;
            snippetId?: string | undefined;
        }[];
        pageNumber?: number | undefined;
    }[];
}, {
    status: "draft" | "generating" | "ready" | "failed";
    companyId: string;
    id: string;
    metadata: {
        language: string;
        version: string;
        generatedAt: string;
        evidenceCount: number;
    };
    period: {
        start: string;
        end: string;
    };
    gaps: {
        description: string;
        title: string;
        disclosureId: string;
        requirementId: string;
        suggestedAction: string;
        framework: "CSRD" | "GRI" | "SDG";
        severity: "low" | "medium" | "high" | "critical";
        affectedMetrics?: string[] | undefined;
    }[];
    frameworks: ("CSRD" | "GRI" | "SDG")[];
    summary: {
        lastUpdated: string;
        totalDisclosures: number;
        completedDisclosures: number;
        partialDisclosures: number;
        missingDisclosures: number;
        overallCompleteness: number;
        byFramework: {
            framework: "CSRD" | "GRI" | "SDG";
            completeness: number;
            disclosureCount: number;
        }[];
        criticalGaps: number;
    };
    sections: {
        status: "complete" | "partial" | "missing" | "not_applicable";
        title: string;
        disclosureId: string;
        framework: "CSRD" | "GRI" | "SDG";
        content: {
            metrics?: {
                value: string | number;
                name: string;
                unit?: string | undefined;
                evidenceId?: string | undefined;
            }[] | undefined;
            narrative?: string | undefined;
            tables?: {
                title: string;
                headers: string[];
                rows: string[][];
            }[] | undefined;
        };
        citations: {
            timestamp: string;
            evidenceId: string;
            source: string;
            relevanceScore: number;
            excerpt: string;
            metrics?: string[] | undefined;
            snippetId?: string | undefined;
        }[];
        pageNumber?: number | undefined;
    }[];
}>;
export type GetPackResponse = z.infer<typeof GetPackResponseSchema>;
/**
 * Pack List Item
 * Summary for listing packs
 */
export declare const PackListItemSchema: z.ZodObject<{
    id: z.ZodString;
    companyId: z.ZodString;
    frameworks: z.ZodArray<z.ZodEnum<["CSRD", "GRI", "SDG"]>, "many">;
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
    status: z.ZodEnum<["draft", "generating", "ready", "failed"]>;
    completeness: z.ZodNumber;
    generatedAt: z.ZodString;
}, "strip", z.ZodTypeAny, {
    status: "draft" | "generating" | "ready" | "failed";
    companyId: string;
    id: string;
    period: {
        start: string;
        end: string;
    };
    frameworks: ("CSRD" | "GRI" | "SDG")[];
    completeness: number;
    generatedAt: string;
}, {
    status: "draft" | "generating" | "ready" | "failed";
    companyId: string;
    id: string;
    period: {
        start: string;
        end: string;
    };
    frameworks: ("CSRD" | "GRI" | "SDG")[];
    completeness: number;
    generatedAt: string;
}>;
export type PackListItem = z.infer<typeof PackListItemSchema>;
/**
 * List Packs Response
 * Response from GET /regulatory/packs (list all)
 */
export declare const ListPacksResponseSchema: z.ZodObject<{
    packs: z.ZodArray<z.ZodObject<{
        id: z.ZodString;
        companyId: z.ZodString;
        frameworks: z.ZodArray<z.ZodEnum<["CSRD", "GRI", "SDG"]>, "many">;
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
        status: z.ZodEnum<["draft", "generating", "ready", "failed"]>;
        completeness: z.ZodNumber;
        generatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        status: "draft" | "generating" | "ready" | "failed";
        companyId: string;
        id: string;
        period: {
            start: string;
            end: string;
        };
        frameworks: ("CSRD" | "GRI" | "SDG")[];
        completeness: number;
        generatedAt: string;
    }, {
        status: "draft" | "generating" | "ready" | "failed";
        companyId: string;
        id: string;
        period: {
            start: string;
            end: string;
        };
        frameworks: ("CSRD" | "GRI" | "SDG")[];
        completeness: number;
        generatedAt: string;
    }>, "many">;
    total: z.ZodNumber;
}, "strip", z.ZodTypeAny, {
    total: number;
    packs: {
        status: "draft" | "generating" | "ready" | "failed";
        companyId: string;
        id: string;
        period: {
            start: string;
            end: string;
        };
        frameworks: ("CSRD" | "GRI" | "SDG")[];
        completeness: number;
        generatedAt: string;
    }[];
}, {
    total: number;
    packs: {
        status: "draft" | "generating" | "ready" | "failed";
        companyId: string;
        id: string;
        period: {
            start: string;
            end: string;
        };
        frameworks: ("CSRD" | "GRI" | "SDG")[];
        completeness: number;
        generatedAt: string;
    }[];
}>;
export type ListPacksResponse = z.infer<typeof ListPacksResponseSchema>;
/**
 * Validation Error
 * Pre-submit validation error
 */
export declare const ValidationErrorSchema: z.ZodObject<{
    code: z.ZodEnum<["MISSING_EVIDENCE", "STALE_METRICS", "MISSING_MANDATORY", "INVALID_PERIOD", "INSUFFICIENT_DATA"]>;
    message: z.ZodString;
    disclosureId: z.ZodOptional<z.ZodString>;
    severity: z.ZodEnum<["error", "warning"]>;
    details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
}, "strip", z.ZodTypeAny, {
    code: "MISSING_EVIDENCE" | "STALE_METRICS" | "MISSING_MANDATORY" | "INVALID_PERIOD" | "INSUFFICIENT_DATA";
    message: string;
    severity: "error" | "warning";
    disclosureId?: string | undefined;
    details?: Record<string, any> | undefined;
}, {
    code: "MISSING_EVIDENCE" | "STALE_METRICS" | "MISSING_MANDATORY" | "INVALID_PERIOD" | "INSUFFICIENT_DATA";
    message: string;
    severity: "error" | "warning";
    disclosureId?: string | undefined;
    details?: Record<string, any> | undefined;
}>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;
/**
 * Validation Result
 * Result of pre-submit validation
 */
export declare const ValidationResultSchema: z.ZodObject<{
    valid: z.ZodBoolean;
    errors: z.ZodArray<z.ZodObject<{
        code: z.ZodEnum<["MISSING_EVIDENCE", "STALE_METRICS", "MISSING_MANDATORY", "INVALID_PERIOD", "INSUFFICIENT_DATA"]>;
        message: z.ZodString;
        disclosureId: z.ZodOptional<z.ZodString>;
        severity: z.ZodEnum<["error", "warning"]>;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        code: "MISSING_EVIDENCE" | "STALE_METRICS" | "MISSING_MANDATORY" | "INVALID_PERIOD" | "INSUFFICIENT_DATA";
        message: string;
        severity: "error" | "warning";
        disclosureId?: string | undefined;
        details?: Record<string, any> | undefined;
    }, {
        code: "MISSING_EVIDENCE" | "STALE_METRICS" | "MISSING_MANDATORY" | "INVALID_PERIOD" | "INSUFFICIENT_DATA";
        message: string;
        severity: "error" | "warning";
        disclosureId?: string | undefined;
        details?: Record<string, any> | undefined;
    }>, "many">;
    warnings: z.ZodArray<z.ZodObject<{
        code: z.ZodEnum<["MISSING_EVIDENCE", "STALE_METRICS", "MISSING_MANDATORY", "INVALID_PERIOD", "INSUFFICIENT_DATA"]>;
        message: z.ZodString;
        disclosureId: z.ZodOptional<z.ZodString>;
        severity: z.ZodEnum<["error", "warning"]>;
        details: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodAny>>;
    }, "strip", z.ZodTypeAny, {
        code: "MISSING_EVIDENCE" | "STALE_METRICS" | "MISSING_MANDATORY" | "INVALID_PERIOD" | "INSUFFICIENT_DATA";
        message: string;
        severity: "error" | "warning";
        disclosureId?: string | undefined;
        details?: Record<string, any> | undefined;
    }, {
        code: "MISSING_EVIDENCE" | "STALE_METRICS" | "MISSING_MANDATORY" | "INVALID_PERIOD" | "INSUFFICIENT_DATA";
        message: string;
        severity: "error" | "warning";
        disclosureId?: string | undefined;
        details?: Record<string, any> | undefined;
    }>, "many">;
}, "strip", z.ZodTypeAny, {
    valid: boolean;
    errors: {
        code: "MISSING_EVIDENCE" | "STALE_METRICS" | "MISSING_MANDATORY" | "INVALID_PERIOD" | "INSUFFICIENT_DATA";
        message: string;
        severity: "error" | "warning";
        disclosureId?: string | undefined;
        details?: Record<string, any> | undefined;
    }[];
    warnings: {
        code: "MISSING_EVIDENCE" | "STALE_METRICS" | "MISSING_MANDATORY" | "INVALID_PERIOD" | "INSUFFICIENT_DATA";
        message: string;
        severity: "error" | "warning";
        disclosureId?: string | undefined;
        details?: Record<string, any> | undefined;
    }[];
}, {
    valid: boolean;
    errors: {
        code: "MISSING_EVIDENCE" | "STALE_METRICS" | "MISSING_MANDATORY" | "INVALID_PERIOD" | "INSUFFICIENT_DATA";
        message: string;
        severity: "error" | "warning";
        disclosureId?: string | undefined;
        details?: Record<string, any> | undefined;
    }[];
    warnings: {
        code: "MISSING_EVIDENCE" | "STALE_METRICS" | "MISSING_MANDATORY" | "INVALID_PERIOD" | "INSUFFICIENT_DATA";
        message: string;
        severity: "error" | "warning";
        disclosureId?: string | undefined;
        details?: Record<string, any> | undefined;
    }[];
}>;
export type ValidationResult = z.infer<typeof ValidationResultSchema>;
//# sourceMappingURL=regulatory.d.ts.map