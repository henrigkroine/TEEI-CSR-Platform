import { z } from 'zod';
import { BaseEventSchema } from '../base.js';

/**
 * Donation Event - normalized from external platforms (Benevity, Goodera)
 * Represents a charitable donation by an employee
 */
export const DonationEventSchema = BaseEventSchema.extend({
  type: z.literal('ingest.donation.made'),
  data: z.object({
    // Source tracking
    sourceSystem: z.enum(['benevity', 'goodera', 'workday', 'manual']),
    sourceId: z.string(), // Unique transaction ID from source system
    sourceTenantId: z.string(), // Tenant/org ID in source system

    // Donor details
    userId: z.string().uuid(), // TEEI user ID (resolved from external ID)
    externalUserId: z.string(), // User ID in source system
    companyId: z.string().uuid(), // TEEI company ID

    // Donation details
    donationType: z.enum([
      'one_time',
      'recurring',
      'matching_gift',
      'payroll_deduction',
      'volunteer_grant',
      'disaster_relief',
      'other'
    ]),

    // Amount
    amount: z.number().min(0),
    currency: z.string().length(3), // ISO 4217 currency code (USD, EUR, etc.)
    amountUSD: z.number().min(0).optional(), // Converted to USD for normalization

    // Recipient
    nonprofitName: z.string(),
    nonprofitId: z.string().optional(), // EIN or external ID
    causeArea: z.string().optional(),

    // Dates
    donationDate: z.string().datetime(),

    // Company matching
    companyMatch: z.object({
      matched: z.boolean(),
      matchAmount: z.number().min(0).optional(),
      matchRatio: z.number().min(0).optional(), // e.g., 1.0 for 1:1, 2.0 for 2:1
    }).optional(),

    // SDG alignment (if provided)
    sdgGoals: z.array(z.number().int().min(1).max(17)).optional(),

    // Tax/receipt
    taxDeductible: z.boolean().optional(),
    receiptNumber: z.string().optional(),

    // Metadata
    tags: z.array(z.string()).optional(),
    campaignId: z.string().optional(), // If part of a company campaign
    campaignName: z.string().optional(),
  }),
});

export type DonationEvent = z.infer<typeof DonationEventSchema>;

/**
 * Factory function to create a DonationEvent
 */
export function createDonationEvent(
  data: z.infer<typeof DonationEventSchema>['data'],
  metadata?: {
    correlationId?: string;
    causationId?: string;
    [key: string]: unknown;
  }
): DonationEvent {
  return {
    id: crypto.randomUUID(),
    version: 'v1',
    timestamp: new Date().toISOString(),
    type: 'ingest.donation.made',
    correlationId: metadata?.correlationId,
    causationId: metadata?.causationId,
    metadata,
    data,
  };
}
