import { z } from 'zod';
export declare const NLQQueryRejectedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"nlq.query.rejected">;
    data: z.ZodObject<{
        queryId: z.ZodString;
        companyId: z.ZodString;
        userId: z.ZodOptional<z.ZodString>;
        normalizedQuestion: z.ZodString;
        rejectionReason: z.ZodEnum<["unsafe_content", "pii_detected", "rate_limit", "invalid_intent", "blacklisted_pattern"]>;
        safetyScore: z.ZodOptional<z.ZodNumber>;
        rejectedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        queryId: string;
        companyId: string;
        normalizedQuestion: string;
        rejectionReason: "unsafe_content" | "pii_detected" | "rate_limit" | "invalid_intent" | "blacklisted_pattern";
        rejectedAt: string;
        userId?: string | undefined;
        safetyScore?: number | undefined;
    }, {
        queryId: string;
        companyId: string;
        normalizedQuestion: string;
        rejectionReason: "unsafe_content" | "pii_detected" | "rate_limit" | "invalid_intent" | "blacklisted_pattern";
        rejectedAt: string;
        userId?: string | undefined;
        safetyScore?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "nlq.query.rejected";
    data: {
        queryId: string;
        companyId: string;
        normalizedQuestion: string;
        rejectionReason: "unsafe_content" | "pii_detected" | "rate_limit" | "invalid_intent" | "blacklisted_pattern";
        rejectedAt: string;
        userId?: string | undefined;
        safetyScore?: number | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "nlq.query.rejected";
    data: {
        queryId: string;
        companyId: string;
        normalizedQuestion: string;
        rejectionReason: "unsafe_content" | "pii_detected" | "rate_limit" | "invalid_intent" | "blacklisted_pattern";
        rejectedAt: string;
        userId?: string | undefined;
        safetyScore?: number | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type NLQQueryRejected = z.infer<typeof NLQQueryRejectedSchema>;
//# sourceMappingURL=query-rejected.d.ts.map