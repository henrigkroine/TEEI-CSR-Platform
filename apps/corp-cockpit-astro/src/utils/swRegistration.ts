/**
 * Service Worker Registration and Management
 *
 * Features:
 * - Register service worker with lifecycle management
 * - Handle updates and prompt user
 * - Integration with offline storage
 * - Update detection and installation
 */

export interface SWRegistrationOptions {
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onError?: (error: Error) => void;
  onWaiting?: (registration: ServiceWorkerRegistration) => void;
  checkUpdateInterval?: number;
}

export interface SWUpdateStatus {
  hasUpdate: boolean;
  registration: ServiceWorkerRegistration | null;
  installing: ServiceWorker | null;
  waiting: ServiceWorker | null;
  active: ServiceWorker | null;
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null;
  private options: SWRegistrationOptions;
  private updateCheckInterval: number | null = null;

  constructor(options: SWRegistrationOptions = {}) {
    this.options = {
      checkUpdateInterval: 60000, // Check for updates every 60 seconds
      ...options,
    };
  }

  /**
   * Register the service worker
   */
  async register(): Promise<ServiceWorkerRegistration | null> {
    // Check if service workers are supported
    if (!('serviceWorker' in navigator)) {
      console.warn('[SW Manager] Service workers are not supported');
      return null;
    }

    try {
      // Register the service worker
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });

      console.log('[SW Manager] Service worker registered:', this.registration);

      // Set up event listeners
      this.setupEventListeners();

      // Check for updates periodically
      if (this.options.checkUpdateInterval) {
        this.startUpdateChecks();
      }

      // Check if there's an update available immediately
      await this.checkForUpdate();

      // Call success callback
      if (this.options.onSuccess) {
        this.options.onSuccess(this.registration);
      }

      return this.registration;
    } catch (error) {
      console.error('[SW Manager] Service worker registration failed:', error);
      if (this.options.onError) {
        this.options.onError(error as Error);
      }
      return null;
    }
  }

  /**
   * Unregister the service worker
   */
  async unregister(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      const success = await this.registration.unregister();
      console.log('[SW Manager] Service worker unregistered:', success);
      this.registration = null;
      this.stopUpdateChecks();
      return success;
    } catch (error) {
      console.error('[SW Manager] Failed to unregister service worker:', error);
      return false;
    }
  }

  /**
   * Check for service worker updates
   */
  async checkForUpdate(): Promise<boolean> {
    if (!this.registration) {
      return false;
    }

    try {
      await this.registration.update();
      const status = this.getUpdateStatus();

      if (status.hasUpdate) {
        console.log('[SW Manager] Update available');
        if (this.options.onUpdate && status.registration) {
          this.options.onUpdate(status.registration);
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('[SW Manager] Failed to check for updates:', error);
      return false;
    }
  }

  /**
   * Get current update status
   */
  getUpdateStatus(): SWUpdateStatus {
    if (!this.registration) {
      return {
        hasUpdate: false,
        registration: null,
        installing: null,
        waiting: null,
        active: null,
      };
    }

    return {
      hasUpdate: !!this.registration.waiting || !!this.registration.installing,
      registration: this.registration,
      installing: this.registration.installing,
      waiting: this.registration.waiting,
      active: this.registration.active,
    };
  }

  /**
   * Activate waiting service worker
   */
  async activateUpdate(): Promise<void> {
    if (!this.registration || !this.registration.waiting) {
      console.warn('[SW Manager] No waiting service worker to activate');
      return;
    }

    // Send message to waiting SW to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Wait for the new service worker to activate
    return new Promise((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        console.log('[SW Manager] Controller changed, reloading page');
        resolve();
        // Reload the page to use the new service worker
        window.location.reload();
      });
    });
  }

  /**
   * Send message to service worker
   */
  async sendMessage(message: any): Promise<any> {
    if (!this.registration || !this.registration.active) {
      throw new Error('No active service worker');
    }

    return new Promise((resolve, reject) => {
      const messageChannel = new MessageChannel();

      messageChannel.port1.onmessage = (event) => {
        if (event.data.error) {
          reject(event.data.error);
        } else {
          resolve(event.data);
        }
      };

      this.registration!.active!.postMessage(message, [messageChannel.port2]);
    });
  }

  /**
   * Clear all caches
   */
  async clearCache(): Promise<void> {
    try {
      await this.sendMessage({ type: 'CLEAR_CACHE' });
      console.log('[SW Manager] Cache cleared');
    } catch (error) {
      console.error('[SW Manager] Failed to clear cache:', error);
      throw error;
    }
  }

  /**
   * Cache dashboard data
   */
  async cacheDashboard(companyId: string, data: any): Promise<void> {
    try {
      await this.sendMessage({
        type: 'CACHE_DASHBOARD',
        companyId,
        data,
      });
      console.log('[SW Manager] Dashboard cached:', companyId);
    } catch (error) {
      console.error('[SW Manager] Failed to cache dashboard:', error);
      throw error;
    }
  }

  /**
   * Get registration instance
   */
  getRegistration(): ServiceWorkerRegistration | null {
    return this.registration;
  }

  /**
   * Private Methods
   */

  private setupEventListeners(): void {
    if (!this.registration) {
      return;
    }

    // Listen for updates
    this.registration.addEventListener('updatefound', () => {
      console.log('[SW Manager] Update found');
      const installingWorker = this.registration!.installing;

      if (!installingWorker) {
        return;
      }

      installingWorker.addEventListener('statechange', () => {
        console.log('[SW Manager] State changed:', installingWorker.state);

        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New update available
            console.log('[SW Manager] New update available');
            if (this.options.onWaiting && this.registration) {
              this.options.onWaiting(this.registration);
            }
          } else {
            // First time installation
            console.log('[SW Manager] Service worker installed for the first time');
            if (this.options.onSuccess && this.registration) {
              this.options.onSuccess(this.registration);
            }
          }
        }
      });
    });

    // Listen for controller changes
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[SW Manager] Controller changed');
    });

    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      console.log('[SW Manager] Message from SW:', event.data);
      this.handleServiceWorkerMessage(event.data);
    });
  }

  private handleServiceWorkerMessage(message: any): void {
    if (message.type === 'REPLAY_EVENTS') {
      // Handle event replay from offline storage
      console.log('[SW Manager] Replaying events:', message.events.length);
      window.dispatchEvent(
        new CustomEvent('sw-replay-events', { detail: message.events })
      );
    }
  }

  private startUpdateChecks(): void {
    if (this.updateCheckInterval) {
      return;
    }

    this.updateCheckInterval = window.setInterval(() => {
      this.checkForUpdate();
    }, this.options.checkUpdateInterval!);

    console.log(
      '[SW Manager] Started update checks every',
      this.options.checkUpdateInterval,
      'ms'
    );
  }

  private stopUpdateChecks(): void {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
      this.updateCheckInterval = null;
      console.log('[SW Manager] Stopped update checks');
    }
  }
}

