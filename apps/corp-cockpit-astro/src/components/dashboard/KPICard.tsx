/**
 * KPI Card Component
 *
 * Fetches live data from APIs and displays with sparklines, trends, and SSE updates.
 */

import { useEffect, useState, useCallback } from 'react';
import { useSSEConnection, useSSEMessage } from '../../hooks/useSSEConnection';
import { fetchSROI, fetchVIS, fetchAICoverage, fetchCompliance, fetchMetricsWithTrend } from '../../api/dashboard';

interface KPICardProps {
  companyId?: string; // Optional to handle undefined during SSR/hydration
  metricId: 'sroi' | 'vis' | 'coverage' | 'compliance';
  period?: string;
  enableSSE?: boolean;
}

interface KPIData {
  value: string;
  trend: string;
  trendLabel: string;
  isPositive: boolean;
  sparkline: number[];
  target: number;
  fullLabel: string;
}

function KPICard({ companyId, metricId, period, enableSSE = true }: KPICardProps) {
  // Validate companyId - check for undefined, null, empty string, or string "undefined"
  const isValidCompanyId = companyId &&
    typeof companyId === 'string' &&
    companyId !== 'undefined' &&
    companyId !== 'null' &&
    companyId.trim() !== '';

  if (!isValidCompanyId) {
    console.error('[KPICard] Invalid companyId:', companyId);
    return (
      <div className="kpi-card">
        <div className="alert alert-error">
          Invalid company ID. Please refresh the page.
        </div>
      </div>
    );
  }

  const [data, setData] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // SSE connection for real-time updates
  const sseConnection = useSSEConnection({
    companyId: companyId!,
    channel: 'dashboard-updates',
    autoConnect: enableSSE && isValidCompanyId,
  });

  // Subscribe to metric updates
  useSSEMessage(sseConnection, 'metric_updated', useCallback((updateData: any) => {
    if (updateData.metricName === metricId || updateData.widgets?.includes(metricId)) {
      console.log(`[KPICard] Refreshing ${metricId} due to SSE update`);
      fetchData(true); // Skip cache on SSE update
    }
  }, [metricId]));

  const fetchData = useCallback(async (skipCache = false) => {
    try {
      setLoading(true);
      setError(null);

      let value: number;
      let trend: { value: number; direction: 'up' | 'down'; percent: number } | null = null;
      let sparkline: number[] = [];

      switch (metricId) {
        case 'sroi': {
          const sroiData = await fetchSROI(companyId!, period);
          value = sroiData.sroi_ratio;
          sparkline = sroiData.sparkline || [];
          if (sroiData.trend) {
            trend = {
              value: sroiData.trend.change,
              direction: sroiData.trend.change >= 0 ? 'up' : 'down',
              percent: sroiData.trend.changePercent,
            };
          }
          break;
        }
        case 'vis': {
          const visData = await fetchVIS(companyId!, period);
          value = visData.aggregate_vis;
          sparkline = visData.sparkline || [];
          if (visData.trend) {
            trend = {
              value: visData.trend.change,
              direction: visData.trend.change >= 0 ? 'up' : 'down',
              percent: visData.trend.changePercent,
            };
          }
          break;
        }
        case 'coverage': {
          const coverageData = await fetchAICoverage(companyId!, period);
          value = coverageData.coverage_percentage;
          sparkline = coverageData.sparkline || [];
          if (coverageData.trend) {
            trend = {
              value: coverageData.trend.change,
              direction: coverageData.trend.change >= 0 ? 'up' : 'down',
              percent: coverageData.trend.changePercent,
            };
          }
          break;
        }
        case 'compliance': {
          const complianceData = await fetchCompliance(companyId!, period);
          value = complianceData.compliance_percentage;
          sparkline = complianceData.sparkline || [];
          if (complianceData.trend) {
            trend = {
              value: complianceData.trend.change,
              direction: complianceData.trend.change >= 0 ? 'up' : 'down',
              percent: complianceData.trend.changePercent,
            };
          }
          break;
        }
        default:
          throw new Error(`Unknown metric: ${metricId}`);
      }

      // Format value based on metric type
      const formattedValue = metricId === 'sroi'
        ? `${value.toFixed(1)}x`
        : metricId === 'coverage' || metricId === 'compliance'
        ? `${Math.round(value)}%`
        : `${Math.round(value)}`;

      // Format trend
      const trendLabel = trend
        ? `${trend.direction === 'up' ? '+' : ''}${trend.value.toFixed(trend.value < 1 ? 1 : 0)}${metricId === 'coverage' || metricId === 'compliance' ? ' pts' : metricId === 'sroi' ? 'x' : ' pts'}`
        : 'No change';

      setData({
        value: formattedValue,
        trend: trendLabel,
        trendLabel: 'vs last week',
        isPositive: trend ? trend.direction === 'up' : true,
        sparkline: sparkline.length > 0 ? sparkline : generateDefaultSparkline(value),
        target: getTarget(metricId),
        fullLabel: getFullLabel(metricId),
      });
    } catch (err) {
      console.error(`[KPICard] Error fetching ${metricId}:`, err);
      setError(err instanceof Error ? err.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [companyId, metricId, period]);

  useEffect(() => {
    // Only fetch if companyId is valid
    if (isValidCompanyId) {
      fetchData();
    }
  }, [fetchData, isValidCompanyId]);

  // Listen for manual refresh events
  useEffect(() => {
    const handleRefresh = () => {
      fetchData(true);
    };
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => window.removeEventListener('dashboard-refresh', handleRefresh);
  }, [fetchData]);

  if (loading) {
    return (
      <article className="kpi-card kpi-card-loading" aria-label={`Loading ${metricId}`}>
        <div className="kpi-skeleton">
          <div className="skeleton-line skeleton-label"></div>
          <div className="skeleton-line skeleton-value"></div>
          <div className="skeleton-line skeleton-footer"></div>
        </div>
      </article>
    );
  }

  if (error || !data) {
    return (
      <article className="kpi-card kpi-card-error" aria-label={`Error loading ${metricId}`}>
        <div className="kpi-error">
          <span className="kpi-label">{getLabel(metricId)}</span>
          <span className="error-message">{error || 'No data available'}</span>
        </div>
      </article>
    );
  }

  const sparkline = createSparklinePath(data.sparkline);

  return (
    <article className="kpi-card animate-in" aria-label={`${getLabel(metricId)}: ${data.value}`}>
      <div className="kpi-header">
        <span className="kpi-label">{getLabel(metricId)}</span>
        <span className={`kpi-badge ${data.isPositive ? 'positive' : 'negative'}`}>
          {data.isPositive ? (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 12V4M5 7l3-3 3 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          ) : (
            <svg viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 4v8M5 9l3 3 3-3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
          {data.trend}
        </span>
      </div>

      <div className="kpi-value-row">
        <span className="kpi-value">{data.value}</span>
        <div className="kpi-sparkline">
          <svg
            viewBox={`0 0 ${sparkline.width} ${sparkline.height}`}
            preserveAspectRatio="none"
            aria-label={`${getLabel(metricId)} trend chart`}
          >
            <defs>
              <linearGradient id={`gradient-${metricId}`} x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(0, 57, 63, 0.25)" />
                <stop offset="100%" stopColor="rgba(0, 57, 63, 0)" />
              </linearGradient>
            </defs>
            <path
              d={sparkline.areaPath}
              fill={`url(#gradient-${metricId})`}
            />
            <path
              d={sparkline.linePath}
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </div>

      <div className="kpi-footer">
        <span className="kpi-full-label">{data.fullLabel}</span>
        <span className="kpi-target">Target: {data.target}{data.value.includes('%') ? '%' : data.value.includes('x') ? 'x' : ''}</span>
      </div>

      {sseConnection.isConnected && (
        <div className="kpi-sse-indicator" title="Real-time updates active">
          <span className="sse-dot"></span>
        </div>
      )}

      <style>{`
        .kpi-card {
          position: relative;
          background: var(--color-surface);
          border: 1px solid var(--color-border);
          border-radius: var(--card-radius);
          padding: var(--space-5);
          box-shadow: var(--shadow-card);
          overflow: hidden;
          transition: transform var(--duration-normal) var(--ease-out),
                      box-shadow var(--duration-normal) var(--ease-out),
                      border-color var(--duration-normal) var(--ease-out);
        }

        .kpi-card::before {
          content: '';
          position: absolute;
          top: 0;
          left: 0;
          right: 0;
          height: 3px;
          background: linear-gradient(90deg, var(--color-primary), var(--color-primary-light));
          transform: scaleX(0);
          transform-origin: left;
          transition: transform var(--duration-normal) var(--ease-out);
        }

        .kpi-card:hover {
          transform: translateY(-4px);
          box-shadow: var(--shadow-card-hover);
          border-color: var(--color-border-strong);
        }

        .kpi-card:hover::before {
          transform: scaleX(1);
        }

        .kpi-card-loading {
          min-height: 140px;
        }

        .kpi-skeleton {
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .skeleton-line {
          height: 16px;
          background: var(--color-muted);
          border-radius: var(--radius-md);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .skeleton-label { width: 60px; }
        .skeleton-value { width: 80px; height: 32px; }
        .skeleton-footer { width: 100px; }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .kpi-card-error {
          border-color: var(--color-error);
        }

        .kpi-error {
          display: flex;
          flex-direction: column;
          gap: var(--space-2);
        }

        .error-message {
          font-size: var(--text-sm);
          color: var(--color-error);
        }

        .kpi-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          margin-bottom: var(--space-3);
        }

        .kpi-label {
          font-size: var(--text-xs);
          font-weight: var(--font-weight-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-caps);
          color: var(--color-text-tertiary);
        }

        .kpi-badge {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 10px;
          border-radius: var(--radius-pill);
          font-size: var(--text-xs);
          font-weight: var(--font-weight-semibold);
        }

        .kpi-badge.positive {
          background: var(--color-success-light);
          color: var(--color-success);
        }

        .kpi-badge.negative {
          background: var(--color-error-light);
          color: var(--color-error);
        }

        .kpi-badge svg {
          width: 14px;
          height: 14px;
        }

        .kpi-value-row {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
          gap: var(--space-4);
          margin-bottom: var(--space-4);
        }

        .kpi-value {
          font-size: var(--text-4xl);
          font-weight: var(--font-weight-bold);
          color: var(--color-text-primary);
          line-height: 1;
          letter-spacing: var(--tracking-tight);
        }

        .kpi-sparkline {
          flex: 1;
          max-width: 120px;
          height: 40px;
        }

        .kpi-sparkline svg {
          width: 100%;
          height: 100%;
        }

        .kpi-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: var(--space-3);
          padding-top: var(--space-3);
          border-top: 1px solid var(--color-border-subtle);
        }

        .kpi-full-label {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
        }

        .kpi-target {
          font-size: var(--text-xs);
          color: var(--color-text-tertiary);
          font-weight: var(--font-weight-medium);
        }

        .kpi-sse-indicator {
          position: absolute;
          top: var(--space-2);
          right: var(--space-2);
        }

        .sse-dot {
          display: block;
          width: 8px;
          height: 8px;
          border-radius: var(--radius-pill);
          background: var(--color-success);
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }

        .animate-in {
          opacity: 0;
          animation: fadeSlideIn var(--duration-normal) var(--ease-out) forwards;
        }

        @keyframes fadeSlideIn {
          from {
            opacity: 0;
            transform: translateY(12px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </article>
  );
}

function getLabel(metricId: string): string {
  const labels: Record<string, string> = {
    sroi: 'SROI',
    vis: 'VIS Score',
    coverage: 'AI Coverage',
    compliance: 'Compliance',
  };
  return labels[metricId] || metricId;
}

function getFullLabel(metricId: string): string {
  const labels: Record<string, string> = {
    sroi: 'Social Return on Investment',
    vis: 'Volunteer Impact Score',
    coverage: 'Evidence AI Processing',
    compliance: 'Policy Adherence Rate',
  };
  return labels[metricId] || metricId;
}

function getTarget(metricId: string): number {
  const targets: Record<string, number> = {
    sroi: 5.0,
    vis: 85,
    coverage: 80,
    compliance: 95,
  };
  return targets[metricId] || 0;
}

function generateDefaultSparkline(currentValue: number): number[] {
  // Generate a simple trend line around current value
  return Array.from({ length: 7 }, (_, i) => {
    const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
    return currentValue * (1 + variation - (6 - i) * 0.02);
  });
}

function createSparklinePath(points: number[]): { linePath: string; areaPath: string; width: number; height: number } {
  const width = 120;
  const height = 40;
  const padding = 2;

  const min = Math.min(...points);
  const max = Math.max(...points);
  const range = max - min || 1;

  const coords = points.map((point, index) => {
    const x = padding + (index / (points.length - 1)) * (width - padding * 2);
    const y = height - padding - ((point - min) / range) * (height - padding * 2);
    return { x, y };
  });

  // Create smooth curve using quadratic bezier
  let path = `M ${coords[0].x} ${coords[0].y}`;
  for (let i = 1; i < coords.length; i++) {
    const prev = coords[i - 1];
    const curr = coords[i];
    const cpX = (prev.x + curr.x) / 2;
    path += ` Q ${cpX} ${prev.y} ${cpX} ${(prev.y + curr.y) / 2}`;
    path += ` Q ${cpX} ${curr.y} ${curr.x} ${curr.y}`;
  }

  // Area fill path
  const areaPath = `${path} L ${coords[coords.length - 1].x} ${height} L ${coords[0].x} ${height} Z`;

  return { linePath: path, areaPath, width, height };
}

export default KPICard;
