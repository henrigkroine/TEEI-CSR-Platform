/**
 * Query Builder Unit Tests
 *
 * Tests for AuditQueryBuilder with ≥90% coverage.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Pool } from 'pg';
import { AuditQueryBuilder } from '../query-builder.js';
import type { AuditEventFilters } from '@teei/shared-types';

// Mock pg Pool
const mockQuery = vi.fn();
const mockPool = {
  query: mockQuery,
} as unknown as Pool;

describe('AuditQueryBuilder', () => {
  let queryBuilder: AuditQueryBuilder;

  beforeEach(() => {
    queryBuilder = new AuditQueryBuilder(mockPool);
    mockQuery.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('queryEvents', () => {
    it('should query events with no filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '10' }] }) // count query
        .mockResolvedValueOnce({
          // data query
          rows: [
            {
              id: 'event-1',
              timestamp: new Date('2024-01-01T00:00:00Z'),
              tenantId: 'tenant-1',
              actorId: 'user-1',
              actorEmail: 'user@example.com',
              actorRole: 'admin',
              actorIp: '192.168.1.1',
              action: 'LOGIN',
              actionCategory: 'AUTH',
              resourceType: 'user',
              resourceId: 'user-1',
              resourceIdentifier: 'user@example.com',
              beforeState: null,
              afterState: null,
              requestId: 'req-1',
              userAgent: 'Mozilla/5.0',
              endpoint: '/login',
              metadata: null,
              gdprBasis: null,
              retentionUntil: null,
            },
          ],
        });

      const result = await queryBuilder.queryEvents({});

      expect(result.events).toHaveLength(1);
      expect(result.total).toBe(10);
      expect(result.events[0].id).toBe('event-1');
      expect(result.events[0].action).toBe('LOGIN');
      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should apply tenant filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const filters: AuditEventFilters = {
        tenantId: 'tenant-123',
      };

      await queryBuilder.queryEvents(filters);

      const firstCall = mockQuery.mock.calls[0];
      expect(firstCall[0]).toContain('WHERE company_id = $1');
      expect(firstCall[1]).toContain('tenant-123');
    });

    it('should apply time range filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const from = new Date('2024-01-01T00:00:00Z');
      const to = new Date('2024-01-31T23:59:59Z');

      const filters: AuditEventFilters = {
        from,
        to,
      };

      await queryBuilder.queryEvents(filters);

      const firstCall = mockQuery.mock.calls[0];
      expect(firstCall[0]).toContain('timestamp >= $1');
      expect(firstCall[0]).toContain('timestamp <= $2');
      expect(firstCall[1]).toContain(from);
      expect(firstCall[1]).toContain(to);
    });

    it('should apply actor filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const filters: AuditEventFilters = {
        actorId: 'user-123',
        actorEmail: 'test@example.com',
      };

      await queryBuilder.queryEvents(filters);

      const firstCall = mockQuery.mock.calls[0];
      expect(firstCall[0]).toContain('actor_id = $1');
      expect(firstCall[0]).toContain('actor_email ILIKE $2');
      expect(firstCall[1]).toContain('user-123');
      expect(firstCall[1]).toContain('%test@example.com%');
    });

    it('should apply resource filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const filters: AuditEventFilters = {
        resourceType: 'report',
        resourceId: 'report-123',
      };

      await queryBuilder.queryEvents(filters);

      const firstCall = mockQuery.mock.calls[0];
      expect(firstCall[0]).toContain('resource_type = $1');
      expect(firstCall[0]).toContain('resource_id = $2');
      expect(firstCall[1]).toContain('report');
      expect(firstCall[1]).toContain('report-123');
    });

    it('should apply action filters', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const filters: AuditEventFilters = {
        action: 'UPDATE',
        actionCategory: 'DATA_MODIFICATION' as any,
      };

      await queryBuilder.queryEvents(filters);

      const firstCall = mockQuery.mock.calls[0];
      expect(firstCall[0]).toContain('action = $1');
      expect(firstCall[0]).toContain('action_category = $2');
      expect(firstCall[1]).toContain('UPDATE');
      expect(firstCall[1]).toContain('DATA_MODIFICATION');
    });

    it('should apply search filter', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const filters: AuditEventFilters = {
        search: 'password reset',
      };

      await queryBuilder.queryEvents(filters);

      const firstCall = mockQuery.mock.calls[0];
      expect(firstCall[0]).toContain('metadata::text ILIKE');
      expect(firstCall[1]).toContain('%password reset%');
    });

    it('should respect limit and offset', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '100' }] })
        .mockResolvedValueOnce({ rows: [] });

      const filters: AuditEventFilters = {
        limit: 50,
        offset: 25,
      };

      await queryBuilder.queryEvents(filters);

      const dataCall = mockQuery.mock.calls[1];
      expect(dataCall[0]).toContain('LIMIT');
      expect(dataCall[0]).toContain('OFFSET');
      expect(dataCall[1]).toContain(50);
      expect(dataCall[1]).toContain(25);
    });

    it('should enforce max limit of 1000', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const filters: AuditEventFilters = {
        limit: 5000, // Exceeds max
      };

      await queryBuilder.queryEvents(filters);

      const dataCall = mockQuery.mock.calls[1];
      // Should be clamped to 1000
      expect(dataCall[1]).toContain(1000);
    });

    it('should calculate hasMore correctly', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '150' }] })
        .mockResolvedValueOnce({
          rows: Array.from({ length: 100 }, (_, i) => ({
            id: `event-${i}`,
            timestamp: new Date(),
            tenantId: 'tenant-1',
            actorId: 'user-1',
            actorEmail: 'user@example.com',
            actorRole: 'admin',
            action: 'READ',
            actionCategory: 'DATA_ACCESS',
            resourceType: 'report',
            resourceId: 'report-1',
          })),
        });

      const result = await queryBuilder.queryEvents({ limit: 100, offset: 0 });

      expect(result.hasMore).toBe(true);
      expect(result.nextOffset).toBe(100);
    });

    it('should handle empty results', async () => {
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '0' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await queryBuilder.queryEvents({});

      expect(result.events).toHaveLength(0);
      expect(result.total).toBe(0);
      expect(result.hasMore).toBe(false);
      expect(result.nextOffset).toBeUndefined();
    });
  });

  describe('getEventById', () => {
    it('should retrieve event by ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'event-123',
            timestamp: new Date('2024-01-01T00:00:00Z'),
            tenantId: 'tenant-1',
            actorId: 'user-1',
            actorEmail: 'user@example.com',
            actorRole: 'admin',
            action: 'DELETE',
            actionCategory: 'DATA_MODIFICATION',
            resourceType: 'report',
            resourceId: 'report-1',
            beforeState: { status: 'active' },
            afterState: { status: 'deleted' },
          },
        ],
      });

      const event = await queryBuilder.getEventById('event-123');

      expect(event).not.toBeNull();
      expect(event?.id).toBe('event-123');
      expect(event?.action).toBe('DELETE');
      expect(event?.before).toEqual({ status: 'active' });
      expect(event?.after).toEqual({ status: 'deleted' });
    });

    it('should enforce tenant isolation', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await queryBuilder.getEventById('event-123', 'tenant-456');

      const call = mockQuery.mock.calls[0];
      expect(call[0]).toContain('AND company_id = $2');
      expect(call[1]).toContain('event-123');
      expect(call[1]).toContain('tenant-456');
    });

    it('should return null for non-existent event', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const event = await queryBuilder.getEventById('non-existent');

      expect(event).toBeNull();
    });
  });

  describe('getTimeline', () => {
    it('should generate daily timeline buckets', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            bucket: new Date('2024-01-01'),
            count: '15',
            action_counts: { LOGIN: 10, LOGOUT: 5 },
          },
          {
            bucket: new Date('2024-01-02'),
            count: '23',
            action_counts: { LOGIN: 15, LOGOUT: 8 },
          },
        ],
      });

      const timeline = await queryBuilder.getTimeline({}, 'day');

      expect(timeline).toHaveLength(2);
      expect(timeline[0].count).toBe(15);
      expect(timeline[0].actionCounts).toEqual({ LOGIN: 10, LOGOUT: 5 });
      expect(timeline[1].count).toBe(23);
    });

    it('should support hour buckets', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await queryBuilder.getTimeline({}, 'hour');

      const call = mockQuery.mock.calls[0];
      expect(call[0]).toContain("date_trunc('hour'");
    });

    it('should support week buckets', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await queryBuilder.getTimeline({}, 'week');

      const call = mockQuery.mock.calls[0];
      expect(call[0]).toContain("date_trunc('week'");
    });
  });

  describe('getStats', () => {
    it('should return comprehensive statistics', async () => {
      mockQuery
        .mockResolvedValueOnce({
          rows: [
            {
              total_events: '1523',
              earliest: new Date('2024-01-01'),
              latest: new Date('2024-01-31'),
              by_category: { AUTH: 500, DATA_ACCESS: 1000, DATA_MODIFICATION: 23 },
              by_action: { LOGIN: 450, READ: 900, UPDATE: 20 },
              by_resource: { user: 500, report: 1023 },
            },
          ],
        })
        .mockResolvedValueOnce({
          rows: [
            { actorId: 'user-1', actorEmail: 'user1@example.com', count: '100' },
            { actorId: 'user-2', actorEmail: 'user2@example.com', count: '75' },
          ],
        });

      const stats = await queryBuilder.getStats({});

      expect(stats.totalEvents).toBe(1523);
      expect(stats.eventsByCategory).toEqual({ AUTH: 500, DATA_ACCESS: 1000, DATA_MODIFICATION: 23 });
      expect(stats.topActors).toHaveLength(2);
      expect(stats.topActors[0].count).toBe(100);
    });
  });

  describe('streamEvents', () => {
    it('should stream events in batches', async () => {
      // Mock multiple pages
      mockQuery
        .mockResolvedValueOnce({ rows: [{ total: '250' }] })
        .mockResolvedValueOnce({
          rows: Array.from({ length: 100 }, (_, i) => ({
            id: `event-${i}`,
            timestamp: new Date(),
            tenantId: 'tenant-1',
            actorId: 'user-1',
            actorEmail: 'user@example.com',
            actorRole: 'admin',
            action: 'READ',
            actionCategory: 'DATA_ACCESS',
            resourceType: 'report',
            resourceId: 'report-1',
          })),
        })
        .mockResolvedValueOnce({ rows: [{ total: '250' }] })
        .mockResolvedValueOnce({
          rows: Array.from({ length: 100 }, (_, i) => ({
            id: `event-${i + 100}`,
            timestamp: new Date(),
            tenantId: 'tenant-1',
            actorId: 'user-1',
            actorEmail: 'user@example.com',
            actorRole: 'admin',
            action: 'READ',
            actionCategory: 'DATA_ACCESS',
            resourceType: 'report',
            resourceId: 'report-1',
          })),
        })
        .mockResolvedValueOnce({ rows: [{ total: '250' }] })
        .mockResolvedValueOnce({
          rows: Array.from({ length: 50 }, (_, i) => ({
            id: `event-${i + 200}`,
            timestamp: new Date(),
            tenantId: 'tenant-1',
            actorId: 'user-1',
            actorEmail: 'user@example.com',
            actorRole: 'admin',
            action: 'READ',
            actionCategory: 'DATA_ACCESS',
            resourceType: 'report',
            resourceId: 'report-1',
          })),
        });

      const batches: any[] = [];
      for await (const batch of queryBuilder.streamEvents({}, 100)) {
        batches.push(batch);
      }

      expect(batches).toHaveLength(3);
      expect(batches[0]).toHaveLength(100);
      expect(batches[1]).toHaveLength(100);
      expect(batches[2]).toHaveLength(50);
    });
  });
});
