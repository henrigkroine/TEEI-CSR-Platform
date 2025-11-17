/**
 * Offline Board Pack Storage
 *
 * Features:
 * - IndexedDB storage for board packs
 * - LRU eviction policy
 * - Integrity validation
 * - Size limit enforcement
 * - Pack lifecycle management
 */

import type { BoardPack, BoardPackAsset, OfflinePackMetrics } from './types';

const DB_NAME = 'teei-board-packs';
const DB_VERSION = 1;
const PACK_STORE = 'packs';
const ASSET_STORE = 'assets';

// Maximum cache size: 150 MB
const MAX_CACHE_SIZE = 150 * 1024 * 1024;

// Maximum number of packs
const MAX_PACKS = 10;

/**
 * IndexedDB Database Manager for Board Packs
 */
class BoardPackDB {
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

        // Board packs store
        if (!db.objectStoreNames.contains(PACK_STORE)) {
          const packStore = db.createObjectStore(PACK_STORE, { keyPath: 'id' });
          packStore.createIndex('companyId', 'companyId', { unique: false });
          packStore.createIndex('reportId', 'reportId', { unique: false });
          packStore.createIndex('lastAccessedAt', 'lastAccessedAt', { unique: false });
          packStore.createIndex('expiresAt', 'expiresAt', { unique: false });
        }

        // Assets store (for blobs)
        if (!db.objectStoreNames.contains(ASSET_STORE)) {
          const assetStore = db.createObjectStore(ASSET_STORE, { keyPath: 'url' });
          assetStore.createIndex('packId', 'packId', { unique: false });
        }

