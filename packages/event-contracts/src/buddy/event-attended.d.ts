import { z } from 'zod';
/**
 * Event emitted when a participant attends a buddy program event.
 *
 * This event captures attendance at formal buddy program events
 * (distinct from informal hangouts logged in buddy.event.logged).
 * Used for CSR Platform metrics: SROI, VIS, engagement tracking.
 */
export declare const BuddyEventAttendedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"buddy.event.attended">;
    data: z.ZodObject<{
        eventId: z.ZodString;
        userId: z.ZodString;
        matchId: z.ZodOptional<z.ZodString>;
        eventTitle: z.ZodString;
        eventType: z.ZodEnum<["cultural", "educational", "professional", "social", "support", "recreational", "language", "other"]>;
        eventFormat: z.ZodEnum<["in-person", "online", "hybrid"]>;
        attendedAt: z.ZodString;
        location: z.ZodOptional<z.ZodString>;
        durationMinutes: z.ZodOptional<z.ZodNumber>;
        attendeeCount: z.ZodOptional<z.ZodNumber>;
        organizer: z.ZodOptional<z.ZodString>;
        categories: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        sdgGoals: z.ZodOptional<z.ZodArray<z.ZodNumber, "many">>;
    }, "strip", z.ZodTypeAny, {
        eventId: string;
        eventType: "language" | "other" | "cultural" | "educational" | "professional" | "social" | "support" | "recreational";
        userId: string;
        eventTitle: string;
        eventFormat: "in-person" | "online" | "hybrid";
        attendedAt: string;
        matchId?: string | undefined;
        location?: string | undefined;
        durationMinutes?: number | undefined;
        attendeeCount?: number | undefined;
        organizer?: string | undefined;
        categories?: string[] | undefined;
        sdgGoals?: number[] | undefined;
    }, {
        eventId: string;
        eventType: "language" | "other" | "cultural" | "educational" | "professional" | "social" | "support" | "recreational";
        userId: string;
        eventTitle: string;
        eventFormat: "in-person" | "online" | "hybrid";
        attendedAt: string;
        matchId?: string | undefined;
        location?: string | undefined;
        durationMinutes?: number | undefined;
        attendeeCount?: number | undefined;
        organizer?: string | undefined;
        categories?: string[] | undefined;
        sdgGoals?: number[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "buddy.event.attended";
    data: {
        eventId: string;
        eventType: "language" | "other" | "cultural" | "educational" | "professional" | "social" | "support" | "recreational";
        userId: string;
        eventTitle: string;
        eventFormat: "in-person" | "online" | "hybrid";
        attendedAt: string;
        matchId?: string | undefined;
        location?: string | undefined;
        durationMinutes?: number | undefined;
        attendeeCount?: number | undefined;
        organizer?: string | undefined;
        categories?: string[] | undefined;
        sdgGoals?: number[] | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "buddy.event.attended";
    data: {
        eventId: string;
        eventType: "language" | "other" | "cultural" | "educational" | "professional" | "social" | "support" | "recreational";
        userId: string;
        eventTitle: string;
        eventFormat: "in-person" | "online" | "hybrid";
        attendedAt: string;
        matchId?: string | undefined;
        location?: string | undefined;
        durationMinutes?: number | undefined;
        attendeeCount?: number | undefined;
        organizer?: string | undefined;
        categories?: string[] | undefined;
        sdgGoals?: number[] | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type BuddyEventAttended = z.infer<typeof BuddyEventAttendedSchema>;
//# sourceMappingURL=event-attended.d.ts.map