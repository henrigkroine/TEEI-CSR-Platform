/**
 * VirtualizedChart Component
 *
 * Performance-optimized chart component with windowing for large datasets
 * Uses debouncing for zoom/pan interactions and memoization for rendering
 */

import { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
  type ChartData,
} from 'chart.js';
import { Line, Bar } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Title, Tooltip, Legend);

interface DataPoint {
  label: string;
  value: number;
  [key: string]: any;
}

interface Props {
  type: 'line' | 'bar';
  data: DataPoint[];
  title?: string;
  yAxisLabel?: string;
  height?: number;
  windowSize?: number; // Number of visible points at once
  showSkeleton?: boolean;
}

/**
 * Virtualized Chart with performance optimizations:
 * 1. Windowing: Only render visible data points
 * 2. Debouncing: Debounce zoom/pan interactions
 * 3. Memoization: Cache processed data and chart config
 * 4. Progressive loading: Show skeleton while data loads
 * 5. Code splitting ready: Can be lazy-loaded
 */
const VirtualizedChart = memo(function VirtualizedChart({
  type,
  data,
  title,
  yAxisLabel,
  height = 400,
  windowSize = 1000,
  showSkeleton = false,
}: Props) {
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: windowSize });
  const [isLoading, setIsLoading] = useState(showSkeleton);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Virtualize data - only show a window of points
  const virtualizedData = useMemo(() => {
    if (data.length <= windowSize) {
      return data;
    }

    const { start, end } = visibleRange;
    return data.slice(start, Math.min(end, data.length));
  }, [data, visibleRange, windowSize]);

  // Prepare chart data with memoization
  const chartData: ChartData<typeof type> = useMemo(() => {
    return {
      labels: virtualizedData.map((d) => d.label),
      datasets: [
        {
          label: yAxisLabel || 'Value',
          data: virtualizedData.map((d) => d.value),
          backgroundColor: type === 'bar' ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 2,
          pointRadius: type === 'line' && data.length > 100 ? 0 : 3,
          pointHoverRadius: 5,
          fill: type === 'line',
          tension: 0.4,
        },
      ],
    };
  }, [virtualizedData, type, yAxisLabel, data.length]);

  // Debounced range update for smooth scrolling/panning
  const updateVisibleRange = useCallback(
    (start: number, end: number) => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        setVisibleRange({ start: Math.max(0, start), end: Math.min(data.length, end) });
      }, 150);
    },
    [data.length]
  );

  // Chart options with performance optimizations
  const options: ChartOptions<typeof type> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: data.length > 1000 ? 0 : 750, // Disable animations for large datasets
      },
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        title: {
          display: !!title,
          text: title,
          font: {
            size: 16,
            weight: 'bold',
          },
        },
        legend: {
          display: true,
          position: 'top',
        },
        tooltip: {
          enabled: true,
          mode: 'index',
          intersect: false,
          callbacks: {
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y.toLocaleString();
              return `${label}: ${value}`;
            },
          },
        },
      },
      scales: {
        x: {
          grid: {
            display: false,
          },
          ticks: {
            maxRotation: 45,
            minRotation: 0,
            autoSkip: true,
            maxTicksLimit: 20,
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            callback: (value) => value.toLocaleString(),
          },
          title: {
            display: !!yAxisLabel,
            text: yAxisLabel,
          },
        },
      },
      // Optimize for large datasets
      parsing: false,
      normalized: true,
      spanGaps: false,
    }),
    [title, yAxisLabel, data.length]
  );

  // Progressive loading simulation
  useEffect(() => {
    if (showSkeleton) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [showSkeleton]);

  // Cleanup debounce timer
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  // Show skeleton loader
  if (isLoading) {
    return (
      <div className="virtualized-chart-skeleton" style={{ height: `${height}px` }}>
        <div className="skeleton-header"></div>
        <div className="skeleton-bars">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="skeleton-bar" style={{ height: `${Math.random() * 80 + 20}%` }}></div>
          ))}
        </div>
        <style>{`
          .virtualized-chart-skeleton {
            background: white;
            padding: 1.5rem;
            border-radius: 0.5rem;
            display: flex;
            flex-direction: column;
          }

          .skeleton-header {
            height: 2rem;
            width: 40%;
            background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%);
            background-size: 200% 100%;
            animation: shimmer 1.5s ease-in-out infinite;
            border-radius: 0.25rem;
            margin-bottom: 1.5rem;
          }

          .skeleton-bars {
            flex: 1;
            display: flex;
            align-items: flex-end;
            gap: 1rem;
          }

          .skeleton-bar {
            flex: 1;
            background: linear-gradient(90deg, #f3f4f6 0%, #e5e7eb 50%, #f3f4f6 100%);
            background-size: 200% 100%;
            animation: shimmer 1.5s ease-in-out infinite;
            border-radius: 0.25rem 0.25rem 0 0;
            animation-delay: calc(var(--index) * 0.1s);
          }

          @keyframes shimmer {
            0% {
              background-position: 200% 0;
            }
            100% {
              background-position: -200% 0;
            }
          }
        `}</style>
      </div>
    );
  }

  const ChartComponent = type === 'line' ? Line : Bar;

  return (
    <div className="virtualized-chart">
      {/* Performance Stats (for debugging) */}
      {data.length > windowSize && (
        <div className="perf-stats">
          Showing {virtualizedData.length} of {data.length.toLocaleString()} data points
          <span className="perf-badge">Virtualized</span>
        </div>
      )}

      {/* Chart Container */}
      <div className="chart-wrapper" style={{ height: `${height}px` }}>
        <ChartComponent data={chartData} options={options} />
      </div>

      {/* Navigation Controls for large datasets */}
      {data.length > windowSize && (
        <div className="nav-controls">
          <button
            onClick={() => updateVisibleRange(visibleRange.start - windowSize / 2, visibleRange.end - windowSize / 2)}
            disabled={visibleRange.start === 0}
            className="nav-btn"
            aria-label="Show previous data points"
          >
            ← Previous
          </button>
          <span className="range-indicator">
            {visibleRange.start + 1} - {visibleRange.end} of {data.length}
          </span>
          <button
            onClick={() => updateVisibleRange(visibleRange.start + windowSize / 2, visibleRange.end + windowSize / 2)}
            disabled={visibleRange.end >= data.length}
            className="nav-btn"
            aria-label="Show next data points"
          >
            Next →
          </button>
        </div>
      )}

      <style>{`
        .virtualized-chart {
          background: white;
          padding: 1.5rem;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .perf-stats {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 0.75rem;
          color: #6b7280;
          margin-bottom: 1rem;
          padding: 0.5rem 0.75rem;
          background: #f9fafb;
          border-radius: 0.375rem;
          border: 1px solid #e5e7eb;
        }

        .perf-badge {
          padding: 0.125rem 0.5rem;
          background: #10b981;
          color: white;
          border-radius: 0.25rem;
          font-weight: 600;
          font-size: 0.625rem;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .chart-wrapper {
          position: relative;
        }

        .nav-controls {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .nav-btn {
          padding: 0.5rem 1rem;
          background: white;
          border: 1px solid #d1d5db;
          border-radius: 0.375rem;
          font-size: 0.875rem;
          color: #374151;
          cursor: pointer;
          transition: all 0.2s;
        }

        .nav-btn:hover:not(:disabled) {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .nav-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .nav-btn:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .range-indicator {
          font-size: 0.875rem;
          color: #6b7280;
          font-weight: 500;
        }

        @media (max-width: 768px) {
          .virtualized-chart {
            padding: 1rem;
          }

          .nav-controls {
            flex-wrap: wrap;
          }

          .nav-btn {
            flex: 1;
            min-width: 100px;
          }

          .range-indicator {
            width: 100%;
            text-align: center;
            order: -1;
            margin-bottom: 0.5rem;
          }
        }
      `}</style>
    </div>
  );
});

export default VirtualizedChart;

/**
 * Usage Example:
 *
 * ```tsx
 * const largeDataset = Array.from({ length: 5000 }, (_, i) => ({
 *   label: `Point ${i + 1}`,
 *   value: Math.random() * 100,
 * }));
 *
 * <VirtualizedChart
 *   type="line"
 *   data={largeDataset}
 *   title="Performance Over Time"
 *   yAxisLabel="Metric Value"
 *   windowSize={1000}
 *   showSkeleton={true}
 * />
 * ```
 */
