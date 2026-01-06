import { z } from 'zod';
/**
 * Agent 22: event-contract-enricher
 * Enhanced with program context for better tracking and rollups
 */
export declare const BuddyMatchCreatedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"buddy.match.created">;
    data: z.ZodObject<{
        matchId: z.ZodString;
        participantId: z.ZodString;
        buddyId: z.ZodString;
        matchedAt: z.ZodString;
        matchingCriteria: z.ZodOptional<z.ZodObject<{
            language: z.ZodOptional<z.ZodString>;
            interests: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
            location: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            language?: string | undefined;
            interests?: string[] | undefined;
            location?: string | undefined;
        }, {
            language?: string | undefined;
            interests?: string[] | undefined;
            location?: string | undefined;
        }>>;
        programId: z.ZodOptional<z.ZodString>;
        campaignId: z.ZodOptional<z.ZodString>;
        beneficiaryGroupId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        matchId: string;
        participantId: string;
        buddyId: string;
        matchedAt: string;
        matchingCriteria?: {
            language?: string | undefined;
            interests?: string[] | undefined;
            location?: string | undefined;
        } | undefined;
        programId?: string | undefined;
        campaignId?: string | undefined;
        beneficiaryGroupId?: string | undefined;
    }, {
        matchId: string;
        participantId: string;
        buddyId: string;
        matchedAt: string;
        matchingCriteria?: {
            language?: string | undefined;
            interests?: string[] | undefined;
            location?: string | undefined;
        } | undefined;
        programId?: string | undefined;
        campaignId?: string | undefined;
        beneficiaryGroupId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "buddy.match.created";
    data: {
        matchId: string;
        participantId: string;
        buddyId: string;
        matchedAt: string;
        matchingCriteria?: {
            language?: string | undefined;
            interests?: string[] | undefined;
            location?: string | undefined;
        } | undefined;
        programId?: string | undefined;
        campaignId?: string | undefined;
        beneficiaryGroupId?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "buddy.match.created";
    data: {
        matchId: string;
        participantId: string;
        buddyId: string;
        matchedAt: string;
        matchingCriteria?: {
            language?: string | undefined;
            interests?: string[] | undefined;
            location?: string | undefined;
        } | undefined;
        programId?: string | undefined;
        campaignId?: string | undefined;
        beneficiaryGroupId?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type BuddyMatchCreated = z.infer<typeof BuddyMatchCreatedSchema>;
//# sourceMappingURL=match-created.d.ts.map