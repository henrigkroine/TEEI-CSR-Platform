/**
 * AnalyticsOpsContent Component
 *
 * Main content area for the Analytics Operations dashboard.
 * Fetches health data and renders status cards.
 */

import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useAnalyticsHealth } from '../../../hooks/useAnalytics';
import { OverallStatusCard } from './OverallStatusCard';
import { HealthCard } from './HealthCard';
import { CacheHealthGauge } from './CacheHealthGauge';
import { DQRemediationCard } from './DQRemediationCard';

// Create a QueryClient instance for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 2,
    },
  },
});

/**
 * Inner component that uses the query hook
 */
function AnalyticsOpsInner() {
  const { data: health, isLoading, isError, error } = useAnalyticsHealth();

  // Loading state
  if (isLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="text-center">
          <div
            className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"
            role="status"
            aria-label="Loading"
          />
          <p className="text-gray-600">Loading analytics health data...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (isError || !health) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6">
        <div className="flex items-start gap-3">
          <span className="text-3xl" role="img" aria-label="Error">
            ⚠️
          </span>
          <div className="flex-1">
            <h2 className="mb-2 text-lg font-semibold text-red-900">
              Unable to Load Analytics Health
            </h2>
            <p className="mb-4 text-sm text-red-700">
              {error?.message || 'An unknown error occurred while fetching analytics health data.'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Success state - render health dashboard
  return (
    <div className="space-y-6">
      {/* Overall Status */}
      <OverallStatusCard health={health} testId="overall-status" />

      {/* Endpoint Health Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <HealthCard
          title="Trends Endpoint"
          health={health.endpoints.trends}
          testId="health-card-trends"
        />
        <HealthCard
          title="Engagement Endpoint"
          health={health.endpoints.engagement}
          testId="health-card-engagement"
        />
        <HealthCard
          title="Data Quality Endpoint"
          health={health.endpoints.data_quality}
          testId="health-card-data-quality"
        />
      </div>

      {/* Cache & DQ Remediation */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <CacheHealthGauge cache={health.cache} testId="cache-health" />
        <DQRemediationCard dqRemediation={health.dq_remediation} testId="dq-remediation" />
      </div>

      {/* Last Updated */}
      <div className="text-center text-xs text-gray-500">
        Last updated: {new Date().toLocaleTimeString()} • Auto-refreshes every minute
      </div>
    </div>
  );
}

/**
 * Wrapper component that provides QueryClient
 */
export default function AnalyticsOpsContent() {
  return (
    <QueryClientProvider client={queryClient}>
      <AnalyticsOpsInner />
    </QueryClientProvider>
  );
}
