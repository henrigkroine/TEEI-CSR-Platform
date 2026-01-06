/**
 * useDemoData Hook
 *
 * React hook for fetching and managing demo data.
 */

import { useState, useEffect } from 'react';
import { isDemoModeEnabledClient } from '../lib/demo/demoConfig';
import type { NormalizedMetrics } from '../lib/demo/demoDataService';

export interface DemoDataState {
  enabled: boolean;
  loading: boolean;
  error: string | null;
  metrics: NormalizedMetrics | null;
  csvExists: boolean;
  csvPath: string;
  lastUpdated: Date | null;
}

/**
 * Hook to fetch and manage demo data
 */
export function useDemoData() {
  const [state, setState] = useState<DemoDataState>({
    enabled: false,
    loading: true,
    error: null,
    metrics: null,
    csvExists: false,
    csvPath: '',
    lastUpdated: null,
  });

  useEffect(() => {
    async function fetchDemoData() {
      const enabled = isDemoModeEnabledClient();

      if (!enabled) {
        setState(prev => ({
          ...prev,
          enabled: false,
          loading: false,
        }));
        return;
      }

      setState(prev => ({ ...prev, enabled: true, loading: true, error: null }));

      try {
        // Check status first
        const statusResponse = await fetch('/api/demo/status');
        const status = await statusResponse.json();

        if (!status.csvExists) {
          setState(prev => ({
            ...prev,
            enabled: true,
            loading: false,
            csvExists: false,
            csvPath: status.csvPath || '',
            error: `CSV file not found at: ${status.csvPath || 'data/demo-metrics.csv'}`,
          }));
          return;
        }

        // Fetch metrics
        const metricsResponse = await fetch('/api/demo/metrics');

        if (!metricsResponse.ok) {
          const errorData = await metricsResponse.json();
          throw new Error(errorData.error || 'Failed to fetch demo metrics');
        }

        const metrics: NormalizedMetrics = await metricsResponse.json();

        setState(prev => ({
          ...prev,
          enabled: true,
          loading: false,
          metrics,
          csvExists: true,
          csvPath: metrics.csvPath || status.csvPath || '',
          lastUpdated: metrics.lastUpdated ? new Date(metrics.lastUpdated) : new Date(),
          error: null,
        }));
      } catch (error: any) {
        setState(prev => ({
          ...prev,
          enabled: true,
          loading: false,
          error: error?.message || 'Failed to load demo data',
        }));
      }
    }

    fetchDemoData();
  }, []);

  /**
   * Retry fetching demo data
   */
  const retry = () => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    // Trigger re-fetch by updating a dependency
    useEffect(() => {
      fetchDemoData();
    }, []);
  };

  return {
    ...state,
    retry,
  };
}
