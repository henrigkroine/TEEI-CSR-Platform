/**
 * Campaign Instantiator
 *
 * Core logic for creating campaigns with validation, config merging, and instance creation
 */

import { pool } from '../db/connection.js';
import type { Campaign } from '@teei/shared-schema';
import {
  createCampaignInputSchema,
  validateTemplateGroupCompatibility,
  validateCompanyExists,
  ValidationError,
  type CreateCampaignInput,
} from './campaign-validator.js';
import { mergeConfigs, validateConfigOverrides } from './config-merger.js';
import { createInitialInstance, hasExistingInstances } from './instance-creator.js';
import { createServiceLogger } from '@teei/shared-utils';

const logger = createServiceLogger('campaign-instantiator');

/**
 * Campaign creation options
 */
export interface CreateCampaignOptions {
  /**
   * Auto-create initial ProgramInstance when campaign status is 'active'
   * Default: true
   */
  autoCreateInstance?: boolean;

  /**
   * Skip template-group compatibility validation
   * Default: false (validation is performed)
   */
  skipCompatibilityValidation?: boolean;
}

/**
 * Campaign creation result
 */
export interface CampaignCreationResult {
  campaign: Campaign;
  instance?: any; // ProgramInstance if auto-created
  validationWarnings: string[];
}

/**
 * Create a new campaign with full validation
 *
 * This function:
 * 1. Validates input data structure (Zod)
 * 2. Validates company exists
 * 3. Validates template + group compatibility
 * 4. Validates config overrides are compatible with template
 * 5. Creates campaign record
 * 6. Auto-creates initial ProgramInstance if campaign is 'active' (optional)
 *
 * @param input - Campaign creation input
 * @param options - Creation options
 * @returns Created campaign with optional instance
 * @throws ValidationError if validation fails
 */
