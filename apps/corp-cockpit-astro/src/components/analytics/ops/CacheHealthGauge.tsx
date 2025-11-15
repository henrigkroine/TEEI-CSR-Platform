/**
 * CacheHealthGauge Component
 *
 * Displays cache health metrics:
 * - Hit rate with visual gauge
 * - Cache size in MB
 * - Eviction count
 */

import React from 'react';
import type { CacheHealth } from '../../../types/analytics';
import { evaluateCacheHitRateSLO } from '../../../types/analytics';

export interface CacheHealthGaugeProps {
  cache: CacheHealth;
  className?: string;
  testId?: string;
}

export function CacheHealthGauge({ cache, className = '', testId }: CacheHealthGaugeProps) {
  const slo = evaluateCacheHitRateSLO(cache.hit_rate);
  const hitRatePct = (cache.hit_rate * 100).toFixed(1);

  // Gauge color based on SLO status
  const gaugeColor =
    slo.status === 'good'
      ? 'bg-green-500'
      : slo.status === 'degraded'
        ? 'bg-yellow-500'
        : 'bg-red-500';

  const textColor =
    slo.status === 'good'
      ? 'text-green-600'
      : slo.status === 'degraded'
        ? 'text-yellow-600'
        : 'text-red-600';

  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${className}`}
      data-testid={testId}
      role="article"
      aria-label="Cache health metrics"
    >
      {/* Header */}
      <h3 className="mb-3 text-sm font-semibold text-gray-700">Cache Health</h3>

      {/* Hit Rate Gauge */}
      <div className="mb-4">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-gray-600">Hit Rate</span>
          <span className={`font-mono font-bold ${textColor}`} data-testid={`${testId}-hit-rate`}>
            {hitRatePct}%
          </span>
        </div>

        {/* Progress Bar */}
        <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200">
          <div
            className={`h-full transition-all duration-500 ${gaugeColor}`}
            style={{ width: `${hitRatePct}%` }}
            role="progressbar"
            aria-valuenow={cache.hit_rate * 100}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Cache hit rate: ${hitRatePct}%`}
          />
        </div>
      </div>

      {/* Additional Metrics */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Cache Size</span>
          <span className="font-mono font-medium text-gray-900" data-testid={`${testId}-size`}>
            {cache.size_mb.toFixed(1)} MB
          </span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Evictions</span>
          <span
            className="font-mono font-medium text-gray-900"
            data-testid={`${testId}-evictions`}
          >
            {cache.eviction_count.toLocaleString()}
          </span>
        </div>
      </div>

      {/* SLO Message */}
      {slo.status !== 'good' && (
        <div className="mt-3 rounded bg-gray-50 p-2 text-xs text-gray-700">
          ⚠️ {slo.message}
        </div>
      )}
    </div>
  );
}
