/**
 * Service Worker for TEEI Corporate Cockpit PWA
 *
 * Features:
 * - Caching strategies: stale-while-revalidate, cache-first, network-first
 * - Offline board pack support
 * - Background sync for exports
 * - Push notification handling
 * - Cache versioning and cleanup
 */

/// <reference lib="webworker" />

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v1';
const CACHE_PREFIX = 'teei-cockpit';

// Cache names
const CACHE_NAMES = {
  shell: `${CACHE_PREFIX}-shell-${CACHE_VERSION}`,
  static: `${CACHE_PREFIX}-static-${CACHE_VERSION}`,
  api: `${CACHE_PREFIX}-api-${CACHE_VERSION}`,
  boardroom: `${CACHE_PREFIX}-boardroom-${CACHE_VERSION}`,
  images: `${CACHE_PREFIX}-images-${CACHE_VERSION}`,
  fonts: `${CACHE_PREFIX}-fonts-${CACHE_VERSION}`,
};

// All cache names array for cleanup
const ALL_CACHE_NAMES = Object.values(CACHE_NAMES);

// Static assets to cache on install
const SHELL_ASSETS = [
  '/',
  '/dashboard',
  '/boardroom',
  '/offline',
  '/manifest.json',
];

// Routes that should use network-first strategy
const NETWORK_FIRST_ROUTES = [
  /\/api\/dashboard\/metrics/,
  /\/api\/reports/,
  /\/api\/evidence/,
  /\/api\/analytics/,
];

// Routes that should use cache-first strategy
const CACHE_FIRST_ROUTES = [
  /\.(png|jpg|jpeg|svg|gif|webp|ico)$/,
  /\.(woff|woff2|ttf|eot)$/,
  /\/icons\//,
  /\/screenshots\//,
];

// Routes that should use stale-while-revalidate strategy
const STALE_WHILE_REVALIDATE_ROUTES = [
  /\.(js|css)$/,
  /\/assets\//,
];

// Boardroom routes to cache
const BOARDROOM_ROUTES = [
  /\/boardroom\//,
  /\/reports\/.*\/export/,
];

// Maximum cache size (in bytes)
const MAX_CACHE_SIZE = 150 * 1024 * 1024; // 150 MB
const MAX_CACHE_ITEMS = {
  images: 100,
  api: 50,
  boardroom: 10,
};

/**
 * Install Event
 * Cache shell assets and prepare service worker
 */
self.addEventListener('install', (event: ExtendableEvent) => {
  console.log('[SW] Installing service worker', CACHE_VERSION);

  event.waitUntil(
    (async () => {
      try {
        // Open shell cache
        const cache = await caches.open(CACHE_NAMES.shell);

        // Cache shell assets
        await cache.addAll(SHELL_ASSETS);

        console.log('[SW] Shell assets cached');

        // Skip waiting to activate immediately
        await self.skipWaiting();
      } catch (error) {
        console.error('[SW] Install failed:', error);
        throw error;
      }
    })()
  );
});

/**
 * Activate Event
 * Clean up old caches and claim clients
 */
self.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('[SW] Activating service worker', CACHE_VERSION);

  event.waitUntil(
    (async () => {
      try {
        // Delete old caches
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.map((cacheName) => {
            if (!ALL_CACHE_NAMES.includes(cacheName)) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );

        // Claim all clients
        await self.clients.claim();

        console.log('[SW] Service worker activated');
      } catch (error) {
        console.error('[SW] Activation failed:', error);
      }
    })()
  );
});

/**
 * Fetch Event
 * Intercept network requests and apply caching strategies
 */
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome extensions and other origins
  if (!url.origin.includes(self.location.origin)) {
    return;
  }

  // Apply caching strategy based on route
  if (matchesRoute(url, CACHE_FIRST_ROUTES)) {
    event.respondWith(cacheFirst(request, CACHE_NAMES.static));
  } else if (matchesRoute(url, NETWORK_FIRST_ROUTES)) {
    event.respondWith(networkFirst(request, CACHE_NAMES.api));
  } else if (matchesRoute(url, BOARDROOM_ROUTES)) {
    event.respondWith(networkFirst(request, CACHE_NAMES.boardroom));
  } else if (matchesRoute(url, STALE_WHILE_REVALIDATE_ROUTES)) {
    event.respondWith(staleWhileRevalidate(request, CACHE_NAMES.static));
  } else {
    // Default: network-first for navigation
    event.respondWith(networkFirst(request, CACHE_NAMES.shell));
  }
});

/**
 * Message Event
 * Handle messages from clients
 */
self.addEventListener('message', (event: ExtendableMessageEvent) => {
  const { type, data } = event.data || {};

  console.log('[SW] Message received:', type);

  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting();
      break;

    case 'CLEAR_CACHE':
      event.waitUntil(clearAllCaches());
      event.ports[0]?.postMessage({ success: true });
      break;

    case 'CACHE_DASHBOARD':
      event.waitUntil(
        cacheDashboard(data.companyId, data.data).then(() => {
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;

    case 'CACHE_BOARD_PACK':
      event.waitUntil(
        cacheBoardPack(data.packId, data.assets).then(() => {
          event.ports[0]?.postMessage({ success: true });
        })
      );
      break;

    case 'GET_CACHE_SIZE':
      event.waitUntil(
        getCacheSize().then((size) => {
          event.ports[0]?.postMessage({ size });
        })
      );
      break;

    default:
      console.warn('[SW] Unknown message type:', type);
  }
});

/**
 * Sync Event
 * Handle background sync for offline exports
 */
self.addEventListener('sync', (event: any) => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag.startsWith('export-')) {
    event.waitUntil(syncExport(event.tag));
  } else if (event.tag === 'sync-all') {
    event.waitUntil(syncAllPendingExports());
  }
});

