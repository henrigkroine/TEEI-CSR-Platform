/**
 * IndexedDB Snapshot Storage with LZ-String Compression
 *
 * Level 2 cache: Persistent storage across browser sessions
 * Automatically compresses snapshots >100KB for storage efficiency
 *
 * Features:
 * - IndexedDB for offline-capable storage
 * - LZ-String compression for large payloads
 * - Automatic cleanup (24h TTL default)
 * - Multi-index support (timestamp, companyId)
 * - Graceful degradation if IndexedDB unavailable
 *
 * Performance:
 * - save(): ~50-200ms (with compression)
 * - getLatest(): ~20-100ms (with decompression)
 * - cleanup(): ~100-500ms (scans and deletes)
 *
 * Storage limits:
 * - Chrome/Edge: ~60% of available disk space
 * - Firefox: ~50% of available disk space
 * - Safari: 1GB max per origin
 */

import * as LZString from 'lz-string';
import type { Snapshot, SnapshotMetadata } from '../../types/snapshot';

/** Compression threshold: 100KB */
const COMPRESSION_THRESHOLD_BYTES = 100 * 1024;

/** IndexedDB database name */
const DB_NAME = 'teei-snapshots';

/** IndexedDB object store name */
const STORE_NAME = 'snapshots';

/** Database schema version */
const DB_VERSION = 1;

export class SnapshotDB {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initializes IndexedDB connection and schema
   * Safe to call multiple times (idempotent)
   *
   * @throws Error if IndexedDB is not available or initialization fails
   */
  async init(): Promise<void> {
    // Return existing promise if already initializing
    if (this.initPromise) {
      return this.initPromise;
    }

    // Already initialized
    if (this.db) {
      return Promise.resolve();
    }

    this.initPromise = new Promise((resolve, reject) => {
      // Check IndexedDB availability
      if (!window.indexedDB) {
        reject(new Error('IndexedDB not available in this browser'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        const error = new Error(`IndexedDB initialization failed: ${request.error?.message}`);
        this.initPromise = null;
        reject(error);
      };

      request.onsuccess = () => {
        this.db = request.result;

        // Handle unexpected close
        this.db.onversionchange = () => {
          this.db?.close();
          this.db = null;
          console.warn('SnapshotDB: Database version changed, connection closed');
        };

        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });

          // Create indexes for efficient querying
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('companyId', 'companyId', { unique: false });
          store.createIndex('companyId_timestamp', ['companyId', 'timestamp'], { unique: false });
        }
      };

      request.onblocked = () => {
        console.warn('SnapshotDB: Database upgrade blocked by open connections');
      };
    });

