import { useState, useEffect, useCallback } from 'react';
import clsx from 'clsx';
import { scoringWeights } from '@/data/scoringWeights';
import AreaChart from '../charts/AreaChart';
import { chartColors } from '../../lib/chartTheme';
import { fetchAIInsights } from '../../api/dashboard';
import { useSSEConnection, useSSEMessage } from '../../hooks/useSSEConnection';

interface Insight {
  cluster: string;
  title: string;
  summary: string;
  tag: string;
}

interface ChartDataPoint {
  label: string;
  semantic: number;
  rules: number;
}

interface Props {
  companyId?: string; // Optional to handle undefined during SSR/hydration
  insights?: Insight[]; // Optional for backward compatibility
  chartData?: ChartDataPoint[]; // Optional for backward compatibility
  clusters?: string[]; // Optional for backward compatibility
  enableSSE?: boolean;
}

const defaultClusters = {
  upskilling: {
    label: 'Upskilling Ukraine',
    summary: 'AI analysis shows 18pt lift in semantic similarity after bilingual mentorship briefs. All compliance checks passed.',
    callouts: [
      { icon: 'trend-up', text: '+18 pts semantic lift from bilingual mentor briefs' },
      { icon: 'check', text: '26 verified transcripts linked in evidence ledger' },
    ],
  },
  weei: {
    label: 'WEEI Mobility',
    summary: 'Narrative quality remains strong but rule contributions trail due to missing consent refresh. Addendum required.',
    callouts: [
      { icon: 'alert', text: 'Rule coverage at 52% (deadline approaching)' },
      { icon: 'clock', text: 'Policy drift: 45 days since last refresh' },
    ],
  },
  community: {
    label: 'Community Studio',
    summary: 'Balanced mix between similarity and rule scores. Recommend enriching narrative with Impact Explorer evidence.',
    callouts: [
      { icon: 'stable', text: 'Similarity trend stable week-over-week' },
      { icon: 'users', text: 'Strong beneficiary engagement signals' },
    ],
  },
} as const;

type ClusterKey = keyof typeof defaultClusters;

const defaultChartSeries = [
  { label: 'W1', semantic: 62, rule: 28 },
  { label: 'W2', semantic: 65, rule: 32 },
  { label: 'W3', semantic: 72, rule: 36 },
  { label: 'W4', semantic: 78, rule: 40 },
  { label: 'W5', semantic: 82, rule: 44 },
];

