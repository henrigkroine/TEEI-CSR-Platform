/**
 * CohortComparator Component
 *
 * Displays horizontal bar chart comparison between company and cohort metrics
 * Shows percentile distribution (25th, 50th, 75th) and company position
 */

import { useState } from 'react';
import PercentileIndicator from './PercentileIndicator';
import MetricTooltip from './MetricTooltip';

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
  p25?: number; // 25th percentile
  p75?: number; // 75th percentile
}

interface CohortStats {
  companyCount: number;
  lastUpdated: string | Date;
}

interface Props {
  benchmarks: BenchmarkData[];
  companyName: string;
  cohortName: string;
  cohortStats: CohortStats;
}

export default function CohortComparator({ benchmarks, companyName, cohortName, cohortStats }: Props) {
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  if (!benchmarks || benchmarks.length === 0) {
    return (
      <div className="cohort-comparator empty">
        <p>No benchmark data available</p>
      </div>
    );
  }

  return (
    <div className="cohort-comparator">
      {/* Header */}
      <div className="comparator-header">
        <div className="title-section">
          <h2 id="cohort-comparison-heading">Performance Comparison</h2>
          <p className="subtitle">
            {companyName} vs. {cohortName}
            <span className="cohort-info">
              ({cohortStats.companyCount} companies, updated{' '}
              {new Date(cohortStats.lastUpdated).toLocaleDateString()})
            </span>
          </p>
        </div>
      </div>

      {/* Comparison Bars */}
      <div className="comparison-bars">
        {benchmarks.map((benchmark) => {
          const isExpanded = expandedMetric === benchmark.metric;

          // Calculate percentiles if not provided
          const p25 = benchmark.p25 ?? benchmark.cohort_median * 0.7;
          const p50 = benchmark.cohort_median;
          const p75 = benchmark.p75 ?? benchmark.cohort_median * 1.3;

          // Determine max value for scaling
          const maxValue = Math.max(
            benchmark.company_value,
            benchmark.cohort_max,
            p75 * 1.2
          );

          const companyPercent = (benchmark.company_value / maxValue) * 100;
          const p25Percent = (p25 / maxValue) * 100;
          const p50Percent = (p50 / maxValue) * 100;
          const p75Percent = (p75 / maxValue) * 100;
          const avgPercent = (benchmark.cohort_average / maxValue) * 100;

          // Determine if company is above median
          const isAboveMedian = benchmark.company_value >= p50;

          return (
            <div key={benchmark.metric} className="comparison-item">
              {/* Metric Header */}
              <div className="metric-header">
                <div className="metric-info">
                  <h3>{benchmark.metric_label}</h3>
                  <MetricTooltip metric={benchmark.metric} label={benchmark.metric_label} />
                </div>
                <div className="metric-stats">
                  <PercentileIndicator percentile={benchmark.percentile} metric={benchmark.metric_label} />
                  <button
                    className="expand-btn"
                    onClick={() => setExpandedMetric(isExpanded ? null : benchmark.metric)}
                    aria-expanded={isExpanded}
                    aria-label={`${isExpanded ? 'Collapse' : 'Expand'} ${benchmark.metric_label} details`}
                  >
                    {isExpanded ? '−' : '+'}
                  </button>
                </div>
              </div>

              {/* Percentile Distribution Visualization */}
              <div className="percentile-viz">
                {/* Background showing percentile ranges */}
                <div className="percentile-ranges">
                  <div className="range-label">25th</div>
                  <div className="range-label">50th</div>
                  <div className="range-label">75th</div>
                </div>

                <div className="distribution-bar" role="img" aria-label={`Distribution for ${benchmark.metric_label}`}>
                  {/* 25th percentile marker */}
                  <div
                    className="percentile-marker p25"
                    style={{ left: `${p25Percent}%` }}
                    title={`25th percentile: ${formatValue(p25, benchmark.unit)}`}
                  >
                    <div className="marker-line"></div>
                    <div className="marker-value">{formatValue(p25, benchmark.unit)}</div>
                  </div>

                  {/* 50th percentile (median) marker */}
                  <div
                    className="percentile-marker p50"
                    style={{ left: `${p50Percent}%` }}
                    title={`Median: ${formatValue(p50, benchmark.unit)}`}
                  >
                    <div className="marker-line"></div>
                    <div className="marker-value">{formatValue(p50, benchmark.unit)}</div>
                  </div>

                  {/* 75th percentile marker */}
                  <div
                    className="percentile-marker p75"
                    style={{ left: `${p75Percent}%` }}
                    title={`75th percentile: ${formatValue(p75, benchmark.unit)}`}
                  >
                    <div className="marker-line"></div>
                    <div className="marker-value">{formatValue(p75, benchmark.unit)}</div>
                  </div>

                  {/* Company value bar */}
                  <div
                    className={`company-bar ${isAboveMedian ? 'above-median' : 'below-median'}`}
                    style={{ width: `${companyPercent}%` }}
                    role="progressbar"
                    aria-valuenow={benchmark.company_value}
                    aria-valuemin={0}
                    aria-valuemax={maxValue}
                    aria-label={`Your value: ${formatValue(benchmark.company_value, benchmark.unit)}`}
                  >
                    <span className="bar-value">{formatValue(benchmark.company_value, benchmark.unit)}</span>
                  </div>

                  {/* Cohort average indicator */}
                  <div
                    className="cohort-avg-marker"
                    style={{ left: `${avgPercent}%` }}
                    title={`Cohort average: ${formatValue(benchmark.cohort_average, benchmark.unit)}`}
                  >
                    <div className="avg-line"></div>
                  </div>
                </div>

                {/* Explanation text */}
                <div className="explanation-text">
                  Your {benchmark.metric_label.toLowerCase()} of{' '}
                  <strong>{formatValue(benchmark.company_value, benchmark.unit)}</strong> is{' '}
                  {isAboveMedian ? 'above' : 'below'} the cohort median of{' '}
                  <strong>{formatValue(p50, benchmark.unit)}</strong>
                  {benchmark.percentile >= 75 && ' — excellent performance!'}
                  {benchmark.percentile >= 50 && benchmark.percentile < 75 && ' — solid performance'}
                  {benchmark.percentile < 50 && ' — room for improvement'}
                </div>
              </div>

              {/* Expanded Details */}
              {isExpanded && (
                <div className="expanded-details">
                  <table>
                    <tbody>
                      <tr>
                        <td>Your Value</td>
                        <td className="value-cell company-value">
                          {formatValue(benchmark.company_value, benchmark.unit)}
                        </td>
                      </tr>
                      <tr>
                        <td>Cohort Average</td>
                        <td className="value-cell">{formatValue(benchmark.cohort_average, benchmark.unit)}</td>
                      </tr>
                      <tr>
                        <td>Cohort Median (50th)</td>
                        <td className="value-cell">{formatValue(p50, benchmark.unit)}</td>
                      </tr>
                      <tr>
                        <td>25th Percentile</td>
                        <td className="value-cell">{formatValue(p25, benchmark.unit)}</td>
                      </tr>
                      <tr>
                        <td>75th Percentile</td>
                        <td className="value-cell">{formatValue(p75, benchmark.unit)}</td>
                      </tr>
                      <tr>
                        <td>Cohort Range</td>
                        <td className="value-cell range">
                          {formatValue(benchmark.cohort_min, benchmark.unit)} –{' '}
                          {formatValue(benchmark.cohort_max, benchmark.unit)}
                        </td>
                      </tr>
                      <tr>
                        <td>Your Percentile Rank</td>
                        <td className="value-cell percentile-cell">
                          {benchmark.percentile}th percentile
                          <span className="percentile-note">
                            (Better than {benchmark.percentile}% of companies)
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <style>{`
        .cohort-comparator {
          background: white;
          padding: 1.5rem;
          border-radius: 0.75rem;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .cohort-comparator.empty {
          text-align: center;
          padding: 3rem;
          color: #6b7280;
        }

        .comparator-header {
          margin-bottom: 2rem;
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

        .cohort-info {
          margin-left: 0.5rem;
          color: #9ca3af;
          font-size: 0.8125rem;
        }

        .comparison-bars {
          display: flex;
          flex-direction: column;
          gap: 2rem;
        }

        .comparison-item {
          border: 1px solid #e5e7eb;
          border-radius: 0.5rem;
          padding: 1.25rem;
          background: #f9fafb;
        }

        .metric-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 1rem;
        }

        .metric-info {
          display: flex;
          align-items: center;
          gap: 0.5rem;
        }

        .metric-info h3 {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #1f2937;
        }

        .metric-stats {
          display: flex;
          align-items: center;
          gap: 0.75rem;
        }

        .expand-btn {
          width: 2rem;
          height: 2rem;
          border: 1px solid #d1d5db;
          background: white;
          border-radius: 0.375rem;
          font-size: 1.25rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .expand-btn:hover {
          background: #f3f4f6;
          border-color: #9ca3af;
        }

        .expand-btn:focus {
          outline: 2px solid #3b82f6;
          outline-offset: 2px;
        }

        .percentile-viz {
          margin-top: 1rem;
        }

        .percentile-ranges {
          display: flex;
          justify-content: space-between;
          margin-bottom: 0.5rem;
          padding: 0 0.5rem;
        }

        .range-label {
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
        }

        .distribution-bar {
          position: relative;
          height: 3rem;
          background: linear-gradient(to right, #fef3c7 0%, #fde68a 25%, #fcd34d 50%, #fbbf24 75%, #f59e0b 100%);
          border-radius: 0.5rem;
          overflow: visible;
          margin: 1rem 0;
        }

        .percentile-marker {
          position: absolute;
          top: 0;
          transform: translateX(-50%);
          z-index: 2;
        }

        .marker-line {
          width: 2px;
          height: 3rem;
          background: #6b7280;
          margin: 0 auto;
        }

        .marker-value {
          margin-top: 0.25rem;
          font-size: 0.75rem;
          color: #374151;
          font-weight: 600;
          white-space: nowrap;
          text-align: center;
        }

        .p25 .marker-line {
          background: #9ca3af;
        }

        .p50 .marker-line {
          background: #4b5563;
          width: 3px;
        }

        .p75 .marker-line {
          background: #9ca3af;
        }

        .company-bar {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          border-radius: 0.5rem;
          display: flex;
          align-items: center;
          justify-content: flex-end;
          padding-right: 0.75rem;
          transition: width 0.5s ease;
          z-index: 3;
        }

        .company-bar.above-median {
          background: linear-gradient(90deg, rgba(59, 130, 246, 0.9) 0%, rgba(37, 99, 235, 0.9) 100%);
        }

        .company-bar.below-median {
          background: linear-gradient(90deg, rgba(239, 68, 68, 0.8) 0%, rgba(220, 38, 38, 0.8) 100%);
        }

        .bar-value {
          font-size: 0.875rem;
          font-weight: 600;
          color: white;
          white-space: nowrap;
        }

        .cohort-avg-marker {
          position: absolute;
          top: -0.5rem;
          transform: translateX(-50%);
          z-index: 4;
        }

        .avg-line {
          width: 0;
          height: 4rem;
          border-left: 3px dashed #ef4444;
        }

        .avg-line::before {
          content: 'AVG';
          position: absolute;
          top: -1.5rem;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.625rem;
          font-weight: 700;
          color: #ef4444;
          background: white;
          padding: 0.125rem 0.25rem;
          border-radius: 0.25rem;
        }

        .explanation-text {
          margin-top: 1rem;
          font-size: 0.875rem;
          color: #4b5563;
          line-height: 1.5;
        }

        .explanation-text strong {
          color: #1f2937;
          font-weight: 600;
        }

        .expanded-details {
          margin-top: 1.5rem;
          padding-top: 1.5rem;
          border-top: 1px solid #e5e7eb;
        }

        .expanded-details table {
          width: 100%;
          font-size: 0.875rem;
        }

        .expanded-details tr {
          border-bottom: 1px solid #f3f4f6;
        }

        .expanded-details tr:last-child {
          border-bottom: none;
        }

        .expanded-details td {
          padding: 0.75rem 0.5rem;
        }

        .expanded-details td:first-child {
          color: #6b7280;
          width: 40%;
        }

        .value-cell {
          font-weight: 600;
          color: #1f2937;
          text-align: right;
        }

        .company-value {
          color: #3b82f6;
        }

        .value-cell.range {
          color: #6b7280;
          font-weight: 500;
        }

        .percentile-cell {
          display: flex;
          flex-direction: column;
          align-items: flex-end;
        }

        .percentile-note {
          font-size: 0.75rem;
          color: #9ca3af;
          font-weight: 400;
          margin-top: 0.125rem;
        }

        @media (max-width: 768px) {
          .cohort-comparator {
            padding: 1rem;
          }

          .comparison-item {
            padding: 1rem;
          }

          .metric-header {
            flex-direction: column;
            gap: 0.75rem;
          }

          .metric-stats {
            width: 100%;
            justify-content: space-between;
          }

          .distribution-bar {
            height: 2.5rem;
          }

          .marker-line {
            height: 2.5rem;
          }

          .bar-value {
            font-size: 0.75rem;
            padding-right: 0.5rem;
          }

          .expanded-details td:first-child {
            width: 50%;
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
