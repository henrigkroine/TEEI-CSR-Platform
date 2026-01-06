/**
 * SLO Metrics Component
 *
 * Displays Service Level Objective (SLO) metrics including uptime percentages,
 * SLO targets, and trend visualization.
 *
 * @module components/status/SLOMetrics
 */

import React, { useState, useEffect } from 'react';

interface SLOMetric {
  id: string;
  name: string;
  current: number; // Current percentage (e.g., 99.95)
  target: number; // Target percentage (e.g., 99.9)
  period: string; // Time period (e.g., "Last 30 days")
  trend: 'up' | 'down' | 'stable';
  trendValue: number; // Change from previous period
}

interface SLOData {
  metrics: SLOMetric[];
  lastUpdate: string;
}

export default function SLOMetrics() {
  const [sloData, setSloData] = useState<SLOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    fetchSLOMetrics();
  }, [selectedPeriod]);

  async function fetchSLOMetrics() {
    try {
      // TODO: Fetch from Worker-1 and Worker-2 APIs
      // For now, use mock data
      const mockData = getMockSLOData(selectedPeriod);
      setSloData(mockData);
    } catch (error) {
      console.error('Failed to fetch SLO metrics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="slo-metrics loading">
        <div className="loading-spinner"></div>
        <p>Loading SLO metrics...</p>
      </div>
    );
  }

  if (!sloData) {
    return (
      <div className="slo-metrics error">
        <p>Unable to load SLO metrics. Please try again later.</p>
      </div>
    );
  }

  return (
    <div className="slo-metrics">
      {/* Period Selector */}
      <div className="metrics-header">
        <div>
          <h3>Service Level Objectives</h3>
          <p className="subtitle">
            Uptime and performance metrics against our SLO targets
          </p>
        </div>
        <div className="period-selector">
          <button
            className={selectedPeriod === '7d' ? 'active' : ''}
            onClick={() => setSelectedPeriod('7d')}
          >
            7 Days
          </button>
          <button
            className={selectedPeriod === '30d' ? 'active' : ''}
            onClick={() => setSelectedPeriod('30d')}
          >
            30 Days
          </button>
          <button
            className={selectedPeriod === '90d' ? 'active' : ''}
            onClick={() => setSelectedPeriod('90d')}
          >
            90 Days
          </button>
        </div>
      </div>

      {/* SLO Metrics Grid */}
      <div className="metrics-grid">
        {sloData.metrics.map((metric) => (
          <SLOCard key={metric.id} metric={metric} />
        ))}
      </div>

      {/* SLO Explanation */}
      <div className="slo-info">
        <h4>About Our SLOs</h4>
        <p>
          Service Level Objectives (SLOs) are our commitment to providing reliable service.
          We measure uptime, response times, and error rates to ensure we meet or exceed
          these targets.
        </p>
        <div className="slo-targets">
          <div className="target-item">
            <span className="target-label">Uptime Target:</span>
            <span className="target-value">99.9% (43.8 minutes downtime/month)</span>
          </div>
          <div className="target-item">
            <span className="target-label">API Response Time:</span>
            <span className="target-value">&lt;200ms (p95)</span>
          </div>
          <div className="target-item">
            <span className="target-label">Error Rate:</span>
            <span className="target-value">&lt;0.1%</span>
          </div>
        </div>
      </div>

      <style jsx>{`
        .slo-metrics {
          width: 100%;
        }

        .loading,
        .error {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 64px 24px;
          gap: 16px;
        }

        .loading-spinner {
          width: 48px;
          height: 48px;
          border: 4px solid #e5e7eb;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        .error {
          color: #dc2626;
          background: #fef2f2;
          border: 1px solid #fecaca;
          border-radius: 8px;
        }

        .metrics-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 32px;
          gap: 24px;
        }

        h3 {
          margin: 0 0 8px 0;
          font-size: 1.5rem;
          color: #111827;
        }

        .subtitle {
          margin: 0;
          font-size: 0.9375rem;
          color: #6b7280;
        }

        .period-selector {
          display: flex;
          gap: 8px;
          background: #f3f4f6;
          padding: 4px;
          border-radius: 8px;
        }

        .period-selector button {
          padding: 8px 16px;
          background: transparent;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 600;
          color: #6b7280;
          transition: all 0.2s;
        }

        .period-selector button:hover {
          color: #111827;
        }

        .period-selector button.active {
          background: white;
          color: #2563eb;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 20px;
          margin-bottom: 32px;
        }

        .slo-info {
          background: #f9fafb;
          padding: 24px;
          border-radius: 8px;
          border: 1px solid #e5e7eb;
        }

        .slo-info h4 {
          margin: 0 0 12px 0;
          font-size: 1.125rem;
          color: #111827;
        }

        .slo-info p {
          margin: 0 0 20px 0;
          color: #4b5563;
          line-height: 1.6;
        }

        .slo-targets {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .target-item {
          display: flex;
          justify-content: space-between;
          padding: 12px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e5e7eb;
        }

        .target-label {
          font-weight: 600;
          color: #374151;
        }

        .target-value {
          color: #6b7280;
          font-family: 'Courier New', monospace;
        }

        @media (max-width: 768px) {
          .metrics-header {
            flex-direction: column;
          }

          .period-selector {
            width: 100%;
            justify-content: stretch;
          }

          .period-selector button {
            flex: 1;
          }

          .metrics-grid {
            grid-template-columns: 1fr;
          }

          .target-item {
            flex-direction: column;
            gap: 4px;
          }
        }
      `}</style>
    </div>
  );
}

/**
 * SLO Card Component
 */
