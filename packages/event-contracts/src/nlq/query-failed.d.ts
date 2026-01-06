import { z } from 'zod';
export declare const NLQQueryFailedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"nlq.query.failed">;
    data: z.ZodObject<{
        queryId: z.ZodString;
        companyId: z.ZodString;
        userId: z.ZodOptional<z.ZodString>;
        normalizedQuestion: z.ZodString;
        templateId: z.ZodOptional<z.ZodString>;
        errorMessage: z.ZodString;
        errorType: z.ZodEnum<["validation", "execution", "timeout", "unknown"]>;
        executionTimeMs: z.ZodNumber;
        failedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        queryId: string;
        companyId: string;
        normalizedQuestion: string;
        executionTimeMs: number;
        errorMessage: string;
        errorType: "validation" | "unknown" | "execution" | "timeout";
        failedAt: string;
        userId?: string | undefined;
        templateId?: string | undefined;
    }, {
        queryId: string;
        companyId: string;
        normalizedQuestion: string;
        executionTimeMs: number;
        errorMessage: string;
        errorType: "validation" | "unknown" | "execution" | "timeout";
        failedAt: string;
        userId?: string | undefined;
        templateId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "nlq.query.failed";
    data: {
        queryId: string;
        companyId: string;
        normalizedQuestion: string;
        executionTimeMs: number;
        errorMessage: string;
        errorType: "validation" | "unknown" | "execution" | "timeout";
        failedAt: string;
        userId?: string | undefined;
        templateId?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "nlq.query.failed";
    data: {
        queryId: string;
        companyId: string;
        normalizedQuestion: string;
        executionTimeMs: number;
        errorMessage: string;
        errorType: "validation" | "unknown" | "execution" | "timeout";
        failedAt: string;
        userId?: string | undefined;
        templateId?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type NLQQueryFailed = z.infer<typeof NLQQueryFailedSchema>;
//# sourceMappingURL=query-failed.d.ts.map