import { z } from 'zod';

/**
 * Base event schema - all events extend this
 */
export const BaseEventSchema = z.object({
  id: z.string().uuid(),
  version: z.string().default('v1'),
  timestamp: z.string().datetime(),
  correlationId: z.string().uuid().optional(),
  causationId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

export type BaseEvent = z.infer<typeof BaseEventSchema>;

/**
 * Event naming convention: <domain>.<entity>.<action>
 */
export type EventType =
  // Buddy events
  | 'buddy.match.created'
  | 'buddy.event.logged'
  | 'buddy.checkin.completed'
  | 'buddy.feedback.submitted'
  // Kintell events
  | 'kintell.session.completed'
  | 'kintell.rating.created'
  | 'kintell.session.scheduled'
  // Upskilling events
  | 'upskilling.course.completed'
  | 'upskilling.credential.issued'
  | 'upskilling.progress.updated'
  // Orchestration events
  | 'orchestration.journey.milestone.reached'
  | 'orchestration.profile.updated'
  // Safety events
  | 'safety.flag.raised'
  | 'safety.review.completed'
  // NLQ events
  | 'nlq.query.started'
  | 'nlq.query.completed'
  | 'nlq.query.failed'
  | 'nlq.query.rejected'
  | 'nlq.cache.invalidated';

/**
 * Envelope for all events published to event bus
 */
export const EventEnvelopeSchema = z.object({
  type: z.string() as z.ZodType<EventType>,
  data: z.unknown(),
  metadata: BaseEventSchema,
});

export type EventEnvelope = z.infer<typeof EventEnvelopeSchema>;
