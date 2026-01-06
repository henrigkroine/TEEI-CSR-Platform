import { z } from 'zod';
/**
 * Regulatory Packs Types
 * For CSRD/GRI/SDG annex generation with machine-readable artifacts
 */
// ============================================================================
// ENUMS & CONSTANTS
// ============================================================================
export const FrameworkType = z.enum(['CSRD', 'GRI', 'SDG']);
export const DisclosureStatus = z.enum(['complete', 'partial', 'missing', 'not_applicable']);
export const PackStatus = z.enum(['draft', 'generating', 'ready', 'failed']);
// ============================================================================
// FRAMEWORK STRUCTURES
// ============================================================================
/**
 * CSRD ESRS Topic
 * Based on European Sustainability Reporting Standards (ESRS)
 */
export const ESRSTopicSchema = z.object({
    id: z.string(), // e.g., "ESRS-E1", "ESRS-S1"
    name: z.string(), // e.g., "Climate change", "Own workforce"
    category: z.enum(['environmental', 'social', 'governance']),
    version: z.string(), // e.g., "2023-11"
    disclosures: z.array(z.object({
        id: z.string(), // e.g., "E1-1", "S1-5"
        title: z.string(),
        description: z.string(),
        mandatory: z.boolean(),
        dataPoints: z.array(z.object({
            id: z.string(),
            name: z.string(),
            type: z.enum(['narrative', 'quantitative', 'qualitative']),
            unit: z.string().optional(),
            required: z.boolean(),
        })),
    })),
});
/**
 * GRI Disclosure
 * Based on Global Reporting Initiative standards
 */
export const GRIDisclosureSchema = z.object({
    id: z.string(), // e.g., "GRI-2-1", "GRI-305-1"
    title: z.string(),
    description: z.string(),
    standard: z.string(), // e.g., "GRI 2: General Disclosures 2021"
    version: z.string(),
    category: z.enum(['universal', 'topic-specific']),
    requirements: z.array(z.object({
        id: z.string(),
        text: z.string(),
        type: z.enum(['narrative', 'quantitative', 'qualitative']),
        guidance: z.string().optional(),
    })),
    sdgMappings: z.array(z.string()).optional(), // e.g., ["SDG-8", "SDG-10"]
});
/**
 * SDG Target
 * Based on UN Sustainable Development Goals
 */
export const SDGTargetSchema = z.object({
    goal: z.number().min(1).max(17), // SDG 1-17
    goalName: z.string(),
    target: z.string(), // e.g., "8.5", "10.2"
    targetText: z.string(),
    indicators: z.array(z.object({
        id: z.string(), // e.g., "8.5.1", "10.2.1"
        description: z.string(),
        tier: z.enum(['I', 'II', 'III']).optional(),
    })),
});
// ============================================================================
// EVIDENCE & MAPPING
// ============================================================================
/**
 * Evidence Reference
 * Links evidence to disclosure requirements
 */
export const EvidenceRefSchema = z.object({
    evidenceId: z.string().uuid(),
    snippetId: z.string().uuid().optional(),
    source: z.string(), // e.g., "Buddy feedback Q1 2024"
    timestamp: z.string().datetime(),
    relevanceScore: z.number().min(0).max(1),
    excerpt: z.string().max(500), // Redacted snippet
    metrics: z.array(z.string()).optional(), // Related metrics: ["sroi", "vis"]
});
/**
 * Disclosure Mapping
 * Maps a disclosure requirement to available evidence
 */
export const DisclosureMappingSchema = z.object({
    disclosureId: z.string(),
    frameworkType: FrameworkType,
    status: DisclosureStatus,
    completenessScore: z.number().min(0).max(1), // 0 = no data, 1 = complete
    evidence: z.array(EvidenceRefSchema),
    gaps: z.array(z.object({
        requirementId: z.string(),
        description: z.string(),
        suggestedAction: z.string(), // e.g., "Enable Benevity connector"
    })),
    lastUpdated: z.string().datetime(),
});
// ============================================================================
// PACK GENERATION
// ============================================================================
/**
 * Regulatory Pack Request
 * Payload for generating a regulatory pack
 */
export const GeneratePackRequestSchema = z.object({
    companyId: z.string().uuid(),
    period: z.object({
        start: z.string().date(), // ISO 8601 (YYYY-MM-DD)
        end: z.string().date(),
    }),
    frameworks: z.array(FrameworkType).min(1), // At least one framework
    entities: z.array(z.string()).optional(), // Entity IDs if multi-entity
    evidenceScope: z.object({
        programs: z.array(z.enum(['buddy', 'language', 'mentorship', 'upskilling'])).optional(),
        metrics: z.array(z.string()).optional(), // e.g., ["sroi", "vis"]
        includeStale: z.boolean().default(false), // Include metrics >90 days old
    }).optional(),
    options: z.object({
        language: z.enum(['en', 'es', 'fr', 'uk', 'no']).default('en'),
        includeGaps: z.boolean().default(true),
        pdfOptions: z.object({
            includeTOC: z.boolean().default(true),
            includeFootnotes: z.boolean().default(true),
            watermark: z.boolean().default(true),
        }).optional(),
    }).optional(),
});
/**
 * Gap Item
 * Represents a data gap in regulatory compliance
 */
