/**
 * PercentileRibbon Component
 *
 * Visualizes percentile distribution (p10, p50, p90) with company position marker.
 * Shows privacy-preserving differential privacy badge when DP is applied.
 *
 * @author percentile-viz-engineer
 */

import { useEffect, useRef } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from 'chart.js';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

export interface MetricData {
  name: string;
  unit?: string; // e.g., "$", "pts", "%"
  p10: number;
  p50: number;
  p90: number;
  yourValue: number;
  dpApplied?: boolean; // Show privacy notice
}

interface PercentileRibbonProps {
  metric: MetricData;
  timeRange?: 'month' | 'quarter' | 'year';
}

export default function PercentileRibbon({ metric, timeRange = 'quarter' }: PercentileRibbonProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef = useRef<ChartJS | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    // Destroy existing chart
    if (chartRef.current) {
      chartRef.current.destroy();
    }

    // For single point visualization (no time series)
    const labels = ['Current'];
    const p10Data = [metric.p10];
    const p50Data = [metric.p50];
    const p90Data = [metric.p90];
    const yourData = [metric.yourValue];

    const config: ChartConfiguration = {
      type: 'line',
      data: {
        labels,
        datasets: [
          // P90 upper bound (invisible, for fill reference)
          {
            label: 'P90 (90th percentile)',
            data: p90Data,
            borderColor: 'rgba(203, 213, 225, 0)',
            backgroundColor: 'rgba(203, 213, 225, 0)',
            pointRadius: 0,
            fill: false,
          },
          // P10-P90 ribbon (shaded area)
          {
            label: 'P10-P90 Range',
            data: p10Data,
            borderColor: 'rgba(203, 213, 225, 0.3)',
            backgroundColor: 'rgba(226, 232, 240, 0.5)',
            pointRadius: 0,
            fill: '-1', // Fill to previous dataset (P90)
            tension: 0.4,
          },
          // P50 median line (bold)
          {
            label: 'P50 (Median)',
            data: p50Data,
            borderColor: '#3b82f6',
            backgroundColor: '#3b82f6',
            borderWidth: 3,
            pointRadius: 6,
            pointHoverRadius: 8,
            tension: 0.4,
          },
          // Your company's value (red dot)
          {
            label: `Your Value: ${formatValue(metric.yourValue, metric.unit)}`,
            data: yourData,
            borderColor: '#ef4444',
            backgroundColor: '#ef4444',
            pointRadius: 8,
            pointHoverRadius: 10,
            pointStyle: 'circle',
            showLine: false,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              usePointStyle: true,
              padding: 15,
              font: {
                size: 12,
              },
              filter: (item) => {
                // Hide P90 invisible dataset from legend
                return item.text !== 'P90 (90th percentile)';
              },
            },
          },
          tooltip: {
            mode: 'index',
            intersect: false,
            callbacks: {
              label: (context) => {
                const label = context.dataset.label || '';
                const value = context.parsed.y;
                return `${label}: ${formatValue(value, metric.unit)}`;
              },
            },
          },
        },
        scales: {
          y: {
            beginAtZero: metric.unit === '%' ? false : true,
            title: {
              display: true,
              text: metric.name,
              font: {
                weight: 'bold',
                size: 13,
              },
            },
            ticks: {
              callback: (value) => formatValue(Number(value), metric.unit),
            },
          },
          x: {
            display: false, // Hide x-axis for single point
          },
        },
      },
    };

    chartRef.current = new ChartJS(ctx, config);

    return () => {
      if (chartRef.current) {
        chartRef.current.destroy();
      }
    };
  }, [metric, timeRange]);

  const getPercentilePosition = (): { percentile: number; label: string } => {
    const { p10, p50, p90, yourValue } = metric;

    if (yourValue >= p90) {
      return { percentile: 90, label: 'Top 10%' };
    } else if (yourValue >= p50) {
      const range = p90 - p50;
      const position = ((yourValue - p50) / range) * 40 + 50;
      return { percentile: Math.round(position), label: `${Math.round(position)}th percentile` };
    } else if (yourValue >= p10) {
      const range = p50 - p10;
      const position = ((yourValue - p10) / range) * 40 + 10;
      return { percentile: Math.round(position), label: `${Math.round(position)}th percentile` };
    } else {
      return { percentile: 10, label: 'Bottom 10%' };
    }
  };

  const position = getPercentilePosition();

  return (
    <div className="percentile-ribbon">
      <div className="ribbon-header">
        <div>
          <h3>{metric.name}</h3>
          <p className="metric-description">Your performance compared to peer cohort</p>
        </div>
        {metric.dpApplied && (
          <div className="privacy-badge" role="status" aria-label="Privacy protection applied">
            <span aria-hidden="true">🔒</span>
            <span>Privacy-protected (ε=0.1)</span>
          </div>
        )}
      </div>

      <div className="chart-container">
        <canvas
          ref={canvasRef}
          role="img"
          aria-label={`Percentile ribbon chart for ${metric.name}. Your value: ${formatValue(metric.yourValue, metric.unit)}, Median (P50): ${formatValue(metric.p50, metric.unit)}, P10: ${formatValue(metric.p10, metric.unit)}, P90: ${formatValue(metric.p90, metric.unit)}`}
        />
      </div>

      <div className="percentile-summary">
        <div className="summary-card">
          <div className="summary-label">Your Position</div>
          <div className="summary-value position-badge">{position.label}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Your Value</div>
          <div className="summary-value">{formatValue(metric.yourValue, metric.unit)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Median (P50)</div>
          <div className="summary-value">{formatValue(metric.p50, metric.unit)}</div>
        </div>
        <div className="summary-card">
          <div className="summary-label">Top 10% (P90)</div>
          <div className="summary-value">{formatValue(metric.p90, metric.unit)}</div>
        </div>
      </div>

      <style>{`
        .percentile-ribbon {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
          margin-bottom: 24px;
        }

        .ribbon-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          gap: 16px;
        }

        .ribbon-header h3 {
          margin: 0 0 4px 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .metric-description {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .privacy-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #fef3c7;
          border: 1px solid #fbbf24;
          border-radius: 6px;
          font-size: 0.8125rem;
          font-weight: 500;
          color: #92400e;
        }

        .chart-container {
          position: relative;
          height: 300px;
          margin-bottom: 24px;
        }

        .percentile-summary {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
          gap: 16px;
        }

        .summary-card {
          background: #f9fafb;
          padding: 16px;
          border-radius: 8px;
          text-align: center;
        }

        .summary-label {
          font-size: 0.8125rem;
          color: #6b7280;
          margin-bottom: 6px;
          font-weight: 500;
        }

        .summary-value {
          font-size: 1.25rem;
          font-weight: 700;
          color: #1f2937;
        }

        .position-badge {
          color: #3b82f6;
        }

        @media (max-width: 768px) {
          .percentile-ribbon {
            padding: 16px;
          }

          .ribbon-header {
            flex-direction: column;
          }

          .chart-container {
            height: 250px;
          }

          .percentile-summary {
            grid-template-columns: 1fr 1fr;
          }
        }

        @media (max-width: 480px) {
          .percentile-summary {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}

// Utility function to format values with units
function formatValue(value: number, unit?: string): string {
  if (unit === '$') {
    return `$${value.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  } else if (unit === '%') {
    return `${value.toFixed(1)}%`;
  } else if (unit === 'pts') {
    return `${value.toFixed(1)} pts`;
  } else if (unit) {
    return `${value.toLocaleString('en-US')} ${unit}`;
  } else {
    return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
  }
}
