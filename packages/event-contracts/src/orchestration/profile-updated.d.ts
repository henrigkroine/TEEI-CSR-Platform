import { z } from 'zod';
export declare const OrchestrationProfileUpdatedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"orchestration.profile.updated">;
    data: z.ZodObject<{
        userId: z.ZodString;
        updatedFields: z.ZodArray<z.ZodString, "many">;
        updatedAt: z.ZodString;
        trigger: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        updatedAt: string;
        updatedFields: string[];
        trigger?: string | undefined;
    }, {
        userId: string;
        updatedAt: string;
        updatedFields: string[];
        trigger?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "orchestration.profile.updated";
    data: {
        userId: string;
        updatedAt: string;
        updatedFields: string[];
        trigger?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "orchestration.profile.updated";
    data: {
        userId: string;
        updatedAt: string;
        updatedFields: string[];
        trigger?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type OrchestrationProfileUpdated = z.infer<typeof OrchestrationProfileUpdatedSchema>;
//# sourceMappingURL=profile-updated.d.ts.map