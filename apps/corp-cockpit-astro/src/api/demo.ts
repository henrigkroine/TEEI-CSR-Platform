/**
 * Demo Data API Client
 *
 * Client-side API for fetching demo data.
 */

import { getDemoDataService } from '../lib/demo/demoDataService';
import { isDemoModeEnabled } from '../lib/demo/demoConfig';
import type { NormalizedMetrics, DemoMetrics } from '../lib/demo/demoDataService';

/**
 * Fetch demo metrics (server-side only)
 */
export async function fetchDemoMetrics(): Promise<NormalizedMetrics | null> {
  if (!isDemoModeEnabled()) {
    return null;
  }

  try {
    const service = getDemoDataService();
    return service.getMetrics();
  } catch (error) {
    console.error('[Demo API] Failed to fetch demo metrics:', error);
    throw error;
  }
}

/**
 * Fetch demo metrics for a specific programme
 */
export async function fetchProgrammeMetrics(
  programme: 'language_connect' | 'mentorship'
): Promise<DemoMetrics | null> {
  if (!isDemoModeEnabled()) {
    return null;
  }

  try {
    const service = getDemoDataService();
    return service.getProgrammeMetrics(programme);
  } catch (error) {
    console.error('[Demo API] Failed to fetch programme metrics:', error);
    throw error;
  }
}

/**
 * Check if demo mode is enabled and CSV exists
 */
export function checkDemoModeStatus(): {
  enabled: boolean;
  csvExists: boolean;
  csvPath: string;
} {
  const enabled = isDemoModeEnabled();
  if (!enabled) {
    return {
      enabled: false,
      csvExists: false,
      csvPath: '',
    };
  }

  try {
    const service = getDemoDataService();
    const info = service.getCSVInfo();
    return {
      enabled: true,
      csvExists: info.exists,
      csvPath: info.path,
    };
  } catch (error) {
    return {
      enabled: true,
      csvExists: false,
      csvPath: '',
    };
  }
}
