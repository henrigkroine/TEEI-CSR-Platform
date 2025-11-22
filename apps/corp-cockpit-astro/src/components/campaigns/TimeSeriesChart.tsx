/**
 * TimeSeriesChart Component
 *
 * SWARM 6: Agent 6.2 - campaign-detail-dashboard
 *
 * Multi-line chart showing campaign metrics over time:
 * - Participants (volunteers + beneficiaries)
 * - Hours Logged
 * - SROI Score
 *
 * Features:
 * - Granularity toggle (weekly/monthly/quarterly)
 * - Responsive and accessible
 * - Legend with toggleable series
 */

import React, { useMemo } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  type ChartOptions,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export interface TimeSeriesDataPoint {
  date: string;
  sroi: number | null;
  vis: number | null;
  hours: number;
  sessions: number;
  volunteersUtilization: number;
  beneficiariesUtilization: number;
  budgetUtilization: number;
}

export interface TimeSeriesChartProps {
  dataPoints: TimeSeriesDataPoint[];
  granularity: 'week' | 'month' | 'quarter';
  onGranularityChange: (granularity: 'week' | 'month' | 'quarter') => void;
  height?: number;
}

/**
 * Format date based on granularity
 */
function formatDate(dateStr: string, granularity: string): string {
  const date = new Date(dateStr);

  switch (granularity) {
    case 'week':
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    case 'month':
      return date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
    case 'quarter':
      const quarter = Math.floor(date.getMonth() / 3) + 1;
      return `Q${quarter} ${date.getFullYear()}`;
    default:
      return date.toLocaleDateString('en-US');
  }
}

/**
 * TimeSeriesChart - Line chart for campaign metrics over time
 */
export default function TimeSeriesChart({
  dataPoints,
  granularity,
  onGranularityChange,
  height = 400,
}: TimeSeriesChartProps) {
  const chartData = useMemo(() => {
    const labels = dataPoints.map((dp) => formatDate(dp.date, granularity));
    const hours = dataPoints.map((dp) => dp.hours);
    const sroi = dataPoints.map((dp) => dp.sroi || 0);
    const sessions = dataPoints.map((dp) => dp.sessions);

    return {
      labels,
      datasets: [
        {
          label: 'Hours Logged',
          data: hours,
          borderColor: '#3b82f6', // blue-500
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          yAxisID: 'y',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: 'SROI Score',
          data: sroi,
          borderColor: '#10b981', // green-500
          backgroundColor: 'rgba(16, 185, 129, 0.1)',
          yAxisID: 'y1',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
        {
          label: 'Sessions',
          data: sessions,
          borderColor: '#f59e0b', // amber-500
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          yAxisID: 'y',
          tension: 0.3,
          borderWidth: 2,
          pointRadius: 3,
          pointHoverRadius: 5,
        },
      ],
    };
  }, [dataPoints, granularity]);

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
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 15,
            font: {
              size: 12,
            },
          },
        },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleFont: {
            size: 14,
            weight: 'bold',
          },
          bodyFont: {
            size: 13,
          },
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (context.dataset.label === 'SROI Score') {
                  label += context.parsed.y.toFixed(2);
                } else {
                  label += context.parsed.y.toLocaleString();
                }
              }
              return label;
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
            font: {
              size: 11,
            },
          },
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Hours / Sessions',
            font: {
              size: 12,
            },
          },
          grid: {
            color: 'rgba(0, 0, 0, 0.05)',
          },
          ticks: {
            font: {
              size: 11,
            },
          },
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'SROI Score',
            font: {
              size: 12,
            },
          },
          grid: {
            drawOnChartArea: false,
          },
          ticks: {
            font: {
              size: 11,
            },
          },
        },
      },
    }),
    []
  );

  return (
    <div className="time-series-chart">
      <div className="chart-header">
        <h3>Metrics Over Time</h3>
        <div className="granularity-toggle" role="tablist" aria-label="Time granularity">
          <button
            type="button"
            role="tab"
            aria-selected={granularity === 'week'}
            className={`toggle-btn ${granularity === 'week' ? 'active' : ''}`}
            onClick={() => onGranularityChange('week')}
          >
            Weekly
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={granularity === 'month'}
            className={`toggle-btn ${granularity === 'month' ? 'active' : ''}`}
            onClick={() => onGranularityChange('month')}
          >
            Monthly
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={granularity === 'quarter'}
            className={`toggle-btn ${granularity === 'quarter' ? 'active' : ''}`}
            onClick={() => onGranularityChange('quarter')}
          >
            Quarterly
          </button>
        </div>
      </div>

      <div className="chart-container" style={{ height: `${height}px` }}>
        <Line data={chartData} options={options} />
      </div>

      <style jsx>{`
        .time-series-chart {
          background: white;
          border-radius: 12px;
          padding: 1.5rem;
          border: 1px solid #e5e7eb;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 1.5rem;
          flex-wrap: wrap;
          gap: 1rem;
        }

        .chart-header h3 {
          font-size: 1rem;
          font-weight: 600;
          color: #111827;
          margin: 0;
        }

        .granularity-toggle {
          display: flex;
          gap: 0.5rem;
          background: #f3f4f6;
          padding: 0.25rem;
          border-radius: 8px;
        }

        .toggle-btn {
          padding: 0.5rem 1rem;
          border: none;
          background: transparent;
          color: #6b7280;
          font-size: 0.875rem;
          font-weight: 500;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .toggle-btn:hover {
          color: #374151;
          background: #e5e7eb;
        }

        .toggle-btn.active {
          background: white;
          color: #111827;
          box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
        }

        .toggle-btn:focus {
          outline: none;
          ring: 2px solid #3b82f6;
        }

        .chart-container {
          position: relative;
          width: 100%;
        }

        @media (max-width: 768px) {
          .chart-header {
            flex-direction: column;
            align-items: flex-start;
          }

          .granularity-toggle {
            width: 100%;
            justify-content: space-between;
          }

          .toggle-btn {
            flex: 1;
            padding: 0.625rem 0.5rem;
            font-size: 0.8125rem;
          }
        }
      `}</style>
    </div>
  );
}
