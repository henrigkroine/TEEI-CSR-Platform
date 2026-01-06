import { z } from 'zod';
export declare const SafetyReviewCompletedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"safety.review.completed">;
    data: z.ZodObject<{
        reviewId: z.ZodString;
        flagId: z.ZodString;
        reviewerId: z.ZodString;
        decision: z.ZodEnum<["approved", "rejected", "escalated"]>;
        notes: z.ZodOptional<z.ZodString>;
        completedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        completedAt: string;
        flagId: string;
        reviewId: string;
        reviewerId: string;
        decision: "approved" | "rejected" | "escalated";
        notes?: string | undefined;
    }, {
        completedAt: string;
        flagId: string;
        reviewId: string;
        reviewerId: string;
        decision: "approved" | "rejected" | "escalated";
        notes?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "safety.review.completed";
    data: {
        completedAt: string;
        flagId: string;
        reviewId: string;
        reviewerId: string;
        decision: "approved" | "rejected" | "escalated";
        notes?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "safety.review.completed";
    data: {
        completedAt: string;
        flagId: string;
        reviewId: string;
        reviewerId: string;
        decision: "approved" | "rejected" | "escalated";
        notes?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type SafetyReviewCompleted = z.infer<typeof SafetyReviewCompletedSchema>;
//# sourceMappingURL=review-completed.d.ts.map