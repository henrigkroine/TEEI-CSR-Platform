import { z } from 'zod';
import { BaseEventSchema } from '../base.js';
export const UpskillingCredentialIssuedSchema = BaseEventSchema.extend({
    type: z.literal('upskilling.credential.issued'),
    data: z.object({
        credentialId: z.string().uuid(),
        userId: z.string().uuid(),
        provider: z.string(),
        courseId: z.string(),
        courseName: z.string(),
        credentialType: z.enum(['certificate', 'badge', 'diploma', 'transcript']),
        issuedAt: z.string().datetime(),
        expiresAt: z.string().datetime().optional(),
        credentialUrl: z.string().url().optional(),
        verificationCode: z.string().optional(),
    }),
});
//# sourceMappingURL=credential-issued.js.map