        console.log('[BoardPackDB] Database initialized');
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

const packDB = new BoardPackDB();

/**
 * Board Pack Management
 */

export async function saveBoardPack(pack: BoardPack): Promise<void> {
  try {
    const db = await packDB.open();
    const tx = db.transaction(PACK_STORE, 'readwrite');
    const store = tx.objectStore(PACK_STORE);

    // Check cache size before adding
    await enforceStorageLimit(pack.totalSize);

    await new Promise<void>((resolve, reject) => {
      const request = store.put(pack);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('[BoardPackStorage] Pack saved:', pack.id);
  } catch (error) {
    console.error('[BoardPackStorage] Failed to save pack:', error);
    throw error;
  }
}

export async function getBoardPack(packId: string): Promise<BoardPack | null> {
  try {
    const db = await packDB.open();
    const tx = db.transaction(PACK_STORE, 'readwrite');
    const store = tx.objectStore(PACK_STORE);

    const pack = await new Promise<BoardPack | undefined>((resolve, reject) => {
      const request = store.get(packId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!pack) {
      return null;
    }

    // Update last accessed time
    pack.lastAccessedAt = Date.now();
    await new Promise<void>((resolve, reject) => {
      const updateRequest = store.put(pack);
      updateRequest.onsuccess = () => resolve();
      updateRequest.onerror = () => reject(updateRequest.error);
    });

    return pack;
  } catch (error) {
    console.error('[BoardPackStorage] Failed to get pack:', error);
    return null;
  }
}

export async function deleteBoardPack(packId: string): Promise<void> {
  try {
    const db = await packDB.open();

    // Delete pack
    const packTx = db.transaction(PACK_STORE, 'readwrite');
    const packStore = packTx.objectStore(PACK_STORE);
    await new Promise<void>((resolve, reject) => {
      const request = packStore.delete(packId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Delete associated assets
    const assetTx = db.transaction(ASSET_STORE, 'readwrite');
    const assetStore = assetTx.objectStore(ASSET_STORE);
    const index = assetStore.index('packId');

    const assets = await new Promise<any[]>((resolve, reject) => {
      const request = index.getAll(packId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    for (const asset of assets) {
      await new Promise<void>((resolve, reject) => {
        const deleteRequest = assetStore.delete(asset.url);
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });
    }

    console.log('[BoardPackStorage] Pack deleted:', packId);
  } catch (error) {
    console.error('[BoardPackStorage] Failed to delete pack:', error);
    throw error;
  }
}

export async function getAllBoardPacks(): Promise<BoardPack[]> {
  try {
    const db = await packDB.open();
    const tx = db.transaction(PACK_STORE, 'readonly');
    const store = tx.objectStore(PACK_STORE);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[BoardPackStorage] Failed to get all packs:', error);
    return [];
  }
}

export async function getBoardPacksByCompany(companyId: string): Promise<BoardPack[]> {
  try {
    const db = await packDB.open();
    const tx = db.transaction(PACK_STORE, 'readonly');
    const store = tx.objectStore(PACK_STORE);
    const index = store.index('companyId');

    return new Promise((resolve, reject) => {
      const request = index.getAll(companyId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[BoardPackStorage] Failed to get packs by company:', error);
    return [];
  }
}

/**
 * Asset Management
 */

export async function saveAsset(packId: string, asset: BoardPackAsset, blob: Blob): Promise<void> {
  try {
    const db = await packDB.open();
    const tx = db.transaction(ASSET_STORE, 'readwrite');
    const store = tx.objectStore(ASSET_STORE);

    await new Promise<void>((resolve, reject) => {
      const request = store.put({
        url: asset.url,
        packId,
        blob,
        hash: asset.hash,
        type: asset.type,
        size: asset.size,
      });
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('[BoardPackStorage] Asset saved:', asset.url);
  } catch (error) {
    console.error('[BoardPackStorage] Failed to save asset:', error);
    throw error;
  }
}

export async function getAsset(url: string): Promise<Blob | null> {
  try {
    const db = await packDB.open();
    const tx = db.transaction(ASSET_STORE, 'readonly');
    const store = tx.objectStore(ASSET_STORE);

    const asset = await new Promise<any>((resolve, reject) => {
      const request = store.get(url);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    return asset ? asset.blob : null;
  } catch (error) {
    console.error('[BoardPackStorage] Failed to get asset:', error);
    return null;
  }
}

/**
 * Cache Management
 */

export async function enforceStorageLimit(newPackSize: number = 0): Promise<void> {
  const metrics = await getOfflinePackMetrics();

  if (metrics.totalSize + newPackSize > MAX_CACHE_SIZE || metrics.totalPacks >= MAX_PACKS) {
    console.log('[BoardPackStorage] Storage limit reached, evicting LRU packs');
    await evictLRUPacks(newPackSize);
  }
}

async function evictLRUPacks(requiredSpace: number): Promise<void> {
  const packs = await getAllBoardPacks();

  // Sort by last accessed (LRU = Least Recently Used)
  packs.sort((a, b) => a.lastAccessedAt - b.lastAccessedAt);

  let freedSpace = 0;

  for (const pack of packs) {
    if (freedSpace >= requiredSpace) {
      break;
    }

    await deleteBoardPack(pack.id);
    freedSpace += pack.totalSize;
    console.log('[BoardPackStorage] Evicted pack:', pack.id, pack.title);
  }
}

export async function getOfflinePackMetrics(): Promise<OfflinePackMetrics> {
  try {
    const packs = await getAllBoardPacks();

    if (packs.length === 0) {
      return {
        totalPacks: 0,
        totalSize: 0,
        oldestPack: null,
        newestPack: null,
        mostAccessedPack: null,
      };
    }

    const totalSize = packs.reduce((sum, pack) => sum + pack.totalSize, 0);
    const oldestPack = Math.min(...packs.map((p) => p.createdAt));
    const newestPack = Math.max(...packs.map((p) => p.createdAt));
    const mostAccessedPack = packs.sort((a, b) => b.lastAccessedAt - a.lastAccessedAt)[0]?.id || null;

    return {
      totalPacks: packs.length,
      totalSize,
      oldestPack,
      newestPack,
      mostAccessedPack,
    };
  } catch (error) {
    console.error('[BoardPackStorage] Failed to get metrics:', error);
    return {
      totalPacks: 0,
      totalSize: 0,
      oldestPack: null,
      newestPack: null,
      mostAccessedPack: null,
    };
  }
}

export async function cleanupExpiredPacks(): Promise<void> {
  try {
    const packs = await getAllBoardPacks();
    const now = Date.now();

    for (const pack of packs) {
      if (now > pack.expiresAt) {
        console.log('[BoardPackStorage] Cleaning up expired pack:', pack.id);
        await deleteBoardPack(pack.id);
      }
    }
  } catch (error) {
    console.error('[BoardPackStorage] Failed to cleanup expired packs:', error);
  }
}

export async function clearAllPacks(): Promise<void> {
  try {
    const packs = await getAllBoardPacks();

    for (const pack of packs) {
      await deleteBoardPack(pack.id);
    }

    console.log('[BoardPackStorage] All packs cleared');
  } catch (error) {
    console.error('[BoardPackStorage] Failed to clear all packs:', error);
    throw error;
  }
}

/**
 * Integrity Validation
 */

export async function validateAssetIntegrity(url: string, expectedHash: string): Promise<boolean> {
  try {
    const blob = await getAsset(url);
    if (!blob) {
      return false;
    }

    // Compute hash of blob
    const arrayBuffer = await blob.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');

    const computedHash = `sha256-${btoa(String.fromCharCode(...Array.from(new Uint8Array(hashBuffer))))}`;

    return computedHash === expectedHash;
  } catch (error) {
    console.error('[BoardPackStorage] Failed to validate integrity:', error);
    return false;
  }
}
