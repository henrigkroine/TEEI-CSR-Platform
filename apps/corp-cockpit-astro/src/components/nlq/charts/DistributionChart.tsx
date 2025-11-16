/**
 * DistributionChart Component
 *
 * Pie or donut chart for displaying percentage distributions.
 * Best for showing proportions of a whole (e.g., market share, budget allocation).
 *
 * Features:
 * - Pie or donut chart modes
 * - Color-blind friendly palette
 * - Interactive tooltips
 * - Percentage labels
 * - Export to PNG
 */

import React, { useMemo, useRef } from 'react';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Pie, Doughnut } from 'react-chartjs-2';
import {
  getColors,
  hexToRgba,
  formatNumber,
  formatPercentage,
  isDarkMode,
  exportChartAsPNG,
  truncateLabel,
} from '../../../lib/nlq-chart-utils';

ChartJS.register(ArcElement, Tooltip, Legend);

export interface DistributionChartProps {
  data: any[];
  labelColumn: string;
  valueColumn: string;
  title?: string;
  variant?: 'pie' | 'doughnut';
  showPercentages?: boolean;
  height?: number;
  className?: string;
  unit?: string;
}

/**
 * DistributionChart - Pie/Donut chart for distributions
 */
export default function DistributionChart({
  data,
  labelColumn,
  valueColumn,
  title,
  variant = 'doughnut',
  showPercentages = true,
  height = 400,
  className = '',
  unit,
}: DistributionChartProps) {
  const chartRef = useRef<ChartJS<'pie' | 'doughnut'>>(null);
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

  // Calculate total and percentages
  const { total, percentages } = useMemo(() => {
    if (!data || data.length === 0) return { total: 0, percentages: [] };

    const values = data.map((row) => row[valueColumn] ?? 0);
    const sum = values.reduce((a, b) => a + b, 0);

    return {
      total: sum,
      percentages: values.map((v) => (v / sum) * 100),
    };
  }, [data, valueColumn]);

  // Prepare chart data
  const chartData = useMemo(() => {
    if (!data || data.length === 0) return { labels: [], datasets: [] };

    const labels = data.map((row) => truncateLabel(String(row[labelColumn]), 25));
    const values = data.map((row) => row[valueColumn] ?? 0);
    const colors = getColors(data.length, darkMode);

    return {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors.map((color) => hexToRgba(color, 0.8)),
          borderColor: colors,
          borderWidth: 2,
          hoverOffset: 10,
        },
      ],
    };
  }, [data, labelColumn, valueColumn, darkMode]);

  // Chart options
  const options: ChartOptions<'pie' | 'doughnut'> = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          display: true,
          position: 'right' as const,
          labels: {
            color: darkMode ? '#F9FAFB' : '#1F2937',
            padding: 15,
            usePointStyle: true,
            font: {
              size: 12,
            },
            generateLabels: (chart) => {
              const datasets = chart.data.datasets;
              if (!datasets.length) return [];

              const labels = chart.data.labels || [];
              const dataset = datasets[0];

              return labels.map((label, i) => {
                const value = dataset.data[i] as number;
                const percentage = percentages[i];
                const backgroundColor = (dataset.backgroundColor as string[])[i];

                return {
                  text: showPercentages
                    ? `${label} (${formatPercentage(percentage / 100)})`
                    : String(label),
                  fillStyle: backgroundColor,
                  hidden: false,
                  index: i,
                };
              });
            },
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: darkMode ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
          titleColor: darkMode ? '#F9FAFB' : '#1F2937',
          bodyColor: darkMode ? '#F9FAFB' : '#1F2937',
          borderColor: darkMode ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          padding: 12,
          displayColors: true,
          callbacks: {
            label: (context) => {
              const label = context.label || '';
              const value = context.parsed;
              const percentage = percentages[context.dataIndex];

              const formattedValue = formatNumber(value, {
                decimals: 1,
                unit: unit || '',
              });

              const formattedPercentage = formatPercentage(percentage / 100);

              return `${label}: ${formattedValue} (${formattedPercentage})`;
            },
          },
        },
      },
      // Center text for doughnut chart
      cutout: variant === 'doughnut' ? '60%' : '0%',
    };
  }, [darkMode, variant, showPercentages, percentages, unit]);

  // Handle export
  const handleExport = () => {
    if (chartRef.current) {
      const canvas = chartRef.current.canvas;
      const filename = title ? title.replace(/\s+/g, '_') : 'distribution_chart';
      exportChartAsPNG(canvas, filename);
    }
  };

  // Chart component based on variant
  const ChartComponent = variant === 'pie' ? Pie : Doughnut;

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
          <ChartComponent ref={chartRef as any} data={chartData} options={options} />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            No data available
          </div>
        )}
      </div>

      {/* Summary Table */}
      {data && data.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Distribution Breakdown
          </h4>

          <div className="overflow-hidden rounded border border-gray-200 dark:border-gray-700">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-4 py-2 text-left text-gray-700 dark:text-gray-300 font-medium">
                    Category
                  </th>
                  <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">
                    Value
                  </th>
                  <th className="px-4 py-2 text-right text-gray-700 dark:text-gray-300 font-medium">
                    Percentage
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {data.map((row, index) => (
                  <tr
                    key={index}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <td className="px-4 py-2 text-gray-900 dark:text-white">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{
                            backgroundColor: getColors(data.length, darkMode)[index],
                          }}
                        />
                        {row[labelColumn]}
                      </div>
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                      {formatNumber(row[valueColumn], {
                        decimals: 1,
                        unit: unit || '',
                      })}
                    </td>
                    <td className="px-4 py-2 text-right text-gray-900 dark:text-white font-medium">
                      {formatPercentage(percentages[index] / 100)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 dark:bg-gray-700 font-semibold">
                <tr>
                  <td className="px-4 py-2 text-gray-900 dark:text-white">
                    Total
                  </td>
                  <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                    {formatNumber(total, {
                      decimals: 1,
                      unit: unit || '',
                    })}
                  </td>
                  <td className="px-4 py-2 text-right text-gray-900 dark:text-white">
                    100%
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
