/**
 * Snapshot Manager Hook
 *
 * Manages offline snapshots of metrics data.
 * Stores latest metrics in localStorage for offline access.
 * Tracks staleness and provides refresh capabilities.
 *
 * @module useSnapshotManager
 */

import { useEffect, useState, useCallback, useRef } from 'react';

export interface Snapshot {
  /** Timestamp when snapshot was taken (ms) */
  timestamp: number;
  /** Snapshot data */
  data: any;
}

export interface UseSnapshotManagerReturn {
  /** Current snapshot data */
  data: any;
  /** Snapshot timestamp */
  timestamp: number;
  /** Whether data is stale (>5 min old) */
  isStale: boolean;
  /** Time since last update in seconds */
  secondsSinceUpdate: number;
  /** Refresh snapshot from new data */
  updateSnapshot: (data: any) => void;
  /** Clear snapshot */
  clearSnapshot: () => void;
  /** Manually refresh from storage */
  refreshFromStorage: () => void;
}

const DEFAULT_STALE_TIMEOUT = 5 * 60 * 1000; // 5 minutes

/**
 * Hook for managing offline snapshots of metrics
 *
 * @param companyId - Company ID for scoped storage
 * @param staleTimeout - Timeout before data is considered stale (ms)
 *
 * @example
 * ```tsx
 * function Boardroom() {
 *   const snapshot = useSnapshotManager('acme-corp');
 *
 *   return (
 *     <div>
 *       <p>Last updated: {snapshot.secondsSinceUpdate}s ago</p>
 *       {snapshot.isStale && <div>STALE DATA</div>}
 *       <button onClick={snapshot.refreshFromStorage}>Refresh</button>
 *     </div>
 *   );
 * }
 * ```
 */
export function useSnapshotManager(
  companyId: string,
  staleTimeout = DEFAULT_STALE_TIMEOUT
): UseSnapshotManagerReturn {
  const storageKey = `snapshot:${companyId}`;
  const [snapshot, setSnapshot] = useState<Snapshot | null>(null);
  const [secondsSinceUpdate, setSecondsSinceUpdate] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load snapshot from storage on mount
  useEffect(() => {
    refreshFromStorage();
  }, [companyId]);

  // Update seconds counter
  useEffect(() => {
    const updateSecondsSince = () => {
      if (snapshot) {
        const seconds = Math.floor((Date.now() - snapshot.timestamp) / 1000);
        setSecondsSinceUpdate(seconds);
      }
    };

    // Update immediately
    updateSecondsSince();

    // Update every second
    timerRef.current = setInterval(updateSecondsSince, 1000);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [snapshot]);

  /**
   * Update snapshot with new data
   */
  const updateSnapshot = useCallback(
    (data: any) => {
      const newSnapshot: Snapshot = {
        timestamp: Date.now(),
        data,
      };

      setSnapshot(newSnapshot);

      // Persist to localStorage
      try {
        localStorage.setItem(storageKey, JSON.stringify(newSnapshot));
      } catch (error) {
        console.error('[useSnapshotManager] Failed to save snapshot:', error);
      }
    },
    [storageKey]
  );

  /**
   * Load snapshot from storage
   */
  const refreshFromStorage = useCallback(() => {
    try {
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored) as Snapshot;
        setSnapshot(parsed);
      }
    } catch (error) {
      console.error('[useSnapshotManager] Failed to load snapshot:', error);
    }
  }, [storageKey]);

  /**
   * Clear snapshot
   */
  const clearSnapshot = useCallback(() => {
    setSnapshot(null);
    try {
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('[useSnapshotManager] Failed to clear snapshot:', error);
    }
  }, [storageKey]);

  const isStale =
    snapshot !== null &&
    Date.now() - snapshot.timestamp > staleTimeout;

  return {
    data: snapshot?.data || null,
    timestamp: snapshot?.timestamp || 0,
    isStale,
    secondsSinceUpdate,
    updateSnapshot,
    clearSnapshot,
    refreshFromStorage,
  };
}

/**
 * Format relative time from timestamp
 *
 * @example
 * ```
 * formatRelativeTime(Date.now() - 30000) // "30 seconds ago"
 * formatRelativeTime(Date.now() - 300000) // "5 minutes ago"
 * ```
 */
export function formatRelativeTime(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);

  if (seconds < 60) {
    return seconds <= 1 ? 'just now' : `${seconds}s ago`;
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return minutes === 1 ? '1 minute ago' : `${minutes} minutes ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return hours === 1 ? '1 hour ago' : `${hours} hours ago`;
  }

  const days = Math.floor(hours / 24);
  return days === 1 ? '1 day ago' : `${days} days ago`;
}
