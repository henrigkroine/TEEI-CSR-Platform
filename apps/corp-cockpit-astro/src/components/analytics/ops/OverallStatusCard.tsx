/**
 * OverallStatusCard Component
 *
 * Displays overall analytics system status at-a-glance
 */

import React from 'react';
import type { AnalyticsHealthResponse, HealthStatus } from '../../../types/analytics';

export interface OverallStatusCardProps {
  health: AnalyticsHealthResponse;
  className?: string;
  testId?: string;
}

function getStatusDisplay(status: HealthStatus): {
  icon: string;
  color: string;
  bgColor: string;
  label: string;
} {
  switch (status) {
    case 'healthy':
      return {
        icon: '🟢',
        color: 'text-green-700',
        bgColor: 'bg-green-50',
        label: 'All Systems Operational',
      };
    case 'degraded':
      return {
        icon: '🟡',
        color: 'text-yellow-700',
        bgColor: 'bg-yellow-50',
        label: 'Some Systems Degraded',
      };
    case 'down':
      return {
        icon: '🔴',
        color: 'text-red-700',
        bgColor: 'bg-red-50',
        label: 'System Issues Detected',
      };
  }
}

export function OverallStatusCard({ health, className = '', testId }: OverallStatusCardProps) {
  const statusDisplay = getStatusDisplay(health.status);

  const endpointStatuses = [
    { name: 'Trends', status: health.endpoints.trends.status },
    { name: 'Engagement', status: health.endpoints.engagement.status },
    { name: 'Data Quality', status: health.endpoints.data_quality.status },
  ];

  const upCount = endpointStatuses.filter((e) => e.status === 'up').length;
  const downCount = endpointStatuses.filter((e) => e.status === 'down').length;

  return (
    <div
      className={`rounded-lg border-2 ${health.status === 'healthy' ? 'border-green-200' : health.status === 'degraded' ? 'border-yellow-200' : 'border-red-200'} ${statusDisplay.bgColor} p-6 shadow-lg ${className}`}
      data-testid={testId}
      role="status"
      aria-live="polite"
      aria-label="Overall analytics system status"
    >
      {/* Main Status */}
      <div className="mb-4 flex items-center gap-4">
        <span className="text-5xl" role="img" aria-label={statusDisplay.label}>
          {statusDisplay.icon}
        </span>
        <div>
          <h2 className={`text-2xl font-bold ${statusDisplay.color}`}>
            {statusDisplay.label}
          </h2>
          <p className="mt-1 text-sm text-gray-600">
            {upCount} of {endpointStatuses.length} endpoints operational
            {downCount > 0 && ` (${downCount} down)`}
          </p>
        </div>
      </div>

      {/* Endpoint Status List */}
      <div className="flex gap-3">
        {endpointStatuses.map((endpoint) => (
          <div
            key={endpoint.name}
            className="flex items-center gap-2 rounded-md bg-white px-3 py-2 text-sm shadow-sm"
          >
            <span className="text-lg" role="img" aria-label={endpoint.status}>
              {endpoint.status === 'up' ? '✅' : '❌'}
            </span>
            <span className="font-medium text-gray-700">{endpoint.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