function SLOCard({ metric }: { metric: SLOMetric }) {
  const isAboveTarget = metric.current >= metric.target;
  const percentageOfTarget = (metric.current / metric.target) * 100;

  return (
    <div className="slo-card">
      <div className="card-header">
        <h4 className="metric-name">{metric.name}</h4>
        <div className={`trend-indicator trend-${metric.trend}`}>
          <span className="trend-icon">{getTrendIcon(metric.trend)}</span>
          <span className="trend-value">{metric.trendValue > 0 ? '+' : ''}{metric.trendValue.toFixed(2)}%</span>
        </div>
      </div>

      <div className="metric-value">
        <span className={`current-value ${isAboveTarget ? 'above' : 'below'}`}>
          {metric.current.toFixed(3)}%
        </span>
      </div>

      <div className="progress-bar">
        <div
          className={`progress-fill ${isAboveTarget ? 'above' : 'below'}`}
          style={{ width: `${Math.min(percentageOfTarget, 100)}%` }}
        ></div>
        <div className="target-marker" style={{ left: '100%' }}>
          <span className="target-label">Target: {metric.target}%</span>
        </div>
      </div>

      <div className="card-footer">
        <span className="period">{metric.period}</span>
        {isAboveTarget ? (
          <span className="status-badge success">Meeting SLO</span>
        ) : (
          <span className="status-badge warning">Below Target</span>
        )}
      </div>

      <style jsx>{`
        .slo-card {
          background: white;
          border: 1px solid #e5e7eb;
          border-radius: 10px;
          padding: 20px;
          transition: all 0.2s;
        }

        .slo-card:hover {
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transform: translateY(-2px);
        }

        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 16px;
        }

        .metric-name {
          margin: 0;
          font-size: 1rem;
          font-weight: 600;
          color: #374151;
        }

        .trend-indicator {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.75rem;
          font-weight: 600;
        }

        .trend-indicator.trend-up {
          color: #059669;
        }

        .trend-indicator.trend-down {
          color: #dc2626;
        }

        .trend-indicator.trend-stable {
          color: #6b7280;
        }

        .trend-icon {
          font-size: 0.875rem;
        }

        .metric-value {
          margin-bottom: 16px;
        }

        .current-value {
          font-size: 2.25rem;
          font-weight: 700;
          font-family: 'Courier New', monospace;
        }

        .current-value.above {
          color: #059669;
        }

        .current-value.below {
          color: #dc2626;
        }

        .progress-bar {
          position: relative;
          height: 8px;
          background: #e5e7eb;
          border-radius: 4px;
          margin-bottom: 16px;
          overflow: visible;
        }

        .progress-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s ease;
        }

        .progress-fill.above {
          background: linear-gradient(90deg, #10b981 0%, #059669 100%);
        }

        .progress-fill.below {
          background: linear-gradient(90deg, #f59e0b 0%, #dc2626 100%);
        }

        .target-marker {
          position: absolute;
          top: -2px;
          transform: translateX(-50%);
          width: 2px;
          height: 12px;
          background: #374151;
        }

        .target-marker::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 8px;
          height: 8px;
          background: #374151;
          border-radius: 50%;
          border: 2px solid white;
        }

        .target-label {
          position: absolute;
          top: 16px;
          right: 0;
          white-space: nowrap;
          font-size: 0.75rem;
          color: #6b7280;
          font-weight: 500;
        }

        .card-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .period {
          font-size: 0.75rem;
          color: #9ca3af;
        }

        .status-badge {
          padding: 4px 10px;
          border-radius: 12px;
          font-size: 0.6875rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .status-badge.success {
          background: #d1fae5;
          color: #065f46;
        }

        .status-badge.warning {
          background: #fee2e2;
          color: #991b1b;
        }
      `}</style>
    </div>
  );
}

/**
 * Helper functions
 */
function getTrendIcon(trend: 'up' | 'down' | 'stable'): string {
  switch (trend) {
    case 'up':
      return '↑';
    case 'down':
      return '↓';
    case 'stable':
      return '→';
  }
}

/**
 * Mock data function (replace with real API calls)
 */
function getMockSLOData(period: '7d' | '30d' | '90d'): SLOData {
  const periodMap = {
    '7d': 'Last 7 days',
    '30d': 'Last 30 days',
    '90d': 'Last 90 days',
  };

  // Simulate different values for different periods
  const uptimeBase = period === '7d' ? 99.98 : period === '30d' ? 99.95 : 99.92;
  const apiBase = period === '7d' ? 99.97 : period === '30d' ? 99.94 : 99.91;
  const errorBase = period === '7d' ? 99.99 : period === '30d' ? 99.96 : 99.93;

  const metrics: SLOMetric[] = [
    {
      id: 'platform-uptime',
      name: 'Platform Uptime',
      current: uptimeBase,
      target: 99.9,
      period: periodMap[period],
      trend: 'up',
      trendValue: 0.03,
    },
    {
      id: 'api-availability',
      name: 'API Availability',
      current: apiBase,
      target: 99.9,
      period: periodMap[period],
      trend: 'stable',
      trendValue: 0.01,
    },
    {
      id: 'error-rate',
      name: 'Error-Free Requests',
      current: errorBase,
      target: 99.9,
      period: periodMap[period],
      trend: 'up',
      trendValue: 0.02,
    },
    {
      id: 'data-warehouse',
      name: 'Data Warehouse Uptime',
      current: 99.97,
      target: 99.95,
      period: periodMap[period],
      trend: 'up',
      trendValue: 0.05,
    },
  ];

  return {
    metrics,
    lastUpdate: new Date().toISOString(),
  };
}
