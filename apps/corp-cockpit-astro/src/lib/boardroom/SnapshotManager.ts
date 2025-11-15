/**
 * Snapshot Manager - 3-Level Cache Orchestrator
 *
 * Manages snapshot storage and retrieval across:
 * - Level 1: In-memory ring buffer (3 snapshots, <1ms access)
 * - Level 2: IndexedDB persistent store (10 snapshots, 24h TTL)
 * - Level 3: API endpoint (full refresh fallback)
 *
 * Auto-save triggers:
 * - Every 30 SSE events
 * - Every 5 minutes (configurable)
 * - Manual save via saveSnapshot()
 * - Pre-disconnect (via beforeunload)
 *
 * Performance targets:
 * - getLatestSnapshot(): ≤50ms (ring buffer), ≤250ms (IndexedDB)
 * - saveSnapshot(): ≤100ms (non-blocking for IndexedDB)
 *
 * Usage:
 * ```typescript
 * const manager = new SnapshotManager('company_123');
 * await manager.init();
 *
 * // Auto-save on events
 * manager.onEvent({ data: { kpis: {...}, charts: {...} } });
 *
 * // Manual retrieve
 * const result = await manager.getLatestSnapshot();
 * console.log(result.snapshot, result.source, result.retrievalTimeMs);
 * ```
 */

import { RingBuffer } from './RingBuffer';
import { SnapshotDB } from './SnapshotDB';
import type { Snapshot, SnapshotResult, SnapshotTrigger, CacheLevel } from '../../types/snapshot';

/** Default auto-save interval (5 minutes) */
const DEFAULT_AUTOSAVE_INTERVAL_MS = 5 * 60 * 1000;

/** Default event threshold for auto-save */
const DEFAULT_EVENT_THRESHOLD = 30;

/** Ring buffer size (Level 1 cache) */
const RING_BUFFER_SIZE = 3;

export class SnapshotManager {
  private ringBuffer = new RingBuffer<Snapshot>(RING_BUFFER_SIZE); // Level 1
  private db = new SnapshotDB(); // Level 2
  private companyId: string;
  private eventCount = 0;
  private lastSaveTime = Date.now();
  private autoSaveInterval: number | null = null;
  private isInitialized = false;

  // Configuration
  private eventThreshold: number;
  private autoSaveIntervalMs: number;

  // Latest data cache (for next snapshot)
  private latestData: Snapshot['data'] | null = null;

  /**
   * Creates a new SnapshotManager
   *
   * @param companyId Company/tenant identifier
   * @param options Configuration options
   */
  constructor(
    companyId: string,
    options: {
      eventThreshold?: number;
      autoSaveIntervalMs?: number;
    } = {}
  ) {
    this.companyId = companyId;
    this.eventThreshold = options.eventThreshold ?? DEFAULT_EVENT_THRESHOLD;
    this.autoSaveIntervalMs = options.autoSaveIntervalMs ?? DEFAULT_AUTOSAVE_INTERVAL_MS;
  }

