/**
 * Tenant Preferences API
 *
 * Manages user preferences per tenant including:
 * - Theme preference (light/dark/auto)
 * - Backend persistence
 * - Fallback to localStorage if API unavailable
 */

export type Theme = 'light' | 'dark' | 'auto';

export interface TenantPreferences {
  theme: Theme;
  [key: string]: unknown;
}

/**
 * Get the storage key for a specific tenant
 */
function getStorageKey(companyId: string): string {
  return `theme:${companyId}`;
}

/**
 * Save theme preference to backend API
 *
 * Attempts to persist to backend, but always saves to localStorage
 * as a fallback for offline scenarios.
 */
export async function saveThemePreference(
  theme: Theme,
  companyId: string,
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  // Always save to localStorage first
  const storageKey = getStorageKey(companyId);
  localStorage.setItem(storageKey, theme);

  // Attempt backend save if API is available
  try {
    const response = await fetch('/api/v1/preferences/theme', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ theme, companyId }),
      signal: options.signal,
    });

    if (!response.ok) {
      console.warn(
        `Failed to save theme preference to backend: ${response.status} ${response.statusText}`
      );
      // Still consider this successful since we have localStorage fallback
    }
  } catch (error) {
    // Network error or abort
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.debug('Theme save request was aborted');
    } else {
      console.warn('Failed to save theme preference to backend, using localStorage fallback:', error);
    }
    // Continue silently - localStorage is our fallback
  }
}

/**
 * Load theme preference from backend API
 *
 * Falls back to localStorage if backend is unavailable.
 */
export async function loadThemePreference(
  companyId: string,
  options: { signal?: AbortSignal } = {}
): Promise<Theme> {
  // Try backend first
  try {
    const response = await fetch(`/api/v1/preferences/theme?companyId=${encodeURIComponent(companyId)}`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      signal: options.signal,
    });

    if (response.ok) {
      const data = await response.json();
      const theme = data.theme as Theme;

      // Sync backend value to localStorage
      const storageKey = getStorageKey(companyId);
      localStorage.setItem(storageKey, theme);

      return theme;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.debug('Theme load request was aborted');
    } else {
      console.warn('Failed to load theme preference from backend, checking localStorage:', error);
    }
  }

  // Fall back to localStorage
  const storageKey = getStorageKey(companyId);
  const stored = localStorage.getItem(storageKey) as Theme | null;
  return stored || 'auto';
}

/**
 * Load all tenant preferences (theme + others)
 *
 * This can be extended to handle other preference types.
 */
export async function loadTenantPreferences(
  companyId: string,
  options: { signal?: AbortSignal } = {}
): Promise<TenantPreferences> {
  try {
    const response = await fetch(
      `/api/v1/preferences?companyId=${encodeURIComponent(companyId)}`,
      {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: options.signal,
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data as TenantPreferences;
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.debug('Preferences load request was aborted');
    } else {
      console.warn('Failed to load preferences from backend:', error);
    }
  }

  // Fall back to localStorage-only preferences
  const storageKey = getStorageKey(companyId);
  const theme = (localStorage.getItem(storageKey) as Theme | null) || 'auto';
  return { theme };
}

/**
 * Save all tenant preferences
 */
export async function saveTenantPreferences(
  preferences: TenantPreferences,
  companyId: string,
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  // Save each preference to localStorage as fallback
  if (preferences.theme) {
    const storageKey = getStorageKey(companyId);
    localStorage.setItem(storageKey, preferences.theme);
  }

  // Attempt backend save
  try {
    const response = await fetch('/api/v1/preferences', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ ...preferences, companyId }),
      signal: options.signal,
    });

    if (!response.ok) {
      console.warn(
        `Failed to save preferences to backend: ${response.status} ${response.statusText}`
      );
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.debug('Preferences save request was aborted');
    } else {
      console.warn('Failed to save preferences to backend, using localStorage fallback:', error);
    }
  }
}

/**
 * Initialize theme preference on app load
 *
 * This should be called once when the app initializes to sync
 * backend preferences with localStorage.
 */
export async function initializeThemePreference(
  companyId: string,
  options: { signal?: AbortSignal; autoLoad?: boolean } = { autoLoad: true }
): Promise<Theme> {
  if (typeof window === 'undefined') {
    // SSR - can't access localStorage or make fetch
    return 'auto';
  }

  // Check if we already have a preference
  const storageKey = getStorageKey(companyId);
  const cached = localStorage.getItem(storageKey) as Theme | null;

  // If we have a cached preference and autoLoad is false, return it
  if (cached && !options.autoLoad) {
    return cached;
  }

  // Otherwise try to load from backend
  return loadThemePreference(companyId, options);
}

/**
 * Sync theme preference across browser tabs
 *
 * Listen for storage events and update the theme when changed in another tab.
 */
export function onThemePreferenceChanged(
  callback: (theme: Theme) => void,
  companyId: string
): () => void {
  const storageKey = getStorageKey(companyId);

  const handleStorageEvent = (e: StorageEvent) => {
    if (e.key === storageKey && e.newValue) {
      try {
        const theme = e.newValue as Theme;
        callback(theme);
      } catch (error) {
        console.error('Error processing theme change from storage event:', error);
      }
    }
  };

  window.addEventListener('storage', handleStorageEvent);

  // Return unsubscribe function
  return () => {
    window.removeEventListener('storage', handleStorageEvent);
  };
}

/**
 * Clear all theme preferences for a tenant
 */
export async function clearThemePreference(
  companyId: string,
  options: { signal?: AbortSignal } = {}
): Promise<void> {
  // Clear localStorage
  const storageKey = getStorageKey(companyId);
  localStorage.removeItem(storageKey);

  // Attempt backend clear (optional)
  try {
    await fetch(`/api/v1/preferences/theme?companyId=${encodeURIComponent(companyId)}`, {
      method: 'DELETE',
      signal: options.signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      console.debug('Theme clear request was aborted');
    } else {
      console.warn('Failed to clear theme preference from backend:', error);
    }
  }
}