export async function createCampaign(
  input: CreateCampaignInput,
  options: CreateCampaignOptions = {}
): Promise<CampaignCreationResult> {
  const {
    autoCreateInstance = true,
    skipCompatibilityValidation = false,
  } = options;

  const validationWarnings: string[] = [];

  // ========================================================================
  // STEP 1: Validate input data structure
  // ========================================================================
  logger.info('Validating campaign input data', { name: input.name });

  const validationResult = createCampaignInputSchema.safeParse(input);
  if (!validationResult.success) {
    const errors = validationResult.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`);
    throw new ValidationError(
      `Campaign validation failed: ${errors.join('; ')}`,
      'input',
      'VALIDATION_ERROR'
    );
  }

  const validatedInput = validationResult.data;

  // ========================================================================
  // STEP 2: Validate company exists
  // ========================================================================
  logger.info('Validating company exists', { companyId: validatedInput.companyId });

  const companyExists = await validateCompanyExists(validatedInput.companyId);
  if (!companyExists) {
    throw new ValidationError(
      `Company ${validatedInput.companyId} not found`,
      'companyId',
      'COMPANY_NOT_FOUND'
    );
  }

  // ========================================================================
  // STEP 3: Validate template + group compatibility
  // ========================================================================
  if (!skipCompatibilityValidation) {
    logger.info('Validating template-group compatibility', {
      templateId: validatedInput.programTemplateId,
      groupId: validatedInput.beneficiaryGroupId,
    });

    const compatibility = await validateTemplateGroupCompatibility(
      validatedInput.programTemplateId,
      validatedInput.beneficiaryGroupId
    );

    if (!compatibility.isCompatible) {
      throw new ValidationError(
        `Template and beneficiary group are not compatible: ${compatibility.reasons.join('; ')}`,
        'programTemplateId',
        'INCOMPATIBLE_TEMPLATE_GROUP'
      );
    }

    // Store template and group for later use
    const template = compatibility.template!;
    const group = compatibility.group!;

    // ========================================================================
    // STEP 4: Validate config overrides
    // ========================================================================
    if (validatedInput.configOverrides && Object.keys(validatedInput.configOverrides).length > 0) {
      logger.info('Validating config overrides', {
        overrideKeys: Object.keys(validatedInput.configOverrides),
      });

      const configValidation = validateConfigOverrides(
        template.defaultConfig,
        validatedInput.configOverrides
      );

      if (!configValidation.valid) {
        // Treat config validation errors as warnings, not hard failures
        validationWarnings.push(...configValidation.errors);
        logger.warn('Config override validation warnings', { errors: configValidation.errors });
      }
    }
  }

  // ========================================================================
  // STEP 5: Create campaign record
  // ========================================================================
  logger.info('Creating campaign record', { name: validatedInput.name });

  const client = await pool.connect();
  let campaign: Campaign;

  try {
    await client.query('BEGIN');

    // Calculate initial capacity utilization (0 since no participants yet)
    const capacityUtilization = 0;

    // Determine initial status (use 'draft' if not specified)
    const status = 'draft';

    // Insert campaign
    const insertResult = await client.query<Campaign>(
      `INSERT INTO campaigns (
        name,
        description,
        company_id,
        program_template_id,
        beneficiary_group_id,
        start_date,
        end_date,
        quarter,
        status,
        priority,
        target_volunteers,
        current_volunteers,
        target_beneficiaries,
        current_beneficiaries,
        max_sessions,
        current_sessions,
        budget_allocated,
        budget_spent,
        currency,
        pricing_model,
        committed_seats,
        seat_price_per_month,
        credit_allocation,
        credit_consumption_rate,
        credits_remaining,
        iaas_metrics,
        l2i_subscription_id,
        bundle_allocation_percentage,
        custom_pricing_terms,
        config_overrides,
        capacity_utilization,
        is_near_capacity,
        is_over_capacity,
        tags,
        internal_notes,
        created_by
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36
      )
      RETURNING *`,
      [
        validatedInput.name,
        validatedInput.description || null,
        validatedInput.companyId,
        validatedInput.programTemplateId,
        validatedInput.beneficiaryGroupId,
        validatedInput.startDate,
        validatedInput.endDate,
        validatedInput.quarter || null,
        status,
        validatedInput.priority,
        validatedInput.targetVolunteers,
        0, // currentVolunteers
        validatedInput.targetBeneficiaries,
        0, // currentBeneficiaries
        validatedInput.maxSessions || null,
        0, // currentSessions
        validatedInput.budgetAllocated.toString(),
        '0', // budgetSpent
        validatedInput.currency,
        validatedInput.pricingModel,
        validatedInput.committedSeats || null,
        validatedInput.seatPricePerMonth?.toString() || null,
        validatedInput.creditAllocation || null,
        validatedInput.creditConsumptionRate?.toString() || null,
        validatedInput.creditAllocation || null, // creditsRemaining (initial = allocation)
        validatedInput.iaasMetrics ? JSON.stringify(validatedInput.iaasMetrics) : null,
        validatedInput.l2iSubscriptionId || null,
        validatedInput.bundleAllocationPercentage?.toString() || null,
        validatedInput.customPricingTerms ? JSON.stringify(validatedInput.customPricingTerms) : null,
        JSON.stringify(validatedInput.configOverrides),
        capacityUtilization.toString(),
        false, // isNearCapacity
        false, // isOverCapacity
        JSON.stringify(validatedInput.tags),
        validatedInput.internalNotes || null,
        validatedInput.createdBy || null,
      ]
    );

    campaign = insertResult.rows[0]!;

    await client.query('COMMIT');

    logger.info('Campaign created successfully', {
      campaignId: campaign.id,
      name: campaign.name,
    });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to create campaign', { error });
    throw error;
  } finally {
    client.release();
  }

  // ========================================================================
  // STEP 6: Auto-create initial ProgramInstance (optional)
  // ========================================================================
  let instance;

  if (autoCreateInstance && status === 'active') {
    logger.info('Auto-creating initial program instance', { campaignId: campaign.id });

    try {
      // Only create if campaign doesn't already have instances
      const alreadyHasInstances = await hasExistingInstances(campaign.id);

      if (!alreadyHasInstances) {
        instance = await createInitialInstance(campaign.id);
        logger.info('Initial program instance created', {
          campaignId: campaign.id,
          instanceId: instance.id,
        });
      } else {
        logger.info('Campaign already has instances, skipping auto-creation', {
          campaignId: campaign.id,
        });
      }
    } catch (error) {
      logger.error('Failed to create initial instance', {
        campaignId: campaign.id,
        error,
      });
      // Don't fail campaign creation if instance creation fails
      validationWarnings.push(`Failed to auto-create initial instance: ${error}`);
    }
  }

  // ========================================================================
  // Return result
  // ========================================================================
  return {
    campaign,
    instance,
    validationWarnings,
  };
}
