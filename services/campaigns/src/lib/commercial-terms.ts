/**
 * Commercial Terms Manager
 *
 * SWARM 6: Agent 5.5 - commercial-terms-manager
 *
 * Responsibilities:
 * - Set and manage campaign pricing (seats, credits, IAAS, bundles, custom)
 * - Validate pricing terms against company subscriptions
 * - Handle mid-campaign pricing tier changes
 * - Generate pricing proposals for campaigns
 *
 * Pricing Models Supported:
 * 1. SEATS: committedSeats × seatPricePerMonth (e.g., 50 seats × €500/mo)
 * 2. CREDITS: creditAllocation with consumption tracking (e.g., 10,000 credits)
 * 3. IAAS: learnersCommitted × pricePerLearner (outcome-based)
 * 4. BUNDLE: Portion of L2I subscription allocation
 * 5. CUSTOM: Bespoke pricing with flexible terms
 */

import { db } from '@teei/shared-schema';
import {
  campaigns,
  billingSubscriptions,
  l2iSubscriptions,
  l2iBundles,
  programTemplates,
  beneficiaryGroups,
  Campaign,
  NewCampaign
} from '@teei/shared-schema';
import { eq, and } from 'drizzle-orm';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('campaigns:commercial-terms');

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/**
 * Pricing terms for a campaign
 */
export interface PricingTerms {
  pricingModel: 'seats' | 'credits' | 'bundle' | 'iaas' | 'custom';

  // Seats Model
  seats?: {
    committed: number; // Number of volunteer seats
    pricePerMonth: number; // Price per seat per month
    currency: string; // ISO 4217 currency code
  };

  // Credits Model
  credits?: {
    allocation: number; // Total credits allocated
    consumptionRate: number; // Credits consumed per hour/session
    currency: string;
  };

  // IAAS Model (Impact-as-a-Service)
  iaas?: {
    learnersCommitted: number; // Number of learners guaranteed
    pricePerLearner: number; // Price per learner served
    outcomesGuaranteed: string[]; // e.g., ['job_readiness > 0.7']
    outcomeThresholds?: Record<string, number>; // e.g., { sroi: 3.0, vis: 70 }
    currency: string;
  };

  // Bundle Model
  bundle?: {
    l2iSubscriptionId: string; // Link to L2I subscription
    allocationPercentage: number; // 0-1 (e.g., 0.25 = 25%)
  };

  // Custom Pricing
  custom?: {
    description?: string;
    fixedFee?: number; // Fixed upfront fee
    variableComponents?: Array<{
      name: string;
      unit: string; // 'hour', 'session', 'learner'
      rate: number;
      cap?: number;
    }>;
    milestonePayments?: Array<{
      milestone: string;
      amount: number;
      dueDate?: string;
    }>;
    currency: string;
  };
}

/**
 * Validation result for pricing terms
 */
export interface PricingValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendation?: string;
}

/**
 * Pricing proposal for a new campaign
 */
export interface PricingProposal {
  campaignId?: string;
  templateName: string;
  beneficiaryGroupName: string;
  capacity: {
    volunteers?: number;
    beneficiaries: number;
    sessions?: number;
  };
  proposedPricingModels: Array<{
    model: 'seats' | 'credits' | 'iaas' | 'bundle' | 'custom';
    monthlyEstimate: number;
    totalEstimate: number;
    rationale: string;
    breakdown: Record<string, number>;
    currency: string;
  }>;
  campaignDurationMonths: number;
  recommendedModel: string;
  roiProjection?: {
    minimumSROI: number;
    expectedVIS: number;
    confidenceLevel: string;
  };
  createdAt: string;
}

/**
 * Mid-campaign tier change result
 */
export interface TierChangeResult {
  success: boolean;
  campaignId: string;
  oldTerms: PricingTerms;
  newTerms: PricingTerms;
  adjustmentAmount?: number;
  adjustmentReason?: string;
  effectiveDate: string;
  warnings?: string[];
}

// ============================================================================
// COMMERCIAL TERMS MANAGER
// ============================================================================

/**
 * Set or update pricing terms for a campaign
 * @param campaignId - Campaign ID
 * @param terms - New pricing terms
 * @returns Updated campaign
 */
