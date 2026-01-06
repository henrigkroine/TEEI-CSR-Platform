/**
 * Background Sync for Exports
 *
 * Features:
 * - Queue export jobs when offline
 * - Register background sync
 * - Retry logic with exponential backoff
 * - Local notifications on completion
 * - Sync status tracking
 */

export interface ExportJob {
  id: string;
  type: 'pdf' | 'csv' | 'xlsx' | 'pptx';
  reportId: string;
  companyId: string;
  options: Record<string, any>;
  createdAt: number;
  retryCount: number;
  maxRetries: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  error?: string;
}

const DB_NAME = 'teei-cockpit';
const EXPORT_QUEUE_STORE = 'exportQueue';
const MAX_RETRIES = 5;
const RETRY_DELAY_BASE = 2000; // 2 seconds

/**
 * Queue an export job for background sync
 */
export async function queueExport(
  type: ExportJob['type'],
  reportId: string,
  companyId: string,
  options: Record<string, any> = {}
): Promise<string> {
  const exportId = `export-${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const job: ExportJob = {
    id: exportId,
    type,
    reportId,
    companyId,
    options,
    createdAt: Date.now(),
    retryCount: 0,
    maxRetries: MAX_RETRIES,
    status: 'pending',
  };

  try {
    const db = await openDB();
    const tx = db.transaction(EXPORT_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(EXPORT_QUEUE_STORE);

    await new Promise<void>((resolve, reject) => {
      const request = store.add(job);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('[BackgroundSync] Export queued:', exportId);

    // Register background sync
    if ('serviceWorker' in navigator && 'sync' in (self as any).registration) {
      const registration = await navigator.serviceWorker.ready;
      await (registration as any).sync.register(`export-${exportId}`);
      console.log('[BackgroundSync] Sync registered for:', exportId);
    } else {
      // Fallback: try to sync immediately if background sync not supported
      console.warn('[BackgroundSync] Background Sync API not supported, syncing immediately');
      await syncExport(exportId);
    }

    return exportId;
  } catch (error) {
    console.error('[BackgroundSync] Failed to queue export:', error);
    throw error;
  }
}

/**
 * Sync a specific export job
 */
export async function syncExport(exportId: string): Promise<void> {
  console.log('[BackgroundSync] Syncing export:', exportId);

  try {
    const db = await openDB();
    const job = await getExportJob(exportId);

    if (!job) {
      console.warn('[BackgroundSync] Export job not found:', exportId);
      return;
    }

    if (job.status === 'completed') {
      console.log('[BackgroundSync] Export already completed:', exportId);
      return;
    }

    // Update status to syncing
    job.status = 'syncing';
    await updateExportJob(job);

    // Trigger export API
    const response = await fetch('/api/exports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type: job.type,
        reportId: job.reportId,
        companyId: job.companyId,
        options: job.options,
      }),
    });

    if (!response.ok) {
      throw new Error(`Export API failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Mark as completed
    job.status = 'completed';
    await updateExportJob(job);

    // Show success notification
    await showNotification(
      'Export Complete',
      `Your ${job.type.toUpperCase()} export is ready to download.`,
      `/exports/${result.exportId}`
    );

    console.log('[BackgroundSync] Export synced successfully:', exportId);
  } catch (error) {
    console.error('[BackgroundSync] Export sync failed:', error);

    const job = await getExportJob(exportId);
    if (job) {
      job.retryCount++;

      if (job.retryCount >= job.maxRetries) {
        // Max retries reached, mark as failed
        job.status = 'failed';
        job.error = error instanceof Error ? error.message : 'Unknown error';
        await updateExportJob(job);

        // Show error notification
        await showNotification(
          'Export Failed',
          `Your ${job.type.toUpperCase()} export failed after ${job.maxRetries} attempts.`,
          undefined,
          'error'
        );
      } else {
        // Retry with exponential backoff
        job.status = 'pending';
        await updateExportJob(job);

        const delay = RETRY_DELAY_BASE * Math.pow(2, job.retryCount);
        console.log(`[BackgroundSync] Retrying in ${delay}ms (attempt ${job.retryCount + 1}/${job.maxRetries})`);

        setTimeout(() => syncExport(exportId), delay);
      }
    }

    throw error;
  }
}

/**
 * Sync all pending exports
 */
export async function syncAllPendingExports(): Promise<void> {
  console.log('[BackgroundSync] Syncing all pending exports');

  const jobs = await getAllPendingExports();

  for (const job of jobs) {
    try {
      await syncExport(job.id);
    } catch (error) {
      console.error('[BackgroundSync] Failed to sync export:', job.id, error);
      // Continue with next job
    }
  }
}

