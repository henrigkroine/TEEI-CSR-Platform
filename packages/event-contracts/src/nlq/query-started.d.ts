import { z } from 'zod';
export declare const NLQQueryStartedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"nlq.query.started">;
    data: z.ZodObject<{
        queryId: z.ZodString;
        companyId: z.ZodString;
        userId: z.ZodOptional<z.ZodString>;
        normalizedQuestion: z.ZodString;
        templateId: z.ZodOptional<z.ZodString>;
        startedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        queryId: string;
        companyId: string;
        normalizedQuestion: string;
        startedAt: string;
        userId?: string | undefined;
        templateId?: string | undefined;
    }, {
        queryId: string;
        companyId: string;
        normalizedQuestion: string;
        startedAt: string;
        userId?: string | undefined;
        templateId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "nlq.query.started";
    data: {
        queryId: string;
        companyId: string;
        normalizedQuestion: string;
        startedAt: string;
        userId?: string | undefined;
        templateId?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "nlq.query.started";
    data: {
        queryId: string;
        companyId: string;
        normalizedQuestion: string;
        startedAt: string;
        userId?: string | undefined;
        templateId?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type NLQQueryStarted = z.infer<typeof NLQQueryStartedSchema>;
//# sourceMappingURL=query-started.d.ts.map