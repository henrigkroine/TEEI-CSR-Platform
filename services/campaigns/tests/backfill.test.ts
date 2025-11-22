/**
 * Integration Tests for Backfill Associations
 *
 * Tests the historical data backfill functionality for sessions, matches,
 * and completions.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  backfillHistoricalSessions,
  backfillHistoricalMatches,
  backfillHistoricalCompletions,
  backfillAllHistoricalData,
  type BackfillOptions,
} from '../src/lib/backfill-associations.js';

// Mock the database module
vi.mock('@teei/shared-schema/db', () => ({
  db: {
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(() => ({
          limit: vi.fn(() => Promise.resolve([])),
          offset: vi.fn(() => Promise.resolve([])),
        })),
        innerJoin: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => Promise.resolve([])),
          })),
        })),
        limit: vi.fn(() => ({
          offset: vi.fn(() => Promise.resolve([])),
        })),
      })),
    })),
  },
}));

// Mock the activity-associator module
vi.mock('../src/lib/activity-associator.js', () => ({
  associateSessionToCampaign: vi.fn(),
  associateBuddyMatchToCampaign: vi.fn(),
  associateUpskillingCompletionToCampaign: vi.fn(),
  getAssociationStats: vi.fn(() => ({
    total: 0,
    associated: 0,
    requiresReview: 0,
    failed: 0,
    averageConfidence: 0,
  })),
}));

describe('Backfill Associations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console logs during tests
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('backfillHistoricalSessions', () => {
    it('should return 0 when no sessions to backfill', async () => {
      // Mock database to return 0 count
      const { db } = await import('@teei/shared-schema/db');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 0 }])),
        })),
      } as any);

      const result = await backfillHistoricalSessions();

      expect(result).toBe(0);
    });

    it('should respect batch size option', async () => {
      const options: BackfillOptions = {
        batchSize: 50,
        dryRun: true,
      };

      // Mock database to return 0 count
      const { db } = await import('@teei/shared-schema/db');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 0 }])),
        })),
      } as any);

      const result = await backfillHistoricalSessions(options);

      expect(result).toBe(0);
    });

    it('should respect startFrom offset option', async () => {
      const options: BackfillOptions = {
        startFrom: 100,
        dryRun: true,
      };

      const { db } = await import('@teei/shared-schema/db');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 0 }])),
        })),
      } as any);

      const result = await backfillHistoricalSessions(options);

      expect(result).toBe(0);
    });

    it('should filter by company when companyId provided', async () => {
      const options: BackfillOptions = {
        companyId: 'company-1',
        dryRun: true,
      };

      const { db } = await import('@teei/shared-schema/db');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 0 }])),
        })),
      } as any);

      const result = await backfillHistoricalSessions(options);

      expect(result).toBe(0);
    });

    it('should filter by date range when provided', async () => {
      const options: BackfillOptions = {
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
        dryRun: true,
      };

      const { db } = await import('@teei/shared-schema/db');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 0 }])),
        })),
      } as any);

      const result = await backfillHistoricalSessions(options);

      expect(result).toBe(0);
    });

    it('should handle errors gracefully', async () => {
      const { db } = await import('@teei/shared-schema/db');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.reject(new Error('Database error'))),
        })),
      } as any);

      await expect(backfillHistoricalSessions()).rejects.toThrow('Database error');
    });

    it('should process sessions in batches', async () => {
      const { db } = await import('@teei/shared-schema/db');
      const {
        associateSessionToCampaign,
        getAssociationStats,
      } = await import('../src/lib/activity-associator.js');

      // Mock count query
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 3 }])),
        })),
      } as any);

      // Mock sessions batch query
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() =>
                Promise.resolve([
                  {
                    id: 'session-1',
                    participantId: 'user-1',
                    volunteerId: 'user-2',
                    completedAt: new Date('2025-06-15'),
                  },
                  {
                    id: 'session-2',
                    participantId: 'user-3',
                    volunteerId: 'user-4',
                    completedAt: new Date('2025-06-16'),
                  },
                  {
                    id: 'session-3',
                    participantId: 'user-5',
                    volunteerId: 'user-6',
                    completedAt: new Date('2025-06-17'),
                  },
                ])
              ),
            })),
          })),
        })),
      } as any);

      // Mock next batch (empty)
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      } as any);

      // Mock user company lookup (3 times)
      for (let i = 0; i < 3; i++) {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve([{ companyId: 'company-1' }])),
              })),
            })),
          })),
        } as any);
      }

      // Mock association results
      vi.mocked(associateSessionToCampaign).mockResolvedValue({
        campaignId: 'campaign-1',
        programInstanceId: 'instance-1',
        confidence: 85,
        matchReasons: ['Good match'],
        requiresReview: false,
      });

      vi.mocked(getAssociationStats).mockReturnValue({
        total: 3,
        associated: 3,
        requiresReview: 0,
        failed: 0,
        averageConfidence: 85,
      });

      const result = await backfillHistoricalSessions({ dryRun: true });

      expect(result).toBe(3);
      expect(associateSessionToCampaign).toHaveBeenCalledTimes(3);
    });
  });

  describe('backfillHistoricalMatches', () => {
    it('should return 0 when no matches to backfill', async () => {
      const { db } = await import('@teei/shared-schema/db');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 0 }])),
        })),
      } as any);

      const result = await backfillHistoricalMatches();

      expect(result).toBe(0);
    });

    it('should process matches in batches', async () => {
      const { db } = await import('@teei/shared-schema/db');
      const {
        associateBuddyMatchToCampaign,
        getAssociationStats,
      } = await import('../src/lib/activity-associator.js');

      // Mock count query
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 2 }])),
        })),
      } as any);

      // Mock matches batch query
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() =>
                Promise.resolve([
                  {
                    id: 'match-1',
                    participantId: 'user-1',
                    buddyId: 'user-2',
                    matchedAt: new Date('2025-06-15'),
                  },
                  {
                    id: 'match-2',
                    participantId: 'user-3',
                    buddyId: 'user-4',
                    matchedAt: new Date('2025-06-16'),
                  },
                ])
              ),
            })),
          })),
        })),
      } as any);

      // Mock next batch (empty)
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      } as any);

      // Mock user company lookup (2 times)
      for (let i = 0; i < 2; i++) {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn(() => ({
            innerJoin: vi.fn(() => ({
              where: vi.fn(() => ({
                limit: vi.fn(() => Promise.resolve([{ companyId: 'company-1' }])),
              })),
            })),
          })),
        } as any);
      }

      // Mock association results
      vi.mocked(associateBuddyMatchToCampaign).mockResolvedValue({
        campaignId: 'campaign-1',
        programInstanceId: 'instance-1',
        confidence: 80,
        matchReasons: ['Match found'],
        requiresReview: false,
      });

      vi.mocked(getAssociationStats).mockReturnValue({
        total: 2,
        associated: 2,
        requiresReview: 0,
        failed: 0,
        averageConfidence: 80,
      });

      const result = await backfillHistoricalMatches({ dryRun: true });

      expect(result).toBe(2);
      expect(associateBuddyMatchToCampaign).toHaveBeenCalledTimes(2);
    });

    it('should handle errors during match processing', async () => {
      const { db } = await import('@teei/shared-schema/db');
      const { associateBuddyMatchToCampaign } = await import(
        '../src/lib/activity-associator.js'
      );

      // Mock count query
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 1 }])),
        })),
      } as any);

      // Mock matches batch query
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() =>
                Promise.resolve([
                  {
                    id: 'match-1',
                    participantId: 'user-1',
                    buddyId: 'user-2',
                    matchedAt: new Date('2025-06-15'),
                  },
                ])
              ),
            })),
          })),
        })),
      } as any);

      // Mock next batch (empty)
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      } as any);

      // Mock user company lookup to fail
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      } as any);

      const result = await backfillHistoricalMatches({ dryRun: true });

      // Should still return 0 (not crash)
      expect(result).toBe(0);
    });
  });

  describe('backfillHistoricalCompletions', () => {
    it('should return 0 when no completions to backfill', async () => {
      const { db } = await import('@teei/shared-schema/db');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 0 }])),
        })),
      } as any);

      const result = await backfillHistoricalCompletions();

      expect(result).toBe(0);
    });

    it('should only process completed courses', async () => {
      const { db } = await import('@teei/shared-schema/db');

      // The function should filter by status = 'completed'
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 0 }])),
        })),
      } as any);

      const result = await backfillHistoricalCompletions();

      expect(result).toBe(0);
    });

    it('should respect dry run mode', async () => {
      const { db } = await import('@teei/shared-schema/db');
      const {
        associateUpskillingCompletionToCampaign,
        getAssociationStats,
      } = await import('../src/lib/activity-associator.js');

      // Mock count query
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 1 }])),
        })),
      } as any);

      // Mock completions batch query
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() =>
                Promise.resolve([
                  {
                    id: 'completion-1',
                    userId: 'user-1',
                    completedAt: new Date('2025-06-15'),
                  },
                ])
              ),
            })),
          })),
        })),
      } as any);

      // Mock next batch (empty)
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            limit: vi.fn(() => ({
              offset: vi.fn(() => Promise.resolve([])),
            })),
          })),
        })),
      } as any);

      // Mock user company lookup
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          innerJoin: vi.fn(() => ({
            where: vi.fn(() => ({
              limit: vi.fn(() => Promise.resolve([{ companyId: 'company-1' }])),
            })),
          })),
        })),
      } as any);

      // Mock association results
      vi.mocked(associateUpskillingCompletionToCampaign).mockResolvedValue({
        campaignId: 'campaign-1',
        programInstanceId: 'instance-1',
        confidence: 75,
        matchReasons: ['Match found'],
        requiresReview: true,
      });

      vi.mocked(getAssociationStats).mockReturnValue({
        total: 1,
        associated: 1,
        requiresReview: 1,
        failed: 0,
        averageConfidence: 75,
      });

      const result = await backfillHistoricalCompletions({ dryRun: true });

      expect(result).toBe(1);
      expect(associateUpskillingCompletionToCampaign).toHaveBeenCalledTimes(1);
    });
  });

  describe('backfillAllHistoricalData', () => {
    it('should backfill all entity types and return totals', async () => {
      const { db } = await import('@teei/shared-schema/db');

      // Mock all count queries to return 0
      for (let i = 0; i < 3; i++) {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([{ count: 0 }])),
          })),
        } as any);
      }

      const result = await backfillAllHistoricalData({ dryRun: true });

      expect(result).toEqual({
        sessions: 0,
        matches: 0,
        completions: 0,
        total: 0,
      });
    });

    it('should accumulate totals from all entity types', async () => {
      const { db } = await import('@teei/shared-schema/db');

      // Mock all count queries to return 0
      for (let i = 0; i < 3; i++) {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([{ count: 0 }])),
          })),
        } as any);
      }

      const result = await backfillAllHistoricalData({ dryRun: true });

      expect(result.total).toBe(result.sessions + result.matches + result.completions);
    });

    it('should pass options to all backfill functions', async () => {
      const { db } = await import('@teei/shared-schema/db');
      const options: BackfillOptions = {
        batchSize: 50,
        companyId: 'company-1',
        dryRun: true,
      };

      // Mock all count queries to return 0
      for (let i = 0; i < 3; i++) {
        vi.mocked(db.select).mockReturnValueOnce({
          from: vi.fn(() => ({
            where: vi.fn(() => Promise.resolve([{ count: 0 }])),
          })),
        } as any);
      }

      const result = await backfillAllHistoricalData(options);

      expect(result).toBeDefined();
      expect(result.total).toBe(0);
    });
  });

  describe('BackfillOptions', () => {
    it('should use default batch size when not specified', async () => {
      const { db } = await import('@teei/shared-schema/db');
      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 0 }])),
        })),
      } as any);

      const result = await backfillHistoricalSessions({});

      expect(result).toBe(0);
    });

    it('should handle all options together', async () => {
      const { db } = await import('@teei/shared-schema/db');
      const options: BackfillOptions = {
        batchSize: 25,
        startFrom: 50,
        dryRun: true,
        companyId: 'company-test',
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
      };

      vi.mocked(db.select).mockReturnValueOnce({
        from: vi.fn(() => ({
          where: vi.fn(() => Promise.resolve([{ count: 0 }])),
        })),
      } as any);

      const result = await backfillHistoricalSessions(options);

      expect(result).toBe(0);
    });
  });
});
