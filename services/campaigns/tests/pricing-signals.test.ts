/**
 * Pricing Signals Generator Tests
 *
 * SWARM 6: Agent 5.3 - pricing-signal-exporter
 * Tests for pricing signal generation functions
 *
 * Coverage Target: ≥80%
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { db } from '@teei/shared-schema';
import {
  campaigns,
  programInstances,
  companies,
  beneficiaryGroups,
  programTemplates,
  type Campaign,
  type ProgramInstance,
} from '@teei/shared-schema';
import { eq } from 'drizzle-orm';
import {
  calculateCostPerLearner,
  compareUsageVsContract,
  identifyHighValueCampaigns,
  generatePricingSignals,
  generatePricingReport,
} from '../src/lib/pricing-signals.js';

// ============================================================================
// TEST DATA
// ============================================================================

let testCompanyId: string;
let testCampaignId: string;
let testInstanceId: string;
let testTemplateId: string;
let testGroupId: string;

/**
 * Setup test data
 */
async function setupTestData() {
  // Create company
  const [company] = await db
    .insert(companies)
    .values({
      name: 'Test Company',
      email: 'test@example.com',
      industry: 'Technology',
      country: 'US',
      isActive: true,
    })
    .returning();

  testCompanyId = company.id;

  // Create beneficiary group
  const [group] = await db
    .insert(beneficiaryGroups)
    .values({
      name: 'Test Beneficiaries',
      groupType: 'refugees',
      countryCode: 'US',
      eligibleProgramTypes: ['mentorship', 'language'],
      isActive: true,
      primaryLanguages: ['en', 'es'],
    })
    .returning();

  testGroupId = group.id;

  // Create program template
  const [template] = await db
    .insert(programTemplates)
    .values({
      name: 'Test Mentorship Template',
      programType: 'mentorship',
      version: '1.0.0',
      isActive: true,
      isPublic: true,
      defaultConfig: {
        sessionDuration: 60,
        sessionFrequency: 'weekly',
      },
      defaultMinParticipants: 5,
      defaultMaxParticipants: 50,
      defaultVolunteersNeeded: 10,
      outcomeMetrics: ['employment', 'confidence'],
    })
    .returning();

  testTemplateId = template.id;

  // Create campaign
  const [campaign] = await db
    .insert(campaigns)
    .values({
      name: 'Test Campaign - Q1 2025',
      companyId: testCompanyId,
      programTemplateId: testTemplateId,
      beneficiaryGroupId: testGroupId,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-03-31'),
      quarter: '2025-Q1',
      status: 'active',
      targetVolunteers: 50,
      currentVolunteers: 30,
      targetBeneficiaries: 100,
      currentBeneficiaries: 75,
      maxSessions: 50,
      currentSessions: 25,
      budgetAllocated: '25000.00',
      budgetSpent: '15000.00',
      currency: 'EUR',
      pricingModel: 'seats',
      committedSeats: 50,
      seatPricePerMonth: '500.00',
      capacityUtilization: 0.6,
      isActive: true,
    })
    .returning();

  testCampaignId = campaign.id;

  // Create program instance
  const [instance] = await db
    .insert(programInstances)
    .values({
      name: 'Test Instance - Cohort 1',
      campaignId: testCampaignId,
      programTemplateId: testTemplateId,
      companyId: testCompanyId,
      beneficiaryGroupId: testGroupId,
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-03-31'),
      status: 'active',
      config: {
        sessionDuration: 60,
        sessionFrequency: 'weekly',
      },
      enrolledVolunteers: 30,
      enrolledBeneficiaries: 75,
      totalSessionsHeld: 25,
      totalHoursLogged: '100.00',
      sroiScore: '4.50',
      averageVISScore: '78.00',
      volunteersConsumed: 30,
      learnersServed: 75,
    })
    .returning();

  testInstanceId = instance.id;
}

/**
 * Cleanup test data
 */
