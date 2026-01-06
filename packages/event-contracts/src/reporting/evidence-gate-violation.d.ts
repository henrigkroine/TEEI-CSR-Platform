import { z } from 'zod';
/**
 * Evidence Gate Violation Event
 *
 * Emitted when a report fails citation validation due to insufficient evidence.
 * This is a critical compliance event that triggers alerts and blocks report generation.
 *
 * GDPR Retention: 6 years (legal obligation)
 * Security: NO PII in event payload
 */
export declare const EvidenceGateViolationEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"reporting.evidence_gate.violation">;
    data: z.ZodObject<{
        reportId: z.ZodString;
        companyId: z.ZodString;
        violations: z.ZodArray<z.ZodObject<{
            paragraph: z.ZodString;
            citationCount: z.ZodNumber;
            requiredCount: z.ZodNumber;
        }, "strip", z.ZodTypeAny, {
            paragraph: string;
            citationCount: number;
            requiredCount: number;
        }, {
            paragraph: string;
            citationCount: number;
            requiredCount: number;
        }>, "many">;
        totalCitationCount: z.ZodNumber;
        totalParagraphCount: z.ZodNumber;
        citationDensity: z.ZodNumber;
        rejected: z.ZodBoolean;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        rejected: boolean;
        companyId: string;
        reportId: string;
        violations: {
            paragraph: string;
            citationCount: number;
            requiredCount: number;
        }[];
        totalCitationCount: number;
        totalParagraphCount: number;
        citationDensity: number;
    }, {
        timestamp: string;
        rejected: boolean;
        companyId: string;
        reportId: string;
        violations: {
            paragraph: string;
            citationCount: number;
            requiredCount: number;
        }[];
        totalCitationCount: number;
        totalParagraphCount: number;
        citationDensity: number;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "reporting.evidence_gate.violation";
    data: {
        timestamp: string;
        rejected: boolean;
        companyId: string;
        reportId: string;
        violations: {
            paragraph: string;
            citationCount: number;
            requiredCount: number;
        }[];
        totalCitationCount: number;
        totalParagraphCount: number;
        citationDensity: number;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "reporting.evidence_gate.violation";
    data: {
        timestamp: string;
        rejected: boolean;
        companyId: string;
        reportId: string;
        violations: {
            paragraph: string;
            citationCount: number;
            requiredCount: number;
        }[];
        totalCitationCount: number;
        totalParagraphCount: number;
        citationDensity: number;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type EvidenceGateViolationEvent = z.infer<typeof EvidenceGateViolationEventSchema>;
//# sourceMappingURL=evidence-gate-violation.d.ts.map