export async function setPricingTerms(
  campaignId: string,
  terms: PricingTerms
): Promise<Campaign> {
  logger.info(`Setting pricing terms for campaign ${campaignId}`, { model: terms.pricingModel });

  // Get current campaign
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId));

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  // Validate pricing terms
  const validation = await validatePricingTerms(campaignId, terms);
  if (!validation.valid) {
    throw new Error(`Invalid pricing terms: ${validation.errors.join(', ')}`);
  }

  // Build update payload based on pricing model
  const updateData: Partial<Campaign> = {
    pricingModel: terms.pricingModel,
    updatedAt: new Date()
  };

  switch (terms.pricingModel) {
    case 'seats':
      if (!terms.seats) throw new Error('Seats model requires seats configuration');
      updateData.committedSeats = terms.seats.committed;
      updateData.seatPricePerMonth = terms.seats.pricePerMonth as any;
      break;

    case 'credits':
      if (!terms.credits) throw new Error('Credits model requires credits configuration');
      updateData.creditAllocation = terms.credits.allocation;
      updateData.creditConsumptionRate = terms.credits.consumptionRate as any;
      updateData.creditsRemaining = terms.credits.allocation;
      break;

    case 'iaas':
      if (!terms.iaas) throw new Error('IAAS model requires iaas configuration');
      updateData.iaasMetrics = {
        learnersCommitted: terms.iaas.learnersCommitted,
        pricePerLearner: terms.iaas.pricePerLearner,
        outcomesGuaranteed: terms.iaas.outcomesGuaranteed,
        outcomeThresholds: terms.iaas.outcomeThresholds
      } as any;
      break;

    case 'bundle':
      if (!terms.bundle) throw new Error('Bundle model requires bundle configuration');
      updateData.l2iSubscriptionId = terms.bundle.l2iSubscriptionId;
      updateData.bundleAllocationPercentage = terms.bundle.allocationPercentage as any;
      break;

    case 'custom':
      if (!terms.custom) throw new Error('Custom model requires custom configuration');
      updateData.customPricingTerms = {
        description: terms.custom.description,
        fixedFee: terms.custom.fixedFee,
        variableComponents: terms.custom.variableComponents,
        milestonePayments: terms.custom.milestonePayments
      } as any;
      break;
  }

  // Update campaign in database
  const [updatedCampaign] = await db
    .update(campaigns)
    .set(updateData)
    .where(eq(campaigns.id, campaignId))
    .returning();

  logger.info(`Successfully set pricing terms for campaign ${campaignId}`);
  return updatedCampaign;
}

/**
 * Validate pricing terms against company subscriptions and constraints
 * @param campaignId - Campaign ID
 * @param terms - Pricing terms to validate
 * @returns Validation result with errors and warnings
 */
