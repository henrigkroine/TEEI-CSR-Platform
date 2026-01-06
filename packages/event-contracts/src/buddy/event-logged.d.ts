import { z } from 'zod';
export declare const BuddyEventLoggedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"buddy.event.logged">;
    data: z.ZodObject<{
        eventId: z.ZodString;
        matchId: z.ZodString;
        eventType: z.ZodString;
        eventDate: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        location: z.ZodOptional<z.ZodString>;
        attendees: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        matchId: string;
        eventId: string;
        eventType: string;
        eventDate: string;
        location?: string | undefined;
        description?: string | undefined;
        attendees?: string[] | undefined;
    }, {
        matchId: string;
        eventId: string;
        eventType: string;
        eventDate: string;
        location?: string | undefined;
        description?: string | undefined;
        attendees?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "buddy.event.logged";
    data: {
        matchId: string;
        eventId: string;
        eventType: string;
        eventDate: string;
        location?: string | undefined;
        description?: string | undefined;
        attendees?: string[] | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "buddy.event.logged";
    data: {
        matchId: string;
        eventId: string;
        eventType: string;
        eventDate: string;
        location?: string | undefined;
        description?: string | undefined;
        attendees?: string[] | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type BuddyEventLogged = z.infer<typeof BuddyEventLoggedSchema>;
//# sourceMappingURL=event-logged.d.ts.map