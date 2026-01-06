/**
 * Metrics Aggregator Tests
 *
 * SWARM 6: Beneficiary Groups, Campaigns & Monetization
 * Agent 3.5: metrics-aggregator
 *
 * Tests for campaign metrics aggregation functions with ≥85% coverage target
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@teei/shared-schema';
import {
  aggregateCampaignMetrics,
  calculateCumulativeSROI,
  calculateAverageVIS,
  updateCampaignMetrics,
  createMetricsSnapshot,
  determineSnapshotFrequency,
  type CampaignMetrics
} from '../src/lib/metrics-aggregator.js';
import type { Campaign, ProgramInstance } from '@teei/shared-schema';

// Mock database
vi.mock('@teei/shared-schema', async () => {
  const actual = await vi.importActual('@teei/shared-schema');
  return {
    ...actual,
    db: {
      select: vi.fn(),
      update: vi.fn(),
      insert: vi.fn(),
      execute: vi.fn()
    },
    sql: vi.fn()
  };
});

describe('Metrics Aggregator', () => {
  // Test data fixtures
  const mockCampaignId = '123e4567-e89b-12d3-a456-426614174000';
  const mockCompanyId = '987e6543-e21b-12d3-a456-426614174111';

  const mockCampaign: Partial<Campaign> = {
    id: mockCampaignId,
    name: 'Test Campaign',
    companyId: mockCompanyId,
    status: 'active',
    targetVolunteers: 50,
    currentVolunteers: 30,
    targetBeneficiaries: 100,
    currentBeneficiaries: 75,
    maxSessions: 200,
    currentSessions: 120,
    budgetAllocated: '50000.00',
    budgetSpent: '30000.00',
    currency: 'EUR',
    totalHoursLogged: '450.50',
    totalSessionsCompleted: 120,
    cumulativeSROI: '4.25',
    averageVIS: '75.80',
    capacityUtilization: '0.6000',
    isNearCapacity: false,
    isOverCapacity: false
  };

  const mockInstances: Partial<ProgramInstance>[] = [
    {
      id: 'inst-1',
      campaignId: mockCampaignId,
      status: 'active',
      enrolledVolunteers: 15,
      enrolledBeneficiaries: 40,
      totalSessionsHeld: 60,
      totalHoursLogged: '225.25',
      sroiScore: '4.50',
      averageVISScore: '78.00',
      volunteersConsumed: 15,
      learnersServed: 40,
      outcomeScores: {
        integration: 0.65,
        language: 0.78,
        job_readiness: 0.82
      }
    },
    {
      id: 'inst-2',
      campaignId: mockCampaignId,
      status: 'active',
      enrolledVolunteers: 15,
      enrolledBeneficiaries: 35,
      totalSessionsHeld: 60,
      totalHoursLogged: '225.25',
      sroiScore: '4.00',
      averageVISScore: '73.60',
      volunteersConsumed: 15,
      learnersServed: 35,
      outcomeScores: {
        integration: 0.60,
        language: 0.75,
        job_readiness: 0.80
      }
    },
    {
      id: 'inst-3',
      campaignId: mockCampaignId,
      status: 'completed',
      enrolledVolunteers: 10,
      enrolledBeneficiaries: 25,
      totalSessionsHeld: 40,
      totalHoursLogged: '150.00',
      sroiScore: '3.80',
      averageVISScore: '72.00',
      volunteersConsumed: 10,
      learnersServed: 25,
      outcomeScores: {
        integration: 0.55,
        language: 0.70,
        job_readiness: 0.75
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('aggregateCampaignMetrics', () => {
    it('should aggregate all metrics correctly', async () => {
      // Mock database calls
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockCampaign])
          })
        })
      });

      const mockSelectInstances = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockInstances)
        })
      });

      (db.select as any)
        .mockReturnValueOnce(mockSelect)  // For campaign
        .mockReturnValueOnce(mockSelectInstances);  // For instances

      const result = await aggregateCampaignMetrics(mockCampaignId);

      expect(result.campaignId).toBe(mockCampaignId);
      expect(result.currentVolunteers).toBe(30); // Sum of active instances (15 + 15)
      expect(result.currentBeneficiaries).toBe(75); // Sum of active instances (40 + 35)
      expect(result.currentSessions).toBe(160); // Sum of all instances (60 + 60 + 40)
      expect(result.totalHoursLogged).toBeCloseTo(600.50, 2); // Sum of all instances
      expect(result.totalInstances).toBe(3);
      expect(result.activeInstances).toBe(2);
    });

    it('should throw error if campaign not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // Empty result
          })
        })
      });

      (db.select as any).mockReturnValue(mockSelect);

      await expect(aggregateCampaignMetrics('nonexistent-id')).rejects.toThrow('Campaign not found');
    });

    it('should handle campaigns with no instances', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockCampaign])
          })
        })
      });

      const mockSelectInstances = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]) // No instances
        })
      });

      (db.select as any)
        .mockReturnValueOnce(mockSelect)
        .mockReturnValueOnce(mockSelectInstances);

      const result = await aggregateCampaignMetrics(mockCampaignId);

      expect(result.currentVolunteers).toBe(0);
      expect(result.currentBeneficiaries).toBe(0);
      expect(result.currentSessions).toBe(0);
      expect(result.totalHoursLogged).toBe(0);
      expect(result.cumulativeSROI).toBeNull();
      expect(result.averageVIS).toBeNull();
    });

    it('should calculate capacity utilization correctly', async () => {
      const campaignHighUtilization = {
        ...mockCampaign,
        targetVolunteers: 50,
        currentVolunteers: 45
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([campaignHighUtilization])
          })
        })
      });

      const mockSelectInstances = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([mockInstances[0]]) // One active instance
        })
      });

      (db.select as any)
        .mockReturnValueOnce(mockSelect)
        .mockReturnValueOnce(mockSelectInstances);

      const result = await aggregateCampaignMetrics(mockCampaignId);

      // 15 volunteers / 50 target = 0.3 (30%)
      expect(result.capacityUtilization).toBeCloseTo(0.3, 2);
      expect(result.isNearCapacity).toBe(false);
      expect(result.isOverCapacity).toBe(false);
    });

    it('should detect near capacity (≥80%)', async () => {
      const campaignNearCapacity = {
        ...mockCampaign,
        targetVolunteers: 35,
        currentVolunteers: 30
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([campaignNearCapacity])
          })
        })
      });

      const mockSelectInstances = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockInstances.slice(0, 2)) // 15 + 15 = 30
        })
      });

      (db.select as any)
        .mockReturnValueOnce(mockSelect)
        .mockReturnValueOnce(mockSelectInstances);

      const result = await aggregateCampaignMetrics(mockCampaignId);

      // 30 / 35 = 0.857 (85.7%)
      expect(result.capacityUtilization).toBeCloseTo(0.857, 2);
      expect(result.isNearCapacity).toBe(true);
      expect(result.isOverCapacity).toBe(false);
    });

    it('should detect over capacity (≥100%)', async () => {
      const campaignOverCapacity = {
        ...mockCampaign,
        targetVolunteers: 25,
        currentVolunteers: 30
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([campaignOverCapacity])
          })
        })
      });

      const mockSelectInstances = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockInstances.slice(0, 2)) // 15 + 15 = 30
        })
      });

      (db.select as any)
        .mockReturnValueOnce(mockSelect)
        .mockReturnValueOnce(mockSelectInstances);

      const result = await aggregateCampaignMetrics(mockCampaignId);

      // 30 / 25 = 1.2 (120%)
      expect(result.capacityUtilization).toBeCloseTo(1.2, 2);
      expect(result.isNearCapacity).toBe(false);
      expect(result.isOverCapacity).toBe(true);
    });
  });

  describe('calculateCumulativeSROI', () => {
    it('should calculate weighted average SROI correctly', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { sroiScore: '4.50', enrolledBeneficiaries: 40 },
            { sroiScore: '4.00', enrolledBeneficiaries: 35 },
            { sroiScore: '3.80', enrolledBeneficiaries: 25 }
          ])
        })
      });

      (db.select as any).mockReturnValue(mockSelect);

      const result = await calculateCumulativeSROI(mockCampaignId);

      // Weighted average: (4.50*40 + 4.00*35 + 3.80*25) / (40+35+25)
      // = (180 + 140 + 95) / 100 = 415 / 100 = 4.15
      expect(result).toBeCloseTo(4.15, 2);
    });

    it('should return null if no instances have SROI scores', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { sroiScore: null, enrolledBeneficiaries: 40 }
          ])
        })
      });

      (db.select as any).mockReturnValue(mockSelect);

      const result = await calculateCumulativeSROI(mockCampaignId);

      expect(result).toBeNull();
    });

    it('should use simple average if no beneficiaries enrolled yet', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { sroiScore: '4.50', enrolledBeneficiaries: 0 },
            { sroiScore: '4.00', enrolledBeneficiaries: 0 }
          ])
        })
      });

      (db.select as any).mockReturnValue(mockSelect);

      const result = await calculateCumulativeSROI(mockCampaignId);

      // Simple average: (4.50 + 4.00) / 2 = 4.25
      expect(result).toBeCloseTo(4.25, 2);
    });
  });

  describe('calculateAverageVIS', () => {
    it('should calculate simple average VIS correctly', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { averageVISScore: '78.00' },
            { averageVISScore: '73.60' },
            { averageVISScore: '72.00' }
          ])
        })
      });

      (db.select as any).mockReturnValue(mockSelect);

      const result = await calculateAverageVIS(mockCampaignId);

      // Simple average: (78.00 + 73.60 + 72.00) / 3 = 74.53
      expect(result).toBeCloseTo(74.53, 2);
    });

    it('should return null if no instances have VIS scores', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { averageVISScore: null }
          ])
        })
      });

      (db.select as any).mockReturnValue(mockSelect);

      const result = await calculateAverageVIS(mockCampaignId);

      expect(result).toBeNull();
    });

    it('should handle empty instances array', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      (db.select as any).mockReturnValue(mockSelect);

      const result = await calculateAverageVIS(mockCampaignId);

      expect(result).toBeNull();
    });
  });

  describe('determineSnapshotFrequency', () => {
    it('should return 0 for draft campaigns', () => {
      const draftCampaign = { ...mockCampaign, status: 'draft' } as Campaign;
      expect(determineSnapshotFrequency(draftCampaign)).toBe(0);
    });

    it('should return 0 for completed campaigns', () => {
      const completedCampaign = { ...mockCampaign, status: 'completed' } as Campaign;
      expect(determineSnapshotFrequency(completedCampaign)).toBe(0);
    });

    it('should return 0 for closed campaigns', () => {
      const closedCampaign = { ...mockCampaign, status: 'closed' } as Campaign;
      expect(determineSnapshotFrequency(closedCampaign)).toBe(0);
    });

    it('should return 1 hour for high-activity campaigns (>100 sessions/week)', () => {
      const highActivityCampaign = {
        ...mockCampaign,
        status: 'active',
        currentSessions: 150
      } as Campaign;

      expect(determineSnapshotFrequency(highActivityCampaign)).toBe(1);
    });

    it('should return 6 hours for medium-activity campaigns (25-100 sessions/week)', () => {
      const mediumActivityCampaign = {
        ...mockCampaign,
        status: 'active',
        currentSessions: 50
      } as Campaign;

      expect(determineSnapshotFrequency(mediumActivityCampaign)).toBe(6);
    });

    it('should return 24 hours for low-activity campaigns (<25 sessions/week)', () => {
      const lowActivityCampaign = {
        ...mockCampaign,
        status: 'active',
        currentSessions: 10
      } as Campaign;

      expect(determineSnapshotFrequency(lowActivityCampaign)).toBe(24);
    });

    it('should return 24 hours for planned campaigns', () => {
      const plannedCampaign = { ...mockCampaign, status: 'planned' } as Campaign;
      expect(determineSnapshotFrequency(plannedCampaign)).toBe(24);
    });

    it('should return 24 hours for recruiting campaigns', () => {
      const recruitingCampaign = { ...mockCampaign, status: 'recruiting' } as Campaign;
      expect(determineSnapshotFrequency(recruitingCampaign)).toBe(24);
    });

    it('should return 24 hours for paused campaigns', () => {
      const pausedCampaign = { ...mockCampaign, status: 'paused' } as Campaign;
      expect(determineSnapshotFrequency(pausedCampaign)).toBe(24);
    });
  });

  describe('updateCampaignMetrics', () => {
    it('should update all campaign metrics fields', async () => {
      // Mock aggregateCampaignMetrics
      const mockMetrics: CampaignMetrics = {
        campaignId: mockCampaignId,
        currentVolunteers: 30,
        currentBeneficiaries: 75,
        currentSessions: 120,
        totalHoursLogged: 450.50,
        cumulativeSROI: 4.25,
        averageVIS: 75.80,
        capacityUtilization: 0.6,
        isNearCapacity: false,
        isOverCapacity: false,
        totalInstances: 3,
        activeInstances: 2
      };

      // Mock select for campaign
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockCampaign])
          })
        })
      });

      // Mock select for instances
      const mockSelectInstances = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockInstances)
        })
      });

      // Mock update
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([{ ...mockCampaign, ...mockMetrics }])
          })
        })
      });

      (db.select as any)
        .mockReturnValueOnce(mockSelect)
        .mockReturnValueOnce(mockSelectInstances);
      (db.update as any).mockReturnValue(mockUpdate);

      const result = await updateCampaignMetrics(mockCampaignId);

      expect(result).toBeDefined();
      expect(db.update).toHaveBeenCalled();
    });

    it('should throw error if update fails', async () => {
      // Mock aggregateCampaignMetrics
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([mockCampaign])
          })
        })
      });

      const mockSelectInstances = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(mockInstances)
        })
      });

      // Mock failed update (returns null)
      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]) // Empty result = failed update
          })
        })
      });

      (db.select as any)
        .mockReturnValueOnce(mockSelect)
        .mockReturnValueOnce(mockSelectInstances);
      (db.update as any).mockReturnValue(mockUpdate);

      await expect(updateCampaignMetrics(mockCampaignId)).rejects.toThrow('Failed to update campaign metrics');
    });
  });

  describe('Edge Cases', () => {
    it('should handle zero target volunteers (avoid division by zero)', async () => {
      const campaignZeroTarget = {
        ...mockCampaign,
        targetVolunteers: 0,
        currentVolunteers: 0
      };

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([campaignZeroTarget])
          })
        })
      });

      const mockSelectInstances = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([])
        })
      });

      (db.select as any)
        .mockReturnValueOnce(mockSelect)
        .mockReturnValueOnce(mockSelectInstances);

      const result = await aggregateCampaignMetrics(mockCampaignId);

      expect(result.capacityUtilization).toBe(0);
      expect(result.isNearCapacity).toBe(false);
      expect(result.isOverCapacity).toBe(false);
    });

    it('should handle decimal precision correctly', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { sroiScore: '4.567891', enrolledBeneficiaries: 33 }
          ])
        })
      });

      (db.select as any).mockReturnValue(mockSelect);

      const result = await calculateCumulativeSROI(mockCampaignId);

      // Should round to 2 decimal places
      expect(result).toBe(4.57);
    });
  });
});
