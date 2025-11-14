/**
 * Offline Storage Utility using IndexedDB
 *
 * Features:
 * - Store dashboard data for offline access
 * - Queue SSE events for replay
 * - Conflict resolution on reconnect
 * - Cache expiration management
 */

import type { SSEEvent } from './sseClient';

const DB_NAME = 'teei-cockpit';
const DB_VERSION = 1;

export interface DashboardCache {
  id: string;
  companyId: string;
  data: any;
  timestamp: number;
  expiresAt: number;
}

export interface PendingEvent extends SSEEvent {
  storedAt: number;
  synced: boolean;
}

export interface OfflineMetrics {
  lastSync: number | null;
  pendingEvents: number;
  cachedDashboards: number;
  storageSize: number;
}

/**
 * IndexedDB Database Manager
 */
class OfflineStorageDB {
  private db: IDBDatabase | null = null;

  async open(): Promise<IDBDatabase> {
    if (this.db) {
      return this.db;
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve(this.db);
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Dashboards store
        if (!db.objectStoreNames.contains('dashboards')) {
          const dashboardsStore = db.createObjectStore('dashboards', {
            keyPath: 'id',
          });
          dashboardsStore.createIndex('companyId', 'companyId', {
            unique: false,
          });
          dashboardsStore.createIndex('timestamp', 'timestamp', {
            unique: false,
          });
        }

        // Events store
        if (!db.objectStoreNames.contains('events')) {
          const eventsStore = db.createObjectStore('events', {
            keyPath: 'id',
            autoIncrement: true,
          });
          eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
          eventsStore.createIndex('companyId', 'companyId', { unique: false });
          eventsStore.createIndex('synced', 'synced', { unique: false });
        }

        // Metadata store
        if (!db.objectStoreNames.contains('metadata')) {
          db.createObjectStore('metadata', { keyPath: 'key' });
        }

        console.log('[OfflineDB] Database initialized');
      };
    });
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

const offlineDB = new OfflineStorageDB();

/**
 * Dashboard Cache Management
 */

export async function cacheDashboard(
  companyId: string,
  data: any,
  ttl: number = 3600000 // 1 hour default TTL
): Promise<void> {
  try {
    const db = await offlineDB.open();
    const tx = db.transaction('dashboards', 'readwrite');
    const store = tx.objectStore('dashboards');

    const cache: DashboardCache = {
      id: `dashboard-${companyId}`,
      companyId,
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + ttl,
    };

    await store.put(cache);
    console.log('[OfflineStorage] Dashboard cached:', companyId);
  } catch (error) {
    console.error('[OfflineStorage] Failed to cache dashboard:', error);
    throw error;
  }
}

export async function getCachedDashboard(
  companyId: string
): Promise<DashboardCache | null> {
  try {
    const db = await offlineDB.open();
    const tx = db.transaction('dashboards', 'readonly');
    const store = tx.objectStore('dashboards');

    const cache = await new Promise<DashboardCache | undefined>(
      (resolve, reject) => {
        const request = store.get(`dashboard-${companyId}`);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      }
    );

    if (!cache) {
      return null;
    }

    // Check if cache is expired
    if (Date.now() > cache.expiresAt) {
      console.log('[OfflineStorage] Dashboard cache expired:', companyId);
      await deleteCachedDashboard(companyId);
      return null;
    }

    return cache;
  } catch (error) {
    console.error('[OfflineStorage] Failed to get cached dashboard:', error);
    return null;
  }
}

export async function deleteCachedDashboard(companyId: string): Promise<void> {
  try {
    const db = await offlineDB.open();
    const tx = db.transaction('dashboards', 'readwrite');
    const store = tx.objectStore('dashboards');

    await store.delete(`dashboard-${companyId}`);
    console.log('[OfflineStorage] Dashboard cache deleted:', companyId);
  } catch (error) {
    console.error('[OfflineStorage] Failed to delete cached dashboard:', error);
  }
}

export async function getAllCachedDashboards(): Promise<DashboardCache[]> {
  try {
    const db = await offlineDB.open();
    const tx = db.transaction('dashboards', 'readonly');
    const store = tx.objectStore('dashboards');

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[OfflineStorage] Failed to get all cached dashboards:', error);
    return [];
  }
}

