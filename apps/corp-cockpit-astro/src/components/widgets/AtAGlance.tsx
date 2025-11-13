import { useEffect, useState } from 'react';

interface AtAGlanceData {
  period: string;
  inputs: {
    total_volunteers: number;
    total_hours: number;
    total_sessions: number;
    active_participants: number;
  };
  outcomes: {
    integration_avg: number;
    language_avg: number;
    job_readiness_avg: number;
  };
}

interface Props {
  companyId: string;
  period?: string;
}

export default function AtAGlance({ companyId, period }: Props) {
  const [data, setData] = useState<AtAGlanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, [companyId, period]);

  async function fetchData() {
    try {
      setLoading(true);
      const url = `http://localhost:3001/companies/${companyId}/at-a-glance${period ? `?period=${period}` : ''}`;
      const response = await fetch(url);

      if (!response.ok) throw new Error('Failed to fetch data');

      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="widget loading">Loading...</div>;
  }

  if (error || !data) {
    return <div className="widget error">Error: {error || 'No data'}</div>;
  }

  return (
    <div className="widget at-a-glance">
      <h2>📊 At-a-Glance Metrics</h2>
      <p className="period">Period: {data.period}</p>

      <div className="metrics-grid">
        <div className="metric-section">
          <h3>Inputs</h3>
          <div className="metrics">
            <div className="metric">
              <span className="value">{data.inputs.total_volunteers}</span>
              <span className="label">Volunteers</span>
            </div>
            <div className="metric">
              <span className="value">{data.inputs.total_hours.toFixed(0)}</span>
              <span className="label">Hours</span>
            </div>
            <div className="metric">
              <span className="value">{data.inputs.total_sessions}</span>
              <span className="label">Sessions</span>
            </div>
            <div className="metric">
              <span className="value">{data.inputs.active_participants}</span>
              <span className="label">Participants</span>
            </div>
          </div>
        </div>

        <div className="metric-section">
          <h3>Outcomes</h3>
          <div className="metrics">
            <div className="metric">
              <span className="value">{(data.outcomes.integration_avg * 100).toFixed(0)}%</span>
              <span className="label">Integration</span>
            </div>
            <div className="metric">
              <span className="value">{(data.outcomes.language_avg * 100).toFixed(0)}%</span>
              <span className="label">Language</span>
            </div>
            <div className="metric">
              <span className="value">{(data.outcomes.job_readiness_avg * 100).toFixed(0)}%</span>
              <span className="label">Job Readiness</span>
            </div>
          </div>
        </div>
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
          color: #6b7280;
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
          color: #6b7280;
        }

        .loading, .error {
          padding: 40px;
          text-align: center;
          color: #6b7280;
        }

        .error {
          color: #ef4444;
        }
      `}</style>
    </div>
  );
}
