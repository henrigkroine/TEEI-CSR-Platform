/**
 * ComparisonChart Component
 *
 * Side-by-side comparison visualization for categorical data with multiple metrics.
 * Uses grouped bar charts for clear comparisons.
 *
 * Features:
 * - Grouped or stacked bar charts
 * - Horizontal or vertical orientation
 * - Responsive and accessible
 * - Export to PNG
 */

import React, { useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  getColors,
  hexToRgba,
  formatNumber,
  getResponsiveOptions,
  isDarkMode,
  exportChartAsPNG,
  truncateLabel,
} from '../../../lib/nlq-chart-utils';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export interface ComparisonChartProps {
  data: any[];
  categoryColumn: string;
  valueColumns: string[];
  title?: string;
  stacked?: boolean;
  horizontal?: boolean;
  height?: number;
  className?: string;
  unit?: string;
}

/**
 * ComparisonChart - Grouped/stacked bar chart for comparisons
 */
export default function ComparisonChart({
  data,
  categoryColumn,
  valueColumns,
  title,
  stacked = false,
  horizontal = false,
  height = 400,
  className = '',
  unit,
}: ComparisonChartProps) {
  const chartRef = useRef<ChartJS<'bar'>>(null);
  const [darkMode, setDarkMode] = React.useState(false);

  // Detect dark mode
  React.useEffect(() => {
    setDarkMode(isDarkMode());

    const observer = new MutationObserver(() => {
      setDarkMode(isDarkMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { labels: [], datasets: [] };

    // Extract labels
    const labels = data.map((row) => truncateLabel(String(row[categoryColumn]), 20));
    const colors = getColors(valueColumns.length, darkMode);

    // Create datasets for each value column
    const datasets = valueColumns.map((column, index) => {
      const color = colors[index];

      return {
        label: column,
        data: data.map((row) => row[column] ?? 0),
        backgroundColor: hexToRgba(color, 0.8),
        borderColor: color,
        borderWidth: 1,
        barThickness: 'flex' as const,
        maxBarThickness: 50,
      };
    });

    return { labels, datasets };
  }, [data, categoryColumn, valueColumns, darkMode]);

  // Chart options
  const options: ChartOptions<'bar'> = useMemo(() => {
    const baseOptions = getResponsiveOptions(darkMode);

    return {
      ...baseOptions,
      indexAxis: horizontal ? ('y' as const) : ('x' as const),
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins?.tooltip,
          callbacks: {
            title: (context) => {
              return context[0]?.label || '';
            },
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y || context.parsed.x;

              if (value === null) return '';

              const formatted = formatNumber(value, {
                decimals: 1,
                unit: unit || '',
              });

              return `${label}: ${formatted}`;
            },
          },
        },
      },
      scales: {
        x: horizontal ? {
          ...baseOptions.scales?.x,
          stacked,
          ticks: {
            ...baseOptions.scales?.x?.ticks,
            callback: (value) => formatNumber(Number(value), { unit: unit || '', compact: true }),
          },
        } : {
          ...baseOptions.scales?.x,
          stacked,
          ticks: {
            ...baseOptions.scales?.x?.ticks,
            maxRotation: 45,
            minRotation: 0,
            autoSkipPadding: 5,
          },
        },
        y: horizontal ? {
          ...baseOptions.scales?.y,
          stacked,
          ticks: {
            ...baseOptions.scales?.y?.ticks,
            autoSkipPadding: 5,
          },
        } : {
          ...baseOptions.scales?.y,
          stacked,
          beginAtZero: true,
          ticks: {
            ...baseOptions.scales?.y?.ticks,
            callback: (value) => formatNumber(Number(value), { unit: unit || '', compact: true }),
          },
        },
      },
    };
  }, [darkMode, horizontal, stacked, unit]);

  // Calculate dynamic height for horizontal charts
  const dynamicHeight = useMemo(() => {
    if (horizontal && data.length > 10) {
      return Math.min(800, Math.max(height, data.length * 40));
    }
    return height;
  }, [horizontal, data, height]);

  // Handle export
  const handleExport = () => {
    if (chartRef.current) {
      const canvas = chartRef.current.canvas;
      const filename = title ? title.replace(/\s+/g, '_') : 'comparison_chart';
      exportChartAsPNG(canvas, filename);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          {title && (
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
          )}
          {stacked && (
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Stacked values
            </p>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={() => {
              // Toggle stacked mode would require state management
              console.log('Toggle stacked mode');
            }}
            className="px-3 py-1 text-sm bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            aria-label="Toggle chart mode"
            title={stacked ? 'Switch to grouped' : 'Switch to stacked'}
          >
            {stacked ? 'Grouped' : 'Stacked'}
          </button>

          <button
            onClick={handleExport}
            className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
            aria-label="Export chart as PNG"
          >
            Export PNG
          </button>
        </div>
      </div>

      {/* Chart */}
      <div style={{ height: `${dynamicHeight}px` }}>
        {data && data.length > 0 ? (
          <Bar ref={chartRef} data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            No data available
          </div>
        )}
      </div>

      {/* Summary stats */}
      {data && data.length > 0 && (
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
          {valueColumns.map((column, index) => {
            const values = data.map((row) => row[column] ?? 0);
            const total = values.reduce((a, b) => a + b, 0);
            const avg = total / values.length;
            const max = Math.max(...values);

            return (
              <div
                key={column}
                className="p-3 bg-gray-50 dark:bg-gray-700 rounded border-l-4"
                style={{ borderLeftColor: getColors(valueColumns.length, darkMode)[index] }}
              >
                <div className="text-xs text-gray-600 dark:text-gray-400 font-medium mb-1">
                  {column}
                </div>
                <div className="text-sm text-gray-900 dark:text-white">
                  Avg: {formatNumber(avg, { decimals: 1, unit: unit || '' })}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Max: {formatNumber(max, { decimals: 1, unit: unit || '' })}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
