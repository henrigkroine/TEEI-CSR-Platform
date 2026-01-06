import { z } from 'zod';
/**
 * Event emitted when a buddy match is ended or dissolved.
 *
 * This event triggers profile updates and allows the CSR Platform to track:
 * - Match duration for impact metrics
 * - Reasons for ending (for program improvement)
 * - Whether participants completed their journey
 */
export declare const BuddyMatchEndedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"buddy.match.ended">;
    data: z.ZodObject<{
        matchId: z.ZodString;
        participantId: z.ZodString;
        buddyId: z.ZodString;
        endedAt: z.ZodString;
        duration: z.ZodNumber;
        reason: z.ZodEnum<["completed", "participant_request", "buddy_request", "mutual_agreement", "inactivity", "violation", "program_ended", "other"]>;
        reasonDetails: z.ZodOptional<z.ZodString>;
        sessionsCompleted: z.ZodOptional<z.ZodNumber>;
        eventsAttended: z.ZodOptional<z.ZodNumber>;
        feedback: z.ZodOptional<z.ZodObject<{
            participantSatisfaction: z.ZodOptional<z.ZodNumber>;
            buddySatisfaction: z.ZodOptional<z.ZodNumber>;
        }, "strip", z.ZodTypeAny, {
            participantSatisfaction?: number | undefined;
            buddySatisfaction?: number | undefined;
        }, {
            participantSatisfaction?: number | undefined;
            buddySatisfaction?: number | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        matchId: string;
        participantId: string;
        buddyId: string;
        endedAt: string;
        duration: number;
        reason: "completed" | "participant_request" | "buddy_request" | "mutual_agreement" | "inactivity" | "violation" | "program_ended" | "other";
        reasonDetails?: string | undefined;
        sessionsCompleted?: number | undefined;
        eventsAttended?: number | undefined;
        feedback?: {
            participantSatisfaction?: number | undefined;
            buddySatisfaction?: number | undefined;
        } | undefined;
    }, {
        matchId: string;
        participantId: string;
        buddyId: string;
        endedAt: string;
        duration: number;
        reason: "completed" | "participant_request" | "buddy_request" | "mutual_agreement" | "inactivity" | "violation" | "program_ended" | "other";
        reasonDetails?: string | undefined;
        sessionsCompleted?: number | undefined;
        eventsAttended?: number | undefined;
        feedback?: {
            participantSatisfaction?: number | undefined;
            buddySatisfaction?: number | undefined;
        } | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "buddy.match.ended";
    data: {
        matchId: string;
        participantId: string;
        buddyId: string;
        endedAt: string;
        duration: number;
        reason: "completed" | "participant_request" | "buddy_request" | "mutual_agreement" | "inactivity" | "violation" | "program_ended" | "other";
        reasonDetails?: string | undefined;
        sessionsCompleted?: number | undefined;
        eventsAttended?: number | undefined;
        feedback?: {
            participantSatisfaction?: number | undefined;
            buddySatisfaction?: number | undefined;
        } | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "buddy.match.ended";
    data: {
        matchId: string;
        participantId: string;
        buddyId: string;
        endedAt: string;
        duration: number;
        reason: "completed" | "participant_request" | "buddy_request" | "mutual_agreement" | "inactivity" | "violation" | "program_ended" | "other";
        reasonDetails?: string | undefined;
        sessionsCompleted?: number | undefined;
        eventsAttended?: number | undefined;
        feedback?: {
            participantSatisfaction?: number | undefined;
            buddySatisfaction?: number | undefined;
        } | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type BuddyMatchEnded = z.infer<typeof BuddyMatchEndedSchema>;
//# sourceMappingURL=match-ended.d.ts.map