/**
 * Service Worker for TEEI Corporate Cockpit PWA
 *
 * Features:
 * - Offline-first caching strategy
 * - Runtime caching for API calls
 * - Precaching for static assets
 * - Network-first with offline fallback
 * - IndexedDB integration for SSE event storage
 */

const CACHE_VERSION = 'v1';
const STATIC_CACHE = `teei-cockpit-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `teei-cockpit-runtime-${CACHE_VERSION}`;
const API_CACHE = `teei-cockpit-api-${CACHE_VERSION}`;

// Assets to precache during install
const PRECACHE_ASSETS = [
  '/',
  '/favicon.svg',
  '/offline.html'
];

// API endpoints patterns
const API_PATTERNS = [
  /\/api\/companies\/[\w-]+\/dashboard/,
  /\/api\/companies\/[\w-]+\/reports/,
  /\/api\/companies\/[\w-]+\/evidence/,
  /\/api\/companies\/[\w-]+\/metrics/
];

// Install event - precache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] Install event');

  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Precaching static assets');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Force the waiting service worker to become active
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Precache failed:', error);
      })
  );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] Activate event');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Remove old versions of our caches
              return cacheName.startsWith('teei-cockpit-') &&
                     cacheName !== STATIC_CACHE &&
                     cacheName !== RUNTIME_CACHE &&
                     cacheName !== API_CACHE;
            })
            .map((cacheName) => {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        // Take control of all pages immediately
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and browser-specific URLs
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }

  // Strategy 1: API calls - Network first, fall back to cache, then offline
  if (isApiRequest(url)) {
    event.respondWith(networkFirstStrategy(request, API_CACHE));
    return;
  }

  // Strategy 2: Static assets - Cache first, fall back to network
  if (isStaticAsset(url)) {
    event.respondWith(cacheFirstStrategy(request, STATIC_CACHE));
    return;
  }

  // Strategy 3: HTML pages - Stale-while-revalidate
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(staleWhileRevalidateStrategy(request, RUNTIME_CACHE));
    return;
  }

  // Default: Network first
  event.respondWith(networkFirstStrategy(request, RUNTIME_CACHE));
});

// Message event - handle commands from clients
self.addEventListener('message', (event) => {
  console.log('[SW] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => caches.delete(cacheName))
        );
      }).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }

  if (event.data && event.data.type === 'CACHE_DASHBOARD') {
    const { companyId, data } = event.data;
    event.waitUntil(
      cacheDashboardData(companyId, data).then(() => {
        event.ports[0].postMessage({ success: true });
      })
    );
  }
});

// Sync event - for background sync when online
self.addEventListener('sync', (event) => {
  console.log('[SW] Sync event:', event.tag);

  if (event.tag === 'sync-events') {
    event.waitUntil(syncPendingEvents());
  }
});

/**
 * Helper Functions
 */

function isApiRequest(url) {
  return API_PATTERNS.some((pattern) => pattern.test(url.pathname));
}

function isStaticAsset(url) {
  const staticExtensions = ['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.woff', '.woff2'];
  return staticExtensions.some((ext) => url.pathname.endsWith(ext));
}

/**
 * Caching Strategies
 */

// Network first, fall back to cache
async function networkFirstStrategy(request, cacheName) {
  try {
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('[SW] Network request failed, trying cache:', request.url);

    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      // Add custom header to indicate offline mode
      const headers = new Headers(cachedResponse.headers);
      headers.set('X-Offline-Cache', 'true');

      return new Response(cachedResponse.body, {
        status: cachedResponse.status,
        statusText: cachedResponse.statusText,
        headers: headers
      });
    }

    // If no cache, return offline page for HTML requests
    if (request.headers.get('accept')?.includes('text/html')) {
      return caches.match('/offline.html');
    }

    // Return error response for other requests
    return new Response(
      JSON.stringify({
        error: 'offline',
        message: 'No network connection and no cached data available'
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

// Cache first, fall back to network
async function cacheFirstStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    if (networkResponse && networkResponse.status === 200) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.error('[SW] Cache and network both failed:', error);
    return new Response('Network error', { status: 503 });
  }
}

// Stale-while-revalidate: Serve from cache, update in background
async function staleWhileRevalidateStrategy(request, cacheName) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetch(request).then((networkResponse) => {
    if (networkResponse && networkResponse.status === 200) {
      const cache = caches.open(cacheName);
      cache.then((c) => c.put(request, networkResponse.clone()));
    }
    return networkResponse;
  }).catch((error) => {
    console.log('[SW] Background fetch failed:', error);
    return null;
  });

  // Return cached response immediately if available, otherwise wait for network
  return cachedResponse || fetchPromise;
}

/**
 * IndexedDB integration for dashboard data
 */
async function cacheDashboardData(companyId, data) {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction('dashboards', 'readwrite');
    const store = tx.objectStore('dashboards');

    await store.put({
      id: companyId,
      data: data,
      timestamp: Date.now()
    });

    console.log('[SW] Cached dashboard data for company:', companyId);
  } catch (error) {
    console.error('[SW] Failed to cache dashboard data:', error);
  }
}

function openIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('teei-cockpit', 1);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;

      // Create object stores if they don't exist
      if (!db.objectStoreNames.contains('dashboards')) {
        db.createObjectStore('dashboards', { keyPath: 'id' });
      }

      if (!db.objectStoreNames.contains('events')) {
        const eventsStore = db.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
        eventsStore.createIndex('timestamp', 'timestamp', { unique: false });
        eventsStore.createIndex('companyId', 'companyId', { unique: false });
      }
    };
  });
}

/**
 * Background sync for pending events
 */
async function syncPendingEvents() {
  try {
    const db = await openIndexedDB();
    const tx = db.transaction('events', 'readonly');
    const store = tx.objectStore('events');
    const events = await store.getAll();

    if (events.length === 0) {
      console.log('[SW] No pending events to sync');
      return;
    }

    console.log(`[SW] Syncing ${events.length} pending events`);

    // Send events to all clients
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach((client) => {
      client.postMessage({
        type: 'REPLAY_EVENTS',
        events: events
      });
    });

    // Clear synced events
    const clearTx = db.transaction('events', 'readwrite');
    const clearStore = clearTx.objectStore('events');
    await clearStore.clear();

    console.log('[SW] Events synced and cleared');
  } catch (error) {
    console.error('[SW] Failed to sync events:', error);
  }
}

console.log('[SW] Service Worker loaded');
