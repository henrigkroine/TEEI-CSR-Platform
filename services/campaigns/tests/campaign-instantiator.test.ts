/**
 * Campaign Instantiator Tests
 *
 * Comprehensive unit tests for campaign creation, validation, and instance auto-creation
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from 'vitest';
import { createCampaign, type CreateCampaignOptions } from '../src/lib/campaign-instantiator.js';
import { validateTemplateGroupCompatibility, ValidationError } from '../src/lib/campaign-validator.js';
import { mergeConfigs, validateConfigOverrides } from '../src/lib/config-merger.js';
import { createInitialInstance, hasExistingInstances } from '../src/lib/instance-creator.js';
import { pool, closePool } from '../src/db/connection.js';
import type { CreateCampaignInput } from '../src/lib/campaign-validator.js';
import type { ProgramTemplateConfig } from '@teei/shared-schema';

// ============================================================================
// TEST SETUP & TEARDOWN
// ============================================================================

let testCompanyId: string;
let testTemplateId: string;
let testGroupId: string;

beforeAll(async () => {
  // Create test fixtures
  const client = await pool.connect();
  try {
    // Create test company
    const companyResult = await client.query(
      `INSERT INTO companies (name, email, status) VALUES ($1, $2, $3) RETURNING id`,
      ['Test Company', 'test@example.com', 'active']
    );
    testCompanyId = companyResult.rows[0]!.id;

    // Create test beneficiary group
    const groupResult = await client.query(
      `INSERT INTO beneficiary_groups (
        name, group_type, country_code, primary_languages, eligible_program_types, tags
      ) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id`,
      [
        'Test Refugees',
        'refugees',
        'DE',
        JSON.stringify(['ar', 'en']),
        JSON.stringify(['mentorship', 'language']),
        JSON.stringify(['integration', 'employment'])
      ]
    );
    testGroupId = groupResult.rows[0]!.id;

    // Create test program template
    const templateConfig = {
      sessionFormat: '1-on-1' as const,
      sessionDuration: 60,
      sessionFrequency: 'weekly' as const,
      totalDuration: 24,
      matchingCriteria: ['skills', 'industry'],
      autoMatching: false,
      focusAreas: ['career'],
      outcomesTracked: ['job_readiness'],
    };

    const templateResult = await client.query(
      `INSERT INTO program_templates (
        name, program_type, version, default_config, suitable_for_groups,
        default_min_participants, default_max_participants, default_volunteers_needed, outcome_metrics
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
      [
        'Test Mentorship Template',
        'mentorship',
        '1.0.0',
        JSON.stringify(templateConfig),
        JSON.stringify(['integration', 'employment']),
        1,
        50,
        1,
        JSON.stringify(['job_readiness'])
      ]
    );
    testTemplateId = templateResult.rows[0]!.id;
  } finally {
    client.release();
  }
});

afterAll(async () => {
  // Clean up test fixtures
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM program_instances WHERE company_id = $1', [testCompanyId]);
    await client.query('DELETE FROM campaigns WHERE company_id = $1', [testCompanyId]);
    await client.query('DELETE FROM program_templates WHERE id = $1', [testTemplateId]);
    await client.query('DELETE FROM beneficiary_groups WHERE id = $1', [testGroupId]);
    await client.query('DELETE FROM companies WHERE id = $1', [testCompanyId]);
  } finally {
    client.release();
  }
  await closePool();
});

beforeEach(async () => {
  // Clean up campaigns between tests
  const client = await pool.connect();
  try {
    await client.query('DELETE FROM program_instances WHERE company_id = $1', [testCompanyId]);
    await client.query('DELETE FROM campaigns WHERE company_id = $1', [testCompanyId]);
  } finally {
    client.release();
  }
});

// ============================================================================
// CONFIG MERGER TESTS
// ============================================================================

describe('Config Merger', () => {
  it('should merge template config with empty overrides', () => {
    const templateConfig: ProgramTemplateConfig = {
      sessionFormat: '1-on-1',
      sessionDuration: 60,
      sessionFrequency: 'weekly',
      totalDuration: 24,
      matchingCriteria: ['skills'],
      autoMatching: false,
      focusAreas: ['career'],
      outcomesTracked: ['job_readiness'],
    } as any;

    const result = mergeConfigs(templateConfig, {});

    expect(result.merged).toEqual(templateConfig);
    expect(result.overrides).toHaveLength(0);
  });

  it('should merge template config with simple overrides', () => {
    const templateConfig: ProgramTemplateConfig = {
      sessionFormat: '1-on-1',
      sessionDuration: 60,
      sessionFrequency: 'weekly',
      totalDuration: 24,
      matchingCriteria: ['skills'],
      autoMatching: false,
      focusAreas: ['career'],
      outcomesTracked: ['job_readiness'],
    } as any;

    const overrides = {
      sessionDuration: 90,
      sessionFrequency: 'bi-weekly',
    };

    const result = mergeConfigs(templateConfig, overrides);

    expect(result.merged.sessionDuration).toBe(90);
    expect((result.merged as any).sessionFrequency).toBe('bi-weekly');
    expect(result.merged.sessionFormat).toBe('1-on-1');
    expect(result.overrides).toContain('sessionDuration');
    expect(result.overrides).toContain('sessionFrequency');
  });

  it('should merge nested objects', () => {
    const templateConfig: ProgramTemplateConfig = {
      sessionFormat: '1-on-1',
      sessionDuration: 60,
      sessionFrequency: 'weekly',
      totalDuration: 24,
      matchingCriteria: ['skills'],
      autoMatching: false,
      focusAreas: ['career'],
      outcomesTracked: ['job_readiness'],
      mentorRequirements: {
        minExperience: 3,
        industries: ['tech'],
      },
    } as any;

    const overrides = {
      mentorRequirements: {
        minExperience: 5,
      },
    };

    const result = mergeConfigs(templateConfig, overrides);

    expect((result.merged as any).mentorRequirements.minExperience).toBe(5);
    expect((result.merged as any).mentorRequirements.industries).toEqual(['tech']);
    expect(result.overrides).toContain('mentorRequirements.minExperience');
  });

  it('should validate config overrides type compatibility', () => {
    const templateConfig: ProgramTemplateConfig = {
      sessionDuration: 60,
      sessionFrequency: 'weekly',
      matchingCriteria: ['skills'],
    } as any;

    const validOverrides = {
      sessionDuration: 90,
      matchingCriteria: ['language'],
    };

    const validation = validateConfigOverrides(templateConfig, validOverrides);
    expect(validation.valid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should detect type mismatches in overrides', () => {
    const templateConfig: ProgramTemplateConfig = {
      sessionDuration: 60,
      matchingCriteria: ['skills'],
    } as any;

    const invalidOverrides = {
      sessionDuration: 'ninety', // Should be number
    };

    const validation = validateConfigOverrides(templateConfig, invalidOverrides);
    expect(validation.valid).toBe(false);
    expect(validation.errors.length).toBeGreaterThan(0);
  });
});

// ============================================================================
// TEMPLATE-GROUP COMPATIBILITY TESTS
// ============================================================================

describe('Template-Group Compatibility Validation', () => {
  it('should validate compatible template and group', async () => {
    const result = await validateTemplateGroupCompatibility(testTemplateId, testGroupId);

    expect(result.isCompatible).toBe(true);
    expect(result.reasons).toHaveLength(0);
    expect(result.template).toBeDefined();
    expect(result.group).toBeDefined();
  });

  it('should reject inactive template', async () => {
    const client = await pool.connect();
    let inactiveTemplateId: string;

    try {
      // Create inactive template
      const result = await client.query(
        `INSERT INTO program_templates (
          name, program_type, version, default_config, is_active,
          default_min_participants, default_max_participants, default_volunteers_needed, outcome_metrics
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id`,
        [
          'Inactive Template',
          'mentorship',
          '1.0.0',
          JSON.stringify({ sessionFormat: '1-on-1' }),
          false,
          1,
          50,
          1,
          JSON.stringify([])
        ]
      );
      inactiveTemplateId = result.rows[0]!.id;

      const validation = await validateTemplateGroupCompatibility(inactiveTemplateId, testGroupId);

      expect(validation.isCompatible).toBe(false);
      expect(validation.reasons[0]).toContain('not found or is inactive');
    } finally {
      await client.query('DELETE FROM program_templates WHERE id = $1', [inactiveTemplateId]);
      client.release();
    }
  });

  it('should reject non-existent group', async () => {
    const fakeGroupId = '00000000-0000-0000-0000-000000000000';
    const result = await validateTemplateGroupCompatibility(testTemplateId, fakeGroupId);

    expect(result.isCompatible).toBe(false);
    expect(result.reasons[0]).toContain('not found or is inactive');
  });
});

// ============================================================================
// CAMPAIGN CREATION TESTS
// ============================================================================

describe('Campaign Creation', () => {
  it('should create campaign with valid input', async () => {
    const input: CreateCampaignInput = {
      name: 'Test Campaign',
      companyId: testCompanyId,
      programTemplateId: testTemplateId,
      beneficiaryGroupId: testGroupId,
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      targetVolunteers: 10,
      targetBeneficiaries: 20,
      budgetAllocated: 10000,
      currency: 'EUR',
      pricingModel: 'seats',
      committedSeats: 10,
      seatPricePerMonth: 500,
      configOverrides: {},
      tags: ['test'],
    };

    const result = await createCampaign(input, { autoCreateInstance: false });

    expect(result.campaign).toBeDefined();
    expect(result.campaign.name).toBe('Test Campaign');
    expect(result.campaign.status).toBe('draft');
    expect(result.campaign.targetVolunteers).toBe(10);
    expect(result.campaign.targetBeneficiaries).toBe(20);
    expect(result.validationWarnings).toHaveLength(0);
  });

  it('should reject campaign with invalid dates', async () => {
    const input: CreateCampaignInput = {
      name: 'Invalid Campaign',
      companyId: testCompanyId,
      programTemplateId: testTemplateId,
      beneficiaryGroupId: testGroupId,
      startDate: '2025-06-30',
      endDate: '2025-01-01', // Before start date
      targetVolunteers: 10,
      targetBeneficiaries: 20,
      budgetAllocated: 10000,
      currency: 'EUR',
      pricingModel: 'seats',
      committedSeats: 10,
      seatPricePerMonth: 500,
      configOverrides: {},
      tags: [],
    };

    await expect(createCampaign(input)).rejects.toThrow(ValidationError);
  });

  it('should reject campaign with missing pricing fields for seats model', async () => {
    const input: CreateCampaignInput = {
      name: 'Test Campaign',
      companyId: testCompanyId,
      programTemplateId: testTemplateId,
      beneficiaryGroupId: testGroupId,
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      targetVolunteers: 10,
      targetBeneficiaries: 20,
      budgetAllocated: 10000,
      currency: 'EUR',
      pricingModel: 'seats',
      // Missing committedSeats and seatPricePerMonth
      configOverrides: {},
      tags: [],
    };

    await expect(createCampaign(input)).rejects.toThrow(ValidationError);
  });

  it('should reject campaign with non-existent company', async () => {
    const input: CreateCampaignInput = {
      name: 'Test Campaign',
      companyId: '00000000-0000-0000-0000-000000000000',
      programTemplateId: testTemplateId,
      beneficiaryGroupId: testGroupId,
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      targetVolunteers: 10,
      targetBeneficiaries: 20,
      budgetAllocated: 10000,
      currency: 'EUR',
      pricingModel: 'seats',
      committedSeats: 10,
      seatPricePerMonth: 500,
      configOverrides: {},
      tags: [],
    };

    await expect(createCampaign(input)).rejects.toThrow('Company');
  });

  it('should apply config overrides correctly', async () => {
    const input: CreateCampaignInput = {
      name: 'Test Campaign with Overrides',
      companyId: testCompanyId,
      programTemplateId: testTemplateId,
      beneficiaryGroupId: testGroupId,
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      targetVolunteers: 10,
      targetBeneficiaries: 20,
      budgetAllocated: 10000,
      currency: 'EUR',
      pricingModel: 'seats',
      committedSeats: 10,
      seatPricePerMonth: 500,
      configOverrides: {
        sessionDuration: 90,
        sessionFrequency: 'bi-weekly',
      },
      tags: [],
    };

    const result = await createCampaign(input, { autoCreateInstance: false });

    expect(result.campaign.configOverrides).toEqual({
      sessionDuration: 90,
      sessionFrequency: 'bi-weekly',
    });
  });
});

// ============================================================================
// PROGRAM INSTANCE TESTS
// ============================================================================

describe('Program Instance Creation', () => {
  it('should create initial instance for campaign', async () => {
    // First create a campaign
    const input: CreateCampaignInput = {
      name: 'Test Campaign for Instance',
      companyId: testCompanyId,
      programTemplateId: testTemplateId,
      beneficiaryGroupId: testGroupId,
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      targetVolunteers: 10,
      targetBeneficiaries: 20,
      budgetAllocated: 10000,
      currency: 'EUR',
      pricingModel: 'seats',
      committedSeats: 10,
      seatPricePerMonth: 500,
      configOverrides: {},
      tags: [],
    };

    const campaignResult = await createCampaign(input, { autoCreateInstance: false });
    const campaign = campaignResult.campaign;

    // Create instance
    const instance = await createInitialInstance(campaign.id);

    expect(instance).toBeDefined();
    expect(instance.campaignId).toBe(campaign.id);
    expect(instance.companyId).toBe(testCompanyId);
    expect(instance.programTemplateId).toBe(testTemplateId);
    expect(instance.beneficiaryGroupId).toBe(testGroupId);
    expect(instance.status).toBe('planned');
    expect(instance.enrolledVolunteers).toBe(0);
    expect(instance.enrolledBeneficiaries).toBe(0);
  });

  it('should merge config from template and campaign overrides', async () => {
    const input: CreateCampaignInput = {
      name: 'Test Campaign',
      companyId: testCompanyId,
      programTemplateId: testTemplateId,
      beneficiaryGroupId: testGroupId,
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      targetVolunteers: 10,
      targetBeneficiaries: 20,
      budgetAllocated: 10000,
      currency: 'EUR',
      pricingModel: 'seats',
      committedSeats: 10,
      seatPricePerMonth: 500,
      configOverrides: {
        sessionDuration: 90,
      },
      tags: [],
    };

    const campaignResult = await createCampaign(input, { autoCreateInstance: false });
    const instance = await createInitialInstance(campaignResult.campaign.id);

    const config = instance.config as any;
    expect(config.sessionDuration).toBe(90); // From override
    expect(config.sessionFrequency).toBe('weekly'); // From template
  });

  it('should check if campaign has existing instances', async () => {
    const input: CreateCampaignInput = {
      name: 'Test Campaign',
      companyId: testCompanyId,
      programTemplateId: testTemplateId,
      beneficiaryGroupId: testGroupId,
      startDate: '2025-01-01',
      endDate: '2025-06-30',
      targetVolunteers: 10,
      targetBeneficiaries: 20,
      budgetAllocated: 10000,
      currency: 'EUR',
      pricingModel: 'seats',
      committedSeats: 10,
      seatPricePerMonth: 500,
      configOverrides: {},
      tags: [],
    };

    const campaignResult = await createCampaign(input, { autoCreateInstance: false });

    let hasInstances = await hasExistingInstances(campaignResult.campaign.id);
    expect(hasInstances).toBe(false);

    await createInitialInstance(campaignResult.campaign.id);

    hasInstances = await hasExistingInstances(campaignResult.campaign.id);
    expect(hasInstances).toBe(true);
  });
});
