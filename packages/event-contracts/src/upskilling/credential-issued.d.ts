import { z } from 'zod';
export declare const UpskillingCredentialIssuedSchema: z.ZodObject<{
    id: z.ZodString;
    version: z.ZodDefault<z.ZodString>;
    timestamp: z.ZodString;
    correlationId: z.ZodOptional<z.ZodString>;
    causationId: z.ZodOptional<z.ZodString>;
    metadata: z.ZodOptional<z.ZodRecord<z.ZodString, z.ZodUnknown>>;
} & {
    type: z.ZodLiteral<"upskilling.credential.issued">;
    data: z.ZodObject<{
        credentialId: z.ZodString;
        userId: z.ZodString;
        provider: z.ZodString;
        courseId: z.ZodString;
        courseName: z.ZodString;
        credentialType: z.ZodEnum<["certificate", "badge", "diploma", "transcript"]>;
        issuedAt: z.ZodString;
        expiresAt: z.ZodOptional<z.ZodString>;
        credentialUrl: z.ZodOptional<z.ZodString>;
        verificationCode: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        userId: string;
        provider: string;
        courseId: string;
        courseName: string;
        credentialId: string;
        credentialType: "certificate" | "badge" | "diploma" | "transcript";
        issuedAt: string;
        expiresAt?: string | undefined;
        credentialUrl?: string | undefined;
        verificationCode?: string | undefined;
    }, {
        userId: string;
        provider: string;
        courseId: string;
        courseName: string;
        credentialId: string;
        credentialType: "certificate" | "badge" | "diploma" | "transcript";
        issuedAt: string;
        expiresAt?: string | undefined;
        credentialUrl?: string | undefined;
        verificationCode?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    id: string;
    version: string;
    timestamp: string;
    type: "upskilling.credential.issued";
    data: {
        userId: string;
        provider: string;
        courseId: string;
        courseName: string;
        credentialId: string;
        credentialType: "certificate" | "badge" | "diploma" | "transcript";
        issuedAt: string;
        expiresAt?: string | undefined;
        credentialUrl?: string | undefined;
        verificationCode?: string | undefined;
    };
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}, {
    id: string;
    timestamp: string;
    type: "upskilling.credential.issued";
    data: {
        userId: string;
        provider: string;
        courseId: string;
        courseName: string;
        credentialId: string;
        credentialType: "certificate" | "badge" | "diploma" | "transcript";
        issuedAt: string;
        expiresAt?: string | undefined;
        credentialUrl?: string | undefined;
        verificationCode?: string | undefined;
    };
    version?: string | undefined;
    correlationId?: string | undefined;
    causationId?: string | undefined;
    metadata?: Record<string, unknown> | undefined;
}>;
export type UpskillingCredentialIssued = z.infer<typeof UpskillingCredentialIssuedSchema>;
//# sourceMappingURL=credential-issued.d.ts.map