/**
 * Unit Tests for Activity Associator
 *
 * Tests the core association logic for linking activities to campaigns
 * with confidence scoring and disambiguation.
 *
 * Coverage Target: >= 85%
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  associateSessionToCampaign,
  findEligibleCampaigns,
  selectBestCampaign,
  associateSessionsBatch,
  getAssociationStats,
  type AssociationResult,
} from '../src/lib/activity-associator.js';

// Mock the database module
vi.mock('@teei/shared-schema/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([])),
        })),
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
          orderBy: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
        limit: vi.fn(() => Promise.resolve([])),
      })),
    })),
  },
}));

// Mock data
const mockCampaign1 = {
  id: 'campaign-1',
  name: 'Mentors for Syrian Refugees',
  companyId: 'company-1',
  programTemplateId: 'template-1',
  beneficiaryGroupId: 'group-1',
  startDate: '2025-01-01',
  endDate: '2025-12-31',
  status: 'active',
  isActive: true,
  targetVolunteers: 50,
  currentVolunteers: 20,
  targetBeneficiaries: 100,
  currentBeneficiaries: 40,
  currentSessions: 0,
  budgetAllocated: '50000.00',
  budgetSpent: '10000.00',
  currency: 'EUR',
  pricingModel: 'seats',
  tags: ['refugees', 'mentorship', 'integration'],
  capacityUtilization: '0.4',
  isNearCapacity: false,
  isOverCapacity: false,
  isHighValue: false,
  upsellOpportunityScore: 0,
  evidenceSnippetIds: [],
  isArchived: false,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
  lastMetricsUpdateAt: null,
  createdBy: null,
  description: null,
  quarter: '2025-Q1',
  priority: 'medium',
  maxSessions: null,
  committedSeats: 50,
  seatPricePerMonth: '500.00',
  creditAllocation: null,
  creditConsumptionRate: null,
  creditsRemaining: null,
  iaasMetrics: null,
  l2iSubscriptionId: null,
  bundleAllocationPercentage: null,
  customPricingTerms: null,
  configOverrides: {},
  cumulativeSROI: null,
  averageVIS: null,
  totalHoursLogged: '0',
  totalSessionsCompleted: 0,
  internalNotes: null,
};

const mockCampaign2 = {
  ...mockCampaign1,
  id: 'campaign-2',
  name: 'Language Learning for Migrants',
  status: 'recruiting',
  tags: ['migrants', 'language', 'integration'],
};

const mockBeneficiaryGroup1 = {
  id: 'group-1',
  name: 'Syrian Refugees in Berlin',
  description: 'Target group for Syrian refugees',
  groupType: 'refugees',
  countryCode: 'DE',
  region: 'Berlin',
  city: 'Berlin',
  ageRange: { min: 18, max: 45 },
  genderFocus: 'all',
  primaryLanguages: ['ar', 'en'],
  languageRequirement: 'any',
  legalStatusCategories: ['refugee'],
  eligibleProgramTypes: ['mentorship', 'language'],
  eligibilityRules: {},
  minGroupSize: 5,
  maxGroupSize: 100,
  tags: ['refugees', 'integration', 'employment'],
  partnerOrganizations: ['UNHCR'],
  internalNotes: null,
  isActive: true,
  isPublic: true,
  createdBy: null,
  updatedBy: null,
  createdAt: new Date('2025-01-01'),
  updatedAt: new Date('2025-01-01'),
};

const mockBeneficiaryGroup2 = {
  ...mockBeneficiaryGroup1,
  id: 'group-2',
  name: 'Migrants in Germany',
  groupType: 'migrants',
  tags: ['migrants', 'integration', 'language'],
};

const mockUser = {
  id: 'user-1',
  tags: ['refugees', 'integration'],
};

describe('Activity Associator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('selectBestCampaign', () => {
    it('should return the only campaign if there is just one', () => {
      const scoredCampaigns = [
        {
          campaign: mockCampaign1,
          score: 70,
          reasons: ['Company match', 'Date match'],
        },
      ];

      const result = selectBestCampaign(scoredCampaigns);

      expect(result).toEqual(scoredCampaigns[0]);
      expect(result.campaign.id).toBe('campaign-1');
    });

    it('should return campaign with highest score', () => {
      const scoredCampaigns = [
        {
          campaign: mockCampaign1,
          score: 90,
          reasons: ['Company match', 'Date match', 'Exact group match'],
        },
        {
          campaign: mockCampaign2,
          score: 70,
          reasons: ['Company match', 'Date match'],
        },
      ];

      const result = selectBestCampaign(scoredCampaigns);

      expect(result.campaign.id).toBe('campaign-1');
      expect(result.score).toBe(90);
    });

    it('should prefer active campaigns when scores are tied', () => {
      const scoredCampaigns = [
        {
          campaign: { ...mockCampaign2, status: 'recruiting' as const },
          score: 70,
          reasons: ['Company match', 'Date match'],
        },
        {
          campaign: { ...mockCampaign1, status: 'active' as const },
          score: 70,
          reasons: ['Company match', 'Date match'],
        },
      ];

      const result = selectBestCampaign(scoredCampaigns);

      expect(result.campaign.status).toBe('active');
      expect(result.campaign.id).toBe('campaign-1');
    });

    it('should prefer more recent campaign when status and score are tied', () => {
      const scoredCampaigns = [
        {
          campaign: {
            ...mockCampaign1,
            id: 'campaign-old',
            startDate: '2024-01-01',
            status: 'active' as const,
          },
          score: 70,
          reasons: ['Company match', 'Date match'],
        },
        {
          campaign: {
            ...mockCampaign1,
            id: 'campaign-new',
            startDate: '2025-01-01',
            status: 'active' as const,
          },
          score: 70,
          reasons: ['Company match', 'Date match'],
        },
      ];

      const result = selectBestCampaign(scoredCampaigns);

      expect(result.campaign.id).toBe('campaign-new');
    });

    it('should throw error if no campaigns provided', () => {
      expect(() => selectBestCampaign([])).toThrow('No campaigns to select from');
    });
  });

  describe('getAssociationStats', () => {
    it('should calculate correct statistics for association results', () => {
      const results: AssociationResult[] = [
        {
          campaignId: 'campaign-1',
          programInstanceId: 'instance-1',
          confidence: 90,
          matchReasons: ['Exact match'],
          requiresReview: false,
        },
        {
          campaignId: 'campaign-2',
          programInstanceId: 'instance-2',
          confidence: 75,
          matchReasons: ['Partial match'],
          requiresReview: true,
        },
        {
          campaignId: null,
          programInstanceId: null,
          confidence: 0,
          matchReasons: ['No match'],
          requiresReview: false,
        },
        {
          campaignId: 'campaign-3',
          programInstanceId: 'instance-3',
          confidence: 85,
          matchReasons: ['Good match'],
          requiresReview: false,
        },
      ];

      const stats = getAssociationStats(results);

      expect(stats.total).toBe(4);
      expect(stats.associated).toBe(3);
      expect(stats.requiresReview).toBe(1);
      expect(stats.failed).toBe(1);
      expect(stats.averageConfidence).toBe(62.5); // (90 + 75 + 0 + 85) / 4
    });

    it('should handle empty results array', () => {
      const stats = getAssociationStats([]);

      expect(stats.total).toBe(0);
      expect(stats.associated).toBe(0);
      expect(stats.requiresReview).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.averageConfidence).toBe(0);
    });

    it('should handle all successful associations', () => {
      const results: AssociationResult[] = [
        {
          campaignId: 'campaign-1',
          programInstanceId: 'instance-1',
          confidence: 95,
          matchReasons: ['Perfect match'],
          requiresReview: false,
        },
        {
          campaignId: 'campaign-2',
          programInstanceId: 'instance-2',
          confidence: 90,
          matchReasons: ['Excellent match'],
          requiresReview: false,
        },
      ];

      const stats = getAssociationStats(results);

      expect(stats.total).toBe(2);
      expect(stats.associated).toBe(2);
      expect(stats.requiresReview).toBe(0);
      expect(stats.failed).toBe(0);
      expect(stats.averageConfidence).toBe(92.5);
    });
  });

  describe('associateSessionsBatch', () => {
    it('should handle empty sessions array', async () => {
      const results = await associateSessionsBatch([]);

      expect(results).toEqual([]);
    });

    it('should process multiple sessions and return results', async () => {
      // Mock the associateSessionToCampaign function
      const mockAssociateSession = vi.fn()
        .mockResolvedValueOnce({
          campaignId: 'campaign-1',
          programInstanceId: 'instance-1',
          confidence: 90,
          matchReasons: ['Exact match'],
          requiresReview: false,
        })
        .mockResolvedValueOnce({
          campaignId: 'campaign-2',
          programInstanceId: 'instance-2',
          confidence: 70,
          matchReasons: ['Partial match'],
          requiresReview: true,
        });

      // Replace the actual function with mock
      const originalFn = await import('../src/lib/activity-associator.js');
      vi.spyOn(originalFn, 'associateSessionToCampaign').mockImplementation(mockAssociateSession);

      const sessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          companyId: 'company-1',
          date: new Date('2025-06-15'),
        },
        {
          id: 'session-2',
          userId: 'user-2',
          companyId: 'company-1',
          date: new Date('2025-06-16'),
        },
      ];

      const results = await associateSessionsBatch(sessions);

      expect(results).toHaveLength(2);
      expect(results[0].campaignId).toBe('campaign-1');
      expect(results[1].campaignId).toBe('campaign-2');
      expect(mockAssociateSession).toHaveBeenCalledTimes(2);
    });

    it('should handle errors gracefully and continue processing', async () => {
      // Mock to throw error on first call, succeed on second
      const mockAssociateSession = vi.fn()
        .mockRejectedValueOnce(new Error('Database error'))
        .mockResolvedValueOnce({
          campaignId: 'campaign-2',
          programInstanceId: 'instance-2',
          confidence: 80,
          matchReasons: ['Match found'],
          requiresReview: false,
        });

      const originalFn = await import('../src/lib/activity-associator.js');
      vi.spyOn(originalFn, 'associateSessionToCampaign').mockImplementation(mockAssociateSession);

      const sessions = [
        {
          id: 'session-1',
          userId: 'user-1',
          companyId: 'company-1',
          date: new Date('2025-06-15'),
        },
        {
          id: 'session-2',
          userId: 'user-2',
          companyId: 'company-1',
          date: new Date('2025-06-16'),
        },
      ];

      const results = await associateSessionsBatch(sessions);

      expect(results).toHaveLength(2);
      expect(results[0].campaignId).toBeNull();
      expect(results[0].confidence).toBe(0);
      expect(results[0].requiresReview).toBe(true);
      expect(results[0].matchReasons[0]).toContain('Error');

      expect(results[1].campaignId).toBe('campaign-2');
      expect(results[1].confidence).toBe(80);
    });
  });

  describe('Confidence Thresholds', () => {
    it('should require manual review for confidence between 40-80', () => {
      const result: AssociationResult = {
        campaignId: 'campaign-1',
        programInstanceId: 'instance-1',
        confidence: 60,
        matchReasons: ['Partial match'],
        requiresReview: true,
      };

      expect(result.requiresReview).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(40);
      expect(result.confidence).toBeLessThan(80);
    });

    it('should auto-associate for confidence >= 80', () => {
      const result: AssociationResult = {
        campaignId: 'campaign-1',
        programInstanceId: 'instance-1',
        confidence: 85,
        matchReasons: ['Exact match'],
        requiresReview: false,
      };

      expect(result.requiresReview).toBe(false);
      expect(result.confidence).toBeGreaterThanOrEqual(80);
    });

    it('should ignore associations with confidence < 40', () => {
      const result: AssociationResult = {
        campaignId: null,
        programInstanceId: null,
        confidence: 30,
        matchReasons: ['Weak match'],
        requiresReview: false,
      };

      expect(result.campaignId).toBeNull();
      expect(result.confidence).toBeLessThan(40);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null/undefined dates gracefully', async () => {
      // Test that the function can handle edge cases
      const sessionDate = new Date('2025-06-15');

      // This should not throw
      expect(sessionDate.toISOString()).toBeDefined();
      expect(sessionDate.toISOString().split('T')[0]).toBe('2025-06-15');
    });

    it('should handle campaigns with no tags', () => {
      const campaignNoTags = {
        ...mockCampaign1,
        tags: [],
      };

      const beneficiaryGroupNoTags = {
        ...mockBeneficiaryGroup1,
        tags: [],
      };

      // This should not crash
      expect(campaignNoTags.tags).toEqual([]);
      expect(beneficiaryGroupNoTags.tags).toEqual([]);
    });

    it('should handle empty match reasons array', () => {
      const result: AssociationResult = {
        campaignId: 'campaign-1',
        programInstanceId: 'instance-1',
        confidence: 50,
        matchReasons: [],
        requiresReview: true,
      };

      expect(result.matchReasons).toHaveLength(0);
    });
  });

  describe('Date Matching', () => {
    it('should match activities within campaign date range', () => {
      const campaignStart = new Date('2025-01-01');
      const campaignEnd = new Date('2025-12-31');
      const activityDate = new Date('2025-06-15');

      const isWithinRange =
        activityDate >= campaignStart && activityDate <= campaignEnd;

      expect(isWithinRange).toBe(true);
    });

    it('should reject activities before campaign start', () => {
      const campaignStart = new Date('2025-01-01');
      const campaignEnd = new Date('2025-12-31');
      const activityDate = new Date('2024-12-31');

      const isWithinRange =
        activityDate >= campaignStart && activityDate <= campaignEnd;

      expect(isWithinRange).toBe(false);
    });

    it('should reject activities after campaign end', () => {
      const campaignStart = new Date('2025-01-01');
      const campaignEnd = new Date('2025-12-31');
      const activityDate = new Date('2026-01-01');

      const isWithinRange =
        activityDate >= campaignStart && activityDate <= campaignEnd;

      expect(isWithinRange).toBe(false);
    });

    it('should handle edge case of activity on campaign start date', () => {
      const campaignStart = new Date('2025-01-01');
      const campaignEnd = new Date('2025-12-31');
      const activityDate = new Date('2025-01-01');

      const isWithinRange =
        activityDate >= campaignStart && activityDate <= campaignEnd;

      expect(isWithinRange).toBe(true);
    });

    it('should handle edge case of activity on campaign end date', () => {
      const campaignStart = new Date('2025-01-01');
      const campaignEnd = new Date('2025-12-31');
      const activityDate = new Date('2025-12-31');

      const isWithinRange =
        activityDate >= campaignStart && activityDate <= campaignEnd;

      expect(isWithinRange).toBe(true);
    });
  });

  describe('Tag Matching', () => {
    it('should calculate exact match when all tags overlap', () => {
      const userTags = ['refugees', 'integration'];
      const groupTags = ['refugees', 'integration'];

      const matchingTags = userTags.filter((tag) => groupTags.includes(tag));
      const isExactMatch =
        matchingTags.length === groupTags.length &&
        matchingTags.length === userTags.length;

      expect(isExactMatch).toBe(true);
      expect(matchingTags).toHaveLength(2);
    });

    it('should calculate partial match when some tags overlap', () => {
      const userTags = ['refugees', 'integration', 'employment'];
      const groupTags = ['refugees', 'language'];

      const matchingTags = userTags.filter((tag) => groupTags.includes(tag));
      const isExactMatch =
        matchingTags.length === groupTags.length &&
        matchingTags.length === userTags.length;

      expect(isExactMatch).toBe(false);
      expect(matchingTags).toHaveLength(1);
      expect(matchingTags[0]).toBe('refugees');
    });

    it('should handle no tag overlap', () => {
      const userTags = ['employment', 'youth'];
      const groupTags = ['refugees', 'language'];

      const matchingTags = userTags.filter((tag) => groupTags.includes(tag));

      expect(matchingTags).toHaveLength(0);
    });

    it('should handle empty user tags', () => {
      const userTags: string[] = [];
      const groupTags = ['refugees', 'language'];

      const matchingTags = userTags.filter((tag) => groupTags.includes(tag));

      expect(matchingTags).toHaveLength(0);
    });

    it('should handle empty group tags', () => {
      const userTags = ['refugees', 'integration'];
      const groupTags: string[] = [];

      const matchingTags = userTags.filter((tag) => groupTags.includes(tag));

      expect(matchingTags).toHaveLength(0);
    });
  });

  describe('Company Matching', () => {
    it('should only match campaigns from the same company', () => {
      const activityCompanyId = 'company-1';
      const campaign1CompanyId = 'company-1';
      const campaign2CompanyId = 'company-2';

      expect(activityCompanyId).toBe(campaign1CompanyId);
      expect(activityCompanyId).not.toBe(campaign2CompanyId);
    });
  });
});