  /**
   * Initializes the snapshot manager
   * - Initializes IndexedDB
   * - Loads latest snapshot to ring buffer
   * - Starts auto-save timer
   * - Registers beforeunload handler
   */
  async init(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      // Initialize IndexedDB
      await this.db.init();

      // Load latest from IndexedDB to ring buffer
      const latest = await this.db.getLatest(this.companyId);
      if (latest) {
        this.ringBuffer.push(latest);
        console.debug(`SnapshotManager: Loaded snapshot ${latest.id} from IndexedDB`);
      }

      // Start auto-save timer
      this.startAutoSave();

      // Register beforeunload handler for pre-disconnect save
      window.addEventListener('beforeunload', this.handleBeforeUnload);

      this.isInitialized = true;
      console.debug(`SnapshotManager: Initialized for company ${this.companyId}`);
    } catch (error) {
      console.error('SnapshotManager: Initialization failed', error);
      // Graceful degradation: continue with in-memory only
      this.isInitialized = true;
    }
  }

  /**
   * Saves a snapshot to all cache levels
   *
   * @param data Snapshot data (KPIs + charts)
   * @param trigger Trigger reason (for telemetry)
   * @returns Snapshot ID
   */
  async saveSnapshot(data: Snapshot['data'], trigger?: SnapshotTrigger): Promise<string> {
    const snapshot: Snapshot = {
      id: this.generateSnapshotId(),
      companyId: this.companyId,
      timestamp: Date.now(),
      data,
      compressed: false,
    };

    // Level 1: In-memory ring buffer (synchronous, instant)
    this.ringBuffer.push(snapshot);

    // Level 2: IndexedDB (async, non-blocking)
    this.db.save(snapshot).catch((error) => {
      console.error('SnapshotManager: Failed to save to IndexedDB', error);
    });

    // Update last save time
    this.lastSaveTime = Date.now();

    // Cleanup old snapshots (async, non-blocking)
    this.db.cleanup(this.companyId).catch((error) => {
      console.warn('SnapshotManager: Cleanup failed', error);
    });

    console.debug(
      `SnapshotManager: Saved snapshot ${snapshot.id} (trigger: ${trigger ?? 'manual'})`
    );

    return snapshot.id;
  }

  /**
   * Retrieves the latest snapshot from cache hierarchy
   *
   * @returns Snapshot result with performance metadata
   */
  async getLatestSnapshot(): Promise<SnapshotResult> {
    const startTime = performance.now();

    // Try Level 1: In-memory ring buffer (fastest)
    let snapshot = this.ringBuffer.getLatest();
    if (snapshot) {
      const retrievalTimeMs = performance.now() - startTime;
      return {
        snapshot,
        source: 'memory' as CacheLevel,
        retrievalTimeMs,
        wasDecompressed: false,
      };
    }

    // Try Level 2: IndexedDB (persistent)
    try {
      snapshot = await this.db.getLatest(this.companyId);
      if (snapshot) {
        const retrievalTimeMs = performance.now() - startTime;

        // Cache in memory for future access
        this.ringBuffer.push(snapshot);

        return {
          snapshot,
          source: 'indexed_db' as CacheLevel,
          retrievalTimeMs,
          wasDecompressed: snapshot.compressed,
        };
      }
    } catch (error) {
      console.error('SnapshotManager: IndexedDB retrieval failed', error);
    }

    // Try Level 3: Fetch from API (fallback)
    try {
      snapshot = await this.fetchFromAPI();
      if (snapshot) {
        const retrievalTimeMs = performance.now() - startTime;

        // Cache in both levels
        this.ringBuffer.push(snapshot);
        this.db.save(snapshot).catch(console.error);

        return {
          snapshot,
          source: 'api' as CacheLevel,
          retrievalTimeMs,
          wasDecompressed: false,
        };
      }
    } catch (error) {
      console.error('SnapshotManager: API fetch failed', error);
    }

    // No data available
    const retrievalTimeMs = performance.now() - startTime;
    return {
      snapshot: null,
      source: 'none' as CacheLevel,
      retrievalTimeMs,
      wasDecompressed: false,
    };
  }

  /**
   * Handles SSE events and triggers auto-save
   *
   * @param event SSE event with data payload
   */
  onEvent(event: { data: Snapshot['data'] }): void {
    this.latestData = event.data;
    this.eventCount++;

    // Auto-save every N events
    if (this.eventCount % this.eventThreshold === 0) {
      this.saveSnapshot(event.data, 'event_threshold' as SnapshotTrigger).catch((error) => {
        console.error('SnapshotManager: Event-triggered save failed', error);
      });
    }
  }

  /**
   * Starts the auto-save timer
   *
   * @param intervalMs Override default interval (optional)
   */
  startAutoSave(intervalMs?: number): void {
    if (this.autoSaveInterval !== null) {
      return; // Already running
    }

    const interval = intervalMs ?? this.autoSaveIntervalMs;

    this.autoSaveInterval = window.setInterval(() => {
      const timeSinceLastSave = Date.now() - this.lastSaveTime;

      // Only save if we have new data and enough time has passed
      if (this.latestData && timeSinceLastSave >= interval) {
        this.saveSnapshot(this.latestData, 'time_interval' as SnapshotTrigger).catch((error) => {
          console.error('SnapshotManager: Timer-triggered save failed', error);
        });
      }
    }, interval);

    console.debug(`SnapshotManager: Auto-save started (interval: ${interval}ms)`);
  }

  /**
   * Stops the auto-save timer
   */
  stopAutoSave(): void {
    if (this.autoSaveInterval !== null) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.debug('SnapshotManager: Auto-save stopped');
    }
  }

  /**
   * Manually triggers a snapshot save
   *
   * @param data Optional data override (uses latest if not provided)
   */
  async manualSave(data?: Snapshot['data']): Promise<string> {
    const dataToSave = data ?? this.latestData;
    if (!dataToSave) {
      throw new Error('No data available to save');
    }

    return this.saveSnapshot(dataToSave, 'manual' as SnapshotTrigger);
  }

  /**
   * Clears all cached snapshots
   */
  async clearCache(): Promise<void> {
    this.ringBuffer.clear();
    await this.db.deleteAll(this.companyId);
    this.latestData = null;
    this.eventCount = 0;
    console.debug(`SnapshotManager: Cache cleared for company ${this.companyId}`);
  }

  /**
   * Gets cache statistics
   *
   * @returns Cache stats object
   */
  async getStats(): Promise<{
    memoryCount: number;
    memoryCapacity: number;
    indexedDBCount: number;
    eventCount: number;
    lastSaveTime: number;
  }> {
    const metadata = await this.db.getMetadata(this.companyId);

    return {
      memoryCount: this.ringBuffer.size(),
      memoryCapacity: this.ringBuffer.capacity(),
      indexedDBCount: metadata.length,
      eventCount: this.eventCount,
      lastSaveTime: this.lastSaveTime,
    };
  }

  /**
   * Cleans up resources (call before destroying instance)
   */
  destroy(): void {
    this.stopAutoSave();
    window.removeEventListener('beforeunload', this.handleBeforeUnload);
    this.db.close();
    this.ringBuffer.clear();
    this.isInitialized = false;
    console.debug(`SnapshotManager: Destroyed for company ${this.companyId}`);
  }

  /**
   * Fetches snapshot from API (Level 3 fallback)
   * @private
   */
  private async fetchFromAPI(): Promise<Snapshot | null> {
    try {
      const response = await fetch(`/api/v1/metrics/snapshot/${this.companyId}`);

      if (!response.ok) {
        throw new Error(`API returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      return {
        id: this.generateSnapshotId('api'),
        companyId: this.companyId,
        timestamp: Date.now(),
        data,
        compressed: false,
      };
    } catch (error) {
      console.error('SnapshotManager: API fetch failed', error);
      return null;
    }
  }

  /**
   * Generates a unique snapshot ID
   * @private
   */
  private generateSnapshotId(prefix: string = 'snap'): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 11);
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * Handles beforeunload event (pre-disconnect save)
   * @private
   */
  private handleBeforeUnload = (): void => {
    if (this.latestData) {
      // Synchronous save (blocking, but necessary for beforeunload)
      const snapshot: Snapshot = {
        id: this.generateSnapshotId('pre_disconnect'),
        companyId: this.companyId,
        timestamp: Date.now(),
        data: this.latestData,
        compressed: false,
      };

      this.ringBuffer.push(snapshot);

      // Note: IndexedDB save may not complete before unload
      // This is a best-effort save
      this.db.save(snapshot).catch((error) => {
        console.error('SnapshotManager: Pre-disconnect save failed', error);
      });

      console.debug('SnapshotManager: Pre-disconnect snapshot saved');
    }
  };
}
