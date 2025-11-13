import { useEffect, useState } from 'react';

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

export default function SROIPanel({ companyId, period }: Props) {
  const [data, setData] = useState<SROIData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [companyId, period]);

  async function fetchData() {
    try {
      const url = `http://localhost:3001/companies/${companyId}/sroi${period ? `?period=${period}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        setData(await response.json());
      }
    } catch (err) {
      console.error('SROI fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) return <div className="widget loading">Loading SROI...</div>;
  if (!data) return <div className="widget error">No SROI data available</div>;

  return (
    <div className="widget sroi-panel">
      <h2>💰 SROI Panel</h2>
      <p className="subtitle">Social Return on Investment</p>

      <div className="sroi-ratio">
        <span className="ratio-value">{data.sroi_ratio.toFixed(2)}:1</span>
        <span className="ratio-label">SROI Ratio</span>
      </div>

      <div className="breakdown">
        <div className="breakdown-item">
          <span className="label">Total Investment</span>
          <span className="value">${data.breakdown.total_investment.toLocaleString()}</span>
        </div>
        <div className="breakdown-item">
          <span className="label">Social Value Created</span>
          <span className="value highlight">${data.breakdown.total_social_value.toLocaleString()}</span>
        </div>
      </div>

      <div className="components">
        <h3>Value Components</h3>
        <div className="component">
          <span>Volunteer Hours</span>
          <span>${data.breakdown.components.volunteer_hours_value.toLocaleString()}</span>
        </div>
        <div className="component">
          <span>Integration</span>
          <span>${data.breakdown.components.integration_value.toLocaleString()}</span>
        </div>
        <div className="component">
          <span>Language</span>
          <span>${data.breakdown.components.language_value.toLocaleString()}</span>
        </div>
        <div className="component">
          <span>Job Readiness</span>
          <span>${data.breakdown.components.job_readiness_value.toLocaleString()}</span>
        </div>
      </div>

      <a href="/docs/sroi" className="doc-link">📚 View SROI Methodology</a>

      <style>{`
        .sroi-panel {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
        }

        .sroi-panel h2 {
          font-size: 1.25rem;
          margin-bottom: 4px;
        }

        .subtitle {
          opacity: 0.9;
          font-size: 0.875rem;
          margin-bottom: 24px;
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

        .components {
          margin-bottom: 16px;
        }

        .components h3 {
          font-size: 0.875rem;
          opacity: 0.9;
          margin-bottom: 12px;
        }

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

        .doc-link {
          display: inline-block;
          margin-top: 16px;
          color: white;
          text-decoration: underline;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}
