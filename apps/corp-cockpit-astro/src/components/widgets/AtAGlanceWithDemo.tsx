/**
 * AtAGlance Widget with Demo Mode Support
 *
 * Enhanced version that uses demo data when demo mode is enabled.
 */

import { useEffect, useState, memo } from 'react';
import { useDemoData } from '../../hooks/useDemoData';
import { adaptForAtAGlance } from '../../lib/demo/widgetAdapter';
import type { AtAGlanceData } from './AtAGlance';

interface Props {
  companyId: string;
  period?: string;
  programme?: 'language_connect' | 'mentorship' | 'all';
}

function AtAGlanceWithDemo({ companyId, period, programme = 'all' }: Props) {
  const { enabled, loading, error, metrics, csvExists } = useDemoData();
  const [data, setData] = useState<AtAGlanceData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Demo mode: use demo data
  useEffect(() => {
    if (enabled && metrics) {
      try {
        const adapted = adaptForAtAGlance(metrics, programme === 'all' ? undefined : programme);
        setData(adapted);
        setIsLoading(false);
        setFetchError(null);
      } catch (err: any) {
        setFetchError(err?.message || 'Failed to adapt demo data');
        setIsLoading(false);
      }
      return;
    }

    // Production mode: fetch from API
    async function fetchData() {
      try {
        setIsLoading(true);
        const url = `http://localhost:3001/companies/${companyId}/at-a-glance${period ? `?period=${period}` : ''}`;
        const response = await fetch(url);

        if (!response.ok) throw new Error('Failed to fetch data');

        const result = await response.json();
        setData(result);
        setFetchError(null);
      } catch (err) {
        setFetchError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [companyId, period, enabled, metrics, programme]);

  if (isLoading || (enabled && loading)) {
    return (
      <div className="widget loading" role="status" aria-live="polite" aria-label="Loading metrics">
        <div className="spinner" aria-hidden="true" />
        {enabled ? 'Loading demo data...' : 'Loading...'}
      </div>
    );
  }

  if (enabled && !csvExists) {
    return (
      <div className="widget error" role="alert" aria-live="assertive">
        <p>Demo CSV file not found. Please place demo-metrics.csv in the data directory.</p>
      </div>
    );
  }

  if (enabled && error) {
    return (
      <div className="widget error" role="alert" aria-live="assertive">
        <p>Error loading demo data: {error}</p>
      </div>
    );
  }

  if (fetchError || !data) {
    return (
      <div className="widget error" role="alert" aria-live="assertive">
        Error: {fetchError || 'No data'}
      </div>
    );
  }

  // Render the widget (reuse AtAGlance rendering logic)
  return (
    <section className="widget at-a-glance" aria-labelledby="at-a-glance-heading">
      <h2 id="at-a-glance-heading">At-a-Glance Metrics</h2>
      <p className="period">Period: {data.period}</p>

      <div className="metrics-grid">
        <section className="metric-section" aria-labelledby="inputs-heading">
          <h3 id="inputs-heading">Inputs</h3>
          <div className="metrics">
            <div className="metric">
              <span className="value" aria-label={`${data.inputs.total_volunteers} volunteers`}>
                {data.inputs.total_volunteers}
              </span>
              <span className="label" aria-hidden="true">Volunteers</span>
            </div>
            <div className="metric">
              <span className="value" aria-label={`${data.inputs.total_hours.toFixed(0)} hours`}>
                {data.inputs.total_hours.toFixed(0)}
              </span>
              <span className="label" aria-hidden="true">Hours</span>
            </div>
            <div className="metric">
              <span className="value" aria-label={`${data.inputs.total_sessions} sessions`}>
                {data.inputs.total_sessions}
              </span>
              <span className="label" aria-hidden="true">Sessions</span>
            </div>
            <div className="metric">
              <span className="value" aria-label={`${data.inputs.active_participants} participants`}>
                {data.inputs.active_participants}
              </span>
              <span className="label" aria-hidden="true">Participants</span>
            </div>
          </div>
        </section>

        <section className="metric-section" aria-labelledby="outcomes-heading">
          <h3 id="outcomes-heading">Outcomes</h3>
          <div className="metrics">
            <div className="metric">
              <span className="value" aria-label={`${(data.outcomes.integration_avg * 100).toFixed(0)} percent integration`}>
                {(data.outcomes.integration_avg * 100).toFixed(0)}%
              </span>
              <span className="label" aria-hidden="true">Integration</span>
            </div>
            <div className="metric">
              <span className="value" aria-label={`${(data.outcomes.language_avg * 100).toFixed(0)} percent language proficiency`}>
                {(data.outcomes.language_avg * 100).toFixed(0)}%
              </span>
              <span className="label" aria-hidden="true">Language</span>
            </div>
            <div className="metric">
              <span className="value" aria-label={`${(data.outcomes.job_readiness_avg * 100).toFixed(0)} percent job readiness`}>
                {(data.outcomes.job_readiness_avg * 100).toFixed(0)}%
              </span>
              <span className="label" aria-hidden="true">Job Readiness</span>
            </div>
          </div>
        </section>
      </div>

      <style>{`
        .at-a-glance {
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .at-a-glance h2 {
          font-size: 1.25rem;
          margin-bottom: 8px;
        }

        .period {
          color: #4b5563;
          font-size: 0.875rem;
          margin-bottom: 24px;
        }

        .metrics-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
          gap: 24px;
        }

        .metric-section h3 {
          font-size: 1rem;
          margin-bottom: 16px;
          color: #374151;
        }

        .metrics {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 16px;
        }

        .metric {
          display: flex;
          flex-direction: column;
          padding: 16px;
          background: #f9fafb;
          border-radius: 6px;
        }

        .metric .value {
          font-size: 2rem;
          font-weight: 700;
          color: #0066cc;
          line-height: 1;
          margin-bottom: 8px;
        }

        .metric .label {
          font-size: 0.875rem;
          color: #4b5563;
        }

        .loading, .error {
          padding: 40px;
          text-align: center;
          color: #4b5563;
        }

        .error {
          color: #ef4444;
        }

        .spinner {
          border: 3px solid rgba(0, 0, 0, 0.1);
          border-radius: 50%;
          border-top-color: #0066cc;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }
      `}</style>
    </section>
  );
}

export default memo(AtAGlanceWithDemo, (prev, next) => {
  return (
    prev.companyId === next.companyId &&
    prev.period === next.period &&
    prev.programme === next.programme
  );
});
