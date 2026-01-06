import { z } from 'zod';
/**
 * Base event schema - all events extend this
 */
export declare const BaseEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type BaseEvent = z.infer<typeof BaseEventSchema>;
/**
 * Event naming convention: <domain>.<entity>.<action>
 */
export type EventType = 'buddy.match.created' | 'buddy.event.logged' | 'buddy.checkin.completed' | 'buddy.feedback.submitted' | 'kintell.session.completed' | 'kintell.rating.created' | 'kintell.session.scheduled' | 'upskilling.course.completed' | 'upskilling.credential.issued' | 'upskilling.progress.updated' | 'orchestration.journey.milestone.reached' | 'orchestration.profile.updated' | 'safety.flag.raised' | 'safety.review.completed' | 'nlq.query.started' | 'nlq.query.completed' | 'nlq.query.failed' | 'nlq.query.rejected' | 'nlq.cache.invalidated' | 'reporting.citation.edited' | 'reporting.redaction.completed' | 'reporting.evidence_gate.violation';
/**
 * Envelope for all events published to event bus
 */
export declare const EventEnvelopeSchema: z.ZodObject<{
    type: z.ZodType<EventType>;
    data: z.ZodUnknown;
    metadata: z.ZodObject<{
        id: z.ZodString;
        version: z.ZodDefault<z.ZodString>;
        timestamp: z.ZodString;
        correlationId: z.ZodOptional<z.ZodString>;
        causationId: z.ZodOptional<z.ZodString>;
        metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
    }, "strip", z.ZodTypeAny, {
        id: string;
        version: string;
        timestamp: string;
        correlationId?: string | undefined;
        causationId?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }, {
        id: string;
        timestamp: string;
        version?: string | undefined;
        correlationId?: string | undefined;
        causationId?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    type: EventType;
    metadata: {
        id: string;
        version: string;
        timestamp: string;
        correlationId?: string | undefined;
        causationId?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    };
    data?: unknown;
}, {
    type: EventType;
    metadata: {
        id: string;
        timestamp: string;
        version?: string | undefined;
        correlationId?: string | undefined;
        causationId?: string | undefined;
        metadata?: Record<string, unknown> | undefined;
    };
    data?: unknown;
}>;
export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
//# sourceMappingURL=base.d.ts.map