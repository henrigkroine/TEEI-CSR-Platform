/**
 * Data Visualization Component
 *
 * Auto-detects and renders appropriate visualization for NLQ query results
 * Supports: table, bar chart, line chart, pie chart
 *
 * @module nlq/DataVisualization
 */

import { useState, useEffect, useMemo } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, ArcElement, Title, Tooltip, Legend } from 'chart.js';
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import type { DataVisualizationProps, VisualizationType, VisualizationConfig } from '../../types/nlq';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend
);

export default function DataVisualization({
  data,
  config,
  height = 300,
  onVisualizationChange
}: DataVisualizationProps) {
  const [activeType, setActiveType] = useState<VisualizationType>(
    config?.type || 'table'
  );

  // Auto-detect best visualization type if not specified
  const detectedConfig = useMemo(() => {
    if (config && !config.autoDetected) {
      return config;
    }
    return autoDetectVisualization(data);
  }, [data, config]);

  useEffect(() => {
    if (detectedConfig) {
      setActiveType(detectedConfig.type);
    }
  }, [detectedConfig]);

  const handleTypeChange = (type: VisualizationType) => {
    setActiveType(type);
    onVisualizationChange?.(type);
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 bg-foreground/5 rounded-lg border border-border">
        <p className="text-sm text-foreground/60">No data to visualize</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Visualization Type Selector */}
      <div className="flex items-center gap-2 flex-wrap" role="tablist" aria-label="Visualization types">
        {(['table', 'bar', 'line', 'pie', 'doughnut'] as VisualizationType[]).map((type) => (
          <button
            key={type}
            onClick={() => handleTypeChange(type)}
            className={`
              px-3 py-2 text-sm font-medium rounded-md transition-all min-h-[44px]
              ${activeType === type
                ? 'bg-primary text-white shadow-sm'
                : 'bg-foreground/5 text-foreground/70 hover:bg-foreground/10'
              }
            `}
            role="tab"
            aria-selected={activeType === type}
            aria-label={`${type.charAt(0).toUpperCase() + type.slice(1)} view`}
          >
            {getTypeIcon(type)} {type.charAt(0).toUpperCase() + type.slice(1)}
          </button>
        ))}
      </div>

      {/* Visualization Content */}
      <div className="bg-background border border-border rounded-lg p-4">
        {activeType === 'table' && <TableView data={data} />}
        {activeType === 'bar' && <ChartView data={data} config={detectedConfig} type="bar" height={height} />}
        {activeType === 'line' && <ChartView data={data} config={detectedConfig} type="line" height={height} />}
        {activeType === 'pie' && <ChartView data={data} config={detectedConfig} type="pie" height={height} />}
        {activeType === 'doughnut' && <ChartView data={data} config={detectedConfig} type="doughnut" height={height} />}
      </div>
    </div>
  );
}

/**
 * Table View Component
 */
