/**
 * DeliveryStats Component
 *
 * Displays aggregated delivery statistics:
 * - Overall success rate
 * - Per-provider breakdown
 * - Average latency metrics
 * - Real-time updates
 */

import React, { useEffect, useState } from 'react';
import type { DeliveryStatsProps, StatsResponse } from './types';

export default function DeliveryStats({ companyId, dateRange }: DeliveryStatsProps) {
  const [stats, setStats] = useState<StatsResponse['data'] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    // Refresh stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, [companyId, dateRange]);

  const fetchStats = async () => {
    try {
      const params = new URLSearchParams({ companyId });

      if (dateRange?.startDate) {
        params.append('startDate', dateRange.startDate);
      }
      if (dateRange?.endDate) {
        params.append('endDate', dateRange.endDate);
      }

      const response = await fetch(`/v1/impact-in/stats?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }

      const data: StatsResponse = await response.json();
      setStats(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load statistics');
      console.error('Error fetching delivery stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 animate-pulse">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-6">
        <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  const successRate = stats.overall.total > 0
    ? ((stats.overall.successful / stats.overall.total) * 100).toFixed(1)
    : '0.0';

  const failureRate = stats.overall.total > 0
    ? ((stats.overall.failed / stats.overall.total) * 100).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6 mb-6">
      {/* Overall Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Deliveries */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Total Deliveries
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                {stats.overall.total.toLocaleString()}
              </p>
            </div>
            <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Success Rate */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Success Rate
              </p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400 mt-2">
                {successRate}%
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.overall.successful.toLocaleString()} successful
              </p>
            </div>
            <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Failed Deliveries */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                Failed Deliveries
              </p>
              <p className="text-3xl font-bold text-red-600 dark:text-red-400 mt-2">
                {stats.overall.failed.toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {failureRate}% failure rate
              </p>
            </div>
            <div className="h-12 w-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>

        {/* Pending/Retrying */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
                In Progress
              </p>
              <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mt-2">
                {(stats.overall.pending + stats.overall.retrying).toLocaleString()}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {stats.overall.pending} pending, {stats.overall.retrying} retrying
              </p>
            </div>
            <div className="h-12 w-12 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-yellow-600 dark:text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Provider Breakdown */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Provider Breakdown
        </h3>

        <div className="space-y-4">
          {['benevity', 'goodera', 'workday'].map((provider) => {
            const providerStats = stats.byProvider.filter(s => s.provider === provider);
            const total = providerStats.reduce((sum, s) => sum + s.count, 0);
            const successful = providerStats.find(s => s.status === 'success')?.count || 0;
            const failed = providerStats.find(s => s.status === 'failed')?.count || 0;
            const successRate = total > 0 ? ((successful / total) * 100).toFixed(1) : '0.0';
            const avgAttempts = providerStats.length > 0
              ? (providerStats.reduce((sum, s) => sum + s.avgAttempts * s.count, 0) / total).toFixed(1)
              : '0.0';

            return (
              <div key={provider} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-3">
                    <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                      provider === 'benevity' ? 'bg-purple-100 dark:bg-purple-900/30' :
                      provider === 'goodera' ? 'bg-green-100 dark:bg-green-900/30' :
                      'bg-blue-100 dark:bg-blue-900/30'
                    }`}>
                      <span className="text-lg font-bold">
                        {provider === 'benevity' ? 'B' : provider === 'goodera' ? 'G' : 'W'}
                      </span>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 dark:text-white capitalize">
                        {provider}
                      </h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {total.toLocaleString()} total deliveries
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {successRate}%
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {avgAttempts} avg attempts
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                  <div
                    className="h-full bg-green-500 transition-all duration-300"
                    style={{ width: `${successRate}%` }}
                  />
                </div>

                {/* Status breakdown */}
                <div className="grid grid-cols-4 gap-2 mt-3 text-xs">
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">Success</p>
                    <p className="font-medium text-green-600 dark:text-green-400">{successful}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">Failed</p>
                    <p className="font-medium text-red-600 dark:text-red-400">{failed}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">Pending</p>
                    <p className="font-medium text-yellow-600 dark:text-yellow-400">
                      {providerStats.find(s => s.status === 'pending')?.count || 0}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-gray-500 dark:text-gray-400">Retrying</p>
                    <p className="font-medium text-orange-600 dark:text-orange-400">
                      {providerStats.find(s => s.status === 'retrying')?.count || 0}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
