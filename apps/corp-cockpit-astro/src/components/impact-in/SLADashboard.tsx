/**
 * SLA Dashboard Widget
 *
 * Displays current week SLA compliance metrics for Impact-In deliveries.
 *
 * Features:
 * - Overall SLA status (healthy/warning/breach)
 * - Success rate, latency, and retry metrics
 * - Per-platform breakdown
 * - Real-time data refresh
 */

import { useState, useEffect } from 'react';
import './SLADashboard.css';

interface SLADashboardProps {
  companyId: string;
  initialData?: any;
}

interface DeliveryMetrics {
  totalDeliveries: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  successRate: number;
  retrySuccessRate: number;
  avgDeliveryLatencyMs: number;
  avgRetries: number;
}

interface PlatformMetrics extends DeliveryMetrics {
  platform: 'benevity' | 'goodera' | 'workday';
  slaStatus: 'healthy' | 'warning' | 'breach';
}

interface SLAStatus {
  overall: DeliveryMetrics & { slaStatus: 'healthy' | 'warning' | 'breach' };
  byPlatform: PlatformMetrics[];
}

export default function SLADashboard({ companyId, initialData }: SLADashboardProps) {
  const [slaStatus, setSLAStatus] = useState<SLAStatus | null>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    fetchSLAStatus();

    // Auto-refresh every 5 minutes
    const interval = setInterval(fetchSLAStatus, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [companyId]);

  const fetchSLAStatus = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/v1/impact-in/sla-status?companyId=${companyId}`);

      if (!response.ok) {
        throw new Error('Failed to fetch SLA status');
      }

      const data = await response.json();
      setSLAStatus(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: 'healthy' | 'warning' | 'breach') => {
    switch (status) {
      case 'healthy':
        return 'var(--color-success)';
      case 'warning':
        return 'var(--color-warning)';
      case 'breach':
        return 'var(--color-error)';
      default:
        return 'var(--color-text-secondary)';
    }
  };

  const getStatusIcon = (status: 'healthy' | 'warning' | 'breach') => {
    switch (status) {
      case 'healthy':
        return '✅';
      case 'warning':
        return '⚠️';
      case 'breach':
        return '🚨';
      default:
        return '❓';
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'benevity':
        return '🌟';
      case 'goodera':
        return '🌍';
      case 'workday':
        return '💼';
      default:
        return '📡';
    }
  };

  const formatLatency = (ms: number) => {
    if (ms < 1000) {
      return `${Math.round(ms)}ms`;
    } else if (ms < 60000) {
      return `${(ms / 1000).toFixed(1)}s`;
    } else {
      return `${(ms / 60000).toFixed(1)}m`;
    }
  };

  const formatPercentage = (rate: number) => {
    return `${(rate * 100).toFixed(2)}%`;
  };

  if (loading && !slaStatus) {
    return (
      <div className="sla-dashboard loading">
        <div className="spinner"></div>
        <p>Loading SLA metrics...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="sla-dashboard error">
        <p className="error-message">⚠️ {error}</p>
        <button onClick={fetchSLAStatus} className="retry-btn">
          Retry
        </button>
      </div>
    );
  }

  if (!slaStatus) {
    return null;
  }

  const { overall, byPlatform } = slaStatus;

  return (
    <div className="sla-dashboard">
      {/* Overall Status */}
      <div className="sla-overall">
        <div className="status-badge" style={{ backgroundColor: getStatusColor(overall.slaStatus) }}>
          <span className="status-icon">{getStatusIcon(overall.slaStatus)}</span>
          <span className="status-text">{overall.slaStatus.toUpperCase()}</span>
        </div>

        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Success Rate</div>
            <div className="metric-value">{formatPercentage(overall.successRate)}</div>
            <div className="metric-target">Target: ≥ 98%</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Avg Latency</div>
            <div className="metric-value">{formatLatency(overall.avgDeliveryLatencyMs)}</div>
            <div className="metric-target">Target: ≤ 5 min</div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Total Deliveries</div>
            <div className="metric-value">{overall.totalDeliveries}</div>
            <div className="metric-breakdown">
              {overall.successfulDeliveries} success / {overall.failedDeliveries} failed
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-label">Retry Success</div>
            <div className="metric-value">{formatPercentage(overall.retrySuccessRate)}</div>
            <div className="metric-target">Target: ≥ 90%</div>
          </div>
        </div>
      </div>

      {/* Per-Platform Breakdown */}
      <div className="platform-breakdown">
        <h3>Platform Status</h3>
        <div className="platform-grid">
          {byPlatform.map((platform) => (
            <div key={platform.platform} className="platform-card">
              <div className="platform-header">
                <span className="platform-icon">{getPlatformIcon(platform.platform)}</span>
                <span className="platform-name">{platform.platform}</span>
                <span
                  className="platform-status"
                  style={{ backgroundColor: getStatusColor(platform.slaStatus) }}
                >
                  {getStatusIcon(platform.slaStatus)}
                </span>
              </div>

              <div className="platform-metrics">
                <div className="platform-metric">
                  <span className="label">Success:</span>
                  <span className="value">{formatPercentage(platform.successRate)}</span>
                </div>
                <div className="platform-metric">
                  <span className="label">Latency:</span>
                  <span className="value">{formatLatency(platform.avgDeliveryLatencyMs)}</span>
                </div>
                <div className="platform-metric">
                  <span className="label">Deliveries:</span>
                  <span className="value">{platform.totalDeliveries}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="sla-footer">
        <span className="last-updated">
          Last updated: {lastUpdated.toLocaleTimeString()}
        </span>
        <button onClick={fetchSLAStatus} className="refresh-btn" disabled={loading}>
          {loading ? 'Refreshing...' : '🔄 Refresh'}
        </button>
      </div>
    </div>
  );
}
