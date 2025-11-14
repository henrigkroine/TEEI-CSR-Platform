/**
 * Service Worker Registration - Worker 3 Phase D
 *
 * Extracted from inline script in BaseLayout.astro
 * Registers service worker for PWA functionality
 */

/**
 * Register service worker with periodic update checks
 */
export async function registerServiceWorker(): Promise<void> {
  // Check if service workers are supported
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service Workers not supported in this browser');
    return;
  }

  try {
    // Wait for page load
    await new Promise<void>((resolve) => {
      if (document.readyState === 'loading') {
        window.addEventListener('load', () => resolve());
      } else {
        resolve();
      }
    });

    // Register service worker
    const registration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/',
    });

    console.log('[PWA] Service Worker registered:', registration.scope);

    // Check for updates periodically
    const updateInterval = setInterval(() => {
      registration.update().catch((error) => {
        console.warn('[PWA] Service Worker update check failed:', error);
      });
    }, 60000); // Every 60 seconds

    // Clean up interval on page unload
    window.addEventListener('beforeunload', () => {
      clearInterval(updateInterval);
    });

    // Listen for updates
    registration.addEventListener('updatefound', () => {
      const newWorker = registration.installing;
      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker available
            console.log('[PWA] New service worker available. Please refresh to update.');

            // Optionally show update notification to user
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Update Available', {
                body: 'A new version of the app is available. Please refresh the page.',
                icon: '/icons/icon-192x192.png',
              });
            }
          }
        });
      }
    });
  } catch (error) {
    console.error('[PWA] Service Worker registration failed:', error);
  }
}

// Auto-register on module load
if (typeof window !== 'undefined') {
  registerServiceWorker().catch((error) => {
    console.error('[PWA] Service Worker initialization failed:', error);
  });
}

export default registerServiceWorker;
