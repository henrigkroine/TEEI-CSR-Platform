import { z } from 'zod';
export declare const BuddyCheckinCompletedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"buddy.checkin.completed">;
    data: z.ZodObject<{
        checkinId: z.ZodString;
        matchId: z.ZodString;
        checkinDate: z.ZodString;
        mood: z.ZodOptional<z.ZodEnum<["great", "good", "okay", "struggling", "difficult"]>>;
        notes: z.ZodOptional<z.ZodString>;
        questionResponses: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        matchId: string;
        checkinId: string;
        checkinDate: string;
        mood?: "great" | "good" | "okay" | "struggling" | "difficult" | undefined;
        notes?: string | undefined;
        questionResponses?: Record<string, unknown> | undefined;
    }, {
        matchId: string;
        checkinId: string;
        checkinDate: string;
        mood?: "great" | "good" | "okay" | "struggling" | "difficult" | undefined;
        notes?: string | undefined;
        questionResponses?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "buddy.checkin.completed";
    data: {
        matchId: string;
        checkinId: string;
        checkinDate: string;
        mood?: "great" | "good" | "okay" | "struggling" | "difficult" | undefined;
        notes?: string | undefined;
        questionResponses?: Record<string, unknown> | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "buddy.checkin.completed";
    data: {
        matchId: string;
        checkinId: string;
        checkinDate: string;
        mood?: "great" | "good" | "okay" | "struggling" | "difficult" | undefined;
        notes?: string | undefined;
        questionResponses?: Record<string, unknown> | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type BuddyCheckinCompleted = z.infer<typeof BuddyCheckinCompletedSchema>;
//# sourceMappingURL=checkin-completed.d.ts.map