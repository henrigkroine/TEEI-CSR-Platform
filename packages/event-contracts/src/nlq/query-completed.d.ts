import { z } from 'zod';
export declare const NLQQueryCompletedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"nlq.query.completed">;
    data: z.ZodObject<{
        queryId: z.ZodString;
        companyId: z.ZodString;
        userId: z.ZodOptional<z.ZodString>;
        templateId: z.ZodString;
        executionTimeMs: z.ZodNumber;
        cached: z.ZodBoolean;
        resultRowCount: z.ZodNumber;
        confidence: z.ZodNumber;
        safetyPassed: z.ZodBoolean;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        completedAt: string;
        confidence: number;
        queryId: string;
        companyId: string;
        templateId: string;
        executionTimeMs: number;
        cached: boolean;
        resultRowCount: number;
        safetyPassed: boolean;
        userId?: string | undefined;
    }, {
        completedAt: string;
        confidence: number;
        queryId: string;
        companyId: string;
        templateId: string;
        executionTimeMs: number;
        cached: boolean;
        resultRowCount: number;
        safetyPassed: boolean;
        userId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "nlq.query.completed";
    data: {
        completedAt: string;
        confidence: number;
        queryId: string;
        companyId: string;
        templateId: string;
        executionTimeMs: number;
        cached: boolean;
        resultRowCount: number;
        safetyPassed: boolean;
        userId?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "nlq.query.completed";
    data: {
        completedAt: string;
        confidence: number;
        queryId: string;
        companyId: string;
        templateId: string;
        executionTimeMs: number;
        cached: boolean;
        resultRowCount: number;
        safetyPassed: boolean;
        userId?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type NLQQueryCompleted = z.infer<typeof NLQQueryCompletedSchema>;
//# sourceMappingURL=query-completed.d.ts.map