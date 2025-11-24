/**
 * Campaign Validator
 *
 * Validates template + beneficiary group compatibility and campaign data integrity
 */

import { pool } from '../db/connection.js';
import type { BeneficiaryGroup, ProgramTemplate } from '@teei/shared-schema';
import { z } from 'zod';

/**
 * Validation error with detailed context
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public readonly field?: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Template + Group Compatibility Validator
 *
 * Validates that a program template is compatible with a beneficiary group
 * based on eligible program types and tags.
 */
export async function validateTemplateGroupCompatibility(
  templateId: string,
  groupId: string
): Promise<{
  isCompatible: boolean;
  reasons: string[];
  template?: ProgramTemplate;
  group?: BeneficiaryGroup;
}> {
  const client = await pool.connect();

  try {
    // Fetch template
    const templateResult = await client.query<ProgramTemplate>(
      `SELECT * FROM program_templates WHERE id = $1 AND is_active = true`,
      [templateId]
    );

    if (templateResult.rows.length === 0) {
      return {
        isCompatible: false,
        reasons: [`Template ${templateId} not found or is inactive`],
      };
    }

    const template = templateResult.rows[0]!;

    // Fetch beneficiary group
    const groupResult = await client.query<BeneficiaryGroup>(
      `SELECT * FROM beneficiary_groups WHERE id = $1 AND is_active = true`,
      [groupId]
    );

    if (groupResult.rows.length === 0) {
      return {
        isCompatible: false,
        reasons: [`Beneficiary group ${groupId} not found or is inactive`],
      };
    }

    const group = groupResult.rows[0]!;

    // Validate compatibility
    const reasons: string[] = [];

    // 1. Check if template's program type is in group's eligible program types
    const eligibleProgramTypes = (group.eligibleProgramTypes || []) as string[];
    if (!eligibleProgramTypes.includes(template.programType)) {
      reasons.push(
        `Template program type '${template.programType}' is not eligible for this beneficiary group. ` +
        `Eligible types: ${eligibleProgramTypes.join(', ')}`
      );
    }

    // 2. Check if group tags match template's suitableForGroups
    const groupTags = (group.tags || []) as string[];
    const suitableForGroups = (template.suitableForGroups || []) as string[];

    if (suitableForGroups.length > 0) {
      const hasMatchingTag = suitableForGroups.some((tag) =>
        groupTags.includes(tag)
      );

      if (!hasMatchingTag) {
        reasons.push(
          `Template is suitable for groups with tags: ${suitableForGroups.join(', ')}. ` +
          `This group has tags: ${groupTags.join(', ') || 'none'}`
        );
      }
    }

    return {
      isCompatible: reasons.length === 0,
      reasons,
      template,
      group,
    };
  } finally {
    client.release();
  }
}

/**
 * Campaign data validator
 *
 * Validates campaign creation input data
 */
export const createCampaignInputSchema = z.object({
  name: z.string().min(1, 'Campaign name is required').max(255, 'Campaign name must be 255 characters or less'),
  description: z.string().optional(),
  companyId: z.string().uuid('Invalid company ID'),
  programTemplateId: z.string().uuid('Invalid program template ID'),
  beneficiaryGroupId: z.string().uuid('Invalid beneficiary group ID'),

  // Period
  startDate: z.string().or(z.date()).transform(val => typeof val === 'string' ? val : val.toISOString().split('T')[0]),
  endDate: z.string().or(z.date()).transform(val => typeof val === 'string' ? val : val.toISOString().split('T')[0]),
  quarter: z.string().max(10).optional(),

  // Capacity
  targetVolunteers: z.number().int().min(1, 'Target volunteers must be at least 1'),
  targetBeneficiaries: z.number().int().min(1, 'Target beneficiaries must be at least 1'),
  maxSessions: z.number().int().min(1).optional(),

  // Budget
  budgetAllocated: z.number().min(0, 'Budget must be non-negative'),
  currency: z.string().length(3, 'Currency must be a 3-letter ISO code').default('EUR'),

  // Pricing model
  pricingModel: z.enum(['seats', 'credits', 'bundle', 'iaas', 'custom']),

  // Seats model
  committedSeats: z.number().int().min(1).optional(),
  seatPricePerMonth: z.number().min(0).optional(),

  // Credits model
  creditAllocation: z.number().int().min(1).optional(),
  creditConsumptionRate: z.number().min(0).optional(),

  // IAAS model
  iaasMetrics: z.object({
    learnersCommitted: z.number().int().min(1),
    pricePerLearner: z.number().min(0),
    outcomesGuaranteed: z.array(z.string()),
    outcomeThresholds: z.record(z.number()).optional(),
  }).optional(),

  // Bundle model
  l2iSubscriptionId: z.string().uuid().optional(),
  bundleAllocationPercentage: z.number().min(0).max(1).optional(),

  // Custom pricing
  customPricingTerms: z.record(z.any()).optional(),

  // Configuration overrides
  configOverrides: z.record(z.any()).default({}),

  // Metadata
  tags: z.array(z.string()).default([]),
  internalNotes: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  createdBy: z.string().uuid().optional(),
})
  .refine(
    (data) => new Date(data.startDate) < new Date(data.endDate),
    {
      message: 'Start date must be before end date',
      path: ['startDate'],
    }
  )
  .refine(
    (data) => {
      // If pricing model is 'seats', committedSeats and seatPricePerMonth are required
      if (data.pricingModel === 'seats') {
        return data.committedSeats !== undefined && data.seatPricePerMonth !== undefined;
      }
      return true;
    },
    {
      message: 'Seats pricing model requires committedSeats and seatPricePerMonth',
      path: ['pricingModel'],
    }
  )
  .refine(
    (data) => {
      // If pricing model is 'credits', creditAllocation and creditConsumptionRate are required
      if (data.pricingModel === 'credits') {
        return data.creditAllocation !== undefined && data.creditConsumptionRate !== undefined;
      }
      return true;
    },
    {
      message: 'Credits pricing model requires creditAllocation and creditConsumptionRate',
      path: ['pricingModel'],
    }
  )
  .refine(
    (data) => {
      // If pricing model is 'iaas', iaasMetrics is required
      if (data.pricingModel === 'iaas') {
        return data.iaasMetrics !== undefined;
      }
      return true;
    },
    {
      message: 'IAAS pricing model requires iaasMetrics',
      path: ['pricingModel'],
    }
  )
  .refine(
    (data) => {
      // If pricing model is 'bundle', l2iSubscriptionId is required
      if (data.pricingModel === 'bundle') {
        return data.l2iSubscriptionId !== undefined;
      }
      return true;
    },
    {
      message: 'Bundle pricing model requires l2iSubscriptionId',
      path: ['pricingModel'],
    }
  );

export type CreateCampaignInput = z.infer<typeof createCampaignInputSchema>;

/**
 * Validate that a company exists and is active
 */
export async function validateCompanyExists(companyId: string): Promise<boolean> {
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id FROM companies WHERE id = $1`,
      [companyId]
    );
    return result.rows.length > 0;
  } finally {
    client.release();
  }
}
