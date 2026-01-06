/**
 * Boardroom Metrics - Phase H3-A
 *
 * Displays metrics for different views in boardroom mode.
 * Optimized for large displays with scaled typography.
 */

import { useMemo } from 'react';

interface BoardroomMetricsProps {
  data: any;
  currentView: 'dashboard' | 'trends' | 'sroi' | 'vis';
  showEvidenceOverlay: boolean;
  lang: string;
}

export function BoardroomMetrics({
  data,
  currentView,
  showEvidenceOverlay,
  lang,
}: BoardroomMetricsProps) {
  // Format numbers for display
  const formatNumber = (value: number, decimals = 0): string => {
    return new Intl.NumberFormat(lang, {
      maximumFractionDigits: decimals,
    }).format(value);
  };

  // Format currency
  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat(lang, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Render dashboard view
  const renderDashboard = useMemo(() => {
    const metrics = data?.dashboard || {};

    return (
      <div className="metrics-grid">
        <MetricCard
          label="Participants"
          value={formatNumber(metrics.participants || 0)}
          trend={metrics.participantsTrend}
          icon="👥"
        />
        <MetricCard
          label="Volunteers"
          value={formatNumber(metrics.volunteers || 0)}
          trend={metrics.volunteersTrend}
          icon="🤝"
        />
        <MetricCard
          label="Sessions"
          value={formatNumber(metrics.sessions || 0)}
          trend={metrics.sessionsTrend}
          icon="📅"
        />
        <MetricCard
          label="Completion Rate"
          value={`${formatNumber(metrics.completionRate || 0, 1)}%`}
          trend={metrics.completionRateTrend}
          icon="✅"
        />
        <MetricCard
          label="Total Hours"
          value={formatNumber(metrics.totalHours || 0)}
          trend={metrics.totalHoursTrend}
          icon="⏱️"
        />
        <MetricCard
          label="Satisfaction"
          value={`${formatNumber(metrics.satisfaction || 0, 1)}/5`}
          trend={metrics.satisfactionTrend}
          icon="⭐"
        />
      </div>
    );
  }, [data, lang]);

  // Render trends view
  const renderTrends = useMemo(() => {
    const trends = data?.trends || {};

    return (
      <div className="trends-view">
        <div className="trend-card">
          <h3>Participant Growth</h3>
          <div className="trend-chart-placeholder">
            <div className="trend-value">{formatNumber(trends.participantGrowth || 0, 1)}%</div>
            <div className="trend-period">30-day trend</div>
          </div>
        </div>
        <div className="trend-card">
          <h3>Volunteer Engagement</h3>
          <div className="trend-chart-placeholder">
            <div className="trend-value">{formatNumber(trends.volunteerEngagement || 0, 1)}%</div>
            <div className="trend-period">30-day trend</div>
          </div>
        </div>
        <div className="trend-card">
          <h3>Program Performance</h3>
          <div className="trend-chart-placeholder">
            <div className="trend-value">{formatNumber(trends.programPerformance || 0, 1)}%</div>
            <div className="trend-period">30-day trend</div>
          </div>
        </div>
      </div>
    );
  }, [data, lang]);

  // Render SROI view
  const renderSROI = useMemo(() => {
    const sroi = data?.sroi || {};

    return (
      <div className="sroi-view">
        <div className="sroi-hero">
          <div className="sroi-ratio">
            <span className="sroi-ratio-value">{formatNumber(sroi.ratio || 0, 2)}</span>
            <span className="sroi-ratio-label">:1</span>
          </div>
          <p className="sroi-description">
            For every $1 invested, {formatCurrency(sroi.ratio || 0)} of social value is created
          </p>
        </div>
        <div className="sroi-breakdown">
          <div className="sroi-item">
            <span className="sroi-item-label">Investment</span>
            <span className="sroi-item-value">{formatCurrency(sroi.investment || 0)}</span>
          </div>
          <div className="sroi-item">
            <span className="sroi-item-label">Social Value</span>
            <span className="sroi-item-value success">{formatCurrency(sroi.socialValue || 0)}</span>
          </div>
          <div className="sroi-item">
            <span className="sroi-item-label">Participant Value</span>
            <span className="sroi-item-value">{formatCurrency(sroi.participantValue || 0)}</span>
          </div>
          <div className="sroi-item">
            <span className="sroi-item-label">Volunteer Value</span>
            <span className="sroi-item-value">{formatCurrency(sroi.volunteerValue || 0)}</span>
          </div>
        </div>
      </div>
    );
  }, [data, lang]);

  // Render VIS view
  const renderVIS = useMemo(() => {
    const vis = data?.vis || {};

    return (
      <div className="vis-view">
        <div className="vis-hero">
          <div className="vis-score">
            <span className="vis-score-value">{formatNumber(vis.overallScore || 0, 1)}</span>
            <span className="vis-score-max">/100</span>
          </div>
          <p className="vis-description">Overall Volunteer Impact Score</p>
        </div>
        <div className="vis-metrics">
          <div className="vis-metric">
            <span className="vis-metric-value">{formatNumber(vis.avgHours || 0, 1)}</span>
            <span className="vis-metric-label">Avg Hours</span>
          </div>
          <div className="vis-metric">
            <span className="vis-metric-value">{formatNumber(vis.avgSessions || 0, 1)}</span>
            <span className="vis-metric-label">Avg Sessions</span>
          </div>
          <div className="vis-metric">
            <span className="vis-metric-value">{formatNumber(vis.avgRating || 0, 1)}/5</span>
            <span className="vis-metric-label">Avg Rating</span>
          </div>
        </div>
      </div>
    );
  }, [data, lang]);

  return (
    <div className="boardroom-metrics">
      {currentView === 'dashboard' && renderDashboard}
      {currentView === 'trends' && renderTrends}
      {currentView === 'sroi' && renderSROI}
      {currentView === 'vis' && renderVIS}

      <style>{`
        .boardroom-metrics {
          padding: 32px;
          width: 100%;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
          gap: 32px;
        }

        .trends-view,
        .sroi-view,
        .vis-view {
          display: flex;
          flex-direction: column;
          gap: 32px;
        }

        .trend-card {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 16px;
          padding: 32px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .trend-card h3 {
          font-size: 2rem;
          margin-bottom: 24px;
          color: white;
        }

        .trend-chart-placeholder {
          text-align: center;
          padding: 48px;
        }

        .trend-value {
          font-size: 4rem;
          font-weight: 700;
          color: #3b82f6;
        }

        .trend-period {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.6);
          margin-top: 12px;
        }

        .sroi-hero,
        .vis-hero {
          text-align: center;
          padding: 48px;
          background: linear-gradient(135deg, rgba(59, 130, 246, 0.1), rgba(16, 185, 129, 0.1));
          border-radius: 16px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .sroi-ratio {
          font-size: 6rem;
          font-weight: 700;
          color: #10b981;
          line-height: 1;
        }

        .sroi-ratio-label {
          font-size: 3rem;
          color: rgba(255, 255, 255, 0.7);
        }

        .sroi-description,
        .vis-description {
          font-size: 1.5rem;
          color: rgba(255, 255, 255, 0.8);
          margin-top: 24px;
        }

        .sroi-breakdown {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
        }

        .sroi-item {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 24px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }

        .sroi-item-label {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.6);
        }

        .sroi-item-value {
          font-size: 2rem;
          font-weight: 700;
          color: white;
        }

        .sroi-item-value.success {
          color: #10b981;
        }

        .vis-score {
          font-size: 6rem;
          font-weight: 700;
          color: #3b82f6;
          line-height: 1;
        }

        .vis-score-max {
          font-size: 3rem;
          color: rgba(255, 255, 255, 0.5);
        }

        .vis-metrics {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 24px;
        }

        .vis-metric {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 24px;
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          text-align: center;
        }

        .vis-metric-value {
          font-size: 2.5rem;
          font-weight: 700;
          color: #3b82f6;
        }

        .vis-metric-label {
          font-size: 1.125rem;
          color: rgba(255, 255, 255, 0.6);
        }
      `}</style>
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: string | number;
  trend?: number;
  icon?: string;
}

function MetricCard({ label, value, trend, icon }: MetricCardProps) {
  const trendDirection = trend && trend > 0 ? 'up' : trend && trend < 0 ? 'down' : 'neutral';

  return (
    <div className="metric-card">
      {icon && <div className="metric-icon">{icon}</div>}
      <div className="metric-label">{label}</div>
      <div className="metric-value">{value}</div>
      {trend !== undefined && (
        <div className={`metric-trend trend-${trendDirection}`}>
          {trend > 0 ? '↑' : trend < 0 ? '↓' : '→'} {Math.abs(trend).toFixed(1)}%
        </div>
      )}

      <style>{`
        .metric-card {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 16px;
          padding: 32px;
          transition: all 0.2s ease;
        }

        .metric-card:hover {
          background: rgba(255, 255, 255, 0.08);
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        }

        .metric-icon {
          font-size: 3rem;
          margin-bottom: 16px;
        }

        .metric-label {
          font-size: 1.25rem;
          color: rgba(255, 255, 255, 0.7);
          margin-bottom: 12px;
        }

        .metric-value {
          font-size: 3.5rem;
          font-weight: 700;
          color: white;
          margin-bottom: 8px;
          line-height: 1;
        }

        .metric-trend {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .trend-up {
          color: #10b981;
        }

        .trend-down {
          color: #ef4444;
        }

        .trend-neutral {
          color: rgba(255, 255, 255, 0.5);
        }
      `}</style>
    </div>
  );
}