/**
 * Event Queue Management
 */

export async function queueEvent(event: SSEEvent): Promise<void> {
  try {
    const db = await offlineDB.open();
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');

    const pendingEvent: PendingEvent = {
      ...event,
      storedAt: Date.now(),
      synced: false,
    };

    await new Promise<void>((resolve, reject) => {
      const request = store.add(pendingEvent);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('[OfflineStorage] Event queued:', event.id);
  } catch (error) {
    console.error('[OfflineStorage] Failed to queue event:', error);
    throw error;
  }
}

export async function getPendingEvents(
  companyId?: string
): Promise<PendingEvent[]> {
  try {
    const db = await offlineDB.open();
    const tx = db.transaction('events', 'readonly');
    const store = tx.objectStore('events');

    let events: PendingEvent[];

    if (companyId) {
      const index = store.index('companyId');
      events = await new Promise((resolve, reject) => {
        const request = index.getAll(companyId);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    } else {
      events = await new Promise((resolve, reject) => {
        const request = store.getAll();
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      });
    }

    // Filter unsynced events
    return events.filter((event) => !event.synced);
  } catch (error) {
    console.error('[OfflineStorage] Failed to get pending events:', error);
    return [];
  }
}

export async function markEventsSynced(eventIds: string[]): Promise<void> {
  try {
    const db = await offlineDB.open();
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');

    const promises = eventIds.map(
      (id) =>
        new Promise<void>((resolve, reject) => {
          const getRequest = store.get(id);
          getRequest.onsuccess = () => {
            const event = getRequest.result;
            if (event) {
              event.synced = true;
              const putRequest = store.put(event);
              putRequest.onsuccess = () => resolve();
              putRequest.onerror = () => reject(putRequest.error);
            } else {
              resolve();
            }
          };
          getRequest.onerror = () => reject(getRequest.error);
        })
    );

    await Promise.all(promises);
    console.log('[OfflineStorage] Events marked as synced:', eventIds.length);
  } catch (error) {
    console.error('[OfflineStorage] Failed to mark events as synced:', error);
  }
}

export async function clearSyncedEvents(): Promise<void> {
  try {
    const db = await offlineDB.open();
    const tx = db.transaction('events', 'readwrite');
    const store = tx.objectStore('events');
    const index = store.index('synced');

    const syncedEvents = await new Promise<PendingEvent[]>(
      (resolve, reject) => {
        const request = index.getAll(true);
        request.onsuccess = () => resolve(request.result || []);
        request.onerror = () => reject(request.error);
      }
    );

    const deletePromises = syncedEvents.map(
      (event) =>
        new Promise<void>((resolve, reject) => {
          const request = store.delete(event.id);
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        })
    );

    await Promise.all(deletePromises);
    console.log('[OfflineStorage] Synced events cleared:', syncedEvents.length);
  } catch (error) {
    console.error('[OfflineStorage] Failed to clear synced events:', error);
  }
}

/**
 * Metadata Management
 */

export async function setMetadata(key: string, value: any): Promise<void> {
  try {
    const db = await offlineDB.open();
    const tx = db.transaction('metadata', 'readwrite');
    const store = tx.objectStore('metadata');

    await new Promise<void>((resolve, reject) => {
      const request = store.put({ key, value, timestamp: Date.now() });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[OfflineStorage] Failed to set metadata:', error);
  }
}

export async function getMetadata(key: string): Promise<any | null> {
  try {
    const db = await offlineDB.open();
    const tx = db.transaction('metadata', 'readonly');
    const store = tx.objectStore('metadata');

    const result = await new Promise<any>((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return result ? result.value : null;
  } catch (error) {
    console.error('[OfflineStorage] Failed to get metadata:', error);
    return null;
  }
}

/**
 * Statistics and Maintenance
 */

export async function getOfflineMetrics(): Promise<OfflineMetrics> {
  try {
    const [lastSync, pendingEvents, cachedDashboards] = await Promise.all([
      getMetadata('lastSync'),
      getPendingEvents(),
      getAllCachedDashboards(),
    ]);

    // Estimate storage size (rough approximation)
    const storageSize = await estimateStorageSize();

    return {
      lastSync: lastSync || null,
      pendingEvents: pendingEvents.length,
      cachedDashboards: cachedDashboards.length,
      storageSize,
    };
  } catch (error) {
    console.error('[OfflineStorage] Failed to get offline metrics:', error);
    return {
      lastSync: null,
      pendingEvents: 0,
      cachedDashboards: 0,
      storageSize: 0,
    };
  }
}

async function estimateStorageSize(): Promise<number> {
  if ('estimate' in navigator.storage) {
    const estimate = await navigator.storage.estimate();
    return estimate.usage || 0;
  }
  return 0;
}

export async function clearAllOfflineData(): Promise<void> {
  try {
    const db = await offlineDB.open();

    const stores = ['dashboards', 'events', 'metadata'];
    const promises = stores.map(
      (storeName) =>
        new Promise<void>((resolve, reject) => {
          const tx = db.transaction(storeName, 'readwrite');
          const store = tx.objectStore(storeName);
          const request = store.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        })
    );

    await Promise.all(promises);
    console.log('[OfflineStorage] All offline data cleared');
  } catch (error) {
    console.error('[OfflineStorage] Failed to clear offline data:', error);
    throw error;
  }
}

export async function cleanupExpiredData(): Promise<void> {
  try {
    const db = await offlineDB.open();

    // Clean up expired dashboards
    const dashboards = await getAllCachedDashboards();
    const expiredDashboards = dashboards.filter(
      (cache) => Date.now() > cache.expiresAt
    );

    if (expiredDashboards.length > 0) {
      const tx = db.transaction('dashboards', 'readwrite');
      const store = tx.objectStore('dashboards');

      await Promise.all(
        expiredDashboards.map(
          (cache) =>
            new Promise<void>((resolve, reject) => {
              const request = store.delete(cache.id);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            })
        )
      );

      console.log(
        '[OfflineStorage] Cleaned up expired dashboards:',
        expiredDashboards.length
      );
    }

    // Clean up old synced events (older than 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const eventsTx = db.transaction('events', 'readwrite');
    const eventsStore = eventsTx.objectStore('events');
    const allEvents = await new Promise<PendingEvent[]>((resolve, reject) => {
      const request = eventsStore.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const oldSyncedEvents = allEvents.filter(
      (event) => event.synced && event.storedAt < sevenDaysAgo
    );

    if (oldSyncedEvents.length > 0) {
      await Promise.all(
        oldSyncedEvents.map(
          (event) =>
            new Promise<void>((resolve, reject) => {
              const request = eventsStore.delete(event.id);
              request.onsuccess = () => resolve();
              request.onerror = () => reject(request.error);
            })
        )
      );

      console.log(
        '[OfflineStorage] Cleaned up old synced events:',
        oldSyncedEvents.length
      );
    }
  } catch (error) {
    console.error('[OfflineStorage] Failed to cleanup expired data:', error);
  }
}

/**
 * Conflict Resolution
 */

export interface ConflictResolutionStrategy {
  strategy: 'server-wins' | 'client-wins' | 'merge' | 'manual';
  resolve: (serverData: any, clientData: any) => any;
}

export async function resolveConflicts(
  companyId: string,
  serverData: any,
  strategy: ConflictResolutionStrategy
): Promise<any> {
  try {
    const cachedDashboard = await getCachedDashboard(companyId);

    if (!cachedDashboard) {
      // No conflict, use server data
      return serverData;
    }

    const clientData = cachedDashboard.data;

    switch (strategy.strategy) {
      case 'server-wins':
        console.log('[OfflineStorage] Conflict resolution: server-wins');
        return serverData;

      case 'client-wins':
        console.log('[OfflineStorage] Conflict resolution: client-wins');
        return clientData;

      case 'merge':
        console.log('[OfflineStorage] Conflict resolution: merge');
        return strategy.resolve(serverData, clientData);

      case 'manual':
        console.log('[OfflineStorage] Conflict resolution: manual');
        return strategy.resolve(serverData, clientData);

      default:
        return serverData;
    }
  } catch (error) {
    console.error('[OfflineStorage] Conflict resolution failed:', error);
    return serverData;
  }
}
