import { z } from 'zod';
export declare const KintellSessionScheduledSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"kintell.session.scheduled">;
    data: z.ZodObject<{
        sessionId: z.ZodString;
        externalSessionId: z.ZodOptional<z.ZodString>;
        sessionType: z.ZodEnum<["language", "mentorship"]>;
        participantId: z.ZodString;
        volunteerId: z.ZodString;
        scheduledAt: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        participantId: string;
        sessionId: string;
        scheduledAt: string;
        sessionType: "language" | "mentorship";
        volunteerId: string;
        externalSessionId?: string | undefined;
    }, {
        participantId: string;
        sessionId: string;
        scheduledAt: string;
        sessionType: "language" | "mentorship";
        volunteerId: string;
        externalSessionId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "kintell.session.scheduled";
    data: {
        participantId: string;
        sessionId: string;
        scheduledAt: string;
        sessionType: "language" | "mentorship";
        volunteerId: string;
        externalSessionId?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "kintell.session.scheduled";
    data: {
        participantId: string;
        sessionId: string;
        scheduledAt: string;
        sessionType: "language" | "mentorship";
        volunteerId: string;
        externalSessionId?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type KintellSessionScheduled = z.infer<typeof KintellSessionScheduledSchema>;
//# sourceMappingURL=session-scheduled.d.ts.map