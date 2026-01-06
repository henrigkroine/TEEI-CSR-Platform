import { z } from 'zod';
export declare const SafetyFlagRaisedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"safety.flag.raised">;
    data: z.ZodObject<{
        flagId: z.ZodString;
        contentId: z.ZodString;
        contentType: z.ZodEnum<["feedback_text", "checkin_note", "message", "other"]>;
        flagReason: z.ZodEnum<["profanity", "pii_leakage", "hate_speech", "other"]>;
        confidence: z.ZodNumber;
        requiresHumanReview: z.ZodBoolean;
        raisedAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        flagId: string;
        contentId: string;
        contentType: "message" | "other" | "feedback_text" | "checkin_note";
        flagReason: "other" | "profanity" | "pii_leakage" | "hate_speech";
        confidence: number;
        requiresHumanReview: boolean;
        raisedAt: string;
    }, {
        flagId: string;
        contentId: string;
        contentType: "message" | "other" | "feedback_text" | "checkin_note";
        flagReason: "other" | "profanity" | "pii_leakage" | "hate_speech";
        confidence: number;
        requiresHumanReview: boolean;
        raisedAt: string;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "safety.flag.raised";
    data: {
        flagId: string;
        contentId: string;
        contentType: "message" | "other" | "feedback_text" | "checkin_note";
        flagReason: "other" | "profanity" | "pii_leakage" | "hate_speech";
        confidence: number;
        requiresHumanReview: boolean;
        raisedAt: string;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "safety.flag.raised";
    data: {
        flagId: string;
        contentId: string;
        contentType: "message" | "other" | "feedback_text" | "checkin_note";
        flagReason: "other" | "profanity" | "pii_leakage" | "hate_speech";
        confidence: number;
        requiresHumanReview: boolean;
        raisedAt: string;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type SafetyFlagRaised = z.infer<typeof SafetyFlagRaisedSchema>;
//# sourceMappingURL=flag-raised.d.ts.map