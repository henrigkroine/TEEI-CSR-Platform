/**
 * ChartContainer — Premium wrapper for all Recharts components
 * 
 * Provides consistent styling, loading states, and gradient definitions.
 */

import React, { useEffect, useState } from 'react';
import { ResponsiveContainer } from 'recharts';
import { chartColors, gradientDefs } from '../../lib/chartTheme';

export interface ChartContainerProps {
  children: React.ReactNode;
  height?: number | string;
  title?: string;
  subtitle?: string;
  loading?: boolean;
  empty?: boolean;
  emptyMessage?: string;
  className?: string;
  action?: React.ReactNode;
}

/**
 * Skeleton loader for charts
 */
function ChartSkeleton({ height }: { height: number | string }) {
  return (
    <div 
      className="chart-skeleton"
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
    >
      <div className="chart-skeleton-bars">
        {[40, 65, 50, 80, 45, 70, 55, 75, 60, 85].map((h, i) => (
          <div 
            key={i}
            className="chart-skeleton-bar skeleton"
            style={{ 
              height: `${h}%`,
              animationDelay: `${i * 50}ms`,
            }}
          />
        ))}
      </div>
      <style>{`
        .chart-skeleton {
          display: flex;
          align-items: flex-end;
          justify-content: center;
          padding: 20px;
        }
        .chart-skeleton-bars {
          display: flex;
          align-items: flex-end;
          gap: 8px;
          height: 80%;
          width: 100%;
        }
        .chart-skeleton-bar {
          flex: 1;
          border-radius: 4px 4px 0 0;
        }
      `}</style>
    </div>
  );
}

/**
 * Empty state for charts
 */
function ChartEmpty({ message }: { message: string }) {
  return (
    <div className="chart-empty">
      <svg 
        width="64" 
        height="64" 
        viewBox="0 0 64 64" 
        fill="none"
        className="chart-empty-icon"
      >
        <rect x="8" y="40" width="8" height="16" rx="2" fill="currentColor" opacity="0.2"/>
        <rect x="20" y="28" width="8" height="28" rx="2" fill="currentColor" opacity="0.3"/>
        <rect x="32" y="20" width="8" height="36" rx="2" fill="currentColor" opacity="0.4"/>
        <rect x="44" y="32" width="8" height="24" rx="2" fill="currentColor" opacity="0.3"/>
        <path 
          d="M8 24L20 16L32 20L44 12L56 16" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          opacity="0.5"
        />
      </svg>
      <p className="chart-empty-message">{message}</p>
      <style>{`
        .chart-empty {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100%;
          min-height: 200px;
          color: var(--color-text-tertiary);
        }
        .chart-empty-icon {
          margin-bottom: 16px;
          color: var(--color-primary);
          opacity: 0.5;
        }
        .chart-empty-message {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin: 0;
        }
      `}</style>
    </div>
  );
}

/**
 * Main chart container component
 */
export function ChartContainer({
  children,
  height = 300,
  title,
  subtitle,
  loading = false,
  empty = false,
  emptyMessage = 'No data available',
  className = '',
  action,
}: ChartContainerProps) {
  const [isDark, setIsDark] = useState(false);

  // Detect theme changes
  useEffect(() => {
    const checkTheme = () => {
      const html = document.documentElement;
      setIsDark(
        html.getAttribute('data-theme') === 'dark' ||
        html.classList.contains('dark')
      );
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme', 'class'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className={`chart-container-wrapper ${className}`} data-theme-aware={isDark ? 'dark' : 'light'}>
      {(title || action) && (
        <div className="chart-header">
          <div className="chart-header-content">
            {title && <h3 className="chart-title">{title}</h3>}
            {subtitle && <p className="chart-subtitle">{subtitle}</p>}
          </div>
          {action && <div className="chart-action">{action}</div>}
        </div>
      )}
      
      <div 
        className="chart-body"
        style={{ height: typeof height === 'number' ? `${height}px` : height }}
      >
        {loading ? (
          <ChartSkeleton height={height} />
        ) : empty ? (
          <ChartEmpty message={emptyMessage} />
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            {children as React.ReactElement}
          </ResponsiveContainer>
        )}
      </div>

      <style>{`
        .chart-container-wrapper {
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--card-radius);
          overflow: hidden;
        }

        .chart-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          padding: 20px 24px 0;
        }

        .chart-header-content {
          flex: 1;
        }

        .chart-title {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-semibold);
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: var(--color-text-tertiary);
          margin: 0;
        }

        .chart-subtitle {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin: 4px 0 0;
        }

        .chart-action {
          flex-shrink: 0;
        }

        .chart-body {
          padding: 16px 20px 20px;
        }
      `}</style>
    </div>
  );
}

/**
 * SVG gradient definitions for charts
 */
export function ChartGradients() {
  return (
    <defs>
      {Object.entries(gradientDefs).map(([key, def]) => (
        <linearGradient key={key} id={def.id} x1={def.x1} y1={def.y1} x2={def.x2} y2={def.y2}>
          {def.stops.map((stop, index) => (
            <stop
              key={index}
              offset={stop.offset}
              stopColor={stop.stopColor}
              stopOpacity={stop.stopOpacity}
            />
          ))}
        </linearGradient>
      ))}
      
      {/* Additional custom gradients */}
      <linearGradient id="shimmerGradient" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stopColor={chartColors.primary} stopOpacity="0.1" />
        <stop offset="50%" stopColor={chartColors.primary} stopOpacity="0.3" />
        <stop offset="100%" stopColor={chartColors.primary} stopOpacity="0.1" />
      </linearGradient>
    </defs>
  );
}

export default ChartContainer;