const IconMap: Record<string, JSX.Element> = {
  'trend-up': (
    <svg viewBox="0 0 16 16">
      <path d="M3 12l4-4 2 2 4-4M10 6h3v3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'check': (
    <svg viewBox="0 0 16 16">
      <path d="M3 8l3 3 7-7" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'alert': (
    <svg viewBox="0 0 16 16">
      <path d="M8 5v3M8 11h.01" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M7.1 2.3a1 1 0 011.8 0l5.4 10a1 1 0 01-.9 1.5H2.6a1 1 0 01-.9-1.5l5.4-10z" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
  'clock': (
    <svg viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="6" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M8 5v3l2 2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
  ),
  'stable': (
    <svg viewBox="0 0 16 16">
      <path d="M3 8h10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      <path d="M5 5l-2 3 2 3M11 5l2 3-2 3" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  ),
  'users': (
    <svg viewBox="0 0 16 16">
      <circle cx="6" cy="5" r="2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M1 12c0-2 2-3 5-3s5 1 5 3" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <circle cx="11" cy="5" r="1.5" fill="none" stroke="currentColor" strokeWidth="1.5"/>
      <path d="M12 9c2 0 3 1 3 2" fill="none" stroke="currentColor" strokeWidth="1.5"/>
    </svg>
  ),
};

export default function AIInsights({
  companyId,
  insights: propInsights,
  chartData: propChartData,
  clusters: propClusters,
  enableSSE = true
}: Props) {
  // Validate companyId - check for undefined, null, empty string, or string "undefined"
  const isValidCompanyId = companyId &&
    typeof companyId === 'string' &&
    companyId !== 'undefined' &&
    companyId !== 'null' &&
    companyId.trim() !== '';

  if (!isValidCompanyId) {
    console.error('[AIInsights] Invalid companyId:', companyId);
    return (
      <div className="ai-insights">
        <div className="alert alert-error">
          Invalid company ID. Please refresh the page.
        </div>
      </div>
    );
  }

  const [insights, setInsights] = useState<Insight[]>(propInsights || []);
  const [chartData, setChartData] = useState<ChartDataPoint[]>(propChartData || defaultChartSeries);
  const [clusters, setClusters] = useState<string[]>(propClusters || []);
  const [loading, setLoading] = useState(!propInsights);
  const [error, setError] = useState<string | null>(null);
  const [activeCluster, setActiveCluster] = useState<ClusterKey>('upskilling');

  // Map clusters to active data
  const activeData = defaultClusters[activeCluster];
  const clusterList = clusters.length > 0
    ? clusters.map((name, index) => [name, 0.33] as [string, number])
    : Object.entries(scoringWeights.programClusterWeights).slice(0, 3);

  // SSE connection for real-time updates
  const sseConnection = useSSEConnection({
    companyId,
    channel: 'dashboard-updates',
    autoConnect: enableSSE && !!companyId,
  });

  // Subscribe to insights updates
  useSSEMessage(sseConnection, 'insight_updated', useCallback((updateData: any) => {
    if (updateData.companyId === companyId) {
      console.log('[AIInsights] Refreshing due to SSE update');
      fetchData(true);
    }
  }, [companyId]));

  const fetchData = useCallback(async (skipCache = false) => {
    // If data provided as props, use them (backward compatibility)
    if (propInsights && propChartData && propClusters) {
      setInsights(propInsights);
      setChartData(propChartData);
      setClusters(propClusters);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const data = await fetchAIInsights(companyId);

      setInsights(data.insights);
      setChartData(data.chartData);
      setClusters(data.clusters.map(c => c.name));
    } catch (err) {
      console.error('[AIInsights] Error fetching insights:', err);
      setError(err instanceof Error ? err.message : 'Failed to load AI insights');
      // Fallback to default data on error
      setInsights(defaultClusters.upskilling.callouts.map((c, i) => ({
        cluster: 'Upskilling Ukraine',
        title: `Insight ${i + 1}`,
        summary: c.text,
        tag: 'Narrative',
      })));
      setChartData(defaultChartSeries);
      setClusters(['Upskilling Ukraine', 'WEEI', 'Community Studio']);
    } finally {
      setLoading(false);
    }
  }, [companyId, propInsights, propChartData, propClusters]);

  useEffect(() => {
    // Only fetch if companyId is valid
    const isValidCompanyId = companyId &&
      typeof companyId === 'string' &&
      companyId !== 'undefined' &&
      companyId !== 'null' &&
      companyId.trim() !== '';

    if (isValidCompanyId) {
      fetchData();
    }
  }, [fetchData, companyId]);

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
      <section className="ai-insights-section ai-insights-loading">
        <div className="section-header">
          <div className="section-header-content">
            <h2 className="section-title">AI Insights</h2>
            <p className="section-subtitle">Loading narrative clusters...</p>
          </div>
        </div>
        <div className="loading-placeholder">
          <div className="skeleton-narrative"></div>
          <div className="skeleton-chart"></div>
        </div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="ai-insights-section ai-insights-error">
        <div className="section-header">
          <div className="section-header-content">
            <h2 className="section-title">AI Insights</h2>
            <p className="section-subtitle error-message">{error}</p>
          </div>
          <button className="btn btn-secondary btn-sm" onClick={() => fetchData(true)}>
            Retry
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="ai-insights-section">
      {/* Header */}
      <div className="section-header">
        <div className="section-header-content">
          <h2 className="section-title">AI Insights</h2>
          <p className="section-subtitle">Semantic analysis and compliance signals</p>
          {sseConnection.isConnected && (
            <span className="sse-indicator" title="Real-time updates active">
              <span className="sse-dot"></span>
            </span>
          )}
        </div>
      </div>

      <div className="insights-layout">
        {/* Left: Narrative insights */}
        <div className="insights-narrative">
          {/* Cluster selector */}
          <div className="cluster-selector">
            {clusterList.map(([cluster, weight], index) => {
              const key: ClusterKey = index === 0 ? 'upskilling' : index === 1 ? 'weei' : 'community';
              const isActive = activeCluster === key;
              return (
                <button
                  key={cluster}
                  type="button"
                  onClick={() => setActiveCluster(key)}
                  className={clsx('cluster-tab', isActive && 'active')}
                >
                  <span className="cluster-name">{cluster}</span>
                  <span className="cluster-weight">{Math.round(weight * 100)}%</span>
                </button>
              );
            })}
          </div>

          {/* Active cluster content */}
          <div className="narrative-content">
            <h3 className="narrative-title">{activeData.label}</h3>
            <p className="narrative-summary">{activeData.summary}</p>

            <ul className="callout-list">
              {activeData.callouts.map((callout, index) => (
                <li key={index} className="callout-item">
                  <span className="callout-icon">
                    {IconMap[callout.icon]}
                  </span>
                  <span className="callout-text">{callout.text}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Chart visualization */}
        <div className="insights-chart">
          <div className="chart-header">
            <span className="chart-title">Contribution Mix</span>
            <div className="chart-legend">
              <span className="legend-item legend-semantic">
                <span className="legend-dot"></span>
                Semantic
              </span>
              <span className="legend-item legend-rule">
                <span className="legend-dot"></span>
                Rule-based
              </span>
            </div>
          </div>

          <div className="chart-container">
            <AreaChart
              data={chartData.map(d => ({ ...d, rule: d.rules }))}
              xDataKey="label"
              series={[
                {
                  dataKey: 'semantic',
                  name: 'Semantic',
                  color: chartColors.primary,
                },
                {
                  dataKey: 'rule',
                  name: 'Rule-based',
                  color: chartColors.accent,
                },
              ]}
              referenceLines={[
                { y: 80, label: '80', color: chartColors.accent },
                { y: 65, label: '65', color: chartColors.textMuted },
                { y: 50, label: '50', color: chartColors.textMuted },
              ]}
              height={140}
              showGrid={false}
              showLegend={false}
              showDots={false}
              curved={true}
            />
          </div>

          {/* Component weights breakdown */}
          <div className="weights-grid">
            {Object.entries(scoringWeights.componentWeights).map(([component, weight]) => (
              <div key={component} className="weight-card">
                <span className="weight-label">{component.replace(/_/g, ' ')}</span>
                <span className="weight-value">{Math.round(weight * 100)}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      <style>{`
        .ai-insights-section {
          background: var(--color-surface);
          border-radius: var(--card-radius);
          border: 1px solid var(--color-border);
          box-shadow: var(--shadow-card);
          overflow: hidden;
        }

        .section-header {
          padding: var(--space-5);
          border-bottom: 1px solid var(--color-border-subtle);
          background: var(--color-surface-alt);
        }

        .section-title {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-caps);
          color: var(--color-text-tertiary);
          margin: 0;
        }

        .section-subtitle {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          margin-top: var(--space-1);
        }

        .insights-layout {
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: var(--space-5);
          padding: var(--space-5);
        }

        /* Cluster Selector */
        .cluster-selector {
          display: flex;
          gap: var(--space-2);
          padding: var(--space-1);
          background: var(--color-muted);
          border-radius: var(--radius-lg);
          margin-bottom: var(--space-5);
        }

        .cluster-tab {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 2px;
          padding: var(--space-3);
          border-radius: var(--radius-md);
          border: none;
          background: transparent;
          cursor: pointer;
          transition: all var(--duration-fast) var(--ease-out);
        }

        .cluster-tab:hover {
          background: rgba(255, 255, 255, 0.5);
        }

        .cluster-tab.active {
          background: var(--color-primary);
          box-shadow: var(--shadow-sm);
        }

        .cluster-name {
          font-size: var(--text-xs);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-secondary);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
        }

        .cluster-tab.active .cluster-name {
          color: var(--color-text-on-primary);
        }

        .cluster-weight {
          font-size: 10px;
          color: var(--color-text-tertiary);
        }

        .cluster-tab.active .cluster-weight {
          color: rgba(255, 255, 255, 0.7);
        }

        /* Narrative Content */
        .narrative-content {
          padding-left: var(--space-1);
        }

        .narrative-title {
          font-size: var(--text-lg);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
          margin: 0 0 var(--space-3);
        }

        .narrative-summary {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          line-height: var(--leading-relaxed);
          margin-bottom: var(--space-4);
        }

        .callout-list {
          list-style: none;
          padding: 0;
          margin: 0;
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .callout-item {
          display: flex;
          align-items: flex-start;
          gap: var(--space-3);
          padding: var(--space-3);
          background: var(--color-muted);
          border-radius: var(--radius-lg);
          border-left: 3px solid var(--color-accent);
        }

        .callout-icon {
          width: 18px;
          height: 18px;
          color: var(--color-accent);
          flex-shrink: 0;
          margin-top: 1px;
        }

        .callout-icon svg {
          width: 100%;
          height: 100%;
        }

        .callout-text {
          font-size: var(--text-sm);
          color: var(--color-text-secondary);
          line-height: var(--leading-snug);
        }

        /* Chart Section */
        .insights-chart {
          background: linear-gradient(135deg, var(--color-surface-alt), var(--color-muted));
          border: 1px solid var(--color-border-subtle);
          border-radius: var(--radius-lg);
          padding: var(--space-4);
          display: flex;
          flex-direction: column;
          gap: var(--space-3);
        }

        .chart-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .chart-title {
          font-size: var(--text-xs);
          font-weight: var(--font-weight-semibold);
          text-transform: uppercase;
          letter-spacing: var(--tracking-caps);
          color: var(--color-text-tertiary);
        }

        .chart-legend {
          display: flex;
          gap: var(--space-3);
        }

        .legend-item {
          display: flex;
          align-items: center;
          gap: var(--space-1);
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
        }

        .legend-dot {
          width: 8px;
          height: 8px;
          border-radius: var(--radius-pill);
        }

        .legend-semantic .legend-dot {
          background: var(--color-primary);
        }

        .legend-rule .legend-dot {
          background: var(--color-accent);
        }

        .chart-container {
          height: 140px;
          position: relative;
        }

        .chart-svg {
          width: 100%;
          height: 100%;
        }

        /* Weights Grid */
        .weights-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: var(--space-2);
        }

        .weight-card {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: var(--space-2) var(--space-3);
          background: var(--color-surface);
          border: 1px dashed var(--color-border);
          border-radius: var(--radius-md);
        }

        .weight-label {
          font-size: var(--text-xs);
          color: var(--color-text-secondary);
          text-transform: capitalize;
        }

        .weight-value {
          font-size: var(--text-sm);
          font-weight: var(--font-weight-semibold);
          color: var(--color-text-primary);
        }

        .ai-insights-loading,
        .ai-insights-error {
          min-height: 300px;
        }

        .loading-placeholder {
          padding: var(--space-5);
          display: grid;
          grid-template-columns: 1.3fr 1fr;
          gap: var(--space-5);
        }

        .skeleton-narrative,
        .skeleton-chart {
          height: 200px;
          background: var(--color-muted);
          border-radius: var(--radius-lg);
          animation: pulse 1.5s ease-in-out infinite;
        }

        .error-message {
          color: var(--color-error);
        }

        .sse-indicator {
          display: inline-flex;
          align-items: center;
          margin-left: var(--space-2);
        }

        .sse-dot {
          display: block;
          width: 6px;
          height: 6px;
          border-radius: var(--radius-pill);
          background: var(--color-success);
          animation: pulse-dot 2s ease-in-out infinite;
        }

        @keyframes pulse-dot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.2); }
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        @media (max-width: 1024px) {
          .insights-layout {
            grid-template-columns: 1fr;
          }

          .loading-placeholder {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .cluster-selector {
            flex-direction: column;
          }
        }
      `}</style>
    </section>
  );
}
