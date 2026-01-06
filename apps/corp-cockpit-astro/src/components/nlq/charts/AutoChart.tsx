/**
 * AutoChart Component
 *
 * Automatically detects the best chart type for displaying NLQ results.
 * Analyzes data structure and selects appropriate visualization.
 *
 * Features:
 * - Automatic chart type detection
 * - Fallback to table if unsure
 * - Manual override option
 * - Supports 100-10,000 data points efficiently
 * - Confidence indicator
 */

import React, { useMemo, useState } from 'react';
import { detectChartType, validateChartType, type ChartType } from '../../../lib/chart-detection';
import TrendChart from './TrendChart';
import ComparisonChart from './ComparisonChart';
import DistributionChart from './DistributionChart';
import DataTable from './DataTable';
import { Bar } from 'react-chartjs-2';
import { getColors, hexToRgba, formatNumber, getResponsiveOptions, isDarkMode } from '../../../lib/nlq-chart-utils';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Tooltip,
  Legend,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

export interface AutoChartProps {
  data: any[];
  title?: string;
  /** Override automatic detection */
  forceChartType?: ChartType;
  /** Show detection confidence */
  showConfidence?: boolean;
  /** Allow manual chart type selection */
  allowOverride?: boolean;
  height?: number;
  className?: string;
  unit?: string;
}

/**
 * AutoChart - Automatically select best visualization
 */
