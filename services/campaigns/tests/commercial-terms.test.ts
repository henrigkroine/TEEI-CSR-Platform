/**
 * Commercial Terms Manager Tests
 *
 * SWARM 6: Agent 5.5 - commercial-terms-manager
 * Test coverage: ≥80%
 *
 * Tests for:
 * - setPricingTerms
 * - validatePricingTerms
 * - changePricingTier
 * - generatePricingProposal
 * - calculateTotalCost
 * - getPricingModelDescription
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  setPricingTerms,
  validatePricingTerms,
  changePricingTier,
  generatePricingProposal,
  calculateTotalCost,
  getPricingModelDescription,
  PricingTerms,
  PricingValidationResult,
  TierChangeResult,
  PricingProposal
} from '../src/lib/commercial-terms.js';
import { db } from '@teei/shared-schema';
import {
  campaigns,
  beneficiaryGroups,
  programTemplates,
  billingSubscriptions,
  l2iSubscriptions,
  l2iBundles,
  companies,
  Campaign
} from '@teei/shared-schema';
import { eq } from 'drizzle-orm';

// ============================================================================
// TEST SETUP & FIXTURES
// ============================================================================

let testCompanyId: string;
let testCampaignId: string;
let testTemplateId: string;
let testGroupId: string;
let testSubscriptionId: string;
let testL2iSubscriptionId: string;

/**
 * Create test fixtures
 */
