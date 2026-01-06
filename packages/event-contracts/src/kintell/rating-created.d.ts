import { z } from 'zod';
export declare const KintellRatingCreatedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"kintell.rating.created">;
    data: z.ZodObject<{
        ratingId: z.ZodString;
        sessionId: z.ZodString;
        fromRole: z.ZodEnum<["participant", "volunteer"]>;
        rating: z.ZodNumber;
        feedbackText: z.ZodOptional<z.ZodString>;
        createdAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        sessionId: string;
        fromRole: "participant" | "volunteer";
        rating: number;
        ratingId: string;
        createdAt: string;
        feedbackText?: string | undefined;
    }, {
        sessionId: string;
        fromRole: "participant" | "volunteer";
        rating: number;
        ratingId: string;
        createdAt: string;
        feedbackText?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "kintell.rating.created";
    data: {
        sessionId: string;
        fromRole: "participant" | "volunteer";
        rating: number;
        ratingId: string;
        createdAt: string;
        feedbackText?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "kintell.rating.created";
    data: {
        sessionId: string;
        fromRole: "participant" | "volunteer";
        rating: number;
        ratingId: string;
        createdAt: string;
        feedbackText?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type KintellRatingCreated = z.infer<typeof KintellRatingCreatedSchema>;
//# sourceMappingURL=rating-created.d.ts.map