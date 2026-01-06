import { z } from 'zod';
/**
 * Redaction Completed Event
 *
 * Emitted after PII redaction is completed on evidence snippets before LLM processing.
 * Tracks redaction effectiveness and compliance.
 *
 * GDPR Retention: 6 years (legal obligation)
 * Security: NO PII in event payload - only aggregated counts
 */
export declare const RedactionCompletedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"reporting.redaction.completed">;
    data: z.ZodObject<{
        reportId: z.ZodString;
        companyId: z.ZodString;
        snippetsProcessed: z.ZodNumber;
        piiDetectedCount: z.ZodNumber;
        piiRemovedCount: z.ZodNumber;
        leaksDetected: z.ZodNumber;
        success: z.ZodBoolean;
        durationMs: z.ZodNumber;
        timestamp: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        timestamp: string;
        companyId: string;
        reportId: string;
        snippetsProcessed: number;
        piiDetectedCount: number;
        piiRemovedCount: number;
        leaksDetected: number;
        success: boolean;
        durationMs: number;
    }, {
        timestamp: string;
        companyId: string;
        reportId: string;
        snippetsProcessed: number;
        piiDetectedCount: number;
        piiRemovedCount: number;
        leaksDetected: number;
        success: boolean;
        durationMs: number;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "reporting.redaction.completed";
    data: {
        timestamp: string;
        companyId: string;
        reportId: string;
        snippetsProcessed: number;
        piiDetectedCount: number;
        piiRemovedCount: number;
        leaksDetected: number;
        success: boolean;
        durationMs: number;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "reporting.redaction.completed";
    data: {
        timestamp: string;
        companyId: string;
        reportId: string;
        snippetsProcessed: number;
        piiDetectedCount: number;
        piiRemovedCount: number;
        leaksDetected: number;
        success: boolean;
        durationMs: number;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type RedactionCompletedEvent = z.infer<typeof RedactionCompletedEventSchema>;
//# sourceMappingURL=redaction-completed.d.ts.map