function TableView({ data }: { data: any[] }) {
  if (data.length === 0) return null;

  const columns = Object.keys(data[0]);

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b-2 border-border">
            {columns.map((col) => (
              <th
                key={col}
                className="px-4 py-3 text-left font-semibold text-foreground/80 bg-foreground/5"
              >
                {formatColumnName(col)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={idx}
              className="border-b border-border hover:bg-foreground/5 transition-colors"
            >
              {columns.map((col) => (
                <td key={col} className="px-4 py-3 text-foreground/90">
                  {formatCellValue(row[col])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * Chart View Component
 */
function ChartView({
  data,
  config,
  type,
  height
}: {
  data: any[];
  config: VisualizationConfig | null;
  type: VisualizationType;
  height: number;
}) {
  const chartData = useMemo(() => {
    if (config?.chartConfig) {
      return config.chartConfig;
    }
    return generateChartData(data, type);
  }, [data, config, type]);

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          boxWidth: 12,
          padding: 15,
          font: { size: 12 }
        }
      },
      tooltip: {
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: 12,
        titleFont: { size: 13 },
        bodyFont: { size: 12 }
      }
    },
    scales: (type === 'bar' || type === 'line') ? {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.05)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    } : undefined
  };

  return (
    <div style={{ height: `${height}px` }}>
      {type === 'bar' && <Bar data={chartData} options={options} />}
      {type === 'line' && <Line data={chartData} options={options} />}
      {type === 'pie' && <Pie data={chartData} options={options} />}
      {type === 'doughnut' && <Doughnut data={chartData} options={options} />}
    </div>
  );
}

/**
 * Auto-detect best visualization type based on data structure
 */
function autoDetectVisualization(data: any[]): VisualizationConfig {
  if (!data || data.length === 0) {
    return { type: 'table', autoDetected: true };
  }

  const firstRow = data[0];
  const columns = Object.keys(firstRow);
  const numericColumns = columns.filter(col =>
    typeof firstRow[col] === 'number'
  );

  // If 2 columns (one label, one value) - good for pie/bar
  if (columns.length === 2 && numericColumns.length === 1) {
    return { type: 'bar', autoDetected: true };
  }

  // If has date/time column - good for line chart
  const hasDateColumn = columns.some(col =>
    col.toLowerCase().includes('date') ||
    col.toLowerCase().includes('time') ||
    col.toLowerCase().includes('period')
  );
  if (hasDateColumn && numericColumns.length > 0) {
    return { type: 'line', autoDetected: true };
  }

  // If multiple numeric columns - bar chart
  if (numericColumns.length > 1) {
    return { type: 'bar', autoDetected: true };
  }

  // Default to table
  return { type: 'table', autoDetected: true };
}

/**
 * Generate Chart.js data structure from raw data
 */
function generateChartData(data: any[], type: VisualizationType) {
  if (data.length === 0) {
    return { labels: [], datasets: [] };
  }

  const firstRow = data[0];
  const columns = Object.keys(firstRow);

  // Find label column (first non-numeric column)
  const labelColumn = columns.find(col => typeof firstRow[col] !== 'number') || columns[0];

  // Find value columns (all numeric columns)
  const valueColumns = columns.filter(col =>
    typeof firstRow[col] === 'number'
  );

  const labels = data.map(row => String(row[labelColumn as string]));

  // Color palettes
  const colors = [
    'rgba(99, 102, 241, 0.8)',   // indigo
    'rgba(16, 185, 129, 0.8)',   // green
    'rgba(245, 158, 11, 0.8)',   // amber
    'rgba(239, 68, 68, 0.8)',    // red
    'rgba(139, 92, 246, 0.8)',   // purple
    'rgba(236, 72, 153, 0.8)',   // pink
  ];

  const datasets = valueColumns.map((col, idx) => ({
    label: formatColumnName(col),
    data: data.map(row => row[col]) as number[],
    backgroundColor: type === 'pie' || type === 'doughnut'
      ? colors
      : colors[idx % colors.length],
    borderColor: type === 'pie' || type === 'doughnut'
      ? colors.map(c => c.replace('0.8', '1'))
      : (colors[idx % colors.length] || colors[0]).replace('0.8', '1'),
    borderWidth: 2,
  }));

  return { labels, datasets };
}

/**
 * Format column name for display
 */
function formatColumnName(col: string): string {
  return col
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase());
}

/**
 * Format cell value for display
 */
function formatCellValue(value: any): string {
  if (value === null || value === undefined) {
    return '-';
  }
  if (typeof value === 'number') {
    return value.toLocaleString();
  }
  if (typeof value === 'boolean') {
    return value ? 'Yes' : 'No';
  }
  return String(value);
}

/**
 * Get icon for visualization type
 */
function getTypeIcon(type: VisualizationType): string {
  const icons = {
    table: '📊',
    bar: '📊',
    line: '📈',
    pie: '🥧',
    doughnut: '🍩',
  };
  return icons[type] || '📊';
}
