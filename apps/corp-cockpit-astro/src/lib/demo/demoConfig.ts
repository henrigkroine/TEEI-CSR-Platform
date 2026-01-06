/**
 * Demo Mode Configuration
 *
 * Centralized configuration for demo mode feature.
 */

/**
 * Check if demo mode is enabled (server-side)
 */
export function isDemoModeEnabled(): boolean {
  // Check environment variable
  if (typeof process !== 'undefined' && process.env) {
    const envValue = process.env.DEMO_MODE_ENABLED;
    if (envValue !== undefined) {
      return envValue === 'true' || envValue === '1';
    }
  }

  // Default: disabled
  return false;
}

/**
 * Check if demo mode is enabled (client-side)
 * Falls back to server-side check if localStorage not available
 */
export function isDemoModeEnabledClient(): boolean {
  // Check browser localStorage first (for client-side override)
  if (typeof window !== 'undefined' && window.localStorage) {
    const stored = window.localStorage.getItem('demo_mode_enabled');
    if (stored !== null) {
      return stored === 'true';
    }
  }

  // Fall back to server-side check
  return isDemoModeEnabled();
}

/**
 * Get demo CSV file path
 */
export function getDemoCSVPath(): string {
  if (typeof process !== 'undefined' && process.env) {
    return process.env.DEMO_CSV_PATH || 'data/demo-metrics.csv';
  }
  return 'data/demo-metrics.csv';
}

/**
 * Set demo mode (client-side only)
 */
export function setDemoMode(enabled: boolean): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    window.localStorage.setItem('demo_mode_enabled', String(enabled));
  }
}
