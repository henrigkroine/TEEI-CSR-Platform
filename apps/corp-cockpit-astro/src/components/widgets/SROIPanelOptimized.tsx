/**
 * Optimized SROI Panel with Caching and Memoization
 *
 * Performance optimizations:
 * - React.memo with custom comparison
 * - Memoized data transformations
 * - ETag-based conditional requests
 * - SSE real-time updates
 * - Debounced re-renders
 *
 * @module widgets/SROIPanelOptimized
 */

import { useEffect, useState, useCallback } from 'react';
import { memoize, useMemoizedSelector, useStableCallback, useDebounce } from '../../utils/memoization';
import { useDashboardUpdate } from '../DashboardWithSSE';

interface SROIData {
  sroi_ratio: number;
  breakdown: {
    total_investment: number;
    total_social_value: number;
    components: {
      volunteer_hours_value: number;
      integration_value: number;
      language_value: number;
      job_readiness_value: number;
    };
  };
}

interface Props {
  companyId: string;
  period?: string;
}

/**
 * SROI Panel with performance optimizations
 */
function SROIPanelOptimized({ companyId, period }: Props) {
  const [data, setData] = useState<SROIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [etag, setETag] = useState<string | null>(null);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  // Debounce re-renders for rapid updates
  const debouncedLoading = useDebounce(loading, 100);

  // Stable fetch callback
  const fetchData = useStableCallback(async (skipCache = false) => {
    try {
      const url = `http://localhost:3001/companies/${companyId}/sroi${period ? `?period=${period}` : ''}`;

      // Include ETag for conditional request (unless skipping cache)
      const headers: HeadersInit = {};
      if (etag && !skipCache) {
        headers['If-None-Match'] = etag;
      }

      const response = await fetch(url, { headers });

      // 304 Not Modified - use cached data
      if (response.status === 304) {
        console.log('[SROI] Data unchanged (304)');
        setLastUpdate(new Date());
        return;
      }

      if (response.ok) {
        const newETag = response.headers.get('etag');
        if (newETag) {
          setETag(newETag);
        }

        const newData = await response.json();
        setData(newData);
        setLastUpdate(new Date());
      }
    } catch (err) {
      console.error('[SROI] Fetch error:', err);
    } finally {
      setLoading(false);
    }
  });

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [companyId, period, fetchData]);

  // Listen for SSE updates
  useDashboardUpdate(
    useCallback(
      (update: any) => {
        if (update.widgets?.includes('sroi')) {
          console.log('[SROI] Refetching due to SSE update');
          fetchData(true); // Skip cache on SSE update
        }
      },
      [fetchData]
    )
  );

  // Memoized data transformations
  const formattedRatio = useMemoizedSelector(
    data,
    (d) => d?.sroi_ratio.toFixed(2),
    [data?.sroi_ratio]
  );

  const formattedInvestment = useMemoizedSelector(
    data,
    (d) => d?.breakdown.total_investment.toLocaleString(),
    [data?.breakdown.total_investment]
  );

  const formattedValue = useMemoizedSelector(
    data,
    (d) => d?.breakdown.total_social_value.toLocaleString(),
    [data?.breakdown.total_social_value]
  );

  const components = useMemoizedSelector(
    data,
    (d) =>
      d
        ? [
            { label: 'Volunteer Hours', value: d.breakdown.components.volunteer_hours_value },
            { label: 'Integration', value: d.breakdown.components.integration_value },
            { label: 'Language', value: d.breakdown.components.language_value },
            { label: 'Job Readiness', value: d.breakdown.components.job_readiness_value },
          ]
        : [],
    [data?.breakdown.components]
  );

  if (debouncedLoading) {
    return (
      <div className="widget loading" role="status" aria-live="polite">
        <div className="spinner" aria-hidden="true" />
        Loading SROI...
      </div>
    );
  }

  if (!data) {
    return (
      <div className="widget error" role="alert">
        No SROI data available
      </div>
    );
  }

  return (
    <div className="widget sroi-panel">
      <div className="header">
        <div>
          <h2>💰 SROI Panel</h2>
          <p className="subtitle">Social Return on Investment</p>
        </div>
        <div className="last-update" title={`Last updated: ${lastUpdate.toLocaleString()}`}>
          Updated {getRelativeTime(lastUpdate)}
        </div>
      </div>

      <div className="sroi-ratio" role="region" aria-label="SROI Ratio">
        <span className="ratio-value" aria-label={`SROI ratio ${formattedRatio} to 1`}>
          {formattedRatio}:1
        </span>
        <span className="ratio-label">SROI Ratio</span>
      </div>

      <div className="breakdown">
        <BreakdownItem label="Total Investment" value={`$${formattedInvestment}`} />
        <BreakdownItem
          label="Social Value Created"
          value={`$${formattedValue}`}
          highlight
        />
      </div>

      <div className="components">
        <h3>Value Components</h3>
        {components.map((component) => (
          <ComponentItem
            key={component.label}
            label={component.label}
            value={component.value}
          />
        ))}
      </div>

      <a href="/docs/sroi" className="doc-link" target="_blank" rel="noopener noreferrer">
        📚 View SROI Methodology
      </a>

      <style>{`
        .sroi-panel {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .sroi-panel .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
        }

        .sroi-panel h2 {
          font-size: 1.25rem;
          margin-bottom: 4px;
        }

        .subtitle {
          opacity: 0.9;
          font-size: 0.875rem;
        }

        .last-update {
          font-size: 0.75rem;
          opacity: 0.7;
        }

        .sroi-ratio {
          text-align: center;
          padding: 32px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .ratio-value {
          display: block;
          font-size: 3.5rem;
          font-weight: 700;
          line-height: 1;
          margin-bottom: 8px;
        }

        .ratio-label {
          font-size: 0.875rem;
          opacity: 0.9;
        }

        .breakdown {
          display: grid;
          gap: 12px;
          margin-bottom: 24px;
        }

        .components {
          margin-bottom: 16px;
        }

        .components h3 {
          font-size: 0.875rem;
          opacity: 0.9;
          margin-bottom: 12px;
        }

        .doc-link {
          display: inline-block;
          margin-top: 16px;
          color: white;
          text-decoration: underline;
          font-size: 0.875rem;
        }

        .widget.loading, .widget.error {
          padding: 24px;
          text-align: center;
          color: var(--color-text-secondary);
        }

        .spinner {
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top-color: var(--color-primary);
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

/**
 * Memoized Breakdown Item
 */
const BreakdownItem = memoize<{
  label: string;
  value: string;
  highlight?: boolean;
}>(function BreakdownItem({ label, value, highlight }) {
  return (
    <div className="breakdown-item">
      <span className="label">{label}</span>
      <span className={`value ${highlight ? 'highlight' : ''}`}>{value}</span>
      <style>{`
        .breakdown-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 6px;
        }

        .breakdown-item .label {
          font-size: 0.875rem;
        }

        .breakdown-item .value {
          font-size: 1.125rem;
          font-weight: 600;
        }

        .breakdown-item .highlight {
          color: #fbbf24;
        }
      `}</style>
    </div>
  );
});

/**
 * Memoized Component Item
 */
const ComponentItem = memoize<{
  label: string;
  value: number;
}>(function ComponentItem({ label, value }) {
  return (
    <div className="component">
      <span>{label}</span>
      <span>${value.toLocaleString()}</span>
      <style>{`
        .component {
          display: flex;
          justify-content: space-between;
          padding: 8px 0;
          font-size: 0.875rem;
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .component:last-child {
          border-bottom: none;
        }
      `}</style>
    </div>
  );
});

/**
 * Get relative time string
 */
function getRelativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

/**
 * Export memoized component with custom prop comparison
 */
export default memoize(SROIPanelOptimized, (prev, next) => {
  return prev.companyId === next.companyId && prev.period === next.period;
});
