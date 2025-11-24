/**
 * Campaign Metrics Snapshots Tests
 *
 * SWARM 6: Beneficiary Groups, Campaigns & Monetization
 * Agent 3.5: metrics-aggregator
 *
 * Tests for snapshot creation and time-series functionality
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { db } from '@teei/shared-schema';
import { createMetricsSnapshot } from '../src/lib/metrics-aggregator.js';
import type { Campaign, ProgramInstance } from '@teei/shared-schema';

// Mock database
vi.mock('@teei/shared-schema', async () => {
  const actual = await vi.importActual('@teei/shared-schema');
  return {
    ...actual,
    db: {
      select: vi.fn(),
      insert: vi.fn(),
      execute: vi.fn()
    }
  };
});

describe('Campaign Metrics Snapshots', () => {
  const mockCampaignId = '123e4567-e89b-12d3-a456-426614174000';

  const mockCampaign: Partial<Campaign> = {
    id: mockCampaignId,
    name: 'Mentors for Syrian Refugees - Q1 2025',
    companyId: '987e6543-e21b-12d3-a456-426614174111',
    programTemplateId: 'template-1',
    beneficiaryGroupId: 'group-1',
    status: 'active',
    targetVolunteers: 50,
    currentVolunteers: 42,
    targetBeneficiaries: 100,
    currentBeneficiaries: 88,
    maxSessions: 200,
    currentSessions: 156,
    budgetAllocated: '50000.00',
    budgetSpent: '38500.00',
    currency: 'EUR',
    totalHoursLogged: '624.75',
    totalSessionsCompleted: 156,
    cumulativeSROI: '4.82',
    averageVIS: '79.45',
    committedSeats: 50,
    creditAllocation: 10000,
    iaasMetrics: {
      learnersCommitted: 100,
      pricePerLearner: 250,
      outcomesGuaranteed: ['job_readiness > 0.7']
    }
  };

  const mockInstances: Partial<ProgramInstance>[] = [
    {
      id: 'inst-1',
      campaignId: mockCampaignId,
      status: 'active',
      enrolledVolunteers: 20,
      enrolledBeneficiaries: 45,
      totalSessionsHeld: 80,
      totalHoursLogged: '320.00',
      sroiScore: '5.00',
      averageVISScore: '82.00',
      volunteersConsumed: 20,
      creditsConsumed: '4000.00',
      learnersServed: 45,
      outcomeScores: {
        integration: 0.75,
        language: 0.82,
        job_readiness: 0.88
      }
    },
    {
      id: 'inst-2',
      campaignId: mockCampaignId,
      status: 'active',
      enrolledVolunteers: 22,
      enrolledBeneficiaries: 43,
      totalSessionsHeld: 76,
      totalHoursLogged: '304.75',
      sroiScore: '4.65',
      averageVISScore: '76.90',
      volunteersConsumed: 22,
      creditsConsumed: '3800.00',
      learnersServed: 43,
      outcomeScores: {
        integration: 0.70,
        language: 0.78,
        job_readiness: 0.85
      }
    }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createMetricsSnapshot', () => {
    it('should create a complete snapshot with all metrics', async () => {
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          // First call: fetch campaign
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockCampaign])
            })
          })
        })
        .mockReturnValueOnce({
          // Second call: fetch instances
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockInstances)
          })
        });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'snapshot-1',
            campaignId: mockCampaignId,
            snapshotDate: new Date('2025-11-22T12:00:00Z'),
            volunteersTarget: 50,
            volunteersCurrent: 42,
            volunteersUtilization: '0.8400',
            beneficiariesTarget: 100,
            beneficiariesCurrent: 88,
            beneficiariesUtilization: '0.8800',
            sessionsTarget: 200,
            sessionsCurrent: 156,
            sessionsUtilization: '0.7800',
            budgetAllocated: '50000.00',
            budgetSpent: '38500.00',
            budgetRemaining: '11500.00',
            budgetUtilization: '0.7700',
            sroiScore: '4.82',
            averageVISScore: '79.45',
            totalHoursLogged: '624.75',
            totalSessionsCompleted: 156,
            seatsUsed: 42,
            seatsCommitted: 50,
            creditsConsumed: '7800.00',
            creditsAllocated: '10000',
            learnersServed: 88,
            learnersCommitted: 100,
            fullSnapshot: {}
          }])
        })
      });

      (db.select as any).mockImplementation(mockSelect);
      (db.insert as any).mockReturnValue(mockInsert);

      const snapshot = await createMetricsSnapshot(mockCampaignId);

      expect(snapshot).toBeDefined();
      expect(snapshot.campaignId).toBe(mockCampaignId);
      expect(snapshot.volunteersUtilization).toBe('0.8400');
      expect(snapshot.beneficiariesUtilization).toBe('0.8800');
    });

    it('should calculate utilization ratios correctly', async () => {
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockCampaign])
            })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockInstances)
          })
        });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'snapshot-1',
            campaignId: mockCampaignId,
            volunteersUtilization: '0.8400', // 42/50
            beneficiariesUtilization: '0.8800', // 88/100
            sessionsUtilization: '0.7800', // 156/200
            budgetUtilization: '0.7700' // 38500/50000
          }])
        })
      });

      (db.select as any).mockImplementation(mockSelect);
      (db.insert as any).mockReturnValue(mockInsert);

      const snapshot = await createMetricsSnapshot(mockCampaignId);

      // Verify utilization calculations
      expect(parseFloat(snapshot.volunteersUtilization || '0')).toBeCloseTo(0.84, 2);
      expect(parseFloat(snapshot.beneficiariesUtilization || '0')).toBeCloseTo(0.88, 2);
      expect(parseFloat(snapshot.sessionsUtilization || '0')).toBeCloseTo(0.78, 2);
      expect(parseFloat(snapshot.budgetUtilization || '0')).toBeCloseTo(0.77, 2);
    });

    it('should aggregate consumption metrics from instances', async () => {
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockCampaign])
            })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockInstances)
          })
        });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'snapshot-1',
            seatsUsed: 42, // 20 + 22 from instances
            creditsConsumed: '7800.00', // 4000 + 3800
            learnersServed: 88 // 45 + 43
          }])
        })
      });

      (db.select as any).mockImplementation(mockSelect);
      (db.insert as any).mockReturnValue(mockInsert);

      const snapshot = await createMetricsSnapshot(mockCampaignId);

      expect(snapshot.seatsUsed).toBe(42);
      expect(snapshot.creditsConsumed).toBe('7800.00');
      expect(snapshot.learnersServed).toBe(88);
    });

    it('should generate capacity alerts in fullSnapshot', async () => {
      // Campaign at 84% capacity (near capacity warning threshold)
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockCampaign])
            })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockInstances)
          })
        });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'snapshot-1',
            fullSnapshot: {
              campaignName: mockCampaign.name,
              status: 'active',
              alerts: [
                {
                  type: 'capacity_warning',
                  threshold: 0.8,
                  currentValue: 0.84,
                  message: 'Volunteer capacity nearing limit: 84.0% utilization'
                },
                {
                  type: 'capacity_warning',
                  threshold: 0.8,
                  currentValue: 0.88,
                  message: 'Beneficiary capacity nearing limit: 88.0% utilization'
                }
              ]
            }
          }])
        })
      });

      (db.select as any).mockImplementation(mockSelect);
      (db.insert as any).mockReturnValue(mockInsert);

      const snapshot = await createMetricsSnapshot(mockCampaignId);

      expect(snapshot.fullSnapshot?.alerts).toBeDefined();
      expect(snapshot.fullSnapshot?.alerts?.length).toBeGreaterThan(0);
    });

    it('should include program instance summary in fullSnapshot', async () => {
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockCampaign])
            })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockInstances)
          })
        });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'snapshot-1',
            fullSnapshot: {
              programInstances: {
                activeCount: 2,
                totalCount: 2,
                avgOutcomeScores: {
                  integration: 0.73,
                  language: 0.80,
                  job_readiness: 0.87
                }
              }
            }
          }])
        })
      });

      (db.select as any).mockImplementation(mockSelect);
      (db.insert as any).mockReturnValue(mockInsert);

      const snapshot = await createMetricsSnapshot(mockCampaignId);

      expect(snapshot.fullSnapshot?.programInstances).toBeDefined();
      expect(snapshot.fullSnapshot?.programInstances?.activeCount).toBe(2);
      expect(snapshot.fullSnapshot?.programInstances?.totalCount).toBe(2);
    });

    it('should throw error if campaign not found', async () => {
      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]) // No campaign found
          })
        })
      });

      (db.select as any).mockReturnValue(mockSelect);

      await expect(createMetricsSnapshot('nonexistent-id')).rejects.toThrow('Campaign not found');
    });

    it('should handle campaigns with no instances gracefully', async () => {
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockCampaign])
            })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]) // No instances
          })
        });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'snapshot-1',
            seatsUsed: 0,
            creditsConsumed: null,
            learnersServed: 0,
            fullSnapshot: {
              programInstances: {
                activeCount: 0,
                totalCount: 0,
                avgOutcomeScores: {}
              }
            }
          }])
        })
      });

      (db.select as any).mockImplementation(mockSelect);
      (db.insert as any).mockReturnValue(mockInsert);

      const snapshot = await createMetricsSnapshot(mockCampaignId);

      expect(snapshot.seatsUsed).toBe(0);
      expect(snapshot.learnersServed).toBe(0);
      expect(snapshot.fullSnapshot?.programInstances?.totalCount).toBe(0);
    });

    it('should handle optional session limits gracefully', async () => {
      const campaignNoSessionLimit = {
        ...mockCampaign,
        maxSessions: null // No session limit
      };

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([campaignNoSessionLimit])
            })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockInstances)
          })
        });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'snapshot-1',
            sessionsTarget: null,
            sessionsCurrent: 156,
            sessionsUtilization: null
          }])
        })
      });

      (db.select as any).mockImplementation(mockSelect);
      (db.insert as any).mockReturnValue(mockInsert);

      const snapshot = await createMetricsSnapshot(mockCampaignId);

      expect(snapshot.sessionsTarget).toBeNull();
      expect(snapshot.sessionsUtilization).toBeNull();
    });

    it('should handle null SROI/VIS scores gracefully', async () => {
      const campaignNoMetrics = {
        ...mockCampaign,
        cumulativeSROI: null,
        averageVIS: null
      };

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([campaignNoMetrics])
            })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([])
          })
        });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'snapshot-1',
            sroiScore: null,
            averageVISScore: null
          }])
        })
      });

      (db.select as any).mockImplementation(mockSelect);
      (db.insert as any).mockReturnValue(mockInsert);

      const snapshot = await createMetricsSnapshot(mockCampaignId);

      expect(snapshot.sroiScore).toBeNull();
      expect(snapshot.averageVISScore).toBeNull();
    });

    it('should calculate budget remaining correctly', async () => {
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockCampaign])
            })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockInstances)
          })
        });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'snapshot-1',
            budgetAllocated: '50000.00',
            budgetSpent: '38500.00',
            budgetRemaining: '11500.00' // 50000 - 38500
          }])
        })
      });

      (db.select as any).mockImplementation(mockSelect);
      (db.insert as any).mockReturnValue(mockInsert);

      const snapshot = await createMetricsSnapshot(mockCampaignId);

      expect(parseFloat(snapshot.budgetRemaining || '0')).toBe(11500.00);
    });

    it('should include snapshot metadata', async () => {
      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([mockCampaign])
            })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockInstances)
          })
        });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'snapshot-1',
            fullSnapshot: {
              snapshotMetadata: {
                generatedBy: 'metrics-aggregator',
                dataSource: 'program_instances',
                calculationDurationMs: 0
              }
            }
          }])
        })
      });

      (db.select as any).mockImplementation(mockSelect);
      (db.insert as any).mockReturnValue(mockInsert);

      const snapshot = await createMetricsSnapshot(mockCampaignId);

      expect(snapshot.fullSnapshot?.snapshotMetadata).toBeDefined();
      expect(snapshot.fullSnapshot?.snapshotMetadata?.generatedBy).toBe('metrics-aggregator');
    });
  });

  describe('Snapshot Performance Alerts', () => {
    it('should generate low SROI alert when below threshold', async () => {
      const lowSROICampaign = {
        ...mockCampaign,
        cumulativeSROI: '1.50' // Below 2.0 threshold
      };

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([lowSROICampaign])
            })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockInstances)
          })
        });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'snapshot-1',
            fullSnapshot: {
              alerts: [
                {
                  type: 'performance_low',
                  threshold: 2.0,
                  currentValue: 1.50,
                  message: 'SROI below target: 1.50'
                }
              ]
            }
          }])
        })
      });

      (db.select as any).mockImplementation(mockSelect);
      (db.insert as any).mockReturnValue(mockInsert);

      const snapshot = await createMetricsSnapshot(mockCampaignId);

      const performanceAlerts = snapshot.fullSnapshot?.alerts?.filter(
        a => a.type === 'performance_low'
      );

      expect(performanceAlerts).toBeDefined();
      expect(performanceAlerts?.length).toBeGreaterThan(0);
    });

    it('should generate budget warning when >90% spent', async () => {
      const highBudgetCampaign = {
        ...mockCampaign,
        budgetAllocated: '50000.00',
        budgetSpent: '46000.00' // 92% spent
      };

      const mockSelect = vi.fn()
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([highBudgetCampaign])
            })
          })
        })
        .mockReturnValueOnce({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(mockInstances)
          })
        });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([{
            id: 'snapshot-1',
            fullSnapshot: {
              alerts: [
                {
                  type: 'budget_warning',
                  threshold: 0.9,
                  currentValue: 0.92,
                  message: 'Budget 92.0% spent'
                }
              ]
            }
          }])
        })
      });

      (db.select as any).mockImplementation(mockSelect);
      (db.insert as any).mockReturnValue(mockInsert);

      const snapshot = await createMetricsSnapshot(mockCampaignId);

      const budgetAlerts = snapshot.fullSnapshot?.alerts?.filter(
        a => a.type === 'budget_warning'
      );

      expect(budgetAlerts).toBeDefined();
      expect(budgetAlerts?.length).toBeGreaterThan(0);
    });
  });
});