export const GapItemSchema = z.object({
    disclosureId: z.string(),
    framework: FrameworkType,
    requirementId: z.string(),
    title: z.string(),
    severity: z.enum(['critical', 'high', 'medium', 'low']),
    description: z.string(),
    suggestedAction: z.string(),
    affectedMetrics: z.array(z.string()).optional(),
});
/**
 * Pack Section
 * A section in the generated regulatory pack
 */
export const PackSectionSchema = z.object({
    framework: FrameworkType,
    disclosureId: z.string(),
    title: z.string(),
    status: DisclosureStatus,
    content: z.object({
        narrative: z.string().optional(),
        tables: z.array(z.object({
            title: z.string(),
            headers: z.array(z.string()),
            rows: z.array(z.array(z.string())),
        })).optional(),
        metrics: z.array(z.object({
            name: z.string(),
            value: z.union([z.string(), z.number()]),
            unit: z.string().optional(),
            evidenceId: z.string().uuid().optional(),
        })).optional(),
    }),
    citations: z.array(EvidenceRefSchema),
    pageNumber: z.number().optional(), // For PDF generation
});
/**
 * Pack Summary
 * Overview of pack completeness and status
 */
export const PackSummarySchema = z.object({
    totalDisclosures: z.number(),
    completedDisclosures: z.number(),
    partialDisclosures: z.number(),
    missingDisclosures: z.number(),
    overallCompleteness: z.number().min(0).max(1), // Percentage
    byFramework: z.array(z.object({
        framework: FrameworkType,
        completeness: z.number().min(0).max(1),
        disclosureCount: z.number(),
    })),
    criticalGaps: z.number(),
    lastUpdated: z.string().datetime(),
});
/**
 * Regulatory Pack (Full)
 * Complete pack with all sections and metadata
 */
export const RegulatoryPackSchema = z.object({
    id: z.string().uuid(),
    companyId: z.string().uuid(),
    period: z.object({
        start: z.string().date(),
        end: z.string().date(),
    }),
    frameworks: z.array(FrameworkType),
    status: PackStatus,
    summary: PackSummarySchema,
    sections: z.array(PackSectionSchema),
    gaps: z.array(GapItemSchema),
    metadata: z.object({
        generatedAt: z.string().datetime(),
        version: z.string(), // Registry version (e.g., "CSRD-2023-11")
        language: z.string(),
        evidenceCount: z.number(),
    }),
});
// ============================================================================
// API RESPONSES
// ============================================================================
/**
 * Generate Pack Response
 * Response from POST /regulatory/packs
 */
export const GeneratePackResponseSchema = z.object({
    packId: z.string().uuid(),
    status: PackStatus,
    message: z.string().optional(),
    estimatedCompletionTime: z.number().optional(), // Seconds
});
/**
 * Get Pack Response
 * Response from GET /regulatory/packs/:id
 */
export const GetPackResponseSchema = RegulatoryPackSchema;
/**
 * Pack List Item
 * Summary for listing packs
 */
export const PackListItemSchema = z.object({
    id: z.string().uuid(),
    companyId: z.string().uuid(),
    frameworks: z.array(FrameworkType),
    period: z.object({
        start: z.string().date(),
        end: z.string().date(),
    }),
    status: PackStatus,
    completeness: z.number().min(0).max(1),
    generatedAt: z.string().datetime(),
});
/**
 * List Packs Response
 * Response from GET /regulatory/packs (list all)
 */
export const ListPacksResponseSchema = z.object({
    packs: z.array(PackListItemSchema),
    total: z.number(),
});
// ============================================================================
// VALIDATION ERRORS
// ============================================================================
/**
 * Validation Error
 * Pre-submit validation error
 */
export const ValidationErrorSchema = z.object({
    code: z.enum([
        'MISSING_EVIDENCE',
        'STALE_METRICS',
        'MISSING_MANDATORY',
        'INVALID_PERIOD',
        'INSUFFICIENT_DATA',
    ]),
    message: z.string(),
    disclosureId: z.string().optional(),
    severity: z.enum(['error', 'warning']),
    details: z.record(z.any()).optional(),
});
/**
 * Validation Result
 * Result of pre-submit validation
 */
export const ValidationResultSchema = z.object({
    valid: z.boolean(),
    errors: z.array(ValidationErrorSchema),
    warnings: z.array(ValidationErrorSchema),
});
//# sourceMappingURL=regulatory.js.map