/**
 * Push Event
 * Handle push notifications
 */
self.addEventListener('push', (event: PushEvent) => {
  console.log('[SW] Push received');

  let data = {
    title: 'TEEI Cockpit',
    body: 'You have a new notification',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'default',
    data: {},
  };

  if (event.data) {
    try {
      const payload = event.data.json();
      data = { ...data, ...payload };
    } catch (error) {
      console.error('[SW] Failed to parse push payload:', error);
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: data.icon,
      badge: data.badge,
      tag: data.tag,
      data: data.data,
      requireInteraction: false,
      actions: data.data.actions || [],
    })
  );
});

/**
 * Notification Click Event
 * Handle notification clicks and open relevant pages
 */
self.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('[SW] Notification click:', event.notification.tag);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      // Check if there's already a window open
      for (const client of clients) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }

      // Open a new window
      if (self.clients.openWindow) {
        return self.clients.openWindow(urlToOpen);
      }
    })
  );
});

/**
 * Caching Strategies
 */

/**
 * Cache First Strategy
 * Try cache first, fall back to network
 */
async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Cache-first fetch failed:', error);
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Network First Strategy
 * Try network first, fall back to cache
 */
async function networkFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', request.url);
    const cached = await cache.match(request);

    if (cached) {
      return cached;
    }

    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await cache.match('/offline');
      if (offlinePage) {
        return offlinePage;
      }
    }

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}

/**
 * Stale While Revalidate Strategy
 * Return cached response immediately, update cache in background
 */
async function staleWhileRevalidate(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch fresh version in background
  const fetchPromise = fetch(request).then(async (response) => {
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  });

  // Return cached version immediately or wait for network
  return cached || fetchPromise;
}

/**
 * Helper Functions
 */

function matchesRoute(url: URL, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(url.pathname + url.search));
}

async function clearAllCaches(): Promise<void> {
  const cacheNames = await caches.keys();
  await Promise.all(cacheNames.map((name) => caches.delete(name)));
  console.log('[SW] All caches cleared');
}

async function cacheDashboard(companyId: string, data: any): Promise<void> {
  const cache = await caches.open(CACHE_NAMES.api);
  const response = new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' },
  });
  await cache.put(`/api/dashboard/${companyId}`, response);
  console.log('[SW] Dashboard cached:', companyId);
}

async function cacheBoardPack(packId: string, assets: string[]): Promise<void> {
  const cache = await caches.open(CACHE_NAMES.boardroom);

  for (const asset of assets) {
    try {
      const response = await fetch(asset);
      if (response.ok) {
        await cache.put(asset, response);
      }
    } catch (error) {
      console.error('[SW] Failed to cache asset:', asset, error);
    }
  }

  console.log('[SW] Board pack cached:', packId, assets.length, 'assets');
}

async function getCacheSize(): Promise<number> {
  let totalSize = 0;

  const cacheNames = await caches.keys();

  for (const cacheName of cacheNames) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();

    for (const request of keys) {
      const response = await cache.match(request);
      if (response) {
        const blob = await response.blob();
        totalSize += blob.size;
      }
    }
  }

  return totalSize;
}

async function syncExport(tag: string): Promise<void> {
  const exportId = tag.replace('export-', '');
  console.log('[SW] Syncing export:', exportId);

  try {
    // Retrieve export job from IndexedDB
    const db = await openDB();
    const tx = db.transaction('exportQueue', 'readonly');
    const store = tx.objectStore('exportQueue');
    const exportJob = await new Promise<any>((resolve, reject) => {
      const request = store.get(exportId);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    if (!exportJob) {
      console.warn('[SW] Export job not found:', exportId);
      return;
    }

    // Trigger export
    const response = await fetch('/api/exports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(exportJob),
    });

    if (!response.ok) {
      throw new Error(`Export failed: ${response.statusText}`);
    }

    // Mark as synced
    const updateTx = db.transaction('exportQueue', 'readwrite');
    const updateStore = updateTx.objectStore('exportQueue');
    await new Promise<void>((resolve, reject) => {
      const request = updateStore.delete(exportId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    // Show success notification
    await self.registration.showNotification('Export Complete', {
      body: 'Your export is ready to download',
      icon: '/icons/icon-192x192.png',
      tag: `export-${exportId}`,
      data: { url: `/exports/${exportId}` },
    });

    console.log('[SW] Export synced successfully:', exportId);
  } catch (error) {
    console.error('[SW] Export sync failed:', error);
    throw error; // Will trigger retry
  }
}

async function syncAllPendingExports(): Promise<void> {
  console.log('[SW] Syncing all pending exports');

  const db = await openDB();
  const tx = db.transaction('exportQueue', 'readonly');
  const store = tx.objectStore('exportQueue');
  const allExports = await new Promise<any[]>((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });

  for (const exportJob of allExports) {
    try {
      await syncExport(`export-${exportJob.id}`);
    } catch (error) {
      console.error('[SW] Failed to sync export:', exportJob.id, error);
    }
  }
}

async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('teei-cockpit', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains('exportQueue')) {
        db.createObjectStore('exportQueue', { keyPath: 'id' });
      }
    };
  });
}

// Type definitions
interface ExtendableEvent extends Event {
  waitUntil(f: Promise<any>): void;
}

interface ExtendableMessageEvent extends ExtendableEvent {
  data: any;
  ports: MessagePort[];
}

interface FetchEvent extends ExtendableEvent {
  request: Request;
  respondWith(response: Promise<Response> | Response): void;
}

interface PushEvent extends ExtendableEvent {
  data: PushMessageData | null;
}

interface NotificationEvent extends ExtendableEvent {
  notification: Notification;
  action: string;
}

console.log('[SW] Service worker script loaded', CACHE_VERSION);
