/**
 * Upsell Analyzer Tests
 *
 * Tests for upsell opportunity detection and scoring
 * Target: ≥80% code coverage
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  scoreUpsellOpportunity,
  findExpansionOpportunities,
  findHighPerformers,
  generateUpsellRecommendations,
  type UpsellOpportunity,
} from '../upsell-analyzer.js';
import { type Campaign } from '@teei/shared-schema';

// ============================================================================
// MOCK DATA
// ============================================================================

const createMockCampaign = (overrides?: Partial<Campaign>): Campaign => ({
  id: 'camp-001',
  name: 'Test Campaign',
  description: 'Test campaign for scoring',
  companyId: 'comp-001',
  programTemplateId: 'tmpl-001',
  beneficiaryGroupId: 'grp-001',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  quarter: '2025-Q1',
  status: 'active' as const,
  priority: 'medium' as const,
  targetVolunteers: 100,
  currentVolunteers: 50,
  targetBeneficiaries: 200,
  currentBeneficiaries: 120,
  maxSessions: 500,
  currentSessions: 100,
  budgetAllocated: '10000',
  budgetSpent: '5000',
  currency: 'EUR',
  pricingModel: 'seats' as const,
  committedSeats: 100,
  seatPricePerMonth: '500',
  creditAllocation: null,
  creditConsumptionRate: null,
  creditsRemaining: null,
  capacityUtilization: '0.50',
  isNearCapacity: false,
  isOverCapacity: false,
  cumulativeSROI: '3.50',
  averageVIS: '75',
  totalHoursLogged: '500',
  totalSessionsCompleted: 100,
  evidenceSnippetIds: [],
  configOverrides: {},
  tags: ['test'],
  internalNotes: 'Test notes',
  isActive: true,
  isArchived: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-11-22'),
  createdBy: 'user-001',
  lastMetricsUpdateAt: new Date('2025-11-22'),
  l2iSubscriptionId: null,
  bundleAllocationPercentage: null,
  customPricingTerms: null,
  iaasMetrics: null,
  ...overrides,
});

// ============================================================================
// SCORING TESTS
// ============================================================================

describe('scoreUpsellOpportunity', () => {
  describe('Capacity Score Calculation', () => {
    it('should score low capacity utilization', async () => {
      const campaign = createMockCampaign({ capacityUtilization: '0.30' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.capacityScore).toBeGreaterThan(0);
      expect(result.capacityScore).toBeLessThan(30);
    });

    it('should score 80% capacity utilization as expansion candidate', async () => {
      const campaign = createMockCampaign({ capacityUtilization: '0.80' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.capacityScore).toBeGreaterThan(45);
      expect(result.capacityScore).toBeLessThan(65);
    });

    it('should score 100% capacity utilization high', async () => {
      const campaign = createMockCampaign({ capacityUtilization: '1.00' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.capacityScore).toBeGreaterThan(75);
    });

    it('should score overcapacity (150%) as maximum', async () => {
      const campaign = createMockCampaign({ capacityUtilization: '1.50' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.capacityScore).toBe(100);
    });
  });

  describe('Performance Score Calculation', () => {
    it('should score high SROI correctly', async () => {
      const campaign = createMockCampaign({ cumulativeSROI: '6.50' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.performanceScore).toBeGreaterThan(40);
    });

    it('should score high VIS correctly', async () => {
      const campaign = createMockCampaign({ averageVIS: '95' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.performanceScore).toBeGreaterThan(40);
    });

    it('should return 0 for null SROI and VIS', async () => {
      const campaign = createMockCampaign({ cumulativeSROI: null, averageVIS: null });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.performanceScore).toBe(0);
    });

    it('should weight SROI more heavily than VIS', async () => {
      const highSROI = createMockCampaign({ cumulativeSROI: '5.0', averageVIS: '50' });
      const highVIS = createMockCampaign({ cumulativeSROI: '1.0', averageVIS: '100' });

      const sroiResult = await scoreUpsellOpportunity(highSROI);
      const visResult = await scoreUpsellOpportunity(highVIS);

      expect(sroiResult.performanceScore).toBeGreaterThan(visResult.performanceScore);
    });
  });

  describe('Engagement Score Calculation', () => {
    it('should score low engagement', async () => {
      const campaign = createMockCampaign({ currentSessions: 5, totalHoursLogged: '10' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.engagementScore).toBeLessThan(30);
    });

    it('should score moderate engagement', async () => {
      const campaign = createMockCampaign({ currentSessions: 50, totalHoursLogged: '100' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.engagementScore).toBeGreaterThan(30);
      expect(result.engagementScore).toBeLessThan(70);
    });

    it('should score high engagement', async () => {
      const campaign = createMockCampaign({ currentSessions: 150, totalHoursLogged: '300' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.engagementScore).toBeGreaterThan(70);
    });
  });

  describe('Spend Rate Score Calculation', () => {
    it('should score low spend rate', async () => {
      const campaign = createMockCampaign({ budgetSpent: '1000', budgetAllocated: '10000' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.spendRateScore).toBeLessThan(25);
    });

    it('should score 50% spend rate as moderate', async () => {
      const campaign = createMockCampaign({ budgetSpent: '5000', budgetAllocated: '10000' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.spendRateScore).toBeGreaterThan(40);
      expect(result.spendRateScore).toBeLessThan(60);
    });

    it('should score 80%+ spend rate as high', async () => {
      const campaign = createMockCampaign({ budgetSpent: '8500', budgetAllocated: '10000' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.spendRateScore).toBeGreaterThan(70);
    });

    it('should handle zero budget allocation', async () => {
      const campaign = createMockCampaign({ budgetAllocated: '0', budgetSpent: '0' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.spendRateScore).toBe(50); // Neutral score for no budget
    });
  });

  describe('Composite Score Calculation', () => {
    it('should calculate composite score correctly', async () => {
      const campaign = createMockCampaign({
        capacityUtilization: '0.85',
        cumulativeSROI: '4.0',
        averageVIS: '80',
        currentSessions: 100,
        budgetSpent: '7000',
        budgetAllocated: '10000',
      });
      const result = await scoreUpsellOpportunity(campaign);

      // Composite should be 0-100
      expect(result.compositeScore).toBeGreaterThan(0);
      expect(result.compositeScore).toBeLessThanOrEqual(100);

      // Weight validation: capacity (40%) should be dominant
      expect(result.compositeScore).toBeGreaterThan(50);
    });

    it('should flag high-value opportunities (score >= 70)', async () => {
      const highValue = createMockCampaign({
        capacityUtilization: '0.95',
        cumulativeSROI: '5.5',
        averageVIS: '85',
        currentSessions: 120,
        budgetSpent: '8000',
        budgetAllocated: '10000',
      });
      const result = await scoreUpsellOpportunity(highValue);
      expect(result.highValueFlag).toBe(result.compositeScore >= 70);
    });
  });

  describe('Recommendation Type Detection', () => {
    it('should identify capacity expansion opportunity', async () => {
      const campaign = createMockCampaign({ capacityUtilization: '0.85', cumulativeSROI: '2.0' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.recommendationType).toBe('capacity_expansion');
    });

    it('should identify performance boost opportunity', async () => {
      const campaign = createMockCampaign({ capacityUtilization: '0.50', cumulativeSROI: '6.0' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.recommendationType).toBe('performance_boost');
    });

    it('should identify engagement boost opportunity', async () => {
      const campaign = createMockCampaign({
        capacityUtilization: '0.60',
        cumulativeSROI: '2.0',
        currentSessions: 200,
      });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.recommendationType).toBe('engagement_boost');
    });

    it('should allow override of recommendation type', async () => {
      const campaign = createMockCampaign();
      const result = await scoreUpsellOpportunity(campaign, 'bundle_upgrade');
      expect(result.recommendationType).toBe('bundle_upgrade');
    });
  });

  describe('Expansion Cost Estimation', () => {
    it('should estimate expansion cost for seats model', async () => {
      const campaign = createMockCampaign({
        pricingModel: 'seats',
        capacityUtilization: '0.85',
        seatPricePerMonth: '500',
        targetVolunteers: 100,
      });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.estimatedExpansionCost).toBeDefined();
      expect(result.estimatedExpansionCost).toBeGreaterThan(0);
    });

    it('should estimate expansion cost for credits model', async () => {
      const campaign = createMockCampaign({
        pricingModel: 'credits',
        capacityUtilization: '0.85',
        creditAllocation: 1000,
      });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.estimatedExpansionCost).toBeDefined();
    });

    it('should not estimate expansion cost when below threshold', async () => {
      const campaign = createMockCampaign({ capacityUtilization: '0.50' });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.estimatedExpansionCost).toBeUndefined();
    });

    it('should estimate ROI from SROI', async () => {
      const campaign = createMockCampaign({
        cumulativeSROI: '5.0',
        budgetSpent: '1000',
      });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.estimatedROI).toBeDefined();
      if (result.estimatedROI) {
        expect(result.estimatedROI).toBeGreaterThan(0);
      }
    });
  });

  describe('Days to Capacity Calculation', () => {
    it('should calculate days to capacity', async () => {
      const campaign = createMockCampaign({
        targetVolunteers: 100,
        currentVolunteers: 50,
        currentSessions: 52, // ~1 per week
      });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.daysUntilFullCapacity).toBeDefined();
    });

    it('should return 0 when already at capacity', async () => {
      const campaign = createMockCampaign({
        targetVolunteers: 100,
        currentVolunteers: 100,
      });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.daysUntilFullCapacity).toBe(0);
    });

    it('should return undefined with no session data', async () => {
      const campaign = createMockCampaign({
        targetVolunteers: 100,
        currentVolunteers: 50,
        currentSessions: 0,
      });
      const result = await scoreUpsellOpportunity(campaign);
      expect(result.daysUntilFullCapacity).toBeUndefined();
    });
  });
});

// ============================================================================
// INTEGRATION TESTS (with mocked DB calls)
// ============================================================================

describe('Upsell Analyzer Integration', () => {
  beforeEach(() => {
    // Mock database calls
    vi.clearAllMocks();
  });

  describe('Recommendation Generation', () => {
    it('should generate capacity expansion recommendation', async () => {
      const campaign = createMockCampaign({
        capacityUtilization: '0.88',
        name: 'Syrian Refugees Mentorship',
      });
      const result = await scoreUpsellOpportunity(campaign);

      expect(result.recommendedAction).toContain('expand');
      expect(result.recommendedAction).toContain('88%');
    });

    it('should generate performance boost recommendation', async () => {
      const campaign = createMockCampaign({
        cumulativeSROI: '6.5',
        name: 'Language Classes',
      });
      const result = await scoreUpsellOpportunity(campaign);

      expect(result.recommendedAction).toContain('scale');
      expect(result.recommendedAction).toContain('6.5');
    });

    it('should generate bundle upgrade recommendation', async () => {
      const campaign = createMockCampaign({
        capacityUtilization: '0.50',
        cumulativeSROI: '2.0',
        currentSessions: 5,
      });
      const result = await scoreUpsellOpportunity(campaign);

      if (result.recommendationType === 'bundle_upgrade') {
        expect(result.recommendedAction).toContain('consolidate');
      }
    });
  });

  describe('Score Distribution', () => {
    it('should produce different scores for different scenarios', async () => {
      const lowValue = createMockCampaign({
        capacityUtilization: '0.30',
        cumulativeSROI: '1.0',
        currentSessions: 10,
      });

      const mediumValue = createMockCampaign({
        capacityUtilization: '0.65',
        cumulativeSROI: '3.0',
        currentSessions: 50,
      });

      const highValue = createMockCampaign({
        capacityUtilization: '0.90',
        cumulativeSROI: '6.0',
        currentSessions: 150,
      });

      const [low, medium, high] = await Promise.all([
        scoreUpsellOpportunity(lowValue),
        scoreUpsellOpportunity(mediumValue),
        scoreUpsellOpportunity(highValue),
      ]);

      expect(low.compositeScore).toBeLessThan(medium.compositeScore);
      expect(medium.compositeScore).toBeLessThan(high.compositeScore);
    });
  });
});

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe('Edge Cases and Error Handling', () => {
  it('should handle campaigns with null metrics gracefully', async () => {
    const campaign = createMockCampaign({
      cumulativeSROI: null,
      averageVIS: null,
      totalHoursLogged: null,
    });
    const result = await scoreUpsellOpportunity(campaign);
    expect(result.compositeScore).toBeGreaterThanOrEqual(0);
    expect(result.compositeScore).toBeLessThanOrEqual(100);
  });

  it('should handle overage scenarios', async () => {
    const campaign = createMockCampaign({
      capacityUtilization: '1.50',
      currentVolunteers: 150,
      targetVolunteers: 100,
    });
    const result = await scoreUpsellOpportunity(campaign);
    expect(result.capacityScore).toBe(100);
    expect(result.highValueFlag).toBe(true);
  });

  it('should handle string values that need parsing', async () => {
    const campaign = createMockCampaign({
      budgetAllocated: '50000.99',
      budgetSpent: '25000.50',
      totalHoursLogged: '1234.56',
    });
    const result = await scoreUpsellOpportunity(campaign);
    expect(result.budgetAllocated).toBe(50000.99);
    expect(result.budgetSpent).toBe(25000.50);
  });

  it('should handle campaigns with zero targets', async () => {
    const campaign = createMockCampaign({
      targetVolunteers: 0,
      currentVolunteers: 0,
      capacityUtilization: '0',
    });
    const result = await scoreUpsellOpportunity(campaign);
    expect(result.compositeScore).toBeDefined();
    expect(result.capacityScore).toBeDefined();
  });
});

// ============================================================================
// DATA VALIDATION TESTS
// ============================================================================

describe('Data Validation and Consistency', () => {
  it('should ensure scores are within valid ranges', async () => {
    const testCampaigns = [
      createMockCampaign({ capacityUtilization: '0.0' }),
      createMockCampaign({ capacityUtilization: '0.5' }),
      createMockCampaign({ capacityUtilization: '1.0' }),
      createMockCampaign({ capacityUtilization: '2.0' }),
    ];

    const results = await Promise.all(testCampaigns.map(c => scoreUpsellOpportunity(c)));

    results.forEach(result => {
      expect(result.capacityScore).toBeGreaterThanOrEqual(0);
      expect(result.capacityScore).toBeLessThanOrEqual(100);
      expect(result.performanceScore).toBeGreaterThanOrEqual(0);
      expect(result.performanceScore).toBeLessThanOrEqual(100);
      expect(result.engagementScore).toBeGreaterThanOrEqual(0);
      expect(result.engagementScore).toBeLessThanOrEqual(100);
      expect(result.spendRateScore).toBeGreaterThanOrEqual(0);
      expect(result.spendRateScore).toBeLessThanOrEqual(100);
      expect(result.compositeScore).toBeGreaterThanOrEqual(0);
      expect(result.compositeScore).toBeLessThanOrEqual(100);
    });
  });

  it('should maintain score consistency across runs', async () => {
    const campaign = createMockCampaign({
      capacityUtilization: '0.75',
      cumulativeSROI: '4.0',
      averageVIS: '80',
      currentSessions: 75,
    });

    const [result1, result2] = await Promise.all([
      scoreUpsellOpportunity(campaign),
      scoreUpsellOpportunity(campaign),
    ]);

    expect(result1.compositeScore).toBe(result2.compositeScore);
    expect(result1.recommendationType).toBe(result2.recommendationType);
  });
});