// Global instance
let swManager: ServiceWorkerManager | null = null;

/**
 * Register service worker with options
 */
export async function registerServiceWorker(
  options: SWRegistrationOptions = {}
): Promise<ServiceWorkerRegistration | null> {
  if (swManager) {
    console.warn('[SW Manager] Service worker already registered');
    return swManager.getRegistration();
  }

  swManager = new ServiceWorkerManager(options);
  return await swManager.register();
}

/**
 * Unregister service worker
 */
export async function unregisterServiceWorker(): Promise<boolean> {
  if (!swManager) {
    return false;
  }

  const success = await swManager.unregister();
  if (success) {
    swManager = null;
  }
  return success;
}

/**
 * Get service worker manager instance
 */
export function getServiceWorkerManager(): ServiceWorkerManager | null {
  return swManager;
}

/**
 * Check for service worker updates
 */
export async function checkForUpdates(): Promise<boolean> {
  if (!swManager) {
    return false;
  }
  return await swManager.checkForUpdate();
}

/**
 * Activate waiting service worker
 */
export async function activateWaitingServiceWorker(): Promise<void> {
  if (!swManager) {
    throw new Error('Service worker not registered');
  }
  await swManager.activateUpdate();
}

/**
 * Get current update status
 */
export function getUpdateStatus(): SWUpdateStatus {
  if (!swManager) {
    return {
      hasUpdate: false,
      registration: null,
      installing: null,
      waiting: null,
      active: null,
    };
  }
  return swManager.getUpdateStatus();
}

/**
 * Clear all caches
 */
export async function clearAllCaches(): Promise<void> {
  if (!swManager) {
    throw new Error('Service worker not registered');
  }
  await swManager.clearCache();
}

/**
 * Cache dashboard data
 */
export async function cacheDashboardData(
  companyId: string,
  data: any
): Promise<void> {
  if (!swManager) {
    throw new Error('Service worker not registered');
  }
  await swManager.cacheDashboard(companyId, data);
}

/**
 * Utility: Check if service workers are supported
 */
export function isServiceWorkerSupported(): boolean {
  return 'serviceWorker' in navigator;
}

/**
 * Utility: Get active service worker
 */
export function getActiveServiceWorker(): ServiceWorker | null {
  if (!navigator.serviceWorker.controller) {
    return null;
  }
  return navigator.serviceWorker.controller;
}

/**
 * Utility: Wait for service worker to be ready
 */
export async function waitForServiceWorkerReady(): Promise<ServiceWorkerRegistration> {
  if (!isServiceWorkerSupported()) {
    throw new Error('Service workers not supported');
  }
  return await navigator.serviceWorker.ready;
}
