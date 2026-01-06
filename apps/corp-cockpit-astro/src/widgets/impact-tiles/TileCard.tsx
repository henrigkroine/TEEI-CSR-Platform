import React, { ReactNode } from 'react';

/**
 * TileCard Component
 * Base card component for impact tiles with consistent styling and loading states
 */

interface TileCardProps {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
  loading?: boolean;
  error?: string | null;
  onExport?: () => void;
  ariaLabel?: string;
}

export default function TileCard({
  title,
  subtitle,
  icon,
  children,
  loading = false,
  error = null,
  onExport,
  ariaLabel,
}: TileCardProps) {
  return (
    <div
      className="bg-white rounded-lg shadow-md border border-gray-200 p-6 hover:shadow-lg transition-shadow"
      role="region"
      aria-label={ariaLabel || title}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          {icon && <div className="text-blue-600 text-2xl">{icon}</div>}
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
            {subtitle && <p className="text-sm text-gray-600">{subtitle}</p>}
          </div>
        </div>
        {onExport && (
          <button
            onClick={onExport}
            className="text-gray-600 hover:text-blue-600 transition-colors"
            aria-label={`Export ${title} data`}
            title="Export tile data"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </button>
        )}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex justify-center items-center py-8" role="status" aria-live="polite">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="sr-only">Loading...</span>
        </div>
      ) : error ? (
        <div className="bg-red-50 border border-red-200 rounded-md p-4" role="alert">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      ) : (
        <div>{children}</div>
      )}
    </div>
  );
}

/**
 * MetricRow Component
 * Display a single metric with label and value
 */
interface MetricRowProps {
  label: string;
  value: string | number;
  trend?: 'up' | 'down' | 'neutral';
  unit?: string;
  className?: string;
}

export function MetricRow({ label, value, trend, unit, className = '' }: MetricRowProps) {
  const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '';
  const trendColor =
    trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-600';

  return (
    <div className={`flex justify-between items-center py-2 ${className}`}>
      <span className="text-sm text-gray-700">{label}</span>
      <span className={`text-sm font-medium ${trendColor}`}>
        {value}
        {unit && <span className="ml-1">{unit}</span>}
        {trend && <span className="ml-1">{trendIcon}</span>}
      </span>
    </div>
  );
}

/**
 * ProgressBar Component
 * Visual progress indicator
 */
interface ProgressBarProps {
  label: string;
  current: number;
  target?: number;
  max?: number;
  unit?: string;
  showPercentage?: boolean;
}

export function ProgressBar({
  label,
  current,
  target,
  max = 100,
  unit = '',
  showPercentage = true,
}: ProgressBarProps) {
  const percentage = Math.min((current / max) * 100, 100);
  const isOnTrack = target ? current >= target : true;
  const barColor = isOnTrack ? 'bg-green-500' : 'bg-yellow-500';

  return (
    <div className="py-3">
      <div className="flex justify-between items-center mb-1">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="text-sm font-medium text-gray-900">
          {current}
          {unit}
          {target && <span className="text-gray-500 ml-1">/ {target}{unit}</span>}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={`${barColor} h-2 rounded-full transition-all duration-500`}
          style={{ width: `${percentage}%` }}
          role="progressbar"
          aria-valuenow={current}
          aria-valuemin={0}
          aria-valuemax={max}
          aria-label={`${label}: ${current} of ${max}${unit}`}
        ></div>
      </div>
      {showPercentage && (
        <span className="text-xs text-gray-500 mt-1 block">{percentage.toFixed(1)}%</span>
      )}
    </div>
  );
}
