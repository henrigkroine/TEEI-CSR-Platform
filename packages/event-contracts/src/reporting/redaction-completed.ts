import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * Redaction Completed Event
 *
 * Emitted after PII redaction is completed on evidence snippets before LLM processing.
 * Tracks redaction effectiveness and compliance.
 *
 * GDPR Retention: 6 years (legal obligation)
 * Security: NO PII in event payload - only aggregated counts
 */
export const RedactionCompletedEventSchema = BaseEventSchema.extend({
  type: z.literal('reporting.redaction.completed'),
  data: z.object({
    reportId: z.string().uuid(),
    companyId: z.string().uuid(),
    snippetsProcessed: z.number().int(),
    piiDetectedCount: z.number().int(),
    piiRemovedCount: z.number().int(),
    leaksDetected: z.number().int(), // Should always be 0 if redaction successful
    success: z.boolean(),
    durationMs: z.number().int(),
    timestamp: z.string().datetime(),
  }),
});

export type RedactionCompletedEvent = z.infer<typeof RedactionCompletedEventSchema>;
