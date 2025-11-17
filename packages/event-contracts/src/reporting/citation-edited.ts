import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * Citation Edited Event
 *
 * Emitted when a citation is added, modified, or removed from a report.
 * This event is critical for audit trails and evidence lineage tracking.
 *
 * GDPR Retention: 6 years (legal obligation)
 * Security: NO PII in event payload
 */
export const CitationEditedEventSchema = BaseEventSchema.extend({
  type: z.literal('reporting.citation.edited'),
  data: z.object({
    reportId: z.string().uuid(),
    citationId: z.string().uuid(),
    action: z.enum(['ADDED', 'MODIFIED', 'REMOVED']),
    editor: z.string().uuid(), // userId or 'system'
    previousHash: z.string().optional(),
    newHash: z.string(),
    metadata: z.object({
      ipAddress: z.string().optional(),
      userAgent: z.string().optional(),
      reason: z.string().optional(),
      requestId: z.string().optional(),
    }).optional(),
  }),
});

export type CitationEditedEvent = z.infer<typeof CitationEditedEventSchema>;
