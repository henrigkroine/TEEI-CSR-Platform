import { z } from 'zod';
export declare const BuddyFeedbackSubmittedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"buddy.feedback.submitted">;
    data: z.ZodObject<{
        feedbackId: z.ZodString;
        matchId: z.ZodString;
        fromRole: z.ZodEnum<["participant", "buddy"]>;
        rating: z.ZodNumber;
        feedbackText: z.ZodOptional<z.ZodString>;
        submittedAt: z.ZodString;
        categories: z.ZodOptional<z.ZodObject<{
            communication: z.ZodOptional<z.ZodNumber>;
            helpfulness: z.ZodOptional<z.ZodNumber>;
            engagement: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            communication?: number | undefined;
            helpfulness?: number | undefined;
            engagement?: number | undefined;
        }, {
            communication?: number | undefined;
            helpfulness?: number | undefined;
            engagement?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        matchId: string;
        feedbackId: string;
        fromRole: "participant" | "buddy";
        rating: number;
        submittedAt: string;
        categories?: {
            communication?: number | undefined;
            helpfulness?: number | undefined;
            engagement?: number | undefined;
        } | undefined;
        feedbackText?: string | undefined;
    }, {
        matchId: string;
        feedbackId: string;
        fromRole: "participant" | "buddy";
        rating: number;
        submittedAt: string;
        categories?: {
            communication?: number | undefined;
            helpfulness?: number | undefined;
            engagement?: number | undefined;
        } | undefined;
        feedbackText?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "buddy.feedback.submitted";
    data: {
        matchId: string;
        feedbackId: string;
        fromRole: "participant" | "buddy";
        rating: number;
        submittedAt: string;
        categories?: {
            communication?: number | undefined;
            helpfulness?: number | undefined;
            engagement?: number | undefined;
        } | undefined;
        feedbackText?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "buddy.feedback.submitted";
    data: {
        matchId: string;
        feedbackId: string;
        fromRole: "participant" | "buddy";
        rating: number;
        submittedAt: string;
        categories?: {
            communication?: number | undefined;
            helpfulness?: number | undefined;
            engagement?: number | undefined;
        } | undefined;
        feedbackText?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type BuddyFeedbackSubmitted = z.infer<typeof BuddyFeedbackSubmittedSchema>;
//# sourceMappingURL=feedback-submitted.d.ts.map