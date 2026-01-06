/**
 * PercentileIndicator Component
 *
 * Displays percentile ranking with color-coded badges and tooltips
 */

import { useState } from 'react';

interface Props {
  percentile: number;
  metric: string;
  showTooltip?: boolean;
}

export default function PercentileIndicator({ percentile, metric, showTooltip = true }: Props) {
  const [tooltipVisible, setTooltipVisible] = useState(false);

  // Determine tier and styling
  const tier = getPercentileTier(percentile);
  const label = getPercentileLabel(percentile);
  const color = getPercentileColor(percentile);
  const icon = getPercentileIcon(percentile);

  // Tooltip content
  const tooltipText = `
    Your company ranks in the ${label} for ${metric}.
    This means you perform better than ${percentile}% of companies in your cohort.
    ${getMethodologyNote(percentile)}
  `.trim();

  return (
    <div className="percentile-indicator">
      <div
        className={`percentile-badge ${tier}`}
        onMouseEnter={() => setTooltipVisible(true)}
        onMouseLeave={() => setTooltipVisible(false)}
        style={{ backgroundColor: color }}
      >
        <span className="icon">{icon}</span>
        <span className="label">{label}</span>
      </div>

      {showTooltip && tooltipVisible && (
        <div className="percentile-tooltip">
          {tooltipText}
        </div>
      )}

      <style>{`
        .percentile-indicator {
          position: relative;
          display: inline-block;
        }

        .percentile-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          border-radius: 16px;
          color: white;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: help;
          transition: transform 0.2s, box-shadow 0.2s;
        }

        .percentile-badge:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }

        .percentile-badge .icon {
          font-size: 1rem;
          line-height: 1;
        }

        .percentile-badge .label {
          white-space: nowrap;
        }

        .percentile-tooltip {
          position: absolute;
          top: calc(100% + 8px);
          left: 50%;
          transform: translateX(-50%);
          background: #1f2937;
          color: white;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.875rem;
          line-height: 1.5;
          white-space: pre-line;
          width: 280px;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.3);
          z-index: 1000;
          animation: fadeIn 0.2s;
        }

        .percentile-tooltip::before {
          content: '';
          position: absolute;
          bottom: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 6px solid transparent;
          border-bottom-color: #1f2937;
        }

        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateX(-50%) translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
          }
        }

        /* Tier-specific styles */
        .percentile-badge.top_10 {
          background: linear-gradient(135deg, #10b981 0%, #059669 100%);
        }

        .percentile-badge.top_25 {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
        }

        .percentile-badge.top_50 {
          background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
        }

        .percentile-badge.bottom_50 {
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
        }

        @media (max-width: 640px) {
          .percentile-tooltip {
            width: 220px;
            font-size: 0.8125rem;
            padding: 10px 12px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Helper functions
 */

type PercentileTier = 'top_10' | 'top_25' | 'top_50' | 'bottom_50';

function getPercentileTier(percentile: number): PercentileTier {
  if (percentile >= 90) return 'top_10';
  if (percentile >= 75) return 'top_25';
  if (percentile >= 50) return 'top_50';
  return 'bottom_50';
}

function getPercentileLabel(percentile: number): string {
  const tier = getPercentileTier(percentile);
  const labels: Record<PercentileTier, string> = {
    top_10: 'Top 10%',
    top_25: 'Top 25%',
    top_50: 'Top 50%',
    bottom_50: 'Bottom 50%',
  };
  return labels[tier];
}

function getPercentileColor(percentile: number): string {
  const tier = getPercentileTier(percentile);
  const colors: Record<PercentileTier, string> = {
    top_10: '#10b981',
    top_25: '#3b82f6',
    top_50: '#f59e0b',
    bottom_50: '#ef4444',
  };
  return colors[tier];
}

function getPercentileIcon(percentile: number): string {
  const tier = getPercentileTier(percentile);
  const icons: Record<PercentileTier, string> = {
    top_10: '🏆',
    top_25: '⭐',
    top_50: '📊',
    bottom_50: '📉',
  };
  return icons[tier];
}

function getMethodologyNote(percentile: number): string {
  if (percentile >= 90) {
    return 'Excellent performance! You are among the top performers in your cohort.';
  } else if (percentile >= 75) {
    return 'Strong performance! You exceed the cohort average significantly.';
  } else if (percentile >= 50) {
    return 'Good performance. You are above the median of your cohort.';
  } else {
    return 'There is room for improvement compared to your cohort peers.';
  }
}