async function cleanupTestData() {
  if (testInstanceId) {
    await db.delete(programInstances).where(eq(programInstances.id, testInstanceId));
  }
  if (testCampaignId) {
    await db.delete(campaigns).where(eq(campaigns.id, testCampaignId));
  }
  if (testTemplateId) {
    await db.delete(programTemplates).where(eq(programTemplates.id, testTemplateId));
  }
  if (testGroupId) {
    await db.delete(beneficiaryGroups).where(eq(beneficiaryGroups.id, testGroupId));
  }
  if (testCompanyId) {
    await db.delete(companies).where(eq(companies.id, testCompanyId));
  }
}

// ============================================================================
// TESTS
// ============================================================================

describe('Pricing Signals Generator', () => {

  beforeEach(async () => {
    await setupTestData();
  });

  afterEach(async () => {
    await cleanupTestData();
  });

  // ==========================================================================
  // calculateCostPerLearner Tests
  // ==========================================================================

  describe('calculateCostPerLearner', () => {
    it('should calculate cost per learner correctly', async () => {
      const result = await calculateCostPerLearner(testCampaignId);

      expect(result).toBeDefined();
      expect(result.campaignId).toBe(testCampaignId);
      expect(result.campaignName).toBe('Test Campaign - Q1 2025');
      expect(result.budgetAllocated).toBe(25000);
      expect(result.currency).toBe('EUR');
      expect(result.learnersServed).toBe(75);

      // Cost per learner = 25000 / 75 = 333.33
      expect(result.costPerLearner).toBeCloseTo(333.33, 1);
    });

    it('should calculate cost per hour correctly', async () => {
      const result = await calculateCostPerLearner(testCampaignId);

      expect(result.costPerHour).toBeDefined();
      expect(result.totalHours).toBe(100);
      // Cost per hour = 25000 / 100 = 250
      expect(result.costPerHour).toBeCloseTo(250, 1);
    });

    it('should calculate budget utilization correctly', async () => {
      const result = await calculateCostPerLearner(testCampaignId);

      // Budget utilization = 15000 / 25000 = 0.6
      expect(result.budgetUtilization).toBeCloseTo(0.6, 2);
    });

    it('should return null cost per learner if no beneficiaries', async () => {
      // Update campaign to have 0 beneficiaries
      await db.update(campaigns)
        .set({ currentBeneficiaries: 0 })
        .where(eq(campaigns.id, testCampaignId));

      const result = await calculateCostPerLearner(testCampaignId);

      expect(result.costPerLearner).toBeNull();
    });

    it('should return null cost per hour if no hours logged', async () => {
      // Update instance to have 0 hours
      await db.update(programInstances)
        .set({ totalHoursLogged: '0' })
        .where(eq(programInstances.id, testInstanceId));

      const result = await calculateCostPerLearner(testCampaignId);

      expect(result.costPerHour).toBeNull();
    });

    it('should throw error for non-existent campaign', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';

      await expect(calculateCostPerLearner(invalidId)).rejects.toThrow(
        'Campaign not found'
      );
    });
  });

  // ==========================================================================
  // compareUsageVsContract Tests
  // ==========================================================================

  describe('compareUsageVsContract', () => {
    it('should compare seats usage vs contract correctly', async () => {
      const result = await compareUsageVsContract(testCampaignId);

      expect(result).toBeDefined();
      expect(result.campaignId).toBe(testCampaignId);
      expect(result.pricingModel).toBe('seats');
      expect(result.seats).toBeDefined();

      if (result.seats) {
        expect(result.seats.committed).toBe(50);
        expect(result.seats.used).toBe(30);
        expect(result.seats.utilizationPercent).toBeCloseTo(60, 0);
        expect(result.seats.variance).toBe(-20); // 30 - 50
      }
    });

    it('should recommend expansion when >80% utilized', async () => {
      // Update campaign to 85% capacity
      await db.update(campaigns)
        .set({
          currentVolunteers: 42,
          committedSeats: 50,
        })
        .where(eq(campaigns.id, testCampaignId));

      const result = await compareUsageVsContract(testCampaignId);

      expect(result.recommendedAction).toBe('expand');
    });

    it('should recommend negotiation when <50% utilized', async () => {
      // Update campaign to 40% capacity
      await db.update(campaigns)
        .set({
          currentVolunteers: 20,
          committedSeats: 50,
        })
        .where(eq(campaigns.id, testCampaignId));

      const result = await compareUsageVsContract(testCampaignId);

      expect(result.recommendedAction).toBe('negotiate');
    });

    it('should set isNearExhaustion flag correctly', async () => {
      // Update campaign to 85% capacity
      await db.update(campaigns)
        .set({
          currentVolunteers: 42,
          committedSeats: 50,
        })
        .where(eq(campaigns.id, testCampaignId));

      const result = await compareUsageVsContract(testCampaignId);

      expect(result.isNearExhaustion).toBe(true);
      expect(result.isExhausted).toBe(false);
    });

    it('should set isExhausted flag when >100%', async () => {
      // Update campaign to 110% capacity
      await db.update(campaigns)
        .set({
          currentVolunteers: 55,
          committedSeats: 50,
        })
        .where(eq(campaigns.id, testCampaignId));

      const result = await compareUsageVsContract(testCampaignId);

      expect(result.isExhausted).toBe(true);
      expect(result.recommendedAction).toBe('expand');
    });

    it('should handle credits pricing model', async () => {
      // Update campaign to use credits model
      await db.update(campaigns)
        .set({
          pricingModel: 'credits',
          creditAllocation: 10000,
          creditsRemaining: 7000,
          creditConsumptionRate: '1.50',
        })
        .where(eq(campaigns.id, testCampaignId));

      const result = await compareUsageVsContract(testCampaignId);

      expect(result.pricingModel).toBe('credits');
      expect(result.credits).toBeDefined();

      if (result.credits) {
        expect(result.credits.allocated).toBe(10000);
        expect(result.credits.consumed).toBe(3000);
        expect(result.credits.utilizationPercent).toBeCloseTo(30, 0);
        expect(result.credits.remaining).toBe(7000);
      }
    });

    it('should handle IAAS pricing model', async () => {
      // Update campaign to use IAAS model
      await db.update(campaigns)
        .set({
          pricingModel: 'iaas',
          iaasMetrics: {
            learnersCommitted: 100,
            pricePerLearner: 250,
            outcomesGuaranteed: ['job_readiness > 0.7'],
          },
        })
        .where(eq(campaigns.id, testCampaignId));

      const result = await compareUsageVsContract(testCampaignId);

      expect(result.pricingModel).toBe('iaas');
      expect(result.iaas).toBeDefined();

      if (result.iaas) {
        expect(result.iaas.learnersCommitted).toBe(100);
        expect(result.iaas.learnersServed).toBe(75);
        expect(result.iaas.utilizationPercent).toBeCloseTo(75, 0);
        expect(result.iaas.variance).toBe(-25); // 75 - 100
      }
    });

    it('should throw error for non-existent campaign', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';

      await expect(compareUsageVsContract(invalidId)).rejects.toThrow(
        'Campaign not found'
      );
    });
  });

  // ==========================================================================
  // identifyHighValueCampaigns Tests
  // ==========================================================================

  describe('identifyHighValueCampaigns', () => {
    it('should identify high-value campaigns', async () => {
      const result = await identifyHighValueCampaigns(testCompanyId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const campaign = result[0];
      expect(campaign).toHaveProperty('campaignId');
      expect(campaign).toHaveProperty('campaignName');
      expect(campaign).toHaveProperty('sroi');
      expect(campaign).toHaveProperty('engagementScore');
      expect(campaign).toHaveProperty('isHighValue');
      expect(campaign).toHaveProperty('valueScore');
    });

    it('should calculate engagement score correctly', async () => {
      const result = await identifyHighValueCampaigns(testCompanyId);

      expect(result.length).toBeGreaterThan(0);
      const campaign = result[0];

      // Beneficiary engagement = (75 / 100) * 100 = 75%
      // Volunteer engagement = (30 / 50) * 100 = 60%
      // Average = (75 + 60) / 2 = 67.5%
      expect(campaign.engagementScore).toBeCloseTo(67.5, 0);
    });

    it('should set isHighValue when SROI > threshold', async () => {
      const result = await identifyHighValueCampaigns(testCompanyId, 4.0, 75);

      expect(result.length).toBeGreaterThan(0);
      const campaign = result[0];

      // SROI should be 4.5 from test instance
      expect(campaign.sroi).toBeCloseTo(4.5, 1);
      // But engagement score is 67.5%, below 75% threshold
      expect(campaign.isHighValue).toBe(false);
    });

    it('should sort by value score descending', async () => {
      const result = await identifyHighValueCampaigns(testCompanyId);

      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].valueScore).toBeGreaterThanOrEqual(result[i + 1].valueScore);
        }
      }
    });

    it('should return empty array for company with no campaigns', async () => {
      const newCompanyId = (
        await db
          .insert(companies)
          .values({
            name: 'Company with no campaigns',
            email: 'nocampaigns@example.com',
            industry: 'Tech',
            country: 'US',
            isActive: true,
          })
          .returning()
      )[0].id;

      try {
        const result = await identifyHighValueCampaigns(newCompanyId);
        expect(result).toEqual([]);
      } finally {
        await db.delete(companies).where(eq(companies.id, newCompanyId));
      }
    });

    it('should respect custom thresholds', async () => {
      const resultDefault = await identifyHighValueCampaigns(testCompanyId);
      const resultCustom = await identifyHighValueCampaigns(testCompanyId, 3.0, 50);

      // With lower thresholds, more campaigns should be high-value
      expect(resultCustom.length).toBeGreaterThanOrEqual(resultDefault.length);
    });
  });

  // ==========================================================================
  // generatePricingSignals Tests
  // ==========================================================================

  describe('generatePricingSignals', () => {
    it('should generate pricing signals for all campaigns', async () => {
      const result = await generatePricingSignals(testCompanyId);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      const signal = result[0];
      expect(signal).toHaveProperty('campaignId');
      expect(signal).toHaveProperty('budgetAllocated');
      expect(signal).toHaveProperty('budgetSpent');
      expect(signal).toHaveProperty('budgetRemaining');
      expect(signal).toHaveProperty('budgetUtilizationPercent');
      expect(signal).toHaveProperty('sroi');
      expect(signal).toHaveProperty('costPerLearner');
    });

    it('should calculate days correctly', async () => {
      const result = await generatePricingSignals(testCompanyId);

      expect(result.length).toBeGreaterThan(0);
      const signal = result[0];

      expect(signal.daysSinceStart).toBeGreaterThanOrEqual(0);
      expect(signal.daysUntilEnd).toBeGreaterThanOrEqual(0);
    });

    it('should identify high-value campaigns in signals', async () => {
      const result = await generatePricingSignals(testCompanyId);

      expect(result.length).toBeGreaterThan(0);
      const signal = result[0];

      expect(signal).toHaveProperty('isHighValue');
      expect(typeof signal.isHighValue).toBe('boolean');
    });

    it('should generate recommendations', async () => {
      const result = await generatePricingSignals(testCompanyId);

      expect(result.length).toBeGreaterThan(0);
      const signal = result[0];

      expect(Array.isArray(signal.recommendations)).toBe(true);
    });

    it('should return empty array for company with no campaigns', async () => {
      const newCompanyId = (
        await db
          .insert(companies)
          .values({
            name: 'Company with no campaigns',
            email: 'nocampaigns2@example.com',
            industry: 'Tech',
            country: 'US',
            isActive: true,
          })
          .returning()
      )[0].id;

      try {
        const result = await generatePricingSignals(newCompanyId);
        expect(result).toEqual([]);
      } finally {
        await db.delete(companies).where(eq(companies.id, newCompanyId));
      }
    });

    it('should mark campaigns as budget constrained when >90% spent', async () => {
      // Update campaign to have high spend
      await db.update(campaigns)
        .set({ budgetSpent: '24000.00' })
        .where(eq(campaigns.id, testCampaignId));

      const result = await generatePricingSignals(testCompanyId);

      expect(result.length).toBeGreaterThan(0);
      const signal = result[0];

      expect(signal.isBudgetConstrained).toBe(true);
    });
  });

  // ==========================================================================
  // generatePricingReport Tests
  // ==========================================================================

  describe('generatePricingReport', () => {
    it('should generate comprehensive report', async () => {
      const result = await generatePricingReport(testCompanyId);

      expect(result).toBeDefined();
      expect(result.companyId).toBe(testCompanyId);
      expect(result).toHaveProperty('companyName');
      expect(result).toHaveProperty('reportGeneratedAt');
      expect(result).toHaveProperty('totalCampaigns');
      expect(result).toHaveProperty('activeCampaigns');
      expect(result).toHaveProperty('highValueCampaigns');
    });

    it('should calculate summary metrics correctly', async () => {
      const result = await generatePricingReport(testCompanyId);

      expect(result.totalCampaigns).toBeGreaterThan(0);
      expect(result.activeCampaigns).toBeGreaterThanOrEqual(0);
      expect(result.totalBudgetAllocated).toBeGreaterThan(0);
      expect(result.totalBudgetSpent).toBeGreaterThanOrEqual(0);
    });

    it('should include all campaigns in report', async () => {
      const result = await generatePricingReport(testCompanyId);

      expect(Array.isArray(result.campaigns)).toBe(true);
      expect(result.campaigns.length).toBe(result.totalCampaigns);
    });

    it('should include high-value opportunities', async () => {
      const result = await generatePricingReport(testCompanyId);

      expect(Array.isArray(result.highValueOpportunities)).toBe(true);
    });

    it('should generate recommendations', async () => {
      const result = await generatePricingReport(testCompanyId);

      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it('should calculate average utilization correctly', async () => {
      const result = await generatePricingReport(testCompanyId);

      // Budget utilization = 15000 / 25000 = 60%
      expect(result.averageBudgetUtilization).toBeCloseTo(60, 0);
    });

    it('should throw error for non-existent company', async () => {
      const invalidId = '00000000-0000-0000-0000-000000000000';

      await expect(generatePricingReport(invalidId)).rejects.toThrow(
        'Company not found'
      );
    });
  });

  // ==========================================================================
  // Integration Tests
  // ==========================================================================

  describe('Integration Tests', () => {
    it('should provide consistent data across functions', async () => {
      const signal = (await generatePricingSignals(testCompanyId))[0];
      const costAnalysis = await calculateCostPerLearner(testCampaignId);

      expect(signal.costPerLearner).toEqual(costAnalysis.costPerLearner);
      expect(signal.budgetAllocated).toEqual(costAnalysis.budgetAllocated);
    });

    it('should provide consistent usage data across functions', async () => {
      const signal = (await generatePricingSignals(testCompanyId))[0];
      const usageComparison = await compareUsageVsContract(testCampaignId);

      expect(signal.pricingModel).toBe(usageComparison.pricingModel);
    });

    it('should handle multiple campaigns correctly', async () => {
      // Create second campaign
      const [campaign2] = await db
        .insert(campaigns)
        .values({
          name: 'Test Campaign 2 - Q2 2025',
          companyId: testCompanyId,
          programTemplateId: testTemplateId,
          beneficiaryGroupId: testGroupId,
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
          quarter: '2025-Q2',
          status: 'active',
          targetVolunteers: 60,
          currentVolunteers: 40,
          targetBeneficiaries: 120,
          currentBeneficiaries: 90,
          budgetAllocated: '30000.00',
          budgetSpent: '20000.00',
          currency: 'EUR',
          pricingModel: 'seats',
          committedSeats: 60,
          seatPricePerMonth: '500.00',
          capacityUtilization: 0.67,
          isActive: true,
        })
        .returning();

      try {
        const signals = await generatePricingSignals(testCompanyId);
        const report = await generatePricingReport(testCompanyId);

        expect(signals.length).toBe(2);
        expect(report.totalCampaigns).toBe(2);
        expect(report.totalBudgetAllocated).toBeCloseTo(55000, 0);
      } finally {
        await db.delete(campaigns).where(eq(campaigns.id, campaign2.id));
      }
    });
  });
});