    return this.initPromise;
  }

  /**
   * Saves a snapshot to IndexedDB with automatic compression
   *
   * @param snapshot Snapshot to save
   * @throws Error if database is not initialized or save fails
   */
  async save(snapshot: Snapshot): Promise<void> {
    await this.ensureInitialized();

    // Clone to avoid mutating original
    const snapshotToSave = { ...snapshot };

    // Compress if data is large (and not already compressed)
    if (!snapshotToSave.compressed && typeof snapshotToSave.data === 'object') {
      const dataStr = JSON.stringify(snapshotToSave.data);
      const dataSize = new Blob([dataStr]).size;

      if (dataSize > COMPRESSION_THRESHOLD_BYTES) {
        const startTime = performance.now();
        const compressed = LZString.compressToUTF16(dataStr);
        const compressionTime = performance.now() - startTime;

        snapshotToSave.data = compressed;
        snapshotToSave.compressed = true;
        snapshotToSave.compressionRatio = compressed.length / dataStr.length;

        console.debug(
          `SnapshotDB: Compressed snapshot ${snapshot.id} ` +
            `(${dataSize} → ${compressed.length * 2} bytes, ` +
            `ratio: ${snapshotToSave.compressionRatio.toFixed(2)}, ` +
            `time: ${compressionTime.toFixed(1)}ms)`
        );
      }
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.put(snapshotToSave);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Failed to save snapshot: ${request.error?.message}`));
    });
  }

  /**
   * Retrieves the latest snapshot for a company
   *
   * @param companyId Company identifier
   * @returns Latest snapshot, or null if none found
   */
  async getLatest(companyId: string): Promise<Snapshot | null> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('companyId_timestamp');

      // Query by companyId, reverse order by timestamp (newest first)
      const range = IDBKeyRange.bound([companyId, 0], [companyId, Date.now()]);
      const request = index.openCursor(range, 'prev');

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const snapshot = cursor.value as Snapshot;

          // Decompress if needed
          if (snapshot.compressed && typeof snapshot.data === 'string') {
            const startTime = performance.now();
            const decompressed = LZString.decompressFromUTF16(snapshot.data);
            const decompressionTime = performance.now() - startTime;

            if (!decompressed) {
              reject(new Error(`Failed to decompress snapshot ${snapshot.id}`));
              return;
            }

            snapshot.data = JSON.parse(decompressed);
            snapshot.compressed = false;

            console.debug(
              `SnapshotDB: Decompressed snapshot ${snapshot.id} ` +
                `(time: ${decompressionTime.toFixed(1)}ms)`
            );
          }

          resolve(snapshot);
        } else {
          resolve(null); // No snapshots found
        }
      };

      request.onerror = () => reject(new Error(`Failed to get snapshot: ${request.error?.message}`));
    });
  }

  /**
   * Retrieves all snapshots for a company (chronological order)
   *
   * @param companyId Company identifier
   * @param limit Maximum number of snapshots to return
   * @returns Array of snapshots
   */
  async getAll(companyId: string, limit: number = 10): Promise<Snapshot[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('companyId_timestamp');

      const range = IDBKeyRange.bound([companyId, 0], [companyId, Date.now()]);
      const request = index.openCursor(range, 'prev');

      const snapshots: Snapshot[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor && snapshots.length < limit) {
          const snapshot = cursor.value as Snapshot;

          // Decompress if needed
          if (snapshot.compressed && typeof snapshot.data === 'string') {
            const decompressed = LZString.decompressFromUTF16(snapshot.data);
            if (decompressed) {
              snapshot.data = JSON.parse(decompressed);
              snapshot.compressed = false;
            }
          }

          snapshots.push(snapshot);
          cursor.continue();
        } else {
          resolve(snapshots);
        }
      };

      request.onerror = () => reject(new Error(`Failed to get snapshots: ${request.error?.message}`));
    });
  }

  /**
   * Retrieves metadata for all snapshots (without loading full data)
   *
   * @param companyId Company identifier
   * @returns Array of snapshot metadata
   */
  async getMetadata(companyId: string): Promise<SnapshotMetadata[]> {
    await this.ensureInitialized();

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('companyId');
      const request = index.openCursor(IDBKeyRange.only(companyId));

      const metadata: SnapshotMetadata[] = [];

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          const snapshot = cursor.value as Snapshot;

          // Calculate approximate size
          const dataStr = typeof snapshot.data === 'string' ? snapshot.data : JSON.stringify(snapshot.data);
          const size = new Blob([dataStr]).size;

          metadata.push({
            id: snapshot.id,
            timestamp: snapshot.timestamp,
            size,
            compressed: snapshot.compressed,
          });

          cursor.continue();
        } else {
          resolve(metadata);
        }
      };

      request.onerror = () => reject(new Error(`Failed to get metadata: ${request.error?.message}`));
    });
  }

  /**
   * Deletes snapshots older than maxAge
   *
   * @param companyId Company identifier
   * @param maxAge Maximum age in milliseconds (default: 24 hours)
   * @returns Number of snapshots deleted
   */
  async cleanup(companyId: string, maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    await this.ensureInitialized();

    const cutoff = Date.now() - maxAge;
    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('companyId_timestamp');

      // Query snapshots older than cutoff
      const range = IDBKeyRange.bound([companyId, 0], [companyId, cutoff]);
      const request = index.openCursor(range);

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.debug(`SnapshotDB: Cleaned up ${deletedCount} old snapshots for company ${companyId}`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(new Error(`Cleanup failed: ${request.error?.message}`));
    });
  }

  /**
   * Deletes all snapshots for a company
   *
   * @param companyId Company identifier
   * @returns Number of snapshots deleted
   */
  async deleteAll(companyId: string): Promise<number> {
    await this.ensureInitialized();

    let deletedCount = 0;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const index = store.index('companyId');
      const request = index.openCursor(IDBKeyRange.only(companyId));

      request.onsuccess = () => {
        const cursor = request.result;
        if (cursor) {
          cursor.delete();
          deletedCount++;
          cursor.continue();
        } else {
          console.debug(`SnapshotDB: Deleted ${deletedCount} snapshots for company ${companyId}`);
          resolve(deletedCount);
        }
      };

      request.onerror = () => reject(new Error(`Delete failed: ${request.error?.message}`));
    });
  }

  /**
   * Closes the database connection
   */
  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.initPromise = null;
    }
  }

  /**
   * Ensures database is initialized before operations
   * @private
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.db) {
      await this.init();
    }
  }
}