export async function validatePricingTerms(
  campaignId: string,
  terms: PricingTerms
): Promise<PricingValidationResult> {
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    // Get campaign details
    const [campaign] = await db
      .select()
      .from(campaigns)
      .where(eq(campaigns.id, campaignId));

    if (!campaign) {
      return {
        valid: false,
        errors: [`Campaign ${campaignId} not found`],
        warnings: []
      };
    }

    // Get company subscription
    const [subscription] = await db
      .select()
      .from(billingSubscriptions)
      .where(eq(billingSubscriptions.companyId, campaign.companyId));

    // Validate based on pricing model
    switch (terms.pricingModel) {
      case 'seats':
        if (!terms.seats) {
          errors.push('Seats configuration required');
          break;
        }
        if (terms.seats.committed < 1) {
          errors.push('Committed seats must be at least 1');
        }
        if (terms.seats.pricePerMonth <= 0) {
          errors.push('Seat price must be positive');
        }
        // Estimate monthly cost
        const monthlySeats = (terms.seats.committed * terms.seats.pricePerMonth);
        const campaignMonths = Math.ceil(
          (new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) /
          (1000 * 60 * 60 * 24 * 30)
        );
        const totalSeats = monthlySeats * campaignMonths;

        if (totalSeats > campaign.budgetAllocated) {
          warnings.push(
            `Estimated seats cost (${terms.seats.currency} ${totalSeats}) exceeds budget (${campaign.currency} ${campaign.budgetAllocated})`
          );
        }
        break;

      case 'credits':
        if (!terms.credits) {
          errors.push('Credits configuration required');
          break;
        }
        if (terms.credits.allocation < 1) {
          errors.push('Credit allocation must be at least 1');
        }
        if (terms.credits.consumptionRate <= 0) {
          errors.push('Credit consumption rate must be positive');
        }
        // Note: Actual cost depends on credit pricing in billing system
        warnings.push(
          'Credits pricing must be configured in billing system'
        );
        break;

      case 'iaas':
        if (!terms.iaas) {
          errors.push('IAAS configuration required');
          break;
        }
        if (terms.iaas.learnersCommitted < 1) {
          errors.push('Learners committed must be at least 1');
        }
        if (terms.iaas.pricePerLearner <= 0) {
          errors.push('Price per learner must be positive');
        }
        if (terms.iaas.outcomesGuaranteed.length === 0) {
          warnings.push('No outcome guarantees specified');
        }

        // Estimate total IAAS cost
        const iaasTotal = terms.iaas.learnersCommitted * terms.iaas.pricePerLearner;
        if (iaasTotal > campaign.budgetAllocated) {
          warnings.push(
            `Estimated IAAS cost (${terms.iaas.currency} ${iaasTotal}) exceeds budget (${campaign.currency} ${campaign.budgetAllocated})`
          );
        }

        // Check learner capacity matches campaign targets
        if (campaign.targetBeneficiaries && terms.iaas.learnersCommitted > campaign.targetBeneficiaries) {
          warnings.push(
            `IAAS committed learners (${terms.iaas.learnersCommitted}) exceeds campaign target (${campaign.targetBeneficiaries})`
          );
        }
        break;

      case 'bundle':
        if (!terms.bundle) {
          errors.push('Bundle configuration required');
          break;
        }

        // Verify L2I subscription exists and is active
        const [l2iSub] = await db
          .select()
          .from(l2iSubscriptions)
          .where(
            and(
              eq(l2iSubscriptions.id, terms.bundle.l2iSubscriptionId),
              eq(l2iSubscriptions.companyId, campaign.companyId)
            )
          );

        if (!l2iSub) {
          errors.push(`L2I subscription ${terms.bundle.l2iSubscriptionId} not found for this company`);
        } else if (l2iSub.status !== 'active') {
          errors.push(`L2I subscription is not active (status: ${l2iSub.status})`);
        }

        if (terms.bundle.allocationPercentage <= 0 || terms.bundle.allocationPercentage > 1) {
          errors.push('Bundle allocation percentage must be between 0 and 1');
        }
        break;

      case 'custom':
        if (!terms.custom) {
          errors.push('Custom pricing configuration required');
          break;
        }

        let estimatedCost = terms.custom.fixedFee || 0;
        if (terms.custom.variableComponents) {
          // Rough estimate based on typical values
          estimatedCost += terms.custom.variableComponents.reduce((sum, component) => {
            const typicalUsage = component.unit === 'hour' ? 100 : component.unit === 'session' ? 50 : 100;
            return sum + (component.rate * typicalUsage);
          }, 0);
        }

        if (estimatedCost > campaign.budgetAllocated) {
          warnings.push(
            `Estimated custom pricing cost exceeds budget`
          );
        }

        if (!terms.custom.description) {
          warnings.push('No description provided for custom pricing');
        }
        break;
    }

    // Validate subscription is active (for all models)
    if (!subscription) {
      warnings.push('No active billing subscription found for company');
    } else if (subscription.status !== 'active') {
      errors.push(`Billing subscription is not active (status: ${subscription.status})`);
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
      recommendation: errors.length === 0 ? `Pricing model ${terms.pricingModel} is valid for this campaign` : undefined
    };
  } catch (error) {
    logger.error('Error validating pricing terms', error);
    return {
      valid: false,
      errors: [`Validation error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      warnings: []
    };
  }
}

/**
 * Change pricing tier mid-campaign
 * Handles transitions between pricing models with appropriate adjustments
 * @param campaignId - Campaign ID
 * @param newTier - New pricing model and terms
 * @returns Tier change result with adjustments
 */
export async function changePricingTier(
  campaignId: string,
  newTier: PricingTerms
): Promise<TierChangeResult> {
  logger.info(`Changing pricing tier for campaign ${campaignId} to ${newTier.pricingModel}`);

  // Get current campaign
  const [campaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId));

  if (!campaign) {
    throw new Error(`Campaign ${campaignId} not found`);
  }

  // Validate new tier
  const validation = await validatePricingTerms(campaignId, newTier);
  if (!validation.valid) {
    throw new Error(`Invalid new pricing tier: ${validation.errors.join(', ')}`);
  }

  // Capture old terms
  const oldTerms: PricingTerms = {
    pricingModel: campaign.pricingModel as any,
    seats: campaign.committedSeats ? {
      committed: campaign.committedSeats,
      pricePerMonth: parseFloat(campaign.seatPricePerMonth || '0'),
      currency: campaign.currency
    } : undefined,
    credits: campaign.creditAllocation ? {
      allocation: campaign.creditAllocation,
      consumptionRate: parseFloat(campaign.creditConsumptionRate || '0'),
      currency: campaign.currency
    } : undefined,
    iaas: campaign.iaasMetrics ? {
      learnersCommitted: campaign.iaasMetrics.learnersCommitted,
      pricePerLearner: campaign.iaasMetrics.pricePerLearner,
      outcomesGuaranteed: campaign.iaasMetrics.outcomesGuaranteed || [],
      outcomeThresholds: campaign.iaasMetrics.outcomeThresholds,
      currency: campaign.currency
    } : undefined,
    bundle: campaign.l2iSubscriptionId ? {
      l2iSubscriptionId: campaign.l2iSubscriptionId,
      allocationPercentage: parseFloat(campaign.bundleAllocationPercentage || '0')
    } : undefined,
    custom: campaign.customPricingTerms ? {
      ...campaign.customPricingTerms as any,
      currency: campaign.currency
    } : undefined
  };

  // Calculate adjustment (if applicable)
  let adjustmentAmount: number | undefined;
  let adjustmentReason: string | undefined;

  // Track that pricing was changed
  const notes = campaign.internalNotes || '';
  const updatedNotes = `${notes}\n[${new Date().toISOString()}] Pricing tier changed from ${oldTerms.pricingModel} to ${newTier.pricingModel}`;

  // Apply new pricing terms
  await setPricingTerms(campaignId, newTier);

  // Fetch updated campaign
  const [updatedCampaign] = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, campaignId));

  logger.info(`Successfully changed pricing tier for campaign ${campaignId}`, {
    oldModel: oldTerms.pricingModel,
    newModel: newTier.pricingModel,
    adjustmentAmount
  });

  return {
    success: true,
    campaignId,
    oldTerms,
    newTerms: newTier,
    adjustmentAmount,
    adjustmentReason,
    effectiveDate: new Date().toISOString(),
    warnings: validation.warnings.length > 0 ? validation.warnings : undefined
  };
}

/**
 * Generate a pricing proposal for a new campaign
 * Creates multiple pricing model options with cost estimates and recommendations
 * @param templateId - Program template ID
 * @param groupId - Beneficiary group ID
 * @param capacity - Capacity estimates (volunteers, beneficiaries, sessions)
 * @param companyId - Company ID for subscription validation
 * @returns Pricing proposal with multiple model options
 */
export async function generatePricingProposal(
  templateId: string,
  groupId: string,
  capacity: { volunteers?: number; beneficiaries: number; sessions?: number },
  companyId: string,
  budgetAllocated?: number,
  campaignDurationMonths: number = 3
): Promise<PricingProposal> {
  logger.info('Generating pricing proposal', {
    templateId,
    groupId,
    capacity,
    campaignDurationMonths
  });

  // Get template details
  const [template] = await db
    .select()
    .from(programTemplates)
    .where(eq(programTemplates.id, templateId));

  if (!template) {
    throw new Error(`Template ${templateId} not found`);
  }

  // Get beneficiary group details
  const [group] = await db
    .select()
    .from(beneficiaryGroups)
    .where(eq(beneficiaryGroups.id, groupId));

  if (!group) {
    throw new Error(`Beneficiary group ${groupId} not found`);
  }

  // Get company subscription for context
  const [subscription] = await db
    .select()
    .from(billingSubscriptions)
    .where(eq(billingSubscriptions.companyId, companyId));

  const proposedModels: PricingProposal['proposedPricingModels'] = [];

  // Default budget if not provided
  const defaultBudget = budgetAllocated || 25000; // €25,000 default

  // === SEATS MODEL ===
  const estimatedVolunteers = capacity.volunteers || Math.ceil(capacity.beneficiaries / 5);
  const baseSeatPrice = 500; // Base €500 per seat per month
  const seatMonthlyEstimate = estimatedVolunteers * baseSeatPrice;
  const seatTotalEstimate = seatMonthlyEstimate * campaignDurationMonths;

  proposedModels.push({
    model: 'seats',
    monthlyEstimate: seatMonthlyEstimate,
    totalEstimate: seatTotalEstimate,
    rationale: `Pay per volunteer seat (${estimatedVolunteers} volunteers × €${baseSeatPrice}/month)`,
    breakdown: {
      volunteers: estimatedVolunteers,
      pricePerVolunteer: baseSeatPrice,
      months: campaignDurationMonths
    },
    currency: 'EUR'
  });

  // === CREDITS MODEL ===
  const estimatedSessions = capacity.sessions || Math.ceil(capacity.beneficiaries * 4);
  const creditsPerSession = 50;
  const totalCredits = estimatedSessions * creditsPerSession;
  const creditUnitPrice = 0.50; // €0.50 per credit
  const creditTotalEstimate = totalCredits * creditUnitPrice;

  proposedModels.push({
    model: 'credits',
    monthlyEstimate: creditTotalEstimate / campaignDurationMonths,
    totalEstimate: creditTotalEstimate,
    rationale: `Pre-purchased impact credits (${totalCredits} credits × €${creditUnitPrice} per credit)`,
    breakdown: {
      sessions: estimatedSessions,
      creditsPerSession: creditsPerSession,
      totalCredits: totalCredits,
      pricePerCredit: creditUnitPrice
    },
    currency: 'EUR'
  });

  // === IAAS MODEL (Impact-as-a-Service) ===
  const expectedPricePerLearner = 150; // €150 per learner (outcome-based)
  const iaasTotalEstimate = capacity.beneficiaries * expectedPricePerLearner;

  proposedModels.push({
    model: 'iaas',
    monthlyEstimate: iaasTotalEstimate / campaignDurationMonths,
    totalEstimate: iaasTotalEstimate,
    rationale: `Impact-as-a-Service: pay only for verified learner outcomes (${capacity.beneficiaries} learners × €${expectedPricePerLearner})`,
    breakdown: {
      learnersCommitted: capacity.beneficiaries,
      pricePerLearner: expectedPricePerLearner,
      outcomesGuaranteed: ['engagement_rate > 0.75', 'attendance > 80%']
    },
    currency: 'EUR'
  });

  // === BUNDLE MODEL ===
  // Only propose if company has L2I subscription
  if (subscription) {
    const [l2iSubs] = await db
      .select()
      .from(l2iSubscriptions)
      .where(eq(l2iSubscriptions.companyId, companyId));

    if (l2iSubs) {
      // Estimate this campaign as 20-30% of bundle allocation
      const estimatedBundleAllocation = 0.25;
      const [bundle] = await db
        .select()
        .from(l2iBundles)
        .where(eq(l2iBundles.id, l2iSubs.bundleId));

      const bundleMonthlyPrice = (bundle?.annualPrice || 10000) / 12;
      const allocatedMonthlyPrice = bundleMonthlyPrice * estimatedBundleAllocation;
      const bundleTotalEstimate = allocatedMonthlyPrice * campaignDurationMonths;

      proposedModels.push({
        model: 'bundle',
        monthlyEstimate: allocatedMonthlyPrice,
        totalEstimate: bundleTotalEstimate,
        rationale: `Portion of L2I bundle (${Math.round(estimatedBundleAllocation * 100)}% allocation)`,
        breakdown: {
          l2iBundle: l2iSubs.sku,
          allocationPercentage: estimatedBundleAllocation,
          bundleMonthlyPrice: bundleMonthlyPrice
        },
        currency: 'EUR'
      });
    }
  }

  // === CUSTOM MODEL ===
  // Suggest custom if other models exceed budget
  const cheapestModel = proposedModels.reduce((min, m) => m.totalEstimate < min.totalEstimate ? m : min);
  if (cheapestModel.totalEstimate > defaultBudget) {
    proposedModels.push({
      model: 'custom',
      monthlyEstimate: defaultBudget / campaignDurationMonths,
      totalEstimate: defaultBudget,
      rationale: `Custom negotiated pricing within budget of €${defaultBudget}`,
      breakdown: {
        fixedFee: Math.round(defaultBudget * 0.3),
        variablePerSession: 100,
        estimatedSessions: estimatedSessions,
        variableCost: Math.round(estimatedSessions * 100)
      },
      currency: 'EUR'
    });
  }

  // Determine recommended model
  let recommendedModel = 'seats'; // Default

  if (defaultBudget < 5000) {
    recommendedModel = 'credits'; // Best for low budgets
  } else if (defaultBudget > 50000 && proposedModels.some(m => m.model === 'bundle')) {
    recommendedModel = 'bundle'; // Bundle is cost-effective for large budgets
  } else if (capacity.beneficiaries > 100) {
    recommendedModel = 'iaas'; // IAAS good for large learner populations
  }

  return {
    templateName: template.name,
    beneficiaryGroupName: group.name,
    capacity,
    proposedPricingModels: proposedModels,
    campaignDurationMonths,
    recommendedModel,
    roiProjection: {
      minimumSROI: 3.0,
      expectedVIS: 75,
      confidenceLevel: 'Medium'
    },
    createdAt: new Date().toISOString()
  };
}

/**
 * Calculate total campaign cost based on pricing model
 * @param campaign - Campaign record
 * @returns Total estimated cost
 */
export function calculateTotalCost(campaign: Campaign): number {
  const durationMonths = Math.ceil(
    (new Date(campaign.endDate).getTime() - new Date(campaign.startDate).getTime()) /
    (1000 * 60 * 60 * 24 * 30)
  );

  switch (campaign.pricingModel) {
    case 'seats':
      if (campaign.committedSeats && campaign.seatPricePerMonth) {
        return campaign.committedSeats * parseFloat(campaign.seatPricePerMonth.toString()) * durationMonths;
      }
      return 0;

    case 'credits':
      // Note: Actual cost depends on credit unit pricing in billing system
      // This is a placeholder estimate
      return campaign.creditAllocation ? campaign.creditAllocation * 0.5 : 0;

    case 'iaas':
      if (campaign.iaasMetrics) {
        return campaign.iaasMetrics.learnersCommitted * campaign.iaasMetrics.pricePerLearner;
      }
      return 0;

    case 'bundle':
      // Bundle cost is handled by billing system
      return 0;

    case 'custom':
      if (campaign.customPricingTerms) {
        let total = campaign.customPricingTerms.fixedFee || 0;
        // Estimate variable costs
        if (campaign.customPricingTerms.variableComponents) {
          total += campaign.customPricingTerms.variableComponents.reduce((sum, comp) => {
            return sum + (comp.rate * 50); // Estimate 50 units
          }, 0);
        }
        return total;
      }
      return 0;

    default:
      return 0;
  }
}

/**
 * Get pricing model details for display/reporting
 * @param campaign - Campaign record
 * @returns Human-readable pricing description
 */
export function getPricingModelDescription(campaign: Campaign): string {
  switch (campaign.pricingModel) {
    case 'seats':
      return `${campaign.committedSeats} seats × €${campaign.seatPricePerMonth}/month`;

    case 'credits':
      return `${campaign.creditAllocation} credits @ €0.50/credit`;

    case 'iaas':
      if (campaign.iaasMetrics) {
        return `${campaign.iaasMetrics.learnersCommitted} learners × €${campaign.iaasMetrics.pricePerLearner}/learner`;
      }
      return 'IAAS (Impact-as-a-Service)';

    case 'bundle':
      return `Bundle allocation (${Math.round(parseFloat(campaign.bundleAllocationPercentage || '0') * 100)}%)`;

    case 'custom':
      if (campaign.customPricingTerms?.description) {
        return campaign.customPricingTerms.description;
      }
      return 'Custom pricing';

    default:
      return 'Unknown pricing model';
  }
}
