/**
 * BenchmarkCharts Component
 *
 * Displays comparison charts between company and cohort
 */

import { useState } from 'react';
import PercentileIndicator from './PercentileIndicator';

interface BenchmarkData {
  metric: string;
  metric_label: string;
  company_value: number;
  cohort_average: number;
  cohort_median: number;
  cohort_min: number;
  cohort_max: number;
  percentile: number;
  unit: string;
  trend?: 'up' | 'down' | 'stable';
}

interface Props {
  benchmarks: BenchmarkData[];
  companyName: string;
  cohortName: string;
}

export default function BenchmarkCharts({ benchmarks, companyName, cohortName }: Props) {
  const [viewMode, setViewMode] = useState<'bar' | 'radar'>('bar');

  if (!benchmarks || benchmarks.length === 0) {
    return (
      <div className="benchmark-charts empty">
        <p>No benchmark data available</p>
      </div>
    );
  }

  return (
    <div className="benchmark-charts">
      {/* View mode toggle */}
      <div className="chart-header">
        <div className="title-section">
          <h3>Performance Comparison</h3>
          <p className="subtitle">
            {companyName} vs. {cohortName}
          </p>
        </div>
        <div className="view-toggle">
          <button
            className={viewMode === 'bar' ? 'active' : ''}
            onClick={() => setViewMode('bar')}
          >
            📊 Bar Chart
          </button>
          <button
            className={viewMode === 'radar' ? 'active' : ''}
            onClick={() => setViewMode('radar')}
          >
            🎯 Radar Chart
          </button>
        </div>
      </div>

      {/* Charts */}
      {viewMode === 'bar' ? (
        <BarChart benchmarks={benchmarks} companyName={companyName} />
      ) : (
        <RadarChart benchmarks={benchmarks} companyName={companyName} />
      )}

      {/* Metrics table */}
      <MetricsTable benchmarks={benchmarks} />

      <style>{`
        .benchmark-charts {
          background: white;
          padding: 24px;
          border-radius: 12px;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .benchmark-charts.empty {
          text-align: center;
          padding: 48px;
          color: #6b7280;
        }

        .chart-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          gap: 16px;
        }

        .title-section h3 {
          margin: 0 0 4px 0;
          font-size: 1.25rem;
          font-weight: 600;
          color: #1f2937;
        }

        .title-section .subtitle {
          margin: 0;
          font-size: 0.875rem;
          color: #6b7280;
        }

        .view-toggle {
          display: flex;
          gap: 8px;
        }

        .view-toggle button {
          padding: 8px 16px;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 6px;
          font-size: 0.875rem;
          cursor: pointer;
          transition: all 0.2s;
        }

        .view-toggle button:hover {
          background: #f9fafb;
          border-color: #9ca3af;
        }

        .view-toggle button.active {
          background: #3b82f6;
          border-color: #3b82f6;
          color: white;
        }

        @media (max-width: 768px) {
          .benchmark-charts {
            padding: 16px;
          }

          .chart-header {
            flex-direction: column;
          }

          .view-toggle {
            width: 100%;
          }

          .view-toggle button {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Bar Chart Component
 */
function BarChart({ benchmarks, companyName }: { benchmarks: BenchmarkData[]; companyName: string }) {
  return (
    <div className="bar-chart">
      {benchmarks.map((benchmark) => {
        const maxValue = Math.max(
          benchmark.company_value,
          benchmark.cohort_average,
          benchmark.cohort_max
        );
        const companyPercent = (benchmark.company_value / maxValue) * 100;
        const averagePercent = (benchmark.cohort_average / maxValue) * 100;

        return (
          <div key={benchmark.metric} className="bar-item">
            <div className="bar-label">
              <span className="metric-name">{benchmark.metric_label}</span>
              <PercentileIndicator percentile={benchmark.percentile} metric={benchmark.metric_label} />
            </div>
            <div className="bars">
              <div className="bar company">
                <div className="bar-fill" style={{ width: `${companyPercent}%` }}>
                  <span className="bar-value">
                    {formatValue(benchmark.company_value, benchmark.unit)}
                  </span>
                </div>
              </div>
              <div className="bar cohort">
                <div className="bar-fill" style={{ width: `${averagePercent}%` }}>
                  <span className="bar-value">
                    {formatValue(benchmark.cohort_average, benchmark.unit)}
                  </span>
                </div>
              </div>
            </div>
            <div className="bar-legend">
              <span className="legend-item company">
                <span className="legend-color"></span>
                {companyName}
              </span>
              <span className="legend-item cohort">
                <span className="legend-color"></span>
                Cohort Average
              </span>
            </div>
          </div>
        );
      })}

      <style>{`
        .bar-chart {
          margin-bottom: 32px;
        }

        .bar-item {
          margin-bottom: 32px;
        }

        .bar-item:last-child {
          margin-bottom: 0;
        }

        .bar-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 12px;
        }

        .bar-label .metric-name {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #1f2937;
        }

        .bars {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-bottom: 8px;
        }

        .bar {
          height: 36px;
          background: #f3f4f6;
          border-radius: 6px;
          overflow: hidden;
          position: relative;
        }

        .bar-fill {
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 12px;
          transition: width 0.5s ease;
        }

        .bar.company .bar-fill {
          background: linear-gradient(90deg, #3b82f6 0%, #2563eb 100%);
        }

        .bar.cohort .bar-fill {
          background: linear-gradient(90deg, #6b7280 0%, #4b5563 100%);
        }

        .bar-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          white-space: nowrap;
        }

        .bar-legend {
          display: flex;
          gap: 20px;
          font-size: 0.8125rem;
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #6b7280;
        }

        .legend-color {
          width: 12px;
          height: 12px;
          border-radius: 2px;
        }

        .legend-item.company .legend-color {
          background: #3b82f6;
        }

        .legend-item.cohort .legend-color {
          background: #6b7280;
        }

        @media (max-width: 640px) {
          .bar-label {
            flex-direction: column;
            align-items: flex-start;
            gap: 8px;
          }

          .bar-value {
            font-size: 0.75rem;
            padding-right: 8px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Radar Chart Component (Simple CSS-based)
 */
function RadarChart({ benchmarks, companyName }: { benchmarks: BenchmarkData[]; companyName: string }) {
  // Normalize values to 0-100 scale for radar chart
  const normalizedData = benchmarks.map((b) => ({
    label: b.metric_label,
    company: b.percentile,
    cohort: 50, // Cohort is always at median (50th percentile)
    percentile: b.percentile,
  }));

  return (
    <div className="radar-chart">
      <div className="radar-container">
        <svg viewBox="0 0 400 400" className="radar-svg">
          {/* Grid circles */}
          <circle cx="200" cy="200" r="150" fill="none" stroke="#e5e7eb" strokeWidth="1" />
          <circle cx="200" cy="200" r="100" fill="none" stroke="#e5e7eb" strokeWidth="1" />
          <circle cx="200" cy="200" r="50" fill="none" stroke="#e5e7eb" strokeWidth="1" />

          {/* Axes */}
          {normalizedData.map((item, index) => {
            const angle = (index * 360) / normalizedData.length - 90;
            const rad = (angle * Math.PI) / 180;
            const x = 200 + 150 * Math.cos(rad);
            const y = 200 + 150 * Math.sin(rad);
            return (
              <line
                key={index}
                x1="200"
                y1="200"
                x2={x}
                y2={y}
                stroke="#d1d5db"
                strokeWidth="1"
              />
            );
          })}

          {/* Company data polygon */}
          <polygon
            points={normalizedData
              .map((item, index) => {
                const angle = (index * 360) / normalizedData.length - 90;
                const rad = (angle * Math.PI) / 180;
                const radius = (item.company / 100) * 150;
                const x = 200 + radius * Math.cos(rad);
                const y = 200 + radius * Math.sin(rad);
                return `${x},${y}`;
              })
              .join(' ')}
            fill="rgba(59, 130, 246, 0.2)"
            stroke="#3b82f6"
            strokeWidth="2"
          />

          {/* Cohort data polygon */}
          <polygon
            points={normalizedData
              .map((item, index) => {
                const angle = (index * 360) / normalizedData.length - 90;
                const rad = (angle * Math.PI) / 180;
                const radius = (item.cohort / 100) * 150;
                const x = 200 + radius * Math.cos(rad);
                const y = 200 + radius * Math.sin(rad);
                return `${x},${y}`;
              })
              .join(' ')}
            fill="rgba(107, 114, 128, 0.1)"
            stroke="#6b7280"
            strokeWidth="2"
            strokeDasharray="5,5"
          />

          {/* Labels */}
          {normalizedData.map((item, index) => {
            const angle = (index * 360) / normalizedData.length - 90;
            const rad = (angle * Math.PI) / 180;
            const x = 200 + 170 * Math.cos(rad);
            const y = 200 + 170 * Math.sin(rad);
            return (
              <text
                key={index}
                x={x}
                y={y}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="12"
                fill="#374151"
                fontWeight="600"
              >
                {item.label}
              </text>
            );
          })}
        </svg>
      </div>

      <div className="radar-legend">
        <span className="legend-item company">
          <span className="legend-line solid"></span>
          {companyName}
        </span>
        <span className="legend-item cohort">
          <span className="legend-line dashed"></span>
          Cohort Median (50th percentile)
        </span>
      </div>

      <style>{`
        .radar-chart {
          margin-bottom: 32px;
        }

        .radar-container {
          max-width: 500px;
          margin: 0 auto;
        }

        .radar-svg {
          width: 100%;
          height: auto;
        }

        .radar-legend {
          display: flex;
          justify-content: center;
          gap: 24px;
          margin-top: 16px;
          font-size: 0.875rem;
        }

        .radar-legend .legend-item {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6b7280;
        }

        .legend-line {
          width: 24px;
          height: 2px;
        }

        .legend-line.solid {
          background: #3b82f6;
        }

        .legend-line.dashed {
          background: linear-gradient(
            to right,
            #6b7280 0%,
            #6b7280 50%,
            transparent 50%,
            transparent 100%
          );
          background-size: 8px 2px;
        }

        @media (max-width: 640px) {
          .radar-legend {
            flex-direction: column;
            align-items: center;
            gap: 8px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Metrics Table Component
 */
function MetricsTable({ benchmarks }: { benchmarks: BenchmarkData[] }) {
  return (
    <div className="metrics-table">
      <h4>Detailed Metrics</h4>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Metric</th>
              <th>Your Value</th>
              <th>Cohort Avg</th>
              <th>Cohort Median</th>
              <th>Range</th>
              <th>Ranking</th>
            </tr>
          </thead>
          <tbody>
            {benchmarks.map((benchmark) => (
              <tr key={benchmark.metric}>
                <td className="metric-name">{benchmark.metric_label}</td>
                <td className="value company">
                  <strong>{formatValue(benchmark.company_value, benchmark.unit)}</strong>
                  {benchmark.trend && <TrendIcon trend={benchmark.trend} />}
                </td>
                <td className="value">{formatValue(benchmark.cohort_average, benchmark.unit)}</td>
                <td className="value">{formatValue(benchmark.cohort_median, benchmark.unit)}</td>
                <td className="value range">
                  {formatValue(benchmark.cohort_min, benchmark.unit)} -{' '}
                  {formatValue(benchmark.cohort_max, benchmark.unit)}
                </td>
                <td>
                  <PercentileIndicator percentile={benchmark.percentile} metric={benchmark.metric_label} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <style>{`
        .metrics-table {
          margin-top: 32px;
        }

        .metrics-table h4 {
          margin: 0 0 16px 0;
          font-size: 1.125rem;
          font-weight: 600;
          color: #1f2937;
        }

        .table-container {
          overflow-x: auto;
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.875rem;
        }

        thead {
          background: #f9fafb;
          border-bottom: 2px solid #e5e7eb;
        }

        th {
          padding: 12px;
          text-align: left;
          font-weight: 600;
          color: #374151;
          white-space: nowrap;
        }

        td {
          padding: 12px;
          border-bottom: 1px solid #e5e7eb;
          color: #6b7280;
        }

        td.metric-name {
          font-weight: 500;
          color: #1f2937;
        }

        td.value {
          white-space: nowrap;
        }

        td.value.company {
          color: #3b82f6;
        }

        td.value.range {
          font-size: 0.8125rem;
          color: #9ca3af;
        }

        tbody tr:hover {
          background: #f9fafb;
        }

        @media (max-width: 768px) {
          table {
            font-size: 0.8125rem;
          }

          th,
          td {
            padding: 8px 6px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * Trend Icon Component
 */
function TrendIcon({ trend }: { trend: 'up' | 'down' | 'stable' }) {
  const icons = {
    up: '↗️',
    down: '↘️',
    stable: '→',
  };

  const colors = {
    up: '#10b981',
    down: '#ef4444',
    stable: '#6b7280',
  };

  return (
    <span className="trend-icon" style={{ color: colors[trend] }}>
      {icons[trend]}
    </span>
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
