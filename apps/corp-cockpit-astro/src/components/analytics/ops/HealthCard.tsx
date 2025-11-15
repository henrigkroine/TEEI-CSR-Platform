/**
 * HealthCard Component
 *
 * Displays health status for an analytics endpoint with:
 * - Status badge (🟢/🟡/🔴)
 * - Latency metrics (p50/p95)
 * - Error rate
 * - Last success timestamp
 */

import React from 'react';
import type { EndpointHealth, SLOStatus } from '../../../types/analytics';
import { evaluateLatencySLO, evaluateErrorRateSLO } from '../../../types/analytics';

export interface HealthCardProps {
  title: string;
  health: EndpointHealth;
  className?: string;
  testId?: string;
}

/**
 * Get status icon and color based on SLO evaluation
 */
function getStatusDisplay(status: SLOStatus): { icon: string; color: string; label: string } {
  switch (status) {
    case 'good':
      return { icon: '🟢', color: 'text-green-600', label: 'Healthy' };
    case 'degraded':
      return { icon: '🟡', color: 'text-yellow-600', label: 'Degraded' };
    case 'critical':
      return { icon: '🔴', color: 'text-red-600', label: 'Critical' };
  }
}

/**
 * Format timestamp to relative time
 */
function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function HealthCard({ title, health, className = '', testId }: HealthCardProps) {
  const latencySLO = evaluateLatencySLO(health.latency_p95);
  const errorRateSLO = evaluateErrorRateSLO(health.error_rate);

  // Overall status is worst of latency and error rate
  const worstStatus: SLOStatus =
    latencySLO.status === 'critical' || errorRateSLO.status === 'critical'
      ? 'critical'
      : latencySLO.status === 'degraded' || errorRateSLO.status === 'degraded'
        ? 'degraded'
        : 'good';

  const statusDisplay = getStatusDisplay(worstStatus);
  const lastSuccess = formatRelativeTime(health.last_success);

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}
      data-testid={testId}
      role="article"
      aria-label={`${title} health status`}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">{title}</h3>
        <div className="flex items-center gap-2">
          <span
            className="text-2xl"
            role="img"
            aria-label={statusDisplay.label}
            data-testid={`${testId}-status-icon`}
          >
            {statusDisplay.icon}
          </span>
          <span className={`text-sm font-medium ${statusDisplay.color}`}>
            {health.status === 'up' ? statusDisplay.label : 'Down'}
          </span>
        </div>
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        {/* Latency */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Latency (p95)</span>
          <span
            className={`font-mono font-medium ${latencySLO.status === 'good' ? 'text-gray-900' : latencySLO.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'}`}
            data-testid={`${testId}-latency`}
          >
            {health.latency_p95.toFixed(0)}ms
          </span>
        </div>

        {/* Error Rate */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Error Rate</span>
          <span
            className={`font-mono font-medium ${errorRateSLO.status === 'good' ? 'text-gray-900' : errorRateSLO.status === 'degraded' ? 'text-yellow-600' : 'text-red-600'}`}
            data-testid={`${testId}-error-rate`}
          >
            {(health.error_rate * 100).toFixed(2)}%
          </span>
        </div>

        {/* Last Success */}
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Last Success</span>
          <span className="font-medium text-gray-900" data-testid={`${testId}-last-success`}>
            {lastSuccess}
          </span>
        </div>
      </div>

      {/* Status Message (for degraded/critical) */}
      {worstStatus !== 'good' && (
        <div className="mt-3 rounded bg-gray-50 p-2 text-xs text-gray-700">
          {latencySLO.status !== 'good' && <div>⚠️ {latencySLO.message}</div>}
          {errorRateSLO.status !== 'good' && <div>⚠️ {errorRateSLO.message}</div>}
        </div>
      )}
    </div>
  );
}
