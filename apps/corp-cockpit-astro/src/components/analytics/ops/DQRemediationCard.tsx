/**
 * DQRemediationCard Component
 *
 * Displays Data Quality Remediation activity:
 * - Runs in last 24h
 * - Passed/failed checks
 * - Last run timestamp
 */

import React from 'react';
import type { DQRemediationHealth } from '../../../types/analytics';

export interface DQRemediationCardProps {
  dqRemediation: DQRemediationHealth;
  className?: string;
  testId?: string;
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

export function DQRemediationCard({
  dqRemediation,
  className = '',
  testId,
}: DQRemediationCardProps) {
  const lastRun = formatRelativeTime(dqRemediation.last_run);
  const totalChecks = dqRemediation.checks_passed + dqRemediation.checks_failed;
  const passRate = totalChecks > 0 ? (dqRemediation.checks_passed / totalChecks) * 100 : 100;

  const statusColor = passRate === 100 ? 'text-green-600' : passRate >= 90 ? 'text-yellow-600' : 'text-red-600';
  const statusIcon = passRate === 100 ? '✅' : passRate >= 90 ? '⚠️' : '❌';

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}
      data-testid={testId}
      role="article"
      aria-label="Data quality remediation activity"
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">DQ Remediation</h3>
        <span className="text-2xl" role="img" aria-label={`Pass rate: ${passRate.toFixed(0)}%`}>
          {statusIcon}
        </span>
      </div>

      {/* Metrics */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Runs (24h)</span>
          <span className="font-mono font-medium text-gray-900" data-testid={`${testId}-runs`}>
            {dqRemediation.runs_24h}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Checks Passed</span>
          <span
            className="font-mono font-medium text-green-600"
            data-testid={`${testId}-passed`}
          >
            {dqRemediation.checks_passed}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Checks Failed</span>
          <span
            className={`font-mono font-medium ${dqRemediation.checks_failed > 0 ? 'text-red-600' : 'text-gray-900'}`}
            data-testid={`${testId}-failed`}
          >
            {dqRemediation.checks_failed}
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Last Run</span>
          <span className="font-medium text-gray-900" data-testid={`${testId}-last-run`}>
            {lastRun}
          </span>
        </div>
      </div>

      {/* Pass Rate Bar */}
      <div className="mt-3">
        <div className="mb-1 flex justify-between text-xs text-gray-600">
          <span>Pass Rate</span>
          <span className={`font-medium ${statusColor}`}>{passRate.toFixed(0)}%</span>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full transition-all duration-500 ${passRate === 100 ? 'bg-green-500' : passRate >= 90 ? 'bg-yellow-500' : 'bg-red-500'}`}
            style={{ width: `${passRate}%` }}
            role="progressbar"
            aria-valuenow={passRate}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Pass rate: ${passRate.toFixed(0)}%`}
          />
        </div>
      </div>
    </div>
  );
}
