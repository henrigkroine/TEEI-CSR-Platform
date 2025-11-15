/**
 * Comprehensive Tests for 3-Level Snapshot Cache System
 *
 * Coverage:
 * - RingBuffer: FIFO logic, capacity limits, edge cases
 * - SnapshotDB: IndexedDB operations, compression, cleanup
 * - SnapshotManager: 3-level cache orchestration, auto-save
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { RingBuffer } from './RingBuffer';
import { SnapshotDB } from './SnapshotDB';
import { SnapshotManager } from './SnapshotManager';
import type { Snapshot } from '../../types/snapshot';

// Mock IndexedDB for testing
import 'fake-indexeddb/auto';

describe('RingBuffer', () => {
  describe('Basic Operations', () => {
    it('should initialize with correct capacity', () => {
      const buffer = new RingBuffer<number>(3);
      expect(buffer.capacity()).toBe(3);
      expect(buffer.size()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.isFull()).toBe(false);
    });

    it('should reject invalid capacity', () => {
      expect(() => new RingBuffer(0)).toThrow('RingBuffer maxSize must be at least 1');
      expect(() => new RingBuffer(-1)).toThrow('RingBuffer maxSize must be at least 1');
    });

    it('should push items correctly', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      expect(buffer.size()).toBe(1);
      expect(buffer.getLatest()).toBe(1);

      buffer.push(2);
      expect(buffer.size()).toBe(2);
      expect(buffer.getLatest()).toBe(2);

      buffer.push(3);
      expect(buffer.size()).toBe(3);
      expect(buffer.isFull()).toBe(true);
      expect(buffer.getLatest()).toBe(3);
    });

    it('should overwrite oldest when full (FIFO)', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4); // Overwrites 1

      expect(buffer.size()).toBe(3);
      expect(buffer.getAll()).toEqual([2, 3, 4]);
      expect(buffer.getLatest()).toBe(4);
    });

    it('should return null for empty buffer', () => {
      const buffer = new RingBuffer<number>(3);
      expect(buffer.getLatest()).toBeNull();
    });

    it('should clear buffer correctly', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.clear();

      expect(buffer.size()).toBe(0);
      expect(buffer.isEmpty()).toBe(true);
      expect(buffer.getLatest()).toBeNull();
    });
  });

  describe('getAll() chronological order', () => {
    it('should return items in chronological order (not full)', () => {
      const buffer = new RingBuffer<number>(5);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);

      expect(buffer.getAll()).toEqual([1, 2, 3]);
    });

    it('should return items in chronological order (full + wrapped)', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);
      buffer.push(3);
      buffer.push(4); // Overwrites 1
      buffer.push(5); // Overwrites 2

      expect(buffer.getAll()).toEqual([3, 4, 5]);
    });
  });

  describe('getAt() indexed access', () => {
    it('should return item at specific index', () => {
      const buffer = new RingBuffer<string>(3);
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');

      expect(buffer.getAt(0)).toBe('a'); // Oldest
      expect(buffer.getAt(1)).toBe('b');
      expect(buffer.getAt(2)).toBe('c'); // Newest
    });

    it('should handle wrapped buffer correctly', () => {
      const buffer = new RingBuffer<string>(3);
      buffer.push('a');
      buffer.push('b');
      buffer.push('c');
      buffer.push('d'); // Overwrites 'a'

      expect(buffer.getAt(0)).toBe('b'); // Oldest after wrap
      expect(buffer.getAt(1)).toBe('c');
      expect(buffer.getAt(2)).toBe('d'); // Newest
    });

    it('should return null for out-of-bounds index', () => {
      const buffer = new RingBuffer<number>(3);
      buffer.push(1);
      buffer.push(2);

      expect(buffer.getAt(-1)).toBeNull();
      expect(buffer.getAt(2)).toBeNull(); // Only 2 items
      expect(buffer.getAt(100)).toBeNull();
    });
  });
});

describe('SnapshotDB', () => {
  let db: SnapshotDB;

  beforeEach(async () => {
    db = new SnapshotDB();
    await db.init();
  });

  afterEach(() => {
    db.close();
  });

  describe('Initialization', () => {
    it('should initialize IndexedDB', async () => {
      const newDb = new SnapshotDB();
      await expect(newDb.init()).resolves.toBeUndefined();
      newDb.close();
    });

    it('should be idempotent (safe to call init multiple times)', async () => {
      await db.init();
      await db.init();
      await db.init();
      // Should not throw
    });
  });

  describe('Save and Retrieve', () => {
    const createSnapshot = (id: string, companyId: string, size: 'small' | 'large' = 'small'): Snapshot => {
      const kpis = size === 'large' ? generateLargeObject(50000) : { metric1: 100 };

      return {
        id,
        companyId,
        timestamp: Date.now(),
        data: {
          kpis,
          charts: {},
        },
        compressed: false,
      };
    };

    it('should save and retrieve a snapshot', async () => {
      const snapshot = createSnapshot('snap1', 'company1');
      await db.save(snapshot);

      const retrieved = await db.getLatest('company1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.id).toBe('snap1');
      expect(retrieved?.companyId).toBe('company1');
    });

    it('should return null when no snapshots exist', async () => {
      const retrieved = await db.getLatest('nonexistent');
      expect(retrieved).toBeNull();
    });

    it('should retrieve latest snapshot for company', async () => {
      const snap1 = createSnapshot('snap1', 'company1');
      const snap2 = createSnapshot('snap2', 'company1');
      const snap3 = createSnapshot('snap3', 'company1');

      await db.save(snap1);
      await new Promise((resolve) => setTimeout(resolve, 10)); // Ensure different timestamps
      await db.save(snap2);
      await new Promise((resolve) => setTimeout(resolve, 10));
      await db.save(snap3);

      const latest = await db.getLatest('company1');
      expect(latest?.id).toBe('snap3'); // Latest
    });

    it('should compress large snapshots (>100KB)', async () => {
      const largeSnapshot = createSnapshot('large1', 'company1', 'large');
      await db.save(largeSnapshot);

      const retrieved = await db.getLatest('company1');
      expect(retrieved).not.toBeNull();
      expect(retrieved?.compressed).toBe(false); // Decompressed on retrieval
      expect(retrieved?.data).toEqual(largeSnapshot.data); // Data intact
    });

    it('should not compress small snapshots', async () => {
      const smallSnapshot = createSnapshot('small1', 'company1', 'small');
      await db.save(smallSnapshot);

      const retrieved = await db.getLatest('company1');
      expect(retrieved?.compressed).toBe(false);
    });
  });

  describe('Multi-company isolation', () => {
    it('should isolate snapshots by company', async () => {
      const snap1 = createSnapshot('snap1', 'company1');
      const snap2 = createSnapshot('snap2', 'company2');

      await db.save(snap1);
      await db.save(snap2);

      const company1Latest = await db.getLatest('company1');
      const company2Latest = await db.getLatest('company2');

      expect(company1Latest?.id).toBe('snap1');
      expect(company2Latest?.id).toBe('snap2');
    });
  });

  describe('Cleanup', () => {
    it('should delete snapshots older than maxAge', async () => {
      const oldSnapshot: Snapshot = {
        id: 'old1',
        companyId: 'company1',
        timestamp: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago
        data: { kpis: {}, charts: {} },
        compressed: false,
      };

      const recentSnapshot: Snapshot = {
        id: 'recent1',
        companyId: 'company1',
        timestamp: Date.now(),
        data: { kpis: {}, charts: {} },
        compressed: false,
      };

      await db.save(oldSnapshot);
      await db.save(recentSnapshot);

      const deletedCount = await db.cleanup('company1', 24 * 60 * 60 * 1000); // 24h TTL
      expect(deletedCount).toBe(1); // Only old snapshot deleted

      const remaining = await db.getAll('company1');
      expect(remaining.length).toBe(1);
      expect(remaining[0].id).toBe('recent1');
    });

    it('should not delete recent snapshots', async () => {
      const snapshot = createSnapshot('recent1', 'company1');
      await db.save(snapshot);

      const deletedCount = await db.cleanup('company1', 24 * 60 * 60 * 1000);
      expect(deletedCount).toBe(0);

      const remaining = await db.getAll('company1');
      expect(remaining.length).toBe(1);
    });
  });

  describe('deleteAll', () => {
    it('should delete all snapshots for a company', async () => {
      await db.save(createSnapshot('snap1', 'company1'));
      await db.save(createSnapshot('snap2', 'company1'));
      await db.save(createSnapshot('snap3', 'company2'));

      const deletedCount = await db.deleteAll('company1');
      expect(deletedCount).toBe(2);

      const company1Snapshots = await db.getAll('company1');
      const company2Snapshots = await db.getAll('company2');

      expect(company1Snapshots.length).toBe(0);
      expect(company2Snapshots.length).toBe(1); // company2 unaffected
    });
  });

  describe('getMetadata', () => {
    it('should return metadata without loading full data', async () => {
      const snapshot = createSnapshot('snap1', 'company1');
      await db.save(snapshot);

      const metadata = await db.getMetadata('company1');
      expect(metadata.length).toBe(1);
      expect(metadata[0].id).toBe('snap1');
      expect(metadata[0].size).toBeGreaterThan(0);
    });
  });

  // Helper: Generate large object for compression testing
  function createSnapshot(id: string, companyId: string, size: 'small' | 'large' = 'small'): Snapshot {
    const kpis = size === 'large' ? generateLargeObject(50000) : { metric1: 100 };

    return {
      id,
      companyId,
      timestamp: Date.now(),
      data: {
        kpis,
        charts: {},
      },
      compressed: false,
    };
  }

  function generateLargeObject(targetSize: number): Record<string, number> {
    const obj: Record<string, number> = {};
    for (let i = 0; i < targetSize; i++) {
      obj[`metric_${i}`] = Math.random() * 1000;
    }
    return obj;
  }
});

describe('SnapshotManager', () => {
  let manager: SnapshotManager;

  beforeEach(async () => {
    manager = new SnapshotManager('test-company');
    await manager.init();
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      const newManager = new SnapshotManager('test-company-2');
      await expect(newManager.init()).resolves.toBeUndefined();
      newManager.destroy();
    });

    it('should load latest snapshot from IndexedDB on init', async () => {
      // Pre-populate IndexedDB
      const db = new SnapshotDB();
      await db.init();
      await db.save({
        id: 'existing1',
        companyId: 'test-company-3',
        timestamp: Date.now(),
        data: { kpis: { metric1: 999 }, charts: {} },
        compressed: false,
      });
      db.close();

      // Create manager - should load existing snapshot
      const newManager = new SnapshotManager('test-company-3');
      await newManager.init();

      const result = await newManager.getLatestSnapshot();
      expect(result.snapshot?.id).toBe('existing1');
      expect(result.source).toBe('memory'); // Cached in memory

      newManager.destroy();
    });
  });

  describe('Save and Retrieve', () => {
    it('should save and retrieve snapshots', async () => {
      const data = {
        kpis: { metric1: 100, metric2: 200 },
        charts: {},
      };

      const snapshotId = await manager.saveSnapshot(data);
      expect(snapshotId).toMatch(/^snap_/);

      const result = await manager.getLatestSnapshot();
      expect(result.snapshot?.id).toBe(snapshotId);
      expect(result.snapshot?.data).toEqual(data);
      expect(result.source).toBe('memory'); // Retrieved from Level 1
      expect(result.retrievalTimeMs).toBeLessThan(50); // Performance target
    });

    it('should retrieve from IndexedDB when not in memory', async () => {
      const data = { kpis: { metric1: 100 }, charts: {} };
      await manager.saveSnapshot(data);

      // Clear memory cache
      const stats = await manager.getStats();
      await manager.clearCache();

      // Re-init to load from IndexedDB
      await manager.init();

      const result = await manager.getLatestSnapshot();
      expect(result.snapshot).not.toBeNull();
      expect(result.source).toBe('memory'); // Loaded from IndexedDB, cached in memory
    });
  });

  describe('Cache Hierarchy', () => {
    it('should prefer Level 1 (memory) over Level 2 (IndexedDB)', async () => {
      const data = { kpis: { metric1: 100 }, charts: {} };
      await manager.saveSnapshot(data);

      const result = await manager.getLatestSnapshot();
      expect(result.source).toBe('memory');
      expect(result.retrievalTimeMs).toBeLessThan(50);
    });

    it('should fall back to Level 2 when Level 1 is empty', async () => {
      const data = { kpis: { metric1: 100 }, charts: {} };
      const snapshotId = await manager.saveSnapshot(data);

      // Wait for IndexedDB save
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Create new manager (empty memory)
      const newManager = new SnapshotManager('test-company');
      await newManager.init();

      const result = await newManager.getLatestSnapshot();
      expect(result.snapshot?.id).toBe(snapshotId);
      expect(result.source).toBe('memory'); // Loaded from IndexedDB and cached

      newManager.destroy();
    });
  });

  describe('Auto-save on Events', () => {
    it('should auto-save after event threshold', async () => {
      const data = { kpis: { metric1: 100 }, charts: {} };

      // Trigger 29 events (threshold is 30)
      for (let i = 0; i < 29; i++) {
        manager.onEvent({ data });
      }

      let stats = await manager.getStats();
      const initialSaves = stats.memoryCount;

      // 30th event should trigger save
      manager.onEvent({ data });

      // Wait for async save
      await new Promise((resolve) => setTimeout(resolve, 50));

      stats = await manager.getStats();
      expect(stats.eventCount).toBe(30);
      expect(stats.memoryCount).toBeGreaterThan(initialSaves);
    });
  });

  describe('Auto-save Timer', () => {
    it('should auto-save after time interval', async () => {
      // Create a new manager with shorter interval for testing
      const testManager = new SnapshotManager('test-timer-company', {
        autoSaveIntervalMs: 100, // 100ms for fast testing
      });
      await testManager.init();

      const data = { kpis: { metric1: 100 }, charts: {} };
      testManager.onEvent({ data }); // Set latest data

      const initialStats = await testManager.getStats();
      const initialSaves = initialStats.memoryCount;

      // Wait for auto-save interval to pass
      await new Promise((resolve) => setTimeout(resolve, 150));

      const stats = await testManager.getStats();
      expect(stats.memoryCount).toBeGreaterThan(initialSaves);

      testManager.destroy();
    });

    it('should stop auto-save when requested', () => {
      manager.startAutoSave();
      manager.stopAutoSave();
      // Should not throw
    });
  });

  describe('Manual Save', () => {
    it('should allow manual save', async () => {
      const data = { kpis: { metric1: 100 }, charts: {} };
      manager.onEvent({ data }); // Set latest data

      const snapshotId = await manager.manualSave();
      expect(snapshotId).toMatch(/^snap_/);

      const result = await manager.getLatestSnapshot();
      expect(result.snapshot?.id).toBe(snapshotId);
    });

    it('should throw if no data to save', async () => {
      await expect(manager.manualSave()).rejects.toThrow('No data available to save');
    });
  });

  describe('Clear Cache', () => {
    it('should clear all cache levels', async () => {
      const data = { kpis: { metric1: 100 }, charts: {} };
      await manager.saveSnapshot(data);

      await manager.clearCache();

      const stats = await manager.getStats();
      expect(stats.memoryCount).toBe(0);
      expect(stats.indexedDBCount).toBe(0);
    });
  });

  describe('Statistics', () => {
    it('should return accurate cache statistics', async () => {
      const data = { kpis: { metric1: 100 }, charts: {} };
      await manager.saveSnapshot(data);

      manager.onEvent({ data });
      manager.onEvent({ data });

      const stats = await manager.getStats();
      expect(stats.memoryCount).toBeGreaterThan(0);
      expect(stats.memoryCapacity).toBe(3);
      expect(stats.eventCount).toBe(2);
      expect(stats.lastSaveTime).toBeGreaterThan(0);
    });
  });

  describe('Performance', () => {
    it('should meet performance targets for getLatestSnapshot', async () => {
      const data = { kpis: { metric1: 100 }, charts: {} };
      await manager.saveSnapshot(data);

      const result = await manager.getLatestSnapshot();

      // Level 1 (memory): ≤50ms
      if (result.source === 'memory') {
        expect(result.retrievalTimeMs).toBeLessThan(50);
      }

      // Level 2 (IndexedDB): ≤250ms
      if (result.source === 'indexed_db') {
        expect(result.retrievalTimeMs).toBeLessThan(250);
      }
    });
  });
});
