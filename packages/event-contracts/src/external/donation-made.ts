import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * Donation event from external CSR platforms (Benevity, Goodera)
 * Represents charitable donations made by employees
 */
export const DonationMadeSchema = BaseEventSchema.extend({
  type: z.literal('external.donation.made'),
  data: z.object({
    externalId: z.string(), // ID from external platform
    source: z.enum(['benevity', 'goodera', 'workday']),
    userId: z.string().uuid(),
    companyId: z.string().uuid(),
    amount: z.number().positive(),
    currency: z.string().length(3).default('USD'), // ISO 4217 currency code
    donationDate: z.string().datetime(),
    nonprofitName: z.string(),
    nonprofitId: z.string().optional(),
    nonprofitEin: z.string().optional(), // Tax ID (US)
    causeArea: z.string().optional(),
    matchEligible: z.boolean().default(false),
    matchAmount: z.number().nonnegative().optional(),
    donationType: z.enum(['one_time', 'recurring', 'payroll']).default('one_time'),
    recurrenceFrequency: z.enum(['weekly', 'bi_weekly', 'monthly', 'quarterly', 'annual']).optional(),
    campaign: z.string().optional(),
    metadata: z.record(z.unknown()).optional(),
  }),
});

export type DonationMade = z.infer<typeof DonationMadeSchema>;