export default function AutoChart({
  data,
  title,
  forceChartType,
  showConfidence = false,
  allowOverride = true,
  height = 400,
  className = '',
  unit,
}: AutoChartProps) {
  const [darkMode, setDarkMode] = React.useState(false);
  const [manualOverride, setManualOverride] = useState<ChartType | null>(null);

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

  // Detect chart type
  const detection = useMemo(() => {
    if (!data || data.length === 0) {
      return {
        chartType: 'table' as ChartType,
        confidence: 1.0,
        reasoning: 'No data provided',
        columns: [],
      };
    }

    return detectChartType(data);
  }, [data]);

  // Determine final chart type
  const finalChartType = forceChartType || manualOverride || detection.chartType;

  // Validate chart type
  const validation = useMemo(() => {
    return validateChartType(data, finalChartType);
  }, [data, finalChartType]);

  // Render appropriate chart component
  const renderChart = () => {
    if (!data || data.length === 0) {
      return (
        <div className="flex items-center justify-center h-64 text-gray-500 dark:text-gray-400">
          No data to display
        </div>
      );
    }

    if (!validation.valid) {
      return (
        <div className="p-6 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
          <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
            Chart type not suitable
          </h4>
          <ul className="text-sm text-yellow-800 dark:text-yellow-300 list-disc list-inside">
            {validation.errors.map((error, index) => (
              <li key={index}>{error}</li>
            ))}
          </ul>
          <p className="text-sm text-yellow-800 dark:text-yellow-300 mt-2">
            Falling back to table view.
          </p>
          <div className="mt-4">
            <DataTable data={data} title={title} height={height} />
          </div>
        </div>
      );
    }

    const config = detection.suggestedConfig || {};

    switch (finalChartType) {
      case 'line':
        return (
          <TrendChart
            data={data}
            xColumn={config.xColumn || Object.keys(data[0])[0]}
            yColumns={config.yColumns || [Object.keys(data[0])[1]]}
            title={title}
            height={height}
            unit={unit}
          />
        );

      case 'comparison':
        return (
          <ComparisonChart
            data={data}
            categoryColumn={config.categoryColumn || Object.keys(data[0])[0]}
            valueColumns={config.valueColumns || Object.keys(data[0]).slice(1)}
            title={title}
            height={height}
            unit={unit}
          />
        );

      case 'pie':
      case 'doughnut':
        return (
          <DistributionChart
            data={data}
            labelColumn={config.labelColumn || Object.keys(data[0])[0]}
            valueColumn={config.valueColumn || Object.keys(data[0])[1]}
            title={title}
            variant={finalChartType}
            height={height}
            unit={unit}
          />
        );

      case 'bar':
        return <SimpleBarChart data={data} config={config} title={title} height={height} unit={unit} darkMode={darkMode} />;

      case 'table':
      default:
        return <DataTable data={data} title={title} height={height} />;
    }
  };

  return (
    <div className={className}>
      {/* Detection Info & Controls */}
      {(showConfidence || allowOverride) && (
        <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
          {showConfidence && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Auto-detected: <span className="text-blue-600 dark:text-blue-400">{detection.chartType}</span>
                </span>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  Confidence: {Math.round(detection.confidence * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div
                  className="bg-blue-600 dark:bg-blue-400 h-2 rounded-full transition-all"
                  style={{ width: `${detection.confidence * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {detection.reasoning}
              </p>
            </div>
          )}

          {allowOverride && (
            <div className="flex flex-wrap gap-2">
              <span className="text-sm text-gray-700 dark:text-gray-300 mr-2">Override:</span>
              {(['bar', 'line', 'pie', 'table'] as ChartType[]).map((type) => (
                <button
                  key={type}
                  onClick={() => setManualOverride(type === finalChartType ? null : type)}
                  className={`px-3 py-1 text-xs rounded transition-colors ${
                    type === finalChartType
                      ? 'bg-blue-600 text-white'
                      : 'bg-white dark:bg-gray-600 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-500 hover:bg-gray-100 dark:hover:bg-gray-500'
                  }`}
                  aria-label={`Switch to ${type} chart`}
                >
                  {type.charAt(0).toUpperCase() + type.slice(1)}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chart */}
      {renderChart()}
    </div>
  );
}

/**
 * Simple Bar Chart Component
 * Used when AutoChart selects bar chart type
 */
function SimpleBarChart({
  data,
  config,
  title,
  height,
  unit,
  darkMode,
}: {
  data: any[];
  config: any;
  title?: string;
  height: number;
  unit?: string;
  darkMode: boolean;
}) {
  const chartRef = React.useRef<ChartJS<'bar'>>(null);

  const chartData = useMemo(() => {
    const xColumn = config.xColumn || Object.keys(data[0])[0];
    const yColumn = config.yColumn || Object.keys(data[0])[1];

    const labels = data.map((row) => String(row[xColumn]));
    const values = data.map((row) => row[yColumn] ?? 0);
    const colors = getColors(1, darkMode);

    return {
      labels,
      datasets: [
        {
          label: yColumn,
          data: values,
          backgroundColor: hexToRgba(colors[0], 0.8),
          borderColor: colors[0],
          borderWidth: 1,
        },
      ],
    };
  }, [data, config, darkMode]);

  const options = useMemo(() => {
    const baseOptions = getResponsiveOptions(darkMode);

    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          ...baseOptions.plugins?.tooltip,
          callbacks: {
            label: (context: any) => {
              const value = context.parsed.y;
              return formatNumber(value, { decimals: 1, unit: unit || '' });
            },
          },
        },
      },
      scales: {
        ...baseOptions.scales,
        y: {
          ...baseOptions.scales?.y,
          beginAtZero: true,
          ticks: {
            ...baseOptions.scales?.y?.ticks,
            callback: (value: any) => formatNumber(Number(value), { unit: unit || '', compact: true }),
          },
        },
      },
    };
  }, [darkMode, unit]);

  const handleExport = () => {
    if (chartRef.current) {
      const canvas = chartRef.current.canvas;
      const link = document.createElement('a');
      link.download = title ? `${title.replace(/\s+/g, '_')}.png` : 'chart.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
      <div className="flex items-center justify-between mb-4">
        {title && (
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h3>
        )}
        <button
          onClick={handleExport}
          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Export PNG
        </button>
      </div>
      <div style={{ height: `${height}px` }}>
        <Bar ref={chartRef} data={chartData} options={options} />
      </div>
    </div>
  );
}
