/**
 * PercentileChart Component
 *
 * Displays time-series percentile bands showing company performance over time
 * compared to cohort distribution (25th, 50th, 75th percentiles)
 */

import { useMemo, useState } from 'react';
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

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

interface PercentileDataPoint {
  period: string; // e.g., "2024-Q1", "2024-Q2"
  company_value: number;
  p25: number; // 25th percentile
  p50: number; // 50th percentile (median)
  p75: number; // 75th percentile
  p90?: number; // 90th percentile (optional)
  cohort_average: number;
}

interface PercentileData {
  metric: string;
  metric_label: string;
  unit: string;
  data_points: PercentileDataPoint[];
}

interface Props {
  data: PercentileData;
  metric: string;
  companyName: string;
}

export default function PercentileChart({ data, metric, companyName }: Props) {
  const [hoveredPeriod, setHoveredPeriod] = useState<string | null>(null);

  if (!data || !data.data_points || data.data_points.length === 0) {
    return (
      <div className="percentile-chart empty">
        <p>No time-series data available for this metric</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData = useMemo(() => {
    const labels = data.data_points.map((dp) => dp.period);

    return {
      labels,
      datasets: [
        // 75th-100th percentile band (top performers) - lightest
        {
          label: '75th-100th Percentile',
          data: data.data_points.map((dp) => dp.p75),
          fill: 'origin',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          borderColor: 'rgba(34, 197, 94, 0.3)',
          borderWidth: 1,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.4,
        },
        // 50th-75th percentile band - medium
        {
          label: '50th-75th Percentile',
          data: data.data_points.map((dp) => dp.p50),
          fill: 'origin',
          backgroundColor: 'rgba(59, 130, 246, 0.15)',
          borderColor: 'rgba(59, 130, 246, 0.4)',
          borderWidth: 1,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.4,
        },
        // 25th-50th percentile band - darker
        {
          label: '25th-50th Percentile',
          data: data.data_points.map((dp) => dp.p25),
          fill: 'origin',
          backgroundColor: 'rgba(251, 146, 60, 0.15)',
          borderColor: 'rgba(251, 146, 60, 0.4)',
          borderWidth: 1,
          pointRadius: 0,
          pointHoverRadius: 0,
          tension: 0.4,
        },
        // Cohort median line
        {
          label: 'Cohort Median',
          data: data.data_points.map((dp) => dp.p50),
          fill: false,
          backgroundColor: 'rgba(107, 114, 128, 0.8)',
          borderColor: 'rgba(107, 114, 128, 0.8)',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 3,
          pointHoverRadius: 5,
          tension: 0.4,
        },
        // Company line - highlighted
        {
          label: companyName,
          data: data.data_points.map((dp) => dp.company_value),
          fill: false,
          backgroundColor: 'rgba(59, 130, 246, 1)',
          borderColor: 'rgba(59, 130, 246, 1)',
          borderWidth: 3,
          pointRadius: 4,
          pointHoverRadius: 6,
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          tension: 0.4,
        },
      ],
    };
  }, [data, companyName]);

  // Chart options
  const options: ChartOptions<'line'> = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: true,
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
            },
            filter: (item) => {
              // Only show company and median in legend
              return item.text === companyName || item.text === 'Cohort Median';
            },
          },
        },
        tooltip: {
          enabled: true,
          backgroundColor: 'rgba(31, 41, 55, 0.95)',
          titleColor: '#fff',
          bodyColor: '#fff',
          padding: 12,
          borderColor: 'rgba(107, 114, 128, 0.3)',
          borderWidth: 1,
          displayColors: true,
          callbacks: {
            title: (context) => {
              return context[0] ? `Period: ${context[0].label}` : '';
            },
            label: (context) => {
              const label = context.dataset.label || '';
              const value = context.parsed.y;
              return value !== null ? `${label}: ${formatValue(value, data.unit)}` : '';
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
            font: {
              size: 11,
            },
          },
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(229, 231, 235, 0.5)',
          },
          ticks: {
            font: {
              size: 11,
            },
            callback: (value) => formatValue(Number(value), data.unit),
          },
        },
      },
    }),
    [data.unit, companyName]
  );

  // Find current period stats (already checked for empty array above)
  const currentPeriod = data.data_points[data.data_points.length - 1]!;
  const companyPercentile = calculatePercentile(
    currentPeriod.company_value,
    currentPeriod.p25,
    currentPeriod.p50,
    currentPeriod.p75
  );

  return (
    <div className="percentile-chart">
      {/* Header */}
      <div className="chart-header">
        <div className="title-section">
          <h2 id="percentile-trends-heading">Percentile Trends Over Time</h2>
          <p className="subtitle">
            Track your {data.metric_label.toLowerCase()} performance relative to cohort distribution
          </p>
        </div>
      </div>

      {/* Current Period Stats */}
      <div className="current-stats">
        <div className="stat-card company-stat">
          <div className="stat-label">Your Current Value</div>
          <div className="stat-value">{formatValue(currentPeriod.company_value, data.unit)}</div>
          <div className="stat-note">
            {companyPercentile}th percentile — {getPercentileDescription(companyPercentile)}
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-label">Cohort Median (50th)</div>
          <div className="stat-value">{formatValue(currentPeriod.p50, data.unit)}</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">75th Percentile</div>
          <div className="stat-value">{formatValue(currentPeriod.p75, data.unit)}</div>
          <div className="stat-note">Top 25% of companies</div>
        </div>

        <div className="stat-card">
          <div className="stat-label">25th Percentile</div>
          <div className="stat-value">{formatValue(currentPeriod.p25, data.unit)}</div>
          <div className="stat-note">Bottom 25% threshold</div>
        </div>
      </div>

      {/* Chart */}
      <div className="chart-container">
        <Line data={chartData} options={options} />
      </div>

      {/* Legend Explanation */}
      <div className="legend-explanation">
        <h4>Understanding Percentile Bands</h4>
        <div className="explanation-grid">
          <div className="explanation-item">
            <div className="band-indicator top-band"></div>
            <div className="band-text">
              <strong>75th-100th Percentile (Green):</strong> Top performers in the cohort
            </div>
          </div>
          <div className="explanation-item">
            <div className="band-indicator mid-band"></div>
            <div className="band-text">
              <strong>50th-75th Percentile (Blue):</strong> Above-average performance
            </div>
          </div>
          <div className="explanation-item">
            <div className="band-indicator low-band"></div>
            <div className="band-text">
              <strong>25th-50th Percentile (Orange):</strong> Below-average performance
            </div>
          </div>
          <div className="explanation-item">
            <div className="band-indicator company-line"></div>
            <div className="band-text">
              <strong>Your Company (Blue Line):</strong> Your performance trend over time
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .percentile-chart {
          background: white;
          padding: 1.5rem;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .percentile-chart.empty {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }

        .chart-header {
          margin-bottom: 1.5rem;
        }

        .title-section h2 {
          margin: 0 0 0.25rem 0;
          font-size: 1.5rem;
          font-weight: 600;
          color: #1f2937;
        }

        .title-section .subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .current-stats {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .stat-card {
          padding: 1rem;
          background: #f9fafb;
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
        }

        .stat-card.company-stat {
          background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
          border-color: #93c5fd;
        }

        .stat-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 0.5rem;
        }

        .stat-value {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1f2937;
          margin-bottom: 0.25rem;
        }

        .company-stat .stat-value {
          color: #1e40af;
        }

        .stat-note {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .chart-container {
          height: 400px;
          margin-bottom: 2rem;
        }

        .legend-explanation {
          padding: 1.5rem;
          background: #f9fafb;
          border-radius: 0.5rem;
          border: 1px solid #e5e7eb;
        }

        .legend-explanation h4 {
          margin: 0 0 1rem 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .explanation-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 1rem;
        }

        .explanation-item {
          display: flex;
          align-items: flex-start;
          gap: 0.75rem;
        }

        .band-indicator {
          width: 3rem;
          height: 1.5rem;
          border-radius: 0.25rem;
          flex-shrink: 0;
        }

        .band-indicator.top-band {
          background: rgba(34, 197, 94, 0.3);
          border: 1px solid rgba(34, 197, 94, 0.5);
        }

        .band-indicator.mid-band {
          background: rgba(59, 130, 246, 0.3);
          border: 1px solid rgba(59, 130, 246, 0.5);
        }

        .band-indicator.low-band {
          background: rgba(251, 146, 60, 0.3);
          border: 1px solid rgba(251, 146, 60, 0.5);
        }

        .band-indicator.company-line {
          background: white;
          border: 3px solid rgba(59, 130, 246, 1);
          height: 0.25rem;
          align-self: center;
        }

        .band-text {
          font-size: 0.875rem;
          color: #4b5563;
          line-height: 1.5;
        }

        .band-text strong {
          color: #1f2937;
          display: block;
          margin-bottom: 0.125rem;
        }

        @media (max-width: 768px) {
          .percentile-chart {
            padding: 1rem;
          }

          .current-stats {
            grid-template-columns: 1fr;
          }

          .chart-container {
            height: 300px;
          }

          .explanation-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Helper: Format value with unit
 */
function formatValue(value: number, unit: string): string {
  const formatted = value.toLocaleString(undefined, {
    maximumFractionDigits: unit === 'ratio' ? 1 : 0,
  });

  switch (unit) {
    case 'ratio':
      return `${formatted}:1`;
    case '%':
      return `${formatted}%`;
    case 'hours':
      return `${formatted} hrs`;
    case 'count':
      return formatted;
    case 'score':
      return formatted;
    default:
      return `${formatted} ${unit}`;
  }
}

/**
 * Helper: Calculate percentile based on company value and distribution
 */
function calculatePercentile(companyValue: number, p25: number, p50: number, p75: number): number {
  if (companyValue <= p25) {
    // Below 25th percentile - interpolate between 0 and 25
    return Math.max(0, Math.round((companyValue / p25) * 25));
  } else if (companyValue <= p50) {
    // Between 25th and 50th
    return Math.round(25 + ((companyValue - p25) / (p50 - p25)) * 25);
  } else if (companyValue <= p75) {
    // Between 50th and 75th
    return Math.round(50 + ((companyValue - p50) / (p75 - p50)) * 25);
  } else {
    // Above 75th percentile - interpolate between 75 and 100
    return Math.min(100, Math.round(75 + ((companyValue - p75) / (p75 * 0.3)) * 25));
  }
}

/**
 * Helper: Get description for percentile
 */
function getPercentileDescription(percentile: number): string {
  if (percentile >= 90) return 'Top 10%';
  if (percentile >= 75) return 'Top 25%';
  if (percentile >= 50) return 'Above median';
  return 'Below median';
}
