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
/**
 * Envelope for all events published to event bus
 */
export const EventEnvelopeSchema = z.object({
    type: z.string(),
    data: z.unknown(),
    metadata: BaseEventSchema,
});
//# sourceMappingURL=base.js.map