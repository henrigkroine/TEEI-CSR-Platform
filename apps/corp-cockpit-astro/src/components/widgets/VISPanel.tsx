import { useEffect, useState, memo } from 'react';

interface Volunteer {
  volunteer_id: string;
  name: string;
  vis_score: number;
  hours: number;
  consistency: number;
  outcome_impact: number;
}

interface VISData {
  aggregate_vis: number;
  top_volunteers: Volunteer[];
}

interface Props {
  companyId: string;
  period?: string;
  top?: number;
}

function VISPanel({ companyId, period, top = 10 }: Props) {
  const [data, setData] = useState<VISData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, [companyId, period, top]);

  async function fetchData() {
    try {
      const url = `/api/companies/${companyId}/vis?top=${top}${period ? `&period=${period}` : ''}`;
      const response = await fetch(url);
      if (response.ok) {
        setData(await response.json());
      }
    } catch (err) {
      console.error('VIS fetch error:', err);
    } finally {
      setLoading(false);
    }
  }

  function getVISBand(score: number): string {
    if (score >= 76) return 'Exceptional';
    if (score >= 51) return 'High Impact';
    if (score >= 26) return 'Contributing';
    return 'Emerging';
  }

  function getBandColor(score: number): string {
    if (score >= 76) return '#10b981';
    if (score >= 51) return '#3b82f6';
    if (score >= 26) return '#f59e0b';
    return '#6b7280';
  }

  if (loading) return <div className="widget loading">Loading VIS...</div>;
  if (!data) return <div className="widget error">No VIS data available</div>;

  return (
    <div className="widget vis-panel">
      <h2>⭐ VIS Leaderboard</h2>
      <p className="subtitle">Volunteer Impact Scores</p>

      <div className="aggregate">
        <span className="aggregate-value">{data.aggregate_vis.toFixed(1)}</span>
        <span className="aggregate-label">Company Average VIS</span>
      </div>

      <div className="leaderboard">
        <h3>Top {top} Volunteers</h3>
        {data.top_volunteers.length === 0 ? (
          <p className="no-data">No volunteer data available</p>
        ) : (
          <div className="volunteers">
            {data.top_volunteers.map((vol, index) => (
              <div key={vol.volunteer_id} className="volunteer-card">
                <div className="rank">#{index + 1}</div>
                <div className="volunteer-info">
                  <div className="name">{vol.name}</div>
                  <div className="stats">
                    {vol.hours.toFixed(0)} hours • {getVISBand(vol.vis_score)}
                  </div>
                </div>
                <div
                  className="vis-badge"
                  style={{ backgroundColor: getBandColor(vol.vis_score) }}
                >
                  {vol.vis_score.toFixed(1)}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <a href="/docs/vis" className="doc-link">📚 View VIS Model</a>

      <style>{`
        .vis-panel {
          background: white;
          padding: 24px;
          border-radius: 8px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        }

        .vis-panel h2 {
          font-size: 1.25rem;
          margin-bottom: 4px;
        }

        .subtitle {
          color: #6b7280;
          font-size: 0.875rem;
          margin-bottom: 20px;
        }

        .aggregate {
          text-align: center;
          padding: 24px;
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
          border-radius: 8px;
          margin-bottom: 24px;
        }

        .aggregate-value {
          display: block;
          font-size: 3rem;
          font-weight: 700;
          color: white;
          line-height: 1;
          margin-bottom: 8px;
        }

        .aggregate-label {
          font-size: 0.875rem;
          color: white;
          opacity: 0.9;
        }

        .leaderboard h3 {
          font-size: 1rem;
          color: #374151;
          margin-bottom: 16px;
        }

        .no-data {
          text-align: center;
          color: #6b7280;
          padding: 24px;
        }

        .volunteers {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .volunteer-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 12px;
          background: #f9fafb;
          border-radius: 6px;
          transition: transform 0.2s;
        }

        .volunteer-card:hover {
          transform: translateX(4px);
        }

        .rank {
          font-size: 1.25rem;
          font-weight: 700;
          color: #9ca3af;
          min-width: 32px;
        }

        .volunteer-info {
          flex: 1;
        }

        .name {
          font-weight: 600;
          color: #111827;
          margin-bottom: 4px;
        }

        .stats {
          font-size: 0.75rem;
          color: #6b7280;
        }

        .vis-badge {
          padding: 8px 16px;
          border-radius: 20px;
          color: white;
          font-weight: 700;
          font-size: 1rem;
        }

        .doc-link {
          display: inline-block;
          margin-top: 16px;
          color: #0066cc;
          text-decoration: underline;
          font-size: 0.875rem;
        }
      `}</style>
    </div>
  );
}

export default memo(VISPanel, (prev, next) => {
  return prev.companyId === next.companyId && prev.period === next.period && prev.top === next.top;
});