async function setupTestData() {
  // Create test company (if not exists)
  const [company] = await db
    .insert(companies)
    .values({
      id: 'test-company-commercial-' + Date.now(),
      name: 'Test Company Commercial',
      email: 'test@example.com',
      tier: 'professional',
      stripeCustomerId: 'cus_test_' + Date.now(),
    })
    .onConflictDoNothing()
    .returning();

  testCompanyId = company?.id || 'test-company-commercial-' + Date.now();

  // Create test billing subscription
  const [subscription] = await db
    .insert(billingSubscriptions)
    .values({
      companyId: testCompanyId,
      customerId: 'test-customer-' + Date.now(),
      stripeSubscriptionId: 'sub_test_' + Date.now(),
      plan: 'professional',
      status: 'active',
      seatCount: 10,
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .returning();

  testSubscriptionId = subscription.id;

  // Create test program template
  const [template] = await db
    .insert(programTemplates)
    .values({
      name: 'Test Mentorship Program',
      description: 'Test template for commercial terms',
      programType: 'mentorship',
      version: '1.0.0',
      defaultConfig: {
        sessionFormat: '1-on-1',
        sessionDuration: 60,
        sessionFrequency: 'weekly'
      },
      defaultMinParticipants: 5,
      defaultMaxParticipants: 50,
      defaultVolunteersNeeded: 10,
      outcomeMetrics: ['integration', 'job_readiness'],
      isActive: true,
      isPublic: true,
    })
    .returning();

  testTemplateId = template.id;

  // Create test beneficiary group
  const [group] = await db
    .insert(beneficiaryGroups)
    .values({
      name: 'Test Refugees Group',
      description: 'Test group for commercial terms',
      groupType: 'refugees',
      countryCode: 'DE',
      primaryLanguages: ['ar', 'en'],
      languageRequirement: 'beginner',
      eligibleProgramTypes: ['mentorship', 'language'],
      isActive: true,
    })
    .returning();

  testGroupId = group.id;

  // Create test campaign
  const [campaign] = await db
    .insert(campaigns)
    .values({
      name: 'Test Pricing Campaign',
      description: 'Test campaign for pricing terms',
      companyId: testCompanyId,
      programTemplateId: testTemplateId,
      beneficiaryGroupId: testGroupId,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-03-31'),
      quarter: '2025-Q1',
      status: 'draft',
      targetVolunteers: 10,
      currentVolunteers: 0,
      targetBeneficiaries: 50,
      currentBeneficiaries: 0,
      budgetAllocated: 50000,
      currency: 'EUR',
      pricingModel: 'seats',
      committedSeats: 10,
      seatPricePerMonth: 500,
      isActive: true,
    })
    .returning();

  testCampaignId = campaign.id;
}

/**
 * Clean up test data
 */
async function teardownTestData() {
  // Clean up in reverse order of dependencies
  try {
    if (testCampaignId) {
      await db.delete(campaigns).where(eq(campaigns.id, testCampaignId));
    }
    if (testL2iSubscriptionId) {
      await db.delete(l2iSubscriptions).where(eq(l2iSubscriptions.id, testL2iSubscriptionId));
    }
    if (testSubscriptionId) {
      await db.delete(billingSubscriptions).where(eq(billingSubscriptions.id, testSubscriptionId));
    }
    if (testGroupId) {
      await db.delete(beneficiaryGroups).where(eq(beneficiaryGroups.id, testGroupId));
    }
    if (testTemplateId) {
      await db.delete(programTemplates).where(eq(programTemplates.id, testTemplateId));
    }
    if (testCompanyId) {
      await db.delete(companies).where(eq(companies.id, testCompanyId));
    }
  } catch (error) {
    console.error('Error in teardown:', error);
  }
}

// ============================================================================
// TEST SUITES
// ============================================================================

describe('Commercial Terms Manager', () => {
  beforeAll(async () => {
    await setupTestData();
  });

  afterAll(async () => {
    await teardownTestData();
  });

  // ========================================================================
  // setPricingTerms Tests
  // ========================================================================

  describe('setPricingTerms', () => {
    it('should set seats pricing terms', async () => {
      const terms: PricingTerms = {
        pricingModel: 'seats',
        seats: {
          committed: 20,
          pricePerMonth: 600,
          currency: 'EUR'
        }
      };

      const result = await setPricingTerms(testCampaignId, terms);

      expect(result).toBeDefined();
      expect(result.pricingModel).toBe('seats');
      expect(result.committedSeats).toBe(20);
      expect(result.seatPricePerMonth).toBe(600);
    });

    it('should set credits pricing terms', async () => {
      const terms: PricingTerms = {
        pricingModel: 'credits',
        credits: {
          allocation: 10000,
          consumptionRate: 10,
          currency: 'EUR'
        }
      };

      const result = await setPricingTerms(testCampaignId, terms);

      expect(result).toBeDefined();
      expect(result.pricingModel).toBe('credits');
      expect(result.creditAllocation).toBe(10000);
      expect(result.creditConsumptionRate).toBe(10);
      expect(result.creditsRemaining).toBe(10000);
    });

    it('should set IAAS pricing terms', async () => {
      const terms: PricingTerms = {
        pricingModel: 'iaas',
        iaas: {
          learnersCommitted: 100,
          pricePerLearner: 150,
          outcomesGuaranteed: ['job_readiness > 0.7'],
          currency: 'EUR'
        }
      };

      const result = await setPricingTerms(testCampaignId, terms);

      expect(result).toBeDefined();
      expect(result.pricingModel).toBe('iaas');
      expect(result.iaasMetrics?.learnersCommitted).toBe(100);
      expect(result.iaasMetrics?.pricePerLearner).toBe(150);
    });

    it('should set custom pricing terms', async () => {
      const terms: PricingTerms = {
        pricingModel: 'custom',
        custom: {
          description: 'Custom pricing for special case',
          fixedFee: 5000,
          currency: 'EUR'
        }
      };

      const result = await setPricingTerms(testCampaignId, terms);

      expect(result).toBeDefined();
      expect(result.pricingModel).toBe('custom');
      expect(result.customPricingTerms?.fixedFee).toBe(5000);
    });

    it('should throw error for non-existent campaign', async () => {
      const terms: PricingTerms = {
        pricingModel: 'seats',
        seats: {
          committed: 10,
          pricePerMonth: 500,
          currency: 'EUR'
        }
      };

      await expect(setPricingTerms('non-existent-id', terms)).rejects.toThrow();
    });

    it('should throw error if validation fails', async () => {
      const terms: PricingTerms = {
        pricingModel: 'seats',
        seats: {
          committed: -5, // Invalid: negative seats
          pricePerMonth: 500,
          currency: 'EUR'
        }
      };

      await expect(setPricingTerms(testCampaignId, terms)).rejects.toThrow();
    });
  });

  // ========================================================================
  // validatePricingTerms Tests
  // ========================================================================

  describe('validatePricingTerms', () => {
    it('should validate valid seats pricing', async () => {
      const terms: PricingTerms = {
        pricingModel: 'seats',
        seats: {
          committed: 10,
          pricePerMonth: 500,
          currency: 'EUR'
        }
      };

      const result = await validatePricingTerms(testCampaignId, terms);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject seats pricing with invalid committed seats', async () => {
      const terms: PricingTerms = {
        pricingModel: 'seats',
        seats: {
          committed: 0,
          pricePerMonth: 500,
          currency: 'EUR'
        }
      };

      const result = await validatePricingTerms(testCampaignId, terms);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should reject seats pricing with invalid price', async () => {
      const terms: PricingTerms = {
        pricingModel: 'seats',
        seats: {
          committed: 10,
          pricePerMonth: -500,
          currency: 'EUR'
        }
      };

      const result = await validatePricingTerms(testCampaignId, terms);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate credits pricing', async () => {
      const terms: PricingTerms = {
        pricingModel: 'credits',
        credits: {
          allocation: 5000,
          consumptionRate: 10,
          currency: 'EUR'
        }
      };

      const result = await validatePricingTerms(testCampaignId, terms);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate IAAS pricing', async () => {
      const terms: PricingTerms = {
        pricingModel: 'iaas',
        iaas: {
          learnersCommitted: 50,
          pricePerLearner: 150,
          outcomesGuaranteed: ['engagement > 0.8'],
          currency: 'EUR'
        }
      };

      const result = await validatePricingTerms(testCampaignId, terms);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should warn when pricing exceeds budget', async () => {
      const terms: PricingTerms = {
        pricingModel: 'seats',
        seats: {
          committed: 100, // Very high committed seats
          pricePerMonth: 1000, // High price
          currency: 'EUR'
        }
      };

      const result = await validatePricingTerms(testCampaignId, terms);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should return error for non-existent campaign', async () => {
      const terms: PricingTerms = {
        pricingModel: 'seats',
        seats: {
          committed: 10,
          pricePerMonth: 500,
          currency: 'EUR'
        }
      };

      const result = await validatePricingTerms('non-existent-id', terms);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  // ========================================================================
  // changePricingTier Tests
  // ========================================================================

  describe('changePricingTier', () => {
    it('should change from seats to credits', async () => {
      // First, set seats pricing
      const seatsTerms: PricingTerms = {
        pricingModel: 'seats',
        seats: {
          committed: 10,
          pricePerMonth: 500,
          currency: 'EUR'
        }
      };
      await setPricingTerms(testCampaignId, seatsTerms);

      // Now change to credits
      const creditsTerms: PricingTerms = {
        pricingModel: 'credits',
        credits: {
          allocation: 5000,
          consumptionRate: 10,
          currency: 'EUR'
        }
      };

      const result = await changePricingTier(testCampaignId, creditsTerms);

      expect(result.success).toBe(true);
      expect(result.oldTerms.pricingModel).toBe('seats');
      expect(result.newTerms.pricingModel).toBe('credits');
      expect(result.campaignId).toBe(testCampaignId);
    });

    it('should change from credits to IAAS', async () => {
      // First, set credits pricing
      const creditsTerms: PricingTerms = {
        pricingModel: 'credits',
        credits: {
          allocation: 5000,
          consumptionRate: 10,
          currency: 'EUR'
        }
      };
      await setPricingTerms(testCampaignId, creditsTerms);

      // Now change to IAAS
      const iaasTerms: PricingTerms = {
        pricingModel: 'iaas',
        iaas: {
          learnersCommitted: 100,
          pricePerLearner: 150,
          outcomesGuaranteed: ['job_readiness > 0.7'],
          currency: 'EUR'
        }
      };

      const result = await changePricingTier(testCampaignId, iaasTerms);

      expect(result.success).toBe(true);
      expect(result.newTerms.pricingModel).toBe('iaas');
      expect(result.effectiveDate).toBeDefined();
    });

    it('should throw error for invalid new tier', async () => {
      const invalidTerms: PricingTerms = {
        pricingModel: 'seats',
        seats: {
          committed: -5, // Invalid
          pricePerMonth: 500,
          currency: 'EUR'
        }
      };

      await expect(changePricingTier(testCampaignId, invalidTerms)).rejects.toThrow();
    });

    it('should throw error for non-existent campaign', async () => {
      const terms: PricingTerms = {
        pricingModel: 'seats',
        seats: {
          committed: 10,
          pricePerMonth: 500,
          currency: 'EUR'
        }
      };

      await expect(changePricingTier('non-existent-id', terms)).rejects.toThrow();
    });
  });

  // ========================================================================
  // generatePricingProposal Tests
  // ========================================================================

  describe('generatePricingProposal', () => {
    it('should generate pricing proposal with multiple models', async () => {
      const proposal = await generatePricingProposal(
        testTemplateId,
        testGroupId,
        {
          beneficiaries: 50,
          volunteers: 10,
          sessions: 20
        },
        testCompanyId,
        25000,
        3
      );

      expect(proposal).toBeDefined();
      expect(proposal.templateName).toBe('Test Mentorship Program');
      expect(proposal.beneficiaryGroupName).toBe('Test Refugees Group');
      expect(proposal.proposedPricingModels.length).toBeGreaterThan(0);
      expect(proposal.recommendedModel).toBeDefined();
      expect(proposal.roiProjection).toBeDefined();
    });

    it('should include seats model in proposal', async () => {
      const proposal = await generatePricingProposal(
        testTemplateId,
        testGroupId,
        { beneficiaries: 50 },
        testCompanyId
      );

      const seatsModel = proposal.proposedPricingModels.find(m => m.model === 'seats');
      expect(seatsModel).toBeDefined();
      expect(seatsModel?.totalEstimate).toBeGreaterThan(0);
    });

    it('should include credits model in proposal', async () => {
      const proposal = await generatePricingProposal(
        testTemplateId,
        testGroupId,
        { beneficiaries: 50 },
        testCompanyId
      );

      const creditsModel = proposal.proposedPricingModels.find(m => m.model === 'credits');
      expect(creditsModel).toBeDefined();
      expect(creditsModel?.totalEstimate).toBeGreaterThan(0);
    });

    it('should include IAAS model in proposal', async () => {
      const proposal = await generatePricingProposal(
        testTemplateId,
        testGroupId,
        { beneficiaries: 50 },
        testCompanyId
      );

      const iaasModel = proposal.proposedPricingModels.find(m => m.model === 'iaas');
      expect(iaasModel).toBeDefined();
      expect(iaasModel?.totalEstimate).toBeGreaterThan(0);
    });

    it('should recommend credits for low budget', async () => {
      const proposal = await generatePricingProposal(
        testTemplateId,
        testGroupId,
        { beneficiaries: 20 },
        testCompanyId,
        2000, // Low budget
        1
      );

      expect(proposal.recommendedModel).toBe('credits');
    });

    it('should recommend IAAS for large learner population', async () => {
      const proposal = await generatePricingProposal(
        testTemplateId,
        testGroupId,
        { beneficiaries: 500 }, // Large population
        testCompanyId,
        100000,
        6
      );

      // IAAS or bundle should be recommended for large populations
      expect(['iaas', 'bundle', 'seats']).toContain(proposal.recommendedModel);
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        generatePricingProposal(
          'non-existent-template',
          testGroupId,
          { beneficiaries: 50 },
          testCompanyId
        )
      ).rejects.toThrow();
    });

    it('should throw error for non-existent group', async () => {
      await expect(
        generatePricingProposal(
          testTemplateId,
          'non-existent-group',
          { beneficiaries: 50 },
          testCompanyId
        )
      ).rejects.toThrow();
    });
  });

  // ========================================================================
  // calculateTotalCost Tests
  // ========================================================================

  describe('calculateTotalCost', () => {
    it('should calculate seats model cost', async () => {
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, testCampaignId));

      // Set seats pricing
      const seatsTerms: PricingTerms = {
        pricingModel: 'seats',
        seats: {
          committed: 10,
          pricePerMonth: 500,
          currency: 'EUR'
        }
      };
      await setPricingTerms(testCampaignId, seatsTerms);

      const [updated] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, testCampaignId));

      const cost = calculateTotalCost(updated);
      expect(cost).toBeGreaterThan(0);
      expect(cost).toBe(10 * 500 * 3); // 10 seats × €500 × 3 months
    });

    it('should calculate credits model cost', async () => {
      const creditsTerms: PricingTerms = {
        pricingModel: 'credits',
        credits: {
          allocation: 5000,
          consumptionRate: 10,
          currency: 'EUR'
        }
      };
      await setPricingTerms(testCampaignId, creditsTerms);

      const [updated] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, testCampaignId));

      const cost = calculateTotalCost(updated);
      expect(cost).toBeGreaterThan(0);
    });

    it('should calculate IAAS model cost', async () => {
      const iaasTerms: PricingTerms = {
        pricingModel: 'iaas',
        iaas: {
          learnersCommitted: 100,
          pricePerLearner: 150,
          outcomesGuaranteed: ['job_readiness > 0.7'],
          currency: 'EUR'
        }
      };
      await setPricingTerms(testCampaignId, iaasTerms);

      const [updated] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, testCampaignId));

      const cost = calculateTotalCost(updated);
      expect(cost).toBe(100 * 150); // 100 learners × €150
    });

    it('should return 0 for unknown pricing model', async () => {
      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, testCampaignId));

      const mockCampaign = {
        ...campaign,
        pricingModel: 'unknown' as any
      };

      const cost = calculateTotalCost(mockCampaign);
      expect(cost).toBe(0);
    });
  });

  // ========================================================================
  // getPricingModelDescription Tests
  // ========================================================================

  describe('getPricingModelDescription', () => {
    it('should describe seats pricing model', async () => {
      const seatsTerms: PricingTerms = {
        pricingModel: 'seats',
        seats: {
          committed: 20,
          pricePerMonth: 600,
          currency: 'EUR'
        }
      };
      await setPricingTerms(testCampaignId, seatsTerms);

      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, testCampaignId));

      const description = getPricingModelDescription(campaign);
      expect(description).toContain('20');
      expect(description).toContain('600');
    });

    it('should describe credits pricing model', async () => {
      const creditsTerms: PricingTerms = {
        pricingModel: 'credits',
        credits: {
          allocation: 10000,
          consumptionRate: 10,
          currency: 'EUR'
        }
      };
      await setPricingTerms(testCampaignId, creditsTerms);

      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, testCampaignId));

      const description = getPricingModelDescription(campaign);
      expect(description).toContain('10000');
      expect(description).toContain('credits');
    });

    it('should describe IAAS pricing model', async () => {
      const iaasTerms: PricingTerms = {
        pricingModel: 'iaas',
        iaas: {
          learnersCommitted: 100,
          pricePerLearner: 200,
          outcomesGuaranteed: ['engagement > 0.8'],
          currency: 'EUR'
        }
      };
      await setPricingTerms(testCampaignId, iaasTerms);

      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, testCampaignId));

      const description = getPricingModelDescription(campaign);
      expect(description).toContain('100');
      expect(description).toContain('200');
    });

    it('should describe custom pricing model', async () => {
      const customTerms: PricingTerms = {
        pricingModel: 'custom',
        custom: {
          description: 'Negotiated enterprise pricing',
          fixedFee: 10000,
          currency: 'EUR'
        }
      };
      await setPricingTerms(testCampaignId, customTerms);

      const [campaign] = await db
        .select()
        .from(campaigns)
        .where(eq(campaigns.id, testCampaignId));

      const description = getPricingModelDescription(campaign);
      expect(description).toContain('Negotiated');
    });
  });
});