/**
 * Get all pending export jobs
 */
export async function getAllPendingExports(): Promise<ExportJob[]> {
  try {
    const db = await openDB();
    const tx = db.transaction(EXPORT_QUEUE_STORE, 'readonly');
    const store = tx.objectStore(EXPORT_QUEUE_STORE);

    const jobs = await new Promise<ExportJob[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    return jobs.filter((job) => job.status === 'pending');
  } catch (error) {
    console.error('[BackgroundSync] Failed to get pending exports:', error);
    return [];
  }
}

/**
 * Get a specific export job
 */
async function getExportJob(exportId: string): Promise<ExportJob | null> {
  try {
    const db = await openDB();
    const tx = db.transaction(EXPORT_QUEUE_STORE, 'readonly');
    const store = tx.objectStore(EXPORT_QUEUE_STORE);

    return new Promise((resolve, reject) => {
      const request = store.get(exportId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[BackgroundSync] Failed to get export job:', error);
    return null;
  }
}

/**
 * Update an export job
 */
async function updateExportJob(job: ExportJob): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(EXPORT_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(EXPORT_QUEUE_STORE);

    await new Promise<void>((resolve, reject) => {
      const request = store.put(job);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.error('[BackgroundSync] Failed to update export job:', error);
    throw error;
  }
}

/**
 * Delete an export job
 */
export async function deleteExportJob(exportId: string): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(EXPORT_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(EXPORT_QUEUE_STORE);

    await new Promise<void>((resolve, reject) => {
      const request = store.delete(exportId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });

    console.log('[BackgroundSync] Export job deleted:', exportId);
  } catch (error) {
    console.error('[BackgroundSync] Failed to delete export job:', error);
    throw error;
  }
}

/**
 * Clear all completed exports
 */
export async function clearCompletedExports(): Promise<void> {
  try {
    const db = await openDB();
    const tx = db.transaction(EXPORT_QUEUE_STORE, 'readwrite');
    const store = tx.objectStore(EXPORT_QUEUE_STORE);

    const jobs = await new Promise<ExportJob[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    const completedJobs = jobs.filter((job) => job.status === 'completed');

    for (const job of completedJobs) {
      await deleteExportJob(job.id);
    }

    console.log('[BackgroundSync] Cleared', completedJobs.length, 'completed exports');
  } catch (error) {
    console.error('[BackgroundSync] Failed to clear completed exports:', error);
  }
}

/**
 * Get export queue metrics
 */
export interface ExportQueueMetrics {
  totalJobs: number;
  pendingJobs: number;
  syncingJobs: number;
  completedJobs: number;
  failedJobs: number;
}

export async function getExportQueueMetrics(): Promise<ExportQueueMetrics> {
  try {
    const db = await openDB();
    const tx = db.transaction(EXPORT_QUEUE_STORE, 'readonly');
    const store = tx.objectStore(EXPORT_QUEUE_STORE);

    const jobs = await new Promise<ExportJob[]>((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });

    return {
      totalJobs: jobs.length,
      pendingJobs: jobs.filter((j) => j.status === 'pending').length,
      syncingJobs: jobs.filter((j) => j.status === 'syncing').length,
      completedJobs: jobs.filter((j) => j.status === 'completed').length,
      failedJobs: jobs.filter((j) => j.status === 'failed').length,
    };
  } catch (error) {
    console.error('[BackgroundSync] Failed to get metrics:', error);
    return {
      totalJobs: 0,
      pendingJobs: 0,
      syncingJobs: 0,
      completedJobs: 0,
      failedJobs: 0,
    };
  }
}

/**
 * Helper: Open IndexedDB
 */
async function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(EXPORT_QUEUE_STORE)) {
        db.createObjectStore(EXPORT_QUEUE_STORE, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Helper: Show notification
 */
async function showNotification(
  title: string,
  body: string,
  url?: string,
  type: 'success' | 'error' = 'success'
): Promise<void> {
  if (!('Notification' in window)) {
    return;
  }

  // Request permission if needed
  if (Notification.permission === 'default') {
    await Notification.requestPermission();
  }

  if (Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      tag: 'export-notification',
      requireInteraction: false,
    });

    if (url) {
      notification.onclick = () => {
        window.open(url, '_blank');
        notification.close();
      };
    }
  }
}

/**
 * Listen for online event and sync pending exports
 */
if (typeof window !== 'undefined') {
  window.addEventListener('online', async () => {
    console.log('[BackgroundSync] Device back online, syncing pending exports');
    try {
      await syncAllPendingExports();
    } catch (error) {
      console.error('[BackgroundSync] Failed to sync pending exports:', error);
    }
  });
}
