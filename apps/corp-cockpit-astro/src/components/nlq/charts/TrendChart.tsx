/**
 * TrendChart Component
 *
 * Time series visualization with optional confidence bands.
 * Optimized for displaying trends over time with zoom/pan capabilities.
 *
 * Features:
 * - Line chart for time series data
 * - Optional confidence intervals
 * - Zoom and pan for large datasets
 * - Responsive and accessible
 * - Export to PNG
 */

import React, { useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import {
  getColors,
  hexToRgba,
  formatDate,
  formatNumber,
  getResponsiveOptions,
  isDarkMode,
  exportChartAsPNG,
  addConfidenceBands,
} from '../../../lib/nlq-chart-utils';
import { adaptiveDownsample, type DataPoint } from '../../../utils/chartOptimizations';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export interface TrendChartProps {
  data: any[];
  xColumn: string;
  yColumns: string[];
  title?: string;
  showConfidenceBands?: boolean;
  confidenceLevel?: number;
  height?: number;
  className?: string;
  unit?: string;
}

/**
 * TrendChart - Line chart for time series data
 */
export default function TrendChart({
  data,
  xColumn,
  yColumns,
  title,
  showConfidenceBands = false,
  confidenceLevel = 0.95,
  height = 400,
  className = '',
  unit,
}: TrendChartProps) {
  const chartRef = useRef<ChartJS<'line'>>(null);
  const [darkMode, setDarkMode] = React.useState(false);

  // Detect dark mode
  React.useEffect(() => {
    setDarkMode(isDarkMode());

    // Listen for theme changes
    const observer = new MutationObserver(() => {
      setDarkMode(isDarkMode());
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  // Prepare chart data with optimization
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { labels: [], datasets: [] };

    // Extract labels
    const labels = data.map((row) => row[xColumn]);
    const colors = getColors(yColumns.length, darkMode);

    // Create datasets for each y column
    const datasets = yColumns.flatMap((column, index) => {
      const rawData: DataPoint[] = data.map((row, i) => ({
        x: i,
        y: row[column] ?? 0,
      }));

      // Downsample if large dataset
      const optimizedData = data.length > 1000
        ? adaptiveDownsample(rawData, { maxPoints: 500, algorithm: 'lttb' })
        : rawData;

      const values = optimizedData.map((point) => point.y);
      const color = colors[index];

      const mainDataset = {
        label: column,
        data: values,
        borderColor: color,
        backgroundColor: hexToRgba(color, 0.1),
        borderWidth: 2,
        pointRadius: data.length > 50 ? 0 : 3,
        pointHoverRadius: 5,
        pointBackgroundColor: color,
        pointBorderColor: '#fff',
        pointBorderWidth: 1,
        tension: 0.4,
        fill: false,
      };

      // Add confidence bands if requested (only for first series)
      if (showConfidenceBands && index === 0) {
        const bands = addConfidenceBands(values, confidenceLevel);

        return [
          // Upper band
          {
            label: `${column} (Upper ${Math.round(confidenceLevel * 100)}%)`,
            data: bands.upper,
            borderColor: hexToRgba(color, 0.3),
            backgroundColor: hexToRgba(color, 0.05),
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0.4,
            fill: '+1',
          },
          // Main line
          mainDataset,
          // Lower band
          {
            label: `${column} (Lower ${Math.round(confidenceLevel * 100)}%)`,
            data: bands.lower,
            borderColor: hexToRgba(color, 0.3),
            backgroundColor: hexToRgba(color, 0.05),
            borderWidth: 1,
            borderDash: [5, 5],
            pointRadius: 0,
            pointHoverRadius: 0,
            tension: 0.4,
            fill: false,
          },
        ];
      }

      return [mainDataset];
    });

    return { labels, datasets };
  }, [data, xColumn, yColumns, darkMode, showConfidenceBands, confidenceLevel]);

  // Chart options
  const options: ChartOptions<'line'> = useMemo(() => {
    const baseOptions = getResponsiveOptions(darkMode);

    return {
      ...baseOptions,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        ...baseOptions.plugins,
        legend: {
          ...baseOptions.plugins?.legend,
          labels: {
            ...baseOptions.plugins?.legend?.labels,
            filter: (item) => {
              // Hide confidence band labels
              return !item.text.includes('Upper') && !item.text.includes('Lower');
            },
          },
        },
        tooltip: {
          ...baseOptions.plugins?.tooltip,
          callbacks: {
            title: (context) => {
              const label = context[0]?.label;
              if (!label) return '';

              // Try to format as date
              try {
                const date = new Date(label);
                if (!isNaN(date.getTime())) {
                  return formatDate(date);
                }
              } catch {
                // Not a date, return as-is
              }

              return label;
            },
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;

              if (value === null) return '';

              const formatted = formatNumber(value, {
                decimals: 2,
                unit: unit || '',
              });

              return `${label}: ${formatted}`;
            },
          },
        },
      },
      scales: {
        x: {
          ...baseOptions.scales?.x,
          ticks: {
            ...baseOptions.scales?.x?.ticks,
            maxRotation: 45,
            minRotation: 0,
            autoSkipPadding: 10,
            callback: function(value, index) {
              const label = this.getLabelForValue(Number(value));

              // Try to format as date
              try {
                const date = new Date(label);
                if (!isNaN(date.getTime())) {
                  return formatDate(date, 'short');
                }
              } catch {
                // Not a date
              }

              // Truncate long labels
              if (label.length > 15) {
                return label.slice(0, 12) + '...';
              }

              return label;
            },
          },
        },
        y: {
          ...baseOptions.scales?.y,
          ticks: {
            ...baseOptions.scales?.y?.ticks,
            callback: (value) => formatNumber(Number(value), { unit: unit || '', compact: true }),
          },
        },
      },
    };
  }, [darkMode, unit]);

  // Handle export
  const handleExport = () => {
    if (chartRef.current) {
      const canvas = chartRef.current.canvas;
      const filename = title ? title.replace(/\s+/g, '_') : 'trend_chart';
      exportChartAsPNG(canvas, filename);
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        )}

        <button
          onClick={handleExport}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          aria-label="Export chart as PNG"
        >
          Export PNG
        </button>
      </div>

      {/* Chart */}
      <div style={{ height: `${height}px` }}>
        {data && data.length > 0 ? (
          <Line ref={chartRef} data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            No data available
          </div>
        )}
      </div>

      {/* Info */}
      {showConfidenceBands && (
        <div className="mt-4 text-xs text-gray-600 dark:text-gray-400">
          Shaded area represents {Math.round(confidenceLevel * 100)}% confidence interval
        </div>
      )}
    </div>
  );
}
