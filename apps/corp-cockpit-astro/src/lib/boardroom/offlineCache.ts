/**
 * Offline Cache Management for Boardroom Mode
 *
 * Provides IndexedDB-based persistent storage for dashboard data,
 * enabling offline access to last approved reports and KPIs.
 *
 * Features:
 * - Store/retrieve last successful dataset
 * - Cache management (size, age, cleanup)
 * - Multi-tenant support (per company)
 * - Automatic expiration handling
 *
 * @module offlineCache
 */

const DB_NAME = 'teei-cockpit';
const DB_VERSION = 1;
const STORE_NAME = 'dashboards';
const EVENTS_STORE = 'events';
const MAX_CACHE_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export interface DashboardData {
  companyId: string;
  data: unknown;
  timestamp: number;
  version?: string;
  reportId?: string;
}

export interface CacheStatus {
  companyId: string;
  sizeBytes: number;
  lastUpdated: number;
  dataAge: number;
  isExpired: boolean;
  recordCount: number;
}

/**
 * Open IndexedDB connection
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      console.error('[OfflineCache] Failed to open DB:', request.error);
      reject(request.error);
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create dashboards store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const dashboardStore = db.createObjectStore(STORE_NAME, { keyPath: 'companyId' });
        dashboardStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      // Create events store if it doesn't exist
      if (!db.objectStoreNames.contains(EVENTS_STORE)) {
        const eventsStore = db.createObjectStore(EVENTS_STORE, {
          keyPath: 'id',
          autoIncrement: true,
        });
        eventsStore.createIndex('companyId', 'companyId', { unique: false });
        eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
      }

      console.log('[OfflineCache] Database upgraded to version', DB_VERSION);
    };

    request.onblocked = () => {
      console.warn('[OfflineCache] Database upgrade blocked by another connection');
    };
  });
}

/**
 * Save last approved dataset for a company
 *
 * @param companyId - Company identifier
 * @param data - Dashboard data to cache
 * @param reportId - Optional report ID for tracking
 */
export async function saveLastDataset(
  companyId: string,
  data: unknown,
  reportId?: string
): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    const record: DashboardData = {
      companyId,
      data,
      timestamp: Date.now(),
      version: '1.0',
      reportId,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.put(record);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log(`[OfflineCache] Saved dataset for company ${companyId}`, {
      reportId,
      timestamp: new Date(record.timestamp).toISOString(),
    });

    db.close();
  } catch (error) {
    console.error('[OfflineCache] Failed to save dataset:', error);
    throw error;
  }
}

/**
 * Retrieve last cached dataset for a company
 *
 * @param companyId - Company identifier
 * @returns Cached dashboard data or null if not found/expired
 */
export async function getLastDataset(companyId: string): Promise<DashboardData | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const record = await new Promise<DashboardData | undefined>((resolve, reject) => {
      const request = store.get(companyId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();

    if (!record) {
      console.log(`[OfflineCache] No cached data for company ${companyId}`);
      return null;
    }

    // Check if data is expired
    const age = Date.now() - record.timestamp;
    if (age > MAX_CACHE_AGE_MS) {
      console.warn(
        `[OfflineCache] Cached data expired for company ${companyId}`,
        `(${Math.floor(age / (24 * 60 * 60 * 1000))} days old)`
      );
      // Still return expired data, but log warning
      // Client can decide whether to use it based on isExpired flag in getCacheStatus
    }

    console.log(`[OfflineCache] Retrieved dataset for company ${companyId}`, {
      timestamp: new Date(record.timestamp).toISOString(),
      ageDays: Math.floor(age / (24 * 60 * 60 * 1000)),
    });

    return record;
  } catch (error) {
    console.error('[OfflineCache] Failed to retrieve dataset:', error);
    return null;
  }
}

/**
 * Clear all cached data for a company (or all companies)
 *
 * @param companyId - Optional company ID to clear specific company data
 */
export async function clearCache(companyId?: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    if (companyId) {
      // Clear specific company data
      await new Promise<void>((resolve, reject) => {
        const request = store.delete(companyId);
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      console.log(`[OfflineCache] Cleared cache for company ${companyId}`);
    } else {
      // Clear all data
      await new Promise<void>((resolve, reject) => {
        const request = store.clear();
        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
      });
      console.log('[OfflineCache] Cleared all cached data');
    }

    db.close();
  } catch (error) {
    console.error('[OfflineCache] Failed to clear cache:', error);
    throw error;
  }
}

/**
 * Get cache status and metadata for a company
 *
 * @param companyId - Company identifier
 * @returns Cache status or null if no data exists
 */
export async function getCacheStatus(companyId: string): Promise<CacheStatus | null> {
  try {
    const record = await getLastDataset(companyId);

    if (!record) {
      return null;
    }

    const dataAge = Date.now() - record.timestamp;
    const isExpired = dataAge > MAX_CACHE_AGE_MS;

    // Estimate size (rough calculation)
    const dataString = JSON.stringify(record.data);
    const sizeBytes = new Blob([dataString]).size;

    return {
      companyId,
      sizeBytes,
      lastUpdated: record.timestamp,
      dataAge,
      isExpired,
      recordCount: 1,
    };
  } catch (error) {
    console.error('[OfflineCache] Failed to get cache status:', error);
    return null;
  }
}

/**
 * Get all cached companies
 *
 * @returns Array of company IDs with cached data
 */
export async function getAllCachedCompanies(): Promise<string[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    const keys = await new Promise<IDBValidKey[]>((resolve, reject) => {
      const request = store.getAllKeys();
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    db.close();

    return keys as string[];
  } catch (error) {
    console.error('[OfflineCache] Failed to get cached companies:', error);
    return [];
  }
}

/**
 * Clean up expired cache entries
 *
 * @returns Number of entries removed
 */
export async function cleanupExpiredCache(): Promise<number> {
  try {
    const companies = await getAllCachedCompanies();
    let removedCount = 0;

    for (const companyId of companies) {
      const status = await getCacheStatus(companyId);
      if (status && status.isExpired) {
        await clearCache(companyId);
        removedCount++;
      }
    }

    console.log(`[OfflineCache] Cleaned up ${removedCount} expired entries`);
    return removedCount;
  } catch (error) {
    console.error('[OfflineCache] Failed to cleanup expired cache:', error);
    return 0;
  }
}

/**
 * Check if IndexedDB is available in the current browser
 */
export function isIndexedDBAvailable(): boolean {
  try {
    return typeof indexedDB !== 'undefined';
  } catch {
    return false;
  }
}

/**
 * Format cache age for display
 *
 * @param ageMs - Age in milliseconds
 * @returns Formatted string (e.g., "2 hours ago", "3 days ago")
 */
export function formatCacheAge(ageMs: number): string {
  const seconds = Math.floor(ageMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'just now';
  }
}

/**
 * Format file size for display
 *
 * @param bytes - Size in bytes
 * @returns Formatted string (e.g., "1.5 KB", "2.3 MB")
 */
export function formatCacheSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  } else if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  } else {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
}
