import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * Evidence Gate Violation Event
 *
 * Emitted when a report fails citation validation due to insufficient evidence.
 * This is a critical compliance event that triggers alerts and blocks report generation.
 *
 * GDPR Retention: 6 years (legal obligation)
 * Security: NO PII in event payload
 */
export const EvidenceGateViolationEventSchema = BaseEventSchema.extend({
  type: z.literal('reporting.evidence_gate.violation'),
  data: z.object({
    reportId: z.string().uuid(),
    companyId: z.string().uuid(),
    violations: z.array(
      z.object({
        paragraph: z.string(),
        citationCount: z.number().int(),
        requiredCount: z.number().int(),
      })
    ),
    totalCitationCount: z.number().int(),
    totalParagraphCount: z.number().int(),
    citationDensity: z.number(),
    rejected: z.boolean(),
    timestamp: z.string().datetime(),
  }),
});

export type EvidenceGateViolationEvent = z.infer<typeof EvidenceGateViolationEventSchema>;
