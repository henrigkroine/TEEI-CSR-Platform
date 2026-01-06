import { z } from 'zod';
export declare const NLQCacheInvalidatedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"nlq.cache.invalidated">;
    data: z.ZodObject<{
        companyId: z.ZodOptional<z.ZodString>;
        templateId: z.ZodOptional<z.ZodString>;
        pattern: z.ZodOptional<z.ZodString>;
        keysInvalidated: z.ZodNumber;
        reason: z.ZodEnum<["manual", "data_update", "metrics_updated", "scheduled"]>;
        invalidatedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        reason: "manual" | "data_update" | "metrics_updated" | "scheduled";
        keysInvalidated: number;
        invalidatedAt: string;
        companyId?: string | undefined;
        templateId?: string | undefined;
        pattern?: string | undefined;
    }, {
        reason: "manual" | "data_update" | "metrics_updated" | "scheduled";
        keysInvalidated: number;
        invalidatedAt: string;
        companyId?: string | undefined;
        templateId?: string | undefined;
        pattern?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "nlq.cache.invalidated";
    data: {
        reason: "manual" | "data_update" | "metrics_updated" | "scheduled";
        keysInvalidated: number;
        invalidatedAt: string;
        companyId?: string | undefined;
        templateId?: string | undefined;
        pattern?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "nlq.cache.invalidated";
    data: {
        reason: "manual" | "data_update" | "metrics_updated" | "scheduled";
        keysInvalidated: number;
        invalidatedAt: string;
        companyId?: string | undefined;
        templateId?: string | undefined;
        pattern?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type NLQCacheInvalidated = z.infer<typeof NLQCacheInvalidatedSchema>;
//# sourceMappingURL=cache-invalidated.d.ts.map