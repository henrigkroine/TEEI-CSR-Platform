import { z } from 'zod';
/**
 * Citation Edited Event
 *
 * Emitted when a citation is added, modified, or removed from a report.
 * This event is critical for audit trails and evidence lineage tracking.
 *
 * GDPR Retention: 6 years (legal obligation)
 * Security: NO PII in event payload
 */
export declare const CitationEditedEventSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"reporting.citation.edited">;
    data: z.ZodObject<{
        reportId: z.ZodString;
        citationId: z.ZodString;
        action: z.ZodEnum<["ADDED", "MODIFIED", "REMOVED"]>;
        editor: z.ZodString;
        previousHash: z.ZodOptional<z.ZodString>;
        newHash: z.ZodString;
        metadata: z.ZodOptional<z.ZodObject<{
            ipAddress: z.ZodOptional<z.ZodString>;
            userAgent: z.ZodOptional<z.ZodString>;
            reason: z.ZodOptional<z.ZodString>;
            requestId: z.ZodOptional<z.ZodString>;
        }, "strip", z.ZodTypeAny, {
            reason?: string | undefined;
            ipAddress?: string | undefined;
            userAgent?: string | undefined;
            requestId?: string | undefined;
        }, {
            reason?: string | undefined;
            ipAddress?: string | undefined;
            userAgent?: string | undefined;
            requestId?: string | undefined;
        }>>;
    }, "strip", z.ZodTypeAny, {
        reportId: string;
        citationId: string;
        action: "ADDED" | "MODIFIED" | "REMOVED";
        editor: string;
        newHash: string;
        metadata?: {
            reason?: string | undefined;
            ipAddress?: string | undefined;
            userAgent?: string | undefined;
            requestId?: string | undefined;
        } | undefined;
        previousHash?: string | undefined;
    }, {
        reportId: string;
        citationId: string;
        action: "ADDED" | "MODIFIED" | "REMOVED";
        editor: string;
        newHash: string;
        metadata?: {
            reason?: string | undefined;
            ipAddress?: string | undefined;
            userAgent?: string | undefined;
            requestId?: string | undefined;
        } | undefined;
        previousHash?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "reporting.citation.edited";
    data: {
        reportId: string;
        citationId: string;
        action: "ADDED" | "MODIFIED" | "REMOVED";
        editor: string;
        newHash: string;
        metadata?: {
            reason?: string | undefined;
            ipAddress?: string | undefined;
            userAgent?: string | undefined;
            requestId?: string | undefined;
        } | undefined;
        previousHash?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "reporting.citation.edited";
    data: {
        reportId: string;
        citationId: string;
        action: "ADDED" | "MODIFIED" | "REMOVED";
        editor: string;
        newHash: string;
        metadata?: {
            reason?: string | undefined;
            ipAddress?: string | undefined;
            userAgent?: string | undefined;
            requestId?: string | undefined;
        } | undefined;
        previousHash?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type CitationEditedEvent = z.infer<typeof CitationEditedEventSchema>;
//# sourceMappingURL=citation-edited.d.ts.map