import { z } from 'zod';
/**
 * Agent 22: event-contract-enricher
 * Enhanced with program context for better tracking and rollups
 */
export declare const KintellSessionCompletedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"kintell.session.completed">;
    data: z.ZodObject<{
        sessionId: z.ZodString;
        externalSessionId: z.ZodOptional<z.ZodString>;
        sessionType: z.ZodEnum<["language", "mentorship"]>;
        participantId: z.ZodString;
        volunteerId: z.ZodString;
        scheduledAt: z.ZodString;
        completedAt: z.ZodString;
        durationMinutes: z.ZodNumber;
        topics: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        languageLevel: z.ZodOptional<z.ZodString>;
        programId: z.ZodOptional<z.ZodString>;
        campaignId: z.ZodOptional<z.ZodString>;
        beneficiaryGroupId: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        participantId: string;
        durationMinutes: number;
        sessionId: string;
        completedAt: string;
        scheduledAt: string;
        sessionType: "language" | "mentorship";
        volunteerId: string;
        programId?: string | undefined;
        campaignId?: string | undefined;
        beneficiaryGroupId?: string | undefined;
        externalSessionId?: string | undefined;
        topics?: string[] | undefined;
        languageLevel?: string | undefined;
    }, {
        participantId: string;
        durationMinutes: number;
        sessionId: string;
        completedAt: string;
        scheduledAt: string;
        sessionType: "language" | "mentorship";
        volunteerId: string;
        programId?: string | undefined;
        campaignId?: string | undefined;
        beneficiaryGroupId?: string | undefined;
        externalSessionId?: string | undefined;
        topics?: string[] | undefined;
        languageLevel?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "kintell.session.completed";
    data: {
        participantId: string;
        durationMinutes: number;
        sessionId: string;
        completedAt: string;
        scheduledAt: string;
        sessionType: "language" | "mentorship";
        volunteerId: string;
        programId?: string | undefined;
        campaignId?: string | undefined;
        beneficiaryGroupId?: string | undefined;
        externalSessionId?: string | undefined;
        topics?: string[] | undefined;
        languageLevel?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "kintell.session.completed";
    data: {
        participantId: string;
        durationMinutes: number;
        sessionId: string;
        completedAt: string;
        scheduledAt: string;
        sessionType: "language" | "mentorship";
        volunteerId: string;
        programId?: string | undefined;
        campaignId?: string | undefined;
        beneficiaryGroupId?: string | undefined;
        externalSessionId?: string | undefined;
        topics?: string[] | undefined;
        languageLevel?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type KintellSessionCompleted = z.infer<typeof KintellSessionCompletedSchema>;
//# sourceMappingURL=session-completed.d.ts.map