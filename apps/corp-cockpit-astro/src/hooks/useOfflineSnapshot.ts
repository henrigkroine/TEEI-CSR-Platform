/**
 * useOfflineSnapshot Hook - Phase H3-A
 *
 * Manages offline snapshot storage for boardroom mode.
 * Stores data in IndexedDB for offline access.
 *
 * Acceptance Criteria:
 * - Offline snapshot loads < 2.0s
 * - Snapshot includes metadata (timestamp, version)
 * - Automatic cleanup of old snapshots
 */

import { useState, useCallback, useEffect } from 'react';

interface OfflineSnapshotOptions {
  companyId: string;
  key: string;
  maxAge?: number; // Max age in milliseconds (default: 7 days)
}

interface SnapshotMetadata {
  timestamp: number;
  version: string;
  companyId: string;
  key: string;
}

interface Snapshot<T = any> {
  data: T;
  metadata: SnapshotMetadata;
}

const DB_NAME = 'teei-cockpit-offline';
const DB_VERSION = 1;
const STORE_NAME = 'snapshots';
const DEFAULT_MAX_AGE = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Initialize IndexedDB
 */
function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'));
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'metadata.key' });
        store.createIndex('timestamp', 'metadata.timestamp', { unique: false });
        store.createIndex('companyId', 'metadata.companyId', { unique: false });
      }
    };
  });
}

/**
 * Save snapshot to IndexedDB
 */
async function saveSnapshotToDB<T>(
  key: string,
  companyId: string,
  data: T
): Promise<void> {
  const db = await initDB();

  const snapshot: Snapshot<T> = {
    data,
    metadata: {
      timestamp: Date.now(),
      version: '1.0',
      companyId,
      key,
    },
  };

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(snapshot);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to save snapshot'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Load snapshot from IndexedDB
 */
async function loadSnapshotFromDB<T>(key: string): Promise<Snapshot<T> | null> {
  const startTime = performance.now();

  try {
    const db = await initDB();

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.get(key);

      request.onsuccess = () => {
        const loadTime = performance.now() - startTime;
        console.log(`[useOfflineSnapshot] Snapshot loaded in ${loadTime.toFixed(2)}ms`);

        if (loadTime > 2000) {
          console.warn('[useOfflineSnapshot] Snapshot load exceeded 2.0s budget');
        }

        resolve(request.result || null);
      };

      request.onerror = () => {
        reject(new Error('Failed to load snapshot'));
      };

      transaction.oncomplete = () => {
        db.close();
      };
    });
  } catch (error) {
    console.error('[useOfflineSnapshot] Failed to load snapshot:', error);
    return null;
  }
}

/**
 * Delete snapshot from IndexedDB
 */
async function deleteSnapshotFromDB(key: string): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(key);

    request.onsuccess = () => {
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to delete snapshot'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}

/**
 * Clean up old snapshots
 */
async function cleanupOldSnapshots(maxAge: number): Promise<void> {
  const db = await initDB();
  const cutoffTime = Date.now() - maxAge;

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const index = store.index('timestamp');
    const request = index.openCursor();

    request.onsuccess = (event) => {
      const cursor = (event.target as IDBRequest).result;

      if (cursor) {
        const snapshot = cursor.value as Snapshot;

        if (snapshot.metadata.timestamp < cutoffTime) {
          cursor.delete();
          console.log(`[useOfflineSnapshot] Deleted old snapshot: ${snapshot.metadata.key}`);
        }

        cursor.continue();
      }
    };

    request.onerror = () => {
      reject(new Error('Failed to cleanup snapshots'));
    };

    transaction.oncomplete = () => {
      db.close();
      resolve();
    };
  });
}

/**
 * Hook for managing offline snapshots
 */
export function useOfflineSnapshot<T = any>(options: OfflineSnapshotOptions) {
  const { companyId, key, maxAge = DEFAULT_MAX_AGE } = options;

  const [hasSnapshot, setHasSnapshot] = useState(false);
  const [isLoadingSnapshot, setIsLoadingSnapshot] = useState(false);
  const [snapshotAge, setSnapshotAge] = useState<string | null>(null);

  // Check if snapshot exists on mount
  useEffect(() => {
    checkSnapshot();
    cleanupOldSnapshots(maxAge);
  }, [key, maxAge]);

  /**
   * Check if snapshot exists and get its age
   */
  const checkSnapshot = useCallback(async () => {
    try {
      const snapshot = await loadSnapshotFromDB<T>(key);

      if (snapshot) {
        setHasSnapshot(true);

        const age = Date.now() - snapshot.metadata.timestamp;
        const ageInMinutes = Math.floor(age / 60000);
        const ageInHours = Math.floor(age / 3600000);
        const ageInDays = Math.floor(age / 86400000);

        if (ageInDays > 0) {
          setSnapshotAge(`${ageInDays}d ago`);
        } else if (ageInHours > 0) {
          setSnapshotAge(`${ageInHours}h ago`);
        } else {
          setSnapshotAge(`${ageInMinutes}m ago`);
        }
      } else {
        setHasSnapshot(false);
        setSnapshotAge(null);
      }
    } catch (error) {
      console.error('[useOfflineSnapshot] Failed to check snapshot:', error);
      setHasSnapshot(false);
      setSnapshotAge(null);
    }
  }, [key]);

  /**
   * Save snapshot
   */
  const saveSnapshot = useCallback(
    async (data: T): Promise<void> => {
      try {
        await saveSnapshotToDB(key, companyId, data);
        setHasSnapshot(true);
        setSnapshotAge('just now');
        console.log(`[useOfflineSnapshot] Snapshot saved: ${key}`);
      } catch (error) {
        console.error('[useOfflineSnapshot] Failed to save snapshot:', error);
      }
    },
    [key, companyId]
  );

  /**
   * Load snapshot
   */
  const loadSnapshot = useCallback(async (): Promise<T | null> => {
    setIsLoadingSnapshot(true);

    try {
      const snapshot = await loadSnapshotFromDB<T>(key);

      if (snapshot) {
        return snapshot.data;
      }

      return null;
    } catch (error) {
      console.error('[useOfflineSnapshot] Failed to load snapshot:', error);
      return null;
    } finally {
      setIsLoadingSnapshot(false);
    }
  }, [key]);

  /**
   * Clear snapshot
   */
  const clearSnapshot = useCallback(async (): Promise<void> => {
    try {
      await deleteSnapshotFromDB(key);
      setHasSnapshot(false);
      setSnapshotAge(null);
      console.log(`[useOfflineSnapshot] Snapshot cleared: ${key}`);
    } catch (error) {
      console.error('[useOfflineSnapshot] Failed to clear snapshot:', error);
    }
  }, [key]);

  return {
    hasSnapshot,
    isLoadingSnapshot,
    snapshotAge,
    saveSnapshot,
    loadSnapshot,
    clearSnapshot,
    checkSnapshot,
  };
}

/**
 * Clear all snapshots (utility function)
 */
export async function clearAllSnapshots(): Promise<void> {
  const db = await initDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.clear();

    request.onsuccess = () => {
      console.log('[useOfflineSnapshot] All snapshots cleared');
      resolve();
    };

    request.onerror = () => {
      reject(new Error('Failed to clear all snapshots'));
    };

    transaction.oncomplete = () => {
      db.close();
    };
  });
}
