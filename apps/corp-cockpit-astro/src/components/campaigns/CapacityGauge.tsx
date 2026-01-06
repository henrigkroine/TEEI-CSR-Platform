/**
 * CapacityGauge Component
 *
 * SWARM 6: Agent 6.2 - campaign-detail-dashboard
 *
 * Circular gauge visualization for capacity utilization metrics.
 * Color-coded by utilization level:
 * - Green: <80% (healthy)
 * - Yellow: 80-95% (warning)
 * - Red: 95-100% (critical)
 * - Dark Red: >100% (over capacity)
 */

import React from 'react';

export interface CapacityGaugeProps {
  label: string;
  current: number;
  target: number;
  utilization: number;
  status: 'low' | 'healthy' | 'warning' | 'critical';
  unit?: string;
  showRemaining?: boolean;
}

/**
 * Get color based on utilization status
 */
function getStatusColor(status: string): string {
  switch (status) {
    case 'critical':
      return '#dc2626'; // red-600
    case 'warning':
      return '#f59e0b'; // amber-500
    case 'healthy':
      return '#10b981'; // green-500
    case 'low':
      return '#6b7280'; // gray-500
    default:
      return '#6b7280';
  }
}

/**
 * Get background color for gauge
 */
function getBackgroundColor(status: string): string {
  switch (status) {
    case 'critical':
      return '#fef2f2'; // red-50
    case 'warning':
      return '#fffbeb'; // amber-50
    case 'healthy':
      return '#f0fdf4'; // green-50
    case 'low':
      return '#f9fafb'; // gray-50
    default:
      return '#f9fafb';
  }
}

/**
 * CapacityGauge - Circular gauge for capacity metrics
 */
export default function CapacityGauge({
  label,
  current,
  target,
  utilization,
  status,
  unit = '',
  showRemaining = true,
}: CapacityGaugeProps) {
  const percentage = Math.min(Math.round(utilization * 100), 100);
  const remaining = Math.max(0, target - current);
  const color = getStatusColor(status);
  const bgColor = getBackgroundColor(status);

  // Calculate SVG circle properties
  const size = 120;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  return (
    <div
      className="capacity-gauge"
      style={{ backgroundColor: bgColor }}
      role="figure"
      aria-label={`${label}: ${percentage}% utilized`}
    >
      <div className="gauge-header">
        <h3 className="gauge-label">{label}</h3>
        <span
          className="status-badge"
          style={{ backgroundColor: color }}
          aria-label={`Status: ${status}`}
        >
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </span>
      </div>

      <div className="gauge-visual">
        <svg width={size} height={size} className="gauge-svg">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
          />
          {/* Progress circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="gauge-progress"
          />
        </svg>
        <div className="gauge-center">
          <div className="gauge-percentage">{percentage}%</div>
        </div>
      </div>

      <div className="gauge-metrics">
        <div className="metric-row">
          <span className="metric-label">Current:</span>
          <span className="metric-value">
            {current.toLocaleString()} {unit}
          </span>
        </div>
        <div className="metric-row">
          <span className="metric-label">Target:</span>
          <span className="metric-value">
            {target.toLocaleString()} {unit}
          </span>
        </div>
        {showRemaining && (
          <div className="metric-row">
            <span className="metric-label">Remaining:</span>
            <span className="metric-value" style={{ color }}>
              {remaining.toLocaleString()} {unit}
            </span>
          </div>
        )}
      </div>

      <style jsx>{`
        .capacity-gauge {
          border-radius: 12px;
          padding: 1.5rem;
          transition: all 0.2s;
          border: 1px solid #e5e7eb;
        }

        .gauge-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1rem;
        }

        .gauge-label {
          font-size: 0.875rem;
          font-weight: 600;
          color: #374151;
          margin: 0;
        }

        .status-badge {
          font-size: 0.75rem;
          font-weight: 600;
          color: white;
          padding: 0.25rem 0.625rem;
          border-radius: 9999px;
          text-transform: uppercase;
          letter-spacing: 0.025em;
        }

        .gauge-visual {
          position: relative;
          display: flex;
          justify-content: center;
          margin-bottom: 1rem;
        }

        .gauge-svg {
          display: block;
        }

        .gauge-progress {
          transition: stroke-dashoffset 0.5s ease-in-out;
        }

        .gauge-center {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          text-align: center;
        }

        .gauge-percentage {
          font-size: 1.5rem;
          font-weight: 700;
          color: #111827;
        }

        .gauge-metrics {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .metric-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.875rem;
        }

        .metric-label {
          color: #6b7280;
          font-weight: 500;
        }

        .metric-value {
          color: #111827;
          font-weight: 600;
        }

        @media (max-width: 768px) {
          .capacity-gauge {
            padding: 1rem;
          }

          .gauge-label {
            font-size: 0.8125rem;
          }

          .gauge-percentage {
            font-size: 1.25rem;
          }
        }
      `}</style>
    </div>
  );
}
